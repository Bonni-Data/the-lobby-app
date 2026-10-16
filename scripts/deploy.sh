#!/usr/bin/env bash
# Deploy the app to gh-pages without touching the public pages the daily GitHub Action generates.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PAGES="${PAGES_DIR:-/tmp/claude-0/ghp}"
MSG="${1:-Aggiornamento app}"
cd "$ROOT" && node scripts/build.mjs
if [ ! -d "$PAGES/.git" ]; then git clone -q --branch gh-pages https://github.com/Bonni-Data/the-lobby-app "$PAGES"; fi
cd "$PAGES"
git fetch -q origin gh-pages && git reset -q --hard origin/gh-pages
# Keep: git data, custom domain, and everything the Action generates.
find . -mindepth 1 -maxdepth 1 \
  ! -name .git ! -name CNAME ! -name .nojekyll \
  ! -name percorso ! -name corsi ! -name opportunita ! -name andrea ! -name neutralita \
  ! -name sitemap.xml ! -name robots.txt ! -name site-urls.txt ! -name '7f3c9a1e5b2d4c8f9e0a6b1c2d3e4f50.txt' \
  -exec rm -rf {} +
cp -r "$ROOT/dist/." .
printf 'thelobbyitalia.it\n' > CNAME
touch .nojekyll
git add -A
if git diff --cached --quiet; then echo "Nothing to deploy"; exit 0; fi
git -c user.name="Andrea Bonazzi" -c user.email="andreabonazzi5@gmail.com" commit -qm "$MSG

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q origin HEAD:gh-pages
git log --oneline -1
