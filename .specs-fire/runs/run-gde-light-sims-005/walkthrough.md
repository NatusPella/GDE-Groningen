# Walkthrough — wi-493-geld (#493)

## Wat er is gedaan

- Het startbudget staat nu op één plek: `START_MONEY = 500` in `economy.js`. De wereld,
  het save-herstel in `savegame.js`, de verhaaltijdlijn in `storyarc.js` en de
  NaN-herstelregel in `main.js` gebruiken die bron; de losse 250's zijn weg.
- `SPEED_FINE` is €10-25 in plaats van €20-45.
- `flitspaalrules.js` is de pure regel: marge 35 km/u, de eerste pass per camera een
  waarschuwing, daarna een boete die nooit meer is dan je saldo. Een saldo van 0 of
  minder geeft geen "boete van €0"; een te hoge of lage roll wordt geklemd.
- `flitspaal.js` is de glue: `cam.warned`, de cooldown, de waarschuwing zonder
  `noteMoney`, en de boete met `noteMoney('Boetes')`.
- `scripts/flitspaal_test.mjs` dekt de marge, de waarschuwing, de onder- en bovengrens,
  het saldo, 0/negatief geld en de roll-klem.
- `docs/ONTWIKKELEN.md` noemt €500; de changelog noemt het budget, de boete en de marge.

## Checks

- `node --check` op alle gewijzigde JS.
- `flitspaal_test` 16/16, `wanted_balance_test` ok, `save_migration_test` 1299/1299,
  `loopbaan_balans_test` 9/9, `storyclarity_test` 100/100, `storydata_test` 15145/15145,
  `undef_check` 1708 modules, `import_check` 1860 bestanden, `import_cycles_test` 0 cycli,
  `lazy_modules_test` ok, `text_audit` 0 bevindingen.
- De reviewer vond de laatste hardgecodeerde 250 in `main.js`, een ontbrekende
  `Number.isFinite`-guard, de "boete van €0" en de commentaarloze `START_MONEY`-export;
  die zijn gefixt.

## Niet getest

- De flitspaal in beeld: waarschuwing → boete, de meldingen en de marge. Deze worktree
  heeft geen gestagede wereld.
- De Electron-verhaaltest en `storyflow_nieuw_test`: `three` is hier niet gevendord
  (`cd desktop && npm run stage`). De moneytimeline-checks zijn ondergrenzen; een hoger
  startbudget kan ze alleen maar laten slagen.
- Het Samen-spelen-pad van de boete: de bestaande coöp-testbank dekt dat; deze run voegt
  geen nieuwe netwerktest toe.

## Open / volgende

- `wi-492-samen`: laden tijdens een sessie als groepsbeslissing.
- `wi-492-bench`/`over`/`hint` zijn klaar; de menuflow is op de co-op-laadregel na af.
- Een volgende geldstap (loon per klus, inkomensgroei) is nog niet gedaan.
