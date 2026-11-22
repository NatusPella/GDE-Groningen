# Sprint 22-11: snelheid van de spellogica

> Tak `sprint-snelheid-logica-22-11` (vanaf origin/main 4b307a11c). Geen Electron, geen build, niets in beeld bekeken en niets op een GPU gemeten: alleen microbenchmarks in node met synthetische data (de `game/world` met de echte provincie stond niet in deze werkboom, dus de weg- en busdata zijn nagebootst).
> Aanpak: eerst meten, dan sneller maken zonder de uitkomst te veranderen. Elke test vergelijkt de nieuwe code met een referentie (de oude code of een onafhankelijke implementatie) en meet de winst.

## Voor en na

| Onderdeel | Wijziging | Voor | Na | Test |
|---|---|---|---|---|
| Bordkaart in de bus en haltezoeker (`busroutes.js` `nearestLine`, `linesNear`) | omhullend vak per lijn: een lijn die verder weg ligt dan de grens wordt niet punt voor punt afgezocht | 1,8 ms per beeld (30 lijnen van 900 tot 1500 punten) | 0,03 ms (x30 tot x60) | `snelheid_buslijn_test` |
| Bus-AI per tik (`busroutes.js` `project` met venster) | het venster begint met een binaire zoektocht op de boogafstand en stopt bij de eerste grens | 0,13 ms voor 20 bussen | 0,02 ms (x6) | idem |
| Minimap en kaart: sporen (`railway.js` `drawRailsOnMap`) | alleen de rasterbakjes onder het beeld, zichtbaarheid één keer in plaats van in beide lagen | 2,7 ms per tekenbeurt (2.500 sporen) | 0,03 ms (x80) | `snelheid_spoorkaart_test` |
| Wegroute over het provincienet (`roadgraph.js` `roadCostsFor`) | hervatbare Dijkstra: rekent tot de knopen die de vraag nodig heeft vaststaan, bewaart de stand in de cache en rekent door als een latere vraag meer nodig heeft. Heap in getypte arrays (geen `[d, v]`-paren) | hele net per route: 11 ms (67.600 knopen) | route over 750 m: 0,9 ms (x13); een route over de hele kaart blijft even duur | `snelheid_wegroute_test` |

De uitkomst is gelijk: de weg-test vergelijkt afstanden en padlengtes met een onafhankelijke Dijkstra (met eenrichtingswegen, deels, hervat en volledig), de bus- en spoortest vergelijken tegen de oude code op duizenden willekeurige vragen. De volgorde van de heap is niet gewijzigd, dus bij gelijke kosten kiest hij dezelfde voorganger.

## Gekeken en bewust niet aangeraakt

- Opslaan en laden: `stateSignature`, `lastWritten`, het terugleesvergelijk en het herstel zijn al op tekstgelijkheid gebouwd (#655); een tweede parse per autosave komt niet meer voor.
- Minimap: cadans (`minimapcadence`), `minimapView` (cache 0,4 s met marge), polygonen per kleur in één pad: al aanwezig.
- Stadsroute (`astar` in `routing.js`): stempels in plaats van wissen, eigen heap: al goed.
- Samen-snapshot (`kiesVoetgangers`): `Math.hypot` kost 50 ns tegen 14 ns voor `sqrt`, maar bij 300 voetgangers en 4 spelers is dat 60 microseconden per bericht: de winst is het risico op een andere afronding niet waard.
- NPC-lussen (`updatePedestrians`): sim-worker, ver-weg-AI en spreiding over frames bestaan al (#58, #653).

## Wat in beeld bekeken moet worden (nog niet bekeken)

1. Minimap met spoor: station Groningen en de lijn naar Haren, ook uitgezoomd (trein, heli): de sporen moeten er hetzelfde uitzien als voorheen, niets valt weg aan de rand van het beeld.
2. Een route van dorp naar dorp op de volledige kaart (GPS): komt hij aan, ook als je buiten de route rijdt en opnieuw plant; eenrichtingswegen en de laatste meters naar het doel kloppen.
3. Een route van de stad de provincie in en terug (poorten): de keuze van de poort verandert niet.
4. Een buschauffeur (G, dienst overnemen) en een bus buiten dienst: het bord met lijn en halte klopt, de halte-aankondiging komt op tijd.
5. Frametijd in de bus en bij een route: `window.__profile` (Electron-run, 3 afwisselende runs) moet lager of gelijk zijn.

Samen spelen: alles hier is lokaal per speler (routeberekening, minimap, bord in een bus op de eigen computer); geen snapshot, geen netwerkbericht, geen beloning of voortgang.
