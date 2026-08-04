import { NextResponse } from "next/server";
import { parseLetterboxdCsv, type LetterboxdRow } from "@/lib/letterboxd";
import {
  extractMovieFields,
  getMovieDetails,
  getSettingsSafe,
  searchMovies,
} from "@/lib/api-helpers";
import { mapWithConcurrency } from "@/lib/pool";
import { createId, upsertMovies } from "@/lib/storage";
import type { WatchedMovie } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800;

/** TMDB tolerates well above this; keep headroom so other calls stay responsive. */
const CONCURRENCY = 8;
const MAX_ROWS = 2000;

async function resolveTmdb(
  apiKey: string,
  title: string,
  year: number | null,
) {
  const results = await searchMovies(apiKey, title, year ?? undefined);
  if (!results.length && year) {
    return (await searchMovies(apiKey, title))[0] ?? null;
  }
  return results[0] ?? null;
}

function bareMovie(row: LetterboxdRow): WatchedMovie {
  const now = new Date().toISOString();
  return {
    id: createId(),
    tmdbId: null,
    title: row.title,
    year: row.year,
    posterPath: null,
    backdropPath: null,
    overview: "",
    genres: [],
    themes: [],
    actors: [],
    directors: [],
    runtime: null,
    rating: row.rating,
    review: row.review,
    watchedDate: row.watchedDate,
    rewatchable: row.rewatch,
    source: "letterboxd",
    createdAt: now,
    updatedAt: now,
  };
}

export async function POST(request: Request) {
  const settings = await getSettingsSafe();
  if (!settings.tmdbApiKey) {
    return NextResponse.json(
      { error: "Add your TMDB API key in Settings first." },
      { status: 400 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
  }

  let rows: LetterboxdRow[];
  try {
    rows = parseLetterboxdCsv(await file.text());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not parse CSV" },
      { status: 400 },
    );
  }

  if (!rows.length) {
    return NextResponse.json(
      { error: "No movie rows found in that CSV." },
      { status: 400 },
    );
  }

  const limited = rows.slice(0, MAX_ROWS);
  const apiKey = settings.tmdbApiKey;

  // Progress streams as NDJSON so a long import shows movement instead of hanging.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      send({ type: "start", total: limited.length, parsed: rows.length });

      let unresolved = 0;

      try {
        const movies = await mapWithConcurrency(
          limited,
          CONCURRENCY,
          async (row) => {
            try {
              const match = await resolveTmdb(apiKey, row.title, row.year);
              if (!match) {
                unresolved += 1;
                return bareMovie(row);
              }

              const details = await getMovieDetails(apiKey, match.id);
              const now = new Date().toISOString();
              return {
                id: createId(),
                ...extractMovieFields(details),
                rating: row.rating,
                review: row.review,
                watchedDate: row.watchedDate,
                rewatchable: row.rewatch,
                source: "letterboxd" as const,
                createdAt: now,
                updatedAt: now,
              };
            } catch {
              unresolved += 1;
              return bareMovie(row);
            }
          },
          (done, total) => send({ type: "progress", done, total }),
        );

        const result = await upsertMovies(movies);
        send({
          type: "done",
          added: result.added,
          updated: result.updated,
          parsed: rows.length,
          imported: limited.length,
          unresolved,
          truncated: rows.length > limited.length,
        });
      } catch (error) {
        send({
          type: "error",
          error:
            error instanceof Error ? error.message : "Import failed unexpectedly",
        });
      } finally {
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
