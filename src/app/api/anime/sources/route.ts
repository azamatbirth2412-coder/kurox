import { NextRequest, NextResponse } from "next/server";

const SOURCES_API = "http://127.0.0.1:8001";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const action = searchParams.get("action");

  try {
    if (action === "search") {
      const query  = searchParams.get("query") ?? "";
      const source = searchParams.get("source") ?? "";
      if (!query) return NextResponse.json({ results: [] });

      const p = new URLSearchParams({ query });
      if (source) p.set("source", source);
      const res = await fetch(
        `${SOURCES_API}/search?${p}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) return NextResponse.json({ results: [] });
      return NextResponse.json(await res.json());
    }

    if (action === "episodes") {
      const source = searchParams.get("source") ?? "";
      const id     = searchParams.get("id") ?? "";
      if (!source || !id)
        return NextResponse.json({ error: "Missing source/id" }, { status: 400 });

      const res = await fetch(
        `${SOURCES_API}/episodes?source=${encodeURIComponent(source)}&id=${encodeURIComponent(id)}`,
        { signal: AbortSignal.timeout(15000) }
      );
      if (!res.ok) return NextResponse.json({ episodes: [] });
      return NextResponse.json(await res.json());
    }

    if (action === "video") {
      const source = searchParams.get("source") ?? "";
      const id     = searchParams.get("id") ?? "";
      const ep     = searchParams.get("ep") ?? "1";
      if (!source || !id)
        return NextResponse.json({ error: "Missing source/id" }, { status: 400 });

      const res = await fetch(
        `${SOURCES_API}/video?source=${encodeURIComponent(source)}&id=${encodeURIComponent(id)}&ep=${encodeURIComponent(ep)}`,
        { signal: AbortSignal.timeout(20000) }
      );
      if (!res.ok) return NextResponse.json({ sources: [] });
      return NextResponse.json(await res.json());
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Sources service unavailable" }, { status: 503 });
  }
}
