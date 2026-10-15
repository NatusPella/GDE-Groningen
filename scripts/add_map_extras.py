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
- padel: padel courts (sport=padel pitches, sports centres with padel in
  their name) grouped per site for the padel minigame (padel.js); the club
  names stay out of the game, sites are called after their wijk. When OSM
  has too few inside the map, FALLBACK_PADEL adds unverified guesses.
- passages: ways mapped as running through or under a building
  (tunnel=building_passage/covered/yes, covered=yes/arcade) from the city
  caches; passages.js opens footprints only along a mapped passage or a
  short footway/cycleway run, and models3d_buildings.js cuts the opening.
- structures: underground garages and bridge piers still in citymap.json
  (process_osm.py hidden_structure) are removed, covered walkways (raised
  buildings over a path) become canopies (bounds-matched building patches).

Overpass responses are cached in data/extras_*_raw.json; pass --refresh to
fetch them again. Re-runnable: the same caches always give the same output.
"""
import json
import math
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from osmfetch import cached, map_bbox, bbox_str  # noqa: E402
from world.rdnew import P, project as rd_project, FRAME  # noqa: E402

OUT = "game/mapextras.json"
MAP = "game/citymap.json"
BBOX = (53.1975, 6.5225, 53.2525, 6.626)
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
    return list(rd_project(lat, lon, 1))


def fetch(query, cache, refresh):
    if os.path.exists(cache) and not refresh:
        with open(cache) as f:
            return json.load(f)
    for attempt in range(6):
        for url in OVERPASS_URLS:
            r = subprocess.run(["curl", "-s", "-m", "180", "-A", "gde-groningen-mapbuilder/1.0", "--data-urlencode", f"data={query}", url],
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


SNAP_M = 15.0
_K = lambda p: (round(p[0] * 10), round(p[1] * 10))


def connect_bus_roads(roads, car_roads):
    """The game joins roads only at shared vertices, and the city cache is
    clipped and simplified differently from the bus query: a busway end that
    stops short of (or runs past) the street it joins is moved onto that
    street's nearest vertex, and busways that reach no street at all (cut off
    at the map edge, or beyond the cropped city) are dropped - a bus spawned
    there could only drive back and forth."""
    car_pts = [p for r in car_roads for p in r["pts"]]
    car_keys = {_K(p) for p in car_pts}
    bus_keys = {}
    for i, r in enumerate(roads):
        for p in r["pts"]:
            bus_keys.setdefault(_K(p), set()).add(i)
    snapped = 0
    for i, r in enumerate(roads):
        for end in (0, -1):
            pts = r["pts"] if end == 0 else r["pts"][::-1]
            k = _K(pts[0])
            if k in car_keys or bus_keys.get(k, set()) - {i}:
                continue
            q = min(car_pts, key=lambda c: (c[0] - pts[0][0]) ** 2 + (c[1] - pts[0][1]) ** 2)
            if math.hypot(q[0] - pts[0][0], q[1] - pts[0][1]) > SNAP_M:
                continue
            # start the busway where the street vertex projects onto it
            best = None
            for j in range(len(pts) - 1):
                a, b = pts[j], pts[j + 1]
                dx, dy = b[0] - a[0], b[1] - a[1]
                L2 = dx * dx + dy * dy or 1e-9
                t = max(0.0, min(1.0, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2))
                dd = math.hypot(a[0] + dx * t - q[0], a[1] + dy * t - q[1])
                if best is None or dd < best[0]:
                    best = (dd, j, t)
            _, j, t = best
            rest = pts[j + 1:] if t < 0.999 else pts[j + 2:]
            new = [list(q)] + [p for p in rest if _K(p) != _K(q)]
            if len(new) < 2:
                continue
            r["pts"] = new if end == 0 else new[::-1]
            snapped += 1
    parent = list(range(len(roads)))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    by_key = {}
    for i, r in enumerate(roads):
        for p in r["pts"]:
            by_key.setdefault(_K(p), []).append(i)
    for ids in by_key.values():
        for j in ids[1:]:
            parent[find(j)] = find(ids[0])
    linked = {find(i) for i, r in enumerate(roads) if any(_K(p) in car_keys for p in r["pts"])}
    kept = [r for i, r in enumerate(roads) if find(i) in linked]
    return kept, snapped, len(roads) - len(kept)


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
        # out along the left bank of the slit, back along the right one: the
        # slit stays outside the (counter-clockwise) ring and never crosses itself
        ring = ring[:bi] + [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny]] + loop[1:] + \
            [[loop[0][0] - nx, loop[0][1] - ny], [a[0] - nx, a[1] - ny]] + ring[bi + 1:]
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
    {"at": P(1573.0, 275.0), "set": {"name": "EIKEA", "landmark": "EIKEA", "landmarkKind": "store", "h": 5, "type": "retail"}},
    {"at": P(128.0, 110.0), "set": {"name": "Stadhuis", "h": 6, "type": "civic"}},
    # Grote Markt facades and heights (marktgebouwen.js, docs/markt-gebouwen.md)
    {"at": P(172.5, 155.0), "set": {"markt": "drieGezusters36"}},
    {"at": P(179.8, 151.0), "set": {"markt": "drieGezusters37"}},
    {"at": P(188.8, 147.7), "set": {"name": "De Drie Gezusters", "markt": "drieGezusters39"}},
    {"at": P(167.3, 160.2), "set": {"markt": "grandTheatre"}},
    {"at": P(252.0, 78.0), "set": {"name": "Westcord Market Hotel", "markt": "marketHotel", "h": 6}},
    {"at": P(262.0, 110.0), "set": {"name": "Merckt"}},
    {"at": P(236.0, 55.0), "set": {"name": "Mutua Fides", "h": 5}},
    {"at": P(27.0, 270.0), "set": {"name": "Van Gend & Loos"}},
    {"at": P(85.0, -8.0), "set": {"h": 6}},
    {"at": P(85.0, 90.0), "set": {"markt": "nataliniTower"}},
    # Prinsenhof and the DUO "Cruiseschip" (landmarks3d.js models) are taller than OSM says
    {"at": P(261.0, -151.0), "set": {"h": 4}},
    {"at": P(956.0, 1525.0), "set": {"h": 14}},
    # Winkelcentrum Paddepoel (paddepoel3d.js): the shop blocks are 6.6 m to the
    # parapet, the 2026 supermarket and gym block 10.8 m; OSM's 3 levels said 9.3
    {"landmark": "Winkelcentrum Paddepoel", "set": {"h": 2.13}},
    {"at": P(-1416.0, -1094.0), "set": {"h": 3.48}},
]
# Height fixes on ways with a height profile (add_elevation.py), applied by
# mapdata.js applyMapExtras to every profiled road through that vertex.
ROAD_Z = [
    # Expositielaan's ramp up to the Leonard Springerlaan crossing: its
    # sidewalk runs under the west wall of the hall at -772,1922, so the
    # ramp is down to 0.28 m by then (5% up to the crossing instead of 2%)
    {"at": P(-779.4, 1906.6), "z": 0.28},
]


def snap_road_z(fixes, roads):
    """Each height fix onto the profiled road vertex it means (mapdata.js
    matches to the decimetre; the hand-placed point is in the old frame)."""
    out = []
    for fx in fixes:
        best = min(((q[0] - fx["at"][0]) ** 2 + (q[1] - fx["at"][1]) ** 2, q) for r in roads if r.get("z") for q in r["pts"])
        if best[0] > 1.0:
            raise SystemExit(f"road height fix {fx['at']}: no profiled road vertex within 1 m")
        out.append({**fx, "at": list(best[1])})
    return out


def bounds_of(p):
    xs, ys = [q[0] for q in p], [q[1] for q in p]
    return [min(xs), min(ys), max(xs), max(ys)]


def way_inside(pts, roads, need=5.0):
    """Does a road run at least `need` metres inside the polygon?"""
    x0, y0, x1, y1 = bounds_of(pts)
    for r in roads:
        run = 0.0
        P = r["pts"]
        for (ax, ay), (bx, by) in zip(P, P[1:]):
            if max(ax, bx) < x0 or min(ax, bx) > x1 or max(ay, by) < y0 or min(ay, by) > y1:
                continue
            L = math.hypot(bx - ax, by - ay)
            n = max(1, int(L))
            for k in range(n):
                if inside(ax + (bx - ax) * k / n, ay + (by - ay) * k / n, pts):
                    run += L / n
            if run >= need:
                return True
    return False


def structure_patches(existing, roads):
    """Footprints in citymap.json that process_osm.py now leaves out
    (hidden_structure: underground garages, bridge piers), removed at load
    time until the map is rebuilt, and small raised buildings (layer >= 1)
    that a path runs along for 20 m (covered walkways), which become
    canopies. Matched on their bounds, since an underground garage usually
    lies under smaller buildings."""
    import process_osm
    have = {}
    for b in existing:
        have.setdefault(tuple(round(v) for v in bounds_of(b["pts"])), []).append(b)
    out, seen = [], set()
    for el in process_osm.load_elements():
        tags = el.get("tags", {})
        if el.get("type") != "way" or "building" not in tags or not el.get("geometry"):
            continue
        if any(g is None for g in el["geometry"]):
            continue
        hidden = process_osm.hidden_structure(tags)
        raised = not hidden and process_osm.int_tag(tags, "layer") > 0 and tags["building"] != "roof"
        if not hidden and not raised:
            continue
        pts = [process_osm.project(g["lat"], g["lon"]) for g in el["geometry"]]
        bb = bounds_of(pts)
        key = tuple(round(v) for v in bb)
        if key in seen or not any(not b.get("landmark") for b in have.get(key, [])):
            continue
        if raised and (abs(area(pts)) > 600 or not way_inside(pts, roads, 20.0)):
            continue
        seen.add(key)
        out.append({"bounds": [round(v, 1) for v in bb], "set": {"remove": True} if hidden else {"type": "roof"}})
    return out


GROTE_MARKT = tuple(P(130.0, 80.0))
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


PASSAGE_SOURCES = ["data/groningen_raw.json", "data/groningen_extra.json"]


def build_passages():
    seen, out = set(), []
    for src in PASSAGE_SOURCES:
        if not os.path.exists(src):
            continue
        with open(src) as f:
            raw = json.load(f)
        for el in raw.get("elements", []):
            tags = el.get("tags", {})
            if el.get("type") != "way" or "highway" not in tags or el["id"] in seen or not el.get("geometry"):
                continue
            kind = None
            if tags.get("tunnel") in ("building_passage", "covered", "yes"):
                kind = "covered" if tags["tunnel"] == "covered" else tags["tunnel"]
            elif tags.get("covered") in ("yes", "arcade"):
                kind = "arcade" if tags["covered"] == "arcade" else "covered"
            if not kind:
                continue
            seen.add(el["id"])
            out.append({"pts": [project(g["lat"], g["lon"]) for g in el["geometry"]], "kind": kind, "hw": tags.get("highway")})
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


# Unverified sports-park spots used only when OSM has fewer than 2 padel
# sites inside the map: (x, y, rotation, wijk).
FALLBACK_PADEL = [
    (*P(1480.0, 1760.0), 0.0, "Sportpark Corpus den Hoorn"),
    (*P(-1450.0, -1150.0), 0.0, "Sportpark Kardinge"),
]
PADEL_W, PADEL_L = 10.0, 20.0


def padel_query(bbox):
    b = bbox_str(bbox)
    return ("[out:json][timeout:120];("
            f'nwr["sport"~"padel"]{b};'
            f'nwr["leisure"~"sports_centre|sports_hall|pitch"]["name"~"[Pp]adel"]{b};'
            ");out tags geom;")


def _obb(pts):
    """Centre, long-axis angle (radians, game x/y) and size of a footprint."""
    best = None
    for i in range(len(pts) - 1):
        a = math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0])
        c, s = math.cos(a), math.sin(a)
        us = [p[0] * c + p[1] * s for p in pts]
        vs = [-p[0] * s + p[1] * c for p in pts]
        area_ = (max(us) - min(us)) * (max(vs) - min(vs))
        if best is None or area_ < best[0]:
            best = (area_, a, us, vs, c, s)
    _, a, us, vs, c, s = best
    cu, cv = (max(us) + min(us)) / 2, (max(vs) + min(vs)) / 2
    du, dv = max(us) - min(us), max(vs) - min(vs)
    if dv > du:
        a, du, dv = a + math.pi / 2, dv, du
    a = math.atan2(math.sin(a), math.cos(a))
    return cu * c - cv * s, cu * s + cv * c, a, du, dv


def build_padel(raw, meta):
    x0, y0, x1, y1 = meta["bounds"]
    pts_n = [p for p in meta.get("neighbourhoodPoints", []) if p.get("name")]

    def wijk(x, y):
        best = min(pts_n, key=lambda p: (p["x"] - x) ** 2 + (p["y"] - y) ** 2, default=None)
        return best["name"] if best else "Grunn"

    courts, centres = [], []
    for el in raw.get("elements", []):
        tags = el.get("tags", {})
        geom = el.get("geometry")
        if el["type"] == "way" and geom and len(geom) >= 4:
            pts = [project(g["lat"], g["lon"]) for g in geom]
            cx, cy, a, l, w = _obb(pts)
        elif el["type"] == "node":
            cx, cy = project(el["lat"], el["lon"])
            a, l, w = 0.0, 0.0, 0.0
        elif el["type"] == "relation" and el.get("bounds"):
            bd = el["bounds"]
            cx, cy = project((bd["minlat"] + bd["maxlat"]) / 2, (bd["minlon"] + bd["maxlon"]) / 2)
            a, l, w = 0.0, 0.0, 0.0
        else:
            continue
        if not (x0 <= cx <= x1 and y0 <= cy <= y1):
            continue
        is_pitch = tags.get("leisure") == "pitch" and 14 <= l <= 30 and 7 <= w <= 16
        rec = {"x": round(cx, 1), "y": round(cy, 1), "rot": round(a, 3), "indoor": tags.get("indoor") == "yes" or tags.get("covered") == "yes"}
        (courts if is_pitch else centres).append(rec)
    sites = []
    for c in sorted(courts, key=lambda c: (c["x"], c["y"])):
        site = next((s for s in sites if math.hypot(s["x"] - c["x"], s["y"] - c["y"]) < 90), None)
        if not site:
            site = {"x": c["x"], "y": c["y"], "courts": []}
            sites.append(site)
        site["courts"].append({"x": c["x"], "y": c["y"], "rot": c["rot"]})
        n = len(site["courts"])
        site["x"] = round(sum(k["x"] for k in site["courts"]) / n, 1)
        site["y"] = round(sum(k["y"] for k in site["courts"]) / n, 1)
    for c in centres:
        if any(math.hypot(s["x"] - c["x"], s["y"] - c["y"]) < 150 for s in sites):
            continue
        # a sports centre without mapped pitches: one court beside it
        sites.append({"x": c["x"], "y": c["y"], "courts": [], "centre": True})
    src = "osm"
    if len(sites) < 2:
        src = "gok"
        for fx, fy, rot, name in FALLBACK_PADEL:
            if any(math.hypot(s["x"] - fx, s["y"] - fy) < 300 for s in sites):
                continue
            sites.append({"x": fx, "y": fy, "courts": [], "guess": True, "wijk": name})
    for s in sites:
        s["name"] = "Padelbaan " + (s.pop("wijk", None) or wijk(s["x"], s["y"]))
        s["src"] = "gok" if s.get("guess") else "osm"
    return sites, src


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
    bus_roads, snapped, dropped = connect_bus_roads(bus_roads, [r for r in citymap["roads"] if r["cat"] in ("major", "normal", "minor")])
    print(f"busways: {snapped} ends snapped onto a street, {dropped} unconnected busways dropped")

    cands = []
    for raw in blds.values():
        cands += footprints(raw)
    added, height_patches = missing_buildings(citymap["buildings"], cands)

    fuel_pts = [f for f in build_fuel(fuel) if x0 <= f["x"] <= x1 and y0 <= f["y"] <= y1]
    taken = {tuple(pch["at"]) for pch in height_patches}
    core = core_heights(citymap["buildings"], taken)
    passages = [p for p in build_passages() if any(x0 <= q[0] <= x1 and y0 <= q[1] <= y1 for q in p["pts"])]
    padel_raw = cached("data/extras_padel_raw.json", map_bbox(citymap["meta"]), padel_query)
    padel, padel_src = build_padel(padel_raw, citymap["meta"])
    hidden = structure_patches(citymap["buildings"], citymap["roads"])
    road_z = snap_road_z(ROAD_Z, citymap["roads"])
    out = {"frame": FRAME, "busRoads": bus_roads, "busLanes": bus_lanes, "buildings": added, "buildingPatches": PATCHES + height_patches + core + hidden, "fuel": fuel_pts, "passages": passages, "padel": padel, "roadZ": road_z}
    with open(OUT, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"busRoads={len(bus_roads)} busLanes={len(bus_lanes)} buildings+={len(added)} heights={len(height_patches)} hidden={len(hidden)} fuel={len(fuel_pts)} passages={len(passages)} padel={len(padel)} ({padel_src})")
    for s in padel:
        print("  padel", s["name"], s["x"], s["y"], len(s["courts"]), "courts", s["src"])
    for b in added:
        if b["name"] or b["h"] >= 4:
            print("  +", b["name"], b["type"], b["h"], b["pts"][0])
