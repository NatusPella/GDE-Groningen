# Routeregels: de snelste route, blijft op het begaanbare net (21-11)

Eigenaar-feedback (21-11): "De route in de wereld zelf loopt door een gebouw heen. De route mag ook gewoon de SNELSTE route aangeven,
ook al mag je daar officieel niet langs met dat voertuig."

## Onderzoek: waarom liep de 3D-routelijn door een gebouw?

Gemeten met `node scripts/world/route_gebouw_audit.mjs --n=90` op de echte stadswereld (89 routes: te voet, fiets, auto; elke vierde
met een doel midden in een gebouw). Voor de fix (de eerste 89 routes van dezelfde reeks, brug- en dekwegen over een pand niet meegeteld):

| laag | routes met een gebouwtreffer | segmenten | lengte in gebouw |
| --- | --- | --- | --- |
| planner (`route.pts`) | 5 | 34 | 118 m |
| strook zoals de wereld hem tekent | 7 | 75 | 119 m |
| eindpunt in een gebouw | 0 | | |

Na de fix, 235 routes (`--n=240`, 5 zonder route): planner 2 routes (4 segmenten, 49 m), strook 2 routes, eindpunt in een gebouw 0.
De twee restanten: een weg die de wereldbouw zelf door een pand legt vlak bij de start waar de router niets anders heeft, en een
hoek van 2 m langs een gevel. `--strict` staat daarom op hoogstens 2% van de routes en geen eindpunt in een pand.

Oorzaken:

1. **Wegstukken door een gevel waren maar achtvoudig duur** (`THROUGH_BUILDING_COST`). Een doorsteek of binnenplaats van OSM kan dan
   nog de kortste weg zijn. Nu 40 keer: alleen als er echt niets anders is.
2. **De rechter rijbaan van de auto (`keepRight`, `game/js/pathlane.js`)** schoof elk punt tot 2,2 m opzij zonder te kijken wat daar
   staat. Een straat die tegen de huizen ligt, of een hoek, zette de lijn in de gevel. Nu halveert de verschuiving tot het punt
   buiten het gebouw valt en blijft de lijn anders op het hart van de weg.
3. **Het einde van een route in een pand.** Een doel in een gebouw dat alleen een weg door de hal als dichtstbijzijnde had, liet de lijn
   het pand in lopen. `trimPathEnd` (`pathlane.js`) kapt de laatste 60 m af op de gevel, de deur van het pand.
4. **De strook wordt om de 2 m getekend** (`resamplePath`): een toets op alleen de routepunten (50 m uit elkaar) mist een hoek. De
   audit meet daarom op de bemonsterde lijn, om de halve meter.

Geen oorzaak bleken: het eindpunt (de router kiest een weg buiten het gebouw en de laatste rechte lijn naar het doel gaat alleen als
hij geen gevel raakt, `targetLeadAllowed`), de spline of afvlakking (die is er niet) en niet-geladen tegels (de graaf wacht tot de
tegelstroom stil is).

## Regels per vervoerswijze

De routeplanner geeft de SNELSTE route voor je voertuig, ook over wegen die je daar officieel niet mee mag (`prefs.fastest`, standaard
aan). Wat niet mag kost een toeslag (`SOFT_COST` 1,25 voor tegen de richting in; `SOFT_ROAD_COST` 1,6 voor een weg van een ander
voertuig), zodat een weg voor jouw voertuig bij een gelijke afstand wint. De regels staan in `pathgraphbuild.js` (de `*Soft`-graven).

| wijze | toegestaan zonder toeslag | toegestaan met toeslag | nooit / zeer duur |
| --- | --- | --- | --- |
| te voet | alle paden, straten, trappen | snelwegen (8x), buslanen | gebouwen (40x), water, spoor |
| fiets, scooter | wegen, fietspaden (met de eigen voorkeur) | tegen de richting in (1,25x), voetpaden, buslanen (1,6x), snelwegen (8x) | trappen (60x), gebouwen |
| auto | wegen, parkeerterreinen (dienstwegen 2,5x) | tegen de richting in (1,25x), voetpaden, fietspaden, pleinen, buslanen (1,6x) | trappen (60x), gebouwen |
| boot | het vaarnet (`vaarnet.js`) | | land, te lage bruggen |
| helikopter, vliegtuig | rechte lijn boven gebouwen (`airguide.js`, no-flyzones) | | |

De strenge routering blijft bestaan voor wie hem nodig heeft: `planLandRoute` en `findWalkPath` (voetgangers van de stad) volgen de
regels van `roadaccess.js` en de tests houden elke kant daartegen. De overtredingslaag (`trafficlaw.js`: een ster na een
respijtperiode, een waarschuwing op de snelweg) blijft de consequentie van wat de speler zelf doet, niet van de routelijn.

De Ommelanden (het provincienet, `roadgraph.js`) volgen nog de strenge regels: de snelste route geldt voor de stadsgraaf.

## Doel op een gebouw

Een doel in een gebouw (een klik, een missie) landt op de dichtstbijzijnde weg buiten de gevel (`snapToRoad`, `klikDoel`); de lijn
naar het doel zelf is hooguit 15 m en alleen als die geen gevel raakt. De gebouwdeuren (`passages.js doorsOf`) worden hier niet voor
gebruikt: een route naar de deur van een pand is een vervolgstap.

## Bewaking

- `scripts/route_regels_test.mjs`: de toeslagen per vervoerswijze en de baan buiten gevels (zuiver).
- `scripts/world/route_gebouw_audit.mjs --strict`: de steekproef op de echte wereld (zie boven); telt planner, strook en eindpunt.
## Meting (prestaties)

- Planning op de echte stad (235 routes): p50 0,6 ms, p95 2,9 ms, max 235 ms (de eerste route na een graafbouw); geen verandering ten opzichte van voor de fix.
- Graafbouw (`pathgraphbuild.js`, synthetisch, 20.000 wegen, vijf herhalingen): oud 150 tot 210 ms, nieuw 214 tot 234 ms (de vier extra
  graven). Op de echte stad 229 tot 297 ms achter elkaar; in het spel wordt hij per beeld in porties van 4 ms gebouwd, dus geen hapering erbij.
- Niet gemeten: fps in het spel (geen Electron gedraaid).

Open: de route naar de deur van een pand (`passages.js doorsOf`), de Ommelanden met de snelste regel, en een in-game schakelaar voor
`prefs.fastest` (er is er nog geen in Instellingen).
