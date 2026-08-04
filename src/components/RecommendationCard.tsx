import { Poster } from "./Poster";
import type { Recommendation } from "@/lib/types";

export function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <article className="grid grid-cols-[104px_1fr] gap-4 sm:grid-cols-[120px_1fr] sm:gap-5">
      <Poster path={rec.posterPath} title={rec.title} />
      <div className="flex min-w-0 flex-col justify-center">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h3 className="display text-2xl leading-snug">{rec.title}</h3>
          {rec.year ? (
            <span className="text-sm text-[var(--ink-soft)]">{rec.year}</span>
          ) : null}
        </div>
        {rec.genres.length ? (
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
            {rec.genres.slice(0, 3).join(" · ")}
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
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--ink-soft)]">
            {rec.overview}
          </p>
        ) : null}
      </div>
    </article>
  );
}
