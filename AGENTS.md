<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

MovieBoxd is a single Next.js 16 (App Router) full-stack app — one process, no monorepo, no database, no Docker. UI pages and API route handlers live under `src/app`. Standard commands are in `package.json` / `README.md`: `npm run dev` (port 3000), `npm run build`, `npm run start`, `npm run lint`. There is no test framework configured (no `test` script).

Non-obvious notes:

- Persistence is a local JSON file at `data/store.json` (gitignored, auto-created on first API access). Delete it to reset the archive and saved API key. Seeding this file directly is a valid way to populate the watched archive for testing without hitting TMDB.
- The TMDB API key is NOT an env var. It is stored in `data/store.json` via the Settings page (or `PUT /api/settings`) and is required at request time for the TMDB-backed flows: `GET /api/search`, `POST /api/import`, `POST /api/movies` (manual add), and `GET /api/recommendations` (For You). Without a valid key these return 400/401.
- Flows that work fully offline (no TMDB key / no network): the Archive (`GET /api/movies`, `PATCH`/`DELETE /api/movies/[id]`), the Taste engine (`GET /api/taste`, computed locally in `src/lib/preference.ts`), and saving settings. Use these for hello-world/E2E when no TMDB key is available.
- Poster/backdrop images load from `image.tmdb.org` (allowed in `next.config.ts`); they need network but not the API key.
