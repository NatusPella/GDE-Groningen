#!/usr/bin/env python3
"""Merge Groningen's railway network into game/citymap.json.

Adds these top-level keys, and cuts foot and cycle paths that would cross a
track at grade away from a level crossing (underpasses the game cannot build):
  rails          [{pts, service}]            every railway=rail way (clipped)
  stations       [{name, x, y}]              railway=station nodes
  levelCrossings [{x, y, roads: [...]}]      railway=level_crossing groups
  railRoutes     [{name, train, pts, stops}] service paths the trains drive
  railLifts      [{x, y, h, plateau, ramp}]  where the track rises over a road

Raw OSM is cached in data/railways_raw.json; delete it to refetch.
"""
import heapq
import json
import math
import os
import subprocess

MAP_PATH = "game/citymap.json"
RAW_PATH = "data/railways_raw.json"
OVERPASS_URLS = [
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]


def bbox_for(meta, pad=0.004):
    """lat/lon box around the map bounds (plus a little for the lines out)."""
    lat0, lon0 = meta["origin"]["lat"], meta["origin"]["lon"]
    m_lat, m_lon = meta["mPerDegLat"], meta["mPerDegLon"]
    x0, y0, x1, y1 = meta["bounds"]
    return (round(lat0 - y1 / m_lat - pad, 3), round(lon0 + x0 / m_lon - pad, 3),
            round(lat0 - y0 / m_lat + pad, 3), round(lon0 + x1 / m_lon + pad, 3))


def query_for(bbox):
    b = ",".join(str(v) for v in bbox)
    return (
        "[out:json][timeout:90];("
        f'way["railway"="rail"]({b});'
        f'way["railway"="platform"]({b});'
        f'node["railway"="level_crossing"]({b});'
        f'node["railway"="station"]({b});'
        f'node["railway"="halt"]({b});'
        ");out geom;"
    )

STATION_NAMES = {
    "Groningen": "Groningen Hoofdstation",
}
# (name, train type, waypoints). Every service starts at Hoofdstation; an
# ("exit", x, y, destination) waypoint is where the line leaves the map -
# the track is then extrapolated EXIT_RUN metres further so the train can
# drive out of view and come back later.
ROUTES = [
    ("Stoptrein Roodeschool", "gtw", ["Groningen Hoofdstation", "Groningen Noord", ("exit", -1000, -4400, "Roodeschool")]),
    ("Intercity Zwolle", "virm", ["Groningen Hoofdstation", "Groningen Europapark", ("exit", 2254, 2320, "Zwolle")]),
    ("Stoptrein Winschoten", "wink", ["Groningen Hoofdstation", "Groningen Europapark", ("exit", 2261, 2311, "Winschoten")]),
    ("Stoptrein Leeuwarden", "gtw", ["Groningen Hoofdstation", ("exit", -3600, 910, "Leeuwarden")]),
]
EXIT_RUN = 800.0
# Rail lifted over roads it crosses without a level crossing (OSM: rail
# bridges, and road bridges we invert so every road stays drivable at y=0).
LIFT_CAR = 6.0
LIFT_CYCLE = 3.6
LIFT_GRADE = 0.05
MAX_TURN = math.radians(28)
ROUTE_OVERRUN = 220.0
CLIP_MARGIN = 150.0
RAIL_CUT = 4.0      # a path crossing a track at grade stops this far from the rail


def fetch(bbox):
    for url in OVERPASS_URLS:
        r = subprocess.run(
            ["curl", "-s", "-m", "150", "-A", "Mozilla/5.0", "--data-urlencode", f"data={query_for(bbox)}", url],
            capture_output=True, text=True,
        )
        if r.returncode == 0 and r.stdout.lstrip().startswith("{"):
            raw = json.loads(r.stdout)
            raw["bbox"] = list(bbox)
            with open(RAW_PATH, "w") as f:
                json.dump(raw, f)
            return raw["elements"]
    raise SystemExit("all Overpass endpoints failed")


def load_raw(bbox):
    """Cached rail data; refetched when the cache does not cover bbox."""
    if os.path.exists(RAW_PATH):
        with open(RAW_PATH) as f:
            txt = f.read()
        if txt.lstrip().startswith("{"):
            raw = json.loads(txt)
            have = raw.get("bbox")
            if have and have[0] <= bbox[0] and have[1] <= bbox[1] and have[2] >= bbox[2] and have[3] >= bbox[3]:
                return raw["elements"]
    return fetch(bbox)


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


def lift_height(lifts, x, y):
    h = 0.0
    for L in lifts:
        d = math.hypot(L["x"] - x, L["y"] - y) - L["plateau"]
        h = max(h, L["h"] * max(0.0, min(1.0, 1 - d / L["ramp"])) if d > 0 else L["h"])
    return h


