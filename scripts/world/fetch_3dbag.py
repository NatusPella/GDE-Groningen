#!/usr/bin/env python3
"""3D BAG building heights and roof types for the game area
(docs/PROVINCIE-PLAN.md 0.1; 3D BAG by the 3D geoinformation research group,
TU Delft, and 3DGI, https://3dbag.nl, CC BY 4.0: credited in NOTICE.md,
docs/LICENTIES.md and the game's credits).

    python3 scripts/world/fetch_3dbag.py --list            tiles and sizes for the map, no tile download
    python3 scripts/world/fetch_3dbag.py                   download what is missing, then extract
    python3 scripts/world/fetch_3dbag.py --extract-only    extract from the cache only (no network)
    python3 scripts/world/fetch_3dbag.py --province         the whole province (resumable, see below)
    python3 scripts/world/fetch_3dbag.py --province --list  its tiles and sizes, no download
    options: --version v20250903 (default: the one data.3dbag.nl/latest names),
             --bbox minx,miny,maxx,maxy (RD New, m; default: game/stad.json meta.bounds),
             --max-mb 400 (stop before the downloads pass this)

Uses only the official downloads of data.3dbag.nl: the tile index
(tile_index.fgb, FlatGeobuf, read here with a small reader of its own) and the
GeoPackage per tile (<version>/tiles/<tile>/<tile>.gpkg.zip). A neutral
User-Agent, no personal data, no cookies. The tiles are cached outside git in
data/cache/3dbag/ (gitignored); the extract the game build reads is
data/world/3dbag.json.gz (committed, small): per building

    { "id": "<BAG pand id>", "c": [x, y] world frame, "a": footprint area m2,
      "hmax": b3_h_dak_max, "h50": b3_h_dak_50p, "hg": b3_h_maaiveld (m, NAP),
      "roof": b3_dak_type (slanted | horizontal | multiple horizontal | ...),
      "lv": b3_bouwlagen, "year": oorspronkelijkbouwjaar }
    (hmax and h50 from the pand table where it has them, else from the
    building parts of lod12_2d: their highest b3_h_max and their b3_h_50p
    weighted by area)

--province (docs/ONTWIKKELEN.md): every tile that touches the province of
Groningen plus a 3 km strip round it (the boundary of
data/cache/province/province.json.gz), one tile at a time: download to a
temporary file, extract, delete the download. Per tile a small extract stays in
<scratch>/extract/<version>/ (--scratch, default data/cache/3dbag-province),
so a stopped run resumes where it was and never holds more than one tile of
raw data. The merge is data/world/3dbag_province.json.gz, in rows
([id, x, y, area, hmax, h50, hg, roof] under "cols"), read by
scripts/world/bag3d.mjs; delete the scratch directory afterwards.

scripts/world/pack_tiles.mjs (joinAttrs) and scripts/world/building_heights.mjs
join these to the map's footprints (the BAG id from the OSM ref:bag tag,
else the centre inside the footprint and the area within 25 %).
"""
import argparse
import gzip
import io
import json
import math
import os
import shutil
import sqlite3
import struct
import sys
import tempfile
import time
import urllib.error
import urllib.request
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rdnew import RD_ORIGIN_X, RD_ORIGIN_Y, wgs_to_rd  # noqa: E402


def rd_to_world(rx, ry):
    return rx - RD_ORIGIN_X, RD_ORIGIN_Y - ry


def world_to_rd(x, y):
    return x + RD_ORIGIN_X, RD_ORIGIN_Y - y

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = os.path.join(ROOT, "data", "cache", "3dbag")
OUT = os.path.join(ROOT, "data", "world", "3dbag.json.gz")
BASE = "https://data.3dbag.nl"
UA = "gde-worldbuilder/1.0 (open data fetch; https://3dbag.nl/en/download)"


def retry(fn, tries=5):
    """polite: 2, 4, 8, 16 s between attempts"""
    for k in range(tries):
        try:
            return fn()
        except (urllib.error.URLError, OSError, TimeoutError, EOFError):
            if k == tries - 1:
                raise
            time.sleep(2 ** (k + 1))


