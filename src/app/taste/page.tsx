"use client";

import { useEffect, useState } from "react";
import { TasteBars } from "@/components/TasteBars";
import type { TasteProfile } from "@/lib/types";

export default function TastePage() {
  const [profile, setProfile] = useState<TasteProfile | null>(null);

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

  return (
    <div className="page-enter">
      <section className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
          Profile
        </p>
        <h1 className="display mt-3 text-5xl leading-[0.95] sm:text-6xl">
          Taste
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--ink-soft)]">
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
