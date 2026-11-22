# Verfijnronde OV, reizen en vertrekbord, 22-11

Opdracht van de eigenaar: geen nieuwe features, wel verfijnen wat er is (Quality of Life, QA, UX, leesbaarheid). Scope: de reis-erheen-popup, taxi, bus, trein (live en rooster), het vertrekbord met de tijdlijn, overstappen, de reisduur, het laadscherm tussen locaties, snelreizen, kaart en route, de controller, Samen spelen en een live bron die wegvalt.
Gelezen en getest in node (pure modules, mocks, fuzz); geen Electron en geen beeldronde. Bewijs staat in `scripts/verfijn_ov_reizen_test.mjs` (36 controles, waaronder fuzz over 300 reisopties en 200 borden) en `scripts/storytravel_test.mjs`.

## Wat is verfijnd

| # | Wrijving | Oplossing | Bewijs |
|---|---|---|---|
| 1 | Een rit van 80 km heette "± 78 min" in het keuzevenster, de briefing, de hudregel en de kaart | Eén `duurTekst` (reistijd.js): "1 u 18 min"; ovopties, reiskeuze, reisview en kaartactie gebruiken hem | verfijn_ov_reizen_test 1, 2 |
| 2 | De briefing zei bij een trekkerrit "met de auto" | De woorden volgen `selfMode` (trekker, fiets, lopend) | test 2 |
| 3 | Aankomstbericht "Reistijd 78 minuten" | Zelfde duurtekst in meerijden.js | test 6 |
| 4 | Info op de kaart: "lopen ± 440 min" | Uren bij lange afstanden | test 7 |
| 5 | Een taxi die te dichtbij is of tijdens een achtervolging niet kan, kreeg in kaartRijen de reden "Te weinig geld" | De eigen reden van de taxi (ovopties `taxiBlokkade`) | test 3 |
| 6 | De taxi was bijna altijd de aanbevolen rit, ook als een goedkope bus nauwelijks trager is | Is een goedkopere rit hooguit 25 procent (of 3 min) trager, dan wordt die aanbevolen; de taxi blijft aanbevolen als hij echt veel sneller is | test 4 (plus fuzz) |
| 7 | Een kapotte duur (NaN of ontbrekend) liet de oude reisscène eindeloos duren (stuck state) | `ritPlan` valt terug op de ondergrens van 6 s; de scène loopt altijd af | test 6 |
| 8 | Kapotte prijs of lengte gaf "NaN" in reistekst en een NaN-beloning | `selfReward`, `km`, `etaText` en `duurTekst` zijn NaN-vast | test 1, 2 |
| 9 | Een optie zonder lijnen of haltes gooide in de kaartlagen, de optieregel en `busTrip` | Defensieve lezers; `busTrip(null)` geeft null | test 5 |
| 10 | Een falende rit in het verhaal (fout in de scène) liet de speler zonder aankomst achter | De speler komt direct aan, zoals zonder scène (storytravel.js) | storytravel_test |
| 11 | Een afgewezen echte 3D-rit hield `active` voor altijd vast: reizen was daarna geblokkeerd | Afwijzing geeft de korte scène als terugval (reisrit.js) | codepad, nog niet in beeld |
| 12 | Een tekenfout in de korte reisscène liet de wereld gepauzeerd | De tick vangt de fout en rondt de scène netjes af | codepad, nog niet in beeld |
| 13 | Een save laden tijdens de korte scène zette de geladen wereld alsnog naar de bestemming | Zelfde laadteller-bewaking als bij de echte rit | codepad |
| 14 | Te weinig geld aan het eind van de korte scène: stilte | Melding "Te weinig geld voor dit kaartje" | codepad |
| 15 | Twee identieke bordrijen deelden een sleutel; de tijdlijn liet er één verdwijnen | Unieke sleutels (`#2`) | test 8 (plus fuzz) |
| 16 | Bronregel "Vertrekt over 75 min" en "over NaN min" bij een rij zonder tijd | Uren, en een lege regel zonder tijd | test 8 |
| 17 | De OV-hint zweeg voor altijd als de systeemklok terugsprong na een taxirit | Een tijd in de toekomst telt als verlopen | test 9 |
| 18 | Na het laden van een oudere save zweeg de hint tot de spelklok de oude stand inhaalde | De wachttijd begint opnieuw als de spelklok terugloopt | test 9 |
| 19 | Het laadscherm kon bij een kapotte tijd of teller tot de harde stop blijven hangen | NaN telt als verlopen of leeg: afronden | test 10 |
| 20 | Dubbelklik of toets en tik tegelijk in het reisvenster | `finish` is eenmalig | codepad |
| 21 | `ageText(NaN)` gaf "NaN s geleden" | "zojuist" | test 8 |

Samen spelen: niets hiervan verandert wie reist. Een gast kan nog steeds niet reizen (kaartactie, GAST_REIS_MELDING); de klok springt met meer spelers niet (`klokSprongMag`). De hint en de reisduur zijn lokaal per speler, de wereld is van wie het spel opende.

## Bewust niet gedaan

- Een nieuwe optie "Zelf rijden" of vlucht in de reispopup (staat als `gepland`: een nieuwe feature).
- De dienstregeling of de live buslocaties herontwerpen; de bronregel en terugval op het rooster werken al.
- Een cinematisch laadscherm: de overgang is al kort (snel 0,6 s) en heeft stappen in woorden.
- Het ingedrukt houden van A uit het reisvenster naar de scène (skip-bewaking van 0,6 s bestaat al).

## Alleen in beeld of met een echte speler te bekijken

- De duurtekst in het keuzevenster en op het bord: breekt "1 u 18 min" de regel op 1280x720 en op de telefoon?
- De aanbeveling met bus tegenover taxi: voelt de balans goed (prijs tegenover tijd)? Echte speler.
- De terugvalpaden van de reisscène (11 tot 14) zijn alleen in code geredeneerd en niet in Electron gezien.
- Controller: ritkeuze met D-pad en A bij een geblokkeerde taxi (uitgeschakelde rij met reden).
