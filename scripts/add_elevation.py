#!/usr/bin/env python3
"""Real heights for the ringweg and its grade-separated junctions.

Groningen is flat and so is the game, except the ring: the Zuidelijke
Ringweg runs sunken (open cuttings and covered 'deksel' sections), and the
other ring roads cross roads, rails and canals on viaducts. This script
turns the OSM grade tags that process_osm.py keeps (layer, tunnel, viaduct,
bridge) into a height profile per road vertex:

  road["z"] = [z0, z1, ...]   metres relative to street level (only roads
                              that are not flat get one)

1. Plateaus. Ring roads (motorway/trunk/primary + links) tagged tunnel or
   with a negative layer sit at SUNK below street level; bridge=viaduct ring
   roads at LIFT above it. At every crossing between two roads (or a road and
   a rail) of different layers where at least one is a ring road, the upper
   one must clear the lower one by CLEAR: the tagged one moves (a bridge
   rises, a tunnel sinks, otherwise the ring road does), iterated until all
   crossings clear. Other roads (canal bridges, parking garage tunnels, the
   whole city) stay flat.
   Crossing constraints only bind the vertices right at the crossing, so a
   bridge way humps over what it spans instead of being lifted end to end.
2. Ramps. The constraints are lower/upper bounds; every vertex takes the
   height closest to street level that the bounds allow at MAX_GRADE over
   the road network, so on- and off-ramps, the ring beyond a viaduct and
   junction approaches slope down evenly (where two opposite bounds are too
   close for MAX_GRADE the vertex goes halfway). Ring roads and roads
   crossing them are densified to STEP metres for this and lightly smoothed
   (vertical curves); vertices that end up flat and straight are dropped.

Runs after process_osm.py and before add_railways.py (which leaves the rail
flat where the road already passes over or under it).
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

MAP_PATH = "game/citymap.json"
RING_TYPES = {"motorway", "motorway_link", "trunk", "trunk_link", "primary", "primary_link"}
CAR = {"major", "normal", "minor"}
LIFT = 6.0       # viaduct deck above street level (m)
SUNK = -6.5      # sunken ring road below street level (m)
CLEAR = 5.6      # vertical clearance between crossing roads (m)
MAX_GRADE = 0.05
STEP = 8.0       # densify sloped roads to this spacing (m)
SMOOTH_ITERS = 6
UNDER_WATER = -8.2  # a ring road passing under a canal (aqueduct) stays below the canal bed
RAIL_Z = 0.0


def key(p):
    return (round(p[0] * 10), round(p[1] * 10))


def seg_intersect(a, b, c, d):
    rx, ry = b[0] - a[0], b[1] - a[1]
    sx, sy = d[0] - c[0], d[1] - c[1]
    den = rx * sy - ry * sx
    if abs(den) < 1e-9:
        return None
    qx, qy = c[0] - a[0], c[1] - a[1]
    t = (qx * sy - qy * sx) / den
    u = (qx * ry - qy * rx) / den
    if 0 < t < 1 and 0 < u < 1:
        return t, u
    return None


def layer_of(r):
    return int(r.get("layer", 0))


def is_ring(r):
    return r["type"] in RING_TYPES


def is_down(r):
    return bool(r.get("tunnel")) or layer_of(r) < 0


def is_up(r):
    return bool(r.get("bridge")) or layer_of(r) > 0


def load_rails(meta):
    try:
        from add_railways import load_raw, bbox_for
        elements = load_raw(bbox_for(meta))
    except Exception as e:  # rails are optional for the height solve
        print(f"no rail data for crossings ({e})", file=sys.stderr)
        return []
    lat0, lon0 = meta["origin"]["lat"], meta["origin"]["lon"]
    m_lat, m_lon = meta["mPerDegLat"], meta["mPerDegLon"]
    rails = []
    for w in elements:
        t = w.get("tags", {})
        if w.get("type") != "way" or t.get("railway") != "rail":
            continue
        pts = [((g["lon"] - lon0) * m_lon, (lat0 - g["lat"]) * m_lat) for g in w["geometry"]]
        lay = 0
        try:
            lay = int(t.get("layer", "0"))
        except ValueError:
            pass
        if t.get("bridge") in ("yes", "viaduct") and lay == 0:
            lay = 1
        rails.append({"pts": pts, "layer": lay, "rail": True, "type": "rail", "cat": "rail"})
    return rails


def crossings(roads, rails):
    """(upper, lower, x, y) for every non-shared crossing that involves a ring road."""
    G = 60.0
    grid = {}
    items = [r for r in roads if r["cat"] in CAR or r["cat"] in ("cycle", "foot")] + rails
    for idx, r in enumerate(items):
        P = r["pts"]
        for i in range(len(P) - 1):
            x0, x1 = sorted((P[i][0], P[i + 1][0]))
            y0, y1 = sorted((P[i][1], P[i + 1][1]))
            for gx in range(int(math.floor(x0 / G)), int(math.floor(x1 / G)) + 1):
                for gy in range(int(math.floor(y0 / G)), int(math.floor(y1 / G)) + 1):
                    grid.setdefault((gx, gy), []).append((idx, i))
    seen = set()
    out = []
    for cell in grid.values():
        for a in range(len(cell)):
            ia, sa = cell[a]
            ra = items[ia]
            for b in range(a + 1, len(cell)):
                ib, sb = cell[b]
                if ia == ib:
                    continue
                rb = items[ib]
                if not (is_ring(ra) or is_ring(rb)):
                    continue
                if ra.get("rail") and rb.get("rail"):
                    continue
                # footways/cycleways only matter under/over a ring road, never set heights
                if (ra["cat"] in ("cycle", "foot") or rb["cat"] in ("cycle", "foot")):
                    continue
                k = (min(ia, ib), max(ia, ib), sa if ia < ib else sb, sb if ia < ib else sa)
                if k in seen:
                    continue
                seen.add(k)
                A, B = ra["pts"][sa], ra["pts"][sa + 1]
                C, D = rb["pts"][sb], rb["pts"][sb + 1]
                if key(A) in (key(C), key(D)) or key(B) in (key(C), key(D)):
                    continue
                hit = seg_intersect(A, B, C, D)
                if not hit:
                    continue
                la, lb = layer_of(ra), layer_of(rb)
                if ra.get("rail"):
                    la = ra["layer"]
                if rb.get("rail"):
                    lb = rb["layer"]
                if la == lb:
                    # same layer but no shared node: trust the bridge/tunnel tags
                    ua, ub = is_up(ra) - is_down(ra), is_up(rb) - is_down(rb)
                    if ua == ub:
                        continue
                    la, lb = ua, ub
                x = A[0] + (B[0] - A[0]) * hit[0]
                y = A[1] + (B[1] - A[1]) * hit[0]
                up, lo = (ra, rb) if la > lb else (rb, ra)
                out.append((up, lo, x, y))
    return out


def point_in_poly(x, y, pts):
    inside = False
    j = len(pts) - 1
    for i in range(len(pts)):
        xi, yi = pts[i]
        xj, yj = pts[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def base_plateaus(roads, water):
    """Whole-way bounds from the tags: sunken ring roads and ring viaducts."""
    lo, hi = {}, {}
    wb = []
    for w in water:
        xs, ys = [p[0] for p in w["pts"]], [p[1] for p in w["pts"]]
        wb.append((min(xs) - 6, min(ys) - 6, max(xs) + 6, max(ys) + 6, w["pts"]))

    def wet(x, y):
        for x0, y0, x1, y1, pts in wb:
            if x0 <= x <= x1 and y0 <= y <= y1:
                for dx, dy in ((0, 0), (6, 0), (-6, 0), (0, 6), (0, -6)):
                    if point_in_poly(x + dx, y + dy, pts):
                        return True
        return False
    for r in roads:
        if not is_ring(r) or r["cat"] not in CAR:
            continue
        if is_down(r) and not r.get("bridge"):
            for p in r["pts"]:
                k = key(p)
                hi[k] = min(hi.get(k, 1e9), UNDER_WATER if wet(p[0], p[1]) else SUNK)
        elif r.get("viaduct"):
            for p in r["pts"]:
                k = key(p)
                lo[k] = max(lo.get(k, -1e9), LIFT)
    return lo, hi


def build_graph(roads):
    adj = {}
    for r in roads:
        P = r["pts"]
        for i in range(len(P) - 1):
            a, b = key(P[i]), key(P[i + 1])
            L = math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1])
            adj.setdefault(a, []).append((b, L))
            adj.setdefault(b, []).append((a, L))
    return adj


def propagate(adj, bound, sign, reach=14.0):
    """sign=1: lowest height the lower bounds allow anywhere (z >= b - g*d);
    sign=-1: highest height the upper bounds allow (z <= b + g*d)."""
    import heapq
    val = {k: b * sign for k, b in bound.items()}
    pq = [(-v, k) for k, v in val.items()]
    heapq.heapify(pq)
    while pq:
        nv, u = heapq.heappop(pq)
        v = -nv
        if v < val.get(u, -1e9) - 1e-9:
            continue
        for w, L in adj.get(u, []):
            nw = v - MAX_GRADE * L
            if nw > -reach and nw > val.get(w, -1e9) + 1e-9:
                val[w] = nw
                heapq.heappush(pq, (-nw, w))
    return {k: v * sign for k, v in val.items()}


def densify(pts, step):
    out = [pts[0]]
    for a, b in zip(pts, pts[1:]):
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        n = max(1, int(math.ceil(L / step)))
        for i in range(1, n + 1):
            out.append([round(a[0] + (b[0] - a[0]) * i / n, 1), round(a[1] + (b[1] - a[1]) * i / n, 1)])
    ded = [out[0]]
    for p in out[1:]:
        if p != ded[-1]:
            ded.append(p)
    return ded


def solve_field(adj, lo_b, hi_b):
    lo = propagate(adj, lo_b, 1)
    hi = propagate(adj, hi_b, -1)
    z = {}
    for k in set(lo) | set(hi):
        a, b = lo.get(k, -1e9), hi.get(k, 1e9)
        v = min(max(0.0, a), b) if a <= b else (a + b) / 2
        if abs(v) > 1e-3:
            z[k] = v
    return z


def z_on(r, zmap, x, y):
    if r.get("rail"):
        return RAIL_Z
    P = r["pts"]
    best, bz = 1e18, 0.0
    for i in range(len(P) - 1):
        ax, ay = P[i]
        dx, dy = P[i + 1][0] - ax, P[i + 1][1] - ay
        L2 = dx * dx + dy * dy or 1
        t = max(0, min(1, ((x - ax) * dx + (y - ay) * dy) / L2))
        d = (ax + dx * t - x) ** 2 + (ay + dy * t - y) ** 2
        if d < best:
            best = d
            bz = zmap.get(key(P[i]), 0.0) * (1 - t) + zmap.get(key(P[i + 1]), 0.0) * t
    return bz


def mover(up, lo, zu, zl):
    """Which side of a crossing gets moved to make room: 'up' or 'lo' (or None)."""
    if lo.get("rail"):
        # a rail under a road: only a ring bridge rises over it; an at-grade
        # ring road under a rail bridge is add_railways' rail lift
        return "up" if (not up.get("rail") and is_ring(up) and is_up(up)) else None
    if up.get("rail"):
        return "lo" if (is_ring(lo) and is_down(lo)) else None
    if is_up(up) and not (is_down(lo) and zl < -1):
        return "up"
    if is_down(lo):
        return "lo"
    return "up" if is_ring(up) else "lo"


def main():
    with open(MAP_PATH) as f:
        data = json.load(f)
    roads = data["roads"]
    for r in roads:
        r.pop("z", None)
    rails = load_rails(data["meta"])

    # densify every ring road and every road crossing one, so heights can
    # change along them and a crossing binds the vertices right at it
    cross = crossings(roads, rails)
    involved = {id(r) for c in cross for r in c[:2] if not r.get("rail")}
    originals = {}
    for r in roads:
        if is_ring(r) or id(r) in involved:
            originals[id(r)] = {key(p) for p in r["pts"]}
            r["pts"] = densify(r["pts"], STEP)
    cross = crossings(roads, rails)
    print(f"{len(cross)} crossings involving ring roads")

    adj = build_graph(roads)
    lo_b, hi_b = base_plateaus(roads, data["water"])
    zmap = {}
    for it in range(16):
        zmap = solve_field(adj, lo_b, hi_b)
        changed = 0
        for up, lo, x, y in cross:
            zu, zl = z_on(up, zmap, x, y), z_on(lo, zmap, x, y)
            if zu - zl >= CLEAR - 0.05:
                continue
            m = mover(up, lo, zu, zl)
            if m is None:
                continue
            road, other = (up, lo) if m == "up" else (lo, up)
            reach = (other.get("width", 6) / 2 if not other.get("rail") else 3.0) + 3.0
            need = zl + CLEAR if m == "up" else zu - CLEAR
            for p in road["pts"]:
                if math.hypot(p[0] - x, p[1] - y) <= reach:
                    k = key(p)
                    if m == "up" and lo_b.get(k, -1e9) < need - 0.01:
                        lo_b[k] = need
                        changed += 1
                    elif m == "lo" and hi_b.get(k, 1e9) > need + 0.01:
                        hi_b[k] = need
                        changed += 1
        if not changed:
            break
    fixed = set(lo_b) | set(hi_b)
    print(f"solved in {it + 1} passes; {sum(1 for v in lo_b.values() if v > 0)} raised and "
          f"{sum(1 for v in hi_b.values() if v < 0)} sunk constraint vertices")

    # vertical curves: relax the free vertices towards their neighbours
    for _ in range(SMOOTH_ITERS):
        nxt = {}
        for k, z in zmap.items():
            if k in fixed:
                continue
            ns = adj.get(k, [])
            if not ns:
                continue
            wsum = sum(1.0 / max(L, 1.0) for _, L in ns)
            avg = sum(zmap.get(n, 0.0) / max(L, 1.0) for n, L in ns) / wsum
            nxt[k] = z * 0.5 + avg * 0.5
        zmap.update(nxt)

    n_roads, max_grade = 0, 0.0
    for r in roads:
        zs = [round(zmap.get(key(p), 0.0), 2) for p in r["pts"]]
        keep_orig = originals.get(id(r))
        if keep_orig is not None:
            # drop densified vertices that carry nothing (flat and straight)
            P2, Z2 = [r["pts"][0]], [zs[0]]
            for i in range(1, len(r["pts"]) - 1):
                p = r["pts"][i]
                if key(p) in keep_orig or len(adj.get(key(p), [])) > 2:
                    P2.append(p); Z2.append(zs[i]); continue
                a, b = P2[-1], r["pts"][i + 1]
                La, Lb = math.hypot(p[0] - a[0], p[1] - a[1]), math.hypot(b[0] - p[0], b[1] - p[1])
                lin = Z2[-1] + (zs[i + 1] - Z2[-1]) * La / ((La + Lb) or 1)
                if abs(zs[i] - lin) > 0.03 or La > 40:
                    P2.append(p); Z2.append(zs[i])
            P2.append(r["pts"][-1]); Z2.append(zs[-1])
            r["pts"], zs = P2, Z2
        if any(abs(z) > 0.05 for z in zs):
            r["z"] = zs
            n_roads += 1
            P = r["pts"]
            for i in range(len(P) - 1):
                L = math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1])
                if L > 2:
                    max_grade = max(max_grade, abs(zs[i + 1] - zs[i]) / L)

    bad = 0
    for up, lo, x, y in cross:
        dz = z_on(up, zmap, x, y) - z_on(lo, zmap, x, y)
        if dz < CLEAR - 0.6 and mover(up, lo, 0, 0) is not None:
            bad += 1
            if bad <= 12:
                print(f"  low clearance {dz:.1f} m at ({x:.0f},{y:.0f}): {up.get('name') or up['type']} over {lo.get('name') or lo['type']}")
    print(f"{n_roads} roads with heights, steepest grade {max_grade * 100:.1f}%, {bad} crossings below clearance")
    with open(MAP_PATH, "w") as f:
        json.dump(data, f, separators=(",", ":"))


if __name__ == "__main__":
    main()
