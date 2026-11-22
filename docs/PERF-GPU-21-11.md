# GPU- en renderprestaties (21-11-2026, #1039): drawcalls, schaduwen, detailring, AMD

> Aanleiding: Nikky (AMD RX 9070 XT) haalt in de benchmark 13 tot 24 fps, ook op Laag haperen er beelden, en Ultra kost in de
> stad ca. 425 drawcalls en 400k driehoeken meer dan Hoog (zie [PERF-RENDER-21-11.md](PERF-RENDER-21-11.md)). Eigenaar: "dikke
> performance boosten". Deze ronde is vooral **bouwen**, met `renderer.info`/GL-tellingen als bewijs; frametijden zijn niet
> betrouwbaar gemeten (zie "Niet bewezen"). Tak `worktree-agent-a128fdc5373cb52f8` op main (v0.64.0) plus `integratie-21-11-b`.
> Niets gepusht of gemerged.

## Meting: drawcalls per frame, Ultra, voor en na

`scripts/perf/run.mjs` met `PERF_ONLY=det PERF_DIAG=1`, preset `quality:hoog,drawDistance:heelver` (Ultra), 1920x1080, vier vaste
camerapunten, mediaan over 60 beelden nadat de batches uitgebouwd zijn. GL-aanroepen per frame (`drawElements` en varianten; een
multi-draw telt als 1). Voor = main plus integratie (`desktop/build/base`), na = deze tak (`desktop/build/after`), beide met de wereld
van `agent-a93f4c9a4e68bfc0e`. **Eén run per kant, geen herhalingen, machine belast** (CPU 22% voor de eerste run, 66% voor de tweede,
andere agents): de tellers zijn deterministisch per toestand, maar de toestand na het uitbouwen (welke wegen en water nog los staan)
verschilt van run tot run. Lees de kolom "na" als een steekproef, niet als een exacte waarde.

| Plek | Calls voor | Calls na | Verschil | Driehoeken voor | Driehoeken na | Programmawissels voor/na |
|---|---|---|---|---|---|---|
| stad-markt (station en markt) | 410 | 212 | -48% | 924k | 554k (-40%) | 96 / 89 |
| stad-straat (voerplek met duiven) | 311 | 231 | -26% | 571k | 539k (-6%) | 92 / 93 |
| dorp-winsum | 256 | 247 | -4% | 549k | 513k (-7%) | 102 / 98 |
| a7-tussen (ommeland) | 110 | 161 | +46% | 340k | 326k (-4%) | 71 / 75 |
| **stad (markt + straat)** | **721** | **443** | **-39%** | 1495k | 1093k (-27%) | |

- **Doel -30% drawcalls in de stad op Ultra: gehaald op de twee stadsplekken (-39%)**, maar met de ruis hierboven. Dorp en ommeland
  gaan niet vooruit: **a7-tussen is 51 calls hoger**. Dat zit in water (4,9 naar 18 losse meshes), losse wegen (4,9 naar 9) en de pools
  (21,6 naar 25), niets wat deze ronde raakt; ik schrijf het toe aan de toestand na het uitbouwen (batches, tegels), niet aan de
  wijzigingen, maar dat is niet bewezen (geen herhaling).
- Programma's 322 naar 296 tot 335 naar 312 (de rest van de 322 is wat er al geladen was); niet gericht gewijzigd.
- De CPU-tijd van de `render`-aanroep (9 naar 6,8 ms, 9,3 naar 5,3, 11,5 naar 5,2, 14,3 naar 8,1) is **niet bruikbaar als bewijs**: andere
  belasting op de machine. Hij wijst wel dezelfde kant op als de tellers.

### Waar de calls vandaan kwamen (eigenaarsverdeling, `PERF_DIAG=1`, voor)

