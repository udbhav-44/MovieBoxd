import { askClaude, parseJsonResponse } from "./claude";
import type {
  ClaudeModel,
  Recommendation,
  TasteNarrative,
} from "./types";

const RANKER_SYSTEM = `You are a film curator with encyclopedic knowledge of cinema, building a personal recommendation feed for one viewer.

You receive a dossier of everything they have watched — ratings, written notes, recurring directors, actors, and themes — plus a shortlist of candidate films retrieved from TMDB.

Your job is to pick and rank the films this specific person will actually love, and explain why in their own terms.

Rules:
- Judge fit to THIS viewer, not general acclaim. A masterpiece they will bounce off ranks below a flawed film in their wheelhouse.
- Use their written notes as the strongest signal; those reveal what they respond to emotionally.
- Actively avoid patterns in the films they rated poorly.
- Do not recommend a film that appears anywhere in their watch history.
- Favor a mix: some safe bets in their core taste, a few adventurous picks that stretch one dimension while holding another constant.
- Reasons must be specific and concrete. Reference their actual films, directors, or notes by name. Never write generic filler like "matches your taste in drama."
- Write in a warm, precise, critic-literate voice. No marketing hype, no emoji.

Return ONLY valid JSON, no prose or code fences, in this exact shape:
{
  "picks": [
    {
      "tmdbId": 123,
      "confidence": 87,
      "pitch": "One or two sentences on why this lands for them specifically.",
      "reasons": ["Short concrete reason", "Another concrete reason"]
    }
  ]
}

Order picks best-first. confidence is 0-100. Give each pick 2-3 reasons, each under 90 characters.`;

const NARRATIVE_SYSTEM = `You are a perceptive film critic writing a short profile of one viewer's taste, based on their complete watch history with ratings and notes.

Be specific and observant. Name actual directors, films, and patterns from their history. Identify the through-line most people would miss. Avoid flattery and avoid generic statements that could describe anyone.

Return ONLY valid JSON, no prose or code fences:
{
  "headline": "A short, vivid phrase naming their taste (under 60 characters)",
  "summary": "2-3 sentences describing what they gravitate toward and why.",
  "loves": ["Specific thing they reward", "Another", "Another"],
  "avoids": ["Specific thing they rate poorly", "Another"],
  "blindSpots": ["A respected area they have barely explored", "Another"]
}

Give 3-5 loves, 2-4 avoids, 2-3 blindSpots. Each entry under 80 characters.`;

interface ClaudePick {
  tmdbId: number;
  confidence?: number;
  pitch?: string;
  reasons?: string[];
}

function candidateLine(rec: Recommendation): string {
  const bits = [
    `id=${rec.tmdbId}`,
    `${rec.title}${rec.year ? ` (${rec.year})` : ""}`,
  ];
  if (rec.genres.length) bits.push(rec.genres.slice(0, 3).join("/"));
  if (rec.voteAverage) bits.push(`TMDB ${rec.voteAverage.toFixed(1)}`);
  const overview = rec.overview ? ` — ${rec.overview.slice(0, 220)}` : "";
  return `- ${bits.join(" · ")}${overview}`;
}

/**
 * Re-ranks a heuristically retrieved shortlist using Claude, keeping the
 * TMDB metadata as the source of truth for anything user-visible.
 */
export async function rankWithClaude({
  apiKey,
  model,
  dossier,
  candidates,
  limit,
}: {
  apiKey: string;
  model: ClaudeModel;
  dossier: string;
  candidates: Recommendation[];
  limit: number;
}): Promise<Recommendation[]> {
  if (!candidates.length) return [];

  const prompt = `VIEWER DOSSIER
${dossier}

CANDIDATE FILMS (${candidates.length})
${candidates.map(candidateLine).join("\n")}

Select and rank the best ${limit} films for this viewer from the candidates above. Use only tmdbId values from the candidate list.`;

  const raw = await askClaude({
    apiKey,
    model,
    system: RANKER_SYSTEM,
    prompt,
    maxTokens: 4000,
  });

  const parsed = parseJsonResponse<{ picks?: ClaudePick[] }>(raw);
  const picks = parsed.picks ?? [];
  const byId = new Map(candidates.map((c) => [c.tmdbId, c]));

  const ranked: Recommendation[] = [];
  for (const pick of picks) {
    const base = byId.get(pick.tmdbId);
    if (!base) continue;
    if (ranked.some((r) => r.tmdbId === base.tmdbId)) continue;

    const reasons = (pick.reasons ?? []).filter(Boolean).slice(0, 3);
    ranked.push({
      ...base,
      engine: "claude",
      confidence:
        typeof pick.confidence === "number"
          ? Math.max(0, Math.min(100, Math.round(pick.confidence)))
          : undefined,
      pitch: pick.pitch?.trim() || undefined,
      reasons: reasons.length ? reasons : base.reasons,
      score: 1000 - ranked.length,
    });

    if (ranked.length >= limit) break;
  }

  return ranked;
}

export async function narrateTaste({
  apiKey,
  model,
  dossier,
}: {
  apiKey: string;
  model: ClaudeModel;
  dossier: string;
}): Promise<TasteNarrative> {
  const raw = await askClaude({
    apiKey,
    model,
    system: NARRATIVE_SYSTEM,
    prompt: `VIEWER DOSSIER\n${dossier}\n\nWrite their taste profile.`,
    maxTokens: 1500,
  });

  const parsed = parseJsonResponse<{
    headline?: string;
    summary?: string;
    loves?: string[];
    avoids?: string[];
    blindSpots?: string[];
  }>(raw);

  return {
    headline: parsed.headline?.trim() || "Your taste, read closely",
    summary: parsed.summary?.trim() || "",
    lovesList: (parsed.loves ?? []).filter(Boolean).slice(0, 5),
    avoidsList: (parsed.avoids ?? []).filter(Boolean).slice(0, 4),
    blindSpots: (parsed.blindSpots ?? []).filter(Boolean).slice(0, 3),
  };
}
