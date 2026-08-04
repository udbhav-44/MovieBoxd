import type { TmdbMovieDetails, TmdbMovieSummary } from "./types";

export { posterUrl, backdropUrl } from "./images";

/** Overridable so the import pipeline can be exercised against a local stub. */
const TMDB_BASE = process.env.TMDB_API_BASE ?? "https://api.themoviedb.org/3";

export class TmdbError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "TmdbError";
    this.status = status;
  }
}

const MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tmdbFetch<T>(
  apiKey: string,
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  if (!apiKey.trim()) {
    throw new TmdbError("TMDB API key is not configured. Add it in Settings.", 400);
  }

  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set("api_key", apiKey);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
      });

      if (res.ok) {
        return (await res.json()) as T;
      }

      if (res.status === 401) {
        throw new TmdbError("Invalid TMDB API key.", 401);
      }

      // Honour TMDB's throttling hint; otherwise back off exponentially.
      if (res.status === 429 || res.status >= 500) {
        if (attempt === MAX_RETRIES) {
          throw new TmdbError(
            `TMDB request failed after ${MAX_RETRIES} retries: ${res.statusText}`,
            res.status,
          );
        }
        const retryAfter = Number(res.headers.get("retry-after"));
        await sleep(
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 2 ** attempt * 400,
        );
        continue;
      }

      const body = await res.text();
      throw new TmdbError(
        `TMDB request failed: ${body || res.statusText}`,
        res.status,
      );
    } catch (error) {
      // Auth and other 4xx failures are terminal; only transport errors retry.
      if (error instanceof TmdbError) throw error;
      lastError = error;
      if (attempt === MAX_RETRIES) break;
      await sleep(2 ** attempt * 400);
    }
  }

  throw new TmdbError(
    lastError instanceof Error
      ? `TMDB request failed: ${lastError.message}`
      : "TMDB request failed",
    502,
  );
}

export async function searchMovies(
  apiKey: string,
  query: string,
  year?: number,
): Promise<TmdbMovieSummary[]> {
  const data = await tmdbFetch<{ results: TmdbMovieSummary[] }>(
    apiKey,
    "/search/movie",
    {
      query,
      include_adult: "false",
      year: year,
    },
  );
  return data.results ?? [];
}

export async function getMovieDetails(
  apiKey: string,
  tmdbId: number,
): Promise<TmdbMovieDetails> {
  return tmdbFetch<TmdbMovieDetails>(apiKey, `/movie/${tmdbId}`, {
    append_to_response: "credits,keywords",
  });
}

export async function discoverMovies(
  apiKey: string,
  options: {
    withGenres?: string;
    withPeople?: string;
    sortBy?: string;
    page?: number;
    voteCountGte?: number;
    voteAverageGte?: number;
  } = {},
): Promise<TmdbMovieSummary[]> {
  const data = await tmdbFetch<{ results: TmdbMovieSummary[] }>(
    apiKey,
    "/discover/movie",
    {
      include_adult: "false",
      include_video: "false",
      language: "en-US",
      sort_by: options.sortBy ?? "popularity.desc",
      with_genres: options.withGenres,
      with_people: options.withPeople,
      page: options.page ?? 1,
      "vote_count.gte": options.voteCountGte ?? 80,
      "vote_average.gte": options.voteAverageGte,
    },
  );
  return data.results ?? [];
}

export async function getSimilarMovies(
  apiKey: string,
  tmdbId: number,
): Promise<TmdbMovieSummary[]> {
  const data = await tmdbFetch<{ results: TmdbMovieSummary[] }>(
    apiKey,
    `/movie/${tmdbId}/recommendations`,
    { language: "en-US", page: 1 },
  );
  return data.results ?? [];
}

export async function getGenreMap(
  apiKey: string,
): Promise<Map<number, string>> {
  const data = await tmdbFetch<{ genres: { id: number; name: string }[] }>(
    apiKey,
    "/genre/movie/list",
  );
  return new Map((data.genres ?? []).map((g) => [g.id, g.name]));
}

export function yearFromDate(date?: string | null): number | null {
  if (!date || date.length < 4) return null;
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

export function extractMovieFields(details: TmdbMovieDetails) {
  const cast = [...(details.credits?.cast ?? [])]
    .sort((a, b) => a.order - b.order)
    .slice(0, 8)
    .map((c) => c.name);

  const directors = (details.credits?.crew ?? [])
    .filter((c) => c.job === "Director")
    .map((c) => c.name);

  const themes = (details.keywords?.keywords ?? [])
    .map((k) => k.name)
    .slice(0, 12);

  return {
    tmdbId: details.id,
    title: details.title,
    year: yearFromDate(details.release_date),
    posterPath: details.poster_path ?? null,
    backdropPath: details.backdrop_path ?? null,
    overview: details.overview ?? "",
    genres: (details.genres ?? []).map((g) => g.name),
    themes,
    actors: cast,
    directors,
    runtime: details.runtime ?? null,
  };
}
