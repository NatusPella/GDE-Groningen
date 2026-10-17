#!/usr/bin/env python3
"""One-off: move the built map data from the legacy frame to RD New.

    python3 scripts/world/rebase_data.py            # citymap.json, mapextras.json, ringroute.js
    python3 scripts/world/rebase_data.py --check    # only report which files are in which frame

Equivalent to rebuilding them with scripts/world/rdnew.py's projection
(legacy x/y -> lat/lon is exact, then WGS84 -> RD), which a fresh
build_map.py now does; this script exists because the committed data was not
exactly reproducible from the caches (hand edits, older tool runs). Files that
already say `frame: "rd-new"` are left alone.

- every position: legacy_to_world, rounded to the centimetre;
- headings stored with a position (helipad, level crossings, padel courts):
  turned with the projection at that point;
- arc lengths along the train routes (stops): recomputed on the new polylines at the same place;
- vertex-matched extras (bus roads and lanes, road heights, passages) take
  the exact converted road vertex, so the decimetre matching in mapdata.js
  still finds them;
- footprint-bounds patches get the bounds of their footprint after the move.
"""
import json
import math
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rdnew as R  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GAME = os.path.join(ROOT, "game")


def cm(v):
    return round(v + 0.0, 2)


def pt(x, y):
    a, b = R.legacy_to_world(x, y)
    return [cm(a), cm(b)]


def ang(x, y, a, nd=4):
    return round(R.legacy_angle_to_world(x, y, a), nd)


def envelope(x0, y0, x1, y1, grow=0):
    c = [pt(x, y) for x in (x0, x1) for y in (y0, y1)]
    return [math.floor(min(p[0] for p in c)) - grow, math.floor(min(p[1] for p in c)) - grow,
            math.ceil(max(p[0] for p in c)) + grow, math.ceil(max(p[1] for p in c)) + grow]


