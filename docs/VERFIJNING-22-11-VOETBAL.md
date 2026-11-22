# Verfijnronde Voetbal (22-11)

Eigenaarsopdracht: geen nieuwe features, wel verfijnen wat er is (QoL, QA, UX, leesbaarheid). Branch `verfijn-voetbal-22-11`, scope voetbal (carrière, wedstrijd, training, club). Geen Electron en geen beeld: alles is met pure tests, mock-scenes en simulaties in node gecontroleerd en **nog niet bekeken of beluisterd**. Test: `scripts/voetbal_verfijn_test.mjs` (14 groepen, met een fuzz over tien seizoenen en dertig bot-wedstrijden met commentaar).

## Wrijving, oplossing, bewijs

| # | Wrijving | Oplossing | Bewijs |
|---|---|---|---|
| 1 | Een grijze knop (`aria-disabled`) deed bij klikken gewoon zijn werk: "Laat uitrekenen" werkte op een wedstrijd die nog niet aan de beurt was, dus een heel seizoen op dag nul (met het geld erbij) | `uitReden` in het klikpad: een grijze knop doet niets en meldt zijn reden | `voetbal_verfijn_test` (grijze knop) |
| 2 | Geen feedback na koop, verkoop, verlenging, bod, sponsor of een training die niet kon; "blessure" en "vandaag al bezig" waren kale woorden; een wedstrijd die niet startte zei niets | `actieBericht` en `melding` in `act` | idem (meldingen) |
| 3 | Een aandeel kopen of verkopen en een speler verkopen waren een enkele klik, terwijl het tabblad Club wel bevestigt | `ui.vraag` en `vraagtBevestiging`: eerste druk vraagt ("Zeker?"), tweede doet | idem (Zeker) |
| 4 | Als manager was de selectie leeg te verkopen (16 van 18 spelers, geen keeper) | `MIN_SQUAD` 14 en `MIN_ROLE` per positie in `managerSell`; dubbelklik levert niets op | idem (ondergrens en fuzz) |
| 5 | De selectie toonde hoogstens 18 spelers onder de kop "Selectie van 18", maar een selectie kan tot 22 groeien: wie je kocht stond er niet in | alle spelers, de kop toont het echte aantal | idem (selectielijst) |
| 6 | Bij de manager waren spelers na de achttiende niet te verlengen of te verkopen | lijst niet meer afgekapt | idem |
| 7 | Een tab die er niet meer is (Trainer of Manager) liet de balk zonder gekozen tab | terugval op Vandaag | idem (tab-terugval) |
| 8 | In een derby draaide de radar niet mee: team 1 zag zijn aanval naar beneden | `radarModel` draait een halve slag voor een mens in team 1 | idem (radar) |
| 9 | Op de radar was het enige verschil tussen de ploegen de kleur | computerploeg als vierkantje, keeper een maatje groter | idem |
| 10 | Een pass of schot op het moment van het eindsignaal sloeg het eindverslag of de rustkaart direct over (F of spatie) | `magOverslaan`: leestijd 1,6 s voor rust en eind | idem (overslaan) |
| 11 | Idem voor de herhaling na een doelpunt | leestijd 0,9 s voor de herhaling | idem |
| 12 | Esc tijdens het trainingsresultaat meldde "geen winst" terwijl de groei al was uitgekeerd | `stopBericht` | idem (training) |
| 13 | HUD in een derby: een mens in team 1 zag "Jullie doelpunten", "Tegen", het bezit en "Zet druk" omgekeerd | `naarMijn` draait stand, bezit en baldrager om (idempotent) | idem (HUD) |
| 14 | Buiten adem zonder bal: geen hint wat te doen | `watNu`: "Buiten adem: loop even rustig" (met bal blijft de passhint) | idem |
| 15 | Coachen: geen idee hoeveel wissels over waren tot het op was | `coachMelding`: "(nog 5 wissels)" | idem (coachen) |
| 16 | Het uitslagbord na een carrièrewedstrijd zei niet wat het opleverde, en niets over een blessure | `carriereBannerRijen`: Verdiend, Let op | idem (uitslagbord) |
| 17 | De spelersmarkt stond op volgorde van id | beste speler bovenaan | idem (markt) |
| 18 | Training liet je energie niet zien (kost 15%) | chip "energie nu x%" | idem |
| 19 | QA: herhaalt het commentaar zich? | test over 30 bot-wedstrijden: nooit twee dezelfde achter elkaar, hooguit 4 herhalingen binnen tien regels | `voetbal_verfijn_test` |
| 20 | QA: lange speelduur van de carrière | fuzz: 3 seeds, tien seizoenen, willekeurig kopen, verkopen, verlengen, uitrekenen en spelen; selectie, keeper, kas en HTML blijven heel | idem |

Gemeten en goed bevonden (geen wijziging): 100 bot-wedstrijden geven gemiddeld 3,0 doelpunten, 6,7 overtredingen en 0 vastlopers (`voetbal_botsim`); het geld per uur blijft binnen de balansgrenzen (`voetbal_balans_test`).

## Samen spelen

Alles hierboven is lokaal per speler (de carrière is van wie hem speelt, #429) behalve 8, 9, 13 en 14: die gaan over de derby (#1114, een mens in team 2 of een gast). Een gast heeft de snapshot en geen eigen sim; de radar en de HUD krijgen `eigenId` en `mijnTeam` van het eigen spel. Dekking: `voetbal_verfijn_test` en de bestaande `voetbal_samen_test` en `coopwedstrijd_voetbal_test`.

## Bewust niet

- `finishMatch(w, null)` weigert een wedstrijd die nog niet aan de beurt is **niet** (bestaande test `voetbal_carrierelive_test`: "uitrekenen kan altijd"); de weigering zit in het scherm, dat is het enige pad.
- Meer commentaarregels voor veelvoorkomende soorten (ingooi, uit, vrije bal hebben zeven regels): nieuwe tekst vraagt stembank en review, dus een eigen ronde.
- Een wedstrijdlengte of balansaanpassing: de metingen waren in orde.
- Een bevestiging bij "Aannemen" van een bod: de tekst zegt al dat jij kiest, zonder druk.

## Alleen in beeld of met een echte speler te bekijken

- De radar met vierkantjes en de draai in een derby, de tekst van de grijze knoppen en de meldingen.
- De leestijd van 1,6 s bij rust en eind (te lang of te kort?) en de herhaling van 0,9 s.
- Of "Zeker?" op de knop duidelijk genoeg is met een controller.
- Een echte wedstrijd tegen de computer voor het gevoel van tempo en AI (niet in node te beoordelen).
