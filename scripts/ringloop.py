"""The Groningen ringweg as one closed loop over the processed road graph.

RING_WAYPOINTS are hand-picked points on the ring (world metres, origin
53.2195/6.565, y south) in driving order: Zuidelijke Ringweg westbound ->
Julianaplein -> Vrijheidsplein -> Westelijke Ringweg north -> Friesestraatweg
-> Noordelijke Ringweg (Plataanlaan, Noordzeeweg) -> Noorderhoogebrug ->
Oostelijke Ringweg (Beneluxweg N46) south -> Euvelgunne -> Beneluxweg N7
west -> Europaplein. route_loop() snaps each one to the ring carriageway in
the right direction and joins them with shortest drivable paths, preferring
the ring roads themselves.
"""
import heapq
import math

RING_WAYPOINTS = [
    (1420, 1010), (600, 1585), (-60, 1815), (-700, 2030), (-1380, 850), (-1700, 60),
    (-2000, -800), (-2330, -1660), (-1200, -2040), (190, -2180), (420, -2780),
    (900, -3160), (1500, -2420), (2500, -1840), (3030, -1010), (3150, -740),
    (3320, -330), (2800, 470), (2310, 605), (1960, 700),
]

RING_REFS = {"N7", "N370", "N46"}
RING_NAMES = {"Weg der Verenigde Naties", "Laan 1940-1945", "Plataanlaan", "Noordzeeweg", "Beneluxweg"}
RING_TYPES = {"motorway", "motorway_link", "trunk", "trunk_link", "primary", "primary_link"}
CAR_CATS = {"major", "normal", "minor"}


def key(p):
    return (round(p[0] * 10), round(p[1] * 10))


def graph(roads):
    adj, xy = {}, {}
    for r in roads:
        if r["cat"] not in CAR_CATS:
            continue
        w = 1.0 if r["type"] in ("motorway", "trunk") else 1.6 if r["type"] in RING_TYPES else 8.0
        pts = r["pts"]
        for i in range(len(pts) - 1):
            a, b = key(pts[i]), key(pts[i + 1])
            xy[a], xy[b] = pts[i], pts[i + 1]
            L = math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
            adj.setdefault(a, []).append((b, L * w, r))
            if not r.get("oneway"):
                adj.setdefault(b, []).append((a, L * w, r))
    return adj, xy


def route_loop(roads, waypoints=RING_WAYPOINTS, snap=120.0, debug=False):
    """Closed polyline [[x, y, halfWidth], ...] through the waypoints."""
    adj, xy = graph(roads)
    ring_nodes = {}
    for r in roads:
        if r["type"] in ("motorway", "trunk") and (r.get("ref") in RING_REFS or r.get("name") in RING_NAMES):
            for p in r["pts"]:
                ring_nodes[key(p)] = p
    targets = []
    for wx, wy in waypoints:
        near = [k for k, p in ring_nodes.items() if math.hypot(p[0] - wx, p[1] - wy) < snap]
        if not near:
            raise SystemExit(f"ring waypoint ({wx}, {wy}) is not near a ring road")
        targets.append(set(near))

    radj = {}
    for u, es in adj.items():
        for v, c, r in es:
            radj.setdefault(v, []).append((u, c, r))

    def dijkstra(sources, graph_adj):
        dist, prev = {s: 0.0 for s in sources}, {}
        pq = [(0.0, s) for s in sources]
        heapq.heapify(pq)
        while pq:
            d, u = heapq.heappop(pq)
            if d > dist[u]:
                continue
            for v, c, r in graph_adj.get(u, []):
                nd = d + c
                if nd < dist.get(v, 1e18):
                    dist[v] = nd
                    prev[v] = (u, r)
                    heapq.heappush(pq, (nd, v))
        return dist, prev

    # Each waypoint's node is the one on the cheapest path from the previous
    # node through it to the next waypoint, so a snap onto the opposite
    # carriageway (which would need a detour round a junction) never wins.
    n_wp = len(targets)
    to_next = [dijkstra(targets[(i + 1) % n_wp], radj)[0] for i in range(n_wp)]
    first = min(targets[0], key=lambda k: to_next[0].get(k, 1e18) + math.hypot(xy[k][0] - waypoints[0][0], xy[k][1] - waypoints[0][1]))
    nodes, used = [first], []
    for i in range(1, n_wp + 1):
        dist, prev = dijkstra([nodes[-1]], adj)
        if i < n_wp:
            cand = [k for k in targets[i] if k in dist and k != nodes[-1]]
            if not cand:
                raise SystemExit(f"no ring path to waypoint {i}")
            goal = min(cand, key=lambda k: dist[k] + to_next[i].get(k, 1e18))
        else:
            goal = first
            if goal not in dist:
                raise SystemExit("ring does not close")
        path = [goal]
        while path[-1] != nodes[-1]:
            path.append(prev[path[-1]][0])
        path.reverse()
        rds = [prev[n][1] for n in path[1:]]
        if debug:
            L = sum(math.hypot(xy[b][0] - xy[a][0], xy[b][1] - xy[a][1]) for a, b in zip(path, path[1:]))
            print(f"  wp {i}: {len(path)} nodes {L:.0f} m -> {xy[path[-1]]}")
            if debug == 2:
                seq = []
                for n, r in zip(path[1:], rds):
                    lab = (r.get("ref"), r.get("name"), r["type"])
                    if not seq or seq[-1][0] != lab:
                        seq.append([lab, xy[n]])
                for lab, p in seq:
                    print("      ", lab, p)
        nodes += path[1:]
        used += rds
    out = []
    for n, r in zip(nodes[:-1], used):
        p = xy[n]
        out.append([p[0], p[1], r["width"] / 2])
    return out
