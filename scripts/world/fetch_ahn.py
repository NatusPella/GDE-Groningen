#!/usr/bin/env python3
"""AHN terrain heights per tile (docs/PROVINCIE-PLAN.md 2.7, 2.11): the hook
for the height solvers and, later, the terrain. AHN (Actueel Hoogtebestand
Nederland) via PDOK, CC0.

    python3 scripts/world/fetch_ahn.py                  plan: tiles, request size, disk size (no network)
    python3 scripts/world/fetch_ahn.py --fetch          download the map's tiles (5 m cells) and write the rasters
    python3 scripts/world/fetch_ahn.py --fetch --tiles 234_581,235_581   only these tiles (RD km keys)
    options: --cell 5 (m; 0.5 is AHN's own), --coverage dtm_05m (dsm_05m: with buildings and trees)

Requests one GeoTIFF per 1 km game tile from PDOK's AHN WCS
(service.pdok.nl/rws/ahn/wcs/v1_0, GetCoverage, resampled by the server to
the cell size), with a neutral User-Agent and no personal data; the raw files
are cached in data/cache/ahn/ (gitignored). Per tile it writes
data/world/ahn/<tile>.bin (int16 cm relative to the tile's street level: the
median of the AHN under the map's road centre lines in that tile, or the
tile's median without roads) and data/world/ahn/index.json (cell, size and the
street level in m NAP per tile). game/js/terrainraster.js reads them;
scripts/world/pack_tiles.mjs puts them in the tiles' RASTER section.

Sizes (int16 per cell): a 1 km tile at 5 m is 200 x 200 = 80 kB (the GeoTIFF
download ~60-120 kB); the city map (~45 tiles) 3.6 MB; the province with its
buffer (~3,300 tiles) ~260 MB at 5 m, ~26 GB at AHN's 0.5 m. Nothing is
downloaded without --fetch.
"""
import argparse
import json
import math
import os
import struct
import sys
import urllib.request
import zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rdnew import RD_ORIGIN_X, RD_ORIGIN_Y  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = os.path.join(ROOT, "data", "cache", "ahn")
OUT = os.path.join(ROOT, "data", "world", "ahn")
WCS = "https://service.pdok.nl/rws/ahn/wcs/v1_0"
UA = "gde-worldbuilder/1.0 (open data fetch; AHN via PDOK)"
# the game's tile grid (game/js/gdt.js): world x = 330 + 1000 i, y = 75 + 1000 j; key = RD km of the south-west corner
GRID_X0, GRID_Y0, TILE_M = 330, 75, 1000
RD_TILE_X0 = (RD_ORIGIN_X + GRID_X0) // 1000
RD_TILE_Y0 = (RD_ORIGIN_Y - GRID_Y0) // 1000 - 1


def tile_key(i, j):
    return f"{RD_TILE_X0 + i}_{RD_TILE_Y0 - j}"


def tile_of_key(key):
    a, b = (int(v) for v in key.split("_"))
    return a - RD_TILE_X0, RD_TILE_Y0 - b


def tile_rd_box(i, j):
    """RD box (x0, y0, x1, y1) of game tile i, j"""
    wx0, wy0 = GRID_X0 + i * TILE_M, GRID_Y0 + j * TILE_M
    return wx0 + RD_ORIGIN_X, RD_ORIGIN_Y - (wy0 + TILE_M), wx0 + TILE_M + RD_ORIGIN_X, RD_ORIGIN_Y - wy0


# --------------------------------------------------------------- GeoTIFF

