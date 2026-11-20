# Gedeelde incrementele wegenindex (21-11-2026, #1042)

> Opdracht: de grootste nog niet geziene winst uit het CPU-profiel (docs/PERF-PROFIEL-21-11.md): bij elke tegelwissel
> bouwden vijf modules elk hun eigen index over alle geladen wegen opnieuw, op de hoofdthread.
> Gebouwd op `integratie-21-11-b` (0c225e464). Niets gepusht of gemerged.

## Wat er was

Per tegelwissel (300 tot 430 per 15 s wandelen) herbouwden: `fillNodes` (roadsurface.js), `buildNodes` (trafficlights.js),
`roadGraph` (vehicle/traffic.js), `buildGraph` (routing.js) en `buildGrassChunks` (grass.js) alles over alle geladen
wegen of groenvlakken, elk met `gridItems(...)` (kopie van het hele raster). Vier kopieen van "hoekpunt naar wegen" stonden
tegelijk op de heap.

## Wat er nu is

`game/js/roadindex.js`: **een** index per kaart (`map._roadIndex`, `roadIndexOf(map)`), sleutel is het getal van het punt in
0,1 m (dezelfde groepering als de oude sleutels), lijst per knoop `[road, idx, road, idx, ...]`. `tileworld.js` roept `add`
aan bij de eerste keer dat een weg in het raster komt en `remove` bij de laatste tegel die hem loslaat (de bestaande
`holdIn`/`releaseFrom`-telling is de refcount; `add` en `remove` zijn idempotent). Elke wijziging verhoogt `version` en komt
in een log (`since(versie)`, 8192 regels; een lezer die verder achterloopt bouwt opnieuw). API: `get(key)`, `nodeId`
(stabiel numeriek ID, vrijgekomen ID's worden hergebruikt), `nodesOfRoad`, `entriesOf`, `nodesNear` (tot 2 m),
`forEachNodeOfRoad`, `since`, `subscribe`.

| Consument | Voor | Nu |
|---|---|---|
| roadsurface.js `netState` | `fillNodes` over alle wegen, in blokken van 1200 per frame | leest de gedeelde index; geen bouw. Lichtenlijst volgt `allSignals` (junctionVer) |
| trafficlights.js `buildNodes` | eigen Map met `{road, idx}` per hoekpunt | leest de gedeelde index (filter op voetpad en korte wegen) |
| vehicle/traffic.js `roadGraph` | volledige herbouw (registratie plus korte-einden-lus) zodra de tegelwachtrij leeg is | houdt de graaf en past per weg de delta toe: gewijzigde wegen, wegen met een hoekpunt binnen 5 m en wie eraan vastzat (bijgehouden in `stitchOf`/`stitchedTo`) gaan opnieuw erin, in `_ord`-volgorde; grote pakketten (meer dan 1500 of een derde van de wegen) bouwen nog steeds helemaal opnieuw |
| grass.js `buildGrassChunks` | alle groenvlakken opnieuw in chunks, plus `assignSubLayers` over alles | `map._greenDelta` (door tileworld.js): alleen de chunks waar een vlak bij komt of af gaat worden bijgewerkt, sublagen alleen voor de nieuwe vlakken |
| routing.js `buildGraph` | alle gebouwtoetsen (drie steekproeven per wegsegment) opnieuw | de toets per segment staat in `road._tb`; hij vervalt als er een gebouw bij of af komt binnen het vlak van de weg (`map._buildingDelta`), bij de torenaanpassing in home.js (`_tbEpoch`) en als de weg het raster verlaat. De CSR-opbouw zelf blijft volledig |

## Bewijs (node, deterministisch; geen Electron)

Pure test `scripts/roadindex_test.mjs` (26 controles): toevoegen, weghalen, idempotent, stabiele ID's, versie, log,
abonnees, `nodesNear`; index na 40 willekeurige tegelwissels gelijk aan een verse opbouw; verkeersgraaf per delta gelijk aan
een volledige herbouw over hetzelfde raster in 50 willekeurige stappen (op realistische dichtheid 50/50, met 5% losse
einden ook 50/50), en een rondreis (alles eraf, alles erbij) levert dezelfde graaf.

Benchmark `scripts/perf/roadindex_bench.mjs` (`node --expose-gc`, 36 tegels resident, 30 tegelwissels, de echte tegels van
`game/world` via `GDE_WORLD_DIR` of junction; machine daarbij ook bezig met andere tests, dus de oude cijfers zijn eerder te laag dan te hoog):

| | oud (alles opnieuw) | nieuw |
|---|---|---|
| tijd per tegelwissel (mediaan / p95 / max), echte tegels, ~19.000 wegen | 270 / 767 / 807 ms | 0,4 / 1,8 / 2,1 ms |
| zelfde, synthetische tegels van 900 wegen (zwaarder dan een echte tegel), ~32.000 wegen | 529 / 1143 / 1321 ms | 14 / 27 / 59 ms |
| geheugen van de indexen | 123 MB (roadsurface plus trafficlights plus verkeersgraaf; junctions niet meegeteld) | 37 MB |
| kortlevende allocaties per 30 wissels | 2465 MB | 60 MB |

Juistheid op de echte tegels: index gelijk aan een verse opbouw (115.946 knopen, 19.089 wegen); verkeersgraaf per delta
tegen een volledige herbouw: 0 van 13.060 wegen verschillen. Gebouwtoetscache: 99% treffers in de graafbouw na tegelwissels
(122.475 treffers, 1.122 missers); 10 routes met warme en met koude cache zijn gelijk. De graafbouw zelf (CSR) werd daardoor
maar ongeveer 20% goedkoper (244 tegen 315 ms): de rest is de opbouw van de arrays en blijft op de hoofdthread.

Tests die groen bleven: `firstperson_test` (328), `import_cycles_test`, `lineendings_test`, `docs_index_test`,
`graphgate_test`, `routeribbon_test`, `nearestroad_test`, `trafficlights_tiles_test`, `trafficpath_test`,
`grass_want_test`, `grass_road_depth_test`, `roadpreload_test`, `vehicleindex_test`, `cemetery_route_test`, `startroute_test`,
`ritroute_test`. `road_route_test`, `mode_route_test` en `surface_blend_test` haalden de tijdslimiet (120 s) op de bezette machine
en zijn dus **niet** beoordeeld.

## Wat niet gemeten of niet gedaan is

- **Geen Electron-run, geen `scripts/perf/run.mjs`-profielrun** (longtasks, GC-aandeel, heappiek): de opdracht liet het
  venster niet toe en er was geen slot. De doelen "geen taken boven 50 ms door indexbouw, GC onder 3%, heappiek 200 MB lager"
  zijn dus **niet** in het spel bewezen. De node-cijfers laten zien dat de bouwwerken per wissel van ongeveer 270 ms
  (p95 770 ms) naar 0,4 ms (p95 1,8 ms) gaan en dat ongeveer 85 MB aan index verdwijnt; de heappiek in het spel moet nog gemeten worden.
- `routing.buildGraph` blijft een volledige CSR-opbouw (nu zonder de gebouwtoetsen); die kost nog ongeveer 250 ms per
  graafbouw en draait hooguit een keer per seconde nadat de lagen stil zijn (graphgate). Een echt incrementele graaf is een
  eigen, grotere stap (knoop-ID's van de graaf zijn globaal en de CSR is gepakt).
- `junctions.junctionIndex` bouwt een eigen index, maar eenmalig per kaart (niet per tegelwissel); niet omgezet.
- De verkeersgraaf kiest bij twee losse einden binnen 4 m van elkaars hoekpunten nog volgens de bouwvolgorde: dat deed
  de oude herbouw al, met de volgorde van het raster. De delta pakt de buurt (5 m en alles wat aan elkaar vastzat) opnieuw
  in `_ord`-volgorde, waardoor het op realistische dichtheid altijd gelijk is aan de herbouw; op een kunstmatig 9 keer
  dichtere kaart (4 m-aansluitingen overal) week de graaf in enkele stappen af in een enkel hoekpunt. De volgorde
  binnen een knooppuntlijst kan anders zijn dan bij een herbouw (de graaf kiest daaruit met de RNG van het voertuig).
- Een delta van de verkeersgraaf bij een zware tegel (900 wegen) kost tot 59 ms in een frame; een echte tegel 2 ms.
  Een tijdbudget per frame is niet toegevoegd.
- Samen spelen: niet met instanties geprobeerd. De index is afgeleide data uit dezelfde tegels voor host en gast; er gaat
  niets over het net.
- Het gras is niet in beeld vergeleken (zelfde opmerking als in het profielrapport): **nog niet bekeken**.

## Samen spelen

Is het van wie het spel opende? Nee: het is afgeleide client-data, per speler uit dezelfde tegels opgebouwd. Wat ziet een
gast? Hetzelfde wegennet. Beloning of voortgang: geen. Wegvallen of later aansluiten: de index volgt de tegels van de eigen
wereld. Dekking: `roadindex_test` (pure test) en de bench op echte tegels.
