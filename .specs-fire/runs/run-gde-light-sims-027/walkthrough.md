# Walkthrough — wi-492-trein-seinen (#492)

## Wat er is gedaan

- `game/js/blokseinen.js` (nieuw, puur): blokgrenzen bij halten en om de ~900 m, vakken,
  bemonstering, treinlengte/marge, alleen het eigen spoor, en `seinBeeld`/`seinRood`
  voor het eerstvolgende sein.
- `game/js/railway.js`: levert per route de vakken en de andere treinen aan de machinist;
  de vakken worden eenmalig per route berekend.
- `game/js/machinistrules.js`: rood remt als de gescripte sein-storing, met dezelfde
  `sein-genegeerd`-straf; groen zodra het vak vrijkomt. Eén sein geeft hooguit één fout,
  ook als je heen en weer rijdt; het beeld op het moment van passeren telt.
- `game/js/machinist.js`: bord en cabine tonen rood/groen.
- `CHANGELOG.md` bijgewerkt.

## Checks

- `node --check` op alle gewijzigde JS.
- `blokseinen_test` 45 checks, `machinist_test` ok (met `GDE_PROVINCE_SRC`),
  `simdienst_test`, `treincabine_test` 46/46, `gasttrein_test` 20/20,
  `treinlayout_test` 115/115, `treinschade_test`, `train_contact/ride/smooth`.
- `undef_check` 1732 modules, `import_check` 1883 bestanden, `import_cycles_test` 0 cycli,
  `text_audit` 0 bevindingen.

## Review

- De straf keek naar het seinbeeld van de vorige frame en had geen geheugen: heen en weer
  rijden gaf twee keer straf, en een sein dat in dezelfde frame groen werd kon toch straf
  geven. Nu wordt per sein gekeken of het op het moment van passeren rood was, met een
  "al bestraft"-set.
- Nits die blijven: een rood bloksein heeft geen maximum roodtijd (een gestationeerde
  trein kan lang wachten), en de bordkoppeling is deels bronmatig getest.

## Niet getest

- Het sein in beeld: er is geen 3D-sein, alleen bord/cabine; niet in een echte sessie
  bekeken.
- Twee treinen in een echte sessie; alleen synthetisch en met een dummy-trein.
- AI-treinen remmen nog niet voor een rood bloksein van een andere AI-trein.

## Open / volgende

- De per-groep wereldstaat voor twee gelijktijdige missies/bijbanen en het treinrooster
  zijn de laatste grote SIM-stukken.
