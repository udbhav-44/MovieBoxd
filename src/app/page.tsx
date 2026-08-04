"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RecommendationCard } from "@/components/RecommendationCard";
import type {
  Genre,
  Recommendation,
  RecommendationEngine,
} from "@/lib/types";

type LoadState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "empty"; message: string }
  | {
      status: "ready";
      recs: Recommendation[];
      engine: RecommendationEngine;
      engineNote?: string;
      refining?: boolean;
    };

export default function ForYouPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [seen, setSeen] = useState<number[]>([]);
  // Starts true because the mount effect fetches immediately.
  const [working, setWorking] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadGenres() {
      try {
        const res = await fetch("/api/genres");
        const data = await res.json();
        if (!cancelled) setGenres(data.genres ?? []);
      } catch {
        // genre chips are optional; failing quietly is fine
      }
    }
    void loadGenres();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchRecs = useCallback(
    async (
      opts: {
        genreIds: number[];
        refreshCount: number;
        exclude: number[];
      },
      /** Fires with the fast heuristic pass before Claude's ranking lands. */
      onPartial?: (partial: LoadState) => void,
    ): Promise<LoadState> => {
      const toState = (data: Record<string, unknown>): LoadState => {
        const recs = (data.recommendations ?? []) as Recommendation[];
        if (!recs.length) {
          return {
            status: "empty",
            message:
              (data.engineNote as string) ||
              (data.message as string) ||
              "Import or add watched films to unlock For You.",
          };
        }
        return {
          status: "ready",
          recs,
          engine: (data.engine ?? "heuristic") as RecommendationEngine,
          engineNote: data.engineNote as string | undefined,
          refining: Boolean(data.refining),
        };
      };

      try {
        const params = new URLSearchParams();
        if (opts.genreIds.length) params.set("genres", opts.genreIds.join(","));
        if (opts.refreshCount) params.set("refresh", String(opts.refreshCount));
        if (opts.exclude.length) params.set("exclude", opts.exclude.join(","));

        const res = await fetch(`/api/recommendations?${params}`);

        // Setup problems come back as plain JSON rather than a stream.
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Could not load recommendations");
        }
        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("ndjson")) {
          return toState(await res.json());
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let last: LoadState | null = null;

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line);
            if (event.type === "error") throw new Error(event.error);
            const next = toState(event);
            if (event.type === "partial") {
              onPartial?.(next);
            } else {
              last = next;
            }
          }
        }

        return (
          last ?? {
            status: "error",
            error: "Recommendation stream ended unexpectedly",
          }
        );
      } catch (err) {
        return {
          status: "error",
          error: err instanceof Error ? err.message : "Something went wrong",
        };
      }
    },
    [],
  );

  const apply = useCallback((next: LoadState) => {
    if (next.status === "ready") {
      setSeen((prev) => [
        ...new Set([...prev, ...next.recs.map((r) => r.tmdbId)]),
      ]);
    }
    setState(next);
    setWorking(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await fetchRecs(
        { genreIds: [], refreshCount: 0, exclude: [] },
        (partial) => {
          if (!cancelled) apply(partial);
        },
      );
      if (!cancelled) apply(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchRecs, apply]);

  async function run(genreIds: number[], refreshCount: number, exclude: number[]) {
    setState({ status: "loading" });
    setWorking(true);
    const final = await fetchRecs({ genreIds, refreshCount, exclude }, apply);
    apply(final);
  }

  function toggleGenre(id: number) {
    const next = selected.includes(id)
      ? selected.filter((g) => g !== id)
      : [...selected, id];
    setSelected(next);
    setRefresh(0);
    setSeen([]);
    void run(next, 0, []);
  }

  function showDifferent() {
    const next = refresh + 1;
    setRefresh(next);
    void run(selected, next, seen);
  }

  function startOver() {
    setRefresh(0);
    setSeen([]);
    void run(selected, 0, []);
  }

  function clearGenres() {
    setSelected([]);
    setRefresh(0);
    setSeen([]);
    void run([], 0, []);
  }

  function onResolved(tmdbId: number, action: "watched" | "dismissed") {
    setToast(
      action === "watched"
        ? "Added to your archive."
        : "Hidden — it won't come back.",
    );
    setTimeout(() => setToast(null), 2600);

    setState((prev) => {
      if (prev.status !== "ready") return prev;
      const recs = prev.recs.filter((r) => r.tmdbId !== tmdbId);
      if (!recs.length) {
        return {
          status: "empty",
          message: "That's the whole list. Pull in a fresh set below.",
        };
      }
      return { ...prev, recs };
    });
  }

  const hasFilter = selected.length > 0;

  return (
    <div className="page-enter">
      <section className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
          Tonight&apos;s cut
        </p>
        <h1 className="display mt-3 text-4xl sm:text-5xl">For You</h1>
        <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-[var(--ink-soft)]">
          Candidates retrieved from TMDB, then ranked by Claude against your
          full watch history. Watched titles stay out unless you mark them
          rewatchable.
        </p>
      </section>

      {genres.length ? (
        <section className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
              In the mood for {hasFilter ? "" : "anything"}
            </p>
            {hasFilter ? (
              <button
                type="button"
                onClick={clearGenres}
                className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)] transition hover:text-[var(--accent)]"
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {genres.map((genre) => {
              const active = selected.includes(genre.id);
              return (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => toggleGenre(genre.id)}
                  disabled={working}
                  className="border px-3 py-1.5 text-sm transition disabled:opacity-60"
                  style={{
                    borderColor: active ? "var(--ink)" : "var(--line)",
                    background: active ? "var(--ink)" : "transparent",
                    color: active ? "var(--bg)" : "var(--ink-soft)",
                  }}
                >
                  {genre.name}
                </button>
              );
            })}
          </div>

          {hasFilter ? (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">
              Showing the best-reviewed films in that genre, still ranked
              against your taste.
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="mt-10">
        {state.status === "loading" ? (
          <>
            <p className="mb-6 text-sm text-[var(--ink-soft)]">
              Reading your archive and consulting Claude…
            </p>
            <div className="stagger space-y-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[104px_1fr] gap-4">
                  <div className="skeleton aspect-[2/3]" />
                  <div className="space-y-3 py-2">
                    <div className="skeleton h-7 w-1/2" />
                    <div className="skeleton h-3 w-1/3" />
                    <div className="skeleton h-16 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : state.status === "error" ? (
          <div className="max-w-xl border border-[var(--line)] bg-[var(--bg-elevated)] p-6">
            <p className="display text-2xl">Needs a little setup</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
              {state.error}
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-sm">
              <Link
                href="/settings"
                className="bg-[var(--accent)] px-4 py-2 text-[var(--bg-elevated)] transition-colors hover:bg-[var(--accent-deep)]"
              >
                Open Settings
              </Link>
              <Link
                href="/add"
                className="border border-[var(--line)] px-4 py-2 transition-colors hover:border-[var(--ink)]"
              >
                Add films
              </Link>
            </div>
          </div>
        ) : state.status === "empty" ? (
          <div className="max-w-xl border border-[var(--line)] bg-[var(--bg-elevated)] p-6">
            <p className="display text-2xl">Nothing left in this batch</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
              {state.message}
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-sm">
              <button
                type="button"
                onClick={showDifferent}
                disabled={working}
                className="bg-[var(--accent)] px-4 py-2 text-[var(--bg-elevated)] transition-colors hover:bg-[var(--accent-deep)] disabled:opacity-60"
              >
                Dig deeper
              </button>
              {refresh > 0 || hasFilter ? (
                <button
                  type="button"
                  onClick={startOver}
                  disabled={working}
                  className="border border-[var(--line)] px-4 py-2 transition-colors hover:border-[var(--ink)] disabled:opacity-60"
                >
                  Start over
                </button>
              ) : null}
              <Link
                href="/add"
                className="border border-[var(--line)] px-4 py-2 transition-colors hover:border-[var(--ink)]"
              >
                Add films
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-[var(--line)] pb-4">
              <span
                className="text-xs uppercase tracking-[0.16em]"
                style={{
                  color:
                    state.engine === "claude"
                      ? "var(--forest)"
                      : "var(--ink-soft)",
                }}
              >
                {state.engine === "claude"
                  ? "Ranked by Claude"
                  : "Quick picks"}
              </span>
              {state.refining ? (
                <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
                  Claude is re-ranking these
                </span>
              ) : null}
              {refresh > 0 ? (
                <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                  Batch {refresh + 1}
                </span>
              ) : null}
              {state.engineNote ? (
                <span className="text-sm text-[var(--ink-soft)]">
                  {state.engineNote}
                </span>
              ) : null}

              <div className="ml-auto flex items-center gap-3">
                {refresh > 0 ? (
                  <button
                    type="button"
                    onClick={startOver}
                    disabled={working}
                    className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)] transition hover:text-[var(--ink)] disabled:opacity-60"
                  >
                    Start over
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={showDifferent}
                  disabled={working}
                  className="border border-[var(--line)] px-4 py-2 text-sm transition hover:border-[var(--ink)] disabled:opacity-60"
                >
                  {working ? "Finding…" : "Show me different picks"}
                </button>
              </div>
            </div>

            {toast ? (
              <p className="mb-6 text-sm" style={{ color: "var(--forest)" }}>
                {toast}
              </p>
            ) : null}

            <div className="stagger space-y-10">
              {state.recs.map((rec, i) => (
                <RecommendationCard
                  key={rec.tmdbId}
                  rec={rec}
                  rank={i + 1}
                  onResolved={onResolved}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
