#!/usr/bin/env python3
"""Build the real Ommelanden around the city from data/ommeland_raw.json.gz
(fetch_ommeland.py) into two files next to citymap.json:

  game/ommeland.json  roads, rails, narrow waterways, places, churches,
                      stations and the train routes carried on out of town
  game/ommeland.bin   gzip: building boxes (int16) + a water distance field

Everything the city map already has is left out (citymap.json is not
touched). The game draws this in low detail: roads, water and rails in the
ground shader, buildings as instanced boxes, and the procedural fields,
ditches, farms and animals fill in between (countryreal.js).

Needs numpy and Pillow.
"""
import gzip
import heapq
import json
import math
import os
import struct
import sys

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "ommeland_raw.json.gz")
MAP = os.path.join(ROOT, "game", "citymap.json")
OUT_JSON = os.path.join(ROOT, "game", "ommeland.json")
OUT_BIN = os.path.join(ROOT, "game", "ommeland.bin")

WATER_CELL = 10.0
WATER_RANGE = 31.0  # metres of signed distance kept (0.25 m steps)
COVER_CELL = 40.0

ROAD_KIND = {  # highway -> (kind code, width m)
    "motorway": (1, 11.0), "motorway_link": (2, 6.5), "trunk": (3, 9.0), "trunk_link": (2, 6.0),
    "primary": (3, 8.5), "primary_link": (2, 6.0), "secondary": (4, 7.5), "secondary_link": (2, 6.0),
    "tertiary": (5, 6.5), "tertiary_link": (2, 5.5), "unclassified": (6, 5.0), "residential": (7, 5.5),
    "living_street": (7, 4.5),
}
# Gronings names for the place signs (a second line under the Dutch one)
GRONINGS = {
    "Groningen": "Grunn", "Bedum": "Beem", "Aduard": "Adwerd", "Zuidhorn": "Zuudhorn", "Haren": "Hoaren",
    "Adorp": "Oadörp", "Harkstede": "Harkstee", "Noorddijk": "Noorddiek", "Garmerwolde": "Garmerwolt",
}
PLACE_R = {"town": 650, "village": 300, "hamlet": 140, "suburb": 320, "quarter": 220}
# (route, base route for the city part, splice after this stop, via, stop at, far end)
ROUTE_EXT = [
    ("Stoptrein Roodeschool", "Stoptrein Roodeschool", "Groningen Noord", [], ["Sauwerd", "Winsum"], "Roodeschool"),
    ("Stoptrein Delfzijl", "Stoptrein Roodeschool", "Groningen Noord", [], ["Bedum", "Stedum", "Loppersum"], "Delfzijl"),
    ("Stoptrein Leeuwarden", "Stoptrein Leeuwarden", "Groningen Hoofdstation", [], ["Zuidhorn"], "Leeuwarden"),
    ("Intercity Zwolle", "Intercity Zwolle", "Groningen Europapark", ["Haren"], [], "Zwolle"),
    ("Stoptrein Assen", "Intercity Zwolle", "Groningen Europapark", [], ["Haren"], "Assen"),
    ("Stoptrein Winschoten", "Stoptrein Winschoten", "Groningen Europapark", [], ["Kropswolde", "Martenshoek"], "Winschoten"),
]
NEW_TRAIN = {"Stoptrein Delfzijl": "gtw", "Stoptrein Assen": "gtw"}


