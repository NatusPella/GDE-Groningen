# #492 Boerderij fase 1: dagprijzen voor gewassen (markt)

- **Issue:** #492
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** geen

## Acceptatie

De boerderij krijgt een markt met dagprijzen, de eerste bouwsteen van fase 1 (markt,
contracten, teeltplan, machines, AI-personeel). Deze run doet alleen de dagprijzen.

- Nieuwe pure regelmodule `game/js/gewasmarkt.js` zonder DOM, THREE, klok of opslag.
- `dagprijs(gewas, dag)` is deterministisch: dezelfde gewas + dag geeft altijd dezelfde
  prijs, begrensd rond `GEWASSEN[gewas].prijsKg` (maximaal ±20%).
- De dag komt uit de boerderijstand (`b.uren`), niet uit de muurklok of de sessie:
  `dagVan(uren) = floor(uren / 24)`.
- `leverVracht` in `boerderij.js` verkoopt tegen de dagprijs van die dag; de oude vaste
  `prijsKg` blijft de basis en de terugval.
- Een oude opgeslagen boerderij zonder marktveld krijgt gewoon de basisprijs; er komt
  geen nieuwe opslagsleutel en de save-roundtrip blijft stabiel.
- Het Gewas-tabblad in `boerderijui.js` toont per gewas de prijs van vandaag en of hij
  stijgt, daalt of gelijk blijft.
- Nieuwe test `scripts/gewasmarkt_test.mjs`: grenzen, determinisme, dagwissel (minstens
  drie van de vier gewassen anders), onbekend gewas, negatieve/rare uren.
- `boerderij_test.mjs` bijgewerkt waar hij vaste verkoopbedragen verwacht.
- `node --check`, `gewasmarkt_test`, `boerderij_test`, `boerderijui_machines_test`,
  `boerderijui_percelen_test`, `undef_check`, `import_check`, `import_cycles_test` en
  `text_audit` groen.

## Samen spelen

J (de boerderij is van de speler). Host en gast hebben allebei hun eigen boerderij in
hun eigen opslag en hun eigen `b.uren`; de dagprijs is dus per speler en nooit een
gedeelde wereldklok. Verkopen gebeurt in het eigen spel (de gast verkoopt niet in de
hostwereld; dat bestaande gat blijft). Geen gedeelde kas, geen nieuwe beloning en geen
netwerkbericht. De test bewijst dat twee boerderijen met verschillende `uren` los van
elkaar dezelfde deterministische prijs krijgen.

## Niet

Geen contracten, geen teeltplan per perceel, geen vijfde gewas, geen extra machines,
geen rijdend AI-personeel, geen prijzen in de savegame.