| Eigenaar | stad-markt | stad-straat | Wat |
|---|---|---|---|
| perrons (MeshStandard + Basic) | 63,8 | 0 | per paaltje en per mast een eigen mesh (en een bord per trap) |
| duiven (`u:Mesh top=Group{}`, ~28 meshes per vogel) | 0 | ca. 100 | vier vogels per voerplek, `pigeonspots.js` |
| losse wegen (`road Buffer<100`) | 42,5 | 3,9 | wegen die buiten de batch vallen |
| pools (multi-draw per materiaal) | 33,8 | 17,7 | één draw per materiaal, 50 tot 57 pools |
| terrein | 18,4 | 5,9 | |
| voetgangers (skinned) | 17,4 | 19,9 | een draw per persoon |
| bloom-keten (ShaderMaterial `top=self`) | 13,5 | 13,8 | de volle-scherm-quads, constant ca. 14 |
| oevers (`shore-batch`) | 11,6 | 0 | `pool: false` |

De bloom-keten (ca. 14 quads) telt als drawcalls maar kost bijna niets: de meeste zijn kleine mips.

## Gedaan (elk een eigen commit)

| # | Punt | Wat | Bewijs |
|---|---|---|---|
| 1 | (a) drawcalls: vogels | `game/js/birdbake.js` (22-11 vervangen door `duifmodel.js`, zelfde 11 meshes): de delen die samen bewegen (lijf, kop, staart, elke vleugelhelft, elke poot) worden per groep één mesh met vertexkleuren; de glanzende nek houdt zijn eigen materiaal. 31 meshes per duif naar 11 (meeuw 9). `poseBird` onaangeroerd; `body.children[0]` blijft het lijf (pigeonspots). | `birdbake_test` (7), na-run: duiven stad-straat van ca. 100 naar ca. 35 calls |
| 2 | (a) drawcalls: perrons | Paaltjes en masten zijn elk één `InstancedMesh` in `perrons3d.js` (was een mesh per stuk). Borden blijven los (eigen tekstuur). | `perrons_test` (55, nieuw: instanced en meshtelling); markt: perrons 63,8 naar 0 |
| 3 | (c) far-LOD / ring | `DETAIL_DIST.hoog` 190 naar 170 m (alleen Ultra; Hoog heeft 140 m). Ringoppervlak 1,84x naar 1,47x van 140 m; de verre laag neemt de gebouwen tussen 170 en 190 m over. | `viewdist_test`, `gfx_budget_test`; markt -40% driehoeken |
| 4 | (b) schaduwen | Hoog (zichtafstand kort of normaal) gebruikt een schaduwkaart van 2048, alleen Ultra (ver, heel ver) 4096. Zelfde 3,1 cm per texel op 32 m halve breedte; een kwart van de texels, -50 MB. Bij het wisselen van zichtafstand in Instellingen telt de nieuwe maat meteen (geen 120 s hysterese). | `shadowlevel_test` (11), `gfx_budget_test` |
| 5 | (3) AMD en Windows | `desktop/gpuflags.cjs`: `ignore-gpu-blocklist` (een nieuwe GPU of driver valt anders terug op software) en op Windows `disable-features=CalculateNativeWinOcclusion`. `GDE_GPU_FLAGS=0` zet het uit. ANGLE/D3D11 en vsync blijven zoals ze zijn, bewust (zie hieronder). | `gpuflags_test` (6), `desktop_packaging_test` |
| 6 | (e) benchmarkadvies | `recommendStand`: een vergrendelde 60 fps (gem. >= 57, 1%-low >= 52, p95 <= 18 ms) telt als ruimte. Op een 60 Hz-scherm haalde het gemiddelde nooit 75, dus een snelle GPU kreeg nooit een hogere stand. Ultra voor een vergrendelde 60 alleen bij 1%-low >= 56 en p95 <= 17,4. | `benchstats_test` (4 nieuwe controles) |
| 7 | (g) overdraw | De schermvullende `backdrop-filter` van de lage-gezondheidslaag stond ook bij opacity 0 in de compositor; nu `visibility: hidden` zodra hij weg is. | `lowhealth_test`; niet gemeten |

## Budget per preset (puur, `node scripts/gfx_budget_test.mjs --tabel`)

