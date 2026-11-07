# 0025 - De openingsmontage is C00.1

- **Status:** besloten
- **Datum:** 2026-11-07 (#717)
- **Spec:** [verhaal.md](../verhaal.md), `docs/verhaal/README.md`
- **Raakt:** `game/js/story.js` (playOpening), `game/js/intromontage.js`, `game/js/cinematics.js`, `ARCHITECTURE.md`

## Context

De ingesproken openingsmontage van ±85 s (`intromontage.js`, op de theme gesynchroniseerd) was
onbereikbaar: `playIntroMontage` werd alleen door `replayIntro` aangeroepen en `replayIntro` had
geen enkele aanroeper. `introSeen()` werd nergens gelezen. De opening van een nieuw spel was een
drie-akterscène (`openingActs` in `cutscenes.js`) met een straatact, de keuken en de verhuisdag.
`ARCHITECTURE.md` rekende nog op de montage en de code van ±1.400 regels stond dood in de repo.
De opgenomen stem was dus weggegooid werk.

## Besluit

**De montage is het eerste bedrijf van de opening (C00.1); de straatact blijft alleen als
terugval.** In `story.js` speelt `playOpening` eerst `playTrailerMontage` (de C00.1-scène:
zonsopgang op d'Olle Grieze, fietsers, de meeuw met frikandel, de werkboot, naam- en titelkaart),
zet daarna de klok op 6.4 en speelt de twee gescripte bedrijven (keuken, verhuisdag) uit
`openingActs` met dezelfde `playScript`-weg. Lukt de montage niet (module of wereld), dan valt de
oude straatact terug, zodat de opening nooit stilvalt.

De dode API is opgeruimd: `replayIntro` en de privéfunctie `playIntro` in `cinematics.js` zijn weg
(de montage is geen losse replay meer maar de opening zelf), en de ongebruikte `introSeen`-export
in `intromontage.js` is verwijderd. `markIntroSeen` blijft als administratie van de opslagsleutel.

## Afgewezen

- **De montage opruimen.** Dan verdwijnt 85 s ingesproken opening en blijft de straatact een
  zwakkere opening; bovendien is het script (`09-script-akte1.md`) precies voor deze beelden
  geschreven.
- **De montage los in het pauzemenu als "opening opnieuw" aanbieden.** Dat is een tweede ingang
  naast de opening en lost het dode pad niet op; de opening hoort één geheel te zijn.
- **De straatact laten staan als derde bedrijf naast de montage.** Dan zie je dezelfde
  straatbeelden twee keer en wordt de opening te lang (#662).

## Gevolgen

- Nieuwe spellen beginnen met de montage; de eerste keer is de opening ±85 s langer, met de
  bestaande skip (Space) en dezelfde `openingKlaar`-weg.
- De klok gaat na de montage naar 6.4 (zonsopgang), daarna 7.3 (ochtend), zoals de C00-regels
  vragen (#738).
- `ARCHITECTURE.md`, `docs/verhaal/README.md` en deze ADR beschrijven de opening als
  montage + twee bedrijven; de straatact is expliciet de terugval, geen tweede montage.
- `intromontage.js` blijft bestaan (de montage wordt weer gebruikt), maar zonder de dode
  replay-API.
