> **Archief (oktober 2026).** Dit document is vervangen door `docs/PERF-METING-2026-10-19.md` (de actuele meting) en `.specs-fire/standards/mechanica.md`.
> Het staat hier alleen als historie: gebruik het niet als bron en werk het niet bij.

# Profiel van de hoofdthread (0.24, Architectuur)

> Historisch (stand 0.34): gemeten op 0.24 met alleen de stad en het oude Ommeland, vóór tegels, de provincie en de nieuwe wereldbouwer; de aantallen zijn verouderd, de methode (`scripts/perf`, `--cpu-throttle=4`) niet. Nieuwe metingen: issues #4 en #56.

Waar gaat de tijd van de hoofdthread heen op zwakke hardware? Gemeten op
3 oktober 2026 met `scripts/perf`, op de preset Laag (`quality:laag,
shadows:false, drawDistance:kort, resolution:0.75, autoResolution:true`) en
met een vier keer tragere CPU (`--cpu-throttle=4`), op de routes foot, ring,
heli en village. Dit profiel bepaalt wat er naar een worker gaat.

## Hoe

Twee bronnen, omdat de CPU-profiler zelf de meting verstoort:

- **Secties per frame** (`--hitch`): `hitchprobe.js` telt nu per frame de
  tijd van elke sectie op (`summary().sections`, gemiddelde ms per frame),
  zonder profiler. `scripts/perf/sections.py` groepeert ze in categorieën.
  Dit is de hoofdbron.
- **CPU-profiel** (`PERF_PROFILE=<routes>`): met `GDE_PROFILE_OUT=<map>`
  bewaart de desktop-app het ruwe profiel, en `scripts/perf/categories.mjs`
  verdeelt de samples over categorieën (elk sample telt voor de dichtstbij­
  zijnde spelcode op de stack; three.js telt voor wie het aanriep).
  `--incl=fnA,fnB` geeft de inclusieve tijd van functies. Het profiel komt
  hier zonder throttle: met throttle en profiler samen duurt een frame
  seconden. `GDE_PROFILE_INTERVAL` (µs) maakt het samplen grover; met
  `--cpu-throttle` laat de app de debugger nu aangekoppeld, anders viel de
  throttle weg na het eerste profiel.

**Kanttekening.** De machine was tijdens alle metingen zwaar belast: een
geïnstalleerde versie van de game draaide mee (ongeveer 190% CPU en de GPU), plus andere
agents (load average 15 tot 65 op 8 kernen). De absolute frametijden zijn
daardoor onbruikbaar (honderden ms tot seconden per frame). De **verhoudingen**
tussen de categorieën en de aantallen draw calls zijn wel bruikbaar.

## Verdeling per route (secties, Laag + CPU×4)

Aandeel van de hoofdthread-tijd per frame:

| route   | simulatie/AI | streaming/geometrie | actoren 3D | HUD/DOM | audio | render | camera/licht/fx |
|---------|------:|------:|------:|------:|----:|------:|----:|
| foot    | 22% | 32% | 13% |  6% | 0% | 26% | 2% |
| ring    | 12% | 48% |  8% | 12% | 0% | 16% | 5% |
| heli    | 11% | 33% |  3% | 15% | 2% | 30% | 5% |
| village | 12% | 17% | 12% | 20% | 0% | 32% | 8% |

Streaming/geometrie per route:

- **foot**: `cityprops` 14% (het samenvoegen van de straatmeubel-cellen),
  shader-warm-up 8%, gebouwen 5%, wegen 4%.
- **ring**: stadswegen 21% (`roadsurface.js buildRoadGroup`), stadswater 8%,
  warm-up 6.5%, Ommeland 4%, gebouwen 3%.
- **heli**: Ommeland (`3d:rail+country`) 24%, warm-up 5%.
- **village**: Ommeland 9%, warm-up 4%.

Uit het CPU-profiel (zonder throttle), als aandeel van de bezette tijd:

| route | native (GL-driver, stijl/layout) | render (three.js) | streaming | simulatie | actoren 3D | HUD/DOM | GC |
|-------|------:|------:|------:|------:|------:|------:|----:|
| foot  | 29% | 22% | 16% | 10% | 10% | 6% | 3% |
| ring  | 25% | 16% | 24% | 12% |  8% | 6% | 5% |
| heli  | 39% | 27% | 15% |  5% |  4% | 8% | 2% |

