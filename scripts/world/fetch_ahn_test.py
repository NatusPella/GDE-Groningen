"""fetch_ahn.py without the network: the tile keys, the hole filling and the dyke finder's inputs.

    python3 scripts/world/fetch_ahn_test.py
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_ahn as F  # noqa: E402

fails = 0


def ok(c, m):
    global fails
    if not c:
        fails += 1
        print("FAIL", m)


# the city's anchor tile and its inverse
ok(F.tile_of_key(F.tile_key(3, -4)) == (3, -4), "tile key round trip")
x0, y0, x1, y1 = F.tile_rd_box(0, 0)
ok(x1 - x0 == 1000 and y1 - y0 == 1000, "a tile is 1 km")

# holes: a ring of nodata round a ramp is filled between the sides (under a viaduct), no nan is left
w = h = 8
nan = float("nan")
v = [float(x) for _ in range(h) for x in range(w)]
for k in (3 + 8 * 3, 4 + 8 * 3, 3 + 8 * 4, 4 + 8 * 4):
    v[k] = nan
f, frac = F.fill_nodata(v, w, h)
ok(all(a == a for a in f), "no nan after filling")
ok(abs(frac - 4 / 64) < 1e-9, "hole fraction")
ok(all(2.0 <= f[k] <= 5.0 for k in (3 + 8 * 3, 4 + 8 * 3, 3 + 8 * 4, 4 + 8 * 4)), "filled between the heights on both sides")
ok(f[0] == v[0], "valid cells stay")
f2, fr2 = F.fill_nodata([nan] * 16, 4, 4)
ok(fr2 == 1.0 and all(a == 0.0 for a in f2), "an all-water tile is flat 0")
f3, fr3 = F.fill_nodata([1.0] * 16, 4, 4)
ok(fr3 == 0.0, "no holes, no change")

# the province tiles come from the index
if os.path.exists(F.PROVINCE_INDEX[0]) or os.path.exists(F.PROVINCE_INDEX[1]):
    t = F.province_tiles()
    ok(len(t) > 1000 and len(set(t)) == len(t), "province tile list")

print(f"{'FAIL' if fails else 'ok'}: fetch_ahn checks")
sys.exit(1 if fails else 0)
