import { NextResponse } from "next/server";
import { errorResponse, getSettingsSafe } from "@/lib/api-helpers";
import { listMovies } from "@/lib/storage";
import { generateRecommendations } from "@/lib/recommendations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  try {
    const settings = await getSettingsSafe();
    if (!settings.tmdbApiKey) {
      return NextResponse.json(
        { error: "Add your TMDB API key in Settings first." },
        { status: 400 },
      );
    }

    const movies = await listMovies();
    if (!movies.length) {
      return NextResponse.json({
        recommendations: [],
        profile: null,
        message: "Import or add watched films to unlock For You.",
      });
    }

    const { recommendations, profile, engine, engineNote } =
      await generateRecommendations(settings, movies, 12);

    return NextResponse.json({
      recommendations,
      profile,
      engine,
      engineNote,
    });
  } catch (error) {
    const { error: message, status } = errorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
