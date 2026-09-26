#!/usr/bin/env python3
"""Build game/mapextras.json: map data that lives next to citymap.json
instead of inside it (mapdata.js merges it at load time).

- bus: real bus infrastructure from OSM. highway=busway ways become extra
  roads (bus/taxi/emergency only); psv/bus lane tags on ordinary roads become
  bus lanes along that road ({pts, side}), matched to the game roads by
  geometry at load time.
- buildings: footprints the city-core cache misses (building relations,
  newer ways) around the Grote Markt and the UMCG, plus per-building patches
  (heights, names, landmark models) for a few places.
- fuel: gas stations (amenity=fuel), which double as garages in the game.

Overpass responses are cached in data/extras_*_raw.json; pass --refresh to
fetch them again. Re-runnable: the same caches always give the same output.
"""
import json
import math
import os
import subprocess
import sys
import time

OUT = "game/mapextras.json"
MAP = "game/citymap.json"
BBOX = (53.1975, 6.5225, 53.2525, 6.626)
LAT0 = (53.204 + 53.235) / 2
LON0 = (6.538 + 6.592) / 2
M_PER_DEG_LAT = 110574.0
M_PER_DEG_LON = 111320.0 * math.cos(math.radians(LAT0))
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

# (south, west, north, east) boxes where the building layer is completed
BUILDING_AREAS = {
    "grotemarkt": (53.2168, 6.5610, 53.2212, 6.5725),
    "umcg": (53.2190, 6.5700, 53.2255, 6.5820),
}


def project(lat, lon):
    return [round((lon - LON0) * M_PER_DEG_LON, 1), round((LAT0 - lat) * M_PER_DEG_LAT, 1)]


def fetch(query, cache, refresh):
    if os.path.exists(cache) and not refresh:
        with open(cache) as f:
            return json.load(f)
    for attempt in range(6):
        for url in OVERPASS_URLS:
            r = subprocess.run(["curl", "-s", "-m", "180", "-A", "gte-vi-mapbuilder/1.0", "--data-urlencode", f"data={query}", url],
                               capture_output=True, text=True)
            if r.stdout.lstrip().startswith("{"):
                data = json.loads(r.stdout)
                with open(cache, "w") as f:
                    json.dump(data, f)
                return data
        time.sleep(20 * (attempt + 1))
    sys.exit("Overpass: no server answered with JSON, try again later")


def bus_query():
    b = "(%s,%s,%s,%s)" % BBOX
    keys = ["lanes:psv", "psv:lanes", "psv:lanes:forward", "psv:lanes:backward", "bus:lanes", "bus:lanes:forward",
            "bus:lanes:backward", "lanes:bus", "lanes:psv:forward", "lanes:psv:backward", "busway", "busway:right",
            "busway:left", "busway:both"]
    parts = [f'way["highway"="busway"]{b};']
    parts += [f'way["highway"]["{k}"]{b};' for k in keys]
    parts += [
        f'way["highway"]["access"="no"]["bus"~"yes|designated"]{b};',
        f'way["highway"]["access"="no"]["psv"~"yes|designated"]{b};',
        f'way["highway"]["motor_vehicle"="no"]["bus"~"yes|designated"]{b};',
        f'way["highway"]["motor_vehicle"="no"]["psv"~"yes|designated"]{b};',
    ]
    return "[out:json][timeout:150];(" + "".join(parts) + ");out geom tags;"


def building_query(box):
    b = "(%s,%s,%s,%s)" % box
    return f'[out:json][timeout:150];(way["building"]{b};relation["building"]{b};way["building:part"]{b};);out geom;'


def fuel_query():
    b = "(%s,%s,%s,%s)" % BBOX
    return f'[out:json][timeout:120];nwr["amenity"="fuel"]{b};out center tags;'


# --- bus -------------------------------------------------------------------------

def _designated(v):
    return "designated" in (v or "")