def cumlen(pts):
    out = [0.0]
    for i in range(1, len(pts)):
        out.append(out[-1] + math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
    return out


def remap_s(old, new, s):
    """The arc length on `new` at the place arc length s had on `old` (same vertices)."""
    co, cn = cumlen(old), cumlen(new)
    if s <= 0:
        return s * (cn[-1] / co[-1] if co[-1] else 1)
    for i in range(1, len(old)):
        if co[i] >= s:
            seg = co[i] - co[i - 1]
            t = (s - co[i - 1]) / seg if seg else 0
            return cn[i - 1] + t * (cn[i] - cn[i - 1])
    return cn[-1] + (s - co[-1])


def ex_key(p):
    return (round(p[0] * 10), round(p[1] * 10))


# ------------------------------------------------------------------ citymap

def add_seed(b):
    """`sd`: the legacy bounds centre, which the building looks were seeded
    with (models3d_buildings.js, marktgebouwen.js); keeps every facade as it was."""
    if len(b["pts"]) < 3 or "sd" in b:
        return
    xs = [q[0] for q in b["pts"]]
    ys = [q[1] for q in b["pts"]]
    b["sd"] = [(min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2]


def rebase_citymap(d):
    vertex = {}

    def P(q):
        n = pt(q[0], q[1])
        vertex.setdefault(ex_key(q), n)
        return n

    def xy(o):
        o["x"], o["y"] = pt(o["x"], o["y"])

    meta = d["meta"]
    old_routes = {r["name"]: [list(p) for p in r["pts"]] for r in d.get("railRoutes", [])}
    for r in d["roads"]:
        r["pts"] = [P(q) for q in r["pts"]]
    for b in d.get("buildings", []):
        add_seed(b)
    for key in ("buildings", "water", "green", "rails"):
        for o in d.get(key, []):
            o["pts"] = [P(q) for q in o["pts"]]
    for o in d.get("buildings", []):
        for part in o.get("parts", []):
            part["pts"] = [P(q) for q in part["pts"]]
        if o.get("pitch"):
            o["pitch"] = [P(q) for q in o["pitch"]]
    d["trees"] = [pt(*t[:2]) + list(t[2:]) for t in d.get("trees", [])]
    for o in d.get("stations", []) + d.get("railLifts", []):
        xy(o)
    for lc in d.get("levelCrossings", []):
        lc["railAngle"] = ang(lc["x"], lc["y"], lc["railAngle"])
        xy(lc)
        for r in lc.get("roads", []):
            r["angle"] = ang(r["x"], r["y"], r["angle"])
            xy(r)
    for r in d.get("railRoutes", []):
        old = old_routes[r["name"]]
        r["pts"] = [P(q) for q in r["pts"]]
        for s in r.get("stops", []):
            s["s"] = round(remap_s(old, r["pts"], s["s"]), 1)

    for k, v in list(meta.items()):
        if k in ("origin", "bounds", "mPerDegLat", "mPerDegLon"):
            continue
        if k == "districts":
            for dd in v:
                dd["rings"] = [[pt(*q) for q in ring] for ring in dd["rings"]]
        elif k == "helipad":
            v["angle"] = ang(v["x"], v["y"], v["angle"], 3)
            xy(v)
        elif k == "pois":
            for lst in v.values():
                for o in lst:
                    xy(o)
        elif isinstance(v, list):
            for o in v:
                if isinstance(o, dict) and "x" in o and "y" in o:
                    xy(o)
        elif isinstance(v, dict) and "x" in v and "y" in v:
            xy(v)
    b = meta.pop("bounds")
    meta.pop("origin", None)
    meta.pop("mPerDegLat", None)
    meta.pop("mPerDegLon", None)
    meta["bounds"] = envelope(*b)
    meta.update(R.frame_meta())
    meta["wgsBox"] = list(R.legacy_wgs_box(b))
    return old_routes, vertex


# ------------------------------------------------------------------ mapextras

def rebase_extras(ex, legacy_city, vertex):
    def V(q):
        return list(vertex.get(ex_key(q)) or pt(q[0], q[1]))

    for key in ("busRoads", "busLanes", "passages"):
        for o in ex.get(key, []):
            o["pts"] = [V(q) for q in o["pts"]]
    for o in ex.get("roadZ", []):
        o["at"] = V(o["at"])
    old_extra_buildings = [b["pts"] for b in ex.get("buildings", [])]
    for b in ex.get("buildings", []):
        add_seed(b)
        b["pts"] = [pt(*q) for q in b["pts"]]
    # bounds patches: find the footprint they meant (legacy bounds within 0.6 m,
    # not a landmark, as mapdata.js applyMapExtras does) and take its new bounds
    foot = [b for b in legacy_city["buildings"]] + [{"pts": p} for p in old_extra_buildings]
    lb = []
    for b in foot:
        xs = [q[0] for q in b["pts"]]
        ys = [q[1] for q in b["pts"]]
        lb.append((min(xs), min(ys), max(xs), max(ys)))
    for p in ex.get("buildingPatches", []):
        if "bounds" in p:
            p0, p1, p2, p3 = p["bounds"]
            hits = [i for i, b in enumerate(lb)
                    if not foot[i].get("landmark") and len(foot[i]["pts"]) >= 3
                    and abs(b[0] - p0) < 0.6 and abs(b[1] - p1) < 0.6 and abs(b[2] - p2) < 0.6 and abs(b[3] - p3) < 0.6]
            if hits:
                n = [pt(*q) for q in foot[hits[0]]["pts"]]
                p["bounds"] = [round(min(q[0] for q in n), 1), round(min(q[1] for q in n), 1),
                               round(max(q[0] for q in n), 1), round(max(q[1] for q in n), 1)]
            else:
                print(f"  bounds patch {p['bounds']}: no footprint (kept, converted corner-wise)")
                a, c = pt(p0, p1), pt(p2, p3)
                p["bounds"] = [a[0], a[1], c[0], c[1]]
        if "at" in p:
            p["at"] = pt(*p["at"])
    for o in ex.get("fuel", []):
        o["x"], o["y"] = pt(o["x"], o["y"])
    for o in ex.get("padel", []):
        for c in o.get("courts", []):
            c["rot"] = ang(c["x"], c["y"], c["rot"], 3)
            c["x"], c["y"] = pt(c["x"], c["y"])
        o["x"], o["y"] = pt(o["x"], o["y"])
    ex["frame"] = R.FRAME


# ------------------------------------------------------------------ ringroute.js

def rebase_ringroute(src, vertex):
    start = src.index("export const RING_ROUTE = [")
    end = src.index("];", start)
    pts = []

    def sub(m):
        q = (float(m.group(1)), float(m.group(2)))
        a, b = vertex.get(ex_key(q)) or pt(*q)
        pts.append((a, b))
        return f"[{a:g},{b:g}"
    block = re.sub(r"\[(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)", sub, src[start + len("export const RING_ROUTE = ["):end])
    out = src[:start].replace("do not edit.", "do not edit.\n// frame: rd-new") + "export const RING_ROUTE = [" + block + src[end:]
    length = sum(math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) for i in range(1, len(pts)))
    length += math.hypot(pts[0][0] - pts[-1][0], pts[0][1] - pts[-1][1])
    return re.sub(r"RING_LENGTH = \d+", f"RING_LENGTH = {round(length)}", out)


def main():
    global GAME
    check = "--check" in sys.argv
    if "--game" in sys.argv:
        GAME = os.path.abspath(sys.argv[sys.argv.index("--game") + 1])
    cpath, epath = os.path.join(GAME, "citymap.json"), os.path.join(GAME, "mapextras.json")
    rpath = os.path.join(GAME, "js", "ringroute.js")
    with open(cpath) as f:
        city = json.load(f)
    with open(epath) as f:
        ex = json.load(f)
    with open(rpath) as f:
        ring = f.read()
    frames = {"citymap.json": city["meta"].get("frame", "legacy"), "mapextras.json": ex.get("frame", "legacy"),
              "ringroute.js": "rd-new" if "frame: rd-new" in ring else "legacy"}
    print(frames)
    if check or all(v == R.FRAME for v in frames.values()):
        return
    assert all(v == "legacy" for v in frames.values()), "mixed frames: fix by hand"
    legacy_city = json.loads(json.dumps(city))
    old_routes, vertex = rebase_citymap(city)
    new_routes = {r["name"]: r["pts"] for r in city.get("railRoutes", [])}
    rebase_extras(ex, legacy_city, vertex)
    ring2 = rebase_ringroute(ring, vertex)

    with open(cpath, "w") as f:
        json.dump(city, f, separators=(",", ":"))
    with open(epath, "w") as f:
        json.dump(ex, f, separators=(",", ":"))
    with open(rpath, "w") as f:
        f.write(ring2)
    for p in (cpath, epath, rpath):
        print(f"{os.path.relpath(p, ROOT)}: {os.path.getsize(p) / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
