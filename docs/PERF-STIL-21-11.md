# Stille meting 21-11-2026: 0.44.0, 0.64.0 en main op Laag, Hoog en Ultra (#1008, #1015)

> Opdracht: een eerlijke, exclusieve meting (de eerdere metingen waren onbetrouwbaar door 70 tot 100% CPU van andere agents): is er een regressie
> sinds 0.44, per preset en waar, en is main beter dan 0.64? Tak `perf-stil-21-11` vanaf main `eba31ad1e`. Niets gepusht of gemerged.

## Meetopzet

- **Machine stil:** nacht van 20 op 21-11, één Electron (de slotbewaker `perfstil`), CPU vóór elke run 8 tot 22% (de run-logboeken staan hieronder;
  elke run gebruikt een eigen wegwerpprofiel en eigen TEMP in `.pb/`, niet in %TEMP%). Eén blijvende uitzondering: een verweesde
  `electron.exe` (renderer, pid 5220, van een eerdere agentsessie, ouder weg, ca. 136 MB) draaide de hele nacht mee op de achtergrond; niet van mij en niet
  aangeraakt. Vrij geheugen 4,3 tot 7,8 GB. RTX 3060, 1920x1080, `--force-device-scale-factor=1`, geluid uit (`--stil`).
- **Drie builds, dezelfde wereld en dezelfde Electron:** `v0.44.0`, `v0.64.0` en main (`eba31ad1e`), elk gestaged met de wereld
  `game/world` uit de hoofdmap (91 bestanden), allemaal op Electron 45.2.3 (de binary uit de hoofdmap). De 0.44-code draait met de
  nieuwe wereld zonder fouten (alle runs `ok`).
- **Meting:** de ingebouwde `--benchmark=1` (24 shots, vaste route, het spel start als een speler) met `--bench-eval` (`bhook.js`: heap elke seconde,
  longtasks via `PerformanceObserver`) en `game/js/benchstats.js` voor gem. fps, p95 en laagste 1%. De presets via `--preset=` met de
  sleutels uit `gfxprofile.js` (de naam zelf kent `--preset` niet):
  - Laag = `quality:laag,shadows:false,drawDistance:kort,resolution:0.75,autoResolution:true`
  - Hoog (preset `vlot`) = `quality:hoog,shadows:true,drawDistance:kort,resolution:1,autoResolution:true`
  - Ultra (preset `hoog`) = `quality:hoog,shadows:true,drawDistance:heelver,resolution:1,autoResolution:true`
- **Volgorde:** per ronde en per preset 0.44, 0.64, main (A B C), 3 rondes. Getal = mediaan van 3, tussen haakjes min en max.
- **Niet gemeten: GC-aandeel.** `--js-flags=--trace-gc` levert de regels van de renderer niet in de pipe (alleen van een ander proces); het
  GC-aandeel in dit rapport is dus **niet gemeten**. Wat er is: heappiek en longtasks > 50 ms. Het GC-aandeel uit de CPU-profielen staat in
  `PERF-PROFIEL-21-11.md` (4,6 tot 5,6% van de hoofdthread in de stad, 11% op de a7), maar dat is op 0.64.0 plus fixes en niet voor 0.44.
- **Niet gemeten: laadtijd van 0.44.** De tijd tot de eerste speelbare frame is alleen voor 0.64 en main gemeten (`filmwarm.mjs`).
- De benchmark meet het hele traject inclusief de eerste minuut na de start (de eerste zes shots vallen in de opwarmfase), niet alleen
  stabiele fps. Dat blijkt de sleutel van de uitkomst (zie "Waar zit de regressie").

## Uitkomst in één alinea

