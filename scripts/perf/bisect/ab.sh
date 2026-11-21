#!/bin/bash
# usage: ab.sh <preset> <reps...>   alternating main/fix
PB=${GDE_WORK:-$(git rev-parse --show-toplevel)}/.pb
P=$1; shift
for r in "$@"; do
  for v in main ring; do
    bash $PB/run1.sh $v $P $r 2>&1 | grep -v "DEP0190\|trace-dep\|\[slot\]" >> $PB/ab.log
  done
done
echo AB_DONE >> $PB/ab.log
