# Deel 4: Nazomer (de eerste afleverbare helft, #361)

Hoort bij [00-OVERZICHT.md](00-OVERZICHT.md), [08-IMPLEMENTATIE.md](08-IMPLEMENTATIE.md) en [09-script-akte6.md](09-script-akte6.md). Uitwerking van #361 (de finale in Vesting Bourtange en de NAM-zijlijn, uit #26).

## Waarom niet de oude Deel 4

De scripts `../deel4-f4a.md`, `../deel4-f4b.md` en `../deel4-f4c.md` (de Ommelander Ronde, 32 missies, 1,2 MB tekst, patatbaron Ubbo Oldenhuis) horen bij het eerste verhaal. Het nieuwe verhaal (akte 1 tot en met 5, M01-M26) heeft ze ingehaald:

- **Jelle Terpstra** is de tegenstander; Oldenhuis Bakt is in de epiloog van Jelle (E2: de eenenveertig snackbars gaan dicht). Ubbo past er niet meer in.
- **De finale in Bourtange bestaat al:** M20 (Het beleg van Bourtange) en M26 (het Ontzet).
- 08-IMPLEMENTATIE zegt het ook: `DEEL4_STEP_DAYS` hoort niet bij dit verhaal.

De branch `claude/w4-deel4-3b9c35` (8 commits) bouwt M08-M26 van een eerdere stand van het nieuwe verhaal; main heeft die missies inmiddels allemaal anders en completer. Bruikbaar bleek alleen het idee, niet de code: het doeltype `reis` (staat nu in main als `storyreis.js`) en de aanpak met stages op echte plaatsen (zoals `missions_akte4.js`). Er is niets van die branch overgenomen.

## Wat er nu staat

Een kort, afgerond **Deel 4: Nazomer**, maandag 14 tot en met zaterdag 19 september (na de epiloog van vrijdag 11 september, nog zomer). Alleen tekst en ondertitels: er is niets opgenomen en niets nieuw ingesproken (vijf korte regels komen toevallig overeen met bestaande opnamen: "Nee.", "Tammo.", "…Voor de grip.", "Kon minder.", "Kon veel minder.").

| Stap | Titel | Waar | Wat |
|---|---|---|---|
| M27 | Inpakken | Loppersum | Willemien (familie van Oma) moet even uit haar huis, het wordt versterkt. Boeken, servies, een foto uit 1953, de kat in de mand. |
| M28 | De wisselwoning | Loppersum | De verhuisbus rustig naar de wisselwoning. Rikus draait één nummer zonder praatje. |
| M29 | Terug | Loppersum | Het huis is klaar. Tafels op het erf, buurtfeest, de foto in de gang. "Voor de grip." |
| T5 | De weg naar Bourtange | Westerwolde | Reisstap met reiskeuze (meerijden, zelf rijden, overslaan); Berend belt. |
| M30 | Het proefbeleg | Vesting Bourtange | Berend wil één keer weten hoe winnen voelt. De vrienden van Oma: de gracht, de ophaalbrug, drie bolwerken. Berend wint en vindt dat verkeerd. Slotscène bij de Fjord Frituur: "Thuis is waar de kar staat." "Zes." "Kon minder." |

**De NAM-zijlijn** is de reeks Scheuren (M27-M29) uit het F4a-script (Z26-Z28), nu als verhaal in de nieuwe lijn. Regels uit de constitution (punt 6) en `../PROVINCIE-VERHAAL.md` §8:

