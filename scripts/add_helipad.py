#!/usr/bin/env python3
"""Fetch the UMCG rooftop helipad (aeroway=helipad) from OSM and merge it into
game/citymap.json as meta.helipad: {x, y, r, angle, building}.

x/y is the pad centre in game metres, r the game-scale pad radius, angle the
orientation of the footprint's longest edge, building the index of the
building whose footprint contains the pad (the roof it sits on).

The pad sits on the UMCG Centraal Medisch Complex, an OSM multipolygon that
process_osm.py never imported (and whose covered interior streets the game
renders as open footpaths). When no building carries the pad, a compact
rectangular wing around it is appended to buildings (flag helipad=1), sized
as large as fits inside the complex outline without touching its courtyards,
roads, trees or other buildings. Re-running replaces that wing; apart from it
and meta.helipad every other key in the file is preserved.

The raw Overpass response is cached in data/helipads_raw.json; pass --refresh
to fetch it again.
"""
import json
import math
import os
import subprocess
import sys

MAP_PATH = "game/citymap.json"
CACHE_PATH = "data/helipads_raw.json"
COMPLEX_CACHE_PATH = "data/umcg_complex_raw.json"
COMPLEX_RELATION = 7348593
WING_LEVELS = 6
# game-scale pad radius; the OSM outline covers the whole ~26 m roof deck
PAD_R = 8.0
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]


def fetch_query(query):
    for url in OVERPASS_URLS:
        result = subprocess.run(
            ["curl", "-s", "-m", "150", "-A", "gte-vi-script/1.0", "--data-urlencode", f"data={query}", url],
            capture_output=True, text=True,
        )
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError:
            print(f"overpass {url} failed, trying next", file=sys.stderr)
    raise SystemExit("all overpass endpoints failed")


def cached(path, query):
    if "--refresh" in sys.argv or not os.path.exists(path):
        raw = fetch_query(query)
        with open(path, "w") as f:
            json.dump(raw, f)
    with open(path) as f:
        return json.load(f)


