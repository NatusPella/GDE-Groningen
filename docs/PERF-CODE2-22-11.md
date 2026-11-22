# Code-ronde prestaties zonder Electron (22-11-2026): #1039, #1046, #1067, #1074

> Tak `render-drawcalls-22-11` (vanaf origin/main 519ff048d). Geen Electron, geen build, niets in beeld bekeken, niets op een GPU gemeten.
> Voorgaande ronde: [PERF-CODE-21-11.md](PERF-CODE-21-11.md); vaste meetlijst: [PERF-MEETPUNTEN-21-11.md](PERF-MEETPUNTEN-21-11.md); lekken: [LEKKEN-21-11.md](LEKKEN-21-11.md).
> Test: `GDE_VENDOR_CACHE=desktop/vendor-cache node scripts/perf_code2_test.mjs`.

## Wat is gedaan

| # | Wijziging | Bewijs |
|---|---|---|
| 1067 | `applyEdgeFade` en `edgeFadeClone` nemen een vijfde/vierde parameter `off`: zonder patch geen `discard` en geen `uEdge`. Schakelaars `?perfoff=boomfade` (stam, kroon, verre kroon) en `?perfoff=gevelfade` (kozijnen en glas). `updateFacadeFade` slaat ongepatchte materialen over. | `perf_code2_test`: patch bevat `discard`, `off` niet, kloon erft de keuze |
| 1074 | `visibletimer.js` (`setVisibleInterval`): tikt niet bij `document.hidden`, wel bij `?stil` en zonder document. Gebruikt door `overlayhold` (150 ms), `samenpanel` (500 ms), `touch` (aanraak-UI), `profileoverlay` (100 ms), `storydev` (500 ms). | microbench in de test: 10 pollers op een verborgen venster voeren 0 keer uit |
| 1074 | `kartbaan.js` `stopEngine`: na het uitfaden `stop()` en `disconnect()` van beide oscillators, filter en gain; `engine = null`, een nieuwe race maakt een nieuwe motor. | bronstructuurcheck in de test |

## Wat al klaar bleek (geen werk meer nodig)

- #1046 shaderwarmup: `renderer.compile` start de link al parallel (`KHR_parallel_shader_compile`; `compileAsync` bewust niet gebruikt, zie PERF-START-21-11.md), `precompilePrograms` met tijdbudget en porties (`?perfoff=compileporties`), `prewarm3d.js`, `programwarm.js`, `launchcompile.js` en de linkwacht (`?perfoff=linkwacht`, `linkvroeg`). De programmacache zelf is die van de browser/Electron (GPU-cache) en niet in JS te sturen. Open blijft alleen de Electron-meting.
- #1039: de grote posten (batches, pool, vogels, perrons, voertuigen, personen) zijn weg; `meshloopscan` bewaakt de rest. Geen nieuwe veilige instancing-kandidaat te bewijzen zonder `renderer.info`.
- #1074: `provincemap` LRU, `reizigersGeo` begrensd, `placeSoon`, `gde:save-text` try/catch stonden al op main.

## Bewust niet aangeraakt

- `lampByKey` (nightlights3d): bewaart elke lamp om de eerste-komt-eerst-uitkomst van `lampGrid` stabiel te houden bij herstreamen. Een grens zou lampen laten springen of verdwijnen; de groei is begrensd door het aantal wegen. Eerst de Electron-soak.
- `multiplayerhostwisselui`, `lobbyui`, `botaudio` (testbot, mag niet pauzeren), de `MutationObserver` van `glyphs.js`, `placeshot` (doelen worden hergebruikt), `vehiclepreview` (three.js herstelt zelf).
- Een echte oplossing voor de dode `discard` in de gevelmaterialen op Hoog en Ultra (band op 1e9 m, nooit actief): het patchen pas aanzetten bij een eindige gevelafstand kost een herlink bij elke kwaliteitswissel. Eerst meten of `?perfoff=gevelfade` iets oplevert.

## Meetpunten voor de Electron-run (exclusief, 3 afwisselende runs A B A B A B, 1280x720, een voorstel, geen eis)

| # | Wat | Hoe | Maat en grens |
|---|---|---|---|
| 1067 | discard in bomen | bosrijke plek (Hondsrug of Noorderplantsoen), Laag en Midden, `?perfoff=boomfade` tegen standaard; GPU-tijd per frame (`renderer.info`, `EXT_disjoint_timer_query`) | verschil boven de run-op-run-spreiding; pop-in aan de bandrand (scripts/qa/popin.mjs) mag niet zichtbaar toenemen |
| 1067 | discard in gevels | Grote Markt op Hoog en Ultra, `?perfoff=gevelfade` | idem; geen kale gevels binnen 40 m op Laag |
| 1039 | drawcalls en frametijd in de stad | `window.__scene3d.batches()` en `renderer.info.render.calls` per preset op Grote Markt, Vismarkt, Noorderplantsoen | -30% calls op Hoog en Ultra, p95 onder 22 ms op een middenklasse-GPU |
| 1046 | stilstand bij Spel starten | `node scripts/perf/filmwarm.mjs` | bootMs onder 35 s, frames boven 100 ms in de eerste 60 s onder 20 |
| 1074 | pollers en kartmotor | verberg het venster 60 s en tel via `window.__profile` of de longtasks/timers dalen; kart: start en verlaat de baan 10 keer, tel `AudioContext` nodes (`--audio-graph`) | geen oscillators na het verlaten; heap en nodes stijgen niet |

Samen spelen: alles hier is lokaal per speler (rendering, timers en eigen geluid); geen snapshot, geen netwerkbericht, geen beloning of voortgang.
