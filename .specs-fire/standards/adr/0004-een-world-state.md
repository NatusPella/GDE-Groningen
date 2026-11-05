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

## Exit-criterium (#498)

`World` is geen eindeloze doos. Een veld of systeem gaat eruit als één van deze
gevallen geldt:

1. het heeft een eigen levensduur (start/stop, een scherm of een sessie) en de
   rest van de wereld hoeft het buiten die levensduur niet te kennen;
2. het wordt door meer dan drie bestanden geschreven, of de eigenaarskeuring
   (`scripts/world_eigenaar.json`) vraagt er een uitzondering met meer dan drie
   schrijvende bestanden voor;
3. het heeft geen lezer meer (wel schrijvers) en is dus dood gewicht.

In die gevallen wordt het een eigen module met een expliciete API; de velden
verhuizen mee en de keuring (`node scripts/world_eigenaar.mjs`, in de lichte
testfase) moet daarna weer groen zijn. De keuring is de grens: een nieuw veld of
een nieuwe schrijver is pas toegestaan als het register hem noemt, met reden en
issue.
