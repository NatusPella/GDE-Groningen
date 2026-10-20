# Van stadskaart naar tegels: één wereld, de stad als kwaliteitsmaat

*Migratieplan voor issue #90, 17 oktober 2026 (stand 0.34 + Unreleased). Alleen een
plan: er is geen code veranderd. Wat niet is nagegaan staat als **AANNAME**.
Bij een tegenstrijdigheid met [PROVINCIE-PLAN.md](PROVINCIE-PLAN.md) (2.5, 2.6, 2.11-2.17) of
[ARCHITECTURE.md](../ARCHITECTURE.md) ("World tiles") wint het plan hier voor de stad,
daarna werken we die documenten bij.*

## 0. Doel, en wat het niet is

**Eis van de eigenaar (#90):** de stad werkt met exact dezelfde logica als de
provincie: één wereldbouwer, één set tegellagen, één waterregel, één weg- en
routegraaf, één plaats- en regionamenlogica, één manier van renderen. Geen
`citymap.json`, geen aparte stadsgeneratoren, stadsrenderlagen of stadswaterpad.
Hand-gebouwde landmarks blijven, als objecten op de tegels.

**Verduidelijking (coordinator, namens de eigenaar):** het doel is dat de **hele
provincie het niveau van de stad haalt** (kwaliteit, snelheid, laden, LOD). De stad wordt
niet vereenvoudigd en mag niet achteruitgaan. Daarom:

1. **De stad is de maat.** Per categorie staat in 2 een meetbaar pariteitscriterium.
2. **Stap S0 legt de stad vooraf vast** (12 schermafdrukken) en elke latere stap wordt daartegen op
   verloren detail gecontroleerd, naast de bestaande audits (3). Geen prestatiemetingen per stap.
3. **Eerst de provinciebouw naar stadskwaliteit (fase A)**, pas daarna schakelt de
   stad per laag over op het gedeelde pad (fase B), achter een vlag en met het oude
   stadspad intact tot pariteit is aangetoond.
4. **Eén LOD-, streaming- en laadbudget** voor stad en provincie (4.4).

Bevinding die het plan sterk vereenvoudigt: de stad **is al** voor een groot deel
tegels. `scripts/world/pack_tiles.mjs` (320 regels) knipt de uitkomst van
`GameMap` (geladen uit `citymap.json` + `mapextras.json`) in `.gdt`-tegels
(de 54 "stad"-tegels, vastgepind via `index.pins.city`), en `scene3d.js` tekent
gestreamde provinciegebouwen, -wegen, -water en -bomen met dezelfde detailstreamers
(`syncBuildings`, `syncRoads`, `syncWater`, `syncTrees`) als de stad. Het verschil zit dus
in **de bron en de inhoud van de tegels** (citymap-pad met hand- en oplosserwerk
tegenover OSM-extract-pad), in **de hele-array-consumenten** die op de vastgepinde
stad leunen, en in **stadsmodules naast de tegels** (landmarks, interieurs, clutter,
meta-lijsten). De migratie is dus vooral: (a) de bouwer op het niveau van de stad
brengen, (b) de bron omzetten, (c) de consumenten van hele arrays en `map.meta`
laten lezen uit tegels.

(Kleine rechtzetting: de wereldbouwer is `game/js/worldbuilder.js` (490 regels), niet
`scripts/world/worldbuilder.js`. `build_province.mjs` (484) en `build_corridor.mjs`
(562, `tileBlob`) zitten in `scripts/world/`.)

## 1. Inventaris

Aannames voor deze inventaris: de Ommeland-laag (`countryreal/edge/bake/skyline`,
`ommeland.json/.bin`, `ommeland*.js`, `add_ommeland.py`, `fetch_ommeland.py`) is door
de andere agent weggehaald (#3). Wat daar nog aan hangt (`shops.js`, `horeca.js`,
`parkinglots.js`, `parkedcars.js`, `ownedvehicles.js`, `respawn.js`, `safety.js`,
`spotcheck.js`, `worldends.js`, `provinceworld.js`, `pg_koe.js`, `realmap.js` importeren
nu `countryreal.js` (`clearOfReal`)) is **niet** onze zaak; wij gaan ervan uit dat
dat er al uit is. **AANNAME.**

### 1.1 Wat er nu uit `citymap.json` komt (gemeten, git-werkboom)

| Bron | Grootte | Inhoud |
|---|---|---|
| `game/citymap.json` | 17,3 MB (16 MB op schijf) | 10.785 wegen, 49.504 gebouwen (47.410 `3dbag`, 2.085 `default`, 8 `osm_levels`, 1 `osm_height`), 352 water, 2.778 groen, 17.853 bomen, 193 spoor, 3 stations, 3 overwegen, 4 spoorroutes, 16 spoorliften, 22 perrons, 12 gemapt meubilair |
| wegen | | 535 met hoogteprofiel `z`, 121 tunnel, 48 viaduct, 5.845 met `lanes`, 347 brug, 34 beweegbaar |
| gebouwen | | 29 `landmark`-rijen (Paddepoel x17, Euroborg x4, Martinitoren, Martinikerk, Der Aa-kerk, Hoofdstation, Forum, Academiegebouw, Museum, Goudkantoor), 1 met `parts`, 4 met `pitch`, alle met `sd` |
| `meta` | | 14 landmarks, 2 districten, 66 buurtpunten, 48 garages, 470 horeca, 422 verkeerslichten, `pois`, helipad, 54 winkels, UMCG, 7 zorglocaties, 2 politiebureaus, `bounds`, `locks` |
| `game/mapextras.json` | 98 KB | 206 busRoads, 116 busLanes, 20 extra gebouwen, 142 gebouwpatches, 210 doorgangen, 28 tankstations, 8 padel, 1 roadZ |
| `game/landmarkkits.json` | 93 KB | kits (kerken, molens, torens, borgen) voor plaatsen buiten de stad (LK1) |
| `game/facilities.json` | 836 KB | 9.653 voorzieningen, 500 plaatsen, 1.012 straten, 94 rijstrookrecords (provinciebreed, los van de tegels) |
| `data/*` ruwe bronnen | ~52 MB | `groningen_raw.json` (34 MB), `ring_raw`, `districts_raw`, `shops_raw`, `horeca_raw`, `extras_buildings_*`, `landmark_*`, ... (alleen stad) |

Provincie ter vergelijking: 4.077 tegels in de set, 435.000 gebouwen, ~53 MB totaal (PROVINCIE-PLAN 2.28).

### 1.2 Consumenten van `citymap.json` en de stads-`GameMap`

**Laden (runtime, 13 bestanden noemen `citymap`):** `game/js/main.js` (r. 255-257:
`tiles ? tiles.world : loadMap('citymap.json')`, `loadFacilities('citymap.json')`),
`mapdata.js` (1015 r.: `loadMap`, `applyMapExtras`, `fetchExtras`, de `GameMap`-constructor met afleiding),
`tileworld.js` (`loadMapAuto`), `facilities.js`, `roadsurface.js` (r. 1491, `runGeo('roadInit', { url: citymap.json })`),
`railway.js`, `roadaccess.js`, `landmarkmodels.js`, `intromontage.js`, `models3d_buildings.js` (alleen commentaar/exports voor Node),
`ringroute.js` (gegenereerd uit citymap, `gen_ringroute.py`), `countryreal.js` (weg met #3).
**Bouw:** `desktop/build.mjs` (r. 63: hash en `packWorld`), `web/build.mjs` (r. 29 `ESSENTIALS`).

**Hele-array-consumenten (de echte afhankelijkheid van "stad vastgepind"):** 45 modules in
`game/js` lezen `map.roads/buildings/water/green/trees/rails` als hele array of via de
stadsbrede lookups. Top (aantal verwijzingen): `passages.js` 8, `geokernels.js` 7, `scene3d.js` 6,
`mapdata.js` 5, `routing.js` 4, `ringcheck.js` 4, `elevation.js` 4, `waterindex.js` 3,
`junctions.js` 3, `farlod.js` 3, `terrain3d.js` 2, `skyprops.js`, `shops.js`, `parkedcars.js`,
`home.js`, `grass.js`, `flavour.js` 2 elk, daarnaast `vehicle.js`, `trailer.js`, `thuis3d.js`,
`streetsigns.js`, `worldevents.js`. Dit zijn de modules die in fase B10 (ontpinnen) per stuk
op tegelqueries moeten.

**`map.meta`-lijsten (stads-only gegevens, aantal bestanden dat ze leest):**
`meta.landmarks` 20 (missions, story, intromontage, trailer, banter, todo, pigeon*, cinematics, mapview,
hud_panel, startscreen, ambience, safety, pedroutes, companion, ...), `neighbourhoodPoints` 15
(ownedvehicles, camerapath, shops, garages, trafficfleet, flavour, hud_panel, mapview, ...),
`horeca` 6, `bounds` 9 in `game/js` (railway, scene3d, terrain3d, heliflight, flavour, skyprops, mapview, routing,
countryedge), `hospital` 4, `policeStations` 4, `helipad` 4, `garages` 2, `pois` 1, `trafficLights` 1,
`shops` 1, `districts` 1, `careSites` 1, `fuel`/`padel` 2.

**Scripts/tests (56 JS/MJS-bestanden lezen `citymap`, 27 Python-bestanden):** in 39 ervan staat hetzelfde
idioom (`JSON.parse(citymap)` + `applyMapExtras` + `new GameMap`; 37 gebruiken `applyMapExtras`).
Dat is stap S1 (één laadhulp). Bestanden:
`ring_probe`, `junction_sim_test`, `network_drive_test`, `clearance_audit`, `overhang_audit`,
`passage_audit`, `markt_audit`, `zfight_audit`, `mesh_audit`, `museum_placement_test`, `surface_test`,
`lanes_test`, `water_test`, `greenwater_test`, `railprofile_test`, `furniture_test`, `greenery_test`,
`buildingheights_test`, `casework_test`, `muggings_test`, `streetlife_test`, `bus_route_test`,
`road_route_test`, `mode_route_test`, `train_ride_test`, `heli_sim`, `vault_sim`, `minigames_test`,
`minigames2_test`, `marktfiets_test`, `skutsje_race_sim`, `swim_escape_test`, `facilities_test`,
`viewdist_estimate`, `cine_ring_check`, `tileworld_test`, `worldbuilder_test`, `world_tiles_test`,
`perf/geocheck.js`, `perf/mapmem.mjs`, `world/drive_audit.mjs`, `world/audit_profile.mjs`,
`world/ring_widths.mjs`, plus `country_*_test/audit` en `ommelandtegels_test` (vervallen met #3, **AANNAME**).
Python: `process_osm`, `add_*` (13), `build_map`, `gen_ringroute`, `osmfetch`, `extract_palette`, `world/lanes.py`,
`world/building_attrs.py`, `world/fetch_3dbag.py`, `world/fetch_ahn.py`, `world/rdnew.py`, `world/rebase_data.py`,
`world/audit_lanes.py`.

### 1.3 Stadsbouw (de keten die `citymap.json` maakt) in `scripts/build_map.py`

`fetch_osm` > `process_osm` (575 r.) > `add_elevation` (596) > `world/profile.mjs` (630, de hoogteoplosser)
> `add_landmarks`, `add_districts`, `add_garages`, `add_horeca`, `add_traffic_lights`, `add_pois`,
`add_railways` (511) > `world/railprofile.mjs` (617) > `profile.mjs` > `railprofile.mjs` >
`world/water.mjs` (271) > `world/furniture.mjs` (180) > `world/greenery.mjs` (254) >
`world/building_attrs.py` (131) > `world/building_heights.mjs` (73) > `add_helipad` > `add_landmark_footprints` >
`world/building_clearance.mjs` (133, #77) > `add_shops` > `gen_ringroute` > `add_map_extras` (719, apart).
Samen ca. 4.900 regels Python in 20 `scripts/*.py` en 3.660 regels in 17 `scripts/world/*`
(oplossers, pack_tiles, citycover, lanes). De oplossers werken **in-place op `citymap.json`**; de provinciebouw
(`extract_province.py` 453 r. > `build_province.mjs` > `build_corridor.mjs tileBlob`) kent ze niet.

### 1.4 Stadsspecifieke runtime-modules (`game/js`, regels via `wc -l`)

| Groep | Modules | Regels | Verantwoordelijkheid |
|---|---|---|---|
| Landmarks en interieurs | `landmarks3d` 1152, `marktgebouwen` 954, `paddepoel3d` 517, `thuis3d` 502, `home3d` 369, `museum3d` 246, `museumplan` 66, `landmarkmodels` 88, `roomclock` 18 | ~3.900 | procedurele modellen voor benoemde gebouwen (matcht op `b.landmark`, `b.model`, `b.name`), GLB's in `game/models/`, museumplattegrond (`attachMuseumPlan` in `mapdata.js` r. 426/490), flat van Tammo en Tessa |
| Stadsrender en clutter | `models3d_buildings` 1440, `cityprops` 935, `streetclutter` 1163, `quaywalls` 878, `canopies3d` 83, `interiorglass` 346, `nightlights3d` 664, `parked3d` 221, `parkedcars` 513, `parkinglots(3d)` 175+98, `streetsigns` 208 | ~6.700 | gevelmeshes, per-cel straatmeubilair (`CELL` 60 m, `MARKETS` met vaste coordinaten), kademuren, lampen, geparkeerde auto's |
| Data en laders | `mapdata` 1015, `facilities` 285, `horeca` 219, `garages` 546, `shops` 2188, `passages` 447, `passagecheck` 42, `ringroute` 147, `ringcheck` 585 | ~5.500 | `GameMap`, afleiding, `meta`-lijsten, winkels, doorgangen |
| Hoogte en kunstwerken (runtime) | `elevation` 986, `roadprofile` 215, `railprofile` 169, `junctions` 281, `lanes` 34, `roadstructures3d` 687, `bridgerails` 168 | ~2.500 | stadsbreed hoogtemodel (bouwt `buildElevation(map)` op de vastgepinde set), kunstwerken, kruispuntmodel |

Niet stadsspecifiek (blijven): `pixelart3d.js` (446, door ~50 modules gedeeld: palet en `GeoBuilder`),
`scene3d.js` (3502, de detailstreamers zijn al gedeeld; wel stadsonderdelen in `init3D`,
`buildCanopies`, `buildRailDecks`, `requestShore`), `staticbatch3d`, `farlod`, `water3d`, `waterindex`,
`waterlevels`, `terrain3d`, `greenery`, `streetfurniture(3d)`, `roadsurface` (1576), `routing`,
`roadgraph` (462), `navgraph`, `tileworld`, `tilestore`, `gdt`. Een deel van hun gedrag leunt op
de vastgepinde stad (`terrain3d` leest `meta.bounds`, `elevation` is stadsbreed); dat is fase B.

### 1.5 Wat de wereldbouwer en de provinciebouw nu niet kunnen en de stad nodig heeft

Provinciebouw (`tileBlob`): secties `buildings, roads, water, green, trees, rails, nav, furniture`
(+ greenery-hooks). De stad (pack_tiles) schrijft daarbovenop `heights`, `junctions`, `canopies`,
`passages`, `raster` (AHN) en de afgeleide rijen.

| # | Ontbrekend in de provinciebouw | Stadsbron nu | Waar het heen moet |
|---|---|---|---|
| G1 | **3D BAG-hoogtes en dakvormen** (`hm`, `hmax`, `h50`, `hg`, `rk`, `eave`, `pitch`, `hsrc`): stad 95,8 % `3dbag` (47.410/49.504); provincie nu praktisch 99 % `default` (PROVINCIE-PLAN 2.28; doel uit de opdracht: 87 % `3dbag` in de provincie, **AANNAME** op die waarde) | `building_attrs.py`, `building_heights.mjs`, `data/world/3dbag.json.gz`, `fetch_3dbag.py` (391 r., `--province` bestaat als plan) | per-tegel join in de bouwer (`heightFields` bestaat in `worldbuilder.js`) |
| G2 | **Gebouwonderdelen en nestdaken** (`parts`, `lift`, `landmarkPart`, dedupe van dubbele footprints, `liftNestedRoofs`, `bridgeStructures`, `buildingsOverRails` > canopies, `mooredHouseboats`, `buildingsOnRing`) | `GameMap`-constructor in `mapdata.js` (r. 56-130 en 386-440) | afleidingsstap in de bouwer (`derive.js`), geschreven in de tegel; provincie krijgt hem ook |
| G3 | **Hoogteketen**: wegen met `z`, `st`, `ly`, `pnet`, tunnels, viaducten, taluds, kuilen, kruising spoor/weg, "één hoogtevraag per net" (`surfaceAt`) | `add_elevation.py`, `profile.mjs`, `railprofile.mjs`, `elevation.js`, `roadprofile.js`, HEIGHTS-sectie | oplossers per pack op tegelbronnen; `elevation.js` per tegel (nu `buildElevation(map)` op de vastgepinde set) |
| G4 | **AHN-terrein** (RASTER-sectie) | `fetch_ahn.py` 246 r., `data/world/ahn/` | provinciebreed (issue #78) |
| G5 | **Rijstrookmodel en kruispuntmodel** (laanpijlen, afslagvakken, `JUNCTIONS`-sectie, F1a-oplossers: `junctions.js`, `lanes.py`, `lanemodel.py`) | `lanes.py`, `lanemodel.py`, `junctionRows` in pack_tiles | per tegel in de bouwer; `buildRoad` kent `laneFields` al, maar niet de kruispuntrijen |
| G6 | **Verkeerslichten** (422 stad, uit OSM-knopen + modelkoppeling aan kruispunten) | `add_traffic_lights.py`, `meta.trafficLights`, `junctions.js`/`trafficlights.js` | FURNITURE heeft `traffic_signals`-knopen; koppeling aan het kruispuntmodel per tegel |
| G7 | **Wateren als lichamen**: peil, diepte, vaarklasse, beweegbare bruggen (34), sluizen (`meta.locks`), kademuren (`quaywalls`) | `water.mjs`, `waterlevels.js` (`annotateProvinceWater` is de provincie-variant: kind, lv, dp, nav) | één regel: dezelfde `annotate`-functie op beide; kademuren als laag uit tegelwater |
| G8 | **Spoorprofiel, perrons, overwegen, liften** | `add_railways.py`, `railprofile.mjs`, `railprofile.js` | per tegel (rails hebben `z`, `ly`, `el`) |
| G9 | **Doorgangen en afgeknipte paden** (`passageWays`, `clippedWays`, `dryCrossings`) | `passages.js`, `mapextras.passages` (210), `clipWaysInBuildings` | afleiding + PASSAGES-sectie ook voor de provincie |
| G10 | **Straatmeubilair en clutter**: gemapt (12) plus regels per tegel (zelfde hooks in stad en provincie, goed), maar de stad heeft **daarbovenop** `cityprops`/`streetclutter` per cel van 60 m | `streetfurniture.js` (479) vs `cityprops.js` + `streetclutter.js` (2.100) | clutter-regels naar tegelhook (zelfde als `furniture`), met dezelfde stijl |
| G11 | **Lantaarns, nachtverlichting** | `nightlights3d.js` 664, meubilair `street_lamp` | AANNAME: leest wegranden stadsbreed; per tegel |
| G12 | **Groen/soorten** | `greenery.mjs` + `greenery.js` (hooks gedeeld) | al gelijk; pariteit meten (soortenhistogram) |
| G13 | **POI's: winkels, horeca, garages, politie, zorg, tankstations, helipad** (`meta.*` uit `add_*.py` + caches) | `add_shops`, `add_horeca`, `add_garages`, `add_pois`, `add_police_stations`, `add_helipad`, mapextras.fuel/padel; provincie heeft `facilities.json` (9.653) buiten de tegels | POI-sectie (gereserveerd in `SECTION`, nog leeg), uit `extract_province.py` (heeft al `facilities_raw.json.gz`) |
| G14 | **Handwerk-patches**: `buildingPatches` (142), extra footprints (20), `busRoads`/`busLanes`, `roadZ` | `add_map_extras.py`, `applyMapExtras` | "handlaag" per tegel, als patchbestand dat de bouwer toepast (gebaseerd op osm-id/bag-id i.p.v. `bounds`) |
| G15 | **Landmarks, interieurs, kamers** (museum, Martinitoren, Tammo en Tessa's flat, Paddepoel, doors) | `b.landmark`/`b.model`/`b.name` op gebouwrijen; `museumplan.js`; `home.js` 1394 r. | objectlaag per tegel (zie 3.3) |
| G16 | **Plaats-/regionamen** (districten, buurtpunten) | `meta.districts`, `neighbourhoodPoints` (66) | al provinciebreed: plaatsen met districten in `index-provincie.json` (921), `regions.js`/`regiondata.js` |
| G17 | **Gebouwafstand tot de straatas** (#77, 1,5 m) | `building_clearance.mjs` na de stadsbouw | bouwerstap per tegel |
| G18 | **Overlaytegels** (`o…`-sleutels, vlag 64, `citycover.mjs` 82 r.): vullen de lege randen van de 54 stadstegels met provinciedata | `build_province.mjs` + `citycover.mjs` | vervalt zodra de stadstegels zelf uit de provinciebouw komen |

Bron-gelijkheid die al bestaat (en dus een bewezen vertrekpunt is): `scripts/worldbuilder_test.mjs`
toont dat `fromOsm` over de ruwe stadscaches dezelfde rijen geeft als `process_osm.py`; `province_test.mjs`,
`tileworld_test.mjs` en `corridor_test.mjs` bewijzen het streamingpad.

## 2. Pariteitscriteria: de stad als maat

Elke regel is een controle die een agent kan draaien. "Stad" = de huidige stad (12 schermafdrukken van S0),
"gedeeld pad" = dezelfde plek gebouwd uit OSM/3D BAG door het gedeelde pad. Drempels zijn voorstellen.

| Categorie | Criterium (moet) | Meting |
|---|---|---|
| Gebouwen: footprints | zelfde aantal binnen 0,5 % en per gebouw dezelfde `bag`-sleutel of osm-id; 0 dubbele footprints; dezelfde canopies, bruggebouwen, woonboten | `city_diff.mjs` (S2) |
| Gebouwen: hoogtes en daken | `3dbag`-aandeel >= stad (95,8 %) in het stadsgebied; mediane |dh| t.o.v. stad < 0,25 m; dakvorm (`rk`/`roof`) gelijk voor >= 99 % van de gebouwen met `rk`; `parts` en `pitch` 100 % (de 1 + 4 gevallen); `hsrc` default <= 4,2 % | idem, `buildingheights_test` |
| Landmarks | alle 29 landmark-rijen en 14 `meta.landmarks` op dezelfde plek (< 0,5 m) en zelfde model; museumkamers en Martinitoren-kamer begaanbaar | `museum_placement_test`, `markt_audit`, `landmark_*_test`, verhaaltest |
| Straatmeubilair en lantaarns | per 150 m-schijf rond de 12 plekken: aantal per soort >= 98 % van de stad, geen soort verdwenen; lantaarnaantal en -afstand binnen 2 % | `furniture_test`, `detail.js` (telt per soort) |
| Groen en soorten | bomen >= 98 % en soortenhistogram binnen 3 procentpunt; geen boom op rijbaan (`onCarriageway`) | `greenery_test` |
| Rijstroken, pijlen, kruispunten | `junction_sim_test` 17/17 op 9 seeds met echte vendor-cache; per kruispunt dezelfde besturing en dezelfde armen; markering/pijlen gelijk aantal | `junction_sim_test`, `lanes_test`, `audit_lanes.py` |
| Kades en bruggen | kademuurlengte en -hoogte binnen 1 %, alle 347 bruggen, 34 beweegbare bruggen, doorvaarthoogte gelijk; 0 zinken/vallen | `water_test`, `greenwater_test`, `swim_audit`, `network_drive_test` (waterkruisingen) |
| Water: uiterlijk | zelfde peil (`lv`), diepte (`dp`), vaarklasse (`nav`) per lichaam; zelfde shader; 0 verschil in `waterAt` op 4.000 punten | `tileworld_test`, `tilewater_test`, `province_water_audit` |
| Hoogte en spoor | `surfaceAt` verschil < 5 cm op 5.000 punten (stad), 0 doorvallen, ring_probe 0, `drive_audit` 0 fouten (bocht-schampen apart: zie 5) | `ring_probe`, `drive_audit`, `network_drive_test`, `railprofile_test`, `train_ride_test` |
| Interieurs en kamers | rooms/doorgangen identiek (museum 100 %, flat, Paddepoel), deuren per winkel/horeca/garage bereikbaar | `passage_audit`, `casework_test`, `facilities_test` |
| Colliders | `escapeBuilding`, `isOpenSpot`, `canWalkOut` gelijk op 4.000 punten; 0 nieuwe vastzitplekken (`seat_audit` blijft groen) | `tileworld_test`, `seat_audit` |
| Verkeer en AI-data | routegraaf: zelfde bereikbaarheid (500 paren), dezelfde afslagverboden; bussen op `busOnly`/`busLane`; politie spawnt overal op de graaf | `road_route_test`, `bus_route_test`, `mode_route_test`, `junction_sim_test` |
| Minimap en kaart | zelfde wegklassen, water, gebouwen, plaatsnamen op de vaste zoomniveaus; screenshotverschil per plek < 2 % gemiddelde pixelafwijking, rest handmatig door de eigenaar | placeshot/`mapview`-shots, `regions_test` |
| Beeld | de 12 plekken, dag en nacht, vergeleken door de eigenaar; verschil is "gelijk of beter" | S0-schermafdrukken |

## 3. Verificatie per stap (licht)

Geen zware meettooling en geen prestatiedrempels per stap (besluit eigenaar): prestaties worden bij elke
releasebouw al gecontroleerd. Per stap alleen:

1. **Bestaande tests en audits**: `node --check` op gewijzigde JS, `node scripts/voice_coverage.mjs --quiet`, alle
   `scripts/*_test.mjs`, en per stap de audits uit de tabel (`ring_probe`, `scripts/world/drive_audit.mjs`,
   `junction_sim_test` met een **echte kopie van `desktop/vendor-cache`** (een symlink verbergt regressies),
   `network_drive_test`, `seat_audit`, `perf/geocheck.sh`, verhaaltest). De zware Electron-set (`geocheck`, verhaaltest)
   draait eenmaal per poort in één ronde door de coordinator.
2. **Schermafdruksanity op 12 vaste plekken** (stap S0 legt de "voor"-set vast; elke zichtbare stap maakt de "na"-set;
   Claude beoordeelt op verloren detail: gevels, daken, meubilair, groen, kades, markering). Plekken (AANNAME, de
   eigenaar mag wisselen): Grote Markt, Martinitoren, Vismarkt, Forum, Hoofdstation, Museum en brug, Paddepoel,
   Euroborg, UMCG-helipad, ringviaduct, Noorderhaven (kade en brug), smalle oude straat met bocht (#77); dag en nacht.
   Gereedschap: het patroon van `scripts/perf/detail.js` (`[capture] <naam>`) of `placeshot.js`; geen metingen.
3. **Diff op data** (S2, `scripts/world/city_diff.mjs`): aantallen en afstanden per categorie uit 2, gratis in Node.

**Performance sanity check at release time:** de bestaande releasebouwcontrole (frametijd, laden, geheugen) blijft het
enige prestatiemoment; meer meten alleen als er een prestatieprobleem wordt gemeld.


## 4. Doelarchitectuur

### 4.1 Eén pijplijn

```
Geofabrik-extract (OSM, ODbL) --> extract_province.py --> pack-caches (data/cache/province)
3D BAG (CC BY) -----+                                           |
AHN (CC0) ----------+--> world/ *join*  (hoogtes, daken, terrein)
handlaag (patches, landmarks, rooms) ---+                       v
                          worldbuilder.js (fromOsm, buildRoad/Building/Water/Rail/Green/Poi)
                                     |  derive (dedupe, nestdaken, canopies, doorgangen, afstand 1,5 m)
                                     |  solve  (hoogte per net, spoorprofiel, kruispunten, rijstroken, water)
                                     |  hooks  (meubilair, groen, clutter)   objects (landmarks, kits, POI-deuren)
                                     v
                          tileBlob per tegel  -->  .gdt-packs + index  -->  TileStore/TileWorld  -->  scene3d, farlod,
                                                                                     colliders, routing, minimap, AI
```

Eén bron voor alles; `citymap.json`, `mapextras.json`, `landmarkkits.json` en de `data/*_raw.json`
(stad) vervallen als bron. Wat blijft is **data in repo die geen OSM is**: de handlaag (patches, landmarks,
kamers) als kleine bestanden onder `game/places/` (**AANNAME** naam), elk met een osm-id, bag-id of RD-coordinaat als sleutel.

### 4.2 Tegelsecties (aanvullend op PROVINCIE-PLAN 2.1)

Bestaand en in gebruik door beide: `buildings, roads, water, green, trees, rails, nav, furniture`.
Voor de provincie nieuw te vullen (type bestaat in `gdt.js`): `heights`, `junctions`, `canopies`, `passages`,
`raster` (AHN), `pois`. Nieuw: **`objects`** (zie 4.3) en een afgeleide `lights` (reeds genoemd in de plannen).
`TileWorld.fromTiles` krijgt geen "vastgepinde-set" meer nodig (fase B10).

### 4.3 Landmarks, interieurs en kits als tegelobjecten

- Een **object** is `{ id, kind, anchor: RD of osm/bag-id, yaw, params, lod, source }`; staat in elke tegel die zijn
  grenzen raakt (zoals gebouwen, met `gid`). De sleutel is de **osm-id/bag-id van het gebouw** waar het bij hoort, zodat het
  object aan de footprint hangt en niet aan een array-index.
- De **tekencode blijft**: `landmarks3d.js`, `marktgebouwen.js`, `paddepoel3d.js`, `thuis3d.js`, `museum3d.js`,
  GLB-modellen, en `landmarkkit.js`/`landmarklayer3d.js` (kits voor kerken, molens, torens, borgen). Wat
  verandert: ze worden niet meer gekozen door `b.landmark`/`b.model` op een stadsgebouw, maar door `objects` van de tegel.
  `landmarklayer3d.js` is al zo gebouwd (parameters in, geometrie per LOD uit) en is het model voor de rest.
  (`ommelandlandmarks.js` leest nu `landmarkkits.json`; **AANNAME**: de andere agent laat dit als gedeelde kitlaag staan of hernoemt hem.)
- **Interieurs** (museumkamers, Martinitoren-kamer, de flat, Paddepoel): de kamergegevens (`museumplan.js` 66 r.,
  `home.js` 1.394 r., `klimtoren.js`) worden `objects` met `rooms` als parameter; `attachMuseumPlan` verdwijnt uit de `GameMap`
  (r. 426 en 490) en wordt "objecten aanhangen bij tegel laden". `passages.js` leest kamers uit het object.
- **Colliders en doorgangen** blijven afgeleid per gebouw/object en komen met de tegel (zoals nu `passageWays`).
- **LOD:** een object levert `lod0..lod3`; L3-silhouet voor skyline (Martinitoren, kerktorens) komt uit objecten met
  `sky: true` (vervangt de handmatige lijst in `countryskyline` na #3).

### 4.4 Eén LOD-, streaming- en laadbudget

Eén budget, geen "stad" of "platteland": de **klasse van een tegel** komt uit de tegel zelf (aantal gebouwen en
hoogste punt staan al in de index: `n`, `maxH`), niet uit een locatie. Drie klassen: **dicht** (> 400 gebouwen of
`maxH` > 25 m: binnenstad, Eemshaven), **bebouwd** (dorp, 40-400), **open** (polder, < 40).

| Budget | dicht | bebouwd | open | Bron |
|---|---|---|---|---|
| Tegeldata (gedecodeerd) | <= 2 MB | <= 0,8 MB | <= 0,3 MB | PROVINCIE-PLAN 2.4b (binnenstad <= 2 MB); rest **AANNAME** |
| GPU per tegel (L0) | <= 25 MB | <= 8 MB | <= 2 MB | 2.4b |
| Decoderen (worker) | <= 3 ms | <= 3 ms | <= 2 ms | 2.4b |
| L0 bouwen (worker) | <= 60 ms | <= 25 ms | <= 10 ms | 2.4b |
| Upload hoofdthread | 1,5 / 2 / 3 ms per frame (Laag/Gem./Hoog), een tegel nooit in één frame | idem | idem | 2.4b |
| RAM tegeldata (LRU) | 150 / 250 / 400 MB; JS-heap kaartdata <= 150 MB | | | 2.4, 2.4b |
| GPU totaal | <= 600 / 900 / 1.200 MB; geen groei > 50 MB in 30 min | | | 2.4, 4.1 |
| Laadstraal L0/L1/L2/L3 | 350 m (kort 150, heel ver 600; Hoog "heelver" 900 m far) / 1,2 km / 4 km / 4-40 km | | | 2.2 |
| Vooruitladen | lopen/fiets 80 m, auto 400 m, trein 2 km, heli 600 m, vliegtuig 800 m, tegel nooit te laat | | | 2.4 |
| Eerste laad / sprong | titelscherm <= 8 / 6 / 5 s; speelbaar na sprong Hoog <= 3 s, Laag <= 6 s | | | 4.1 |

Concreet voor de dichte stad (het zwaarste):
**gebouwmeshes worden nu op de hoofdthread gebouwd met `BUILDING_BUILD_MS` 4 ms en `ROAD_BUILD_MS` 2,5 ms
(scene3d.js r. 1420-1423)**; de stadsweg- en gebouwbouw hoort in de worker (zoals `geoworker.js`/`geokernels.js` al deels doen,
7 verwijzingen naar `map.roads/buildings`) zodat een dichte provinciebouwtegel (nu soms een frame van tot ~40 ms voor
een bostegel, 2.28) en de stad hetzelfde pad gebruiken. Het gedeelde budget is een ontwerpdoel en wordt in **stap A9** ingebouwd; gemeten wordt alleen bij de releasebouw.

Winstmaatregelen die het gedeelde pad ook voor de stad moet houden: `staticbatch3d.js` (cel van 48 m, een draw
per materiaal), `farlod.js` (tegel x laag, een draw), `interiorglass.js` (gevelglas), instancing voor bomen en meubilair.

### 4.5 `game/stad.json`: de handlaag van de stad (ingecheckt, stap C3)

`game/stad.json` (3,3 MB, `"format": "stad-1"`) vervangt `citymap.json` (17,3 MB) als de ingecheckte stadsbron. Wat uit OSM komt
(water, groen, bomen en alle gebouwen die niet met de hand zijn gemaakt) staat er niet meer in: dat komt uit de OSM-tegelbouw
(`stad_laag.mjs`). `stad.json` bewaart het handwerk en de twee dingen die de stadsbouw vroeger uit de OSM-lagen van `citymap.json` las.
Het bestand heeft één sleutel per regel en één rij per regel (leesbare diffs); de volgorde van de rijen is de `gid` in de tegels en blijft staan.

| Sleutel | Inhoud | Hoe het aan tegels hangt |
|---|---|---|
| `format`, `fromOsm` | `"stad-1"`; de lagen die uit de OSM-bouw komen: `buildings, water, green, trees` (zodra `roads`/`rails` ook uit OSM komen, gaan ze erbij en uit het bestand) | `pack_tiles.mjs loadSourcesLaag` haalt `fromOsm` altijd uit OSM, `STAD_LAAG` kan er nog lagen aan toevoegen |
| `tiles` | de 54 stadstegels (`235_581`, ...) in de volgorde van de stadsbouw | de tegels die de OSM-bouw voor de stad bouwt (`osmCityLayers(keys, ...)`); de volgorde bepaalt de rijvolgorde dus de bytes |
| `cover` | de dekking van de stadskaart: een masker van 208 x 189 cellen van 40 m, run-length (`x0, y0, w, h, cell, rle`) | `citycover.mjs cityCoverFromMask`: alleen OSM-rijen met hun zwaartepunt in de dekking komen in de stad; daarbuiten dekken de overlaytegels van `build_province.mjs` |
| `roads` | 10.785 wegen met `cat`, `type`, `width`, `lanes*`, `osm`, hoogteprofiel `z`, tunnels, bruggen, beweegbare bruggen | `pack_tiles.build`: in elke tegel die de wegband raakt, plus de secties `heights`, `junctions`, `nav` |
| `rails`, `stations`, `levelCrossings`, `railRoutes`, `railLifts`, `railPlatforms` | 193 spoorstukken met profiel, 3 stations, 3 overwegen, 4 spoorroutes, 16 liften, 22 perrons | `rails` per tegel; de rest in de globale laag (`stations`, `levelCrossings`, `railRoutes`, `railLifts`) |
| `furniture` | 12 gemapt straatmeubilair (hekken); de regelmeubilair wordt per tegel gemaakt (`streetfurniture.js`) | `FURNITURE`-sectie per tegel |
| `buildings` | alleen de 30 handgebouwen (`isHandBuilding` in `stad_laag.mjs`): 29 `landmark`-rijen (Martinitoren, Martinikerk, Der Aa-kerk, Hoofdstation, Forum, Academiegebouw, Goudkantoor, Groninger Museum, Euroborg x4, Winkelcentrum Paddepoel x17) en de helikopterpleisterplaats (`helipad`); velden `landmark`, `landmarkKind`, `landmarkPart`, `parts`, `pitch`, `helipad` | een rij in elke tegel die de footprint raakt; de OSM-gebouwen die op een handgebouw liggen vervallen (`withHand`) |
| `meta` | zie hieronder | de globale laag van het pakket (`META`-sectie), niet per tegel |

**Landmarks.** Twee lagen die op *naam* aan elkaar hangen. (1) `meta.landmarks` (14 punten: `name`, `x`, `y`, `kind`, `buildingMatched`):
de lijst die missies, verhaal, HUD, kaart en intro lezen (`map.meta.landmarks`); een RD-punt, geen tegelrij. (2) Het gebouw zelf: een rij in
`buildings` met `landmark: <naam>`; de tekencode (`landmarks3d.js`, `landmarkmodels.js`, `models3d_buildings.js`, `paddepoel3d.js`) kiest op
`b.landmark`/`b.name`. De tegel waarin een landmark staat volgt uit zijn footprint; zoek hem met `tileIndexOf(x, y)` of `buildingsNear`.
Aanvullingen en correcties op OSM-gebouwen staan niet hier maar in `game/mapextras.json` (20 extra gebouwen, 142 patches op `osm`-id of
positie, doorgangen, busbanen); `applyMapExtras` legt ze na de OSM-lagen over de kaart. In het doelmodel van 4.3 (stap B7) worden de
landmark-rijen `objects` met de osm-/BAG-id als sleutel; tot dan is de naam de sleutel.

**POI's en namen** (`meta`, alle als RD-punten `x`, `y`, nooit per tegel; de globale laag draagt ze naar de runtime):

| `meta.*` | Aantal | Vorm | Lezers |
|---|---|---|---|
| `districts` | 2 | `{ name, rings }` (wijkgrenzen) | `hud_panel.js` |
| `neighbourhoodPoints` | 66 | `{ name, x, y, kind }` | 14 modules, o.a. `ownedvehicles.js`, `shops.js`, `flavour.js`, `hud_panel.js`, `mapview.js`, `banter.js` |
| `garages` | 48 | `{ name, x, y }` | `garages.js` |
| `horeca` | 470 | `{ name, x, y }` (verzonnen namen) | `horeca.js`, `pedestrians.js`, `pedroutes.js`, `cityprops.js` |
| `shops` | 54 | `{ t, x, y, wijk, street }` | `shops.js`, `facilities.js` |
| `pois` | object per soort (`health`, `money`, `weapons`, ...) | `{ x, y, kind, name }` | `pedroutes.js` |
| `trafficLights` | 422 | `{ x, y }` | `junctions.js`, `streetfurniture.js` |
| `hospital`, `careSites`, `policeStations`, `helipad` | 1, 7, 2, 1 | `{ name, x, y }` (`helipad`: `{ x, y, r, angle }`) | `emergency.js`, `respawn.js`, `spotcheck.js`, `routing.js`, `streetlife.js`, `skyprops.js` |
| `bounds`, `frame`, `rdOrigin`, `wgsBox`, `locks` | | kader van de stadskaart (RD) | `scene3d`, `terrain3d`, `heliflight`, `mapview` |

Stappen B6 (poi) en B8 (namen) halen deze lijsten uit `meta` en zetten ze als rijen op de tegel van hun punt (`placeIndex`);
tot dan is `stad.json` hun enige bron, en verandert een naam of POI daar (een rij per regel).

**Bouwen en testen.** `loadSourcesLaag()` (pack_tiles.mjs) leest `stad.json`, haalt de lagen van `fromOsm` uit de OSM-bouw
(`stad_cache.mjs` bewaart het resultaat in de tijdelijke map, met een sleutel uit de invoer en de bouwcode), legt `mapextras.json` erover
en geeft de `GameMap`. `scripts/lib/loadworld.mjs` is de ene laadhulp voor tests: `loadStadData()` (alleen de handlaag, snel),
`loadCityData()` en `loadCityWorld()` (met de OSM-lagen; zonder `data/cache/province` eindigt een test met SKIP). `scripts/stad_split_test.mjs`
bewijst dat de splitsing verliesloos is: voor elke keuze van OSM-lagen zijn de stadstegels (sha256 per tegel, de globale laag en de
tellingen) uit `[stad.json + OSM-lagen]` gelijk aan die uit `[citymap.json + dezelfde OSM-lagen]` (fixture: alle zes gekozen
combinaties; `--echt`: de echte stad, 57 tegels + globale laag, 60 vingerafdrukken gelijk). Wijzigen kan met de hand, of met
`profile.mjs --write` (wegen), `railprofile.mjs --write` (spoor) en `furniture.mjs --write` (meubilair), die terugschrijven in `stad.json`.
`node scripts/stad_opruimen.mjs` controleert dat niets meer `citymap.json`, `data/*_raw.json` of de python-keten leest en toont dan de
lijst van te verwijderen bestanden (het verwijdert zelf niets).

## 5. Stappenplan

Regels: elke stap klein, afzonderlijk testbaar, het spel werkt na elke stap, vlag per stap,
het oude pad blijft tot pariteit (2, 3) is aangetoond. Vlaggen: URL `?stadlaag=<laag>[,<laag>]` en Node `STAD_LAAG=...`
(naam **AANNAME**; mechaniek via `game/js/devflags.js`, **AANNAME** dat die geschikt is). Lagen:
`gebouwen, wegen, water, spoor, groen, meubilair, poi, objecten, namen`. Standaard uit; pas na pariteit standaard aan.
Maat: S (<= 1 agent-dag), M (2-3 dagen), L (een week of meer). Elke stap sluit met `Closes`/`Refs #90` en een
issue- en bordupdate; geen push, merge, tag of release door agents.

Algemene testset per stap ("T-basis"): `node --check` op gewijzigde JS, `node scripts/voice_coverage.mjs --quiet`,
alle `scripts/*_test.mjs` met gewone `node`, plus de stap-specifieke tests. De zware set ("T-zwaar": `ring_probe`,
`drive_audit`, `junction_sim_test` met echte vendor-cache, `network_drive_test`, `seat_audit`, `geocheck.sh`, verhaaltest,
spoor- en wateraudits) draait **eenmaal per fase in één Electron-ronde** door de coordinator
(AGENTS.md: een Electron tegelijk; geen nieuwe agents tijdens een releasebouw).

### Fase 0: voorbereiding (stad ongemoeid)

| Stap | Doel | Bestanden | Bewijs | Risico | Maat |
|---|---|---|---|---|---|
| **S0 Referentieschermafdrukken** | 12 vaste plekken, dag en nacht, vastleggen (3) | nieuw `scripts/perf/spots.js` (patroon van `detail.js`), geen spelcode | T-basis op de huidige `main`; `junction_sim_test` met echte vendor-cache | schermafdrukken op een drukke machine (herhalen) | S |
| **S1 Eén laadhulp voor tests** | de 39 kopieën van `JSON.parse(citymap)+applyMapExtras+new GameMap` vervangen door `scripts/lib/loadworld.mjs` met `WORLD_SRC=json|tiles` | `scripts/lib/loadworld.mjs`; 39 testbestanden (mechanisch) | uitvoer van elk bestand voor en na gelijk (diff van de logs) | oppervlak groot, per stap klein; laadtijd van tegel-pad in Node | S |
| **S2 Schaduwstad en diff** | de 54 stadstegels uit het PBF-extract bouwen als aparte laag (`index-stadschaduw.json`, vlag nieuw, standaard niet geladen) en `scripts/world/city_diff.mjs` (aantallen, sleutels, histogrammen, afstanden per categorie uit 2) | `scripts/world/build_province.mjs` (optie `--city-shadow`), `build_corridor.mjs` (hergebruik `tileBlob`), `scripts/world/city_diff.mjs` | diff-rapport met de lijst gaten G1-G18 en een getal per categorie; `world_tiles_test` (bit-gelijk) | extract is van 15 okt, citymap uit eerdere caches: verschillen door brondatum (dan beide op dezelfde datum vergelijken) | M |

### Fase A: de provinciebouw op stadsniveau (de hele provincie wint)

Elke A-stap werkt op de provincietegels én op de schaduwstad (S2) en wordt gemeten met de diff; het spel
zelf verandert voor de stad niet, voor de provincie wordt het beter.

| Stap | Doel | Bestanden | Bewijs | Risico | Maat |
|---|---|---|---|---|---|
| **A1 3D BAG en daken overal** (#2, G1) | `fetch_3dbag.py --province`, join in de bouwer (bag-id uit `ref:bag`, anders zwaartepunt + oppervlakte), `hm/hmax/h50/hg/rk/eave/pitch/hsrc`; rapport bij > 30 % `default` | `scripts/world/fetch_3dbag.py`, `game/js/worldbuilder.js` (`heightFields`), `build_corridor.mjs`, `building_attrs.py` | `buildingheights_test`, `worldbuilder_test`, `city_diff` (hoogtes, dakvorm), `world_tiles_test` | download 2-4 GB (tijdelijk, AANNAME; vraagt akkoord van de eigenaar per AGENTS.md "download"), CC BY-vermelding (#70) | M |
| **A2 Afleiding in de bouwer** (G2, G9, G17) | de `GameMap`-afleiding (dedupe, `liftNestedRoofs`, bruggebouwen, canopies, woonboten, `clipWaysInBuildings`, doorgangen, `dryCrossings`, afstand 1,5 m) naar een gedeelde module `game/js/derive.js` die zowel `GameMap` (oud pad) als `tileBlob` aanroept; `building_clearance.mjs` per tegel | `game/js/mapdata.js` (alleen aanroepen), nieuw `game/js/derive.js`, `scripts/world/build_corridor.mjs`, `scripts/world/building_clearance.mjs` | 0 verschil op het oude pad (`worldbuilder_test`, `tileworld_test`); op de schaduwstad: `city_diff` canopies/nestdaken gelijk; `passage_audit` | tweede bron van waarheid tijdens de overgang (beide paden hetzelfde gedrag): daarom één module | M |
| **A3 Hoogteketen per tegel** (G3, G4, G8) | `profile.mjs` en `railprofile.mjs` draaien op tegelbronnen (per pack, met net over packgrenzen via poortknopen) en schrijven HEIGHTS; AHN-raster provinciebreed (#78); `elevation.js` krijgt een `TileElevation` die per tegel opbouwt/afbreekt (nu `buildElevation(map)` op de vastgepinde set); `surfaceAt` blijft de ene vraag | `scripts/world/profile.mjs`, `railprofile.mjs`, `fetch_ahn.py`, `game/js/elevation.js` (986 r.), `roadprofile.js`, `railprofile.js`, `terrainraster.js`, `tileworld.js` | `surface_test`, `railprofile_test`, `ring_probe`, `drive_audit`, `network_drive_test`, `train_ride_test`, `clearance_audit`; `city_diff` hoogte (< 5 cm) op de schaduwstad | **grootste risico** (13 oorzaken in de ringgeschiedenis, PROVINCIE-PLAN 2.11); doorgangen over tegelranden; profielen die per pack anders uitvallen: daarom net per pack met overlap en `pnet` | L |
| **A4 Rijstroken, kruispunten, verkeerslichten** (G5, G6) | `lanes.py`/`lanemodel.py` naar JS in de bouwer (of Python in de packbouw), `junctionRows` per tegel, verkeerslichten uit `highway=traffic_signals` gekoppeld aan het kruispuntmodel | `scripts/world/lanes.py`, `lanemodel.py`, `game/js/junctions.js`, `game/js/trafficlights.js`, `build_corridor.mjs` | `lanes_test`, `junction_sim_test` (echte vendor-cache, 9 seeds), `audit_lanes.py`, `trafficlights_rain_test` | parkeerplekken en rijwegen schuiven mee (zie #77: 2,3 m brak junction_sim_test; 1,5 m houdt) | L |
| **A5 Water en kades** (G7) | één `annotate`-regel (stad `water.mjs` en provincie `annotateProvinceWater` samenvoegen), peilen, vaarklassen, beweegbare bruggen, sluizen; kademuren uit tegelwater | `scripts/world/water.mjs`, `game/js/waterlevels.js`, `quaywalls.js` (878 r.), `geokernels.js` | `water_test`, `greenwater_test`, `tilewater_test`, `province_water_audit`, `swim_audit`, `boat_edge_sim` | nu `quaywalls` rekent op stadsarray (AANNAME): per tegel herschrijven | M |
| **A6 Meubilair, clutter, lantaarns, parkeren** (G10, G11, G12) | stadsclutter (`cityprops` 935 + `streetclutter` 1.163) als tegelhook naast `furniture`/`greenery`; lantaarns per tegel; geparkeerde auto's en parkeerplaatsen uit tegel (`parkedcars`, `parkinglots`) | `game/js/streetfurniture.js`, `cityprops.js`, `streetclutter.js`, `nightlights3d.js`, `parkedcars.js`, `builderhooks.js` | `furniture_test`, `greenery_test`, `detail.js` (telling per soort), `geocheck.sh`, nachtschermafdrukken | **visueel zwaarste stap**: de stad ziet er nu vol uit door clutter; verlies zichtbaar in schermafdrukken | L |
| **A7 POI-laag en handlaag** (G13, G14) | `pois`-sectie uit `extract_province.py` (heeft `facilities_raw.json.gz` al); winkels, horeca, garages, zorg, politie, tankstations, helipad; handlaag `game/places/*` (patches op osm-/bag-id, `busRoads`, `busLanes`, `roadZ`) toegepast door de bouwer; naamlaag (echte merken naar verzonnen namen, constitution 2) | `scripts/add_*.py` (omzetten naar bouwerstap), `scripts/add_map_extras.py`, `game/js/facilities.js`, `game/places/*` | `facilities_test`, `casework_test`, `muggings_test`, `bus_route_test`; telling per soort in `city_diff` | echte merknamen in OSM (constitution 2): zonder naamlaag lekken ze in de speltekst | M |
| **A8 Spoor, perrons, overwegen** (G8) | rails met `z/ly/el`, perrons, overwegen, liften per tegel | `scripts/add_railways.py`, `railprofile.mjs`, `game/js/railway.js`, `railway3d.js` | `railprofile_test`, `train_ride_test`, `mode_route_test` | spoor over packgrenzen | M |
| **A9 Eén budget en worker-bouw** (4.4) | gedeelde klasse-uit-tegel budget; stadsweg- en gebouwbouw naar de worker; opwarming per tegeltype | `game/js/scene3d.js` (r. 1420-1423, `syncBuildings`/`syncRoads`), `geoworker.js`, `geokernels.js`, `staticbatch3d.js`, `farlod.js`, `tilestore.js` | `tileworld_test` (virtuele klok), `province_test`, schermafdruksanity | verplaatste bouw verandert de stad zichtbaar | L |

**Poort A (einde fase A):** `city_diff` op de schaduwstad voldoet aan alle regels van 2 én de provincie
voldoet aan dezelfde regels waar de data het toelaat; T-zwaar op provincietegels (A7 naar Nieuweschans,
heli, trein, rondjes lopen in Appingedam, PROVINCIE-PLAN 4.2); de eigenaar beoordeelt schermafdrukken van
drie dichte provinciegebieden naast de stad. Pas dan fase B.

### Fase B: de stad per laag op het gedeelde pad (oud pad blijft als terugval)

Per laag: vlag `?stadlaag=<laag>` leest die laag uit de **schaduwstad**; zonder vlag blijft de huidige
stadstegel (pack_tiles) de bron. Dubbel laden voorkomt `mergeIndex` ("de stad wint") door per laag te kiezen.
Per stap: T-basis + diff + schermafdruksanity met vlag aan en uit.

| Stap | Laag | Doel | Bestanden | Bewijs | Risico | Maat |
|---|---|---|---|---|---|---|
| **B1** | `water` | stadswater uit de gedeelde tegels | `tileworld.js`, `tilewatermask.js`, `waterlevels.js` | `water_test`, `greenwater_test`, `swim_audit`, `network_drive_test` (waterkruisingen) | boten/zwemmen/zinken; kademuren | M |
| **B2** | `gebouwen` | alle niet-landmark-gebouwen uit gedeelde tegels | `tileworld.js`, `mapdata.js` (geen `GameMap`-afleiding meer voor gebouwen), `models3d_buildings.js` | `city_diff`, `buildingheights_test`, `overhang_audit`, `zfight_audit`, `mesh_audit`, schermafdrukken | verlies van `parts`/`pitch`/dakstappen, z-fighting | M |
| **B3** | `wegen` | wegen, rijstroken, kruispunten, hoogten, kunstwerken | `tileworld.js`, `roadsurface.js`, `elevation.js`, `junctions.js`, `roadstructures3d.js`, `routing.js`/`roadgraph.js` | `ring_probe`, `drive_audit`, `junction_sim_test`, `network_drive_test`, `lanes_test`, `road_route_test`, verhaaltest | **hoog**: ring, viaducten, tunnels, 10 bocht-schampen (zie 6) | L |
| **B4** | `spoor` | spoorlaag uit gedeelde tegels | `railway.js`, `railway3d.js`, `corridorrail.js` | `train_ride_test`, `railprofile_test` | overwegen en liften | S |
| **B5** | `groen` + `meubilair` | bomen, soorten, clutter, lantaarns, parkeren | `greenery.js`, `streetfurniture3d.js`, `cityprops.js`, `parked3d.js`, `nightlights3d.js` | `greenery_test`, `furniture_test`, `detail.js`, nachtshots | zichtbaar detailverlies | M |
| **B6** | `poi` | winkels, horeca, garages, politie, zorg, helipad uit tegels (geen `meta.*`-lijsten meer) | `shops.js`, `horeca.js`, `garages.js`, `facilities.js`, `respawn.js`, `spotcheck.js`, `emergency.js` | `facilities_test`, `casework_test`, `muggings_test`, verhaaltest (winkels, garage, thuis) | deuren/volgorde van winkels; verhaal verwijst naar plekken | M |
| **B7** | `objecten` | landmarks en interieurs als tegelobjecten (4.3); `b.landmark`/`b.model` verdwijnt | `models3d_buildings.js`, `landmarks3d.js`, `marktgebouwen.js`, `paddepoel3d.js`, `thuis3d.js`, `museum3d.js`, `museumplan.js`, `home.js`, `landmarklayer3d.js`, `passages.js` | `museum_placement_test`, `markt_audit`, `passage_audit`, `landmark_kits_test`, verhaaltest, schermafdrukken | **hoog voor het verhaal**: kamers, Gouden Eierbal, thuis | L |
| **B8** | `namen` | `meta.landmarks/districts/neighbourhoodPoints/bounds` vervangen door de plaats- en regionamenlogica (`regions.js`, `index-provincie.json`) | de 20+15 `meta`-lezers (`missions`, `story`, `banter`, `todo`, `hud_panel`, `mapview`, ...) via één `placeIndex`-API | `regions_test`, verhaaltest, HUD-shots | veel bestanden, weinig regels per stuk | M |

**Poort B (alle lagen aan):** T-zwaar plus de 12 plekken; de eigenaar bekijkt stad en rand. Pas dan fase C.

### Fase C: opruimen

| Stap | Doel | Bestanden | Bewijs | Risico | Maat |
|---|---|---|---|---|---|
| **C1 Ontpinnen** | de 54 stadstegels niet meer vastpinnen; alleen spawn-, garage-, missieset en eigen auto gepind; de 45 hele-array-modules naar tegelqueries | `tileworld.js` (`fromTiles`), `tilestore.js`, `index.pins`, `scene3d.js`, `passages.js`, `geokernels.js`, `routing.js`, `waterindex.js`, `farlod.js`, `terrain3d.js`, ... | `tileworld_test`, `province_test`, verhaaltest, schermafdruksanity | modules die stil op een array rekenen | L |
| **C2 Overlaytegels weg** | `citycover.mjs`, `o…`-sleutels, vlag 64 | `scripts/world/citycover.mjs`, `build_province.mjs`, `tileworld.js` (`residentKey`, `ov`) | `province_test`, `edge_smoke_test` | de rand van de oude stadsdata is nu dekkend; geen gat | S |
| **C3 Oude pad weg** | `citymap.json`, `mapextras.json`, `landmarkkits.json`, `data/*_raw.json` (stad), `GameMap`-constructorafleiding, `loadMap`, `applyMapExtras`, `pack_tiles.mjs`, `build_map.py` en de 20 `add_*.py`/`process_osm.py`, de stadsrendercode zonder gebruikers; `desktop/build.mjs` (r. 63) en `web/build.mjs` (r. 29 `ESSENTIALS`) aanpassen; 27 Python- en 56 JS-bestanden bijwerken of schrappen | zie 1 | volledige T-zwaar, buildhash, webbuild <= 25 MB tot speelbaar | git-geschiedenis houdt het bestand (17 MB); geen herschrijving (constitution 8) | M |
| **C4 Documenten** | PROVINCIE-PLAN 2.5/2.6, ARCHITECTURE.md "World tiles", README, dit document naar "historisch" | docs | lezen | laag | S |

### Volgorde en vlagoverzicht

`S0, S1, S2` > `A1..A9` (A1, A2 parallel; A3 eerst starten want het is de langste; A4 na A3; A5, A6, A7, A8 parallel
vanaf S2) > poort A > `B1..B8` (volgorde B1, B2, B4, B5, B6, B3, B7, B8; B3 en B7 zijn de risicovolste en dus laat) >
poort B > `C1..C4`. Na elke stap blijft het spel werken: zonder `?stadlaag` is er niets veranderd.

## 6. Risico's en open besluiten voor de eigenaar (max 8)

1. **Landmarks als tegelobjecten, hoe gekoppeld?** A) sleutel = osm-id/bag-id van het gebouw, tekencode blijft procedureel/GLB
   (aanbevolen); B) sleutel = RD-coordinaat. A volgt de footprint als OSM verschuift; B is robuuster tegen OSM-wijzigingen. Ja/nee op A?
2. **Interieurs en kamers** (museum, Martinitoren-kamer, de flat, Paddepoel). A) kamergegevens blijven handwerk in `game/places/*`, als object-parameters op de tegel
   (aanbevolen: er is geen OSM-bron); B) opnieuw generatief. En **winkels, deuren, horeca**: A) POI's uit OSM met een naamlaag die echte merken
   door verzonnen namen vervangt (constitution 2) plus handmatige uitzonderingen; B) de huidige lijst van 54 winkels en 470 horeca bevriezen als handlaag. Voorkeur: A voor alles buiten de stad, B-plus-A voor de stad (geen verhaalbreuk).
3. **#77, afstand tot de straatas en de 10 bocht-schampen.** A) de 1,5 m-regel als bouwerstap voor de hele provincie (aanbevolen; 2,3 m brak `junction_sim_test`
   met een geparkeerde bestelwagen op 728, -2441); B) alleen in de stad houden. En de ~10 zijdelingse schampen van `drive_audit` (auto 25-40 graden gedraaid op een scherpe verbinding;
   nu apart geteld, "niet meegeteld"): A) die classificatie behouden als geaccepteerde uitzondering met een vaste lijst, B) de padgeometrie op scherpe verbindingen verzachten zodat ze echt weg zijn. **AANNAME** dat het aantal 10 klopt (opdracht; niet opnieuw gedraaid).
4. **Ontpinnen of de stad blijven vastpinnen?** A) C1 volledig (stad is gewoon streaming, alleen spawn/missie/eigen auto gepind; meer werk, grootste winst in geheugen en consistentie); B) 54 stadstegels blijven vastgepind
   als "vaste set" (veel minder werk, geheugen gelijk). Aanbevolen: A, maar als laatste stap en alleen als de audits en schermafdrukken groen blijven.
