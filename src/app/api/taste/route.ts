import { NextResponse } from "next/server";
import { listMovies } from "@/lib/storage";
import { buildTasteProfile } from "@/lib/preference";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const movies = await listMovies();
  const profile = buildTasteProfile(movies);
  return NextResponse.json({ profile, movieCount: movies.length });
}
