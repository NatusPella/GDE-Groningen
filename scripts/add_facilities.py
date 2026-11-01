#!/usr/bin/env python3
"""Real facilities for the whole province (game/facilities.json), read by
game/js/facilities.js: where you wake up after dying (hospitals, GP posts,
doctors, ambulance posts), where the police drop you after an arrest, fire
stations, pharmacies, fuel stations (with their forecourt outline), car
repair, shops by game type, horeca, parking (lots with outline, multi-storey
and underground garages), parking lanes along streets, taxi ranks and bus
stations.

Coordinates stay in WGS84 (lat/lon, 5 decimals) and are projected at load
time (geoframe.js), so the layer moves to the RD New tile world unchanged.
No business names are kept (real business names are brands): each POI keeps
its kind, the nearest place (town, village, suburb) and its street, and the
game builds an invented name from those. Police stations named
"Politiebureau X" / "Politiepost X" keep that name (a public institution);
the UMCG is a flag. Psychiatric and rehab clinics, the marechaussee and
everything across the German border are left out.

    python3 scripts/add_facilities.py            # build from the cache
    python3 scripts/add_facilities.py --refresh  # refetch from Overpass
    python3 scripts/add_facilities.py --cache data/cache/province/facilities_raw.json.gz,data/cache/province-drenthe/facilities_raw.json.gz,data/cache/province-friesland/facilities_raw.json.gz
                                                 # from the Geofabrik extracts (scripts/world/extract_province.py)

The cache is data/facilities_raw.json.gz (one Overpass call).
"""
import gzip
import json
import math
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from osmfetch import overpass  # noqa: E402

# (south, west, north, east): the province of Groningen with a margin
BBOX = (52.83, 6.15, 53.57, 7.25)
CACHE = "data/facilities_raw.json.gz"
DST = "game/facilities.json"
R = 5

SHOPS = ("supermarket|convenience|clothes|shoes|fashion|hairdresser|beauty|bicycle|car|car_repair|car_parts|tyres|"
         "tobacco|lottery|newsagent|kiosk|second_hand|pawnbroker|outdoor|variety_store|furniture|paint|bakery|butcher")


def query(b):
    B = "({},{},{},{})".format(*b)
    return ("[out:json][timeout:600];("
            f'nwr["amenity"~"^(police|hospital|clinic|doctors|fire_station|pharmacy|fuel|taxi|bus_station|'
            f'fast_food|cafe|pub|bar|restaurant|car_wash|bicycle_rental|boat_rental)$"]{B};'
            f'nwr["emergency"="ambulance_station"]{B};'
            f'nwr["healthcare"~"^(doctor|centre|hospital)$"]{B};'
            f'nwr["shop"~"^({SHOPS})$"]{B};'
            f'nwr["craft"="bicycle"]{B};'
            f'nwr["amenity"="parking"]{B};'
            f'node["place"~"^(city|town|village|hamlet|suburb|quarter|neighbourhood)$"]{B};'
            ");out tags geom;"
            f'way["highway"]["highway"!~"^(footway|cycleway|path|track|steps|service|motorway|motorway_link|trunk|trunk_link)$"]'
            f'[~"^parking:(lane|both|left|right)"~"."]{B};out tags geom;')


SNACK = ("friture", "fries", "chips", "snack", "dutch", "frikandel")
EMERG = re.compile(r"huisartsenpost|spoedpost|dokterswacht|spoedeisende|huisartsendienst", re.I)


PSYCH = re.compile(r"psychiatr|lentis|ggz|verslav|revalidat", re.I)
POLICE_NAME = re.compile(r"^Politie(bureau|post) [A-Z]")


def german(lat, lon):
    """Across the border (Emden, Krummhoern, Bunde): not ours."""
    return lon > 7.21 or (lat > 53.30 and lon > 7.05) or (lat > 53.38 and lon > 6.98)


