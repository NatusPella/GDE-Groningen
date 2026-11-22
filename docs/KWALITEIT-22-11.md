# Kwaliteit en QA, 22-11: de zwakste dekking en wat eraan gedaan is

Sprint kwaliteit/QA van 22-11 (geen Electron, alles in node). Gemeten op `origin/main` (4b307a11c) in een eigen worktree.
Dit doc is naslag; de regels staan in [.specs-fire/standards/testing-standards.md](../.specs-fire/standards/testing-standards.md).

## Wat er nieuw is

| Wat | Bestand | Wat het bewaakt |
|---|---|---|
| Fuzz- en eigenschappentest op de kern | `scripts/kern_fuzz_test.mjs` | netwerkcodec (willekeurige bytes, bitflips, afgekapte berichten), de EXTRA-lezers van Samen spelen, outfit-code (rondreis en rommel), save- en instellingenmigratie op willekeurige JSON (nooit gooien, idempotent, geen prototype-vervuiling), economie-invarianten. Vaste zaadjes, ruim 24.000 controles in een halve seconde. |
| Mutatiecontrole | `scripts/mutatie_check.mjs` met `scripts/mutatie_lijst.mjs` | breekt bewust een regel in een kernmodule en eist dat een test faalt die de module importeert. Een test telt alleen mee als hij op de ongewijzigde code slaagt. 31 mutanten in 7 modules (economy, codec, clothing, savemigrate, coopextra, storagekeys, saveslots). |
| Bewaking van de mutantenlijst | `scripts/mutatie_lijst_test.mjs` | elk patroon komt precies een keer voor, elke module heeft een test. Verandert de code, dan wijst deze test de regel aan die opnieuw moet. |
| Eigenschappen van de verhaalstappen | `scripts/story_eigenschappen_test.mjs` | `nextStoryStep` gooit nooit, een rondje "speel de volgende stap" eindigt in de volgorde van het verhaal, meer voortgang zet het verhaal nooit terug, tussenstappen zijn echte tussenstappen. |
| Foutafhandeling joinpoort | `scripts/net_joingate_fout_test.mjs` | een signaler die bij het opzetten faalt geeft geen onafgehandelde afwijzing (zie "Gevonden en gerepareerd"). |
| Snellere lichte fase | `scripts/lib/syntaxcheck.mjs` (`checkSyntaxAsync`), `scripts/test_all.mjs` | de module-check van 3654 bestanden draait parallel: ca. 2,5 minuut in plaats van ruim tien. |

Draaien: `node scripts/mutatie_check.mjs` (alles, ca. 10 minuten), `--filter=economy.js` (een module), `--lijst` (alleen tonen).
De mutatiecontrole schrijft tijdelijk in `game/js` en zet het bestand altijd terug. Draai daarom geen andere tests in dezelfde werkboom terwijl hij loopt.

## Wat de mutatiecontrole vond

De eerste ronde liet 10 van 32 mutanten overleven: de tests liepen wel langs die regels maar zouden een kapotte regel niet merken.
Alle gaten zijn gedicht in `kern_fuzz_test.mjs` (sectie 5):

- Kentekenprijs per ster (`platesCost`) was alleen als "stijgend" getest, niet als tabel (nu 40 + 50 per ster vastgepind).
- Een snapshot met een zeventiende speler, een entiteit buiten de wereld, vijf uiterlijkrecords en een JSON-bericht met een losse byte erachter werden niet als geweigerd getest.
- Een outfit-code met een kleur die het stuk niet heeft werd niet getest.
- `plausiblePos` (de grens van 150 km voor een bewaarde positie) had geen test op de grens.
- Een EXTRA-bericht met een oorsprong buiten de wereld of een licht te veel werd niet getest.
- Een gelijkwaardige mutant (de lengtecontrole in `cleanOutfitCode`, die `decodeOutfit` al doet) is uit de lijst gehaald: er is niets te testen.

Na de tweede ronde zijn alle 31 mutanten gedood.

## Gevonden en gerepareerd

1. **Onafgehandelde afwijzing in de joinpoort** (`game/js/net/joingate.js`, `bedienKamer`): de tweede functie van `.then(ok, fout)` vangt alleen een afgewezen `Promise.all`, niet een fout in de eerste. Een signaler die bij het maken, luisteren of kondigen faalt (bijvoorbeeld een WebSocket die niet te maken is) gaf een onafgehandelde afwijzing. Nu `.catch`. De host speelt door zonder joinpoort. Test: `net_joingate_fout_test.mjs` (faalde eerst met drie afwijzingen).
2. Hetzelfde patroon in `pausemenu.js` (`syncGpuWarning`): `.catch` toegevoegd. Zonder eigen test (een ontbrekend element in de rij).

