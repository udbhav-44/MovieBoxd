"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Poster } from "@/components/Poster";
import { StarRating } from "@/components/StarRating";

interface SearchHit {
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  overview: string;
  voteAverage: number;
}

export default function AddPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [rewatchable, setRewatchable] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [addStatus, setAddStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setAddStatus(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.results ?? []);
    } catch (err) {
      setResults([]);
      setSearchError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  function addMovie(hit: SearchHit) {
    startTransition(async () => {
      setAddStatus(null);
      const res = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: hit.tmdbId,
          rating,
          review,
          rewatchable,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddStatus(data.error || "Could not add film");
        return;
      }
      setAddStatus(`Added “${hit.title}” to your archive.`);
    });
  }

  async function onImport(file: File | null) {
    if (!file) return;
    setImportStatus("Importing and enriching with TMDB…");
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch("/api/import", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setImportStatus(
        `Imported ${data.imported} rows (${data.added} new, ${data.updated} updated${
          data.unresolved ? `, ${data.unresolved} unresolved` : ""
        }${data.truncated ? "; large file truncated to 250" : ""}).`,
      );
    } catch (err) {
      setImportStatus(err instanceof Error ? err.message : "Import failed");
    }
  }

  return (
    <div className="page-enter">
      <section className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
          Intake
        </p>
        <h1 className="display mt-3 text-4xl sm:text-5xl">
          Add
        </h1>
        <p className="mt-5 text-[1.05rem] leading-relaxed text-[var(--ink-soft)]">
          Drop a Letterboxd CSV, or search TMDB and file a title by hand.
        </p>
      </section>

      <section className="mt-10 border border-[var(--line)] bg-[var(--bg-elevated)] p-5 sm:p-6">
        <h2 className="display text-2xl">Letterboxd CSV</h2>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          Accepts diary, ratings, or watched exports with Name / Year / Rating
          columns.
        </p>
        <label className="mt-4 inline-flex cursor-pointer bg-[var(--ink)] px-4 py-2.5 text-sm text-[var(--bg)] transition hover:bg-[var(--accent)]">
          Choose CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => onImport(e.target.files?.[0] ?? null)}
          />
        </label>
        {importStatus ? (
          <p className="mt-3 text-sm text-[var(--forest)]">{importStatus}</p>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="display text-2xl">Manual TMDB add</h2>
        <form onSubmit={onSearch} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a film title"
            className="w-full border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--ink)]"
          />
          <button
            type="submit"
            disabled={searching}
            className="bg-[var(--accent)] px-5 py-2.5 text-sm text-[var(--bg-elevated)] transition-colors hover:bg-[var(--accent-deep)] disabled:opacity-60"
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </form>

        <div className="mt-6 grid gap-4 border border-[var(--line)] bg-[var(--bg-elevated)] p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
              Your rating
            </p>
            <div className="mt-2">
              <StarRating value={rating} onChange={setRating} />
            </div>
          </div>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
              Review / notes
            </span>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={3}
              className="mt-2 w-full border border-[var(--line)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--ink)]"
              placeholder="Optional — feeds story signals"
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-[var(--ink-soft)] sm:col-span-2">
            <input
              type="checkbox"
              checked={rewatchable}
              onChange={(e) => setRewatchable(e.target.checked)}
            />
            Mark as rewatchable
          </label>
        </div>

        {searchError ? (
          <p className="mt-4 text-sm text-[var(--accent)]">{searchError}</p>
        ) : null}
        {addStatus ? (
          <p className="mt-4 text-sm text-[var(--forest)]">{addStatus}</p>
        ) : null}

        <div className="stagger mt-8 space-y-6">
          {results.map((hit) => (
            <article
              key={hit.tmdbId}
              className="grid grid-cols-[72px_1fr] gap-4 border-b border-[var(--line)] pb-6 sm:grid-cols-[88px_1fr_auto]"
            >
              <Poster path={hit.posterPath} title={hit.title} />
              <div>
                <h3 className="display text-xl leading-snug">
                  {hit.title}{" "}
                  {hit.year ? (
                    <span className="text-base text-[var(--ink-soft)]">
                      {hit.year}
                    </span>
                  ) : null}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm text-[var(--ink-soft)]">
                  {hit.overview || "No overview."}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => addMovie(hit)}
                className="col-span-2 h-fit border border-[var(--line)] px-4 py-2 text-sm transition hover:border-[var(--ink)] sm:col-span-1"
              >
                Add
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
