"""Shared Overpass access for the add_*.py scripts: the query box follows
the city's meta.bounds (game/stad.json), responses are cached in data/ together with
the box they cover and refetched when the map grows (or with --refresh)."""
import json
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from world.rdnew import meta_bbox  # noqa: E402

URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]
# OVERPASS_URL=... puts one endpoint first (when the main one is busy)
if os.environ.get("OVERPASS_URL"):
    URLS.insert(0, os.environ["OVERPASS_URL"])


def map_bbox(meta, pad=0.001):
    """(south, west, north, east) around the map bounds."""
    return meta_bbox(meta, pad, 5)


def bbox_str(b):
    return "({:.5f},{:.5f},{:.5f},{:.5f})".format(*b)


def covers(have, want):
    return bool(have) and have[0] <= want[0] and have[1] <= want[1] and have[2] >= want[2] and have[3] >= want[3]


UA = "GDE-Groningen-mapbuilder/1.0 (+https://github.com/NatusPella/GDE-Groningen)"


def overpass_once(url, query, timeout=300):
    """(status, body, retry_after) for one POST via curl; status 0 on a curl failure."""
    r = subprocess.run(["curl", "-s", "-m", str(timeout), "-A", UA, "-H", "Accept: application/json",
                        "-D", "-", "-w", "\n%{http_code}", "--data-urlencode", f"data={query}", url],
                       capture_output=True, text=True)
    if r.returncode != 0:
        return 0, "", 0
    out = r.stdout
    out, _, code = out.rpartition("\n")
    head, _, body = out.partition("\r\n\r\n")
    retry = 0
    for line in head.splitlines():
        if line.lower().startswith("retry-after:"):
            try:
                retry = min(int(line.split(":", 1)[1].strip()), 120)
            except ValueError:
                pass
    return int(code) if code.isdigit() else 0, body.strip(), retry


def overpass(query, attempts=5, timeout=300, key=None):
    """Overpass JSON; tries every endpoint, backs off exponentially on 429/5xx
    (and honours Retry-After). key="elements" returns just that list."""
    delay = 10
    for attempt in range(attempts):
        wait = delay
        for url in URLS:
            status, txt, retry = overpass_once(url, query, timeout)
            if status == 200 and txt.startswith("{") and txt.endswith("}"):
                try:
                    data = json.loads(txt)
                    return data[key] if key else data
                except ValueError:
                    pass
            if status == 429 and retry:
                wait = max(wait, retry)
            print(f"  overpass {url} failed (http {status}), trying next", file=sys.stderr)
        if attempt + 1 < attempts:
            print(f"  waiting {wait}s before retry {attempt + 2}/{attempts}", file=sys.stderr)
            time.sleep(wait)
        delay = min(delay * 2, 120)
    raise SystemExit("all overpass endpoints failed")


def cached(path, bbox, make_query):
    """Overpass JSON for make_query(bbox), from path when it covers bbox."""
    if "--refresh" not in sys.argv and os.path.exists(path):
        with open(path) as f:
            raw = json.load(f)
        if covers(raw.get("bbox"), bbox):
            return raw
    raw = overpass(make_query(bbox))
    raw["bbox"] = list(bbox)
    with open(path, "w") as f:
        json.dump(raw, f)
    return raw


def near_data(data, cell=50.0):
    """Predicate: is (x, y) within about a cell of a building or car road?
    Keeps POIs out of the fields beyond the mapped area."""
    occ = set()
    for b in data["buildings"]:
        for p in b["pts"][::3]:
            occ.add((int(p[0] // cell), int(p[1] // cell)))
    for r in data["roads"]:
        if r.get("cat") in ("major", "normal", "minor"):
            for p in r["pts"]:
                occ.add((int(p[0] // cell), int(p[1] // cell)))

    def ok(x, y):
        i, j = int(x // cell), int(y // cell)
        return any((i + di, j + dj) in occ for di in (-1, 0, 1) for dj in (-1, 0, 1))
    return ok
