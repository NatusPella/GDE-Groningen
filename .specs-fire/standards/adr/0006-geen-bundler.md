# 0006 - Geen bundler: import map en relatieve paden

- **Status:** besloten
- **Datum:** 2026-10-18 (vastgelegd 2026-10-25)
- **Spec:** `.specs-fire/standards/system-architecture.md`

## Context

De gamecode is één graaf van ES-modules die in de browser, in Electron en via
Capacitor op Android draait. Ontwikkelen gebeurt door `game/index.html` te openen;
er is geen server en geen buildstap in dev.

## Besluit

Geen bundler. `game/index.html` laadt `game/js/main.js` als enige module. Three.js
komt in de bestaande modules via de CDN-URL (jsDelivr) en de import map is de bron
voor `three/addons/`; de build vendort één versie. `web/build.mjs` en
`desktop/build.mjs` stagen/vendoren allebei, maar er is geen bundelstap in dev.
Dev-tooling is toegestaan als controle, nooit als runtime- of dev-buildstap
(ADR 0028).

## Afgewezen

- **Vite of webpack.** Dan heb je een buildstap in dev en twee manieren waarop een
  module kan laden; een fout in dev is dan niet dezelfde fout als in de build.
- **Eén gebundeld bestand.** Wint weinig laadtijd en maakt debuggen slechter: geen
  bestandsnaam en regelnummer meer in een stacktrace.
- **Three.js als npm-afhankelijkheid met een eigen kopie.** De vendor-stap
  (`desktop/build.mjs`) houdt één versie vast en de webversie vendort die mee.

## Gevolgen

Importcycli zijn verboden en worden getest (`import_cycles_test`, grens 0). Een
nieuwe afhankelijkheid is een import-map-regel plus een bestand, geen
`package.json`-wijziging in de game. De webversie moet alles meedragen wat anders
van het net kwam. De vijf eigen statische poorten (`import_check`,
`undef_check`, `spec_check`, `dead_code`, `player_singleton_audit`) draaien in
de lichte fase; ADR 0028 legt vast dat dev-tooling controle is, geen buildstap.
