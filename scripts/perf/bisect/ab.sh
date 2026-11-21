#!/bin/bash
# usage: ab.sh <preset> <reps...>   alternating main/fix
P=$1; shift
for r in "$@"; do
  for v in main ring; do
    bash /c/Users/abuis/GIT/GDE-Groningen/.claude/worktrees/agent-a681be9f8f4d7da1c/.pb/run1.sh $v $P $r 2>&1 | grep -v "DEP0190\|trace-dep\|\[slot\]" >> /c/Users/abuis/GIT/GDE-Groningen/.claude/worktrees/agent-a681be9f8f4d7da1c/.pb/ab.log
  done
done
echo AB_DONE >> /c/Users/abuis/GIT/GDE-Groningen/.claude/worktrees/agent-a681be9f8f4d7da1c/.pb/ab.log
