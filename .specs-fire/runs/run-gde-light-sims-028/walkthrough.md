# Walkthrough — wi-492-trein-rooster (#492)

## Wat er is gedaan

- `game/js/dienstregeling.js`: `dienstVanRit`, `roosterVoor`, `dienstVoor`, `roostertijdOp`,
  `instapHalte` en `dienstTekst`. Het rooster komt uit de bestaande `ritten()`/`rijtijden()` en
  de bestaande vertraging; er is geen tweede rooster. Dezelfde lijn, richting en speldag geven
  altijd dezelfde dienst.
- `game/js/machinistrules.startService` neemt een `dienst` over: de halten en due-tijden komen
  uit het rooster, niet uit het instapmoment. Zonder dienst blijft de oude route exact werken.
- `game/js/machinist.js`: bij G zoekt de machinist de eerstvolgende dienst vanaf zijn halte,
  toont lijn, richting en vertrektijd op het bord en in de melding. Na de laatste trein van de
  dag rijdt hij zonder rooster verder ("Geen dienst meer vandaag").
- `CHANGELOG.md` bijgewerkt.

## Checks

- `node --check` op de drie gewijzigde JS.
- `dienstregeling_test` 85 checks, `machinist_test` ok (met `GDE_PROVINCE_SRC`),
  `simdienst_test`, `treincabine_test` 46/46, `blokseinen_test` 45 checks,
  `gasttrein_test` 20/20, `treinlayout_test` 115/115.
- `undef_check` 1734 modules, `import_check` 1887 bestanden, `import_cycles_test` 0 cycli,
  `text_audit` 0 bevindingen.

## Review

- De reviewer vond een belangrijke fout in `instapHalte` voor de terugrichting: bij `dir = -1`
  koos hij de halte die het verst achter lag (praktisch het beginpunt) in plaats van de
  dichtstbijzijnde halte achter de trein. Daardoor hoorde de getoonde vertrektijd bij een andere
  rit en viel de laatste dienst van de dag weg. Opgelost met een afstand in rijrichting en
  tests op een lange lijn in beide richtingen.
- `roostertijdOp` gaf op de perronmarkering de aankomst in plaats van het vertrek (40 s
  sprong); nu telt op de markering het vertrek. Zonder dienst geeft hij netjes `null`.
- De rooster-tak respecteert weer `limit`; de bordregel krijgt een spatie vóór "Reizigers".

## Niet getest

- De dienst en het bord in beeld (browser/Electron).
- Een gemiste dienst in een echte sessie en het laatste blok van de dag op een echte lijn.
- Een speler die midden tussen twee halten op G drukt: de eerstvolgende dienst vanaf de
  dichtstbijzijnde halte achter hem is de basis; dat gedrag is niet in een sessie nagespeeld.

## Open / volgende

- De per-groep wereldstaat voor twee gelijktijdige missies/bijbanen is het laatste grote SIM-stuk.
