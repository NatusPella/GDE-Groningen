# Verificatie van de verhaal-epic (21-11): wat nog in beeld en gehoor te controleren is

Epic #1121, branch `epic-verhaal-21-11`. **Er is in deze fase geen Electron gedraaid en niets in beeld of gehoor gezien:** alles hieronder is "nog niet bekeken" tot de grote Electron-sweep van de coördinator. Samen spelen: elke controle hieronder geldt per speler lokaal (iedere speler is lokaal de hoofdpersoon die de stap nodig heeft en ziet de ander als partner-NPC); controleer in een sessie ook dat een gast een scène als data ziet en lokaal kan overslaan zonder de host te stoppen.

## Getest (node, zonder Electron)

Groen: `build_story_data`, `storydata_test`, `story_spine_test`, `dialogue_rhythm_test`, `introduction_test`, `storybridge_test` (151), `unlockgate_test` (39), `storyromance_test`, `storymilestones_test`, `humor_test --eis-paneel` (65 beats), `dialoogvorm_test`, `reputation_test`, `homebase_test`, `careertour_test`, `filmscript_test`, `characterdossiers_test`, `story_similarity_test`, `text_audit_test`, `recapcard_test`, `akte5_test`, `akte6_test`, `storyapps_test`, `cutscenes_akte1/2/3/4/6_test`, `cutscene_lint --strict` (0 blokkerend), `voice_coverage --quiet`, `spec_check`, `docs_index_test`, `lineendings_test`, `undef_check`, `import_cycles_test`, `compat_saves_test`, `compat_settings_test`, `rules_audit --from=v0.64.0` (0 blokkerend).

Niet gedraaid of niet te draaien in deze fase: `storyflow_nieuw_test` en de wereldtests (`akte1_doelen_test`, `akte2_doelen_test`: te traag of data ontbrak in de worktree), `province_test`, de zware audits, de Electron-verhaaltest, fps-metingen, de TTS-ronde. Pre-existing falend op deze branch: de `test_all --fase=licht`-items die niet van het verhaal zijn (UI-tests, `cutscript_test`, `cutpreview_test` M29.2, `opnameronde_test`, `voice_lookup_audit_test` telt ingesproken regels).

## Stemmen (WP10: alleen de lijst, de opname volgt in een TTS-ronde)

- 398 gesproken regels in `script.json` hebben nog geen opname (radio, telefoon en stem); 193 daarvan staan als nieuwe sleutels op de wacht-allowlist `scripts/voice_wacht.json` (459 sleutels in totaal, 266 vóór de epic). De overige zijn regels van de nieuwe cast zonder stem (Veldkamp, Daan, Stien, Anneke, Lieke, ...: "stem nog te kiezen") en regels die bewust alleen tekst zijn (Deel 4).
- 89 bestaande opnames zijn vervallen doordat hun tekst veranderde (ingesproken regels 1390 naar 1301). Tot de opname staan ze als ondertitel (leestijd), de scènes blijven spelen. Voorstel voor de TTS-ronde: eerst de overgangsscènes O1 tot en met O12, de opening (C00.2), Jelles telefoontjes en de finale (M26).
- Stemmen vooraf te beslissen: een stem voor de nieuwe cast; Mem als oma (zie hieronder) verandert tientallen regels.
- `node scripts/tts_lines_list.mjs` en `node scripts/voice_wacht.mjs --write` zijn gedraaid; `voice_coverage` is groen.

## Per akte in beeld/gehoor te controleren

**Opening en akte 1:** de keuken (C00.2: de tekening en "Ik weet nog niet wat ik wil", de nieuwe cues na de verschoven regels), de verhuisdag (de split in twee Tessa-regels), de opening onder drie minuten (170,8 s gemeten uit de tekst; marge opengezet naar 175 s, zie `openingtempo_test`), overgangsscènes O1 (het kaartje en de keuze), O2, O3 (de toeter), de bewijsmomenten als regie-regels (Loket, trein, bankje), Veldkamp met zijn duif in M06.0 (flatScene met een bezoeker), Jelle bij Nachtstreek (R1.1), Berend/Sjabbe/Henk/Bert als introductie.

**Akte 2:** M07.1 (Jelle belt), M08.3 (recept in 14 regels, leesbaar binnen één ondertitelblok?), het prikbord als prop, M09.1 (Tessa en de kippen), M10.1 en M10.2, M10.5 (misverstandsketen), M11.1, M11.3 (de broodtrommel en het briefje van Mem: bestaat het prop?), de dagdroom in T2 (regie nog niet uitgewerkt), O4 en O5 (Mem hoorbaar; de jas-keuze), logeerkamer bij Oma (A2.2).

**Akte 3:** R3.0 (Jelle legt zijn koopboek uit), M12.1 en M12.3 (duivenwolk, de heli-splitsing na regel 8), M13.3, M14.1, M15.5 (de kantoorwagen op de kermis en het bedankbriefje), Daan in M15.6, M16.1 (Geerts naamkaart en Tammo's stilte), M16.5 (het bankje achter de botsauto's), de M16-knip van de kermis naar de dijk, O6 (het bod op het recept), O7 (stilte met `pause`), A3.2 tot en met A3.4 (appjes, het kasboekje, "wij vinden").

