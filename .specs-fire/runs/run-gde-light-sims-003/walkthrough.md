# Walkthrough — wi-492-over (#492)

## Wat er is gedaan

- `over.js` heeft de changelog-parser, de "nieuw sinds je vorige keer"-logica en de
  versie-boekhouding. De startschermflow (QA/trailer) en het pauzemenu gebruiken dezelfde
  loader; er is geen tweede parser meer.
- Het pauzemenu heeft een eigen **Over**-sectie in de rail, naast Instellingen en Cheats.
  De tab toont de versie, de changelog en de credits, privacy en licenties uit
  `credits.js`.
- Het openen van Over markeert de versie als gezien; de changelog blijft leesbaar, maar
  wordt niet opnieuw als "nieuw" gemarkeerd.
- De rail- en paneeltelling in `spelmenu_test` zijn bijgewerkt; de CSS heeft een
  leesbare `.pm-over`-opmaak.

## Checks

- `node --check` op `over.js`, `pausemenu.js` en `startscreen.js`.
- `spelmenu_test` 244/244, `startscreen_version_test` 3/3, `testmenu_test` 18/18,
  `devflags_test` 1047/1047, `undef_check` 1706 modules, `import_check` 1858 bestanden,
  `import_cycles_test` 0 cycli, `lazy_modules_test` ok, `selfref_tdz_test` ok,
  `text_audit` 0 bevindingen.

## Niet getest

- De tab in beeld: de rail, de lange changelog, de credits en het scrollen. Deze worktree
  heeft geen gestagede wereld.
- De fetch van `CHANGELOG.md` in de Electron-build (de startschermweg gebruikte hem al,
  dus het bestand hoort in de build).

## Open / volgende

- `wi-492-hint`: eenmalige hint over Samen spelen.
- `wi-492-samen`: laden tijdens een sessie als groepsbeslissing.
- `wi-493-geld`: de geldcurve.
