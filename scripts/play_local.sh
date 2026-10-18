#!/bin/sh
# Local test run of the game from the repo (no release needed).
#   sh scripts/play_local.sh            # throwaway profile "gde-lokaal": your real save and settings are untouched
#   sh scripts/play_local.sh --echt     # use your normal profile (your real save)
#   sh scripts/play_local.sh --vers     # wipe the throwaway profile first (start from a new game)
# The throwaway profile lives in the system temp folder (GDE_TEST_PROFILE in desktop/main.js).
# It stages the build (the first time this takes a few minutes: it packs the world tiles) and opens
# the game in a window. It never uses port 9000 and never touches an installed app.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/desktop"
PROFILE="gde-lokaal"
for a in "$@"; do
  case "$a" in
    --echt) PROFILE="" ;;
    --vers) rm -rf "${TMPDIR:-/tmp}/gde-lokaal" "/tmp/gde-lokaal" 2>/dev/null || true ;;
  esac
done
npm run stage
if [ -n "$PROFILE" ]; then
  GDE_TEST_PROFILE="$PROFILE" ./node_modules/.bin/electron . --windowed
else
  ./node_modules/.bin/electron . --windowed
fi
