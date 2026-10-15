#!/bin/zsh
# Byte-for-byte check of the geometry worker against the old main-thread
# code (geocheck.js) in the staged desktop build (run `npm run stage` in
# desktop/ first). Prints the report; exit 1 when a buffer differs.
HERE=${0:A:h}
OUT=${PERF_OUT:-${TMPDIR:-/tmp}/gde-perf}
mkdir -p $OUT
cd $HERE/../../desktop || exit 1
PROFILE=gde-test-geocheck
rm -rf "${TMPDIR:-/tmp}/$PROFILE"
GDE_TEST_PROFILE=$PROFILE ./node_modules/.bin/electron . --windowed --stil --smoke-test=$OUT/geocheck.png --perf-script=$HERE/geocheck.js "$@" > $OUT/geocheck.log 2>&1
rm -rf "${TMPDIR:-/tmp}/$PROFILE"
grep '^\[perf-script\]' $OUT/geocheck.log | sed 's/^\[perf-script\] //'
grep -q '"ok":true' $OUT/geocheck.log
