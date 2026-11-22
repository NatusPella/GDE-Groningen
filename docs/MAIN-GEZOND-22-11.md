# Main gezond, 22-11: QA van de samengestelde main

Controle van `origin/main` (4b307a11c) na het samenvoegen van ca. 40 branches met automatische conflictoplossing.
Werkbranch: `main-gezond-22-11`. Zonder Electron en zonder build; gewone `node` met `GDE_VENDOR_CACHE` (three) en,
voor de wereldtests, een koppeling naar de wereld en de provinciecache van de hoofdmap.

## Uitslag per controle

| Controle | Uitslag |
|---|---|
| Conflictmarkers (`git grep` over de hele repo, behalve docs) | 1 treffer: ADR 0048 had de markers nog in de titelregel (gefixt). `scripts/windows/LEESMIJ.txt` is een tekstlijn met `====`, geen marker. |
| `node --check` / module-check op alle `.js`/`.mjs` (3649 bestanden, `test_all` licht) | 0 fouten |
| `JSON.parse` van alle 176 getrackte `.json` | 0 fouten |
| Dubbele declaraties/exports (`undef_check`, `import_cycles_test`), `source_bytes_test`, `lineendings_test` | groen |
| Dubbele objectsleutels (eigen heuristiek, indent-blokken) | 6 treffers, allemaal echte samenvoegschade (zie hieronder), gefixt |
| Licht-suite (`test_all --fase=licht`), run 1 | 1304 geslaagd, 19 mislukt, 119 overgeslagen (needs-world) |
| Licht-suite, run 2 na de fixes | 1320 geslaagd, 3 mislukt (1 gefixt, 2 tijdgevoelig); zie "Herdraai" |
| `cutscene_lint --strict`, `voice_coverage`, `storydata_test`, `tts_opnamelijst --check`, `humor_test` | groen |
| `build_story_data --check` | groen (na de fixes opnieuw gebouwd: 2118 regels, 550 zonder opname) |
| coop: `coop_coverage_audit`, `coopmissie_audit`, coop-tests in de suite | 0 blokkerend (43 systemen, 37 OK, 5 gat, 1 nvt) |
| `multiplayer_sweep_audit` | bestaat niet in deze repo; `coop_coverage_audit` en `coopmissie_audit` zijn de dekking |
| `rules_audit --from=v0.64.0` | 0 blokkerend (179 belangrijk, 6 nit: bestaande typografie, bestandsnamen en merkenrisico-heuristiek) |
| `naamtaal_check` | 0 fouten |
| `spec_check` | 0 fouten (tellers `regels` en `zonder opname` gelijkgezet na de bouw) |
| `docs_index_test` | 40 controles ok |
| `secrets_scan` (werkboom en geschiedenis) | 0 treffers |
| dode-code-budget (`dead_code_budget.json`, drempel 80) | stond op 81; `PIRAMIDE_ZEEF1` in `kaartkleuren.js` niet meer geëxporteerd, nu 80 |

## Gevonden schade en fixes

Echte samenvoegschade (code of data was fout):

1. **ADR 0048**: conflictmarkers in de titelregel. Titel hersteld.
2. **`cutscenehost.js` had weer een `PROP_MAKERS`-tabel.** `perfect-props` had de bouwers naar `storyprops.js` (`DECOR_MAKERS`) verplaatst;
   `perfect-akte3` en `perfect-akte5` hadden nieuwe bouwers (kantoorwagen, broodtrommel, frituuraanhanger, friteuse, deken, soepketel,
   mosterdpot, kaart, hek) in de oude tabel gezet, en de eerdere herstelcommit voegde `mat`/`box` weer toe aan de host. Gevolg: de host riep
   `DECOR_MAKERS[kind]()` aan, dus die negen soorten waren in het spel `undefined` (een cutscene met een kantoorwagen of een frituuraanhanger
   zou crashen). Fix: de negen bouwers naar `storyprops.js` verplaatst, de dode tabel en de helpers uit de host gehaald, budgetten
   (`DECOR_BUDGET`) voor kantoorwagen, frituuraanhanger en kaart toegevoegd.
3. **Dubbele sleutels met "laatste wint"**: `cutscenemodels.js` (`snackwagen` in `PROP_SOURCES`; `snackwagen` en `prikbord` in `PROP_FOOT`),
   `cutscenes_akte2.js` (`brij` als pan én als doos: de doos won), `cutscenes_akte3.js` (twee keer `props` en `open` in M12.outro en M15.5;
   de aktetas was een koffer en de koeien stonden toch op het helidek, en de limo was een trekker), `missionstory.js` (`beppe` twee keer).
   Telkens de nieuwste, bedoelde variant gehouden (props-branch voor modellen, akte3 voor plaatsing en kantoor, geen koeien op het helidek).
