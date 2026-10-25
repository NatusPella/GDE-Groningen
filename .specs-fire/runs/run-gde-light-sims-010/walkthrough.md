# Walkthrough — wi-492-trein-passagiers (#492)

## Wat er is gedaan

- `game/js/machinistrules.js` telt per halte deterministisch in- en uitstappers uit de
  perrondrukte (1-8 wachtenden) en de capaciteit (90). Op de laatste halte van de dienst
  stapt niemand meer in; het aantal aan boord is nooit negatief en nooit boven de
  capaciteit. Een kaartje is €0,70 per meegereden reiziger per halte.
- `stepService` boekt per gehaalde halte het kaartgeld; `finish` en `payFor` nemen het mee
  en de uitbetaling blijft via `loopbaanVerdien('trein', …)` lopen. Gemiste halten tellen
  niet mee.
- `game/js/machinist.js` toont op het bord het aantal reizigers en per stop de in- en
  uitstappers; de uitbetaaltekst noemt het aantal reizigers.
- `scripts/machinist_test.mjs` heeft een nieuwe sectie met determinisme, grenzen, een
  synthetische dienst, 0 reizigers, `payFor` en de bordvelden.

## Checks

- `node --check` op alle gewijzigde JS.
- `machinist_test` ok (met `GDE_PROVINCE_SRC` naar de province-cache van de hoofdrepo;
  deze worktree heeft geen `data/cache/province`), `simdienst_test` ok,
  `treincabine_test` 46/46, `gasttrein_test` 20/20.
- `undef_check` 1715 modules, `import_check` 1867 bestanden, `import_cycles_test` 0 cycli,
  `text_audit` 0 bevindingen.

## Review

- Op de laatste halte stapten nog reizigers in die nooit meerreden; daar stopt het nu.
- Het kaartgeld duwde de dienst 11-12% boven de oude band; het tarief is naar €0,70.
- Het zaad bevatte de planindex, waardoor dezelfde fysieke halte op een andere plek in de
  dienst een andere drukte kreeg; het zaad komt nu alleen uit de halte.
- Nits die blijven: de capaciteit bindt in de praktijk nooit (1-8 wachtenden per halte);
  `reizigers` betekent op de dienst "nu aan boord" en in de uitslag "totaal ingestapt";
  de perrondrukte is een eigen regel naast de bestaande `perronDrukte` van het station.

## Niet getest

- Het bord en de uitbetaaltekst in een echte browser of Electron: alleen via `boardView`
  en de tekst getest, niet met eigen ogen gezien.
- Een echte rit met reizigers: de dienst is synthetisch gereden; geen playtest.
- Een gemiste halte en een tweede dienst zijn met de hand nagerekend maar niet in een
  vaste test vastgelegd.

## Open / volgende

- Blokseinen en een vast dienstrooster zijn de volgende treinlaag; rangeerwerk blijft een
  missie, geen systeem.
