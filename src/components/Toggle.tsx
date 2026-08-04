"use client";

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-sm text-[var(--ink-soft)]"
    >
      <span
        className="relative h-5 w-9 rounded-sm border border-[var(--line)] transition-colors"
        style={{
          background: checked ? "var(--forest)" : "transparent",
        }}
      >
        <span
          className="absolute top-0.5 h-3.5 w-3.5 bg-[var(--bg-elevated)] transition-transform"
          style={{
            left: checked ? "1.15rem" : "0.2rem",
          }}
        />
      </span>
      <span>{label}</span>
    </button>
  );
}
