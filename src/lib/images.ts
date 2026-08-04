export function posterUrl(
  posterPath: string | null | undefined,
  size: "w185" | "w342" | "w500" | "original" = "w342",
): string | null {
  if (!posterPath) return null;
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}

export function backdropUrl(
  backdropPath: string | null | undefined,
  size: "w780" | "w1280" | "original" = "w1280",
): string | null {
  if (!backdropPath) return null;
  return `https://image.tmdb.org/t/p/${size}${backdropPath}`;
}
