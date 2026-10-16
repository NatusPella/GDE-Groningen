#!/usr/bin/env python3
"""3D BAG building heights and roof types for the game area
(docs/PROVINCIE-PLAN.md 0.1; 3D BAG by the 3D geoinformation research group,
TU Delft, and 3DGI, https://3dbag.nl, CC BY 4.0: credited in NOTICE.md,
docs/LICENTIES.md and the game's credits).

    python3 scripts/world/fetch_3dbag.py --list            tiles and sizes for the map, no tile download
    python3 scripts/world/fetch_3dbag.py                   download what is missing, then extract
    python3 scripts/world/fetch_3dbag.py --extract-only    extract from the cache only (no network)
    options: --version v20250903 (default: the one data.3dbag.nl/latest names),
             --bbox minx,miny,maxx,maxy (RD New, m; default: game/citymap.json meta.bounds),
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
import sqlite3
import struct
import sys
import tempfile
import urllib.request
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rdnew import RD_ORIGIN_X, RD_ORIGIN_Y  # noqa: E402


def rd_to_world(rx, ry):
    return rx - RD_ORIGIN_X, RD_ORIGIN_Y - ry


def world_to_rd(x, y):
    return x + RD_ORIGIN_X, RD_ORIGIN_Y - y

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = os.path.join(ROOT, "data", "cache", "3dbag")
OUT = os.path.join(ROOT, "data", "world", "3dbag.json.gz")
BASE = "https://data.3dbag.nl"
UA = "gde-worldbuilder/1.0 (open data fetch; https://3dbag.nl/en/download)"


def get(url, dest=None):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read()
    if dest:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest + ".part", "wb") as f:
            f.write(data)
        os.replace(dest + ".part", dest)
    return data


def head_size(url):
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return int(r.headers.get("Content-Length") or 0)


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


def extract_tile(zpath):
    """the buildings of one cached tile (a GeoPackage, gzipped or zipped)"""
    out = []
    with open(zpath, "rb") as f:
        raw = f.read()
    if raw[:2] == b"\x1f\x8b":
        gpkg = gzip.decompress(raw)
    else:
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            gpkg = z.read(next(n for n in z.namelist() if n.endswith(".gpkg")))
    if True:
        with tempfile.TemporaryDirectory() as td:
            db = os.path.join(td, "t.gpkg")
            with open(db, "wb") as f:
                f.write(gpkg)
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


# --------------------------------------------------------------- main

def map_bbox_rd():
    with open(os.path.join(ROOT, "game", "citymap.json")) as f:
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
    a = ap.parse_args()
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
