# Verkeers- en wereldleven-audit (21-11-2026)

> Opdracht: het wereldleven (AI-verkeer, parkeren, voetgangers, fietsers, hulpdiensten) geloofwaardig en robuust maken, met pure
> tests op de echte tegels. Gebouwd op `integratie-21-11-b` (0c225e464) plus de gedeelde wegindex (`roadindex.js`, ongewijzigd) en de
> dakrijden-tak (zat er al in). Niets gepusht of gemerged. Issues: #1047 (bug, deels opgelost), #1048 (afval per auto-stap),
> #1049 (bochten snijden). Geen Electron-run gedaan: **niets hiervan is in beeld bekeken.**

## Hoe gemeten

Alles draait in node op de echte tegels (`game/world`, via `scripts/worldload.mjs`), met de eigen AI van het spel op een virtuele klok
(`updateTrafficAI`, `manageTrafficPopulation`, stoplichten, `updatePedestrians`, `manageParkedCars`), geseed, op vier plekken:
centrum, Oosterwijk, dorp Wildeplaats en de zuidring. Elke test heeft een `STRICT=1`-stand die elke afwijking als fout telt; de
standaardgrenzen zijn de gemeten stand zodat een verslechtering de test laat falen.

| Test | Dekt |
|---|---|
| `scripts/verkeer_wereld_test.mjs` | AI-auto's: midden in een gebouw (doorgangen uitgezonderd), lichaam tegen een gevel, in het water, meer dan 3,5 m naast het wegdek, vast zonder reden, blijvende overlap |
| `scripts/geparkeerd_wereld_test.mjs` | geparkeerde auto's: overlap, gebouw, water, rijbaan |
| `scripts/voetgangers_wereld_test.mjs` | voetgangers tussen rijdend verkeer: gebouw, water, door een rijdende auto, bevroren |
| `scripts/verkeer_alloc_test.mjs` | kortlevend afval en tijd per AI-stap (`GDE_ALLOC_PROFILE=1`: inspector-steekproef) |
| `scripts/roadfit_test.mjs`, `scripts/trafficstuck_test.mjs` | pure regels van de twee nieuwe modules (17 en 14 controles) |
| `scripts/simlagen_test.mjs` | spits, avond, regen (9 nieuwe controles; het voetgangerblok stond al die tijd na een `process.exit` en liep nooit: nu wel) |

## Bevindingen en wat ermee gebeurd is

