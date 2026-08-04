import { Poster } from "./Poster";
import type { Recommendation } from "@/lib/types";

export function RecommendationCard({
  rec,
  rank,
}: {
  rec: Recommendation;
  rank?: number;
}) {
  return (
    <article className="grid grid-cols-[104px_1fr] gap-4 sm:grid-cols-[120px_1fr] sm:gap-5">
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
      </div>
    </article>
  );
}
