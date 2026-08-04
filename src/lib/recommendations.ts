import { rankWithClaude } from "./claude-ranker";
import { buildTasteDossier } from "./dossier";
import { exclusionTmdbIds } from "./preference";
import {
  discoverMovies,
  getGenreMap,
  getMovieDetails,
  getSimilarMovies,
  yearFromDate,
} from "./tmdb";
import type {
  AppSettings,
  Recommendation,
  RecommendationEngine,
  RecommendationOptions,
  TasteProfile,
  TmdbMovieSummary,
  WatchedMovie,
} from "./types";

const GENRE_NAME_TO_HINT: Record<string, string> = {
  Action: "high-energy plotting",
  Adventure: "sense of journey",
  Animation: "crafted worlds",
  Comedy: "comic timing",
  Crime: "underworld tension",
  Documentary: "real-world storytelling",
  Drama: "character depth",
  Family: "warm ensemble energy",
  Fantasy: "imaginative worlds",
  History: "period texture",
  Horror: "dread and atmosphere",
  Music: "rhythm-forward storytelling",
  Mystery: "withheld answers",
  Romance: "emotional intimacy",
  "Science Fiction": "speculative ideas",
  Thriller: "tight suspense",
  War: "conflict pressure",
  Western: "frontier myth",
};

/** Size of the pool handed to Claude for re-ranking. */
const SHORTLIST_SIZE = 45;

function uniqueById(movies: TmdbMovieSummary[]): TmdbMovieSummary[] {
  const seen = new Set<number>();
  const out: TmdbMovieSummary[] = [];
  for (const m of movies) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  return out;
}

function scoreCandidate(
  movie: TmdbMovieSummary,
  genreNames: string[],
  profile: TasteProfile,
  seedTitles: string[],
): { score: number; reasons: string[] } {
  let score =
    (movie.vote_average ?? 0) * 0.35 + Math.min(movie.popularity ?? 0, 80) * 0.02;
  const reasons: string[] = [];

  const genreScores = new Map(profile.topGenres.map((g) => [g.name, g.score]));
  let genreHits = 0;
  for (const name of genreNames) {
    const gScore = genreScores.get(name);
    if (gScore) {
      genreHits += 1;
      score += Math.min(gScore, 8) * 0.9;
    }
  }
  if (genreHits > 0) {
    const top = genreNames
      .filter((n) => genreScores.has(n))
      .slice(0, 2)
      .join(" & ");
    reasons.push(`Matches your ${top} lean`);
  }

  const overview = (movie.overview ?? "").toLowerCase();
  for (const signal of profile.storySignals.slice(0, 8)) {
    if (overview.includes(signal.name.toLowerCase())) {
      score += Math.min(signal.score, 6) * 0.7;
      reasons.push(`Story DNA: ${signal.name}`);
      break;
    }
  }

  for (const theme of profile.topThemes.slice(0, 8)) {
    if (overview.includes(theme.name.toLowerCase())) {
      score += Math.min(theme.score, 5) * 0.45;
      reasons.push(`Thematic echo of ${theme.name}`);
      break;
    }
  }

  if (seedTitles.length && reasons.length < 3) {
    reasons.push(`Adjacent to favorites like ${seedTitles[0]}`);
    score += 1.2;
  }

  if (genreNames[0] && GENRE_NAME_TO_HINT[genreNames[0]] && reasons.length < 3) {
    reasons.push(`Built around ${GENRE_NAME_TO_HINT[genreNames[0]]}`);
  }

  if (!reasons.length) {
    reasons.push("Strong TMDB signal that fits your archive shape");
  }

  return { score, reasons: reasons.slice(0, 3) };
}

