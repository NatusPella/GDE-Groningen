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
service worker, itch.io-limiet) en past niet in een kleine ronde; de precache
van alle JS-modules is wel gedaan (#657.1b).
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
