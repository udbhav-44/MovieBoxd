import { NextResponse } from "next/server";
import { createId, listMovies, upsertMovies } from "@/lib/storage";
import { extractMovieFields, getMovieDetails, getSettingsSafe } from "@/lib/api-helpers";
import type { WatchedMovie } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const movies = await listMovies();
  return NextResponse.json({ movies });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    tmdbId: number;
    rating?: number | null;
    review?: string;
    rewatchable?: boolean;
    watchedDate?: string | null;
  };

  if (!body.tmdbId) {
    return NextResponse.json({ error: "tmdbId is required" }, { status: 400 });
  }

  const settings = await getSettingsSafe();
  if (!settings.tmdbApiKey) {
    return NextResponse.json(
      { error: "Add your TMDB API key in Settings first." },
      { status: 400 },
    );
  }

  const details = await getMovieDetails(settings.tmdbApiKey, body.tmdbId);
  const fields = extractMovieFields(details);
  const now = new Date().toISOString();

  const movie: WatchedMovie = {
    id: createId(),
    ...fields,
    rating: body.rating ?? null,
    review: body.review ?? "",
    watchedDate: body.watchedDate ?? now.slice(0, 10),
    rewatchable: Boolean(body.rewatchable),
    source: "manual",
    createdAt: now,
    updatedAt: now,
  };

  const result = await upsertMovies([movie]);
  return NextResponse.json(result);
}
