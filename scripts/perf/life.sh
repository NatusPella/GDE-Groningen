#!/bin/zsh
# The street life, batch 1, in the staged desktop build (run `npm run stage`
# in desktop/ first): scripts/perf/life.js at 1600x900, dpr 1. Output:
# $LIFE_OUT/<name>.json (census, prompts, frame time), <name>-<scene>.png.
#   zsh scripts/perf/life.sh <name> [electron flags...]
HERE=${0:A:h}
OUT=${LIFE_OUT:-${TMPDIR:-/tmp}/gde-life}
N=$1; shift
mkdir -p $OUT
cd $HERE/../../desktop || exit 1
while pgrep -x Electron >/dev/null; do sleep 5; done
cp $HERE/life.js $OUT/_$N.js
cp $HERE/hook.js $OUT/_hook_$N.js
PROFILE=gde-test-life-shots
rm -rf "${TMPDIR:-/tmp}/$PROFILE"
GDE_TEST_PROFILE=$PROFILE ./node_modules/.bin/electron . --windowed --stil --force-device-scale-factor=1 --window-size=1600x900 \
  --smoke-test=$OUT/$N.png --bench-eval=$OUT/_hook_$N.js --perf-script=$OUT/_$N.js "$@" > $OUT/$N.log 2>&1
echo "exit $?"
rm -rf "${TMPDIR:-/tmp}/$PROFILE" $OUT/_$N.js $OUT/_hook_$N.js
grep '^\[perf-script\]' $OUT/$N.log | sed 's/^\[perf-script\] //' > $OUT/$N.json
cat $OUT/$N.json