async function enrichReasons(
  apiKey: string,
  recs: Recommendation[],
  profile: TasteProfile,
): Promise<void> {
  for (const rec of recs) {
    try {
      const details = await getMovieDetails(apiKey, rec.tmdbId);
      const keywords = (details.keywords?.keywords ?? []).map((k) => k.name);
      const cast = (details.credits?.cast ?? [])
        .sort((a, b) => a.order - b.order)
        .slice(0, 5)
        .map((c) => c.name);
      const directors = (details.credits?.crew ?? [])
        .filter((c) => c.job === "Director")
        .map((c) => c.name);

      const actorHit = profile.topActors.find((a) => cast.includes(a.name));
      if (actorHit) {
        rec.reasons = [
          `Features ${actorHit.name}, a recurring favorite`,
          ...rec.reasons.filter((r) => !r.includes(actorHit.name)),
        ].slice(0, 3);
        rec.score += 2;
      }

      const directorHit = profile.topDirectors.find((d) =>
        directors.includes(d.name),
      );
      if (directorHit) {
        rec.reasons = [
          `From ${directorHit.name}, aligned with your director taste`,
          ...rec.reasons,
        ].slice(0, 3);
        rec.score += 2.4;
      }

      const themeHit = profile.topThemes.find((t) =>
        keywords.some((k) => k.toLowerCase() === t.name.toLowerCase()),
      );
      if (themeHit) {
        rec.reasons = [
          `Shares the “${themeHit.name}” theme with films you love`,
          ...rec.reasons,
        ].slice(0, 3);
        rec.score += 1.5;
      }

      if (details.genres?.length) {
        rec.genres = details.genres.map((g) => g.name);
      }
    } catch {
      // keep base recommendation
    }
  }
}

/**
 * Retrieval is heuristic and TMDB-driven; ranking is Claude's when a key is
 * configured, otherwise the heuristic score stands in.
 */
