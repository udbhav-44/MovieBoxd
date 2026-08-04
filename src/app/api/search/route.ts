import { NextResponse } from "next/server";
import { errorResponse, getSettingsSafe, searchMovies } from "@/lib/api-helpers";
import { yearFromDate } from "@/lib/tmdb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim();
    const yearParam = searchParams.get("year");
    const year = yearParam ? Number(yearParam) : undefined;

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const settings = await getSettingsSafe();
    if (!settings.tmdbApiKey) {
      return NextResponse.json(
        { error: "Add your TMDB API key in Settings first." },
        { status: 400 },
      );
    }

    const results = await searchMovies(settings.tmdbApiKey, query, year);
    return NextResponse.json({
      results: results.slice(0, 12).map((m) => ({
        tmdbId: m.id,
        title: m.title,
        year: yearFromDate(m.release_date),
        posterPath: m.poster_path ?? null,
        overview: m.overview ?? "",
        voteAverage: m.vote_average ?? 0,
      })),
    });
  } catch (error) {
    const { error: message, status } = errorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
