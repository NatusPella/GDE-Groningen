# Walkthrough — wi-492-vlieg-beloning (#492)

## Wat er is gedaan

- `game/js/luchtverkeer.js` (nieuw, puur): `departure(veld)` en `approach(veld)` geven
  deterministisch één korte Nederlandse torenregel per veld, met een veilige standaardregel
  voor een leeg of onbekend veld. `vluchtLoon` betaalt alleen een geslaagde, niet
  afgebroken vlucht en betaalt een dienst maar één keer.
- `game/js/activities.js`: de rondvlucht betaalt €18/€28/€40 bij brons/zilver/goud via
  `loopbaanVerdien('lucht', …)` met `deel: false`; een crash, afbreken of mislukken betaalt
  niets. De torenregels staan als bestaande bordrijen op het dienstbord.
- `CHANGELOG.md` noemt de beloning en de toren.

## Checks

- `node --check` op alle gewijzigde JS.
- `luchtverkeer_test` ok, `vluchtdienst_test` ok, `arcadeplane_test` ok,
  `planecontrol_test` ok, `simdienst_test` ok, `activiteitenspots_test` 15/15.
- `undef_check` 1719 modules, `import_check` 1871 bestanden, `import_cycles_test` 0 cycli,
  `text_audit` 0 bevindingen.

## Review

- De hash-index werd signed en gaf voor ongeveer de helft van de veldnamen een negatieve
  index; `>>> 0` maakt hem unsigned, met extra testvelden die dat afdekken.
- De beloning deelde via de standaardhaak het volle bedrag met elke gast, terwijl de
  vluchtdienst host-only is; `deel: false` voorkomt dat.
- De changelogregel ontbrak; toegevoegd.

## Niet getest

- De vlucht en het bord in beeld: twee extra bordrijen kunnen op smalle schermen veel
  hoogte innemen; niet in Electron of een browser gezien.
- De daadwerkelijke gast-uitbetaling in een sessie: `deel: false` is een bron- en
  gedragstest, geen echte sessie.
- Of `uniek: 'vluchtdienst'` dubbele gebiedspunten voorkomt, is niet nagekeken.

## Open / volgende

- Een tweede veld als bestemming en vracht/passagiers aan boord zijn de volgende
  vliegstappen; daarna een gast als passagier/co-piloot.
