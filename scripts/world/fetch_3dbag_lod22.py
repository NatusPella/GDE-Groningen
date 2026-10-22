#!/usr/bin/env python3
"""3D BAG LoD 2.2 (CityJSON) offline binnenhalen, alleen voor later (#410).

NIET onderdeel van de bouw, de stage, de release of de poort: dit script draait alleen als iemand het
aanroept, en zonder `--fetch` of `--sizes` doet het niets met het netwerk. Het spel laadt er niets van
(docs/BAG-LOD22.md). De ruwe tegels komen in data/cache/3dbag-lod22/ (buiten git);
scripts/world/bag_lod22.mjs zet ze om naar een compact formaat per kilometertegel.

    python3 scripts/world/fetch_3dbag_lod22.py --tile 8/760/72     plan: de URL's uit de tegelindex in de cache (geen netwerk)
    python3 scripts/world/fetch_3dbag_lod22.py --province --sizes  de groottes per tegel (HEAD-verzoeken, netwerk)
    python3 scripts/world/fetch_3dbag_lod22.py --fetch --tile 8/760/72      een of meer tegels ophalen (herhaalbaar)
    python3 scripts/world/fetch_3dbag_lod22.py --fetch --bbox x0,y0,x1,y1   alle tegels die de RD-box raken (m, RD New)
    python3 scripts/world/fetch_3dbag_lod22.py --fetch --province           alle tegels van de provincie (veel: eerst --sizes)
    opties: --version v20250903 (standaard: de nieuwste tegelindex in de cache, anders data.3dbag.nl/latest),
            --max-mb 600 (een tegel groter dan dit wordt overgeslagen), --out <map>, --scratch <map met <versie>/tile_index.fgb>

Wat het controleert voor het iets ophaalt:
  - de licentie in metadata.json van de versie moet CC BY 4.0 zijn (anders stopt het);
  - de versie staat in <out>/<versie>/VERSIE.json, naast de licentieregel;
  - de grootte per tegel (HEAD) tegen --max-mb en de vrije schijf (4x de tegel + 2 GB);
  - na het ophalen de sha256 uit de tegelindex (`cj_sha256`): komt die niet overeen, dan wordt het bestand weggegooid.
Netjes tegen de server: een neutrale User-Agent, geen persoonsgegevens, geen cookies, een pauze tussen tegels, herhalen
met wachttijd (uit fetch_3dbag.py). Hervatbaar: een tegel die er al staat wordt overgeslagen.

De tegelindex (tile_index.fgb) heeft per tegel `cj_download` (CityJSON, .city.json.gz), `gpkg_download` en `obj_download`;
hier wordt alleen CityJSON gebruikt. De tegels van 3D BAG zijn een quadtree (in de index van v20250903: 436 tegels voor de provincie
met 3 km rand, samen 4474 km2; zijden van 0,5 km in de stad tot 64 km, de meeste 1 of 2 km) en kunnen ongepakt een halve gigabyte of meer
zijn (docs/BAG-LOD22.md, risico's).

Licentie: 3D BAG, TU Delft en 3DGI, https://3dbag.nl, CC BY 4.0 (aftiteling bestaat al: NOTICE.md, docs/LICENTIES.md,
de credits van het spel).
"""
import argparse
import hashlib
import json
import os
import shutil
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_3dbag as F  # noqa: E402  (importeren doet niets: alleen definities)

ROOT = F.ROOT
DEFAULT_OUT = os.path.join(ROOT, "data", "cache", "3dbag-lod22")
DEFAULT_SCRATCH = os.path.join(ROOT, "data", "cache", "3dbag-province")  # daar staat de tegelindex al
LICENSE_OK = ("cc by 4.0", "cc-by-4.0", "creativecommons.org/licenses/by/4.0")


def name_of(tid):
    return tid.replace("/", "-")


def cached_versions(scratch):
    """de versies waarvan de tegelindex in de cache staat, nieuwste laatst"""
    if not os.path.isdir(scratch):
        return []
    return sorted(d for d in os.listdir(scratch) if d.startswith("v") and os.path.exists(os.path.join(scratch, d, "tile_index.fgb")))


def pick_version(a, net):
    if a.version:
        return a.version
    have = cached_versions(a.scratch)
    if have:
        return have[-1]
    if not net:
        raise SystemExit("geen tegelindex in de cache en geen --fetch/--sizes: er is geen netwerk gebruikt. Geef --version en --fetch (of --sizes).")
    meta = json.loads(F.get(F.BASE + "/latest/metadata.json"))
    return "v" + meta["identificationInfo"]["citation"]["edition"].lstrip("v").replace(".", "")


