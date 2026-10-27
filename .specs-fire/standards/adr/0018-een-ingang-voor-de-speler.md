# 0018 - Eén ingang voor de speler, met een poort op de singleton

- **Status:** besloten
- **Datum:** 2026-10-26
- **Spec:** `.specs-fire/standards/multiplayer.md`

## Context

De visie zegt dat iedereen lokaal de hoofdpersoon is en dat wie het spel opende
geen baas is, maar de code leest `world.player` rechtstreeks: 1239 keer in 221
bestanden op 26-10 (waarvan 712 met de letterlijke spelling; het issue telde op
25-10 696). Elke nieuwe missie, bijbaan of minigame moet daarom met de hand een
"Samen spelen"-regel krijgen. Dat is een compensatie voor een ontbrekende
ingang, geen oplossing, en de teller groeit elke maand.

## Besluit

Er komt één leesbare ingang, `game/js/players.js`, met vijf vragen:
`hoofdspeler(world)`, `isGast(world)`, `medespelers(world)`, `elkeSpeler(world)`
en `spelerMetId(world, id)`. De module houdt geen eigen staat: de lijst blijft
`world.players` uit `spelersregister.js`, het lobbyroster blijft in
`coopplayers.js`, en `world.player` blijft de opslag van het eigen lichaam.
Nieuwe code leest de speler via de ingang.

`scripts/player_singleton_audit.mjs` telt per bestand de directe verwijzingen
(`world.player`, `w.player`, een alias van de wereld) en vergelijkt ze met
`scripts/player_singleton_baseline.json`. Groei of een nieuw bestand is een
fout in de lichte fase en in de CI-runner; een daling werk je bij met
`--update`. De rest van de 1198 plekken gaat in begrensde stappen naar de
ingang, niet in één keer.

## Afgewezen

- **Big-bang: alle 1239 plekken in één keer.** Onreviewbaar, raakt overal de
  host/gast-splitsing en botst met de sessies die tegelijk in dezelfde bestanden
  werken. Een fout is dan niet meer te herleiden.
- **Een tweede spelerslijst in `players.js`.** Dan krijgt het project twee
  waarheden over wie er meedoet; `spelersregister.js` bestaat juist om dat te
  voorkomen.
- **Niets doen.** De singleton groeit door en elke nieuwe functie blijft de
  handmatige regel nodig hebben; over een half jaar is de migratie duurder.

## Gevolgen

- Een nieuwe lezer van de eigen speler gebruikt `players.js`; directe
  `world.player`-leesacties mogen niet groeien en horen alleen in de opslag van
  het eigen lichaam en in de laag eronder.
- Schrijven naar `world.player` (het lichaam zelf) blijft bestaan; de poort telt
  die mee, want ook een schrijver houdt de singleton in stand.
- De "zes vragen" kunnen later versmallen tot "wat ziet een gast"; zover is het
  nog niet.
- De poort bewijst niet dat elke omgezette plek goed is: de coop-tests en de
  testbank blijven de gedragscontrole.
