# 0033 - De trailer-montage blijft C00.1, met performance-vangnet

- **Status:** besloten
- **Datum:** 2026-11-11
- **Spec:** [verhaal.md](../verhaal.md), `docs/verhaal/README.md`
- **Vervangt:** [0032](0032-opening-terug-naar-gescripte-scene.md)
- **Gerelateerd:** #717, #738, #804

## Context

De eigenaar wil niet inleveren op verhaal én niet op performance. De opgenomen
trailer-montage (#738) is onderdeel van het verhaal (C00.1) en moet dus blijven.
De montage springt langs een tiental plekken; elke sprong bouwt een wijk op en
linkt shaders, wat vóór de shaderlink-fix (#804) frames van seconden gaf.

## Besluit

De standaardopening speelt weer de **trailer-montage** als C00.1, met drie
performance-maten eromheen:

1. tijdens het laadscherm worden de montagetegels geladen en vastgehouden, de
   gebouwen voorgebouwd en de vaste opening-assets één keer gecompileerd;
2. tijdens de montage staat de **lean-stand** aan: fijn straatmeubilair,
   landleven, perronpubliek, evenementen, werven en de parkeerlaag blijven weg
   tot de film klaar is (verhaalcontent en hoofdbeeld blijven);
3. de shaderlink-guard blokkeert niet meer op het linken (#804), zodat een
   eerste gebruik nooit meer een seconde freeze geeft.

## Gevolgen

- C00.1 blijft de ingesproken trailer-montage; de gescripte acts (keuken,
  verhuisdag) volgen daarna zoals voorheen.
- De laadtijd wordt langer (voorrijden van de montage); de eigenaar koos
  eerder al voor een langer laadscherm boven een haperende eerste minuut.
- De montage-API blijft bestaan en wordt door story.js gebruikt.

## Afgewezen

- **Alleen de gescripte opening (0032):** kost de opgenomen montage en daarmee
  verhaalcontent; de eigenaar wil die niet inleveren.
- **Montage zonder maatregelen:** gemeten meerdere frames van seconden.
- **Alleen op de prewarm hopen:** de montage bezoekt te veel wijken voor één
  laadscherm; daarom ook lean-stand en de niet-blokkerende linkguard.
