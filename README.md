# MovieBoxd

A polished single-user movie recommender. Import your Letterboxd history, curate a watched archive, and get TMDB-backed **For You** picks with reasons grounded in your taste.

## Features

- **Letterboxd CSV import** — diary / ratings / watched exports
- **Manual TMDB add** — search, rate, review, mark rewatchable
- **Watched archive** — filter, search, toggle rewatchable
- **Claude-ranked For You** — TMDB retrieval, then Claude ranks against your full history and writes the reasons
- **Taste** — visual profile plus a Claude "critic's read" of what you reward, reject, and have missed
- **Settings** — TMDB and Anthropic keys stored locally in `data/store.json`

## How recommendations work

1. **Retrieval** — TMDB `discover` across your top genres plus `recommendations` seeded from your highest-rated films
2. **Filter** — watched titles are excluded unless marked rewatchable
3. **Shortlist** — a heuristic taste score narrows the pool to ~45 candidates
4. **Ranking** — your watch history is compressed into a dossier (ratings, written notes, directors, actors, themes, disliked patterns) and Claude picks and orders the final list, returning a pitch, confidence, and specific reasons per film

Without an Anthropic key the app still works and falls back to heuristic ranking.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and add your keys in **Settings**:

| Key | Required | Purpose |
| --- | --- | --- |
| [TMDB API key](https://www.themoviedb.org/settings/api) | Yes | Search, import, candidate retrieval |
| [Anthropic API key](https://console.anthropic.com/settings/keys) | Optional | Claude ranking, reasons, and taste read |

## Model choice and cost

The dossier sent to Claude is capped, so one **For You** refresh costs roughly 8k input and 1k output tokens whether your archive holds 100 films or 1,000.

| Model | Per refresh | Daily use / month |
| --- | --- | --- |
| **Haiku 4.5** (default) | ~$0.01 | ~$0.30 |
| Sonnet 5 | ~$0.03 | ~$0.79 |
| Opus 5 | ~$0.07 | ~$1.97 |

Ranking a 45-film shortlist against a taste profile is a judgment-and-writing task, not a reasoning-heavy one, so Haiku 4.5 is the default. Step up to Sonnet 5 if you want more distinctive prose in the reasons and taste read.

## Letterboxd export tips

From Letterboxd: **Settings → Import & Export → Export Your Data**. Use `diary.csv`, `ratings.csv`, or `watched.csv`. Import is capped at 250 rows per upload so TMDB enrichment stays responsive.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |

## Data

Local JSON store at `data/store.json` (gitignored). Delete that file to reset the archive and keys.