def _count(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return 0


def bus_only(tags):
    if tags.get("highway") == "busway":
        return True
    closed = tags.get("access") == "no" or tags.get("motor_vehicle") == "no"
    return closed and (tags.get("psv") in ("yes", "designated") or tags.get("bus") in ("yes", "designated"))


def lane_sides(tags):
    oneway = tags.get("oneway") in ("yes", "1", "true")
    fwd = _designated(tags.get("psv:lanes:forward")) or _designated(tags.get("bus:lanes:forward")) \
        or _count(tags.get("lanes:psv:forward")) > 0 or _count(tags.get("lanes:bus:forward")) > 0
    bwd = _designated(tags.get("psv:lanes:backward")) or _designated(tags.get("bus:lanes:backward")) \
        or _count(tags.get("lanes:psv:backward")) > 0 or _count(tags.get("lanes:bus:backward")) > 0
    if oneway and (_designated(tags.get("psv:lanes")) or _designated(tags.get("bus:lanes"))
                   or _count(tags.get("lanes:psv")) > 0 or _count(tags.get("lanes:bus")) > 0):
        fwd = True
    if tags.get("busway") == "lane" or tags.get("busway:both") == "lane":
        fwd = True
        bwd = not oneway
    if tags.get("busway:right") == "lane":
        fwd = True
    if tags.get("busway:left") == "lane" and not oneway:
        bwd = True
    return fwd, bwd


def build_bus(raw):
    roads, lanes = [], []
    for el in raw["elements"]:
        if el.get("type") != "way" or "geometry" not in el:
            continue
        tags = el.get("tags", {})
        if tags.get("tunnel") in ("yes", "building_passage") or tags.get("area") == "yes":
            continue
        pts = [project(g["lat"], g["lon"]) for g in el["geometry"]]
        if len(pts) < 2:
            continue
        oneway = tags.get("oneway") in ("yes", "1", "true")
        if bus_only(tags):
            n = _count(tags.get("lanes")) or (1 if oneway else 2)
            roads.append({"pts": pts, "name": tags.get("name"), "oneway": oneway, "width": round(max(3.5, n * 3.2), 1),
                          "bridge": tags.get("bridge") == "yes", "osmType": tags.get("highway")})
            continue
        fwd, bwd = lane_sides(tags)
        contra = oneway and tags.get("oneway:psv") == "no" or tags.get("oneway:bus") == "no"
        if fwd or bwd or contra:
            lanes.append({"pts": pts, "fwd": fwd, "bwd": bwd, "contra": bool(contra)})
    return roads, lanes


# --- buildings ----------------------------------------------------------------------

def area(p):
    a = 0.0
    for i in range(len(p)):
        x0, y0 = p[i - 1]
        x1, y1 = p[i]
        a += x0 * y1 - x1 * y0
    return a / 2


def centroid(p):
    a = area(p)
    if abs(a) < 1e-6:
        return [sum(q[0] for q in p) / len(p), sum(q[1] for q in p) / len(p)]
    cx = cy = 0.0
    for i in range(len(p)):
        x0, y0 = p[i - 1]
        x1, y1 = p[i]
        c = x0 * y1 - x1 * y0
        cx += (x0 + x1) * c
        cy += (y0 + y1) * c
    return [cx / (6 * a), cy / (6 * a)]


def inside(x, y, p):
    c = False
    j = len(p) - 1
    for i in range(len(p)):
        if (p[i][1] > y) != (p[j][1] > y) and x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]:
            c = not c
        j = i
    return c


def levels_of(tags):
    for k in ("building:levels",):
        try:
            return max(1, int(float(tags[k])))
        except (KeyError, ValueError):
            pass
    try:
        return max(1, round(float(str(tags["height"]).split()[0].replace(",", ".")) / 3.1))
    except (KeyError, ValueError):
        pass
    return 2 if tags.get("building") in ("house", "detached") else 3


def join_rings(ways):
    rings, open_ = [], [w[:] for w in ways if len(w) >= 2]
    while open_:
        cur = open_.pop()
        changed = True
        while cur[0] != cur[-1] and changed:
            changed = False
            for i, w in enumerate(open_):
                if w[0] == cur[-1]:
                    cur += w[1:]
                elif w[-1] == cur[-1]:
                    cur += w[::-1][1:]
                elif w[-1] == cur[0]:
                    cur = w[:-1] + cur
                elif w[0] == cur[0]:
                    cur = w[::-1][:-1] + cur
                else:
                    continue
                open_.pop(i)
                changed = True
                break
        if cur[0] == cur[-1] and len(cur) >= 4:
            rings.append(cur)
    return rings


