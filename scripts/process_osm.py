#!/usr/bin/env python3
"""Convert raw Overpass OSM JSON (Groningen) into a compact game map format.

Projects lat/lon to local meters (equirectangular around a fixed origin),
so 1 unit = 1 meter. Y grows downward (south) to match canvas coordinates.

Sources: the city-core extract (data/groningen_raw.json + _extra.json) plus
the ringweg surroundings from scripts/fetch_osm.py (data/ring_*.json.gz).
Run everything through scripts/build_map.py.
"""
import gzip
import json
import math
import os
import sys

SRC = ["data/groningen_raw.json", "data/groningen_extra.json", "data/ring_raw.json.gz", "data/ring_extra.json.gz"]
DST = "game/citymap.json"

# the world covers the whole ringweg loop with ~300 m to spare
BBOX_SOUTH, BBOX_WEST = 53.1975, 6.5225
BBOX_NORTH, BBOX_EAST = 53.2525, 6.626

# The origin stays at the centre of the original city-core bbox
# (53.204..53.235, 6.538..6.592): every saved position, mission and
# hand-placed coordinate in the game is relative to it.
LAT0 = (53.204 + 53.235) / 2
LON0 = (6.538 + 6.592) / 2

M_PER_DEG_LAT = 110574.0
M_PER_DEG_LON = 111320.0 * math.cos(math.radians(LAT0))

ROAD_SPEC = {
    "motorway":         {"width": 12, "speed": 25, "lanes": 2, "cat": "major"},
    "motorway_link":    {"width": 9,  "speed": 16, "lanes": 1, "cat": "major"},
    "trunk":            {"width": 12, "speed": 22, "lanes": 2, "cat": "major"},
    "trunk_link":       {"width": 9,  "speed": 16, "lanes": 1, "cat": "major"},
    "primary":          {"width": 10, "speed": 18, "lanes": 2, "cat": "major"},
    "primary_link":     {"width": 7,  "speed": 13, "lanes": 1, "cat": "major"},
    "secondary":        {"width": 9,  "speed": 16, "lanes": 2, "cat": "major"},
    "secondary_link":   {"width": 7,  "speed": 13, "lanes": 1, "cat": "major"},
    "tertiary":         {"width": 8,  "speed": 14, "lanes": 2, "cat": "normal"},
    "tertiary_link":    {"width": 6,  "speed": 11, "lanes": 1, "cat": "normal"},
    "residential":      {"width": 6.5,"speed": 11, "lanes": 2, "cat": "normal"},
    "unclassified":     {"width": 6,  "speed": 11, "lanes": 2, "cat": "normal"},
    "living_street":    {"width": 5,  "speed": 7,  "lanes": 1, "cat": "minor"},
    "service":          {"width": 4,  "speed": 6,  "lanes": 1, "cat": "minor"},
    "pedestrian":       {"width": 4,  "speed": 0,  "lanes": 0, "cat": "foot"},
    "footway":          {"width": 1.8,"speed": 0,  "lanes": 0, "cat": "foot"},
    "steps":            {"width": 1.8,"speed": 0,  "lanes": 0, "cat": "foot"},
    "track":            {"width": 3,  "speed": 4,  "lanes": 1, "cat": "minor"},
    "cycleway":         {"width": 2,  "speed": 0,  "lanes": 0, "cat": "cycle"},
}

TREE_ROW_SPACING = 6.0  # meters between canopies sampled along a tree_row way


def project(lat, lon):
    x = (lon - LON0) * M_PER_DEG_LON
    y = (LAT0 - lat) * M_PER_DEG_LAT
    return [round(x, 1), round(y, 1)]


def is_closed(coords):
    return len(coords) >= 3 and coords[0] == coords[-1]


# --- clipping against the play-area rectangle (raw OSM ways aren't cut at the
# query bbox, so a road/way that only clips a corner can carry a point many km
# away; clip everything back to the intended world rect + a small margin) ---
PAD = 120.0


