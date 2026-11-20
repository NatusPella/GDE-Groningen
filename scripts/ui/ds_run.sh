#!/bin/bash
# gebruik: bash scripts/ui/ds_run.sh <scenebestand> <map-naam> [sizes] [stage]
# één Electron-run via het slot, kill na 10 minuten
cd "$(dirname "$0")/../.." || exit 1
W=$(pwd -W | tr '/' '\\')
STAGE=${4:-ds1}
export GDE_GAME_DIR="$W\\desktop\\build\\$STAGE\\game"
export GDE_ELECTRON="$(cd ../../.. && pwd -W | tr '/' '\\')\\desktop\\node_modules\\electron\\dist\\electron.exe"
SIZES=${3:-1280x720}
timeout 900 node ../game-bugs-repo-check-d91936/desktop/build/slots/slot.mjs run ds -- node scripts/ui_shots.mjs --out=docs/beeld-21-11/ds/$2 --sizes=$SIZES --scenes=$1 --args=--in-process-gpu --timeout=540
