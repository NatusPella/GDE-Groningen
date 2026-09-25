#!/usr/bin/env python3
"""Merge Groningen's railway network into game/citymap.json.

Adds four top-level keys and touches nothing else:
  rails          [{pts, service}]            every railway=rail way (clipped)
  stations       [{name, x, y}]              railway=station nodes
  levelCrossings [{x, y, roads: [...]}]      railway=level_crossing groups
  railRoutes     [{name, pts, stops}]        shuttle paths the trains drive

Raw OSM is cached in data/railways_raw.json; delete it to refetch.
"""
import heapq
import json
import math
import os
import subprocess

MAP_PATH = "game/citymap.json"
RAW_PATH = "data/railways_raw.json"
BBOX = "53.200,6.530,53.240,6.600"
OVERPASS_URLS = [
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]
QUERY = (
    "[out:json][timeout:90];("
    f'way["railway"="rail"]({BBOX});'
    f'way["railway"="platform"]({BBOX});'
    f'node["railway"="level_crossing"]({BBOX});'
    f'node["railway"="station"]({BBOX});'
    f'node["railway"="halt"]({BBOX});'
    ");out geom;"
)

STATION_NAMES = {
    "Groningen": "Groningen Hoofdstation",
}
# (name, from, to, train type). Each route gets its own track where the
# network has a parallel one, so the shuttles never share rails.
ROUTES = [
    ("Stoptrein Noord", "Groningen Noord", "Groningen Hoofdstation", "gtw"),
    ("Intercity Europapark", "Groningen Hoofdstation", "Groningen Europapark", "virm"),
    ("Stoptrein Europapark", "Groningen Hoofdstation", "Groningen Europapark", "wink"),
]
MAX_TURN = math.radians(28)
ROUTE_OVERRUN = 220.0
CLIP_MARGIN = 150.0


def fetch():
    for url in OVERPASS_URLS:
        r = subprocess.run(
            ["curl", "-s", "-m", "150", "-A", "Mozilla/5.0", "--data-urlencode", f"data={QUERY}", url],
            capture_output=True, text=True,
        )
        if r.returncode == 0 and r.stdout.lstrip().startswith("{"):
            with open(RAW_PATH, "w") as f:
                f.write(r.stdout)
            return json.loads(r.stdout)["elements"]
    raise SystemExit("all Overpass endpoints failed")


def load_raw():
    if os.path.exists(RAW_PATH):
        with open(RAW_PATH) as f:
            txt = f.read()
        if txt.lstrip().startswith("{"):
            return json.loads(txt)["elements"]
    return fetch()


def seg_intersect(a, b, c, d):
    """Parameters (t along ab, u along cd) of the crossing point, or None."""
    rx, ry = b[0] - a[0], b[1] - a[1]
    sx, sy = d[0] - c[0], d[1] - c[1]
    den = rx * sy - ry * sx
    if abs(den) < 1e-9:
        return None
    qx, qy = c[0] - a[0], c[1] - a[1]
    t = (qx * sy - qy * sx) / den
    u = (qx * ry - qy * rx) / den
    if 0 <= t <= 1 and 0 <= u <= 1:
        return t, u
    return None


