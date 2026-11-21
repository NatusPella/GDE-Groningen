#!/bin/bash
# usage: ab.sh <preset> <A> <B> <reps...>   alternating A/B
P=$1; A=$2; Bn=$3; shift 3
B=${GDE_WORK:-$(git rev-parse --show-toplevel)}/.pt
for r in "$@"; do
  for v in $A $Bn; do
    bash $B/run1.sh $v $P $r 2>&1 | grep -v "DEP0190\|trace-dep\|\[slot\]" >> $B/ab.log
  done
done
echo AB_DONE >> $B/ab.log