GC is klein (2 tot 5%). Audio is verwaarloosbaar: de synthese draait al in
een worker (`sfx/dspworker.js`).

## Grootste losse posten

- `cityprops.js mergeInstances`: 5.5% van de hoofdthread op foot, de grootste
  enkele functie buiten three.js. Een cel wordt bij elke terugkeer opnieuw
  samengevoegd.
- `roadsurface.js buildRoadGroup` en het stadswater (`scene3d.js syncWater`):
  samen 29% op de ring.
- Ommeland op de heli: de skyline (`gatherGen`, 2%), de tegels
  (`genTileSteps` 1.2%, `rebuildChunk` 1.1%), het water (0.6%), dorpen (0.4%).
  Per frame klein, maar in pieken: een chunk met water bemonstert tot 8.000
  punten per tegel.
- De minimap van het Ommeland (`countrymap.js drawCountryDetail`, `miniTile`)
  en `hud_panel.js`: 15 tot 20% op heli en village. Dat is DOM/canvas-werk,
  geen geometrie.
- Shader-warm-up (`scanForPrewarm`): 4 tot 8% op elke route.

## Besluit

1. **Worker voor geometrie** (deze stap): de kernels zonder afhankelijkheden
   van de wereld gaan eerst, omdat die bit voor bit gelijk te houden zijn:
   - het samenvoegen van de straatmeubel-cellen (`cityprops`, 14% op foot);
   - het water van het Ommeland (bemonsteren van het waterveld en de
     kanalen, samenvoegen, normalen).
2. **Na mesh ronde 4**: de stadswegen (oppervlak, stoep, markering) en
   tijdens het laden het terrein; zie "Ronde 2" hieronder. Het stadswater
   bleef op de hoofdthread: daarvan is het watervlak maar 25% van de tijd,
   de oevers en kades (`quaywalls.js buildShore`) 75%.
3. **Niet nu**: het uitleggen van de Ommeland-tegels (`genTileSteps`). Die
   code leunt op `countryplan` → `countryvillage` → `pedestrians` → het
   halve spel; in een worker vraagt dat eerst een splitsing in pure
   datamodules. Per frame is het klein (1 tot 2%) en al over frames
   verdeeld.
4. **Laadtijd** (stap 3) en de minimap zijn aparte posten; zie hieronder.

## Resultaat stap 2: geometrie-worker (A/B)

A = main (met dezelfde hitchprobe), B = `claude/workers`. Drie paren, om en
om, Laag + CPU×4 + `--hitch`, één Electron tegelijk. Gemiddeld over 3 runs,
in ms hoofdthread per frame:

| route | sectie | A | B |
|-------|--------|--:|--:|
| foot  | `cityprops` | 4.86 | 1.36 (−72%) |
| foot  | hele frame (cpu) | 105 | 82 |
| ring  | `cityprops` | 1.58 | 1.06 |
| ring  | Ommeland (`3d:rail+country`) | 1.59 | 1.39 |
| heli  | Ommeland (`3d:rail+country`) | 3.12 | 2.43 (−22%) |
| heli  | long tasks (bij ~465 frames) | 81 | 56 |

Mediaan (ab.sh): foot p99 200 → 150 ms, longMax 229 → 159 ms; heli p99
83 → 67 ms. Draw calls gelijk (foot 369/371, ring 233/231, heli 120/120).
Let op: de load daalde tijdens de reeks en A liep steeds eerst, dus de
hele-frame-cijfers bevoordelen B wat. De sectiecijfers meten de verplaatste
code zelf. Bit-gelijk: `geocheck.sh` gaf 240 cellen (2.54 M vertices) en
197 waterchunks identiek.

## Laadtijd (stap 3, alleen gemeten)

