# Samen spelen: meetnotitie voor de verbindingsniveaus (24-11)

De niveaus Goed, Matig, Slecht en Weg staan als constanten in `game/js/samensignaal.js` (`MATIG_MS` 150, `SLECHT_MS` 350). Ze zijn **voorlopig** en niet gemeten met een echte sessie over internet: er is alleen op code gekeken. `verbinding` 'lag' (0,6 s zonder bericht, `LAG_AFTER` in `net/session.js`) telt al als Slecht, 'lost' als Weg.

Te meten voor ze definitief zijn (twee computers op verschillende netwerken, minstens tien minuten, per speler de `rtt` uit `coopnet.js`): de verdeling van de reactietijd bij een goede verbinding (verwacht onder 100 ms), bij wifi op afstand en bij een mobiele hotspot; en bij welke waarde spelers het beeld van een medespeler als schokkerig ervaren (PvP-interpolatie is 120 ms, 60 ms bij een gevecht). Pas dan de constanten aan en de test `scripts/samensignaal_test.mjs` volgt vanzelf de grenzen.
