import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const MIME: Record<string, string> = {
  png:  "image/png",
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  gif:  "image/gif",
  webp: "image/webp",
  svg:  "image/svg+xml",
  mp4:  "video/mp4",
  webm: "video/webm",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const filePath   = path.resolve(uploadsDir, ...segments);

  // Prevent path traversal (separator-aware: bare startsWith would also match
  // sibling directories like "uploads-private")
  if (filePath !== uploadsDir && !filePath.startsWith(uploadsDir + path.sep)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const data        = await readFile(filePath);
    const ext         = path.extname(filePath).slice(1).toLowerCase();
    const contentType = MIME[ext] ?? "application/octet-stream";
    return new NextResponse(data, {
      headers: {
        "Content-Type":  contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
