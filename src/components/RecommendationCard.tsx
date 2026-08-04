"use client";

import { useState } from "react";
import { Poster } from "./Poster";
import type { Recommendation } from "@/lib/types";

type Action = "watched" | "dismissed";

export function RecommendationCard({
  rec,
  rank,
  onResolved,
}: {
  rec: Recommendation;
  rank?: number;
  onResolved: (tmdbId: number, action: Action) => void;
}) {
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rewatchable, setRewatchable] = useState(false);

  async function markWatched() {
    setBusy("watched");
    setError(null);
    try {
      const res = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: rec.tmdbId, rewatchable }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add to archive");
      onResolved(rec.tmdbId, "watched");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(null);
    }
  }

  async function dismiss() {
    setBusy("dismissed");
    setError(null);
    try {
      const res = await fetch("/api/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: rec.tmdbId }),
      });
      if (!res.ok) throw new Error("Could not dismiss");
      onResolved(rec.tmdbId, "dismissed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(null);
    }
  }

  return (
    <article
      className={`grid grid-cols-[104px_1fr] gap-4 sm:grid-cols-[120px_1fr] sm:gap-5 ${
        busy ? "opacity-50" : ""
      }`}
    >
      <Poster path={rec.posterPath} title={rec.title} />
      <div className="flex min-w-0 flex-col justify-center">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {rank != null ? (
            <span className="display text-sm text-[var(--ink-soft)]">
              {String(rank).padStart(2, "0")}
            </span>
          ) : null}
          <h3 className="display text-2xl">{rec.title}</h3>
          {rec.year ? (
            <span className="text-sm text-[var(--ink-soft)]">{rec.year}</span>
          ) : null}
          {rec.confidence != null ? (
            <span
              className="ml-auto text-xs uppercase tracking-[0.14em]"
              style={{ color: "var(--forest)" }}
              title="Claude's confidence this fits your taste"
            >
              {rec.confidence}% match
            </span>
          ) : null}
        </div>

        {rec.genres.length ? (
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
            {rec.genres.slice(0, 3).join(" · ")}
          </p>
        ) : null}

        {rec.pitch ? (
          <p className="mt-3 text-[0.98rem] leading-relaxed text-[var(--ink)]">
            {rec.pitch}
          </p>
        ) : null}

        <ul className="mt-3 space-y-1.5">
          {rec.reasons.map((reason) => (
            <li
              key={reason}
              className="border-l-2 border-[var(--accent)] pl-3 text-sm leading-snug text-[var(--ink)]"
            >
              {reason}
            </li>
          ))}
        </ul>

        {rec.overview ? (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[var(--ink-soft)]">
            {rec.overview}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={markWatched}
            disabled={busy !== null}
            className="border border-[var(--line)] px-3 py-1.5 text-sm transition hover:border-[var(--ink)] disabled:opacity-60"
          >
            {busy === "watched" ? "Adding…" : "Mark watched"}
          </button>

          <label className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-soft)]">
            <input
              type="checkbox"
              checked={rewatchable}
              onChange={(e) => setRewatchable(e.target.checked)}
              disabled={busy !== null}
            />
            Rewatchable
          </label>

          <button
            type="button"
            onClick={dismiss}
            disabled={busy !== null}
            className="text-sm text-[var(--ink-soft)] underline decoration-[var(--line)] underline-offset-4 transition hover:text-[var(--accent)] disabled:opacity-60"
            title="Never recommend this again"
          >
            {busy === "dismissed" ? "Hiding…" : "Not for me"}
          </button>

          <a
            href={`https://www.themoviedb.org/movie/${rec.tmdbId}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[var(--ink-soft)] underline decoration-[var(--line)] underline-offset-4 transition hover:text-[var(--ink)]"
          >
            TMDB
          </a>
        </div>

        {error ? (
          <p className="mt-2 text-sm text-[var(--accent)]">{error}</p>
        ) : null}
      </div>
    </article>
  );
}
