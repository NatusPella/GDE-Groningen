#!/bin/bash
# usage: tags.sh <preset> <rep> <tag...>   stage each tag, run once, remove again (one extra staged build at a time)
P=$1; REP=$2; shift 2
W=${GDE_WORK:-$(git rev-parse --show-toplevel)}   # de worktree met .pb/.pt (zet GDE_WORK als je er niet in staat)
REPO=${GDE_REPO:-$(cd "$W/../../.." && pwd)}   # de hoofdmap met desktop/vendor-cache, node_modules en game/world
B=$W/.pb
for T in "$@"; do
  if [ ! -d $B/s$T/game ]; then
    bash $B/stage.sh $T > /dev/null 2>&1
    node $B/patch.mjs $T > /dev/null; node $B/patchbench.mjs $T >> $B/tags.log
    CLEAN=1
  else CLEAN=0; fi
  bash $B/run1.sh $T $P $REP 2>&1 | grep -v "DEP0190\|trace-deprecation\|\[slot\]" >> $B/tags.log
  if [ $CLEAN = 1 ]; then rm -rf $B/s$T $B/t$T; fi
done
echo TAGS_DONE >> $B/tags.log
