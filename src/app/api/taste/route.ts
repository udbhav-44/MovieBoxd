import { NextResponse } from "next/server";
import { getSettings, listMovies } from "@/lib/storage";
import { buildTasteDossier } from "@/lib/dossier";
import { narrateTaste } from "@/lib/claude-ranker";
import { errorResponse } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wantNarrative = searchParams.get("narrative") === "1";

  const movies = await listMovies();
  const { profile, dossier } = buildTasteDossier(movies);

  if (!wantNarrative) {
    return NextResponse.json({ profile, movieCount: movies.length });
  }

  const settings = await getSettings();
  if (!settings.anthropicApiKey.trim()) {
    return NextResponse.json(
      { error: "Add your Anthropic API key in Settings for a taste read." },
      { status: 400 },
    );
  }
  if (!movies.length) {
    return NextResponse.json(
      { error: "Add some watched films first." },
      { status: 400 },
    );
  }

  try {
    const narrative = await narrateTaste({
      apiKey: settings.anthropicApiKey,
      model: settings.claudeModel,
      dossier,
    });
    return NextResponse.json({ profile, movieCount: movies.length, narrative });
  } catch (error) {
    const { error: message, status } = errorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