def kind_of(t):
    """Game kind code for an OSM element, or None."""
    a, s, h = t.get("amenity"), t.get("shop"), t.get("healthcare")
    if (a in ("hospital", "clinic", "doctors") or h) and PSYCH.search(t.get("name", "")):
        return None
    if a == "police" and re.search(r"marechaussee", t.get("name", ""), re.I):
        return None
    if t.get("emergency") == "ambulance_station":
        return "ambulance"
    if a == "hospital" or h == "hospital":
        return "hospital"
    if a in ("doctors", "clinic") or h in ("doctor", "centre"):
        return "gppost" if EMERG.search(t.get("name", "")) else "doctors"
    if a == "police":
        return "police"
    if a == "fire_station":
        return "fire"
    if a == "pharmacy":
        return "pharmacy"
    if a == "fuel":
        return "fuel"
    if a == "taxi":
        return "taxi"
    if a == "bus_station":
        return "busstation"
    if a == "car_wash":
        return "carwash"
    if a == "parking":
        p = t.get("parking", "surface")
        if p in ("multi-storey", "underground", "rooftop"):
            return "garagepark"
        if p in ("street_side", "lane", "on_kerb", "half_on_kerb"):
            return "streetpark"
        if t.get("access") in ("private", "no", "customers") and t.get("park_ride") in (None, "no"):
            return None
        return "parking"
    if a == "fast_food":
        return "snack" if any(c in t.get("cuisine", "").lower() for c in SNACK) else "fastfood"
    if a in ("cafe", "pub", "bar", "restaurant"):
        return "horeca"
    if a == "bicycle_rental":
        return "bicycle_rental"
    if a == "boat_rental":
        return "boat_rental"
    if t.get("craft") == "bicycle":
        return "craft_bicycle"
    if s:
        return s
    return None


def centroid(geom):
    pts = [(g["lat"], g["lon"]) for g in geom if g]
    if not pts:
        return None
    if len(pts) > 2 and pts[0] == pts[-1]:
        pts = pts[:-1]
    return sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)


def flat(geom):
    out = []
    for g in geom:
        if g:
            out += [round(g["lat"], R), round(g["lon"], R)]
    return out


M_LAT, M_LON = 110574.0, 66652.97


