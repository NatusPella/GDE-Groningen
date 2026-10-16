#!/usr/bin/env python3
"""Per-building attributes for the tiles (docs/PROVINCIE-PLAN.md 0.1), from the
OSM caches in data/ (no fetching) and, when present, a local 3D BAG extract.

    python3 scripts/world/building_attrs.py

Writes data/world/building_attrs.json.gz: one record per OSM building way with
its centroid in the world frame, its area and what its tags say about its
looks:  height (m), levels, roof shape, colours, materials, start year.
scripts/world/pack_tiles.mjs joins these to the GameMap's footprints (centre
inside the footprint, area within 25 %) and adds, per building:

  hm    best height estimate in metres (roof ridge above ground)
  hsrc  where it comes from: 3dbag | osm_height | osm_levels | default
  roof, colour, rcolour, mat, rmat, year, bag, hmax, h50, hg  (when known)

3D BAG (CC BY 4.0, https://3dbag.nl, TU Delft and 3DGI; attribution in
NOTICE.md and the credits) is joined from data/world/3dbag.json.gz - per
building { "id": <bag id>, "c": [x, y] world frame, "a": area, "hmax", "h50",
"hg", "roof", "lv", "year" }, made from the official tile downloads by
scripts/world/fetch_3dbag.py; scripts/world/building_heights.mjs writes the
heights into game/citymap.json (game/js/buildingheights.js: 3dbag >
osm_height > osm_levels > default).
"""
import glob
import gzip
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from rdnew import project  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = ["data/groningen_raw.json", "data/groningen_extra.json", "data/ring_raw.json.gz", "data/ring_extra.json.gz",
       "data/extras_buildings_grotemarkt_raw.json", "data/extras_buildings_umcg_raw.json"]
OUT = os.path.join(ROOT, "data", "world", "building_attrs.json.gz")
LEVEL_M = 3.1


def polygon(geom):
    pts = [project(g["lat"], g["lon"], 2) for g in geom if g]
    if len(pts) >= 2 and pts[0] == pts[-1]:
        pts = pts[:-1]
    return pts


def area_centroid(P):
    a = cx = cy = 0.0
    for i in range(len(P)):
        x0, y0 = P[i]
        x1, y1 = P[(i + 1) % len(P)]
        c = x0 * y1 - x1 * y0
        a += c
        cx += (x0 + x1) * c
        cy += (y0 + y1) * c
    if abs(a) < 1e-6:
        return 0.0, P[0][0], P[0][1]
    return abs(a / 2), cx / (3 * a), cy / (3 * a)


def metres(v):
    try:
        return float(str(v).split()[0].replace(",", "."))
    except (TypeError, ValueError, IndexError):
        return None


def year(v):
    try:
        y = int(str(v)[:4])
        return y if 1000 <= y <= 2100 else None
    except ValueError:
        return None


def main():
    seen, out = set(), []
    for rel in SRC:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        with (gzip.open(path, "rt") if path.endswith(".gz") else open(path)) as f:
            els = json.load(f)["elements"]
        for el in els:
            t = el.get("tags") or {}
            if el.get("type") != "way" or "building" not in t or not el.get("geometry"):
                continue
            key = el["id"]
            if key in seen:
                continue
            seen.add(key)
            P = polygon(el["geometry"])
            if len(P) < 3:
                continue
            area, cx, cy = area_centroid(P)
            rec = {"id": key, "c": [round(cx, 2), round(cy, 2)], "a": round(area, 1), "t": t["building"]}
            h = metres(t.get("height"))
            if h and 1 <= h < 400:
                rec["h"] = round(h, 2)
            try:
                lv = float(t.get("building:levels"))
                if 0 < lv < 120:
                    rec["lv"] = lv
                    rl = metres(t.get("roof:levels"))
                    if rl:
                        rec["rl"] = rl
            except (TypeError, ValueError):
                pass
            for k, tag in (("roof", "roof:shape"), ("colour", "building:colour"), ("rcolour", "roof:colour"),
                           ("mat", "building:material"), ("rmat", "roof:material")):
                if t.get(tag):
                    rec[k] = t[tag]
            y = year(t.get("start_date") or t.get("building:start_date"))
            if y:
                rec["year"] = y
            if t.get("ref:bag"):
                rec["bag"] = t["ref:bag"]
            out.append(rec)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with gzip.open(OUT, "wt", compresslevel=9) as f:
        json.dump(out, f, separators=(",", ":"), ensure_ascii=False)
    tagged = lambda k: sum(1 for r in out if k in r)
    print(f"{len(out)} buildings: height {tagged('h')}, levels {tagged('lv')}, roof {tagged('roof')}, colour {tagged('colour')}, "
          f"material {tagged('mat')}, year {tagged('year')}, bag {tagged('bag')} -> {os.path.relpath(OUT, ROOT)} ({os.path.getsize(OUT) / 1e6:.2f} MB)")


if __name__ == "__main__":
    main()