| Preset | Zichtafstand | Detailring | Ring (opp. t.o.v. 140 m) | Schaduwkaart | MSAA | Bloom | Pixelratio (max) |
|---|---|---|---|---|---|---|---|
| Laag | 150 m | 140 m | 1x | uit | 4x (alleen de uitvoerpas; het canvas heeft eigen AA) | nee | 0,75 |
| Midden | 350 m | 160 m | 1,31x | 2048 (16,8 MB) | 2x | nee | 1,5 |
| Hoog | 150 m | 140 m | 1x | 2048 (16,8 MB) | 2x | ja | 1,5 |
| Ultra | 900 m | 170 m | 1,47x | 4096 (67,1 MB) | 2x | ja | 1,5 |

De test houdt vast dat alleen Ultra 4096 heeft, dat de ring van Ultra hoogstens 1,5x van die van 140 m is, en dat de schaduwhaak (de
16 render-aanroepen van de postketen slaan de schaduwpas over) en de grens `scene3d.js` < 4500 regels blijven staan.

## Gecontroleerd en in orde bevonden (geen wijziging)

- **Schaduwen 16x per frame:** de hook in `hookShadowPass` slaat de postketen-aanroepen nog steeds meteen over (test bewaakt de regel).
  De schaduwpas telt in de metingen ca. 10 tot 25 calls (`[sh] pool`, skinned), de casters buiten het zonne-frustum worden verborgen.
- **Post-processing op renderschaal:** de MSAA-scènetarget, de bloom en de grade-pass maken hun grootte uit de pixelratio; bloom draait
  op CSS-resolutie (`/ max(1, pixelratio)`) en volgt dus de adaptieve schaal omlaag. Er is al één grade-pass met de bloom erin.
  Een halve bloomresolutie levert weinig (de eerste mip is al de helft) en verandert de look; niet gedaan.
