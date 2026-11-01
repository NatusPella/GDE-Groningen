"""extract_province.py on a tiny hand-made extract: a building, a road, a
lake drawn as a multipolygon of two half rings, a bus route with its stop,
a station, a place, a bench and a fuel station end up where the world
builder and add_facilities.py expect them.

    data/cache/venv/bin/python scripts/world/extract_province_test.py

The ring joining and the tag filters are tested without pyosmium too; the
end-to-end part needs it (skipped with a note when it is not installed).
"""
import gzip
import json
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import extract_province as X  # noqa: E402

fails = 0


def check(ok, msg):
    global fails
    if not ok:
        fails += 1
        print("FAIL", msg)


# rings: two halves in any direction, a closed way, an open chain
a, b, c, d = [0, 0], [0, 1], [1, 1], [1, 0]
rings = X.join_rings([[a, b, c], [a, d, c]])
check(len(rings) == 1 and rings[0][0] == rings[0][-1] and len(rings[0]) == 5, f"two halves join into one ring: {rings}")
check(len(X.join_rings([[a, b, c, a]])) == 1, "a closed way is a ring")
check(X.join_rings([[a, b], [c, d]]) == [], "an open chain is dropped")

check(X.way_kept({"building": "yes"}) and X.way_kept({"highway": "residential"}) and not X.way_kept({"power": "line"}), "way filter")
check(X.node_kept({"natural": "tree"}) and X.node_kept({"amenity": "bench"}) and not X.node_kept({"addr:street": "x"}), "node filter")
check(X.facility({"amenity": "fuel"}, "node") and not X.facility({"amenity": "bench"}, "node"), "facility filter")
check(X.facility({"highway": "residential", "parking:lane:both": "parallel"}, "way") and not X.facility({"highway": "track", "parking:lane:both": "x"}, "way"),
      "parking lanes as add_facilities.py asks")
check(X.packs_of_bounds(330, 75, 330, 75) == [(0, 0)] and X.packs_of_bounds(-1, 74, 8330, 75) == [(-1, -1), (-1, 0), (0, -1), (0, 0), (1, -1), (1, 0)],
      "packs of a box")

try:
    import osmium
except ImportError:
    osmium = None
    print("extract_province: pyosmium not installed, end-to-end part skipped")

if osmium:
    tmp = tempfile.mkdtemp()
    pbf = os.path.join(tmp, "t.osm.pbf")
    lat0, lon0 = 53.32, 6.86
    w = osmium.SimpleWriter(pbf)
    nodes = {}
    nid = 1

    def node(dlat, dlon, tags=None):
        global nid
        nodes[nid] = (lat0 + dlat, lon0 + dlon)
        w.add_node(osmium.osm.mutable.Node(id=nid, location=(lon0 + dlon, lat0 + dlat), tags=tags or {}))
        nid += 1
        return nid - 1

    # building square, road, lake halves, stop, station, place, bench, fuel
    sq = [node(0, 0), node(0, 0.0002), node(0.0001, 0.0002), node(0.0001, 0)]
    r = [node(0.001, 0), node(0.001, 0.002)]
    lk = [node(0.002, 0), node(0.002, 0.001), node(0.003, 0.001), node(0.003, 0)]
    isl = [node(0.0025, 0.0003), node(0.0025, 0.0006), node(0.0027, 0.0006), node(0.0027, 0.0003)]
    stop = node(0.0011, 0.001, {"highway": "bus_stop", "name": "Halte"})
    node(0.0005, 0.0005, {"railway": "station", "name": "Teststad"})
    node(0.0006, 0.0006, {"place": "village", "name": "Teststad", "population": "1200"})
    node(0.0007, 0.0007, {"amenity": "bench"})
    node(0.0008, 0.0008, {"amenity": "fuel", "brand": "X"})
    w.add_way(osmium.osm.mutable.Way(id=1, nodes=sq + [sq[0]], tags={"building": "house", "building:levels": "2"}))
    w.add_way(osmium.osm.mutable.Way(id=2, nodes=r, tags={"highway": "tertiary", "name": "Teststraat", "maxspeed": "50"}))
    w.add_way(osmium.osm.mutable.Way(id=3, nodes=[lk[0], lk[1], lk[2]], tags={}))
    w.add_way(osmium.osm.mutable.Way(id=4, nodes=[lk[2], lk[3], lk[0]], tags={}))
    w.add_way(osmium.osm.mutable.Way(id=5, nodes=isl + [isl[0]], tags={}))
    w.add_relation(osmium.osm.mutable.Relation(id=1, members=[("w", 3, "outer"), ("w", 4, "outer"), ("w", 5, "inner")], tags={"type": "multipolygon", "natural": "water", "name": "Testmeer"}))
    w.add_relation(osmium.osm.mutable.Relation(id=2, members=[("n", stop, "stop"), ("w", 2, "")], tags={"type": "route", "route": "bus", "ref": "61"}))
    w.close()
    ex = X.Extract()
    ex.relation_pass(pbf)
    ex.main_pass(pbf)
    els = [e for L in ex.packs.values() for e in L]
    kinds = {(e["type"], e["id"]) for e in els}
    check(("way", 1) in kinds and ("way", 2) in kinds, "building and road in a pack")
    lake = [e for e in els if e["type"] == "relation" and e["id"] == 1]
    outer = [m for m in lake[0]["members"] if m["role"] == "outer"] if lake else []
    inner = [m for m in lake[0]["members"] if m["role"] == "inner"] if lake else []
    check(len(outer) == 1 and outer[0]["g"][0] == outer[0]["g"][-1], "the lake is one closed ring")
    check(len(inner) == 1 and inner[0]["g"][0] == inner[0]["g"][-1], "its island is kept as an inner ring (issue #124)")
    check(("way", 3) not in kinds and ("way", 5) not in kinds, "an untagged member way is no element of its own")
    road = next(e for e in els if e["type"] == "way" and e["id"] == 2)
    check(road["tags"].get("maxspeed") == "50" and len(road["g"]) == 2, "road keeps its tags and geometry")
    check(any(e.get("tags", {}).get("amenity") == "bench" for e in els), "street furniture is kept")
    check(len(ex.bus) == 1 and any(m["type"] == "node" for m in ex.bus[0]["members"]) and any("g" in m for m in ex.bus[0]["members"]), "bus route with stop and way")
    check([s["name"] for s in ex.stations] == ["Teststad"] and ex.places[0]["pop"] == 1200, "station and place")
    fac = [e for e in ex.facilities if e["tags"].get("amenity") == "fuel"]
    check(len(fac) == 1 and fac[0]["lat"] and "brand" in fac[0]["tags"], "fuel station in the facilities (add_facilities.py drops the brand)")
    # the pack files load the way build_corridor.mjs reads them
    out = os.path.join(tmp, "out")
    sys.argv = ["x", "--pbf", pbf, "--out", out]
    X.main()
    files = sorted(os.listdir(out))
    check("province.json.gz" in files and "facilities_raw.json.gz" in files and any(f.startswith("c") for f in files), f"files written: {files}")
    with gzip.open(os.path.join(out, [f for f in files if f.startswith("c")][0]), "rt", encoding="utf-8") as f:
        check("elements" in json.load(f), "a pack has elements")
    import shutil
    shutil.rmtree(tmp)

print(f"{fails} failure(s)" if fails else "extract_province: ok")
sys.exit(1 if fails else 0)