def seg_dist(x, y, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    l2 = dx * dx + dy * dy or 1
    t = max(0.0, min(1.0, ((x - a[0]) * dx + (y - a[1]) * dy) / l2))
    return math.hypot(x - a[0] - dx * t, y - a[1] - dy * t)


def plan_wing(data, to_xy, cx, cy, r, angle, relation):
    outer, inners = [], []
    for m in relation["members"]:
        ring = [to_xy(p["lat"], p["lon"]) for p in m.get("geometry", [])]
        (outer if m["role"] == "outer" else inners).append(ring)
    outer = max(outer, key=len)
    ux, uy = math.cos(angle), math.sin(angle)
    vx, vy = -uy, ux
    near = lambda pts: any(math.hypot(p[0] - cx, p[1] - cy) < 120 for p in pts)
    road_segs = [(rd["pts"][i], rd["pts"][i + 1], rd.get("width", 4) / 2) for rd in data["roads"] if near(rd["pts"])
                 for i in range(len(rd["pts"]) - 1)]
    bld_rings = [b["pts"] for b in data["buildings"] if not b.get("helipad") and near(b["pts"])]
    trees = [t for t in data["trees"] if math.hypot(t[0] - cx, t[1] - cy) < 120]

    def corners(oa, oc, ha, hc):
        ox, oy = cx + ux * oa + vx * oc, cy + uy * oa + vy * oc
        return [(ox + ux * sa * ha + vx * sc * hc, oy + uy * sa * ha + vy * sc * hc)
                for sa, sc in ((-1, -1), (1, -1), (1, 1), (-1, 1))]

    def ok(poly):
        samples = []
        for i in range(4):
            a, b = poly[i], poly[(i + 1) % 4]
            n = max(2, int(math.hypot(b[0] - a[0], b[1] - a[1]) / 2))
            samples += [(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n) for k in range(n)]
        if not all(point_in_poly(x, y, outer) for x, y in samples):
            return False
        for ring in inners + bld_rings:
            if any(point_in_poly(x, y, poly) for x, y in ring) or any(point_in_poly(x, y, ring) for x, y in samples):
                return False
        for a, b, hw in road_segs:
            if any(point_in_poly(x, y, poly) for x, y in (a, b)):
                return False
            if any(seg_dist(x, y, a, b) < hw + 2.5 for x, y in samples):
                return False
        return not any(point_in_poly(t[0], t[1], poly) for t in trees)

    best = None
    for ha in range(int(r) + 3, 34):
        for hc in range(int(r) + 3, 34):
            if best and ha * hc <= best[0]:
                continue
            for oa in range(-(ha - int(r) - 3), ha - int(r) - 2, 2):
                for oc in range(-(hc - int(r) - 3), hc - int(r) - 2, 2):
                    poly = corners(oa, oc, ha, hc)
                    if ok(poly):
                        best = (ha * hc, poly)
                        break
                else:
                    continue
                break
    if not best:
        raise SystemExit("no room for a helipad wing")
    return [[round(x, 1), round(y, 1)] for x, y in best[1]] + [[round(best[1][0][0], 1), round(best[1][0][1], 1)]]


def point_in_poly(x, y, pts):
    inside = False
    j = len(pts) - 1
    for i in range(len(pts)):
        xi, yi = pts[i]
        xj, yj = pts[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def main():
    with open(MAP_PATH) as f:
        data = json.load(f)
    meta = data["meta"]
    lat0, lon0 = meta["origin"]["lat"], meta["origin"]["lon"]
    m_lat, m_lon = meta["mPerDegLat"], meta["mPerDegLon"]
    x0, y0, x1, y1 = meta["bounds"]
    bbox = (lat0 - y1 / m_lat, lon0 + x0 / m_lon, lat0 - y0 / m_lat, lon0 + x1 / m_lon)

    s, w, n, e = bbox
    raw = cached(CACHE_PATH, f'[out:json][timeout:60];nwr["aeroway"~"helipad|heliport"]({s:.5f},{w:.5f},{n:.5f},{e:.5f});out geom tags;')

    to_xy = lambda lat, lon: ((lon - lon0) * m_lon, (lat0 - lat) * m_lat)
    pads = []
    for el in raw["elements"]:
        if el["type"] == "way" and el.get("geometry"):
            ring = [to_xy(p["lat"], p["lon"]) for p in el["geometry"]]
        elif el["type"] == "node":
            ring = [to_xy(el["lat"], el["lon"])]
        else:
            continue
        cx = sum(p[0] for p in ring) / len(ring)
        cy = sum(p[1] for p in ring) / len(ring)
        r = max([math.hypot(p[0] - cx, p[1] - cy) for p in ring] + [6.0])
        angle, best = 0.0, 0.0
        for a, b in zip(ring, ring[1:]):
            l = math.hypot(b[0] - a[0], b[1] - a[1])
            if l > best:
                best, angle = l, math.atan2(b[1] - a[1], b[0] - a[0])
        pads.append((el.get("tags", {}), cx, cy, min(r, PAD_R), angle))

    umcg = [p for p in pads if "Universitair" in p[0].get("name", "") or "UMCG" in p[0].get("name", "")]
    if not umcg:
        raise SystemExit("no UMCG helipad in OSM response")
    tags, cx, cy, r, angle = umcg[0]

    def carrier(buildings):
        for i, b in enumerate(buildings):
            if not b.get("helipad") and point_in_poly(cx, cy, b["pts"]):
                return i
        return -1

    wing = None
    if carrier(data["buildings"]) < 0:
        relation = cached(COMPLEX_CACHE_PATH, f"[out:json][timeout:60];relation({COMPLEX_RELATION});out geom;")["elements"][0]
        wing = plan_wing(data, to_xy, cx, cy, r, angle, relation)

    # re-read right before writing so concurrent edits to other keys survive
    with open(MAP_PATH) as f:
        data = json.load(f)
    data["buildings"] = [b for b in data["buildings"] if not b.get("helipad")]
    building = carrier(data["buildings"])
    if building < 0 and wing:
        data["buildings"].append({"pts": wing, "h": WING_LEVELS, "name": "UMCG Centraal Medisch Complex", "type": "hospital", "helipad": 1})
        building = len(data["buildings"]) - 1
    data["meta"]["helipad"] = {
        "x": round(cx, 1), "y": round(cy, 1), "r": round(r, 1),
        "angle": round(angle, 3), "building": building,
    }
    with open(MAP_PATH, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(f"helipad: {data['meta']['helipad']} ({tags.get('name')})")


if __name__ == "__main__":
    main()
