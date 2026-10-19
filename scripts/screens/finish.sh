#!/usr/bin/env bash
# README gallery: file and shrink the screenshots.
#   scripts/screens/finish.sh <mobile png dir>   (the folder scripts/screens/mobile.sh printed)
# Mobile shots go to docs/screenshots/{zahln,zysygy}/ at 400 px wide; the web shots that the Playwright
# `screens` project wrote straight into docs/screenshots/{web,checkout,console,landing}/ are capped at 1280 px.
set -euo pipefail
cd "$(dirname "$0")/../.."
SHOTS=docs/screenshots

if [ $# -gt 0 ]; then
  for app in zahln zysygy; do
    ls "$1"/"$app"-*.png >/dev/null 2>&1 || continue
    rm -rf "${SHOTS:?}/$app" && mkdir -p "$SHOTS/$app"
    for f in "$1"/"$app"-*.png; do
      cp "$f" "$SHOTS/$app/${f##*/$app-}"
    done
    sips --resampleWidth 400 "$SHOTS/$app"/*.png >/dev/null
  done
fi

for dir in web checkout console landing; do
  [ -d "$SHOTS/$dir" ] && sips -Z 1280 "$SHOTS/$dir"/*.png >/dev/null
done
du -sh "$SHOTS"/{zahln,zysygy,web,checkout,console,landing} 2>/dev/null
