#!/bin/sh
# Builds GDE-Groningen-Windows.zip: "START DE GAME.bat" + LEESMIJ.txt at the top,
# the game (git HEAD, no secrets) in GTE-VI/ (the old folder
# name stays, so START DE GAME.bat keeps finding an earlier install). Usage: scripts/make_windows_zip.sh [out.zip]
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/GDE-Groningen-Windows.zip}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git -C "$ROOT" archive --format=tar --prefix=GTE-VI/ HEAD | tar -x -C "$TMP"
cp "$ROOT/scripts/windows/START DE GAME.bat" "$ROOT/scripts/windows/LEESMIJ.txt" "$TMP/"
rm -f "$OUT"
(cd "$TMP" && zip -qr -X "$OUT" "START DE GAME.bat" LEESMIJ.txt GTE-VI)
echo "$OUT"
