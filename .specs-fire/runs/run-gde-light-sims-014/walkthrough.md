# Walkthrough — wi-492-boer-contracten (#492)

## Wat er is gedaan

- `game/js/boerderijcontracten.js` (nieuw, puur): per speldag een deterministisch aanbod
  per gewas, maximaal drie actieve contracten, deellevering telt in kg, afronden betaalt
  de bonus één keer, verlopen kost niets, en de historie is begrensd. Geen klok, opslag,
  DOM of random.
- `game/js/boerderij.js` bewaart het aanbod, de actieve contracten en de historie in de
  bestaande boerderijstand; `normaliseer` geeft oude of kapotte opslag een geldige lege
  stand. Geen nieuwe opslagsleutel.
- `game/js/boerderijlive.js`: een vers zaad wordt bewaard, bij de tijdstik komt een nieuw
  dagaanbod en verlopen contracten (melding, geen geld), en de bonus gaat via
  `loopbaanVerdien('landbouw', …)` met `deel: false` en in het kasboek. De loonwerker en
  de aanhanger tellen mee.
- `game/js/boerderijui.js`: een Contracten-blok in het Gewas-tabblad met aanbod, Aannemen,
  voortgang in kg en de bonus. Een gast ziet de leverknop van de loonwerker niet: hij
  levert in zijn eigen spel.
- `CHANGELOG.md` en `.specs-fire/standards/mechanica.md` bijgewerkt.

## Checks

- `node --check` op alle gewijzigde JS.
- `boerderijcontracten_test` 16/16, `boerderij_test` 27/27, `boerderijui_machines_test`
  5/5, `boerderijui_percelen_test` 5/5, `boerderijwereld_test` 8/8,
  `boerderijgast_test` 5/5, `gewasmarkt_test` 10/10, `percelen_test` 25/25,
  `machines_test` 13/13, `werktuigen_test` 7/7.
- `undef_check` 1719 modules, `import_check` 1871 bestanden, `import_cycles_test` 0 cycli,
  `text_audit` 0 bevindingen.

## Review

- De gast zijn klok loopt met de host mee, dus zijn contracten tikken en verlopen; de
  uitleg is rechtgezet en de loonwerker-leverknop is voor een gast verborgen, zodat hij
  echt in zijn eigen spel levert.
- De bonus deelde via de standaardhaak met elke gast; nu `deel: false`.
- De melding noemde de kale bonus terwijl de speler het bedrag met loonfactor kreeg; nu
  het uitbetaalde bedrag. De bonus staat ook in het kasboek.
- Het zaad van een verse boerderij wordt nu meteen bewaard.

## Niet getest

- Het Contracten-blok in een echte browser of Electron: alleen via de nep-DOM gerenderd.
- De gast die in zijn eigen spel verkoopt, en de dagwissel in een echte sessie.
- `loonwerkAfleveren` en `leverLading` voor de kilo's zijn bronmatig gedekt, niet in een
  aparte test.
- De volledige suite en de Electron-verhaaltest.

## Open / volgende

- Teeltplan per perceel, daarna de rijdende AI-knecht.
- De treinrol is de laatste grote coöp-SIM-stap.
