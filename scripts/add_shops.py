#!/usr/bin/env python3
"""Pick shop branch locations for the in-game shop chains (game/js/shops.js)
from real OpenStreetMap shop POIs and merge them into game/citymap.json as
meta.shops. Only meta.shops is replaced; every other key is kept as-is.

The Overpass response is cached in data/shops_raw.json; pass --refresh to
fetch it again. Re-runnable: the same cache always gives the same picks.

Each entry: {"t": type, "x", "y", "wijk", "street"} in map metres (same
projection as add_horeca.py). shops.js snaps it to the building front.
"""
import json
import math
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from world.rdnew import meta_frame, meta_bbox  # noqa: E402

MAP_PATH = "game/citymap.json"
CACHE = "data/shops_raw.json"
OVERPASS_URLS = [
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

# game type -> (branch count, [(osm kind, weight)])
CHAINS = {
    "wapens": (4, [("outdoor", 3), ("tyres", 2), ("car_repair", 1), ("variety_store", 1)]),
    "kleding": (6, [("clothes", 3), ("shoes", 2), ("fashion", 2)]),
    "kapper": (5, [("hairdresser", 3), ("beauty", 1)]),
    "fietsen": (5, [("bicycle", 3), ("bicycle_rental", 1)]),
    "fietsenmaker": (4, [("bicycle", 2), ("craft_bicycle", 3), ("bicycle_rental", 1)]),
    "auto": (3, [("car", 4), ("car_repair", 1), ("tyres", 1)]),
    "tuning": (3, [("car_parts", 3), ("tyres", 2), ("car_repair", 2)]),
    "tabak": (7, [("tobacco", 3), ("lottery", 3), ("newsagent", 2), ("kiosk", 2), ("variety_store", 1), ("convenience", 1)]),
    "super": (7, [("supermarket", 3), ("convenience", 2)]),
    "snack": (7, [("fast_food_snack", 3), ("fast_food", 1)]),
    "pand": (3, [("pawnbroker", 4), ("second_hand", 2)]),
}
SAME_TYPE_MIN = 150      # never two branches of one chain closer than this
OTHER_TYPE_MIN = 18      # two different shop signs on one doorstep look odd
FIRST_BY_KIND = {"auto", "tuning", "pand", "wapens"}
SNACK_CUISINE = ("friture", "fries", "chips", "snack", "dutch", "frikandel")



def overpass_query(bbox):
    s, w, n, e = bbox
    b = f"({s},{w},{n},{e})"
    shops = "supermarket|convenience|clothes|shoes|fashion|hairdresser|beauty|bicycle|car|car_repair|car_parts|tyres|tobacco|lottery|newsagent|kiosk|second_hand|pawnbroker|weapons|hunting|outdoor|military|boat|variety_store"
    return (
        "[out:json][timeout:90];("
        f'nwr["shop"~"^({shops})$"]{b};'
        f'nwr["amenity"~"^(fast_food|boat_rental|bicycle_rental)$"]{b};'
        f'nwr["craft"="bicycle"]{b};'
        ");out center tags;"
    )


def fetch(bbox):
    q = overpass_query(bbox)
    for url in OVERPASS_URLS:
        r = subprocess.run(["curl", "-s", "-m", "120", "-A", "gde-groningen-mapbuilder/1.0", "--data-urlencode", f"data={q}", url],
                           capture_output=True, text=True)
        if r.stdout.lstrip().startswith("{"):
            return json.loads(r.stdout)
    sys.exit("Overpass: no server answered with JSON, try again later")


def kind_of(tags):
    if tags.get("craft") == "bicycle":
        return "craft_bicycle"
    a = tags.get("amenity")
    if a == "fast_food":
        cuisine = tags.get("cuisine", "").lower()
        return "fast_food_snack" if any(c in cuisine for c in SNACK_CUISINE) else "fast_food"
    if a:
        return a
    return tags.get("shop")


def main():
    with open(MAP_PATH) as f:
        data = json.load(f)
    meta = data["meta"]
    project, _ = meta_frame(meta)
    bx0, by0, bx1, by1 = meta["bounds"]
    bbox = meta_bbox(meta, 0, 4)

    if "--refresh" in sys.argv or not os.path.exists(CACHE):
        raw = fetch(bbox)
        os.makedirs(os.path.dirname(CACHE), exist_ok=True)
        with open(CACHE, "w") as f:
            json.dump(raw, f)
    else:
        with open(CACHE) as f:
            raw = json.load(f)

    hoods = meta.get("neighbourhoodPoints", [])

    def wijk_of(x, y):
        best, bd = None, 1e18
        for h in hoods:
            d = (h["x"] - x) ** 2 + (h["y"] - y) ** 2
            if d < bd:
                best, bd = h["name"], d
        return best or "Stad"

    pois = []
    for el in raw.get("elements", []):
        tags = el.get("tags", {})
        if "lat" in el:
            lat, lon = el["lat"], el["lon"]
        elif "center" in el:
            lat, lon = el["center"]["lat"], el["center"]["lon"]
        else:
            continue
        x, y = project(lat, lon)
        if not (bx0 + 40 < x < bx1 - 40 and by0 + 40 < y < by1 - 40):
            continue
        pois.append({"kind": kind_of(tags), "x": x, "y": y, "street": tags.get("addr:street", ""), "id": el.get("id")})
    pois.sort(key=lambda p: (p["kind"] or "", p["id"]))

    # local shop density: branches in real shopping streets/centres win ties
    def density(p):
        return sum(1 for q in pois if abs(q["x"] - p["x"]) < 150 and abs(q["y"] - p["y"]) < 150)

    for p in pois:
        p["dens"] = density(p)

    placed = []
    used_ids = set()
    for t, (count, kinds) in CHAINS.items():
        weight = dict(kinds)
        cands = [p for p in pois if p["kind"] in weight and p["id"] not in used_ids]
        picks = []
        while len(picks) < count and cands:
            best, bs = None, -1
            for c in cands:
                if any(math.hypot(c["x"] - q["x"], c["y"] - q["y"]) < OTHER_TYPE_MIN for q in placed):
                    continue
                if picks:
                    md = min(math.hypot(c["x"] - q["x"], c["y"] - q["y"]) for q in picks)
                    if md < SAME_TYPE_MIN:
                        continue
                elif t in FIRST_BY_KIND:
                    # dealers and garages: start at the most fitting real business
                    md = weight[c["kind"]] * 1000 + c["dens"] * 10
                else:
                    # first branch of every other chain: the shop nearest the Grote Markt
                    md = 4000 - math.hypot(c["x"] - 180, c["y"] - 90)
                s = md * (1 + 0.12 * math.log1p(c["dens"])) * (0.8 + 0.1 * weight[c["kind"]])
                if s > bs:
                    best, bs = c, s
            if not best:
                break
            picks.append(best)
            cands.remove(best)
        for p in picks:
            used_ids.add(p["id"])
            placed.append({"t": t, "x": round(p["x"], 1), "y": round(p["y"], 1), "wijk": wijk_of(p["x"], p["y"]), "street": p["street"]})
        if len(picks) < count:
            print(f"  warning: only {len(picks)}/{count} branches for {t}")

    meta["shops"] = placed
    with open(MAP_PATH, "w") as f:
        json.dump(data, f, separators=(",", ":"))

    print(f"{len(pois)} OSM shop POIs, {len(placed)} branches in meta.shops")
    for t in CHAINS:
        rows = [f"{p['wijk']} ({p['street'] or '?'})" for p in placed if p["t"] == t]
        print(f"  {t:13s} {len(rows)}: " + "; ".join(rows))


if __name__ == "__main__":
    main()
