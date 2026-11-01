#!/usr/bin/env python3
"""Fetch the Ommelanden around the city (roughly 12 km out: Zuidhorn to
Ten Boer, Bedum to Eelde and the Zuidlaardermeer) into
data/ommeland_raw.json.gz for add_ommeland.py.

Only what the low-detail countryside uses is kept: car roads, rail lines
and stations, canals / rivers / lakes, place names, churches and building
footprints (tags trimmed, coordinates rounded to ~1 m).

    python3 scripts/fetch_ommeland.py            # fetch if the cache is missing
    python3 scripts/fetch_ommeland.py --refresh  # refetch
    python3 scripts/fetch_ommeland.py --layers bld,cycle  # refetch some layers

Buildings are kept as their minimum-area box; an outline that fills its box
badly (an L, a T, a farm with a wing) also keeps 2-3 rectangles that cover
it, in the box's own frame.
"""
import gzip
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from osmfetch import overpass  # noqa: E402

# (south, west, north, east)
BBOX = (53.124, 6.385, 53.339, 6.753)
DST = "data/ommeland_raw.json.gz"

HW = ("motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|"
      "tertiary|tertiary_link|unclassified|residential|living_street")


def queries(b):
    B = "({},{},{},{})".format(*b)
    return {
        "roads": f'[out:json][timeout:300];way["highway"~"^({HW})$"]{B};out geom;',
        "rail": ('[out:json][timeout:200];('
                 f'way["railway"="rail"]{B};node["railway"~"^(station|halt)$"]{B};'
                 ');out geom;'),
        "water": ('[out:json][timeout:300];('
                  f'way["waterway"~"^(canal|river)$"]{B};'
                  f'way["natural"="water"]{B};rel["natural"="water"]{B};'
                  f'way["waterway"="riverbank"]{B};'
                  ');out geom;'),
        "places": ('[out:json][timeout:200];('
                   f'node["place"~"^(town|village|hamlet|suburb|quarter)$"]{B};'
                   f'nwr["amenity"="place_of_worship"]{B};'
                   ');out center;'),
        "bld": f'[out:json][timeout:180];way["building"]{B};out geom;',
        # fietspaden, and car roads with a cycle lane or track on them
        "cycle": ('[out:json][timeout:300];('
                  f'way["highway"="cycleway"]{B};'
                  f'way["highway"~"^({HW})$"]["cycleway"~"^(lane|track|shared_lane|opposite_lane)$"]{B};'
                  f'way["highway"~"^({HW})$"]["cycleway:both"~"^(lane|track|shared_lane)$"]{B};'
                  f'way["highway"~"^({HW})$"]["cycleway:left"~"^(lane|track|shared_lane)$"]{B};'
                  f'way["highway"~"^({HW})$"]["cycleway:right"~"^(lane|track|shared_lane)$"]{B};'
                  ');out geom;'),
    }


def tiles(b, n):
    s, w, nn, e = b
    return [(round(s + (nn - s) * i / n, 5), round(w + (e - w) * j / n, 5),
             round(s + (nn - s) * (i + 1) / n, 5), round(w + (e - w) * (j + 1) / n, 5))
            for i in range(n) for j in range(n)]


KEEP = {
    "highway", "name", "ref", "oneway", "junction", "bridge", "tunnel", "layer", "lanes", "width",
    "railway", "service", "usage", "waterway", "natural", "water", "place", "amenity", "religion",
    "building", "building:levels", "height", "type", "alt_name", "name:gos", "population",
    "cycleway", "cycleway:both", "cycleway:left", "cycleway:right", "segregated", "surface",
}
LAYERS = ("roads", "rail", "water", "places", "bld", "cycle")
R = 5  # decimals (~1 m)
LAT0, M_LAT, M_LON = 53.2195, 110574.0, 66652.97
BLD_CODES = {"house": 1, "detached": 1, "semidetached_house": 1, "terrace": 1, "bungalow": 1, "residential": 1,
             "apartments": 2, "farm": 3, "farmhouse": 3, "barn": 4, "farm_auxiliary": 4, "cowshed": 4, "stable": 4,
             "greenhouse": 5, "industrial": 6, "warehouse": 6, "commercial": 6, "retail": 6, "office": 6,
             "church": 7, "chapel": 7, "shed": 8, "garage": 8, "garages": 8, "carport": 8, "school": 9, "houseboat": 10}


