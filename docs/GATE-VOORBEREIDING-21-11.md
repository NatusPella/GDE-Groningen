# Gate-voorbereiding 0.65.0 (21-11)

Wat de releasegate en de release van 0.65.0 nog nodig hebben, op volgorde, zodat de coördinator één lijst heeft. Dit is een afvinklijst; de regels zelf staan in [RELEASEGATE.md](RELEASEGATE.md), [RELEASEN.md](RELEASEN.md) en [RELEASE-CHECKLIST-VANMIDDAG.md](RELEASE-CHECKLIST-VANMIDDAG.md) (naslag van de vorige release). Er is niets gedraaid in deze ronde: alles hieronder staat nog open tenzij er een datum bij staat.

## Stand bij het opstellen

- Basis: vorige tag `v0.64.0`; sinds die tag ongeveer 1.085 commits op `main`, ruim 280 nieuwe modules in `game/js` (zie "Modules since 0.64" in [ARCHITECTURE.md](../ARCHITECTURE.md)).
- `node scripts/release_gate.mjs --plan --from=v0.64.0` kiest alle vijf fasen: static, world (graslaag en plaatsingsvensters geraakt), perf (verre LOD en grafisch profiel geraakt), visual (nieuwe muziek en beelden) en review.
- `CHANGELOG.md` heeft een `## [0.65.0]`-sectie met als datum 2026-11-21 en een `[Unreleased]`-blok per thema. De coördinator voegt de `[Unreleased]`-regels bij 0.65.0 en controleert de datum op de dag van de release. De versie in `desktop/package.json` staat nog op 0.64.0; `release.sh` zet hem bij de bump.
- ADR-nummering is gelijkgetrokken (0044 interieurs, 0045 autotuning, 0046 Pages-webversie; de Pages-ADR heette eerst ook 0045).
- Er is niets gedeployd naar GitHub Pages; de workflow `pages-deploy.yml` start de coördinator pas na de release (ADR 0046, [PAGES-WORKFLOW-21-11.md](PAGES-WORKFLOW-21-11.md)).

## 1. Voorbereiding (voor de gate)

- [ ] `git status` schoon op de merge-werkmap, `git pull`, `git log v0.64.0..HEAD --oneline | wc -l`.
- [ ] `node scripts/secrets_scan.mjs` (werkboom en geschiedenis) en `node scripts/install_hooks.mjs` aanwezig.
- [ ] `data/cache` aanwezig in de werkmap (circa 155 MB), `cd desktop && npm ci`.
- [ ] Changelog definitief: `[Unreleased]` bij 0.65.0 gevoegd, datum nagelopen; `node scripts/changelog_section.cjs 0.65.0` en `node scripts/release_docs_test.mjs` groen.
- [ ] `cd desktop && npm run stage` (provincie bouwen, circa 15 minuten, stagelock vasthouden); zie [RELEASEN.md](RELEASEN.md).

## 2. Testlijst (coördinator, niet de agent)

Licht, vóór de gate (elk onderdeel apart te herhalen na een fix):

