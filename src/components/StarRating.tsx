"use client";

export function StarRating({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const steps = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {steps.map((step) => {
        const active = value != null && value >= step;
        return (
          <button
            key={step}
            type="button"
            onClick={() => onChange(value === step ? null : step)}
            className="h-7 min-w-7 px-1 text-xs transition-colors"
            style={{
              color: active ? "var(--gold)" : "var(--ink-soft)",
              borderBottom: active
                ? "1px solid var(--gold)"
                : "1px solid transparent",
            }}
            aria-label={`${step} stars`}
          >
            {step}
          </button>
        );
      })}
    </div>
  );
}
