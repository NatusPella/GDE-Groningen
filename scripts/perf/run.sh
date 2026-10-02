#!/bin/zsh
# Repeatable perf routes in the desktop build (run `npm run stage` in desktop/ first).
#   scripts/perf/run.sh <name> [electron flags...]
#   e.g. scripts/perf/run.sh high
#        scripts/perf/run.sh low --preset=laag
#        scripts/perf/run.sh low-cpu4 --preset=laag --cpu-throttle=4
# 1920x1080 CSS px at devicePixelRatio 1, silent, throwaway profile, fixed
# routes (routes.js). Waits until no other Electron runs and the 1-minute
# load average is below PERF_MAX_LOAD (default: no limit; the load is recorded). Output: $PERF_OUT/<name>.json
HERE=${0:A:h}
OUT=${PERF_OUT:-${TMPDIR:-/tmp}/gte-perf}
N=$1; shift
mkdir -p $OUT
MAXLOAD=${PERF_MAX_LOAD:-999}
cd $HERE/../../desktop || exit 1
while true; do
  if pgrep -f "Electron.app/Contents/MacOS/Electron" >/dev/null; then sleep 5; continue; fi
  L=$(sysctl -n vm.loadavg | awk '{print $2}')
  if (( L < MAXLOAD )); then break; fi
  echo "load $L, waiting" >&2; sleep 30
done
echo "start $(date +%T) load $(sysctl -n vm.loadavg)" >&2
# PERF_DUR=ms per route (default 20000), PERF_ONLY=foot,ring,heli,pause,sheet,
# PERF_DIAG=1 adds draw calls per owner, PERF_PROFILE=<route> a CPU profile of it
{ echo "window.__perfDur = ${PERF_DUR:-20000}; window.__perfOnly = '${PERF_ONLY:-}'; window.__perfDiag = ${PERF_DIAG:-0}; window.__perfProfile = '${PERF_PROFILE:-}';"; cat $HERE/routes.js; } > $OUT/_$N.js
PROFILE=gte-vi-test-perf
rm -rf "${TMPDIR:-/tmp}/$PROFILE"
GTE_TEST_PROFILE=$PROFILE ./node_modules/.bin/electron . --windowed --stil --force-device-scale-factor=1 --window-size=1920x1080 \
  --smoke-test=$OUT/$N.png --bench-eval=$HERE/hook.js --perf-script=$OUT/_$N.js "$@" > $OUT/$N.log 2>&1
echo "exit $? load after $(sysctl -n vm.loadavg)" >&2
rm -rf "${TMPDIR:-/tmp}/$PROFILE" $OUT/_$N.js
LOAD_AFTER=$(sysctl -n vm.loadavg | awk '{print $2}')
grep '^\[perf-script\]' $OUT/$N.log | sed 's/^\[perf-script\] //' | python3 -c "import json,sys; d=json.load(sys.stdin); d['load']=[$L, $LOAD_AFTER]; print(json.dumps(d))" > $OUT/$N.json
python3 $HERE/table.py $OUT/$N.json
