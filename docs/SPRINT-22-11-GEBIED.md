# Sprint 22-11, gebied verhaal: schrijfkwaliteit (branch sprint-verhaal-kwaliteit-22-11)

Dit document hoort bij één gebied van de sprintdag van 22-11: het verhaal, de schrijfkwaliteit van akte 1 tot en met 5. Details en alle kandidaten: [verhaal/SPRINT-HUMOR-22-11.md](verhaal/SPRINT-HUMOR-22-11.md).

## Voor en na

| | Voor | Na |
|---|---|---|
| Beats met een humorlabel in `script.json` | 106 | 131 |
| Herschreven regels (25 beats HS-01 tot HS-25) | vlak: bevestigingen van Tammo, uitleg van Jelle, slotregels zonder pointe | 22 nieuwe winnaars (droog 13, absurd 6, warm 3), 3 keer blijft het bestaande staan |
| Callbacks | oogcontact, nummer 4140 en het colbert stonden los van hun aanleiding | het schaap in M14.2, het Loket in M02.5 en het colbert in M04.1 verwijzen terug |
| Jelle | uitleg van het contract | de bureaucratie is de grap ("Een nederlaag is een bijlage."); een zaadje voor zijn bekering bij het bushokje en in Oma's keuken |
| Ingesproken regels die nu tekst-alleen zijn | 551 | 569 (18 meer, in `scripts/voice_wacht.json` voor de eerstvolgende TTS-ronde) |

## Tests

`humor_test` 1379/1379, `storydata_test`, `verhaal_onthulling_test` 26/26, `cutscene_lint --strict` 0 blokkerend, `voice_coverage --quiet` 3457/3457, `dialogue_rhythm_test` zonder nieuwe uitzonderingen, `introduction_test`, `story_spine_test`, `storybridge_test`, `storyclarity_test`, `gronings_spoken_test`, `dialect_woorden_test`.

## Wat in beeld bekeken moet worden (niet gezien)

De regels zijn alleen als tekst getoetst, nooit gehoord of in de cutscene gezien. Bekijk:

- Of de nieuwe slotregels (HS-05, 09, 19, 20, 21, 22, 23) in de cutscene hun pointe halen en of de camera niet te vroeg wegsnijdt.
- De Jelle-regels (HS-03, 13, 14, 16, 17, 18) op leessnelheid van de ondertitel: sommige zijn 13 tot 15 woorden.
- HS-08 (de colonne op de Grote Markt) en HS-25 (Oma's keuken): de twee emotionele ankers; kloppen toon en beeld?
- Het paneel was geen onafhankelijke beoordeling (één model speelde drie rollen): zie de veto-lijst in het humordocument.
