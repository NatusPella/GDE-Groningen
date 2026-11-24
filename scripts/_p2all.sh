#!/bin/bash
cd C:/Users/abuis/GIT/GDE-Groningen/.claude/worktrees/personages2-24-11
rm -rf .scr/p2k; ./scripts/_p2.sh .scr/p2k scripts/ui/personages2_kleding.js > .scr/p2k.out 2>&1
rm -rf .scr/p2k-oud; node scripts/qa/personages2_run.mjs --out=.scr/p2k-oud --timeout=14 --flags=mensen=oud --scenes=scripts/ui/personages2_kleding.js > .scr/p2k-oud.out 2>&1
rm -rf .scr/p2w; node scripts/qa/personages2_run.mjs --out=.scr/p2w --timeout=14 --scenes=scripts/ui/personages2_wereld.js > .scr/p2w.out 2>&1
echo klaar > .scr/p2all.done
