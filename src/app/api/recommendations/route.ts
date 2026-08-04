import { NextResponse } from "next/server";
import { errorResponse, getSettingsSafe } from "@/lib/api-helpers";
import { getDismissed, listMovies } from "@/lib/storage";
import { generateRecommendations } from "@/lib/recommendations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function numberList(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n));
}

export async function GET(request: Request) {
  try {
    const settings = await getSettingsSafe();
    if (!settings.tmdbApiKey) {
      return NextResponse.json(
        { error: "Add your TMDB API key in Settings first." },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const genreIds = numberList(searchParams.get("genres"));
    const exclude = numberList(searchParams.get("exclude"));
    const refresh = Number(searchParams.get("refresh") ?? 0);

    const movies = await listMovies();
    if (!movies.length) {
      return NextResponse.json({
        recommendations: [],
        profile: null,
        message: "Import or add watched films to unlock For You.",
      });
    }

    const dismissed = await getDismissed();

    const result = await generateRecommendations(settings, movies, {
      limit: 12,
      genreIds,
      exclude,
      dismissed,
      refresh: Number.isFinite(refresh) ? Math.max(0, refresh) : 0,
    });

    return NextResponse.json({
      recommendations: result.recommendations,
      profile: result.profile,
      engine: result.engine,
      engineNote: result.engineNote,
      exhausted: result.exhausted ?? false,
    });
  } catch (error) {
    const { error: message, status } = errorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