**Akte 4:** R4.0 en M17.3 (Jelle aan de telefoon), M17.5 (Stien onder brug elf), M18.4 (Mems telefoontje, de jas-gag), M19.3 (de juryregel met Berend), M20.3 (reactieshot op Jelle), M20.5 (de drie close-ups en "Ik tel mee"), M21.4 (het wegwandelen van de vrienden), T4.1, B4 (voetbalhaakje), O8 (`ov`) en O9 (`pause`).

**Akte 5 en Deel 4:** M22.4 (de knuffel: afstand en `lean`), M23.intro (Tinus in beeld), M25.6 (het familiediner: twee nieuwe figuren in één scène, beiden met naamkaart), M26.5 (vergunning en eierbal in de handen), M26.17 (de kus met de dolly en Berend die telt), E1 tot en met E3 (foto, bord, de duiven), O10 (de rekening), M29.2 (de dans, alleen regie en beats), M30.outro, O11 en O12 (extra regel door de kaartjeskeuze).

**Systemen:** de overgangsscène-speler (rustig moment, `Backspace` of `Escape` slaat over, de keuze met toetsen 1 en 2 na O1, O4, O7 en O12), de recapkaart ("Waar waren we?") bij Doorgaan met de nieuwe `WHY`, de `wagen:*` en `romantiek:*` vlaggen in een save na een devJump, `unlockgate.js` in een nieuw spel (gesloten werelden als zachte hint: de koppeling aan de kaart en het Loopbaan-menu is nog niet gebouwd), de dialoogvorm in de ondertitelpraat, de nieuwsregels van de schudgebeurtenis.

## Ronde 2 (21-11): wat erbij kwam

- **Samengevoegd:** origin/main en personagebijbel-21-11 (dossiers; `characterdossiers_test` groen met de nieuwe cast Daan, Veldkamp, Lieke, Stien, Anneke).
- **Mem is Jelles oma** in de speltekst (17 regels), de ondertitels (FY), de bio's, de eindkaart en personages.md/STIJLGIDS; "Mem" blijft haar naam, "Foar mem" blijft. De oude opnames van 12 van die regels vervallen (tekst veranderde); ze staan op de wachtlijst.
- **Tessa's jeugd** is overal "een boerderij tot haar achtste, daarna steeds verhuisd" (M22, clue, personages.md, relatie-bijbel); **Roelfien** is Oma's oudste klant; de H-codes in `characters.js` wijzen nu naar M-stappen (de chips "Samen in" vinden hun stap).
- **Poort aangesloten:** `story.js` bewaart `gate` in de story-save (nieuw spel: dicht bij de opening; oude save zonder gate: alles open), `storyGateProgress/storyWorldOpen/storyGateHint` via `storyquery.js`; `startLoopbaan` weigert een gesloten loopbaan met de hint van het personage (een begonnen vak of oude save nooit); het Loopbaan-menu toont de hint en de carrière-tour (wie is goed, samen of niet). Bezit leest dezelfde poort via zijn `setGateProgress` (epic-bezit-21-11, `bezitgate.js`): geef daar `storyGateProgress` mee. Werken buiten het menu (een bijbaan doen) tellen nog steeds als begonnen: de poort blokkeert het menu en de startplek, geen werk dat je al deed.
- **Loopbaanmomenten (A6 en A19):** `careerbeats.js`: de vraag van de dag bij het begin van een loopbaan en een koppelmoment bij het eerste niveau omhoog, 19 vakken, korte ondertitelpraat, zonder eis (`careerbeats_test`).
- **NPC's keren terug:** E3 (Rikus) laat de loketbediende, de oude vrouw met de rollator en het jongetje van het bankje terugkomen (bewijsmomenten 3 tot 5 uit de relatie-bijbel); de eindkaart is bijgewerkt.
- **Muzieklijst** met een eigen refrein voor het autoduet ("Elfde Verdieping" van De Fietstunnels): docs/verhaal/MUZIEKLIJST-21-11.md.
- **Dossiers en homebase:** één bron voor de verhaalplekken is `game/js/homebase.js`; de `homeByAct` van Tammo en Tessa in de dossiers volgt die nu.
- **Zware tests:** `verhaalopdrachten_test` 8/8; `storyflow_nieuw_test` start in de achtergrond (resultaat: zie de eindrapportage).

## Wat nog niet is gebouwd (open, met reden)

