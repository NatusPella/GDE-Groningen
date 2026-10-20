#!/usr/bin/env python3
"""De binnenplaatsen van de gebouwen van de stad (#90): scripts/world/binnenplaatsen.json.

extract_province.py bewaart van een multipolygoon alleen de buitenringen, behalve bij water. Een gebouw rond een
binnenplaats (een woonhof, een school met plein) kwam daardoor als een massief blok in de stadstegels, ook als er een straat
of een pad doorheen loopt; de oude stadskaart (process_osm.py) kende de multipolygoon-gebouwen niet en dus ook die blokken niet.
Dit script leest de binnenringen van de gebouw-relaties uit de Geofabrik-extract en schrijft ze als
{ "relatie-id": [[[x, y], ...], ...] } in wereldcoordinaten; stad_na.mjs snijdt ze in de omtrek van het OSM-gebouw.

    data/cache/venv/bin/python scripts/world/fetch_binnenplaatsen.py

Alleen relaties binnen het kaartvlak van de stad (game/stad.json, cover). OSM-data is ODbL (docs/LICENTIES.md).
"""
import json
import os
import sys

import osmium

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)

from rdnew import wgs_to_world  # noqa: E402

PBF = os.path.join(ROOT, "data", "cache", "groningen-latest.osm.pbf")
OUT = os.path.join(HERE, "binnenplaatsen.json")


def main():
    with open(os.path.join(ROOT, "game", "stad.json"), encoding="utf-8") as f:
        cover = json.load(f)["cover"]
    x0, y0 = cover["x0"], cover["y0"]
    x1, y1 = x0 + cover["w"] * cover["cell"], y0 + cover["h"] * cover["cell"]
    out = {}
    n = 0
    for o in osmium.FileProcessor(PBF).with_areas():
        if not o.is_area() or o.from_way() or "building" not in o.tags:
            continue
        n += 1
        rings = []
        for outer in o.outer_rings():
            for inner in o.inner_rings(outer):
                pts = [[round(v, 2) for v in wgs_to_world(r.lat, r.lon)] for r in inner]
                if len(pts) >= 4:
                    rings.append(pts)
        if not rings:
            continue
        x, y = rings[0][0]
        if not (x0 <= x <= x1 and y0 <= y <= y1):
            continue
        out[str(o.orig_id())] = rings
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, separators=(",", ":"), sort_keys=True)
        f.write("\n")
    print(f"{n} gebouw-relaties gelezen, {len(out)} met een binnenplaats in de stad; {os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    main()
