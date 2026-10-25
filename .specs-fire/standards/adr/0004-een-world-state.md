# 0004 - Eén `World`-stateobject en één updatevolgorde

- **Status:** besloten
- **Datum:** 2026-10-20 (vastgelegd 2026-10-25)
- **Spec:** `.specs-fire/standards/system-architecture.md`

## Context

Honderden modules delen toestand: de speler, voertuigen, voetgangers, politie,
wanted, geld, missies, het weer. Elke module die zijn eigen globale variabele
bijhoudt, maakt de volgorde per frame onvoorspelbaar — en dus elke bug een
reproductieprobleem.

## Besluit

`World` (`game/js/world.js`) is het enige mutabele stateobject. Elk systeem bezit
zijn eigen arrays en velden en leest de rest. `frame()` in `main.js` heeft één
vaste volgorde: populatie, speler, verkeer, politie en botsingen, combat en peds,
missies en verhaal, audio en weer, dan HUD en `input.endFrame()`.

## Afgewezen

- **Globale variabelen per module.** Dan is er geen enkele plek waar de toestand
  staat en is elke save een verzameling uitzonderingen.
- **Een events-bus met onbepaalde aflevering.** Lost de koppeling op maar maakt de
  volgorde impliciet; precies wat we niet willen.
- **Een ECS.** Een grote verbouwing van 900 modules voor een probleem dat we niet
  hebben: de wereld is één speler met een paar honderd objecten.

## Gevolgen

Een nieuw systeem krijgt een plek in de volgorde en een eigen veld op `World`, en
importcycli blijven verboden (grens 0, `import_cycles_test`). Wie iets nodig heeft
wat een ander systeem bezit, leest het veld en schrijft het niet.
