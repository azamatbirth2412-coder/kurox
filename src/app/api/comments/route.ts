import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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

function containsBannedWords(text: string): boolean {
  if (!COMMENT_CONFIG.BANNED_WORDS.length) return false;
  const lower = text.toLowerCase();
  return COMMENT_CONFIG.BANNED_WORDS.some((w) => lower.includes(w.toLowerCase()));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const animeId = searchParams.get("animeId");
  const cursor = searchParams.get("cursor");
  const limit = 20;

  if (!animeId) {
    return NextResponse.json({ error: "animeId required" }, { status: 400 });
  }

  const comments = await prisma.comment.findMany({
    where: { animeId, status: "APPROVED" },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = comments.length > limit;
  const items = hasMore ? comments.slice(0, limit) : comments;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

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

  // Rate limiting
  if (!checkRateLimit(userId)) {
    return NextResponse.json(
      { error: `Подождите ${COMMENT_CONFIG.RATE_LIMIT_SECONDS} секунд перед следующим комментарием` },
      { status: 429 }
    );
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

  const { animeId, text } = parsed.data;

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
      user: { select: { id: true, name: true, image: true } },
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
