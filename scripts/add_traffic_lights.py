#!/usr/bin/env python3
"""Fetch real Groningen traffic-signal nodes from OSM and merge them into
game/citymap.json as meta.trafficLights: [{x, y[, crossing][, bike]}].

Covers junction signals (highway=traffic_signals) and signalised pedestrian /
cycle crossings (crossing=traffic_signals). Each node is snapped onto the road
it belongs to; nodes on cycle paths only get bike=1, nodes on roads the game
does not carry are dropped. Only meta.trafficLights is rewritten; every other
key in the file is preserved.

The raw Overpass response is cached in data/traffic_signals_raw.json; pass
--refresh to fetch it again.
"""
import json
import math
import os
import subprocess
import sys

MAP_PATH = "game/citymap.json"
CACHE_PATH = "data/traffic_signals_raw.json"
OVERPASS_URLS = [
    "https://overpass.private.coffee/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]
CAR_CATS = {"major", "normal", "minor"}
SNAP_CAR = 2.5
SNAP_CYCLE = 1.5


def fetch(bbox):
    s, w, n, e = bbox
    area = f"({s:.5f},{w:.5f},{n:.5f},{e:.5f})"
    query = (
        "[out:json][timeout:90];("
        f'node["highway"="traffic_signals"]{area};'
        f'node["crossing"="traffic_signals"]{area};'
        ");out;"
    )
    for url in OVERPASS_URLS:
        result = subprocess.run(
            ["curl", "-s", "-m", "120", "-A", "Mozilla/5.0", "--data-urlencode", f"data={query}", url],
            capture_output=True, text=True,
        )
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError:
            print(f"overpass {url} failed, trying next", file=sys.stderr)
    raise SystemExit("all overpass endpoints failed")


def nearest_on(roads, x, y):
    best = (math.inf, None)
    for r in roads:
        b = r["_bounds"]
        if x < b[0] - 5 or x > b[2] + 5 or y < b[1] - 5 or y > b[3] + 5:
            continue
        pts = r["pts"]
        for i in range(len(pts) - 1):
            ax, ay = pts[i]
            bx, by = pts[i + 1]
            dx, dy = bx - ax, by - ay
            l2 = dx * dx + dy * dy or 1
            t = max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / l2))
            px, py = ax + dx * t, ay + dy * t
            d = math.hypot(x - px, y - py)
            if d < best[0]:
                best = (d, (px, py))
    return best


def main():
    with open(MAP_PATH) as f:
        meta = json.load(f)["meta"]
    lat0, lon0 = meta["origin"]["lat"], meta["origin"]["lon"]
    m_lat, m_lon = meta["mPerDegLat"], meta["mPerDegLon"]
    x0, y0, x1, y1 = meta["bounds"]
    bbox = (lat0 - y1 / m_lat - 0.001, lon0 + x0 / m_lon - 0.001, lat0 - y0 / m_lat + 0.001, lon0 + x1 / m_lon + 0.001)

    if "--refresh" in sys.argv or not os.path.exists(CACHE_PATH):
        raw = fetch(bbox)
        with open(CACHE_PATH, "w") as f:
            json.dump(raw, f)
    with open(CACHE_PATH) as f:
        raw = json.load(f)

    with open(MAP_PATH) as f:
        roads = json.load(f)["roads"]
    for r in roads:
        xs = [p[0] for p in r["pts"]]
        ys = [p[1] for p in r["pts"]]
        r["_bounds"] = (min(xs), min(ys), max(xs), max(ys))
    car = [r for r in roads if r["cat"] in CAR_CATS]
    cycle = [r for r in roads if r["cat"] == "cycle"]

    out, seen = [], set()
    counts = {"car": 0, "crossing": 0, "bike": 0, "dropped": 0}
    for el in raw["elements"]:
        if el.get("type") != "node":
            continue
        tags = el.get("tags", {})
        if tags.get("traffic_signals") == "emergency":
            continue
        x, y = (el["lon"] - lon0) * m_lon, (lat0 - el["lat"]) * m_lat
        if not (x0 < x < x1 and y0 < y < y1):
            continue
        crossing = tags.get("highway") == "crossing" or tags.get("traffic_signals") == "crossing"
        d, p = nearest_on(car, x, y)
        entry = None
        if d < SNAP_CAR:
            entry = {"x": round(p[0], 1), "y": round(p[1], 1)}
            if crossing:
                entry["crossing"] = 1
            counts["crossing" if crossing else "car"] += 1
        else:
            d, p = nearest_on(cycle, x, y)
            if d < SNAP_CYCLE:
                entry = {"x": round(p[0], 1), "y": round(p[1], 1), "bike": 1}
                counts["bike"] += 1
        if not entry:
            counts["dropped"] += 1
            continue
        key = (entry["x"], entry["y"])
        if key in seen:
            continue
        seen.add(key)
        out.append(entry)

    # re-read right before writing so concurrent edits to other keys survive
    with open(MAP_PATH) as f:
        data = json.load(f)
    data["meta"]["trafficLights"] = out
    with open(MAP_PATH, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(f"traffic lights: {len(out)} ({counts})")


if __name__ == "__main__":
    main()
