# 0006 - Geen bundler: import map en relatieve paden

- **Status:** besloten
- **Datum:** 2026-10-18 (vastgelegd 2026-10-25)
- **Spec:** `.specs-fire/standards/system-architecture.md`

## Context

De gamecode is één graaf van ES-modules die in de browser, in Electron en via
Capacitor op Android draait. Ontwikkelen gebeurt door `game/index.html` te openen;
er is geen server en geen buildstap in dev.

## Besluit

Geen bundler. `game/index.html` laadt `game/js/main.js` als enige module, Three.js
komt via een import map, al het andere via relatieve paden. De webversie
(`web/build.mjs`) is het enige buildpad en levert three.js en de lettertypen zelf
mee.

## Afgewezen

- **Vite of webpack.** Dan heb je een buildstap in dev en twee manieren waarop een
  module kan laden; een fout in dev is dan niet dezelfde fout als in de build.
- **Eén gebundeld bestand.** Wint weinig laadtijd en maakt debuggen slechter: geen
  bestandsnaam en regelnummer meer in een stacktrace.
- **Three.js als npm-afhankelijkheid met een eigen kopie.** De import map houdt
  één versie vast en de webversie kan hem meevendoren.

## Gevolgen

Importcycli zijn verboden en worden getest (`import_cycles_test`, grens 0). Een
nieuwe afhankelijkheid is een import-map-regel plus een bestand, geen
`package.json`-wijziging in de game. De webversie moet alles meedragen wat anders
van het net kwam.
