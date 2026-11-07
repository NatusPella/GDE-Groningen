# QA-harnassen van het oude startscherm af (#581)

Het oude startscherm (`runMenuScreen`, `#start-screen`) is alleen nog de
QA/opname-route (`?menutest`, `trailer`, `preview`, `attract`; GDE_MENU_TEST).
Een gewone start en elke testrun beginnen in de wereld (ADR 0016). Dit is de
inventaris per harnas en wat er nodig is om de oude route los te laten.

| Harnas | Gebruikt nu | Nodig om van het menu af te stappen | Stand |
|---|---|---|---|
| `scripts/qa/cutaudio_live.mjs` | `#start-screen` + `__menuStart('nieuw')` | wachten op `body.game-started`; Spatie voor een eventueel pause-scherm; daarna de audiotap | **omgezet** |
| `scripts/qa/cutscene_shots.mjs` | `#start-screen` + `__menuStart('nieuw')` + saveslots | idem; de scène-foto's komen na de wereldstart | **omgezet** |
| `scripts/qa/province_shots.mjs` | `#start-screen` + `__menuStart('nieuw')` | idem; de provincie-spots worden na de wereldstart gezet | **omgezet** |
| `scripts/qa/readme_shots.mjs` | `#start-screen`, saveslots, `__menuStart` | idem; README-foto's na de wereldstart | volgende |
| `scripts/qa/sweep.mjs`, `wachtbeeld.mjs` | `#start-screen` + `__menuStart` | idem; beide zijn scherm-foto's na de start | volgende |
| `scripts/qa/speeltest74.mjs` | Enter op `#start-screen` | wachten op `game-started`; geen menu-aanroep | volgende |
| `scripts/qa/stadvergelijk.mjs` | verbergt `#start-screen` voor de foto | verbergen kan weg zodra de wereldstart de enige route is | volgende |
| `scripts/qa/menuplekken_shots.mjs` | startscherm zelf (menuachtergrond) | kan niet weg zonder dev-haak die het menu als *onderwerp* opent; blijft bewust op `GDE_MENU_TEST` | bewust |
| `scripts/qa/testbank.mjs`, `playtest_sim.mjs`, coop-harnassen | `--menu`/wachtkamer | die testen het menuscherm of de coop-flow; houden hun eigen menu-ingang tot er een kleine dev-haak is | bewust |

Bewijs dat de eerste drie weg kunnen: ze starten met `--smoke-test`/`--perf-script`,
krijgen van `desktop/devtools.js` geen `GDE_MENU_TEST`, en devtools drukt zelf
Enter tot `game-started` als er toch een scherm staat. Daarna is `__menuStart`
alleen nog een dode terugval. De nieuwe wachttest `scripts/qa_start_test.mjs`
bewaakt dat de eerste drie geen menu-aanroep meer hebben. `readme_shots` is de
volgende kandidaat; de menu- en coop-harnassen blijven bewust, omdat het menu
daar het onderwerp is.
