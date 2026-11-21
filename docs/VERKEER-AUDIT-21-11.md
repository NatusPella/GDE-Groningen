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