def footprints(raw):
    out = []
    for el in raw["elements"]:
        tags = el.get("tags", {})
        if "building" not in tags and "building:part" not in tags:
            continue
        if tags.get("building") in ("roof", "no") or tags.get("layer", "0").startswith("-"):
            continue
        if el["type"] == "way" and "geometry" in el:
            rings = [[project(g["lat"], g["lon"]) for g in el["geometry"]]]
        elif el["type"] == "relation":
            outers = [[project(g["lat"], g["lon"]) for g in m["geometry"]] for m in el.get("members", [])
                      if m.get("role") == "outer" and m.get("geometry")]
            rings = join_rings(outers)
        else:
            continue
        inners = []
        if el["type"] == "relation":
            inners = join_rings([[project(g["lat"], g["lon"]) for g in m["geometry"]] for m in el.get("members", [])
                                 if m.get("role") == "inner" and m.get("geometry")])
        explicit = "building:levels" in tags or "height" in tags
        for ring in rings:
            if len(ring) < 4 or ring[0] != ring[-1] or abs(area(ring)) < 12:
                continue
            out.append({"pts": ring, "inners": inners, "h": levels_of(tags), "name": tags.get("name"), "explicit": explicit,
                        "type": tags.get("building") or tags.get("building:part") or "yes",
                        "part": "building:part" in tags, "rel": el["type"] == "relation"})
    return out


def keyhole(outer, inners, gap=0.3):
    """Polygon with holes -> one simple ring: every courtyard is joined to the
    outline through a slit `gap` metres wide (the game has no holes)."""
    ring = [q[:] for q in outer[:-1]]
    if area(ring) < 0:
        ring.reverse()
    for hole in sorted(inners, key=lambda h: -abs(area(h))):
        h = [q[:] for q in hole[:-1]]
        if len(h) < 3:
            continue
        if area(h) > 0:
            h.reverse()
        bi, bj, bd = 0, 0, float("inf")
        for i, a in enumerate(ring):
            for j, b in enumerate(h):
                d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2
                if d < bd:
                    bi, bj, bd = i, j, d
        a, b = ring[bi], h[bj]
        L = math.sqrt(bd) or 1
        nx, ny = -(b[1] - a[1]) / L * gap / 2, (b[0] - a[0]) / L * gap / 2
        loop = h[bj:] + h[:bj]
        ring = ring[:bi] + [[a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny]] + loop[1:] + \
            [[loop[0][0] + nx, loop[0][1] + ny], [a[0] + nx, a[1] + ny]] + ring[bi + 1:]
    ring = [[round(x, 2), round(y, 2)] for x, y in ring]
    return ring + [ring[0]]


