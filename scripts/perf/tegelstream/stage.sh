#!/bin/bash
# usage: stage.sh <name> [ref]   ref empty = working tree (tracked files incl. changes); else a commit
NAME=$1; REF=$2
W=${GDE_WORK:-$(git rev-parse --show-toplevel)}   # de worktree met .pb/.pt (zet GDE_WORK als je er niet in staat)
REPO=${GDE_REPO:-$(cd "$W/../../.." && pwd)}   # de hoofdmap met desktop/vendor-cache, node_modules en game/world
B=$W/.pt
export TEMP=$B/tmp TMP=$B/tmp TMPDIR=$B/tmp
cd $W
rm -rf $B/t$NAME $B/s$NAME
mkdir -p $B/t$NAME
if [ -z "$REF" ]; then git ls-files -z | tar --null -T - -cf - | tar -x -C $B/t$NAME; else git archive $REF | tar -x -C $B/t$NAME; fi
cp -r $REPO/desktop/vendor-cache $B/t$NAME/desktop/vendor-cache 2>/dev/null
cd $B/t$NAME
GDE_PREBUILT_WORLD=$REPO/game/world GDE_STAGE_OUT=$B/s$NAME/game node desktop/build.mjs 2>&1 | tail -3
node $B/patchbench.mjs $NAME
node $B/patchtw.mjs $NAME
ls $B/s$NAME/game | head -3
