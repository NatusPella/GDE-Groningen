#!/bin/zsh
# Automated bug hunt in the desktop build (run `npm run stage` in desktop/ first).
#   scripts/bughunt/run.sh <name> <phase.js...>
#   e.g. scripts/bughunt/run.sh full sweep.js heli.js heli2.js acts.js acts2.js modes.js pol.js leak.js
# lib.js is prepended, every phase runs in its own try block, hook.js catches console
# errors/warnings and frame times from page load (--bench-eval). The report (issues,
# errors and warnings grouped by message, frame spikes and fps per phase, memory
# snapshots) lands in $BH_OUT/out-<name>.log; parse.py prints it. Throwaway profile,
# silent (--stil), waits until no other game Electron runs.
HERE=${0:A:h}
OUT=${BH_OUT:-${TMPDIR:-/tmp}/gde-bughunt}
N=$1; shift
mkdir -p $OUT
cat $HERE/lib.js > $OUT/_$N.js
for f in "$@"; do
  echo "try {" >> $OUT/_$N.js
  cat $HERE/$f >> $OUT/_$N.js
  echo "} catch (e) { issue('script', '$f: ' + String(e && e.stack || e).slice(0, 300)); }" >> $OUT/_$N.js
done
echo 'return report();' >> $OUT/_$N.js
cd $HERE/../../desktop || exit 1
while pgrep -f "Electron.app/Contents/MacOS/Electron" >/dev/null; do sleep 4; done
PROFILE=gde-test-bughunt
rm -rf "${TMPDIR:-/tmp}/$PROFILE"
GDE_TEST_PROFILE=$PROFILE ./node_modules/.bin/electron . --windowed --stil --smoke-test=$OUT/smoke.png --bench-eval=$HERE/hook.js --perf-script=$OUT/_$N.js > $OUT/out-$N.log 2>&1
echo "exit $? -> $OUT/out-$N.log"
rm -rf "${TMPDIR:-/tmp}/$PROFILE" $OUT/smoke*.png $OUT/_$N.js
python3 $HERE/parse.py $OUT/out-$N.log
