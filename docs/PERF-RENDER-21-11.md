# Renderprestaties over de breedte (21-11-2026): meting per preset, stand van de ronde

> Opdracht: render- en drawcallkosten omlaag (Nikky, RX 9070 XT: gemiddeld 24 fps op Hoog). Stand: tak
> `worktree-agent-a1465faf048a3f659` vanaf `9d4f791a7` (v0.64.0). **Er is in deze ronde geen code gewijzigd:**
> de machine liet geen eerlijke tijdmeting toe en een fix zonder meting voor/na houden we niet.

## Hoe gemeten

- `scripts/perf/run.mjs` (routes `foot`, `staan`, `nacht`, `regen`, `platteland`), 15 s opwarmen, 12 s per route, 1904x993 bij dpr 1,
  `autoResolution` uit, eigen JS gestaged met de prebuilt wereld van een andere worktree (`GDE_PREBUILT_WORLD`).
  Presets (spelersnamen): Ultra = `quality:hoog, drawDistance:heelver`; Hoog = `quality:hoog, drawDistance:kort`;
  Midden = `quality:middel, drawDistance:normaal`. Laag is niet gelukt (zie "Niet gemeten").
- **Niet gepaard, geen herhalingen:** één run per preset. De wandklok (avg/p95) is daarom **niet bruikbaar**: de machine stond op
  100% CPU (andere agents, Claude, Chrome) met 0,6 tot 5 GB vrij geheugen en drie bezette Electron-slots. Frames van 100 tot 400 ms
  zeggen niets over de renderkosten. De GPU-timerquery gaf in deze runs geen waarde (veld `gpu` leeg in de route-uitvoer).
- **Betrouwbaar zijn alleen de deterministische tellers** (drawcalls, triangles, programma's, geometrieën, texturen): die hangen
  niet van de belasting af. Let op: `calls` is de som over alle `render()`-aanroepen van een frame (de scène met schaduwpass plus de
  bloom/grade-quads), dus de hoofdscène is zo'n 15 calls (Hoog/Ultra) of 3 calls (Midden) lager.

## Tabel (drawcalls en triangles per frame, mediaan niet bepaald: één run)

| Scene | Ultra calls | Ultra tris | Hoog calls | Hoog tris | Midden calls | Midden tris |
|---|---|---|---|---|---|---|
| Binnenstad te voet (`foot`) | 571 | 855k | 482 | 483k | 460 | 720k |
| Binnenstad stilstaand (`staan`) | 718 | 996k | 293 | 583k | 383 | 1012k |
| Nacht (`nacht`) | 686 | 1003k | 433 | 606k | 546 | 978k |
| Regen (`regen`) | 762 | 1004k | 359 | 628k | 488 | 999k |
| Platteland (`platteland`) | 339 | 596k | 220 | 373k | 255 | 426k |

Programma's: 242 tot 317 per preset; geometrieën 1,4k tot 3,6k; texturen 139 tot 317 (Ultra en Hoog hebben dezelfde reeks, de
verschillen zitten in wat er al geladen was).

## Wat de cijfers zeggen

- Ultra kost in de stad ca. 425 drawcalls en ca. 400k triangles meer dan Hoog (`staan` 718 tegen 293). Dat is de verre laag
  (`drawDistance: heelver`, 900 m). `farlod.js` stuurt de tegels al via de multi-draw-pool (`drawHub`), dus de extra calls komen niet van
  losse tegelmeshes; de eigenaar van die calls is nog niet bepaald (zie hieronder).
- Midden heeft evenveel of meer triangles dan Hoog bij minder calls: de kortere `drawDistance: kort` van Hoog snijdt veel weg.

## Mislukt en nog niet gedaan

- De `det`-route (drawcalls per eigenaar via `PERF_DIAG=1`, schaduwpass apart) is twee keer gestart; de tweede run viel uit (Electron
  stopte: "Render frame was disposed", daarvoor een tegel-leestimeout van 30 s onder belasting). Daarmee ontbreekt de ontleding van
  de 425 extra calls, en `cost` (GPU-kosten per scene-kind en per schaduwkaartgrootte) en `postcost` (bloom/grade) zijn niet gedraaid.
- **Niet gemeten:** Laag, GPU-tijd, gepaarde A/B, rijdend (`a7`), kermis, 3 herhalingen. Geen beeldvergelijking, want geen wijziging.
- **Niet gefixt:** mergen/cullen van de verre laag, schaduwcasters, bloom-resolutie, schaduwkaart 4096 (Hoog en Ultra), pixelRatio.
  Uit de code: pixelRatio is al per preset begrensd (hoog 1,5, min met dpr); de MSAA is 2 samples (`postsamples.js`); bloom draait al op
  CSS-resolutie (`postfx3d.js`); de schaduwkaart is 4096 met een frustum van 32 m halve breedte (`scene3d.js` `SHADOW_LEVELS`).

## Voorstel voor de volgende ronde (nog niet uitgevoerd)

1. Draai in een stille periode, gepaard en afwisselend, `PERF_ONLY=det` met `PERF_DIAG=1` op Ultra en Hoog (`PERF_AB`-varianten uit
   `routes.js`), om de 425 extra calls aan een eigenaar te hangen; houd `PERF_DUR`/`timeout` ruim (de route duurt 4 plekken x tot 50 s).
2. `PERF_ONLY=cost,postcost` met de GPU-timerquery gepaard voor/na: schaduwkaart 4096 tegen 2048, bloom aan/uit.
3. Pas daarna fixen op de grootste gemeten post, met een pure test voor de nieuwe merge- of cull-logica.
