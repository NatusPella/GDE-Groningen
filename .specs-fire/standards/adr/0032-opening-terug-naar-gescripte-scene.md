# 0032 - De standaardopening is weer de gescripte scène

- **Status:** vervangen door [0033](0033-montage-terug-met-performance-vangnet.md)
- **Datum:** 2026-11-11
- **Spec:** [verhaal.md](../verhaal.md), `docs/verhaal/README.md`
- **Vervangt:** [0025](0025-openingsmontage-als-c00-1.md)
- **Gerelateerd:** #738, #717, #804

## Context

In 0.58 (#738) werd de lange trailer-montage het eerste bedrijf van de opening (C00.1).
De montage springt langs een tiental plekken in de stad; elke sprong bouwt een wijk op en
linkt shaders. In de praktijk gaf dat meerdere frames van seconden in de eerste minuut,
juist op de machines waar de opening het eerste beeld is. De eigenaar koos op 11-11 voor
een vloeiende opening boven de montage.

## Besluit

De standaardopening speelt weer de **gescripte scène C00.1-C00.3** uit `cutscenes.js`
(straat, keuken, verhuisdag) via `playOpening` in `story.js`. De montagecode
(`playTrailerMontage` in `intromontage.js`) blijft beschikbaar voor later gebruik en
voor de trailer, maar is **niet** meer onderdeel van de automatische opening. Het
voorrijden van de montage tijdens het laadscherm en de lean-stand zijn teruggedraaid;
de cinematic-indexguards en de laadscherm-prewarm (#750/#804) blijven.

## Gevolgen

- De opening blijft bij het nieuwe thuis en heeft geen secondenlange shader-/streamingpieken.
- De ingesproken montageregels zijn niet meer automatisch te horen; ze blijven in de repo
  voor een latere replay-optie of trailer.
- Nieuwe tests bewaken dat de standaardopening de gescripte acts gebruikt en dat de
  montage-API niet per ongeluk weer wordt aangezet zonder besluit.

## Afgewezen

- **Montage automatisch laten spelen en hopen op de prewarm:** de montage bezoekt te veel
  verschillende wijken; de prewarm kan dat niet in één laadscherm vangen (gemeten
  secondenlange frames).
- **Montage helemaal verwijderen:** het is afgewerkte, ingesproken content die later
  bruikbaar blijft; alleen de standaardopening is teruggezet.
