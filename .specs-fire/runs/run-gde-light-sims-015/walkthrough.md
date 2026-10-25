# Walkthrough — wi-366-figuren (#366)

## Wat er is gedaan

- `game/js/companion.js`: `moveFigure` deelt een stap in genoeg sub-stappen voor de
  afgelegde afstand (bovengrens 32), zodat een lange frame niet door een dunne muur of
  hek tunnelt. Staat een figuur in het water, dan gaat hij terug naar de laatste droge
  plek; de terrain-muurregel is nu dezelfde als die van Tessa.
- `game/js/coopnet.js`: nieuwe en uitgestapte figuren en `zetBijGroep` zoeken een droge
  vrije plek (ringen, `findOpenSpawn`, `nearestRoadPoint`) of de boot. De 110 m-band is
  expliciet: binnen de groep van de gastheer geldt hij, met een eigen focus loopt een
  figuur vrij. Een mislukte terugzetting meldt niet meer dat het gelukt is.
- De figuur in de boot krijgt een vrije stoel, zodat hij voor de gastheer zichtbaar is.
- `scripts/coopfiguur_test.mjs` heeft vijf nieuwe gevallen; `multiplayer.md` noemt de
  figuurregel.

## Checks

- `node --check` op alle gewijzigde JS.
- `coopfiguur_test` 17/17, `coopgaten_test` 18/18, `coopnet_test` 36/36,
  `coopgast_test` 13/13, `coopregressie_test` 462 controles (2/4/8/16 spelers),
  `coopfoci_test` 19, `coop388_test` 9/9, `coop_scenarios_test` 9/9,
  `coophostwissel_test` 130.
- `undef_check` 1719 modules, `import_check` 1871 bestanden, `import_cycles_test` 0 cycli,
  `text_audit` 0 bevindingen.

## Review

- De boot-tak zette geen stoel, waardoor een gast in de boot onzichtbaar was; opgelost.
- Bij geen droge plek én geen boot meldde de band alsnog "Je staat weer bij de groep";
  de melding komt nu alleen als het echt lukte.
- Nits die blijven: de test met het 10 m-huis bewijst de substapwijziging niet (in het
  spel is `dt` op 0,05 s begrensd), en de join-plek zonder `coopVrij`/de laatste
  terugval zijn niet gevalideerd. Dat staat als bekend punt in de code.

## Niet getest

- De Electron-testbank `figuren` en `uitelkaar`, en de figuren in beeld.
- Hostwissel, late join en de boot op de echte kaart.
- `scripts/coop/vrijdag_test.mjs` heeft een bestaande breuk buiten deze wijziging
  (regel 61, "een gast ziet dat de ander in een opdracht zit"); niet aangeraakt.

## Open / volgende

- De treinrol (conducteur/passagier) is de laatste grote coöp-SIM-stap.
