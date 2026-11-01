#!/usr/bin/env python3
"""Landmark candidates for the whole province (issue #21, docs/PROVINCIE-PLAN.md
3b), out of the province packs (scripts/world/extract_province.py,
data/cache/province/c*.json.gz), merged into game/landmarkkits.json next to the
Ommeland candidates of add_landmark_kits.py (which keep the Ommeland box).
Same item format: {"k", "n", "x", "y", "o"?, "t"}. Churches and chapels with
their outline, mills, lighthouses, borgen; mosques and nameless sheds are left out. A selection score keeps
the file modest (--cap items outside the Ommeland box). Rerunnable: it keeps
what lies inside the box and replaces the rest.

    python3 scripts/add_landmark_kits_province.py [--cap 300] [--data GLOB] [--everyday] [--list]
"""
import glob
import gzip
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "world"))
from add_landmark_kits import BBOX, KEEP, OUT, simplify  # noqa: E402
from rdnew import wgs_to_world, world_to_wgs  # noqa: E402

ROOT = os.path.dirname(HERE)
PACKS = os.path.join(ROOT, "data", "cache", "province", "c*.json.gz")
# per-kind caps for the everyday kits (landmarkkit.js: farm, silo, factory, flat,
# townhall, station, school, museum; issue #164), chosen by name and size
EVERYDAY = {"townhall": 60, "station": 30, "museum": 25, "silo": 40, "factory": 40, "flat": 60, "school": 40, "farm": 60}


def in_box(lat, lon):
    return BBOX[0] <= lat <= BBOX[2] and BBOX[1] <= lon <= BBOX[3]


def kind(t):
    mm, hi, b = t.get("man_made", ""), t.get("historic", ""), t.get("building", "")
    if t.get("religion") == "muslim" or b == "mosque":
        return None
    if mm in ("windmill", "watermill") or hi == "windmill" or b == "windmill":
        return "mill"
    if mm == "lighthouse":
        return "lighthouse"
    if t.get("amenity") == "townhall":
        return "townhall"
    if t.get("railway") == "station" and t.get("name") and not t.get("subway"):
        return "station"
    if b == "train_station" and t.get("name"):
        return "station"
    if t.get("tourism") == "museum" and t.get("name"):
        return "museum"
    if mm == "silo" or b == "silo":
        return "silo"
    if t.get("amenity") == "school" and t.get("name") and b in ("school", "yes", "public", ""):
        return "school"
    if b == "farm" or (b == "farm_auxiliary" and t.get("name")):
        return "farm"
    if b == "industrial" and t.get("name"):
        return "factory"
    if b == "apartments" and (t.get("building:levels", "0") or "0").isdigit() and int(t.get("building:levels", "0")) >= 8:
        return "flat"
    if hi in ("castle", "manor") or b == "castle":
        return "castle"
    if t.get("amenity") == "place_of_worship" or b in ("church", "chapel", "cathedral") or hi in ("church", "monastery"):
        if b in ("house", "office", "industrial", "commercial", "yes") and not (t.get("name") or hi):
            return None
        return "chapel" if b == "chapel" else "church"
    return None


def area(P):
    return abs(sum(P[i][0] * P[(i + 1) % len(P)][1] - P[(i + 1) % len(P)][0] * P[i][1] for i in range(len(P)))) / 2


def score(it):
    t = it["t"]
    s = 0
    if it["n"]:
        s += 3
    y = t.get("start_date", "")[:4]
    if y.isdigit() and int(y) < 1600:
        s += 3
    if it["k"] in ("mill", "castle", "lighthouse"):
        s += 6
    if it["k"] in EVERYDAY:
        s += 1
    if it["k"] == "church":
        s += 2
    if "o" in it:
        P = [(it["o"][i], it["o"][i + 1]) for i in range(0, len(it["o"]), 2)]
        s += min(3, area(P) / 150)
    return s


def main():
    cap = int(sys.argv[sys.argv.index("--cap") + 1]) if "--cap" in sys.argv else 300
    packs = sys.argv[sys.argv.index("--data") + 1] if "--data" in sys.argv else PACKS  # e.g. <main checkout>/data/cache/province/c*.json.gz
    found, seen = [], set()
    for f in sorted(glob.glob(packs)):
        for el in json.load(gzip.open(f))["elements"]:
            t = el.get("tags") or {}
            k = kind(t)
            if not k:
                continue
            key = (el["type"], el["id"])
            if key in seen:
                continue
            seen.add(key)
            item = {"k": k, "n": t.get("name", ""), "t": {a: t[a] for a in KEEP if a in t and a != "name"}}
            if el["type"] == "node":
                lat, lon = el["lat"], el["lon"]
                item["x"], item["y"] = (round(v, 1) for v in wgs_to_world(lat, lon))
            elif el.get("g"):
                G = el["g"]
                lat = sum(p[0] for p in G) / len(G)
                lon = sum(p[1] for p in G) / len(G)
                P = [wgs_to_world(*p) for p in G]
                if len(P) > 2 and P[0] == P[-1]:
                    P = P[:-1]
                if len(P) > 3:
                    h = len(P) // 2
                    P = simplify(P[:h + 1], 0.3) + simplify(P[h:] + [P[0]], 0.3)[1:-1]
                P = [(round(a, 1), round(b, 1)) for a, b in P]
                item["x"] = round(sum(p[0] for p in P) / len(P), 1)
                item["y"] = round(sum(p[1] for p in P) / len(P), 1)
                if len(P) >= 3:
                    item["o"] = [v for p in P for v in p]
            else:
                continue
            if not in_box(lat, lon):
                found.append(item)
    found.sort(key=lambda i: -score(i))
    keep, grid = [], {}
    for it in found:
        c = (round(it["x"] / 40), round(it["y"] / 40))
        near = [grid.get((c[0] + a, c[1] + b)) for a in (-1, 0, 1) for b in (-1, 0, 1)]
        if any(o and o["k"] == it["k"] and math.hypot(o["x"] - it["x"], o["y"] - it["y"]) < 40 for o in near):
            continue
        grid[c] = it
        keep.append(it)
    # the everyday kits keep their own caps (they would drown the churches and mills)
    counts_k, kept = {}, []
    for it in keep:
        if it["k"] in EVERYDAY:
            if it["k"] == "farm" and "o" not in it:
                continue
            counts_k[it["k"]] = counts_k.get(it["k"], 0) + 1
            if counts_k[it["k"]] > EVERYDAY[it["k"]]:
                continue
            kept.append(it)
        elif sum(1 for i in kept if i["k"] not in EVERYDAY) < cap:
            kept.append(it)
    keep = kept
    if "--list" in sys.argv:
        for i in keep:
            print(i["k"].ljust(9), (i["n"] or "-").ljust(36), round(score(i), 1))
    with open(OUT, encoding="utf-8") as fh:
        base = json.load(fh)
    old = [i for i in base["items"] if in_box(*world_to_wgs(i["x"], i["y"]))]
    items = old + sorted(keep, key=lambda i: (i["k"], i["x"], i["y"]))
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump({"source": base["source"], "items": items}, fh, separators=(",", ":"))
    counts = {}
    for i in items:
        counts[i["k"]] = counts.get(i["k"], 0) + 1
    print(f"{OUT}: {len(items)} items ({len(old)} Ommeland + {len(keep)} province of {len(found)} found) {counts}, {os.path.getsize(OUT) // 1024} kB")


if __name__ == "__main__":
    main()
