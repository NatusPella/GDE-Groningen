#!/usr/bin/env python3
"""Rebuild game/citymap.json from the OSM caches in data/, in order.

    python3 scripts/build_map.py            # from the caches (fetches what is missing)
    python3 scripts/build_map.py --refresh  # refetch every Overpass cache first

Steps (each script edits game/citymap.json in place, see its docstring):
  fetch_osm             ringweg surroundings -> data/ring_*.json.gz (only if missing)
  process_osm           roads, buildings, water, green, trees (+ grade tags)
  add_elevation         first heights for the ring and its grade-separated junctions
  world/profile.mjs     the network height solver over them (node): grade, vertical
                        curves and clearance per class, tunnels, slip roads
  add_landmarks         landmark tags + meta.landmarks
  add_districts         meta.districts, meta.neighbourhoodPoints
  add_garages           meta.garages
  add_horeca            meta.horeca
  add_traffic_lights    meta.trafficLights
  add_pois              meta.pois
  add_railways          rails, stations, levelCrossings, railRoutes, railLifts
  add_helipad           meta.helipad (+ the UMCG helipad wing)
  add_landmark_footprints
  add_shops             meta.shops
  gen_ringroute         game/js/ringroute.js (the ring race lap)
  fetch_ommeland        the Ommelanden ~12 km round town -> data/ommeland_raw.json.gz (only if missing)
  add_ommeland          game/ommeland.json + game/ommeland.bin (real roads, rails, water,
                        villages and buildings past the city map; needs numpy + Pillow)

Keys another tool added to citymap.json that no step produces are carried
over from the previous file.
"""
import json
import os
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAP = os.path.join(ROOT, "game", "citymap.json")
STAMP = os.path.join(ROOT, "data", "shops_raw.bounds.json")

TOP_KEYS = {"meta", "roads", "buildings", "water", "green", "trees",
            "rails", "stations", "levelCrossings", "railRoutes", "railLifts"}
META_KEYS = {"origin", "bounds", "mPerDegLat", "mPerDegLon", "frame", "rdOrigin", "wgsBox", "landmarks", "districts",
             "neighbourhoodPoints", "garages", "trafficLights", "horeca", "pois", "helipad", "shops"}


def run(script, *args):
    t = time.time()
    print(f"== {script} {' '.join(args)}", flush=True)
    r = subprocess.run([sys.executable, os.path.join("scripts", script + ".py"), *args], cwd=ROOT)
    if r.returncode:
        raise SystemExit(f"{script} failed ({r.returncode})")
    print(f"   {time.time() - t:.1f} s", flush=True)


def run_node(script, *args):
    t = time.time()
    print(f"== {script} {' '.join(args)}", flush=True)
    r = subprocess.run(["node", os.path.join("scripts", script), *args], cwd=ROOT)
    if r.returncode:
        raise SystemExit(f"{script} failed ({r.returncode})")
    print(f"   {time.time() - t:.1f} s", flush=True)


def main():
    refresh = "--refresh" in sys.argv
    extra = ["--refresh"] if refresh else []
    previous = {}
    if os.path.exists(MAP):
        with open(MAP) as f:
            previous = json.load(f)

    if refresh or not os.path.exists(os.path.join(ROOT, "data", "ring_raw.json.gz")):
        run("fetch_osm")
    run("process_osm")
    run("add_elevation")
    run_node("world/profile.mjs", "--write")
    run("add_landmarks")
    run("add_districts")
    run("add_garages", *extra)
    run("add_horeca", *extra)
    run("add_traffic_lights", *extra)
    run("add_pois", *extra)
    if refresh and os.path.exists(os.path.join(ROOT, "data", "railways_raw.json")):
        os.remove(os.path.join(ROOT, "data", "railways_raw.json"))
    run("add_railways")
    run("add_helipad", *extra)
    run("add_landmark_footprints")

    # the shop cache is stamped with the lat/lon box it was fetched for
    with open(MAP) as f:
        bounds = json.load(f)["meta"]["wgsBox"]
    stale = True
    if os.path.exists(STAMP):
        with open(STAMP) as f:
            stale = json.load(f) != bounds
    run("add_shops", *(["--refresh"] if refresh or stale else []))
    with open(STAMP, "w") as f:
        json.dump(bounds, f)

    run("gen_ringroute")
    if refresh or not os.path.exists(os.path.join(ROOT, "data", "ommeland_raw.json.gz")):
        run("fetch_ommeland", *extra)
    run("add_ommeland")

    with open(MAP) as f:
        data = json.load(f)
    carried = []
    for k, v in previous.items():
        if k not in TOP_KEYS and k not in data:
            data[k] = v
            carried.append(k)
    for k, v in previous.get("meta", {}).items():
        if k not in META_KEYS and k not in data["meta"]:
            data["meta"][k] = v
            carried.append("meta." + k)
    if carried:
        print(f"carried over from the previous map: {', '.join(carried)}")
        with open(MAP, "w") as f:
            json.dump(data, f, separators=(",", ":"))
    print(f"{MAP}: {os.path.getsize(MAP) / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