def cut_paths_at_rails(roads, rails, lifts, lc_pts):
    """Footways and cycleways that cross a track at street level away from a
    level crossing (mostly underpasses: the game has no tunnels for them)
    lose the stretch over the rails, so nobody walks or rides across."""
    segs = [(a, b) for r in rails for a, b in zip(r["pts"], r["pts"][1:])]
    G = 50.0
    grid = {}
    for a, b in segs:
        for gx in range(int(min(a[0], b[0]) // G), int(max(a[0], b[0]) // G) + 1):
            for gy in range(int(min(a[1], b[1]) // G), int(max(a[1], b[1]) // G) + 1):
                grid.setdefault((gx, gy), []).append((a, b))
    extra, n = [], 0
    for road in roads:
        if road["cat"] not in ("foot", "cycle") or road.get("bridge"):
            continue
        pts = road["pts"]
        acc = [0.0]
        for a, b in zip(pts, pts[1:]):
            acc.append(acc[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
        hits = []
        for i, (a, b) in enumerate(zip(pts, pts[1:])):
            cand = set()
            for gx in range(int(min(a[0], b[0]) // G), int(max(a[0], b[0]) // G) + 1):
                for gy in range(int(min(a[1], b[1]) // G), int(max(a[1], b[1]) // G) + 1):
                    cand.update((tuple(s[0]), tuple(s[1])) for s in grid.get((gx, gy), []))
            for ra, rb in cand:
                hit = seg_intersect(a, b, ra, rb)
                if hit is None:
                    continue
                hx, hy = a[0] + (b[0] - a[0]) * hit[0], a[1] + (b[1] - a[1]) * hit[0]
                if any(math.hypot(hx - x, hy - y) < 20 for x, y in lc_pts) or lift_height(lifts, hx, hy) > 2.6:
                    continue
                hits.append(acc[i] + (acc[i + 1] - acc[i]) * hit[0])
        if not hits:
            continue
        hits.sort()
        gaps, s0, s1 = [], hits[0], hits[0]
        for s in hits[1:]:
            if s - s1 > 25:
                gaps.append((s0, s1))
                s0 = s
            s1 = s
        gaps.append((s0, s1))
        keep, start = [], 0.0
        for g0, g1 in gaps:
            keep.append((start, g0 - RAIL_CUT))
            start = g1 + RAIL_CUT
        keep.append((start, acc[-1]))
        pieces = [sub_polyline(pts, acc, s0, s1) for s0, s1 in keep if s1 - s0 >= 3.0]
        n += 1
        road["pts"] = pieces[0] if pieces else pts[:1] * 2
        for p in pieces[1:]:
            extra.append({**road, "pts": p})
    roads[:] = [r for r in roads if not (r["pts"][0] == r["pts"][-1] and len(r["pts"]) == 2)] + extra
    return n


def sub_polyline(pts, acc, s0, s1):
    def at(s):
        for i in range(len(pts)):
            if abs(acc[i] - s) < 1e-6:
                return list(pts[i])
            if i + 1 < len(pts) and acc[i + 1] > s:
                t = (s - acc[i]) / ((acc[i + 1] - acc[i]) or 1)
                return [round(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, 1), round(pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t, 1)]
        return list(pts[-1])
    s0, s1 = max(0.0, s0), min(acc[-1], s1)
    return [at(s0)] + [list(pts[i]) for i in range(len(pts)) if s0 + 1e-6 < acc[i] < s1 - 1e-6] + [at(s1)]


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

    elements = load_raw(bbox_for(meta))
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

    def route(starts, dst, penalty):
        """Dijkstra over (node, came_from) so the path never takes a switch backwards."""
        goals = set(dst)
        pq = []
        best = {}
        for n, prev in starts:
            heapq.heappush(pq, (0.0, n, prev, None))
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

    def nearest_node(x, y):
        return min(nodes_xy, key=lambda n: math.hypot(nodes_xy[n][0] - x, nodes_xy[n][1] - y))

    used = set()
    rail_routes = []
    for name, train, waypoints in ROUTES:
        first = by_name[waypoints[0]]
        path = None
        exit_name = None
        for wp in waypoints[1:]:
            if isinstance(wp, tuple):
                dst = [nearest_node(wp[1], wp[2])]
                exit_name = wp[3]
            else:
                st = by_name[wp]
                dst = near_nodes(st, 110)
            if path is None:
                starts = [(n, None) for n in near_nodes(first, 130)]
            else:
                starts = [(path[-1], path[-2])]
            seg = route(starts, dst, used)
            if not seg:
                raise SystemExit(f"no route for {name} to {wp}")
            path = seg if path is None else path + seg[1:]
        shared = sum(1 for u, v in zip(path, path[1:]) if frozenset((u, v)) in used)
        path = extend(path[::-1], ROUTE_OVERRUN)[::-1]
        for u, v in zip(path, path[1:]):
            used.add(frozenset((u, v)))
        raw_pts = [nodes_xy[n] for n in path]
        (ax, ay), (bx, by) = raw_pts[-2], raw_pts[-1]
        l = math.hypot(bx - ax, by - ay) or 1
        raw_pts.append((bx + (bx - ax) / l * EXIT_RUN, by + (by - ay) / l * EXIT_RUN))
        pts = densify(raw_pts)
        L = sum(math.hypot(q[0] - p[0], q[1] - p[1]) for p, q in zip(pts, pts[1:]))
        stops = []
        for wp in waypoints:
            if isinstance(wp, tuple):
                continue
            st = by_name[wp]
            s_at, _ = arc_of(pts, st["x"], st["y"])
            stops.append({"name": st["name"], "s": round(s_at, 1)})
        stops.sort(key=lambda s: s["s"])
        stops.append({"name": exit_name, "s": round(L - 120, 1), "offmap": True})
        rail_routes.append({
            "name": name,
            "train": train,
            "pts": [[round(x, 1), round(y, 1)] for x, y in pts],
            "stops": stops,
        })
        print(f"{name}: {len(pts)} pts, {L:.0f} m, {shared} edges shared with earlier routes, stops {stops}")

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

    # ---- grade separation ------------------------------------------------------------
    lc_pts = [(c["x"], c["y"]) for c in crossings]
    rail_bridge_segs = []
    for w in ways:
        br = w["tags"].get("bridge") in ("yes", "viaduct", "movable") or w["tags"].get("layer", "0") not in ("0", "-1")
        g = [nodes_xy[n] for n in w["nodes"]]
        for a, b in zip(g, g[1:]):
            rail_bridge_segs.append((a, b, br))
    lifts = []
    for road in data["roads"]:
        cat = road["cat"]
        if cat == "foot":
            continue
        pts = road["pts"]
        zs = road.get("z")
        for i, (a, b) in enumerate(zip(pts, pts[1:])):
            for ra, rb, is_bridge in rail_bridge_segs:
                hit = seg_intersect(a, b, ra, rb)
                if hit is None:
                    continue
                # the ring already passes over / under the track here (add_elevation.py)
                if zs and abs(zs[i] + (zs[i + 1] - zs[i]) * hit[0]) > 3:
                    continue
                hx, hy = a[0] + (b[0] - a[0]) * hit[0], a[1] + (b[1] - a[1]) * hit[0]
                if any(math.hypot(hx - x, hy - y) < 30 for x, y in lc_pts):
                    continue
                if cat == "cycle" and not is_bridge:
                    continue
                h = LIFT_CYCLE if cat == "cycle" else LIFT_CAR
                ux, uy = b[0] - a[0], b[1] - a[1]
                vx, vy = rb[0] - ra[0], rb[1] - ra[1]
                sin = abs(ux * vy - uy * vx) / ((math.hypot(ux, uy) * math.hypot(vx, vy)) or 1)
                plateau = min(35.0, (road.get("width", 6) / 2 + 5) / max(0.35, sin))
                for L in lifts:
                    if math.hypot(L["x"] - hx, L["y"] - hy) < 12:
                        L["h"] = max(L["h"], h)
                        L["plateau"] = max(L["plateau"], plateau)
                        break
                else:
                    lifts.append({"x": hx, "y": hy, "h": h, "plateau": plateau, "name": road.get("name")})
    for L in lifts:
        ramp = L["h"] / LIFT_GRADE
        for x, y in lc_pts:
            room = math.hypot(L["x"] - x, L["y"] - y) - L["plateau"] - 15
            if room < ramp:
                ramp = max(30.0, room)
                L["h"] = min(L["h"], ramp * 0.1)
        L["ramp"] = round(ramp, 1)
        L["x"], L["y"], L["h"], L["plateau"] = round(L["x"], 1), round(L["y"], 1), round(L["h"], 2), round(L["plateau"], 1)
        print(f"lift {L['name']}: h {L['h']} plateau {L['plateau']} ramp {L['ramp']}")
        del L["name"]

    cut = cut_paths_at_rails(data["roads"], rails, lifts, lc_pts)
    print(f"{cut} foot/cycle paths cut where they would cross a track at grade")

    data["railLifts"] = lifts
    data["rails"] = rails
    data["stations"] = stations
    data["levelCrossings"] = crossings
    data["railRoutes"] = rail_routes
    with open(MAP_PATH, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(f"{len(rails)} rail polylines, {len(stations)} stations, {len(crossings)} level crossings, {len(rail_routes)} routes")


if __name__ == "__main__":
    main()
