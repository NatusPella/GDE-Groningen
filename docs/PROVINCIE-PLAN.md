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
| Gebouwen 431,6k (int16 tegel-lokaal op 5 cm, delta-gecodeerd, type/hoogte 4 B) | ~370 MB | ~15 MB (~35 B/gebouw) | ~9 MB |
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
- **Tegel = binair blok** met een sectietabel (versie, offsets, lengtes),
  opgeslagen in packs (zie 2.4b). Coördinaten int16 tegel-lokaal in stappen
  van 5 cm (bereik ±1.638 m, dus 1 km + marge).
- **Secties:** gebouwen (veelhoek, hoogte, dak, type, gevelstijl, gaten en
  doorgangen), wegen (polylijn, klasse, breedte, rijstroken, eenrichting,
  laag, brug/tunnel, stoep/fietspad), kruispunten, water (veelhoek, lijn,
  peil, oever-type), landuse, bomen en puntobjecten, spoor, POI's en winkels,
  hoogte-raster, navigatie (weg-, fiets- en loopgraaf met poortknopen op de
  tegelrand), botsdata (statische colliders), kantstrook-slots, overlays.
- **Objecten over de rand:** een gebouw hoort bij de tegel van zijn
  zwaartepunt; een weg wordt op de rand geknipt met een gedeelde poortknoop.
  Zo is elke tegel los te laden en blijft de graaf heel.
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

- **Bron:** Electron leest tegels uit de packs in het app-pakket (`fs.read`
  op offset via de preload); het web via HTTP Range met een OPFS-cache
  (2.4b). Eén loader-interface, twee backends.
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
| Posities | **int16 tegel-lokaal, 5 cm**; hoogtes uint16 in cm boven −10 m NAP | float32; int32 | half zo groot, precisie ruim genoeg; ook de basis voor de zwevende oorsprong |
| Lijnen en veelhoeken | **delta + zigzag-varint**, kolomgewijs per sectie (alle x'en, dan alle y'en, dan de attributen) | rijgewijs; Protobuf/FlatBuffers | kolommen comprimeren 20-40 % beter; geen schema-runtime nodig; FlatBuffers is groter |
| Vooraf gebakken meshes (L3-horizon, iconen, GLB's) | **meshopt** (`EXT_meshopt_compression`, MIT, decoder in three) | Draco | meshopt decodeert ~10× sneller met een kleine WASM, en werkt goed samen met zstd; Draco is iets kleiner maar trager en zwaarder (decoder ~300 KB, blokkerend) |
| Compressie in rust | **zstd met een getraind woordenboek per sectietype** (decoder `fzstd`, MIT, in de worker); fallback gzip via `DecompressionStream` | gzip; brotli | kleine tegels winnen veel bij een woordenboek (schatting 15-30 % kleiner dan gzip); zstd decodeert sneller dan brotli in JS; GitHub Pages laat ons geen `Content-Encoding` kiezen, dus we comprimeren zelf |
| Container | **packs van 8 × 8 km** (~1-4 MB, ~100 per provincie) met een index (offset, lengte, hash per tegel); web: **HTTP Range**-verzoeken per tegel; Electron: `fs.read` op offset via de preload (de JS-tegenhanger van mmap, de OS-paginacache doet de rest) | een bestand per tegel | 3.000 losse bestanden zijn traag in installers, zips en cache-API's; met Range is het nog steeds één verzoek per tegel. In dev-modus schrijft de bouwer wel losse bestanden (makkelijk te diffen) |
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
| Download (desktop, hele game) | ≤ 230 MB | | |
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
  - de download ≤ 230 MB.
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
- seizoensevents (oogst, carbid, winter-ijs);
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
| 3 | Maximale downloadgrootte desktop | ≤ 230 MB totaal (nu 178 MB) |
| 4 | De webversie op volle provincie? | ja, met streaming; eerste keer ≤ 25 MB |
| 5 | Verhaal: een **Deel 4** na de epiloog, of alleen vrij spel in de provincie? | Deel 4 "Nazomer" (zie verhaal-document), met de bestaande drie delen ongewijzigd |
| 6 | Gaswinning en aardbevingen | een stille, respectvolle zijlijn zonder grappen over de schade (zie het verhaal-document), of helemaal niet; jouw keus |
| 7 | De grens: Friesland, Drenthe en Duitsland | een eenvoudige rand (L2-kwaliteit, geen missies); Eelde blijft het enige stuk Drenthe met detail |
| 8 | Getij in het spel | ja, in F5; eerst vaste vloed |
| 9 | 3D BAG (CC BY) voor gebouwhoogtes en daken | ja, met vermelding; anders alleen OSM + type-defaults |
| 10 | Winterinhoud (ijs, schaatstocht) breekt het "zomer"-idee | als los event na Deel 4, onder de titel van het deel |
| 11 | De naam blijft "GDE Groningen – Zomer vol misdaad" | ja; Deel 4 speelt in de nazomer, de ondertitel klopt nog |
| 12 | Volgorde: eerst F0-F2 (techniek) of eerder inhoud? | F0 (+ LK1 parallel) → F1 met kleine inhoud → F2/F3 parallel met F4a-scripts |
| 13 | RD New: de omzetting van ~150 handgeplaatste coördinaten via een codemod of via een `P(x, y)`-helper | eerst de helper (veilig, te testen), daarna in één keer vastzetten |
| 14 | Hoeveel iconen met de hand (en GLB-modellen via Claude Design)? | 30 met de hand op de bouwdoos; GLB alleen voor 3-5 (Menkemaborg, Bourtange, de scheve toren van Bedum) |
| 15 | Aanlichten van kerken 's nachts | ja, tot middernacht, zoals in het echt veel gebeurt |