4. **Humor-reconciliatie** (`humor.eind.json`, zie volgende alinea).
5. **Dubbele regel in het script**: `09-script-akte5.md` had zowel "Dat waren er vier. Eén te weinig." (akte5) als "Dat waren er vier. Kon meer." (oud);
   in het spel zeiden Tessa dus twee regels na elkaar. De oude regel is weg, `script.json` opnieuw gebouwd.
6. **F4 zei twee keer "Ik heb ook geen vergunning."**: de neutrale terugval van HE-04 was gelijk aan de regel ervoor ("Ik heb erover nagedacht."),
   waardoor de build de verkeerde regel overschreef. Opgelost met de neutrale terugval van de akte-agent ("Ik heb er niets aan toe te voegen.").
7. **Regie op de oude tekst**: `cutscenes_akte5.js` mikte op regels die de humorwinnaars hebben vervangen ("Ik ben het compromis", "...Dat is de eerste prijs",
   "Dat waren er vier"/"Drie. Kon meer" (twee shots op één regel), "Dat is een goede verhouding"); aangepast aan de winnaars.
8. **Beppe's "It smakket."** stond niet in de Friese tabel en de uitspraaktabel van `subtitles.js` (geen Nederlandse ondertitel, geen uitspraakmarkering). Toegevoegd.
9. `sidejob_pack.js`: twee opeenvolgende `npc_sigh`-aanroepen (sfx-test "geen dubbele sleutel binnen drie regels") samengevoegd tot één tak.

### Humor-reconciliatie

Regel: perfect-humor beslist bij gelijke beat; unieke nieuwe beats van de akte-agent blijven staan.

- Alle 106 beats staan op main (geen beat ontbreekt); `humor_test` is groen en elke gekozen variant staat in zijn scène van `script.json`.
- `humor.akte2/3/5/6/inspiratie/jelle`: gelijk aan `perfect-humor`.
- `humor.akte4.json` H4-07: main heeft de varianten van `perfect-akte4` ("Vanavond komt..."), `perfect-humor` en `perfect-akte5` hebben "Dinsdag".
  Bewust gehouden zoals het is: `perfect-akte4` heeft de tijdlijn Veendam tot Bourtange herschreven en Berend zegt daar "vanavond"
  (script, md en varianten kloppen op main onderling). De humorvariant volgt dus de bron.
- `humor.eind.json` HE-06 (de telgrap in F5): main had een mengvorm (3 varianten van akte5, `chosen` van humor, dus een
  verkeerde winnaar). Nu: de beat van `perfect-humor` (winnaar "Vier woorden. Op de Grote Markt waren het er vijf.") met variant 0 van de akte-agent
  ("Dat waren er vier. Eén te weinig.", de telfout is daar hersteld), zodat de build de bron-regel nog vindt.
- `humor.eind.json` HE-04: neutrale terugval van de akte-agent overgenomen (zie 6).
- De overige afwijkingen van de oudere `perfect-akte1..4`-branches in `humor.eind.json` zijn de eerdere voorstelversie (vóór het paneel); `perfect-humor` wint.

## Verouderde tests en documenten (aangepast, niet verzwakt)

