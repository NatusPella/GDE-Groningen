#!/usr/bin/env python3
"""Landmark footprint fixes on top of add_landmarks.py (idempotent).

- Groninger Museum and Euroborg are OSM multipolygon/leisure features that
  process_osm.py never turned into buildings: add them from
  data/landmark_footprints.json (museum: outer ring + its pavilions, which
  landmarks3d.js models one by one; Euroborg: four stands around the pitch).
- Der Aa-kerk and Groninger Museum were tagged onto the wrong (tiny)
  polygons by the nearest-centre search: move/remove those tags.
- Forum Groningen exists twice in OSM with a ~0.3 m offset (so mapdata's
  dedupe misses it): drop the untagged copy that hid the landmark.
"""
import json
import math

MAP_PATH = "game/citymap.json"
SRC = "data/landmark_footprints.json"


def bounds(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def centre(pts):
    x0, y0, x1, y1 = bounds(pts)
    return (x0 + x1) / 2, (y0 + y1) / 2


def euroborg_stands(pitch):
    x0, y0, x1, y1 = bounds(pitch)
    m, depth, c = 5.0, 25.0, 18.0
    ix0, iy0, ix1, iy1 = x0 - m, y0 - m, x1 + m, y1 + m
    ox0, oy0, ox1, oy1 = ix0 - depth - 3, iy0 - depth, ix1 + depth + 3, iy1 + depth
    r = lambda pts: [[round(a, 1), round(b, 1)] for a, b in pts]
    return {
        "N": r([(ox0, oy0 + c), (ox0 + c, oy0), (ox1 - c, oy0), (ox1, oy0 + c), (ix1, iy0), (ix0, iy0)]),
        "E": r([(ox1, oy0 + c), (ox1, oy1 - c), (ix1, iy1), (ix1, iy0)]),
        "S": r([(ox1, oy1 - c), (ox1 - c, oy1), (ox0 + c, oy1), (ox0, oy1 - c), (ix0, iy1), (ix1, iy1)]),
        "W": r([(ox0, oy1 - c), (ox0, oy0 + c), (ix0, iy0), (ix0, iy1)]),
    }


def main():
    with open(MAP_PATH) as f:
        data = json.load(f)
    with open(SRC) as f:
        src = json.load(f)
    buildings = data["buildings"]

    out = []
    for b in buildings:
        if b.get("landmarkPart"):
            continue  # re-added below
        if b.get("landmark") in ("Groninger Museum", "Der Aa-kerk") and b.get("type") in ("service", "house"):
            b.pop("landmark", None)
            b.pop("landmarkKind", None)
        if b.get("name") == "Akerk" and b.get("type") == "church":
            b["landmark"] = "Der Aa-kerk"
            b["landmarkKind"] = "church"
        if b.get("name") == "Forum Groningen" and not b.get("landmark"):
            continue
        out.append(b)

    gm = src["groningerMuseum"]
    out.append({
        "pts": gm["outer"], "h": 3, "name": "Groninger Museum", "type": "museum",
        "landmark": "Groninger Museum", "landmarkKind": "museum", "landmarkPart": "museum",
        "parts": gm["parts"],
    })
    for side, pts in euroborg_stands(src["euroborg"]["pitch"]).items():
        out.append({
            "pts": pts, "h": 5, "name": "Euroborg", "type": "stadium",
            "landmark": "Euroborg", "landmarkKind": "stadium", "landmarkPart": "stand" + side,
            "pitch": src["euroborg"]["pitch"],
        })
    data["buildings"] = out

    for lm in data["meta"]["landmarks"]:
        if lm["name"] in ("Groninger Museum", "Euroborg"):
            lm["buildingMatched"] = True

    with open(MAP_PATH, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(f"buildings: {len(buildings)} -> {len(out)}")


if __name__ == "__main__":
    main()