5. **Hoe uitrollen?** A) elke laag een eigen pre-release (veilig, traag, veel keer testen door de eigenaar); B) alles achter `?stadlaag` tot poort B en dan in één release. Aanbevolen: B met een eerste pre-release na poort A (provincie wint al).
6. **Verificatie licht.** Akkoord dat per stap alleen bestaande audits plus 12 schermafdrukken gelden (geen prestatiemeting; die zit in de releasebouw)? En **mag fase A de provincie wat meer GPU/geheugen kosten** zolang de stad er niet slechter uitziet of voelt?
7. **Downloads en omvang.** 3D BAG voor de provincie (~2-4 GB tijdelijk, AANNAME), AHN provinciebreed, eindgrootte richting ~1 GB (besluit 3 in PROVINCIE-PLAN): akkoord voor A1/A3, ja/nee? Zonder 3D BAG blijft de provincie op "default" en haalt de stadskwaliteit niet (87 % `3dbag` als doel, AANNAME).
8. **Wanneer het oude stadspad verwijderen (C3)?** A) pas een release nadat poort B is gehaald en de eigenaar de stad akkoord heeft bevonden (aanbevolen); B) direct na poort B. De geschiedenis wordt niet herschreven (constitution 8).

Overige risico's (geen besluit nodig): (a) bronverschil tussen de stadscaches en het Geofabrik-extract van 15 oktober (verschillen die geen migratiefout zijn: eerst op dezelfde datum vergelijken in S2);
(b) `junction_sim_test` is gevoelig voor parkeerplekken en wachtrijen (SEED uit de omgeving, zie #77); altijd met een **echte kopie van `desktop/vendor-cache`** draaien, niet met een symlink;
(c) meting op een drukke machine is onbruikbaar (PERF-PROFIEL kanttekening);
(d) `desktop/build.mjs` hasht `citymap.json` en `js/mapdata.js` voor de wereldcache: bij elke stap de hashinvoer meenemen, anders gebruikt de build een oude wereld;
(e) `game/world/` bestaat niet in git en niet in deze werkboom: geen tegel in deze run gedraaid of gemeten (alles hier is uit code en documenten gelezen).

## 7. Voorgestelde werkpakketten (4-6 agents)

| WP | Inhoud | Stappen | Hangt af van | Parallel met |
|---|---|---|---|---|
| **WP1 Referentie, testinfra, schaduwstad** | schermafdrukken en de diff-tool | S0, S1, S2 | niets | WP2 en WP3 kunnen starten met leeswerk |
| **WP2 Gebouwen en landmarks** | 3D BAG overal, afleiding, objectlaag, interieurs | A1, A2, B2, B7 | WP1 (diff voor B) | WP3, WP4 |
| **WP3 Hoogte, wegen, rijstroken, spoor** | de zware kern: ring, viaducten, kruispunten, verkeerslichten | A3, A4, A8, B3, B4 | WP1 | WP2, WP4 (andere bestanden; botsing alleen in `tileworld.js` en `scene3d.js`: klein houden en vroeg mergen) |
| **WP4 Water, groen, meubilair, POI en namen** | water, kades, clutter, lantaarns, POI-laag, handlaag, plaatsnamen | A5, A6, A7, B1, B5, B6, B8 | WP1; B6 na WP2 (deurposities) | WP2, WP3 |
| **WP5 Budget, streaming, LOD** | een budget, worker-bouw | A9 | A1-A8 | loopt mee, merget na WP2-4 |
| **WP6 Ontpinnen en opruimen** | ontpinnen, overlays weg, oude pad weg, docs | C1-C4 | poort B | niets (serieel; geen nieuwe agents tijdens releasebouw) |

Coordinatie: één Electron-instantie tegelijk; T-zwaar en de verhaaltest alleen in één ronde per poort
door de coordinator; agents werken in eigen worktree en branch, kleine commits, `Refs #90`; niets openbaar zonder akkoord.
**Parallel kan:** WP2, WP3, WP4 (na S2). **Niet parallel:** WP1 voor de rest voor zover meetwerk; WP6 na alles; elke poort is een serieel
beslismoment van de coordinator en de eigenaar.

## 8. Niet nagegaan (AANNAME)

Geen tegel, test, audit of Electron-run gedraaid (`game/world/` ontbreekt in de werkboom); #3 als klaar aangenomen; de 87 % 3D BAG en de "10 bocht-schampen" komen uit de opdracht; de 45 hele-array-modules komt uit een grep en kan modules missen; `devflags.js` en de vlagnamen zijn een voorstel; klassegrenzen in 4.4 zijn voorstellen; de 12 plekken zijn nog niet gekozen.

## Besluiten van de eigenaar (2026-10-17)

De eigenaar liet alle acht open besluiten aan Claude ("doe wat je het beste lijkt"). Genomen op basis van het doel: de provincie op stadsniveau, de stad gaat er niet op achteruit, geen verhaalbreuk.

1. **Landmarks:** sleutel = OSM-/BAG-id van het gebouw (A); tekencode blijft procedureel of GLB. Valt terug op RD-coördinaat waar geen id bestaat.
2. **Interieurs, kamers, winkels:** kamergegevens blijven handwerk in `game/places/*` als objectparameters op de tegel. Buiten de stad: POI's uit OSM met een naamlaag die echte merken door verzonnen namen vervangt. In de stad: de huidige lijst (54 winkels, 470 horeca) als handlaag bevriezen, aangevuld met de naamlaag (B-plus-A, geen verhaalbreuk).
3. **#77:** de 1,5 m-regel als bouwstap voor de hele provincie. De zijdelingse schampen (bochten) blijven een apart getelde, geaccepteerde uitzondering met een vaste lijst; geen padgeometrie aanpassen tenzij een speler het merkt.
4. **Ontpinnen:** de stad wordt gewoon streaming (alleen spawn, missie en eigen auto gepind), maar als laatste stap en alleen als audits en schermafdrukken groen blijven.
5. **Uitrol:** alles achter `?stadlaag` tot poort B en dan één release; een eerste pre-release na poort A (de provincie wint al).
6. **Verificatie:** licht (bestaande audits en ~12 schermafdrukken, geen prestatiemeting per stap; prestaties bij de releasebouw). Fase A mag de provincie meer GPU en geheugen kosten, zolang de stad er niet slechter uitziet of voelt.
7. **Downloads:** 3D BAG voor de provincie is gedaan (0,9 GB gestreamd, 6,8 MB resultaat). AHN provinciebreed akkoord (per tegel gestreamd, alleen hoogtes bewaren, ruwe data direct wissen; schijf is krap). Eindgrootte richting 1 GB is toegestaan.
8. **Oude stadspad (C3):** pas verwijderen in een release nadat poort B is gehaald en de eigenaar de stad akkoord heeft bevonden. De geschiedenis wordt niet herschreven.

## Stand fase 3 (stadsprofiel, query-pariteit)

`scripts/city_parity_test.mjs` (hulp: `scripts/lib/cityparity.mjs`) bouwt twee TileWorlds: A = de stad uit `citymap.json` (vast in het geheugen), B = de 17 kerntegels uit de OSM-bouw met `buildProvince({ profile })`, gestreamd zoals de provincie (gids >= 20.000.000, geen vaste set). Daarna dezelfde vragen aan allebei op een raster van 40 m: waterAt-soort/-peil, gebouw ja/nee, `nearestRoadPoint`, `groundHeightAt`.

Eerste meting (raster 25 m): gebouw ja/nee 98,1 %, weg binnen 8 m 97,3 %, hoogte binnen 0,5 m 99,6 %, water: beide nat 1520, alleen stad 2, alleen OSM 70; soort gelijk 90,1 %, peil 100 %.

Stadsprofiel water (`waterlevels.js annotateCityWater`, aangezet door `profile` in `build_province.mjs`): de stadskaart classificeert op kanaalbreedte uit het afstandsveld van het hele lichaam en kent één boezem; de provincie per veelhoek (een in stukken gemapt kanaal werd `diep`/`vijver`) en splitst bij sluizen. Het profiel kiest als boezem het lichaam met de meeste oppervlakte in de stadstegels (niet het grootste van het pak: dat is een meer), en laat sluiskamers `lock` houden zonder het lichaam te splitsen.

Waarom de tellingen van `city_diff` (water +29 %, bomen +26 %) geen maat zijn: de stad bewaart een veelhoek heel in één tegel, de provincie knipt hem per tegel (meer, kleinere rijen, minder oppervlak per tegel); bomen: 72 % van de stadsbomen heeft binnen 3 m een OSM-boom, de rest is brondatum. Vergelijk daarom op vragen, niet op rijen.

Nog niet gedaan: de runtime leest `citymap.json` nog (main.js, facilities.js, roadsurface.js-worker, railway.js, mapdata.js); `pack_tiles.mjs` bouwt de stadstegels in productie nog uit citymap.json; de vaste set van `tileworld.js fromTiles` eist dichte gids, dus de OSM-stad kan er pas in als de stad ook gestreamd wordt. Daarom kan #76 niets verwijderen.

### Lezers van citymap.json in de runtime (18 oktober, grep op `game/js`)

In een build met tegels leest de runtime `citymap.json` niet meer: `main.js` neemt `tiles.world` (alleen `?legacymap` of een dev-server zonder tegels valt terug op `loadMap`), `tileworld.js loadMapAuto` (ook voor de `roadInit`-worker in `geokernels.js`) probeert eerst de tegels, en `loadFacilities`/`loadShopPlaces` gebruiken de naam alleen als basispad voor `facilities.json` en `shopplaces.json`. Wat `citymap.json` nog echt nodig heeft: de productiebouw van de stadstegels (`scripts/world/pack_tiles.mjs`), de bouwhash (`desktop/build.mjs`), `web/build.mjs ESSENTIALS`, de terugvalpaden hierboven en ~39 scripts. Een runtimemodule omzetten is dus niet meer het knelpunt: dat is de stad uit de tegelbouw halen (OSM-bouw met stadsprofiel, gestreamd in plaats van de vaste set), wat een provincie-extract en een stagebouw vraagt. Niet gedaan in deze sessie (geen stage, geen Electron).

## Stand B3/B4: wegen en spoor uit de OSM-bouw (`STAD_LAAG=roads,rails`, 20 oktober)

`STAD_LAAG=roads,rails node scripts/world/pack_tiles.mjs --out <map>` maakt stadstegels met OSM-wegen en -spoor (en alle lagen samen: `STAD_LAAG=water,green,trees,buildings,roads,rails`). `wegen` en `spoor` gelden als alias. De stad is niet in tegels geknipt maar als hele wegen: `buildProvince({ collect })` geeft de wegen van elk pack ná de afleiding (`derive_tiles`) en het koppelen van de verkeerslichten, `scripts/world/stad_wegen.mjs` doet daarna wat `build_map.py` deed:

| Stap | Was | Nu |
|---|---|---|
| wegen knippen op de dekking, stadssnelheid (geen dorpssnelheid), dubbele punten en dubbele bruggen weg | `process_osm.py` | `stad_wegen.mjs cutToCover` (de overlaytegels dekken de rest) |
| plateaus en hellingen van de ring en wat ze kruist | `add_elevation.py` | `ring_elevation.mjs ringHeights` (zelfde uitkomst als het Python-script op dezelfde OSM-wegen: 343 van 423 ringwegen identiek, de rest binnen 0,2 m; rondingsverschillen in de punten) |
| de hoogteoplosser | `profile.mjs --write` (3 rondes, 2 keer) | idem, in `profileCity`; busbanen en beschermde wegen uit `mapextras` gaan mee |
| sporen, stations, overwegen, routes, liften, paden afknippen bij het spoor | `add_railways.py` | `stad_spoor.mjs cityRail` |
| spoorprofiel | `railprofile.mjs --write` | idem (tags en perrons uit de OSM-elementen van de packs) |
| verkeerslichten (`meta.trafficLights`) | `add_traffic_lights.py` | de gekoppelde lichten uit `junction_tiles.mjs` (`snapSignals`) |
| droge kruisingen | `GameMap` | ook in de laag met 0,1 m speling (de OSM-punten liggen enkele cm anders) |
| `busRoads`, `busLanes`, `roadZ` | op coördinaat | de punten gaan eerst naar het dichtstbijzijnde OSM-hoekpunt (`snapExtras`); zonder dat werden 794 van 1.540 punten niet gevonden en kregen straten een extra busweg |

`junctionRows`, `heights` (pnet, st, ly) en `nav` komen daarna vanzelf uit `pack_tiles.build()`. De ringroute (`ringroute.js`) is niet opnieuw gemaakt: 99,5 % van de punten ligt binnen 1,5 m van een ringweg van de nieuwe stad.

Meten: `node scripts/world/city_roads_diff.mjs [--lagen roads,rails]` (oud tegenover nieuw, JSON met `--json`), `scripts/stadlaag_wegen_test.mjs` (drempels), en `node --import ./scripts/lib/stadlaag_preload.mjs <test of audit>` met `STAD_LAAG` laat elk bestaand testbestand de nieuwe stad zien (de voorlader legt `citymap.json` en `mapextras.json` voor `fs.readFileSync` om; let op: een script dat de bouwketen zelf importeert, zoals `bridge_audit.mjs` of `profile.mjs`, draait zijn eigen hoofdprogramma dan vóór de omlegging). `STAD_LAAG_CACHE=<bestand>` bewaart de OSM-bouw (4 minuten) voor audits; wis het bestand na een codewijziging. `GDE_PROVINCE_SRC` wijst naar `data/cache/province` buiten de werkboom.

### Pariteit (stad 18 oktober tegenover extract 15 oktober, binnen de dekking van de stad)

| Maat | Uitkomst |
|---|---|
| wegen per klasse (aantal / km) oud > nieuw | major 1.311 / 110 > 1.306 / 112; normal 2.666 / 277 > 2.912 / 300; minor 2.056 / 130 > 2.314 / 152; voet 3.684 / 202 > 4.055 / 231; fiets 1.251 / 101 > 1.390 / 112 (het nieuwe extract kent meer wegen; 10 % van de nieuwe wegen ligt waar de oude kaart niets had) |
| geometrie: oude wegen binnen 1 m van een nieuwe weg | 99,8 % (auto 99,8, voet 99,6, fiets 99,9) |
| hoogte langs de wegen met profiel (3.609 monsters) binnen 0,25 / 0,5 / 1 m | 88,8 / 93,8 / 97,3 %; alle wegen 98,9 / 99,3 / 99,7 %; ring 92,1 / 95,4 / 97,7 %; raster van 25 m (`groundHeightAt`) 99,7 / 99,8 / 99,9 % |
| kunstwerken per stuk (op OSM-id) | bruggen 198 van 204, tunnels 59 van 60, viaducten 43 van 43, beweegbaar 19 van 19, taluds 7 van 7, kuilen 2 van 2 |
| rijstroken (5.725 paren) | `lanes` 100 %, vooruit 99,8, terug 99,9, breedte binnen 0,5 m 99,0, eenrichting 100 % |
| kruispunten (`junctionModel`) | 4.178 oud, 4.574 nieuw; 4.169 gekoppeld; besturing gelijk 99,2 %, armen 99,9 %, regels 99,0 %; lichten 422 oud (alle terug binnen 8 m), 490 nieuw |
| spoor | 34,6 > 36,7 km; 4 routes (lengte binnen 4 m); 3 stations; overwegen 3 van 3 (+1); liften 16 van 16 (+3); spoorhoogte binnen 0,5 m 93,4 % |
| handwerk | busOnly 206 / 206, buslanen 103 > 107 |

Audits oud tegenover nieuw (alle lagen aan): `drive_audit` 0 > 2 van 7.650 ritten (Bekemaheerd haarspeld, N46 afrit bij 2537,-1812), `junction_sim_test` 17/17 > 17/17, `network_drive_test` 2/2 > 1/2 (dezelfde afrit), `ring_probe` 0 > 1 keerwand (afrit naast het viaduct bij -1304,987), `bridge_audit_test` 18/18 > 16/18 (dubbele bruggen 4 tegenover 1, z-fight-kandidaten 12 tegenover 8, bij 447 bruggen tegenover 347), `surface_blend_test` 13/13 > 12/13 (nieuwe straat Atensheerd), en `lanes_test`, `road_route_test`, `bus_route_test`, `mode_route_test`, `train_ride_test`, `railprofile_test`, `surface_test`, `seat_audit`, `net_pairing_test`, `ring_hoop_test`, `lanetaper_test` onveranderd groen.

Waar het nu anders is dan de oude stad, en waarom (bron, niet de bouw): het extract (15 oktober) is nieuwer dan de oude cache; ringbruggen zijn daarin soms `bridge:movable` (de laag laat ringwegen niet openen); de Beneluxweg onder de Kardingerweg (ongeveer 1950,-1935) ligt in de oude kaart 5,6 m verdiept (zonder tunnel- of laagtag in de rij; waarschijnlijk week de ring voor het korte viaduct van de Kardingerweg), de nieuwe bouw laat het viaduct (5,0 tot 5,7 m) boven de vlakke ring staan; het Hoofdstation ligt 50 m zuidelijker (nu bij de perrons); de oude namen met `Ã«` zijn goed; Winschoten rijdt over het spoor van Zwolle (de aftakking Wunderline bestond in de oude cache niet; een eindpunt daar liet de trein rechtdoor het niets in rijden). De drempels van `bridge_audit_test` en `junction_sim_test` zijn op de oude kaart afgesteld; zie het verslag voor de losse gevallen.

### Stadswater: vaarklasse 4 uit de OSM-bouw (`annotateCityWater`, 20 oktober)

De oude stad had het binnenstadswater als enkele grote polygonen (de Diepenring is één van 124.000 m2), de OSM-bouw heeft per pack dezelfde way en lijnen met een geraden breedte van 14 m. `annotateCityWater` (`game/js/waterlevels.js`) deed drie dingen anders dan de oude stad, met als gevolg dat de Diepenring, de havens en de kanalen 'diep' (klasse 3) werden: dezelfde polygoon uit meer packs lag meermaals over zichzelf (de laatste kopie hield de breedste cellen), een lint van een kanaallijn nam een kanaalpolygoon zijn breedste cellen af, en de armen van de Diepenring (Turfsingel, Schuitendiep, Spilsluizen) waren losse linten. Nu telt elke polygoon (op vorm en naam) één keer en krijgt elke kopie dezelfde klasse en hetzelfde lichaam, de breedte van een polygoon is het maximum over al zijn cellen, en een diep- of vaartlint dat voor 90 % in kanaalpolygonen ligt, hoort erbij (`laidOverCanal`). Oud tegenover nieuw (polygonen op 8 m bemonsterd): 100 % van de oude klasse-4-polygonen is weer klasse 4. Meten: `scripts/citywater_test.mjs`, `scripts/vaarnet_province_test.mjs`.

### Tweede ronde (20 oktober, middag): afwijkingen van de eerste ronde hersteld

| Punt | Oorzaak | Herstel | Oud > nieuw |
|---|---|---|---|
| `bridge_audit_test` dubbele bruggen en z-fight | `markDryRoads` stempelde 46 opritten op de wal van grachtbruggen (water tot de brugknoop) tot droog dek naast het echte dek | water binnen 3 m van een echt brugeinde telt niet mee in de data (`stad_wegen.mjs`); de GameMap legt bij het laden zelf het droge dek met de exacte test, zoals de oude stad (parity 198/204 bruggen blijft) | dubbel 4 > 1, z-fight 12 > 6 (plafond 1 en 8) |
| `drive_audit` N46-afrit (2537,-1812) en `network_drive_test` | twee ondergrenzen ontmoetten elkaar op de afrit: een dal van 9 cm met een kink van 4,9 % bij de aansluiting; auto's sprongen op 53 km/u | `ring_elevation.mjs`: een dal van hooguit 4 punten dat geen grens vasthoudt wordt opgevuld tot de lagere rand | 2 > 1 mislukte ritten van 7.650; network_drive 2/2 |
| `drive_audit` Bekemaheerd | haarspeld van 127 graden van een woonstraat; de rit begint 3 m voor de punt en de auto gaat 6 m uit de bocht | niet gewijzigd: de oude kaart heeft dezelfde geometrie en mislukt dezelfde rit als het pad 1 m langer is (reach 26 in plaats van 25 m); de hoek deelt zijn knoop met een tweede weg, afronden breekt die aansluiting | blijft 1 van 7.650 |
| `drive_audit` Rijstebrijgang (kwam mee uit main) | de breedte van 3,6 m en de drie huizen op 1,9 m uit #284 stonden alleen in `citymap.json` | `mapextras.json`: `roadPatches` (nieuw, op OSM-id) en drie `buildingPatches` met de punten uit de oude kaart | 0 mislukt |
| `ring_probe` keerwand -1304,987 | de vangrail van een afrit die onder de rand van het viaduct Laan 1940-1945 doorloopt (dek 6,00, rail op 4,05) blokkeerde verkeer tot 2 m erboven: 1,95 tegen 2,0 m | `elevation.js`: een rail onder een hoger dek (`over`) blokkeert alleen tot 0,6 m onder dat dek | 1 > 0 keerwanden |
| `surface_blend_test` Atensheerd | een rode weg met een rode buur van een andere klasse verborg de grijze buur op dezelfde knoop: geen menging | `surfaceblend.js`: een buur met dezelfde kleur telt niet mee bij de keuze van de buur met de hoogste rang | 12/13 > 13/13 |
| Beneluxweg bij de Kardingerweg | oud: ring 5,6 m verdiept zonder tunnel-, kuil- of laagtag in beide OSM-extracten (de oude keten liet de ring wijken voor de vlakke fietsbrug en het viaduct tegelijk, 11,2 m tussen viaduct en ring); nieuw: ring vlak onder een viaduct van 5,6 m, de fietsbrug 292426623 bleef op straatniveau over de ring | `ring_elevation.mjs`: een voet- of fietspad op een brug over een ringweg stijgt mee (ring blijft liggen waar OSM hem legt); 32 fiets- en voetwegen krijgen een brugprofiel (hoogte tot 6,1 m, aanloop 5 %) | ring vlak, beide bruggen 5,6 m |
| `route_bridge_test` Hoofdstation > Remonstrantse Kerk | de OSM-knoop van het station staat in het extract van 15 oktober 50 m zuidelijker (bij de perrons); de wandelroute begon dus anders | `anchorStations` zet het station op het stationslandmark van het handwerk (treinroutes houden de knoop); lopen 619 m (1,69x), fietsen 704 m (1,92x): het fietsnet bevat nu het voetgangersgebied voor het station, de route loopt om het gebouw (de oude begon 31 m verder dwars door het gebouw); limiet fietsen 2,0 (via Herebrug 867 m lopend, 1005 m fietsend) | 1,73 > 1,69 lopen, 1,73 > 1,92 fietsen (limiet 2,0) |
| `road_seams_test` widthJump en gap | `chain_duals` van het oude pad (breedte van een eenrichtingsweg in stukken) miste in de OSM-bouw; wegeinden naast een andere weg waren niet aan elkaar geknoopt | `chainDuals` en `closeGaps` in `stad_wegen.mjs` (verlenging hooguit 60 graden van de richting van het einde: een rijbaan naast zijn tegenrichting wordt geen haarspeld) | widthJump 10 > 7, gap 30 > 17 (oud 22); laneJump blijft 231 tegen plafond 230 |

De laneJump-stand (231 tegen 230) komt uit de valse droge dekken van de eerste ronde: Emmabrug en Griffeweg liggen nu op hetzelfde niveau als hun buur en hebben met die buur echt een ander aantal rijstroken in OSM (3 tegen 2, 1 tegen 2); de Herebrug viel weg. Meten: `node scripts/world/profile.mjs` (audit van de hoogtes) en `scripts/road_seams_test.mjs`.