Er **is een regressie sinds 0.44.0, op alle drie de presets, en ze is reproduceerbaar** (de min/max-banden van 0.44 en 0.64 overlappen niet):
gem. fps Laag 53,0 naar 46,8 (-12%), Hoog 48,5 naar 42,1 (-13%), Ultra 42,7 naar 34,4 (-19%). **Main is beter dan 0.64** maar herstelt maar
ongeveer de helft (Laag 50,5, Hoog 44,9, Ultra 38,9) en blijft onder 0.44. De regressie zit in de **opwarmfase na de start** (de eerste ca. 60 s: de
shots Noorderplantsoen, Vismarkt, Zonsopgang, Tessa) en bij Ultra ook in de stabiele stad; in de rustige stad op Laag en Hoog zit 0.64 hooguit 1 tot 4 fps onder 0.44.
Een tweede, aparte regressie is geheugen/longtasks: 0.64 heeft ongeveer het dubbele aantal longtasks van 0.44 (122 tegen 63 op Laag); main zit ertussen (101).
Main heeft wel de laagste JS-heappiek van de drie (Laag 2291 MB tegen 3027 en 2908).

## Tabellen: benchmark, mediaan (min-max) van 3 runs

### Laag

| versie | gem. fps | p95 ms | laagste 1% fps | heappiek MB | longtasks > 50 ms |
|---|---|---|---|---|---|
| 0.44.0 | 53,0 (52,3-53,6) | 34,4 (34,3-34,4) | 18,1 (12,2-21,0) | 3027 (2506-3032) | 63 (55-64) |
| 0.64.0 | 46,8 (44,9-47,0) | 35,6 (35,2-36,3) | 4,5 (4,5-4,7) | 2908 (2797-2969) | 122 (121-134) |
| main | 50,5 (49,1-50,7) | 35,4 (35,1-35,6) | 10,6 (8,6-11,1) | 2291 (2108-2333) | 101 (97-109) |

### Hoog (preset `vlot`, de standaardinstelling)

| versie | gem. fps | p95 ms | laagste 1% fps | heappiek MB | longtasks > 50 ms |
|---|---|---|---|---|---|
| 0.44.0 | 48,5 (45,9-49,3) | 35,8 (35,5-36,3) | 9,4 (8,9-10,3) | 2984 (2979-2988) | 89 (87-128) |
| 0.64.0 | 42,1 (39,0-42,9) | 36,3 (36,3-52,5) | 4,2 (4,0-4,6) | 3011 (2861-3104) | 156 (141-166) |
| main | 44,9 (43,6-45,1) | 36,4 (36,3-36,5) | 6,8 (6,3-7,5) | 2364 (2321-2810) | 134 (134-160) |

### Ultra (preset `hoog`)

| versie | gem. fps | p95 ms | laagste 1% fps | heappiek MB | longtasks > 50 ms |
|---|---|---|---|---|---|
| 0.44.0 | 42,7 (39,1-43,5) | 36,4 (36,4-53,4) | 7,8 (6,3-8,3) | 3481 (3471-3495) | 172 (161-203) |
| 0.64.0 | 34,4 (32,8-35,6) | 54,4 (53,9-54,5) | 4,1 (4,0-5,1) | 3214 (2932-3614) | 286 (279-299) |
| main | 38,9 (35,3-39,6) | 52,6 (52,6-54,4) | 6,1 (5,9-6,8) | 2688 (2633-2711) | 225 (218-267) |

Let op bij het lezen: de p95 ligt op Laag en Hoog bij alle versies rond 35 tot 36 ms, dus p95 onderscheidt daar niet; op Ultra is het wel een echte stap (52 tot 54 ms in 0.64 en main tegen 36 ms in 0.44). De laagste 1% is de zwakste maat: het zijn de hitches van de opwarmfase, met de grootste spreiding.

## Waar zit de regressie: per shot (Hoog, mediaan fps, gesorteerd op verlies 0.44 naar 0.64)

De benchmark loopt in een vaste volgorde; de eerste shots (Noorderplantsoen, Tessa, Vismarkt, Zonsopgang) vallen in de eerste minuut na de start.

### per shot, hoog: mediaan fps

