# Walkthrough — wi-492-laad (#492)

## Wat er is gedaan

- `game/js/cooploadrules.js` (nieuw, zonder imports) legt de volgorde één keer vast:
  `runCoopLoad(world, n, { stop, save, load })` stopt de sessie, bewaart de huidige
  voortgang en laadt dan pas. Elke fouttak (stoppen, bewaren, laden) stopt daar en geeft
  een `reason`; zonder sessie gebeurt er niets. `coopLoadTekst` geeft de host- of
  gastuitleg, `COOP_LOAD_FAIL` de bijbehorende meldingen.
- `game/js/saveslotsui.js`: een ander opgeslagen spel kiezen in een sessie opent een
  bevestiging. Die hangt niet meer in het kaartje (waar de knop buiten beeld viel) maar
  als `.ssl-modal` over het hele paneel, met een eigen vak dat scrolt als het niet past.
  Bij bevestigen draait `runCoopLoad`; bij een fout sluit de vraag, komt de melding in
  beeld en wordt de kaart opnieuw getekend. Een gast mag zijn eigen actieve save kiezen
  (dat is de weg om de sessie te verlaten); bij de host blijft "Huidig spel" dicht.
- `game/js/pausemenu.js`: "Laatste spel laden" toont in een sessie hetzelfde
  bevestigingsblok (eigen tekst voor het laatste spel, veilige keuze op focus) en
  gebruikt daarna `runCoopLoad(world, currentSlot(), ...)`.
- `game/js/savegame.js`: de oude `COOP_LADEN_TEKST` is weg; `applySave`/`loadSlot`
  blijven weigeren zolang `world.coopNet` bestaat, dus de sessie moet echt eerst stoppen.
- `scripts/coopladen_test.mjs`: echte unit-tests op de volgorde en elke fouttak, plus
  bronchecks op het paneel, de pauzemenu en de teksten (35 checks).

## Checks

- `node --check` op alle gewijzigde JS.
- `coopladen_test` 35/35, `spelmenu_test` 244/244, `coopcore_test` 10/10,
  `coopnet_test` 36/36, `coopgast_test` 12/12, `coopregressie_test` 462 controles
  (2/4/8/16 spelers), `undef_check` 1709 modules, `import_check` 1861 bestanden,
  `import_cycles_test` 0 cycli, `lazy_modules_test` ok, `selfref_tdz_test` ok,
  `text_audit` 0 bevindingen.
- De reviewer vond geen blokkerende of belangrijke punten; de vier nits (achterblijvend
  bevestigingsblok, "een ander spel" bij "Laatste spel laden", focus op de gevaarlijke
  knop, `aria-modal` zonder focusval) zijn gefixt.

## Niet getest

- De bevestiging in beeld op een echte sessie: plaatsing, focus, Escape, Tab en
  muis/touch op smalle en brede schermen. Deze worktree heeft geen gestagede wereld;
  dat staat als "nog niet bekeken" op #492.
- De gast-save direct na `stopCoopNet` in een echte sessie: de unit-test gebruikt
  nep-functies voor `save` en `load`.

## Open / volgende

- `wi-492-samen`: naadloos in/uit, starten vanaf de kaart en 1+1=3. Dat is groter werk
  en raakt het netwerk.
