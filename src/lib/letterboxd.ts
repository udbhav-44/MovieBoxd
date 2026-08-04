import Papa from "papaparse";

export interface LetterboxdRow {
  title: string;
  year: number | null;
  rating: number | null;
  watchedDate: string | null;
  review: string;
  rewatch: boolean;
  letterboxdUri: string | null;
}

function pick(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const direct = row[key];
    if (direct != null && String(direct).trim()) return String(direct).trim();
    const found = Object.keys(row).find(
      (k) => k.toLowerCase() === key.toLowerCase(),
    );
    if (found && row[found] != null && String(row[found]).trim()) {
      return String(row[found]).trim();
    }
  }
  return "";
}

function parseRating(raw: string): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Letterboxd exports are usually 0.5–5
  if (n <= 5) return Math.round(n * 2) / 2;
  // Some exports use 1–10
  if (n <= 10) return Math.round(n) / 2;
  return null;
}

function parseYear(raw: string): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 1800 && n < 2100 ? n : null;
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function parseLetterboxdCsv(csvText: string): LetterboxdRow[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length && !parsed.data.length) {
    throw new Error(parsed.errors[0]?.message || "Failed to parse CSV");
  }

  const rows: LetterboxdRow[] = [];

  for (const row of parsed.data) {
    const title = pick(row, ["Name", "Title", "Film", "movie"]);
    if (!title) continue;

    const year = parseYear(pick(row, ["Year", "Release Year"]));
    const rating = parseRating(pick(row, ["Rating", "Your Rating", "Stars"]));
    const watchedDate = parseDate(
      pick(row, ["Watched Date", "Date", "Diary Date"]),
    );
    const review = pick(row, ["Review", "Notes", "Comment"]);
    const rewatchRaw = pick(row, ["Rewatch", "Rewatched"]).toLowerCase();
    const rewatch =
      rewatchRaw === "yes" ||
      rewatchRaw === "true" ||
      rewatchRaw === "1" ||
      rewatchRaw === "x";
    const letterboxdUri = pick(row, ["Letterboxd URI", "URI", "URL"]) || null;

    rows.push({
      title,
      year,
      rating,
      watchedDate,
      review,
      rewatch,
      letterboxdUri,
    });
  }

  // Deduplicate by title+year, keeping the richest row
  const map = new Map<string, LetterboxdRow>();
  for (const row of rows) {
    const key = `${row.title.toLowerCase()}::${row.year ?? ""}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, row);
      continue;
    }
    map.set(key, {
      ...existing,
      rating: row.rating ?? existing.rating,
      watchedDate: row.watchedDate ?? existing.watchedDate,
      review: row.review || existing.review,
      rewatch: existing.rewatch || row.rewatch,
      letterboxdUri: row.letterboxdUri ?? existing.letterboxdUri,
    });
  }

  return [...map.values()];
}
