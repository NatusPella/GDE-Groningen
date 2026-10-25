# Walkthrough — wi-492-hint (#492)

## Wat er is gedaan

- `onboarding.js` heeft een vijfde les **Samen spelen**, na de eerste-missiekaart.
- De kaart zegt dat Samen spelen onder Esc zit, dat je eigen geld, spullen en loopbaan
  meegaan en dat de wereld en het verhaal van de host zijn.
- De kaart slaat missies, diensten en bestaande sessies over (`!busy(w) && !w.coopNet`).
- De kaart valt onder de bestaande `onboardingTips`-schakelaar en de bestaande
  `gde-uitleg`-opslag; geen nieuwe sleutel.
- De mechanics-spec noemt nu vijf kaarten.

## Checks

- `node --check game/js/onboarding.js`.
- `spelmenu_test` 244/244, `undef_check` 1706 modules, `text_audit` 0 bevindingen.

## Niet getest

- De kaart in beeld op een echte eerste missie: timing, grootte en of de tekst niet te
  lang is. Deze worktree heeft geen gestagede wereld.

## Open / volgende

- `wi-492-samen`: laden tijdens een sessie als groepsbeslissing.
- `wi-493-geld`: de geldcurve.
