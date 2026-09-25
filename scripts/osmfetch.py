"""Shared Overpass access for the add_*.py scripts: the query box follows
game/citymap.json's meta.bounds, responses are cached in data/ together with
the box they cover and refetched when the map grows (or with --refresh)."""
import json
import os
import subprocess
import sys
import time

URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]


def map_bbox(meta, pad=0.001):
    """(south, west, north, east) around the map bounds."""
    lat0, lon0 = meta["origin"]["lat"], meta["origin"]["lon"]
    m_lat, m_lon = meta["mPerDegLat"], meta["mPerDegLon"]
    x0, y0, x1, y1 = meta["bounds"]
    return (round(lat0 - y1 / m_lat - pad, 5), round(lon0 + x0 / m_lon - pad, 5),
            round(lat0 - y0 / m_lat + pad, 5), round(lon0 + x1 / m_lon + pad, 5))


def bbox_str(b):
    return "({:.5f},{:.5f},{:.5f},{:.5f})".format(*b)


def covers(have, want):
    return bool(have) and have[0] <= want[0] and have[1] <= want[1] and have[2] >= want[2] and have[3] >= want[3]


def overpass(query):
    for attempt in range(3):
        for url in URLS:
            r = subprocess.run(["curl", "-s", "-m", "300", "-A", "GTE-VI-mapbuilder/1.0",
                                "--data-urlencode", f"data={query}", url],
                               capture_output=True, text=True)
            txt = r.stdout.strip()
            if r.returncode == 0 and txt.startswith("{") and txt.endswith("}"):
                try:
                    return json.loads(txt)
                except ValueError:
                    pass
            print(f"  overpass {url} failed, trying next", file=sys.stderr)
        time.sleep(10)
    raise SystemExit("all overpass endpoints failed")


def cached(path, bbox, make_query):
    """Overpass JSON for make_query(bbox), from path when it covers bbox."""
    if "--refresh" not in sys.argv and os.path.exists(path):
        with open(path) as f:
            raw = json.load(f)
        if covers(raw.get("bbox"), bbox):
            return raw
    raw = overpass(make_query(bbox))
    raw["bbox"] = list(bbox)
    with open(path, "w") as f:
        json.dump(raw, f)
    return raw


def near_data(data, cell=50.0):
    """Predicate: is (x, y) within about a cell of a building or car road?
    Keeps POIs out of the fields beyond the mapped area."""
    occ = set()
    for b in data["buildings"]:
        for p in b["pts"][::3]:
            occ.add((int(p[0] // cell), int(p[1] // cell)))
    for r in data["roads"]:
        if r.get("cat") in ("major", "normal", "minor"):
            for p in r["pts"]:
                occ.add((int(p[0] // cell), int(p[1] // cell)))

    def ok(x, y):
        i, j = int(x // cell), int(y // cell)
        return any((i + di, j + dj) in occ for di in (-1, 0, 1) for dj in (-1, 0, 1))
    return ok
