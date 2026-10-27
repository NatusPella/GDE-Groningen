# 0015 - Eén safehouse-systeem, ook voor de verhaalplekken

- **Status:** besloten
- **Datum:** 2026-10-25
- **Spec:** `.specs-fire/standards/wereld.md` (gebieden) en `multiplayer.md`

## Context

Er zijn twee beloftes over veilige plekken. `docs/GEBIEDEN.md` beschrijft het
gebouwde systeem: per wijk en woonplaats een safehouse dat je met een gebied
veroveren kunt, in `game/js/safehuizen.js` (`SAFEHUIS`, `huisVanGebied`,
`reisNaarHuis`). `docs/PROVINCIE-VERHAAL.md` belooft daarnaast zeven
verhaalveiligheden voor Deel 4 (de kotter, het woonschip van Lammert, de boshut).
Die tweede laag bestaat nog niet, en zonder besluit bouwt Deel 4 hem naast de
eerste.

## Besluit

Er is één systeem. De verhaalplekken zijn **vaste safehouses in het bestaande
systeem**: ze hebben een eigen `huisIdent`, staan op een echte plek en zijn of
altijd open (als ze bij het verhaal horen) of ze openen met het gebied waarin ze
liggen. Een missie verwijst naar zo'n huis, niet naar een eigen lijst.

## Afgewezen

- **Een tweede systeem voor Deel 4.** Twee soorten veilige plekken betekent twee
  reisroutes, twee opslagvormen en twee manieren waarop Samen spelen ermee omgaat;
  dat is precies de fout die #470 aan het licht bracht.
- **De verhaalplekken als losse objecten zonder huis.** Dan kan de speler er niet
  heen reizen en telt het niet mee voor de gebieden, terwijl het verhaal zegt dat
  het een veilige plek is.
- **Alleen het gebiedssysteem en de verhaaltekst schrappen.** Dan verliest Deel 4
  de plekken die het verhaal nodig heeft (de kotter, het woonschip, de boshut).

## Gevolgen

Een nieuwe verhaalplek is een rij in `safehuizen.js` plus een `huisIdent` in de
missie; de reiskaart en de gebieden tellen hem automatisch mee. Wie een tweede
systeem wil, moet eerst deze ADR vervangen.
