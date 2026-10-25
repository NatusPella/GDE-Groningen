# Walkthrough — wi-492-vlieg-samen (#492)

## Wat er is gedaan

- `game/js/coopgast.js`: `kanUitstappen` staat uitstappen uit een vliegtuig of helikopter
  alleen toe op de grond en onder 2 m/s; in de lucht nooit. `GAST_REGELS` zegt dat
  meerijden mag en besturen niet.
- `game/js/companion.js`: instappen in een vliegtuig of helikopter kan alleen op de grond
  en op dezelfde hoogte; de automatische meereis-weg geldt nu ook voor een vliegtuig.
- `game/js/coopstatus.js`: de vliegschool blijft `NEE`, maar de kaarttekst en de
  waarschuwing vóór de start noemen het meerijden echt (de toelichting wordt nu aan de
  tekst toegevoegd).
- `docs/COOP-GAST.md` bijgewerkt.

## Checks

- `node --check` op alle gewijzigde JS.
- `coopgast_test` 13/13, `coopbestuur_test` 23 groepen, `coopstatus_test` 11 groepen,
  `coopnet_test` 36/36, `coop388_test` 9/9, `coopcheck434_test` 18, `coop388_test` 9/9.
- `undef_check` 1721 modules, `import_check` 1873 bestanden, `import_cycles_test` 0 cycli,
  `text_audit` 0 bevindingen.

## Review

- De toelichting over meerijden stond alleen in de data; de kaarttekst en de startwaarschuwing
  nemen hem nu op.
- Instappen in een vliegend toestel was nog mogelijk via de bijrijder-weg; de grond- en
  hoogtecheck geldt nu voor vliegtuig én helikopter, en de automatische meereis-weg is
  ook dichtgezet.
- Een verkeerde "stap uit als het voertuig stilstaat"-melding in de lucht is nu "eerst
  landen".

## Niet getest

- Het instappen en de vlucht in beeld (geen browser/Electron).
- De vliegschool-les met een passagier aan boord en de positie bij het uitstappen op een
  helidek of baan.
- De derde/vierde speler in een vliegtuig: die hebben volgens het register geen plek.

## Open / volgende

- De treinpassagier is de volgende en laatste grote coöp-SIM-stap; daarna de conducteur
  en de eigen beloning per crewlid.
