import { buildTasteProfile, exclusionTmdbIds } from "./preference";
import {
  discoverMovies,
  getGenreMap,
  getMovieDetails,
  getSimilarMovies,
  yearFromDate,
} from "./tmdb";
import type {
  Recommendation,
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
  let score = (movie.vote_average ?? 0) * 0.35 + Math.min(movie.popularity ?? 0, 80) * 0.02;
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

export async function generateRecommendations(
  apiKey: string,
  movies: WatchedMovie[],
  limit = 12,
): Promise<{ recommendations: Recommendation[]; profile: TasteProfile }> {
  const profile = buildTasteProfile(movies);
  const excluded = exclusionTmdbIds(movies);

  if (!movies.length) {
    return { recommendations: [], profile };
  }

  const genreMap = await getGenreMap(apiKey);
  const reverseGenre = new Map(
    [...genreMap.entries()].map(([id, name]) => [name, id]),
  );

  const topGenreIds = profile.topGenres
    .map((g) => reverseGenre.get(g.name))
    .filter((id): id is number => id != null)
    .slice(0, 3);

  const seeds = [...movies]
    .filter((m) => m.tmdbId && (m.rating == null || m.rating >= 3.5))
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5);

  const pools: TmdbMovieSummary[] = [];

  if (topGenreIds.length) {
    pools.push(
      ...(await discoverMovies(apiKey, {
        withGenres: topGenreIds.slice(0, 2).join(","),
        sortBy: "vote_average.desc",
        voteCountGte: 200,
      })),
    );
    pools.push(
      ...(await discoverMovies(apiKey, {
        withGenres: topGenreIds.join("|"),
        sortBy: "popularity.desc",
        voteCountGte: 120,
      })),
    );
  }

  for (const seed of seeds.slice(0, 3)) {
    if (!seed.tmdbId) continue;
    try {
      pools.push(...(await getSimilarMovies(apiKey, seed.tmdbId)));
    } catch {
      // ignore individual seed failures
    }
  }

  const candidates = uniqueById(pools).filter((m) => !excluded.has(m.id));
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
    };
  });

  scored.sort((a, b) => b.score - a.score);

  // Enrich top results with keywords/credits for sharper reasons
  const top = scored.slice(0, limit);
  for (const rec of top.slice(0, 6)) {
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

  top.sort((a, b) => b.score - a.score);

  return { recommendations: top, profile };
}
