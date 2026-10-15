# De hele provincie spelen: plan

*Ontwerpdocument, oktober 2026. De eigenaar vroeg: "Ik wil de hele provincie
kunnen spelen, bedenk wat daarvoor nodig is om dat goed te kunnen doen." Dit
document is de techniek, het reizen, de kwaliteitseisen en de roadmap. Het
verhaal, de missies en de activiteiten staan in
[PROVINCIE-VERHAAL.md](PROVINCIE-VERHAAL.md).*

## 0. Het kernprincipe: één wereld, één pijplijn

Vandaag heeft de game drie kwaliteitslagen: **de stad** (ringweg + ~300 m,
`citymap.json`, volle detail), **het echte Ommeland** (~12 km rond Stad,
`ommeland.json` + `ommeland.bin`, gebouwen als dozen, wegen in de
grond-shader) en daarbuiten **procedurele polders**. Elke laag heeft eigen
code voor tekenen, botsen, verkeer, routes en controles
([OMMELAND-PARITEIT.md](OMMELAND-PARITEIT.md) somt de verschillen op).

**Besluit van de eigenaar:** die splitsing verdwijnt helemaal. Er komt
**één wereld** waarin elke tegel (binnenstad, dorp, polder, Eemshaven, de
Wadden) door **dezelfde bouwer** op **dezelfde kwaliteit** wordt gemaakt.
Het enige wat verschilt is het detailniveau op afstand van de speler (LOD).

Wat daaruit volgt:

1. **Geen `inCity`, geen stadsrand.** Code mag nergens meer vragen "zit ik in
   de stad?". Wel: "wat voor grond is dit?" (landuse, wegklasse, bebouwd of
   niet), en dat komt uit de tegel.
2. **Eén gegevensformaat.** De huidige stad wordt in F0 omgezet naar tegels,
   en in F1 opnieuw gebouwd door de nieuwe bouwer. `citymap.json`,
   `mapextras.json`, `ommeland.json` en `ommeland.bin` verdwijnen.
3. **Handwerk wordt een laag, geen zone.** Wat nu met de hand in de stad is
   gezet (landmarks, doorgangen, de ringhoogtes, kades, de Grote Markt,
   het UMCG) wordt een *overlay* per tegel in hetzelfde formaat. Een overlay
   mag overal staan, ook in Delfzijl.
4. **Procedureel alleen waar de data leeg is.** Akkers, sloten, erven en
   boerderijdetails worden per tegel uit landuse en kavels afgeleid, met
   een vaste seed per tegel. Buiten de provinciegrens loopt een simpele rand.
5. **Elke controle draait per tegel.** `spotcheck`, `passagecheck`,
   `ringcheck`, routetests en `geocheck` worden tegelaudits die over de hele
   provincie lopen.

### 0.1 Laag-poly maar herkenbaar

**Eis van de eigenaar:** de stijl blijft **laag-poly**. Het doel is dat elke
plek **heel herkenbaar** is. Een Groninger moet zijn straat, zijn dorp en
zijn afslag zien zonder bordje. Daarom gaat de detailbegroting naar wat een
plek herkenbaar maakt, niet naar meer polygonen.

Prioriteit (hoog naar laag):

1. **Footprints en hoogtes kloppen.** Echte veelhoeken (OSM, BAG-gecontroleerd),
   **echte hoogtes en dakvormen** uit 3D BAG (`h_dak_max`, `h_dak_50p`,
   `h_maaiveld`, daktype). Terugval: OSM `height` → `building:levels` ×
   verdiepingshoogte per type → `roof:shape`; als laatste een default per
   gebouwtype. Elk gebouw krijgt een **bronvlag** (`3dbag`, `osm_height`,
   `osm_levels`, `default`), zodat audits en debugweergave laten zien waar
   het gokwerk zit.
2. **Daken.** Zadel, schild, plat, mansarde, sheddak (fabrieken),
   kas-zaagtand, uit het 3D BAG-daktype of `roof:shape`; nokrichting langs de
   lange zijde tenzij `roof:orientation`.
3. **Kleur en materiaal per type en bouwjaar.** Baksteentinten per periode
   (rood-bruin voor 1940, geel en lichtrood in de wederopbouw, grijs/wit na
   1990), dakpannen rood/antraciet, riet bij boerderijen. Waar gemapt wint
   OSM: `building:colour`, `roof:colour`, `building:material`,
   `roof:material`. Bouwjaar uit BAG (`oorspronkelijkbouwjaar`).
4. **Herkenningspunten** (3b) staan altijd in L0-L3.
5. **Wegen zoals ze echt liggen:** juiste ligging, rijstroken, markering,
   kruispunten en rotondes (2.12, 2.13).
6. **Straatmeubilair, bomen en groen op hun echte plek** (2.14, 2.15).
7. **Water en bruggen** met echte peilen en doorvaarthoogtes (2.11).
8. **De skyline:** torens, silo's, turbines en schoorstenen op echte hoogte,
   van ver zichtbaar (L3).

**Wat dat betekent voor de grootte.** De downloadgrens van ≤ 230 MB is
**geen harde grens meer**. Als de kwaliteit het vraagt mag de totale data
richting **~1 GB**. Regels:

- **getrouwheid van de tegel gaat voor grootte**: liever 1 cm-posities en
  echte dakvormen dan een kleinere download;
- **verstandig comprimeren** (zstd met woordenboek, kolomgewijs, 2.4b), geen
  data meesturen die niets toevoegt (bijv. geen vertices die binnen 1 cm op
  een rechte lijn liggen);
- **de eerste keer laden blijft klein**: index, globale lagen en tegels rond
  het spawnpunt; de rest streamt (2.4, 2.22). De webversie blijft
  ≤ 25 MB tot speelbaar.

Tegeldata (`buildings`): per gebouw `h_roof_max`, `h_roof_50p`,
`h_ground` (cm), `roof_type`, `roof_dir`, `levels`, `year`, `colour`,
`roof_colour`, `material`, `src` (bronvlag), `bag_id`. Audit: verdeling van
de bronvlaggen per tegel; een tegel met > 30 % `default` in bebouwd gebied
komt in het rapport.

Fase: F0 velden in het formaat; F1 3D BAG + kleurregels in de bouwer voor de
corridor; F2 provinciebreed.

## 1. Omvang en metingen

### 1.1 Het gebied

| | Waarde |
|---|---|
| Provincie Groningen | ~2.960 km² totaal, ~2.330 km² land (rest Wadden, Eems, Dollard, meren) |
| Omhullende rechthoek | ~71 km (O-W) × ~79 km (N-Z), van de Friese grens bij Grijpskerk tot Bad Nieuweschans, van Ter Apel tot Rottumerplaat |
| In spelcoördinaten (origin 53.2195 N, 6.565 O) | x ≈ −26 km … +44 km, y ≈ −38 km … +42 km |
| Huidige stad | bounds 7,1 × 6,3 km ≈ 45 km² |
| Huidig echt Ommeland | bbox 24,5 × 23,8 km ≈ 583 km² |
| Tegels van 1 km | ~5.600 in de rechthoek, ~3.000 met land of binnenwater; zee-tegels zijn alleen een vlag in de index |

Binnen: het Hogeland met de wierdedorpen, Eemshaven, Delfzijl en de
Eemsdelta, het Lauwersmeer (Groningse kant, met Lauwersoog en Zoutkamp),
het Oldambt, de Veenkoloniën, Westerwolde, het Westerkwartier en de
Wadkust. Rottumeroog en Rottumerplaat zijn Gronings maar onbewoond
natuurgebied (optioneel, zie Beslissingen). **Schiermonnikoog hoort bij
Friesland**; de veerboot vanuit Lauwersoog vaart daar wel heen.

### 1.2 OSM-tellingen (Overpass, 15 okt 2026)

Gemeten met `out count` binnen de provinciegrens (`ISO3166-2=NL-GR`),
neutrale User-Agent `GDE-Groningen-mapbuilder/1.0`. Een tweede ronde
(tellingen per deelgebied, hoogtetags, busroutes, dijken) kreeg drie keer een
502 "server at capacity"; die cijfers zijn hieronder geschat uit de lokale
caches in `data/` en gemarkeerd met *(s)*.

| Laag | Provincie | Huidige game | Factor |
|---|---|---|---|
| Gebouwen (ways) | **431.604** | stad 49.504 (veelhoeken) + Ommeland 118.255 (dozen) | 2,6× alles, 8,7× de veelhoeken |
| Autowegen (motorway t/m living_street) | **31.993** | stad ~5.850, Ommeland 10.310 | ~2× |
| Alle `highway`-ways (ook fiets, voet, erf, service) | **101.940** | stad 10.785 | 9,5× |
| Water (waterway + natural=water) | **20.580** (20.302 ways, 278 rel.) | stad 352 veelhoeken, Ommeland 665 waterwegen | ~20× |
| Spoor (`railway=rail`) | **1.093** ways | stad 193 | 5,7× |
| Stations en haltes (nodes) | **33** (plus enkele als vlak getekend, ~37 echt) | 3 in de stad, 9 in het Ommeland | 3× |
| Landuse (ways + rel.) | **94.820** | stad 2.778 "green" | 34× |
| Natuur (bos, heide, wetland, zand, strand) | **3.222** | – | – |
| Losse bomen (nodes) | **9.939** | stad 3.765 | 2,6× |
| Winkels + voorzieningen (nodes) | **15.813** | stad ~1.500 *(s)* | ~10× |
| Plaatsen (city/town/village/hamlet) | **592** | Ommeland 178 | 3,3× |

Dichtheid gebouwen: stad ~1.100/km², Ommeland-bbox ~230/km²
(133.350 in de ruwe cache), de rest van de provincie ~125/km²
(~298.000 over ~2.400 km²). De drukste tegel blijft dus de binnenstad
(~3.000-4.000 gebouwen per km²); de provincie is vooral *breed*, niet
*dicht*.

### 1.3 Van tellingen naar bestandsgrootte

Referenties uit de repo: `citymap.json` is 11,7 MB (2,7 MB gzip) voor 49.504
gebouwen met gemiddeld 7,5 punten (gebouwen alleen al 9,1 MB JSON, ~184 B per
gebouw). `ommeland.json` is 1,6 MB (0,5 MB gzip), `ommeland.bin` 2,26 MB
(al gzip). De download "Grunn downloaden… 15,1 MB" is dus vooral JSON.
Een Overpass-dump met geometrie kost ~850 B per element
(`data/groningen_raw.json`: 34 MB voor 40.361 elementen).

| Laag | Ruw (Overpass-JSON) | Gepakt binair (schatting) | Na gzip/brotli |
|---|---|---|---|
| Gebouwen 431,6k (int32 tegel-lokaal op 1 cm, delta + varint, type/hoogte/bron/dakvorm ~10 B) | ~370 MB | ~18 MB (~42 B/gebouw) | ~11 MB |
| Wegen 102k ways (punten + klasse, breedte, laag, brug) | ~90 MB | ~6 MB | ~4 MB |
| Landuse + natuur 98k vlakken | ~85 MB | ~9 MB | ~5 MB |
| Water 20,6k | ~20 MB | ~2 MB | ~1,5 MB |
| Spoor, POI's, plaatsen, bomen | ~25 MB | ~2 MB | ~1 MB |
| Afgeleid: navigatiegrafen, botsdata, kantstrook-slots | – | ~8 MB | ~4 MB |
| Hoogte (AHN, 8 m raster, int16 dm, delta) | – | ~12 MB | ~6-10 MB |
| Minimap-piramide (vooraf gerenderd, WebP) | – | ~10 MB | ~10 MB |
| **Totaal** | **~600 MB** | **~65 MB** | **~40-45 MB** |

De hele game is nu 178 MB (157 MB audio), dus de provincie maakt de download
~25 % groter. Dat is acceptabel, mits **niet alles bij de start geladen
wordt** (zie 2.4).

### 1.4 Geheugen en laadtijd

- Vandaag kost de stad als `GameMap` ~64 MB heap (de worker-kopie 33 MB na
  `slimWorkerMap`, `scripts/perf/mapmem.mjs`). De provincie in hetzelfde
  model zou ~400-600 MB per kopie kosten: **onhaalbaar zonder streaming**.
- Met streaming (L0/L1 tot ~1,5 km, L2 tot ~4 km) zit er nooit meer dan
  ~10-15 km² vol detail in het geheugen. In de binnenstad is dat ongeveer een
  kwart van de huidige stad; in de polder een fractie.
- Laadtijd nu ~6 s tot het titelscherm. Nieuw: index (< 1 MB) + tegels rond
  het spawnpunt (~2-4 MB) + de globale wegenlaag (~3 MB). Doel: ≤ 6 s,
  liefst sneller dan nu.

### 1.5 Schaal, projectie en precisie

**Hoe het nu zit.** 1 eenheid is bedoeld als 1 meter, met een vaste
equirectangulaire projectie: origin 53.2195 N / 6.565 O, `mPerDegLat =
110574` en `mPerDegLon = 66652,97` (`build_map.py` meta,
`fetch_ommeland.py` `LAT0`, `M_LAT`, `M_LON`). Nagemeten tegen de echte
afstand op de WGS84-ellipsoïde (Vincenty):

- `110574` is de waarde voor één breedtegraad **op de evenaar**. Op 53,2° is
  die 111.290 m, dus de stad is noord-zuid **0,64 % te klein**.
- `66652,97` is 0,23 % te klein; de echte waarde is ~66.808 m.
- De oost-west-schaal loopt bovendien weg met de breedtegraad: zie de
  laatste kolom van de tabel.

Binnen de stad is dat onzichtbaar (een gebouw van 50 m is 32 cm te kort),
maar het telt op over afstand. Ook komen AHN, BAG en de BGT (allemaal in RD)
er niet 1-op-1 op te liggen.

**Nauwkeurigheid** (gemeten met een los Python-script: Vincenty op WGS84 als waarheid, RD via
de Schreutelkamp-benadering, zelf ~1 m nauwkeurig):

| Afstand van de origin | Nu: fout in afstand tot de origin (slechtste richting) | RD New: idem | Nu: fout in 1 km oost-west op die afstand noord/zuid |
|---|---|---|---|
| 5 km | 32 m | 0,2 m | 1-3 m |
| 15 km | 97 m | 0,7 m | 1-5 m |
| 40 km | 260 m | 2,9 m (deels de benadering) | 6-11 m |

**Besluit (eigenaar): de wereldbouwer gaat over op RD New (EPSG:28992).**

- **Ware meters.** De schaalfout van RD rond Groningen is ~+30-70 ppm: 3-7 cm
  per km.
- **Hetzelfde stelsel als de bronnen.** PDOK, AHN, BAG, BGT en 3D BAG zijn
  allemaal RD, dus hoogtes en footprints vallen er 1-op-1 op.
- **Het spelframe:** `x = RD_x − 233.670`, `y = −(RD_y − 582.075)` (y blijft
  zuid, de origin is het RD-punt van de huidige origin, afgerond op de meter).
- **Gevolg 1: draaiing.** RD-noord wijkt rond Stad **0,94°** af van het ware
  noorden (meridiaanconvergentie). De zon, het kompas en `daynight.js`
  rekenen met het ware noorden; dat wordt één constante
  (`GRID_CONVERGENCE`).
- **Gevolg 2: alles verschuift één keer.** Elke bestaande coördinaat gaat
  `oud (x, y)` → lat/lon (exacte inverse van de oude constanten) → RD → het
  nieuwe frame. Aan de rand van de stad verschuift een punt tot ~25 m
  (schaal) + ~65 m (draaiing). Omdat kaart, plekken en saves dezelfde
  omzetting krijgen, blijft alles **op dezelfde echte plek** staan. Lokaal is
  de omzetting affien op < 1 cm per 10 m, dus een deur blijft in zijn gevel.
- **Migratie, op drie plekken:**
  1. **Kaartdata:** wordt toch opnieuw gebouwd door de wereldbouwer.
  2. **Handgeplaatste coördinaten in de code:** ~150 letterlijke getallen in
     ~25 bestanden (`rondvaartlines.js`, `rondvaartchase.js`,
     `paddepoel3d.js`, `sidejob_*.js`, `missions.js`, `trailer.js`,
     `flavour.js`, …). Een eenmalige codemod (`scripts/world/rebase_coords.mjs`)
     zet ze om, ook richtingen (hoeken krijgen de draaiing erbij). Of beter:
     de tabellen krijgen een `P(x, y)`-helper die bij het laden omrekent;
     daarna kan de codemod ze in één keer vastzetten. Spotcheck, ringcheck
     en de verhaaltest moeten na de omzetting groen zijn.
  3. **Saves:** `SAVE_VERSION` +1, met een stap in `savemigrate.js` die de
     speler, de eigen voertuigen, de afgeleverde auto's, markers en de
     camera omrekent. Fixtures in `save_migration_test.mjs` voor 0.28 in de
     stad én in het Ommeland.
- **Timing:** in F0, samen met het tegelformaat. Dan gebeurt het in één
  keer en zonder zichtbare verandering, behalve dat alles een paar procent
  "klopt".

**Float32 is te grof op 40 km.** Een float32 heeft daar ~4 mm resolutie;
de GPU rekent `modelView` in float32, wat trilling en z-fighting geeft. De
oplossing staat in 2.3.

## 2. Architectuur

### 2.1 Het tegelformaat (`.gdt`)

- **Rooster:** 1 km × 1 km, vast op het wereldframe; tegel `(i, j)` dekt
  `x ∈ [i·1000, (i+1)·1000)`. Sleutel `i_j`.
- **Tegel = binair blok** met een sectietabel (versie, type, offsets,
  lengtes), opgeslagen in packs (zie 2.4b). Posities **int32 tegel-lokaal in
  centimeters**, delta + zigzag-varint gecodeerd (2.4b); hoogtes in cm.
- **Secties:** gebouwen (veelhoek, hoogte, dak, type, gevelstijl, gaten en
  doorgangen), wegen (polylijn, klasse, breedte, rijstroken, eenrichting,
  laag, brug/tunnel, stoep/fietspad), kruispunten, water (veelhoek, lijn,
  peil, oever-type), landuse, bomen en puntobjecten, spoor, POI's en winkels,
  hoogte-raster, navigatie (weg-, fiets- en loopgraaf met poortknopen op de
  tegelrand), botsdata (statische colliders), kantstrook-slots, overlays.
