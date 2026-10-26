# #492 Groepen: leider zichtbaar en de eigen groep in de UI

- **Issue:** #492
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** wi-492-groep-leider

## Acceptatie

De speler ziet wie een groep leidt en welke groep bij hem hoort.

- `coopmissie.zichtbaar`/`leider` komt via het bestaande `missie`-bericht bij de gast
  (`coopworld.js`, `coopnet.js`); oude berichten zonder leider blijven werken.
- De spelerslijst (`coopspelers.js`/`coopspelersui.js`) toont bij de leider
  "leidt <label>" en bij de andere deelnemers hun groep; een niet-deelnemer ziet niets.
  Een groep zonder lopende activiteit bestaat niet en verschijnt dus nergens.
- De kaart/minimap (`mapview.js`, `hud_panel.js`) gebruikt de doelen van de eigen groep;
  bij meerdere groepen toont de host de groepen uit `world.coopGroepen`, een gast alleen
  zijn eigen groep. De andere groepen mogen gedempt zichtbaar zijn, maar mogen de eigen
  markering niet overschrijven.
- Tests: `coopmissie_test`, `coopspelers_test`, `coopworld_test` en een UI-broncheck;
  bestaande coop-tests blijven groen. Geen protocolbump.

## Samen spelen

J. De leider is de starter, niet de host; de host simuleert alleen. Meerdere groepen
blijven naast elkaar bestaan; de UI maakt dat zichtbaar zonder de wereldstaat te wijzigen.

## Niet

Geen tweede missieketen, geen tweede bijbaan/wedstrijd, geen hostwissel-herstel, geen
nieuwe netwerkberichten buiten het bestaande `missie`-bericht.
