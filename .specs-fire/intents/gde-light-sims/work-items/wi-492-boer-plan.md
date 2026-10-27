# #492 Boerderij: teeltplan per perceel en een vijfde gewas

- **Issue:** #492
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** wi-492-boer-contracten

## Acceptatie

De boerderij krijgt een teeltplan per perceel en een vijfde gewas, zonder nieuwe machines.

- `boerderij.js` houdt per perceel een `plan` (het gewas voor het volgende zaaien);
  `kiesGewas` werkt op het actieve perceel en overschrijft een ander perceel niet.
  Oude opslag met alleen `keuze` migreert naar het actieve perceel; `normaliseer` blijft
  stabiel en er komt geen nieuwe opslagsleutel.
- Een vijfde gewas (bijv. uien of koolzaad) staat in `GEWASSEN`, `PRIJS_KG` en de
  markt; het gebruikt een bestaande vorm (`struik`/`kegel`/`halm`) en werkt op akkers.
  Geen nieuwe 3D-modellen of machines.
- Het Gewas-tabblad toont per perceel het gekozen plan en de prijs; wisselen van perceel
  laat het plan van het andere perceel staan.
- Tests: `boerderij_test`, `gewasmarkt_test`, `percelen_test`, `boerderijui_percelen_test`
  en een migratietest; alle bestaande boerderijtests groen.

## Samen spelen

J. Host en gast hebben elk hun eigen plan en hun eigen `b.uren`; de gast levert in zijn
eigen spel. Geen gedeelde kas, geen netwerkbericht, geen nieuwe opslag.

## Niet

Geen extra machines, geen AI-personeel, geen vee, geen nieuwe gewasvorm, geen wijziging
aan de contracten of de marktlogica buiten de nieuwe gewasregel.