- [ ] `node scripts/test_all.mjs --fase=licht` en `node scripts/run_tests.mjs` (module-check, `undef_check`, `text_audit`, `spec_check`, `docs_index_test`, `import_cycles_test`, `naamtaal_check`, lineendings, dode code, alle pure tests).
- [ ] `node scripts/voice_coverage.mjs --quiet` en de stemregels in `scripts/voice_wacht.json` (nieuwe verhaalregels wachten op de TTS-ronde; zie [TTS-ACHTERSTAND-21-11.md](verhaal/TTS-ACHTERSTAND-21-11.md)).
- [ ] `node scripts/release/rules_audit.mjs --from=v0.64.0` met 0 blokkerend.
- [ ] DS3-conformiteit: `ds3_dekking_test`, `ds3_ratel_test`, `keycap_maat_test` en de keycapmeting.
- [ ] Samen spelen: de pure coöptests, `scripts/coop_coverage_audit.mjs` (matrix in [COOP-DEKKING-21-11.md](COOP-DEKKING-21-11.md)) en de testbankreeksen `alles` en `vier` ([COOP-SWEEP-21-11.md](COOP-SWEEP-21-11.md)); de reeks `overname` stond rood (host valt hard weg, #1059) en moet groen of als bekende beperking benoemd zijn.

Zwaar, in de gate (fase world en perf):

- [ ] `node scripts/test_all.mjs --fase=zwaar`: `province_test`, `ring_probe`, `seat_audit`, `scripts/world/prop_conflict_audit.mjs --strict`, `drive_audit`, `junction_sim_test`, `network_drive_test`, spoor- en wateraudits, `scripts/world/world_audit.mjs` ([WERELD-AUDIT-21-11.md](WERELD-AUDIT-21-11.md)), `scripts/perf/geocheck.sh`.
- [ ] Perf: `scripts/perf/run.mjs` met de vaste routes (exclusief, geen andere Electron-instantie), norm 30 fps (ADR 0037); metingen die in node al gedaan zijn (wegenindex, tegelstroom, geheugen) staan nog "niet in Electron gemeten" in de changelog: [PERF-WEGINDEX-21-11.md](PERF-WEGINDEX-21-11.md), [PERF-TEGELSTREAM-21-11.md](PERF-TEGELSTREAM-21-11.md), [PERF-HEAP-21-11.md](PERF-HEAP-21-11.md), [PERF-START-21-11.md](PERF-START-21-11.md), [LEKKEN-21-11.md](LEKKEN-21-11.md) (soak nog nodig).
- [ ] Eén Electron-verhaaltest (`--story-test=<dir>`); NaN-waarschuwingen in geometrie laten die falen.

Gate:

- [ ] `node scripts/release_gate.mjs --stage=auto --from=v0.64.0` (45 tot 75 minuten zonder wereldfase; met wereld langer).
- [ ] AI-review: `--stage=review`, reviewers parallel (correctheid, regels, design, perf, UX/gameplay, multiplayer), `--stage=review --finalize`, fixlus tot de triage groen is. De eerdere reviewrapporten van 20-11 staan in [REVIEW-20-11.md](REVIEW-20-11.md); de nieuwe diff is veel groter, dus plan de review in delen (Bezit, voetbal, interieurs, tuning, kleding, verhaal, geluid).
- [ ] `node scripts/release_gate.mjs --verify` groen op HEAD.

## 3. Eigenaar-review: twintig schermen

Voorwaarde: DS3-conformiteit groen (zie hierboven). Daarna maakt de coördinator met één Electron-instantie (na de grote sweep, nooit tegelijk met een fps-meting) twintig nieuwe screenshots op 1920x1080, waar zinvol ook op 1280x720, en zet ze met de volgende uitkomst in `release/owner-review.json` (`datum`, `aantal: 20`, `status`, `bestanden`). De beelden in `docs/beeld-21-11/` zijn proefbeelden uit de ontwikkeling en gelden niet als bewijs. Alles hieronder is nog niet door een mens in beeld bekeken.

| # | Scherm | Wat de eigenaar moet kunnen beoordelen | Bron |
|---|---|---|---|
| 1 | Startkeuze "Hoe wil je spelen?" en de naamkaart "Hoe heet je?" | onderaan, logo zichtbaar, geen tekstmuur | [SPELERSMENU-UX-21-11.md](SPELERSMENU-UX-21-11.md) |
| 2 | Moeilijkheidskaart bij een nieuw spel | niveaus en opties leesbaar | [MOEILIJKHEID-21-11.md](MOEILIJKHEID-21-11.md) |
| 3 | Laadscherm met doorlopende balk en één statusregel | geen Enter, geen tipregel | [PERF-START-21-11.md](PERF-START-21-11.md) |
| 4 | Opening (film) met overslaan-hint | toets op de tekstregel, leesbaar | [OPENING-TRAILER-BENCHMARK-21-11.md](OPENING-TRAILER-BENCHMARK-21-11.md) |
| 5 | HUD onderweg: minimap met doelicoon, locatiekaart, politiechip, snelheidsmeter | niets overlapt, doelbalk zegt wat je moet doen | [HUD-LINKS-21-11.md](HUD-LINKS-21-11.md), [MINIMAP-PIJLEN-21-11.md](MINIMAP-PIJLEN-21-11.md) |
| 6 | HUD-meldingen met aflopend balkje en een prestatietoast | duurklassen, pauze en hover | [MELDINGEN-21-11.md](MELDINGEN-21-11.md) |
| 7 | Volledige kaart met popups, Reis erheen en Zet waypoint | toets in de knop, verschil uitgelegd | [KAART-POPUPS-21-11.md](KAART-POPUPS-21-11.md) |
| 8 | Kaart met lagen Te koop, Standplaatsen en Betreedbaar, op zoom 6 | horeca overspoelt niet | [KAART-DECLUTTER-21-11.md](KAART-DECLUTTER-21-11.md) |
| 9 | Pauzemenu: Doorgaan bovenaan, zoeken met /, Opgeslagen spellen | compact, geen omschrijving rechts | [ESCAPEMENU-UX-21-11.md](ESCAPEMENU-UX-21-11.md) |
| 10 | Spullen-galerij met 3D-plaatjes en wapens | geen vraagtekens, geen Vuisten | [SPULLEN-3D-21-11.md](SPULLEN-3D-21-11.md) |
| 11 | Kleding: pashokje met 3D-preview, kast en kapper | stukken, outfits en kapsels | [KLEDING-21-11.md](KLEDING-21-11.md) |
| 12 | Tuninggarage: de showroom met draaitafel | categoriekoppen, uitleg, toets in de knop | [TUNING-21-11.md](TUNING-21-11.md) |
| 13 | Een gepimpte auto in de wereld (stad) | niet te veel, past bij de omgeving | [TUNING-VERIFICATIE-21-11.md](TUNING-VERIFICATIE-21-11.md) |
| 14 | Een interieur van binnen (winkel of café met mensen) en de gevel ervan | deur, licht, camera, indeling klopt met het raam | [INTERIEURS-VERIFICATIE-21-11.md](INTERIEURS-VERIFICATIE-21-11.md) |
| 15 | Bezit: perceelkaart en het beheerscherm Land en bedrijf | prijs, vorm van het perceel, overzicht | [BEZIT-VERIFICATIE-21-11.md](BEZIT-VERIFICATIE-21-11.md) |
| 16 | Snackwagen met standplaats en de concurrent | menu, standplaatsenlaag, tuning van de wagen | [BEZIT-21-11.md](BEZIT-21-11.md) |
| 17 | Voetbalcarrière-scherm en de uitzending van een wedstrijd (opstelling, score, commentaar) | tv-laag leesbaar, geen overlap | [VOETBAL-CARRIERE-VERIFICATIE-21-11.md](VOETBAL-CARRIERE-VERIFICATIE-21-11.md), [VOETBAL-UITZENDING-21-11.md](VOETBAL-UITZENDING-21-11.md) |
| 18 | Vertrekbord als tijdlijn en een OV-halte met haltepaal | live of rooster duidelijk | [TREINEN-LIVE-21-11.md](TREINEN-LIVE-21-11.md), [OV-MISSIES-20-11.md](OV-MISSIES-20-11.md) |
| 19 | De wereld met Wereldkleur Subtiel (dag en avond) en een zomerse variatiedag | kleurtaal rustig, altijd zomer | [WERELDKLEUR-VERIFICATIE-21-11.md](WERELDKLEUR-VERIFICATIE-21-11.md), [ZOMERVARIATIE-21-11.md](ZOMERVARIATIE-21-11.md) |
| 20 | Een cutsceneframe met "Waar waren we?"-kaart en een overgangsscène (Beppe of de snackwagen) | regie, kader, tekst | [VERHAAL-VERIFICATIE-21-11.md](VERHAAL-VERIFICATIE-21-11.md), [BEPPE-HUIS-21-11.md](BEPPE-HUIS-21-11.md) |

Reserve (als een scherm niet haalbaar is): Samen spelen met vier vensters (spelerslijst met Tab, wachtkamer met niveau, [COOP-SWEEP-21-11.md](COOP-SWEEP-21-11.md)), duivenmodus met spotkaart, de helikopter- of vliegroute als rechte lijn, de vaarroutelijn op het water, de eindkaart.

- [ ] Twintig beelden gemaakt en met de verslagregel "niet door een mens bekeken" aan de eigenaar voorgelegd.
- [ ] Blokkerende feedback verwerkt, zo nodig nieuwe beelden van wat veranderde.
- [ ] `release/owner-review.json` geschreven en `--verify` toont de regel `owner_review`.

## 4. Release en builds

- [ ] `gh` op het PATH (`export PATH="$PATH:/c/Program Files/GitHub CLI"`), anders stopt `release.sh` na tag en push met exit 127.
- [ ] `cd desktop && npm run release -- minor --world`: nieuwe functies, dus een minor (0.65.0). Lokaal komen de Windows-exe en de wereld; het script zet de medewerkers alleen in een comment op issue #116.
- [ ] Actions-builds na de release: `node scripts/release_builds.mjs v0.65.0` (macOS-dmg, Linux AppImage en tar.gz, Android-debug-APK via `workflow_dispatch`; ca. 65 tot 115 van de 2000 gratis minuten, zie [RELEASEN.md](RELEASEN.md)). De workflows moeten op `main` staan.
- [ ] Installatietest op een schone map: exe starten, nieuw spel, opening overslaan met Spatie, hoofdmenu toont 0.65.0.
- [ ] Samen-spelen-rooktest met host en twee of drie gasten ([SPEELGIDS-VIER-SPELERS.md](SPEELGIDS-VIER-SPELERS.md)).
- [ ] Pages (apart besluit, ADR 0046): na de release de workflow `pages-deploy.yml` starten; de wereld komt uit `gde-world.tgz` van de release.
- [ ] Opruimen (`desktop/dist` en `desktop/build`), comment met de uitslag op issue #116, bord bijwerken (Klaar), geheugen bijwerken.

## 5. Bekende open punten die de gate niet oplost

Overgenomen uit de bekende beperkingen van 0.65.0 en de verificatielijsten; elk blijft als "nog niet bekeken" in zijn issue staan zolang niemand het gezien of gehoord heeft.

- 302 gesproken regels van de nieuwe missies en bijbanen wachten op de TTS-ronde; die regels verschijnen voorlopig alleen als tekst.
- Geluid: de nieuwe opnames (221 plus de gekoppelde acties), de voertuigen (helikopter, vliegtuig, motorboot) en de witte-ruis-fix zijn niet beluisterd; het luisterpaneel en [SFX-LUISTERLIJST.md](SFX-LUISTERLIJST.md) wachten op de eigenaar.
- Visueel nog niet in beeld bekeken: interieurs, tuning, kleding, Bezit, voetbaluitzending, Wereldkleur en de nieuwe opening (zie de `*-VERIFICATIE-21-11.md`-lijsten in [README.md](README.md)).
- Perf in Electron nog niet gemeten voor de wegenindex, de tegelstroom, het geheugen en de lekken (soak).
- Samen spelen: de reeks `overname` (host valt hard weg) en alles wat alleen met nepverbindingen is bewezen.
- Webversie: niets gedeployd; Safari vóór 18.4 speelt zonder geluid bij Opus-only.
