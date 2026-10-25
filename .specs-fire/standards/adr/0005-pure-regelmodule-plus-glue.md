# 0005 - Rekenregels in een pure module, de rest in de glue

- **Status:** besloten
- **Datum:** 2026-10-21 (vastgelegd 2026-10-25)
- **Spec:** `.specs-fire/standards/coding-standards.md` en `mechanica.md`

## Context

De minigames en systemen (discgolf, karten, boerderij, vliegschool, padel,
hengelen) hadden hun regels en hun getallen in het bestand dat ook tekende en
invoer las. Daardoor kon je een regel alleen testen door het spel te starten, en
stond hetzelfde getal op twee plekken.

## Besluit

Elke rekenregel staat in een pure module zonder THREE, DOM of klok, met een eigen
`scripts/<onderwerp>_test.mjs`: `discgolfrules.js`, `kartrace.js`,
`boerderij.js`, `vliegschoolrules.js`, `machines.js`. De glue ernaast
(`discgolf.js`, `boerderijwereld.js`) tekent en voedt.

## Afgewezen

- **Alles testen in een headless browser.** Traag (de lichte fase is al 17
  minuten), en een test die een scherm nodig heeft, test het scherm en niet de
  regel.
- **De regels in de glue laten.** Dan is er geen test die een getal bewaakt, en
  verschuift een medaille of een prijs zonder dat iemand het merkt.

## Gevolgen

Getallen staan in de regelmodule; de UI en de glue lezen ze en kopiëren ze nooit.
Een nieuw systeem zonder pure module is een review-bevinding. De norm staat in
`coding-standards.md` en `testing-standards.md`.