`window.__loadMarks` tot het titelscherm: met CPU×4 25.1 s (kaart 8.7 s,
init3D 4.9 s, rand van het Ommeland 2.5 s, wereld 5.6 s). Zonder throttle,
met profiler, 8.0 s. Daarvan: `loadMap` 2.1 s (de `GameMap`-constructor
1.65 s, waarvan `liftNestedRoofs` 0.46 s), `buildTerrainMesh3D` 0.77 s,
`initCountryEdge` 0.67 s.
- Het terrein bakken kost ~10 MB extra download (811k vertices) voor
  0.8 s: niet doen. Wel kan het in de worker, naast `GameMap`, zonder
  extra download (geschat ~0.8 s, ~3 s bij CPU×4).
- De afgeleide kaartdata (`liftNestedRoofs` en indexen) in het bouwscript
  bakken: ~0.5 s, kleine extra download.
- Allebei raken ze terrein, water en gebouwen, waar mesh ronde 4 aan
  werkte. Het terrein is na die ronde naar de worker gegaan (hieronder);
  bakken blijft af. De lat (30 s) wordt gehaald.

## Ronde 2: stadswegen en terrein in de worker (na mesh ronde 4)

- **Stadswegen**: de worker laadt een eigen kopie van de kaart (zelfde
  bestanden, zelfde `GameMap`, ~1 s zonder throttle, buiten de
  hoofdthread) en bouwt per weg het oppervlak, de stoep en de markering.
  De kunstwerken (dekken, muren, vangrails) blijven op de hoofdthread.
  Kosten: **~90 MB extra heap** in de worker (gemeten op de hoofdthread
  voor een tweede `GameMap`). Op een Chromebook met 4 GB is dat merkbaar;
  als dat een probleem blijkt, kan de worker na het laden de gebouwen uit
  zijn kopie laten vallen, of alleen het wegennet krijgen.
- **Terrein**: tijdens het laden (989k vertices, 528 tegels); de worker
  start al bij `boot`, zodat zijn modules laden terwijl de kaart binnenkomt.
- Bit-gelijk (`geocheck.sh`): alle 10.967 wegen (1.16 M vertices), het
  terrein, 283 cellen en 197 waterchunks.

A/B (main na mesh ronde 4 tegen `claude/workers`), Laag + CPU×4, drie paren,
load 4 tot 6 (rustige machine). Hoofdthread in ms per frame:

| route | sectie | A | B |
|-------|--------|--:|--:|
| ring | `3d:roads` | 1.22 | 0.82 (−33%) |
| foot | `cityprops` | 0.53 | 0.29 |
| ring | long tasks (gemiddeld, ~350 frames) | 57 | 44 |
| foot | long tasks (gemiddeld, ~340 frames) | 50 | 36 |

De hele frametijd verschilt niet meetbaar (ring 35.5 tegen 35.1 ms, foot
37.2 tegen 35.8 ms). De medianen van de long tasks schommelen (ring 36
tegen 43), dus het verschil daarin is ruis. De resterende pieken van 20 tot
25 ms in `3d:roads` komen van `staticbatch3d.js finishJob`, dat een hele
wegcel in één keer samenvoegt, en van de kunstwerken. Draw calls op de ring
zijn 223 tegen 234: de wegen komen een paar frames later binnen, en de
batcher voegt ze daarna samen.

Laden, CPU×4, twee paren: `init3D` gaat van 2.3 s naar 0.8 tot 0.9 s,
en het terrein is klaar vóór `systems` (er wordt niet op gewacht). Het
titelscherm komt op 11.0 en 11.3 s (A) tegen 9.8 en 11.1 s (B); in de
tweede B-run downloadde de kaart traag.

## BatchedMesh (stap 4): niet gedaan

Draw calls op Laag (`PERF_DIAG=1`): foot 413, ring 214, heli 129. De grote
posten zijn al samengevoegd (`building-batch`, `road-batch`,
`facade-batch`) of geïnstanced (Ommeland-props, skyline). Wat overblijft
zijn skinned mensen (die kan `BatchedMesh` niet aan), onderdelen van
voertuigen met elk een eigen materiaal of kleur, en de losse gebouwen en
wegen aan de rand van de batch-cellen. `BatchedMesh` in three r160 tekent elke
geometrie één keer (instancing via `addInstance` kwam pas in r166), heeft
`WEBGL_multi_draw` nodig om echt minder calls te geven, en kent geen
kleur per object. Er is dus geen groep die er duidelijk op vooruitgaat.
Opnieuw bekijken bij een three-upgrade.