- **Objecten over de rand:** een gebouw hoort bij de tegel van zijn
  zwaartepunt; een weg wordt op de rand geknipt met een gedeelde poortknoop.
  Zo is elke tegel los te laden en blijft de graaf heel. *(F0, zoals
  gebouwd: elk object staat met zijn `gid` in **elke** tegel die zijn grenzen
  raken, de laag houdt één kopie per `gid`; het knippen van wegen met
  poortknopen komt met de navigatiegraaf in F1.)* Het raster ligt op de
  RD-kilometerlijnen (tegelsleutel = de RD-kilometer van de zuidwesthoek,
  bijv. `234_581`).
- **Index (`world.idx`):** per tegel offset/grootte, een vlag (land, water,
  zee, leeg), het aantal gebouwen, de hoogste hoogte, de LOD2-samenvatting.
  Klein genoeg om bij de start te laden.
- **Globale lagen (altijd geladen):** de wegen vanaf `tertiary` als één graaf
  (~32k ways → ~3 MB, voor GPS en verre AI), spoorlijnen en stations,
  veerroutes, plaatsnamen, missie- en activiteitspunten, de
  minimap-piramide-index.
- **Container en codering:** zie 2.4b.

### 2.2 LOD-niveaus

| LOD | Afstand (bij 'ver') | Wat | Kosten |
|---|---|---|---|
| **L0** | 0 - 350 m (kort 150, heel ver 600) | alles zoals nu de stad: gevels, daken, wegdek met stoep en markering, straatmeubilair, bomen met stam, colliders, verkeer, voetgangers | worker-build per 250 m-cel, 2 ms/frame upload |
| **L1** | tot ~1,2 km | gebouw = extrusie + dak, wegen en water in de grond-shader, bomen instanced | één merge per tegel |
| **L2** | tot ~4 km | `farlod.js` per tegel: een draw per laag, kleur per landuse | vooraf of in de worker |
| **L3 horizon** | 4 - 40 km | per 4 × 4 km supertegel een silhouet (kerktorens, molens, windturbines, Eemshaven, de Martinitoren van overal), grondkleur uit de minimap-piramide, mist | vooraf gebakken, ~2 MB totaal |

De zichtafstand-instelling (`viewdist.js`) schuift alleen de grenzen. In de
heli of het vliegtuig krimpt L0 met de hoogte (op 150 m hoogte geen
straatmeubilair), en L1/L2 groeien.

### 2.3 Zwevende oorsprong (floating origin)

- De simulatie (spelers, voertuigen, physics) blijft in wereldmeters in
  JavaScript-doubles: geen precisieprobleem tot ver buiten de provincie.
- De **render-oorsprong** springt mee: is de camera > 2 km van de huidige
  render-oorsprong, dan verschuift de scène-wortel (één `position.set` op een
  wortelgroep, plus een uniform `uRenderOrigin` voor de shaders die
  wereldposities lezen: grond, water, wind, schaduwen, nachtlicht).
- Tegelgeometrie wordt **tegel-lokaal** gebakken (nu bakt de stad absolute
  coördinaten in de vertices, zie ARCHITECTURE.md "Units"). Dat is de
  grootste refactor van F0: `models3d_buildings.js`, `roadsurface.js`,
  `quaywalls.js`, `farlod.js`, `terrain3d.js`, `staticbatch3d.js`,
  `geokernels.js`.
- Alles wat een wereldpositie aan three.js geeft gaat via één helper
  (`toRender(x, y)`), te controleren met een lint-regel in de tests.

### 2.4 Streaming

- **Bron:** één streamingpad voor Electron en web, alleen de bytebron
  verschilt (zie 2.22): beide doen `fetch` met een `Range`-header, Electron
  op `app://game/…` (het eigen protocol in `desktop/main.js` beantwoordt
  ranges al met 206), het web via HTTP met een OPFS-cache (2.4b).
- **Wat laden:** een kegel in de rijrichting. Laadstraal
  `r = LODgrens + v · t_vooruit`, met `t_vooruit` = 10 s.

| Voertuig | Snelheid | Vooruit laden (10 s) | Nieuwe tegels per minuut |
|---|---|---|---|
| Lopen / fiets | 2-8 m/s | 80 m | < 1 |
| Auto (A7, N-weg) | 33-40 m/s | 400 m | 2-3 rijen = 8-15 tegels |
| Trein | 30-39 m/s (route bekend) | langs het spoor, 2 km vooruit | ~10 |
| Heli | 40-60 m/s | 600 m, L0 kleiner met hoogte | ~15 |
| Vliegtuig | 60-80 m/s | 800 m, alleen L1-L3 boven 200 m | ~20 (L1) |

- **Begroting:** een L0-tegel (stadscentrum) kost ~30-60 ms worker-tijd en
  ≤ 2 ms per frame op de hoofdthread (upload, in stukken). Bij 40 m/s komt
  er elke 25 s een rij van 3-5 tegels binnen: ruim binnen budget.
- **Sprongen** (snelreizen, respawn, laden van een save, cutscène elders):
  de bestemming laadt achter een overgang (de treinrit-cinematic duurt nu
  7,8 s). Minimaal L0 rond de bestemming klaar vóór de overgang eindigt.
- **Prioriteit:** speler > missiedoel > camera-pad van een cutscène
  (bestaat al: "Cutscenes laden details rond de camera") > vooruit > zijkant.
- **Uitruimen:** LRU met hysterese: uitladen op `r + 300 m`. Vastgepinde
  tegels: actief missiedoel, eigen auto, safehouse, de garage waar je net
  was.
- **Geheugenbudget:** JS-heap kaartdata ≤ 150 MB; GPU ≤ 1,2 GB op Hoog,
  ≤ 600 MB op Laag. Een 30-minutentest mag niet groeien (> 50 MB).

### 2.4b Streamingtechniek: de keuzes

Zo eenvoudig mogelijk, maar zonder werk op de hoofdthread dat niet hoeft.
Elke keuze wordt in F0 gemeten op 20 representatieve tegels (binnenstad,
dorp, polder, haven, zee). Valt een alternatief > 20 % beter uit, dan wint
dat.

**Opslag en codering**

| Onderwerp | Keuze | Overwogen | Waarom |
|---|---|---|---|
| Wat we verzenden | **vectordata** (footprints, polylijnen, rasters); de meshes bouwt de worker | kant-en-klare meshes per tegel | vector is 5-10× kleiner, en de bestaande kernels (`geokernels.js`) maken de meshes al |
| Posities | **int32 tegel-lokaal in centimeters**, opgeslagen als delta + zigzag-varint (zie de volgende rij); hoogtes int32 in cm t.o.v. NAP | int16 op 5 cm; float32 | 1 cm is getrouwheid boven grootte (0.1): stoepranden, rijstrookgrenzen en hoogteprofielen houden hun vorm. Na delta-codering kost 1 cm in plaats van 5 cm ~2-3 bits per coördinaat extra, ~+15-20 % op de wegen- en gebouwsecties. Tegel-lokaal blijft de basis voor de zwevende oorsprong |

