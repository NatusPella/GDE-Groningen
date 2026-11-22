# Perfect-stand 22-11: akte 4 (Zuidwaarts)

Uitvoering van het eigenaarsbesluit "het nieuwe verhaal helemaal perfect" voor akte 4 (zo 23 tot wo 26 augustus), onderdeel van #1121 (epic), #1128 (WP5) en #1127 (J-stappen). Scope: Jelle zichtbaar, het bewijs, de vriendschap op de proef, J4 tot en met J6, T4 en V1 tot en met V3 (voetbal), N9 (de dijknacht), M17 tot en met M21 inclusief de bruggenrace. Niets hieronder is in beeld of gehoor gezien (geen Electron, geen build): alles is "nog niet bekeken" tot de sweep van de coördinator.

Beslissingen die zijn toegepast: dubbele of zwakke grappen mogen weg, ook als ze zijn ingesproken (hier alleen tekstregels geraakt, plus één ingesproken humorregel die van tekst veranderde, zie H4-07); oude saves blijven doorgaan (geen stap is toegevoegd, hernoemd of verplaatst, dus geen migratie nodig); conservatieve moeilijkheid.

## Per stap

| Stap | Gedaan | Gefixt | Open |
|---|---|---|---|
| M17 Open, dicht (bruggen, boot) | plekken (`PLACES`) gecontroleerd tegen de tegels; limieten per etappe 190, 130, 130 en 100 s tegen 107, 73, 64 en 14 s varen: ruim twee keer de vaartijd, dus vergevingsgezind; Samen-regel aanwezig | niets | muziekcue C19 (De Elf Bruggen) ontbreekt als nummer: open punt, niet gekoppeld |
| J4 Dubbele date | reisplek op droge, vrije grond met open grond binnen 300 m | dubbele grap weg ("Hij zegt het wel heel mooi" stond al in A4.2); onduidelijke staart (Dat is van mij / Dan leen ik hem) weg; scène speelt nu op maandag rond lunchtijd, zodat ze vóór M18 valt (stap en lead zeggen "lunch" in plaats van "avondeten") | kaars en bonnetje zijn regie-aankleding zonder prop (de scène speelt als kort gesprek) |
| M18 Wiebelwerk (camera's) | doelplekken en keuzescène gecontroleerd; muziek C12 is gekoppeld (`missiesfeer.js`) | niets | - |
| N9 Nacht op een dijk | plek droog en bereikbaar (600 m straal); Samen-regel aanwezig | regie: "de dag na de kraak" was onjuist, het is maandagnacht na de dag van de camera's | het schaap, de matras en het busje bestaan niet als beeld in een quick-scene (geen schaap in het dierenregister voor cutscenes): open |
| J5 Wielklem Stadskanaal | plek bereikbaar; de overgang naar Mems broodtrommel blijft zoet | regie van dinsdagmiddag naar dinsdagochtend (de volgorde N9, J5, M19 liep terug in de tijd) | de klem en de broodtrommel zijn geen props |
| M19 Stoom | plekken gecontroleerd (perron, museumlijn); juryregel in beurten | regie naar dinsdag begin van de middag; Berend zegt "Vanavond komt de man die mijn bakkie wilde kopen" (voorheen "Dinsdag", gesproken op dinsdag); H4-07 in humorbestanden, keuzelijst, wachtlijst en opnamelijst meegenomen | de ingesproken regel wacht op de TTS-ronde (de regel stond al op de wachtlijst, `voice_wacht` groeit niet) |
| J6 Beppe aan de deur | Beppe blijft Fries; dagdroom blijft | speelt op dinsdagmiddag (klok 15,5 in plaats van 20), want de bus naar Bourtange vertrekt dinsdag vroege avond | de dagdroom heeft nog geen 3D-uitwerking (open sinds WP-STAND-21-11) |
| V1 tot en met V3 (voetbal) | doeltypes shop en reis kloppen; Samen-regel per stap; per speler | niets | - |
| T4 De bus naar Bourtange | plek Vesting Bourtange gecontroleerd (`bourtange_test`) | niets | - |
| M20 Beleg van Bourtange | plekken gecontroleerd op de tegels (droog, geen gebouw, bereikbaar); Mem is de oma (Jelle: "Mem"), consistent | M20.5: "een auto die hij niet heeft" klopte niet (Jelles mannen hebben hem juist) en is "onze eigen auto" | C20 (de kruitkelder, druppel) ontbreekt als nummer |
| M21 Rode auto | Henks zender, de sleutel in Tammo's jas en de overweg lopen sluitend | niets | - |
| Bruggenrace (Elf Bruggenrace, bijbaan) | Jelle volgt de route met een milde elastiek; afronden is brons; muziek C18 (`missie_feest`) gekoppeld | niets | - |

## Controles en tests

- Nieuw: `scripts/akte4_plekken_test.mjs` (35 controles op de echte tegels: reisplekken en missieplekken van akte 4 zijn droog en vrij, er is open grond binnen de aankomststraal; SKIP zonder `game/world`) en `scripts/akte4_tijdlijn_test.mjs` (11 controles: de dagdelen in de regie lopen mee met de stappenvolgorde, J6 draait dinsdagmiddag).
- Groen op de rest van de scope: `akte4_test` 196, `cutscenes_akte4_test` 999, `akte45_aaa_test` 13, `akte34_beats_test` 118, `verhaal_wp345_test` 44, `storydata_test` 20642, `storymigratie_test` 28, `storymigratie_jelle_test` 18, `storyromance_test` 62, `multiplayerstorysteps_test`, `humor_test` 1008, `story_spine_test` 150, `dialogue_rhythm_test` 546, `introduction_test` 16, `voice_coverage` 3494/3494, `cutscene_lint --strict 0` (0 blokkerend).

## Aantallen

13 stappen en 10 losse scènes (R4.0 tot en met R4.2, A4.1, A4.2, O7 tot en met O9, B4) doorgelopen; 7 punten gefixt (3 regels tekst, 5 regie-tijden, 1 lead, 1 klok); 2 tests nieuw; 6 punten open (3 props zonder model, 2 ontbrekende muzieknummers, 1 dagdroom).

## Open voor de coördinator

- De regie-aankleding van J4, J5, N9 en J6 (kaars, bonnetje, wielklem, broodtrommel, schaap, soeppan) bestaat niet als prop: die scènes spelen als kort gesprek zonder cutscene-specificatie; de prop-soorten `kaars`, `schaap` en `pan` zouden eerst in `cutscenemodels.js` en het dierenregister moeten komen. Niet gebouwd (geen beeld om te toetsen).
- Muzieknummers C19 en C20 ontbreken (MUZIEKLIJST-21-11): niet gekoppeld.
- Beeldcontrole van de vier tijdverschuivingen (lichtstand van J6 op de klok van 15,5) in de Electron-sweep.
