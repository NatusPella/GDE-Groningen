#!/usr/bin/env python3
"""Fetch real Groningen traffic-signal node locations from OSM and merge them
into game/citymap.json's meta as meta.trafficLights: [{x, y}], following the
same read-modify-write pattern as add_landmarks.py.
"""
import json
import subprocess

MAP_PATH = "game/citymap.json"
OVERPASS_URL = "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
QUERY = '[out:json][timeout:60];node["highway"="traffic_signals"](53.204,6.538,53.235,6.592);out;'


def fetch_traffic_signals():
    result = subprocess.run(
        [
            "curl", "-s", "-A", "Mozilla/5.0",
            "--data-urlencode", f"data={QUERY}",
            OVERPASS_URL,
        ],
        capture_output=True, text=True, check=True,
    )
    return json.loads(result.stdout)["elements"]


def main():
    with open(MAP_PATH) as f:
        data = json.load(f)
    meta = data["meta"]
    lat0, lon0 = meta["origin"]["lat"], meta["origin"]["lon"]
    m_lat, m_lon = meta["mPerDegLat"], meta["mPerDegLon"]

    def project(lat, lon):
        return (lon - lon0) * m_lon, (lat0 - lat) * m_lat

    elements = fetch_traffic_signals()
    traffic_lights = []
    for el in elements:
        if el.get("type") != "node":
            continue
        x, y = project(el["lat"], el["lon"])
        traffic_lights.append({"x": round(x, 1), "y": round(y, 1)})

    meta["trafficLights"] = traffic_lights

    with open(MAP_PATH, "w") as f:
        json.dump(data, f, separators=(",", ":"))

    print(f"fetched {len(traffic_lights)} traffic signal nodes")


if __name__ == "__main__":
    main()