def lzw_decode(data):
    out, table = bytearray(), [bytes([i]) for i in range(256)] + [b"", b""]
    bits, pos, prev = 9, 0, None
    n = len(data) * 8
    while pos + bits <= n:
        v = int.from_bytes(data[pos // 8:pos // 8 + 3].ljust(3, b"\0"), "big")
        code = (v >> (24 - bits - pos % 8)) & ((1 << bits) - 1)
        pos += bits
        if code == 256:
            table, bits, prev = table[:258], 9, None
            continue
        if code == 257:
            break
        if prev is None:
            entry = table[code]
        elif code < len(table):
            entry = table[code]
            table.append(prev + entry[:1])
        else:
            entry = prev + prev[:1]
            table.append(entry)
        out += entry
        prev = entry
        if len(table) + 1 >= (1 << bits) and bits < 12:
            bits += 1
    return bytes(out)


def read_tiff(buf):
    """a single-band GeoTIFF -> (w, h, values: list of float, row-major from the top)"""
    e = "<" if buf[:2] == b"II" else ">"
    off = struct.unpack_from(e + "I", buf, 4)[0]
    n = struct.unpack_from(e + "H", buf, off)[0]
    tags = {}
    size = {1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 11: 4, 12: 8, 16: 8}
    fmt = {1: "B", 2: "c", 3: "H", 4: "I", 11: "f", 12: "d", 16: "Q"}
    for k in range(n):
        tag, typ, cnt, val = struct.unpack_from(e + "HHII", buf, off + 2 + 12 * k)
        nb = size.get(typ, 1) * cnt
        p = off + 2 + 12 * k + 8 if nb <= 4 else val
        if typ in fmt and typ != 2:
            tags[tag] = list(struct.unpack_from(e + "%d%s" % (cnt, fmt[typ]), buf, p))
    w, h = tags[256][0], tags[257][0]
    bps = tags.get(258, [32])[0]
    comp = tags.get(259, [1])[0]
    pred = tags.get(317, [1])[0]
    sfmt = tags.get(339, [3])[0]
    if 322 in tags:
        tw, th, offs, cnts = tags[322][0], tags[323][0], tags[324], tags[325]
    else:
        tw, th, offs, cnts = w, tags.get(278, [h])[0], tags[273], tags[279]
    bpp = bps // 8
    out = [float("nan")] * (w * h)
    across = math.ceil(w / tw)
    for b, (o, c) in enumerate(zip(offs, cnts)):
        raw = buf[o:o + c]
        if comp in (8, 32946):
            raw = zlib.decompress(raw)
        elif comp == 5:
            raw = lzw_decode(raw)
        elif comp != 1:
            raise ValueError(f"TIFF compression {comp} is not supported")
        bw = tw
        rows = len(raw) // (bw * bpp)
        raw = bytearray(raw)
        if pred == 3:
            # floating point predictor: per row, byte-wise differences over the
            # planes, then the planes back into the samples
            for r in range(rows):
                row = raw[r * bw * bpp:(r + 1) * bw * bpp]
                for i in range(1, len(row)):
                    row[i] = (row[i] + row[i - 1]) & 0xFF
                plane = [row[k * bw:(k + 1) * bw] for k in range(bpp)]
                fixed = bytearray(len(row))
                for i in range(bw):
                    for k in range(bpp):
                        fixed[i * bpp + (bpp - 1 - k) if e == "<" else i * bpp + k] = plane[k][i]
                raw[r * bw * bpp:(r + 1) * bw * bpp] = fixed
        ftype = "f" if sfmt == 3 and bps == 32 else "d" if sfmt == 3 else "h" if bps == 16 and sfmt == 2 else "H" if bps == 16 else "i"
        vals = struct.unpack_from(e + "%d%s" % (len(raw) // bpp, ftype), bytes(raw))
        if pred == 2:
            vals = list(vals)
            for r in range(rows):
                for i in range(1, bw):
                    vals[r * bw + i] += vals[r * bw + i - 1]
        tx, ty = (b % across) * tw, (b // across) * th if 322 in tags else b * th
        if 322 not in tags:
            tx = 0
        for r in range(rows):
            y = ty + r
            if y >= h:
                break
            for i in range(bw):
                x = tx + i
                if x < w:
                    out[y * w + x] = vals[r * bw + i]
    return w, h, out


# --------------------------------------------------------------- main

def map_tiles():
    with open(os.path.join(ROOT, "game", "citymap.json")) as f:
        data = json.load(f)
    x0, y0, x1, y1 = data["meta"]["bounds"]
    i0, j0 = math.floor((x0 - GRID_X0) / TILE_M), math.floor((y0 - GRID_Y0) / TILE_M)
    i1, j1 = math.floor((x1 - GRID_X0) / TILE_M), math.floor((y1 - GRID_Y0) / TILE_M)
    return [(i, j) for i in range(i0, i1 + 1) for j in range(j0, j1 + 1)], data


def street_level(values, w, h, cell, wx0, wy0, roads):
    """the median of the AHN under the road centre lines in the tile, else of the tile"""
    under = []
    for r in roads:
        if r.get("cat") == "foot" or r.get("z"):
            continue
        for x, y in r["pts"]:
            u, v = int((x - wx0) / cell), int((y - wy0) / cell)
            if 0 <= u < w and 0 <= v < h and not math.isnan(values[v * w + u]):
                under.append(values[v * w + u])
    pool = under if len(under) >= 20 else [v for v in values if not math.isnan(v)]
    pool.sort()
    return pool[len(pool) // 2] if pool else 0.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fetch", action="store_true")
    ap.add_argument("--tiles")
    ap.add_argument("--cell", type=float, default=5.0)
    ap.add_argument("--coverage", default="dtm_05m")
    a = ap.parse_args()
    tiles, data = map_tiles()
    if a.tiles:
        tiles = [tile_of_key(k) for k in a.tiles.split(",")]
    n = int(TILE_M / a.cell)
    print(f"{len(tiles)} tiles of {TILE_M} m at {a.cell} m: {n} x {n} cells each, {n * n * 2 / 1e3:.0f} kB per tile, {len(tiles) * n * n * 2 / 1e6:.1f} MB in all")
    if not a.fetch:
        print("plan only; --fetch downloads")
        return
    os.makedirs(CACHE, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    idx_path = os.path.join(OUT, "index.json")
    index = json.load(open(idx_path)) if os.path.exists(idx_path) else {"source": "AHN (PDOK WCS, CC0)", "coverage": a.coverage, "tiles": {}}
    for i, j in tiles:
        key = tile_key(i, j)
        x0, y0, x1, y1 = tile_rd_box(i, j)
        cache = os.path.join(CACHE, f"{a.coverage}_{a.cell:g}m_{key}.tif")
        if not os.path.exists(cache):
            url = (f"{WCS}?SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID={a.coverage}&FORMAT=image/tiff"
                   f"&SUBSET=x({x0:.0f},{x1:.0f})&SUBSET=y({y0:.0f},{y1:.0f})&SCALESIZE=x({n}),y({n})")
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=120) as r:
                body = r.read()
            if body[:2] not in (b"II", b"MM"):
                print(f"  {key}: no GeoTIFF ({body[:120]!r})")
                continue
            with open(cache, "wb") as f:
                f.write(body)
        with open(cache, "rb") as f:
            w, h, vals = read_tiff(f.read())
        vals = [float("nan") if (v is None or v != v or abs(v) > 1e4) else v for v in vals]
        wx0, wy0 = GRID_X0 + i * TILE_M, GRID_Y0 + j * TILE_M
        cell = TILE_M / w
        # the GeoTIFF's first row is the north edge: the world frame's y0 (y grows south)
        roads = [r for r in data["roads"] if any(wx0 <= p[0] < wx0 + TILE_M and wy0 <= p[1] < wy0 + TILE_M for p in r["pts"])]
        ref = street_level(vals, w, h, cell, wx0, wy0, roads)
        cm = bytearray()
        for v in vals:
            cm += struct.pack("<h", -32768 if math.isnan(v) else max(-32767, min(32767, round((v - ref) * 100))))
        with open(os.path.join(OUT, key + ".bin"), "wb") as f:
            f.write(cm)
        index["tiles"][key] = {"w": w, "h": h, "cell": cell, "x0": wx0, "y0": wy0, "street_nap": round(ref, 2)}
        print(f"  {key}: {w} x {h}, street level NAP {ref:+.2f} m")
    with open(idx_path, "w") as f:
        json.dump(index, f, indent=1, sort_keys=True)
    print(f"wrote {os.path.relpath(OUT, ROOT)} ({len(index['tiles'])} tiles)")


if __name__ == "__main__":
    main()
