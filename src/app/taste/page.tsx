"use client";

import { useEffect, useState } from "react";
import { TasteBars } from "@/components/TasteBars";
import type { TasteNarrative, TasteProfile } from "@/lib/types";

export default function TastePage() {
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [narrative, setNarrative] = useState<TasteNarrative | null>(null);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/taste");
      const data = await res.json();
      if (!cancelled) setProfile(data.profile ?? null);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function readTaste() {
    setReading(true);
    setReadError(null);
    try {
      const res = await fetch("/api/taste?narrative=1");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not read your taste");
      setNarrative(data.narrative ?? null);
    } catch (err) {
      setReadError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="page-enter">
      <section className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
          Profile
        </p>
        <h1 className="display mt-3 text-4xl sm:text-5xl">Taste</h1>
        <p className="mt-5 text-[1.05rem] leading-relaxed text-[var(--ink-soft)]">
          A living map of what you reward with high ratings — genres, people,
          themes, and story signals mined from overviews and reviews.
        </p>
      </section>

      {!profile ? (
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-56 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Watched", value: profile.totalWatched },
              { label: "Avg rating", value: profile.avgRating || "—" },
              { label: "Rated", value: profile.ratedCount },
              { label: "Rewatchable", value: profile.rewatchableCount },
            ].map((stat) => (
              <div
                key={stat.label}
                className="border border-[var(--line)] bg-[var(--bg-elevated)] p-4"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                  {stat.label}
                </p>
                <p className="display mt-2 text-3xl">{stat.value}</p>
              </div>
            ))}
          </div>

          <section className="mt-10 border border-[var(--line)] bg-[var(--bg-elevated)] p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="display text-2xl">Critic&apos;s read</h2>
              <button
                type="button"
                onClick={readTaste}
                disabled={reading || !profile.totalWatched}
                className="bg-[var(--accent)] px-4 py-2 text-sm text-[var(--bg-elevated)] transition-colors hover:bg-[var(--accent-deep)] disabled:opacity-60"
              >
                {reading ? "Reading…" : narrative ? "Re-read" : "Ask Claude"}
              </button>
            </div>

            {readError ? (
              <p className="mt-3 text-sm text-[var(--accent)]">{readError}</p>
            ) : null}

            {narrative ? (
              <div className="mt-5">
                <p className="display text-2xl">{narrative.headline}</p>
                <p className="mt-3 text-[1.02rem] leading-relaxed text-[var(--ink)]">
                  {narrative.summary}
                </p>
                <div className="mt-6 grid gap-6 sm:grid-cols-3">
                  {[
                    { title: "Rewards", items: narrative.lovesList },
                    { title: "Rejects", items: narrative.avoidsList },
                    { title: "Blind spots", items: narrative.blindSpots },
                  ].map((col) =>
                    col.items.length ? (
                      <div key={col.title}>
                        <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                          {col.title}
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {col.items.map((item) => (
                            <li
                              key={item}
                              className="border-l-2 border-[var(--line)] pl-3 text-sm leading-snug"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null,
                  )}
                </div>
              </div>
            ) : !readError ? (
              <p className="mt-3 text-sm text-[var(--ink-soft)]">
                Have Claude read your full history and describe the through-line
                — what you reward, what you reject, and where the gaps are.
              </p>
            ) : null}
          </section>

          <div className="mt-12 grid gap-12 md:grid-cols-2">
            <TasteBars title="Genres" items={profile.topGenres} />
            <TasteBars
              title="Story signals"
              items={profile.storySignals}
              accent="var(--forest)"
            />
            <TasteBars
              title="Actors"
              items={profile.topActors}
              accent="var(--gold)"
            />
            <TasteBars
              title="Directors"
              items={profile.topDirectors}
              accent="var(--accent-deep)"
            />
            <TasteBars
              title="Themes"
              items={profile.topThemes}
              accent="var(--forest)"
            />
          </div>
        </>
      )}
    </div>
  );
}