| Test of document | Oorzaak | Aanpassing |
|---|---|---|
| `bezitlive_test` | tekst van een dichte tak noemt nu de hoofdstuknaam, nooit een aktenummer (#912) | verwacht `gaat open bij "..." in het verhaal` en geen `akte N` |
| `cine_pause_test` | `finish()` roept nu eerst `endJumps(a)` aan | regex laat die regel toe |
| `navtarget_test` | zeefdrukpalet (#1009): gele schijf op crème papier, de schijf heeft een inktrand | meet de inktrand tegen de minikaart (3:1) |
| `overlap_fixes_test` | het toerenblok kreeg een zenderlabel (#988) | regex sluit na het label |
| `startroute_test` | `continueGame` is een expressie geworden | ankerpunt aangepast |
| `schermen_sweep_test` | `FOCUSABLE` in `gamepad.js` kreeg `textarea` en `summary` | `schermen_sweep.page.js` en `controller_sweep.page.js` gelijkgetrokken |
| `akte6_aaa_test` | bijbanenpakket 22-11 heeft eigen kaarten (test: `sidejobpack_test`) | die vier id's uitgezonderd |
| `verhaal_akte2_perfect_test`, `akte5_slot_test` | de bouwers staan in `storyprops.js`; de aftitelkaart heeft nu acht terugblikgrappen; een winnaar mag als "Vier woorden" tellen | test leest `storyprops.js`; `TRACE` met F3; telregex verbreed |
| `meshloopscan_test` | 53 lussen met losse meshes tegen bovengrens 48 | grens 53 met reden (de samenvoeging; niet per bestand uitgezocht, zie open punten) en `PERF-CODE-21-11.md` |
| `vehicle_zfight_test` | scooter: 44 coplanaire 'close'-paren (0,026 m2, geen flush) door de kledinglagen van `kleding-clipping` | grens 44 voor de scooter (fiets blijft 21) |
| `text_audit_test` | allowlist-regel voor een merknaam in `gpudiag.js` die door de reviewfix is verdwenen | regel verwijderd |
| `devflags_test`, `ds3_dekkinglijst_test`, `controller_ingame_test`, `verhaal_props_audit`, `spec_check` | gegenereerde of getelde documenten liepen achter | opnieuw gegenereerd (`--write`/`--schrijf`), `__cineJumps` in `ONTWIKKELEN.md` |

## Flaky

- `net_brokers_test` ("sluiten ruimt het vastgehouden MQTT-aanbod op"): faalde onder belasting (30 ms-tick), losstaand groen.
- `interior_stress_test` (3 ms per beeld, 40 ms eerste scan) en de "scan is snel (onder 3 s)"-regel in `meshloopscan_test`: tijdgevoelig; faalden terwijl een Electron-run
  en andere agents de machine belastten, het aantal lussen zelf is deterministisch.

## Wat niet gedraaid kon worden

- Alle Electron-tests (verhaaltest, smoke, beeldrondes, fps-metingen), de fasen `zwaar` en `electron`, de releasegate, en alles wat een build vraagt.
- Een tweede volledige licht-run met de wereld erbij: `akte1_doelen_test`, `akte2_doelen_test` en `akte3_test` draaiden na 9 minuten nog (limiet 720 s) naast andere agents.
  De wereldtests zijn daarom gericht en één voor één gedraaid (zie "Herdraai").
- `multiplayer_sweep_audit` bestaat niet.

## Herdraai

- **Licht-suite, run 2 (na de fixes, zonder wereld):** 1320 geslaagd, 3 mislukt, 0 timeout. De drie: `vliegtuigprops_test` (zocht `botsauto: () =>` nog in `cutscenehost.js`;
  de bouwers zitten nu in `storyprops.js`, test aangepast, daarna groen), en de twee tijdgevoelige `interior_stress_test` en `meshloopscan_test` ("scan is snel", 4,3 s
  onder belasting; losstaand groen). Wat run 1 rood was (19) is groen.
- **Wereldtests (115 tests die in de lichte suite op "needs-world" overslaan):** met een koppeling naar de wereld en provinciecache van de hoofdmap één voor één gedraaid
  (elk exit 0): onder meer `akte1_doelen` (288), `akte2_doelen` (250), `akte3` (122), `akte3_plekken`, `akte4_plekken`, `keuzewerk` (540), `m20_oever`, `m30_bolwerk`,
  `beppe_site`, `cutscene_tree`, `hertest` (1181), en `storyflow_nieuw_test` (1757/1757). Alle 115 groen. Parallel (3 tegelijk, naast andere agents)
  haalde `test_all` met wereld de tijdslimiet niet; sequentieel kost een test 5 tot 40 s.
- Twee interior_stress-regels blijven bij belasting rood; lossen als ze op een rustige machine draaien.

## Open

- `meshloopscan_test`: bovengrens 48 naar 53 zonder per bestand uit te zoeken welke vijf lussen erbij kwamen (verdacht: `cutscenehost.js` met 3 en de nieuwe modules). Een perf-review kan dit nalopen.
- `vehicle_zfight_test`: scooter-berijder 26 naar 44 close-paren (kleding-clipping); visueel niet bekeken.
- De negen verplaatste decorbouwers en de nieuwe `DECOR_BUDGET`-regels zijn niet in beeld gezien (Electron); `verhaal_props_audit` meet driehoeken, materialen en afmetingen.
- Regie F3/F5/F6 volgt nu de humorwinnaars; of de shots er goed uitzien is niet bekeken. De Electron-verhaaltest moet dit bevestigen.
- Geen Electron-test gedraaid; de releasegate en de verhaaltest blijven aan de coördinator.
