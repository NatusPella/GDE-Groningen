# #366 Samen spelen: de figuren van speler 3/4 blijven op een geldige plek

- **Issue:** #366
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** geen

## Acceptatie

De figuren van de derde en vierde speler lopen niet meer door gebouwen en water en dwalen
niet ver weg.

- `game/js/companion.js` `moveFigure`: de sub-stappen zijn niet meer star op 8 gecapt; een
  lange frame tunnelt niet door een dunne muur of hek. Water wordt ook geweigerd als de
  figuur er al in staat (terug naar de laatste droge plek), en de terrain-muurregel die
  Tessa gebruikt, geldt ook voor de figuren.
- `game/js/coopnet.js`: een nieuwe figuur, een figuur die uitstapt en `zetBijGroep` zoeken
  een droge/vrije plek met de bestaande `coopVrij`/`findOpenSpawn`/`nearestRoadPoint` of de
  boot, in plaats van een vaste offset of de positie van de host.
- De 110 m-band blijft werken zoals de testbank `figuren` eist (`binnen === 0`,
  `inWater === 0`, `maxD < 140`, terug bij de groep). Als de focus-regel dat in de weg
  staat, wordt de regel expliciet gemaakt en in de testbank bijgesteld; geen stille
  versoepeling.
- Tests: `scripts/coopfiguur_test.mjs` krijgt gevallen voor starten in de gracht, uitstappen
  naast de gracht, een lange frame/stap en de koppeling `stepFigures` → echte `moveFigure`.
  De bestaande testbank `figuren` blijft de acceptatie.
- `node --check`, `coopfiguur_test`, `coopgaten_test`, `coopnet_test`, `coopgast_test`,
  `coopregressie_test`, `undef_check`, `import_check`, `import_cycles_test` en
  `text_audit` groen.

## Samen spelen

J (de wereld van de host). De host simuleert de figuren; een gast ziet ze via de snapshot.
Geen beloning, geen opslag, geen netwerkprotocol. De regel geldt voor elke gast, ook wie
later aansluit of uit een voertuig stapt.

## Niet

Geen nieuwe botsingmotor, geen wijziging aan Tessa's pad of aan voetgangers, geen
netwerkbericht, geen `world.player`-aannames toevoegen.