export async function generateRecommendations(
  settings: AppSettings,
  movies: WatchedMovie[],
  options: RecommendationOptions & { dismissed?: number[] } = {},
): Promise<{
  recommendations: Recommendation[];
  profile: TasteProfile;
  engine: RecommendationEngine;
  engineNote?: string;
  exhausted?: boolean;
}> {
  const {
    limit = 12,
    genreIds = [],
    refresh = 0,
    exclude = [],
    dismissed = [],
  } = options;

  const apiKey = settings.tmdbApiKey;
  const { dossier, profile } = buildTasteDossier(movies);
  const excluded = exclusionTmdbIds(movies);
  for (const id of dismissed) excluded.add(id);
  for (const id of exclude) excluded.add(id);

  if (!movies.length) {
    return { recommendations: [], profile, engine: "heuristic" };
  }

  const genreMap = await getGenreMap(apiKey);
  const reverseGenre = new Map(
    [...genreMap.entries()].map(([id, name]) => [name, id]),
  );

  const tasteGenreIds = profile.topGenres
    .map((g) => reverseGenre.get(g.name))
    .filter((id): id is number => id != null)
    .slice(0, 4);

  // An explicit genre pick narrows retrieval; taste still does the ranking.
  const filtering = genreIds.length > 0;
  const retrievalGenreIds = filtering ? genreIds : tasteGenreIds;
  const genreNamesPicked = genreIds
    .map((id) => genreMap.get(id))
    .filter((n): n is string => Boolean(n));

  const seeds = [...movies]
    .filter((m) => m.tmdbId && (m.rating == null || m.rating >= 3.5))
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 12);

  const pools: TmdbMovieSummary[] = [];
  // Each refresh walks further into the catalogue instead of re-serving page 1.
  const pageOffset = refresh * 2;

  if (retrievalGenreIds.length) {
    const joined = retrievalGenreIds.join(filtering ? "," : "|");
    pools.push(
      ...(await discoverMovies(apiKey, {
        withGenres: joined,
        sortBy: "vote_average.desc",
        // A genre pick should surface the genre's best, not its most popular.
        voteCountGte: filtering ? 300 : 200,
        voteAverageGte: filtering ? 7 : undefined,
        page: 1 + pageOffset,
      })),
      ...(await discoverMovies(apiKey, {
        withGenres: joined,
        sortBy: filtering ? "vote_average.desc" : "popularity.desc",
        voteCountGte: filtering ? 150 : 120,
        voteAverageGte: filtering ? 6.5 : undefined,
        page: 2 + pageOffset,
      })),
    );

    if (!filtering) {
      pools.push(
        ...(await discoverMovies(apiKey, {
          withGenres: joined,
          sortBy: "vote_average.desc",
          voteCountGte: 400,
          page: 3 + pageOffset,
        })),
      );
    }
  }

  // Seeds rotate with refresh so similar-film pulls differ run to run.
  const seedStart = (refresh * 3) % Math.max(1, seeds.length);
  const rotatedSeeds = [...seeds.slice(seedStart), ...seeds.slice(0, seedStart)];

  for (const seed of rotatedSeeds.slice(0, 5)) {
    if (!seed.tmdbId) continue;
    try {
      pools.push(...(await getSimilarMovies(apiKey, seed.tmdbId)));
    } catch {
      // ignore individual seed failures
    }
  }

  let candidates = uniqueById(pools).filter((m) => !excluded.has(m.id));

  if (filtering) {
    const wanted = new Set(genreIds);
    const inGenre = candidates.filter((m) =>
      (m.genre_ids ?? []).some((id) => wanted.has(id)),
    );
    // Similar-film pulls ignore the filter, so only keep them if nothing else matched.
    if (inGenre.length >= limit) candidates = inGenre;
  }

  if (!candidates.length) {
    return {
      recommendations: [],
      profile,
      engine: "heuristic",
      exhausted: true,
      engineNote: filtering
        ? `No more ${genreNamesPicked.join(" / ")} picks left that you haven't seen or dismissed.`
        : "You've worked through the current pool. Try a genre filter or add more watched films.",
    };
  }

  const seedTitles = seeds.map((s) => s.title);

  const scored: Recommendation[] = candidates.map((movie) => {
    const genreNames = (movie.genre_ids ?? [])
      .map((id) => genreMap.get(id))
      .filter((n): n is string => Boolean(n));
    const { score, reasons } = scoreCandidate(
      movie,
      genreNames,
      profile,
      seedTitles,
    );

    return {
      tmdbId: movie.id,
      title: movie.title,
      year: yearFromDate(movie.release_date),
      posterPath: movie.poster_path ?? null,
      backdropPath: movie.backdrop_path ?? null,
      overview: movie.overview ?? "",
      genres: genreNames,
      voteAverage: movie.vote_average ?? 0,
      score,
      reasons,
      engine: "heuristic" as RecommendationEngine,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  if (settings.anthropicApiKey.trim()) {
    const shortlist = scored.slice(0, SHORTLIST_SIZE);
    try {
      const ranked = await rankWithClaude({
        apiKey: settings.anthropicApiKey,
        model: settings.claudeModel,
        dossier,
        candidates: shortlist,
        limit,
        genreFocus: genreNamesPicked,
      });

      if (ranked.length) {
        await enrichGenres(apiKey, ranked);
        return { recommendations: ranked, profile, engine: "claude" };
      }
    } catch (error) {
      const note =
        error instanceof Error
          ? `Claude ranking unavailable (${error.message}). Showing heuristic picks.`
          : "Claude ranking unavailable. Showing heuristic picks.";
      const fallback = scored.slice(0, limit);
      await enrichReasons(apiKey, fallback.slice(0, 6), profile);
      fallback.sort((a, b) => b.score - a.score);
      return {
        recommendations: fallback,
        profile,
        engine: "heuristic",
        engineNote: note,
      };
    }
  }

  const top = scored.slice(0, limit);
  await enrichReasons(apiKey, top.slice(0, 6), profile);
  top.sort((a, b) => b.score - a.score);

  return {
    recommendations: top,
    profile,
    engine: "heuristic",
    engineNote: settings.anthropicApiKey.trim()
      ? undefined
      : "Add an Anthropic API key in Settings for Claude-ranked picks.",
  };
}

/** Discover results carry genre ids only; details give display-ready names. */
async function enrichGenres(
  apiKey: string,
  recs: Recommendation[],
): Promise<void> {
  await Promise.all(
    recs.slice(0, 8).map(async (rec) => {
      try {
        const details = await getMovieDetails(apiKey, rec.tmdbId);
        if (details.genres?.length) {
          rec.genres = details.genres.map((g) => g.name);
        }
        if (details.runtime) {
          rec.overview = rec.overview || details.overview || "";
        }
      } catch {
        // keep existing metadata
      }
    }),
  );
}