def get(url, dest=None):
    def once():
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=120) as r:
            if not dest:
                return r.read()
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest + ".part", "wb") as f:
                shutil.copyfileobj(r, f, 1 << 20)
            os.replace(dest + ".part", dest)
            return b""
    return retry(once)


def head_size(url):
    def once():
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as r:
            return int(r.headers.get("Content-Length") or 0)
    return retry(once)


# --------------------------------------------------------------- FlatGeobuf

class FB:
    """Minimal flatbuffers table access over a bytes buffer."""

    def __init__(self, buf, pos):
        self.buf, self.pos = buf, pos
        vt = pos - struct.unpack_from("<i", buf, pos)[0]
        self.vt, self.vtlen = vt, struct.unpack_from("<H", buf, vt)[0]

    def off(self, field):
        o = 4 + 2 * field
        if o >= self.vtlen:
            return 0
        return struct.unpack_from("<H", self.buf, self.vt + o)[0]

    def scalar(self, field, fmt, default=0):
        o = self.off(field)
        return struct.unpack_from("<" + fmt, self.buf, self.pos + o)[0] if o else default

    def _vec(self, field):
        o = self.off(field)
        if not o:
            return None, 0
        p = self.pos + o
        p += struct.unpack_from("<I", self.buf, p)[0]
        return p + 4, struct.unpack_from("<I", self.buf, p)[0]

    def string(self, field):
        p, n = self._vec(field)
        return None if p is None else self.buf[p:p + n].decode("utf-8")

    def vec_scalars(self, field, fmt, size):
        p, n = self._vec(field)
        if p is None:
            return []
        return list(struct.unpack_from("<%d%s" % (n, fmt), self.buf, p))

    def vec_bytes(self, field):
        p, n = self._vec(field)
        return b"" if p is None else self.buf[p:p + n]

    def vec_tables(self, field):
        p, n = self._vec(field)
        if p is None:
            return []
        out = []
        for i in range(n):
            q = p + 4 * i
            out.append(FB(self.buf, q + struct.unpack_from("<I", self.buf, q)[0]))
        return out


COL_FMT = {0: "b", 1: "B", 2: "?", 3: "h", 4: "H", 5: "i", 6: "I", 7: "q", 8: "Q", 9: "f", 10: "d"}


def read_fgb(buf):
    """FlatGeobuf v3: [(properties, bbox of the geometry), ...]"""
    if buf[:3] != b"fgb":
        raise ValueError("not a FlatGeobuf file")
    hsize = struct.unpack_from("<I", buf, 8)[0]
    hpos = 12
    header = FB(buf, hpos + struct.unpack_from("<I", buf, hpos)[0])
    cols = [(c.string(0), c.scalar(1, "B")) for c in header.vec_tables(7)]
    count = header.scalar(8, "Q")
    node_size = header.scalar(9, "H", 16)
    pos = hpos + hsize
    if node_size and count:
        # packed Hilbert R-tree: every level's nodes, 40 bytes each
        n, nodes = count, count
        while n != 1:
            n = math.ceil(n / node_size)
            nodes += n
        pos += nodes * 40
    out = []
    while pos < len(buf):
        size = struct.unpack_from("<I", buf, pos)[0]
        feat = FB(buf, pos + 4 + struct.unpack_from("<I", buf, pos + 4)[0])
        pos += 4 + size
        props = {}
        raw = feat.vec_bytes(1)
        i = 0
        while i < len(raw):
            ci = struct.unpack_from("<H", raw, i)[0]
            i += 2
            name, t = cols[ci]
            if t in COL_FMT:
                fmt = COL_FMT[t]
                props[name] = struct.unpack_from("<" + fmt, raw, i)[0]
                i += struct.calcsize(fmt)
            else:  # string, json, datetime, binary: length-prefixed
                n = struct.unpack_from("<I", raw, i)[0]
                i += 4
                v = raw[i:i + n]
                i += n
                props[name] = v.decode("utf-8") if t in (11, 12, 13) else v
        g = FB(buf, feat.pos + feat.off(0) + struct.unpack_from("<I", buf, feat.pos + feat.off(0))[0]) if feat.off(0) else None
        xy = g.vec_scalars(1, "d", 8) if g else []
        if g and not xy:
            for part in g.vec_tables(7):
                xy += part.vec_scalars(1, "d", 8)
        if xy:
            xs, ys = xy[0::2], xy[1::2]
            out.append((props, (min(xs), min(ys), max(xs), max(ys))))
    return out