- **Dirk of Durk:** niet hernoemd. De code, de stem-sleutels (`Durk|tekst`) en honderden opgenomen strings in missies en autogesprekken hangen eraan; een halve hernoeming (alleen het scherm) geeft een onderlinge tegenstrijdigheid. Voorstel: één ronde samen met de TTS-ronde, met `rename`-script en dry-run.
- **Naamdubbelingen** (Geesje x4, Lammert x2, Roelf x3, Femke x2, Hindrik) en de oude H-codes in `characters.js` (de chips "Samen in"): niet opgelost; ze staan als voorstel in docs/PERSONAGES-DOSSIERS-21-11.md §6.
- **Koppelingen van de modellen** in de spelwereld: `unlockgate.js` (kaart, Loopbaan-menu, loopbaanstart), `homebase.js` (slapen, "naar huis", respawn, het flat-interieur met varianten, de kast), `careertour.js` (het overzicht in het Loopbaan-menu en de prestaties), `reputation.js` (schrijven door klanten bedienen en helpen, lezen door NPC-regels), SFX-sleutels van de sfx-werkstroom (`sfxEvent`); het datamodel en de tests staan, de bedrading is klein maar vraagt beeld.
- **Nog niet gebouwd uit de inspiratielijst:** de ruildag-missie (A5), de nacht in de wagen (C15), de dubbele date (E26, Rikus heeft geen model en er is geen café), het zingen van het autoduet (alleen de tekstrichting staat in de muzieklijst). Gebouwd in ronde 2: A6 en A19 (loopbaanmomenten).
- **Het slagen op vriendelijkheid** in de climax (NPC's die ze hielpen komen terug) en de **moeilijkheidsinstelling** (`difficulty.js`): niet gebouwd; nieuwe missies hebben geen harde timers.
- **De 3D-prop van het prikbord of de koelkastlijst** in de flat.

## De naam van de wagen (21-11, ronde 2)

"Fjord Frituur" is overal vervangen (411 plekken in 103 bestanden plus de tts-bronlijsten); de wagen heet **Tam & Tes** (eigenaar-besluit), in proza "de snackwagen". In beeld te controleren: de belettering op het luik (M22.2, model in `models3d_vehicles.js`), het juryscherm en de stemmen (M26), het bord in de epiloog, Henks moment in M22.2. Niet aangeraakt (opening-agent): `introkitchen3d.js`, `intromontage.js`, `trailer.js`, `trailerplan.js` bevatten nog de oude naam. Stemmen: 21 opnames vervielen door de naamwijziging; de wachtlijst staat op 483 jobs. De naamgrap in C00.2 ("Dan klopt de naam ook") en M20.5 ("Zonder Fjord") is herschreven en wacht op de opening-agent en een humorronde. Open bij de volledige licht-run: `dialect_woorden_test` (dossiertekst en "pompeblêd-rode": van de dossierbranch), `coop_licht_test`, `icon_sweep_test`, `cutpreview_test` M29.2.

## Ronde 3 (21-11): feedback van de eigenaar

Gedaan: "plakje voor plakje" overal weg (kern: Jelle wint met bureaucratie, Tammo en Tessa investeren in mensen; vijf scène- en cluetekst-regels veranderd); Jelle voor wie doet hij wat (oma: eierbal en erkenning; moeder Sytske: imperium en omzet, dossier en regel in O6); Beppe heeft een Friese stem (`Beppe` in `tts_lines_list.mjs`, speaker in de build, Friese regels in O1 met Nederlandse ondertitel). Niet gebouwd: de herverdeling van akte 1 (trager) en de verlenging van akte 2 (nieuwe missies); het plan staat in VERHAAL-ANALYSE-21-11.md 22.5 en RUGGENGRAAT.md.

Opnieuw in te spreken in totaal: 487 sleutels op de wachtlijst (`scripts/voice_wacht.json`; 266 vóór de epic), waarvan vier nieuwe Friese Beppe-regels (stem Aoede, Friese uitspraak, controleer de uitspraak bij de opname) en de regels met "Mem is oma", de naamwijziging naar Tam & Tes en de herschreven kernregels; 1266 regels van het verhaal hebben nu een opname, 504 zijn alleen tekst (waarvan 57 stille appjes). Nog niet gehoord: de Friese uitspraak van Beppe en het humorpaneel voor Beppe's regels (geen beat gemaakt).

## Ronde 4: nieuwe stappen N1 tot en met N8

Gebouwd als activiteiten (goal `reis` of `home`, scène van de stap uit `script.json` als ondertitelpraat, geen beloning): N1 Herestraat (Sjabbe), N2 de flat (Veldkamp en een duif; `homeScene`), N3 Beppe's huis aan de westrand (de coördinaten [53.234, 6.490] zijn een schatting: controleer in beeld of de gids bij het echte huis uitkomt), N4 Station Grunn, N5 het erf bij Warffum, N6 Noordpolderzijl, N7 Winsum, N8 de Noorderhaven. Migratie: `stepDone` laat een nieuwe N-stap meetellen als een latere stap gedaan is; `passedBetweenSteps` leest een oude save in de oude volgorde (`storymigratie_test` 15 checks, `compat_saves_test`, `storysave_test`, `akte2_doelen_test` groen). Humor: vier beats HN-01 tot en met HN-04 (paneel). Nog niet in beeld of gehoor gezien: of de reisdoelen bereikbaar zijn, hoe de scène als ondertitelpraat leest, de Friese uitspraak van Beppe, Veldkamp's scène in de flat. Niet gebouwd: het Loket verschuiven, meer boerderijmissies, de nacht in het busje. Samen spelen: de stappen zijn van de speler die ze speelt (eigen voortgang); een gast speelt ze niet voor de host; er is geen netwerkbericht.
