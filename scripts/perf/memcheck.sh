#!/bin/zsh
# Renderer memory of the staged desktop build (run `npm run stage` in
# desktop/ first): the RSS of the renderer process (main thread and geometry
# worker), its peak up to 20 s into the game and its value then (memcheck.js
# marks the moment), sampled every second. GDE_GAME_DIR measures another
# staged build. The worker's map heap: node --expose-gc scripts/perf/mapmem.mjs
#   scripts/perf/memcheck.sh <name> [electron flags...]
HERE=${0:A:h}
OUT=${PERF_OUT:-${TMPDIR:-/tmp}/gde-perf}
N=${1:-mem}; shift
mkdir -p $OUT
cd $HERE/../../desktop || exit 1
PROFILE=gde-test-mem
rm -rf "${TMPDIR:-/tmp}/$PROFILE"
GDE_TEST_PROFILE=$PROFILE ./node_modules/.bin/electron . --windowed --stil --enable-precise-memory-info \
  --smoke-test=$OUT/$N.png --perf-script=$HERE/memcheck.js "$@" > $OUT/$N.log 2>&1 &
APP=$!
PEAK=0; MARK=0
while kill -0 $APP 2>/dev/null; do
  # renderer RSS in KB (the bracket keeps awk from matching itself)
  R=$(ps -axo rss=,command= | awk '/electron\/dis[t].*--type=renderer/ { s += $1 } END { print s + 0 }')
  if (( MARK == 0 )) && grep -q 'mem-mark' $OUT/$N.log; then MARK=$R; fi
  (( MARK == 0 && R > PEAK )) && PEAK=$R
  sleep 1
done
rm -rf "${TMPDIR:-/tmp}/$PROFILE"
echo "rendererRss peakMB $((PEAK / 1024)) settledMB $((MARK / 1024))"
grep '^\[perf-script\]' $OUT/$N.log | sed 's/^\[perf-script\] //'