## Ronde 3: geheugen, wegpieken, oevers, minimap

A/B (main tegen `claude/workers3`), Laag + CPU×4 + `--hitch`, om en om,
één Electron tegelijk onder `nice`, load 11 tot 23. Hoofdthread in ms per
frame, gemiddeld over 3 runs.

**Geheugen van de worker.** De worker houdt na het laden alleen wat hij
leest (`mapdata.js slimWorkerMap`): gebouwen alleen als grenzen in hun
raster, geen overkappingen en bomen. De kopie van de kaart is in Node
gemeten (zelfde V8, `scripts/perf/mapmem.mjs`, 3 keer): **64 MB → 33 MB
heap**. Wat overblijft lezen de wegen en oevers: hoogtes 11 MB, wegen
7 MB, het gebouwraster 6 MB, groen 4 MB. De eerdere "~90 MB" was een
schatting op de hoofdthread. Renderer-RSS 20 s na de start
(`scripts/perf/memcheck.sh`, 4 paren): main 1191–1473 MB, branch 948–1353
MB, gemiddeld −170 MB. Dat is ruis-gevoelig (in de pagina zelf meten lukt
niet: de hoofdthread maakt te veel afval), maar in elk paar lager.

**Wegpieken op de ring.** `finishJob` vult de buffers van een cel nu stap
voor stap binnen het budget (`finishWork`, een generator). Dat haalde de
piek níét weg: die kwam van `syncRoads`. Een weg waarvan de oppervlakken
al uit de worker terug waren, telde niet mee voor het budget, ook als hij
kunstwerken heeft (viaducten, taluds, verdiepte stukken, op de hoofdthread
gebouwd). Na een sprong kwamen de kunstwerken van de ring in één frame
binnen (42 nieuwe geometrieën). Die wachten nu op het volgende frame.
Alleen de ring, 3 paren:

| | A | B |
|---|--:|--:|
| frames met `3d:roads` ≥ 10 ms | 1 / 4 / 5 | 0 / 0 / 0 |
| max `3d:roads` (ms) | 15.9 / 38.2 / 51.7 | 6.3 / 8.3 / 4.9 |
| long tasks (mediaan) | 17 | 11 |
| langste long task (mediaan, ms) | 92 | 66 |
| p99 (ms) | 66.7 | 51.8 |

**Oevers en kades.** `quaywalls.js shoreParts` draait op de kaart van de
worker; de banken om te zitten en de rompen van de woonboten worden op de
hoofdthread toegepast als de onderdelen terug zijn. Ring, `3d:water`:
**0.42 → 0.12 ms** per frame (−71%).

**Minimap.** Zolang de CPU de bottleneck is (simload niveau 1–2) tekent
de minimap elk tweede of derde frame. Sectie `hud`:

| route | A | B |
|-------|--:|--:|
| heli | 5.3 | 2.6 (−51%) |
| village | 4.3 | 2.5 (−42%) |
| ring | 3.7 | 2.4 |
| foot | 3.6 | 2.2 |

Op de heli ging het hele frame van 24.7 naar 21.1 ms, de long tasks van
15/20/5 naar 0/1/1 en p95 van 50.4 naar 35.1 ms.

Draw calls bleven gelijk (ring 226–233, heli 123/124, village 115/116).
Bit-gelijk (`geocheck.sh`): alle 352 waterpolygonen (2.372 delen, 1,87 M
vertices, 6.565 zitplekken, 338 rompen) tussen hoofdthread en de
afgeslankte kaart van de worker; 60 cellen van de wegbatcher (232 meshes)
tegen de oude afronding in één frame; wegen, terrein, straatmeubels en
Ommeland-water nog steeds gelijk.

## Ronde 4: kunstwerken in de worker, HUD-portretjes

A/B (main tegen `claude/perf-rest`), alleen de ring met elke 4 s een sprong
van 600 m (`PERF_JUMP=4`), Laag + CPU×4 + `--hitch`, drie paren om en om,
één Electron tegelijk onder `nice`, load 7 tot 11. `hitchprobe.js` houdt nu
per sectie ook de piek bij (`summary().peaks`: hoogste ms in één frame en
het aantal frames ≥ 8 ms).

