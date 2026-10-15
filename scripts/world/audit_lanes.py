#!/usr/bin/env python3
"""Lane audit of the map against the OSM tags (docs/PROVINCIE-PLAN.md 2.12).

    python3 scripts/world/audit_lanes.py [--strict] [--json out.json]

For every car road in game/citymap.json: the lanes the game draws per
direction (roadsurface.js laneLayout: `lanesFwd`/`lanesBwd` from the lane
model, else round(width / 3.3) for a one-way road and one each way for a
two-way one) against what its OSM way's tags say (lanemodel.py: `lanes`,
`lanes:forward/backward`, a default per class), the turn lanes against
`turn:lanes`, and the one-way carriageways that are still wider than their
lanes (the scale audit's point 9: each half of a dual carriageway had the
width of the whole road). Prints counts and kilometres per class and the
worst ways; --strict exits 1 on any mismatch or too wide carriageway.
"""
import json
import math
import os
import sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)
import process_osm as P  # noqa: E402
from lanemodel import lane_fields, LANE_W, ONEWAY_EXTRA  # noqa: E402
from lanes import osm_ways, match, duals, MAP, CAR  # noqa: E402


def drawn(r):
    if r.get("lanesFwd") is not None:
        return r["lanesFwd"], r.get("lanesBwd", 0)
    if r.get("oneway"):
        return max(1, round(r["width"] / 3.3)), 0
    return 1, 1


def km(r):
    return sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(r["pts"], r["pts"][1:])) / 1000


def main():
    with open(MAP) as f:
        data = json.load(f)
    ways, grid = osm_ways()
    dual = duals(data["roads"])
    by = defaultdict(lambda: {"n": 0, "km": 0.0, "lanes": 0, "lanesKm": 0.0, "turn": 0, "wide": 0, "wideKm": 0.0, "nomodel": 0})
    worst = []
    unmatched = 0
    for r in data["roads"]:
        if r["cat"] not in CAR or r["type"] not in P.ROAD_SPEC:
            continue
        w = match(r, ways, grid)
        if not w:
            unmatched += 1
            continue
        want = lane_fields(r["type"], w["tags"], P.ROAD_SPEC[r["type"]]["width"], dual=id(r) in dual)
        c = by[r["type"]]
        L = km(r)
        c["n"] += 1
        c["km"] += L
        if r.get("lanesFwd") is None:
            c["nomodel"] += 1
        got = drawn(r)
        if got != (want["lanesFwd"], want["lanesBwd"]):
            c["lanes"] += 1
            c["lanesKm"] += L
            worst.append({"what": "lanes", "type": r["type"], "ref": r.get("ref"), "name": r.get("name"), "drawn": got, "tags": (want["lanesFwd"], want["lanesBwd"]), "km": L, "at": [round(v) for v in r["pts"][len(r["pts"]) // 2]]})
        if (r.get("turnFwd"), r.get("turnBwd")) != (want.get("turnFwd"), want.get("turnBwd")):
            c["turn"] += 1
        # a one-way carriageway wider than its lanes and edges (and no width tag)
        if r.get("oneway") and r["type"] in ONEWAY_EXTRA and not (w["tags"].get("width") or w["tags"].get("est_width")) and (r["type"] not in ("secondary", "tertiary") or id(r) in dual):
            lim = want["lanesFwd"] * LANE_W.get(r["type"], 3.0) + ONEWAY_EXTRA[r["type"]] + 0.5
            if r["width"] > lim:
                c["wide"] += 1
                c["wideKm"] += L
                worst.append({"what": "wide", "type": r["type"], "ref": r.get("ref"), "name": r.get("name"), "width": r["width"], "lim": lim, "km": L, "at": [round(v) for v in r["pts"][len(r["pts"]) // 2]]})
    tot = defaultdict(int)
    print(f"car roads matched to their OSM way: {sum(c['n'] for c in by.values())} ({unmatched} not matched)")
    print("per class: lanes drawn vs the tags, turn lanes vs turn:lanes, one-way carriageways wider than their lanes")
    for hw in P.ROAD_SPEC:
        c = by.get(hw)
        if not c:
            continue
        for k in ("n", "lanes", "turn", "wide", "nomodel"):
            tot[k] += c[k]
        print(f"  {hw:16s} {c['n']:5d} ways {c['km']:6.1f} km: lanes wrong {c['lanes']:4d} ({c['lanesKm']:5.1f} km), turn lanes wrong {c['turn']:3d}, too wide {c['wide']:4d} ({c['wideKm']:5.1f} km), without the lane model {c['nomodel']}")
    print(f"  total {tot['n']} ways: lanes wrong {tot['lanes']}, turn lanes wrong {tot['turn']}, too wide {tot['wide']}, without the lane model {tot['nomodel']}")
    worst.sort(key=lambda q: -q["km"])
    for q in worst[:12]:
        if q["what"] == "lanes":
            print(f"  lanes {q['type']:12s} {q['ref'] or '':6s} {(q['name'] or '')[:26]:26s} {q['km']:.2f} km drawn {q['drawn']}, tags {q['tags']} at {q['at']}")
        else:
            print(f"  wide  {q['type']:12s} {q['ref'] or '':6s} {(q['name'] or '')[:26]:26s} {q['km']:.2f} km {q['width']} m for {q['lim']:.1f} m at {q['at']}")
    if "--json" in sys.argv:
        with open(sys.argv[sys.argv.index("--json") + 1], "w") as f:
            json.dump({"byClass": by, "worst": worst[:200]}, f)
    if "--strict" in sys.argv and (tot["lanes"] or tot["turn"] or tot["wide"]):
        sys.exit(1)
    return tot


if __name__ == "__main__":
    main()
