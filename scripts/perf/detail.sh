#!/bin/zsh
# Detail comparison city vs Ommeland in the staged desktop build (run
# `npm run stage` in desktop/ first): scripts/perf/detail.js at 1600x900, dpr 1.
#   zsh scripts/perf/detail.sh <name> [electron flags...]
# DETAIL_ONLY=grotemarkt,haren picks areas (views: only the landmark shots),
# DETAIL_TOGGLE=1 adds an in-process on/off comparison of realmap.js and the
# landmark kits per area. Output: $DETAIL_OUT/<name>.json, the
# day and night screenshots <name>-<area>.png, and a table (detail_table.py).
HERE=${0:A:h}
OUT=${DETAIL_OUT:-${TMPDIR:-/tmp}/gde-detail}
N=$1; shift
mkdir -p $OUT
cd $HERE/../../desktop || exit 1
while pgrep -x Electron >/dev/null; do sleep 5; done
echo "start $(date +%T) load $(sysctl -n vm.loadavg)" >&2
{ echo "window.__detailOnly = '${DETAIL_ONLY:-}'; window.__detailToggle = ${DETAIL_TOGGLE:-0};"; cat $HERE/detail.js; } > $OUT/_$N.js
# DETAIL_PRE='window.__noLandmarkKits = true;' runs before the page's own code
{ echo "${DETAIL_PRE:-}"; cat $HERE/hook.js; } > $OUT/_hook_$N.js
PROFILE=gde-test-detail
rm -rf "${TMPDIR:-/tmp}/$PROFILE"
GDE_TEST_PROFILE=$PROFILE ./node_modules/.bin/electron . --windowed --stil --force-device-scale-factor=1 --window-size=1600x900 \
  --smoke-test=$OUT/$N.png --bench-eval=$OUT/_hook_$N.js --perf-script=$OUT/_$N.js "$@" > $OUT/$N.log 2>&1
echo "exit $? load after $(sysctl -n vm.loadavg)" >&2
rm -rf "${TMPDIR:-/tmp}/$PROFILE" $OUT/_$N.js $OUT/_hook_$N.js
grep '^\[perf-script\]' $OUT/$N.log | sed 's/^\[perf-script\] //' > $OUT/$N.json
python3 $HERE/detail_table.py $OUT/$N.json
