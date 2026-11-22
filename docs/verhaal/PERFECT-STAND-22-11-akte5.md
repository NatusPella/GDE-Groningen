# Perfect-ronde 22-11, scope akte 5 en de eindfase

Naslag voor de verhaal-epic (#1121), werkpakket WP6 (#1129), de wagen-mijlpalen WP13 (#1136) en de poort WP8 (#1131). Opdracht van de eigenaar: het nieuwe verhaal moet helemaal perfect zijn. Scope: akte 5 (M22 tot en met M26), de slotstappen F1 tot en met F6, de snackwagen Tam & Tes, Jelle als eindbaas met zijn oma als doorslag, de verzoening van Groningers en Friezen, het romantische hoogtepunt, de epiloog, de aftitelkaart en de overgang naar het eindspel. Wijkt dit af van de code, dan is dit doc de fout. Toets: `scripts/akte5_slot_test.mjs` (382 controles) naast `akte5_test`, `storymigratie_test`, `cutscene_lint` en `voice_coverage`.

Besluiten van de eigenaar (22-11), zoals toegepast: de eerste twintig minuten hebben een strakke maar niet dwingende volgorde; dubbele of zwakke grappen mogen weg, ook als ze al zijn ingesproken (de TTS-ronde volgt); ontbrekende props, sets en figuranten zijn laag-poly en procedureel; een oude save voorbij een gewijzigde stap blijft doorgaan; Gronings-droog wint; Samen spelen: de wereld is van wie het spel opende, een gast doet mee met J of N, voortgang en beloning per speler (#429); moeilijkheid conservatief; Jelle is een confrontatie waarin zijn oma de doorslag geeft (geen nieuwe achtervolging); het romantische hoogtepunt is uitgeregisseerd maar zoet en komisch; muziekcues alleen met bestaande nummers.

De humor is beoordeeld door één schrijver met drie lenzen (Gronings-droog, absurd, warm), niet door drie aparte reviewers: er was in deze sessie geen subagent beschikbaar. De eigenaar kan achteraf vetoën.

## Aantallen

| Wat | Aantal |
|---|---|
| Stappen in scope | 11 (F1, M22, F2, M23, M24, M25, M26, F3, F4, F5, E) |
| Scenes in scope | 54 (431 regels, 106 alleen tekst) |
| Regels gewijzigd | 9 (F1 drie, F3 twee, F5 een, F6 een, M26.4 een, E1 een; plus een humorfix in F4) |
| Nieuwe geregisseerde scenes (cutscenes_akte5.js) | 6 (F1 tot en met F6; waren kale praatscenes) |
| Nieuwe props en modellen | 9 (snackwagen uit het voertuigregister, frituuraanhanger, friteuse, bierviltje, deken, soepketel, mosterdpot, kaart, hek) en 1 figurant (Beppe) |
| Nieuwe kalenderdagen | 4 (F2 do 27, F3 za 29, F4 en F5 zo 30 augustus) |
| Nieuwe logboekregels | 6 (F1 tot en met F6) |
| voice_wacht | 211 sleutels (was 208) |
| cutscene_lint | 0 blokkerend; F1 tot en met F6 samen 6 belangrijk (as, aantal sprekers) |

## Per stap

Kolommen: (a) bereikbaarheid en poort, (b) tekst, (c) audio, (d) props en beeld, (e) systemen en Samen spelen.

| Stap | Gedaan en gefixt | Open |
|---|---|---|
| F1 Een wagen langs de weg | (a) wo 26 aug, eerste stap van akte 5: de wereld snackwagen opent hier (unlockgate, getest); doel binnen de provincieomtrek, straal 500 m. (b) De aanhanger gaf het luik aan twee wagens: nu is het luik de inspiratie en gaat het in de Escapade (Tessa: met zo een luik, in de Escapade; Henk heeft er een). De trekhaak-grap blijft. (c) 3 regels tekst-only (wacht op opname). (d) Geregisseerd: aanhanger met hek, bierviltje dat op het luik komt, Escapade, drie camerastandpunten. (e) Logboekregel, stand per speler, een gast speelt lokaal mee. | Echte kaart (op land, buiten gebouw) niet gecontroleerd |
| M22 Een luik erin | (a) bestaande missie, flag wagen:naam. (b) De naam staat pas hier: Tam & Tes komt vóór M22 nergens voor (test); Henk merkt het op, de grap wordt niet uitgelegd. | Niet opnieuw bekeken |
| F2 De eerste bak | (a) nu do 27 aug (stond op 26). (b) Het gesprek blijft bij het compromis: smaken en rijden. (d) Geregisseerd: snackwagen op blokken, friteuse, Tammo onder de wagen (pose hurken), daarna naast Tessa. | Muziek C23 ontbreekt (zie onder) |
| M23 tot en met M26 | Bestaande missies; geen nieuwe fouten gevonden in de sleutelscenes. M26.4 zei De Fjord blijft staan: nu De wagen blijft staan. Een humorkeuze die een regel dubbel maakt wordt nu door de test gevangen. | Muziek C22, C23, C24 (zie onder) |
| F3 Soep en eierbal | (a) za 29 aug. (b) Wie de verzoening is, was onduidelijk (Tessa zei tegen Tammo dat hij van beide was): nu zegt ze: Hij is Gronings, ik ben Fries. Wij zijn de verzoening. Beppe zei Hy seit neat (over wie?): nu een Friese regel die klopt, It smakket. (d) Eigen cutscene met Beppe in de keuken van Oma Trijntje, met Mem, Durk en Douwe in de deuropening; Beppe heeft sinds nu een uiterlijk in storycast.js (daarvoor kon geen cutscene haar casten). | De Friese regels laten nalezen door een Fries |
| F4 Foar mem, achteraan de rij | (a) zo 30 aug, ochtend. (b) De humorkeuze HE-04 maakte van twee Tammo-regels dezelfde regel (Ik heb ook geen vergunning, twee keer): HE-04 mikt nu op het juiste moment, de eerste regel is weer Ik heb erover nagedacht. Geen geweld: de klap wordt niet gegeven. (d) Eigen cutscene: de rij (vijf figuranten plus publiek), Jelle zonder limo achteraan met Mem aan zijn arm, Durk en Douwe houden de rij, de mosterdpot van 1953 komt op het luik. De doorslag is Mem. | De rij is vijf figuranten plus een lijn publiek, geen veertig |
| F5 Een avond voor twee | (a) zo 30 aug, avond. (b) Tammo zei vier woorden (Hier. Met jou erbij.), Tessa telde er drie: nu Dat waren er vier. Eén te weinig (de vijf woorden van M26.7 zijn de maat). (d) Zoet en komisch: twee kratten met een deken voor het gesloten luik, de duif draait rondjes, ze zitten naast elkaar. Voorheen zaten ze op de rand van het luik: dat kon het model niet aan. | Zithouding en camera nog niet in beeld bekeken |
| F6 De kaart op het luik | (a) za 19 sept, na M30. (b) De aanhanger trok niet meer: Tammo zegt nu En een Escapade met karakter (Henk). (d) Kaart met eenenveertig rode stippen (zoveel snackbars als de radio telt, E2) en een blauwe, radio op het luik, Escapade geparkeerd; ze lopen naar de wagen bij Eerst de Hereweg. (e) De overgang naar het eindspel: Alles blijft open. | Eindspelwagen versus de Escapade met luik: zie open punt 3 |
| E (E1, E2, E3) | (b) E1 noemde Willemien zonder dat iemand haar kent (zij wordt pas in M27 voorgesteld): nu de mevrouw uit Loppersum. De kaart op het scherm (storyarc_nieuw.js) volgt, akte5_test bewaakt dat. (e) De aftitelkaart: zeven terugblikgrappen; de test controleert dat elke grap een bron in het script heeft. | De radio-monoloog van Rikus in E2 en E3 blijft lang (lint: beurten): bewuste keuze |

## Wat er in de code veranderd is

- `game/js/cutscenes_akte5.js` (nieuw): de regie van F1 tot en met F6.
- `game/js/storyfun.js` `playStepScene` en `game/js/story.js`: een reisstap met een regie speelt geregisseerd waar de speler staat; zonder regie of bij een fout valt hij terug op de praatscène (nooit een vastgelopen stap).
- `game/js/cutscenemodels.js`, `cutscript.js`, `cutscenehost.js`: de nieuwe props en de snackwagen (foodtruck met TAM & TES) als cutscene-prop; `vehicle.js` krijgt `FOODTRUCK_MODEL`.
- `game/js/storycast.js` en `missionstory.js`: Beppe als rol; `beppe_boog.js` leest haar uiterlijk daar.
- `game/js/calendar.js`: dagen voor F2 tot en met F5. `game/js/cutpreview.js`: de nieuwe scenes staan in de catalogus (en dus in de lint).
- `game/js/storyarc_nieuw.js`: zes logboekregels en de epiloogkaart (Willemien).
- Script en humor: `09-script-akte5.md`, `09-script-akte6.md`, `humor.eind.json`; `script.json` herbouwd; `voice_wacht.json` en `tts_lines.json` bijgewerkt.

## Samen spelen (regel per stap)

F1 tot en met F6 zijn reisstappen: de wereld is van wie het spel opende, een gast doet mee met J of N bij Meedoen, voortgang en beloning zijn per speler (#429; er is geen beloning). De geregisseerde scène speelt lokaal bij elke speler die de plek haalt; er gaat niets over het netwerk. Wie wegvalt of later aansluit, mist de scène niet: zijn stap blijft open tot hij de plek haalt. Dekking: `multiplayerstorysteps_test` en `akte5_slot_test`.

## Oude saves

Niets in de stapkeuze of de volgorde is veranderd: `added: true` blijft, `storymigratie_test` (28 controles) en `save_migration_test` (1305 controles over 30 fixtures) zijn groen. Een speler voorbij F1 tot en met F5 speelt ze niet; alleen F6 volgt voor wie M30 al haalde.

## Muziek (alleen bestaande nummers)

Al gekoppeld: M27 tot en met M29 `missie_warm` (C25), M30 `missie_finale` (C26), M24 `missie_wandeling`, M26 `missie_feest`. De reisstappen F1 tot en met F6 hebben geen missiecode, dus geen eigen sfeer: de radio blijft. Open (geen bestand, dus niet gekoppeld): C22 de knuffel (M22.4), C23 de colonne (M23), C24 stilte bij de vijf woorden en de kus (vraagt een besluit over het dempen), C33 de snackwagen, C39 de eindkaart.

## Gecontroleerd en niet

Gedraaid: `akte5_slot_test`, `akte5_test`, `akte4_test`, `akte6_test`, `storymigratie_test`, `storymigratie_jelle_test`, `storymilestones_test`, `unlockgate_test`, `multiplayerstorysteps_test`, `storyromance_test`, `snackstory_test`, `ending_test`, `credits_test`, `storydata_test`, `story_spine_test`, `storyclarity_test`, `dialogue_rhythm_test`, `introduction_test`, `story_similarity_test`, `calendar_test`, `cutscript_test`, `cutscenes_akte1_test`, `cutscenes_akte4_test`, `cutscenes_akte6_test`, `cutdirector_test`, `cutscenes_audit`, `cutscene_lint --strict` (0 blokkerend), `voice_coverage`, `text_audit`, `undef_check`, `import_cycles_test`, `naamtaal_check`, `lineendings_test`, `docs_index_test`, `spec_check`, `rules_audit --from=v0.64.0` (0 blokkerend). `coop_coverage_audit` faalt op een module (airguidecard.js) die al in main stond en niet bij deze wijziging hoort.

Nog niet bekeken (geen Electron, geen builds): hoe de zes nieuwe scenes eruitzien, of de props goed staan (de rij, de zithouding in F5, de kaart op het luik), of de camera nergens in een gebouw komt, en of de plekken van F1 tot en met F6 op de echte kaart op land liggen (de zware kaartaudit `storyflow_nieuw_test` draaide hier 4 minuten zonder uitslag en is afgebroken; de plekken zijn getoetst tegen de provincieomtrek en tegen de plaatsnaam).

## Open punten

1. De Friese regels van Beppe (F3) laten nalezen door iemand die Fries spreekt.
2. TTS-ronde: de gewijzigde regels van F1, F3, F5, F6 en M26.4 zijn tekst-only tot de ronde volgt (voice_wacht groeide met 3).
3. Het eindspel zet een foodtruck neer (postgame.js), terwijl het verhaal het luik in de Escapade zet en Rikus in E2 een blauwe frietwagen op een rode Escapade noemt. Beslis bij de Bezit-epic of de foodtruck de Escapade met luik is of een tweede wagen; de eindspeltekst (Van de beloning kwam de snackwagen) kan daar nog bij.
4. Muziek C22, C23, C24, C33 en C39: nog geen bestand.
5. E2 en E3 zijn een lange radio-monoloog; als het te lang voelt, splits dan met reacties van Tessa en Tammo.
6. De epiloog zelf (E1) heeft geen eigen cutscene: hij speelt als kaart over de baan om de Martinitoren. Een geregisseerde epiloog met de wagen op de Vismarkt vraagt een nieuw eindfilmpad en staat niet op de lijst.
