import { NextRequest, NextResponse } from "next/server";
import { auth, isUserBanned } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { COMMENT_CONFIG } from "@/lib/comment-config";

const createSchema = z.object({
  animeId: z.string().min(1),
  text: z
    .string()
    .min(COMMENT_CONFIG.MIN_LENGTH, `Минимум ${COMMENT_CONFIG.MIN_LENGTH} символа`)
    .max(COMMENT_CONFIG.MAX_LENGTH, `Максимум ${COMMENT_CONFIG.MAX_LENGTH} символов`),
});

// In-memory rate limit store (per userId -> last comment timestamp)
// For production, use Redis or DB-based rate limiting
const rateLimitStore = new Map<string, number>();

function checkRateLimit(userId: string): boolean {
  const last = rateLimitStore.get(userId);
  const now = Date.now();
  if (last && now - last < COMMENT_CONFIG.RATE_LIMIT_SECONDS * 1000) {
    return false;
  }
  rateLimitStore.set(userId, now);
  return true;
}

// Strip HTML tags and normalize whitespace to prevent stored XSS
function sanitizeText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")          // strip HTML tags
    .replace(/&[a-z#0-9]+;/gi, " ")  // strip HTML entities
    .replace(/\s+/g, " ")             // collapse whitespace
    .trim();
}

function containsBannedWords(text: string): boolean {
  if (!COMMENT_CONFIG.BANNED_WORDS.length) return false;
  const lower = text.toLowerCase();
  return COMMENT_CONFIG.BANNED_WORDS.some((w) => lower.includes(w.toLowerCase()));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const animeId = searchParams.get("animeId");
  const cursor  = searchParams.get("cursor");
  const sort    = searchParams.get("sort") ?? "newest"; // newest | oldest | top
  const limit   = 20;

  if (!animeId) {
    return NextResponse.json({ error: "animeId required" }, { status: 400 });
  }

  const session = await auth();
  const currentUserId = session?.user?.id ?? null;

  const orderBy =
    sort === "oldest" ? { createdAt: "asc" as const } :
    sort === "top"    ? { likes: { _count: "desc" as const } } :
                        { createdAt: "desc" as const };

  const comments = await prisma.comment.findMany({
    where: { animeId, status: "APPROVED" },
    include: {
      user: {
        select: {
          id: true, name: true, image: true, profileFrame: true,
          activeTitle: { select: { name: true, emoji: true, color: true, rarity: true } },
        },
      },
      likes: { select: { userId: true, type: true } },
    },
    orderBy,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = comments.length > limit;
  const raw = hasMore ? comments.slice(0, limit) : comments;
  const nextCursor = hasMore ? raw[raw.length - 1].id : null;

  const items = raw.map(c => {
    const myLike = currentUserId ? c.likes.find(l => l.userId === currentUserId) : null;
    return {
      id: c.id,
      text: c.text,
      status: c.status,
      createdAt: c.createdAt,
      user: c.user,
      likes:    c.likes.filter(l => l.type === "LIKE").length,
      dislikes: c.likes.filter(l => l.type === "DISLIKE").length,
      myVote:   myLike?.type ?? null,
    };
  });

  return NextResponse.json({ items, nextCursor });
}

export async function POST(req: NextRequest) {
  // Backend auth check — always enforce regardless of UI state
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Необходимо войти в аккаунт" },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  // JWT sessions cache the role — a user banned after login still has a valid
  // token, so re-check the DB before accepting content
  if (await isUserBanned(userId)) {
    return NextResponse.json({ error: "Аккаунт заблокирован" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    return NextResponse.json(
      { error: issues[0]?.message || "Некорректные данные" },
      { status: 400 }
    );
  }

  // Rate limiting — checked AFTER validation so a rejected (e.g. too short)
  // comment doesn't burn the user's 30-second slot
  if (!checkRateLimit(userId)) {
    return NextResponse.json(
      { error: `Подождите ${COMMENT_CONFIG.RATE_LIMIT_SECONDS} секунд перед следующим комментарием` },
      { status: 429 }
    );
  }

  const { animeId } = parsed.data;
  const text = sanitizeText(parsed.data.text);

  if (text.length < COMMENT_CONFIG.MIN_LENGTH) {
    return NextResponse.json({ error: "Комментарий слишком короткий" }, { status: 400 });
  }

  if (containsBannedWords(text)) {
    return NextResponse.json(
      { error: "Комментарий содержит запрещённые слова" },
      { status: 400 }
    );
  }

  const status = COMMENT_CONFIG.REQUIRE_MODERATION ? "PENDING" : "APPROVED";

  const comment = await prisma.comment.create({
    data: { userId, animeId, text, status },
    include: {
      user: {
        select: {
          id: true, name: true, image: true, profileFrame: true,
          activeTitle: { select: { name: true, emoji: true, color: true, rarity: true } },
        },
      },
    },
  });

  return NextResponse.json(
    {
      comment,
      message: COMMENT_CONFIG.REQUIRE_MODERATION
        ? "Комментарий отправлен на модерацию"
        : "Комментарий опубликован",
    },
    { status: 201 }
  );
}
