import { promises as fs } from "fs";
import path from "path";
import type { AppSettings, AppStore, WatchedMovie } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

const DEFAULT_STORE: AppStore = {
  settings: {
    tmdbApiKey: "",
    anthropicApiKey: "",
    claudeModel: "claude-haiku-4-5",
  },
  movies: [],
};

async function ensureStore(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify(DEFAULT_STORE, null, 2), "utf8");
  }
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function strArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

function numOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * The store is a hand-editable file that has also outlived a schema change,
 * so a record may be missing fields the rest of the app treats as required.
 * Coercing on read keeps one bad row from breaking every page.
 */
function normalizeMovie(raw: unknown): WatchedMovie | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;

  const title = str(m.title).trim();
  if (!title) return null;

  const now = new Date().toISOString();
  return {
    id: str(m.id) || createId(),
    tmdbId: numOrNull(m.tmdbId),
    title,
    year: numOrNull(m.year),
    posterPath: typeof m.posterPath === "string" ? m.posterPath : null,
    backdropPath: typeof m.backdropPath === "string" ? m.backdropPath : null,
    overview: str(m.overview),
    genres: strArray(m.genres),
    themes: strArray(m.themes),
    actors: strArray(m.actors),
    directors: strArray(m.directors),
    runtime: numOrNull(m.runtime),
    rating: numOrNull(m.rating),
    review: str(m.review),
    watchedDate: typeof m.watchedDate === "string" ? m.watchedDate : null,
    rewatchable: m.rewatchable === true,
    source: m.source === "manual" ? "manual" : "letterboxd",
    createdAt: str(m.createdAt, now),
    updatedAt: str(m.updatedAt, now),
  };
}

export async function readStore(): Promise<AppStore> {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw) as Partial<AppStore>;
    const movies = Array.isArray(parsed.movies) ? parsed.movies : [];
    return {
      settings: {
        tmdbApiKey: str(parsed.settings?.tmdbApiKey),
        anthropicApiKey: str(parsed.settings?.anthropicApiKey),
        claudeModel: parsed.settings?.claudeModel ?? "claude-haiku-4-5",
      },
      movies: movies
        .map(normalizeMovie)
        .filter((m): m is WatchedMovie => m !== null),
    };
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
}

export async function writeStore(store: AppStore): Promise<void> {
  await ensureStore();
  // Write-then-rename so an interrupted write can't truncate the archive.
  const tmpPath = `${STORE_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(tmpPath, STORE_PATH);
}

export async function getSettings(): Promise<AppSettings> {
  const store = await readStore();
  return store.settings;
}

export async function updateSettings(
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  const store = await readStore();
  store.settings = { ...store.settings, ...patch };
  await writeStore(store);
  return store.settings;
}

export async function listMovies(): Promise<WatchedMovie[]> {
  const store = await readStore();
  return [...store.movies].sort((a, b) => {
    const aDate = a.watchedDate || a.createdAt;
    const bDate = b.watchedDate || b.createdAt;
    return bDate.localeCompare(aDate);
  });
}

export async function upsertMovies(
  incoming: WatchedMovie[],
): Promise<{ added: number; updated: number; movies: WatchedMovie[] }> {
  const store = await readStore();
  let added = 0;
  let updated = 0;

  for (const movie of incoming) {
    const existingIndex = store.movies.findIndex((m) => {
      if (movie.tmdbId && m.tmdbId === movie.tmdbId) return true;
      return (
        m.title.toLowerCase() === movie.title.toLowerCase() &&
        m.year === movie.year
      );
    });

    if (existingIndex >= 0) {
      const existing = store.movies[existingIndex];
      store.movies[existingIndex] = {
        ...existing,
        ...movie,
        id: existing.id,
        rewatchable: movie.rewatchable ?? existing.rewatchable,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };
      updated += 1;
    } else {
      store.movies.push(movie);
      added += 1;
    }
  }

  await writeStore(store);
  return { added, updated, movies: store.movies };
}

export async function updateMovie(
  id: string,
  patch: Partial<WatchedMovie>,
): Promise<WatchedMovie | null> {
  const store = await readStore();
  const index = store.movies.findIndex((m) => m.id === id);
  if (index < 0) return null;

  store.movies[index] = {
    ...store.movies[index],
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  };
  await writeStore(store);
  return store.movies[index];
}

export async function deleteMovie(id: string): Promise<boolean> {
  const store = await readStore();
  const before = store.movies.length;
  store.movies = store.movies.filter((m) => m.id !== id);
  if (store.movies.length === before) return false;
  await writeStore(store);
  return true;
}

export function createId(): string {
  return `mb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}
