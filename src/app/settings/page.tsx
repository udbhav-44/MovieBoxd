"use client";

import { useEffect, useState, type FormEvent } from "react";

export default function SettingsPage() {
  const [key, setKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (cancelled) return;
      setKey(data.tmdbApiKey ?? "");
      setHasKey(Boolean(data.hasKey));
      setReady(true);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbApiKey: key.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      setHasKey(Boolean(data.hasKey));
      setStatus(data.hasKey ? "API key saved." : "API key cleared.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-enter max-w-2xl">
      <section>
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
          Configuration
        </p>
        <h1 className="display mt-3 text-5xl leading-[0.95] sm:text-6xl">
          Settings
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--ink-soft)]">
          MovieBoxd is single-user and stores your key locally in{" "}
          <code className="text-[var(--ink)]">data/store.json</code>. Get a free
          key from{" "}
          <a
            href="https://www.themoviedb.org/settings/api"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-[var(--accent)] underline-offset-4"
          >
            TMDB
          </a>
          .
        </p>
      </section>

      <form onSubmit={onSubmit} className="mt-10 space-y-5">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
            TMDB API key
          </span>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            disabled={!ready}
            placeholder="Paste your v3 API key"
            className="mt-2 w-full border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-3 text-sm outline-none transition focus:border-[var(--ink)] disabled:opacity-60"
          />
        </label>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={saving || !ready}
            className="bg-[var(--accent)] px-5 py-2.5 text-sm text-[var(--bg-elevated)] transition-colors hover:bg-[var(--accent-deep)] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save key"}
          </button>
          <span className="text-sm text-[var(--ink-soft)]">
            Status: {ready ? (hasKey ? "configured" : "missing") : "loading…"}
          </span>
        </div>

        {status ? (
          <p className="text-sm text-[var(--forest)]">{status}</p>
        ) : null}
      </form>
    </div>
  );
}
