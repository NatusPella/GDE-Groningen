# Walkthrough — wi-492-groep-leider (#492)

## Wat er is gedaan

- `game/js/coopmissie.js`: elke groep heeft een `leider` (de starter bij een verzoek,
  anders de eerste deelnemer). `leiderVan` en `isLeider` zijn pure helpers; `zichtbaar`
  geeft de leider mee.
- `game/js/coopnet.js`: de host krijgt `coopGroepStart`, `coopGroepZet` en
  `coopGroepEind`, waarmee een groep ook buiten `world.mission` kan bestaan. De
  missiegroep (`werkGroepenBij`) raakt geen andere groep; een tweede groep houdt stap,
  doelen, deelnemers en leider.
- `.specs-fire/standards/multiplayer.md` noemt de leider en de groeps-API.

## Checks

- `node --check` op de gewijzigde JS.
- `coopmissie_test` 26/26 (twee groepen met eigen leider, stap, doelen; de missie start
  en eindigt zonder de tweede groep te raken), `coopnet_test` 36/36.
- `undef_check` 1722 modules, `import_check` 1875 bestanden, `import_cycles_test` 0 cycli,
  `text_audit` 0 bevindingen.

## Niet gedaan

- De UI: de spelerslijst en de kaart tonen de leider en de groepen nog niet.
- De startpaden: missie, bijbaan en wedstrijd gebruiken de groeps-API nog niet; de
  opener voert verzoeken nog uit.
- Twee gelijktijdige missies of twee bijbanen: dat vraagt de per-groep wereldstaat
  (stap 4 uit de recon), niet alleen deze boekhouding.
- Hostwissel: het groepenregister gaat nog niet mee in de momentopname.

## Open / volgende

1. Leider en groepen in de spelerslijst/kaart.
2. Startpaden via de groeps-API; verschillende soorten naast elkaar.
3. Daarna dezelfde soort per groep (missieketen/bijbaan/wedstrijd per groep).