def missing_buildings(existing, cands):
    grid = {}
    for b in existing:
        xs = [p[0] for p in b["pts"]]
        ys = [p[1] for p in b["pts"]]
        b["_bb"] = (min(xs), min(ys), max(xs), max(ys))
        for gx in range(int(min(xs) // 50), int(max(xs) // 50) + 1):
            for gy in range(int(min(ys) // 50), int(max(ys) // 50) + 1):
                grid.setdefault((gx, gy), []).append(b)

    def covered(x, y):
        for b in grid.get((int(x // 50), int(y // 50)), []):
            x0, y0, x1, y1 = b["_bb"]
            if x0 <= x <= x1 and y0 <= y <= y1 and inside(x, y, b["pts"]):
                return True
        return False

    added, patches, removed = [], {}, []
    for c in cands:
        p = c["pts"]
        # heights: every existing footprint whose centre lies in a tagged
        # building (or part) that is taller than the cached one
        if c["explicit"]:
            xs = [q[0] for q in p]
            ys = [q[1] for q in p]
            seen = set()
            for gx in range(int(min(xs) // 50), int(max(xs) // 50) + 1):
                for gy in range(int(min(ys) // 50), int(max(ys) // 50) + 1):
                    for b in grid.get((gx, gy), []):
                        if id(b) in seen or b.get("landmark"):
                            continue
                        seen.add(id(b))
                        bx, by = centroid(b["pts"])
                        if not inside(bx, by, p) or any(inside(bx, by, r) for r in c["inners"]):
                            continue
                        if b["h"] < c["h"]:
                            k = (round(bx, 1), round(by, 1))
                            patches[k] = max(patches.get(k, 0), c["h"])
        if c["part"]:
            continue
        cx, cy = centroid(p)
        samples = [(cx, cy)] + [((q[0] * 3 + cx) / 4, (q[1] * 3 + cy) / 4) for q in p[:-1]]
        hits = sum(1 for x, y in samples if covered(x, y))
        if hits > max(1, len(samples) * 0.1):
            continue
        if any(inside(cx, cy, a["pts"]) or any(inside(q[0], q[1], a["pts"]) for q in p[:-1]) for a in added):
            continue
        h = c["h"]
        big = abs(area(p))
        if big > 20000:
            h = min(h, 10)
        elif big > 8000:
            h = min(h, 12)
        pts = keyhole(p, c["inners"]) if c["inners"] else [[round(x, 1), round(y, 1)] for x, y in p[:-1]] + [[round(p[0][0], 1), round(p[0][1], 1)]]
        added.append({"pts": pts, "h": h, "name": c["name"], "type": c["type"]})
        # the few cached footprints inside a big added complex go: they would
        # stand inside its walls
        for b in existing:
            if b.get("landmark"):
                continue
            bx, by = centroid(b["pts"])
            x0, y0, x1, y1 = b["_bb"]
            if x1 < min(q[0] for q in p) or x0 > max(q[0] for q in p) or y1 < min(q[1] for q in p) or y0 > max(q[1] for q in p):
                continue
            if inside(bx, by, p) and not any(inside(bx, by, r) for r in c["inners"]):
                removed.append([round(bx, 1), round(by, 1)])
    out = [{"at": list(k), "set": {"h": h}} for k, h in patches.items()]
    out += [{"at": r, "set": {"remove": True}} for r in removed]
    return added, out


# Named buildings that deserve more than the OSM default height, and the
# EIKEA box (the real IKEA at the Sontweg, as a parody).
PATCHES = [
    {"at": [1573.0, 275.0], "set": {"name": "EIKEA", "landmark": "EIKEA", "landmarkKind": "store", "h": 5, "type": "retail"}},
    {"at": [128.0, 110.0], "set": {"name": "Stadhuis", "h": 6, "type": "civic"}},
]

GROTE_MARKT = (130.0, 80.0)
CORE_R = 250.0


def core_heights(existing, taken):
    """Around the Grote Markt the cached footprints mostly carry the default
    three levels; the real blocks there are four to five storeys."""
    out = []
    for b in existing:
        if b["h"] != 3 or b.get("landmark") or b.get("name"):
            continue
        cx, cy = centroid(b["pts"])
        if math.hypot(cx - GROTE_MARKT[0], cy - GROTE_MARKT[1]) > CORE_R:
            continue
        a = abs(area(b["pts"]))
        if a < 250:
            continue
        k = (round(cx, 1), round(cy, 1))
        if k in taken:
            continue
        jitter = int(abs(cx * 7.3 + cy * 3.1)) % 3
        out.append({"at": list(k), "set": {"h": 5 if a > 900 or jitter == 0 else 4}})
    return out


def build_fuel(raw):
    out = []
    for el in raw["elements"]:
        tags = el.get("tags", {})
        lat = el.get("lat") or (el.get("center") or {}).get("lat")
        lon = el.get("lon") or (el.get("center") or {}).get("lon")
        if lat is None:
            continue
        x, y = project(lat, lon)
        out.append({"x": x, "y": y, "name": tags.get("name") or tags.get("brand") or ""})
    return out


if __name__ == "__main__":
    refresh = "--refresh" in sys.argv
    bus = fetch(bus_query(), "data/extras_bus_raw.json", refresh)
    blds = {k: fetch(building_query(v), f"data/extras_buildings_{k}_raw.json", refresh) for k, v in BUILDING_AREAS.items()}
    fuel = fetch(fuel_query(), "data/extras_fuel_raw.json", refresh)
    with open(MAP) as f:
        citymap = json.load(f)
    x0, y0, x1, y1 = citymap["meta"]["bounds"]

    bus_roads, bus_lanes = build_bus(bus)
    inb = lambda p: all(x0 <= q[0] <= x1 and y0 <= q[1] <= y1 for q in p)
    bus_roads = [r for r in bus_roads if inb(r["pts"])]
    bus_lanes = [r for r in bus_lanes if inb(r["pts"])]

    cands = []
    for raw in blds.values():
        cands += footprints(raw)
    added, height_patches = missing_buildings(citymap["buildings"], cands)

    fuel_pts = [f for f in build_fuel(fuel) if x0 <= f["x"] <= x1 and y0 <= f["y"] <= y1]
    taken = {tuple(pch["at"]) for pch in height_patches}
    core = core_heights(citymap["buildings"], taken)
    out = {"busRoads": bus_roads, "busLanes": bus_lanes, "buildings": added, "buildingPatches": PATCHES + height_patches + core, "fuel": fuel_pts}
    with open(OUT, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"busRoads={len(bus_roads)} busLanes={len(bus_lanes)} buildings+={len(added)} heights={len(height_patches)} fuel={len(fuel_pts)}")
    for b in added:
        if b["name"] or b["h"] >= 4:
            print("  +", b["name"], b["type"], b["h"], b["pts"][0])