def _clip_edge(points, inside, intersect):
    """Sutherland-Hodgman: clip a closed polygon against one half-plane."""
    out = []
    n = len(points)
    for i in range(n):
        cur, prv = points[i], points[i - 1]
        cur_in, prv_in = inside(cur), inside(prv)
        if cur_in:
            if not prv_in:
                out.append(intersect(prv, cur))
            out.append(cur)
        elif prv_in:
            out.append(intersect(prv, cur))
    return out


def clip_polygon(coords, rect):
    minx, miny, maxx, maxy = rect
    pts = coords[:-1] if coords[:1] == coords[-1:] else coords[:]
    for inside, intersect in (
        (lambda p: p[0] >= minx, lambda a, b: _lerp_x(a, b, minx)),
        (lambda p: p[0] <= maxx, lambda a, b: _lerp_x(a, b, maxx)),
        (lambda p: p[1] >= miny, lambda a, b: _lerp_y(a, b, miny)),
        (lambda p: p[1] <= maxy, lambda a, b: _lerp_y(a, b, maxy)),
    ):
        if not pts:
            return []
        pts = _clip_edge(pts, inside, intersect)
    if len(pts) >= 3:
        pts.append(pts[0])
    return pts


def _lerp_x(a, b, x):
    t = (x - a[0]) / (b[0] - a[0]) if b[0] != a[0] else 0
    return [x, a[1] + t * (b[1] - a[1])]


def _lerp_y(a, b, y):
    t = (y - a[1]) / (b[1] - a[1]) if b[1] != a[1] else 0
    return [a[0] + t * (b[0] - a[0]), y]


def clip_polyline(coords, rect):
    """Cohen-Sutherland-ish segment clip; returns a list of sub-polylines."""
    minx, miny, maxx, maxy = rect

    def code(p):
        c = 0
        if p[0] < minx: c |= 1
        if p[0] > maxx: c |= 2
        if p[1] < miny: c |= 4
        if p[1] > maxy: c |= 8
        return c

    def clip_seg(p0, p1):
        c0, c1 = code(p0), code(p1)
        p0, p1 = list(p0), list(p1)
        for _ in range(8):
            if not (c0 | c1):
                return (p0, p1)
            if c0 & c1:
                return None
            co = c0 or c1
            if co & 8:
                x = p0[0] + (p1[0]-p0[0])*(maxy-p0[1])/(p1[1]-p0[1]); y = maxy
            elif co & 4:
                x = p0[0] + (p1[0]-p0[0])*(miny-p0[1])/(p1[1]-p0[1]); y = miny
            elif co & 2:
                y = p0[1] + (p1[1]-p0[1])*(maxx-p0[0])/(p1[0]-p0[0]); x = maxx
            else:
                y = p0[1] + (p1[1]-p0[1])*(minx-p0[0])/(p1[0]-p0[0]); x = minx
            if co == c0:
                p0 = [x, y]; c0 = code(p0)
            else:
                p1 = [x, y]; c1 = code(p1)
        return None

    lines, cur = [], []
    for i in range(len(coords) - 1):
        seg = clip_seg(coords[i], coords[i + 1])
        if seg is None:
            if len(cur) >= 2:
                lines.append(cur)
            cur = []
            continue
        a, b = seg
        if not cur:
            cur = [a, b]
        elif cur[-1] == a:
            cur.append(b)
        else:
            if len(cur) >= 2:
                lines.append(cur)
            cur = [a, b]
    if len(cur) >= 2:
        lines.append(cur)
    return lines


def sample_along(pts, spacing):
    out = []
    carry = 0.0
    for i in range(len(pts) - 1):
        ax, ay = pts[i]
        bx, by = pts[i + 1]
        seg_len = math.hypot(bx - ax, by - ay)
        if seg_len < 1e-6:
            continue
        d = carry
        while d < seg_len:
            t = d / seg_len
            out.append((ax + (bx - ax) * t, ay + (by - ay) * t))
            d += spacing
        carry = d - seg_len
    return out


# Outside the original city core only the ring and REGION_MARGIN metres
# around it are kept; beyond that the procedural Ommelanden take over
# (countryedge.js derives its edge from where the data stops).
CORE_RECT = (-1919.6, -1833.9, 1919.6, 1833.9)
REGION_MARGIN = 320.0
REGION_CELL = 20.0


