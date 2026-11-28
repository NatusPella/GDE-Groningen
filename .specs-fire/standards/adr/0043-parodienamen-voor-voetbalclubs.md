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

## Wijziging 28-11-2026: twee verhaalclubs, ook zonder voorvoegsel

Het verhaal (bijbel 28-11, deel 01 en 02) heeft een dorpsclub en een topclub in de Euroborg nodig. De eigenaar was akkoord met een club in de Euroborg in plaats van "SC Noorderlicht" als naamvoorbeeld. **Besluit:** de regel blijft zoals hij is: geen voorvoegsel VV, SV, FC, SC of RKSV, ook niet voor verhaalclubs (de testlijst in `scripts/voetbal_verboden.mjs` blijft voor alle clubs gelden, er komt geen witte lijst). De namen zijn **De Hoekers** (de dorpsclub in Warffum, voorheen "VV De Hoek", `voetbalverhaal.js`) en **De Noorderlichters** (Kroonklasse, Euroborg, `voetbalclubs.js`, voorheen "SC Noorderlicht"). De Noorderlichters vervangen De Domtorenaars, zodat het aantal clubs 16 blijft; elke nieuwe club heeft een grap in bijlage A (A.1 en A.3b). Bij de tegenstelling tussen deel 01 (De Hoek, Albert Teuben, Eppo Rozema) en deel 02 (De Hogelander Gladiolen, Albert Bos, Meester Klaas) wint deel 01 en het namenregister (§2.4). **Afgewezen:** een witte lijst met twee clubs met voorvoegsel (breekt de regel voor een grap; en het voorvoegsel voegt in het spel niets toe).
