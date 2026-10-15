#!/bin/zsh
# Load time to the title screen and heap, A/B between staged builds (run
# `npm run stage` in desktop/ first). Waits until no other Electron runs.
#   GDE_A_DIR=<staged game dir of the old build> scripts/perf/loadcheck.sh <runs>
# Prints one JSON line per run: A (old build), B (desktop/build/game).
HERE=${0:A:h}
OUT=${PERF_OUT:-${TMPDIR:-/tmp}/gde-perf}
mkdir -p $OUT
cd $HERE/../../desktop || exit 1
one() {  # <label> <game dir or empty>
  while pgrep -f "Electron.app/Contents/MacOS/Electron" >/dev/null; do sleep 5; done
  PROFILE=gde-test-load
  rm -rf "${TMPDIR:-/tmp}/$PROFILE"
  L=$(sysctl -n vm.loadavg | awk '{print $2}')
  GDE_GAME_DIR=$2 GDE_TEST_PROFILE=$PROFILE ./node_modules/.bin/electron . --windowed --stil --enable-precise-memory-info --force-device-scale-factor=1 --window-size=1280x720 \
    --smoke-test=$OUT/load-$1.png --perf-script=$HERE/loadmarks.js > $OUT/load-$1.log 2>&1
  rm -rf "${TMPDIR:-/tmp}/$PROFILE"
  echo "$1 load $L $(grep '^\[perf-script\]' $OUT/load-$1.log | sed 's/^\[perf-script\] //')"
}
for i in $(seq 1 ${1:-3}); do
  one A$i ${GDE_A_DIR:-}
  one B$i ""
done
