# Prestatieronde 20-11-2026 (#985, #937, #921): statische audit, microbenchmarks, kleine fixes

> Opdracht van de eigenaar: stabiliteit en prestaties staan op één (60 fps stabiel op een middenklasse-pc,
> ook met vier spelers; liever stabiel dan extra detail). Deze ronde: een statische audit van de per-frame-paden,
> microbenchmarks in node waar het kan, de grootste winsten minimaal en veilig fixen, en onderzoek naar het laad- en
> startpad. Norm: ADR 0037 (p95 <= 33,4 ms in wandklok én werktijd, geen frame > 100 ms, 1 s hitchbudget).
> Stand: tak `worktree-agent-a874542ad6368dd71` vanaf `526defa97`. Niets gepusht of gemerged.

## Wat deze ronde wel en niet kon meten

- **Geen Electron-meting.** Er draaide wel geen ander game-Electron toen ik keek (`tasklist`), maar de winsten hieronder
  zijn 0,02 tot 0,1 ms per frame. Dat verdwijnt in de ruis van een frame-tijdmeting in Electron (+-1 ms), ook gepaard.
  Een gepaarde Electron-run zegt hier dus niets; de microbenchmarks (zelfde code, zelfde uitkomst, in node) zijn het
  eerlijke bewijs. De werkelijke frametijd, programmatelling, hitches en laadtijd zijn **niet gemeten** en staan dus
  hieronder als "nog niet bekeken".
- De microbenchmarks staan in `scripts/perf/` en draaien met gewone `node` (geen wereld nodig):
  `hypot_bench.mjs`, `pairloop_bench.mjs`, `snapshot_bench.mjs`.

## Gedaan (commits, elk los te mergen)

| # | Commit | Wat | Gemeten (node, zelfde uitkomst) |
|---|---|---|---|
| 1 | `cec0b9082` | `syncBuildingsPass`: de afstandstoets per gebouw met kwadraten in plaats van `Math.hypot`; `seen`-Set en `missing`-array herbruikt (geen allocatie per frame); voetgangerslus (`syncPedestrianMeshes`) en dierenlijst met kwadraten; `seen`-Sets van voetgangers, spraakbellen en voertuigbranden herbruikt; `syncSpeechBubbles` leest `clientWidth`/`clientHeight` (die dwingen een layout af) en loopt alle voetgangers niet meer door als er geen bel in beeld is; de twee effect-arrays (vonken, explosies) worden niet meer elk frame met `.filter` herbouwd als ze leeg zijn | `Math.hypot` -> kwadraten: **0,10 -> 0,008 ms per frame** bij 3000 gebouwen in bereik (12x), `hypot_bench.mjs` |
| 2 | `4a100fe36` | `resolveVehicleVehicleCollisions`: de goedkoopste afwijzing (afstand tussen de middelpunten) staat nu vóór de vlaggentoetsen en de capsule van het voertuig wordt pas gebouwd bij de eerste buur in bereik (cos/sin en een object per voertuig per frame scheelt). De toetsen hebben geen bijwerkingen, dus de volgorde verandert niets aan de uitkomst | **0,11 -> 0,027 ms per frame** bij 120 voertuigen, zelfde aantal paren, `pairloop_bench.mjs` |
| 3 | `1b47f7d01` | Meetscript voor de Samen-spelen-kosten per extra speler (geen codewijziging) | zie hieronder |

