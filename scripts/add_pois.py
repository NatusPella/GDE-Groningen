#!/usr/bin/env python3
"""Fetch pickup-worthy places from OpenStreetMap and merge them into
game/citymap.json as meta.pois = {health, money, weapons, armor}, each a list
of {x, y, kind, name?} snapped to a walkable spot next to the nearest road.

Weapon spots are purely geometric game locations (industrial land, rail
yards, quays, bridge ends, dead-end service roads, parking garages), never
named businesses.
"""
import json
import math
import os
import random
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from osmfetch import bbox_str, cached, map_bbox  # noqa: E402
from world.rdnew import meta_frame  # noqa: E402

MAP_PATH = "game/citymap.json"
CACHE_PATH = "data/pois_raw.json"
OVERPASS_URLS = [
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
QUERY_TEMPLATE = (
    "[out:json][timeout:120];("
    'nwr["amenity"~"^(hospital|clinic|doctors|pharmacy|dentist)$"]{b};'
    'nwr["healthcare"]{b};'
    'nwr["amenity"~"^(bank|atm|bureau_de_change|marketplace)$"]{b};'
    'nwr["office"]{b};'
    'nwr["shop"~"^(supermarket|department_store|mall)$"]{b};'
    'way["building"~"^(office|commercial)$"]{b};'
    'nwr["leisure"~"^(fitness_centre|sports_centre)$"]{b};'
    'nwr["shop"~"^(outdoor|military|workwear)$"]{b};'
    'nwr["clothes"="workwear"]{b};'
    'way["landuse"~"^(industrial|railway|harbour|port|scrapyard)$"]{b};'
    'nwr["industrial"="scrap_yard"]{b};'
    'way["railway"="rail"]["service"~"^(yard|siding|spur)$"]{b};'
    'nwr["amenity"="parking"]["parking"~"^(multi-storey|underground)$"]{b};'
    'way["man_made"~"^(quay|pier)$"]{b};'
    'nwr["leisure"="marina"]{b};'
    'nwr["waterway"="dock"]{b};'
    ");out tags geom;"
)

SPACING = {"health": 40, "money": 40, "weapons": 45, "armor": 40}
KIND_SPACING = {"alley": 110, "bridge": 60}
SAMPLE_STEP = 90
ALLEY_MIN_LENGTH = 30
BUILDING_SAMPLE = 0.5
HEALTH_RANK = {"hospital": 0, "clinic": 1, "doctors": 2, "pharmacy": 3, "dentist": 4, "healthcare": 5}
MONEY_RANK = {"atm": 0, "bank": 1, "bureau_de_change": 2, "supermarket": 3, "department_store": 3,
              "mall": 3, "marketplace": 4, "office": 5, "building": 6}
WEAPON_RANK = {"scrapyard": 0, "railyard": 1, "harbour": 2, "bridge": 3, "parking": 4,
               "industrial": 5, "alley": 6}
ARMOR_RANK = {"outdoor": 0, "military": 0, "workwear": 0, "fitness": 1, "sports": 2}
CAR_CATS = {"major", "normal", "minor"}


def fetch(meta):
    """POI elements over the whole map (cached in data/pois_raw.json; OVERPASS_CACHE overrides the path)."""
    path = os.environ.get("OVERPASS_CACHE") or CACHE_PATH
    return cached(path, map_bbox(meta), lambda b: QUERY_TEMPLATE.format(b=bbox_str(b)))["elements"]


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


def closest_on_seg(x, y, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    l2 = dx * dx + dy * dy
    t = 0 if l2 == 0 else max(0, min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2))
    cx, cy = a[0] + dx * t, a[1] + dy * t
    return cx, cy, (x - cx) ** 2 + (y - cy) ** 2


class Grid:
    def __init__(self, cell=50):
        self.cell = cell
        self.cells = {}

    def add(self, item, bounds):
        c = self.cell
        for gx in range(int(bounds[0] // c), int(bounds[2] // c) + 1):
            for gy in range(int(bounds[1] // c), int(bounds[3] // c) + 1):
                self.cells.setdefault((gx, gy), []).append(item)

    def near(self, x, y, r):
        c = self.cell
        seen = set()
        for gx in range(int((x - r) // c), int((x + r) // c) + 1):
            for gy in range(int((y - r) // c), int((y + r) // c) + 1):
                for it in self.cells.get((gx, gy), ()):
                    if id(it) not in seen:
                        seen.add(id(it))
                        yield it


def bounds_of(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return (min(xs), min(ys), max(xs), max(ys))


class World:
    def __init__(self, data):
        self.buildings = Grid()
        for b in data["buildings"]:
            bb = bounds_of(b["pts"])
            self.buildings.add((bb, b["pts"]), bb)
        self.water = Grid(100)
        for w in data["water"]:
            bb = bounds_of(w["pts"])
            self.water.add((bb, w["pts"]), bb)
        self.roads = Grid()
        self.bridges = Grid()
        for r in data["roads"]:
            if len(r["pts"]) < 2:
                continue
            bb = bounds_of(r["pts"])
            if r["cat"] in CAR_CATS:
                self.roads.add(r, bb)
            if r.get("bridge"):
                self.bridges.add(r, bb)
        mb = data["meta"]["bounds"]
        self.bounds = (mb[0] + 30, mb[1] + 30, mb[2] - 30, mb[3] - 30)

    def in_building(self, x, y):
        for bb, pts in self.buildings.near(x, y, 0.5):
            if bb[0] <= x <= bb[2] and bb[1] <= y <= bb[3] and point_in_poly(x, y, pts):
                return True
        return False

    def on_bridge(self, x, y):
        for r in self.bridges.near(x, y, 8):
            th = r["width"] / 2 + 1.5
            pts = r["pts"]
            for i in range(len(pts) - 1):
                if closest_on_seg(x, y, pts[i], pts[i + 1])[2] <= th * th:
                    return True
        return False

    def in_water(self, x, y):
        for bb, pts in self.water.near(x, y, 0.5):
            if bb[0] <= x <= bb[2] and bb[1] <= y <= bb[3] and point_in_poly(x, y, pts):
                return not self.on_bridge(x, y)
        return False

    def ok(self, x, y):
        b = self.bounds
        if not (b[0] < x < b[2] and b[1] < y < b[3]):
            return False
        return not self.in_building(x, y) and not self.in_water(x, y) and not self.on_bridge(x, y)

    def snap(self, x, y, max_d=70):
        """Nearest road point, pushed onto the sidewalk on the side facing (x, y)."""
        cands = []
        for r in self.roads.near(x, y, max_d):
            pts = r["pts"]
            for i in range(len(pts) - 1):
                cx, cy, d2 = closest_on_seg(x, y, pts[i], pts[i + 1])
                if d2 <= max_d * max_d:
                    cands.append((d2, cx, cy, r, pts[i], pts[i + 1]))
        cands.sort(key=lambda c: c[0])
        for d2, cx, cy, r, a, b in cands[:6]:
            ang = math.atan2(b[1] - a[1], b[0] - a[0])
            nx, ny = -math.sin(ang), math.cos(ang)
            tx, ty = math.cos(ang), math.sin(ang)
            facing = 1 if (x - cx) * nx + (y - cy) * ny >= 0 else -1
            half = r.get("width", 4) / 2
            for side in (facing, -facing):
                for off in (1.5, 2.5, 3.5):
                    for along in (0, 3, -3, 6, -6):
                        px = cx + nx * (half + off) * side + tx * along
                        py = cy + ny * (half + off) * side + ty * along
                        if self.ok(px, py):
                            return px, py
        return None


def element_points(el, project):
    if el["type"] == "node":
        return [project(el["lat"], el["lon"])], None
    if el["type"] == "way" and "geometry" in el:
        pts = [project(g["lat"], g["lon"]) for g in el["geometry"]]
        return pts, pts
    if el["type"] == "relation":
        pts = [project(g["lat"], g["lon"]) for m in el.get("members", []) for g in m.get("geometry", [])]
        return pts, None
    return [], None


def centroid(pts):
    return sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)


def sample_polygon(poly, step):
    if len(poly) < 3:
        return [centroid(poly)] if poly else []
    bb = bounds_of(poly)
    out = []
    gx0 = math.floor(bb[0] / step) * step + step / 2
    gy0 = math.floor(bb[1] / step) * step + step / 2
    x = gx0
    while x < bb[2]:
        y = gy0
        while y < bb[3]:
            if point_in_poly(x, y, poly):
                out.append((x, y))
            y += step
        x += step
    return out or [centroid(poly)]


def sample_line(pts, step):
    out = [pts[0]]
    acc = 0
    for a, b in zip(pts, pts[1:]):
        seg = math.hypot(b[0] - a[0], b[1] - a[1])
        t = step - acc
        while t <= seg:
            out.append((a[0] + (b[0] - a[0]) * t / seg, a[1] + (b[1] - a[1]) * t / seg))
            t += step
        acc = (acc + seg) % step
    return out


def classify(tags):
    """Yield (category, kind) pairs for one OSM element."""
    a = tags.get("amenity")
    if a in HEALTH_RANK:
        yield "health", a
    elif "healthcare" in tags:
        yield "health", "healthcare"
    if a in ("bank", "atm", "bureau_de_change", "marketplace"):
        yield "money", a
    if tags.get("shop") in ("supermarket", "department_store", "mall"):
        yield "money", tags["shop"]
    if "office" in tags:
        yield "money", "office"
    elif tags.get("building") in ("office", "commercial") and not tags.get("shop") and not a:
        yield "money", "building"
    lz = tags.get("leisure")
    if lz == "fitness_centre":
        yield "armor", "fitness"
    elif lz == "sports_centre":
        yield "armor", "sports"
    if tags.get("shop") in ("outdoor", "military", "workwear") or tags.get("clothes") == "workwear":
        yield "armor", tags.get("shop") if tags.get("shop") in ("outdoor", "military") else "workwear"


def weapon_kind(tags):
    lu = tags.get("landuse")
    if lu == "scrapyard" or tags.get("industrial") == "scrap_yard":
        return "scrapyard"
    if lu == "industrial":
        return "industrial"
    if lu == "railway" or tags.get("railway") == "rail":
        return "railyard"
    if lu in ("harbour", "port") or tags.get("man_made") in ("quay", "pier") \
            or tags.get("leisure") == "marina" or tags.get("waterway") == "dock":
        return "harbour"
    if tags.get("amenity") == "parking":
        return "parking"
    return None


def geometric_weapon_spots(data):
    """Bridge ends and dead-end service roads straight from the game's road graph."""
    out = []
    verts = {}
    for r in data["roads"]:
        for p in r["pts"]:
            k = (round(p[0]), round(p[1]))
            verts[k] = verts.get(k, 0) + 1

    def dead_end(p):
        kx, ky = round(p[0]), round(p[1])
        return sum(verts.get((kx + dx, ky + dy), 0) for dx in (-1, 0, 1) for dy in (-1, 0, 1)) == 1
    for r in data["roads"]:
        pts = r["pts"]
        if len(pts) < 2:
            continue
        if r.get("bridge") and r["cat"] in CAR_CATS | {"cycle", "foot"}:
            out.append(("bridge", pts[0][0], pts[0][1], None))
            out.append(("bridge", pts[-1][0], pts[-1][1], None))
        length = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(pts, pts[1:]))
        if r["type"] == "service" and length >= ALLEY_MIN_LENGTH:
            for p in (pts[0], pts[-1]):
                if dead_end(p):
                    out.append(("alley", p[0], p[1], None))
    return out


def dedupe(items, spacing, rank):
    for kind, sp in KIND_SPACING.items():
        same = [it for it in items if it["kind"] == kind]
        if same:
            keep = {id(it) for it in dedupe_simple(same, sp)}
            items = [it for it in items if it["kind"] != kind or id(it) in keep]
    return dedupe_simple(items, spacing, rank)


def dedupe_simple(items, spacing, rank=None):
    rank = rank or {}
    items.sort(key=lambda it: rank.get(it["kind"], 9))
    grid = Grid(spacing)
    kept = []
    for it in items:
        if any((o["x"] - it["x"]) ** 2 + (o["y"] - it["y"]) ** 2 < spacing * spacing
               for o in grid.near(it["x"], it["y"], spacing)):
            continue
        grid.add(it, (it["x"], it["y"], it["x"], it["y"]))
        kept.append(it)
    kept.sort(key=lambda it: (it["x"], it["y"]))
    return kept


def main():
    random.seed(42)
    with open(MAP_PATH) as f:
        data = json.load(f)
    meta = data["meta"]
    proj, _ = meta_frame(meta)

    def project(lat, lon):
        return proj(lat, lon)

    world = World(data)
    raw = {"health": [], "money": [], "weapons": [], "armor": []}

    for el in fetch(meta):
        tags = el.get("tags", {})
        pts, line = element_points(el, project)
        if not pts:
            continue
        cx, cy = centroid(pts)
        name = tags.get("name")
        for cat, kind in classify(tags):
            if kind == "building" and random.random() > BUILDING_SAMPLE:
                continue
            if kind == "hospital" and line and len(line) > 3:
                raw[cat].extend((kind, x, y, name) for x, y in sample_polygon(line, SAMPLE_STEP))
            else:
                raw[cat].append((kind, cx, cy, name))
        wk = weapon_kind(tags)
        if wk:
            closed = line and len(line) > 3 and line[0] == line[-1]
            if wk in ("industrial", "railyard", "harbour") and closed:
                samples = sample_polygon(line, SAMPLE_STEP)
            elif line and not closed:
                samples = sample_line(line, SAMPLE_STEP)
            else:
                samples = [(cx, cy)]
            raw["weapons"].extend((wk, x, y, None) for x, y in samples)

    raw["weapons"].extend(geometric_weapon_spots(data))

    ranks = {"health": HEALTH_RANK, "money": MONEY_RANK, "weapons": WEAPON_RANK, "armor": ARMOR_RANK}
    pois = {}
    for cat, items in raw.items():
        snapped = []
        for kind, x, y, name in items:
            spot = world.snap(x, y, 40 if kind == "alley" else 70)
            if not spot:
                continue
            it = {"x": round(spot[0], 1), "y": round(spot[1], 1), "kind": kind}
            if name and cat != "weapons":
                it["name"] = name
            snapped.append(it)
        pois[cat] = dedupe(snapped, SPACING[cat], ranks[cat])

    meta["pois"] = pois
    with open(MAP_PATH, "w") as f:
        json.dump(data, f, separators=(",", ":"))

    for cat, items in pois.items():
        kinds = {}
        for it in items:
            kinds[it["kind"]] = kinds.get(it["kind"], 0) + 1
        print(f"{cat:8s} {len(items):4d}  {kinds}")


if __name__ == "__main__":
    main()
