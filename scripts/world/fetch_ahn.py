#!/usr/bin/env python3
"""AHN terrain heights per tile (docs/PROVINCIE-PLAN.md 2.7, 2.11): the hook
for the height solvers and, later, the terrain. AHN (Actueel Hoogtebestand
Nederland) via PDOK, CC0.

    python3 scripts/world/fetch_ahn.py                  plan: tiles, request size, disk size (no network)
    python3 scripts/world/fetch_ahn.py --fetch          download the map's tiles (5 m cells) and write the rasters
    python3 scripts/world/fetch_ahn.py --fetch --tiles 234_581,235_581   only these tiles (RD km keys)
    options: --cell 5 (m; 0.5 is AHN's own), --coverage dtm_05m (dsm_05m: with buildings and trees)

The province (issue #78: dikes, wierden, the Hondsrug, ramps): a coarse grid for every
tile of the province layer plus a finer one where relief matters, absolute heights
(m NAP, one datum for all tiles so the tiles do not step at their edges), holes
(water, under viaducts) filled from their surroundings:

    python3 scripts/world/fetch_ahn.py --province                plan (no network): requests, sizes
    python3 scripts/world/fetch_ahn.py --province --fetch        coarse grid (--cell 25) for every province tile
    python3 scripts/world/fetch_ahn.py --province --fetch --detail   + 10 m (--detail-cell) for the tiles
                                                       with a dyke, embankment or wierde (data/cache/province)
    python3 scripts/world/fetch_ahn.py --province --fetch --limit 20   the first 20 tiles only (a sample)
    resumable: a downloaded tile stays in data/cache/ahn, a failed one is retried (3x) and listed

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
import glob
import gzip
import math
import os
import time
import struct
import sys
import urllib.request
import zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rdnew import RD_ORIGIN_X, RD_ORIGIN_Y, project  # noqa: E402

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
    with open(os.path.join(ROOT, "game", "stad.json")) as f:
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


# --------------------------------------------------------------- province

PROVINCE_DIR = os.path.join(ROOT, "data", "cache", "province")
PROVINCE_INDEX = [os.path.join(ROOT, "game", "world", "index-provincie.json"),
                  os.path.join(ROOT, "desktop", "build", "game", "world", "index-provincie.json")]
DATUM_NAP = 0.0  # province rasters are m NAP minus this one number: no per-tile reference


def province_tiles(path=None):
    """the tiles (i, j) of the province layer's index; empty ones (no content) too: the ground is still there"""
    for p in ([path] if path else PROVINCE_INDEX):
        if p and os.path.exists(p):
            with open(p) as f:
                idx = json.load(f)
            return sorted((t["i"], t["j"]) for t in idx["tiles"].values())
    raise SystemExit("no index-provincie.json (run the province build or desktop stage first)")


DETAIL_NAME = ("dijk", "dyk", "wierde", "terp", "wierd", "dam", "kade", "wal")


def detail_tiles():
    """tiles where the relief is thin and steep: a way tagged man_made=dyke / embankment=* or named
    like a dijk/wierde (data/cache/province, OSM), with its neighbours along the way. -> set of (i, j)"""
    out = set()
    for f in sorted(glob.glob(os.path.join(PROVINCE_DIR, "*.json.gz"))):
        with gzip.open(f, "rt", encoding="utf8") as fh:
            els = json.load(fh).get("elements", [])
        for e in els:
            t = e.get("tags") or {}
            if e.get("type") != "way" or not e.get("g"):
                continue
            name = (t.get("name") or "").lower()
            hit = t.get("man_made") == "dyke" or t.get("embankment") in ("yes", "dyke", "dike") or t.get("historic") == "archaeological_site"                 or any(name.endswith(n) or n + " " in name for n in DETAIL_NAME)
            if not hit:
                continue
            for lat, lon in e["g"]:
                x, y = project(lat, lon)
                out.add((math.floor((x - GRID_X0) / TILE_M), math.floor((y - GRID_Y0) / TILE_M)))
    return out


def fill_nodata(vals, w, h):
    """holes (water, under viaducts and buildings: AHN has no DTM there) from their surroundings: the mean
    of the filled neighbours, ring by ring from the edge of the hole. -> (filled values, fraction that was a hole)"""
    v = list(vals)
    holes = [k for k in range(w * h) if v[k] != v[k]]
    frac = len(holes) / (w * h) if w * h else 0
    if not holes:
        return v, 0.0
    if len(holes) == w * h:
        return [0.0] * (w * h), 1.0
    todo = set(holes)
    while todo:
        step = {}
        for k in todo:
            x, y = k % w, k // w
            acc, n = 0.0, 0
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
                u, t = x + dx, y + dy
                if 0 <= u < w and 0 <= t < h and v[t * w + u] == v[t * w + u]:
                    acc += v[t * w + u]
                    n += 1
            if n:
                step[k] = acc / n
        if not step:
            break
        for k, a in step.items():
            v[k] = a
            todo.discard(k)
    return v, frac


