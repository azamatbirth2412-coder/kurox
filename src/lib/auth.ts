import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// The JWT is stored in a cookie (~4KB limit, chunked beyond that). Base64 data-URI
// avatars are tens of KB and MUST NOT go into the token — huge chunked cookies break
// requests and leave stale chunks behind. Only small regular URLs are allowed.
function jwtSafeImage(image: string | null | undefined): string | null {
  if (!image) return null;
  if (image.startsWith("data:")) return null;
  if (image.length > 512) return null;
  return image;
}

// JWT sessions cache the role at sign-in, so a user banned AFTER signing in
// still carries role=USER in the token. Write endpoints (comments, ratings,
// likes) must re-check the DB before accepting content from such sessions.
export async function isUserBanned(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return !user || user.role === "BANNED";
}

/**
 * Server-side ADMIN check that hits the DB instead of trusting the JWT.
 *
 * Sessions last a year (see `maxAge` below) and the role is baked into the token
 * at sign-in, so `session.user.role === "ADMIN"` stays true long after the account
 * has been demoted, banned or deleted. Without a DB read, an admin who was demoted
 * via `/api/admin/users/[id]` (`action: "removeAdmin"`) keeps full admin API access
 * and can simply call that same endpoint with `action: "makeAdmin"` to restore
 * themselves — the demotion never actually takes effect.
 *
 * Returns the live user row, or null if the caller is not currently an admin.
 */
export async function requireAdminUser(): Promise<{ id: string; email: string } | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });
  if (!user || user.role !== "ADMIN") return null;

  return { id: user.id, email: user.email };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 365 * 24 * 60 * 60 }, // 1 year
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user || !user.password) return null;
        if (user.role === "BANNED") return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          isPremium: user.isPremium,
          profileFrame: user.profileFrame,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session: newSession }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.picture = jwtSafeImage(user.image);
        token.profileFrame = (user as any).profileFrame ?? "default";
      }
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { image: true, role: true, profileFrame: true, activeTitle: { select: { key: true, name: true, emoji: true, color: true, rarity: true } } },
        });
        if (dbUser) {
          token.picture = jwtSafeImage(dbUser.image);
          token.role = dbUser.role;
          token.profileFrame = dbUser.profileFrame;
          token.activeTitle = dbUser.activeTitle ?? null;
        }
      }
      if (!token.id && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { id: true, role: true, image: true, profileFrame: true, activeTitle: { select: { key: true, name: true, emoji: true, color: true, rarity: true } } },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.picture = jwtSafeImage(dbUser.image);
          token.profileFrame = dbUser.profileFrame;
          token.activeTitle = dbUser.activeTitle ?? null;
        }
      }
      // Sync profileFrame + activeTitle from DB when the token has no frame or is stuck at "default"
      if (trigger !== "update" && token.id && (!token.profileFrame || token.profileFrame === "default")) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { profileFrame: true, activeTitle: { select: { key: true, name: true, emoji: true, color: true, rarity: true } } },
        });
        if (dbUser) {
          token.profileFrame = dbUser.profileFrame ?? "default";
          token.activeTitle = dbUser.activeTitle ?? null;
        }
      }
      // Sanitize legacy tokens that already carry a huge base64 picture
      token.picture = jwtSafeImage(token.picture as string | null);
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = (token.picture as string | null) ?? null;
        (session.user as any).role = token.role;
        (session.user as any).profileFrame = (token.profileFrame as string) ?? "default";
        (session.user as any).activeTitle = (token.activeTitle as { key: string; name: string; emoji: string; color: string; rarity: string } | null) ?? null;
      }
      return session;
    },
  },
});
