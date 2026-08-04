# MovieBoxd

A polished single-user movie recommender. Import your Letterboxd history, curate a watched archive, and get TMDB-backed **For You** picks with reasons grounded in your taste.

## Features

- **Letterboxd CSV import** — diary / ratings / watched exports
- **Manual TMDB add** — search, rate, review, mark rewatchable
- **Watched archive** — filter, search, toggle rewatchable
- **Preference engine** — genres, themes, actors, directors, ratings, and story signals from overviews/reviews
- **For You** — TMDB recommendations that exclude watched titles unless marked rewatchable
- **Taste** — visual profile of what you reward
- **Settings** — store your TMDB API key locally in `data/store.json`

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then paste a [TMDB API key](https://www.themoviedb.org/settings/api) in **Settings**.

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

Local JSON store at `data/store.json` (gitignored). Delete that file to reset the archive and API key.