def get_tile(coverage, cell, key, box, n, retries=3):
    """the GeoTIFF bytes of one tile (cached in data/cache/ahn), None when PDOK has none; -1 on repeated errors"""
    cache = os.path.join(CACHE, f"{coverage}_{cell:g}m_{key}.tif")
    if os.path.exists(cache):
        with open(cache, "rb") as f:
            return f.read()
    x0, y0, x1, y1 = box
    url = (f"{WCS}?SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID={coverage}&FORMAT=image/tiff"
           f"&SUBSET=x({x0:.0f},{x1:.0f})&SUBSET=y({y0:.0f},{y1:.0f})&SCALESIZE=x({n}),y({n})")
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=120) as r:
                body = r.read()
            if body[:2] not in (b"II", b"MM"):
                print(f"  {key}: no GeoTIFF ({body[:120]!r})")
                return None
            with open(cache, "wb") as f:
                f.write(body)
            return body
        except Exception as err:  # noqa: BLE001 network: wait and retry
            print(f"  {key}: {err} (try {attempt + 1}/{retries})")
            time.sleep(2 * (attempt + 1))
    return -1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fetch", action="store_true")
    ap.add_argument("--tiles")
    ap.add_argument("--cell", type=float, default=None, help="m per cell (city 5, province 25)")
    ap.add_argument("--coverage", default="dtm_05m")
    ap.add_argument("--province", action="store_true", help="the province layer's tiles, absolute heights, holes filled")
    ap.add_argument("--detail", action="store_true", help="province: a finer grid for tiles with dykes, embankments, wierden")
    ap.add_argument("--detail-cell", type=float, default=10.0)
    ap.add_argument("--limit", type=int, default=0, help="only the first n tiles (a sample)")
    ap.add_argument("--delay", type=float, default=0.15, help="s between requests")
    a = ap.parse_args()
    if a.cell is None:
        a.cell = 25.0 if a.province else 5.0
    data = None
    if a.province:
        coarse = province_tiles()
        jobs = {t: a.cell for t in coarse}
        if a.detail:
            for t in detail_tiles():
                if t in jobs:
                    jobs[t] = a.detail_cell
        tiles = sorted(jobs)
    else:
        tiles, data = map_tiles()
        jobs = {t: a.cell for t in tiles}
    if a.tiles:
        tiles = [tile_of_key(k) for k in a.tiles.split(",")]
        jobs = {t: jobs.get(t, a.cell) for t in tiles}
    if a.limit:
        tiles = tiles[:a.limit]
    cells = {t: int(TILE_M / jobs[t]) for t in tiles}
    raw = sum(n * n * 2 for n in cells.values())
    fine = sum(1 for t in tiles if jobs[t] != a.cell)
    print(f"{len(tiles)} tiles of {TILE_M} m ({len(tiles) - fine} at {a.cell:g} m, {fine} at {a.detail_cell:g} m): {len(tiles)} requests, {raw / 1e6:.1f} MB of int16 rasters"
          f" (the GeoTIFF downloads are about the same)")
    if not a.fetch:
        print("plan only; --fetch downloads")
        return
    os.makedirs(CACHE, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    idx_path = os.path.join(OUT, "index.json")
    index = json.load(open(idx_path)) if os.path.exists(idx_path) else {"source": "AHN (PDOK WCS, CC0)", "coverage": a.coverage, "tiles": {}}
    failed, got_bytes, new_requests = [], 0, 0
    for i, j in tiles:
        key = tile_key(i, j)
        cell_m = jobs[(i, j)]
        n = cells[(i, j)]
        cached = os.path.exists(os.path.join(CACHE, f"{a.coverage}_{cell_m:g}m_{key}.tif"))
        body = get_tile(a.coverage, cell_m, key, tile_rd_box(i, j), n)
        if not cached and body not in (None, -1):
            new_requests += 1
            time.sleep(a.delay)
        if body == -1:
            failed.append(key)
            continue
        if body is None:
            continue
        got_bytes += len(body)
        w, h, vals = read_tiff(body)
        vals = [float("nan") if (v is None or v != v or abs(v) > 1e4) else v for v in vals]
        wx0, wy0 = GRID_X0 + i * TILE_M, GRID_Y0 + j * TILE_M
        cell = TILE_M / w
        if a.province:
            ref = DATUM_NAP
            vals, holes = fill_nodata(vals, w, h)
        else:
            roads = [r for r in data["roads"] if any(wx0 <= p[0] < wx0 + TILE_M and wy0 <= p[1] < wy0 + TILE_M for p in r["pts"])]
            ref = street_level(vals, w, h, cell, wx0, wy0, roads)
            holes = sum(1 for v in vals if v != v) / len(vals)
        cm = bytearray()
        for v in vals:
            cm += struct.pack("<h", -32768 if v != v else max(-32767, min(32767, round((v - ref) * 100))))
        with open(os.path.join(OUT, key + ".bin"), "wb") as f:
            f.write(cm)
        index["tiles"][key] = {"w": w, "h": h, "cell": cell, "x0": wx0, "y0": wy0, "street_nap": round(ref, 2), "holes": round(holes, 3), "abs": bool(a.province)}
        print(f"  {key}: {w} x {h}, {'datum' if a.province else 'street level'} NAP {ref:+.2f} m, {holes:.0%} holes")
    index["datum_nap"] = DATUM_NAP
    with open(idx_path, "w") as f:
        json.dump(index, f, indent=1, sort_keys=True)
    outb = sum(os.path.getsize(os.path.join(OUT, k + ".bin")) for k in index["tiles"] if os.path.exists(os.path.join(OUT, k + ".bin")))
    print(f"wrote {os.path.relpath(OUT, ROOT)} ({len(index['tiles'])} tiles, {outb / 1e6:.1f} MB rasters); this run: {new_requests} new requests, {got_bytes / 1e6:.2f} MB read from the GeoTIFFs")
    if failed:
        print(f"{len(failed)} failed (run again to retry): {','.join(failed)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
