import { NextResponse } from "next/server";
import { parseLetterboxdCsv } from "@/lib/letterboxd";
import {
  errorResponse,
  extractMovieFields,
  getMovieDetails,
  getSettingsSafe,
  searchMovies,
} from "@/lib/api-helpers";
import { createId, upsertMovies } from "@/lib/storage";
import type { WatchedMovie } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function POST(request: Request) {
  try {
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

    const text = await file.text();
    const rows = parseLetterboxdCsv(text);
    if (!rows.length) {
      return NextResponse.json(
        { error: "No movie rows found in that CSV." },
        { status: 400 },
      );
    }

    // Cap enrichment work for responsiveness on large exports
    const limited = rows.slice(0, 250);
    const movies: WatchedMovie[] = [];
    let unresolved = 0;

    for (const row of limited) {
      const now = new Date().toISOString();
      try {
        const match = await resolveTmdb(
          settings.tmdbApiKey,
          row.title,
          row.year,
        );

        if (!match) {
          unresolved += 1;
          movies.push({
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
          });
          continue;
        }

        const details = await getMovieDetails(settings.tmdbApiKey, match.id);
        const fields = extractMovieFields(details);
        movies.push({
          id: createId(),
          ...fields,
          rating: row.rating,
          review: row.review,
          watchedDate: row.watchedDate,
          rewatchable: row.rewatch,
          source: "letterboxd",
          createdAt: now,
          updatedAt: now,
        });
      } catch {
        unresolved += 1;
        movies.push({
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
        });
      }
    }

    const result = await upsertMovies(movies);
    return NextResponse.json({
      ...result,
      parsed: rows.length,
      imported: limited.length,
      unresolved,
      truncated: rows.length > limited.length,
    });
  } catch (error) {
    const { error: message, status } = errorResponse(error, "Import failed");
    return NextResponse.json({ error: message }, { status });
  }
}