def main():
    raw = None
    if "--cache" in sys.argv:
        # other raw caches in the same form, comma-separated:
        # scripts/world/extract_province.py writes data/cache/province*/facilities_raw.json.gz
        # from the Geofabrik extracts (the province's, the strips of its neighbours)
        raw, seen = {"elements": []}, set()
        for path in sys.argv[sys.argv.index("--cache") + 1].split(","):
            with gzip.open(path, "rt", encoding="utf-8") as f:
                for el in json.load(f)["elements"]:
                    if (el["type"], el["id"]) not in seen:
                        seen.add((el["type"], el["id"]))
                        raw["elements"].append(el)
    elif "--refresh" not in sys.argv and os.path.exists(CACHE):
        with gzip.open(CACHE, "rt", encoding="utf-8") as f:
            raw = json.load(f)
        if raw.get("bbox") != list(BBOX):
            raw = None
    if raw is None:
        raw = overpass(query(BBOX))
        raw["bbox"] = list(BBOX)
        with gzip.open(CACHE, "wt", encoding="utf-8") as f:
            json.dump(raw, f, separators=(",", ":"))

    places, items, lanes = [], [], []
    for el in raw.get("elements", []):
        t = el.get("tags", {})
        if el["type"] == "node" and t.get("place") and t.get("name"):
            places.append((t["place"], t["name"], el["lat"], el["lon"]))
            continue
        k = kind_of(t)
        if el["type"] == "way" and "highway" in t and not k:
            sides = 0
            for side, bit in (("left", 1), ("right", 2)):
                v = t.get(f"parking:{side}") or t.get(f"parking:lane:{side}") or t.get("parking:both") or t.get("parking:lane:both")
                if v and v not in ("no", "none", "no_parking", "no_stopping", "fire_lane", "separate"):
                    sides |= bit
            if sides and el.get("geometry"):
                lanes.append([sides, flat(el["geometry"])])
            continue
        if not k:
            continue
        if el["type"] == "node":
            ll = (el["lat"], el["lon"])
        elif el.get("geometry"):
            ll = centroid(el["geometry"])
        elif el.get("center"):
            ll = (el["center"]["lat"], el["center"]["lon"])
        elif el.get("bounds"):
            b = el["bounds"]
            ll = ((b["minlat"] + b["maxlat"]) / 2, (b["minlon"] + b["maxlon"]) / 2)
        else:
            ll = None
        if not ll or german(*ll):
            continue
        flags = 0
        name = t.get("name", "")
        if k == "hospital" and re.match(r"(UMCG|Universitair Medisch Centrum)( Groningen)?$", name):
            flags |= 1
        # a hospital with an emergency department (spoedeisende hulp)
        if k == "hospital" and (t.get("emergency") == "yes" or (t.get("emergency") is None and "ziekenhuis" in name.lower())):
            flags |= 2
        if k in ("fuel",) and (t.get("highway") == "services" or "verzorgingsplaats" in name.lower()):
            flags |= 4
        if t.get("park_ride") not in (None, "no"):
            flags |= 8
        # public institutions keep their own name; businesses never do (brands)
        keep = name if k == "police" and POLICE_NAME.match(name) else ""
        item = {"k": k, "lat": ll[0], "lon": ll[1], "st": t.get("addr:street", ""), "f": flags, "id": el["id"], "n": keep}
        if el["type"] == "way" and k in ("fuel", "parking", "garagepark") and el.get("geometry") and len(el["geometry"]) >= 4:
            item["poly"] = flat(el["geometry"])
        if k == "parking" and t.get("capacity", "").isdigit():
            item["cap"] = int(t["capacity"])
        items.append(item)

    # nearest place: town/village beats hamlet, suburb names inside the city
    rank = {"city": 3, "town": 0, "village": 1, "suburb": 1, "quarter": 2, "neighbourhood": 3, "hamlet": 2}
    reach = {"city": 6000, "town": 3500, "village": 1800, "suburb": 1500, "quarter": 900, "neighbourhood": 600, "hamlet": 900}

    def place_of(lat, lon):
        best, bs = "", 1e18
        for kind, n, plat, plon in places:
            d = math.hypot((plat - lat) * M_LAT, (plon - lon) * M_LON)
            if d > reach[kind]:
                continue
            s = d / reach[kind] + rank[kind] * 0.15
            if s < bs:
                best, bs = n, s
        return best

    # the same POI mapped as node and area: keep the area (it has the outline)
    # (and one police site per 250 m: the named station wins)
    items.sort(key=lambda i: (0 if i["n"] else 1, 0 if "poly" in i else 1, i["id"]))
    kept = []
    grid = {}
    for it in items:
        cx, cy = int(it["lon"] * M_LON // 60), int(it["lat"] * M_LAT // 60)
        dup = False
        span = range(-5, 6) if it["k"] == "police" else (-1, 0, 1)
        for ox in span:
            for oy in span:
                for o in grid.get((cx + ox, cy + oy), ()):
                    if o["k"] == it["k"] and math.hypot((o["lat"] - it["lat"]) * M_LAT, (o["lon"] - it["lon"]) * M_LON) < (250 if it["k"] == "police" else 35):
                        dup = True
        if dup:
            continue
        grid.setdefault((cx, cy), []).append(it)
        kept.append(it)

    kinds = sorted({i["k"] for i in kept})
    place_names, street_names, own_names = [""], [""], [""]
    pidx, sidx, nidx = {"": 0}, {"": 0}, {"": 0}

    def intern(tab, idx, s):
        if s not in idx:
            idx[s] = len(tab)
            tab.append(s)
        return idx[s]

    rows = []
    kept.sort(key=lambda i: (i["k"], round(i["lat"], 3), round(i["lon"], 3), i["id"]))
    for it in kept:
        row = [kinds.index(it["k"]), round(it["lat"], R), round(it["lon"], R),
               intern(place_names, pidx, place_of(it["lat"], it["lon"])), intern(street_names, sidx, it["st"]), it["f"],
               intern(own_names, nidx, it["n"])]
        if "poly" in it or "cap" in it:
            row.append(it.get("poly", 0))
        if "cap" in it:
            row.append(it["cap"])
        rows.append(row)

    out = {
        "v": 1, "crs": "EPSG:4326", "bbox": list(BBOX), "src": "OpenStreetMap contributors (ODbL)",
        "kinds": kinds, "places": place_names, "streets": street_names, "names": own_names,
        "row": ["kind", "lat", "lon", "place", "street", "flags", "name", "poly?", "capacity?"],
        "flags": {"1": "UMCG", "2": "emergency department", "4": "motorway services", "8": "park and ride"},
        "f": rows, "lanes": lanes,
    }
    with open(DST, "w", encoding="utf-8") as f:
        json.dump(out, f, separators=(",", ":"), ensure_ascii=False)
    count = {}
    for it in kept:
        count[it["k"]] = count.get(it["k"], 0) + 1
    print(f"{DST}: {len(rows)} facilities, {len(lanes)} parking lanes, {os.path.getsize(DST) // 1024} KB")
    for k in kinds:
        print(f"  {k:16s} {count[k]}")


if __name__ == "__main__":
    main()
