# 0002 - De wereld is data: `.gdt`-tegels in plaats van `citymap.json`

- **Status:** besloten
- **Datum:** 2026-10-17 (vastgelegd 2026-10-25)
- **Spec:** `.specs-fire/standards/wereld.md`

## Context

Stad en platteland waren twee werelden met eigen code: de stad uit
`game/citymap.json` plus een Python-keten (`build_map.py`, `process_osm.py`,
`add_*.py`, `lanes.py`), het Ommeland uit een oude laag met eigen teken-,
bots- en verkeerscode. Ze liepen uit elkaar en elke verbetering moest twee keer.

## Besluit

Eén wereld, één bouwer, één tegelpad. De wereld wordt bij het bouwen gebakken in
`.gdt`-tegels: `scripts/world/pack_tiles.mjs` voor de stad (met `game/stad.json`
als handlaag) en `build_province.mjs` voor de provincie. `game/world/` is een
build-artefact en staat niet in git. Zelfde invoer moet byte-gelijke tegels geven.

## Afgewezen

- **`citymap.json` houden en de provincie ernaast.** Twee waarheden, twee
  renderers, twee soorten fouten; dat was de toestand die #90 kostte.
- **Alles procedureel genereren.** Dan verlies je de echte plekken, en juist die
  maken het spel herkenbaar.
- **De gebakken tegels in git zetten.** Honderden megabytes, en elke kaartfix
  wordt een binaire commit die niemand kan reviewen.

## Gevolgen

Vóór 3D-tests en releases is stagen verplicht (`cd desktop && npm run stage`).
Een nieuwe dataset wordt een **sectie** in de tegel (`gdt.js SECTION` plus
schrijver, lezer en test), geen nieuw bestand ernaast. Een oude wereld blijft
werken: onbekende secties worden overgeslagen.
