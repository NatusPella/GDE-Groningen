"""The Python twin of game/js/rdnew.js gives the same doubles.

    python3 scripts/world/rdnew_test.py          # check against the fixture
    python3 scripts/world/rdnew_test.py --write  # rewrite scripts/fixtures/rdnew_points.json

scripts/rdnew_test.mjs checks the JS side against the same fixture.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rdnew as R  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FIXTURE = os.path.join(ROOT, "scripts", "fixtures", "rdnew_points.json")


def points():
    out = {"wgsToRd": [], "rdToWgs": [], "legacyToWorld": []}
    for i in range(15):
        for j in range(12):
            lat = 52.9 + i * 0.05 + j * 0.0013
            lon = 6.1 + j * 0.1 + i * 0.0021
            x, y = R.wgs_to_rd(lat, lon)
            out["wgsToRd"].append({"lat": lat, "lon": lon, "x": x, "y": y})
            rx, ry = 200000 + j * 7000.5, 540000 + i * 6000.25
            la, lo = R.rd_to_wgs(rx, ry)
            out["rdToWgs"].append({"x": rx, "y": ry, "lat": la, "lon": lo})
            lx, ly = -12000 + j * 2200.3, -13000 + i * 1700.7
            wx, wy = R.legacy_to_world(lx, ly)
            out["legacyToWorld"].append({"lx": lx, "ly": ly, "x": wx, "y": wy})
    return out


def main():
    pts = points()
    if "--write" in sys.argv:
        with open(FIXTURE, "w", encoding="utf-8") as f:
            json.dump(pts, f, indent=0)
            f.write("\n")
        print(f"wrote {FIXTURE}")
        return
    with open(FIXTURE, encoding="utf-8") as f:
        fx = json.load(f)
    bad = sum(1 for k in pts for a, b in zip(pts[k], fx[k]) if a != b)
    x, y = R.wgs_to_rd(52.15517440, 5.38720621)
    fails = 0
    if (x, y) != (155000, 463000):
        print("FAIL Amersfoort", x, y); fails += 1
    if bad:
        print(f"FAIL {bad} points differ from the fixture"); fails += 1
    lat, lon = R.world_to_wgs(*R.wgs_to_world(53.3, 6.7))
    if abs(lat - 53.3) > 1e-11 or abs(lon - 6.7) > 1e-11:
        print("FAIL round trip"); fails += 1
    print("ok" if not fails else f"{fails} failed")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