def region_mask(roads, world_rect):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from ringloop import route_loop
    loop = [(p[0], p[1]) for p in route_loop(roads)]
    x0, y0, x1, y1 = world_rect
    w, h = int((x1 - x0) / REGION_CELL) + 1, int((y1 - y0) / REGION_CELL) + 1
    cells = bytearray(w * h)
    # inside the loop: scanline fill per cell row
    for j in range(h):
        cy = y0 + (j + 0.5) * REGION_CELL
        xs = []
        for (ax, ay), (bx, by) in zip(loop, loop[1:] + loop[:1]):
            if (ay <= cy) != (by <= cy):
                xs.append(ax + (cy - ay) * (bx - ax) / (by - ay))
        xs.sort()
        for a, b in zip(xs[::2], xs[1::2]):
            for i in range(max(0, int((a - x0) / REGION_CELL)), min(w, int((b - x0) / REGION_CELL) + 1)):
                cells[j * w + i] = 1
    # margin around the loop
    r = int(REGION_MARGIN / REGION_CELL) + 1
    for (ax, ay), (bx, by) in zip(loop, loop[1:] + loop[:1]):
        L = math.hypot(bx - ax, by - ay)
        for k in range(int(L / REGION_CELL) + 1):
            t = k * REGION_CELL / L if L else 0
            px, py = ax + (bx - ax) * t, ay + (by - ay) * t
            ci, cj = int((px - x0) / REGION_CELL), int((py - y0) / REGION_CELL)
            for dj in range(-r, r + 1):
                for di in range(-r, r + 1):
                    i, j = ci + di, cj + dj
                    if 0 <= i < w and 0 <= j < h and (di * di + dj * dj) * REGION_CELL ** 2 <= REGION_MARGIN ** 2:
                        cells[j * w + i] = 1

    def inside(x, y):
        if CORE_RECT[0] <= x <= CORE_RECT[2] and CORE_RECT[1] <= y <= CORE_RECT[3]:
            return True
        i, j = int((x - x0) / REGION_CELL), int((y - y0) / REGION_CELL)
        return 0 <= i < w and 0 <= j < h and cells[j * w + i] == 1
    return inside, loop


def centroid(pts):
    xs, ys = [p[0] for p in pts[:-1]] or [0], [p[1] for p in pts[:-1]] or [0]
    return sum(xs) / len(xs), sum(ys) / len(ys)


def crop_to_ring(roads, buildings, water, green, trees, world_rect):
    inside, loop = region_mask(roads, world_rect)
    out_roads = []
    for r in roads:
        pts = r["pts"]
        flags = [inside(*p) for p in pts]
        if all(flags):
            out_roads.append(r)
            continue
        # keep runs inside the region plus one vertex beyond each end
        i, n = 0, len(pts)
        while i < n:
            if not flags[i]:
                i += 1
                continue
            j = i
            while j + 1 < n and flags[j + 1]:
                j += 1
            a, b = max(0, i - 1), min(n - 1, j + 1)
            if b > a:
                out_roads.append({**r, "pts": pts[a:b + 1]})
            i = j + 1
    out_bld = [b for b in buildings if inside(*centroid(b["pts"]))]
    out_water = [w for w in water if any(inside(*p) for p in w["pts"])]
    out_green = [g for g in green if inside(*centroid(g["pts"])) or sum(inside(*p) for p in g["pts"]) * 2 > len(g["pts"])]
    out_trees = [t for t in trees if inside(*t)]
    L = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(loop, loop[1:] + loop[:1]))
    print(f"ring loop {L:.0f} m; kept roads {len(out_roads)}/{len(roads)} buildings {len(out_bld)}/{len(buildings)} "
          f"water {len(out_water)}/{len(water)} green {len(out_green)}/{len(green)} trees {len(out_trees)}/{len(trees)}")
    return out_roads, out_bld, out_water, out_green, out_trees


def load_elements():
    elements, seen = [], set()
    for path in SRC:
        if not os.path.exists(path):
            print(f"missing {path} (run scripts/fetch_osm.py)", file=sys.stderr)
            continue
        with (gzip.open(path, "rt") if path.endswith(".gz") else open(path)) as f:
            for el in json.load(f)["elements"]:
                key = (el.get("type"), el.get("id"))
                if key in seen:
                    continue
                seen.add(key)
                elements.append(el)
    return elements


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


