# Verfijnronde 22-11: wereld, verkeer, NPC-leven en navigatie

Geen nieuwe features: verfijnen wat er is. Alles is in node bekeken (pure modules, simulaties, mocks); er is geen Electron of beeldrun gedraaid. Tests: `node scripts/verfijn_wereld_test.mjs` (19 groepen, ook de lange simulaties) plus de bestaande tests van de geraakte modules.

## Wrijving, oplossing, bewijs

| # | Wrijving | Oplossing | Bewijs |
|---|----------|-----------|--------|
| 1 | Een geparkeerde fiets, boot of scooter stond als "Auto jatten" in beeld | `game/js/vehicleverb.js`: het werkwoord noemt het voertuig (Fiets, Scooter, Boot, Bus, Paard jatten) | `verfijn_wereld_test` (vehicleVerb) |
| 2 | Een bezette scooter heette alleen "Jatten" | "Scooter jatten", gelijk aan fiets en bus | idem |
| 3 | Een NaN, nul of negatieve tijdstap bevroor het weer voorgoed (leeftijd en regen NaN) | `stepWeather` slaat ongeldige stappen over | test plus simulatie over 120 speeluren (eindig, droog is de norm, geen eindeloze bui) |
| 4 | Een NaN-plek gaf het weer van "zuid" | `regionAt` valt terug op de stad | test |
| 5 | De minikaart tekende nooit meer als de eerste tijd ongeldig was | `minimapRedrawDue` tekent bij een ongeldige tijd | test |
| 6 | Vastgehouden Enter of spatie, of een snelle dubbelklik, opende de kaart meermaals | herhalende keydown telt niet, klikken binnen 350 ms tellen als één | test |
| 7 | Een NaN-near of -dt maakte de camera-near voorgoed NaN | `stepNear` valt terug op de veilige waarde | test |
| 8 | "Zit je vast?" telde een hapering van seconden als vastzitten en bevroor bij NaN | tijdstap begrensd op een kwart seconde, NaN telt niet | test |
| 9 | De gele routestrook kon NaN-alpha krijgen | `ribbonAlpha` geeft 0 bij een ongeldig punt | test |
| 10 | Van auto naar fiets wisselen (jatten) gaf één beeld een rolsprong | de koers reset bij een andere voertuigsoort | test |
| 11 | De taxistrook toonde "NaN m", "undefined" of een tijd "NaN s" | ongeldige getallen worden "-" of weggelaten | test |
| 12 | De klant stapte niet uit als je zelf al was uitgestapt bij de bestemming; de rit liep dan tot de tijd om was | `afzettenKlaar`: ook als je er hooguit 6 m naast staat | test |
| 13 | Bij een aardbeving riepen meerdere mensen dezelfde zin | `distinctPicks`: elk een andere roep, niet dezelfde als de vorige beving | test (200 zaden) |
| 14 | Een figurant zei twee beurten achter elkaar dezelfde zin | eigen stap door de lijst: opeenvolgende beurten verschillen altijd, de hele lijst komt langs | test |
| 15 | Twee naburige spraakbellen met dezelfde zin | de tweede zwijgt even | test |
| 16 | Met een ongeldige spelerplek praatten alle figuranten | geen bellen zonder geldige plek | test |
| 17 | Een plas zonder grenzen gooide een fout bij blauwalg | geen vlekken, geen fout | test |
| 18 | NaN in de busbediening maakte deuren en kneelstand permanent NaN | tijdstap en snelheid bewaakt | test |
| 19 | NaN in snelheid of tijdstap maakte de FOV permanent NaN (beeld weg) | `stepFov` herstelt zichzelf | test |
| 20 | NaN-tijdstap of -snelheid liet een busrit nooit meer bij een halte stoppen | `updateRide` bewaakt beide | `busride_test` blijft groen |
| 21 | Twee groepsdoelen op bijna gelijke afstand wisselden elk beeld welk doel de pijl volgt | `navtarget.js`: eigen id per groepsdoel en 15% hysterese op het vorige actieve doel (hud_panel bewaart het) | test: 200 beelden zonder wissel |
| QA | Lange simulatie wereldleven: een jaar | elke dag heeft een mensenevenement, elk type komt voor, geen 6 dagen precies hetzelfde | test |

## Samen spelen
Alles hierboven is lokaal per speler (hints, camera, minikaart, doelkeuze van de pijl). De taxi-bijbaan is van wie hem opent (`c.owner`): de gast raakt de strook van de eigenaar niet, en afzetten gebeurt bij de eigenaar van de rit. Wereldleven is een pure functie van dag en klok: iedereen op dezelfde dag ziet dezelfde evenementen; alleen de spraakregel hangt van de lokale animatietijd af en hoeft niet gelijk te lopen.

## Bewust niet
- Taxi en OV: een volledig reisplan (reis erheen met overstap) en een wachtrij van klanten: nieuwe functies.
- De grote kaart (`mapview.js`) bewaart het actieve doel nog niet voor de hysterese; alleen de minikaart doet dat nu.
- Nieuwe evenementen of nieuwe weersoorten.
- Pop-in en hapering: geen code gevonden die zonder meting te verminderen is; de meetpunten staan in `docs/PERF-MEETPUNTEN-21-11.md` van een andere ronde.

## Alleen in beeld of met een echte speler te beoordelen
- De nieuwe hintteksten "Fiets jatten" en "Scooter jatten" naast het icoon en de ring.
- Of het uitstappen van een taxiklant bij de bestemming natuurlijk voelt als je zelf uitstapt (nog niet bekeken).
- De pijl op de minikaart bij twee groepsdoelen (flipperen weg, maar het gevoel van "blijft de pijl te lang op het verste doel" is niet beoordeeld).
- Het ritme van spraakbellen op de Vismarkt en de Grote Markt.
- Voertuigcamera per soort en weer en dag-nacht-leesbaarheid: alleen in beeld te beoordelen.
