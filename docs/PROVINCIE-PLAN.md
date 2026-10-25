# De hele provincie spelen: ontwerp en besluiten

*Ontwerpdocument, oktober 2026 (ingekort op 0.34). De eigenaar vroeg: "Ik wil de
hele provincie kunnen spelen." Dit document houdt de techniek, de besluiten, de
metingen en de bekende beperkingen vast. Openstaand werk staat uitsluitend als
GitHub-issue (o.a. #1 water per tegel, #2 3D BAG, #3 oude Ommeland-lagen
vervangen, #4 prestatiemeting, #5 zichtcontrole, #78 echte straathoogtes, #14
machinist, #80 bussen, #19 weer, #57 webversie). Verhaal, missies en activiteiten: [PROVINCIE-VERHAAL.md](PROVINCIE-VERHAAL.md). De sectienummers
blijven gelijk, omdat code en ARCHITECTURE.md ernaar verwijzen.*

## 0. Het kernprincipe: één wereld, één pijplijn

Het spel had drie lagen: de stad (`citymap.json`, volle detail), het echte
Ommeland (~12 km, `ommeland.json`/`.bin`, dozen en grond-shader) en procedurele
polders, elk met eigen code voor tekenen, botsen, verkeer en routes
([OMMELAND-PARITEIT.md](archief/2026-10/OMMELAND-PARITEIT.md), historisch).

**Besluit van de eigenaar:** die splitsing verdwijnt. Elke tegel (binnenstad,
dorp, polder, Eemshaven, Wadden) komt van **dezelfde bouwer** op **dezelfde
kwaliteit**; alleen het detailniveau op afstand (LOD) verschilt.

1. **Geen `inCity`, geen stadsrand.** Code vraagt "wat voor grond is dit?"
   (landuse, wegklasse, bebouwd), uit de tegel.
2. **Eén gegevensformaat** (`.gdt`). `citymap.json`, `mapextras.json`,
   `ommeland.json` en `ommeland.bin` verdwijnen zodra tegels het enige pad zijn (#3, #76).
3. **Handwerk wordt een laag (overlay) per tegel**, geen zone: landmarks,
   doorgangen, ringhoogtes, kades, Grote Markt, UMCG mogen overal staan.
4. **Procedureel alleen waar de data leeg is** (akkers, sloten, erven, uit
   landuse en kavels, vaste seed per tegel). Buiten de grens een simpele rand.
5. **Elke controle draait per tegel** (spotcheck, passagecheck, ringcheck,
   routetests, geocheck).

### 0.1 Laag-poly maar herkenbaar

**Eis van de eigenaar:** de stijl blijft laag-poly, maar elke plek moet heel
herkenbaar zijn; het detailbudget gaat naar herkenbaarheid, niet naar polygonen.
Prioriteit: (1) footprints en hoogtes kloppen: echte veelhoeken (OSM,
BAG-gecontroleerd), hoogtes en dakvormen uit 3D BAG (`h_dak_max`, `h_dak_50p`,
`h_maaiveld`, daktype), terugval OSM `height` > `building:levels` × type >
`roof:shape` > type-default, elk gebouw met een bronvlag (`3dbag`, `osm_height`,
`osm_levels`, `default`; een tegel met > 30 % `default` in bebouwd gebied komt in
het rapport); (2) daken (zadel, schild, plat, mansarde, shed, kas-zaagtand);
(3) kleur en materiaal per type en bouwjaar (OSM-kleurtags winnen); (4)
herkenningspunten (3b) altijd in L0-L3; (5) wegen, kruispunten en rotondes
zoals ze liggen (2.12, 2.13); (6) meubilair en bomen op hun plek (2.14, 2.15);
(7) water en bruggen met echte peilen en doorvaarthoogtes (2.11); (8) skyline op
echte hoogte.

**Grootte:** de grens van ≤ 230 MB is **geen harde grens meer** (besluit
eigenaar): getrouwheid van de tegel gaat voor grootte, totaal mag richting
~1 GB, met verstandige compressie. De eerste keer laden blijft klein (index,
globale lagen, tegels rond het spawnpunt); de webversie blijft ≤ 25 MB tot
speelbaar. Tegeldata `buildings`: `h_roof_max`, `h_roof_50p`, `h_ground` (cm),
`roof_type`, `roof_dir`, `levels`, `year`, `colour`, `roof_colour`, `material`,
`src`, `bag_id`.

## 1. Omvang en metingen

### 1.1 Het gebied

Provincie ~2.960 km² (~2.330 km² land); omhullende rechthoek ~71 × ~79 km;
~5.600 tegels van 1 km in de rechthoek, ~3.000 met land of binnenwater (zee is
alleen een vlag in de index). Originele stad 7,1 × 6,3 km, echt Ommeland bbox
24,5 × 23,8 km. Binnen: Hogeland met wierdedorpen, Eemshaven, Delfzijl en de
Eemsdelta, Lauwersmeer (Groningse kant), Oldambt, Veenkoloniën, Westerwolde,
Westerkwartier, Wadkust. Rottumeroog/-plaat zijn Gronings maar onbewoond
natuurgebied; **Schiermonnikoog is Fries** (de veerboot vanuit Lauwersoog vaart
er wel heen).

### 1.2 OSM-tellingen (Overpass, 15 okt 2026)

Provincie (`ISO3166-2=NL-GR`) tegenover wat het spel had: gebouwen 431.604
(stad 49.504 polygonen + Ommeland 118.255 dozen), autowegen 31.993 (~2×),
alle `highway`-ways 101.940, water 20.580 (~20×), spoor 1.093 ways, stations
~37, landuse 94.820, natuur 3.222, losse bomen 9.939, voorzieningen 15.813,
plaatsen 592. De drukste tegel blijft de binnenstad (~3.000-4.000
gebouwen/km²); de provincie is *breed*, niet *dicht* (~125 gebouwen/km² buiten
stad en Ommeland).

### 1.3-1.4 Grootte, geheugen, laadtijd

Ontwerpschatting: ~600 MB Overpass-JSON > ~65 MB gepakt binair > ~40-45 MB
gecomprimeerd; gemeten in 2.28: ~53 MB. De stad als `GameMap` kost ~64 MB heap
(worker 33 MB); de provincie in dat model zou 400-600 MB per kopie kosten, dus
**streaming is een voorwaarde**: met L0/L1 tot ~1,5 km en L2 tot ~4 km zit er
nooit meer dan ~10-15 km² vol detail in het geheugen. Laaddoel: titelscherm ≤ 6 s.

### 1.5 Schaal, projectie en precisie

Het oude frame was een equirectangulaire projectie (origin 53.2195 N / 6.565 O,
`mPerDegLat` 110574, `mPerDegLon` 66652,97): noord-zuid 0,64 % te klein, oost-west
0,23 % te klein en wegdrijvend (fout in afstand tot de origin: 32 m op 5 km,
97 m op 15 km, 260 m op 40 km; RD New: 0,2 / 0,7 / 2,9 m).

**Besluit (eigenaar): de wereldbouwer gebruikt RD New (EPSG:28992).** Ware
meters (schaalfout ~30-70 ppm), hetzelfde stelsel als PDOK, AHN, BAG, BGT en
3D BAG. Spelframe: `x = RD_x − 233.670`, `y = −(RD_y − 582.075)` (y blijft
zuid; origin = het RD-punt van de oude origin op de meter).

- **Draaiing:** RD-noord wijkt rond Stad 0,94° af van het ware noorden
  (meridiaanconvergentie): de zon, het kompas en `daynight.js` rekenen met het
  ware noorden via `GRID_CONVERGENCE` (over de provincie ~0,6° bij Grijpskerk
  tot ~1,5° bij Nieuweschans; `rdnew.js` `gridConvergenceAt`).
- **Eenmalige verschuiving:** elke bestaande coördinaat gaat oud > lat/lon
  (exacte inverse) > RD > nieuw frame; aan de stadsrand tot ~25 m (schaal) +
  ~65 m (draaiing), lokaal affien op < 1 cm per 10 m, dus alles blijft op
  dezelfde echte plek.
- **Migratie op drie plekken:** kaartdata (opnieuw gebouwd); ~150 handgeplaatste
  coördinaten in ~25 bestanden (codemod `scripts/world/rebase_coords.mjs`, met
  `P(x, y)`-helper als veilige tussenstap; richtingen krijgen de draaiing);
  saves (`SAVE_VERSION` +1, stap in `savemigrate.js`, fixtures voor 0.28 in
  stad en Ommeland).
- **Float32 is te grof op 40 km** (~4 mm): oplossing in 2.3.

## 2. Architectuur

### 2.1 Het tegelformaat (`.gdt`)

- **Rooster:** 1 × 1 km op de RD-kilometerlijnen; tegelsleutel = RD-kilometer van
  de zuidwesthoek (bijv. `234_581`). Binair blok met sectietabel (versie, type,
  offsets, lengtes), in packs (2.4b). Posities **int32 tegel-lokaal in cm**,
  delta + zigzag-varint, kolomgewijs; hoogtes in cm.
- **Secties:** gebouwen, wegen (polylijn, klasse, breedte, stroken,
  eenrichting, laag, brug/tunnel, `acc`), kruispunten, water, landuse, bomen en
  puntobjecten, spoor, POI's, hoogteraster en `heights`, navigatie (graaf met
  poortknopen), botsdata, kantstrook-slots, meubilair, `lights`, overlays.
  Zie ARCHITECTURE.md "World tiles" voor de bytes.
- **Over de rand:** zoals gebouwd staat elk object met zijn `gid` in **elke**
  tegel die zijn grenzen raakt (de laag houdt één kopie per `gid`); wegen
  worden op de tegelrand verbonden via poortknopen.
- **Index (`world.idx`):** per tegel offset/grootte, vlag (land, water, zee,
  leeg, buffer), aantal gebouwen, hoogste hoogte, LOD2-samenvatting.
- **Globale lagen (altijd geladen):** wegen vanaf `tertiary` als één graaf
  (~3 MB), spoor en stations, veerroutes, plaatsnamen, missie- en
  activiteitspunten, minimap-piramide, `edge`-laag.

### 2.2 LOD-niveaus

| LOD | Afstand (bij 'ver') | Wat |
|---|---|---|
| L0 | 0-350 m (kort 150, heel ver 600) | alles zoals de stad: gevels, daken, wegdek met markering, meubilair, bomen met stam, colliders, verkeer, voetgangers |
| L1 | tot ~1,2 km | gebouw = extrusie + dak, wegen en water in de grond-shader, bomen instanced; één merge per tegel |
| L2 | tot ~4 km | `farlod.js` per tegel, een draw per laag, kleur per landuse |
| L3 | 4-40 km | per 4 × 4 km supertegel een silhouet (kerktorens, molens, turbines, Eemshaven, Martinitoren), grondkleur uit de minimap-piramide, mist; gebakken, ~2 MB |

`viewdist.js` schuift alleen de grenzen. In heli en vliegtuig krimpt L0 met de
hoogte en groeien L1/L2.

### 2.3 Zwevende oorsprong

Simulatie in wereldmeters (doubles). De render-oorsprong springt mee zodra de
camera > 2 km van de huidige oorsprong is (`position.set` op een wortelgroep
plus uniform `uRenderOrigin` voor grond, water, wind, schaduwen, nachtlicht).
Tegelgeometrie wordt tegel-lokaal gebakken; alles wat een wereldpositie aan
three.js geeft gaat via `toRender(x, y)`.

### 2.4 Streaming

- **Bron:** één pad voor Electron en web (zie 2.22): `fetch` met `Range`.
- **Laadstraal** `r = LODgrens + v · t_vooruit` (10 s), in een kegel in de
  rijrichting. Vooruit laden: lopen/fiets 80 m, auto 400 m, trein 2 km langs
  het spoor, heli 600 m (L0 krimpt), vliegtuig 800 m (alleen L1-L3 boven 200 m).
- **Sprongen** (snelreizen, respawn, save, cutscène elders): bestemming laadt
  achter een overgang; minimaal L0 rond de bestemming klaar vóór die eindigt.
- **Prioriteit:** speler > missiedoel > camerapad van een cutscène > vooruit >
  zijkant. **Uitruimen:** LRU met hysterese (`r + 300 m` en pas na 10 s
  buiten bereik); vastgepind: actief missiedoel, eigen auto, safehouse, garage.
- **Geheugenbudget:** JS-heap kaartdata ≤ 150 MB; GPU ≤ 1,2 GB op Hoog,
  ≤ 600 MB op Laag; een 30-minutentest mag niet groeien (> 50 MB).

### 2.4b Streamingtechniek: de keuzes

Gemeten op 20 representatieve tegels; een alternatief > 20 % beter wint.
**Opslag:** vectordata (de worker bouwt de meshes), int32 tegel-lokaal in **cm**
(getrouwheid boven grootte), delta + zigzag-varint, kolomgewijs; zstd met
woordenboek per sectietype (`fzstd`, gzip-terugval; gebouwd is nu deflate, zstd
is een open meting); gebakken meshes met meshopt; packs van 8 × 8 km met index
(offset, lengte, xxHash64) en Range per tegel, packs heten naar hun hash.
**Workers:** pool `min(4, cores − 2)`; ophalen > decoderen > bouwen (L0-L2,
colliders, graaf) > transferables, nul parsing op de hoofdthread;
`AbortController` + generatietoken; prioriteit = afstand − (snelheid × 8 s) ×
cos(hoek) − routebonus. `SharedArrayBuffer` alleen waar `crossOriginIsolated`
kan (Pages zet geen COOP/COEP). **Upload:** wachtrij knipt buffers, budget per
frame 1,5 / 2 / 3 ms (Laag/Gem./Hoog); RAM voor tegeldata 150 / 250 / 400 MB
(LRU, aparte cache voor GPU-meshes). **Web:** OPFS (IndexedDB als terugval),
index `no-cache` + ETag, packs `immutable`. **Tekenen:** instancing,
`BatchedMesh` per tegel en materiaal, ~30 gedeelde materialen met texture
array, KTX2/Basis, frustum per cel van 250 m zonder occlusie-queries, shaders
opwarmen per tegeltype. **Botsen:** 2D-raster per tegel (16 m) voor voertuigen
en lopers, `three-mesh-bvh` voor camera, kogels en bruggen.

Budgetten: decoderen ≤ 3 ms per tegel; L0 bouwen binnenstad ≤ 60 ms, dorp ≤ 25,
polder ≤ 10; ophalen Electron ≤ 5 ms, web p95 ≤ 150 ms; binnenstadstegel ≤ 2 MB
data en ≤ 25 MB GPU; nooit een tegel te laat; speelbaar na een sprong Hoog ≤ 3 s,
Laag ≤ 6 s.

### 2.5 Eén bouwer voor stad en platteland ("wereldbouwer")

Bron: Geofabrik-extract (ODbL), lokaal met pyosmium; geen Overpass voor de hele
provincie. Pijplijn (`scripts/world/`): extract > normalize > derive (hoogtes,
kruispunten, doorgangen, kades, kavels, kantstroken, POI's: de oude `add_*.py`
zonder stad-bbox) > overlay > tile > pack > audit. Deterministisch (zelfde input
geeft byte-gelijke tegels; `geocheck`), incrementeel (bron + 50 m rand), volledige
build doel < 15 min. Wat "stad" of "Ommeland" was wordt een regel per landuse en
wegklasse (brink, kade, meubilair, sloten en erven).

### 2.6 Wat afhing van de splitsing stad/Ommeland

Besluiten (de oude bestanden verdwijnen naarmate #3 vordert): `TileWorld` met
dezelfde query-API als `GameMap` (`buildingsNear`, `roadsNear`, `waterNear`,
`nearestRoadPoint`, `groundHeightAt`, `isOnBridge`, `escapeBuilding`), eerst
als façade; `countryreal.js`, `countryedge.js` en de rand van `countrybake.js`
weg (de grond-shader leest per tegel een raster met wegen, landuse, water; de
bake-techniek blijft); polders alleen buiten de grens; één gebouwgenerator met
L0-L2, één prop-scatter, één watersysteem, één far-LOD, één routegraaf
(HPA*), één verkeerssysteem op de tegelgraaf, politie die overal op de graaf
spawnt, één collider-set en camera-straaltest, één minimap-piramide (z0 =
provincie, z6 = 2 m/px), kantstrook-slots uit de bouwer en spoorlaag globaal.
Ommeland-extra's (`worldends.js`, `dorpsuitjes.js`, `geheimen.js`) blijven
maar lezen uit de tegelwereld.

### 2.7 Terrein, water en de kust

**Hoogte:** AHN (DTM, 5 m, CC0) naar 8 m per tegel, int16 dm, delta-gecodeerd;
reliëf dat telt: zee- en kanaaldijken (8-10 m, vectorobject met profiel),
wierden (tot ~6 m), Hondsrug-rand en Westerwolde-zand (tot ~15 m), de opgespoten
Eemshaven en de verdiepte Ring Zuid (open: #78). **Waterpeil per waterlichaam**,
niet één `WATER_Y`; sluizen zijn een overgang tussen twee peilen. **Zee en
Wadden:** één zeevlak, eerst vaste vloed, later getij (12 u 25 min, ~3 m bij
Delfzijl, ~2,5 m bij Lauwersoog; natte-zand-shader voor wadlopen). Dollard en
Eems: zee met kwelders en slik, Duitsland als L3-silhouet.

### 2.8 Physics, navigatie en AI per tegel

Colliders per tegel mee met L0; buiten L0 alleen kinematisch rijden op de graaf
voor belangrijke AI. Grafen (rijweg, fiets, voet) per tegel met poortknopen; de
globale hoofdwegenlaag altijd in geheugen. Politie uit regionale OSM-bureaus.

### 2.9 Saves

Posities één keer naar RD (1.5) in de migratiestap die ook `world: 'provincie-1'`
toevoegt; die omrekening is een pure functie gedeeld met codemod en bouwer. Ids
van bestaande plekken blijven; een oudere game leest geen save die de speler
buiten de oude kaart zet.

### 2.10 Wat bestaande systemen moeten doen

Missies: doelen in elke tegel, een missie pint haar tegels. Plekken uit de
bouwer per tegel. `spotcheck`, `passagecheck`, `ringcheck` (plus "wegcheck"
voor A7, A28, N-wegen) en `geocheck` per tegel; `country_route_test` wordt
`world_route_test`; de verhaaltest draait de provinciemissies met sprongen.

### 2.11 Hoogte, wegen en kunstwerken: één oplosser voor weg, spoor en water

**Waarom:** de ring kostte tientallen rondes door dertien oorzaken: hoogtes per
way heuristisch opgelost; "op welk oppervlak sta ik?" stateloos en
dubbelzinnig, met per systeem andere hoogtequeries en hints (`spawnZ`); meshes
per way los gebouwd en grond weggehaald met een rastermasker; coplanaire lagen
zonder eigenaar (z-fighting); muren afgetast met toleranties en z-banden;
2D-plaatsing zonder hoogte; geraden waterkruisingen en radiale spoorbulten;
kunstwerken per weg herbouwd. **De les:** hoogte is geen eigenschap van een way
maar van een netwerk; tekenen, botsen en rijden komen uit één profiel.

1. **Terrein en oppervlakken apart.** Terrein = AHN DTM per tegel. Oppervlakken
   (wegen, spoor, paden, perrons, kades, water) zijn linten (middellijn +
   breedte + verticaal profiel) of vlakken met een peil. Waar lint en terrein
   verschillen ontstaat geometrie (talud, keermuur, landhoofd, pijler,
   tunnelwand); het lint is eigenaar van zijn strook, het terrein wordt
   uitgesneden (geen masker, geen coplanaire lagen).
2. **Verticaal profiel per verbonden netwerk** (`scripts/world/profile.mjs`,
   regels in `roadprofile.js`), uit OSM `bridge`, `tunnel`, `layer`, `level`,
   `embankment`, `cutting`, AHN DTM/DSM en `maxheight`. Weg: helling snelweg
   4 %, N-weg 5 %, stad 6-8 %, oprit 6 %; verticale bogen ≥ 1.000 m (snelweg),
   ≥ 300 m (stad); vrije hoogte 4,6 m (snelweg 4,8), fietspad 2,5 m; gelijke
   hoogte en helling in elke knoop. Spoor: hoofdspoor 1,25 % (uitzonderlijk
   2,5 %), bogen ≥ 5.000 m, 6,0 m vrij boven de spoorstaaf. Tunnels: dak ≥ 5,8 m
   onder maaiveld (8,2 m onder een kanaal). Gebouwd als projecties op de
   voorwaarden vanuit het oude profiel (`add_elevation.py`), zonder scipy;
   `road.z` is hoogte boven terrein.
3. **Eén hoogtequery:** `surfaceAt(x, y, state) → { z, normal, kind, ribbonId,
   layer, deck }`, met `state` = het lint waarop de vrager staat (blijft op zijn
   viaduct tot hij het via een knoop verlaat of over de rand valt). Rijden,
   lopen, AI, politie, spawnen, camera, props en spotcheck gebruiken hem;
   `groundHeightAt` is de stateloze terugval. Colliders en render-meshes komen
   uit hetzelfde profiel in dezelfde worker-run; muren zijn lintranden met een
   bekend boven- en onderlint.
4. **Kunstwerken uit het profiel:** taluds 1:2, keermuren, landhoofden, pijlers
   op vaste steek (niet in rijbaan of vaargeul), dekken met leuning, tunnels met
   wanden, dak en portalen; `cutmask3d.js` vervalt.
5. **Spoor:** eigen profiel per netwerk (de radiale `railLiftZ`-bulten
   verdwijnen); overwegen krijgen exact dezelfde hoogte in weg en spoor;
   perrons 0,76-0,84 m boven de spoorstaaf; bovenleiding op vaste hoogte;
   treinphysics en camera lezen hetzelfde profiel.
6. **Water:** peil per waterlichaam (`level_cm`); kades en oevers uit het
   verschil peil/terrein; sluizen als kolk met twee deuren; bruggen met echte
   doorvaarthoogte, vast of beweegbaar (`bridge:movable`: slagbomen, rood licht,
   wachtende auto's); één `waterAt(x, y) → { level, depth, body, navigable,
   clearanceAbove }` voor boten, zwemmen, heli-landing en `overOpenWater`.
7. **Audits** (`audit_profile.mjs`, `drive_audit.mjs`, `mesh_audit.mjs`,
   `overhang_audit.mjs`, `zfight_audit.mjs`): elke weg en elke lijn in beide
   richtingen rijden met echte physics, elke bevaarbare waterweg varen per
   bootklasse (`boattypes.js`), voegafstand < 1 cm en hellingsprong < 0,5 %,
   vrije hoogte per kruising, geen blokkerende geometrie op een rijbaan. Debug:
   F8 toont in dev het lengteprofiel onder de speler (`profileoverlay.js`).

**Tegeldata:** `roads`/`rails` per vertex `z_cm`, per segment `layer`, `deck`,
`structure`; sectie `structures` (geometrie); `water` met `level_cm` en
`navigable_class`; `bridges` met `clearance_cm`, `movable`. De oplosser draait
over tegelgrenzen en knipt daarna.

**Gemeten (0.30):** 200 > 19 te krappe verticale bogen, 0 te steile segmenten,
0 wegen en spoor onder de vrije hoogte, 0 sprongen in voegen; `drive_audit`
7.312 ritten in 25 s, `network_drive_test` 2.616 ritten streng. **Beperkingen:**
11 fiets- en voetpaden in een OSM-tunnel of op een brug liggen nog op
straatniveau (`--paths`, niet aangezet); één OSM-knoop bij de Roeierspad
(`KNOWN_KNOTS`); de radiale `railLifts` blijven; 8 hakers en 94 gevels over
stroken in smalle binnenstadsstraten (klassebreedte breder dan de straat).

### 2.12 Rijstroken

**Fout die dit loste:** elke helft van een gescheiden rijbaan kreeg de breedte
van de hele weg (N7-helften 12 m met 4 stroken waar er 2 horen; 2.059 verkeerde
strookaantallen en 1.202 te brede rijbanen, nu 0).

**Model** (`scripts/world/lanemodel.py`, gedeeld door `process_osm.py` en
`lanes.py`): `lanes`, `lanes_fwd`/`bwd`/`both`, `turn_fwd`/`bwd`, `width_cm`,
`placement`, `bus_lanes`, `bike_lanes`, `shoulder`, `lane_w_cm`. Strookbreedtes
(NL): snelweg 3,50 m, N-weg buiten de kom 3,00-3,25, stad 2,75-3,25, busbaan
3,25, fietsstrook 1,50-2,00, vluchtstrook 2,50-3,50. Gescheiden rijbanen zijn
twee eenrichtingslinten. Eén model voor lintbreedte, markering (`lanes.js`:
strepen, pijlen uit `turn:lanes`, in- en uitvoegstroken met taper), AI (rechter
strook, voorsorteren), GPS en verkeerslichten (beschermd linksaf uit een echte
linksafstrook). Gemeten: N7-helften nu 7,5 m met 2 stroken; 5.845 van 5.845
autowegen gekoppeld aan hun OSM-way (`audit_lanes.py`). **Open:** `placement`
verschuift het lint nog niet; bus- en fietsstroken komen nog uit `mapextras`.

### 2.13 Kruispunten en rotondes

`junctions.js` `junctionModel` is **één object per knoop** (sleutel = OSM-knoop;
4.178 in de stad: 238 met lichten, 106 rotondeknopen, 528 voorrang, 3.218
gelijkwaardig, 88 ongelijkvloers) met regeling en per tak een regel (licht,
voorrang, voorrang verlenen, uitrit, rechts gaat voor, vrij) en een stopafstand.
Regels: NL-default rechts heeft voorrang; op de rotonde de ring; haaientanden
precies op de takken die voorrang verlenen; rotondes met splitsereilanden en
fietspad rondom (in de kom fietsers in de voorrang, buiten niet).
`trafficlights.js` houdt vaste-tijdregelingen zonder conflicten en de **Groningse
fietsfase** (alle fietsers en voetgangers tegelijk groen). Render, AI,
voetgangers en politie lezen hetzelfde model. Audit
`scripts/junction_sim_test.mjs`: geen conflicterende groene stromen bij alle 238
regelingen en een geseede verkeerssimulatie (doorstroming 7-14 auto's/min,
langste stilstand zonder licht ≤ 24 s, botsingen niet meer dan de v0.29-AI).
**Open:** kruispuntvlakken met bochtstralen, eilanden, opstelvakken en
stopstrepen per strook (het vlak is eigenaar, linten stoppen op de stopstreep).

### 2.14 Straatmeubilair en details

Sectie `furniture` (soort, positie cm, hoek, variant, hoogte uit `surfaceAt`,
`src`: `osm`/`rule`/`overlay`): gemapte objecten per tegel, regelobjecten door
de bouwer, deterministisch (seed per tegel). Regels als OSM leeg is: vangrail
(snelweg- en N-wegbermen, middenbermen, bruggen en aanloop, opritten, water
< 4 m, obstakelvrije zone bij pijlers), lantaarns per wegklasse (snelweg alleen
waar `lit=yes`; stad 28-35 m, dorp 40 m, buitenwegen niets), portalen met echte
bestemmingen en afritnummers (blauw/wit **zonder merk**), paaltjes bij
fietspadingangen, abri's bij elke halte in de kom, drempels in 30-zones,
hectometerbordjes elke 100 m. Flitspalen blijven gameplay; alles wat je kunt
raken heeft een collider, breekbaar via `breakables.js`. Audit: niets op
rijbaan of in een doorgang, geen lantaarn in een boom, vangrail aaneengesloten
(gat < 5 m), elke portaalbestemming bestaat in de globale laag.

### 2.15 Bomen en groen op hun echte plek

Bronnen in volgorde: OSM-bomen (`natural=tree`), bomenrijen (echte steek of
8-10 m), bossen en parken (Poisson-schijf per type), heggen, gras, weide, akker,
bermen; optioneel AHN-detectie (DSM − DTM, CC0) en gemeentelijke bomenbestanden
(alleen bij een expliciet open licentie, **per gemeente te checken**).
Laag-poly varianten per soort (linde, eik, beuk, es, populier, wilg, berk,
plataan, den, fruitboom) in 3-4 groottes met echte hoogtes (straatbomen
12-20 m, populieren langs dijken 25-30 m, knotwilgen 4-6 m); zonder tag soort
uit de omgeving. Stamcolliders in L0; tegeldata `trees` en `green`. Audit: geen
boom op een rijbaan, in een gebouw of in water. Gemeten: 1,16 mln bomen (2.28).

### 2.16 Navigatie en GPS

Eén routegraaf over de tegels (HPA*): knopen en takken per tegel met
poortknopen, globale laag vanaf `tertiary` voor lange routes. Respecteert
stroken, afslagbeperkingen (`type=restriction`, werden niet gelezen),
eenrichting, `access`, `bus`/`psv`-only en wegklasse (kosten = tijd); het
kruispuntmodel geeft per afslag de kosten. Modi: auto, lopen, fiets, boot. De
route ligt op het wegdek op de juiste strook en hoogte, op minimap en kaart,
met pijl en stemhints; herberekenen < 100 ms; een waypoint klikt vast op het
dichtstbijzijnde bereikbare punt op het juiste niveau. Test: `world_route_test`
(willekeurige paren, elke weg in beide richtingen); `country_route_test` en
`bus_route_test` blijven groen.

### 2.17 Echte voorzieningen (POI-laag)

Sectie `pois` (`kind`, `name` zonder merk, `entrance` op de juiste kant van de
weg, `tags`); de globale laag houdt een index per soort zodat
`nearestFacility(kind, x, y)` ook naar een niet-geladen tegel wijst. De
projectie-API (`wgsToWorld`, `worldToWgs`) blijft stabiel. Gebouwd:
`game/facilities.json` uit het provincie-extract, 9.650 voorzieningen.

### 2.18 LOD tijdens cutscènes

De streamer volgt de **camera**, niet de speler. Elke cutscène-bron registreert
vooraf haar shots (camera + kijkpunt + brandpunt); **pre-roll** van tegels en
L0 rond camera én kijkpunt vóór de cut (niet klaar: vorige shot ≤ 1 s langer of
een dichter shot; nooit lage LOD of gaten in beeld). Gameplay staat stil dus
de L0/L1-straal is groter en de LOD-bias schuift naar het frustum; LOD per shot
vastgezet (wissel alleen bij een cut, korte cross-fade); schaduw, far-LOD en
shaders per shot. Test `scripts/world/cine_lod_test.mjs`: 0 ontbrekende tegels
en 0 LOD-wissels per shot. Gebouwd: API (`prefetchPoints`, `missing`); de
shotlijsten en de test per cutscène zijn open.

### 2.19 Weer in de provincie

**Eis van de eigenaar: altijd zomer** (geen seizoenen, sneeuw of ijs; Deel 4
speelt in de nazomer). `storyFreePlay` beëindigt de zomer niet meer (de zware
storm blijft als zeldzame zomerstorm). Ontwerp: een deterministisch weermodel
uit speltijd + seed (fronten uit zee, meestal NW; zeemist en wind aan de
Wadkust en Lauwersoog, buien boven het Hogeland, helderder landinwaarts) met één
functie `weatherAt(x, y, t) → { rain, wind, fog, cloud, kind }` voor render,
physics, AI en audio, en per tegel een klimaatklasse. Soorten: zonnig, hitte,
zomerbuien, onweer, kustmist, wind, af en toe de grijze Groningse zomerdag.
Gameplay: grip (`roadGrip`), plassen, wind op heli en boten, minder fietsers bij
regen. Feesten alleen op echte zomerdata (Gronings Ontzet 28 aug, kermis,
oogst); **geen Koningsdag**; carbid blijft de bestaande activiteit.
Winterinhoud vervalt. Open: #19.

### 2.20 Dag en nacht over de provincie

Eén klok (`world.clock`, speldag 24 min) en de kalender (`calendar.js`)
bepalen zon en maan: declinatie per datum (eind aug ~+9°, half sep ~+3°), echte
azimut (zon onder boven het Wad, op boven de Dollard), lange zomerschemering;
`gridConvergenceAt(x, y)` wordt bij elke verschuiving van de render-oorsprong
opnieuw gelezen. Nachtlicht per tegel uit data (sectie `lights`): lantaarns per
wegklasse, ramen per gebouwtype en tijd (`win_night`), kassen oranje, Eemshaven
en Delfzijl industrieel, windturbines met synchroon knipperende rode
obstakellichten, vuurtorens met draaiende bundel, kerken aangelicht tot
middernacht (besluit 15), snelweg alleen waar `lit=yes`. Far-LOD 's nachts:
lichtpunten en -strepen. Budget: geclusterde of gebakken lichtpunten, geen
schaduw per lamp (behalve speler, politie, zoeklicht).

### 2.21 Verkeer en voetgangers in de hele provincie

Dichtheid uit wegklasse, stroken, bebouwing, POI's en tijdstip (spits op A7, A28
en N-wegen; stille polderwegen met trekkers; fietsers tussen dorpen;
Rijkswaterstaat-intensiteiten alleen bij een open licentie, **te checken**).
Simulatie-LOD: L0 volle AI met physics; middenveld (~0,4-2 km) virtueel verkeer
op de graaf zonder physics; ver niets (behalve lichtstrepen 's nachts). Spawnen
en verdwijnen alleen buiten beeld; een agent leeft op de graaf, niet in een
tegel. Wagenpark per regio (landbouwverkeer, vrachtwagens naar Eemshaven en
Delfzijl, bussen op echte lijnen); `countrylife.js` en `countryDrive` gaan op in
`vehicle.js`. Test: `scripts/world/traffic_soak.mjs` per regio. Open: #18.

### 2.22 Streaming in Electron en web

Eén `TileWorld`, workers, budgetten, LRU en prefetch; alleen de bytebron
verschilt. Electron serveert via het eigen `app://`-protocol dat `Range` al met
206 beantwoordt (geen IPC of `fs` in de preload); web via HTTPS + Range (Pages
ondersteunt Range) met OPFS-cache. `interface ByteSource { read(pack, offset,
length, signal) }`, nu `FetchRangeSource`; een `RemoteSource` voor
download-on-demand is open gehouden (geen hosting nu). Nooit alles bij de start
laden. Aandachtspunten: `serve()` opent het bestand per verzoek (zo nodig een
LRU van handles); `fetch` op `app://` vanuit een worker verifiëren;
`scripts/devserver.py` moest `Range` leren. Test: streamingtests op beide
bytebronnen, byte-gelijke tegels.

### 2.23 Reismodi: waypoints, routes, minimap en kaart per modus

Eén routegraaf, één stijl per modus: lopen (chevrons op de grond, voetpaden,
zebra's), fiets (fietspaden, nooit snelwegen), auto (stroken, afslag-
beperkingen, schakelaar "snelwegen voorkeur"), boot (waterwegen,
doorvaarthoogte per bootklasse, boeien), trein (stations, overstappen,
"uitstappen bij"), bus, heli en vliegtuig (rechte lijn met hoogteadvies,
no-fly-zones, landingsplaatsen, 3D-ringen). Ketens van modi (lopen > station >
trein > lopen) met wisselkost per knoop. Kaart (M) met modusknop (lopen, fiets,
auto, boot, OV, lucht); minimap past zich vloeiend aan, met zoom en noord-boven
per modus.

**Toegang per modus (wettelijk):** de graaf kent per tak en modus een
toegangsvlag uit OSM (`foot`, `bicycle`, `motor_vehicle`, `motorroad=yes`,
`access`, `bus`/`psv`, `private`); `roads.acc` is een bitmasker (voet, fiets,
brom, auto, bus, hulpdienst). Routering stuurt nooit lopend of fietsend over een
snelweg en nooit een auto over een fietspad; fysiek kan het wel, maar het is een
overtreding (waarschuwing, na een respijt wanted +1; de kaart toont "niet voor
jou").

**Gebouwd:** routering per modus (`routing.js`, `roadaccess.js`,
`travelroute.js` voor boot, trein, lucht), snap op het juiste niveau,
`trafficlaw.js` (waarschuwing, na 12 s een ster), `waymarkers3d.js`,
`scripts/mode_route_test.mjs`. **Beperkingen:** geen afslagbeperkingen en
rijstroken in de routering, beweegbare bruggen en sluizen alleen als dekhoogte,
geen bushalte-data, de Ommeland-graaf kent alleen snelweg en geen `acc`.

### 2.24 De rand van de wereld

**Speelgebied:** de provincie plus een buffer van 3-5 km in Friesland, Drenthe
en Duitsland op L1/L2-detail; daarbuiten L3 tot 40 km; nergens een gat. Op elke
weg die de bufferrand kruist een **grappige, overslaanbare terugkeer**
(uitbreiding van `worldends.js`; de speler wordt met het gezicht naar binnen
teruggezet): Friesland een Friese wegversperring met neven van Durk en Douwe,
Drenthe een hunebed ("Drenthe is dicht"), Duitsland een verzonnen "Grenswacht"
(geen echte organisaties). Elke gevonden rand telt voor een prestatie.

**Water en lucht:** Wad speelbaar tot net voorbij Rottumerplaat en -oog; de open
Noordzee is de harde rand (kustwachtradio, mist en stroming terug); Rottum is
natuurgebied (aan land een boswachter-waarschuwing en een grap, één geheim);
Schiermonnikoog eerst cinematic overtocht; Eems en Dollard varen tot het midden
van de vaargeul (Grenswacht-boot waarschuwt); Lauwersmeer helemaal speelbaar,
sluizen Lauwersoog als rand. Lucht: radiowaarschuwing, dan draait de autopilot
zacht terug (plafond ~300 m vliegtuig). Spoor eindigt bij het laatste station
voor de grens; snelreizen blijft binnen de grens.

**Bruggen, dammen en sluizen over grenswater** (Lauwersmeerdijk, Westerwoldse Aa,
kanalen bij Ter Apel en Haren-Rütenbrock, grenskanalen met Drenthe) zijn
volledig gemodelleerd en bespeelbaar tot de overkant; **de terugkeer treedt pas
ná de brug** op, nooit op het dek of een oprit. Spawnen, teleporteren, respawnen
en waypoints worden binnen de rand geklemd, de save-migratie zet posities buiten
de rand naar binnen, en tests controleren dat geen weg of waterweg het
speelgebied uit leidt zonder terugkeer. Kaart: grens getekend, buffer gearceerd
"buiten de provincie". Tegeldata: `edge`-laag in de globale laag, tegels in de
buffer krijgen vlag `buffer`. Gebouwd: regels en haken in `worldedge.js`; de
terugkeerscènes als pure logica in `edgescene.js` (rekwisieten per rand, waarschuwing, scène, terugzetten met het gezicht naar binnen; `scripts/edgescene_test.mjs`). Open: de rekwisieten tekenen en `stepEdgeWatch` in de spelloop hangen.

### 2.25-2.27 Gemeten resultaten F0 en F1

**F0 (tegels, RD New):** `rdnew.js` is 0,3 m van de rigoureuze RD over de
provincie. Gemeten t.o.v. v0.29.0 met JSON-kaart: kaart klaar 1,5-2,4 s (was
2,4-3,3), titelscherm 4,3-5,5 s (was 4,8-6,4), heap ~850 MB (was ~900),
perf-routes gelijk binnen de ruis (~22 ms gemiddeld, p95 ~33,5 ms); 54 tegels
bij het opstarten, 3,3 MB via Range, 0 te laat. Per tegel: inflate 1 ms,
decoderen ~6 ms op een worker, structured clone ~22 ms (open: typed arrays).
Virtuele klok (`scripts/tileworld_test.mjs`): 38 m/s en heli 80 m/s zonder tegel
te laat binnen 250 m; sprong: L0 na ≤ 400 virtuele ms. Op de oude data viel 95 %
van de gebouwen terug op type-default (`hsrc`): de reden voor 3D BAG.

**F1 (wereldbouwer, proefstrook):** `game/js/worldbuilder.js` is één generatorpad
(gebouwbewijs: 3D BAG > OSM-hoogte > OSM-lagen > standaard); 0 verschillen met
het oude pad (`scripts/worldbuilder_test.mjs`), `fromOsm` geeft de rijen van
`process_osm.py` terug. Open: de stad zelf opnieuw bouwen uit OSM in plaats van uit
`citymap.json`. Proefstrook (619 tegels langs de spoorlijnen naar Delfzijl en
Eemshaven, N360, A7, N33): decoderen p95 1,2-2,3 ms, 1.436 poorten verbonden;
auto 40 m/s (27 km), trein 39 m/s (31 km), heli 60 m/s (30 km): 0 tegels te
laat; `geocheck` ok. Trein: meerijden halte voor halte op de eigen treinfysica
met overslaan (`scripts/train_ride_test.mjs`). **Go/no-go: GO voor de
pijplijn**; wat ontbrak was data, geen techniek (opgelost door de PBF-route, 2.28).

### 2.28 F2a: de hele provincie uit één OSM-extract

De eigenaar koos voor de hele provincie in één keer; Overpass weigerde de
strook (HTTP 406/429), dus de bron is het Geofabrik-extract.

- **PBF-pijplijn:** `scripts/world/extract_province.py` (pyosmium in
  `data/cache/venv`) leest `groningen-latest.osm.pbf` (54 MB) in twee rondes
  naar pack-caches (`data/cache/province/c<pack>.json.gz`): wegen met toegangs-
  en strooktags, gebouwen, spoor, water, landuse, groen, multipolygonen, bomen,
  meubilair, plaatsen, stations, bus- en treinrelaties. Rand: de extracten van
  Friesland en Drenthe, met `--near` geknipt tot 4 km langs de grens
  (voorzieningen 12 km). **Duitsland heeft geen strook** (Niedersachsen is te
  groot voor één download; de rand is horizon en `worldedge`-regels).
  `fetch_corridor.py` blijft terugval; test: `extract_province_test.py`.
  Eenmalig ~5 min en ~210 MB download (neutrale User-Agent
  `GDE-Groningen-mapbuilder/1.0`); caches ~75 MB in `data/cache/` (niet in
  Git); de stage (`desktop/build.mjs`) bouwt de tegels zelf.
- **Tegels:** `scripts/world/build_province.mjs` bouwt alle tegels binnen 3 km
  van de grens: 4.077 in de set, 3.169 gebouwd, 54 stad, 847 leeg (zee,
  Duitsland); 921 plaatsen, 30 stations, 10 treinlijnen, 252 buslijnen.
- **Het oude Ommeland-gebied (#3):** de strook van het extract houdt 3 km
  voorbij de grens op; het zuidwesten van het oude gebied (Peize, Foxwolde,
  Winde: 27 tegels, vlaggen 8 + 16 + 32 + 4) wordt in `fillOldExtent` uit
  `data/ommeland_raw.json.gz` gebouwd (wegen, spoor, water, plaatsen met volle
  geometrie, gebouwen als hun dozen en vleugels), met wegen in het routenet en
  de basiskaart; elke stadstegel waarvan de stadsdata niet 100 % dekt krijgt een
  overlay. `ommelandtegels_test` bewaakt dat elk oud gebouw, elke weg en elk
  spoorpunt van `ommeland.*` in een tegel ligt. De oude lagen (`realmap.js`,
  `countryvillage.js`, de gebouw-, weg- en boomdekken van `countryside.js`, de
  weglagen van `countryedge.js`, de huizen van `countryskyline.js`) zijn weg;
  `countryreal.js` houdt het waterveld, het bebouwingsmasker, plaatsen, kerken,
  stations, routes en rails. Plaatsing leest de tegels (`tileplace.js`): wat vast
  ligt ver van de speler laadt eerst zijn tegels (`withTiles`).
- **In het spel:** standaard aan. Tegels streamen overal,
  ook in het oude gebied; voorbij de detailstraal tekent `farlod.js` ze. De polderblokken onder de tegels zijn echte blokken
  (`uProvBlocks` in de grond-shader); props houden afstand van echte wegen,
  gebouwen en water. Treinen rijden over het echte spoor naar alle 26 stations
  buiten de stad plus Veendam; kaart met basispiramide z0-z3 (5 MB PNG) plus
  vectoren van geladen tegels.
- **Gemeten:** extract 123 s (piek 1,9 GB RAM), tegels bouwen 105 s, **~53 MB
  totaal** (packs 46,2 MB, basiskaart 5,0 MB, rest index en bussen); 435.000
  gebouwen, 1,16 mln bomen; decoderen p95 2,7 ms; 34.164 poorten verbonden, 13
  open; A7 Stad > Bad Nieuweschans (47 km, 33 m/s), trein naar Eemshaven (45 km,
  39 m/s) en heli (60 m/s): 0 te laat, hoofdthread max 8-41 ms (een dichte
  bostegel: één `addTile`-taak). Electron: verhaaltest PASS, 0 NaN; `geocheck` ok.
- **3D BAG voor de provincie (plan, #2):** `fetch_3dbag.py --province`; ~430.000
  panden, ~9-10 MB gzip, downloads ~2-4 GB (schatting) tijdelijk in
  `data/cache/3dbag`; join als in de stad (BAG-id uit `ref:bag`, anders
  zwaartepunt + oppervlakte). Buiten de stad is nu 99 % `default`.
- **Bekende beperkingen:** oude Ommeland-lagen binnen hun gebied nog niet per
  tegel vervangen (#3); het water van de provincietegels is plat getekend en
  staat buiten de watergrid (geen boten of zwemmen, auto's rijden eroverheen;
  #1); geen Duitse randstrook; geen AHN buiten de stad (#78); een dichte
  bostegel kost tot ~40 ms in één frame.

## 3. Reizen door de provincie

De provincie is ~37 keer zo groot als een grote open-wereldkaart (~80 km²); Stad
> Delfzijl is ~32 km. **Besluit: schaal 1:1** (de echte kaart is het
verkoopargument; overslaan lost de afstanden op). Een gewone verplaatsing tussen
twee verhaalmomenten duurt hooguit 3-5 minuten echte tijd, tenzij de speler zelf
voor de lange weg kiest.

### 3.1 Reistijden (1:1)

Stad - Delfzijl (32 km): auto 19 min, trein 35 min (3 versneld), heli 10, vliegtuig 7.
Stad - Eemshaven (38 km): auto 23, trein 45 (3). Stad - Winschoten (35 km, A7):
auto 18, trein 30 (3). Stad - Ter Apel (55 km, geen spoor): auto 33, heli 18.
Lauwersoog - Nieuweschans (75 km): auto 45, heli 25. Rijden is voor de rit zelf,
niet om ergens te komen: het spel geeft altijd een sneller alternatief.

### 3.2 Trein

Alle lijnen echt: Groningen-Leeuwarden (Zuidhorn, Grijpskerk),
Groningen-Roodeschool-Eemshaven (Sauwerd, Winsum, Baflo, Warffum, Usquert,
Uithuizen, Uithuizermeeden), Groningen-Delfzijl (Bedum, Stedum, Loppersum,
Appingedam), Groningen-Nieuweschans (Kropswolde, Martenshoek,
Hoogezand-Sappemeer, Zuidbroek, Scheemda, Winschoten), Zuidbroek-Veendam,
Groningen-Assen (Haren), plus het museumspoor Stadskanaal-Musselkanaal
(stoomtrein, zonder merknaam). Drie manieren: meerijden in echte tijd (uitzicht,
coupé-banter van Tammo en Tessa, "Uitstappen" bij elk station; Spatie houdt =
overslaan), versneld meerijden (4×, de route is bekend dus prefetch is
makkelijk) en snelreizen (`stationtravel.js`) naar elk ontdekt station.
Treinen rijden echt over de hele lijn (kinematisch op de globale spoorlaag) met
overwegen die dichtgaan. Tickets kosten bijna niets; zwartrijden geeft een
kleine kans op een conducteur (droge mini-scène, geen wanted). Zelf machinist
als minigame is een wens van de eigenaar (#14).

### 3.3 Bus

Lijnen en haltes uit OSM (`route=bus`, `highway=bus_stop`), geen echte
dienstregeling maar frequenties per lijnklasse (stad 10 min, streek 30 min, 's
nachts niets); GTFS alleen bij een expliciet open licentie (**te checken**).
**Geen merknamen:** vervoerders heten neutraal ("Streekbus Grunn", snelle lijnen
"Sneldienst"). Meerijden of "Slaap tot halte ..."; bijbaan buschauffeur
(`sidejob_bus.js`). Open: #80.

### 3.4 Weg

A7, A28, N33, N46, N355, N360, N361 en andere N-wegen met echte maximumsnelheid.
"Rijd me erheen" (autopilot op GPS) met 3× tijdversnelling op snelwegen en
N-wegen, onderbroken zodra er iets gebeurt (alleen L1/L2 vooruit, L0 bij
afremmen). Taxi bellen (cinematic + fade, niet met wanted ≥ 2). Elke regio
minstens één garage; "Lever mijn auto af" werkt overal.

### 3.5 Vliegen

Heli: helipad bij elk safehouse vanaf deel 4 en bij Eemshaven en de ziekenhuizen
(waar OSM ze heeft). Klein vliegtuig (nieuw): Eelde, het vliegveld bij Oostwold,
mogelijk een graspiste bij Stadskanaal (te checken); landen op een rechte weg of
graspiste, "vliegbrevet" als activiteit; gewasspuiter-bijbaan. Vliegen streamt
alleen L1-L3 boven 200 m.

### 3.6 Water

Het vaarwegennet komt uit OSM (`waterway=canal/river`, breedte, sluizen, bruggen
die open moeten): Reitdiep naar Zoutkamp en het Lauwersmeer, Winschoterdiep,
Eemskanaal, Damsterdiep, Van Starkenborghkanaal. Veerboot Lauwersoog-
Schiermonnikoog (eiland optioneel: zonder eiland een cinematic met een "Je bent
op Schier geweest"-kaart); kleine ponten waar OSM `route=ferry` heeft; de
rondvaartboot als waterbus tussen Stad, Zoutkamp en Delfzijl met overslaan.

### 3.7 Snelreizen: regels

Alleen naar een station, halte, veersteiger, vliegveld of safehouse waar je zelf
geweest bent (de eerste rit naar een nieuwe regio mag altijd met de trein). Geld
is nooit een blokkade (kaartje 2-15 euro, anders zwartrijden). Geen snelreizen,
trein, bus of taxi met 2 sterren of meer. Tijdens een missie geen snelreizen
tenzij de missie het aanbiedt. Snelreizen laat de speltijd lopen (rit + 20 min).
Reistijd-budget: binnen een stad of dorp 0,5-2 min, volgend missiedoel in de
regio 1-3 min, andere regio de eerste keer 3-5 min, daarna < 30 s.

## 3b. Herkenningspunten per plaats

**Eis van de eigenaar:** elke stad en elk dorp krijgt minstens 1-2 herkenbare
gebouwen, dichter bij het echte ding dan een generiek huis. Uitgangspunt was: 14
benoemde stadslandmarks (`landmarks3d.js` procedureel, `landmarkmodels.js` alleen
`martinitoren.glb`, prompts in [3d-model-prompts.md](3d-model-prompts.md)) en
vier generieke kerkvarianten in het Ommeland.

**Selectie per plaats** (`place=*`, 592 stuks): de bouwer neemt de 1-3 hoogst
scorende kandidaten in de bebouwde kom (tot 1 km erbuiten voor molens en
borgen): kerken (`place_of_worship` + `church`/`chapel`; score omhoog door
`heritage`, `start_date` < 1600, Wikidata, wierde), molens, borgen (`historic=
castle|manor`, naam op `-borg`; altijd, met gracht), torens en vuurtorens,
musea en monumenten, stations (19e-eeuws), waterwerken (top-3 als een plaats
geen kerk heeft), haven-iconen alleen Eemshaven, Delfzijl, Veendam, Hoogezand.
Aanvullend: Wikidata (CC0), Rijksmonumentenregister (licentie te verifiëren), 3D
BAG (CC BY). Foto's (Wikimedia Commons) alleen als referentie, **niets uit
foto's in de build**.

**Generator:** footprint (OSM) + maten (hoogte, Wikidata/3D BAG) + stijl (tags)
+ een **bouwdoos met parameters** per soort: kerk (schip uit footprint, koor,
torenpositie west/los/dakruiter, torentype, steen, vensters, steunberen;
varianten: zadeldaktoren als Groninger klassieker, spits, ingesnoerde spits,
losse klokkenstoel, wierde met kerkhofmuur en lindes), toren (scheve toren van
Bedum via parameter `lean`), molen (stelling, grondzeiler, spinnenkop,
poldermolen; wieken draaien met de wind), borg (Menkema-type U-vorm,
trapgevels, poortgebouw, gracht), vuurtoren of haventoren, station, haven-iconen.
Overrides voor de ~30 echte iconen als JSON met afwijkende maten en extra
stukken; een GLB alleen waar de bouwdoos tekortschiet (3-5: Menkemaborg,
Bourtange, de scheve toren van Bedum). LOD: L0 volle bouwdoos, L1 silhouet met
dak en toren, L2/L3 torensilhouet (kerktorens en molens staan **altijd** in de
L3-horizon). 's Nachts: kerken aangelicht (uit na middernacht), verlichte
wijzerplaten, draaiende vuurtorenbundel, rode obstakellichten op turbines.
Budget: L0 ≤ 8 draws per herkenningspunt, bouwen in de worker, één batch per
tegel voor L1/L2. Gebouwd: `landmarkkit.js` (LK1: data in, geometrie uit;
`landmarkParams(item, fit)`).

**Aantallen (schatting):** ~520-590 plaatsen, ~250 kerken met karakter, ~90
molens, ~15 borgen, ~500-600 herkenningspunten (het gros uit de kerkbouwdoos).

**De ~30 iconen met de hand:** Martinitoren (GLB), Der Aa-kerk, Menkemaborg,
Fraeylemaborg, Bourtange, klooster Ter Apel, scheve toren van Bedum, hangende
keukens en kerk Appingedam, Eemshaven met vuurtoren en turbines, haven en
zeedijk Delfzijl met molen Adam, kerk Loppersum, ruïnekerk Garmerwolde, Stedum,
Ezinge, Leens (kerk + Verhildersum), Zeerijp, Krewerd, Uithuizen, abdijkerk
Aduard, Nienoord, Winschoten (molens, kerktoren), vesting Nieuweschans,
Heiligerlee, sluizen Lauwersoog en Zoutkamp, museumspoor-station Stadskanaal,
de Veenkoloniale lintkerken (Veendam, Wildervank), Termunten, Noordpolderzijl,
Warffum, Middelstum. Gameplay: ontdekken geeft een naamkaart; een beklimbare
toren per regio onthult de kaart en wordt snelreispunt; "Kieken" (foto per
punt voor de Kiekdoar-feed, album per regio). Open: #21, #23.

## 4. Prestaties, kwaliteit, tests en licenties

### 4.1 Doelen

Mediaan-FPS in de binnenstad en op de A7/heli: 30 (Laag, iGPU), 45-50 (Gem.), 60
(Hoog, M-serie). p99 frametijd bij 40 m/s: ≤ 50 / 40 / 33 ms; langste hapering in
10 min: ≤ 100 / 80 / 66 ms; geen pop-in binnen L0; titelscherm ≤ 8 / 6 / 5 s;
snelreizen tot speelbaar ≤ 6 / 4 / 3 s; heap-groei na 30 min < 50 MB;
GPU-geheugen ≤ 600 / 900 / 1.200 MB. Download desktop: geen harde grens (0.1);
webversie eerste speelbare keer ≤ 25 MB. Regel: **geen regressie** t.o.v. de
stad-baseline van `scripts/perf/run.sh` (foot, ring, heli) op dezelfde machine.
Alles is op drukke machines gemeten (parallelle agents); herhalen op een stille
machine staat open (#4, #56).

### 4.2 Teststrategie

Bouwaudit per tegel (`scripts/world/audit.mjs`; de build faalt bij fouten);
routetests provinciebreed (500 paren, 50 echt gereden); wegcheck over A7, A28 en
N-wegen; perf-routes in één Electron-slotronde (A7 naar Nieuweschans op 40 m/s,
heli Stad > Eemshaven op 60 m/s, trein naar Delfzijl versneld, rondje lopen in
Appingedam); geocheck per tegel (worker = hoofdthread = vorige build, byte voor
byte); visuele pariteit van de stad met vaste camerashots (`placeshot.js`);
stresstest streaming (`scripts/perf/stream_stress.mjs`: heli 60 m/s dwars door de
provincie, trein 4×, "Rijd me erheen" 3×, 100 sprongen, 30 min met heap en GPU
elke 10 s, en `--cpu-throttle=4`) tegen de budgetten uit 2.4b.

### 4.3 Licenties

| Bron | Gebruik | Licentie | Wat moet |
|---|---|---|---|
| OpenStreetMap (Geofabrik, Overpass) | alles | ODbL 1.0 | naamsvermelding; tegels zijn een afgeleide database en blijven ODbL (share-alike), bouwscripts staan in de repo; uitzondering in `LICENTIES.md` uitbreiden naar `game/world/` |
| AHN (PDOK) | hoogte, dijken, wierden | CC0 | netjes vermelden in Over |
| BAG (Kadaster, PDOK) | bouwjaar, functie | CC0 | idem |
| 3D BAG (TU Delft) | hoogtes en dakvormen | CC BY 4.0 (per versie te verifiëren) | vermelding in Over en aftiteling (#70) |
| BGT / BRT-TOP10NL | sloten, dijken, kavels | BGT CC0; BRT CC BY 4.0 (te verifiëren) | vermelding bij BRT |
| Rijkswaterstaat (waterinfo, vaklodingen) | getij, bathymetrie | open data, per dataset te checken | vermelding |
| Wikidata | hoogtes, bouwjaar, stijl | CC0 | geen |
| Rijksmonumentenregister (RCE) | monumentstatus | te verifiëren (meestal CC0) | vermelding |
| Wikimedia Commons | alleen referentie | per foto | niets uit foto's in de build |
| OV-data (OVapi, NDOV) | eventueel buslijnen | te checken per concessie | alleen als expliciet open; anders OSM-busrelaties |
| Streaming-bibliotheken | `fzstd`, meshoptimizer-decoder, three-mesh-bvh (MIT); Basis/KTX2-transcoder (Apache-2.0) | | in `LICENTIES.md` en `licenses/` |
| Merk- en bedrijfsnamen | | | niet gebruiken: vervoerders, supermarkten, datacenters, gasbedrijven, musea en festivals krijgen fictieve namen |

Grens: OSM-data en CC0-sets mogen samen in een tegel; CC BY-data (3D BAG) ook,
met vermelding; data met een niet-commerciële of onduidelijke licentie gaat
er niet in.

## 5. Fasen (kort)

Stand op 0.34: F0 (tegels, RD New, streaming), F1 (wereldbouwer, proefstrook,
go/no-go: GO) en F2a (hele provincie uit één extract) zijn klaar, met de
beperkingen uit 2.28. De rest (F2b-F5 en de inhoud) staat als issues op het
bord, in de milestones "Tegelwereld werkt", "Levende open wereld", "Verhaal
Deel 4 en missies", "Provincie leeft" en "Afwerking en menu's".

- **F0 klaar als:** verhaaltest, spotcheck, passagecheck, ringcheck, geocheck en
  `country_route_test` groen, geen perf-regressie, laden ≤ 6 s, speler op
  x = +40 km zonder trilling. Risico (absolute vertices diep in veel modules):
  eerst `toRender()` met oorsprong (0, 0) overal, dan verschuiven.
- **F1 go/no-go:** stad visueel gelijk of beter (shotsdiff + review eigenaar),
  perf-doelen 4.1, 10 min A7/N360 op 40 m/s zonder hapering > 66 ms, heli 60
  m/s zonder pop-in binnen 600 m, heap vlak na 30 min, corridor ≤ 10 MB, build
  ≤ 15 min; no-go: terug naar een tweedeling met betere L1 of tegels van 500 m.
- **F2** vervangt ook de oude Ommeland-lagen (`countryreal.js`, `countryedge.js`,
  `countrybake.js`-rand, `countryroute.js`, `countryskyline.js`, procedurele
  polders binnen de grens); audits per tegel met een uitzonderingslijst.
- **F3 Steden en reizen, F4 Deel 4** (F4a Stad + Hogeland + Eemsdelta, F4b
  Wadkust/Lauwersmeer + Westerkwartier, F4c Oldambt + Veenkoloniën + Westerwolde
  + finale; zie PROVINCIE-VERHAAL.md), **F5 Afwerking** (getij, eiland, ambience,
  zomer- en nazomerevents, laatste perf-ronde).
- F0 blokkeert alles; geen nieuwe pariteitsronde meer op de oude lagen.

## 6. Risico's samengevat

De provincie voelt leeg (dichtheidsregels, events, reizen met overslaan); de
stad verliest kwaliteit door generieke regels (overlays, shotsdiff); streaming
hapert op snelheid (worker-builds, budgetten, prefetch); buildtijd en
datafouten (incrementeel, audits per tegel); download te groot voor het web
(streaming per tegel); gevoelige thema's zoals gaswinning en de grens
(constitution 6, review door de eigenaar); licentie-onzekerheid (alleen
expliciet open data, OSM als fallback).

## 7. Genomen besluiten

| # | Vraag | Besluit |
|---|---|---|
| 1 | Schaal | **1:1**; reizen met overslaan |
| 2 | Waddeneilanden | Rottum als verboden natuur (gezien vanaf zee, één geheim); Schier eerst als cinematic, eiland later als het loont |
| 3 | Maximale downloadgrootte desktop | **geen harde grens**: getrouwheid gaat voor grootte, richting ~1 GB; eerste keer laden en web klein door streaming |
| 4 | Webversie op volle provincie | ja, met streaming; eerste keer ≤ 25 MB |
| 5 | Verhaal | Deel 4 "Nazomer" na de epiloog, de drie bestaande delen ongewijzigd |
| 6 | Gaswinning en aardbevingen | stille, respectvolle zijlijn zonder grappen over de schade, of helemaal niet (constitution 6) |
| 7 | De grens | eenvoudige rand (L2-kwaliteit, geen missies); Eelde blijft het enige stuk Drenthe met detail |
| 8 | Getij | ja, later; eerst vaste vloed |
| 9 | 3D BAG (CC BY) | ja, met vermelding; anders OSM + type-defaults |
| 10 | Winterinhoud | **vervalt**: altijd zomer, ook niet als los event (constitution 3) |
| 11 | Naam | "GDE Groningen - Zomer vol misdaad"; Deel 4 speelt in de nazomer |
| 12 | Volgorde | F0 (+ LK1 parallel) > F1 met kleine inhoud > F2/F3 parallel met F4a-scripts |
| 13 | RD New: codemod of `P(x, y)`-helper | eerst de helper, daarna in één keer vastzetten (gedaan) |
| 14 | Iconen met de hand | 30 op de bouwdoos; GLB alleen voor 3-5 |
| 15 | Aanlichten van kerken 's nachts | ja, tot middernacht |
