export function formatRating(rating: number | null | undefined): string {
  if (rating == null) return "—";
  return Number.isInteger(rating) ? `${rating}` : rating.toFixed(1);
}

export function starsFromRating(rating: number | null | undefined): string {
  if (rating == null) return "unrated";
  return `${formatRating(rating)}★`;
}
