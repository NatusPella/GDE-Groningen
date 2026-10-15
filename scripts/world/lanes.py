#!/usr/bin/env python3
"""The lane model on the current map, in place (docs/PROVINCIE-PLAN.md 2.12).

    python3 scripts/world/lanes.py            # report what would change
    python3 scripts/world/lanes.py --write    # write game/citymap.json

Every car road in game/citymap.json is matched to its OSM way in the caches
(same class, its vertices on the way's line) and gets from the tags
(lanemodel.py): `lanes`, `lanesFwd`, `lanesBwd` (`lanesBoth`), `turnFwd`,
`turnBwd` (turn:lanes, one entry per lane), `placement`, `laneW` and the
width of the lane model (the one-way carriageways of a dual carriageway
lose the width of the whole road), plus `osm` (the way id). process_osm.py
uses the same model for a new build. Run scripts/world/profile.mjs --write
afterwards: the carriageways' overlaps (slip roads) follow the widths.
"""
import json
import math
import os
import sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)
import process_osm as P  # noqa: E402
from rdnew import project  # noqa: E402
from lanemodel import lane_fields  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))
MAP = os.path.join(ROOT, "game", "citymap.json")
CAR = ("major", "normal", "minor")
G = 25.0
TOL = 0.6
KEYS = ("lanes", "lanesFwd", "lanesBwd", "lanesBoth", "turnFwd", "turnBwd", "placement", "laneW", "widthSrc", "osm")


def seg_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    L2 = dx * dx + dy * dy or 1e-12
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / L2))
    return math.hypot(ax + dx * t - px, ay + dy * t - py)


def osm_ways():
    ways = []
    for el in P.load_elements():
        t = el.get("tags") or {}
        hw = t.get("highway")
        if el.get("type") != "way" or hw not in P.ROAD_SPEC or P.ROAD_SPEC[hw]["cat"] not in CAR:
            continue
        geom = [g for g in el.get("geometry") or [] if g]
        if len(geom) < 2:
            continue
        ways.append({"id": el.get("id"), "hw": hw, "tags": t, "pts": [project(g["lat"], g["lon"]) for g in geom]})
    grid = defaultdict(list)
    for wi, w in enumerate(ways):
        P_ = w["pts"]
        for i in range(len(P_) - 1):
            (ax, ay), (bx, by) = P_[i], P_[i + 1]
            for gx in range(int(math.floor((min(ax, bx) - TOL) / G)), int(math.floor((max(ax, bx) + TOL) / G)) + 1):
                for gy in range(int(math.floor((min(ay, by) - TOL) / G)), int(math.floor((max(ay, by) + TOL) / G)) + 1):
                    grid[(gx, gy)].append((wi, i))
    return ways, grid


def match(road, ways, grid):
    """The OSM way the road lies on: most of its vertices within TOL of the
    way's line, same class (and name where both have one)."""
    score = defaultdict(int)
    pts = road["pts"]
    for x, y in pts:
        seen = set()
        for wi, i in grid.get((int(math.floor(x / G)), int(math.floor(y / G))), ()):
            if wi in seen:
                continue
            w = ways[wi]
            if w["hw"] != road["type"]:
                continue
            (ax, ay), (bx, by) = w["pts"][i], w["pts"][i + 1]
            if seg_dist(x, y, ax, ay, bx, by) <= TOL:
                seen.add(wi)
                score[wi] += 1
    if not score:
        return None
    best = max(score, key=lambda wi: (score[wi], (ways[wi]["tags"].get("name") or "") == (road.get("name") or "")))
    return ways[best] if score[best] >= max(2, int(0.6 * len(pts))) else None


def duals(roads):
    """Ids of the one-way roads that are one carriageway of a dual road: a
    one-way way of the same name or ref runs the other way within 40 m."""
    GD = 50.0
    one = [r for r in roads if r.get("oneway") and not r.get("roundabout") and r["cat"] in CAR and (r.get("name") or r.get("ref"))]
    grid = defaultdict(list)
    for r in one:
        for a, b in zip(r["pts"], r["pts"][1:]):
            for gx in range(int(math.floor(min(a[0], b[0]) / GD)), int(math.floor(max(a[0], b[0]) / GD)) + 1):
                for gy in range(int(math.floor(min(a[1], b[1]) / GD)), int(math.floor(max(a[1], b[1]) / GD)) + 1):
                    grid[(gx, gy)].append((r, a, b))
    out = set()
    for r in one:
        P_ = r["pts"]
        i = len(P_) // 2 - (1 if len(P_) % 2 == 0 else 0)
        i = max(0, min(len(P_) - 2, i))
        a, b = P_[i], P_[i + 1]
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        L = math.hypot(b[0] - a[0], b[1] - a[1]) or 1
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        for gx in range(int(math.floor((mx - 40) / GD)), int(math.floor((mx + 40) / GD)) + 1):
            for gy in range(int(math.floor((my - 40) / GD)), int(math.floor((my + 40) / GD)) + 1):
                for o, c, d in grid.get((gx, gy), ()):
                    if o is r or not ((r.get("ref") and o.get("ref") == r.get("ref")) or (r.get("name") and o.get("name") == r.get("name"))):
                        continue
                    Lo = math.hypot(d[0] - c[0], d[1] - c[1]) or 1
                    if ((d[0] - c[0]) * ux + (d[1] - c[1]) * uy) / Lo > -0.7 or seg_dist(mx, my, c[0], c[1], d[0], d[1]) > 40:
                        continue
                    out.add(id(r))
    return out


def main():
    write = "--write" in sys.argv
    with open(MAP) as f:
        data = json.load(f)
    ways, grid = osm_ways()
    dual = duals(data["roads"])
    n = matched = changed = 0
    narrower = defaultdict(lambda: [0, 0.0])
    for r in data["roads"]:
        if r["cat"] not in CAR or r["type"] not in P.ROAD_SPEC:
            continue
        n += 1
        w = match(r, ways, grid)
        default = P.ROAD_SPEC[r["type"]]["width"]
        tags = w["tags"] if w else {"oneway": "yes" if r.get("oneway") else "no", **({"junction": "roundabout"} if r.get("roundabout") else {})}
        f = lane_fields(r["type"], tags, default, dual=id(r) in dual)
        if w:
            matched += 1
            f["osm"] = w["id"]
        # a road whose width the map already had from a tag keeps it
        if not w and abs(r["width"] - default) > 0.01:
            f["width"] = r["width"]
        if abs(f["width"] - r["width"]) > 0.01:
            changed += 1
            if f["width"] < r["width"]:
                L = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(r["pts"], r["pts"][1:]))
                narrower[r["type"]][0] += 1
                narrower[r["type"]][1] += L / 1000
        for k in KEYS:
            r.pop(k, None)
        for k, v in f.items():
            r[k] = v
    print(f"{n} car roads, {matched} matched to their OSM way, {changed} change width")
    for hw, (c, km) in sorted(narrower.items(), key=lambda q: -q[1][1]):
        print(f"  narrower {hw:16s} {c:5d} ways {km:6.1f} km")
    if write:
        with open(MAP, "w") as f:
            json.dump(data, f, separators=(",", ":"))
        print(f"wrote {os.path.relpath(MAP, ROOT)}")


if __name__ == "__main__":
    main()
