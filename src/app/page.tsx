"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RecommendationCard } from "@/components/RecommendationCard";
import type { Recommendation, RecommendationEngine } from "@/lib/types";

type LoadState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "empty"; message: string }
  | {
      status: "ready";
      recs: Recommendation[];
      engine: RecommendationEngine;
      engineNote?: string;
    };

export default function ForYouPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/recommendations");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Could not load recommendations");
        }
        if (cancelled) return;
        const recs = (data.recommendations ?? []) as Recommendation[];
        if (!recs.length) {
          setState({
            status: "empty",
            message:
              data.message ||
              "Import or add watched films to unlock For You.",
          });
          return;
        }
        setState({
          status: "ready",
          recs,
          engine: (data.engine ?? "heuristic") as RecommendationEngine,
          engineNote: data.engineNote,
        });
      } catch (err) {
        if (!cancelled) {
          setState({
            status: "error",
            error: err instanceof Error ? err.message : "Something went wrong",
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

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
            <p className="display text-2xl">Your screening room is empty</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
              {state.message}
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-sm">
              <Link
                href="/add"
                className="bg-[var(--accent)] px-4 py-2 text-[var(--bg-elevated)] transition-colors hover:bg-[var(--accent-deep)]"
              >
                Import or add
              </Link>
              <Link
                href="/taste"
                className="border border-[var(--line)] px-4 py-2 transition-colors hover:border-[var(--ink)]"
              >
                View taste
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-wrap items-center gap-3 border-b border-[var(--line)] pb-4 text-xs uppercase tracking-[0.16em]">
              <span
                style={{
                  color:
                    state.engine === "claude"
                      ? "var(--forest)"
                      : "var(--ink-soft)",
                }}
              >
                {state.engine === "claude"
                  ? "Ranked by Claude"
                  : "Heuristic ranking"}
              </span>
              {state.engineNote ? (
                <span className="normal-case tracking-normal text-[var(--ink-soft)]">
                  {state.engineNote}
                </span>
              ) : null}
            </div>

            <div className="stagger space-y-10">
              {state.recs.map((rec, i) => (
                <RecommendationCard key={rec.tmdbId} rec={rec} rank={i + 1} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
