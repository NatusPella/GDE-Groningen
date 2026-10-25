# Testrapport — wi-438-rest

## Wat er is gedaan
- `heistrollen.rolSlots(world, deelnemers)`: alleen de plekken die aan deze opdracht meedoen krijgen een rol; een toeschouwer (nee bij Meedoen?) of een weggevallen speler niet. Zonder deelnemerslijst telt iedereen mee, zodat solo en oude saves ongewijzigd blijven.
- `heist.js` `rolVerdeling` haalt de deelnemers van de lopende opdracht op (`coopmissie.opdrachtId` + `deelnemers`) en geeft die mee.

## Bewijs
- `heistrollen_test`: nieuwe controles voor de drie gevallen (verbonden plekken, alleen deelnemers, geen lijst) plus "één deelnemer geeft geen verdeling".
- `import_check` groen, `heist.js` en `heistrollen.js` syntax ok, `coopnet_test` 36/36.

## Open
- De kluis draait al lokaal bij de rolhouder en de host controleert; lasers blijven een E-stap. Dat is bewust zo gelaten.
- Niet in Electron met twee spelers bekeken.
