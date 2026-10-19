#!/usr/bin/env bash
# README gallery: run the Maestro screenshot flows on the booted iOS simulator and collect the PNGs.
# Needs: API (4000), Metro for each app (8081 Zaster, 8082 Zettel), both apps installed, the demo data seeded.
#   scripts/screens/mobile.sh [zaster|zettel]...      (default: both)
set -euo pipefail
cd "$(dirname "$0")/../.."
MAESTRO="${MAESTRO:-$HOME/.maestro/bin/maestro}"
DEVICE="${DEVICE:-$(xcrun simctl list devices booted | grep -oE '[0-9A-F-]{36}' | head -1)}"
OUT="${OUT:-$(mktemp -d)}"
API="${API:-http://localhost:4000}"
ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token-change-me-please}"
if [ $# -gt 0 ]; then apps=("$@"); else apps=(zaster zettel); fi

run() { "$MAESTRO" --device "$DEVICE" test --test-output-dir "$OUT/$1" "${@:2}"; }

# Same clean status bar on every shot; light mode unless a flow says otherwise.
xcrun simctl status_bar "$DEVICE" override --time 9:41 --batteryState charged --batteryLevel 100 \
  --wifiBars 3 --cellularBars 4 --operatorName ""
xcrun simctl ui "$DEVICE" appearance light
trap 'xcrun simctl ui "$DEVICE" appearance light; xcrun simctl status_bar "$DEVICE" clear' EXIT

for app in "${apps[@]}"; do
  # Fresh demo data, so balances and today's takings look the same on every run.
  curl -fsS -X POST "$API/admin/reset" -H "x-admin-token: $ADMIN_TOKEN" -H 'x-admin-name: screens' >/dev/null
  dir="apps/$([ "$app" = zaster ] && echo consumer || echo merchant)/e2e/screens"
  light=$(ls "$dir"/*.yaml | grep -v -- '-dark.yaml')
  # shellcheck disable=SC2086
  run "$app" $light
  xcrun simctl ui "$DEVICE" appearance dark
  run "$app-dark" "$dir"/*-dark.yaml
  xcrun simctl ui "$DEVICE" appearance light
done

mkdir -p "$OUT/png"
find "$OUT" -path '*takeScreenshot*' -name '*.png' -exec cp {} "$OUT/png/" \;
echo "$OUT/png"
