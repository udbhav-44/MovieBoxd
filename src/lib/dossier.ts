import { buildTasteProfile } from "./preference";
import type { TasteProfile, WatchedMovie } from "./types";

function line(movie: WatchedMovie): string {
  const parts = [
    `${movie.title}${movie.year ? ` (${movie.year})` : ""}`,
    movie.rating != null ? `${movie.rating}/5` : "unrated",
  ];
  if (movie.genres.length) parts.push(movie.genres.slice(0, 3).join("/"));
  if (movie.directors.length) parts.push(`dir. ${movie.directors[0]}`);
  if (movie.review.trim()) {
    parts.push(`note: "${movie.review.trim().slice(0, 180)}"`);
  }
  return `- ${parts.join(" · ")}`;
}

function buckets(items: { name: string; count: number }[], limit: number) {
  return items
    .slice(0, limit)
    .map((b) => `${b.name} (${b.count})`)
    .join(", ");
}

/**
 * Compresses the watch history into a prompt-sized portrait. Reviews and
 * outlier ratings carry the most signal, so those survive truncation first.
 */
export function buildTasteDossier(movies: WatchedMovie[]): {
  dossier: string;
  profile: TasteProfile;
} {
  const profile = buildTasteProfile(movies);

  const rated = movies.filter((m) => m.rating != null);
  const loved = [...rated]
    .filter((m) => (m.rating ?? 0) >= 3.5)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 25);
  const disliked = [...rated]
    .filter((m) => (m.rating ?? 5) <= 2.5)
    .sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0))
    .slice(0, 12);
  const reviewed = movies
    .filter((m) => m.review.trim() && !loved.includes(m))
    .slice(0, 12);
  const recent = [...movies]
    .filter((m) => m.watchedDate)
    .sort((a, b) => (b.watchedDate ?? "").localeCompare(a.watchedDate ?? ""))
    .slice(0, 12);

  const sections: string[] = [
    `WATCH HISTORY SIZE: ${profile.totalWatched} films, ${profile.ratedCount} rated, average rating ${profile.avgRating || "n/a"}/5.`,
  ];

  if (profile.topGenres.length) {
    sections.push(`TOP GENRES: ${buckets(profile.topGenres, 8)}`);
  }
  if (profile.topDirectors.length) {
    sections.push(`TOP DIRECTORS: ${buckets(profile.topDirectors, 8)}`);
  }
  if (profile.topActors.length) {
    sections.push(`RECURRING ACTORS: ${buckets(profile.topActors, 8)}`);
  }
  if (profile.topThemes.length) {
    sections.push(`RECURRING THEMES: ${buckets(profile.topThemes, 12)}`);
  }
  if (profile.storySignals.length) {
    sections.push(`STORY SIGNALS: ${buckets(profile.storySignals, 10)}`);
  }

  if (loved.length) {
    sections.push(`HIGHEST RATED:\n${loved.map(line).join("\n")}`);
  }
  if (disliked.length) {
    sections.push(
      `DISLIKED (avoid these patterns):\n${disliked.map(line).join("\n")}`,
    );
  }
  if (reviewed.length) {
    sections.push(`FILMS WITH WRITTEN NOTES:\n${reviewed.map(line).join("\n")}`);
  }
  if (recent.length) {
    sections.push(`RECENTLY WATCHED:\n${recent.map(line).join("\n")}`);
  }

  const rewatchable = movies.filter((m) => m.rewatchable).slice(0, 12);
  if (rewatchable.length) {
    sections.push(
      `MARKED REWATCHABLE (comfort films): ${rewatchable
        .map((m) => m.title)
        .join(", ")}`,
    );
  }

  return { dossier: sections.join("\n\n"), profile };
}
