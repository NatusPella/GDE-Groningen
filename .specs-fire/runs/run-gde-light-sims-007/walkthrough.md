# Walkthrough — wi-492-boer-markt (#492)

## Wat er is gedaan

- `game/js/gewasmarkt.js` (nieuw, puur) geeft per gewas een dagprijs: een stabiele hash op
  gewas en speldag, binnen twintig procent van de basisprijs, op centen en nooit onder
  €0,01. Dag 0 is precies de basis; `markt()` geeft ook de trend ten opzichte van de
  vorige dag. De dag komt uit `b.uren` (`dagVan`), niet uit de muurklok.
- `game/js/boerderij.js` haalt de basisprijzen uit `PRIJS_KG` (één bron) en verkoopt in
  `leverVracht` tegen de dagprijs van de boerderij. Een onbekend gewas of een rare dag
  valt terug op de basis; er wordt niets nieuws bewaard.
- `game/js/boerderijui.js` toont in het Gewas-tabblad per gewas de prijs van vandaag en
  de trend, met één regel uitleg over de dagmarkt.
- `CHANGELOG.md`, `docs/BOERDERIJ.md` en `.specs-fire/standards/mechanica.md` bijgewerkt.

## Checks

- `node --check` op alle gewijzigde JS.
- `gewasmarkt_test` 10/10, `boerderij_test` 24/24, `boerderijui_machines_test` 5/5,
  `boerderijui_percelen_test` 5/5, `boerderijwereld_test` 8/8, `boerderijgast_test` 5/5,
  `machines_test` 13/13, `percelen_test` 25/25, `werktuigen_test` 7/7.
- `undef_check` 1715 modules, `import_check` 1867 bestanden, `import_cycles_test` 0 cycli,
  `lazy_modules_test` ok, `text_audit` 0 bevindingen.
- De reviewer vond geen blokkerende of belangrijke punten; de nits (guard op een gewas
  zonder basisprijs, de UI-belofte "verandert per speldag", de regelnummers in de spec en
  een UI-assertie voor prijs/trend) zijn gefixt.

## Niet getest

- Het Gewas-tabblad in een echte browser of Electron: alleen via de nep-DOM van de
  UI-tests gerenderd, niet met eigen ogen gezien.
- Een echte Samen-spelen-sessie met host en gast: de regel "elk zijn eigen boerderij en
  eigen dag" is met twee synthetische boerderijen getest, niet live.
- De dagwissel na 24 minuten spelen is niet live geobserveerd; de save-roundtrip is met
  synthetische objecten getest, niet met een bestaande `gde-boerderij-v1`-blob.

## Open / volgende

- Leveringscontracten (markt met opdrachten, quota en deadlines) zijn de volgende
  boerderijstap; daarna een teeltplan per perceel en pas later de rijdende AI-knecht.
