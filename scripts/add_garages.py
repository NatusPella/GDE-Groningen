#!/usr/bin/env python3
"""Fetch real Groningen car-repair/garage locations from OpenStreetMap and
merge them into game/citymap.json's meta as meta.garages, for the Pay 'n
Spray pickup spots.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from osmfetch import bbox_str, cached, map_bbox, near_data  # noqa: E402
from world.rdnew import project as rd_project  # noqa: E402

MAP_PATH = "game/citymap.json"

CACHE_PATH = "data/garages_raw.json"


def overpass_query(bbox):
    return '[out:json][timeout:90];nwr["shop"~"^(car_repair|car|tyres)$"]' + bbox_str(bbox) + ';out center tags;'


def fetch_garages(meta):
    data = cached(CACHE_PATH, map_bbox(meta), overpass_query)
    out = []
    for el in data.get("elements", []):
        if "lat" in el and "lon" in el:
            lat, lon = el["lat"], el["lon"]
        elif "center" in el:
            lat, lon = el["center"]["lat"], el["center"]["lon"]
        else:
            continue
        name = el.get("tags", {}).get("name", "Garage")
        out.append((name, lat, lon))
    return out


def main():
    with open(MAP_PATH) as f:
        data = json.load(f)
    meta = data["meta"]
    def project(lat, lon):
        return rd_project(lat, lon)

    garages_raw = fetch_garages(meta)
    ok = near_data(data)
    out_garages = []
    for name, lat, lon in garages_raw:
        x, y = project(lat, lon)
        if not ok(x, y):
            continue
        out_garages.append({"name": name, "x": round(x, 1), "y": round(y, 1)})

    meta["garages"] = out_garages

    with open(MAP_PATH, "w") as f:
        json.dump(data, f, separators=(",", ":"))

    print(f"added {len(out_garages)} garages to meta.garages")
    for g in out_garages:
        print(f"  {g['name']:32s} ({g['x']}, {g['y']})")


if __name__ == "__main__":
    main()