def mark_jetties(roads, water):
    """Footways that run out over the water (steigers to the houseboats)
    without a bridge tag: walkable decks like a bridge, not a path drawn on
    water the walker then sinks into."""
    boxes = []
    for w in water:
        xs, ys = [p[0] for p in w["pts"]], [p[1] for p in w["pts"]]
        boxes.append((min(xs), min(ys), max(xs), max(ys), w["pts"]))

    def wet(x, y):
        return any(x0 <= x <= x1 and y0 <= y <= y1 and point_in_poly(x, y, P) for x0, y0, x1, y1, P in boxes)

    n = 0
    for r in roads:
        if r["cat"] != "foot" or r["bridge"] or r.get("tunnel"):
            continue
        pts = r["pts"]
        samples = []
        for a, b in zip(pts, pts[1:]):
            k = max(1, int(math.hypot(b[0] - a[0], b[1] - a[1]) / 2))
            samples += [(a[0] + (b[0] - a[0]) * i / k, a[1] + (b[1] - a[1]) * i / k) for i in range(k)]
        samples.append(tuple(pts[-1]))
        if len(samples) >= 5 and sum(wet(x, y) for x, y in samples) >= 0.6 * len(samples):
            r["bridge"] = True
            r["jetty"] = True
            n += 1
    return n


def int_tag(tags, key):
    try:
        return int(str(tags.get(key, "0")).split(";")[0])
    except ValueError:
        return 0


def hidden_structure(tags):
    """Building ways that are not a block standing on the street: underground
    garages and bike parkings (layer < 0 unless mapped at the surface) and
    bridge piers. Extruded from the ground they close off the streets and
    squares on top of them."""
    if tags.get("bridge:support"):
        return "pier"
    if tags.get("location") == "underground":
        return "underground"
    if int_tag(tags, "layer") < 0 and tags.get("location") not in ("surface", "overground", "roof", "rooftop"):
        return "underground"
    return None


