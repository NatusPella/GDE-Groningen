#!/usr/bin/env python3
"""Echte plekken voor de minigames (#174): padelbanen en golfbanen / Pitch & Putt
uit de OSM-provincie-extract, met naam en geometrie, in het spelframe (RD New).
Schrijft een klein, versiebaar bestand game/echteplekken.json (naast mapextras.json); de
minigames (padel.js, pitchputt.js) lezen dat via game/js/echteplekken.js.

    data/cache/venv/bin/python scripts/world/echteplekken.py [--pbf pad] [--out pad] [--places pad]
    node scripts/world/echteplekken_check.mjs          # rapport: plekken en afstand tot de weg

De namen van clubs en bedrijven nemen we niet over (geen echte merken in speltekst):
elke plek krijgt de naam van de dichtstbijzijnde woonplaats of wijk (`plaats`).

Alleen openbare locatie- en sportdata: naam, vorm, soort. Geen contactgegevens
(phone, website, e-mail, operator) uit OSM. OSM is ODbL (docs/LICENTIES.md).

Gezocht: sport=padel (pitch, centre, nodes), leisure=golf_course, golf=*,
sport=golf / pitch_and_putt. Multipolygons (relaties) komen mee als hun
grootste gesloten buitenring.
"""
import gzip
import json
import math
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
from rdnew import wgs_to_world  # noqa: E402

PBF = os.path.join(ROOT, "data", "cache", "groningen-latest.osm.pbf")
PLACES = os.path.join(ROOT, "data", "cache", "province", "province.json.gz")
OUT = os.path.join(ROOT, "game", "echteplekken.json")
PP_NAME = re.compile(r"pitch\s*(&|en|and|\+)?\s*putt|par\s*3", re.I)


def want(t):
    s = t.get("sport", "")
    name = t.get("name", "").lower()
    if "padel" in s or "padel" in name:
        return "padel"
    # alleen op tags, niet op de naam: "Golflaan" en "Finse Golf" zijn straten en baaien
    if t.get("leisure") in ("golf_course", "miniature_golf") or "golf" in t or "golf" in s or "pitch_and_putt" in s:
        return "golf"
    return None


def obb(pts):
    """Centre, long-axis angle (rad) and size of a ring (zoals add_map_extras)."""
    best = None
    for i in range(len(pts) - 1):
        a = math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0])
        c, s = math.cos(a), math.sin(a)
        us = [p[0] * c + p[1] * s for p in pts]
        vs = [-p[0] * s + p[1] * c for p in pts]
        ar = (max(us) - min(us)) * (max(vs) - min(vs))
        if best is None or ar < best[0]:
            best = (ar, a, us, vs, c, s)
    _, a, us, vs, c, s = best
    cu, cv = (max(us) + min(us)) / 2, (max(vs) + min(vs)) / 2
    du, dv = max(us) - min(us), max(vs) - min(vs)
    if dv > du:
        a, du, dv = a + math.pi / 2, dv, du
    a = math.atan2(math.sin(a), math.cos(a))
    return cu * c - cv * s, cu * s + cv * c, a, du, dv


def area(pts):
    n = len(pts)
    return abs(sum(pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1] for i in range(n))) / 2


def simplify(pts, tol):
    """Ramer-Douglas-Peucker op een open lijn."""
    if len(pts) < 3:
        return pts
    (x0, y0), (x1, y1) = pts[0], pts[-1]
    dx, dy = x1 - x0, y1 - y0
    l2 = dx * dx + dy * dy
    far, fi = -1, 0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]
        if l2 == 0:
            d = math.hypot(px - x0, py - y0)
        else:
            t = max(0, min(1, ((px - x0) * dx + (py - y0) * dy) / l2))
            d = math.hypot(px - (x0 + dx * t), py - (y0 + dy * t))
        if d > far:
            far, fi = d, i
    if far <= tol:
        return [pts[0], pts[-1]]
    return simplify(pts[:fi + 1], tol)[:-1] + simplify(pts[fi:], tol)


PLACE_KINDS = {"city", "town", "village", "hamlet", "suburb", "quarter", "neighbourhood"}


def load_places(path):
    if not os.path.exists(path):
        return []
    with gzip.open(path, "rt", encoding="utf-8") as f:
        return [p for p in json.load(f)["places"] if p["kind"] in PLACE_KINDS and p.get("name")]


def plaats_bij(places, x, y):
    """Een wijk binnen 1,5 km, anders het dichtstbijzijnde dorp of de stad, anders een buurtschap."""
    def near(kinds, lim):
        c = [p for p in places if p["kind"] in kinds and (p["x"] - x) ** 2 + (p["y"] - y) ** 2 <= lim * lim]
        return min(c, key=lambda p: (p["x"] - x) ** 2 + (p["y"] - y) ** 2, default=None)
    best = near({"suburb", "quarter", "neighbourhood"}, 1500) or near({"city", "town", "village"}, 1e9) or near(PLACE_KINDS, 1e9)
    return best["name"] if best else None


def r1(p):
    return [round(p[0], 1), round(p[1], 1)]