**Kunstwerken.** De eerste `roadGeo`-aanvraag van een weg brengt ook zijn
kunstwerken mee (`structureArrays` / `overpassDeckArrays` op de kaart van
de worker); de hoofdthread maakt er alleen meshes van en koppelt de
breekbare hekken en vangrails aan zijn eigen muren (`structureGroup`).

| | A | B |
|---|--:|--:|
| `3d:roads` (ms per frame) | 1.06 / 0.99 / 1.07 | 0.53 / 0.54 / 0.50 |
| hoogste `3d:roads` (ms) | 12.6 / 11.6 / 11.2 | 5.4 / 4.5 / 4.6 |
| frames met `3d:roads` ≥ 8 ms | 11 / 13 / 15 | 0 / 0 / 0 |
| long tasks | 63 / 57 / 57 | 44 / 47 / 46 |
| langste long task (ms) | 129 / 171 / 127 | 121 / 138 / 153 |
| p99 (ms) | 117 / 101 / 101 | 101 / 102 / 102 |

De hele frametijd verschilt nauwelijks (CPU 33.0–34.3 tegen 32.8–33.2 ms);
draw calls gelijk (235–241 tegen 242–243). Bit-gelijk (`geocheck.sh`): 463
wegen met kunstwerken, 1.237 meshes, 866k vertices en 7.149 breekbare
stukken, hoofdthread tegen worker; in Node ook tegen de oude
`buildRoadStructure` van main. `ring_probe.mjs`: 0.

**HUD-portretjes.** Een portret (`renderSnapshot`, 96×96) werd per sessie
al maar één keer getekend, maar wel bij elke start: het eerste 47–54 ms
(met de opwarming van de gedeelde renderer), het tweede 9.5–14.7 ms, als
losse long tasks buiten het frame (dus niet in `hud`). Ze gaan nu naar
localStorage (`gte-snapshots`, per versie, hooguit 8). Twee starts met
hetzelfde profiel: main tekent ze beide keren, de branch alleen de eerste
keer. De opwarming schuift dan naar de eerstvolgende andere snapshot (de
auto bij de snelheidsmeter: 33–35 → 55 ms); per start gaat het
snapshotwerk van ~92 ms in drie long tasks naar 55 ms in één.

## Wat nog kan

- Op de ring geeft de HUD bij een sprong nog frames van 30 tot 50 ms
  (`hud`, in A en B gelijk); dat is niet de minimap. In ronde 4 bleef de
  piek van `hud` onder 10 ms (hoogstens één frame ≥ 8 ms per run).
- ~~De snapshot van de auto bij de snelheidsmeter en de opwarming van de
  gedeelde renderer~~ (`claude/open-bugs`): snapshots komen nu in de
  rusttijd (`requestIdleCallback`, timeout 500 ms) in plaats van in een
  animatieframe. Bij de start wordt de Escapade vooraf gemaakt (dat warmt
  de renderer op) en elk voertuig waar je binnen 7 m van loopt ook, dus
  instappen kost geen lang frame meer. Nog niet in Electron gemeten.
- Het gebouwraster in de worker compacter (6 MB), en de hoogtes (11 MB)
  alleen voor de ringwegen.
- De Ommeland-tegels (`genTileSteps`), na een splitsing van `countryplan`
  in pure datamodules.

## Zichtafstand "heel ver" (Hoog, 0.27)

De preset Hoog staat sinds 0.27 op `drawDistance:heelver` (900 m in plaats
van 600); de standaardinstellingen blijven op `ver`. Een perf-run met de
Hoog-preset vergelijkt dus niet meer één-op-één met eerdere runs;
`--preset=drawDistance:ver` geeft de oude stand. Wat er extra in beeld komt
telt `node scripts/viewdist_estimate.mjs` (centrum: far-LOD-tegels 22 -> 40,
~185k -> 324k driehoeken; Ommeland: proptegels 63 -> 111). Nog niet in
Electron gemeten. Bij een stap omlaag van de automatische resolutie (onder
90%) of `cpuLevel` > 0 valt "heel ver" terug op 600 m.