def main():
    elements = load_elements()

    wx0, wy0 = project(BBOX_SOUTH, BBOX_WEST)
    wx1, wy1 = project(BBOX_NORTH, BBOX_EAST)
    world_rect = (min(wx0, wx1) - PAD, min(wy0, wy1) - PAD,
                  max(wx0, wx1) + PAD, max(wy0, wy1) + PAD)
    rminx, rminy, rmaxx, rmaxy = world_rect

    roads, buildings, water, green, trees = [], [], [], [], []

    for el in elements:
        if el.get("type") == "node" and el.get("tags", {}).get("natural") == "tree":
            x, y = project(el["lat"], el["lon"])
            if rminx <= x <= rmaxx and rminy <= y <= rmaxy:
                trees.append([x, y])
            continue

        if el.get("type") != "way" or "geometry" not in el:
            continue
        tags = el.get("tags", {})
        geom = el["geometry"]
        if any(pt is None for pt in geom) or len(geom) < 2:
            continue
        coords = [project(pt["lat"], pt["lon"]) for pt in geom]

        if tags.get("natural") == "tree_row":
            for line in clip_polyline(coords, world_rect):
                for x, y in sample_along(line, TREE_ROW_SPACING):
                    trees.append([round(x, 1), round(y, 1)])
            continue

        if "building" in tags:
            if not is_closed(coords) or len(coords) < 4 or hidden_structure(tags):
                continue
            poly = clip_polygon(coords, world_rect)
            if len(poly) < 4:
                continue
            levels = tags.get("building:levels")
            try:
                levels = max(1, int(float(levels)))
            except (TypeError, ValueError):
                levels = 2 if tags.get("building") in ("house", "detached") else 3
            buildings.append({
                "pts": poly,
                "h": levels,
                "name": tags.get("name"),
                "type": tags.get("building") or "yes",
            })
            continue

        hw = tags.get("highway")
        if hw in ROAD_SPEC:
            spec = ROAD_SPEC[hw]
            width = spec["width"]
            tag_width = tags.get("width") or tags.get("est_width")
            if tag_width:
                try:
                    width = max(2.5, float(str(tag_width).split()[0].replace(",", ".")))
                except ValueError:
                    pass
            elif tags.get("lanes"):
                # no explicit width tag, but a lane count is a real signal -
                # ~3.1m/lane plus a little for shoulders/markings, only ever
                # used to widen (never narrow) the category default
                try:
                    lane_count = int(str(tags["lanes"]).split(";")[0])
                    width = max(width, lane_count * 3.1 + 0.6)
                except ValueError:
                    pass
            # junction=roundabout implies oneway even without an explicit tag -
            # otherwise traffic AI happily routes the wrong way around a circle
            is_roundabout = tags.get("junction") == "roundabout"
            oneway = is_roundabout or tags.get("oneway") in ("yes", "1", "true")
            bridge_tag = tags.get("bridge")
            is_bridge = bridge_tag is not None and bridge_tag != "no"
            if not is_bridge and tags.get("layer") is not None:
                try:
                    is_bridge = int(tags["layer"]) > 0
                except ValueError:
                    pass
            # grade-separation tags, read by add_elevation.py
            grade = {}
            layer = int_tag(tags, "layer")
            if layer:
                grade["layer"] = layer
            if tags.get("tunnel") in ("yes", "culvert"):
                grade["tunnel"] = True
            if bridge_tag == "viaduct":
                grade["viaduct"] = True
            for k in ("cutting", "embankment"):
                if tags.get(k) not in (None, "no"):
                    grade[k] = True
            if tags.get("ref"):
                grade["ref"] = tags["ref"]
            for line in clip_polyline(coords, world_rect):
                roads.append({
                    "pts": line,
                    "type": hw,
                    "cat": spec["cat"],
                    "width": width,
                    "speed": spec["speed"],
                    "oneway": oneway,
                    "roundabout": is_roundabout,
                    "name": tags.get("name"),
                    "bridge": is_bridge,
                    **grade,
                })
            continue

        if tags.get("natural") == "water" or tags.get("waterway") == "riverbank":
            if not is_closed(coords) or len(coords) < 4:
                continue
            # water under a deck or building (layer < 0) is not open water
            if (int_tag(tags, "layer") or 0) < 0 or tags.get("covered") == "yes":
                continue
            poly = clip_polygon(coords, world_rect)
            if len(poly) < 4:
                continue
            water.append({"pts": poly, "name": tags.get("name")})
            continue

        if tags.get("leisure") in ("park", "garden", "playground", "pitch", "dog_park") or \
           tags.get("landuse") in ("grass", "forest", "meadow", "cemetery"):
            if not is_closed(coords) or len(coords) < 4:
                continue
            poly = clip_polygon(coords, world_rect)
            if len(poly) < 4:
                continue
            green.append({"pts": poly, "kind": tags.get("leisure") or tags.get("landuse")})
            continue

    roads, buildings, water, green, trees = crop_to_ring(roads, buildings, water, green, trees, world_rect)
    print(f"jetties: {mark_jetties(roads, water)} footways over the water marked as decks")

    minx, miny, maxx, maxy = world_rect
    out = {
        "meta": {
            "origin": {"lat": LAT0, "lon": LON0},
            "bounds": [minx, miny, maxx, maxy],
            "mPerDegLat": M_PER_DEG_LAT,
            "mPerDegLon": M_PER_DEG_LON,
        },
        "roads": roads,
        "buildings": buildings,
        "water": water,
        "green": green,
        "trees": trees,
    }

    with open(DST, "w") as f:
        json.dump(out, f, separators=(",", ":"))

    print(f"roads={len(roads)} buildings={len(buildings)} water={len(water)} green={len(green)} trees={len(trees)}")
    print(f"world bounds: x[{minx:.0f},{maxx:.0f}] y[{miny:.0f},{maxy:.0f}]  "
          f"({maxx-minx:.0f}m x {maxy-miny:.0f}m)")
    import os
    print(f"output size: {os.path.getsize(DST)/1024:.0f} KB -> {DST}")


if __name__ == "__main__":
    main()