def tile_list(a, version, net):
    """[(tegel id, cj-url, sha256, bbox RD)] voor wat gevraagd is, uit de tegelindex"""
    if not (a.tile or a.bbox or a.province):
        raise SystemExit("geef --tile, --bbox of --province (zonder die vraagt dit script niets)")
    idx = os.path.join(a.scratch, version, "tile_index.fgb")
    if not os.path.exists(idx):
        if not net:
            raise SystemExit(f"{idx} ontbreekt; zonder --fetch/--sizes gebruikt dit script het netwerk niet")
        F.get(f"{F.BASE}/{version}/tile_index.fgb", idx)
    with open(idx, "rb") as f:
        feats = F.read_fgb(f.read())
    out = []
    want = set(a.tile or [])
    bbox = tuple(map(float, a.bbox.split(","))) if a.bbox else None
    rings = None
    if a.province:
        rings = F.province_ring()
    for props, box in feats:
        tid = props.get("tile_id") or props.get("id")
        if want and tid not in want:
            continue
        if bbox and (box[2] < bbox[0] or box[0] > bbox[2] or box[3] < bbox[1] or box[1] > bbox[3]):
            continue
        if rings is not None and not F.box_near_province(box, rings, F.BUFFER_M):
            continue
        url = props.get("cj_download") or f"{F.BASE}/{version}/tiles/{tid}/{name_of(tid)}.city.json.gz"
        out.append((tid, url, props.get("cj_sha256"), box))
    missing = want - {t[0] for t in out}
    if missing:
        print("tegels niet in de index:", ", ".join(sorted(missing)))
    return out


def check_license(version):
    """de licentie van de versie volgens de officiële metadata; (True, metadata) als het CC BY 4.0 noemt"""
    meta = json.loads(F.get(f"{F.BASE}/{version}/metadata.json"))
    text = json.dumps(meta).lower()
    return any(k in text for k in LICENSE_OK), meta


def sha256_of(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--version")
    ap.add_argument("--tile", action="append", help="tegel-id uit de index, bv. 8/760/72 (herhaalbaar)")
    ap.add_argument("--bbox", help="x0,y0,x1,y1 in RD New (m)")
    ap.add_argument("--province", action="store_true")
    ap.add_argument("--sizes", action="store_true", help="grootte per tegel opvragen (HEAD, netwerk)")
    ap.add_argument("--fetch", action="store_true", help="echt ophalen (netwerk)")
    ap.add_argument("--max-mb", type=float, default=600)
    ap.add_argument("--out", default=DEFAULT_OUT)
    ap.add_argument("--scratch", default=DEFAULT_SCRATCH)
    a = ap.parse_args()
    if not (a.tile or a.bbox or a.province):
        raise SystemExit("geef --tile, --bbox of --province (zonder die vraagt dit script niets)")
    net = a.fetch or a.sizes
    version = pick_version(a, net)
    tiles = tile_list(a, version, net)
    area = sum((t[3][2] - t[3][0]) * (t[3][3] - t[3][1]) for t in tiles) / 1e6
    print(f"3D BAG {version}: {len(tiles)} tegel(s), samen {area:.0f} km2 (RD New)")
    if not net:
        for tid, url, sha, box in tiles[:40]:
            print(f"  {tid}  {url}")
        if len(tiles) > 40:
            print(f"  ... en {len(tiles) - 40} meer")
        print("Plan alleen, er is niets opgehaald. Met --sizes de groottes, met --fetch ophalen.")
        return
    if a.sizes:
        total = 0
        for tid, url, sha, box in tiles:
            n = F.head_size(url)
            total += n
            print(f"  {tid}: {n / 1e6:.1f} MB (gzip)")
            time.sleep(0.2)
        print(f"totaal {total / 1e6:.0f} MB te downloaden, ongepakt grofweg 6 tot 10 keer zoveel")
        if not a.fetch:
            return
    ok, _meta = check_license(version)
    if not ok:
        raise SystemExit(f"de metadata van {version} noemt geen CC BY 4.0: gestopt (controleer de licentie en pas LICENSE_OK aan)")
    dest_dir = os.path.join(a.out, version)
    os.makedirs(dest_dir, exist_ok=True)
    with open(os.path.join(dest_dir, "VERSIE.json"), "w") as f:
        json.dump({"version": version, "license": "CC BY 4.0", "source": F.BASE, "checked": time.strftime("%Y-%m-%d")}, f, indent=1)
    done = 0
    for tid, url, sha, box in tiles:
        dest = os.path.join(dest_dir, name_of(tid) + ".city.json.gz")
        if os.path.exists(dest):
            done += 1
            continue
        n = F.head_size(url)
        if n / 1e6 > a.max_mb:
            print(f"overgeslagen {tid}: {n / 1e6:.0f} MB boven --max-mb {a.max_mb}")
            continue
        free = shutil.disk_usage(dest_dir).free
        if free < 4 * n + 2e9:
            print(f"gestopt: nog {free / 1e9:.1f} GB vrij voor een tegel van {n / 1e6:.0f} MB")
            break
        t0 = time.time()
        F.get(url, dest)
        if sha and sha256_of(dest) != sha:
            os.remove(dest)
            print(f"  {tid}: sha256 komt niet overeen, weggegooid")
            continue
        done += 1
        print(f"  [{done}/{len(tiles)}] {tid} {n / 1e6:.0f} MB in {time.time() - t0:.0f} s", flush=True)
        time.sleep(1)
    print(f"klaar: {done} van {len(tiles)} in {os.path.relpath(dest_dir, ROOT)}")


if __name__ == "__main__":
    main()