def main():
    import osmium
    pbf, out = PBF, OUT
    a = sys.argv[1:]
    if "--pbf" in a:
        pbf = a[a.index("--pbf") + 1]
    if "--out" in a:
        out = a[a.index("--out") + 1]
    places = load_places(a[a.index("--places") + 1] if "--places" in a else PLACES)
    rels = {}
    way_need = set()
    for r in osmium.FileProcessor(pbf, osmium.osm.RELATION):
        t = dict(r.tags)
        if t.get("type") in ("multipolygon", "site") and want(t):
            outer = [m.ref for m in r.members if m.type == "w" and m.role in ("outer", "")]
            rels[r.id] = (t, outer)
            way_need.update(outer)
    ways = {}
    found = []
    for o in osmium.FileProcessor(pbf).with_locations():
        if o.is_node() and o.tags:
            t = dict(o.tags)
            k = want(t)
            if k and o.location.valid():
                found.append((k, "n", o.id, t, [wgs_to_world(o.location.lat, o.location.lon)]))
        elif o.is_way():
            t = dict(o.tags)
            k = want(t) if o.tags else None
            if not (k or o.id in way_need):
                continue
            try:
                pts = [wgs_to_world(n.lat, n.lon) for n in o.nodes if n.location.valid()]
            except osmium.InvalidLocationError:
                continue
            if len(pts) < 2:
                continue
            if o.id in way_need:
                ways[o.id] = pts
            if k:
                found.append((k, "w", o.id, t, pts))
    for rid, (t, outer) in rels.items():
        rings = [ways[w] for w in outer if w in ways and len(ways[w]) >= 4 and ways[w][0] == ways[w][-1]]
        if rings:
            found.append((want(t), "r", rid, t, max(rings, key=area)))

    padel, golf = [], []
    for kind, typ, i, t, pts in found:
        name = t.get("name")
        closed = len(pts) >= 4 and pts[0] == pts[-1]
        rec = {"id": f"{typ}{i}"}
        if kind == "padel":
            if closed:
                cx, cy, rot, l, w = obb(pts)
                rec.update(x=round(cx, 1), y=round(cy, 1), rot=round(rot, 3), l=round(l, 1), w=round(w, 1))
                rec["soort"] = "baan" if (t.get("leisure") == "pitch" and 14 <= l <= 30 and 7 <= w <= 16) else "centrum"
            else:
                rec.update(x=round(sum(p[0] for p in pts) / len(pts), 1), y=round(sum(p[1] for p in pts) / len(pts), 1), soort="centrum")
            if t.get("indoor") == "yes" or t.get("covered") == "yes":
                rec["binnen"] = True
            rec["plaats"] = plaats_bij(places, rec["x"], rec["y"])
            padel.append(rec)
        else:
            if t.get("golf"):
                rec["golf"] = t["golf"]
            if t.get("leisure"):
                rec["leisure"] = t["leisure"]
            if "pitch_and_putt" in t.get("sport", "") or PP_NAME.search(name or ""):  # de naam alleen om te herkennen, niet bewaard
                rec["pp"] = True
            if t.get("par", "").isdigit():
                rec["par"] = int(t["par"])
            if closed:
                cx, cy, rot, l, w = obb(pts)
                rec.update(x=round(cx, 1), y=round(cy, 1), rot=round(rot, 3), l=round(l, 1), w=round(w, 1), ha=round(area(pts) / 1e4, 2),
                           ring=[r1(p) for p in simplify(pts[:-1], 5.0)])
            elif len(pts) >= 2:
                rec.update(x=round(sum(p[0] for p in pts) / len(pts), 1), y=round(sum(p[1] for p in pts) / len(pts), 1),
                           lijn=[r1(p) for p in simplify(pts, 2.0)])
            else:
                rec.update(x=round(pts[0][0], 1), y=round(pts[0][1], 1))
            if rec.get("leisure") in ("golf_course", "miniature_golf"):
                rec["plaats"] = plaats_bij(places, rec["x"], rec["y"])
            golf.append(rec)
    # golf=* onderdelen (tee, green, hole, bunker...) alleen bij een baan: binnen de omhullende van een baan + 60 m
    banen = [g for g in golf if g.get("leisure") == "golf_course" and "ring" in g]
    def bij_baan(g):
        for b in banen:
            xs = [p[0] for p in b["ring"]]; ys = [p[1] for p in b["ring"]]
            if min(xs) - 60 <= g["x"] <= max(xs) + 60 and min(ys) - 60 <= g["y"] <= max(ys) + 60:
                return True
        return False
    golf = [g for g in golf if g.get("leisure") in ("golf_course", "miniature_golf") or bij_baan(g)]
    for g in golf:
        if g.get("leisure") == "golf_course" and g.get("ha", 99) <= 6:
            g["pp"] = True  # kleine baan: Pitch & Putt-formaat
    padel.sort(key=lambda r: (r["x"], r["y"]))
    golf.sort(key=lambda r: (r["x"], r["y"]))
    data = {"bron": "OpenStreetMap (ODbL), provincie-extract", "frame": "rd-new", "padel": padel, "golf": golf}
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(data, separators=(",", ":"), ensure_ascii=False) + "\n")
    print(f"padel {len(padel)}, golf {len(golf)} -> {out} ({os.path.getsize(out)} bytes)")


if __name__ == "__main__":
    main()
