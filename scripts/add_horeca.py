#!/usr/bin/env python3
"""Fetch real Groningen bar/restaurant/cafe/pub locations from OpenStreetMap
and merge them into game/citymap.json's meta as meta.horeca, for the
"Horeca-tour" pub-crawl mission.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from osmfetch import bbox_str, cached, map_bbox, near_data  # noqa: E402

MAP_PATH = "game/citymap.json"

CACHE_PATH = "data/horeca_raw.json"


def overpass_query(bbox):
    return '[out:json][timeout:90];nwr["amenity"~"^(bar|restaurant|cafe|pub)$"]' + bbox_str(bbox) + ';out center tags;'


def fetch_horeca(meta):
    data = cached(CACHE_PATH, map_bbox(meta), overpass_query)
    out = []
    for el in data.get("elements", []):
        if "lat" in el and "lon" in el:
            lat, lon = el["lat"], el["lon"]
        elif "center" in el:
            lat, lon = el["center"]["lat"], el["center"]["lon"]
        else:
            continue
        name = el.get("tags", {}).get("name", "Horeca")
        out.append((name, lat, lon))
    return out


def main():
    with open(MAP_PATH) as f:
        data = json.load(f)
    meta = data["meta"]
    lat0, lon0 = meta["origin"]["lat"], meta["origin"]["lon"]
    m_lat, m_lon = meta["mPerDegLat"], meta["mPerDegLon"]

    def project(lat, lon):
        return (lon - lon0) * m_lon, (lat0 - lat) * m_lat

    horeca_raw = fetch_horeca(meta)
    ok = near_data(data)
    out_horeca = []
    for name, lat, lon in horeca_raw:
        x, y = project(lat, lon)
        if not ok(x, y):
            continue
        out_horeca.append({"name": name, "x": round(x, 1), "y": round(y, 1)})

    meta["horeca"] = out_horeca

    with open(MAP_PATH, "w") as f:
        json.dump(data, f, separators=(",", ":"))

    print(f"added {len(out_horeca)} horeca spots to meta.horeca")
    for h in out_horeca[:20]:
        print(f"  {h['name']:32s} ({h['x']}, {h['y']})")
    if len(out_horeca) > 20:
        print(f"  ... and {len(out_horeca) - 20} more")


if __name__ == "__main__":
    main()
