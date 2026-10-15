#!/usr/bin/env python3
"""Sample real Groningen satellite imagery to derive authentic color
palettes for the game's stylized rendering (buildings/roads/water/green/
ground) - the photo itself isn't shown in-game, only its colors are used.

Reads data/satellite_reference.jpg (Esri World Imagery export, imageSR=4326,
exact bbox below) and game/citymap.json, prints ready-to-paste JS color arrays.
The photo may not be redistributed, so it is not in the repo (.gitignore):
export it yourself for the bbox below, keep it local, and run this script.
"""
import os
import sys
import json
import math
import random
import numpy as np
from PIL import Image

SAT_BBOX = dict(west=6.538, south=53.204, east=6.592, north=53.235)
SAT_PATH = "data/satellite_reference.jpg"
MAP_PATH = "game/citymap.json"

random.seed(7)


def main():
    if not os.path.exists(SAT_PATH):
        sys.exit(f"{SAT_PATH} is missing: export the Esri World Imagery tile for "
                 f"{SAT_BBOX} (imageSR=4326) and save it there. It stays local (.gitignore).")
    img = np.asarray(Image.open(SAT_PATH).convert("RGB"))
    ih, iw = img.shape[0], img.shape[1]
    with open(MAP_PATH) as f:
        data = json.load(f)
    meta = data["meta"]
    lat0, lon0 = meta["origin"]["lat"], meta["origin"]["lon"]
    m_per_lat, m_per_lon = meta["mPerDegLat"], meta["mPerDegLon"]

    def world_to_px(x, y):
        lon = lon0 + x / m_per_lon
        lat = lat0 - y / m_per_lat
        px = (lon - SAT_BBOX["west"]) / (SAT_BBOX["east"] - SAT_BBOX["west"]) * iw
        py = (SAT_BBOX["north"] - lat) / (SAT_BBOX["north"] - SAT_BBOX["south"]) * ih
        return px, py

    def sample_patch(px, py, radius=3):
        x0, x1 = max(0, int(px - radius)), min(iw, int(px + radius + 1))
        y0, y1 = max(0, int(py - radius)), min(ih, int(py + radius + 1))
        if x1 <= x0 or y1 <= y0:
            return None
        patch = img[y0:y1, x0:x1].reshape(-1, 3)
        return patch.mean(axis=0)

    def bounds_center(pts):
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        return (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2

    def polygon_area(pts):
        a = 0.0
        n = len(pts)
        for i in range(n - 1):
            a += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]
        return abs(a) / 2

    # --- buildings: sample many, cluster into a palette ---
    buildings = data["buildings"]
    sample_n = min(2500, len(buildings))
    picks = random.sample(buildings, sample_n)
    colors = []
    for b in picks:
        area = polygon_area(b["pts"])
        if area < 20:  # skip tiny slivers, too easy to sample a neighboring roof/road
            continue
        cx, cy = bounds_center(b["pts"])
        px, py = world_to_px(cx, cy)
        c = sample_patch(px, py, radius=2)
        if c is None:
            continue
        # drop near-black (deep shadow) and near-white (glare/cloud) outliers
        lum = c.mean()
        if lum < 25 or lum > 235:
            continue
        colors.append(c)
    colors = np.array(colors)
    print(f"# sampled {len(colors)} building roof colors")

    k = 9
    rng = np.random.default_rng(3)
    centers = colors[rng.choice(len(colors), k, replace=False)]
    for _ in range(25):
        d = np.linalg.norm(colors[:, None, :] - centers[None, :, :], axis=2)
        assign = d.argmin(axis=1)
        new_centers = np.array([
            colors[assign == i].mean(axis=0) if (assign == i).any() else centers[i]
            for i in range(k)
        ])
        if np.allclose(new_centers, centers, atol=0.5):
            centers = new_centers
            break
        centers = new_centers
    counts = np.bincount(assign, minlength=k)
    order = np.argsort(-counts)
    print("BUILDING_PALETTE (weight, rgb):")
    for i in order:
        r, g, b = centers[i].astype(int)
        print(f"  [{r}, {g}, {b}],  // weight {counts[i]}")

    # --- roads: sample along drivable centerlines ---
    def sample_many(items, cat_filter, n, label):
        pts_pool = []
        for r in items:
            if cat_filter and r.get("cat") not in cat_filter:
                continue
            pts_pool.extend(r["pts"])
        if not pts_pool:
            print(f"# no samples for {label}")
            return
        picks = random.sample(pts_pool, min(n, len(pts_pool)))
        cs = []
        for x, y in picks:
            px, py = world_to_px(x, y)
            c = sample_patch(px, py, radius=1)
            if c is not None:
                cs.append(c)
        cs = np.array(cs)
        med = np.median(cs, axis=0).astype(int)
        print(f"{label}: median rgb {list(med)} (n={len(cs)})")

    sample_many(data["roads"], {"normal", "minor"}, 600, "ROAD residential/tertiary asphalt")
    sample_many(data["roads"], {"major"}, 300, "ROAD major asphalt")

    # --- water ---
    def sample_polygons(items, n, label):
        cs = []
        tries = 0
        while len(cs) < n and tries < n * 8 and items:
            tries += 1
            poly = random.choice(items)
            xs = [p[0] for p in poly["pts"]]
            ys = [p[1] for p in poly["pts"]]
            minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
            if maxx - minx < 2 or maxy - miny < 2:
                continue
            x = random.uniform(minx, maxx)
            y = random.uniform(miny, maxy)
            px, py = world_to_px(x, y)
            c = sample_patch(px, py, radius=1)
            if c is not None:
                cs.append(c)
        if not cs:
            print(f"# no samples for {label}")
            return
        cs = np.array(cs)
        med = np.median(cs, axis=0).astype(int)
        print(f"{label}: median rgb {list(med)} (n={len(cs)})")

    sample_polygons(data["water"], 400, "WATER canal")
    sample_polygons([g for g in data["green"] if g["kind"] in ("grass", "park", "garden")], 400, "GREEN grass/park")
    sample_polygons([g for g in data["green"] if g["kind"] == "forest"], 300, "GREEN forest")


if __name__ == "__main__":
    main()
