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

## Wat nog niet is gebouwd (open, met reden)

- **Mem als oma van Jelle** in de speltekst (besluit coördinator, dossiers leidend): raakt tientallen opgenomen regels; voorstel: één ronde samen met de TTS-ronde.
- **Dirk of Durk** (code heet Durk, stem-sleutels gebonden aan de opnames) en "Usmem Snacks" (de uitspraak is gelijk): niet hernoemd.
- **Naamdubbelingen** (Geesje x4, Lammert x2, Roelf x3, Femke x2, Hindrik) en de oude H-codes in `characters.js` (de chips "Samen in"): niet opgelost; ze staan als voorstel in docs/PERSONAGES-DOSSIERS-21-11.md §6.
- **Koppelingen van de modellen** in de spelwereld: `unlockgate.js` (kaart, Loopbaan-menu, loopbaanstart), `homebase.js` (slapen, "naar huis", respawn, het flat-interieur met varianten, de kast), `careertour.js` (het overzicht in het Loopbaan-menu en de prestaties), `reputation.js` (schrijven door klanten bedienen en helpen, lezen door NPC-regels), SFX-sleutels van de sfx-werkstroom (`sfxEvent`); het datamodel en de tests staan, de bedrading is klein maar vraagt beeld.
- **Plan-only uit de inspiratielijst:** A5 de ruildag-missie, A19 het koppelmoment aan het eind van elke loopbaan, A6 de vraag van de dag als loopbaanhaak, C15 de nacht in de wagen, E26 de dubbele date, F29 het zingen van het autoduet.
- **Het slagen op vriendelijkheid** in de climax (NPC's die ze hielpen komen terug) en de **moeilijkheidsinstelling** (`difficulty.js`): niet gebouwd; nieuwe missies hebben geen harde timers.
- **De 3D-prop van het prikbord of de koelkastlijst** in de flat.