def slim(e):
    out = {"type": e["type"], "id": e["id"]}
    tags = {k: v for k, v in (e.get("tags") or {}).items() if k in KEEP}
    if tags:
        out["tags"] = tags
    if "lat" in e:
        out["lat"], out["lon"] = round(e["lat"], R), round(e["lon"], R)
    if "center" in e:
        out["center"] = {"lat": round(e["center"]["lat"], R), "lon": round(e["center"]["lon"], R)}
    if "geometry" in e:
        out["g"] = [[round(p["lat"], R), round(p["lon"], R)] for p in e["geometry"] if p]
    if "members" in e:
        out["members"] = [{"role": m.get("role", ""), "g": [[round(p["lat"], R), round(p["lon"], R)] for p in m.get("geometry") or [] if p]}
                          for m in e["members"] if m.get("type") == "way"]
    return out


def poly_area(P):
    a = 0.0
    for i in range(len(P)):
        x0, y0 = P[i]
        x1, y1 = P[(i + 1) % len(P)]
        a += x0 * y1 - x1 * y0
    return abs(a) / 2


def local(g):
    lat0, lon0 = g[0]
    k = M_LON / 1.0
    return [((lo - lon0) * k, (lat0 - la) * M_LAT) for la, lo in g]


def obb(P):
    """Minimum-area rectangle: (cx, cy, w, l, angle) in the local frame."""
    best = None
    n = len(P)
    for i in range(n):
        x0, y0 = P[i]
        x1, y1 = P[(i + 1) % n]
        dx, dy = x1 - x0, y1 - y0
        L = (dx * dx + dy * dy) ** 0.5
        if L < 0.5:
            continue
        ux, uy = dx / L, dy / L
        us = [x * ux + y * uy for x, y in P]
        vs = [-x * uy + y * ux for x, y in P]
        a = (max(us) - min(us)) * (max(vs) - min(vs))
        if best is None or a < best[0]:
            cu, cv = (max(us) + min(us)) / 2, (max(vs) + min(vs)) / 2
            best = (a, cu * ux - cv * uy, cu * uy + cv * ux, max(us) - min(us), max(vs) - min(vs), ux, uy)
    return best


def compact_building(e):
    g = e.get("g") or []
    if len(g) < 4:
        return None
    P = local(g[:-1] if g[0] == g[-1] else g)
    area = poly_area(P)
    t = e.get("tags", {})
    code = BLD_CODES.get(t.get("building"), 0)
    if area < (12 if code in (7,) else 22):
        return None
    b = obb(P)
    if not b:
        return None
    _, cx, cy, w, l, ux, uy = b
    ang = math.degrees(math.atan2(uy, ux)) % 180
    lat = g[0][0] - cy / M_LAT
    lon = g[0][1] + cx / M_LON
    lv = t.get("building:levels")
    try:
        lv = max(1, min(20, int(float(lv))))
    except (TypeError, ValueError):
        lv = 0
    fill = round(area / max(1.0, w * l), 2)
    out = [round(lat, 6), round(lon, 6), round(w, 1), round(l, 1), round(ang), code, lv, fill]
    if fill < 0.8 and area >= 40:
        parts = rect_parts(P, cx, cy, ux, uy, w, l, area)
        if parts:
            out.append(parts)
    return out


def inside(P, x, y):
    c = False
    n = len(P)
    for i in range(n):
        x0, y0 = P[i]
        x1, y1 = P[(i + 1) % n]
        if (y0 > y) != (y1 > y) and x < x0 + (y - y0) * (x1 - x0) / (y1 - y0):
            c = not c
    return c


def snap(vals, tol):
    vals = sorted(vals)
    out = [vals[0]]
    for v in vals[1:]:
        if v - out[-1] > tol:
            out.append(v)
    return out


