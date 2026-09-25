#!/usr/bin/env python3
"""Fetch the OSM ways around the city core (the full ringweg + ~300 m of
surroundings) into data/ring_raw.json.gz and data/ring_extra.json.gz.

The city core itself keeps coming from data/groningen_raw.json and
data/groningen_extra.json (the original 2026-09-17 extract the game was
tuned on). These caches only hold what those lack: every element whose id is
not in the core caches and that reaches outside the core query bbox, with
tags trimmed to what process_osm.py reads.

    python3 scripts/fetch_osm.py            # fetch from Overpass
    python3 scripts/fetch_osm.py --from DIR # reuse DIR/{roads,bld,wg,extra}.json
"""
import gzip
import json
import os
import subprocess
import sys
import time

CORE_SRC = ["data/groningen_raw.json", "data/groningen_extra.json"]
CORE_BBOX = (53.204, 6.538, 53.235, 6.592)
# Westelijke/Noordelijke/Oostelijke/Zuidelijke Ringweg incl. Julianaplein,
# Europaplein, Euvelgunne and Noorderhoogebrug, plus ~300 m around them
BBOX = (53.1975, 6.5225, 53.2525, 6.626)
DST = "data/ring_raw.json.gz"
DST_EXTRA = "data/ring_extra.json.gz"

URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]

HW = "motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|residential|unclassified|service|living_street|pedestrian"
B = "({},{},{},{})".format(*BBOX)
QUERIES = {
    "roads": f'[out:json][timeout:300];way["highway"~"^({HW})$"]{B};out geom;',
    "bld": f'[out:json][timeout:300];way["building"]{B};out geom;',
    "wg": ('[out:json][timeout:300];('
           f'way["natural"="water"]{B};way["waterway"="riverbank"]{B};'
           f'way["leisure"~"^(park|garden|pitch|playground)$"]{B};'
           f'way["landuse"~"^(grass|forest|meadow|cemetery)$"]{B};);out geom;'),
    "extra": ('[out:json][timeout:300];('
              f'way["highway"~"^(cycleway|footway|steps|track)$"]{B};'
              f'node["natural"="tree"]{B};way["natural"="tree_row"]{B};);out geom;'),
}

KEEP_TAGS = {
    "highway", "name", "ref", "width", "est_width", "lanes", "oneway", "junction",
    "bridge", "tunnel", "layer", "cutting", "embankment", "covered",
    "building", "building:levels", "natural", "waterway", "leisure", "landuse",
}


def overpass(query):
    for attempt in range(3):
        for url in URLS:
            r = subprocess.run(["curl", "-s", "-m", "400", "-A", "GTE-VI-mapbuilder/1.0",
                                "--data-urlencode", f"data={query}", url],
                               capture_output=True, text=True)
            txt = r.stdout.lstrip()
            if r.returncode == 0 and txt.startswith("{") and txt.rstrip().endswith("}"):
                return json.loads(txt)["elements"]
            print(f"  {url} failed, trying next", file=sys.stderr)
        time.sleep(15)
    raise SystemExit("all Overpass endpoints failed")


def in_core(lat, lon):
    s, w, n, e = CORE_BBOX
    return s <= lat <= n and w <= lon <= e


def trim(el):
    out = {"type": el["type"], "id": el["id"]}
    tags = {k: v for k, v in el.get("tags", {}).items() if k in KEEP_TAGS}
    if tags:
        out["tags"] = tags
    if el["type"] == "node":
        out["lat"], out["lon"] = round(el["lat"], 7), round(el["lon"], 7)
    else:
        out["geometry"] = [None if p is None else {"lat": round(p["lat"], 7), "lon": round(p["lon"], 7)}
                           for p in el.get("geometry", [])]
    return out


def main():
    src_dir = sys.argv[sys.argv.index("--from") + 1] if "--from" in sys.argv else None
    core = set()
    for path in CORE_SRC:
        with open(path) as f:
            core.update((e["type"], e["id"]) for e in json.load(f)["elements"])

    buckets = {"main": [], "extra": []}
    for key, query in QUERIES.items():
        if src_dir:
            with open(os.path.join(src_dir, key + ".json")) as f:
                elements = json.load(f)["elements"]
        else:
            print(f"fetching {key} ...")
            elements = overpass(query)
        kept = 0
        for el in elements:
            if (el["type"], el["id"]) in core:
                continue
            if el["type"] == "node":
                if in_core(el["lat"], el["lon"]):
                    continue
            else:
                geom = [p for p in el.get("geometry", []) if p]
                if not geom or all(in_core(p["lat"], p["lon"]) for p in geom):
                    continue
            buckets["extra" if key == "extra" else "main"].append(trim(el))
            kept += 1
        print(f"{key}: {len(elements)} elements, {kept} outside the core caches")

    for dst, items in ((DST, buckets["main"]), (DST_EXTRA, buckets["extra"])):
        with gzip.open(dst, "wt") as f:
            json.dump({"bbox": BBOX, "elements": items}, f, separators=(",", ":"))
        print(f"{dst}: {len(items)} elements, {os.path.getsize(dst) / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