(En in §1.3 de eerste tabelrij: "int16 tegel-lokaal op 5 cm" → "int32 tegel-lokaal op 1 cm, delta + varint"; de schatting ~15 MB → ~18 MB.)
| Lijnen en veelhoeken | **delta + zigzag-varint**, kolomgewijs per sectie (alle x'en, dan alle y'en, dan de attributen) | rijgewijs; Protobuf/FlatBuffers | kolommen comprimeren 20-40 % beter; geen schema-runtime nodig; FlatBuffers is groter |
| Vooraf gebakken meshes (L3-horizon, iconen, GLB's) | **meshopt** (`EXT_meshopt_compression`, MIT, decoder in three) | Draco | meshopt decodeert ~10× sneller met een kleine WASM, en werkt goed samen met zstd; Draco is iets kleiner maar trager en zwaarder (decoder ~300 KB, blokkerend) |
| Compressie in rust | **zstd met een getraind woordenboek per sectietype** (decoder `fzstd`, MIT, in de worker); fallback gzip via `DecompressionStream` | gzip; brotli | kleine tegels winnen veel bij een woordenboek (schatting 15-30 % kleiner dan gzip); zstd decodeert sneller dan brotli in JS; GitHub Pages laat ons geen `Content-Encoding` kiezen, dus we comprimeren zelf |
| Container | **packs van 8 × 8 km** (~1-4 MB, ~100 per provincie) met een index (offset, lengte, hash per tegel); web: **HTTP Range**-verzoeken per tegel; Electron: dezelfde Range-`fetch` via het eigen `app://`-protocol (2.22; de OS-paginacache doet de rest) | een bestand per tegel | 3.000 losse bestanden zijn traag in installers, zips en cache-API's; met Range is het nog steeds één verzoek per tegel. In dev-modus schrijft de bouwer wel losse bestanden (makkelijk te diffen) |
| Versies en cache | header `GDT` + formaatversie + bouwerversie; per tegel een **xxHash64** in de index; packs heten naar hun hash (`hogeland-3f9a….gdp`) | datum/versie in de URL | een gewijzigde tegel krijgt automatisch een nieuwe sleutel; ongewijzigde tegels blijven in de cache bij een update |

**Decoderen en bouwen**

| Onderwerp | Keuze | Waarom |
|---|---|---|
| Workers | **pool van `min(4, cores − 2)`**, minimaal 1; dezelfde module als `geoworker.js` | laat kernen over voor de hoofdthread, de GPU-proces en de audio; meer dan 4 helpt niet (de upload is de grens) |
| Pijplijn per tegel | worker: ophalen → zstd → decoderen → bouwen (L0/L1/L2-geometrie, colliders, graaf) → typed arrays terug als **transferables** | **nul parsing op de hoofdthread**: die wikkelt alleen arrays in een `BufferGeometry` |
| SharedArrayBuffer | alleen voor gedeelde lees-lagen (de globale wegengraaf, het hoogteraster rond de speler), in Electron of als `crossOriginIsolated`; anders een kopie | SAB vraagt COOP/COEP-headers die GitHub Pages niet zet; transferables zijn net zo snel voor eenmalige data |
| Annuleren | `AbortController` op de fetch; een **generatietoken** per tegel (zoals `buildToken` in `cityprops`): een resultaat voor een tegel die niet meer gewenst is, wordt weggegooid vóór de upload | geen werk aan tegels die al achter je liggen |
| Prioriteit | score = afstand − (snelheid × 8 s) × cos(hoek met de rijrichting) − routebonus (GPS-route, spoorlijn, heli-koers: −500 m) − 300 m als de tegel in beeld is; een missiedoel en het camerapad van een cutscène krijgen voorrang | wat je straks ziet eerst, wat achter je ligt nooit |
| Hysterese | laden op `r`, uitladen op `r + 300 m` én pas na 10 s buiten bereik | geen laad-/uitlaadflitsen bij heen-en-weer rijden of cirkelen met de heli |

**Upload en geheugen**

| Onderwerp | Laag | Gemiddeld | Hoog |
|---|---|---|---|
| Upload en scène-wijziging per frame (hoofdthread) | 1,5 ms | 2 ms | 3 ms |
| Budget voor gedecodeerde tegeldata (RAM, LRU) | 150 MB | 250 MB | 400 MB |
| GPU-geheugen (geometrie + texturen) | 500 MB | 800 MB | 1,2 GB |

- De **uploadwachtrij** knipt grote buffers in stukken
  (`addUpdateRange`) en houdt het frame-budget aan. Wat er niet in past
  schuift door; als iets binnen L0 dreigt te komen voordat het klaar is, wordt
  het budget eenmalig verdubbeld (zoals nu na een sprong).
- **Twee caches:** de gedecodeerde data (compact, voor herbouwen zonder
  netwerk) en de GPU-meshes. Ze hebben elk een eigen LRU en budget.
  Uitruimen geeft de geometrie vrij (`disposeObject`, zoals nu).
- **Web-cache:** packs in **OPFS** (snel, bestand-achtig, groot quotum),
  met IndexedDB als terugval. De index gaat via `no-cache` + ETag; de
  packs en code met een hash in de naam zijn `immutable`. De service worker
  (`sw.js`) blijft voor code en audio.
- **Vooraf laden:** het laadscherm haalt de index, de globale lagen en de
  tegels rond het spawnpunt (L0-L2). Bij **snelreizen** begint het ophalen
  al bij het kiezen in het menu, en de cinematic dekt de rest. **Versneld
  treinrijden** haalt de hele corridor in L1 vooraf.

**Tekenen**

| Onderwerp | Keuze | Waarom |
|---|---|---|
| Herhaalde objecten | **instancing** (bomen, props, turbines, palen, auto's in de berm), zoals nu | één draw per soort per cel |
| Gebouwen en wegen per tegel | **`BatchedMesh`** (three r160, multi-draw via `WEBGL_multi_draw`) per tegel en materiaal, met zichtbaarheid per object | vervangt het her-samenvoegen van `staticbatch3d.js`: een gebouw verbergen of vervangen hoeft niet meer de hele cel te herbouwen |
| Materialen | **vaste set van ~30 gedeelde materialen** voor de hele wereld; variatie via vertexattributen en lagen van een **texture array** (gevels, daken, bestrating) | een nieuwe tegel brengt nooit een nieuw shaderprogramma mee |
| Texturen | **KTX2/Basis** (transcoder in de worker, Apache-2.0) voor alle meegeleverde texturen | 4-6× minder GPU-geheugen, sneller uploaden |
| Culling | frustum per cel van 250 m, afstand per LOD, kleine objecten weg onder een schermgrootte; **geen echte occlusie-queries** | het land is vlak; alleen de binnenstad zou winnen, en daar doen de cellen het al goed |
| Shaders opwarmen | per *tegeltype* (combinatie van materialen en defines), zodra het eerste exemplaar in de prefetch zit, met `KHR_parallel_shader_compile` (het bestaande systeem in `scene3d.js`) | geen compileer-haperingen bij de eerste haven of het eerste wad |

**Botsen en stralen**

| Onderwerp | Keuze | Waarom |
|---|---|---|
| Voertuigen en lopers | een **2D-raster per tegel** (cellen van 16 m) met footprints, muren, stammen en hekken; gebouwd in de worker | de game botst in 2,5D (zoals nu); het raster is compact en snel |
| Camera, kogels, bruggen, iconen | **three-mesh-bvh** (MIT) per mesh met echte 3D-vorm, in de worker gebouwd en geserialiseerd (`MeshBVH.serialize`) als transferable | alleen waar het nodig is, zodat er geen BVH voor elk huis is |

**Meetbare budgetten** (gecontroleerd door de stresstest in 4.2)

| Meting | Doel |
|---|---|
| Decoderen per tegel (worker) | ≤ 3 ms |
| L0 bouwen per tegel (worker) | binnenstad ≤ 60 ms, dorp ≤ 25 ms, polder ≤ 10 ms |
| L1 / L2 bouwen | ≤ 10 ms / ≤ 5 ms |
| Ophalen per tegel | Electron ≤ 5 ms; web p95 ≤ 150 ms (warme cache ≤ 10 ms) |
| Upload per frame | het budget uit de tabel hierboven, p99 ≤ 1,5× budget |
| Geheugen per tegel | data: binnenstad ≤ 2 MB, polder ≤ 0,3 MB; GPU L0: binnenstad ≤ 25 MB, polder ≤ 4 MB; L2 ≤ 0,3 MB |
| Te laat (L0 niet klaar binnen `r0 − 50 m`) | 0 keer per testrit |
| Speelbaar na een sprong | Hoog ≤ 3 s, Laag ≤ 6 s |

### 2.5 Eén bouwer voor stad en platteland ("wereldbouwer")

- **Bron:** een Geofabrik-extract (`groningen-latest.osm.pbf`, ODbL) of
  Noord-Nederland voor de randen, lokaal verwerkt met pyosmium of osmium.
  Geen Overpass voor de hele provincie: vriendelijker voor de servers,
  reproduceerbaar en offline. Overpass blijft voor kleine aanvullingen.
- **Pijplijn** (`scripts/world/`): `extract` → `normalize` (tags, klassen,
  zoals nu `process_osm.py` doet) → `derive` (hoogtes, kruispunten,
  doorgangen, kades, kavels en sloten, kantstroken, winkels, horeca,
  garages, verkeerslichten: de huidige `add_*.py` stappen maar zonder
  "stad-bbox") → `overlay` (handwerk) → `tile` (knippen, graaf, colliders)
  → `pack` → `audit`.
- **Determinisme:** zelfde input geeft byte-gelijke tegels (seed per tegel,
  gesorteerde invoer). `geocheck` vergelijkt per tegel.
- **Incrementeel:** een tegel hertekent alleen als zijn bron (inclusief een
  rand van 50 m) verandert. Een volledige build op de MacBook: doel < 15 min.
- **Afleidingen die nu "stad" of "Ommeland" zijn worden regels**, per
  landuse en wegklasse. Bijvoorbeeld: een `brink` ontstaat bij elke kerk met
  een plein (nu `countryvillage.js`), een kade bij elk water in bebouwd gebied
  (nu `quaywalls.js`), straatmeubilair per wegklasse en bebouwingsdichtheid
  (nu `cityprops.js`/`streetclutter.js`), sloten en erven uit
  landbouwkavels (nu `countryfield.js`).

### 2.6 Wat nu afhangt van de splitsing stad/Ommeland, en hoe het één wordt

| Nu | Bestanden | Wordt |
|---|---|---|
| Stad als één JSON + grid | `mapdata.js` (`GameMap`), `main.js` laden, `geoworker.js` (eigen kopie) | `TileWorld` met dezelfde query-API (`buildingsNear`, `roadsNear`, `waterNear`, `nearestRoadPoint`, `groundHeightAt`, `isOnBridge`, `escapeBuilding`) over de geladen tegels. Eerst als façade, zodat systemen niet allemaal tegelijk om hoeven |
| Echt Ommeland apart | `countryreal.js` (`REAL`, `buildingsInTile`, `pushOutOfReal`, `realBlocked`, `clearOfReal`) | verdwijnt; gebouwen zijn gewoon gebouwen, met hun echte veelhoek |
| Stadsrand-masker | `countryedge.js` (edge mask, 48 m lookup), `countrybake.js` (weg-SDF in textuur), `edgeDistance` | verdwijnt; de grond-shader leest per tegel een raster met wegen, landuse en water (de bake-techniek blijft, de rand niet) |
| Procedurele polders en `realZone` | `countryfield.js`, `countrywatergeo.js`, `countryplan.js` | kavels en sloten als afleiding in de bouwer; procedureel alleen buiten de provinciegrens |
| Twee gebouwmodellen | `models3d_buildings.js` (stad) vs `countrybuilding.js` (gevel-shader) | één generator met L0-L2; de gevel-shader wordt de L1-variant |
| Twee prop-systemen | `cityprops.js`, `streetclutter.js` vs `countryside.js` (160 m tegels), `ommelandprops3d.js`, `countryvillage.js` | één scatter per cel, regels per landuse/wegklasse |
| Twee water-systemen | `scene3d.js` water + `quaywalls.js` vs `countrywater.js` | één: veelhoeken + lijnen met breedte en peil, oevers per regel; `wideWaterAt`/`wideDitch`/`overOpenWater` worden één test (open punt 11 in de pariteit) |
| Twee far-LOD's | `farlod.js` (stad) vs `countryskyline.js` | één L2 per tegel + L3-horizon |
| Twee routegrafen | `routing.js` (`inCity`, stadsgraaf) vs `countryroute.js` | één graaf per tegel + globale hoofdwegenlaag, hiërarchische A* (HPA*): ver via de globale laag, aan de uiteinden via de tegels |
| Twee verkeerssystemen | `vehicle.js` populatie vs `countrylife.js` (`countryDrive`, wissen bij `edgeDistance > 60`) | één verkeer op de tegelgraaf, dichtheid uit wegklasse en bebouwing; `countryDrive` verdwijnt in `v.road` |
| Politie alleen op stadswegen | `police.js` `findSpawnPoint`, wegversperringen, boten | spawnen op de tegelgraaf, overal; volgers rijden via de graaf, niet `_direct` door weilanden |
| Twee botsingen | `collision.js` + `elevation.js` walls vs `countrywalls.js`, `countryplan` solids, `ommelandfun.js pushOut` | één collider-set per tegel (gebouwen, muren, stammen, hekken, meubilair), één hoekprobe-functie |
| Camera-straal | `scene3d.js` vs `countrycam.js` `countryRayHit` | één straaltest tegen de colliders |
| Hoogte | `elevation.js` (alleen de ring), `terrain3d.js`, Ommeland "plat" | hoogteraster per tegel (AHN) + kunstwerken uit OSM (`layer`, `bridge`, `tunnel`) |
| Minimap en kaart | `mapview.js`, `hud_panel.js`, `countrymap.js` (`drawCountryMinimap`) | één piramide (z0 = hele provincie, z6 = 2 m/px), vooraf gerenderd voor L≥3, live voor details; stadsplaatsen en dorpsuitjes op dezelfde laag (open punt 4) |
| Veilige plekken | `spotcheck.js` (aparte Ommeland-tak), `safety.js` ("nearest street" vs "nearest real road") | één soliditeitsquery en één "dichtstbijzijnde weg" |
| Geparkeerde auto's | `parkedcars.js` (`countrySlots` + `villageKerbs` overlappen) | kantstrook-slots uit de bouwer |
| Treinen | `railway.js` (routes in `citymap.json`) + `ROUTE_EXT` in `add_ommeland.py` + `stationtravel.js` | spoorlaag globaal; alle lijnen en stations echt, rijdende treinen over de hele lijn |
| Overige stadschecks | `heliflight.js`, `cheats.js`, `flavour.js`, `skyprops.js`, `ownedvehicles.js`, `garages.js` ("Waar staat hij?" noemt een stadswijk), `viewdist.js` (`propRadius`), `sfx/ambience.js` (stadsgroen) | lezen landuse/plaatsnaam uit de tegel; wijken worden "plaats + wijk" |
| Ommeland-extra's | `worldends.js`, `dorpsuitjes.js`, `ommelandplace.js`, `geheimen.js` | blijven, maar lezen uit de tegelwereld en krijgen provinciebrede lijsten |

### 2.7 Terrein, water en de kust

- **Hoogte:** AHN (DTM, 5 m, CC0) resampled naar 8 m per tegel, int16 in
  decimeters, delta-gecodeerd. Groningen is grotendeels −1 tot +3 m NAP;
  wat wél reliëf geeft:
  - **zeedijken en kanaaldijken** (8-10 m): als vectorobject met profiel uit
    AHN, zodat de kruin scherp blijft;
  - **wierden/terpen** (tot ~6 m, Ezinge, Warffum, Usquert): rond, uit AHN;
  - **de Hondsrug-rand** en de zandgronden in Westerwolde (tot ~15 m);
  - **opgespoten Eemshaven** en de **verdiepte Ring Zuid** (bestaat al).
- **Waterpeil per waterlichaam** (meetpunt uit AHN of vast per type), niet
  meer één `WATER_Y`. Sluizen zijn een overgang tussen twee peilen (setpiece
  in Delfzijl, Zoutkamp, Lauwersoog).
- **Zee en Wadden:** één zeevlak met eb en vloed (sinus, periode 12 u 25 min
  speltijd, ~3 m verschil bij Delfzijl, ~2,5 m bij Lauwersoog). Wadplaten
  komen bij eb droog: een natte-zand-shader op het bathymetrie-raster
  (Rijkswaterstaat vaklodingen, zie licenties). Dat maakt wadlopen en
  "vastgelopen op het wad" mogelijk. Eerste versie (F2) mag vaste
  vloed hebben; getij in F5.
- **Dollard en Eems:** zee met kwelders, slik en een kale horizon met
  windturbines. Duitsland aan de overkant als L3-silhouet.

### 2.8 Physics, navigatie en AI per tegel

- **Colliders** per tegel bij het bouwen afgeleid en mee-geladen met L0
  (gebouwen, muren, hekken, stammen, meubilair). Buiten L0 bestaat er geen
  physics behalve voor verre AI op de graaf ("kinematisch rijden").
- **Grafen:** rijweg, fietspad en voetpad per tegel, met poortknopen op de
  rand. De globale laag (hoofdwegen) zit altijd in het geheugen voor GPS en
  verre politie.
- **Verkeer:** dichtheid per wegklasse × bebouwing × tijdstip; op de A7
  vrachtverkeer, op dijkwegen trekkers en fietsers. Auto's buiten L0 die
  belangrijk zijn (achtervolger, missiewagen) rijden door op de globale laag.
- **Politie:** regionale bureaus uit OSM (`amenity=police`, bestaat al voor
  de stad). Buiten de bebouwde kom minder patrouilles maar snellere auto's.

### 2.9 Saves

- Posities worden één keer omgerekend naar het RD-frame (1.5), in de
  migratiestap die ook `world: 'provincie-1'` toevoegt (`SAVE_VERSION` +1,
  `savemigrate.js`). Die omrekening is een pure functie die gedeeld wordt met
  de codemod en de bouwer.
- Ids van plekken die nu "stad" of "Ommeland" zijn (garages, dorpsuitjes,
  wereldeinden) blijven bestaan; nieuwe plekken krijgen nieuwe ids.
- Een save die een speler buiten de oude kaart neerzet kan pas vanaf de
  provincieversie; een oudere game leest hem niet (de bestaande regel voor
  saves uit de toekomst).
- `scripts/save_migration_test.mjs` krijgt een fixture uit 0.28 met speler
  en auto in het Ommeland.

### 2.10 Wat bestaande systemen moeten doen

| Systeem | Verandering |
|---|---|
| Missies (`missions.js`, `missionstory.js`) | doelen kunnen in elke tegel; een missie pint haar tegels; `resolveTarget` vraagt de tegelwereld |
| Plekken (winkels, garages, horeca, padel, bijbaantjes) | uit de bouwer per tegel, niet uit `meta.*` van de stad |
| `spotcheck.js` | per tegel; draait in de build-audit en in de verhaaltest |
| `passagecheck.js` / `passages.js` | per tegel, provinciebreed |
| `ringcheck.js` | blijft voor de ring, plus dezelfde probe voor de A7, A28 en N-wegen ("wegcheck") |
| `country_route_test.mjs` | wordt `world_route_test.mjs`: elke autoweg in een steekproef van tegels in beide richtingen |
| `geocheck.sh` | per tegel byte-gelijk (main thread vs worker vs vorige build) |
| `viewdist_estimate.mjs` | telt per LOD in de drukste en de leegste tegel |
| Minimap, kaart (M) | piramide, ontdekking (zie het verhaal-document: "mist van de kaart"), zoom tot de hele provincie |
| Verhaaltest (`--story-test`) | draait de provinciemissies ook, met sprongen tussen regio's |

### 2.11 Hoogte, wegen en kunstwerken: één oplosser voor weg, spoor en water

#### Waarom de ring een hoofdpijndossier was

De ring kostte tientallen rondes. Uit de geschiedenis komen dertien
oorzaken, in acht families:

| # | Oorzaak | Commits |
|---|---|---|
| A1 | Hoogtes uit OSM-tags **per way**, heuristisch opgelost over een vertexgraaf met afgeronde posities als sleutel; kruisingen vlak bij elkaar trekken beide wegen scheef | `eab1f5e0`, `4e592539` (handpatch Expositielaan) |
| A2 | Op- en afritten en rijbanen die in plan overlappen worden **los** opgelost; de koppelaar kwam later, treden bleven | `eab1f5e0` (1.958 → 1.230 m treden), `e8b24a77` |
| B3 | "Op welk oppervlak sta ik?" is **stateloos en dubbelzinnig**: hoogste-binnen-een-stap-omhoog, `STAY_ON`, eindkappen | `e8b24a77`, `0cd25889`, `c2073e07`, `e58d174d` (~1.800 keer naast de weg gekozen) |
| B4 | Systemen gebruiken **verschillende hoogtequeries en hints** (+0,3/+0,5, `spawnZ`, de z van de leider) | `93bba1fd` (`spawnZ` fout op 371 van 1.020 rondepunten), `b26c10cb`, `4d45e37d`, `36b3c038` |
| C5 | Elke way-mesh **los** gebouwd → scheuren, dichtgeplakt met alleen-getekende platen, vloeren, rokken en kopstenen | `4017c2c7`, `b37dad02` (5.951 m zwevende randen), `6063ccdc`, `734568f8`, `2f73190f`, `ab6e5c33` |
| C6 | Grond weggehaald met een **rastermasker van ~1 m**, niet met geometrie | `4017c2c7`, `fd9aea6a`, `719e6478`, `3aa2e3b2` |
| D7 | Linten, terrein, groen en taluds **coplanair zonder eigenaar** → z-fighting, polygon offsets | `3b3a94d0` (12.738 m²), `3aa2e3b2`, `2d2cbb8c`, `1b68e019`, `58429efe` |
| E8 | Muren afgeleid door oppervlakken **met toleranties af te tasten** → een collider op de rijstroken van een andere weg; getekend en massief gescheiden | `a5f086d4` → `7f170d90` (N46), `60b473c3`, `e5044475` |
| E9 | Botsen via **z-banden per muursoort** | `e5044475`, `2739e57c` (pijlercolliders negeren de hoogte) |
| F10 | 2D-plaatsing **weet niets van hoogte**: bomen, palen, rommel en pijlers achteraf weggefilterd | `e8b24a77`, `00bbe4c0` (258 bomen), `e1178d73` |
| G11 | Waterkruisingen **geraden** (`markDryCrossings`), het tunneldak onder het kanaal met 5 m-steekproeven | `00bbe4c0`, `8e792816` |
| G12 | Het spoor tilt op met **radiale bulten** en eigen constanten, gespiegeld in `railway3d.js` | `e8b24a77`, `2739e57c` |
| H13 | Kunstwerken **per weg** herbouwd, plus een kopie in de worker → pieken en een consistentiecheck | `f9dc3b37`, `0cc09e6d` |

Het model nu: `scripts/add_elevation.py` zet `road.z` per vertex
(`LIFT` 6, `SUNK` −6,5, `UNDER_WATER` −8,2, `CLEAR` 5,6, `MAX_GRADE` 5 %);
`elevation.js` (`buildElevation`, `groundHeightAt`, `roadZAt`, `ceilingAt`,
`offLevelAt`, `lowerSurfaceAt`, de muren, `openCutMask`);
`roadstructures3d.js` (`structureArrays`, `buildOverpassDeck`,
`buildRailDecks`); `cutmask3d.js`; `railway.js` `railZ`/`railLiftZ`.
Controles: `ringcheck.js` (`probeRingSolids`, `driveRingLap`,
`driveWaterCrossings`, `probeRailLifts`), `scripts/ring_probe.mjs`,
`passagecheck`, `spotcheck`, `mesh_audit.mjs`, `overhang_audit.mjs`,
`zfight_audit.mjs`, `cine_ring_check.mjs`, `geocheck`.

**De les:** hoogte is geen eigenschap van een way maar van een **netwerk**,
en tekenen, botsen en rijden moeten uit **één profiel** komen. De provincie
heeft honderden viaducten, spoorbruggen, aquaducten en beweegbare bruggen;
met het huidige model wordt elk daarvan een ring.

#### Het ontwerp

**1. Terrein en oppervlakken apart.**

- **Terrein** = AHN DTM (maaiveld zonder gebouwen en kunstwerken) als raster
  per tegel (`heights`, 2.7). Het terrein weet niets van wegen.
- **Oppervlakken** = alles waar je op rijdt, loopt of vaart: wegen, spoor,
  paden, perrons, kades, water. Elk is een **lint** (middellijn + breedte +
  verticaal profiel) of een vlak met een peil.
- Waar een lint en het terrein verschillen, ontstaat **geometrie**: talud,
  keermuur, landhoofd, pijler, tunnelwand. Geen masker (C6), geen
  coplanaire lagen (D7): het lint is eigenaar van zijn strook, het terrein
  wordt daar in de bouwer uitgesneden (constrained triangulation langs de
  lintrand).

**2. Het verticale profiel per verbonden netwerk.**

De oplosser (`scripts/world/profile.py`) werkt per **verbonden netwerk**
(wegen die elkaar in knopen raken, inclusief op- en afritten en parallelle
rijbanen), niet per way (A1, A2). Invoer:

| Bron | Wat |
|---|---|
| OSM `bridge`, `tunnel`, `layer`, `level`, `bridge:structure`, `embankment`, `cutting` | volgorde: wie ligt boven wie |
| AHN DTM-samples op de middellijn (elke 2-5 m) | het maaiveld eronder |
| AHN DSM-samples op dekken | de echte dekhoogte van viaducten en bruggen (het DSM ziet het dek) |
| `maxheight`, `maxheight:physical` | ondergrens voor de vrije hoogte eronder |

Randvoorwaarden:

| Voorwaarde | Weg | Spoor |
|---|---|---|
| Maximale helling | snelweg 4 %, N-weg 5 %, stad 6-8 %, oprit 6 % | hoofdspoor 1,25 %, uitzonderlijk 2,5 % |
| Verticale bogen | afgeronde knikken, straal ≥ 1.000 m (snelweg), ≥ 300 m (stad) | straal ≥ 5.000 m |
| Continuïteit | gelijke hoogte en helling in elke knoop en bij elke samenvoeging (C5) | idem, ook bij wissels |
| Vrije hoogte onder dek | weg 4,6 m (snelweg 4,8 m), fietspad 2,5 m | 6,0 m boven bovenkant spoorstaaf (bovenleiding) |
| Over water | vaarwegklasse (zie hieronder) boven het peil | idem |
| Tunnels | dak ≥ 0,5 m onder maaiveld of ≥ de vaardiepte onder de waterbodem | idem |

De oplosser is een **kleinste-kwadratenprobleem per netwerk** (zachte
termen: dicht bij AHN en DSM; harde termen: knoopgelijkheid, vrije
hoogtes, helling), opgelost met een sparse solver (scipy, MIT/BSD).
Uitvoer per lint: hoogte in cm per vertex + per segment de laag-id.

**3. Eén hoogtequery voor alles.**

```
surfaceAt(x, y, state) → { z, normal, kind, ribbonId, layer, deck }
```

- `state` is de **toestand van de vrager**: op welk lint hij nu staat. Wie op
  een viaduct rijdt, blijft op het viaduct tot hij het lint verlaat via een
  knoop of over de rand valt. Geen "hoogste binnen een stap" meer (B3).
- **Iedereen** gebruikt hem: rijden (`vehicle.js` `surfaceUnder`,
  `settleVehicleHeight`), lopen (`player.js`), AI en politie, spawnen
  (geen `spawnZ`-hints meer, B4), camera (`scene3d.js`, `camerapath.js`
  `roofAt`, `cinedrive.js` `pathHeights`/`groundPose`), props en plekken
  (`spotcheck.js`, `cityprops.js`).
- **Colliders én render-meshes uit hetzelfde profiel**, in dezelfde
  worker-run, één keer per tegel (H13). Geen afgetaste muren (E8): een
  muur is een rand van een lint met een hoogteverschil, met een bekend
  bovenste en onderste lint, dus geen z-banden (E9).
- **2D-plaatsing vraagt `surfaceAt`** (F10): een boom op een talud krijgt de
  taludhoogte, een paal op een dek staat op het dek, niets staat in een
  lint dat het niet bezit.
- `elevation.js` blijft de façade: `groundHeightAt(x, y, zHint)` wordt een
  dunne laag over `surfaceAt` met de toestand van de vrager.

**4. Kunstwerken uit het profiel.**

- **Taluds** waar het lint boven het terrein ligt (helling 1:2, `EMB_SLOPE`),
  **keermuren** waar geen ruimte is (stad, langs een ander lint),
  **landhoofden** aan elk brugeinde, **pijlers** op een vaste steek onder
  dekken (niet in een rijbaan of vaargeul: de oplosser kent de linten eronder).
- **Dekken** met dikte, rand en **leuning** (`bridgerails.js` blijft de bron
  voor de stukken; leuningen sluiten aan op de profielrand).
- **Tunnels**: wanden, dak, portalen en verlichting uit het profiel.
- **Geen rastermasker** (`cutmask3d.js` verdwijnt in F1): de bouwer snijdt
  het terrein met geometrie.

**5. Spoor.**

- Eigen profiel **per spoornetwerk** (lange verticale bogen, lage hellingen),
  met taluds en spoorbruggen; de radiale bulten van `railLiftZ` (G12)
  verdwijnen.
- **Overwegen**: weg en spoor krijgen in de knoop **exact dezelfde hoogte**
  (harde term in beide netwerken); `railway.js` `getLevelCrossings` leest de
  knoop.
- **Perrons** 0,76-0,84 m boven de bovenkant spoorstaaf (NL-norm),
  perronrand op de juiste afstand van het spoor.
- **Bovenleiding**: palen en draad met vaste hoogte boven het profiel;
  vrije hoogte onder bruggen telt de draad mee.
- **Treinphysics en camera** (`railway.js`, `traindrive.js`,
  `railway3d.js`) lezen hetzelfde profiel; `FLAT_DECK_Z` en
  `inRailBridgeZone` verdwijnen.
- Audit: **elke lijn van kop tot staart** rijden (Groningen–Leeuwarden,
  –Roodeschool/Eemshaven, –Delfzijl, –Nieuweschans, Zuidbroek–Veendam,
  –Assen, het museumspoor): geen sprong, helling binnen de grens, vrije
  hoogte overal.

**6. Water.**

- **Peil per waterlichaam** (`water`: `level_cm`), niet meer één `WATER_Y`
  (`util.js`): grachten en Reitdiep, Van Starkenborghkanaal, Eemskanaal,
  Winschoterdiep, maren en sloten (polderpeil), en de **zee met een vaste
  hoogwaterstand** (getij pas in F5, 2.7).
- **Kades en oevers** uit het verschil tussen peil en terrein:
  kademuur in bebouwd gebied (nu `quaywalls.js`), talud of beschoeiing
  erbuiten.
- **Sluizen** waar peilen wisselen (`waterway=lock_gate`, `lock=yes`): een
  kolk met twee deuren als object, een setpiece voor boten.
- **Bruggen met echte doorvaarthoogte**: vast of **beweegbaar**
  (`bridge:movable=bascule|lift|swing|draw`). Beweegbare bruggen gaan open
  voor boten (slagbomen, rood licht, wachtende auto's) en zijn een kans voor
  achtervolgingen.
- **Eén waterquery** `waterAt(x, y) → { level, depth, body, navigable,
  clearanceAbove }` voor boten (`vehicle.js` `updateBoatAI`,
  `drivePlayerBoat`), zwemmen (`swimmers3d.js`), de heli (`heliflight.js`
  landen op water = nat) en `overOpenWater`. `waterindex.js` blijft de
  index; `waterClearance`/`countryClearance` worden één veld.
- Audit: **elke bevaarbare waterweg varen** per bootklasse
  (`boattypes.js`: sloep, rondvaartboot, politieboot, binnenvaart):
  doorvaarthoogte en diepte per klasse, nergens over land, geen gaten in de
  kademuur.

**7. Kruisingen van alle drie.** Weg over spoor over water (bijv. bij
Martenshoek en het Eemskanaal) zitten in **dezelfde oplosser en dezelfde
audit**: de volgorde komt uit de lagen, de vrije hoogtes uit de klassen.

**8. Audits per tegel** (`scripts/world/audit_profile.mjs`, veralgemeniseert
`ringcheck` en `ring_probe`):

- **elke weg in beide richtingen rijden** op ontwerpsnelheid met de echte
  voertuigphysics (headless): geen haker, sprong, gat of wegzakken;
- voegafstand en hellingsprong per knoop (< 1 cm, < 0,5 %);
- vrije hoogte per kruising per klasse;
- geen blokkerende geometrie op een rijbaan (pijler, paal, boom, muur);
- z-fighting: geen twee oppervlakken binnen 2 cm zonder eigenaar
  (`zfight_audit.mjs` per tegel);
- zwevende randen en overhang (`mesh_audit.mjs`, `overhang_audit.mjs`).

**Debuggereedschap:** een profieloverlay (lengteprofiel van het lint onder
de speler met AHN, DSM en de buren), en kleuren per helling of per laag in
de wereld (dev-vlag), zodat een fout een plaatje is in plaats van een getal.

**Tegeldata:** `roads` en `rails` krijgen per vertex `z_cm` en per segment
`layer`, `deck`, `structure` (`bridge`/`tunnel`/`embankment`/`cutting`/
`ground`); `structures` (dekken, pijlers, landhoofden, keermuren, tunnels,
sluizen) als eigen sectie, al geometrie; `water` met `level_cm` en
`navigable_class`; `bridges` met `clearance_cm`, `movable`. De oplosser
draait over tegelgrenzen (netwerken zijn groter dan een tegel) en knipt pas
daarna.

**Fase:**

- **F0:** de velden in het formaat; het skelet van de oplosser en de
  audit-harness waar dat gaat (op de huidige `road.z` als invoer). **De
  huidige ring blijft op `add_elevation.py` + `elevation.js` tot F1**;
  `ring_probe` en `ringcheck` moeten op 0 problemen blijven.
- **F1:** de oplosser voor de corridor (ring, A7-oost, N360, N46, het spoor
  naar Delfzijl en Eemshaven, Eemskanaal); de ring overgezet en
  vergeleken met de huidige (shotsdiff + `ringcheck` op 0).
- **F2:** provinciebreed, sluizen, beweegbare bruggen.

### 2.12 Rijstroken

**Bekende fout (schaal-audit punt 9):** `process_osm.py` geeft elke way de
standaardbreedte van zijn klasse (`ROAD_SPEC`: `motorway` 12 m, `trunk`
12 m, `primary` 10 m). Bij een gescheiden rijbaan is elke rijrichting een
eigen eenrichtings-way, dus krijgt elke helft de breedte van de **hele**
weg. `roadsurface.js` telt de stroken als `round(width / 3,3)` (en de shader
`floor(rw / 3,1)`): op de A7 staan zo 3-4 stroken per richting waar er 2
horen.

**Het model per weg** (`roads`):

| Veld | Bron |
|---|---|
| `lanes`, `lanes_fwd`, `lanes_bwd`, `lanes_both` | `lanes`, `lanes:forward`/`backward`, `lanes:both_ways`; default per klasse en `oneway` |
| `turn_fwd`, `turn_bwd` | `turn:lanes`, `turn:lanes:forward`/`backward` (per strook: `left`, `through`, `right`, `merge_to_*`) |
| `width_cm` | `width`, `est_width`; anders som van de strookbreedtes + kantstroken |
| `placement` | `placement`, `placement:forward` (`left_of:2`, `middle_of:1`, `transition`): waar de OSM-lijn in het profiel ligt |
| `bus_lanes`, `bike_lanes` | `bus:lanes`, `psv:lanes` (leest `add_map_extras.py` nu al), `cycleway=lane`/`track`, `busway` |
| `shoulder` | `shoulder`, en op snelwegen standaard een vluchtstrook rechts |
| `lane_w_cm` (per strook) | per klasse, zie hieronder |

**Strookbreedtes (NL):** snelweg 3,50 m, N-weg buiten de kom 3,00-3,25 m,
stad 2,75-3,25 m, busbaan 3,25 m, fietsstrook 1,50-2,00 m, vluchtstrook
2,50-3,50 m.

**Gescheiden rijbanen** zijn twee eenrichtingslinten, elk met zijn eigen
stroken, geplaatst met `placement` (de OSM-lijn ligt meestal in het midden
van de rijbaan, niet op de as van de hele weg). De middenberm is wat er
tussen de linten overblijft.

**Eén model voor iedereen:**

- **lintbreedte** in de bouwer (2.11);
- **markering** (`roadsurface.js`): strookstrepen, pijlen uit `turn:lanes`,
  bus- en fietsstroken in rood asfalt of met belettering, **in- en
  uitvoegstroken** met taper bij op- en afritten, doorgetrokken streep vóór
  een kruispunt;
- **AI** (`vehicle.js` `updateTrafficAI`) volgt een strook, voorsorteert
  op `turn:lanes` en wisselt alleen waar de streep onderbroken is;
- **GPS** (2.16) tekent de route op de juiste strook en zegt "houd links";
- **verkeerslichten** (`trafficlights.js`): de beschermde linksaf-fase komt
  uit een echte linksafstrook, niet meer uit "de weg is breed genoeg".

**Audit:** per way het aantal stroken en de breedte tegen de OSM-tags
(rapport met afwijkingen), en de tapers op de ringaansluitingen en de A7
(geen strook die uit het niets begint of in een vangrail eindigt).

**Fase:** F0 de velden in het formaat en een **afwijkingsrapport** op de
huidige kaart (welke ways te breed zijn); F1 het nieuwe model in de bouwer
en `roadsurface.js` opnieuw voor de corridor.

### 2.13 Kruispunten en rotondes

Nu: `junctions.js` (knopen via afgeronde posities, `roadPriority` uit een
klasserang, `autoSignals`, `yieldArms` met haaientanden en het B6-bord),
`trafficlights.js` (vaste-tijdregelingen zonder conflicten, per as een
groenfase, beschermd linksaf, en de **Groningse fietsfase**: alle fietsers
en voetgangers tegelijk groen), `pedroutes.js` (`zebraSpeedLimit`) en
`routing.js`. Dat model is goed; het moet **één object per knoop** worden
dat iedereen leest.

**Per kruispunt** (`junctions`, sleutel = de OSM-knoop, niet een afgeronde
positie):

- **Geometrie:** het kruispuntvlak uit de inkomende linten met
  **bochtstralen** per hoek (vrachtwagen-proof op N-wegen), zonder overlap
  of z-fighting (het vlak is eigenaar, de linten stoppen op de stopstreep);
  stoepranden, middeneilanden, opstelvakken voor fietsers.
- **Rotondes** uit `junction=roundabout`: ring met vaste breedte,
  **splitsereilanden** op elke tak, een **fietspad rondom** (in de kom:
  fietsers in de voorrang, buiten de kom niet, zoals in NL gebruikelijk;
  uit `cycleway` en `crossing`-tags), schuine opritten.
- **Regeling:** verkeerslichten met fasen per toerit (en per strook uit
  2.12); `give_way`/`stop`; voorrangsweg (`priority_road`); de NL-default
  **rechts heeft voorrang** op gelijkwaardige kruisingen; rotondes: de ring
  heeft voorrang.
- **Per toeritstrook:** stopstreep of **haaientanden**, opstelvak,
  voorsorteerpijlen.
- **Oversteken:** zebra's, fietsoversteken (blokmarkering), met of zonder
  licht; bushaltes (`highway=bus_stop`, `public_transport=platform`) met
  hun kant van de weg.

**Eén model, alle gebruikers:** de render (vlak, markering, borden, palen),
de AI (in de rij staan, gaten in het verkeer, afslagpaden als bogen,
voorrang verlenen, rotonde in en uit met richtingaanwijzer), voetgangers
(`pedroutes.js`: oversteken op zebra of bij groen) en politie-achtervolgingen
(die door rood mogen, maar dezelfde afslagpaden gebruiken).

**Audit:** elke toerit heeft stopstreep of haaientanden die passen bij de
regeling; geen twee conflicterende stromen tegelijk groen
(`streamsCompatible` als test over alle regelingen); een **AI-simulatie**
(headless, versneld) door de drukste kruispunten en rotondes van elke regio:
geen deadlock, geen botsing, doorstroming boven een minimum.

**Fase:** F0 het datamodel en het auditrapport op de huidige kaart; F1 de
herbouw (geometrie + AI) in de corridor; F2 provinciebreed.

### 2.14 Straatmeubilair en details

Nu: `cityprops.js` (banken, prullenbakken, fietsenrekken, terrassen,
marktkramen; per cel samengevoegd), `streetclutter.js` (kliko's,
ondergrondse containers, paaltjes, bloembakken, reclamezuilen, abri's,
wegwijzers, kasten), `streetsigns.js` (straatnaambordjes),
`countrysigns.js` (plaatsnaamborden en blauwe wegwijzers),
`nightlights3d.js` (lantaarns elke 28 m langs de wegrand, op regel),
`bridgerails.js`, `elevation.js` (vangrails langs verhoogde wegen,
`BARRIER_H`), `flitspaal.js`. Vrijwel alles is **regelwerk zonder
OSM-plek**.

**Wat erbij komt, met bron:**

| Object | Gemapt (OSM) | Regel als OSM leeg is |
|---|---|---|
| Vangrail | `barrier=guard_rail` | snelweg- en N-wegbermen, middenbermen, bruggen en hun aanloop, opritten, langs water dichter dan 4 m |
| Geleiderail bij kunstwerken | `barrier=guard_rail` | elke pijler en elk landhoofd binnen de obstakelvrije zone |
| Lantaarnpalen | `highway=street_lamp` (+ `lamp_mount`, `light:count`) | per wegklasse: snelweg hoge masten (alleen waar echt verlicht, zie 2.20), stad palen met arm (28-35 m), dorp lantaarns (40 m), buitenwegen niets |
| Verkeersborden en portalen | `traffic_sign=*`, `highway=traffic_signals`, `destination=*`, `destination:ref`, `junction:ref` | portalen met echte bestemmingen en afritnummers op snelwegen (ANWB-stijl blauw/wit, **zonder merk**), voorrangsborden uit 2.13 |
| Paaltjes, afzettingen | `barrier=bollard`, `barrier=gate`, `barrier=lift_gate` | bij fietspadingangen en voetgangersgebieden |
| Geluidsschermen | `barrier=wall` + `wall=noise_barrier` | geen |
| Hekken | `barrier=fence`, `barrier=hedge` | langs spoor, weilanden (als 2.15 dat niet al doet) |
| Abri's | `shelter=yes` bij `highway=bus_stop` | bij elke halte in de kom |
| Banken, prullenbakken, fietsenrekken | `amenity=bench`, `waste_basket`, `bicycle_parking` | per bebouwingsdichtheid (nu `cityprops.js`) |
| Camera's | `man_made=surveillance`, `highway=speed_camera` | geen (flitspalen blijven gameplay, `flitspaal.js`) |
| Drempels | `traffic_calming=bump|table|cushion` | 30-zones in woonwijken |
| Hectometerbordjes | geen in OSM | elke 100 m langs snelwegen en N-wegen, met het echte hectometergetal waar `ref` + afstand het toelaat |

**Tegeldata:** sectie `furniture` (soort, positie in cm, hoek, variant,
hoogte uit `surfaceAt`, `src`: `osm`/`rule`/`overlay`). **Gemapte objecten
staan per tegel**; **regelobjecten genereert de bouwer**, deterministisch
met een seed per tegel, zodat ze in elke build en elke worker op dezelfde
plek staan (geocheck). Colliders voor alles wat je kunt raken; breekbaar
via `breakables.js` zoals nu.

**Audit:** niets op een rijbaan, fietspad of in een doorgang; geen
lantaarn in een boom; vangrail aaneengesloten (geen gat van < 5 m); elke
portaalbestemming bestaat in de globale laag.

**Fase:** F0 de sectie en de omzetting van wat nu procedureel staat; F1 de
regels en OSM-objecten in de corridor; F2 provinciebreed.

### 2.15 Bomen en groen op hun echte plek

Nu: `process_osm.py` leest `natural=tree` (nodes) en `natural=tree_row`
(bemonsterd elke 6 m, `TREE_ROW_SPACING`); de stad heeft 3.765 bomen, de
provincie heeft er 9.939 gemapt. `treeprops.js` maakt ze breekbaar,
`scene3d.js` (`syncTrees`) tekent ze, `grass.js` en `countryside.js` vullen
het groen.

**Bronnen, in volgorde:**

1. **OSM-bomen** (`natural=tree`, met `species`, `genus`, `leaf_type`,
   `height`, `circumference` waar getagd).
2. **Bomenrijen** (`natural=tree_row`): echte steek uit de tag of 8-10 m.
3. **Bossen en parken** (`landuse=forest`, `natural=wood`, `leisure=park`)
   met `leaf_type`/`leaf_cycle`: verspreid op een Poisson-schijf, dichtheid
   per type.
4. **Heggen** (`barrier=hedge`, lijn), **gras, weide en akker**
   (`landuse=grass|meadow|farmland`), **bloemperken**
   (`landuse=flowerbed`), **bermen** (de strook tussen lint en sloot).
5. **Optioneel:** de bomenbestanden van gemeenten (de gemeente Groningen
   publiceert er een) en **detectie uit AHN** (DSM − DTM, hoge punten
   buiten gebouwen). AHN is CC0, dus de detectie is licentie-schoon; de
   gemeentelijke bestanden alleen als de licentie expliciet open is
   (**te checken per gemeente**, opnemen in 4.3). Wat er niet in mag, gaat
   er niet in.

**Model:** laag-poly varianten per soort (linde, eik, beuk, es, populier,
wilg, berk, plataan, den, fruitboom), elk in 3-4 groottes. **Echte hoogtes:**
volwassen straatbomen 12-20 m, populieren langs dijken tot 25-30 m,
knotwilgen 4-6 m. Zonder tag: soort uit de omgeving (populier langs
kanalen, linde bij kerken en op de brink, eik op de zandgronden) en hoogte
uit AHN als die er is. **Stamcolliders** voor alles in L0.

**Tegeldata:** `trees` (positie, soort, hoogte in dm, kruindiameter,
`src`); `green` als vlakken met type; heggen als lijnen.

**Audit:** geen boom op een rijbaan, in een gebouw of in water (via
`surfaceAt`, 2.11); de bomen per tegel tegen de OSM-telling.

**Fase:** F0 sectie + omzetting; F1 soorten en hoogtes in de corridor;
F2 provinciebreed; de optionele bronnen pas na de licentiecheck.

### 2.16 Navigatie en GPS

Nu: `routing.js` (stadsgraaf met `inCity`, `findWalkPath`,
`setUserWaypoint`, `getRouteAhead`), `countryroute.js` (Ommelandgraaf met
gateways naar de stad), `goal.js` (missiedoelen), `mapview.js` (kaart M),
de minimap in `hud_panel.js`. Er is **geen enkele afslagbeperking**:
`restriction`-relaties worden niet gelezen.

**Eén routegraaf over de tegels** (HPA*, 2.6):

- **Knopen en takken** per tegel (`nav`), poortknopen op de rand; de
  **globale laag** (vanaf `tertiary`) voor lange routes, ook naar tegels die
  niet geladen zijn.
- Respecteert **rijstroken** (2.12) en **afslagbeperkingen**
  (`type=restriction`: `no_left_turn`, `only_straight_on`, …, met `via`-knoop
  of -way), eenrichting, `no_entry`, `access`, `bus`-only en
  `psv`-only, en de wegklasse (kosten = tijd).
- Het **kruispuntmodel** (2.13) geeft per afslag de kosten (wachttijd bij
  licht, voorrang).
- **Modi:** auto, lopen (voetpaden, zebra's), fiets (fietspaden,
  `oneway:bicycle=no`), boot (waterwegen met doorvaarthoogte per klasse,
  2.11).

**Tonen:**

- de route **op het wegdek** op de juiste strook en de juiste hoogte (een
  lijn onder een viaduct is geen lijn op het viaduct);
- op de minimap en de kaart;
- pijl en stemhints ("Over 300 meter rechts, houd links");
- **snel herberekenen** bij een gemiste afslag (< 100 ms, incrementeel vanaf
  de huidige tak);
- een waypoint **klikt vast op het dichtstbijzijnde bereikbare punt op het
  juiste niveau** (brug of eronder, kade of water).

**Test** (`world_route_test.mjs`, 4.2): willekeurige paren over de
provincie, en **elke weg in beide richtingen** bereikbaar waar dat mag.
`country_route_test.mjs` en `bus_route_test.mjs` blijven groen.

**Fase:** F0 graafdata per tegel + globale laag + de harness op het huidige
gebied (`country_route_test` en `routing` blijven slagen); F1 de nieuwe
router met afslagbeperkingen in de corridor; F2 provinciebreed, boot- en
fietsmodus.

### 2.17 Echte voorzieningen (POI-laag)

Een andere agent bouwt nu een laag met **echte voorzieningen**:
ziekenhuizen, huisartsenposten, politiebureaus, tankstations, brandweer,
ambulanceposten, apotheken, stations. Met `nearestFacility(kind, x, y)` voor
respawn en "gepakt" (nu `respawn.js` met `meta.careSites` en
`meta.policeStations`). Opslag in lat/lon, omgezet met de
projectiehelper (`rdnew.js` `wgsToWorld`).

- **Sectie `pois`** in het tegelformaat: `kind`, `name` (zonder merk),
  `entrance` (het punt waar je naar binnen gaat of afgezet wordt, op de
  juiste kant van de weg), `tags` (openingstijden, `emergency=yes`).
- In F1 verhuist de laag naar de tegels; de **globale laag** houdt een
  index per soort, zodat `nearestFacility` ook naar een niet-geladen tegel
  wijst.
- De **projectie-API blijft stabiel** (`wgsToWorld`, `worldToWgs`): de
  aanroepers merken de verhuizing niet.

**Fase:** F0 de sectie gereserveerd; F1 de verhuizing.

### 2.18 LOD tijdens cutscènes

Nu: `scene3d.js` laat de wereld streamen rond `world.streamFocus` (het
punt waar de camera naar kijkt, hooguit 50 m van de lens,
`STREAM_LOOK_MAX`), en `cinematics.js` `playCinematic({ prewarm })` bouwt
vooraf rond opgegeven punten (`prewarmStreamAt`); de flyover warmt vier
samples van zijn pad op. Dat werkt binnen de stad. Met tegels en
cutscènes kilometers van de speler is het te weinig.

**Regels:**

- **De streamer volgt de camera**, niet de speler.
- **Shotlijsten vooraf:** elke cutscène-bron registreert haar shots vóór ze
  begint: `cinematics.js` (shots, drone en orbit), establishing shots ver van
  de speler, `trailer.js` en de benchmark-modus, `intromontage.js`, de
  fotomodus en terugkijken, de kaartvoorvertoning (`mapview.js`
  `setMapTeleport`). Per shot: camera + kijkpunt + brandpuntsafstand.
- **Pre-roll:** tegels en L0 rond de camera **en** het kijkpunt van elk shot
  worden geladen vóór de cut. Niet klaar? Dan houdt de vorige shot iets
  langer (≤ 1 s), of valt hij terug op een shot dichterbij. **Nooit** lage
  LOD of gaten in beeld.
- **Budget:** tijdens een cutscène staat de gameplay stil, dus de
  L0/L1-straal wordt groter en de LOD-bias schuift naar het frustum
  (wat in beeld is eerst, wat erachter ligt nooit).
- **Geen LOD-wissel binnen een shot:** de LOD-staat wordt per shot
  vastgezet; overgangen alleen bij een cut, met een korte cross-fade.
- **Wijde shots:** schaduwafstand en far-LOD afgestemd op het shot
  (een heli-shot over het Hogeland heeft andere schaduwen dan een close-up).
- **Shaders opwarmen** voor wat het shot ziet (tegeltypes, 2.4b).

**Test** (`scripts/world/cine_lod_test.mjs`, uitbreiding van
`cine_ring_check.mjs`): render elk shot van elke cutscène headless; tel
ontbrekende tegels en LOD-wissels binnen een shot. Doel: 0 en 0.

**Fase:** F0 de shotlijst-API en de streamer op de camera; F1 pre-roll en
vastzetten; F5 de tuning van wijde shots.

### 2.19 Weer in de provincie

**Eis van de eigenaar: het is altijd zomer** ("Zomer vol misdaad"). Geen
seizoenen, geen herfst, winter of lente, geen sneeuw of ijs. Deel 4 speelt in
de **nazomer**: gouden licht, oogst, Gronings Ontzet (28 augustus), en dat is
het verste.

Nu: `weather.js` heeft één globale toestand (`world.weather`: `intensity`,
`kind` uit `motregen`/`regenbui`/`onweer`/`storm`, `windAngle`, `overcast`,
`mist`) met `Math.random`-buien; `world.storyFreePlay` "beëindigt de
zomer" en zet storm aan. `puddleAt` en `roadGrip` bestaan al.
`daynight.js` en `sky3d.js` doen de lucht.

**Wat verandert:**

- **Geen einde van de zomer:** `storyFreePlay` laat het weer met rust.
  De zware storm blijft als zeldzame **zomerstorm** (onweer met harde
  windstoten), niet als seizoen.
- **Een weermodel voor de provincie**, deterministisch uit speltijd + seed
  (zodat tegels, cutscènes en een geladen save hetzelfde weer zien):
  - **fronten uit zee** (meestal uit het noordwesten) die over de kaart
    trekken met een snelheid en een breedte;
  - **regionale verschillen:** zeemist en meer wind aan de Wadkust en bij
    Lauwersoog, buien die zich boven het Hogeland vormen, helderder
    landinwaarts (Westerwolde);
  - **van ver te zien:** regengordijnen, wolkenschaduwen over de akkers,
    mistbanken boven het wad en de maren.
- **Soorten zomerweer:** zonnig, hitte (trillende lucht boven het asfalt),
  zomerbuien, onweer, kustmist en wind, en af en toe de **grijze Groningse
  zomerdag**. Deel 4: nazomer met lage zon en oogststof.
- **Gameplay:** natte weg = minder grip (`roadGrip`), plassen (`puddleAt`),
  wind op de heli, boten en fietsers, minder zicht voor de politie (en voor
  jou), geluid (regen op het dak, onweer in de verte), NPC's met paraplu's
  en **minder fietsers** bij regen.
- **Feesten alleen op echte zomerdata:** Gronings Ontzet (28 aug), de
  kermis (`kermis.js`), oogst, zomerfestivals. **Geen Koningsdag.** Carbid
  blijft alleen de bestaande activiteit (`carbid.js`).

**Tegeldata:** geen weer in de tegels; wel per tegel een **klimaatklasse**
(kust, wad, klei, veen, zand) en de afstand tot de kust in de globale laag.
**Runtime:** één functie `weatherAt(x, y, t) → { rain, wind, fog, cloud,
kind }`, door iedereen gelezen (rendering, physics, AI, audio).

**Gevolgen elders in dit document:** in F5 vervalt "seizoensevents
(oogst, carbid, winter-ijs)" → "zomer- en nazomerevents (oogst, Ontzet,
kermis)"; beslissing 10 (winterinhoud) vervalt: geen winter, ook niet als
los event.

**Fase:** de haken (`weatherAt`, determinisme, geen einde van de zomer) in
F0/F1; regionale buien en fronten in F2; volledig (mistbanken, gordijnen,
NPC-gedrag, audio) in F5.

### 2.20 Dag en nacht over de provincie

Nu: `daynight.js` heeft één klok (`world.clock`, een speldag duurt 24
minuten, `DAY_LENGTH_S`), een vaste zonsdeclinatie (15°) en een gekozen
middagrichting die al op het RD-rooster is gedraaid (`NOON_BEARING` +
`GRID_CONVERGENCE` uit `rdnew.js`). `calendar.js` geeft de verhaaldatum
(augustus 2026, Ontzet op de 28e, daarna september).
`nightlights3d.js` zet lantaarns op regel (elke 28 m, een pool van 11 echte
lampen), `countryglow.js` gloeivlekken in het Ommeland.

**Eén klok, één kalender.**

- De globale klok plus de **spelkalender** (een andere agent breidt
  `calendar.js` uit: eind augustus - september) bepalen zon en maan:
  **declinatie per datum** (eind aug ~+9°, half sep ~+3°), echte azimut.
- Zo **gaat de zon onder boven het Wad en het Lauwersmeer** (NW) en **komt
  hij op boven de Dollard** (O-NO), met de **lange zomerschemering** van het
  noorden.
- **Rooster-noord:** de wereld is RD New, rooster-noord wijkt rond Stad
  0,94° af van het ware noorden (`GRID_CONVERGENCE`, al toegepast op de
  zon). Over de provincie loopt dat van ~0,6° (Grijpskerk) tot ~1,5°
  (Nieuweschans); `rdnew.js` `gridConvergenceAt(x, y)` wordt bij elke
  verschuiving van de render-oorsprong (2.3) opnieuw gelezen.

**Nachtlicht per tegel, uit data:**

| Bron | Licht |
|---|---|
| Lantaarns (2.14, per wegklasse) | aan bij schemering |
| Ramen per gebouwtype en tijd | woningen 's avonds, kantoren uit, boerderijen met erfverlichting |
| Kassen | oranje gloed |
| Eemshaven, Delfzijl | industrieel licht, de fakkel |
| Windturbines | **rode obstakellichten, synchroon knipperend** (zoals echt) |
| Vuurtorens | draaiende bundel |
| Kerken | aangelicht tot middernacht (beslissing 15) |
| Snelweg | verlichting **alleen waar die echt is** (`lit=yes`) |

**Far-LOD 's nachts:** lichtpunten en -strepen. Dorpen als lichtclusters,
koplampstrepen op de A7, zodat de provincie vanuit de heli leest als een
echte nachtkaart.

**Budget:** geclusterd/forward+ of gebakken lichtpunten (instanced
sprites); **geen schaduwen per lamp**, behalve een paar (speler,
politie, zoeklicht). Hetzelfde licht bij elke tegel-load en elke cutscène
(deterministisch, uit de tegel). Verkeer, voetgangers en politie 's nachts
volgens 2.21.

**Tegeldata:** `lights` (positie, soort, kleur, ritme) als afgeleide
sectie; ramen als vertex-attribuut op de gebouwen (`buildings`: `win_night`).

**Fase:** haken (kalender, declinatie, `lights`-sectie) F0/F1; volledig
nachtlicht F2 (tegels) en F5 (far-LOD, tuning).

### 2.21 Verkeer en voetgangers in de hele provincie

Nu: `vehicle.js` (`manageTrafficPopulation`, `manageBikePopulation`,
`manageScooterPopulation`, `manageBusPopulation`, `manageBoatPopulation`),
`trafficfleet.js` (wagenpark per wijk-stereotype), `countrylife.js` (een
handvol trekkers, fietsers en bootjes in de mist), `pedestrians.js` +
`pedroutes.js`, `police.js`, `emergency.js`, `railway.js`. Twee werelden,
twee populaties.

**Dichtheid uit echte data:**

- wegklasse en stroken (2.12), **intensiteits-proxies** (wegklasse,
  bebouwing, bestemmingen; de open intensiteitsdata van Rijkswaterstaat
  alleen als de licentie het toelaat, **te checken**);
- bevolkings- en gebouwdichtheid (BAG), POI's (winkels, scholen, stations,
  2.17);
- tijdstip: **spits op de A7, A28 en N-wegen**, een drukke Grote Markt,
  stille polderwegen met af en toe een trekker, **fietsers tussen dorpen**,
  voetgangers bij winkels, stations, haltes en het strand, joggers en
  hondenuitlaters op de dijken.

**Simulatie-LOD:**

| Afstand | Wat |
|---|---|
| L0 | volle AI met physics (zoals nu) |
| Middenveld (~0,4-2 km) | **virtueel verkeer**: agenten bewegen over de graaf zonder physics, zodat spawnen en verdwijnen consistent zijn en je koplampen in de verte ziet |
| Ver | niets, behalve 's nachts lichtstrepen op snelwegen (2.20) |

- **Spawnen en verdwijnen alleen buiten beeld**; budgetten per
  kwaliteitsstand.
- **Overdracht tussen tegels zonder verdwijnen:** een agent leeft op de
  graaf, niet in een tegel.
- **Wagenpark per regio** (`trafficfleet.js` wordt per regio):
  landbouwverkeer, vrachtwagens naar Eemshaven en Delfzijl, bussen op echte
  lijnen (3.3), treinen op een grove dienstregeling (3.2).
- **Voetgangers per plektype**, oversteken bij zebra of licht (2.13),
  reageren op speler en politie.
- **Hulpdiensten** vertrekken vanaf echte posten (2.17); politie en
  wanted schalen per regio (2.8).

**Eén systeem:** `countrylife.js` en `countryDrive` gaan op in de
populaties van `vehicle.js`; fietsers, scooters en bussen idem.

**Test** (`scripts/world/traffic_soak.mjs`): een soak per regio, versneld,
headless: geen deadlocks, geen kettingbotsingen, geen agenten in gebouwen of
water, binnen het perf-budget.

**Fase:** F1 één verkeer en politie in de corridor (al gepland); dichtheid
en virtueel verkeer F2; regio-wagenpark en voetgangergedrag F3; de laatste
tuning F5.

### 2.22 Streaming in Electron en web

**Eén streamingpad voor beide:** dezelfde `TileWorld`, workers, budgetten,
LRU en prefetch. Alleen de **bytebron** verschilt.

**Hoe Electron de game nu serveert:** `desktop/main.js` registreert een
eigen, bevoorrecht protocol `app://` (`standard`, `secure`,
`supportFetchAPI`, `corsEnabled`, `stream`) en laadt
`app://game/index.html`. `protocol.handle('app', serve)` leest bestanden
uit de `game`-map (in het pakket `resources/game`) en **beantwoordt
`Range`-verzoeken al met 206** (`fh.read` op de offset; nu voor audio en
video), met `cache-control: no-cache`. Er is geen IPC of `fs`-toegang in
de preload nodig.

Gevolg: **Electron en web doen precies hetzelfde**, `fetch(packUrl, {
headers: { Range } })`. In Electron gaat dat via `app://game/world/…`, op het
web via HTTPS. (Dit vervangt de "`fs.read` via de preload" in 2.4 en 2.4b.)

| | Electron | Web |
|---|---|---|
| Bron | packs in `resources/game/world/` via `app://` + Range | packs via HTTPS + Range (GitHub Pages ondersteunt Range) |
| Cache | geen extra cache nodig (OS-paginacache) | OPFS, IndexedDB als terugval (2.4b) |
| Alles bij de start laden | **nee**, ook niet in Electron | nee |

**De bytebron is inplugbaar:**

```
interface ByteSource { read(pack, offset, length, signal) → Promise<ArrayBuffer> }
```

- `FetchRangeSource` (beide platforms), met `AbortController` (2.4b);
- later eventueel een `RemoteSource` die packs op verzoek downloadt naar de
  gebruikersmap (download-on-demand). **Geen hosting nu**; de interface
  houdt de deur open.

**Te doen en te verifiëren in F0:**

- `serve()` opent en sluit het bestand per verzoek; meten bij ~15 tegels
  per minuut, en zo nodig een kleine LRU van open bestandshandles in het
  hoofdproces;
- verifiëren dat `fetch` op `app://` **vanuit een worker** werkt (het
  protocol is `supportFetchAPI`; anders haalt de hoofdthread de bytes en
  geeft ze als transferable door);
- `scripts/devserver.py` ondersteunt nu **geen Range**: in F0 toevoegen,
  anders werkt de webversie lokaal niet zoals op Pages;
- de "laad alles"-paden verdwijnen (nu laden beide platforms
  `citymap.json` en `ommeland.*` in zijn geheel).

**Test:** de streamingtests (4.2) draaien op beide bytebronnen; een
headless test met `FetchRangeSource` tegen de devserver en tegen een
`app://`-nabootsing geeft byte-gelijke tegels.

**Fase:** F0.

### 2.23 Reismodi: waypoints, routes, minimap en kaart per modus

Eén routegraaf (2.16), **één stijl per reismodus**. De modus volgt uit wat de
speler doet (te voet, op de fiets, in een auto of boot, trein, bus, heli of
vliegtuig) en kan op de kaart worden gekozen.

| Modus | Route en waypoint | Markering in de wereld | Minimap en kaart |
|---|---|---|---|
| Lopen | kortste weg over voetpaden, trappen, zebra's, door doorgangen; veerpont | chevrons op de grond | ingezoomd; voetpaden, gebouwingangen, winkels |
| Fiets | fietspaden en fietsstraten, `oneway:bicycle=no`, nooit snelwegen | chevrons in fietspadkleur | fietspaden benadrukt |
| Auto en andere voertuigen | stroken, afslagbeperkingen, schakelaar "snelwegen voorkeur" | chevrons op de juiste strook | zoom volgt snelheid; wegklassen; strookpijl bij kruispunten; flitspalen en tankstations |
| Boot | bevaarbare waterwegen, doorvaarthoogte per bootklasse, beweegbare bruggen, sluizen | boeien | water benadrukt, land gedempt; brughoogte, boeien, sluizen, ligplaatsen |
| Trein | stations en lijnen, overstappen, "uitstappen bij" | stationsbord | lijndiagram met volgende halte en aankomsttijd |
| Bus | lijnen en haltes (OSM-relaties) | haltebord | lijn, haltes, volgende halte |
| Heli en vliegtuig | rechte lijn met hoogteadvies, no-fly-zones, landingsplaatsen (helipads, velden) | 3D-ringen en een landingspad | uitgezoomd; terrein en herkenningspunten; hoogteband; landingsplaatsen; no-fly-zones; noord-boven optioneel |

- **Ketens:** modi schakelen binnen één route, bijvoorbeeld lopen → station →
  trein → lopen. Elke schakel is een knoop in de graaf met een wisselkost.
- **Kaart (M):** dezelfde lagen, legenda en routestijl per modus, met een
  **modusknop** (lopen, fiets, auto, boot, OV, lucht) die standaard de huidige
  modus kiest. OV toont het trein- en busnet, lucht de landingsplaatsen en
  no-fly-zones, boot de waterwegen, bruggen en sluizen.
- **Minimap:** past zich aan met een vloeiende overgang bij het wisselen;
  instellingen krijgen per modus zoom en draaien/noord-boven.
- **Test:** de routetest (2.16) dekt elke modus: per modus willekeurige paren,
  en de toegangsregels hieronder.

**Toegang per modus (wettelijk).** De graaf kent per tak en per modus een
toegangsvlag uit de OSM-tags: `foot`, `bicycle`, `motor_vehicle`,
`motorcar`, `access`, `highway=motorway|trunk` met `motorroad=yes` (alleen
auto's), `cycleway`, `footway`, `path`, `pedestrian`, `bus`/`psv`-only,
`private`.

- **Routering** stuurt nooit lopend of fietsend over een snelweg of autoweg,
  en nooit een auto over een fietspad of voetpad.
- **Gameplay:** lopen of fietsen op een snelweg (of met een brommer over een
  voetpad) kan **fysiek**, maar is een **overtreding**: eerst een waarschuwing,
  na een respijt **wanted +1**; de kaart toont zulke wegen als "niet voor jou".
- **Tegeldata:** `roads` krijgt `acc` (bitmasker: voet, fiets, brom, auto,
  bus, hulpdienst) uit de tags; `nav` herhaalt het per tak.

**Fase:** F0 de toegangsbits en het datamodel; F1 routering per modus in de
corridor; F2 provinciebreed; de modusgebonden kaart en minimap bij de
HUD-ronde (F3).

### 2.24 De rand van de wereld

**Speelgebied:** de provincie plus een **buffer van 3-5 km** in Friesland,
Drenthe en Duitsland op L1/L2-detail, zodat wegen doorlopen en de horizon
nooit leeg is. Daarbuiten loopt de L3-horizon tot 40 km. **Nergens een gat.**

**Rand op de weg:** op elke weg die de bufferrand kruist een **grappige
terugkeer**, als uitbreiding van de bestaande wereldeinden (`worldends.js`):

- Friesland: een Friese wegversperring met neven van Durk en Douwe;
- Drenthe: een hunebed op de weg, "Drenthe is dicht";
- Duitsland: een verzonnen "Grenswacht" (geen echte organisaties).

Elke is een korte, overslaanbare scène; de speler wordt teruggezet met het
gezicht naar binnen. Elke gevonden rand telt voor een prestatie.

**Water en eilanden:**

- **Wad:** speelbaar tot net voorbij Rottumerplaat en Rottumeroog. De open
  Noordzee voorbij de eilanden is de harde rand: aanzwellende golven,
  kustwachtradio, dan mist en stroming die je terugdrijven. Daarachter de
  L3-horizon met schepen en de Duitse eilanden (Borkum) als silhouet.
- **Rottumeroog en -plaat:** beschermd natuurgebied. Eromheen varen mag; aan
  land gaan geeft een waarschuwing van de boswachter en een korte,
  overslaanbare grap die je op de boot terugzet. Eén geheim.
- **Schiermonnikoog** (Fries): de veerboot vanaf Lauwersoog is een cinematic
  overtocht; het eiland eerst als L2-decor met een cinematic bezoek, later
  speelbaar (F5) als het loont.
- **Eems en Dollard:** waterrand met Duitsland. Varen tot het midden van de
  vaargeul; de "Grenswacht"-boot waarschuwt. Emden is een silhouet.
- **Lauwersmeer:** helemaal speelbaar; de sluizen van Lauwersoog naar zee
  zijn de rand, met een sluisgrap.
- **Vaargeulen:** grote schepen op de Eems naar Eemshaven en Delfzijl zijn
  gevaarlijk voor boten. **Zwemmen:** tot het wadlopen bij eb (F5) een
  uitputtings-terugkeer; tot dan vaste vloed.

**Lucht:** een radiowaarschuwing, dan draait de autopilot van heli of
vliegtuig zacht terug (zoals de bestaande zachte muur); plafond ~300 m voor
het vliegtuig. **Spoor:** lijnen eindigen bij het laatste station voor de
grens met "Deze trein eindigt hier"; snelreizen blijft binnen de grens.

**Bruggen, dammen en sluizen over grenswater** (de Lauwersmeerdijk naar
Friesland, de Westerwoldse Aa bij Nieuweschans, de kanalen naar Duitsland bij
Ter Apel en Haren-Rütenbrock, grenskanalen met Drenthe): elk **volledig
gemodelleerd** (echte hoogte, doorvaarthoogte, openingsgedrag) en volledig
bespeelbaar tot de overkant. **De terugkeer treedt pas op ná de brug**, in de
buffer aan de overkant, nooit op het dek of een oprit; op het water na de
verste sluis of brug. Ze zitten in de hoogte- en wateroplosser en de audits
(2.11: doorvaarthoogte per bootklasse, beide aanritten); beweegbare bruggen
openen ook op de grenskanalen. De kaart toont de grens langs het water.

**Kaart:** de provinciegrens is getekend; de buffer eromheen is gearceerd en
heet "buiten de provincie".

**Veiligheid:** spawnen, teleporteren, respawnen en waypoints worden binnen
de rand geklemd; de save-migratie zet posities buiten de rand naar binnen;
tests controleren dat **geen weg of waterweg het speelgebied uit leidt
zonder terugkeer**.

**Tegeldata:** een `edge`-laag in de globale laag (grenspolygoon, bufferpolygoon,
terugkeerpunten met hun scène-id); de tegels in de buffer krijgen de vlag
`buffer`.

**Fase:** F0 de laag gereserveerd; F2 grens, buffer en horizon; F3 de
terugkeerscènes; F5 Wad, getij en eilanden.

### 2.25 Wat F0 oplevert (stand van zaken)

Het tegelformaat v1 is gebouwd en wordt door het spel gebruikt. Zie
ARCHITECTURE.md "World tiles" voor de bytes en de modules.

| Onderdeel | Stand |
|---|---|
| RD New en `P()`-helpers | **klaar**: `rdnew.js`/`rdnew.py` (0,3 m van de rigoureuze RD over de provincie), `worldframe.js`, alle handgeplaatste coördinaten omgezet, kaartdata en bouwscripts in RD, saves v7, zon op roosternoord |
| `.gdt` v1 + packer | **klaar**: `gdt.js`, `pack_tiles.mjs`, 1 cm, delta + zigzag-varint, kolomgewijs, packs van 8 × 8 km met index en hashes, deflate (zstd met woordenboek: F1-meting), round-trip- en determinismetests |
| `TileWorld`-façade, store, wachtrij, workers | **klaar** voor het bestaande gebied: dezelfde query-API, `GameMap.fromParts` (slaat de afleiding bij het laden over), LRU, pins, annuleren, prefetch op snelheid en richting, `FrameQueue`, Range-bytebron. De stad is vastgepind: de systemen lezen nog hele arrays |
| Zwevende oorsprong | **infrastructuur klaar** en op ±40 km getest, inert op (0, 0); tegel-lokale geometrie (`toRender` overal) is de eerste klus van F1 |
| Gebouwhoogtes en uiterlijk | velden en join **klaar** (`hm`, `hsrc`, dak, kleur, materiaal, bouwjaar, BAG-id uit de OSM-tags); de 3D BAG-extract zelf komt in F1 |
| Hoogte-, rijstrook-, kruispunt-, route-, POI-, meubilair-secties | gereserveerd in het formaat (`SECTION`), met auditrapporten op de huidige data; de oplossers zijn F1 |
| Cutscène-streaming | API (`prefetchPoints`, `missing`) klaar; de shotlijsten van `cinematics.js` en de test per cutscène zijn F1 |

**Metingen F0 (zelfde machine, A = v0.29.0 met JSON-kaart, B = F0 met tegels; 3 afwisselende runs onder hoge belasting).**

| Meting | A (nu) | B (F0) |
|---|---|---|
| Kaart klaar (`__loadMarks.map`) | 2531 / 3328 / 2396 ms | 1768 / 2378 / 1539 ms |
| Titelscherm (`title`) | 5018 / 6388 / 4813 ms | 4657 / 5534 / 4251 ms |
| JS-heap bij het titelscherm | 912 / 887 / 895 MB | 850 / 843 / 857 MB |
| Perf-routes (foot, ring, heli; gem. frametijd, p95) | 21,8 / 33,8; 23,2 / 34,0; 20,8 / 33,5 ms | 22,1 / 33,8; 23,6 / 33,8; 21,5 / 33,5 ms (gelijk binnen de ruis) |
| Download | 182 MB | + 6,5 MB tegels (de JSON-bestanden, 19 MB, blijven als terugval; die vallen weg zodra tegels het enige pad zijn) |
| Tegels bij het opstarten | n.v.t. | 54 tegels, 3,3 MB gelezen via Range, 0 te laat |

Winst: de afleiding van de kaart (dubbele footprints, kanopieën, dakstappen,
doorsnijdingen) staat vooraf in de tegels. Per tegel: inflate 1 ms, decoderen
~6 ms (op een worker); de gestructureerde kloon naar de hoofdthread kost nog
~22 ms per tegel (open: getypeerde arrays in F1).

Streamingtests op een virtuele klok (`scripts/tileworld_test.mjs`): 60 s
rijden op 38 m/s, 60 s heli op 80 m/s en een rit met een budget van 3 MB:
geen tegel te laat binnen 250 m; een sprong: L0 rond de bestemming na
≤ 400 virtuele ms bij 30 ms per leesactie. De treinrit en de echte Electron-
stresstest (4.2) komen met de corridor in F1.

**Bevindingen op de huidige data** (rapporten, geen herbouw):

- *Rijstroken* (`scripts/world/audit_lanes.py`): 2.377 van de 2.940
  eenrichtings-ways hebben meer stroken getekend dan de tags zeggen; de
  trunk-helften (N7, N370, Europaweg) krijgen 4 stroken waar er 2 horen
  (breedte 12 m voor een halve rijbaan).
- *Profiel* (`scripts/world/audit_profile.mjs`): 463 wegen met hoogteprofiel;
  twee segmenten steiler dan de grens (steilste 10,6 % op een `secondary`
  bij 1974, 612); geen sprong waar wegen een knoop delen; de ring heeft 0
  obstakels op de rijstroken.
- *Gebouwhoogtes*: 95 % van de gebouwen valt terug op het typetje
  (`hsrc = default`), 4,5 % op OSM-verdiepingen, 0,2 % op OSM-`height`:
  precies waarom 3D BAG in F1 de eerste stap is. Wel zijn BAG-id en bouwjaar
  uit de OSM-tags voor ~70 % van de gebouwen bekend.
- *N7-kruising bij het Julianaplein* (-61, 1830), buitenste rijstrook,
  tegenrichting: de auto verlaat op 80 km/u in de bocht de smalle
  bruggenrand en vliegt even; dat gebeurt ook in v0.29.0 (de test eindigde net
  voordat het opviel). De oplosser van 2.11 moet dit oplossen.

Open voor F1: tegel-lokale geometrie en `toRender`, de oplossers (2.11-2.13),
3D BAG, de worker-kopie van de kaart (nu leest ook de roadsurface-worker de
volledige stad), het Ommeland als echte tegels (nu een blob in de globale
laag), zstd met woordenboek, OPFS-cache voor het web.

### 2.26 F1, eerste helft: de wegenkern van de wereldbouwer (stand)

Op het bestaande gebied (stad + Ommeland zoals in de tegels), stap voor stap,
het spel speelbaar na elke commit.

| Onderdeel | Stand |
|---|---|
| **1. Hoogte-oplosser** | **klaar voor de wegen.** `scripts/world/profile.mjs` (regels in `roadprofile.js`): per verbonden netwerk, één hoogte per knoop (voegen kunnen niet springen), helling per klasse, verticale bogen, vrije hoogte per klasse (weg 4,6 m, fiets/voet 2,5 m, spoor 6,0 m, plus 1 m dek), tunnels ≥ 5,8 m onder het maaiveld (8,2 m onder een kanaal), toeritten op de hoogte van hun rijbaan zolang de stroken overlappen. Projecties op de voorwaarden vanuit het oude profiel (`add_elevation.py`) als ontwerphoogte; geen scipy nodig. Terrein: plat, met een `terrain`-haak voor AHN; `road.z` is hoogte boven het terrein, dus taluds, keermuren en landhoofden (`elevation.js`) komen uit profiel min terrein. Tegels: sectie `heights` (profiel, netwerk, constructie per segment, laag). Op de huidige kaart: 200 → 19 te krappe verticale bogen, 0 te steile segmenten, 0 wegen en spoor onder de vrije hoogte (was 5, de N370 over het spoor 1 m te laag), fiets- en voetpaden onder de vrije hoogte 16 → 11, 0 sprongen in voegen. Open: die 11 fiets- en voetpaden die OSM in een tunnel of op een brug legt liggen nog op straatniveau (`--paths` geeft ze een profiel, nog niet aangezet); één OSM-knoop bij de Roeierspad blijft zoals hij was (`KNOWN_KNOTS`); spoorprofielen (de radiale `railLifts` blijven tot de spoorstap) |
| **2. Rijstroken** | **klaar voor de wegen in de tegels.** `scripts/world/lanemodel.py` (gedeeld door `process_osm.py` en `lanes.py`): stroken per richting uit `lanes`/`lanes:forward/backward`/`lanes:both_ways`, `turn:lanes` per strook, `placement`, strookbreedte per klasse (trunk 3,25 m, stad 2,75-3,25 m) en een breedte: een eenrichtingsrijbaan van een trunk, primary of toerit (en van een gescheiden secondary/tertiary) is zo breed als zijn stroken plus kanten. De fout uit punt 9 is weg: de N7-helften waren 12 m met 4 stroken per richting, nu 7,5 m met 2 (1.361 ways smaller, 5.845 van de 5.845 autowegen aan hun OSM-way gekoppeld). `audit_lanes.py` meet de kaart tegen de tags: verkeerde strookaantallen 2.059 → 0, te brede rijbanen 1.202 → 0. Markering (`lanes.js` `laneLayout`): strookstrepen, de scheidingslijn bij ongelijke aantallen, pijlen uit `turn:lanes` 10 en 40 m voor het eind van de way. AI rijdt in het midden van de rechterstrook en sorteert voor op de linker. Na de nieuwe breedtes opnieuw opgelost (toeritten koppelen nu aan de echte overlap: stappen tussen overlappende rijbanen 220 → 92, hoogste 2,9 → 0,8 m); vangrail op een dekrand boven een toerit die meer dan 1,7 m lager ligt; vloeren in uitgravingen tot onder de muur. Mesh-audit t.o.v. v0.29-data: zwevende randen 1.068 → 954 m, gaten 47,8 → 55,9 m² (rond de A28-uitgraving bij het Julianaplein, waar de smallere rijbanen het afgegraven masker niet meer dekken), coping boven straten 86,6 → 67,5 m², overhang 52 → 27 m². Open: `placement` staat in de data maar verschuift het lint nog niet; bus- en fietsstroken komen nog uit `mapextras` |
| **Eén hoogtequery** | **klaar:** `map.surfaceAt(x, y, state)` met de laag van de vrager (`{ z, ribbon }`): blijft op zijn dek, neemt bij een voeg de weg die doorloopt (dezelfde weg eerst), valt over een rand. Rijden, lopen, voetgangers, racebaan, cutscènepaden en de GPS-lijn gebruiken hem; `groundHeightAt` blijft de stateloze terugval. De N7-kruising bij het Julianaplein (-61, 1830) rijdt weer met de strenge dekcheck tot het eind van het pad (`scripts/surface_test.mjs`) |

## 3. Reizen door de provincie

De provincie is **37 keer zo groot als een grote open-wereldkaart** (~80 km²) en een
rit van Stad naar Delfzijl is ~32 km. Reizen moet dus zelf leuk zijn, én
overslaan moet altijd kunnen. Uitgangspunt: **een gewone verplaatsing tussen
twee verhaalmomenten duurt hooguit 3-5 minuten echte tijd**, tenzij de speler
zelf kiest voor de lange weg.

### 3.1 Reistijden (1:1 schaal)

| Rit | Afstand | Auto (gem. 28 m/s) | Trein (echt / in spel) | Heli 50 m/s | Vliegtuig 75 m/s |
|---|---|---|---|---|---|
| Stad – Zuidhorn | 13 km | 8 min | 9 min / overslaan of 2 min versneld | 4 min | – |
| Stad – Delfzijl | 32 km | 19 min | 35 min / 3 min | 10 min | 7 min |
| Stad – Eemshaven | 38 km | 23 min | 45 min / 3 min | 12 min | 8 min |
| Stad – Winschoten | 35 km (A7) | 18 min (A7 33 m/s) | 30 min / 3 min | 11 min | 8 min |
| Stad – Ter Apel | 55 km | 33 min | (geen spoor) | 18 min | 12 min |
| Lauwersoog – Nieuweschans | 75 km | 45 min | – | 25 min | 17 min |

Conclusie: **rijden is voor de rit zelf, niet om ergens te komen.** Het spel
moet de speler daarom altijd een sneller alternatief geven, en de verhaallijn
plant missies per regio zodat de speler niet heen en weer hoeft.

### 3.2 Trein (eerste reismiddel, al in F1)

- **Alle lijnen echt:** Groningen–Leeuwarden (Zuidhorn, Grijpskerk),
  Groningen–Roodeschool–Eemshaven (Sauwerd, Winsum, Baflo, Warffum, Usquert,
  Uithuizen, Uithuizermeeden), Groningen–Delfzijl (Bedum, Stedum, Loppersum,
  Appingedam), Groningen–Nieuweschans (Kropswolde, Martenshoek,
  Hoogezand-Sappemeer, Zuidbroek, Scheemda, Winschoten), Zuidbroek–Veendam,
  Groningen–Assen (Haren). Plus het **museumspoor** Stadskanaal–Musselkanaal
  als activiteit (stoomtrein, zonder merknaam).
- **Drie manieren:** (1) meerijden in echte tijd, met uitzicht, coupé-banter
  en een "Uitstappen"-knop bij elk station; (2) **versneld meerijden** (4×,
  de wereld streamt mee langs het spoor: de route is bekend, dus prefetch is
  makkelijk); (3) **snelreizen** zoals nu (`stationtravel.js`: kaartautomaat,
  menu, korte cinematic), maar naar elk ontdekt station.
- Treinen rijden echt over de hele lijn, ook als je er niet in zit
  (kinematisch op de globale spoorlaag), met overwegen die dichtgaan.
- **Zelf machinist (wens eigenaar):** stap voorin en rijd de trein zelf
  als mini-game onderweg. Gas en remmen met gewicht en lange remweg,
  snelheidsborden en seinen (rood = stoppen, anders straf), op tijd en
  precies bij de perronmarkering stoppen, deuren open/dicht, omroepen
  ("Volgende halte: Winsum") en overwegen. Scoren op stiptheid, comfort
  (geen rukken) en stopplek; medailles per lijn en een bijbaantje
  "machinist" met een dienstregeling. Altijd overslaan: na elke halte
  kun je naar passagier of snelreizen wisselen.
- **Passagier:** zitten in de coupé met uitzicht, banter van Tammo en Tessa
  en medereizigers; Spatie houdt = overslaan naar je station (versneld of
  met korte cinematic), zoals cutscenes.
- Tickets kosten bijna niets; zwartrijden geeft een kleine kans op een
  conducteur (een droge mini-scène, geen wanted).

### 3.3 Bus

- **Lijnen en haltes uit OSM** (`route=bus`-relaties en `highway=bus_stop`,
  ODbL): dat is offline bruikbaar en valt onder dezelfde licentie als de
  kaart. Geen echte dienstregeling: **frequenties per lijnklasse** (stad 10
  min, streek 30 min, 's nachts niets) zijn genoeg en blijven kloppen.
- **GTFS** (OVapi/NDOV-loket) alleen als de licentie het toelaat
  (te checken, zie 4.3), en dan nog alleen om lijnvolgordes te controleren.
- **Geen merknamen:** de vervoerders heten in het spel bijvoorbeeld
  "Streekbus Grunn" en de snelle lijnen "Q-lien" → beter neutraal:
  **"Sneldienst"** (een knipoog zonder merk).
- **Meerijden of overslaan:** instappen, dan "Ga zitten" (echte tijd) of
  "Slaap tot halte …" (zwart beeld, een regel van de buschauffeur, wakker
  bij de halte).
- **Bijbaan buschauffeur** (`sidejob_bus.js` bestaat): streeklijnen tussen
  dorpen, met dienstregeling, gekke passagiers en een "rijden op de dijk
  bij windkracht 8"-niveau.

### 3.4 Weg

- **A7, A28, N33, N46 (Eemshavenweg), N355, N360, N361 en de andere
  N-wegen** met hun echte maximumsnelheid; AI rijdt daar sneller en in
  colonnes. Op- en afritten en knooppunten uit OSM (hoogtes uit `layer` +
  AHN).
- **"Rijd me erheen"** (autopilot op GPS) met **tijdversnelling 3×** op
  snelwegen en N-wegen, onderbroken zodra er iets gebeurt (politie, missie,
  event, een speler die stuurt). Streaming: effectief 100-120 m/s, dus alleen
  L1/L2 vooruit en L0 pas bij het afremmen.
- **Taxi bellen** (telefoon): de taxi komt, rit = korte cinematic +
  fade, kost een paar euro; kan niet met wanted ≥ 2.
- **Garages en afleveren per regio:** elke regio heeft minstens één garage;
  "Lever mijn auto af" werkt overal (bestaat al voor het Ommeland, de
  verhaaltest checkt Loppersum).
- **Auto's voor lange afstand:** een comfortabele "kilometervreter" en een
  snelle sportwagen worden belangrijker; een trekker blijft grappig maar
  traag.

### 3.5 Vliegen

- **Heli** (bestaat): eigen helipad bij elk safehouse vanaf deel 4, plus
  helipads bij Eemshaven en het ziekenhuis in Delfzijl/Scheemda/Winschoten
  (waar OSM ze heeft).
- **Klein vliegtuig** (nieuw voertuig): vanaf Eelde (net over de grens in
  Drenthe, al in de game), het vliegveld bij Oostwold (Oldambt) en een
  graspiste bij Stadskanaal (te checken); daarnaast landbouwstrips bij boeren
  als fictieve plekken. Landen kan op elke rechte weg of graspiste, met een
  "vliegbrevet"-opleiding als activiteit.
- **Gewasspuiter-bijbaan:** laag over akkers, bochten om bomenrijen, wind.
- Vliegen streamt alleen L1-L3 boven 200 m; onder 200 m L0 met krimpende
  straal.

### 3.6 Water

- **Eigen boot** (bestaat, ook al het Ommeland in): het vaarwegennet wordt
  uit OSM gebouwd (`waterway=canal/river` + breedte, sluizen, bruggen die
  open moeten). Reitdiep naar Zoutkamp en het Lauwersmeer, Winschoterdiep
  naar de Veenkoloniën, het Eemskanaal naar Delfzijl, het Damsterdiep,
  het Van Starkenborghkanaal naar Friesland.
- **Veerboot Lauwersoog–Schiermonnikoog:** de pier en de boot zijn er
  zeker (Lauwersoog is Gronings). Het eiland zelf is Fries en optioneel
  (Beslissingen). Zonder eiland: de boot vaart weg en de rit is een
  cinematic met een "Je bent op Schier geweest"-kaart en terug.
- **Kleine ponten** over kanalen waar OSM `route=ferry` heeft
  (aantal te checken) en fictieve fietspontjes waar het verhaal er een
  nodig heeft.
- **Boten als snelreizen:** een "rondvaart"-boot (bestaat in de stad) als
  waterbus tussen Stad, Zoutkamp en Delfzijl met overslaan.

### 3.7 Snelreizen: regels

- **Ontdekken eerst:** je kunt alleen snelreizen naar een station, halte,
  veersteiger, vliegveld of safehouse waar je **zelf geweest** bent. Wel: de
  eerste rit naar een nieuwe regio mag altijd met de trein (het verhaal stuurt
  je er zo heen).
- **Geld is nooit een blokkade:** een kaartje kost 2-15 euro; heb je dat
  niet, dan zwartrijden met een kleine kans op een conducteur.
- **Wanted:** geen snelreizen, trein, bus of taxi met 2 sterren of meer. Met
  1 ster mag de trein, maar dan staat er misschien een agent op het perron
  van aankomst.
- **Missies:** tijdens een missie geen snelreizen, behalve als de missie het
  aanbiedt ("Pak de trein naar Delfzijl" als stap).
- **Kosten in tijd:** snelreizen laat de speltijd lopen (rit + 20 min), zodat
  dag/nacht en getij logisch blijven.

### 3.8 Reistijd-budgetten (ontwerpregel)

| Soort verplaatsing | Doel (echte tijd) | Middel |
|---|---|---|
| Binnen een stad of dorp | 0,5-2 min | lopen, fiets, auto |
| Naar het volgende missiedoel in dezelfde regio | 1-3 min | auto, boot |
| Naar een andere regio, eerste keer | 3-5 min | trein (versneld) of rijden met een gesprek |
| Naar een andere regio, daarna | < 30 s | snelreizen |
| Zelf de provincie over, voor de lol | onbeperkt | alles |

## 3b. Herkenningspunten per plaats

**Eis van de eigenaar:** elke stad en elk dorp krijgt minstens 1-2
herkenbare gebouwen, dichter bij het echte ding dan een generiek huis. Een
Groninger kent zijn dorp aan de kerk en de molen; als die kloppen, voelt
het hele dorp echt.

### Hoe het nu gaat

- **De stad:** 14 benoemde landmarks in `citymap.json` `meta.landmarks`
  (Martinitoren, Martinikerk, Der Aa-kerk, Academiegebouw, Goudkantoor,
  Groninger Museum, Forum, Hoofdstation, Euroborg, …).
  - `landmarks3d.js` bouwt ze procedureel per naam of soort (`BUILDERS`,
    `NAMED`, en `registerBuildingModel` voor losse modules zoals
    `thuis3d.js`): één samengevoegde, vertex-gekleurde geometrie op vijf
    gedeelde materialen, binnen de footprint, met een zwakke gloed 's nachts.
  - `landmarkmodels.js` kan een echt GLB-model laden: alleen
    `martinitoren.glb`, gemaakt met de prompts in
    `docs/3d-model-prompts.md`, geschaald op de hoogte van de procedurele
    versie.
  - `marktgebouwen.js` heeft de gevels rond de Grote Markt.
- **Het Ommeland:** `countrymodels.js` `churchGeometry` heeft vier
  generieke kerkvarianten (romaans met westtoren, kruiskerk, zaalkerk met
  dakruiter) op een wierde-kegel, geplaatst bij de OSM-kerk. Molens,
  borgen en vuurtorens zijn er nog niet als herkenbare gebouwen.

### Selectie per plaats

Per plaats (`place=*`, 592 stuks) neemt de bouwer de 1-3 hoogst scorende
kandidaten binnen de bebouwde kom (of tot 1 km erbuiten voor molens en
borgen):

| Bron (tag) | Soort | Score omhoog door |
|---|---|---|
| `amenity=place_of_worship` + `building=church`/`chapel` | kerk | `heritage`, `start_date` < 1600, een Wikidata-link, op een wierde (AHN) |
| `man_made=windmill`, `man_made=watermill` | molen | `heritage`, het molentype (`windmill:type`) bekend |
| `historic=castle`/`manor` + naam op `-borg` | borg | altijd, met de gracht uit het water |
| `man_made=lighthouse`, `man_made=tower` (+ `tower:type`) | toren, vuurtoren | hoogte |
| `tourism=museum`, `historic=*` (monument, ruïne) | museum, monument | Wikidata, bezoekers in de buurt |
| `railway=station` | station | bouwjaar (een 19e-eeuws station is een herkenningspunt) |
| haven, sluis, brug (`waterway=lock_gate`, `bridge:movable`) | waterwerk | in de top-3 als een plaats geen kerk heeft |
| industrie (`man_made=chimney`, `power=plant`, kranen) | haven-icoon | alleen Eemshaven, Delfzijl, Veendam, Hoogezand |

**Aanvullende data:**
- **Wikidata (CC0):** hoogte (P2048), bouwjaar (P571), bouwstijl (P149),
  monumentnummer.
- **Rijksmonumentenregister (RCE):** open data, licentie te verifiëren
  (meestal CC0).
- **3D BAG:** hoogte en dakvorm (CC BY).
- **Foto's (Wikimedia Commons):** alleen als *referentie* voor wie de
  overrides maakt. Er gaat niets uit foto's in de build (de licenties
  verschillen per foto).

### De generator: bouwdozen met parameters

Een herkenningspunt is **footprint (OSM) + maten (hoogte, Wikidata/3D BAG) +
stijl (tags) + een bouwdoos**. Eén bouwdoos per soort, met stukken die
elkaar opvolgen:

| Bouwdoos | Parameters | Groningse varianten |
|---|---|---|
| **Kerk** | schip uit de footprint, lengte/breedte, nokhoogte, koor (rond, veelhoekig, recht), torenpositie (west, los, dakruiter), torentype, steen (kloostermop, tufsteen, gele baksteen), vensters (rondboog, spitsboog), steunberen | zadeldaktoren (Groninger klassieker), spits, ingesnoerde spits, losse klokkenstoel, kerk op een wierde met kerkhofmuur en lindes |
| **Toren** | doorsnede, geledingen, galmgaten, uurwerk, bekroning | scheve toren (Bedum: een parameter `lean`), lantaarn, koepel |
| **Molen** | type (stellingmolen, grondzeiler, spinnenkop, poldermolen), romp (achtkant, rond, steen, riet), kap, wieken (draaien met de wind) | wit, zwart, riet, met een stelling op de eerste verdieping |
| **Borg** | hoofdhuis uit de footprint, verdiepingen, trapgevels, poortgebouw, gracht en brug | Menkema-type (U-vorm), torentje |
| **Vuurtoren / haventoren** | hoogte, kleur(banden), lichthuis, draaiend licht | rood-wit, vierkant of rond |
| **Station** | type (19e-eeuws, wachthuisje, modern), perronkap | standaardtype per bouwperiode |
| **Haven-iconen** | kranen, silo's, windturbines, schoorstenen | Eemshaven: turbines en grijze hallen; Delfzijl: kranen en zeedijk |

- **Overrides voor de ~30 echte iconen** (zie de lijst hieronder): een JSON
  per object met de afwijkende maten en extra stukken. Een GLB-model zoals
  de Martinitoren alleen waar de bouwdoos tekortschiet.
- **LOD:**
  - L0: volle bouwdoos met vensters en details;
  - L1: silhouet met dak en toren;
  - L2/L3: een torensilhouet in de horizon. Kerktorens en molens zijn wat je
    op 10 km ziet, dus ze staan **altijd** in de L3-horizon.
- **'s Nachts:**
  - kerken in aanlicht (warm, van onderen, uit na middernacht);
  - verlichte wijzerplaten;
  - vuurtorens met een draaiende lichtbundel;
  - Eemshaven met rode obstakellichten op de turbines;
  - molens donker, met één lampje bij de deur.
- **Budget:**
  - L0 ≤ 8 draws per herkenningspunt (samengevoegd per materiaal, zoals
    `landmarks3d.js`);
  - bouwen in de worker;
  - één batch per tegel voor L1/L2.

### Aantallen (schatting; de telling per soort kreeg geen antwoord van Overpass)

| Regio | Plaatsen | Kerken met karakter | Molens | Borgen/burchten | Overig | Herkenningspunten |
|---|---|---|---|---|---|---|
| Stad + rand | ~25 | ~25 | ~8 | 1 | 14 bestaande | ~60 |
| Hogeland (wierdedorpen, Eemshaven) | ~120 | ~70 | ~20 | ~6 | vuurtoren, haven | ~120 |
| Eemsdelta (Delfzijl, Appingedam, Loppersum) | ~70 | ~45 | ~12 | ~2 | kranen, sluizen | ~80 |
| Westerkwartier | ~90 | ~40 | ~15 | ~4 | | ~80 |
| Oldambt | ~60 | ~25 | ~15 | 1 | vesting Nieuweschans | ~55 |
| Veenkoloniën | ~80 | ~25 | ~10 | – | museumspoor, fabrieken | ~60 |
| Westerwolde | ~50 | ~15 | ~8 | – | vesting Bourtange, klooster Ter Apel | ~40 |
| Wadkust / Lauwersmeer | ~25 | ~10 | ~4 | – | sluizen, havens | ~25 |
| **Totaal** | **~520-590** | **~250** | **~90** | **~15** | | **~500-600** |

Groningen is beroemd om zijn middeleeuwse dorpskerken (er staan er meer dan
honderd). Het gros komt dus uit de kerkbouwdoos, en die moet het beste
zijn.

### De ~30 iconen met de hand (prioriteit)

1. Martinitoren (bestaat, GLB)
2. Der Aa-kerk
3. Menkemaborg (Uithuizen)
4. Fraeylemaborg (Slochteren)
5. vesting Bourtange
6. klooster Ter Apel
7. de scheve toren van Bedum
8. hangende keukens + kerk (Appingedam)
9. Eemshaven met vuurtoren en turbines
10. de haven en zeedijk van Delfzijl, met molen Adam
11. kerk van Loppersum
12. ruïnekerk Garmerwolde
13. Stedum (wierdekerk met zadeldak)
14. Ezinge (wierde)
15. Leens (kerk + borg Verhildersum)
16. Zeerijp
17. Krewerd
18. Uithuizen (kerk)
19. abdijkerk Aduard
20. Nienoord (Leek)
21. Winschoten (molens en kerktoren)
22. vesting Nieuweschans
23. monument Heiligerlee
24. sluizen Lauwersoog en Zoutkamp
25. het museumspoor-station Stadskanaal
26. de Veenkoloniale lintkerken (Veendam, Wildervank)
27. Termunten
28. Noordpolderzijl (het kleinste haventje)
29. Warffum
30. Middelstum

Per icoon: 0,3-0,5 agent-dag, de eigenaar keurt met een screenshot.

### Gameplay

- **Ontdekken:** de eerste keer dichtbij geeft een naamkaart (zoals de
  personagekaarten) en een droge regel van Rikus of de lokale
  "torenwachter". Op de kaart verschijnt het icoon.
- **Uitkijkpunten:** een beklimbare toren per regio (kerktoren, vuurtoren,
  molenstelling) onthult de kaart rond die plek (de "mist van de kaart") en
  wordt een snelreispunt.
- **Kieken:** een foto van elk herkenningspunt voor de Kiekdoar-feed
  (verzamelbaar, per regio een album; prestaties bij 10/50/alle).
- **Missies:** setpieces bij de iconen (zie het verhaal-document: Bourtange,
  Menkemaborg, het museumspoor), en wierdekerken als ontmoetingsplek.
- **Snelreizen:** naast stations ook de ontdekte uitkijkpunten.

### Wanneer

- **Vroeg en los van de tegels (LK1, parallel aan F0):** de kerk- en
  molenbouwdoos met de selectieregels in het **huidige Ommeland**. Ze
  vervangen `churchGeometry` bij de 104 OSM-kerken en zetten de molens
  neer. Zichtbaar winst, en de pariteit-agents kunnen het meteen gebruiken.
- **F1:** de bouwdozen in de wereldbouwer, voor de corridor (Bedum,
  Loppersum, Appingedam, Delfzijl, Eemshaven, de wierdedorpen langs het
  spoor).
- **F2:** alle plaatsen, de L3-horizon met torens.
- **F3:** uitkijkpunten, het album en de naamkaarten.
- **F4/F5:** de iconen met de hand, verdeeld over de inhoudsdrops van hun
  regio.
- **Inspanning:** bouwdozen 8-12 agent-dagen, iconen 10-15, gameplay 3-4.

## 4. Prestaties, kwaliteit, tests en licenties

### 4.1 Doelen

| Meting | Laag (iGPU) | Gemiddeld | Hoog (M-serie, dGPU) |
|---|---|---|---|
| FPS mediaan in de binnenstad | 30 | 45 | 60 |
| FPS mediaan op de A7 / in de heli | 30 | 50 | 60 |
| p99 frametijd tijdens rijden 40 m/s | ≤ 50 ms | ≤ 40 ms | ≤ 33 ms |
| Langste hapering (10 min rijden of vliegen) | ≤ 100 ms | ≤ 80 ms | ≤ 66 ms |
| Zichtbare pop-in binnen L0 | geen | geen | geen |
| Laden tot titelscherm (SSD) | ≤ 8 s | ≤ 6 s | ≤ 5 s |
| Snelreizen tot speelbaar | ≤ 6 s | ≤ 4 s | ≤ 3 s |
| Heap na 30 min rijden (groei) | < 50 MB | < 50 MB | < 50 MB |
| GPU-geheugen | ≤ 600 MB | ≤ 900 MB | ≤ 1,2 GB |
| Download (desktop, hele game) | geen harde grens; streven ≤ ~1 GB als de kwaliteit het vraagt (0.1) | | |

(En in F2 "Klaar als": "de download ≤ 230 MB" → "de download binnen de afspraak uit 0.1 (≤ ~1 GB), de webversie ≤ 25 MB tot speelbaar".)
| Webversie eerste speelbare keer | ≤ 25 MB (code + index + spawn) | | |

Regel: **geen regressie** ten opzichte van de huidige stad-baseline van
`scripts/perf/run.sh` (foot, ring, heli) op dezelfde machine.

### 4.2 Teststrategie

- **Bouwaudit per tegel** (`scripts/world/audit.mjs`, geen Electron):
  geen gebouw in de weg, geen weg zonder graafverbinding naar de rand, elke
  poortknoop heeft een tegenhanger, geen gat in het hoogteraster, geen
  object in een dijklichaam, elke spot (spotcheck-regels) op vrije grond,
  doorgangen (passagecheck-regels). Rapport per tegel, de build faalt bij
  fouten.
- **Routetests provinciebreed:** 500 willekeurige paren
  (stad↔dorp, dorp↔dorp, over de A7) moeten een route hebben; een
  gescripte auto rijdt er 50 echt (headless, versneld), zoals
  `country_route_test.mjs` nu.
- **Wegcheck:** de `ringcheck`-probe over de A7, A28 en de N-wegen.
- **Perf-routes** (één Electron-ronde, aan het eind): de A7 van Stad naar
  Nieuweschans op 40 m/s, de heli Stad→Eemshaven op 60 m/s, de trein naar
  Delfzijl versneld, een rondje lopen in Appingedam.
- **Geocheck per tegel:** worker = main thread = vorige build, byte voor
  byte.
- **Visuele pariteit van de stad (F1):** vaste camerashots (de bestaande
  `placeshot.js`) voor en na de nieuwe bouwer; een diff-rapport met
  drempel en handmatige review.
- **Stresstest streaming** (`scripts/perf/stream_stress.mjs`, in de
  Electron-slotronde):
  1. de heli op 60 m/s in rechte lijnen dwars door de provincie
     (Lauwersoog → Ter Apel, Zuidhorn → Nieuweschans, telkens 10 min);
  2. de trein Stad → Eemshaven, versneld 4×;
  3. "Rijd me erheen" 3× over de A7;
  4. 100 willekeurige sprongen;
  5. 30 minuten rijden met de heap en het GPU-geheugen elke 10 s gemeten;
  6. dezelfde set met `--cpu-throttle=4`.

  De uitvoer: een histogram van de haperingen, het aantal te-laat-gebeurtenissen,
  de upload-ms per frame (p50/p99), de tijd tot L0 na een sprong, en de
  geheugengroei. Alles tegen de budgetten uit 2.4b.

### 4.3 Licenties

| Bron | Gebruik | Licentie | Wat moet |
|---|---|---|---|
| OpenStreetMap (Geofabrik-extract, Overpass) | alles | **ODbL 1.0** | naamsvermelding zoals nu; de tegels zijn een *afgeleide database* en blijven ODbL (share-alike), de bouwscripts staan in de repo. Uitzondering in `LICENTIES.md` uitbreiden naar `game/world/` |
| AHN (Actueel Hoogtebestand Nederland, via PDOK) | hoogte, dijken, wierden | **CC0** | geen verplichting; netjes vermelden in Over |
| BAG (Kadaster, via PDOK) | bouwjaar, functie, aantal verblijfsobjecten | **CC0** | idem |
| 3D BAG (3dbag.nl, TU Delft) | gebouwhoogtes en dakvormen | **CC BY 4.0** (te verifiëren per versie) | naamsvermelding in Over en aftiteling |
| BGT / BRT-TOP10NL (Kadaster) | eventueel sloten, dijken, kavels | BGT **CC0**; BRT **CC BY 4.0** (te verifiëren) | vermelding bij BRT |
| Rijkswaterstaat (waterinfo, vaklodingen) | getij, bathymetrie Wadden | open data, licentie per dataset **te checken** (meestal CC0) | vermelding |
| Wikidata | hoogtes, bouwjaar, stijl van herkenningspunten | **CC0** | geen |
| Rijksmonumentenregister (RCE) | welke gebouwen monument zijn | open data, licentie **te verifiëren** (meestal CC0) | vermelding |
| Wikimedia Commons-foto's | alleen referentie voor het modelleren | per foto verschillend | **niets** uit foto's in de build |
| OV-data (OVapi GTFS / NDOV-loket) | eventueel buslijnen | **te checken**; voorwaarden verschillen per concessie | alleen gebruiken als expliciet open; anders OSM-busrelaties (ODbL) |
| Bibliotheken voor streaming | zstd-decoder (`fzstd`), meshoptimizer-decoder, three-mesh-bvh, Basis/KTX2-transcoder | MIT (de eerste drie), Apache-2.0 (Basis) | vermelden in `LICENTIES.md` en `licenses/`, zoals de andere code-afhankelijkheden |
| Merk- en bedrijfsnamen | – | – | niet gebruiken: vervoerders, supermarkten, datacenters, de gasbedrijven, musea en festivals krijgen fictieve namen |

Grens: OSM-data en CC0-sets mogen samen in een tegel; CC BY-data (3D BAG)
ook, met vermelding. Data met een niet-commerciële of onduidelijke licentie
gaat er niet in.

## 5. Fasen

Elke fase is los uit te brengen. Inspanning in **agent-dagen** (één agent,
één werkdag). Parallel: maximaal ~3 agents tegelijk op deze MacBook, zware
Electron-tests alleen in één slotronde per fase.

| Fase | Wat | Agent-dagen | Zichtbaar voor de speler |
|---|---|---|---|
| **F0** | RD New, tegelformaat, streaming, zwevende oorsprong, huidige stad + Ommeland omgezet naar tegels | 12-16 | niets (sneller laden) |
| **LK1** (parallel aan F0) | Kerk- en molenbouwdoos in het huidige Ommeland (3b) | 5-7 | echte dorpskerken en molens |
| **F1** | Wereldbouwer, prototype-corridor Stad → Delfzijl → Eemshaven, de stad opnieuw gebouwd, trein (passagier én zelf machinist als mini-game) en bus, proefdrop "Op de rails" | 22-30 | corridor speelbaar, treinen en een buslijn |
| **F2** | Hele provincie: geometrie, hoogte, water, kust, horizon; oude lagen verwijderd; verkenningsinhoud | 26-34 | de hele provincie te verkennen |
| **F3** | Steden en reizen: winkels, garages, safehouses, ponten, vliegtuig, taxi, snelreizen, regionale politie; bijbaantjes, races, filialen | 28-38 | elke stad heeft wat te doen |
| **F4** | Deel 4 (32 hoofdmissies) en 28 zijmissies in drie drops (zie PROVINCIE-VERHAAL.md) | 52-66 | het verhaal door de provincie |
| **F5** | Afwerking: getij, wad, eilanden (optioneel), audio, seizoenen, perf | 15-22 | alles klopt |
| | **Totaal** (incl. de iconen uit 3b, 13-20) | **~175-235** | met 3 agents tegelijk: ~60-80 werkdagen doorlooptijd |

### F0 · Tegels en streaming voor het bestaande gebied

- **Doel:** dezelfde game, maar alles komt uit tegels.
- **Werk:**
  - de overstap naar RD New (1.5): de omrekenfunctie, de codemod voor de
    handgeplaatste coördinaten en de save-migratie;
  - `.gdt`-formaat v1 en `world.idx`;
  - een *packer* die `citymap.json`, `mapextras.json`, `ommeland.json` en
    `ommeland.bin` naar tegels omzet (zonder nieuwe bouwer);
  - de `TileWorld`-façade met de `GameMap`-API;
  - de loader met LRU, prefetch en pinnen; tegel-lokale geometrie;
    `toRender()` en de zwevende oorsprong;
  - de worker leest tegels in plaats van een eigen kaartkopie.
- **Stand:** zie 2.25.
- **Klaar als:**
  - verhaaltest, spotcheck, passagecheck, ringcheck, geocheck en
    `country_route_test` zijn groen;
  - de perf-routes laten geen regressie zien;
  - het laden is ≤ de huidige 6 s;
  - een test met de speler op x = +40 km (kunstmatig) geeft geen trilling.
- **Risico:** de absolute vertices zitten diep in veel modules.
  *Mitigatie:* eerst `toRender()` met oorsprong (0, 0) overal invoeren,
  pas daarna verschuiven.
- **Parallel:** A formaat + packer + façade; B tegel-lokale geometrie + zwevende
  oorsprong; C loader, worker en tests.

### F1 · Prototype-corridor Stad → Delfzijl / Eemshaven (go/no-go)

- **Doel:** bewijzen dat één bouwer de stad én het platteland op stadsniveau
  maakt, en dat streaming op snelheid houdt.
- **Gebied:**
  - de stad + een strook van ~6 km breed langs de N360 en het spoor naar
    Delfzijl;
  - de lijn Sauwerd–Roodeschool–Eemshaven;
  - samen ~450 tegels, ~15 % van de provincie.
- **Werk:**
  - wereldbouwer v1 uit het Geofabrik-extract (alle `add_*.py`-afleidingen
    als regels);
  - overlays voor het stadshandwerk;
  - grafen per tegel + globale laag;
  - één verkeer en één politie in de corridor;
  - `countryreal`, `countryedge` en `countryroute` uit voor de corridor
    (achter een vlag, de oude weg blijft tot F2);
  - treinen Stad–Delfzijl en Stad–Eemshaven echt rijdend, met versneld
    meerijden;
  - één streekbuslijn (Stad–Appingedam) met overslaan.
- **Een klein beetje inhoud:**
  - Appingedam en Delfzijl hebben een snackbar, een garage en een
    dorpsuitje;
  - twee zijmissies uit de Eemsdelta-reeks;
  - de bijbaan "Streekbus".
- **Go/no-go:**
  1. de stad is visueel gelijk of beter (shotsdiff + review door de
     eigenaar);
  2. perf-doelen uit 4.1 op de corridor;
  3. 10 min A7/N360 op 40 m/s zonder hapering > 66 ms (Hoog);
  4. heli 60 m/s zonder pop-in binnen 600 m;
  5. heap vlak na 30 min;
  6. corridor-download ≤ 10 MB;
  7. volledige build ≤ 15 min.
  *No-go:* terug naar een harde tweedeling met verbeterde L1, of de tegel
  kleiner maken (500 m) en opnieuw meten.
- **Risico's:**
  - de stad wordt lelijker door generieke regels → overlays + shotsdiff;
  - de buildtijd wordt te lang → incrementeel per tegel;
  - de OSM-kwaliteit buiten de stad is wisselend → regels met fallbacks
    (geen hoogte → `building:levels` → type-default).
- **Parallel:** A bouwer + overlays; B grafen, verkeer en politie; C treinen,
  bus, inhoud en tests.

### F2 · De hele provincie

- **Werk:**
  - de bouwer over alle ~3.000 tegels;
  - AHN-hoogte, dijken en wierden;
  - waterpeilen en sluizen;
  - de zee met vaste vloed;
  - L2 en de L3-horizon, de minimap-piramide;
  - de provinciegrens met een eenvoudige Friese, Drentse en Duitse rand;
  - de oude lagen weg (`countryreal.js`, `countryedge.js`,
    `countrybake.js`-rand, `countryroute.js`, `countryskyline.js`, de
    procedurele polders binnen de grens);
  - provinciebrede audits en routetests.
- **Inhoud:** de bestaande wereldeinden, dorpsuitjes en geheimen worden
  provinciebreed (één per dorp, gegenereerd + handwerk), en elke regio krijgt
  één ontdekkingsplek met een kaart-onthulling.
- **Klaar als:**
  - alle audits zijn groen;
  - de hele lijst routetests is groen;
  - de perf-routes (A7 naar Nieuweschans, heli naar Eemshaven) halen 4.1;
  - de download binnen de afspraak uit 0.1 (≤ ~1 GB), de webversie ≤ 25 MB tot speelbaar.
- **Risico:** de buildtijd en de hoeveelheid fouten in de OSM-data.
  *Mitigatie:* audits per tegel met een uitzonderingslijst in de repo,
  en de bouwer draait 's nachts.
- **Parallel:** A noord + kust; B zuid + oost; C terrein, horizon en
  minimap.

### F3 · Steden en reizen

- **Werk:**
  - winkels, horeca, garages en een safehouse in elke grote plaats
    (Delfzijl, Appingedam, Veendam, Stadskanaal, Winschoten,
    Hoogezand-Sappemeer, Leek, Zuidhorn, Uithuizen, Winsum, Ter Apel);
  - alle treinlijnen en snelreizen;
  - bussen met frequenties;
  - taxi, "Rijd me erheen";
  - het vliegtuig en de vliegvelden, de veerboot naar Schier (cinematic of
    eiland), ponten en sluizen voor eigen boten;
  - regionale politie en verkeer per tijdstip;
  - ontdekken op de kaart.
- **Inhoud:** de bijbaantjes per regio (zie het verhaal-document): bus,
  loods, wadgids en gewasspuiter.
- **Parallel:** A plekken en economie; B voertuigen en reizen; C politie,
  AI en kaart.

### F4 · Deel 4 en de zijinhoud

Zie [PROVINCIE-VERHAAL.md](PROVINCIE-VERHAAL.md): 32 hoofdmissies in
zeven regio's, 28 zijmissies in reeksen, 36 activiteiten. In drie
**inhoudsdrops** (de volgorde van de ringen in het verhaal), elk los uit te
brengen:

- **F4a** Stad + Hogeland + Eemsdelta (O1-O10), ligt in de F1-corridor;
- **F4b** Wadkust/Lauwersmeer + Westerkwartier (O11-O18);
- **F4c** Oldambt + Veenkoloniën + Westerwolde + de finale (O19-O32).

Kleine inhoud gaat al eerder mee: de proefdrop "Op de rails" in F1, de
verkenning in F2, en de bijbaantjes en races in F3 (verhaal-document §9).
Stemmen via de bestaande TTS-pijplijn (OpenRouter, Gemini 3.8, zie
geheugen), per drop een begroting.

### F5 · Afwerking

- getij en wadplaten, wadlopen;
- het eiland (als gekozen);
- ambience per landuse (open punt 2 van de pariteit), motorgeluid van
  verre auto's;
- zomer- en nazomerevents (oogst, Gronings Ontzet, kermis; carbid blijft de bestaande activiteit);
- de laatste perf-ronde en de lange-sessie-test.

### Parallel werken en volgorde

- F0 blokkeert alles.
- Binnen F1 en F2 kunnen inhoud-agents al **scripts en dialogen schrijven**
  (geen code) voor F4.
- F3 en F4a overlappen: de Eemsdelta-missies gebruiken de F1-corridor.
- De twee agents die nu de Ommeland-pariteit doen: hun werk aan gedeelde
  systemen (camera-straal, hoekprobes, routing zonder `inCity`) is precies
  wat F0/F1 nodig heeft. Wat specifiek is voor `countryreal`, `countryedge`
  en de polders wordt in F2 vervangen. Advies: hun lopende rondes afmaken,
  daarna geen nieuwe pariteitsronde meer op de oude lagen.

## 6. Risico's samengevat

| Risico | Kans | Gevolg | Mitigatie |
|---|---|---|---|
| De provincie voelt leeg | hoog | saai | dichtheidsregels en events (verhaal-document), reizen met overslaan |
| De stad verliest kwaliteit door generieke regels | middel | regressie | overlays, shotsdiff, go/no-go in F1 |
| Streaming hapert op snelheid | middel | slechte ervaring | worker-builds, budgetten, versnelde prefetch, L0 krimpt met hoogte |
| Buildtijd en datafouten | middel | trage iteratie | incrementeel, audits per tegel, uitzonderingslijst |
| De download wordt te groot voor het web | middel | web onbruikbaar | streaming per tegel, alleen spawn bij de start, service-worker-cache |
| Gevoelige thema's (gaswinning, datacenters, grens) | laag | reputatie | regels in het verhaal-document, review door de eigenaar |
| Licentie-onzekerheid (OV-data, 3D BAG) | laag | moet eruit | alleen expliciet open data; OSM als fallback |
| Te veel werk tegelijk | hoog | half af | elke fase los uit te brengen; inhoudsdrops |

## 7. Beslissingen voor de eigenaar

| # | Vraag | Advies |
|---|---|---|
| 1 | Schaal 1:1 (echte afstanden) of ingekort? | **1:1**; de echte kaart is het verkoopargument, reizen met overslaan lost de afstanden op |
| 2 | Waddeneilanden: Rottumeroog/-plaat (Gronings, onbewoond) en Schiermonnikoog (Fries, met veerboot) | Rottum als verboden natuur (gezien vanaf zee, één geheim); Schier eerst als cinematic, het eiland later als het loont |
| 3 | Maximale downloadgrootte desktop | **geen harde grens** (besluit eigenaar): getrouwheid van de tegels gaat voor grootte, totaal mag richting ~1 GB; eerste keer laden en de webversie blijven klein door streaming |
| 4 | De webversie op volle provincie? | ja, met streaming; eerste keer ≤ 25 MB |
| 5 | Verhaal: een **Deel 4** na de epiloog, of alleen vrij spel in de provincie? | Deel 4 "Nazomer" (zie verhaal-document), met de bestaande drie delen ongewijzigd |
| 6 | Gaswinning en aardbevingen | een stille, respectvolle zijlijn zonder grappen over de schade (zie het verhaal-document), of helemaal niet; jouw keus |
| 7 | De grens: Friesland, Drenthe en Duitsland | een eenvoudige rand (L2-kwaliteit, geen missies); Eelde blijft het enige stuk Drenthe met detail |
| 8 | Getij in het spel | ja, in F5; eerst vaste vloed |
| 9 | 3D BAG (CC BY) voor gebouwhoogtes en daken | ja, met vermelding; anders alleen OSM + type-defaults |
| 10 | ~~Winterinhoud~~ | **vervalt** (besluit eigenaar): het is altijd zomer, geen winter, ijs of schaatsen, ook niet als los event |
| 11 | De naam blijft "GDE Groningen – Zomer vol misdaad" | ja; Deel 4 speelt in de nazomer, de ondertitel klopt nog |
| 12 | Volgorde: eerst F0-F2 (techniek) of eerder inhoud? | F0 (+ LK1 parallel) → F1 met kleine inhoud → F2/F3 parallel met F4a-scripts |
| 13 | RD New: de omzetting van ~150 handgeplaatste coördinaten via een codemod of via een `P(x, y)`-helper | eerst de helper (veilig, te testen), daarna in één keer vastzetten |
| 14 | Hoeveel iconen met de hand (en GLB-modellen via Claude Design)? | 30 met de hand op de bouwdoos; GLB alleen voor 3-5 (Menkemaborg, Bourtange, de scheve toren van Bedum) |
| 15 | Aanlichten van kerken 's nachts | ja, tot middernacht, zoals in het echt veel gebeurt |
