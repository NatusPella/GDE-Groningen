#!/usr/bin/env python3
"""Lane audit on the current data (docs/PROVINCIE-PLAN.md 2.12).

    python3 scripts/world/audit_lanes.py [--json out.json]

For every car road in the OSM caches: the number of lanes OSM says (per
direction, from `lanes`, `lanes:forward/backward`, else a default per class)
against the number the game draws (roadsurface.js: round(width / 3.3), with
the width from process_osm.py: the `width`/`est_width` tag, else the default
of the class for the WHOLE road). One-way halves of a dual carriageway get the
width of the whole road, so they come out with too many lanes (scale audit
#9). Prints counts and kilometres per class, and the worst ways on the ring
and the A7. F0 only reports; the fix comes with the F1 builder.
"""
import gzip
import json
import math
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import process_osm as P  # noqa: E402
from rdnew import project  # noqa: E402

LANES_DEFAULT = {"motorway": 2, "trunk": 2, "primary": 2, "secondary": 1, "tertiary": 1, "residential": 1,
                 "unclassified": 1, "living_street": 1, "service": 1, "track": 1,
                 "motorway_link": 1, "trunk_link": 1, "primary_link": 1, "secondary_link": 1, "tertiary_link": 1}
CLASSES = [c for c in P.ROAD_SPEC if P.ROAD_SPEC[c]["cat"] in ("major", "normal", "minor") and c not in ("track",)]


def num(v):
    try:
        return int(float(str(v).split(";")[0]))
    except (TypeError, ValueError):
        return None


def per_direction(t, oneway):
    """Lanes in the way's own direction according to the tags."""
    total = num(t.get("lanes"))
    fwd, bwd = num(t.get("lanes:forward")), num(t.get("lanes:backward"))
    if oneway:
        return fwd or total or LANES_DEFAULT.get(t["highway"], 1)
    if fwd or bwd:
        return fwd or bwd
    if total:
        return max(1, total // 2) if total > 1 else 1
    return LANES_DEFAULT.get(t["highway"], 1)


def main():
    els = P.load_elements()
    rows = []
    for el in els:
        t = el.get("tags") or {}
        hw = t.get("highway")
        if el.get("type") != "way" or hw not in CLASSES or not el.get("geometry"):
            continue
        geom = [g for g in el["geometry"] if g]
        if len(geom) < 2:
            continue
        spec = P.ROAD_SPEC[hw]
        round_ = t.get("junction") == "roundabout"
        oneway = round_ or t.get("oneway") in ("yes", "1", "true") or (hw in ("motorway", "motorway_link") and t.get("oneway") != "no")
        width = spec["width"]
        tw = t.get("width") or t.get("est_width")
        if tw:
            try:
                width = max(2.5, float(str(tw).split()[0].replace(",", ".")))
            except ValueError:
                pass
        drawn = max(1, round(width / 3.3))
        want = per_direction({**t, "highway": hw}, oneway)
        pts = [project(g["lat"], g["lon"], 1) for g in geom]
        km = sum(math.hypot(a[0] - b[0], a[1] - b[1]) for a, b in zip(pts, pts[1:])) / 1000
        rows.append({"id": el["id"], "hw": hw, "ref": t.get("ref"), "name": t.get("name"), "oneway": oneway, "width": width,
                     "tagWidth": bool(tw), "drawn": drawn, "want": want, "km": km, "at": pts[len(pts) // 2]})
    by = defaultdict(lambda: {"n": 0, "km": 0.0, "wrong": 0, "wrongKm": 0.0, "tooMany": 0})
    for r in rows:
        if not r["oneway"]:
            continue
        c = by[r["hw"]]
        c["n"] += 1
        c["km"] += r["km"]
        if r["drawn"] != r["want"]:
            c["wrong"] += 1
            c["wrongKm"] += r["km"]
            if r["drawn"] > r["want"]:
                c["tooMany"] += 1
    print(f"{len(rows)} car ways in the caches, one-way ways by class (drawn vs lanes the tags say):")
    tot = [0, 0]
    for hw in CLASSES:
        c = by.get(hw)
        if not c:
            continue
        tot[0] += c["n"]; tot[1] += c["wrong"]
        print(f"  {hw:16s} {c['n']:5d} ways {c['km']:7.1f} km: {c['wrong']:5d} wrong ({c['wrongKm']:6.1f} km), {c['tooMany']} too many lanes")
    print(f"  total one-way ways {tot[0]}, wrong {tot[1]}")
    worst = [r for r in rows if r["oneway"] and r["hw"] in ("motorway", "trunk", "primary") and r["drawn"] > r["want"]]
    worst.sort(key=lambda r: -r["km"])
    print("worst one-way halves (drawn > tags): ")
    for r in worst[:12]:
        print(f"  {r['hw']:9s} {r['ref'] or '':6s} {(r['name'] or '')[:28]:28s} {r['km']:.2f} km drawn {r['drawn']} lanes (width {r['width']} m), tags say {r['want']}  at {r['at']}")
    two = [r for r in rows if not r["oneway"] and r["hw"] in ("motorway", "trunk", "primary", "secondary")]
    print(f"two-way ways of the main classes: {len(two)}, width default for the whole road, {sum(1 for r in two if r['tagWidth'])} with a width tag")
    if "--json" in sys.argv:
        out = sys.argv[sys.argv.index("--json") + 1]
        with open(out, "w") as f:
            json.dump({"byClass": by, "worst": worst[:200]}, f)
    return tot


if __name__ == "__main__":
    main()
