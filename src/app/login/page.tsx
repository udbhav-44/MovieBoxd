"use client";

import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not sign in");
      }
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get("next") || "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
      setBusy(false);
    }
  }

  return (
    <div className="page-enter mx-auto max-w-md pt-12">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
        Private
      </p>
      <h1 className="display mt-3 text-4xl sm:text-5xl">Sign in</h1>
      <p className="mt-5 text-[1.05rem] leading-relaxed text-[var(--ink-soft)]">
        This screening room is single-seat. Enter the password to continue.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
            Password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
            className="mt-2 w-full border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-3 text-sm outline-none transition focus:border-[var(--ink)]"
          />
        </label>

        <button
          type="submit"
          disabled={busy || !password}
          className="bg-[var(--accent)] px-5 py-2.5 text-sm text-[var(--bg-elevated)] transition-colors hover:bg-[var(--accent-deep)] disabled:opacity-60"
        >
          {busy ? "Checking…" : "Enter"}
        </button>

        {error ? (
          <p className="text-sm text-[var(--accent)]">{error}</p>
        ) : null}
      </form>
    </div>
  );
}
