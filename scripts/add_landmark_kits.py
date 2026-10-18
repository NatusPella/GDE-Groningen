#!/usr/bin/env python3
"""Landmark candidates for the landmark kits (docs/PROVINCIE-PLAN.md 3b, LK1)
in the Ommeland box: churches and chapels with their outline, windmills and
watermills, towers, lighthouses, water towers, castles and borgen, ruins,
museums. One Overpass query, cached in data/landmark_kits_raw.json; the game
reads game/landmarkkits.json:

    {"items": [{"k": kind, "n": name, "x": x, "y": y, "o": [x0, y0, x1, y1, ...],
                "t": {tag: value, ...}}, ...]}

x/y in the world frame (RD New, scripts/world/rdnew.py), the outline only for
mapped areas (ways), simplified to 0.3 m. Only the tags the kits read are
kept. Communication masts and chimneys are left out.

    python3 scripts/add_landmark_kits.py            # fetch if the cache is missing
    python3 scripts/add_landmark_kits.py --refresh  # refetch
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from osmfetch import cached  # noqa: E402
from world.rdnew import project as rd_project  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "landmark_kits_raw.json")
MAP = os.path.join(ROOT, "game", "citymap.json")
OUT = os.path.join(ROOT, "game", "landmarkkits.json")
# the Ommeland box (scripts/fetch_ommeland.py)
BBOX = (53.124, 6.385, 53.339, 6.753)

KEEP = ("name", "amenity", "building", "religion", "denomination", "heritage", "start_date", "height", "building:levels",
        "roof:shape", "roof:height", "building:material", "man_made", "windmill:type", "mill:type", "tower:type",
        "tower:construction", "railway", "farm:type", "historic", "ruins", "tourism", "castle_type", "wikidata", "colour", "building:colour")


def query(b):
    B = "({},{},{},{})".format(*b)
    return ("[out:json][timeout:300];("
            f'nwr["amenity"="place_of_worship"]{B};'
            f'way["building"~"^(church|chapel|cathedral)$"]{B};'
            f'nwr["man_made"~"^(windmill|watermill|tower|lighthouse|water_tower)$"]{B};'
            f'nwr["historic"~"^(castle|manor|ruins|windmill|church|monastery|tower)$"]{B};'
            f'nwr["tourism"="museum"]{B};'
            ");out geom;")


def simplify(P, tol):
    if len(P) < 3:
        return P
    keep = [False] * len(P)
    keep[0] = keep[-1] = True
    stack = [(0, len(P) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = P[a]
        bx, by = P[b]
        L = math.hypot(bx - ax, by - ay) or 1e-9
        best, bi = -1, -1
        for i in range(a + 1, b):
            d = abs((P[i][0] - ax) * (by - ay) - (P[i][1] - ay) * (bx - ax)) / L
            if d > best:
                best, bi = d, i
        if best > tol:
            keep[bi] = True
            stack += [(a, bi), (bi, b)]
    return [p for p, k in zip(P, keep) if k]


def kind(t):
    mm, hi, b = t.get("man_made", ""), t.get("historic", ""), t.get("building", "")
    if mm in ("windmill", "watermill") or hi == "windmill":
        return "mill"
    if mm == "lighthouse":
        return "lighthouse"
    if mm == "water_tower":
        return "watertower"
    if mm == "tower" or hi == "tower":
        if t.get("tower:type") in ("communication", "cooling", "lighting", "observation_radar") or t.get("tower:construction") in ("lattice", "guyed_mast"):
            return None
        return "tower"
    if hi in ("castle", "manor"):
        return "castle"
    if t.get("amenity") == "place_of_worship" or b in ("church", "chapel", "cathedral") or hi in ("church", "monastery"):
        return "chapel" if b == "chapel" else "church"
    if hi == "ruins":
        return "ruin"
    if t.get("tourism") == "museum":
        return "museum"
    return None


def main():
    raw = cached(RAW, BBOX, query)
    proj = lambda la, lo: rd_project(la, lo, 1)
    items, seen = [], set()
    for el in raw.get("elements", []):
        t = el.get("tags") or {}
        k = kind(t)
        if not k:
            continue
        item = {"k": k, "n": t.get("name", ""), "t": {key: t[key] for key in KEEP if key in t and key != "name"}}
        if el["type"] == "node":
            item["x"], item["y"] = proj(el["lat"], el["lon"])
        elif el["type"] == "way" and el.get("geometry"):
            P = [proj(p["lat"], p["lon"]) for p in el["geometry"] if p]
            if len(P) > 2 and P[0] == P[-1]:
                P = P[:-1]
            if len(P) > 3:
                # a closed ring in two halves (both ends of one half the same point would keep nothing)
                h = len(P) // 2
                P = simplify(P[:h + 1], 0.3) + simplify(P[h:] + [P[0]], 0.3)[1:-1]
            item["x"] = round(sum(p[0] for p in P) / len(P), 1)
            item["y"] = round(sum(p[1] for p in P) / len(P), 1)
            if len(P) >= 3:
                item["o"] = [v for p in P for v in p]
        elif el["type"] == "relation" and el.get("bounds"):
            bd = el["bounds"]
            item["x"], item["y"] = proj((bd["minlat"] + bd["maxlat"]) / 2, (bd["minlon"] + bd["maxlon"]) / 2)
        else:
            continue
        key = (k, round(item["x"]), round(item["y"]))
        if key in seen:
            continue
        seen.add(key)
        items.append(item)
    items.sort(key=lambda i: (i["k"], i["x"], i["y"]))
    with open(OUT, "w") as f:
        json.dump({"source": "OpenStreetMap contributors (ODbL)", "items": items}, f, separators=(",", ":"))
    counts = {}
    for i in items:
        counts[i["k"]] = counts.get(i["k"], 0) + 1
    print(f"{OUT}: {len(items)} items {counts}")


if __name__ == "__main__":
    main()
