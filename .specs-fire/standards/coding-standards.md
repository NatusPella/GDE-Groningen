# Coding standards

## Overzicht

De code is de bron van waarheid; dit bestand vat de afspraken samen die in de
omliggende code al gelden. Bij twijfel: kijk hoe de buren het doen en volg dat.

## Vormgeving

- **Formatter/linter**: geen. `node --check <bestand>` is de minimale poort.
- **Stijl**: 2 spaties, enkele quotes, puntkomma's, `const`/`let`, geen `var`.
- **Commentaar** alleen waar het iets uitlegt wat de code zelf niet zegt;
  commentaardichtheid volgt het bestand waar je in werkt.
- **Geen nieuwe npm-pakketten** in het spel; geen bundler, geen transpilatie.

## Taal

Drie talen, elk met een eigen domein (ADR [0017](adr/0017-code-in-het-engels.md)):

| Wat | Taal |
| --- | --- |
| Code: bestandsnamen, modules, functies, variabelen, constanten, comments | **Engels** |
| Wat de speler ziet of hoort | **Nederlands** (constitution, ADR 0012) |
| Proza: docs, specs, ADR's, CHANGELOG, issues, commits, testuitvoer | **Nederlands** |

Bestaande Nederlandse namen en comments blijven staan; je hernoemt ze alleen in de commit
die dat bestand toch al aanraakt. Geen massale hernoeming.

## Naamgeving

| Element | Conventie | Voorbeeld |
| --- | --- | --- |
| Bestanden | kleine letters, geen streepjes, Engels | `worldbuilder.js`, `hud_panel.js` |
| Modules | één onderwerp per bestand, default of named export | `export function updatePolice(world)` |
| Functies | werkwoord + zelfstandig naamwoord, Engels | `spawnVehicle`, `nearestFacility` |
| Variabelen | Engels, geen afkorting die niemand kent | `railRows`, `cityCover` |
| Pure modules | geen THREE, geen DOM, geen klok → direct testbaar in Node | `discgolfrules.js` |
| Glue | DOM/THREE in een apart bestand naast de pure module | `discgolf.js` naast `discgolfrules.js` |
| Opslagsleutels | `gde-<onderwerp>-v1` in `storagekeys.js` | `gde-loopbaan-v1` |

## Structuur

```
game/index.html        import map + start
game/js/               alle spellogica (ES-modules)
game/js/net/           multiplayer (protocol, hub, session, brokers)
scripts/               tests, audits, wereldbouw, QA
desktop/               Electron-schil + build/release
web/                   webversie
android/               Capacitor-schil
docs/                  afspraken en rapporten
.specs-fire/           FIRE-state en standaarden (dit bestand)
```

## Belangrijke patronen

- **`World` is de enige gedeelde state.** Elk systeem bezit de arrays en velden
  die het schrijft en leest de rest alleen.
- **Eén hoogtevraag per net**: `surfaceAt`. **Eén waterregel**: `waterlevels.js`
  (`waterPolyAt`/`waterAt`). **Eén ruimtelijke grid**: `spatialgrid.js`.
  **Eén "is de speler bezig"-poort**: `busy.js`. Gebruik die, verzin geen tweede.
- **Importcycli zijn verboden** (`scripts/import_cycles_test.mjs`, grens 0). Breek
  een cyclus met een bladmodule, een query-facade of een hook die de andere kant
  registreert — nooit met een `import()` die de cyclus verbergt zonder reden.
- **Nieuwe activiteit?** Registreer een kind in `activityhub.js` in plaats van
  regels bij te plakken in `main.js`.
- **Pure kern + glue**: rekenregels in een pure module, DOM/THREE in de glue.

## Error handling en logging

- Faalt iets onverwacht, log dan met context (`console.warn`/`console.error`) en
  houd het spel speelbaar; een enkele prop of ped mag nooit de frame-loop slopen.
- Nooit stil falen zonder spoor in de console bij ontwikkelvlaggen.
- Nooit `localStorage` van een speler overschrijven zonder migratie.

## Wat je niet doet

- Geen refactor buiten de opdracht; geen "verbeteringen" langs de weg.
- Geen `world.player`-aannames toevoegen in nieuwe code (multiplayer-regel in
  AGENTS.md): elke nieuwe missie, bijbaan of minigame krijgt een regel over
  Samen spelen.
- Geen echte merken, personen of persoonsgegevens in code, tekst of testdata.
- Geen secrets, geen `.env`, niets naar buiten sturen.
