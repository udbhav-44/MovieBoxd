import type { WatchedMovie } from "./types";

/**
 * A total order that depends only on a film's own identity, never on where it
 * sits in the array. Every selection in the engine breaks ties with this so
 * that import order — which film was added first — cannot change results.
 */
export function compareIdentity(a: WatchedMovie, b: WatchedMovie): number {
  const title = a.title.localeCompare(b.title, "en", { sensitivity: "base" });
  if (title !== 0) return title;
  const year = (a.year ?? 0) - (b.year ?? 0);
  if (year !== 0) return year;
  return (a.tmdbId ?? 0) - (b.tmdbId ?? 0);
}

/** Sorts by `metric` descending, falling back to identity for ties. */
export function byMetricDesc(
  metric: (m: WatchedMovie) => number,
): (a: WatchedMovie, b: WatchedMovie) => number {
  return (a, b) => {
    const diff = metric(b) - metric(a);
    if (diff !== 0) return diff;
    return compareIdentity(a, b);
  };
}

/** Sorts by `metric` ascending, falling back to identity for ties. */
export function byMetricAsc(
  metric: (m: WatchedMovie) => number,
): (a: WatchedMovie, b: WatchedMovie) => number {
  return (a, b) => {
    const diff = metric(a) - metric(b);
    if (diff !== 0) return diff;
    return compareIdentity(a, b);
  };
}

/**
 * Canonical ordering applied before any analysis, so callers can hand the
 * archive over in whatever order they like.
 */
export function canonicalize(movies: WatchedMovie[]): WatchedMovie[] {
  return [...movies].sort(compareIdentity);
}
