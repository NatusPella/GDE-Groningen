#!/usr/bin/env python3
"""The whole province out of a Geofabrik OSM extract (docs/PROVINCIE-PLAN.md
2.5, F2): one local pass over groningen-latest.osm.pbf instead of hundreds of
Overpass calls. Writes the same slim pack caches fetch_corridor.py writes
(one per 8 x 8 km pack: c<pi>_<pj>.json.gz, elements with `g` [[lat, lon]]),
so scripts/world/build_corridor.mjs reads either; plus the province layer
(province.json.gz: boundary, places, stations, bus route relations) and the
raw facilities in Overpass form (facilities_raw.json.gz, for
scripts/add_facilities.py --cache).

    python3 -m venv data/cache/venv && data/cache/venv/bin/pip install osmium
    curl -L -A 'GDE-Groningen-mapbuilder/1.0' -o data/cache/groningen-latest.osm.pbf \\
        https://download.geofabrik.de/europe/netherlands/groningen-latest.osm.pbf
    data/cache/venv/bin/python scripts/world/extract_province.py
    data/cache/venv/bin/python scripts/world/extract_province.py --bbox 53.30,6.80,53.34,6.86 --out /tmp/x  # a small test area

Two passes: the relations first (which ways and nodes their members need),
then everything with node locations. Multipolygon outer rings are joined
here, so a lake or wood drawn as a relation arrives as closed rings. A way
goes into every pack its bounds touch; a building's tile is chosen later by
its centre. OSM data is ODbL (docs/LICENTIES.md): the caches are a derived
database, kept under data/cache/ (gitignored).
"""
import gzip
import hashlib
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)

from rdnew import wgs_to_world  # noqa: E402
from fetch_corridor import KEEP, R  # noqa: E402

PBF = os.path.join(ROOT, "data", "cache", "groningen-latest.osm.pbf")
OUT = os.path.join(ROOT, "data", "cache", "province")
GRID_X0, GRID_Y0, TILE_M, PACK = 330, 75, 1000, 8

# what the packs keep (the Overpass queries of fetch_corridor.py, plus
# multipolygons, street furniture and the access tags)
WAY_NATURAL = {"water", "coastline", "wetland", "beach", "sand", "wood", "scrub", "heath", "grassland", "tree_row"}
MAN_MADE = {"dyke", "pier", "breakwater", "groyne"}
BARRIER_WAY = {"hedge", "wall", "fence", "retaining_wall", "guard_rail", "city_wall"}
RAIL_WAY = {"rail", "platform", "light_rail", "tram"}
RAIL_NODE = {"station", "halt", "level_crossing", "crossing", "stop", "signal", "buffer_stop"}
POINT_MAN_MADE = {"windmill", "lighthouse", "tower", "chimney", "water_tower", "silo", "mast"}
HISTORIC = {"windmill", "monument", "castle", "manor", "church", "memorial", "wayside_shrine"}
# mapped street furniture (docs 2.14)
FURNITURE = {
    "highway": {"street_lamp", "traffic_signals", "stop", "give_way", "crossing", "speed_camera", "milestone"},
    "amenity": {"bench", "waste_basket", "bicycle_parking", "post_box", "telephone", "recycling", "vending_machine",
                "drinking_water", "charging_station", "atm", "clock", "shelter", "parking_entrance", "toilets"},
    "barrier": {"bollard", "gate", "lift_gate", "swing_gate", "cycle_barrier", "block", "kissing_gate", "stile", "cattle_grid"},
    "leisure": {"picnic_table", "playground", "fitness_station"},
    "man_made": {"flagpole", "street_cabinet", "surveillance", "utility_pole", "monitoring_station"},
    "tourism": {"information", "artwork", "viewpoint", "picnic_site"},
    "power": {"tower", "pole"},
}
FURNITURE_KEYS = {"support", "lamp_type", "lit", "colour", "material", "backrest", "direction", "crossing", "crossing:markings",
                  "traffic_signals", "information", "capacity", "bicycle_parking", "recycling_type", "covered", "height"}
