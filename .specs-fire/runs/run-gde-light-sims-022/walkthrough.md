# Walkthrough — wi-492-boer-plan (#492)

## Wat er is gedaan

- `game/js/boerderij.js`: elk perceel heeft een eigen `plan` (volgend gewas);
  `kiesGewas` werkt op het actieve perceel, `actiefGewas`/`planVoor` lezen het plan.
  Oude opslag met alleen `keuze` migreert naar het actieve perceel; `normaliseer` blijft
  stabiel en er is geen nieuwe opslagsleutel.
- Uien als vijfde gewas: `GEWASSEN`, `PRIJS_KG`, de markt, de contracten en de afnemerplek
  in `boerderijwereld.js`. Bestaande vorm (`kegel`), geen nieuwe machine of mesh.
- `game/js/boerderijui.js`: een teeltplan-blok per perceel met het gewas, de dagprijs en
  de grondsoort; wisselen van perceel laat het andere plan staan.
- `docs/BOERDERIJ.md`, `.specs-fire/standards/mechanica.md` en `CHANGELOG.md` bijgewerkt.

## Checks

- `node --check` op alle gewijzigde JS.
- `boerderij_test` 29/29, `gewasmarkt_test` 10/10, `boerderijui_percelen_test` 6/6,
  `percelen_test` 25/25, `boerderijcontracten_test` 16/16, `boerderijwereld_test` 9/9,
  `machines_test` 13/13, `boerderijui_machines_test` 5/5, `boerderijgast_test` 5/5.
- `undef_check` 1730 modules, `import_check` 1875 bestanden, `import_cycles_test` 0 cycli,
  `text_audit` 0 bevindingen.

## Review

- De reviewer vond een blokkerende fout: uien hadden geen afnemerplek in
  `boerderijwereld.js`, waardoor een geladen aanhanger niet meer los kon en de oogst
  alleen via de loonwerker verkocht kon worden. Plek toegevoegd en een test toegevoegd
  die voor elk gewas een afnemerplek eist.
- De uienkleur in `werktuigen3d.js` viel terug op de aardappelkleur; toegevoegd.

## Niet getest

- Het teeltplan en de uien in beeld (browser/Electron).
- Migratie van een echte oude `localStorage`-save; alleen via `normaliseer` op synthetische
  opslag.
- De afleverrit met uien in de wereld; de test controleert de plek, niet de rit.

## Open / volgende

- De groepen-UI/leider en de andere SIM-units lopen nog; daarna dezelfde-soort-per-groep
  en de resterende trein/vliegstukken.
