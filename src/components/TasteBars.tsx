import type { TasteBucket } from "@/lib/types";

export function TasteBars({
  title,
  items,
  accent = "var(--accent)",
}: {
  title: string;
  items: TasteBucket[];
  accent?: string;
}) {
  const max = items[0]?.score || 1;

  return (
    <section>
      <h2 className="display text-2xl">{title}</h2>
      {!items.length ? (
        <p className="mt-3 text-sm text-[var(--ink-soft)]">
          Not enough signal yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.name}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span>{item.name}</span>
                <span className="text-[var(--ink-soft)]">{item.count}x</span>
              </div>
              <div className="h-1.5 bg-[rgba(23,20,18,0.08)]">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${Math.max(8, (item.score / max) * 100)}%`,
                    background: accent,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