- **Adaptieve kwaliteit (`gfxprofile.js noteFrame`):** beoordeelt elke seconde op de **mediaan** van de frametijd (niet het gemiddelde),
  telt het wachten van de framecap niet mee, verdubbelt de stappen bij een zeer trage machine, schakelt eerst renderschaal (0,1 per
  stap, minimaal 0,5) en zichtafstand (heel ver naar ver onder 0,9) terug, daarna schaduwkaart naar 2048 en pas bij CPU-gebonden
  `cpuLevel` 1 tot 3; er is **geen presetwissel of postketen-herbouw** (MSAA-samples hangen aan het niveau, #658). Opstappen wacht 15 s
  tot 2 min. **Wat hij niet doet:** een staart van GPU-haperingen onder de mediaan (bijvoorbeeld een beeld op de negen van 60 ms) telt niet
  mee; de bestaande test `fast GPU with hitches: no steps` legt dat zo vast, omdat streaming en shaderlinks er ook zo uitzien. Een
  p95-regel erbij is een besluit, geen bugfix, en niet gedaan zonder meting op een echte GPU.
- **`recommendStand` voor snelle GPU's:** zie punt 6; `classifyGpu` herkent de RX 9070 XT als `hoog` (radeon, `rx\s?\d`).
- **Frame pacing:** `desktop/main.js` zet `force_high_performance_gpu`, de renderer vraagt `powerPreference: 'high-performance'`, vsync
  staat aan (Chromium-standaard) en de framecap (`framecap.js`) wacht bewust. Geen schakelaar die vsync of de framelimiet uitzet.
- **Programma's en hercompilaties:** 296 tot 335 programma's per plek, het linken-bij-eerste-gebruik is bekend en wordt door
  `hookLinkGuard` en de opwarmrondes opgevangen (zie [PERF-PLEISTERS.md](PERF-PLEISTERS.md)); deze ronde is daar niets aan veranderd.

## Wat Nikky kan proberen (AMD, Windows)

1. Windows Instellingen > Systeem > Beeldscherm > Graphics: voeg GDE Groningen toe en kies "Hoge prestaties" (de RX is dan zeker de gebruikte GPU).
2. Adrenalin: voor het spel "Wacht op verticale verversing" op "Uit, tenzij de toepassing het vraagt" laten en Radeon Anti-Lag, Radeon Chill
   en Enhanced Sync uit; die drie grijpen in op de frameplanning van een Chromium-venster. Stuurprogramma bijwerken.
3. Windows: Spelmodus aan; "Hardware-versnelde GPU-planning" eens aan en eens uit zetten en de benchmark opnieuw draaien.
4. Instellingen > Beeld > Kopieer technische info: de regel met de renderer moet "ANGLE (AMD, AMD Radeon RX ... Direct3D11 ...)" zijn. Staat
   er SwiftShader of Basic Render, dan draait het spel op de processor (dit was precies wat `ignore-gpu-blocklist` kan voorkomen).
5. Zet Beeld op Hoog (zichtafstand kort) en kijk of het gemiddelde boven 50 komt; dan ligt het aan de zichtafstand en de detailring (CPU en
   drawcalls), niet aan de GPU. Lukt dat niet, dan is de hoofdthread de grens: sluit browsers en overlays (Discord, Steam, Radeon-overlay).
6. Vergelijking: `GDE_GPU_FLAGS=0` (omgevingsvariabele) zet de nieuwe schakelaars uit; `--use-angle=d3d11` is de standaard en
   `--use-angle=vulkan` is te proberen als de D3D11-laag hapert (niet getest, niet de standaard).

## Niet bewezen / niet gedaan (eerlijk)

- **GPU-frametijd (p50 -25%) en p95 <= 22 ms op een middenklasse-GPU: niet gemeten.** De machine zat op 22 tot 66% CPU met andere agents,
  Electron-sloten waren bezet en de timerquery gaf geen waarde. Alleen de tellers (drawcalls, driehoeken, programmawissels) zijn
  hard; de render-aanroeptijd wijst dezelfde kant op maar is ruis.
- **Hoog, Midden en Laag zijn niet gemeten** (één run, Ultra). Voor Hoog volgt uit de code: vogels, perrons en de kleinere schaduwkaart
  gelden ook daar, de ring blijft 140 m; de aantallen zijn niet gemeten.
- **a7-tussen is 46% hoger** in de na-run (zie hierboven): onverklaard, waarschijnlijk toestand na het uitbouwen; geen herhaling gedaan.
- **Geen beeldvergelijking.** Nog niet bekeken: de vogels (kleur, glans van de nek), de perronpaaltjes en -masten, de overgang tussen
  detail en verre laag op 170 m, de schaduwkaart van 2048 op Hoog (randen van schaduwen). Niets hiervan is in beeld gezien.
- **Losse wegen** (30 van 83 wegen staan los; 9 cellen met één weg, de rest op 96 tot 205 m): niet opgelost, oorzaak niet gevonden.
  `roadloose` zegt alleen waar ze liggen. Kandidaat: wegmaterialen die niet poolbaar zijn, waardoor een cel met één weg niet samengaat.
- **Niet gedaan:** een p95-regel in de adaptieve kwaliteit (besluit), kap-platen per cel samenvoegen (een wereldwijde mesh wordt nooit
  geculd), verre laag met vereenvoudigde silhouetten voorbij 500 m (zichtbare leegte, zie hieronder), `alpha: false` voor de canvas
  (niet getest), de 14 bloom-quads.
- **Verre laag agressiever:** gebouwen kleiner dan een drempel voorbij 450 m weglaten is niet gedaan: een huis van 8 m is op 500 m
  nog ca. 25 pixels breed en de stad leest er juist aan. Een goede aanpak is een vereenvoudigde basisvorm per tegel, met de dither-fade
  uit [POPIN-21-11.md](POPIN-21-11.md); dat vraagt beeldwerk en een meting per afstand.

## Herhalen

```
cd desktop && GDE_PREBUILT_WORLD=<wereld> GDE_STAGE_OUT=build/after/game node build.mjs
PERF_ONLY=det,roadloose PERF_DIAG=1 node scripts/perf/run.mjs ultra_after --preset=quality:hoog,drawDistance:heelver --in-process-gpu
node scripts/gfx_budget_test.mjs --tabel
```

Doe dezelfde run met een stage van `main` voor de vergelijking, drie keer afwisselend, bij een rustige machine.
