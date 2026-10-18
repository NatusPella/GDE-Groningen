"""Places just outside the province (#237): names, kinds and positions of the
towns and villages of the strip round Groningen (Friesland, Drenthe, Lower
Saxony), for dimmed map labels. One polite Overpass request (names and
positions only, no people), cached in data/cache/ and written as a small file
game/borderplaces.json: [[name, kind, lat, lon], ...].
Source: OpenStreetMap contributors, ODbL (https://www.openstreetmap.org/copyright).
  python3 scripts/world/fetch_border_places.py [--refresh]
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.dirname(HERE))

# south, west, north, east: the province plus a strip of about 15 km
BBOX = (52.72, 5.85, 53.62, 7.70)
CACHE = os.path.join(ROOT, "data", "cache", "border_places_overpass.json")
OUT = os.path.join(ROOT, "game", "borderplaces.json")
KINDS = ("city", "town", "village")


def query():
    return '[out:json][timeout:90];node["place"~"^(city|town|village)$"]["name"](%s,%s,%s,%s);out;' % BBOX


def slim(elements):
    """[[name, kind, lat, lon]] sorted by name, one per name (the first node)."""
    seen, out = set(), []
    for e in elements:
        t = e.get("tags") or {}
        name, kind = t.get("name"), t.get("place")
        if not name or kind not in KINDS or "lat" not in e or name in seen:
            continue
        seen.add(name)
        out.append([name, kind, round(e["lat"], 4), round(e["lon"], 4)])
    return sorted(out, key=lambda r: r[0])


def fetch(q):
    """The elements of one Overpass answer. curl without the header dump, so it also
    works on Windows (osmfetch.py splits head and body on CRLF, which text mode hides)."""
    import subprocess
    import time
    from osmfetch import URLS, UA  # noqa: E402
    for attempt in range(3):
        for url in URLS:
            r = subprocess.run(["curl", "-s", "-m", "120", "-A", UA, "--data-urlencode", "data=" + q, url], capture_output=True)
            try:
                return json.loads(r.stdout.decode("utf8"))["elements"]
            except ValueError:
                print(f"  overpass {url} gave no JSON, trying next", file=sys.stderr)
        time.sleep(15 * (attempt + 1))
    raise SystemExit("all overpass endpoints failed")


def main():
    if "--refresh" in sys.argv or not os.path.exists(CACHE):
        els = fetch(query())
        os.makedirs(os.path.dirname(CACHE), exist_ok=True)
        with open(CACHE, "w", encoding="utf8") as f:
            json.dump({"bbox": BBOX, "elements": els}, f, ensure_ascii=False)
    with open(CACHE, encoding="utf8") as f:
        els = json.load(f)["elements"]
    rows = slim(els)
    with open(OUT, "w", encoding="utf8", newline="\n") as f:
        json.dump(rows, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(rows)} places -> {os.path.relpath(OUT, ROOT)} ({os.path.getsize(OUT)} bytes)")


if __name__ == "__main__":
    main()
