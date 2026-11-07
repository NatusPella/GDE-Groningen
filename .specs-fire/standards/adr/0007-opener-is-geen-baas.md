# 0007 - Wie het spel opent is geen baas

- **Status:** besloten
- **Datum:** 2026-10-24 (vastgelegd 2026-10-25)
- **Spec:** `.specs-fire/standards/multiplayer.md`

## Context

Samen spelen begon als een klassieke host-client: de host bezat de wereld en
daarmee ook de tijd, het pauzemenu, het overslaan van een filmpje en het stopzetten
van de sessie. In de praktijk betekent dat één speler het tempo van vier bepaalt,
en dat is niet het spel dat we willen: het is één wereld, niet iemands wereld.

## Besluit

Iedereen is gelijkwaardig. Wie het spel opende draait de wereld (tijd, weer,
verkeer, politie, opdrachten), maar tijd, reizen, slapen, laden, cheats en pauzeren
zijn gezamenlijke keuzes, en de rol kan wisselen (#439). Het enige extra recht is
spelers uit de eigen sessie verwijderen (kicken) en de wachtkamer beheren.

## Afgewezen

- **De klassieke host met rechten.** Eén speler kan een ander laten wachten of een
  filmpje overslaan; dat is precies de klacht die #439 oploste.
- **Een dedicated server.** Kosten, accounts en een beheerlast; het spel is
  peer-to-peer en heeft geen persistente wereld nodig.
- **Iedereen zijn eigen wereld.** Dan is het geen samen spelen meer maar vier
  spelers naast elkaar.

## Gevolgen

Elke nieuwe missie, bijbaan of minigame krijgt een regel over Samen spelen: doet
een gast mee, wat ziet hij, wie krijgt de beloning en de voortgang, en welke test
dekt het. Overdracht is een echt protocol met een terugvalkamer. De UI noemt
nooit "host"; ze zegt "de ander" of de naam van de speler.

## Aanvulling 7-11-2026 (#642): starten en stoppen gezamenlijk, film als uitzondering

- **Starten en iedereen stoppen zijn gezamenlijk.** Elke speler kan de wachtkamer
  starten: een gast vraagt het de opener (`vraagStart`, bericht `startverzoek`) en
  de opener opent het hek. Elke speler kan "iedereen stoppen" voorstellen
  (`vraagStop`, bericht `stopverzoek`); de opener legt het de groep voor als
  stemming met J/N, net als bij de tijd (`coopgroep.js` `STEM_SOORTEN`), en pas
  als iedereen akkoord is, stopt de sessie. Tests: `scripts/coop/groep_test.mjs`
  en `scripts/lobby_test.mjs`.
- **Een filmpje voor iedereen overslaan blijft bij de opener.** Dat is de
  uitzondering die #642 toestaat: de scène en de klok van de sessie hangen aan de
  wereld van de opener, dus overslaan is geen losse spelerkeuze maar een ingreep
  in andermans film. Een gast slaat wel zijn eigen weergave over (Space); de
  scène loopt bij de ander door. Zo staat het in `multiplayer.md` en
  `docs/COOP-GAST.md`.
