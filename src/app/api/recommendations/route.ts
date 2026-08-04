import { NextResponse } from "next/server";
import { errorResponse, getSettingsSafe } from "@/lib/api-helpers";
import { getDismissed, listMovies } from "@/lib/storage";
import {
  generateRecommendations,
  type RecommendationResult,
} from "@/lib/recommendations";

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

  const { searchParams } = new URL(request.url);
  const genreIds = numberList(searchParams.get("genres"));
  const exclude = numberList(searchParams.get("exclude"));
  const rawRefresh = Number(searchParams.get("refresh") ?? 0);
  const dismissed = await getDismissed();

  // Two phases stream as NDJSON: fast heuristic picks, then Claude's ranking.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      const send = (payload: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      const shape = (result: RecommendationResult, final: boolean) => ({
        type: final ? "final" : "partial",
        recommendations: result.recommendations,
        profile: result.profile,
        engine: result.engine,
        engineNote: result.engineNote,
        exhausted: result.exhausted ?? false,
        refining: result.refining ?? false,
      });

      try {
        const result = await generateRecommendations(settings, movies, {
          limit: 12,
          genreIds,
          exclude,
          dismissed,
          refresh: Number.isFinite(rawRefresh) ? Math.max(0, rawRefresh) : 0,
          onPartial: (partial) => send(shape(partial, false)),
        });

        send(shape(result, true));
      } catch (error) {
        const { error: message } = errorResponse(error);
        send({ type: "error", error: message });
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
