"use client";

import { useState, useTransition } from "react";
import { Poster } from "./Poster";
import { Toggle } from "./Toggle";
import { formatRating } from "@/lib/format";
import type { WatchedMovie } from "@/lib/types";

export function WatchedRow({
  movie,
  onChanged,
}: {
  movie: WatchedMovie;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [rewatchable, setRewatchable] = useState(movie.rewatchable);

  function patch(next: boolean) {
    setRewatchable(next);
    startTransition(async () => {
      const res = await fetch(`/api/movies/${movie.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewatchable: next }),
      });
      if (!res.ok) {
        setRewatchable(!next);
        return;
      }
      onChanged();
    });
  }

  async function remove() {
    if (!confirm(`Remove “${movie.title}” from your archive?`)) return;
    startTransition(async () => {
      await fetch(`/api/movies/${movie.id}`, { method: "DELETE" });
      onChanged();
    });
  }

  return (
    <article
      className={`grid grid-cols-[72px_1fr] gap-4 border-b border-[var(--line)] py-5 sm:grid-cols-[88px_1fr_auto] ${
        pending ? "opacity-70" : ""
      }`}
    >
      <Poster path={movie.posterPath} title={movie.title} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 className="display text-xl leading-snug">{movie.title}</h3>
          {movie.year ? (
            <span className="text-sm text-[var(--ink-soft)]">{movie.year}</span>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          {movie.rating != null ? (
            <span style={{ color: "var(--gold)" }}>
              {formatRating(movie.rating)}★
            </span>
          ) : (
            "Unrated"
          )}
          {movie.watchedDate ? ` · ${movie.watchedDate}` : ""}
          {movie.source === "letterboxd" ? " · Letterboxd" : " · Manual"}
        </p>
        {movie.genres.length ? (
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
            {movie.genres.slice(0, 4).join(" · ")}
          </p>
        ) : null}
        {movie.review ? (
          <p className="mt-2 line-clamp-2 text-sm text-[var(--ink)]">
            {movie.review}
          </p>
        ) : null}
        <div className="mt-3 sm:hidden">
          <Toggle
            checked={rewatchable}
            onChange={patch}
            label="Rewatchable"
          />
        </div>
      </div>
      <div className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:flex-col sm:items-end sm:justify-center">
        <div className="hidden sm:block">
          <Toggle
            checked={rewatchable}
            onChange={patch}
            label="Rewatchable"
          />
        </div>
        <button
          type="button"
          onClick={remove}
          className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)] transition-colors hover:text-[var(--accent)]"
        >
          Remove
        </button>
      </div>
    </article>
  );
}
