import { NextResponse } from "next/server";
import { dismissMovie, getDismissed, undismissMovie } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ dismissed: await getDismissed() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { tmdbId?: number };
  if (typeof body.tmdbId !== "number") {
    return NextResponse.json({ error: "tmdbId is required" }, { status: 400 });
  }
  return NextResponse.json({ dismissed: await dismissMovie(body.tmdbId) });
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as { tmdbId?: number };
  if (typeof body.tmdbId !== "number") {
    return NextResponse.json({ error: "tmdbId is required" }, { status: 400 });
  }
  return NextResponse.json({ dismissed: await undismissMovie(body.tmdbId) });
}
