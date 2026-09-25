#!/bin/sh
# Builds GTE-VI-Windows.zip: "START DE GAME.bat" + LEESMIJ.txt at the top,
# the game (git HEAD, no secrets) in GTE-VI/. Usage: scripts/make_windows_zip.sh [out.zip]
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/GTE-VI-Windows.zip}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git -C "$ROOT" archive --format=tar --prefix=GTE-VI/ HEAD | tar -x -C "$TMP"
cp "$ROOT/scripts/windows/START DE GAME.bat" "$ROOT/scripts/windows/LEESMIJ.txt" "$TMP/"
rm -f "$OUT"
(cd "$TMP" && zip -qr -X "$OUT" "START DE GAME.bat" LEESMIJ.txt GTE-VI)
echo "$OUT"
