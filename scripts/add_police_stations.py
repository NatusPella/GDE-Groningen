#!/usr/bin/env python3
"""Fetch the respawn points from OpenStreetMap and merge them into
game/citymap.json's meta:

  meta.policeStations: [{name, x, y}]  amenity=police: where you are brought
                                        after getting busted
  meta.hospital:       {name, x, y}    the UMCG main entrance (entrance=main
                                        "Hoofdingang" at Hanzeplein), where the
                                        trauma helicopter brings you after dying
  meta.careSites:      [{name, x, y}]  other hospitals and GP posts
                                        (amenity=hospital/doctors); when one is
                                        closer than the UMCG an ambulance takes
                                        you there instead

Re-runnable: only these three keys are replaced, every other key in the file
is preserved. Responses are cached in data/ (see osmfetch.py); pass
--refresh to fetch them again.
"""
import json
import math
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from osmfetch import bbox_str, cached, map_bbox, near_data  # noqa: E402

MAP_PATH = "game/citymap.json"
POLICE_CACHE = "data/police_raw.json"
HOSPITAL_CACHE = "data/umcg_entrance_raw.json"
CARE_CACHE = "data/care_raw.json"
UMCG_BOX = (53.2195, 6.5700, 53.2250, 6.5800)
# police buildings closer than this to a named station are the same site
MERGE_DIST = 250
# one GP post per neighbourhood is plenty, and none right next to the UMCG
CARE_SPACING = 700
UMCG_CLEAR = 1200
CARE_NAME = re.compile(r"huisarts|gezondheidscentrum|spoedpost|ziekenhuis", re.I)


def care_name(meta, site):
    """'Huisartsenpost <wijk>' after the nearest neighbourhood point."""
    pts = meta.get("neighbourhoodPoints") or []
    best = min(pts, key=lambda p: math.hypot(p["x"] - site["x"], p["y"] - site["y"]), default=None)
    return f"Huisartsenpost {best['name']}" if best else "Huisartsenpost"


def police_query(bbox):
    return '[out:json][timeout:90];nwr["amenity"="police"]' + bbox_str(bbox) + ';out center tags;'


def hospital_query(_bbox):
    return '[out:json][timeout:90];node["entrance"~"^(main|yes)$"]' + bbox_str(UMCG_BOX) + ';out;'


def care_query(bbox):
    return '[out:json][timeout:120];nwr["amenity"~"^(hospital|clinic|doctors)$"]' + bbox_str(bbox) + ';out center tags;'


def latlon(el):
    if "lat" in el and "lon" in el:
        return el["lat"], el["lon"]
    if "center" in el:
        return el["center"]["lat"], el["center"]["lon"]
    return None


def spread(sites, spacing, rank):
    out = []
    for s in sorted(sites, key=rank):
        if all(math.hypot(s["x"] - o["x"], s["y"] - o["y"]) >= spacing for o in out):
            out.append(s)
    return out


def main():
    with open(MAP_PATH) as f:
        data = json.load(f)
    meta = data["meta"]
    lat0, lon0 = meta["origin"]["lat"], meta["origin"]["lon"]
    m_lat, m_lon = meta["mPerDegLat"], meta["mPerDegLon"]

    def project(lat, lon):
        return round((lon - lon0) * m_lon, 1), round((lat0 - lat) * m_lat, 1)

    ok = near_data(data)
    bbox = map_bbox(meta)

    def sites(raw, default, keep=lambda tags: True):
        out = []
        for el in raw.get("elements", []):
            ll = latlon(el)
            tags = el.get("tags", {})
            if not ll or not keep(tags):
                continue
            x, y = project(*ll)
            if ok(x, y):
                out.append({"name": tags.get("name") or default, "x": x, "y": y})
        return out

    police = sites(cached(POLICE_CACHE, bbox, police_query), "Politiebureau")
    # named "Politiebureau ..." entries first, so they win the merge
    stations = spread(police, MERGE_DIST, lambda s: not s["name"].startswith("Politiebureau"))

    hospital = None
    nodes = cached(HOSPITAL_CACHE, bbox, hospital_query).get("elements", [])
    for want in (lambda t: t.get("name") == "Hoofdingang", lambda t: t.get("entrance") == "main"):
        el = next((e for e in nodes if "lat" in e and want(e.get("tags", {}))), None)
        if el:
            x, y = project(el["lat"], el["lon"])
            hospital = {"name": "UMCG", "x": x, "y": y}
            break

    def care_keep(tags):
        name = tags.get("name", "")
        return bool(CARE_NAME.search(name)) and "UMCG" not in name and "Universitair" not in name

    care = sites(cached(CARE_CACHE, bbox, care_query), "Huisartsenpost", care_keep)
    if hospital:
        care = [s for s in care if math.hypot(s["x"] - hospital["x"], s["y"] - hospital["y"]) >= UMCG_CLEAR]
    # real posts and health centres before single-GP practices
    care = spread(care, CARE_SPACING, lambda s: (not re.search(r"post|ziekenhuis|centrum", s["name"], re.I), s["name"]))

    # re-read right before writing so concurrent edits to other keys survive
    with open(MAP_PATH) as f:
        data = json.load(f)
    data["meta"]["policeStations"] = stations
    # the game shows these names on respawn: real practices get a generic one
    for s in care:
        s["name"] = care_name(data["meta"], s)
    data["meta"]["careSites"] = care
    if hospital:
        data["meta"]["hospital"] = hospital
    with open(MAP_PATH, "w") as f:
        json.dump(data, f, separators=(",", ":"))

    print(f"policeStations: {len(stations)}")
    for s in stations:
        print(f"  {s['name']:40s} ({s['x']}, {s['y']})")
    print(f"hospital: {hospital}")
    print(f"careSites: {len(care)}")
    for s in care:
        print(f"  {s['name']:40s} ({s['x']}, {s['y']})")


if __name__ == "__main__":
    main()
