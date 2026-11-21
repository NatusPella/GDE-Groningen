#!/bin/bash
# usage: run1.sh <ref> <laag|hoog|ultra> <rep> [extra electron flags]   (ref staged by stage.sh)
V=$1; P=$2; REP=$3; shift 3
W=/c/Users/abuis/GIT/GDE-Groningen/.claude/worktrees/agent-a681be9f8f4d7da1c
B=$W/.pb
SLOT=/c/Users/abuis/GIT/GDE-Groningen/.claude/worktrees/game-bugs-repo-check-d91936/desktop/build/slots/slot.mjs
EXE=/c/Users/abuis/GIT/GDE-Groningen/desktop/node_modules/electron/dist/electron.exe
case $P in
  laag) PS='quality:laag,shadows:false,drawDistance:kort,resolution:0.75,autoResolution:true';;
  hoog) PS='quality:hoog,shadows:true,drawDistance:kort,resolution:1,autoResolution:true';;
  ultra) PS='quality:hoog,shadows:true,drawDistance:heelver,resolution:1,autoResolution:true';;
  std) PS='-';;
esac
D=$B/t$V/desktop; G=$B/s$V/game
export TEMP=$B/tmp TMP=$B/tmp TMPDIR=$B/tmp
node $SLOT run bisect2 -- node $B/${BENCH:-bench2.mjs} $V-$P-$REP $D $G "$PS" $EXE "$@"