EXTRA_KEEP = {"tourism", "power", "generator:source", "sport", "surface", "lit", "sidewalk", "sidewalk:left", "sidewalk:right",
              "sidewalk:both", "parking:lane:both", "parking:lane:left", "parking:lane:right", "hgv", "maxheight", "maxwidth",
              "maxweight", "agricultural", "motorcycle", "moped", "mofa", "crop", "produce", "wetland", "intermittent", "ISO3166-2", "bridge:movable", "lock", "lock_name"}
URBAN_CELL = 120
PLACE_KINDS = {"city", "town", "village", "hamlet", "suburb", "quarter", "neighbourhood", "isolated_dwelling", "locality",
               "island", "islet", "farm", "square"}

# add_facilities.py's Overpass query, as a filter
FAC_AMENITY = {"police", "hospital", "clinic", "doctors", "fire_station", "pharmacy", "fuel", "taxi", "bus_station", "fast_food",
               "cafe", "pub", "bar", "restaurant", "car_wash", "bicycle_rental", "boat_rental", "parking"}
FAC_SHOP = set(("supermarket|convenience|clothes|shoes|fashion|hairdresser|beauty|bicycle|car|car_repair|car_parts|tyres|"
                "tobacco|lottery|newsagent|kiosk|second_hand|pawnbroker|outdoor|variety_store|furniture|paint|bakery|butcher|"
                "florist|gift|garden_centre|greengrocer|deli|pastry|confectionery|seafood|jewelry|boutique|electronics|mobile_phone|computer|"
                "antiques|charity").split("|"))
FAC_PLACE = {"city", "town", "village", "hamlet", "suburb", "quarter", "neighbourhood"}
FAC_BBOX = (52.83, 6.15, 53.57, 7.25)


def way_kept(t):
    if "highway" in t or "building" in t or "landuse" in t or "leisure" in t or "waterway" in t:
        return True
    return (t.get("railway") in RAIL_WAY or t.get("natural") in WAY_NATURAL or t.get("man_made") in MAN_MADE
            or t.get("barrier") in BARRIER_WAY or t.get("amenity") == "place_of_worship" or "place" in t)


def furniture_kind(t):
    for k, vals in FURNITURE.items():
        v = t.get(k)
        if v in vals:
            return k
    return None


def node_kept(t):
    return (t.get("natural") == "tree" or t.get("railway") in RAIL_NODE or "place" in t
            or t.get("public_transport") in ("station", "stop_position", "platform") or t.get("highway") == "bus_stop"
            or t.get("amenity") in ("bus_station", "place_of_worship") or t.get("historic") in HISTORIC
            or t.get("man_made") in POINT_MAN_MADE or (t.get("power") == "generator" and t.get("generator:source") == "wind")
            or furniture_kind(t) is not None)


def facility(t, typ):
    a = t.get("amenity")
    if a in FAC_AMENITY or t.get("emergency") == "ambulance_station" or t.get("healthcare") in ("doctor", "centre", "hospital"):
        return True
    if t.get("shop") in FAC_SHOP or t.get("craft") == "bicycle":
        return True
    if typ == "node" and t.get("place") in FAC_PLACE:
        return True
    hw = t.get("highway")
    if typ == "way" and hw and hw not in ("footway", "cycleway", "path", "track", "steps", "service", "motorway", "motorway_link", "trunk", "trunk_link"):
        return any(k.startswith(("parking:lane", "parking:both", "parking:left", "parking:right")) for k in t)
    return False


def slim_tags(t, furniture=False):
    out = {k: v for k, v in t.items() if k in KEEP or k in EXTRA_KEEP or k.startswith("name") or (furniture and k in FURNITURE_KEYS)}
    return out