Tests (alle groen): `node --check` op scene3d.js en vehicle.js, `firstperson_test` (328 checks, ook de omvangsgrens van
#497: scene3d.js staat op 4499 regels, de grens is < 4500), `import_cycles_test`, `hudbus_surfaces_test`,
`devflags_test`, `vehicle_wreck_test`, `impactbalance_test`, `flat_tire_test`, `politiepaard_test`, `skutsje_fair_test`,
`vehicle_finite_test`, `perf_marks_test`, `perf_norm_test`, `perfafrond*_test`, `perfrest*_test`, `perfscan_test`,
`scene_perf_pure_test`, `hitchmarks_test`.

Een lijn die ik bewust **niet** heb gedaan: de rasterlus van `updateCityProps` (cityprops.js) overslaan zolang alle cellen
actief zijn. Benchmark: 3,2 -> 0,07 us per frame. Dat is 3 microseconde winst voor een gedragsverschil (nieuwe cellen aan
de rand verschijnen dan tot 8 m later): niet de moeite, teruggedraaid.

## Audit: wat al goed zat (niets te winnen)

De per-frame-paden zijn door eerdere rondes al grondig geslepen; dat bleek bij het nalopen:

- **HUD** (`hud_panel.js`): bijna elke DOM-schrijfactie heeft een wijzigingscontrole (`setText`, sleutels `hpKey`, `gearKey`,
  `clockShown`, `els.vis`); lay-outlezingen (`getBoundingClientRect`, `offsetHeight`) staan in `ResizeObserver`-callbacks of
  achter een 0,1 s / 0,2 s-teller (`updateAchievementCard`, `updateVisibility`); de minimap heeft een kostenproportionele
  cadans (`minimapRedrawDue`) en slaat over achter het pauzemenu (`hudExpensiveDue`).
- **scene3d.js update3D**: geen `new THREE.Vector3/Color/Matrix4` per frame (alleen bij het bouwen); de hergebruikbare
  buffers `_wildlifeNear`, `_treeQuery`, `_vehSeen` bestonden al; `syncTrees`, `syncWater`, `syncRoads` en `syncBuildings`
  hebben due-/idle-controles op beweging en `geoVer`; onzichtbare props zetten `matrixWorldAutoUpdate = false`.
- **Lichten en programma's**: setlichten lenen een lamp van de nachtrig (`setlights.js`), `compiletarget.js` voorkomt de
  dubbele lichtscène; de programmatelling is dus al aangepakt (zie PERF-TREND-0.54-NAAR-NU.md, sectie D).
- **Weer en geluid**: `applyWeatherToScene3D` en `applyTimeOfDay` alloceren niets per frame; `updateAudio` loopt over
  begrensde lijsten.
- **Boerderij** (`boerderijwereld.js`, `boerderijlive.js`): `updateBoerderijWereld` doet het zware werk onder een
  0,5 s-teller; gewassen zijn `InstancedMesh` met één geometrie per stadium. Per frame wel: `meldOogstklaar`
  (`Object.keys` over de percelen plus `veldStand` per perceel), `boerderijHudStand` en `bepaalPrompt`. Dat zijn een
  handvol percelen (geen lijsten van honderden); niet gemeten, geen winst verwacht boven de 0,05 ms.

## Samen spelen: kosten per extra speler (host)

`scripts/perf/snapshot_bench.mjs` (echte `net/codec.js`, 4 spelers, 60 entiteiten, `MAX_ENTITIES` is 64):

- Een snapshot is **1098 bytes** en kost **4,4 us** om te coderen (5,1 us om te decoderen). Bij 20 Hz is dat
  **21 KB/s per gast**; met drie gasten 64 KB/s en 0,26 ms per seconde aan coderen (0,013 ms per snapshot-tick).
  `net/hub.js` verzamelt de snapshot één keer per tick (`_snapshot`-cache) en codeert hem per gast opnieuw (kop met `seq`
  en `ack`). **Serialisatie is dus geen knelpunt**, ook niet met vier spelers.
- Per gast, 5 Hz, bouwt `verzamelExtra` (coopextra.js) een eigen EXTRA-bericht: voetgangers, dieren, verkeerslichten
  (alle controllers tegen alle lichamen), kapotte objecten. Per bericht orde honderden afstandstoetsen; niet gemeten,
  uit de code afgeleid als < 0,1 ms.
- Wat wél met het aantal spelers meegroeit is het gamewerk: elke gast is een gesimuleerde figuur op de host
  (`ensureFigure`, `syncFigures`: een skinned mesh dat elk frame op volle snelheid animeert, anders dan voetgangers, die
  per afstand om de 2 of 4 frames animeren (`pedTier`), een `groundHeightAt`-query per figuur per frame, en per frame
  een nieuwe `{x, y}` voor `e.prev` en een `Object.values().filter().map().concat()`-keten voor de zitters). Voorstel
  (niet gedaan, kost S, risico L): figuren buiten 40 m op `pedTier` zetten en de zitterslijst alleen herbouwen als
  `coopFigures` verandert. Meten kan alleen met een host plus gasten in Electron (`scripts/perf/leak_coop.mjs` is de
  bestaande haak); dat is deze ronde niet gedaan.

## Laad-, stream- en startpad

- **De filmwarm-up (~17 s) bestaat op dit HEAD niet meer als standaard.** `FLAGS.warmfilm` staat uit (main.js:~389);
  het laadscherm duurde na die wijziging ~20 s (PERF-TREND, sectie C). Wat er nog in zit is `INTRO_WARM_MS=8000` en
  `WARM_BOOT_MS=15000` (alleen met `?warmfilm`), `FILM_LICHT_MS=12000` (wachten tot de programma's van de filmlichtstand
  gelinkt zijn) en de startbuurt (`START_WARM_MS=10000`). De lichte lichtprogramma's voor de film zijn er al: `setlights.js`
  laat de setlichten een lamp van de nachtrig lenen, dus de keuken- en loketstanden maken geen extra programma-set meer.
  Wat open is: of `FILM_LICHT_MS` nog nodig is nu `compiletarget.js` de dubbele lichtscène weghaalt; meten met
  `scripts/perf/programs.mjs` op het spelerspad (`?warm`), **niet gedaan** (geen Electron-run).
- **B6a (PERF-PLEISTERS / LAAD-STREAMING-LOD): `prepareOpeningWarm()` twee keer** staat nog in main.js (r.~397
  via `queueWarmupObject` en r.~448 direct), maar beide zitten achter `FLAGS.warmfilm`: geen effect op het normale pad.
- **Stilstand van de host bij Spel starten (10 tot 57 s).** Uit de code: `openingstart.js` laat de opening pas beginnen als
  de wachtkamer (`gate`) dicht is; `samenpanel.js` `startSpel` roept `openHek` aan, daarna bouwt
  `playIntroMontage` (intromontage.js: `buildShots`, `makeActor` voor Tammo en Anita, de set van de keuken en de
  verhuisdag) en `holdShotTiles`/`registerShots` (cinematics.js, tileworld.js: `run(1e9)`, zie B7 in
  LAAD-STREAMING-LOD.md) alles in dezelfde frames. Aansluitverzoeken lopen via het net in dezelfde hoofdthread; een
  lang frame (een synchrone shaderlink van 0,3 tot 1 s per nieuw programma, of de 1e9-wachtrij) blokkeert ze. **De
  oorzaak is niet gemeten** (geen host-plus-gast-run in Electron). Wat veilig kan, in volgorde van risico:
  1. (S, L) meten: `__loadMarks` rond `startSpel` en `holdShotTiles`, een host en één gast headless met `--stil`.
  2. (S, L) `registerShots` buiten de boot begrenzen (B7): in plaats van `run(1e9)` een budget van ~8 ms per frame.
  3. (M, M) de opening-assets (`prepareOpeningWarm`) al in de wachtkamer voorbouwen: de host wacht daar toch op de
     gasten (de wereld loopt door; het werk verdeelt zich over de wachttijd). Dat is het "verdeel het over frames"
     van de opdracht en raakt de filmvolgorde, dus pas na een meting.
  4. Niet doen: de opening pas starten als *iedereen* verbonden is. Het hek vraagt al minstens twee spelers, en een
     gast die later aansluit hoort bij `coopcut.js` de opening mee te krijgen (de opening is van de wereld); een extra
     voorwaarde zet de gastheer vast als iemand niet komt opdagen.
- **#937 / #921 (streamhaperingen).** Geen codewijziging: de open punten staan al uitgewerkt in LAAD-STREAMING-LOD.md (B2:
  tegelbudget in het laadscherm, B3: `geoVer`-storm, B4: gras-chunks, B5: `hideFarBuilding`, B7: `registerShots`). Deze
  ronde heeft geen nieuw bewijs voor of tegen; ze hebben een Electron-meting nodig.

## Minimap (HUD, grootste post op spoor: 4,3 tot 5,1 ms in PERF-METING-2026-11-09)

`drawMinimap` (hud_panel.js:~2769) tekent elke wegcategorie met een eigen `beginPath` plus `stroke` **per weg**. Groeperen per
(kleur, breedte, alpha) tot één pad per stijl scheelt honderden `stroke`-aanroepen per redraw. Niet gedaan: het verandert de
tekenvolgorde op kruisingen (visueel verschil) en moet in beeld worden vergeleken; kost M, risico M. Eerste stap is een
meting van het aantal wegen in `view.roads` bij een redraw op spoor.

## Nog niet bekeken

- Alles in beeld in Electron: frametijd (mediaan, p95, werktijd), hitches > 50/100 ms, programmatelling en laadtijd, voor
  én na. De ruis is groter dan de gemeten winst (zie boven).
- De stille-stand van de host bij Spel starten (oorzaak), het gedrag van de aangepaste voertuigbotsingen in een echte rit
  (de uitkomst is in de microbenchmark gelijk en de botsingstests zijn groen).
- `simbench`-uitslag van het verkeer (zie de laatste sectie hieronder, als die er staat).
