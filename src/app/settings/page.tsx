"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { ClaudeModel } from "@/lib/types";

/**
 * Costs are for one For You refresh: roughly 8k input and 1k output tokens.
 * The dossier is capped, so this holds whether the archive has 100 or 1000 films.
 */
const MODEL_INFO: Record<
  ClaudeModel,
  { label: string; perRefresh: string; note: string }
> = {
  "claude-haiku-4-5": {
    label: "Haiku 4.5",
    perRefresh: "~$0.01",
    note: "Recommended. Ample for ranking and reasons.",
  },
  "claude-sonnet-5": {
    label: "Sonnet 5",
    perRefresh: "~$0.03",
    note: "Sharper prose in reasons and taste reads.",
  },
  "claude-opus-5": {
    label: "Opus 5",
    perRefresh: "~$0.07",
    note: "Deepest reasoning. Overkill for this task.",
  },
};

export default function SettingsPage() {
  const [tmdbKey, setTmdbKey] = useState("");
  const [claudeKey, setClaudeKey] = useState("");
  const [model, setModel] = useState<ClaudeModel>("claude-haiku-4-5");
  const [models, setModels] = useState<ClaudeModel[]>(["claude-haiku-4-5"]);
  const [hasKey, setHasKey] = useState(false);
  const [hasClaudeKey, setHasClaudeKey] = useState(false);
  const [tmdbHint, setTmdbHint] = useState("");
  const [claudeHint, setClaudeHint] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (cancelled) return;
      // Only hints come back; the real keys never leave the server.
      setTmdbHint(data.tmdbKeyHint ?? "");
      setClaudeHint(data.anthropicKeyHint ?? "");
      setModel(data.claudeModel ?? "claude-haiku-4-5");
      setModels(data.models ?? ["claude-haiku-4-5"]);
      setHasKey(Boolean(data.hasKey));
      setHasClaudeKey(Boolean(data.hasClaudeKey));
      setReady(true);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(extra: Record<string, unknown> = {}) {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Blank means "keep the stored key" so an unrelated save is safe.
          tmdbApiKey: tmdbKey.trim(),
          anthropicApiKey: claudeKey.trim(),
          claudeModel: model,
          ...extra,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      setHasKey(Boolean(data.hasKey));
      setHasClaudeKey(Boolean(data.hasClaudeKey));
      setTmdbHint(data.tmdbKeyHint ?? "");
      setClaudeHint(data.anthropicKeyHint ?? "");
      setTmdbKey("");
      setClaudeKey("");
      setStatus("Settings saved.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await save();
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
              placeholder={
                hasKey ? `Stored ${tmdbHint} — type to replace` : "Paste your v3 API key"
              }
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
              placeholder={
                hasClaudeKey
                  ? `Stored ${claudeHint} — type to replace`
                  : "sk-ant-..."
              }
              className="mt-2 w-full border border-[var(--line)] bg-transparent px-3 py-3 text-sm outline-none transition focus:border-[var(--ink)] disabled:opacity-60"
            />
          </label>
          {hasClaudeKey ? (
            <button
              type="button"
              onClick={() => save({ clearAnthropicKey: true })}
              disabled={saving}
              className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)] transition hover:text-[var(--accent)] disabled:opacity-60"
            >
              Remove stored key
            </button>
          ) : null}

          <fieldset className="mt-2">
            <legend className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
              Model
            </legend>
            <div className="mt-2 space-y-2">
              {models.map((m) => {
                const info = MODEL_INFO[m];
                const selected = model === m;
                return (
                  <label
                    key={m}
                    className="flex cursor-pointer items-baseline gap-3 border p-3 transition"
                    style={{
                      borderColor: selected ? "var(--ink)" : "var(--line)",
                    }}
                  >
                    <input
                      type="radio"
                      name="claude-model"
                      value={m}
                      checked={selected}
                      onChange={() => setModel(m)}
                      disabled={!ready}
                      className="mt-1"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm">{info?.label ?? m}</span>
                        <span
                          className="text-xs uppercase tracking-[0.14em]"
                          style={{ color: "var(--forest)" }}
                        >
                          {info?.perRefresh} / refresh
                        </span>
                      </span>
                      <span className="mt-1 block text-sm text-[var(--ink-soft)]">
                        {info?.note}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <p className="text-sm text-[var(--ink-soft)]">
            Claude ranks the TMDB shortlist against your watch history and
            writes the reasons. Estimates assume roughly 8k input and 1k output
            tokens per refresh; the dossier is capped, so cost stays flat as
            your archive grows. Without a key, MovieBoxd falls back to heuristic
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
