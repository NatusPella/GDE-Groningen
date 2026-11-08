# Performance: bewuste besluiten en open risico's

Dit bestand legt vast wat we uit de performance-review bewust **niet** hebben
gedaan, met de reden. Zo begint een volgende sessie niet opnieuw bij nul en
wordt een half gebouwde oplossing voorkomen. De afgeronde punten staan in
docs/PERF-METING-2026-11-05.md en docs/PERF-LAADHANG-0.56.1.md.

## #653 punt 7: simauto standaard aan
Niet gedaan: dit vraagt eerst een echte meting (PERF_DUR=15000 op ring, druk en
a7 met en zonder ?simauto). Zonder die meting is "standaard aan" een gok die de
staart kan verschuiven in plaats van verkleinen. Besluit: laten zoals het is tot
er een meetronde met de perf-harness is; dan pas de default en MAX_CARS/R_OUT
bijstellen.

## #655 punt 2: save-schrijfpad en boot-parse
Niet gedaan: het gaat om het pad waarlangs elke save en elke boot loopt. Een
fout daar kost een save, dus dit mag alleen met een aparte save-testronde
(writeSlotRaw/inspectRaw/keepNewerSave/listSlots/readSave) en een fallback-test.
De kleine, veilige delen zijn al gedaan: runMigrations geeft input direct terug
zonder stappen (#655.2) en de gast-retry heeft een backoff (#655.1).

## #657 bundelen en lazy story-JSON
Bundelen (L) niet gedaan: dat is een bouwstap met eigen risico's (bronmappen,
service worker, itch.io-limiet) en past niet in een kleine ronde; de
import-map-bundel is wel gedaan (#657.1b), en bij #757 is de web-shell
teruggebracht tot de pagina, de loader en de fonts (zie #657.1c).
Lazy story-JSON niet gedaan: storytext laadt script.json nu bij module-load en
storyDataReady() gates op tientallen plekken in missions.js de verhaal- en
praatscènes. Lazy laden zonder flow-aanpassing laat vroege scènes hun tekst
overslaan. Besluit: pas doen samen met een expliciete wacht- of fallbackregel in
de missieflow.

## #658 voetgangersmesh-cache
Niet gedaan: de geometry hangt aan de volledig opgeloste look (inclusief
seed-afhankelijke delen). Een gedeelde romp per (shirt, skin, build, height) met
de seed-delen als tweede mesh vraagt eerst uitzoeken welke velden de geometry
echt bepalen; anders tekenen mensen met de verkeerde kleding. Eerst een
inventarisatie, dan de template-LRU.

## Metingen die dit besluit onderbouwen
- #653: politie-scans 60 -> 6/s, LOS 3 per 100 ms, avoid-grid 60 -> 30/s,
  motorpolice 60 -> 1 per 1,5 s, streetlife-dress 60 -> 1 per 2 s.
- #654: updateStory ~5x/s i.p.v. 60x/s, missionstory 0 array-allocaties per
  frame per scène, Ommeland-solids 60 -> 4/s.

## Norm-check (#804)

`node scripts/perf/norm_check.mjs <PERF_OUT>/<naam>.json` leest een bewaarde perf-run en keurt elke route tegen de norm: geen frame boven 100 ms en geen frame boven 50 ms (`scripts/perf/normrules.mjs`, getest in `scripts/perf_norm_test.mjs`). De harness levert daarvoor de hitch-tellers (`over50`/`over100`); de p95-doelstelling uit #804 vraagt nog om raw frametijden in de uitvoer. Zonder hardwaremeting zegt de check niets over de huidige build, maar hij maakt de norm herhaalbaar en CI-waardig. De meting van 5-11 (48/52 frames boven 50 ms, uitschieters tot 454 ms) zal er nu op stuklopen: dat is precies de staart die #804 moet dempen.

## #657.1c: web-bundel en web-shell (aanvulling; #757)
Er zit geen bundler in desktop/node_modules (geen esbuild, rollup, vite of webpack). Een eigen één-bestandsbundel is hier niet veilig: 20 plekken gebruiken import.meta.url (CSS/worklet/modelpaden) en 3 plekken starten een worker via new URL(...); in één bestand wijzen die naar de verkeerde map. In plaats daarvan is de "import-map-bundel" gebouwd: de web-build genereert één modulepreload-lijst in index.html (web/preload.mjs), zodat de browser de modules in één parallelle golf ophaalt in plaats van via de ontdekkingswaterfall. Sinds #757 staan de ontwikkel-, QA- en trailerhulpen niet meer in die lijst (js/trailer.js, trailerplan, trailerprops, testmenu, testmenulogic, padtest, storytest, sfx/sfxtest, cutpreview, cutpreviewui, worldbuilder, sfx/engineworklet en de *audit*- en *test*-modules); die komen pas met een dev-URL, een trailer of een benchmark. De gewone trailer van het spel (js/vehicle/trailer.js), js/semitrailer.js en js/trailerstate.js blijven erin. De service worker precacht sinds #757 alleen nog de schil: de pagina, de loader (web.js) en de fonts. De JS-modules zitten niet meer in de install (die haalde ze met cache: 'no-cache' nog eens op, bovenop de download van de pagina) maar komen via cacheFirst bij het eerste gebruik in de cache; een nieuwe build krijgt nog steeds een eigen cachenaam, dus de oude cache verdwijnt. Gemeten op de werkboom: 985 js-bestanden in game/js, waarvan de preloadlijst de vijftien dev-/QA-/trailerhulpen overslaat. scripts/webpreload_test.mjs dekt de lijst, de uitsluiting en de meting; web_shell_test, webboot_test en webprecache_test blijven groen. Een echte één-bestandsbundel blijft een besluit voor later: daar is een buildafhankelijkheid (esbuild) en een browsercontrole van de worker-/import.meta-paden voor nodig. Lazy story-JSON blijft zoals eerder besloten (niet zonder veilige wacht/fallback).