1. **AI-auto's rijden langs gevels, onder gebouwen door en naar de sloot (bug, #1047).** Voor de ingreep, 4 x 180 s: 6 auto's met het
   midden in een voetafdruk, ruim 60 auto's met het lichaam tegen een gevel (vooral `service`-wegen en smalle straten als
   Munsterstraatje, 0,9 m van de gevel bij 4 m breed), 2 tot 7 auto's in het water (landpaden die bij een sloot ophouden). De oude
   `drive_audit`/`network_drive_test` rijden de *speler*; de AI-keuze van wegen werd nergens op echte tegels getoetst.
   **Opgelost:** `game/js/vehicle/roadfit.js` toetst een weg eenmalig (onthouden op de weg, vervalt bij een nieuwe gebouwversie):
   afstand hartlijn tot voetafdruk, de breedte van doorgangen onder gebouwen (`passages.js`), open water op de hartlijn en een
   doodlopend einde aan het water. `canUseRoad` weigert zulke wegen voor auto's (fietsen en scooters niet). Na de ingreep: 2 in een
   gebouw, ca. 44 gevelschaafjes, 2 in het water. De spawn gebruikt dezelfde toets.
   **Rest (#1049):** hoeken snijden in bochten op 6,5 m brede straten met een lange auto; gebouwde wegtoets lost dat niet op.
2. **Vastzitters verdwenen in beeld.** `manageTrafficPopulation` (en de fiets-, scooter-, motor-, bus- en politielus) haalde een auto
   na 25 s vast weg, ook voor de neus van de speler. **Opgelost:** `trafficstuck.js` is de ene regel: uit beeld en op minstens 40 m
   gaat hij na 25 s weg, in beeld pas na 90 s (150 s bij wachten), vlak bij de speler pas na het dubbele. De bestaande
   deadlockbrekers in `traffic.js` (wachtcirkel, tegenligger op smalle straat, obstakel inhalen, doorkruipen) bleven ongemoeid.
3. **Parkeren: schoon.** 97 stoepparkeerplekken en parkeervakken op vier plekken: 0 overlap, 0 in een gebouw, 0 in water, 0 in een
   rijbaan. Geen wijziging nodig.
4. **Voetgangers tussen verkeer: schoon.** 3 plekken x 90 s, piek 29 tot 47 wandelaars: 0 in een gebouw, 0 in water, 0 door een
   rijdende auto, 0 bevroren. Geen wijziging nodig. Zebra's en banken niet apart op echte tegels gemeten.
5. **Dichtheid per tijdstip.** `simlagen.js` kende alleen dag en nacht. Nu: spits (7 tot 9, 16 tot 18,30; niet in een dorp) 1,3x,
   avond 0,8x, 22 tot 24 0,45x, nacht 0,2x; regen (`world.weather.wet`) haalt tot 15% van het verkeer en de helft van de voetgangers
   weg (in het centrum 35%, terrassen en winkels). De spawnplafonds (`PLAFOND_VOL`) blijven gelden.
6. **Budget en afval (#1048).** Gemeten: 1 ms gemiddeld, 2 tot 15 ms zwaarste frame voor 30 AI-auto's; ca. 13 KB kortlevend afval per
   auto-stap. Hergebruikte uit-objecten voor `collisionProbe`, `followSpeedLimit` en de gebouwlijst per auto
   (`map.buildingsNearInto`), invoegsortering in `vehiclesNear`: 13,7 naar 13,0 KB. De rest is niet gevonden: de steekproef wijst
   functies aan die in een microbenchmark niet alloceren. De verkeerstijdbudgetten (`simlagen` stapSlaOver, `pathbudget`,
   `spawnBudgetPerCall`) bestonden al en zijn ongewijzigd.

## Niet gedaan, niet bekeken

- Geen Electron-run, geen beeld. Alle bewijs is node op echte tegels.
- Fietsers (`bikerider.js`, vallen bij een aanrijding): `fietsschade_test` en `bikerider_test` bestaan en slagen; niet opnieuw uitgebreid.
- Politie-achtervolging, wegblokkades en sirenes: alleen gelezen (sirene is aan bij `v.sirenOn` of wanted > 0 en niet bij een wrak);
  geen nieuwe test. Hulpdiensten-uitwijken (`sirenYield`) draait mee in de sim maar is niet apart getoetst.
- NPC's op een auto-dak (#1023): zat al in de tak `worktree-agent-a201c162c94d696df` (`perchrijden_test`), niet aangeraakt.
- Rotondes en stoplichten: `junction_sim_test` slaat in deze worktree over (geen `data/cache/province`); de hamlet-test slaagt (4/4).
- Zebra's: voetgangers oversteken op een zebra niet apart gemeten.

## Samen spelen

NPC's en verkeer zijn van wie het spel opende en gaan mee in de snapshot; er is geen nieuw protocol. `roadfit` en `trafficstuck`
draaien alleen aan de kant die de wereld simuleert. Gasten simuleren geen AI. De dichtheid volgt `world.weather.wet` van de host. Test:
de pure tests hierboven (geen testbankstap).

## Vervolg verkeer-ai-21-11 (#1049, #1020)

**Bochten snijden (#1049): geprobeerd, niet ingevoerd.** Proef: het stuurdoel van `updateTrafficAI` (pure pursuit, `lookahead`) werd bij
een bocht in het pad teruggetrokken naar de auto toe (`bendLookahead`: draaiing over de kijkafstand, ondergrens 2,6 m). Gemeten met
`STRICT=1 node scripts/verkeer_wereld_test.mjs` op zes zaden (777, 11, 22, 33, 44, 55), voor en na:

| | gevelschaafjes (som) | naast het wegdek (som) | vast zonder reden (som) |
|---|---|---|---|
| zonder wijziging | 326 | 66 | 9 |
| kijkafstand omlaag in bochten | 277 (-15%) | 61 | 29 |
| idem, alleen vanaf 2,5 m/s | 301 | 63 | 44 |
| sterkere varianten | 41 tot 62 per zaad, geen betere stand | gelijk | 20+ |

De schaafjes gaan iets omlaag maar de wachtrijen bij kruispunten (`waitFor` 40 s, reden `queue`) verdrievoudigen. Spelers merken een file
eerder dan een schaafje, dus de wijziging is niet ingevoerd. De tellingen zijn ruis van ruim 15% per zaad. De volgende stap is geen
tweak aan de kijkafstand maar een bochtpad: het kruispuntpad (`buildPathInto`) per voertuiglengte met een ruimere boog afronden, en de
`stuck`-teller toetsen op vaste (niet zaadafhankelijke) plekken. #1049 blijft open.

**Taxipad op de echte tegels (#1020): `scripts/taxirit_wereld_audit.mjs`.** Echte autoroutes (`planDriveRoute`) tussen 150 willekeurige
paren in de stad (straal 1,8 km, vast zaad), daaruit het ritpad (`ridepath.js`), getoetst op het gereden begin en eind tegen de
gebouwvoetafdrukken op de rechterbaan. Oude werkwijze (gewone spline door de hele route): 42 van 150 routes met punten in een gebouw.
Nu: 1 van 150, en dat is een route waarvan de wegpunten zelf door een gebouw lopen (data, ook de wegpunten hebben dan 11 punten binnen).
Begin of doel in een gebouw: 0 van 150 (de aansluitstukken vallen weg). Dit is de provincie-audit voor de stad; de rest van de provincie
vraagt tegels die niet in de test passen. De botsing van de taxi met props en voetgangers is niet onderzocht.

## Bisect: `verkeer_wereld_test` faalt op main (22-11)

**Verschijnsel.** Op `ceb5affd4` (zaad 777): 5 AI-auto's met het midden in een gebouw (grens 3) en 10 die lang vastzitten (grens 4).

**Bisect.** Referentie `5a92fa3e0` (waarop de grenzen zijn gemeten), 940 commits tot main, de huidige test als vaste meetlat (apart bestand, oudere commits
draaiden hem met dezelfde wereld uit de hoofdmap van 16-11). Eerste "slechte" commit op `stuck <= 4`: `cb381a305` (interieurs #1150, alleen openingstijden en
interieurtekst). Die raakt het verkeer niet; de uitkomst springt tussen 0 en 12 al bij een niet-verkeerscommit. Dat is geen regressie in route-snelste (#1178),
`pathgraphbuild` of de perf-code, maar een steekproef met te weinig vastigheid. Bewijs, 24 zaden (7 tot 30) per commit:

| meting (gemiddelde per zaad) | `5a92fa3e0` (referentie) | main `ceb5affd4` |
|---|---|---|
| vast (grens 4) | 3,0 | 4,2 |
| in gebouw (grens 3) | 3,2 | 2,8 |
| schaafjes (grens 75) | 53 | 51 |

Zelfs op de referentiecommit faalde de test op zaad 777 (4 in gebouw, grens 3), en een commit zonder verkeerscode verschoof de stand. Het
gemiddelde ligt dus op de grens; zaad 777 is een slechte trekking. De wachtrijen van de wijkcentra in `queue` (zie hierboven, #1049) zijn deze zelfde ruis.

**Oorzaken die wel echt zijn (en in de test stonden als fout).**

1. *Stuck = file achter een stoplicht.* De test telde elke auto met `waitFor > 40` die zelf niet `_atLight` was. Een rij achter een licht wacht een hele
   cyclus (`MAX_CYCLE` 48 s) plus het leegrijden; de achterste auto's staan niet zelf op het licht en haalden de 40 s. De spel-AI zelf laat zo'n rij met rust
   (`queuedAtLight`) en keert pas na 35 tot 44 s als er geen rij is. De drempel is nu 70 s (`STUCK_WAIT`): een cyclus plus marge. Op 24 zaden is het gemiddelde
   0,04 (nul tot een enkele auto): echte vastzitters komen nauwelijks voor.
2. *Inside = garage-inrit.* Twee van de vijf (oostwijk, de winkel met de ondergrondse parkeerinrit) rijden op een `tunnel`-weg die bewust in de voetafdruk
   eindigt. Die zijn uitgezonderd; de overige blijven (hoekensnijden bij kruispunten in het centrum en op serviceweggetjes naast woningen, #1049).

**Wat niet is aangepast.** Geen spelcode: er is geen regressie in route-, pad- of wereldcode aangetoond. Zaad 777 geeft nu 6/6; 3 van 24 zaden blijven op
`in gebouw` boven de grens van 3 (echte restpunten, geen test die afgezwakt is). Niet bekeken: een auto-stap-voor-stap-vergelijking op de provincietegels buiten
deze vier plekken.

## Bochtbogen in plaats van een kortere kijkafstand (#1049, #1047, 22-11)

**Aanpak.** De vorige poging stuurde bij: een kortere kijkafstand in bochten. Die gaf minder schaafjes maar meer vastzitters. Nu is het de
meetkunde van het pad zelf (`game/js/vehicle/turnarcs.js`, pure module, `scripts/turnarcs_test.mjs`, 16 controles). Het AI-pad was een
polyline van rijstrookpunten; bij een afslag sprong het van het knooppunt op de oude weg naar het knooppunt op de nieuwe weg en pure
pursuit sneed die hoek. Nu vervangt een cirkelboog die raakt aan beide rijstrooklijnen die hoek:

- straal minstens de draaicirkel van het voertuig (`1,2 / maxCurvature`, ondergrens 4,5 m), de raaklengte is hoogstens 85% van het korte stuk;
- een gevelcontrole op negen punten van de boog; is de afstand kleiner dan de halve autobreedte plus 0,3 m (plus 0,35 m per meter halve
  lengte boven 2,3 m: een vrachtwagen heeft meer uithaal nodig), dan wordt de straal ruimer (1,5x, 2,2x, 3,2x, 4,5x) en geldt de ruimste vrije boog;
- de boog wordt een keer per afslag berekend en bewaard bij de afslag in `v.plan` (kruispunten) of op de weg (`road._varc`, per voertuigklasse
  en wegpunt, ook gewone wegknikken boven 0,2 rad), niet elk frame; het pad krijgt 5 punten per boog, het middelste is het kruispuntpunt
  (vlaggen `j`, `node`, `from` blijven kloppen voor voorrang en kruispuntruimte);
- een auto die al op de boog rijdt, begint zijn pad op de boog (`nearestOnArc`), ook na het wisselen naar de nieuwe weg (`v._arc`);
- bochtsnelheid: `curveSpeedLimit` leest de kromming van het pad, dus de snelheid volgt nu uit de boogstraal in plaats van uit een scherpe hoek;
- fietsen en scooters, keren, en voertuigen met een bijzondere rijstrook (`laneMode`) bij wegknikken houden het oude pad.

**Meting.** `node scripts/verkeer_zaden_meting.mjs` draait `verkeer_wereld_test` (`STRICT=1`, 180 s, vier plekken) over 24 zaden (7 tot 30) en telt op.
Zelfde wereld, zelfde zaden, alleen de code verschilt:

| 24 zaden x 4 plekken x 180 s | voor (main) | alleen kruispuntbogen | + wegknikken (ingevoerd) |
|---|---|---|---|
| gevelschaafjes (som) | 1053 (44 per zaad) | 911 (-13%) | 700 (29 per zaad, -34%) |
| auto met het midden in een gebouw (som) | 21 | 9 | 4 |
| meer dan 3,5 m naast het wegdek (som) | 212 | 219 | 184 (-13%) |
| vast zonder reden (som) | 1 | 0 | 1 |
| in het water, blijvende overlap | 0, 0 | 0, 0 | 0, 0 |

De vastzitters gaan dus niet omhoog (de vorige poging: 9 naar 29). Zaad 777 (de standaardrun van de test): 41 schaafjes, alles binnen de grenzen; de
grens voor schaafjes is van 75 naar 50 gezet. De tabel is een som over 24 zaden; de ruis per zaad is groot, het verschil van 1053 naar 700 ligt er ruim boven.

**Wat blijft.** In 3 zaden (steekproef) valt de helft van de resterende schaafjes ver van een kruispunt (jAhead > 25 m): straten waar de gevel
binnen de wegbreedte staat (Stalstraat bij 71,21, 6,5 m breed, gevel 2,9 m van de hartlijn): dat is wegdata (de gevel in het wegdek), geen
boogprobleem, en komt op dezelfde plek in elk zaad terug. Een rijstrookklem per wegpunt (zoals `roadHalfWidths`) is de volgende stap. Op
tegelgrenzen en in de buurt van de provincie buiten deze vier plekken is niet gemeten. De breedste boog (4,5x) werd in de trafficpath-run
niet gekozen (`ARC_STATS.wide` 0): de gevelcontrole grijpt zelden in. Niets is in beeld bekeken: alleen node op echte tegels.

**Samen spelen.** Verkeer is van wie het spel opende en gaat mee in de snapshot; de bogen zijn lokale padmeetkunde in `updateTrafficAI`, die alleen
de kant draait die de wereld simuleert (gasten niet). Geen nieuw bericht, geen voortgang of beloning per speler; test: de pure tests hierboven.

## 24-11: rijstrook langs de gevel en doodlopende einden (#1047, #1049)

Met `verkeer_wereld_test --json=<bestand>` (elk schaafje met de ruimte tot de gevel, keren en afstand tot het weguiteinde) bleken de resterende schaafjes
op een paar vaste plekken te zitten: servicewegen waar de gevel op 1,5 m van de hartlijn staat (de rechterrijstrook zette de flank tegen de gevel),
en keren aan een doodlopend einde naast een pand (servicewegen achter garages, de stomp van de Molenstreek). Twee wijzigingen:

- `vehicle.js laneOffset`: op een smalle weg (tot 7,5 m) blijft de rijstrook binnen `road._fit.c - halve breedte - 0,25 m`: de auto houdt het midden aan;
- `roadfit.js endRoom` en `traffic.js canUseRoad`: een doodlopend einde met een voetafdruk binnen een autolengte plus 2 m (max 6 m) is niets voor een auto.

| 24 zaden (7 tot 30) x 4 plekken x 180 s | integratie-0.66 | + rijstrook | + doodlopend einde |
|---|---|---|---|
| gevelschaafjes (som) | 861 (35,9 per zaad) | 800 | 632 (26,3 per zaad, -27%) |
| auto met het midden in een gebouw | 4 | 5 | 0 |
| meer dan 3,5 m naast het wegdek | 202 | 200 | 202 |
| vast zonder reden | 1 | 1 | 0 |

Wat blijft: kruispunthoeken op 6,5 m brede straten (Pelsterstraat bij 63,235, de Molenstreek bij 187,-2537 waar de stomp 6 m van een huis eindigt) en
Stalstraat (gevel op 1,65 m van de hartlijn op een eenrichtingsweg). In beeld: scripts/qa/verkeer_beeld.mjs, docs/beeld-24-11/verkeer/.
Samen spelen: verkeer is van wie het spel opende; de keuze van wegen en de rijstrook zijn lokale AI-meetkunde, geen nieuw bericht.
