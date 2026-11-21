#!/bin/bash
# usage: stage.sh <ref>   ref = tag (v0.44.0) or commit; t<ref>/ = checkout, s<ref>/game = staged game with the main world
NAME=$1; REF=${2:-$1}
W=${GDE_WORK:-$(git rev-parse --show-toplevel)}   # de worktree met .pb/.pt (zet GDE_WORK als je er niet in staat)
REPO=${GDE_REPO:-$(cd "$W/../../.." && pwd)}   # de hoofdmap met desktop/vendor-cache, node_modules en game/world
B=$W/.pb
export TEMP=$B/tmp TMP=$B/tmp TMPDIR=$B/tmp
cd $W
rm -rf $B/t$NAME $B/s$NAME
mkdir -p $B/t$NAME
git archive $REF | tar -x -C $B/t$NAME
cp -r $REPO/desktop/vendor-cache $B/t$NAME/desktop/vendor-cache 2>/dev/null
cd $B/t$NAME
GDE_PREBUILT_WORLD=$REPO/game/world GDE_STAGE_OUT=$B/s$NAME/game node desktop/build.mjs 2>&1 | tail -4
ls $B/s$NAME/game | head -3
