#!/bin/bash
# herstage en draai het contactblad: _p2.sh <uitmap> [scenes]
cd C:/Users/abuis/GIT/GDE-Groningen/.claude/worktrees/personages2-24-11
export GDE_PREBUILT_WORLD="C:/Users/abuis/GIT/GDE-Groningen/.claude/worktrees/game-bugs-repo-check-d91936/desktop/build/game/world"
export GDE_GAME_DIR="C:\Users\abuis\GIT\GDE-Groningen\.claude\worktrees\personages2-24-11\desktop\build\game" ELECTRON_EXE="C:\Users\abuis\GIT\GDE-Groningen\desktop\node_modules\electron\dist\electron.exe"
node desktop/build.mjs > /dev/null 2>&1 || { echo stage mislukt; exit 1; }
rm -rf "$1"; node scripts/qa/personages2_run.mjs --out="$1" --timeout=12 ${2:+--scenes=$2} 2>&1 | grep -v "hartslag\|slot electron\|start electron"
