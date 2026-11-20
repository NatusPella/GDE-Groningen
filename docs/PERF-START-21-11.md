# Spel starten: stilstand in de opening (21-11-2026, #1046)

> Aanleiding: bij "Spel starten" staat de host 10 tot 57 s stil (#1011, `docs/BEKENDE-BEPERKINGEN-0.64.0.md`): het starten zelf is ~1 ms,
> daarna 66 lange frames in 70 s met 0 ms script en 21 s render, en een nieuw spel laadt 16 tot 18 s langer door het voorcompileren
> van het filmlicht. Tak `worktree-agent-af720f93092ccaa56`: main (v0.64.0) plus `integratie-21-11-b`, heap/laadtijd (a1892e08),
> GPU (a128fdc5) en Samen-start-meting (a6f330a3). Niets gepusht of gemerged.

## Gedaan

| # | Punt | Wat | Bewijs |
|---|---|---|---|
| 1 | compileplanner | `game/js/compileplanner.js`: puur, wachtrij met sleutel (geen dubbele compilaties), prioriteit (lagere eerst), tijdbudget per portie (4 ms, minstens één item), voortgang. | `scripts/compileplanner_test.mjs` (5) |
| 2 | voorcompileren in porties | `game/js/startcompile.js`: `planPrecompile` maakt per groep van de scène een item (huidige lichtstand prio 0, filmlicht prio 1); `runPlanner` draait porties van 4 ms met een `yieldToPaint` ertussen (max 12 s); de rest compileert in het spel, 2 ms per frame (`stepIdleCompile` in `frameBody`). `main.js` warm-stap gebruikt het; `?perfoff=compileporties` is de oude aanroep (A/B). `precompilePrograms` blijft bestaan (zelfde parkeerhulp). | `startroute_test` (98/98), Electron-run |
| 3 | geen wissels aan de start | `gfxprofile.js startGrace(30000)` aan het eind van de warm-stap: tijdens de eerste 30 s telt een frame > 100 ms niet mee voor de adaptieve kwaliteit (renderschaal- en schaduwkaartwissel midden in de film). | `gfx_profile_test` (2 nieuwe controles) |
| 4 | eerlijke voortgang | De balk van de stap "shaders" loopt nu over de compileporties (eerste vijfde) en daarna over het echte linken (`programsPending`); voorheen stond hij tijdens de blokkerende aanroep stil. | niet in beeld bekeken |
| 5 | meettooling | `scripts/perf/programs.page.js` meldt ook `win.s0_60` (frames > 50 en > 100 ms in de eerste 60 s), `filmwarm.mjs` zet de momenten op 0/25/60 s en kent `GDE_EXTRA_ARGS`. | |

## Meting (enkelspeler, nieuw spel, `scripts/perf/filmwarm.mjs`, 1280x720, `--in-process-gpu`, één run per kant, machine belast)

| | voor | na |
|---|---|---|
| tijd tot game-started (bootMs) | 34,7 s | 31,1 s |
| frames > 50 ms, eerste 60 s | 354 | 243 |
| frames > 100 ms, eerste 60 s | 37 | 27 |
| langste frame | 797 ms | 767 ms |
| programma's op 0 / 25 / 60 s | 258 / 305 / 314 | 259 / 313 / 317 |
| `__loadMarks.shaders` (compilestap) | 332 ms (blokkerend) | 6064 ms (in porties, met beeld ertussen) |

Eén run per kant, andere agents draaiden mee (een testsuite liep tijdens de tweede run): lees dit als richting, niet als exacte winst.

## Wat de meting laat zien (niet opgelost)

- De blokkerende compile-aanroep was maar 332 ms; de stilstand zit dus **niet** in die aanroep. Het slicen maakt de balk eerlijk maar haalt de
  hoofdschuldige niet weg.
- Na de start komen er nog ca. 47 programma's bij tussen 0 en 25 s (`programmas`): vooral `MeshStandardMaterial`/`MeshBasicMaterial`/
  `MeshDepthMaterial` van wat de opening zelf toevoegt (niet in de scène bij het voorcompileren). Die linken bij de eerste draw. Volgende
  stap: die materialen per opnamedeel vóór het afspelen compileren (`compileAsync` op de nog niet toegevoegde wortel, zoals
  `prepareOpeningWarm` al voor de opening doet) en `programs.mjs` gebruiken om te zien welke wortel ze maakt.
- De langste frames vallen in de eerste 3 s na de start (767, 590, 454 ms): de eerste filmframes (resolutie/MSAA-targets, eerste draw van
  de film). Niet verder uitgesplitst.

## Niet gedaan / niet bekeken

- Geen meting in een echte Samen-spelen-run met vier vensters (alleen enkelspeler). De redenering: de start is lokaal per speler.
- De laadbalk is niet in beeld bekeken; de kleine portie-yield is alleen via de tellers (`__loadMarks.stappen`) gezien.
- `compileAsync` zelf niet gebruikt: `renderer.compile` start de link al parallel (`KHR_parallel_shader_compile`); het wachten gaat via
  `programsPending`.
- PMREM, post-processing-setup en texture-uploads niet apart gemeten.
