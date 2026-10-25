# #492 Vliegen samen: de gast als passagier

- **Issue:** #492
- **Epic:** #492
- **Complexity:** low
- **Mode:** confirm
- **Depends on:** wi-492-vlieg-beloning

## Acceptatie

Een gast kan met de gastheer meerijden in het vliegtuig of de helikopter, zonder te
besturen.

- `coopGastGebruik` laat plek 1 (Tessa) instappen als de gastheer in een vliegtuig of
  helikopter zit en er een passagiersplek vrij is; dat is de bestaande bijrijder-weg.
- `kanUitstappen` staat uitstappen alleen toe als het toestel op de grond staat en
  vrijwel stil is; in de lucht blijft de gast aan boord. De bestaande bijrijder-uitstap
  en de plek-op-de-grond blijven werken.
- De gast bestuurt niet: `weigerReden` blijft voor vliegtuig en helikopter `vlieg`.
- `game/js/coopgast.js` (GAST_REGELS) en `docs/COOP-GAST.md` zeggen dat meerijden mag en
  besturen niet. `coopstatus.js` houdt de vliegschool op `NEE` (de lessen zijn host-only),
  maar noemt het meerijden in de tekst.
- Tests: `coopgast_test` voor `kanUitstappen` (vliegtuig op de grond en in de lucht,
  helikopter, snelheid), `coopbestuur_test` dat de bestuurdersweigering blijft, en de
  bestaande tests blijven groen.
- `node --check`, `coopgast_test`, `coopbestuur_test`, `coopstatus_test`,
  `undef_check`, `import_check`, `import_cycles_test` en `text_audit` groen.

## Samen spelen

J (de wereld van de host). De gast is passagier; de host vliegt. Geen nieuwe beloning,
geen gedeelde kas, geen netwerkbericht: de bestaande bijrijder- en snapshotwegen worden
hergebruikt.

## Niet

Geen gast als piloot, geen tweede vliegtuig, geen vracht/passagiers aan boord, geen
wijziging aan de vliegschool of de rondvlucht-beloning.
