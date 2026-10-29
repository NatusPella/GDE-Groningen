# 0021 - Twee lagen, één afspraak: het verhaal noemt de plek, de mechanic rekent

- **Status:** besloten
- **Datum:** 2026-10-29
- **Spec:** `.specs-fire/standards/verhaal.md` (de verhaalplekken), `.specs-fire/standards/wereld.md` (de gebieden)
- **Gebied:** Deel 4, safehouses, gebieden
- **Gerelateerd:** #470, #414, #458, ADR 0015 (vervangen)

## Context

`docs/PROVINCIE-VERHAAL.md` noemt zeven plekken voor Deel 4: een kotter, een
woonschip, een boshut en vier meer. Het gebouwde systeem is iets anders: één huis
per veroverbare wijk en woonplaats in `game/js/safehuizen.js` (#414), sinds #458 in
een bestaand woonpand. ADR 0015 wilde die twee samenvoegen door elke verhaalplek
een eigen rij en `huisIdent` in dat systeem te geven. Daarmee dicteert de
verhaaltekst de mechanic: zeven beloftes die de code moet inlossen, en elke
verhuizing van een scène wordt een codewijziging. Dat is de dubbeling die #470
aan het licht bracht: twee documenten die over dezelfde vraag gaan.

## Besluit

Twee lagen, één afspraak. Elke vraag heeft één bron.

- **Deel 4 is het verhaal.** `docs/PROVINCIE-VERHAAL.md` en de scripts zeggen welke
  plek bij welke scène hoort, wie er komt, wat er gebeurt en wat een missie nodig
  heeft. Een plek daar is een **verhaalfeit**, geen systeembelofte.
- **`safehuizen.js` is de mechanic.** Dat systeem beslist waar je kunt rusten, wat
  een huis kost, wat het oplevert, wie de sleutel heeft en hoe Samen spelen ermee
  omgaat. Die regels staan in `docs/GEBIEDEN.md`.
- **Geen overlap.** Het verhaal zegt nergens dat je ergens kunt slapen, opslaan of
  snelreizen; de mechanic noemt geen missies en geen scènes.
- **De mechanic beslist of een verhaalplek een huis is.** Valt een plek samen met
  een huis uit het systeem, dan is het dezelfde deur en dezelfde rustplek. Valt hij
  ernaast, dan is de plek decor en speelt de scène er evengoed.
- **Een missie verwijst naar een plek, niet naar een rij.** Heeft een scène een bed,
  een kast of een onderduikplek nodig, dan is dat een eis aan de mechanic en een
  regel in `wereld.md` en `GEBIEDEN.md`, niet een tweede lijst in het verhaal.

## Afgewezen

- **Elke verhaalplek een eigen rij geven (ADR 0015).** De verhaaltekst wordt dan de
  bron van mechanicrijen, en dezelfde vraag heeft twee antwoorden.
- **De verhaalplekken schrappen en alleen het gebiedssysteem houden.** De scènes
  hebben die plekken nodig: de kotter op het wad, de boshut in Westerwolde.
- **Een derde lijst met verhaalveiligheden.** Derde waarheid, derde reiskaart, en
  Samen spelen moet er dan ook weer mee om leren gaan.

## Gevolgen

- §6.2 van `docs/PROVINCIE-VERHAAL.md` leest als verhaalfeiten en verwijst voor het
  rusten, de prijs en de sleutel naar `docs/GEBIEDEN.md`.
- Een nieuwe verhaalplek kost geen regel in `safehuizen.js`; een nieuwe rustplek kost
  geen scène.
- Wie later toch één lijst wil, moet eerst deze ADR vervangen.
