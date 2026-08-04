import type { TasteBucket, TasteProfile, WatchedMovie } from "./types";

const STORY_LEXICON: Record<string, string[]> = {
  "found family": ["family", "found family", "belonging", "together"],
  "slow burn": ["slow burn", "gradual", "unfurls", "measured"],
  "heist": ["heist", "robbery", "con", "caper"],
  "revenge": ["revenge", "vengeance", "payback"],
  "coming of age": ["coming of age", "adolescence", "growing up", "youth"],
  "identity": ["identity", "who am i", "self", "reinvention"],
  "time": ["time travel", "memory", "nostalgia", "past"],
  "loneliness": ["lonely", "isolation", "alone", "solitude"],
  "romance": ["love", "romance", "relationship", "affair"],
  "survival": ["survival", "survive", "wilderness", "apocalypse"],
  "morality": ["moral", "ethics", "guilt", "justice"],
  "power": ["power", "corruption", "ambition", "control"],
  "mystery": ["mystery", "secret", "investigation", "whodunit"],
  "friendship": ["friendship", "friends", "bond", "loyalty"],
  "war": ["war", "battlefield", "soldier", "conflict"],
};

function ratingWeight(rating: number | null): number {
  if (rating == null) return 1;
  // 0.5 → ~0.4, 3 → 1, 5 → 2.2
  return Math.max(0.25, (rating / 3) ** 1.4);
}

function bump(
  map: Map<string, { score: number; count: number }>,
  name: string,
  weight: number,
) {
  const key = name.trim();
  if (!key) return;
  const current = map.get(key) ?? { score: 0, count: 0 };
  current.score += weight;
  current.count += 1;
  map.set(key, current);
}

function toBuckets(
  map: Map<string, { score: number; count: number }>,
  limit = 12,
): TasteBucket[] {
  return [...map.entries()]
    .map(([name, v]) => ({ name, score: Number(v.score.toFixed(2)), count: v.count }))
    .sort((a, b) => b.score - a.score || b.count - a.count)
    .slice(0, limit);
}

function detectStorySignals(movies: WatchedMovie[]): TasteBucket[] {
  const map = new Map<string, { score: number; count: number }>();

  for (const movie of movies) {
    const weight = ratingWeight(movie.rating);
    const corpus = [
      movie.overview,
      movie.review,
      ...movie.themes,
      ...movie.genres,
    ]
      .join(" ")
      .toLowerCase();

    for (const [signal, terms] of Object.entries(STORY_LEXICON)) {
      if (terms.some((term) => corpus.includes(term))) {
        bump(map, signal, weight);
      }
    }

    for (const theme of movie.themes) {
      bump(map, theme.toLowerCase(), weight * 0.85);
    }
  }

  return toBuckets(map, 14);
}

export function buildTasteProfile(movies: WatchedMovie[]): TasteProfile {
  const genres = new Map<string, { score: number; count: number }>();
  const actors = new Map<string, { score: number; count: number }>();
  const directors = new Map<string, { score: number; count: number }>();
  const themes = new Map<string, { score: number; count: number }>();
  const ratingDistribution: Record<string, number> = {};

  let ratingSum = 0;
  let ratedCount = 0;

  for (const movie of movies) {
    const weight = ratingWeight(movie.rating);
    if (movie.rating != null) {
      ratingSum += movie.rating;
      ratedCount += 1;
      const key = String(movie.rating);
      ratingDistribution[key] = (ratingDistribution[key] ?? 0) + 1;
    }

    for (const g of movie.genres) bump(genres, g, weight);
    for (const a of movie.actors.slice(0, 5)) bump(actors, a, weight);
    for (const d of movie.directors) bump(directors, d, weight * 1.15);
    for (const t of movie.themes.slice(0, 8)) bump(themes, t, weight);
  }

  return {
    totalWatched: movies.length,
    ratedCount,
    avgRating: ratedCount ? Number((ratingSum / ratedCount).toFixed(2)) : 0,
    rewatchableCount: movies.filter((m) => m.rewatchable).length,
    topGenres: toBuckets(genres),
    topActors: toBuckets(actors),
    topDirectors: toBuckets(directors),
    topThemes: toBuckets(themes),
    storySignals: detectStorySignals(movies),
    ratingDistribution,
  };
}

export function exclusionTmdbIds(movies: WatchedMovie[]): Set<number> {
  // Exclude watched titles from recommendations unless marked rewatchable
  const ids = new Set<number>();
  for (const movie of movies) {
    if (movie.tmdbId && !movie.rewatchable) {
      ids.add(movie.tmdbId);
    }
  }
  return ids;
}