| shot | 0.44 | 0.64 | main |
|---|---|---|---|
| Noorderplantsoen | 48.5 | 11.9 | 28.6 |
| Tessa | 43.9 | 14.6 | 43.4 |
| Terrassen op de Vismarkt | 37.6 | 10.1 | 16.0 |
| Zonsopgang bij de Martinitoren | 29.3 | 22.5 | 17.9 |
| Storm boven het Forum | 52.3 | 47.1 | 50.1 |
| Nacht in de Poelestraat | 56.2 | 52.0 | 52.2 |
| Tammo | 50.3 | 46.6 | 43.9 |
| Achtervolging door de binnenstad | 52.1 | 48.5 | 47.9 |
| Jelle Terpstra | 54.5 | 51.1 | 51.0 |
| Bijna | 55.6 | 52.8 | 53.6 |
| Race op de ringweg | 55.6 | 53.4 | 53.8 |
| Kermis op de Grote Markt | 54.0 | 52.1 | 52.3 |
| Durk & Douwe | 56.0 | 54.4 | 55.8 |
| Traumaheli boven het UMCG | 29.2 | 28.6 | 29.0 |
| Duif langs de Martinitoren | 56.5 | 56.0 | 54.6 |
| Rondvaartboot op de Diepenring | 34.9 | 34.4 | 33.6 |
| De Gouden Eierbal | 56.2 | 56.0 | 55.1 |
| Tankwagen op de Europaweg | 56.4 | 56.8 | 55.8 |
| Luchtfoto bij zonsondergang | 55.8 | 56.5 | 56.3 |
| De Escapade in de Herestraat | 47.9 | 49.8 | 50.5 |
| Berend | 46.6 | 49.3 | 51.4 |
| De Ommelanden | 48.8 | 56.1 | 56.0 |

Op Laag en Ultra is het beeld hetzelfde (alleen de zwaarste verliezers):

### Laag
| shot | 0.44 | 0.64 | main |
|---|---|---|---|
| Terrassen op de Vismarkt | 53.1 | 15.8 | 43.8 |
| Zonsopgang bij de Martinitoren | 55.2 | 18.8 | 26.9 |
| Achtervolging door de binnenstad | 53.5 | 48.0 | 51.5 |
| Noorderplantsoen | 41.0 | 36.6 | 45.4 |
| Traumaheli boven het UMCG | 33.9 | 31.2 | 32.4 |
| Rondvaartboot op de Diepenring | 43.3 | 41.0 | 39.7 |

### Ultra
| shot | 0.44 | 0.64 | main |
|---|---|---|---|
| Noorderplantsoen | 40.0 | 8.8 | 14.8 |
| Terrassen op de Vismarkt | 30.0 | 11.7 | 16.9 |
| Jelle Terpstra | 49.9 | 38.2 | 44.7 |
| De Escapade in de Herestraat | 42.9 | 31.4 | 36.0 |
| Durk & Douwe | 52.6 | 41.4 | 43.3 |
| Race op de ringweg | 50.9 | 41.5 | 49.4 |
| Kermis op de Grote Markt | 52.4 | 43.8 | 49.2 |
| Tankwagen op de Europaweg | 52.7 | 47.2 | 49.0 |

