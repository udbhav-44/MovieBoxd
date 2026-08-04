import { NextResponse } from "next/server";
import { errorResponse, getSettingsSafe } from "@/lib/api-helpers";
import { getGenreMap } from "@/lib/tmdb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getSettingsSafe();
    if (!settings.tmdbApiKey) {
      return NextResponse.json({ genres: [] });
    }

    const map = await getGenreMap(settings.tmdbApiKey);
    const genres = [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ genres });
  } catch (error) {
    const { error: message, status } = errorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
