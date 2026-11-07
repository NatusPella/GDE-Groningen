# 0027 - Code in het Engels, meetbaar en met vaste uitzonderingen

- **Status:** besloten
- **Datum:** 2026-11-07
- **Spec:** `coding-standards.md` (Naamgeving), `AGENTS.md` (Code)
- **Vervangt:** [0017](0017-code-in-het-engels.md)
- **Gerelateerd:** #640, #692, ADR 0018 (Nederlandse spelers-API), ADR 0024 (`coopsolo.js`)

## Context

ADR 0017 vroeg om Engelse code en Nederlandse comments in één bestand, maar die
regel is niet meetbaar en werd nauwelijks nageleefd: nieuwe modules kregen
Nederlandse namen, comments bleven Nederlands, en de "hernoem alleen bij
aanraken"-regel leverde in de praktijk niets op. Tegelijk zijn de Nederlandse
API's van ADR 0018 en de bestandsnaam `coopsolo.js` uit ADR 0024 gewettigd.
Zonder meetbare grens blijft elke sessie dezelfde discussie voeren.

## Besluit

1. **Nieuwe code is Engels:** bestandsnamen, modules, functies, variabelen,
   constanten en comments. Geen nieuwe Nederlandse identifiers.
2. **Bestaande code blijft:** Nederlandse namen en comments van vóór dit besluit
   worden niet massaal hernoemd; ze verdwijnen alleen wanneer een bestand toch
   voor een echte wijziging open gaat, met imports/tests/docs mee.
3. **Vaste uitzonderingen:** de Nederlandse spelers-API uit ADR 0018 is
   bevroren; speltermen die de speler ziet blijven Nederlands; `ARCHITECTURE.md`
   blijft Engels als technische naslag (zie `coding-standards.md`); bestaande
   `coop`-namen blijven, maar **nieuwe** bestanden gebruiken `multiplayer`.
4. **Meetbaar:** `scripts/naamtaal_check.mjs` vergelijkt nieuwe JS-bestanden met
   `scripts/naamtaal_baseline.json`. Een nieuw bestand met een Nederlandse naam
   of een nieuwe `coop`-naam is een fout in de lichte fase; bestaande bestanden
   worden niet geblokkeerd.
5. **Geen vertaalronde:** massa-hernoemen blijft afgewezen; dit besluit is geen
   voorraad opdrachten.

## Afgewezen

- **Alles Nederlands, ook code.** Dat maakt de mix alleen maar groter en botst
  met three.js, de browser-API's en de bestaande Engelse meerderheid.
- **Alleen comments Nederlands.** Dan staat er in elk bestand alsnog twee talen
  door elkaar.
- **Massaal hernoemen.** Duizenden regels churn, elke import/test/audit mee en
  geen leesbare diff; de winst is cosmetisch.
- **Niets doen.** Dan groeit de mix door en blijft elke sessie dezelfde regel
  opnieuw bedenken.

## Gevolgen

- Nieuwe modules krijgen een Engelse naam; bestaande Nederlandse namen blijven
  staan tot ze toch open gaan.
- `coding-standards.md` en `AGENTS.md` verwijzen naar dit besluit; 0017 staat op
  "vervangen door 0027".
- `scripts/naamtaal_check.mjs` is de poort; de baseline groeit alleen met een
  bewuste uitzondering.
- `ARCHITECTURE.md` is expliciet uitgezonderd en dat staat in
  `coding-standards.md`.
