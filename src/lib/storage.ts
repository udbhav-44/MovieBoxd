import { promises as fs } from "fs";
import path from "path";
import type { AppSettings, AppStore, WatchedMovie } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

const DEFAULT_STORE: AppStore = {
  settings: {
    tmdbApiKey: "",
    anthropicApiKey: "",
    claudeModel: "claude-sonnet-5",
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

export async function readStore(): Promise<AppStore> {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw) as AppStore;
    return {
      settings: {
        tmdbApiKey: parsed.settings?.tmdbApiKey ?? "",
        anthropicApiKey: parsed.settings?.anthropicApiKey ?? "",
        claudeModel: parsed.settings?.claudeModel ?? "claude-sonnet-5",
      },
      movies: Array.isArray(parsed.movies) ? parsed.movies : [],
    };
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
}

export async function writeStore(store: AppStore): Promise<void> {
  await ensureStore();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
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
