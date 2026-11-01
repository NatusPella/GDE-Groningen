#!/usr/bin/env python3
"""Fetch the OSM data of the F1 proefstrook (scripts/world/corridor.mjs:
Stad -> Delfzijl -> Eemshaven) with full geometry, one cache file per
8 x 8 km pack: data/world/corridor/c<pi>_<pj>.json.gz. The world builder
(scripts/world/build_corridor.mjs) reads these before the smaller Ommeland
cache, so every corridor tile gets real outlines, lanes, rail, water, bus
routes and places.

    python3 scripts/world/fetch_corridor.py --dry-run   # the packs and queries, no network
    python3 scripts/world/fetch_corridor.py             # fetch the packs that are missing
    python3 scripts/world/fetch_corridor.py --refresh   # fetch them all again
    python3 scripts/world/fetch_corridor.py --packs 29_-6,30_-6

Overpass, neutral User-Agent (scripts/osmfetch.py), each pack in four
pieces with a pause between calls. Expect ~20 packs, ~60-90 MB raw JSON in
total, ~15-25 MB as gzip caches, 30-60 minutes. OSM data is ODbL
(docs/LICENTIES.md): the caches and tiles are a derived database.
"""
import gzip
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

DST = os.path.join(ROOT, "data", "world", "corridor")
PAUSE = 8  # seconds between Overpass calls

# what the world builder reads (worldbuilder.js fromOsm, build_corridor.mjs)
KEEP = {
    "highway", "name", "ref", "oneway", "junction", "bridge", "tunnel", "layer", "lanes", "lanes:forward", "lanes:backward",
    "lanes:both_ways", "turn:lanes", "turn:lanes:forward", "turn:lanes:backward", "placement", "width", "est_width",
    "maxspeed", "access", "vehicle", "motor_vehicle", "motorcar", "motorroad", "foot", "bicycle", "bus", "psv", "cycleway",
    "cycleway:both", "cycleway:left", "cycleway:right", "segregated", "surface", "cutting", "embankment", "service",
    "railway", "usage", "electrified", "public_transport", "platforms", "station", "train", "bus_stop", "shelter",
    "waterway", "natural", "water", "landuse", "leisure", "man_made", "barrier", "covered", "location", "bridge:support",
    "building", "building:levels", "roof:levels", "roof:shape", "roof:orientation", "height", "min_height", "building:colour",
    "roof:colour", "building:material", "roof:material", "start_date", "ref:bag", "amenity", "religion", "historic",
    "place", "population", "alt_name", "name:gos", "type", "route", "network", "from", "to", "via", "operator:type",
    "leaf_type", "denotation", "seamark:type", "lock", "seasonal", "tidal", "coastline", "boundary", "admin_level",
}
R = 6  # decimals (~0.1 m): the tiles keep 1 cm, the source should not round coarser than OSM's own 1e-7


def queries(b):
    B = "({:.5f},{:.5f},{:.5f},{:.5f})".format(*b)
    return {
        "roads": f'[out:json][timeout:300];way["highway"]{B};out geom;',
        "bld": f'[out:json][timeout:300];way["building"]{B};out geom;',
        "rail": ("[out:json][timeout:200];("
                 f'way["railway"~"^(rail|platform|light_rail)$"]{B};'
                 f'node["railway"~"^(station|halt|level_crossing|stop|signal|buffer_stop)$"]{B};'
                 f'nwr["public_transport"~"^(station|stop_position|platform)$"]["train"="yes"]{B};'
                 ");out geom;"),
        "water": ("[out:json][timeout:300];("
                  f'way["waterway"]{B};way["natural"~"^(water|coastline|wetland|beach|sand)$"]{B};'
                  f'rel["natural"="water"]{B};way["man_made"~"^(dyke|pier|breakwater|groyne)$"]{B};'
                  f'way["landuse"="basin"]{B};'
                  ");out geom;"),
        "land": ("[out:json][timeout:300];("
                 f'way["landuse"]{B};way["leisure"]{B};way["natural"~"^(wood|scrub|heath|grassland|tree_row)$"]{B};'
                 f'node["natural"="tree"]{B};way["barrier"~"^(hedge|wall|fence)$"]{B};'
                 ");out geom;"),
        "bus": ("[out:json][timeout:300];("
                f'rel["route"="bus"]{B};node["highway"="bus_stop"]{B};'
                f'nwr["public_transport"="platform"]["bus"="yes"]{B};nwr["amenity"="bus_station"]{B};'
                ");out geom;"),
        "places": ("[out:json][timeout:200];("
                   f'node["place"]{B};nwr["amenity"="place_of_worship"]{B};'
                   f'nwr["historic"~"^(windmill|monument|castle|manor)$"]{B};nwr["man_made"~"^(windmill|lighthouse|tower|chimney|water_tower|silo)$"]{B};'
                   f'node["power"="generator"]["generator:source"="wind"]{B};'
                   ");out center tags;"),
    }


