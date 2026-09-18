#!/usr/bin/env python3
"""Fetch real Groningen car-repair/garage locations from OpenStreetMap and
merge them into game/citymap.json's meta as meta.garages, for the Pay 'n
Spray pickup spots.
"""
import json
import subprocess

MAP_PATH = "game/citymap.json"

OVERPASS_URL = "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
OVERPASS_QUERY = (
    '[out:json][timeout:60];'
    'nwr["shop"~"^(car_repair|car|tyres)$"](53.204,6.538,53.235,6.592);'
    'out center tags;'
)


def fetch_garages():
    result = subprocess.run(
        [
            "curl", "-s", "-A", "Mozilla/5.0",
            "--data-urlencode", f"data={OVERPASS_QUERY}",
            OVERPASS_URL,
        ],
        capture_output=True, text=True, check=True,
    )
    data = json.loads(result.stdout)
    out = []
    for el in data.get("elements", []):
        if "lat" in el and "lon" in el:
            lat, lon = el["lat"], el["lon"]
        elif "center" in el:
            lat, lon = el["center"]["lat"], el["center"]["lon"]
        else:
            continue
        name = el.get("tags", {}).get("name", "Garage")
        out.append((name, lat, lon))
    return out


def main():
    with open(MAP_PATH) as f:
        data = json.load(f)
    meta = data["meta"]
    lat0, lon0 = meta["origin"]["lat"], meta["origin"]["lon"]
    m_lat, m_lon = meta["mPerDegLat"], meta["mPerDegLon"]

    def project(lat, lon):
        return (lon - lon0) * m_lon, (lat0 - lat) * m_lat

    garages_raw = fetch_garages()
    out_garages = []
    for name, lat, lon in garages_raw:
        x, y = project(lat, lon)
        out_garages.append({"name": name, "x": round(x, 1), "y": round(y, 1)})

    meta["garages"] = out_garages

    with open(MAP_PATH, "w") as f:
        json.dump(data, f, separators=(",", ":"))

    print(f"added {len(out_garages)} garages to meta.garages")
    for g in out_garages:
        print(f"  {g['name']:32s} ({g['x']}, {g['y']})")


if __name__ == "__main__":
    main()
