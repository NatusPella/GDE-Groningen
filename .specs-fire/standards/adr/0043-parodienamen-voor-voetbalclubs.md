# 0043 - Parodienamen op echte clubs voor alle voetbalclubs

- **Status:** voorgesteld (eigenaarsbesluit 21-11-2026, vragen 3 en 5; de lijst is nog te keuren)
- **Datum:** 2026-11-21
- **Spec:** `docs/VOETBAL-CARRIERE-21-11.md` (bijlage A), straks `.specs-fire/standards/mechanica.md`
- **Verwant:** constitutie punt 2 in AGENTS.md, epic #1106, ADR 0042

## Context

De voetbalcarrière heeft clubs in drie divisies en een Europees toernooi. Constitutie 2 verbiedt echte merken, bedrijven en personen in speltekst en beeld en eist verzonnen namen voor parodieën. De eigenaar wil dat alle clubs een duidelijke knipoog naar een echte club zijn.

## Besluit

Elke club heeft een **verzonnen naam met een duidelijke knipoog** (geen directe naam, geen herkenbaar logo of wapen). De grap staat **alleen in de documentatie** (bijlage A), nooit in speltekst, beeld of code. Lokale clubs krijgen hun naam uit acht sjablonen op het plaats-id uit de kaartdata, nooit met de voorvoegsels VV, SV, FC, SC of RKSV en nooit als `<Plaats> Boys` of `<Plaats> '31`. Een test (uitbreiding van `voetbal_test`) blokkeert de echte namen in de spelgegevens.

## Afgewezen

- **Alleen losse bijnamen zonder knipoog:** veilig, maar de eigenaar wil de grap.
- **Echte clubnamen met een disclaimer:** botst met constitutie 2.
- **Een lijst echte clubnamen uit de kaartdata:** zou echte verenigingen in het spel zetten.
- **Een directe verbastering (een letter anders):** te herkenbaar en een auteursrechtrisico.

## Gevolgen

- De lijst in bijlage A moet door de tekstronde en de eigenaar worden gekeurd vóór de bouw van pakket 1 en 11.
- Shirtkleuren en patronen mogen aan een echte club doen denken maar nooit een logo, wapen of letterlijke kleurencombinatie kopiëren.
- Een nieuwe club of sjabloon komt met een grap in bijlage A.
