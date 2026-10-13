# The Lobby Academy (web app)

Mobile-first web app (PWA) for The Lobby. React 19 bundled with esbuild, backend on Supabase (Auth + Postgres with RLS).

- `node scripts/build.mjs` builds into `dist/` (static files, deployable on any static host).
- `node tests/e2e.mjs` runs an end-to-end check in Chromium with the Supabase API mocked.

Routes use the URL hash (`#/academy`), so no server rewrite rules are needed.
