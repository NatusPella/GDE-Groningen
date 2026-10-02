#!/bin/zsh
# Interleaved A/B perf runs: A = another staged build (GTE_A_DIR, e.g. main
# staged with GTE_STAGE_SRC/GTE_STAGE_OUT), B = GTE_B_DIR or desktop/build/game.
#   scripts/perf/ab.sh <name> <pairs> "<A flags>" "<B flags>"
# Runs A,B,A,B... at whatever load (recorded per run); ab_table.py prints
# medians and spread per route.
HERE=${0:A:h}
N=$1; P=$2; FA=$3; FB=$4
for i in $(seq 1 $P); do
  GTE_GAME_DIR=$GTE_A_DIR $HERE/run.sh $N-A$i ${=FA} >/dev/null
  GTE_GAME_DIR=${GTE_B_DIR:-} $HERE/run.sh $N-B$i ${=FB} >/dev/null
done
python3 $HERE/ab_table.py ${PERF_OUT:-${TMPDIR:-/tmp}/gte-perf} $N