Lezing: 0.64 verliest vooral in de opwarmfase (Noorderplantsoen op Hoog 48,5 naar 11,9 fps, Vismarkt 37,6 naar 10,1, Zonsopgang 29,3 naar 22,5; op Laag
Vismarkt 53,1 naar 15,8). Main herstelt daarvan een deel (Tessa terug op 43 fps, Vismarkt op Laag 43,8, Noorderplantsoen op Laag zelfs boven 0.44) maar
niet alles (Vismarkt op Hoog 16 fps, Zonsopgang 18 tot 27). In de rustige stad (Nacht in de Poelestraat, Kermis, Race, Duif, Tankwagen) zijn de drie versies op Hoog gelijk. Op Ultra
verliest 0.64 ook in de stad (Jelle Terpstra 49,9 naar 38,2, Escapade 42,9 naar 31,4, Durk & Douwe 52,6 naar 41,4); main herstelt dat voor ongeveer de helft.
Dat is consistent met `PERF-START-21-11.md`: de stilstand zit na de start (programma's linken, tegels streamen, heap die groeit), niet in een bepaalde preset.
**Oorzaak niet bewezen:** dit rapport wijst het gebied aan (de eerste minuut, plus de heelver-zichtafstand op Ultra), niet de commit. Een bisect over 0.44 naar 0.64
met deze opzet (elke stap ca. 2 min per run) is de volgende stap; de bestaande bisect-data in de oude worktree (`.pb/out/*.json`, andere wereld per versie,
belaste machine) is niet vergelijkbaar met deze.

## Start van een nieuw spel (`scripts/perf/filmwarm.mjs`, 1280x720, echte GPU, 3 runs per kant, afwisselend)

| versie | tijd tot game-started (s) | frames > 50 ms in de eerste 60 s | frames > 100 ms | langste frame (ms) | compile-startstap (s) | programma's op 25 s per run |
|---|---|---|---|---|---|---|
| 0.64.0 | 27 (27-28) | 95 (93-99) | 22 (20-26) | 917 (634-1208) | 10 (10-10) | 303; 307; 307 |
| main | 29 (29-29) | 64 (58-76) | 20 (15-21) | 1078 (812-1491) | 12 (10-12) | 313; 317; 317 |

Main laadt ca. 2 s langer (de filmlicht-prewarm in porties) maar heeft een derde minder haperingen > 50 ms in de eerste minuut (64 tegen 95, banden overlappen niet).
Frames > 100 ms en het langste frame zijn niet te onderscheiden (de banden overlappen, het langste frame is een eenmalige piek). Het aantal programma's na de start
(ca. 45 tot 50 erbij tussen 0 en 25 s) is niet gedaald: de hitches die blijven zijn dus waarschijnlijk dezelfde bekende late programma's (zie `PERF-START-21-11.md`). Dit filmwarm-pad
(zonder `--stil`, het echte pad) is een ander pad dan de benchmark hierboven, die in `--stil` start. 0.44 is hier niet gemeten.

## Electron 45.2.3 tegen 45.3.3 (#879), gepaard met main, 3 runs, afwisselend

| preset | build | gem. fps | p95 ms | laagste 1% | heappiek MB | longtasks |
|---|---|---|---|---|---|---|
| Hoog | main, Electron 45.2.3 (run 4-6) | 45,4 (45,3-45,5) | 36,3 (36,2-36,3) | 7,1 (6,6-7,5) | 2264 (1926-2583) | 136 (132-146) |
| Hoog | main, Electron 45.3.3 | 45,9 (45,4-46,3) | 36,3 (35,8-36,3) | 7,6 (7,5-8,1) | 2742 (2652-2816) | 137 (136-138) |
| Ultra | main, Electron 45.2.3 (run 4-6) | 39,6 (39,4-40,2) | 52,5 (52,1-52,7) | 6,9 (6,8-7,0) | 2609 (2516-2775) | 216 (205-229) |
| Ultra | main, Electron 45.3.3 | 39,3 (39,2-39,7) | 52,7 (52,0-52,8) | 6,8 (6,5-7,0) | 2748 (2643-2749) | 221 (216-239) |

Gelijk binnen de ruis op fps, p95, laagste 1% en longtasks. De heappiek ligt met 45.3.3 ca. 100 tot 480 MB hoger, maar de bandbreedte van 45.2.3 zelf is 1926 tot 2583
MB (de heappiek van main schommelt tussen runs; zie ook de runs 1 tot 3 van main: 2321 tot 2810). Dat is dus geen aantoonbare achteruitgang; het is wel het enige punt waar 45.3.3 niet beter is, en het is niet verder onderzocht.
Besluit: **bump doorgevoerd** (eigen commit, `desktop/package.json` en lockfile, de exacte versie 45.3.3 vastgezet: een caret gaf in de lockfile 45.4.1, die is niet gemeten).
Desktop-tests groen: `desktop_args`, `desktop_guards`, `desktop_packaging`, `desktop_preload`, `desktop_throttle`, `gpudiag`. De volledige `--fase=licht` en een
echte `npm ci` plus `npm run release`-bouw zijn **niet** gedraaid (dat is aan de coördinator); de playtest van 45.3.3 op macOS (dmg) is niet gedaan.

## Wat doorgevoerd is en wat niet

- **Doorgevoerd:** alleen de Electron-bump (zie boven). Eén commit.
- **Niet doorgevoerd, bewust:** geen standaardinstelling voor LOD per preset, geen drempels voor adaptieve kwaliteit, geen Ultra-detailafstand. Reden: de data wijst de
  regressie aan in de opwarmfase, en daar helpt een andere presetwaarde niet (die is op Laag even groot als op Ultra); op Ultra is het verschil Hoog tegen Ultra in
  deze meting 6 tot 9 fps (0.44: 48,5 tegen 42,7; main: 44,9 tegen 38,9), maar dat is de bewuste prijs van `heelver` en geen regressie die we hier kunnen bewijzen als winst
  van een andere standaard. Een wijziging van een standaard zonder een gepaarde A/B van de speler-ervaring zou een gok zijn.
- **Volgende stappen (niet gedaan):** (1) bisect 0.44 naar 0.64 op de opwarmfase met deze opzet (shots 2 tot 5 en `filmwarm`-hitches), gericht op de commit die de
  eerste minuut zwaarder maakte; (2) de heap- en longtask-stijging in 0.64 (2x longtasks) op Laag; (3) Ultra in de stad: wat in 0.64 de heelver-weergave 8 tot 11 fps
  duurder maakte dan in 0.44; (4) GC-aandeel meten met een CPU-profiel (`--benchmark --profile`) per versie, nu niet gedaan.

## Runlogboek (alle 39 runs plus de rooktest main-laag-0; CPU vóór de run en vrij geheugen erbij)

Run-naam: versie-preset-ronde. `main-*-4..6` en `e453-*` zijn de Electron-vergelijking. Alle runs `ok`, geen enkele afgebroken (drempel CPU 25%; hoogste CPU vóór een run: 22%).

| run | gem. fps | p95 ms | laagste 1% | heappiek MB | longtasks | langste longtask ms | wand s | CPU% voor | vrij GB |
|---|---|---|---|---|---|---|---|---|---|
| 0.44.0-hoog-1 | 48.5 | 35.8 | 8.9 | 2988 | 89 | 9535 | 129 | 22 | 6.8 |
| 0.44.0-hoog-2 | 45.9 | 36.3 | 9.4 | 2979 | 128 | 10421 | 132 | 17 | 7.1 |
| 0.44.0-hoog-3 | 49.3 | 35.5 | 10.3 | 2984 | 87 | 9366 | 128 | 9 | 7.5 |
| 0.64.0-hoog-1 | 42.1 | 36.3 | 4.2 | 2861 | 141 | 6955 | 126 | 10 | 7 |
| 0.64.0-hoog-2 | 39.0 | 52.5 | 4.0 | 3011 | 166 | 9541 | 132 | 14 | 7.5 |
| 0.64.0-hoog-3 | 42.9 | 36.3 | 4.6 | 3104 | 156 | 9516 | 126 | 9 | 7.5 |
| main-hoog-1 | 44.9 | 36.3 | 6.3 | 2364 | 134 | 7325 | 120 | 8 | 7 |
| main-hoog-2 | 43.6 | 36.5 | 7.5 | 2810 | 160 | 9506 | 122 | 16 | 6.7 |
| main-hoog-3 | 45.1 | 36.4 | 6.8 | 2321 | 134 | 5738 | 118 | 8 | 7.5 |
| main-hoog-4 | 45.4 | 36.3 | 7.1 | 2583 | 146 | 7203 | 119 | 13 | 7.3 |
| main-hoog-5 | 45.5 | 36.3 | 7.5 | 2264 | 136 | 7461 | 119 | 10 | 7.4 |
| main-hoog-6 | 45.3 | 36.2 | 6.6 | 1926 | 132 | 8215 | 120 | 10 | 7.4 |
| e453-hoog-1 | 45.9 | 36.3 | 8.1 | 2742 | 138 | 8059 | 119 | 12 | 7.5 |
| e453-hoog-2 | 45.4 | 36.3 | 7.6 | 2652 | 136 | 7307 | 119 | 11 | 7.4 |
| e453-hoog-3 | 46.3 | 35.8 | 7.5 | 2816 | 137 | 5760 | 117 | 11 | 7.3 |
| 0.44.0-laag-1 | 52.3 | 34.4 | 12.2 | 2506 | 64 | 5436 | 121 | 14 | 6.1 |
| 0.44.0-laag-2 | 53.6 | 34.3 | 21.0 | 3032 | 55 | 5474 | 117 | 9 | 7.2 |
| 0.44.0-laag-3 | 53.0 | 34.4 | 18.1 | 3027 | 63 | 5938 | 118 | 17 | 7.1 |
| 0.64.0-laag-1 | 47.0 | 35.2 | 4.7 | 2908 | 121 | 1738 | 114 | 11 | 6.8 |
| 0.64.0-laag-2 | 44.9 | 36.3 | 4.5 | 2797 | 134 | 1535 | 116 | 13 | 7.3 |
| 0.64.0-laag-3 | 46.8 | 35.6 | 4.5 | 2969 | 122 | 2764 | 115 | 11 | 7.6 |
| main-laag-0 | 50.1 | 35.4 | 8.6 | 2343 | 100 | 1656 | 119 | 8 | 4.3 |
| main-laag-1 | 50.5 | 35.4 | 10.6 | 2291 | 97 | 1524 | 107 | 10 | 6.9 |
| main-laag-2 | 49.1 | 35.6 | 8.6 | 2108 | 109 | 1627 | 109 | 22 | 7.2 |
| main-laag-3 | 50.7 | 35.1 | 11.1 | 2333 | 101 | 1499 | 108 | 12 | 7.5 |
| 0.44.0-ultra-1 | 43.5 | 36.4 | 8.3 | 3481 | 161 | 9628 | 130 | 10 | 7 |
| 0.44.0-ultra-2 | 39.1 | 53.4 | 6.3 | 3495 | 203 | 10605 | 131 | 22 | 7.2 |
| 0.44.0-ultra-3 | 42.7 | 36.4 | 7.8 | 3471 | 172 | 9860 | 128 | 11 | 7.5 |
| 0.64.0-ultra-1 | 34.4 | 54.4 | 4.1 | 3614 | 286 | 4382 | 126 | 9 | 7.6 |
| 0.64.0-ultra-2 | 32.8 | 54.5 | 4.0 | 3214 | 299 | 5932 | 128 | 17 | 7.7 |
| 0.64.0-ultra-3 | 35.6 | 53.9 | 5.1 | 2932 | 279 | 5253 | 122 | 14 | 7.7 |
| main-ultra-1 | 38.9 | 52.6 | 6.1 | 2711 | 218 | 3892 | 117 | 10 | 7.8 |
| main-ultra-2 | 35.3 | 54.4 | 5.9 | 2633 | 267 | 5453 | 121 | 18 | 7.2 |
| main-ultra-3 | 39.6 | 52.6 | 6.8 | 2688 | 225 | 4679 | 117 | 11 | 7.4 |
| main-ultra-4 | 39.4 | 52.7 | 6.8 | 2775 | 216 | 5091 | 117 | 11 | 7.4 |
| main-ultra-5 | 39.6 | 52.5 | 6.9 | 2609 | 229 | 4428 | 117 | 9 | 7.4 |
| main-ultra-6 | 40.2 | 52.1 | 7.0 | 2516 | 205 | 4748 | 118 | 8 | 7.3 |
| e453-ultra-1 | 39.3 | 52.8 | 6.5 | 2748 | 239 | 5404 | 118 | 12 | 7.4 |
| e453-ultra-2 | 39.7 | 52.0 | 6.8 | 2749 | 216 | 4424 | 118 | 13 | 7.4 |
| e453-ultra-3 | 39.2 | 52.7 | 7.0 | 2643 | 221 | 4171 | 116 | 16 | 7.2 |