def rect_parts(P, cx, cy, ux, uy, w, l, area):
    """2-3 rectangles over the outline P (box frame: u along (ux, uy), v
    across it, both from the box centre): [[cu, cv, w, l], ...] in
    decimetres, or None when they would not fit it better than the box."""
    Q = [((x - cx) * ux + (y - cy) * uy, -(x - cx) * uy + (y - cy) * ux) for x, y in P]
    us = snap([q[0] for q in Q], 0.8)
    vs = snap([q[1] for q in Q], 0.8)
    if len(us) > 11 or len(vs) > 11:
        return None
    us[0], us[-1], vs[0], vs[-1] = -w / 2, w / 2, -l / 2, l / 2
    nu, nv = len(us) - 1, len(vs) - 1
    if nu < 2 and nv < 2:
        return None
    cell = [[inside(Q, (us[i] + us[i + 1]) / 2, (vs[j] + vs[j + 1]) / 2) for j in range(nv)] for i in range(nu)]
    used = [[False] * nv for _ in range(nu)]
    rects, covered = [], 0.0
    for _ in range(3):
        best = None
        for i0 in range(nu):
            for i1 in range(i0, nu):
                for j0 in range(nv):
                    gain = 0.0
                    for j1 in range(j0, nv):
                        if not all(cell[i][j1] for i in range(i0, i1 + 1)):
                            break
                        gain += sum((us[i + 1] - us[i]) * (vs[j1 + 1] - vs[j1]) for i in range(i0, i1 + 1) if not used[i][j1])
                        a = (us[i1 + 1] - us[i0]) * (vs[j1 + 1] - vs[j0])
                        # new cover first; an overlap only to square a wing off
                        score = gain - 0.15 * (a - gain)
                        if best is None or score > best[0]:
                            best = (score, gain, i0, i1, j0, j1)
        if not best or best[1] < max(10.0, area * 0.08):
            break
        _, gain, i0, i1, j0, j1 = best
        for i in range(i0, i1 + 1):
            for j in range(j0, j1 + 1):
                used[i][j] = True
        covered += gain
        rects.append([us[i0], us[i1 + 1], vs[j0], vs[j1 + 1]])
    if len(rects) < 2 or covered < 0.85 * area:
        return None
    rects = join_wings(rects)
    return [[round((a + b) * 5), round((c + d) * 5), round((b - a) * 10), round((d - c) * 10)] for a, b, c, d in rects]


def join_wings(rects):
    """Each later rectangle that butts onto an earlier one runs on into it by
    half its own width, so its roof meets the bigger roof instead of
    standing a gable against it."""
    out = [list(r) for r in rects]
    for k in range(1, len(out)):
        a0, a1, b0, b1 = out[k]
        for r in out[:k]:
            u0, u1, v0, v1 = r
            ov_v = min(b1, v1) - max(b0, v0)
            ov_u = min(a1, u1) - max(a0, u0)
            half_w = (b1 - b0) / 2
            half_l = (a1 - a0) / 2
            if ov_v > 0.5 and abs(a1 - u0) < 0.3:
                out[k][1] = a1 + min(half_w, (u1 - u0) / 2)
            elif ov_v > 0.5 and abs(a0 - u1) < 0.3:
                out[k][0] = a0 - min(half_w, (u1 - u0) / 2)
            elif ov_u > 0.5 and abs(b1 - v0) < 0.3:
                out[k][3] = b1 + min(half_l, (v1 - v0) / 2)
            elif ov_u > 0.5 and abs(b0 - v1) < 0.3:
                out[k][2] = b0 - min(half_l, (v1 - v0) / 2)
            else:
                continue
            break
    return out


def compact_water(e):
    t = e.get("tags", {})
    if e["type"] == "way" and "waterway" not in t or t.get("waterway") == "riverbank":
        g = e.get("g") or []
        if len(g) < 4 or poly_area(local(g)) < 600:
            return None
    return e


def fetch_layer(key, bbox):
    # the big layers in pieces, so no single Overpass answer gets huge
    seen, els = set(), []
    for b in tiles(bbox, 6 if key == "bld" else 2 if key in ("roads", "water") else 1):
        print(f"  fetching {key} {b}", flush=True)
        for e in overpass(queries(b)[key])["elements"]:
            k = (e["type"], e["id"])
            if k not in seen:
                seen.add(k)
                els.append(e)
    out = [slim(e) for e in els]
    if key == "bld":
        out = [b for b in map(compact_building, out) if b]
    if key == "water":
        out = [w for w in map(compact_water, out) if w]
    print(f"  {key}: {len(els)} elements", flush=True)
    return out


