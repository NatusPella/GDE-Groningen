# Opschonen grote bestanden (20-11, #497)

Besluit van de eigenaar: `scene3d.js`, `missions.js` en `main.js` in kleine stappen opsplitsen, zonder gedragswijziging.
Alleen verplaatst, met expliciete imports en exports; geen nieuwe importcycli (`import_cycles_test` groen), geen nieuwe globals.
Een module die iets van `scene3d.js` nodig heeft (scène, renderer, camera) krijgt dat via een bind-functie in `init3D`, zoals `routeribbon3d.js` al deed.

## Stand

| Bestand | Voor | Na |
|---|---|---|
| `game/js/scene3d.js` | 4497 | 3810 |
| `game/js/missions.js` | 4014 | 3789 |
| `game/js/main.js` | 1423 | 1370 |

## Verplaatst

| Uit | Naar | Inhoud |
|---|---|---|
| `scene3d.js` | `scene3d/boatbuoy3d.js` | dobbering van boten (`animateBoat`) |
| `scene3d.js` | `scene3d/shapegeo3d.js` | vlakgeometrie uit een polygoon (`buildPolyGeometry`) |
| `scene3d.js` | `scene3d/kissheart3d.js` | het kushartje (sprite uit een canvas) |
| `scene3d.js` | `scene3d/prewarm3d.js` | licht-variant-warmup (stand-ins, scan, batch), via `bindPrewarmHost` |
| `scene3d.js` | `scene3d/cull3d.js` | buiten-beeld-cull van actoren en groepen, via `bindCullHost` |
| `scene3d.js` | `scene3d/pedfade3d.js` | schermdeur-dither van voetgangers (`applyPedFade`) |
| `missions.js` | `missionrules.js` | pure regels: jachtwacht, vastlopen, opnieuw spawnen, overslaan-beloning, dijketappe |
| `missions.js` | `missionrequirements.js` | opdrachteisen (`REQUIREMENTS`) en de voertuigeis (`rideOk`, `WRONG_RIDE`) |
| `missions.js` | `missiontarget.js` | doelbepaling van een stap (`resolveTarget`, `roadSpot`), via `createMissionTargets` |
| `main.js` | `streetpopulation.js` | voetgangers op peil, verkeer uitdunnen, frame-foutmelding |

`missions.js` exporteert de verplaatste namen nog steeds (tests en andere modules importeren ze daar).
De specverwijzing naar `scene3d.js` in `mechanica.md` volgt de nieuwe regel van `updateSunAndSky`.

## Overgeslagen, met reden

- **`buildDefs` en de M06-def in `missions.js`**: twee tests zoeken de stappen letterlijk in dit bestand (zie de kop van `missions_defs.js`). Verplaatsen maakt die tests rood.
- **`missionDebug` in `missions.js`** (ca. 160 regels): raakt bijna elke interne functie van de runner; een veilige naad vraagt eerst een eigen interface.
- **`updateStages`, `playStageScene`, de bake-, convooi- en duivenstappen, de dijkrace**: stateful glue rond `chainState`; verplaatsen zonder gedragsrisico vraagt een factory per blok en een test per stap. Aparte klus.
- **`waitForStart`, boot-wachter en `boot()` in `main.js`**: `boot()` is één closure van ca. 700 regels (frame-lus inbegrepen); `startroute_test` en `tilestore_timeout_test` lezen er letterlijk uit (`armBootWatchdog`, `MAP_LOAD_MS`). Ook zit hier de laad- en warmwerk van #985 nog in beweging; een verplaatsing geeft mergeconflicten.
- **Bomen, tijd van de dag, cameraguard en schaduwhaken in `scene3d.js`**: delen veel module-state (camera-duwstralen, lichtstaat) met `update3D`; een naad vraagt eerst een gedeelde staatsmodule.
- **`startroute_test`** was voor deze klus al rood op twee regels (`precompilePrograms()` zonder argument); onaangeroerd.

## Getest

`node --check` op alle geraakte bestanden, `import_cycles_test`, `firstperson_test`, `mission_chain_test`, `text_audit`, `spec_check`, `docs_index_test`, `hudbus_surfaces_test`, `devflags_test` en alle tests die `scene3d`, `missions.js` of `main.js` noemen.
Rood blijven alleen tests die ook zonder deze wijzigingen rood zijn (`buildonly_test`, `corridor_test`, `desktop_throttle_test`, `missietempo_test`, `startroute_test`, `testketen_test`; omgeving of eerdere regressie).
Niet gedaan: Electron, de verhaaltest en `akte3_test`/`missiongoals_audit` (die slaan over zonder `data/cache/province`). Nog niet bekeken in beeld.
