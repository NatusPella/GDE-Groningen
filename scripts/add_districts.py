#!/usr/bin/env python3
"""Assemble Groningen neighbourhood ("wijk") boundary polygons from OSM
admin_level=10 relations (data/districts_raw.json) and attach them to
game/citymap.json as meta.districts, for the in-game "you are in <wijk>,
<straat>" HUD readout. Falls back to named neighbourhood/quarter POINTS
(no polygon available) so every area still has *a* name to report.
"""
import json
import math

RAW_PATH = "data/districts_raw.json"
MAP_PATH = "game/citymap.json"
EPS = 1e-6


def chain_rings(ways):
    """Stitch a list of way-geometries (each a list of {lat,lon}) sharing
    endpoints into closed rings. Returns a list of rings (list of (lat,lon))."""
    segments = [[(p["lat"], p["lon"]) for p in w] for w in ways if len(w) >= 2]
    rings = []
    while segments:
        ring = segments.pop()
        changed = True
        while changed:
            changed = False
            for i, seg in enumerate(segments):
                if close(ring[-1], seg[0]):
                    ring = ring + seg[1:]
                    segments.pop(i); changed = True; break
                if close(ring[-1], seg[-1]):
                    ring = ring + list(reversed(seg))[1:]
                    segments.pop(i); changed = True; break
                if close(ring[0], seg[-1]):
                    ring = seg[:-1] + ring
                    segments.pop(i); changed = True; break
                if close(ring[0], seg[0]):
                    ring = list(reversed(seg))[:-1] + ring
                    segments.pop(i); changed = True; break
        rings.append(ring)
    return [r for r in rings if len(r) >= 4 and close(r[0], r[-1])]


def close(a, b):
    return abs(a[0] - b[0]) < EPS and abs(a[1] - b[1]) < EPS


def main():
    with open(RAW_PATH) as f:
        raw = json.load(f)
    with open(MAP_PATH) as f:
        mapdata = json.load(f)
    meta = mapdata["meta"]
    lat0, lon0 = meta["origin"]["lat"], meta["origin"]["lon"]
    m_lat, m_lon = meta["mPerDegLat"], meta["mPerDegLon"]

    def project(lat, lon):
        return [round((lon - lon0) * m_lon, 1), round((lat0 - lat) * m_lat, 1)]

    districts = []
    for e in raw["elements"]:
        if e["type"] != "relation" or e.get("tags", {}).get("admin_level") != "10":
            continue
        name = e["tags"].get("name")
        if not name:
            continue
        outer_ways = [m["geometry"] for m in e.get("members", [])
                      if m.get("role") in ("outer", "") and "geometry" in m]
        rings = chain_rings(outer_ways)
        if not rings:
            continue
        polys = [[project(lat, lon) for lat, lon in ring] for ring in rings]
        # keep only rings that actually reach into (or near) our play area
        bx = [p[0] for poly in polys for p in poly]
        by = [p[1] for poly in polys for p in poly]
        if not bx or min(bx) > 2200 or max(bx) < -2200 or min(by) > 2200 or max(by) < -2200:
            continue
        districts.append({"name": name, "rings": polys})

    # fallback point-only neighbourhoods/quarters (no polygon available)
    points = []
    for e in raw["elements"]:
        if e["type"] != "node":
            continue
        tags = e.get("tags", {})
        name = tags.get("name")
        place = tags.get("place")
        if not name or place not in ("suburb", "neighbourhood", "quarter"):
            continue
        x, y = project(e["lat"], e["lon"])
        if abs(x) > 2200 or abs(y) > 2200:
            continue
        points.append({"name": name, "x": x, "y": y, "kind": place})

    meta["districts"] = districts
    meta["neighbourhoodPoints"] = points

    with open(MAP_PATH, "w") as f:
        json.dump(mapdata, f, separators=(",", ":"))

    print(f"districts (polygons): {len(districts)}")
    print(f"neighbourhood points: {len(points)}")


if __name__ == "__main__":
    main()