def slim(e):
    out = {"type": e["type"], "id": e["id"]}
    tags = {k: v for k, v in (e.get("tags") or {}).items() if k in KEEP or k.startswith("name")}
    if tags:
        out["tags"] = tags
    if "lat" in e:
        out["lat"], out["lon"] = round(e["lat"], R), round(e["lon"], R)
    if "center" in e:
        out["center"] = {"lat": round(e["center"]["lat"], R), "lon": round(e["center"]["lon"], R)}
    if "geometry" in e:
        out["g"] = [[round(p["lat"], R), round(p["lon"], R)] for p in e["geometry"] if p]
    if "members" in e:
        out["members"] = [{"type": m.get("type"), "ref": m.get("ref"), "role": m.get("role", ""),
                           **({"g": [[round(p["lat"], R), round(p["lon"], R)] for p in m.get("geometry") or [] if p]} if m.get("geometry") else {}),
                           **({"lat": round(m["lat"], R), "lon": round(m["lon"], R)} if "lat" in m else {})}
                          for m in e["members"]]
    return out


def corridor():
    r = subprocess.run(["node", os.path.join(HERE, "corridor.mjs"), "--json"], capture_output=True, text=True, cwd=ROOT)
    if r.returncode:
        raise SystemExit(r.stderr)
    return json.loads(r.stdout)


def quarters(b):
    s, w, n, e = b
    ms, mw = (s + n) / 2, (w + e) / 2
    return [(s, w, ms, mw), (s, mw, ms, e), (ms, w, n, mw), (ms, mw, n, e)]


def fetch_pack(p):
    from osmfetch import overpass  # noqa: E402 (only when fetching)
    box = (p["s"], p["w"], p["n"], p["e"])
    seen, els = set(), []
    for layer in ("roads", "bld", "rail", "water", "land", "bus", "places"):
        for q in (quarters(box) if layer in ("roads", "bld", "land") else [box]):
            print(f"  {p['pack']} {layer} {q}", flush=True)
            for e in overpass(queries(q)[layer])["elements"]:
                k = (e["type"], e["id"])
                if k not in seen:
                    seen.add(k)
                    els.append(slim(e))
            time.sleep(PAUSE)
    return {"bbox": list(box), "pack": p["pack"], "tiles": p["tiles"], "source": "OpenStreetMap (ODbL), Overpass", "elements": els}


def main():
    c = corridor()
    packs = c["packs"]
    if "--packs" in sys.argv:
        want = set(sys.argv[sys.argv.index("--packs") + 1].split(","))
        packs = [p for p in packs if p["pack"] in want]
    if "--dry-run" in sys.argv:
        print(f"{len(c['tiles'])} corridor tiles in {len(packs)} packs -> {os.path.relpath(DST, ROOT)}/c<pack>.json.gz")
        for p in packs:
            have = os.path.exists(os.path.join(DST, f"c{p['pack']}.json.gz"))
            print(f"  c{p['pack']}: {len(p['tiles'])} tiles, box ({p['s']}, {p['w']}, {p['n']}, {p['e']}){' (cached)' if have else ''}")
        print("queries per pack:", ", ".join(queries((0, 0, 1, 1)).keys()))
        return
    os.makedirs(DST, exist_ok=True)
    for p in packs:
        f = os.path.join(DST, f"c{p['pack']}.json.gz")
        if os.path.exists(f) and "--refresh" not in sys.argv:
            print(f"c{p['pack']}: cached")
            continue
        data = fetch_pack(p)
        tmp = f + ".tmp"
        with gzip.open(tmp, "wt", compresslevel=9, encoding="utf-8") as fh:
            json.dump(data, fh, separators=(",", ":"))
        os.replace(tmp, f)
        print(f"c{p['pack']}: {len(data['elements'])} elements, {os.path.getsize(f) / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
