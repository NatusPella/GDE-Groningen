#!/usr/bin/env python3
"""Tag the real-world Groningen landmarks (from OSM, verified against
data/landmarks_raw.json + a manual Der Aa-kerk lookup) onto the matching
building polygons in game/citymap.json, and record a spawn-candidate list in
meta.landmarks so the player starts each game in front of a different one.
"""
import json
import math

MAP_PATH = "game/citymap.json"

# (name, lat, lon, kind) - kind drives both the special render color and
# whether we look for a matching building polygon at all.
LANDMARKS = [
    ("Martinitoren", 53.2193802, 6.568211, "tower"),
    ("Martinikerk", 53.2195095, 6.5688553, "church"),
    ("Grote Markt", 53.2188, 6.5665, "square"),
    ("Vismarkt", 53.2172, 6.5652, "square"),
    ("Der Aa-kerk", 53.2162569, 6.5620041, "church"),
    ("Forum Groningen", 53.2189294, 6.5703446, "modern"),
    ("Groninger Museum", 53.21228, 6.5660637, "museum"),
    ("Hoofdstation Groningen", 53.2109237, 6.5641028, "station"),
    ("Prinsentuin", 53.2213595, 6.5689793, "garden"),
    ("Academiegebouw", 53.2197919, 6.5628558, "university"),
    ("Goudkantoor", 53.2184874, 6.5662801, "historic"),
    ("Noorderplantsoen", 53.226, 6.567, "park"),
    ("Winkelcentrum Paddepoel", 53.2301068, 6.5440612, "mall"),
    ("Euroborg", 53.2061414, 6.5915542, "stadium"),
]


# Landmarks that are a complex of buildings: every footprint whose centre lies
# in the OSM outline (cache, way id) gets the tag, not just the nearest one.
OUTLINES = {
    "Winkelcentrum Paddepoel": ("data/pois_raw.json", 167055945),
}


def load_outline(path, way_id, project):
    try:
        with open(path) as f:
            els = json.load(f)["elements"]
    except (OSError, ValueError, KeyError):
        return None
    for e in els:
        if e.get("type") == "way" and e.get("id") == way_id and e.get("geometry"):
            return [project(g["lat"], g["lon"]) for g in e["geometry"]]
    return None


def polygon_bounds(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def point_in_polygon(px, py, poly):
    inside = False
    n = len(poly)
    for i in range(n):
        j = (i - 1) % n
        xi, yi = poly[i]
        xj, yj = poly[j]
        if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi) + xi):
            inside = not inside
    return inside


def main():
    with open(MAP_PATH) as f:
        data = json.load(f)
    meta = data["meta"]
    lat0, lon0 = meta["origin"]["lat"], meta["origin"]["lon"]
    m_lat, m_lon = meta["mPerDegLat"], meta["mPerDegLon"]

    def project(lat, lon):
        return (lon - lon0) * m_lon, (lat0 - lat) * m_lat

    buildings = data["buildings"]
    out_landmarks = []
    tagged = 0

    for name, lat, lon, kind in LANDMARKS:
        x, y = project(lat, lon)
        entry = {"name": name, "x": round(x, 1), "y": round(y, 1), "kind": kind}
        outline = load_outline(*OUTLINES[name], project) if name in OUTLINES else None
        if outline:
            n = 0
            for b in buildings:
                if b.get("type") == "roof" or len(b["pts"]) < 4:
                    continue
                cx = sum(p[0] for p in b["pts"][:-1]) / (len(b["pts"]) - 1)
                cy = sum(p[1] for p in b["pts"][:-1]) / (len(b["pts"]) - 1)
                if point_in_polygon(cx, cy, outline):
                    b["landmark"] = name
                    b["landmarkKind"] = kind
                    n += 1
            if n:
                tagged += 1
                entry["buildingMatched"] = True
                print(f"  {name}: {n} buildings in the outline")
        elif kind in ("tower", "church", "modern", "museum", "university", "historic", "station", "mall", "stadium"):
            best, best_d2 = None, 1600  # within 40m if not a direct polygon hit
            for b in buildings:
                minx, miny, maxx, maxy = polygon_bounds(b["pts"])
                if not (minx - 40 <= x <= maxx + 40 and miny - 40 <= y <= maxy + 40):
                    continue
                if point_in_polygon(x, y, b["pts"]):
                    best = b
                    best_d2 = -1
                    break
                cx, cy = (minx + maxx) / 2, (miny + maxy) / 2
                d2 = (cx - x) ** 2 + (cy - y) ** 2
                if d2 < best_d2:
                    best, best_d2 = b, d2
            if best is not None:
                best["landmark"] = name
                best["landmarkKind"] = kind
                tagged += 1
                entry["buildingMatched"] = True
        out_landmarks.append(entry)

    meta["landmarks"] = out_landmarks

    with open(MAP_PATH, "w") as f:
        json.dump(data, f, separators=(",", ":"))

    print(f"tagged {tagged}/{len(LANDMARKS)} landmarks to a building polygon")
    for e in out_landmarks:
        print(f"  {e['name']:28s} {e['kind']:10s} matched={e.get('buildingMatched', False)}")


if __name__ == "__main__":
    main()
