#!/bin/sh
# Alle vier de ritten (stad en provincie, voor en na) en de samenvattende tabel.
#   sh scripts/perf/streamsoepel.sh <map met world/ (een junction naar game/world mag)> [uitvoermap]
WORLD="${1:-.}"
OUT="${2:-$WORLD/out}"
HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$OUT"
for r in stad provincie; do
  for v in voor na; do
    node "$HERE/streamsoepel.mjs" "$WORLD" --variant=$v --route=$r > "$OUT/$r-$v.json" 2>"$OUT/$r-$v.err"
  done
done
node "$HERE/streamsoepel_table.mjs" "$OUT"
