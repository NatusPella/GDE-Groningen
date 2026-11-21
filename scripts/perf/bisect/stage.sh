#!/bin/bash
# usage: stage.sh <ref>   ref = tag (v0.44.0) or commit; t<ref>/ = checkout, s<ref>/game = staged game with the main world
NAME=$1; REF=${2:-$1}
W=/c/Users/abuis/GIT/GDE-Groningen/.claude/worktrees/agent-a681be9f8f4d7da1c
B=$W/.pb
export TEMP=$B/tmp TMP=$B/tmp TMPDIR=$B/tmp
cd $W
rm -rf $B/t$NAME $B/s$NAME
mkdir -p $B/t$NAME
git archive $REF | tar -x -C $B/t$NAME
cp -r /c/Users/abuis/GIT/GDE-Groningen/desktop/vendor-cache $B/t$NAME/desktop/vendor-cache 2>/dev/null
cd $B/t$NAME
GDE_PREBUILT_WORLD=/c/Users/abuis/GIT/GDE-Groningen/game/world GDE_STAGE_OUT=$B/s$NAME/game node desktop/build.mjs 2>&1 | tail -4
ls $B/s$NAME/game | head -3
