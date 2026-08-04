"use client";

import { useMemo, useState, useTransition } from "react";
import { WatchedRow } from "@/components/WatchedRow";
import type { WatchedMovie } from "@/lib/types";

export function ArchiveClient({
  initialMovies,
}: {
  initialMovies: WatchedMovie[];
}) {
  const [movies, setMovies] = useState(initialMovies);
  const [query, setQuery] = useState("");
  const [onlyRewatchable, setOnlyRewatchable] = useState(false);
  const [, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const res = await fetch("/api/movies");
      const data = await res.json();
      setMovies(data.movies ?? []);
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return movies.filter((m) => {
      if (onlyRewatchable && !m.rewatchable) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        m.genres.some((g) => g.toLowerCase().includes(q)) ||
        m.actors.some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [movies, onlyRewatchable, query]);

  return (
    <div className="page-enter">
      <section className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
          Watched
        </p>
        <h1 className="display mt-3 text-5xl leading-[0.95] sm:text-6xl">
          Archive
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--ink-soft)]">
          Everything you&apos;ve seen. Toggle rewatchable to let a title re-enter
          For You.
        </p>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, genre, actor"
          className="w-full border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none transition focus:border-[var(--ink)] sm:max-w-sm"
        />
        <label className="inline-flex items-center gap-2 text-sm text-[var(--ink-soft)]">
          <input
            type="checkbox"
            checked={onlyRewatchable}
            onChange={(e) => setOnlyRewatchable(e.target.checked)}
          />
          Rewatchable only
        </label>
      </div>

      <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
        {filtered.length} title{filtered.length === 1 ? "" : "s"}
      </p>

      <div className="mt-2">
        {!filtered.length ? (
          <p className="mt-8 text-sm text-[var(--ink-soft)]">
            No films in view. Import a Letterboxd export or add one manually.
          </p>
        ) : (
          filtered.map((movie) => (
            <WatchedRow key={movie.id} movie={movie} onChanged={refresh} />
          ))
        )}
      </div>
    </div>
  );
}