# --------------------------------------------------------------- GeoPackage

def wkb_rings(b):
    """GeoPackage geometry blob -> list of rings (2D) of its (multi)polygon"""
    if b[:2] != b"GP":
        return []
    flags = b[3]
    env = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}.get((flags >> 1) & 7, 0)
    p = 8 + env
    rings = []

    def geom(p):
        le = b[p] == 1
        e = "<" if le else ">"
        t = struct.unpack_from(e + "I", b, p + 1)[0]
        p += 5
        dims = 3 if (t // 1000 == 1 or t & 0x80000000) else 2
        t = (t % 1000) & 0xFFFF
        if t == 3:
            n = struct.unpack_from(e + "I", b, p)[0]
            p += 4
            for _ in range(n):
                m = struct.unpack_from(e + "I", b, p)[0]
                p += 4
                pts = []
                for _ in range(m):
                    xy = struct.unpack_from(e + "dd", b, p)
                    pts.append(xy)
                    p += 8 * dims
                rings.append(pts)
            return p
        if t == 6:
            n = struct.unpack_from(e + "I", b, p)[0]
            p += 4
            for _ in range(n):
                p = geom(p)
            return p
        raise ValueError("geometry type %d" % t)

    try:
        geom(p)
    except (struct.error, ValueError):
        return []
    return rings


def area_centroid(P):
    a = cx = cy = 0.0
    for i in range(len(P)):
        x0, y0 = P[i]
        x1, y1 = P[(i + 1) % len(P)]
        c = x0 * y1 - x1 * y0
        a += c
        cx += (x0 + x1) * c
        cy += (y0 + y1) * c
    if abs(a) < 1e-9:
        return 0.0, P[0][0], P[0][1]
    return abs(a / 2), cx / (3 * a), cy / (3 * a)


def extract_tile(zpath, tmpdir=None):
    """the buildings of one cached tile (a GeoPackage, gzipped or zipped)"""
    out = []
    with tempfile.TemporaryDirectory(dir=tmpdir) as td:
        db = os.path.join(td, "t.gpkg")
        with open(zpath, "rb") as f:
            gz = f.read(2) == b"\x1f\x8b"
        # streamed to disk: a tile's GeoPackage can be a few hundred MB
        if gz:
            src = gzip.open(zpath, "rb")
        else:
            z = zipfile.ZipFile(zpath)
            src = z.open(next(n for n in z.namelist() if n.endswith(".gpkg")))
        with src, open(db, "wb") as f:
            shutil.copyfileobj(src, f, 1 << 20)
        if True:
            con = sqlite3.connect(db)
            tables = [r[0] for r in con.execute("select table_name from gpkg_contents")]
            cols = lambda t: [r[1] for r in con.execute("pragma table_info(%s)" % t)]
            # roof heights per building part (lod12_2d: b3_h_max, b3_h_50p),
            # summed per pand: the highest, and the median weighted by area
            parts = {}
            ptab = next((t for t in ("lod12_2d", "lod13_2d", "lod22_2d") if t in tables), None)
            if ptab and {"b3_h_max", "b3_h_50p", "identificatie"} <= set(cols(ptab)):
                for pid, hmax, h50, g in con.execute("select identificatie, b3_h_max, b3_h_50p, geom from %s" % ptab):
                    if hmax is None:
                        continue
                    rings = wkb_rings(g)
                    a = area_centroid(rings[0])[0] if rings else 1.0
                    q = parts.setdefault(pid, [0.0, 0.0, -1e9])
                    q[0] += a
                    q[1] += a * (h50 if h50 is not None else hmax)
                    q[2] = max(q[2], hmax)
            pc = set(cols("pand"))
            want = [c for c in ("identificatie", "b3_h_maaiveld", "b3_dak_type", "b3_h_dak_max", "b3_h_dak_50p", "b3_bouwlagen", "oorspronkelijkbouwjaar") if c in pc]
            for row in con.execute("select %s, geom from pand" % ", ".join(want)):
                rec = dict(zip(want, row[:-1]))
                rings = wkb_rings(row[-1])
                if not rings or rec.get("b3_h_maaiveld") is None:
                    continue
                pid = rec.get("identificatie")
                hmax, h50 = rec.get("b3_h_dak_max"), rec.get("b3_h_dak_50p")
                if hmax is None and pid in parts and parts[pid][0] > 0:
                    hmax, h50 = parts[pid][2], parts[pid][1] / parts[pid][0]
                if hmax is None:
                    continue
                a, cx, cy = area_centroid(rings[0])
                wx, wy = rd_to_world(cx, cy)
                r = {"id": str(pid).replace("NL.IMBAG.Pand.", ""), "c": [round(wx, 2), round(wy, 2)], "a": round(a, 1),
                     "hmax": round(hmax, 2), "hg": round(rec["b3_h_maaiveld"], 2)}
                if h50 is not None:
                    r["h50"] = round(h50, 2)
                if rec.get("b3_dak_type"):
                    r["roof"] = rec["b3_dak_type"]
                if rec.get("b3_bouwlagen"):
                    r["lv"] = rec["b3_bouwlagen"]
                if rec.get("oorspronkelijkbouwjaar"):
                    r["year"] = rec["oorspronkelijkbouwjaar"]
                out.append(r)
            con.close()
    return out


# --------------------------------------------------------------- province

PROV_OUT = os.path.join(ROOT, "data", "world", "3dbag_province.json.gz")
PROV_SRC = os.path.join(ROOT, "data", "cache", "province", "province.json.gz")
BUFFER_M = 3000
PROV_COLS = ["id", "x", "y", "a", "hmax", "h50", "hg", "roof"]


def province_ring():
    """the province boundary in RD New (the extract's own, scripts/world/extract_province.py)"""
    with gzip.open(PROV_SRC, "rt") as f:
        b = json.load(f)["boundary"]
    return [[wgs_to_rd(la, lo) for la, lo in ring] for ring in b]


def point_in_rings(x, y, rings):
    inside = False
    for R in rings:
        j = len(R) - 1
        for i in range(len(R)):
            xi, yi = R[i]
            xj, yj = R[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                inside = not inside
            j = i
    return inside


def box_near_province(box, rings, buf):
    """does the box, grown by buf, touch the province? (a vertex in it, or its centre or corners in the province)"""
    x0, y0, x1, y1 = box[0] - buf, box[1] - buf, box[2] + buf, box[3] + buf
    for R in rings:
        for x, y in R:
            if x0 <= x <= x1 and y0 <= y <= y1:
                return True
    pts = [(x0, y0), (x1, y0), (x0, y1), (x1, y1), ((x0 + x1) / 2, (y0 + y1) / 2)]
    return any(point_in_rings(x, y, rings) for x, y in pts)


def province_tiles(version):
    """[(tile id, url, bbox)] of the tiles that touch the province and its strip"""
    rings = province_ring()
    xs = [p[0] for R in rings for p in R]
    ys = [p[1] for R in rings for p in R]
    bbox = (min(xs) - BUFFER_M, min(ys) - BUFFER_M, max(xs) + BUFFER_M, max(ys) + BUFFER_M)
    idx_path = os.path.join(CACHE, version, "tile_index.fgb")
    if not os.path.exists(idx_path):
        get(f"{BASE}/{version}/tile_index.fgb", idx_path)
    with open(idx_path, "rb") as f:
        feats = read_fgb(f.read())
    tiles = []
    for props, box in feats:
        if box[2] < bbox[0] or box[0] > bbox[2] or box[3] < bbox[1] or box[1] > bbox[3]:
            continue
        if not box_near_province(box, rings, BUFFER_M):
            continue
        tid = props.get("tile_id") or props.get("id")
        url = props.get("gpkg_download") or f"{BASE}/{version}/tiles/{tid}/{tid.replace('/', '-')}.gpkg.zip"
        tiles.append((tid, url, box))
    return tiles, rings


def compact(r, roofs):
    """a building record as a row of PROV_COLS (BAG id as a number: leading zeros carry nothing)"""
    roof = r.get("roof")
    if roof and roof not in roofs:
        roofs.append(roof)
    return [int(r["id"]), round(r["c"][0], 1), round(r["c"][1], 1), round(r["a"], 1), round(r["hmax"], 1),
            round(r["h50"], 1) if "h50" in r else None, round(r["hg"], 1), roofs.index(roof) if roof else None]


def run_province(a):
    global CACHE
    scratch = os.path.abspath(a.scratch)
    CACHE = scratch  # the tile index lives in the scratch directory too
    version = a.version
    if not version:
        meta = json.loads(get(BASE + "/latest/metadata.json"))
        version = "v" + meta["identificationInfo"]["citation"]["edition"].lstrip("v").replace(".", "")
    os.makedirs(os.path.join(scratch, version), exist_ok=True)
    tiles, rings = province_tiles(version)
    print(f"{len(tiles)} tiles of 3D BAG {version} touch the province (+{BUFFER_M} m)")
    if a.list:
        total = 0
        for tid, url, _ in tiles:
            n = head_size(url)
            total += n
            print(f"  {tid}: {n / 1e6:.1f} MB")
            time.sleep(0.2)
        print(f"total {total / 1e6:.0f} MB")
        return
    ex_dir = os.path.join(scratch, "extract", version)
    tmp_dir = os.path.join(scratch, "tmp")
    os.makedirs(ex_dir, exist_ok=True)
    os.makedirs(tmp_dir, exist_ok=True)
    for f in os.listdir(tmp_dir):  # leftovers of a stopped run
        p = os.path.join(tmp_dir, f)
        shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
    done = 0
    for tid, url, box in tiles:
        name = tid.replace("/", "-")
        ex = os.path.join(ex_dir, name + ".json.gz")
        if os.path.exists(ex):
            done += 1
            continue
        n = head_size(url)
        if n / 1e6 > a.max_mb:
            print(f"skip {tid}: {n / 1e6:.0f} MB passes --max-mb {a.max_mb}")
            continue
        free = shutil.disk_usage(scratch).free
        if free < 4 * n + 2e9:
            print(f"stop: only {free / 1e9:.1f} GB free for a {n / 1e6:.0f} MB tile")
            break
        raw = os.path.join(tmp_dir, name + ".gpkg.zip")
        t0 = time.time()
        get(url, raw)
        try:
            rows = extract_tile(raw, tmp_dir)
        finally:
            os.remove(raw)
        roofs = []
        out = [compact(r, roofs) for r in rows]
        with gzip.open(ex + ".part", "wt", compresslevel=6) as f:
            json.dump({"roofs": roofs, "rows": out}, f, separators=(",", ":"))
        os.replace(ex + ".part", ex)
        done += 1
        print(f"  [{done}/{len(tiles)}] {tid} {n / 1e6:.0f} MB, {len(out)} buildings, {time.time() - t0:.0f} s", flush=True)
        time.sleep(1)
    merge_province(ex_dir, tiles, rings, version)


def merge_province(ex_dir, tiles, rings, version):
    """the per-tile extracts into data/world/3dbag_province.json.gz: the buildings whose centre lies in the province or its strip, each id once"""
    want = {tid.replace("/", "-") for tid, _, _ in tiles}
    have = {f[:-8] for f in os.listdir(ex_dir) if f.endswith(".json.gz")}
    missing = sorted(want - have)
    if missing:
        print(f"{len(missing)} tiles not extracted yet (run again): {', '.join(missing[:6])}{' ...' if len(missing) > 6 else ''}")
    roofs, rows, seen = [], [], set()
    near = {}

    def in_strip(rx, ry):
        key = (int(rx // 1000), int(ry // 1000))
        if key not in near:
            near[key] = box_near_province((key[0] * 1000, key[1] * 1000, key[0] * 1000 + 1000, key[1] * 1000 + 1000), rings, BUFFER_M - 1000)
        return near[key]

    for name in sorted(want & have):
        with gzip.open(os.path.join(ex_dir, name + ".json.gz"), "rt") as f:
            d = json.load(f)
        for r in d["rows"]:
            if r[0] in seen:
                continue
            rx, ry = world_to_rd(r[1], r[2])
            if not in_strip(rx, ry):
                continue
            seen.add(r[0])
            roof = d["roofs"][r[7]] if r[7] is not None else None
            if roof and roof not in roofs:
                roofs.append(roof)
            rows.append(r[:7] + [roofs.index(roof) if roof else None])
    rows.sort(key=lambda r: r[0])
    os.makedirs(os.path.dirname(PROV_OUT), exist_ok=True)
    with gzip.GzipFile(PROV_OUT, "wb", compresslevel=9, mtime=0) as f:
        f.write(json.dumps({"version": version, "cols": PROV_COLS, "roofs": roofs, "rows": rows}, separators=(",", ":")).encode())
    print(f"{len(rows)} buildings -> {os.path.relpath(PROV_OUT, ROOT)} ({os.path.getsize(PROV_OUT) / 1e6:.2f} MB)")


# --------------------------------------------------------------- main

def map_bbox_rd():
    with open(os.path.join(ROOT, "game", "stad.json")) as f:
        b = json.load(f)["meta"]["bounds"]
    corners = [world_to_rd(x, y) for x in (b[0], b[2]) for y in (b[1], b[3])]
    xs, ys = [c[0] for c in corners], [c[1] for c in corners]
    return min(xs), min(ys), max(xs), max(ys)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--version")
    ap.add_argument("--bbox")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--extract-only", action="store_true")
    ap.add_argument("--max-mb", type=float, default=400)
    ap.add_argument("--province", action="store_true")
    ap.add_argument("--scratch", default=os.path.join(ROOT, "data", "cache", "3dbag-province"))
    a = ap.parse_args()
    if a.province:
        if a.max_mb == 400:
            a.max_mb = 1000
        return run_province(a)
    bbox = tuple(map(float, a.bbox.split(","))) if a.bbox else map_bbox_rd()
    os.makedirs(CACHE, exist_ok=True)
    version = a.version
    if not version and not a.extract_only:
        meta = json.loads(get(BASE + "/latest/metadata.json"))
        version = "v" + meta["identificationInfo"]["citation"]["edition"].lstrip("v").replace(".", "")
    tiles = []
    if not a.extract_only:
        idx_path = os.path.join(CACHE, version, "tile_index.fgb")
        if not os.path.exists(idx_path):
            print(f"tile index {version} ...")
            get(f"{BASE}/{version}/tile_index.fgb", idx_path)
        with open(idx_path, "rb") as f:
            feats = read_fgb(f.read())
        for props, (x0, y0, x1, y1) in feats:
            if x1 < bbox[0] or x0 > bbox[2] or y1 < bbox[1] or y0 > bbox[3]:
                continue
            tid = props.get("tile_id") or props.get("id")
            url = props.get("gpkg_download") or f"{BASE}/{version}/tiles/{tid}/{tid.replace('/', '-')}.gpkg.zip"
            tiles.append((tid, url))
        print(f"{len(tiles)} tiles of 3D BAG {version} over RD {tuple(round(v) for v in bbox)}")
        if a.list:
            total = 0
            for tid, url in tiles:
                n = head_size(url)
                total += n
                print(f"  {tid}: {n / 1e6:.1f} MB")
            print(f"total {total / 1e6:.0f} MB")
            return
        spent = 0
        for tid, url in tiles:
            dest = os.path.join(CACHE, version, "tiles", tid.replace("/", "-") + ".gpkg.zip")
            if os.path.exists(dest):
                continue
            n = head_size(url)
            if (spent + n) / 1e6 > a.max_mb:
                print(f"stop: the next tile would pass --max-mb {a.max_mb}")
                break
            print(f"  {tid} {n / 1e6:.1f} MB")
            get(url, dest)
            spent += n
    # extract every cached tile of this version (or every version with --extract-only)
    out, seen = [], set()
    roots = [os.path.join(CACHE, version, "tiles")] if version else [os.path.join(CACHE, v, "tiles") for v in sorted(os.listdir(CACHE))]
    for d in roots:
        if not os.path.isdir(d):
            continue
        for fn in sorted(os.listdir(d)):
            if not fn.endswith(".gpkg.zip"):
                continue
            for r in extract_tile(os.path.join(d, fn)):
                if r["id"] in seen:
                    continue
                seen.add(r["id"])
                out.append(r)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with gzip.open(OUT, "wt", compresslevel=9) as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"{len(out)} buildings -> {os.path.relpath(OUT, ROOT)} ({os.path.getsize(OUT) / 1e6:.2f} MB)")


if __name__ == "__main__":
    main()