def extend():
    """Grow the cache to BBOX by fetching only the strips it lacks."""
    with gzip.open(DST, "rt", encoding="utf-8") as f:
        raw = json.load(f)
    s0, w0, n0, e0 = raw["bbox"]
    s, w, n, e = BBOX
    strips = [b for b in ((n0, w, n, e), (s, w, n0, w0), (s, e0, n0, e), (s, w, s0, e)) if b[0] < b[2] and b[1] < b[3]]
    for key in ("roads", "rail", "water", "places", "bld"):
        have = {(el["type"], el["id"]) for el in raw[key]} if key != "bld" else {(round(b[0], 4), round(b[1], 4)) for b in raw[key]}
        for b in strips:
            print(f"  fetching {key} {b}", flush=True)
            els = [slim(el) for el in overpass(queries(b)[key])["elements"]]
            if key == "bld":
                els = [x for x in map(compact_building, els) if x]
                new = [x for x in els if (round(x[0], 4), round(x[1], 4)) not in have]
                have.update((round(x[0], 4), round(x[1], 4)) for x in new)
            else:
                if key == "water":
                    els = [x for x in map(compact_water, els) if x]
                new = [x for x in els if (x["type"], x["id"]) not in have]
                have.update((x["type"], x["id"]) for x in new)
            raw[key] += new
            print(f"  {key}: +{len(new)}", flush=True)
    raw["bbox"] = list(BBOX)
    with gzip.open(DST, "wt", compresslevel=9, encoding="utf-8") as f:
        json.dump(raw, f, separators=(",", ":"))
    print(f"{DST}: {os.path.getsize(DST) / 1e6:.1f} MB")


def main():
    if "--extend" in sys.argv:
        extend()
        return
    if "--recompact" in sys.argv:
        with gzip.open(DST, "rt", encoding="utf-8") as f:
            raw = json.load(f)
        rnd = lambda v: round(v, R)
        def rr(e):
            if "g" in e:
                e["g"] = [[rnd(a), rnd(b)] for a, b in e["g"]]
            for m in e.get("members", []):
                m["g"] = [[rnd(a), rnd(b)] for a, b in m["g"]]
            return e
        for k in ("roads", "rail", "water", "places"):
            raw[k] = [rr(e) for e in raw[k]]
        raw["water"] = [w for w in map(compact_water, raw["water"]) if w]
        if raw["bld"] and isinstance(raw["bld"][0], dict):
            raw["bld"] = [b for b in map(compact_building, raw["bld"]) if b]
        with gzip.open(DST, "wt", compresslevel=9, encoding="utf-8") as f:
            json.dump(raw, f, separators=(",", ":"))
        print(f"{DST}: {os.path.getsize(DST) / 1e6:.1f} MB, {len(raw['bld'])} buildings")
        return
    if "--layers" in sys.argv:
        with gzip.open(DST, "rt", encoding="utf-8") as f:
            raw = json.load(f)
        for key in sys.argv[sys.argv.index("--layers") + 1].split(","):
            raw[key] = fetch_layer(key, tuple(raw["bbox"]))
        with gzip.open(DST, "wt", compresslevel=9, encoding="utf-8") as f:
            json.dump(raw, f, separators=(",", ":"))
        print(f"{DST}: {os.path.getsize(DST) / 1e6:.1f} MB")
        return
    if "--refresh" not in sys.argv and os.path.exists(DST):
        with gzip.open(DST, "rt", encoding="utf-8") as f:
            if tuple(json.load(f).get("bbox", ())) == BBOX:
                print(f"{DST}: cached")
                return
    raw = {"bbox": list(BBOX)}
    for key in LAYERS:
        raw[key] = fetch_layer(key, BBOX)
    with gzip.open(DST, "wt", compresslevel=9, encoding="utf-8") as f:
        json.dump(raw, f, separators=(",", ":"))
    print(f"{DST}: {os.path.getsize(DST) / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
