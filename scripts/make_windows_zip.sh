#!/bin/sh
# Builds GDE-Groningen-Windows.zip: "START DE GAME.bat" + LEESMIJ.txt at the top,
# the game (git HEAD, no secrets) in GDE-Groningen/ (saves live in the browser,
# not in this folder). Usage: scripts/make_windows_zip.sh [out.zip]
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/GDE-Groningen-Windows.zip}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git -C "$ROOT" archive --format=tar --prefix=GDE-Groningen/ HEAD | tar -x -C "$TMP"
cp "$ROOT/scripts/windows/START DE GAME.bat" "$ROOT/scripts/windows/LEESMIJ.txt" "$TMP/"
rm -f "$OUT"
(cd "$TMP" && zip -qr -X "$OUT" "START DE GAME.bat" LEESMIJ.txt GDE-Groningen)
echo "$OUT"
