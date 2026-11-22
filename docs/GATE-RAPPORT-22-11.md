# Gate-rapport 0.65.0 (22-11)

Branch `gate-0.65-22-11` vanaf `origin/main` 98aa3c4c3. De gate is gedraaid op commit `f962b77ed` (main plus vier commits van deze branch, zie "Commits"). Alles op één machine, één Electron-instantie tegelijk, wegwerpprofielen binnen de worktree. Niets gepusht, gemerged, getagd of gereleased.

**Kort: groen op alles behalve (1) perf, (2) de eigenaar-review en (3) twee dingen die niet gemeten zijn (exe-rooktest, beeldregressie-set).** Perf is rood door een echte regressie op de routes ring en foot ten opzichte van v0.64.0 (zie "Perf"), niet door machinebelasting.

## Uitslag per stap

| Stap | Uitslag | Duur | Opmerking |
|---|---|---|---|
| Verse stage met provincie (`node desktop/build.mjs`, `data/cache` uit de hoofdmap) | groen | 22m16 (koud), 18m30 (na de railfix), 17 s (alleen JS) | wereld 68 MB; `bezit-percelen.json` aanwezig; npm ci 8 s |
| static (`run_tests`, secrets_scan, merkenregister, coop-dekking, cutscene-lint, regels op de diff) | **groen** | 21m31 | 1.402 geslaagd, 0 mislukt, 2 overgeslagen (`rules_audit` binnen run_tests, `province_profile_test`); `rules_audit` op de diff: 0 blokkerend, 169 belangrijk, 6 nit |
| world (`test_all --fase=zwaar`, incl. ring_probe, seat_audit, prop_conflict_audit, drive_audit, junction_sim, network_drive, province_test, vaarnet_province_test, bridge_province_test, spoor- en wateraudits) | **groen** | 44m28 | 46 geslaagd, 0 mislukt; niet gedraaid: `terrain_audit` en `terrain_hoogte_audit` (geen AHN-rasters op deze machine) |
| perf (`perf/run.mjs release --hitch`, vaste routes) | **rood** | 8m16 + 2 herhalingen | zie "Perf" |
| visual (sweep, ui, readme, beeldregressie) | **groen met kanttekening** | 2h24 (alles samen met perf) | de set `beeldregressie` haalde zijn tijdslimiet van 3600 s: 3 beeldmappen gecontroleerd, 36 beelden voor de AI-review, geen baseline (eerste run) |
| review (AI-delta-review per aspect + vision) | **rood alleen door de twee perf-bevindingen** | | 12 rapporten, aspecten compleet (correctness, rules, design, perf, gameplay, ux, multiplayer, privacy, cutscenes, vision); 2 blokkerend (de perf-normen), 120 belangrijk (93 regels-audit, 14 baseline, rest reviewers), 27 nit |
| Electron smoke | groen | 15 s | |
| Electron wereldpoort | groen | 42 s | |
| Electron-verhaaltest (`--story-test`) | **groen** na een testfix | 9m02 | 32 stappen, 0 NaN-waarschuwingen; eerste poging: 2 mislukte checks (zie "Gefixt") |
| Electron geocheck | groen | 1m28 | |
| `country_vehicles_test` (flaky #1094) | groen in de lichte fase | | geen herkansing nodig |
| Rooktest van de gebouwde exe | **niet gedaan** | | geen exe gebouwd (dat is `release.sh`); de gestagede build met `electron.exe` is wel gestart: smoke en wereldpoort hierboven |
| Eigenaar-review | **wacht op eigenaar** | | zie "Eigenaar-review" |

`node scripts/release_gate.mjs --verify` zegt op die run: perf FAIL, review rood, `owner-review.json` status "wacht op eigenaar". Dat is de juiste uitslag.

## Commits op de branch

| Commit | Wat |
|---|---|
| `bf23c1f1b` | build_province: stadsrails uit de zojuist gepakte stadstegels (map van `--city`), niet alleen uit `game/world`. In een verse worktree werd het provinciespoor niet op de stadse track geknipt (`landfile_test`: 79 dubbele sporen). Geen verschil in de hoofdmap. |
| `6fe9ffa5e` | **Land en bedrijf bevroor de pagina**: `renderBezitPanels` riep na het laden van de index via `ensureIndex().then(rerender)` zichzelf eindeloos aan (opgeloste belofte, microtaaklus). Gevonden doordat de beeldronde bleef staan. Test in `scripts/bezitui_test.mjs` (hangt of faalt op de oude code). |
| `051df6daf` | **Voetbal-carrièrescherm onzichtbaar**: de inhoud stond in `ds-m-wissel` (opacity 0 tot `.on`) en niets voegde `.on` toe. Nu `ds-m-wissel on`, controle in `scripts/voetbal_ui_test.mjs`. |
| `f962b77ed` | `scripts/ui/owner_review_scenes.js` en `scripts/owner_review_pack.mjs` (eigenaar-review). **De gate is op deze commit gedraaid.** |
| `b50cc6be5` | storytest: de wachttijd op een tekstscène volgt het aantal regels (zie "Gefixt"). Daarna alleen de verhaaltest opnieuw (groen); de rest van de gate niet. |
| (docs-commit) | dit rapport, `docs/reviews/gate-22-11/`, `release/owner-review.json` |

Reviews: de delta-reviews zijn gedaan op `98aa3c4c3` en gestempeld op `f962b77ed`; de drie commits ertussen (railfix, bezitui, voetbalcarriereui) en de scripts zijn door mij gelezen, niet door de reviewer-agents (dat staat in elk rapport onder `dekking.opmerking`). De fix `b50cc6be5` en dit rapport vallen buiten de gate-commit: een `--verify` op HEAD vraagt dus sowieso om een nieuwe gate op de merge-commit.

## Gefixt (kort)

- Zie de tabel hierboven voor de drie echte fouten (pagina bevroor, leeg voetbalscherm, dubbel spoor in een verse worktree).
- **Verhaaltest, 2 checks rood (`b50cc6be5`)**: "the text-only talk ends by itself" en "the radio is not ducked when no mission or conversation runs". Oorzaak: de check zoekt een scène zonder opnames; sinds de nieuwe regels op de TTS-ronde wachten (302 regels) bestaat zo'n scène (K1, 12 regels van ca. 20 s) en dan was de vaste wachttijd van 60 s te kort; het tweede falen volgt daaruit (de talk liep nog). De wachttijd is nu `30 s + 25 s per regel`. Geen verzwakking: de check eist nog steeds dat de talk vanzelf eindigt. Het is geen bug in het spel, maar let op: zo'n tekstscène duurt ruim vier minuten zonder stem.

## Perf (rood, echte regressie)

Eerste meting in de gate: `ring` p95 52,7 ms (norm 37) en werktijd-p95 45,6 ms (norm 35); `spoor` werktijd-p95 40,3 ms (norm 35); 38 routes overgeslagen of "nieuw" (de baseline is leeg). Op dat moment had de machine 0,6 tot 1,1 GB vrij (Chrome, WebView2 en python van buiten deze run). Herhaling op een rustiger machine (5,5 tot 6,1 GB vrij, geen andere Electron), steeds dezelfde wereld, p95 in ms:

| Route | huidige JS, `--hitch` | huidige JS, zonder | **v0.64.0-JS** (zelfde wereld, zelfde machine) |
|---|---|---|---|
| ring p95 / werktijd-p95 | 106,1 / 86,7 | 70,3 / 52,7 | **34,3 / 23,9** |
| foot p95 | 54,7 | 53,4 | **35,3** |
| spoor p95 / werktijd-p95 | 51,5 / 40,1 | 36,5 / 38,6 | 36,4 / 36,8 |
| wandel p95 | 35,6 | 35,4 | 18,3 |
| heli, a7, platteland, varen, staan, druk, nacht, regen | binnen de norm | binnen de norm | binnen de norm |

Ring los (30 s met CPU-profiel): gemiddeld 31,7 ms (nu) tegen 20,4 ms (v0.64.0). In de nu-run: `tiles.cancels` 347 tegen 27, `resident` 288 tegen 106, adaptief niveau `simLevel` 3 tegen 0 (dus 33 tegen 77 voertuigen en 11 tegen 30 voetgangers), `mainCpuPerFrame` 30,7 tegen 18,3 ms. Dat wijst op het tegel- en streamingbeleid sinds v0.64.0 (streambudget, farlod, wegenindex, interieur-streaming), niet op de machine. **Niet gebisect, geen fix.** De v0.64.0-run is de JS van de tag op de huidige wereld (`GDE_PREBUILT_WORLD`), dus hij meet alleen JS-regressie. De ruwe json's stonden in `desktop/build/perfcmp/` en zijn verloren gegaan (zie "Verlies van bewijs"); de tabel hierboven is de uitkomst.

## Open punten (niet gefixt)

- **Perf ring/foot** (hierboven): blokkeert de gate.
- Issue #1182: plaatsstempel (wijkkaart) kan over een schermvullend scherm hangen (kaart, werkplaats). Zeldzaam.
- Issue #1183: de world-fase van `test_all`/gate zoekt de wereld alleen in `game/world`; in een worktree meldt de gate dan PASS terwijl 35 items niet draaiden.
- Vision-review (kort, zie `docs/reviews/gate-22-11/VISION-SAMENVATTING.md`): lege vlakte bij Warffum (niet-geladen tegels?), missielabel over radiokaart, tekst over elkaar in Loopbanen (1280x720), beeld "Waddenzee" zonder water; plus zes nits.
- Overig uit de beelden: voetbaluitzending heeft een lege crèmekleurige balk zolang er geen commentaar is; de rail noemt het onderdeel "Boerderij" terwijl de kop "Land en bedrijf" is; het menu toont "v0.64.0" (de bump doet `release.sh`).
- Reviewers: 4 belangrijke/nit-punten uit de basisreview staan nog open als eigenaarsbesluit (oude save opent snackwagen en voetbal, `state.legacy`, `multiplayer` N4 en N5); zie de JSON's in `docs/reviews/gate-22-11/`.
- Verhaal zonder stem: tekstscènes zoals K1 (12 regels) duren ruim vier minuten (de TTS-ronde wacht op 302 regels).

## Wat niet is gemeten

- Rooktest van een gebouwde exe (de release bouwt hem).
- De set `beeldregressie` (tijdslimiet), en de beeldbaseline is leeg (eerste run), dus geen beeldverandering ten opzichte van een vorige release.
- `terrain_audit` en `terrain_hoogte_audit` (geen AHN-rasters).
- Geluid, muziek en stemmen niet beluisterd. De Samen-spelen testbank (twee tot vier vensters) niet gedraaid, alleen de pure en TCP-tests van de lichte fase.
- Alle beelden zijn door agents bekeken, niet door een mens; de eigenaar-beelden zijn pas echt gezien als de eigenaar ze bekeken heeft.
- De ruwe perf-json's, de gate-runmap en het vision-JSON zijn verloren (zie hieronder).

## Verlies van bewijs (eerlijk)

Ik had de gate-uitvoer in `desktop/build/gate/` gezet omdat Electron in deze omgeving alleen binnen de worktree mag schrijven. `desktop/build.mjs` wist bij een nieuwe stage heel `desktop/build`; mijn herstage voor de verhaaltestfix nam daarmee de runmap van de gate (rapport, `release-gate.json`, perf-json's, vision-JSON, perfcmp) mee. Behouden: de delta-reviews (`docs/reviews/gate-22-11/*.json`), de samenvatting van de vision-review, de eigenaar-beelden en pagina, de logs van de Electron-fase in `gde-gate-22-11\evidence\` en de cijfers in dit rapport. Zet bij de definitieve gate-run `--out` buiten `desktop/build` (bv. `%TEMP%` met `TEMP` van Electron op een schrijfbare map, of een submap van de worktree buiten `desktop/build`) en stage niet tijdens een run.

## Werkafspraken voor de definitieve run (valkuilen die ik tegenkwam)

- Electron schrijft hier alleen binnen de worktree (profiel, TEMP): zet `TEMP`/`TMP` voor `test_all --fase=electron` op een map in de worktree, en gebruik absolute paden voor `--rapport` en `PERF_OUT` (een relatief pad werd `desktop/desktop/...`).
- `GDE_GAME_DIR` hoeft niet gezet te worden; zet je hem wel, dan faalt `perfstage_test` ("lege map is niet klaar").
- In een worktree moet voor de world- en electron-fase tijdelijk een junction `game\world -> desktop\build\game\world` liggen (zie #1183). Verwijder hem vóór elke `npm run stage` en vóór `release.sh` (memory `testall-en-release-valkuilen`). Ik heb hem aan het eind verwijderd.
- `git worktree` van de tag staat in `.claude/worktrees/gate-tag064` (voor de perf-vergelijking); verwijderd bij het opruimen.

## Eigenaar-review

`gde-gate-22-11\owner-review\eigenaar-review.html`: ÉÉN pagina met 21 echte in-game beelden van 1904x993 px (dit scherm laat geen 1920x1080-venster toe) met een korte vraag per beeld en klikbare keuzes Goed / Kan beter / Fout plus een opmerkingveld; "Kopieer antwoorden" bovenin geeft een tekst om terug te sturen. De pagina is niet geopend. Beelden: keuzekaart Alleen/Samen, laadscherm, opening, naamkaart Samen, HUD met minimap en politie, pauzemenu, loopbanen, spullen, kaart, Bezit (overzicht en te koop), voetbalcarrière, instellingen toegankelijkheid, radiokeuze, prestaties, pashokje, tuning-showroom, voetbaluitzending, zomerdag, zomeravond, prestatietoast. Niet gelukt: interieur van binnen, vertrekbord, eindkaart, Samen-wiel (geen simpele scène-ingang; wel Samen-naamkaart en keuzekaart). Bewijsbestand `release/owner-review.json` heeft status `wacht op eigenaar`; `--verify` keurt het daarom niet goed. Opnieuw maken: `node scripts/ui_shots.mjs --sizes=1920x1080 --scenes=scripts/ui/owner_review_scenes.js --out=<map in de worktree>` en `node scripts/owner_review_pack.mjs --beelden=<map>`. Let op: beelden 12 en 16 laten zien dat de scherm-kaarten licht scheef staan; dat is een vraag aan de eigenaar.