def tile_of(x, y):
    return (int((x - GRID_X0) // TILE_M), int((y - GRID_Y0) // TILE_M))


def packs_of_bounds(x0, y0, x1, y1):
    i0, j0 = tile_of(x0, y0)
    i1, j1 = tile_of(x1, y1)
    return [(pi, pj) for pi in range(i0 // PACK, i1 // PACK + 1) for pj in range(j0 // PACK, j1 // PACK + 1)]


def bounds_world(lats, lons):
    """The world-frame box (x0, y0, x1, y1) of a lat/lon box's corners."""
    xs, ys = [], []
    for la, lo in ((min(lats), min(lons)), (max(lats), max(lons)), (min(lats), max(lons)), (max(lats), min(lons))):
        x, y = wgs_to_world(la, lo)
        xs.append(x)
        ys.append(y)
    return min(xs), min(ys), max(xs), max(ys)


def ll(lat, lon):
    return [round(lat, R), round(lon, R)]


def join_rings(parts):
    """Outer member ways (lists of [lat, lon]) joined end to end into closed
    rings; an open chain that never closes is dropped."""
    parts = [p[:] for p in parts if len(p) >= 2]
    rings = []
    while parts:
        cur = parts.pop(0)
        changed = True
        while cur[0] != cur[-1] and changed:
            changed = False
            for k, p in enumerate(parts):
                if p[0] == cur[-1]:
                    cur += p[1:]
                elif p[-1] == cur[-1]:
                    cur += p[::-1][1:]
                elif p[-1] == cur[0]:
                    cur = p[:-1] + cur
                elif p[0] == cur[0]:
                    cur = p[::-1][:-1] + cur
                else:
                    continue
                parts.pop(k)
                changed = True
                break
        if len(cur) >= 4 and cur[0] == cur[-1]:
            rings.append(cur)
    return rings


class Extract:
    def __init__(self, bbox=None, mask=None, fac_mask=None):
        self.bbox = bbox  # (s, w, n, e) or None: everything
        self.mask = mask  # a set of tiles (i, j): keep only what touches them (a buffer strip), or None
        self.fac_mask = fac_mask if fac_mask is not None else mask  # the same for the facilities (a wider strip)
        self.mask_packs = {(i // PACK, j // PACK) for i, j in mask} if mask is not None else None
        self.packs = {}   # (pi, pj) -> [elements]
        self.rel_want = {}  # relation id -> (kind, tags, members)
        self.way_need = set()
        self.node_need = set()
        self.way_geom = {}
        self.node_ll = {}
        self.facilities = []
        self.places = []
        self.stations = []
        self.bus = []
        self.trains = []
        self.boundary = []
        self.bcells = {}  # building centres per URBAN_CELL cell: the built-up field (build_corridor.mjs urbanField)
        self.n = {"nodes": 0, "ways": 0, "relations": 0, "elements": 0}

    def inside(self, lat, lon):
        b = self.bbox
        return not b or (b[0] <= lat <= b[2] and b[1] <= lon <= b[3])

    def put(self, el, lats, lons):
        b = bounds_world(lats, lons)
        if self.mask is not None and not self.touches(*b):
            return
        for pk in packs_of_bounds(*b):
            if self.mask is not None and pk not in self.mask_packs:
                continue
            self.packs.setdefault(pk, []).append(el)
        self.n["elements"] += 1

    def touches(self, x0, y0, x1, y1):
        i0, j0 = tile_of(x0, y0)
        i1, j1 = tile_of(x1, y1)
        if (i1 - i0 + 1) * (j1 - j0 + 1) > len(self.mask):
            return any(i0 <= i <= i1 and j0 <= j <= j1 for i, j in self.mask)
        return any((i, j) in self.mask for i in range(i0, i1 + 1) for j in range(j0, j1 + 1))

    def keep_point(self, x, y):
        return self.mask is None or tile_of(x, y) in self.mask

    # a facility (hospital, police, shop ...) of a neighbour counts from further away
    def fac_point(self, x, y):
        return self.fac_mask is None or tile_of(x, y) in self.fac_mask

    def fac_box(self, x0, y0, x1, y1):
        if self.fac_mask is None:
            return True
        i0, j0 = tile_of(x0, y0)
        i1, j1 = tile_of(x1, y1)
        return any(i0 <= i <= i1 and j0 <= j <= j1 for i, j in self.fac_mask)

    # pass 1: the relations and what their members need
    def relation_pass(self, pbf):
        import osmium
        for r in osmium.FileProcessor(pbf, osmium.osm.RELATION):
            t = dict(r.tags)
            kind = None
            if t.get("type") == "multipolygon" and (way_kept(t) or t.get("natural") in WAY_NATURAL or t.get("amenity") == "parking"):
                kind = "mp"
            elif t.get("type") == "route" and t.get("route") in ("bus", "train") and self.mask is None:
                kind = t["route"]
            elif t.get("type") == "boundary" and t.get("admin_level") == "4" and t.get("ISO3166-2") == "NL-GR" and self.mask is None:
                kind = "boundary"
            if not kind:
                continue
            members = [(m.type, m.ref, m.role) for m in r.members]
            self.rel_want[r.id] = (kind, t, members)
            for typ, ref, role in members:
                if typ == "w":
                    self.way_need.add(ref)
                elif typ == "n":
                    self.node_need.add(ref)

    # pass 2: nodes and ways with locations, then the relations
    def main_pass(self, pbf):
        import osmium
        # untagged nodes only feed the location index
        fp = osmium.FileProcessor(pbf).with_locations().with_filter(osmium.filter.EmptyTagFilter().enable_for(osmium.osm.NODE))
        for o in fp:
            if o.is_node():
                self.n["nodes"] += 1
                if o.id in self.node_need and o.location.valid():
                    self.node_ll[o.id] = (o.location.lat, o.location.lon)
                if not o.tags:
                    continue
                t = dict(o.tags)
                lat, lon = o.location.lat, o.location.lon
                if not self.inside(lat, lon):
                    continue
                if facility(t, "node") and self.in_fac(lat, lon) and self.fac_point(*wgs_to_world(lat, lon)):
                    self.facilities.append({"type": "node", "id": o.id, "lat": lat, "lon": lon, "tags": t})
                if not node_kept(t):
                    continue
                fk = furniture_kind(t)
                tags = slim_tags(t, furniture=fk is not None)
                if fk and not tags.get(fk):
                    tags[fk] = t[fk]
                el = {"type": "node", "id": o.id, "lat": round(lat, R), "lon": round(lon, R)}
                if tags:
                    el["tags"] = tags
                self.put(el, [lat], [lon])
                x, y = wgs_to_world(lat, lon)
                if not self.keep_point(x, y):
                    continue
                if "place" in t and t.get("name"):
                    self.places.append({"id": o.id, "name": t["name"], "kind": t["place"], "lat": round(lat, R), "lon": round(lon, R),
                                        "x": round(x, 2), "y": round(y, 2), "pop": int(t["population"]) if t.get("population", "").isdigit() else 0,
                                        **({"gos": t["name:gos"]} if t.get("name:gos") else {})})
                if t.get("railway") in ("station", "halt") and t.get("name") and t.get("station") not in ("subway", "light_rail") \
                        and t.get("usage") != "tourism" and t.get("railway:historic") is None:
                    self.stations.append({"id": o.id, "name": t["name"], "x": round(x, 2), "y": round(y, 2), "kind": t["railway"]})
            elif o.is_way():
                self.n["ways"] += 1
                need = o.id in self.way_need
                if not o.tags and not need:
                    continue
                try:
                    g = [ll(n.lat, n.lon) for n in o.nodes]
                except osmium.InvalidLocationError:
                    g = [ll(n.lat, n.lon) for n in o.nodes if n.location.valid()]
                if len(g) < 2:
                    continue
                if need:
                    self.way_geom[o.id] = g
                t = dict(o.tags)
                lats = [p[0] for p in g]
                lons = [p[1] for p in g]
                if self.bbox and (max(lats) < self.bbox[0] or min(lats) > self.bbox[2] or max(lons) < self.bbox[1] or min(lons) > self.bbox[3]):
                    continue
                if facility(t, "way") and self.fac_box(*bounds_world(lats, lons)):
                    c = (sum(lats) / len(lats), sum(lons) / len(lons))
                    if self.in_fac(*c):
                        self.facilities.append({"type": "way", "id": o.id, "tags": t, "geometry": [{"lat": p[0], "lon": p[1]} for p in g]})
                if not way_kept(t):
                    continue
                if "building" in t:
                    x, y = wgs_to_world(sum(lats) / len(lats), sum(lons) / len(lons))
                    if not self.keep_point(x, y):
                        continue
                    k = (int(x // URBAN_CELL), int(y // URBAN_CELL))
                    self.bcells[k] = self.bcells.get(k, 0) + 1
                el = {"type": "way", "id": o.id, "tags": slim_tags(t), "g": g}
                self.put(el, lats, lons)
            elif o.is_relation():
                self.n["relations"] += 1
                if o.id in self.rel_want:
                    self.relation(o.id, *self.rel_want[o.id])

    def in_fac(self, lat, lon):
        s, w, n, e = FAC_BBOX
        return s <= lat <= n and w <= lon <= e

    def relation(self, rid, kind, t, members):
        if kind == "boundary":
            outer = [self.way_geom[ref] for typ, ref, role in members if typ == "w" and role in ("outer", "") and ref in self.way_geom]
            self.boundary = join_rings(outer)
            return
        if kind == "mp":
            outer = [self.way_geom[ref] for typ, ref, role in members if typ == "w" and role in ("outer", "") and ref in self.way_geom]
            rings = join_rings(outer)
            if not rings:
                return
            lats = [p[0] for r in rings for p in r]
            lons = [p[1] for r in rings for p in r]
            if self.bbox and (max(lats) < self.bbox[0] or min(lats) > self.bbox[2] or max(lons) < self.bbox[1] or min(lons) > self.bbox[3]):
                return
            if facility(t, "way") and t.get("amenity") == "parking" and self.fac_box(*bounds_world(lats, lons)):
                self.facilities.append({"type": "relation", "id": rid, "tags": t,
                                        "bounds": {"minlat": min(lats), "minlon": min(lons), "maxlat": max(lats), "maxlon": max(lons)}})
            members_out = [{"type": "way", "ref": 0, "role": "outer", "g": r} for r in rings]
            # the islands of a lake (a farm on its terp in the water): build_corridor.mjs cuts them out of the water
            if t.get("natural") == "water" or t.get("waterway") == "riverbank":
                inner = [self.way_geom[ref] for typ, ref, role in members if typ == "w" and role == "inner" and ref in self.way_geom]
                members_out += [{"type": "way", "ref": 0, "role": "inner", "g": r} for r in join_rings(inner)]
            el = {"type": "relation", "id": rid, "tags": slim_tags(t), "members": members_out}
            self.put(el, lats, lons)
            return
        # a bus or train route: its ways chained by build_corridor.mjs busLines, its stops in order
        out = []
        for typ, ref, role in members:
            if typ == "w" and ref in self.way_geom:
                out.append({"type": "way", "ref": ref, "role": role, "g": self.way_geom[ref]})
            elif typ == "n" and ref in self.node_ll:
                la, lo = self.node_ll[ref]
                out.append({"type": "node", "ref": ref, "role": role, "lat": round(la, R), "lon": round(lo, R)})
        if not out:
            return
        if self.bbox and not any(self.inside(*(m["g"][0] if "g" in m else (m["lat"], m["lon"]))) for m in out):
            return
        (self.bus if kind == "bus" else self.trains).append({"type": "relation", "id": rid, "tags": slim_tags(t), "members": out})


def near_mask(province_gz, margin):
    """The tiles within `margin` metres of the province outline (by its
    vertices, ~40 m apart) and outside it: the buffer strip a neighbouring
    extract is cut to."""
    with gzip.open(province_gz, "rt") as f:
        rings = json.load(f)["boundary"]
    mask = set()
    r = int(margin // TILE_M) + 2
    half = TILE_M / 2
    for ring in rings:
        for la, lo in ring[::2]:
            x, y = wgs_to_world(la, lo)
            ti, tj = tile_of(x, y)
            for i in range(ti - r, ti + r + 1):
                for j in range(tj - r, tj + r + 1):
                    cx, cy = GRID_X0 + i * TILE_M + half, GRID_Y0 + j * TILE_M + half
                    if (cx - x) ** 2 + (cy - y) ** 2 <= (margin + half * 1.4143) ** 2:
                        mask.add((i, j))
    return mask


def md5(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def write_gz(path, data):
    tmp = path + ".tmp"
    with gzip.open(tmp, "wt", compresslevel=6) as fh:
        json.dump(data, fh, separators=(",", ":"))
    os.replace(tmp, path)


def main():
    args = sys.argv[1:]
    opt = lambda k, d=None: args[args.index(k) + 1] if k in args else d  # noqa: E731
    pbf = os.path.abspath(opt("--pbf", PBF))
    out = os.path.abspath(opt("--out", OUT))
    bbox = tuple(float(v) for v in opt("--bbox").split(",")) if opt("--bbox") else None
    # --near <province.json.gz> [--margin m] [--fac-margin m]: a neighbour's extract, cut to the strip along
    # the province (the facilities to a wider one: the nearest hospital may be across the border)
    mask = near_mask(opt("--near"), float(opt("--margin", "4000"))) if opt("--near") else None
    if not os.path.exists(pbf):
        raise SystemExit(f"no extract at {pbf}: download it first (see the docstring)")
    try:
        import osmium  # noqa: F401
    except ImportError:
        raise SystemExit("needs pyosmium: python3 -m venv data/cache/venv && data/cache/venv/bin/pip install osmium")
    t0 = time.time()
    ex = Extract(bbox, mask, near_mask(opt("--near"), float(opt("--fac-margin", "12000"))) if opt("--near") else None)
    ex.relation_pass(pbf)
    t1 = time.time()
    ex.main_pass(pbf)
    t2 = time.time()
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        if f.endswith(".json.gz") and f.startswith("c"):
            os.remove(os.path.join(out, f))
    src = f"OpenStreetMap (ODbL), Geofabrik extract {os.path.basename(pbf)}"
    size = 0
    for (pi, pj), els in sorted(ex.packs.items()):
        els.sort(key=lambda e: (e["type"], e["id"]))
        f = os.path.join(out, f"c{pi}_{pj}.json.gz")
        write_gz(f, {"pack": f"{pi}_{pj}", "source": src, "elements": els})
        size += os.path.getsize(f)
    ex.places.sort(key=lambda p: (p["name"], p["id"]))
    ex.stations.sort(key=lambda s: (s["name"], s["id"]))
    ex.bus.sort(key=lambda r: r["id"])
    ex.trains.sort(key=lambda r: r["id"])
    province = {"source": src, "md5": md5(pbf), "bbox": bbox, "near": bool(mask), "boundary": ex.boundary, "places": ex.places, "stations": ex.stations,
                "bus": ex.bus, "trains": ex.trains, "counts": ex.n,
                "urban": {"cell": URBAN_CELL, "cells": sorted([i, j, n] for (i, j), n in ex.bcells.items())}}
    write_gz(os.path.join(out, "province.json.gz"), province)
    ex.facilities.sort(key=lambda e: (e["type"], e["id"]))
    write_gz(os.path.join(out, "facilities_raw.json.gz"), {"source": src, "elements": ex.facilities})
    t3 = time.time()
    print(f"{len(ex.packs)} packs, {ex.n['elements']} elements placed ({size / 1e6:.1f} MB gzip), {len(ex.places)} places, "
          f"{len(ex.stations)} stations, {len(ex.bus)} bus routes, {len(ex.trains)} train routes, {len(ex.facilities)} facilities, boundary {len(ex.boundary)} ring(s)")
    print(f"read {ex.n['nodes']} nodes, {ex.n['ways']} ways, {ex.n['relations']} relations; "
          f"relations {t1 - t0:.1f} s, main pass {t2 - t1:.1f} s, write {t3 - t2:.1f} s -> {os.path.relpath(out, ROOT)}")


if __name__ == "__main__":
    main()
