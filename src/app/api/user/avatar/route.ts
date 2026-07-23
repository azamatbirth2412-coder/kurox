import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Serves the current user's avatar as an image. The avatar (base64 data URI) is
// stored only in the DB — never in the JWT cookie — so the client fetches it here.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse(null, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true },
  });

  if (!user?.image) {
    return new NextResponse(null, { status: 404 });
  }

  // Local /avatars/ static file — redirect to it as a relative path
  if (user.image.startsWith("/avatars/")) {
    return NextResponse.redirect(new URL(user.image, process.env.NEXTAUTH_URL || "http://localhost:3000"));
  }

  // External URL — redirect to it
  if (!user.image.startsWith("data:")) {
    try {
      return NextResponse.redirect(new URL(user.image));
    } catch {
      return new NextResponse(null, { status: 404 });
    }
  }

  // data:image/jpeg;base64,<payload> — decode and serve as binary
  const match = user.image.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/i);
  if (!match) {
    return new NextResponse(null, { status: 404 });
  }

  const buffer = Buffer.from(match[2], "base64");
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "private, max-age=300",
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { image, url, localPath } = body as { image?: string; url?: string; localPath?: string };

  // Local preset avatar from /public/avatars/ — store path directly
  if (localPath) {
    if (!/^\/avatars\/avatar_\d{2}a?\.(png|gif)$/.test(localPath)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    await prisma.user.update({ where: { id: session.user.id }, data: { image: localPath } });
    return NextResponse.json({ ok: true, image: localPath });
  }

  // Preset animated avatar: store URL directly (GIF animation preserved)
  if (url) {
    const allowed = ["nekos.best", "cdn.myanimelist.net", "i.imgur.com", "media.tenor.com", "i.waifu.pics", "cdn.waifu.im"];
    let hostname = "";
    try { hostname = new URL(url).hostname; } catch { return NextResponse.json({ error: "Invalid URL" }, { status: 400 }); }
    if (!allowed.some(h => hostname.endsWith(h))) return NextResponse.json({ error: "Source not allowed" }, { status: 400 });
    await prisma.user.update({ where: { id: session.user.id }, data: { image: url } });
    return NextResponse.json({ ok: true, image: url });
  }

  if (!image || !image.startsWith("data:image/")) {
    return NextResponse.json({ error: "Invalid image" }, { status: 400 });
  }

  // Limit size: base64 of 300KB max
  if (image.length > 400_000) {
    return NextResponse.json({ error: "Image too large" }, { status: 413 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image },
  });

  return NextResponse.json({ ok: true, image });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: null },
  });

  return NextResponse.json({ ok: true });
}
