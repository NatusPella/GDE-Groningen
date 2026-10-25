# Walkthrough — wi-492-bench (#492)

## Wat er is gedaan

- Een verse start zonder save, met standaardgraphics en zonder eerder advies, meet
  ongeveer 3,5 seconden echte frames op het laadscherm. De eerste 0,5 seconde telt niet
  mee (shadercompilatie en de eerste stream-burst).
- De meetlus tekent én simulateert (`opts.render` + `opts.tick`), zodat een CPU-gebonden
  machine niet te licht wordt ingeschat.
- `presetFromSample` (puur, in `gfxprofile.js`) neemt de mediaan en kiest via
  `adviseFromSample` de best passende preset. Een sterke machine houdt Hoog; een zwakke
  zakt naar Laag/Gemiddeld/Vlot; een zichtbare machine met minder dan tien frames krijgt
  Laag.
- De keuze wordt eenmalig opgeslagen in de bestaande `gfxAdvice`-sleutel, zodat het
  latere advies niet nog eens langskomt. Een sterke meting schrijft `eerste-start:hoog`,
  geen "overgeslagen".
- Esc of Spatie slaat de meting over en schrijft `eerste-start:overgeslagen`. Een
  verborgen tab sluit de deur niet: die start zonder iets te bewaren.
- Testruns (`?storytest`, `?stil`, `?noattract`, `?autoplay`, enz.) en aangepaste
  graphics slaan de meting over.

## Checks

- `node --check` op `startscreen.js` en `gfxprofile.js`.
- `gfx_profile_test`: alle bestaande checks plus de nieuwe sample- en grensgevallen
  (17,5 / 17,6 / 22 / 22,1 / 30 / 30,1 ms, gemengde frames, precies tien frames,
  `current = null`).
- `startscreen_version_test` 3/3, `undef_check` 1705 modules, `text_audit` 0
  bevindingen.

## Niet getest

- De DOM-glue in beeld: de poort (testrun/verborgen tab/aangepaste graphics), de
  Esc/Space-listener, de timerpaden en het toepassen+opslaan van de preset. Deze
  worktree heeft geen gestagede wereld.
- De duur en de uitkomst van de meting op een echte zwakke en sterke machine.

## Open / volgende

- `wi-492-over`: nieuws, credits en versie naar het pauzemenu.
- `wi-492-hint`: eenmalige hint over Samen spelen.
- `wi-492-samen`: laden tijdens een sessie als groepsbeslissing.
- `wi-493-geld`: de geldcurve.
