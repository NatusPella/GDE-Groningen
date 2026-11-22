# Sprint 22-11, gebied Beleving: een levende wereld

Doel: de wereld laat zichtbaar en hoorbaar merken dat het weer, de tijd van de dag en de plek ertoe doen. Alleen tekstbellen en weerlogica, geen nieuwe modellen, geen geluid. Zie ook [WERELD-LEVEN-21-11.md](WERELD-LEVEN-21-11.md) (evenementen en dieren) en `game/js/straatpraat.js` (gesprekken van voorbijgangers, #190).

## Voor en na

| Onderdeel | Voor | Na |
|---|---|---|
| Weer in de straatpraat | vier soorten: droog, regen, mist, onweer; een helder uur klonk als elk droog uur | vijfde soort `zon` (helder, 11 tot 19 uur): 18 nieuwe gesprekken over volle terrassen, zwemmen, picknick en warm zand, twee of meer per streek; een zon-moment hoort ook alle droog-gesprekken, andersom niet |
| Weerwisseling | voorbijgangers merkten niets als het ging regenen, onweren, mistig werd of opklaarde | `weatherreaction.js`: na 3 tot 8 seconden roepen een of twee wandelaars binnen gehoorafstand een korte regel; 75 seconden rust; niet bij het weer waarmee een spel laadt; een verouderde reactie vervalt |
| Nachtpraat | twee of drie gesprekken per streek | drie of meer per streek, zes in de stad (nachtbus, snackbar, sterren, vuurtoren, kanaal in het maanlicht) |

## Wat er is veranderd

- `game/js/gebabbel.js`: `WETS` krijgt `zon`; `wetOf(kind, hour)` geeft `zon` bij `helder` tussen 11 en 19 uur; `gebabbelFor` laat `zon` ook de `droog`-gesprekken horen.
- `game/js/straatpraat.js` en `game/js/regiolevenrt.js`: geven het uur door aan `wetOf`.
- `game/js/weatherreaction.js` (nieuw, puur plus een tik) en de aanroep in `regiolevenrt.js`, achter dezelfde poort als de straatpraat (`playerBusy`, geen snel voertuig).
- Tests: `scripts/gebabbel_test.mjs` (zon, nacht), `scripts/weatherreaction_test.mjs` (klassen, overgangen, regels zonder merken of leed, de tik met pauze, verouderde reacties, geen luisteraars, een lopend gesprek blijft ongemoeid).

## Samen spelen

Decor per speler. Het weer van een gast volgt de gastheer (coopweer.js); elke speler ziet de bellen van zijn eigen wereld. Geen voortgang, geen beloning, geen netwerkverkeer, niemand valt weg of sluit later aan met gevolgen. Dekking: de pure tests hierboven.

## Nog niet bekeken (hertest)

Niets is in beeld of in Electron bekeken, alleen met pure tests en bronnen gecontroleerd. In beeld te bekijken:

- Komt de bel van een wandelaar na een weerwisseling goed leesbaar boven het hoofd, en niet tegelijk met een straatpraatgesprek van dezelfde wandelaars (`canTalk` sluit dat uit, in beeld nog niet gezien)?
- Voelt 75 seconden rust goed, of is het te druk of te stil bij vlot wisselend weer (regionale weergrenzen kunnen ook een reactie geven)?
- De zon-gesprekken: kloppen ze met wat de speler ziet (terrassen vol, zwemmers uit de evenementenlaag)?
- Niet gedaan in deze sprint: schuilen onder een luifel, paraplus die pas opgaan bij regen, claxon en voorrang, per-plek geluid (de laagindeling van 21-11 staat in `game/js/sfx/lagenplan.js`).

## Verder

Voorstel voor een vervolg: plaatsgebonden gebabbel (Bourtange, station, haven, Vismarkt) op `map.meta.landmarks`, en schuilgedrag bij regen in `pedestrians.js` (nu alleen een paraplu bij de uiterlijke kenmerken, `models3d_people.js`).