- het bedrijf heet alleen **Delfstof Noord** (één bord en één zin) en is nergens een schurk;
- geen cijfers (aantallen huizen, schade, bevingen): niets wat we niet kunnen controleren;
- niemand maakt een grap over de schade of het huis; de humor zit in dozen, een kat en een buurman die te veel helpt;
- geen falen, geen tijdslimiet, geen politie, geen geldbeloning die groter is dan een klus;
- **geen wraak.** De speeltest vroeg om "wraak voor mijnbouwschade" (#30). Dat is bewust niet gebouwd: de reeks is warm en stil (inpakken, verhuizen, terugkomen). De Herstelploeg Delfstof Noord uit `stadmissies.js` blijft een zijmissie.

De reeks stond in het F4a-script onder voorbehoud ("alleen als de eigenaar ja zegt", PROVINCIE-VERHAAL §10 vraag 3). #361 vraagt er zelf om; **als de eigenaar het toch niet wil, is het weghalen één commit** (de steps M27-M29 en hun scènes).

**De Bourtange-finale** is niet de oude O30/O31 (met Ubbo), maar een proefbeleg dat past bij de epiloog: Berend schreef een brief dat hij volgend jaar weer de bisschop wil zijn "omdat hij zo goed kan verliezen". Het proefbeleg is de generale; hij wint voor het eerst, "dan is winnen verkeerd", en verliest volgend jaar weer. De zeven vrienden van Oma (Lammert, Klaas, Roelfien, Wubbo, Tinus, Geesje, Bert) en Durk, Douwe en Jelle spelen mee uit het F4c-script (O30), zonder Ubbo.

## Hoe het in het spel zit

- **Eigen deel `nazomer`** (`PARTS.nazomer`, `after: 'ontzet'`). De steps staan in `STEPS` achter E; de scènes in `09-script-akte6.md` (act 6 in `script.json`).
- **Het wacht op de finalekaart.** `nextStoryStep(doneId, missionPassed, cardSeen)` houdt een vervolgdeel tegen tot de eindkaart van akte 5 (de epiloog en de studio) is afgespeeld. Dan gaat het verhaal door met M27. Zonder `cardSeen` (opgeslagen-spel-overzicht, kalender van een oud spel) staat het deel open.
- **De aftiteling en de postgame blijven van akte 5.** `getEnding` telt de missies van een vervolgdeel niet mee en kijkt naar de finalekaart, niet naar de huidige stap. `postgame.js` opent op diezelfde kaart. Wie in Deel 4 zit, krijgt de aftiteling toch op het moment dat de rest klaar is.
- **Einde van Deel 4:** de eindkaart `Einde van Deel 4` (Rikus, Tessa, Tammo), zonder "Wordt vervolgd".
- **Kalender:** `NAZOMER_STEP_DAYS` (14, 15, 17, 19, 19 september); `partStartDay` leest nu ook een andere maand dan augustus.
- **Missies:** `missions_akte6.js` (stages: hold, scene, goto, board; geen timer, geen schade), `missionstory_akte6.js` (NPC's en foutregels), `cutscenes_akte6.js` (regie), nieuwe NPC's Willemien en Buurvrouw, `speakers.js` (kleuren), `reisbeats.js` (M27 en T5, act 6).
- **Tests:** `scripts/akte6_test.mjs` en `scripts/cutscenes_akte6_test.mjs` (nieuw), `cutpreview_test`, `storydata_test`, `storyflow_nieuw_test`, `akte5_test`, `reisbeats_test`; de Electron-verhaaltest loopt na het Ontzet door Deel 4 (zie het changelog en het issue).

## Wat niet is gedaan

- De regie met `cutscript` (`game/js/cutscenes_akte6.js`: de intro's en outro's van M27-M30 en de scènes M27.2, M29.2, M30.2, M30.3 en M30.5) is alleen met `cutscenes_akte6_test` gecontroleerd (compileert, camera dichtbij, niemand springt, de sprekers komen in beeld). De camerastanden zijn automatisch gedekt; er zijn geen handgemaakte shots. **Niet in beeld bekeken.**
- Geen mechanica voor het beleg zelf (geen bevelwiel, geen gracht-boten, geen duiven-minispel): de gracht, de brug en de bolwerken zijn plekken om naartoe te lopen, vlaggen te planten en een scène te zien.
- De plaatsen zijn wereldmeters uit het OSM-uittreksel van de provincie (`data/cache/province`): in Loppersum op de Hofstraat en de Pruimenhof (de tekst noemt geen straat), in Bourtange op de paden rond de vesting (de bolwerken staan waar de wachthuisjes staan; de bruggen zijn die van de Batterijenstraat en de Bisschopsweg). Elk punt is tegen het uittreksel gecontroleerd op: niet in een gebouw, niet in water, op of aan een straat of pad. **Nog niet gelopen en niet in beeld bekeken** op de geladen tegels.
- Niet gebouwd uit het oude Deel 4: de zeven voorrondes, Ubbo, de Ommelander Ronde, de andere regio's (Hogeland-, Wad-, Westerkwartier-missies), de zijreeksen Randstedelingen, Wubbo en de Wolvenman. Wat daarvan bruikbaar is voor een volgend deel, staat nog in de F4-scripts.