def main():
    with gzip.open(RAW, "rt") as f:
        raw = json.load(f)
    with open(MAP) as f:
        city = json.load(f)
    meta = city["meta"]
    lat0, lon0 = meta["origin"]["lat"], meta["origin"]["lon"]
    mlat, mlon = meta["mPerDegLat"], meta["mPerDegLon"]
    proj = lambda la, lo: ((lo - lon0) * mlon, (lat0 - la) * mlat)
    s, w, n, e = raw["bbox"]
    X0, Y0 = proj(n, w)
    X1, Y1 = proj(s, e)
    ext = [round(X0), round(Y0), round(X1), round(Y1)]
    print(f"extent {ext}")

    cover, cgrid = city_cover(city, ext)
    deep = erode(cover, 4)

    def cell(x, y):
        i, j = int((x - ext[0]) // COVER_CELL), int((y - ext[1]) // COVER_CELL)
        return (i, j) if 0 <= i < cgrid[0] and 0 <= j < cgrid[1] else None

    def in_deep(x, y):
        c = cell(x, y)
        return bool(c and deep[c[1], c[0]])

    def in_cover(x, y):
        c = cell(x, y)
        return bool(c and cover[c[1], c[0]])

    # ------------------------------------------------------------- cycling
    # car roads with a painted lane (or a suggestiestrook) get red strips;
    # a track beside the road, and every fietspad, is its own red path
    lanes, cycleways = set(), []
    def cyc(P, hw):
        for run in outside_runs(P, in_deep):
            run = simplify(run, 1.0)
            if len(run) >= 2 and length(run) > 8:
                cycleways.append({"p": flat(run), "h": hw})
    for el in raw.get("cycle", []):
        t = el.get("tags", {})
        g = el.get("g") or []
        if len(g) < 2 or t.get("tunnel") in ("yes", "building_passage"):
            continue
        P = [proj(a, b) for a, b in g]
        if t.get("highway") == "cycleway":
            if t.get("surface") in ("unpaved", "gravel", "fine_gravel", "compacted", "dirt", "ground", "grass", "sand"):
                continue
            hw = 1.25
            try:
                hw = max(0.9, min(2.5, float(str(t.get("width", "")).replace("m", "").strip()) / 2))
            except ValueError:
                pass
            cyc(P, hw)
            continue
        side = {}
        for k, sd in (("cycleway", "both"), ("cycleway:both", "both"), ("cycleway:left", "left"), ("cycleway:right", "right")):
            v = t.get(k)
            if v in ("lane", "shared_lane", "opposite_lane"):
                lanes.add(el["id"])
            elif v == "track":
                side[sd] = True
        if side:
            kd = ROAD_KIND.get(t.get("highway"), (0, 6.0))
            off = kd[1] / 2 + 2.6
            for sd, sign in (("left", 1), ("right", -1)):
                if side.get(sd) or side.get("both"):
                    cyc(offset_line(P, off * sign), 1.1)
    print(f"cycling: {len(lanes)} roads with lanes, {len(cycleways)} paths")

    # ------------------------------------------------------------- roads
    roads = []
    for el in raw["roads"]:
        t = el.get("tags", {})
        k = ROAD_KIND.get(t.get("highway"))
        if not k or t.get("tunnel") in ("yes", "building_passage") or len(el.get("g", [])) < 2:
            continue
        P = [proj(a, b) for a, b in el["g"]]
        for run in outside_runs(P, in_deep):
            run = simplify(run, 1.2)
            if len(run) < 2 or length(run) < 3:
                continue
            kind, wd = k
            try:
                wd = max(3.5, min(16.0, float(str(t.get("width", "")).replace("m", "").strip())))
            except ValueError:
                pass
            if kind == 1 and t.get("lanes") == "3":
                wd = 14.0
            r = {"p": flat(run), "k": kind, "w": wd}
            if t.get("name"):
                r["n"] = t["name"]
            if t.get("ref"):
                r["r"] = t["ref"]
            if t.get("oneway") == "yes" or t.get("junction") == "roundabout" or kind == 1:
                r["o"] = 1
            if t.get("bridge") and t.get("bridge") != "no":
                r["b"] = 1
            if el["id"] in lanes:
                r["c"] = 1
            roads.append(r)
    print(f"roads: {len(roads)} ({sum(len(r['p']) // 2 - 1 for r in roads)} segments)")

    # ------------------------------------------------------------- water
    water, wmeta = water_field(raw["water"], proj, ext)
    wlines = []
    for el in raw["water"]:
        t = el.get("tags", {})
        ww = t.get("waterway")
        if el["type"] != "way" or ww not in ("canal", "river"):
            continue
        P = [proj(a, b) for a, b in el["g"]]
        hw = 5.0 if ww == "canal" else 4.0
        try:
            hw = max(1.5, min(15.0, float(str(t.get("width", "")).replace("m", "").strip()) / 2))
        except ValueError:
            pass
        # only the stretches the lake/riverbank polygons do not cover already
        for run in outside_runs(P, lambda x, y: in_deep(x, y) or water_at(water, wmeta, x, y) > -1.0):
            run = simplify(run, 1.5)
            if len(run) >= 2 and length(run) > 20:
                wlines.append({"p": flat(run), "h": hw, **({"n": t["name"]} if t.get("name") else {})})
    # centre lines of the wide canals and rivers, for the boats
    boatways = []
    for el in raw["water"]:
        t = el.get("tags", {})
        if el["type"] != "way" or t.get("waterway") not in ("canal", "river"):
            continue
        P = [proj(a, b) for a, b in el["g"]]
        for run in outside_runs(P, in_deep):
            run = simplify(run, 3.0)
            if len(run) < 2 or length(run) < 150:
                continue
            d = sorted(water_at(water, wmeta, x, y) for x, y in run)
            if d[len(d) // 2] > 4:
                boatways.append({"p": flat(run), "h": round(min(20.0, d[len(d) // 2]), 1)})
    print(f"water lines: {len(wlines)}, boat lines: {len(boatways)}")

    # ------------------------------------------------------------- rails
    rail_ways = [el for el in raw["rail"] if el["type"] == "way" and el.get("tags", {}).get("service") not in ("yard", "siding", "spur")]
    rails = []
    for el in rail_ways:
        P = [proj(a, b) for a, b in el["g"]]
        for run in outside_runs(P, in_cover):
            run = simplify(run, 0.6)
            if len(run) >= 2 and length(run) > 10:
                rails.append(flat(run))
    stations = []
    city_st = {s["name"].replace(" Hoofdstation", "") for s in city.get("stations", [])}
    for el in raw["rail"]:
        if el["type"] != "node":
            continue
        name = el.get("tags", {}).get("name", "").replace(" station", "")
        if not name or name in city_st or "Groningen" in name:
            continue
        x, y = proj(el["lat"], el["lon"])
        stations.append({"name": name, "x": round(x, 1), "y": round(y, 1)})
    routes = extend_routes(city, rail_ways, proj, stations, ext)

    # ------------------------------------------------------------- places
    places, churches = [], []
    for el in raw["places"]:
        t = el.get("tags", {})
        if "lat" in el:
            la, lo = el["lat"], el["lon"]
        elif "center" in el:
            la, lo = el["center"]["lat"], el["center"]["lon"]
        else:
            continue
        x, y = proj(la, lo)
        if t.get("amenity") == "place_of_worship":
            if not in_cover(x, y):
                churches.append({"x": round(x, 1), "y": round(y, 1), **({"n": t["name"]} if t.get("name") else {})})
            continue
        pl = t.get("place")
        if pl not in PLACE_R or not t.get("name") or in_cover(x, y):
            continue
        p = {"n": t["name"], "x": round(x, 1), "y": round(y, 1), "k": pl, "r": PLACE_R[pl]}
        if t["name"] in GRONINGS:
            p["g"] = GRONINGS[t["name"]]
        places.append(p)
    print(f"places: {len(places)}, churches: {len(churches)}, stations: {[s['name'] for s in stations]}")

    # ------------------------------------------------------------- buildings
    city_boxes = BoxIndex([b["bounds"] if "bounds" in b else bbox(b["pts"]) for b in city["buildings"]])
    bld = []
    for b in raw["bld"]:
        la, lo, bw, bl, ang, code, lv, fill = b
        x, y = proj(la, lo)
        if not (ext[0] < x < ext[2] and ext[1] < y < ext[3]):
            continue
        if in_cover(x, y) and city_boxes.hit(x, y, 1.5):
            continue
        if in_deep(x, y):
            continue
        if code == 8 and bw * bl < 30:
            continue
        bld.append((round(x), round(y), min(32000, round(bw * 10)), min(32000, round(bl * 10)), int(ang) % 180, code, lv, round(fill * 100)))
    print(f"buildings: {len(bld)}")

    out = {
        "extent": ext, "water": wmeta, "buildings": len(bld),
        "roads": roads, "cycleways": cycleways, "waterways": wlines, "boatways": boatways, "rails": rails, "stations": stations, "routes": routes,
        "places": places, "churches": churches,
    }
    with open(OUT_JSON, "w") as f:
        json.dump(out, f, separators=(",", ":"), ensure_ascii=False)
    body = np.array(bld, dtype=np.int16).tobytes() + water.tobytes()
    with open(OUT_BIN, "wb") as f:
        f.write(gzip.compress(b"GTEO" + struct.pack("<II", len(bld), 8) + body, 9, mtime=0))
    print(f"{OUT_JSON}: {os.path.getsize(OUT_JSON) / 1e6:.2f} MB, {OUT_BIN}: {os.path.getsize(OUT_BIN) / 1e6:.2f} MB")


# ------------------------------------------------------------------ helpers

def flat(P):
    out = []
    for x, y in P:
        out += [round(x, 1), round(y, 1)]
    return out


def length(P):
    return sum(math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]) for i in range(1, len(P)))


def bbox(P):
    xs, ys = [p[0] for p in P], [p[1] for p in P]
    return [min(xs), min(ys), max(xs), max(ys)]


def simplify(P, tol):
    if len(P) < 3:
        return P
    keep = [False] * len(P)
    keep[0] = keep[-1] = True
    stack = [(0, len(P) - 1)]
def offset_line(P, d):
    """P moved d metres to its left (y down: the left of travel is +normal)."""
    out = []
    for i in range(len(P)):
        a, b = P[max(0, i - 1)], P[min(len(P) - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1
        out.append((P[i][0] + dy / L * d, P[i][1] - dx / L * d))
    return out


    while stack:
        a, b = stack.pop()
        ax, ay = P[a]
        bx, by = P[b]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy) or 1e-9
        best, bi = -1, -1
        for i in range(a + 1, b):
            d = abs((P[i][0] - ax) * dy - (P[i][1] - ay) * dx) / L
            if d > best:
                best, bi = d, i
        if best > tol:
            keep[bi] = True
            stack += [(a, bi), (bi, b)]
    return [p for p, k in zip(P, keep) if k]


def outside_runs(P, inside):
    """Pieces of polyline P outside the predicate, densified at the cuts."""
    dense = [P[0]]
    for i in range(1, len(P)):
        a, b = P[i - 1], P[i]
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        k = max(1, int(L // 20))
        for j in range(1, k + 1):
            dense.append((a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k))
    runs, cur = [], []
    for p in dense:
        if inside(p[0], p[1]):
            if len(cur) >= 2:
                runs.append(cur)
            cur = []
        else:
            cur.append(p)
    if len(cur) >= 2:
        runs.append(cur)
    return runs


class BoxIndex:
    def __init__(self, boxes, cell=50.0):
        self.cell, self.g = cell, {}
        for q in boxes:
            for i in range(int(q[0] // cell), int(q[2] // cell) + 1):
                for j in range(int(q[1] // cell), int(q[3] // cell) + 1):
                    self.g.setdefault((i, j), []).append(q)

    def hit(self, x, y, m):
        for q in self.g.get((int(x // self.cell), int(y // self.cell)), ()):
            if q[0] - m <= x <= q[2] + m and q[1] - m <= y <= q[3] + m:
                return True
        return False


def city_cover(city, ext):
    """Where the city map has data (40 m cells, gaps closed, holes filled)."""
    W = int(math.ceil((ext[2] - ext[0]) / COVER_CELL))
    H = int(math.ceil((ext[3] - ext[1]) / COVER_CELL))
    occ = np.zeros((H, W), bool)

    def mark(x, y):
        i, j = int((x - ext[0]) // COVER_CELL), int((y - ext[1]) // COVER_CELL)
        if 0 <= i < W and 0 <= j < H:
            occ[j, i] = True
    for r in city["roads"]:
        P = r["pts"]
        for k in range(1, len(P)):
            a, b = P[k - 1], P[k]
            m = max(1, int(math.hypot(b[0] - a[0], b[1] - a[1]) // 25))
            for t in range(m + 1):
                mark(a[0] + (b[0] - a[0]) * t / m, a[1] + (b[1] - a[1]) * t / m)
    for b in city["buildings"]:
        for p in b["pts"][::2]:
            mark(p[0], p[1])
    occ = erode(dilate(occ, 3), 3)
    # fill holes: flood the outside from the border
    out = np.zeros_like(occ)
    stack = [(0, j) for j in range(H)] + [(W - 1, j) for j in range(H)] + [(i, 0) for i in range(W)] + [(i, H - 1) for i in range(W)]
    while stack:
        i, j = stack.pop()
        if out[j, i] or occ[j, i]:
            continue
        out[j, i] = True
        if i > 0: stack.append((i - 1, j))
        if i < W - 1: stack.append((i + 1, j))
        if j > 0: stack.append((i, j - 1))
        if j < H - 1: stack.append((i, j + 1))
    return ~out, (W, H)


def shift_or(a, R, fn):
    out = a.copy()
    H, W = a.shape
    for dj in range(-R, R + 1):
        for di in range(-R, R + 1):
            if di * di + dj * dj > R * R:
                continue
            s = np.zeros_like(a) if fn is np.logical_or else np.ones_like(a)
            s[max(0, dj):H + min(0, dj), max(0, di):W + min(0, di)] = a[max(0, -dj):H - max(0, dj), max(0, -di):W - max(0, di)]
            out = fn(out, s)
    return out


def dilate(a, R):
    return shift_or(a, R, np.logical_or)


def erode(a, R):
    return shift_or(a, R, np.logical_and)


# ------------------------------------------------------------------ water

def rings_of(el, proj):
    """Closed rings (outer, inner) of a natural=water way or multipolygon."""
    if el["type"] == "way":
        g = el.get("g") or []
        if len(g) >= 4 and g[0] == g[-1]:
            return [[proj(a, b) for a, b in g]], []
        return [], []
    outer, inner = [], []
    for role, dst in (("outer", outer), ("inner", inner)):
        segs = [m["g"] for m in el.get("members", []) if (m["role"] or "outer") == role and len(m["g"]) >= 2]
        while segs:
            ring = list(segs.pop())
            changed = True
            while ring[0] != ring[-1] and changed:
                changed = False
                for i, sg in enumerate(segs):
                    if sg[0] == ring[-1]:
                        ring += sg[1:]
                    elif sg[-1] == ring[-1]:
                        ring += sg[::-1][1:]
                    elif sg[-1] == ring[0]:
                        ring = sg[:-1] + ring
                    elif sg[0] == ring[0]:
                        ring = sg[::-1][:-1] + ring
                    else:
                        continue
                    segs.pop(i)
                    changed = True
                    break
            if len(ring) >= 4 and ring[0] == ring[-1]:
                dst.append([proj(a, b) for a, b in ring])
    return outer, inner


def water_field(els, proj, ext):
    """Signed distance to open water (positive inside) on a 10 m grid."""
    C = WATER_CELL
    W = int(math.ceil((ext[2] - ext[0]) / C))
    H = int(math.ceil((ext[3] - ext[1]) / C))
    img = Image.new("L", (W, H), 0)
    dr = ImageDraw.Draw(img)
    edges = []
    to_px = lambda p: ((p[0] - ext[0]) / C - 0.5, (p[1] - ext[1]) / C - 0.5)
    n_poly = 0
    for el in els:
        t = el.get("tags", {})
        if not (t.get("natural") == "water" or t.get("waterway") == "riverbank"):
            continue
        if t.get("water") in ("wastewater", "reflecting_pool", "pool"):
            continue
        outer, inner = rings_of(el, proj)
        for ring in outer:
            dr.polygon([to_px(p) for p in ring], fill=255)
        for ring in inner:
            dr.polygon([to_px(p) for p in ring], fill=0)
        for ring in outer + inner:
            n_poly += 1
            for k in range(1, len(ring)):
                edges.append((ring[k - 1], ring[k]))
    inside = np.asarray(img) > 127
    dist = np.full((H, W), WATER_RANGE, np.float32)
    cx = ext[0] + (np.arange(W) + 0.5) * C
    cy = ext[1] + (np.arange(H) + 0.5) * C
    for (ax, ay), (bx, by) in edges:
        i0 = max(0, int((min(ax, bx) - WATER_RANGE - ext[0]) // C))
        i1 = min(W, int((max(ax, bx) + WATER_RANGE - ext[0]) // C) + 1)
        j0 = max(0, int((min(ay, by) - WATER_RANGE - ext[1]) // C))
        j1 = min(H, int((max(ay, by) + WATER_RANGE - ext[1]) // C) + 1)
        if i0 >= i1 or j0 >= j1:
            continue
        X, Y = np.meshgrid(cx[i0:i1], cy[j0:j1])
        dx, dy = bx - ax, by - ay
        L2 = dx * dx + dy * dy or 1e-9
        tt = np.clip(((X - ax) * dx + (Y - ay) * dy) / L2, 0, 1)
        d = np.hypot(X - ax - dx * tt, Y - ay - dy * tt)
        np.minimum(dist[j0:j1, i0:i1], d, out=dist[j0:j1, i0:i1])
    sd = np.where(inside, dist, -dist)
    q = np.clip(np.round(128 + sd * 4), 0, 255).astype(np.uint8)
    print(f"water: {n_poly} rings, {len(edges)} edges, {inside.sum()} wet cells")
    return q, {"x0": ext[0], "y0": ext[1], "cell": C, "w": W, "h": H}


def water_at(q, wm, x, y):
    i, j = int((x - wm["x0"]) // wm["cell"]), int((y - wm["y0"]) // wm["cell"])
    if 0 <= i < wm["w"] and 0 <= j < wm["h"]:
        return (int(q[j, i]) - 128) / 4
    return -WATER_RANGE


# ------------------------------------------------------------------ trains

def extend_routes(city, rail_ways, proj, stations, ext):
    """Carry the city's train routes on along the real track to the stations
    around town and on to the edge of the Ommelanden."""
    nodes, adj = {}, {}
    key = lambda p: (round(p[0], 5), round(p[1], 5))
    for el in rail_ways:
        g = el["g"]
        main = el.get("tags", {}).get("usage") in ("main", "branch")
        for k in range(1, len(g)):
            a, b = key(g[k - 1]), key(g[k])
            if a == b:
                continue
            for q in (a, b):
                if q not in nodes:
                    nodes[q] = proj(*q)
            adj.setdefault(a, []).append((b, main))
            adj.setdefault(b, []).append((a, main))
    pos = nodes
    st_xy = {s["name"]: (s["x"], s["y"]) for s in stations}
    routes = {r["name"]: r for r in city["railRoutes"]}
    X0, Y0, X1, Y1 = ext
    margin = 250

    def near_nodes(x, y, r):
        return [q for q, p in pos.items() if abs(p[0] - x) < r and abs(p[1] - y) < r and math.hypot(p[0] - x, p[1] - y) < r]

    max_turn = [math.cos(math.radians(50))]

    def turn_ok(a, b, c):
        ux, uy = pos[b][0] - pos[a][0], pos[b][1] - pos[a][1]
        vx, vy = pos[c][0] - pos[b][0], pos[c][1] - pos[b][1]
        lu, lv = math.hypot(ux, uy), math.hypot(vx, vy)
        if lu < 1e-6 or lv < 1e-6:
            return True
        return (ux * vx + uy * vy) / (lu * lv) > max_turn[0]

    def dijkstra(start_states, goals):
        dist = {}
        pq = []
        for st in start_states:
            dist[st] = 0.0
            heapq.heappush(pq, (0.0, st))
        prev = {}
        while pq:
            d, (u, pu) = heapq.heappop(pq)
            if d > dist.get((u, pu), 1e18):
                continue
            if u in goals:
                path = [u]
                s = (u, pu)
                while s in prev:
                    s = prev[s]
                    path.append(s[0])
                if pu is not None and s[1] is not None:
                    path.append(s[1])
                return path[::-1]
            for v, main in adj.get(u, ()):
                if v == pu or (pu is not None and not turn_ok(pu, u, v)):
                    continue
                nd = d + math.hypot(pos[v][0] - pos[u][0], pos[v][1] - pos[u][1]) * (1.0 if main else 1.6)
                if nd < dist.get((v, u), 1e18):
                    dist[(v, u)] = nd
                    prev[(v, u)] = (u, pu)
                    heapq.heappush(pq, (nd, (v, u)))
        return None

    def run_out(path):
        """Keep following the straightest main track to the extent edge."""
        seen = set(path)
        while True:
            u, pu = path[-1], path[-2]
            x, y = pos[u]
            if x < X0 + margin or x > X1 - margin or y < Y0 + margin or y > Y1 - margin:
                return path
            best, bc = None, -2
            for v, main in adj.get(u, ()):
                if v == pu or v in seen or not turn_ok(pu, u, v):
                    continue
                ux, uy = x - pos[pu][0], y - pos[pu][1]
                vx, vy = pos[v][0] - x, pos[v][1] - y
                c = (ux * vx + uy * vy) / ((math.hypot(ux, uy) * math.hypot(vx, vy)) or 1) + (0.2 if main else 0)
                if c > bc:
                    best, bc = v, c
            if best is None:
                return path
            path.append(best)
            seen.add(best)

    out = []
    for name, base, after, via, stop_at, far in ROUTE_EXT:
        R = routes.get(base)
        if not R:
            continue
        P = R["pts"]
        acc = [0.0]
        for i in range(1, len(P)):
            acc.append(acc[-1] + math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]))
        s0 = next(s["s"] for s in R["stops"] if s["name"] == after) + 150
        i0 = next(i for i, a in enumerate(acc) if a >= s0)
        hx, hy = P[i0][0] - P[i0 - 3][0], P[i0][1] - P[i0 - 3][1]
        starts = []
        for q in near_nodes(P[i0][0], P[i0][1], 12):
            for v, _ in adj.get(q, ()):
                vx, vy = pos[v][0] - pos[q][0], pos[v][1] - pos[q][1]
                if vx * hx + vy * hy > 0.8 * math.hypot(vx, vy) * math.hypot(hx, hy):
                    starts.append((v, q))
        if not starts:
            print(f"  {name}: no track at the splice point")
            continue
        path = None
        reached = []
        for target in via + stop_at:
            tx, ty = st_xy[target]
            goals = set(near_nodes(tx, ty, 60))
            st0 = starts if path is None else [(path[-1], path[-2])]
            seg = dijkstra(st0, goals)
            if not seg:
                # sharp switches: try once more with a looser turn limit
                max_turn[0] = math.cos(math.radians(80))
                seg = dijkstra(st0, goals)
                max_turn[0] = math.cos(math.radians(50))
            if not seg:
                print(f"  {name}: no path to {target}")
                break
            reached.append(target)
            path = seg if path is None else path + seg[2:] if seg[:2] == path[-2:] else path + seg[1:]
        if not path:
            continue
        path = run_out(path)
        pts = [pos[q] for q in path]
        # splice where the real track leaves the city route
        cut = 0
        for k, (x, y) in enumerate(pts):
            d = min(math.hypot(x - P[i][0], y - P[i][1]) for i in range(max(0, i0 - 40), min(len(P), i0 + 400)))
            if d < 3.5:
                cut = k
            elif k > cut + 3:
                break
        cx, cy = pts[cut]
        bi = min(range(i0 - 40 if i0 > 40 else 0, min(len(P), i0 + 400)), key=lambda i: math.hypot(P[i][0] - cx, P[i][1] - cy))
        cutS = acc[bi]
        tail = densify([P[bi]] + pts[cut + 1:], 8.0)
        tail = smooth_track(tail)
        s_at = [0.0]
        for k in range(1, len(tail)):
            s_at.append(s_at[-1] + math.hypot(tail[k][0] - tail[k - 1][0], tail[k][1] - tail[k - 1][1]))
        stops = []
        for st in [t for t in stop_at if t in reached]:
            tx, ty = st_xy[st]
            k = min(range(len(tail)), key=lambda k: math.hypot(tail[k][0] - tx, tail[k][1] - ty))
            stops.append({"name": st, "s": round(s_at[k], 1)})
        stops.append({"name": far, "s": round(s_at[-1] - 30, 1), "offmap": True})
        keep = [s["name"] for s in R["stops"] if s["s"] < cutS - 50 and not s.get("offmap")]
        rt = {"name": name, "base": base, "cutS": round(cutS, 1), "keep": keep, "pts": flat(tail), "stops": stops}
        if name in NEW_TRAIN:
            rt["train"] = NEW_TRAIN[name]
        out.append(rt)
        print(f"  {name}: +{s_at[-1] / 1000:.1f} km from s={cutS:.0f}, stops {[s['name'] for s in stops]}")
    return out


def densify(P, step):
    out = [P[0]]
    for i in range(1, len(P)):
        a, b = P[i - 1], P[i]
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        k = max(1, int(math.ceil(L / step)))
        for j in range(1, k + 1):
            out.append((a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k))
    return out


def smooth_track(P, passes=3):
    P = [list(p) for p in P]
    for _ in range(passes):
        Q = [P[0]] + [[(P[i - 1][0] + 2 * P[i][0] + P[i + 1][0]) / 4, (P[i - 1][1] + 2 * P[i][1] + P[i + 1][1]) / 4] for i in range(1, len(P) - 1)] + [P[-1]]
        P = Q
    return [tuple(p) for p in P]


if __name__ == "__main__":
    main()