def main():
    with open(MAP_PATH) as f:
        data = json.load(f)
    meta = data["meta"]
    lat0, lon0 = meta["origin"]["lat"], meta["origin"]["lon"]
    m_lat, m_lon = meta["mPerDegLat"], meta["mPerDegLon"]
    bx0, by0, bx1, by1 = meta["bounds"]

    def project(lat, lon):
        return ((lon - lon0) * m_lon, (lat0 - lat) * m_lat)

    def inside(p, margin=CLIP_MARGIN):
        return bx0 - margin <= p[0] <= bx1 + margin and by0 - margin <= p[1] <= by1 + margin

    elements = load_raw()
    ways = [e for e in elements if e["type"] == "way" and e.get("tags", {}).get("railway") == "rail"]
    nodes_xy = {}
    adj = {}
    for w in ways:
        ids = w["nodes"]
        for nid, g in zip(ids, w["geometry"]):
            nodes_xy[nid] = project(g["lat"], g["lon"])
        cost = 1.0 if w["tags"].get("service") is None else 3.0
        for a, b in zip(ids, ids[1:]):
            adj.setdefault(a, []).append((b, cost))
            adj.setdefault(b, []).append((a, cost))

    # ---- rails: clipped polylines ------------------------------------------------
    rails = []
    for w in ways:
        run = []
        pts = [nodes_xy[n] for n in w["nodes"]]
        for p in pts + [None]:
            if p is not None and inside(p):
                run.append([round(p[0], 1), round(p[1], 1)])
                continue
            if len(run) >= 2:
                rails.append({"pts": run, "service": w["tags"].get("service") or w["tags"].get("usage") or "main"})
            run = []

    # ---- stations ----------------------------------------------------------------
    stations = []
    for e in elements:
        t = e.get("tags", {})
        if e["type"] == "node" and t.get("railway") in ("station", "halt"):
            name = STATION_NAMES.get(t.get("name"), t.get("name"))
            x, y = project(e["lat"], e["lon"])
            if inside((x, y), 0):
                stations.append({"name": name, "x": round(x, 1), "y": round(y, 1)})
    by_name = {s["name"]: s for s in stations}

    # ---- train routes --------------------------------------------------------------
    def turn_ok(p, u, v):
        if p is None:
            return True
        ax, ay = nodes_xy[u][0] - nodes_xy[p][0], nodes_xy[u][1] - nodes_xy[p][1]
        bx, by = nodes_xy[v][0] - nodes_xy[u][0], nodes_xy[v][1] - nodes_xy[u][1]
        la, lb = math.hypot(ax, ay), math.hypot(bx, by)
        if la < 1e-6 or lb < 1e-6:
            return True
        c = max(-1, min(1, (ax * bx + ay * by) / (la * lb)))
        return math.acos(c) <= MAX_TURN

    def near_nodes(st, radius):
        return [n for n, (x, y) in nodes_xy.items() if math.hypot(x - st["x"], y - st["y"]) < radius]

    def route(src, dst, penalty):
        """Dijkstra over (node, came_from) so the path never takes a switch backwards."""
        goals = set(dst)
        pq = []
        best = {}
        for n in src:
            heapq.heappush(pq, (0.0, n, None, None))
        parent = {}
        while pq:
            d, u, p, par = heapq.heappop(pq)
            key = (u, p)
            if key in best:
                continue
            best[key] = d
            parent[key] = par
            if u in goals:
                path = [u]
                k = par
                while k is not None:
                    path.append(k[0])
                    k = parent[k]
                return path[::-1]
            for v, cost in adj.get(u, []):
                if v == p or not turn_ok(p, u, v):
                    continue
                if (v, u) in best:
                    continue
                seg = math.hypot(nodes_xy[v][0] - nodes_xy[u][0], nodes_xy[v][1] - nodes_xy[u][1])
                extra = 4.0 if frozenset((u, v)) in penalty else 1.0
                heapq.heappush(pq, (d + seg * cost * extra, v, u, key))
        return None

    def extend(path, dist):
        """Continue straight on past the last node so a stopping train has track under it."""
        out = list(path)
        run = 0.0
        while run < dist:
            u, p = out[-1], out[-2]
            opts = [v for v, _ in adj.get(u, []) if v != p and v not in out and turn_ok(p, u, v)]
            if not opts:
                break
            v = opts[0]
            run += math.hypot(nodes_xy[v][0] - nodes_xy[u][0], nodes_xy[v][1] - nodes_xy[u][1])
            out.append(v)
        return out

    def densify(pts):
        out = [pts[0]]
        for a, b in zip(pts, pts[1:]):
            L = math.hypot(b[0] - a[0], b[1] - a[1])
            n = max(1, int(L / 8))
            for i in range(1, n + 1):
                out.append((a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n))
        return out

    def arc_of(pts, x, y):
        best, s, run = None, 0.0, 0.0
        for a, b in zip(pts, pts[1:]):
            dx, dy = b[0] - a[0], b[1] - a[1]
            L = math.hypot(dx, dy)
            if L < 1e-6:
                continue
            t = max(0, min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (L * L)))
            d = math.hypot(a[0] + dx * t - x, a[1] + dy * t - y)
            if best is None or d < best:
                best, s = d, run + L * t
            run += L
        return s, best

    used = set()
    rail_routes = []
    for name, a, b, train in ROUTES:
        sa, sb = by_name[a], by_name[b]
        src = near_nodes(sa, 110 if "Hoofd" not in a else 130)
        dst = near_nodes(sb, 110 if "Hoofd" not in b else 130)
        best_path = route(src, dst, used)
        if not best_path:
            raise SystemExit(f"no route for {name}")
        path = extend(best_path, ROUTE_OVERRUN)
        path = extend(path[::-1], ROUTE_OVERRUN)
        for u, v in zip(path, path[1:]):
            used.add(frozenset((u, v)))
        pts = densify([nodes_xy[n] for n in path])
        stops = []
        for st in (sa, sb):
            s, d = arc_of(pts, st["x"], st["y"])
            stops.append({"name": st["name"], "s": round(s, 1)})
        stops.sort(key=lambda s: s["s"])
        rail_routes.append({
            "name": name,
            "train": train,
            "pts": [[round(x, 1), round(y, 1)] for x, y in pts],
            "stops": stops,
        })
        L = sum(math.hypot(q[0] - p[0], q[1] - p[1]) for p, q in zip(pts, pts[1:]))
        print(f"{name}: {len(pts)} pts, {L:.0f} m, stops {stops}")

    # ---- level crossings -------------------------------------------------------------
    lc_nodes = [project(e["lat"], e["lon"]) for e in elements
                if e["type"] == "node" and e.get("tags", {}).get("railway") == "level_crossing"]
    groups = []
    for p in lc_nodes:
        for g in groups:
            if math.hypot(g["cx"] - p[0], g["cy"] - p[1]) < 18:
                g["pts"].append(p)
                g["cx"] = sum(q[0] for q in g["pts"]) / len(g["pts"])
                g["cy"] = sum(q[1] for q in g["pts"]) / len(g["pts"])
                break
        else:
            groups.append({"pts": [p], "cx": p[0], "cy": p[1]})

    rail_segs = []
    for r in rails:
        for a, b in zip(r["pts"], r["pts"][1:]):
            rail_segs.append((a, b))

    crossings = []
    for g in groups:
        cx, cy = g["cx"], g["cy"]
        if not inside((cx, cy), 0):
            continue
        near_rails = [s for s in rail_segs
                      if min(math.hypot(s[0][0] - cx, s[0][1] - cy), math.hypot(s[1][0] - cx, s[1][1] - cy)) < 60]
        roads_out = []
        for road in data["roads"]:
            if road.get("bridge") or road.get("tunnel"):
                continue
            pts = road["pts"]
            if not any(math.hypot(p[0] - cx, p[1] - cy) < 80 for p in pts):
                continue
            hits = []
            for i, (a, b) in enumerate(zip(pts, pts[1:])):
                for s in near_rails:
                    r = seg_intersect(a, b, s[0], s[1])
                    if r is None:
                        continue
                    t = r[0]
                    hx, hy = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
                    if math.hypot(hx - cx, hy - cy) > 16:
                        continue
                    hits.append((hx, hy, a, b))
            if not hits:
                continue
            a, b = hits[0][2], hits[0][3]
            ang = math.atan2(b[1] - a[1], b[0] - a[0])
            ux, uy = math.cos(ang), math.sin(ang)
            ox, oy = hits[0][0], hits[0][1]
            ts = [(h[0] - ox) * ux + (h[1] - oy) * uy for h in hits]
            roads_out.append({
                "x": round(ox, 2), "y": round(oy, 2), "angle": round(ang, 4),
                "t0": round(min(ts), 2), "t1": round(max(ts), 2),
                "width": road.get("width", 6), "cat": road["cat"], "name": road.get("name"),
                "oneway": bool(road.get("oneway")),
            })
        if not roads_out:
            continue
        s0 = min(near_rails, key=lambda s: math.hypot((s[0][0] + s[1][0]) / 2 - cx, (s[0][1] + s[1][1]) / 2 - cy))
        crossings.append({
            "x": round(cx, 1), "y": round(cy, 1),
            "railAngle": round(math.atan2(s0[1][1] - s0[0][1], s0[1][0] - s0[0][0]), 4),
            "roads": roads_out,
        })
        print(f"level crossing ({cx:.0f},{cy:.0f}): {[(r['name'], r['cat']) for r in roads_out]}")

    data["rails"] = rails
    data["stations"] = stations
    data["levelCrossings"] = crossings
    data["railRoutes"] = rail_routes
    with open(MAP_PATH, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(f"{len(rails)} rail polylines, {len(stations)} stations, {len(crossings)} level crossings, {len(rail_routes)} routes")


if __name__ == "__main__":
    main()
