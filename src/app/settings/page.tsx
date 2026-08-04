"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { ClaudeModel } from "@/lib/types";

const MODEL_LABELS: Record<ClaudeModel, string> = {
  "claude-sonnet-5": "Claude Sonnet 5 — balanced speed and judgment",
  "claude-opus-5": "Claude Opus 5 — deepest reasoning, slower",
  "claude-haiku-4-5": "Claude Haiku 4.5 — fastest and cheapest",
};

export default function SettingsPage() {
  const [tmdbKey, setTmdbKey] = useState("");
  const [claudeKey, setClaudeKey] = useState("");
  const [model, setModel] = useState<ClaudeModel>("claude-sonnet-5");
  const [models, setModels] = useState<ClaudeModel[]>(["claude-sonnet-5"]);
  const [hasKey, setHasKey] = useState(false);
  const [hasClaudeKey, setHasClaudeKey] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (cancelled) return;
      setTmdbKey(data.tmdbApiKey ?? "");
      setClaudeKey(data.anthropicApiKey ?? "");
      setModel(data.claudeModel ?? "claude-sonnet-5");
      setModels(data.models ?? ["claude-sonnet-5"]);
      setHasKey(Boolean(data.hasKey));
      setHasClaudeKey(Boolean(data.hasClaudeKey));
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
        body: JSON.stringify({
          tmdbApiKey: tmdbKey.trim(),
          anthropicApiKey: claudeKey.trim(),
          claudeModel: model,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      setHasKey(Boolean(data.hasKey));
      setHasClaudeKey(Boolean(data.hasClaudeKey));
      setStatus("Settings saved.");
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
        <h1 className="display mt-3 text-4xl sm:text-5xl">Settings</h1>
        <p className="mt-5 text-[1.05rem] leading-relaxed text-[var(--ink-soft)]">
          MovieBoxd is single-user and stores keys locally in{" "}
          <code className="text-[var(--ink)]">data/store.json</code>, which is
          gitignored.
        </p>
      </section>

      <form onSubmit={onSubmit} className="mt-10 space-y-8">
        <fieldset className="space-y-3 border border-[var(--line)] bg-[var(--bg-elevated)] p-5">
          <legend className="px-2 text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
            Movie data
          </legend>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
              TMDB API key
            </span>
            <input
              type="password"
              value={tmdbKey}
              onChange={(e) => setTmdbKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              disabled={!ready}
              placeholder="Paste your v3 API key"
              className="mt-2 w-full border border-[var(--line)] bg-transparent px-3 py-3 text-sm outline-none transition focus:border-[var(--ink)] disabled:opacity-60"
            />
          </label>
          <p className="text-sm text-[var(--ink-soft)]">
            Required for search, import, and candidate retrieval. Free from{" "}
            <a
              href="https://www.themoviedb.org/settings/api"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-[var(--accent)] underline-offset-4"
            >
              TMDB
            </a>
            . Status: {ready ? (hasKey ? "configured" : "missing") : "loading…"}
          </p>
        </fieldset>

        <fieldset className="space-y-3 border border-[var(--line)] bg-[var(--bg-elevated)] p-5">
          <legend className="px-2 text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
            Recommendation brain
          </legend>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
              Anthropic API key
            </span>
            <input
              type="password"
              value={claudeKey}
              onChange={(e) => setClaudeKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              disabled={!ready}
              placeholder="sk-ant-..."
              className="mt-2 w-full border border-[var(--line)] bg-transparent px-3 py-3 text-sm outline-none transition focus:border-[var(--ink)] disabled:opacity-60"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
              Model
            </span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as ClaudeModel)}
              disabled={!ready}
              className="mt-2 w-full border border-[var(--line)] bg-transparent px-3 py-3 text-sm outline-none transition focus:border-[var(--ink)] disabled:opacity-60"
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {MODEL_LABELS[m] ?? m}
                </option>
              ))}
            </select>
          </label>

          <p className="text-sm text-[var(--ink-soft)]">
            Claude ranks the TMDB shortlist against your watch history and
            writes the reasons. Without a key, MovieBoxd falls back to heuristic
            scoring. Keys from{" "}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-[var(--accent)] underline-offset-4"
            >
              the Anthropic Console
            </a>
            . Status:{" "}
            {ready ? (hasClaudeKey ? "configured" : "missing") : "loading…"}
          </p>
        </fieldset>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={saving || !ready}
            className="bg-[var(--accent)] px-5 py-2.5 text-sm text-[var(--bg-elevated)] transition-colors hover:bg-[var(--accent-deep)] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          {status ? (
            <span className="text-sm text-[var(--forest)]">{status}</span>
          ) : null}
        </div>
      </form>
    </div>
  );
}