Foutafhandeling rond streaming en audio is nagelopen en in orde: `tilestore.js` heeft een tijdslimiet en afbreken per lezing, `radio.js` en `scenario.js` vangen een mislukte opvraag of decodering en vallen terug op "niets te spelen". Overige `.then(a, b)`-plekken (`buslive.js`, `main.js`, `hub.js`, `sessionboot.js`) zijn goed (try/finally of een bewust triviale terugval).

## Testsnelheid

Gemeten in een volledige lichte fase (`test_all.mjs --fase=licht --jobs=4`, op een druk apparaat met meer agents): **26 minuten 28 seconden**.
Daarvan was de module-check ruim tien minuten, omdat voor elk van 3654 bestanden een eigen node-proces start, een voor een.
Nu parallel (maximaal 8, nooit meer dan de kernen min twee): 2 minuten 25 seconden, ook onder belasting. De rest van de lichte fase (ca. 1450 tests, `undef_check` 78 s, `audio_ruis_test` loopt tegen zijn limiet van 180 s) is niet verder aangepast.
Doel voor de volgende sprint: licht onder 15 minuten (de langzaamste tests staan in het rapport van `test_all`; `sfx_round5_test` 45 s en `audio_ruis_test` zijn de eerste kandidaten).

## Flaky tests

- `bezitmarker_test.mjs`: faalde in de volle run (gelijktijdig met andere processen), slaagt alleen. Nog geen oorzaak gevonden; kandidaat voor `KNOWN_FLAKES` pas met een issue.
- Tests met een harde tijdgrens die onder belasting kunnen vallen: `interior_stress_test.mjs` (mensen 8,7 ms tegen een grens van 3 ms en scan 203 ms tegen 40 ms, gemeten onder belasting: eerst op een rustig apparaat herhalen), `net_sigcrypto_test.mjs` (1 s), `vaarnet_test.mjs` (1,5 s), `saveslots_fuzz_test.mjs` (5 s).
- `web_serve_path_test.mjs` kiest een willekeurige poort tussen 20000 en 40000: kleine kans op een botsing.
- Geen test is versoepeld.

## Faalt op main, los van deze sprint

In de volle lichte fase op `origin/main` faalden ook 17 tests die in een los draaien ook falen (dus geen flake). Dit zijn drift-meldingen na de recente merges; ze horen bij de coordinator of de betrokken agents:
`akte5_slot` (terugblikgrappen), `akte6_aaa`, `bezitlive`, `cine_pause`, `controller_ingame` (cheatsheet-html verschilt van de bron), `devflags` (`window.__cineJumps` ontbreekt in docs/ONTWIKKELEN.md), `ds3_dekkinglijst` (`--write` nodig), `interior_stress` (zie boven), `meshloopscan`, `navtarget` (geel tegen de minikaart haalt 3:1 niet), `overlap_fixes`, `schermen_sweep` (FOCUSABLE verschilt van gamepad.js), `startroute` ("een nieuw spel warmt voor"), `text_audit_test` (verouderde allowlist-regel voor `Windows` in gpudiag.js), `vehicle_zfight`, `verhaal_akte2_perfect` (Friese regel "It smakket", decorsoort klomp), `verhaal_props`. `audio_ruis_test` haalde zijn limiet van 180 s. 119 tests zijn overgeslagen omdat de wereld in deze werkboom ontbreekt.

## Dubbele logica (bewust niet samengevoegd)

In `game/js` staan ca. 20 eigen kopieen van een seedbare generator (`mulberry`, `rng`, `makeRng`), naast `rng.js` (`mulberry32`). Ze zijn niet allemaal gelijk: ze verschillen in de zaadomzetting (`seed >>> 0`, `seed * 2^32`, `Math.floor`, een hash) en een paar zijn xorshift of een lineaire generator. Samenvoegen zou de gegenereerde wereld, de plekken en de dieren veranderen. Alleen samenvoegen met een test die per kopie dezelfde reeks vastlegt (voor en na) en met beeldcontrole. De 61 lokale `clamp`-definities en 21 `lerp`-definities zijn triviaal en onschadelijk. Dode code: de dode-code-bewaking staat op 80 (22-11), geen nieuwe actie.

## Zwakste dekking die overblijft

- Mutatiecontrole dekt 7 van de 30 belangrijkste modules. Volgende: `storyarc.js`, `story.js`, `bezit*.js`, `coopworld.js`, `coopverhaal.js`, `navgraph.js`, `routeribbon.js`, `settings.js`.
- Routeplanner: bestaande tests (`route_regels`, `navgraph`) controleren vaste routes; een eigenschappentest (symmetrie, geen omweg korter dan de directe weg, nooit door water) op een willekeurig netwerk ontbreekt nog.
- Inventaris en bezit: geen fuzz op de opslag en de overdracht tussen spelers.
- Het hele licht-pad is alleen op een apparaat met wereld volledig te draaien (119 tests overgeslagen zonder).
