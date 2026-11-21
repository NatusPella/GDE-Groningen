# Fixes 22-11: gameplay en UI-bevindingen

Branch `fix-gameplay-22-11`, bron: `docs/reviews/CODE-REVIEW-22-11-gameplay.md` en `CODE-REVIEW-22-11-ds3-ui.md` (branches `review-gameplay-22-11`, `review-ds3-ui-22-11`). Alleen pure node-tests gedraaid; niets in Electron of beeld bekeken (nog niet bekeken).

## Bevinding naar commit

| Bevinding | Oplossing | Test |
|---|---|---|
| gameplay 1: vergunningen verlengen met een vast saldo (`snackvan.js` settleDays) | na elke dag gaat de uitgave aan vergunningen van het saldo af | `scripts/snackreviewfix_test.mjs` |
| gameplay 4: `schenkMobiel` als geldbron | cadeauwagen krijgt `gift: true` (bewaard in `bezit.js`), `sellMobile` geeft 0 | idem |
| gameplay 5: bod van Usmem na vervallen vergunning | `answerEvent` geeft `onbekend` en laat het aanbod staan | idem |
| ui 3: `loopbaanstart_test` rood op V1/V2 | zie hieronder: niet de test maar `passedBetweenSteps` was fout | `scripts/loopbaanstart_test.mjs` (ongewijzigd, nu groen) |
| ui 1: `ds3_dekkinglijst_test` rood | `--write` (alleen het blok in `docs/DESIGN-AUDIT-UI-21-11.md`) | `scripts/ds3_dekkinglijst_test.mjs` |
| ui 4: `hud_kleuren_test` verouderde mg-stand-check | al opgelost op `origin/main` (c052583d4, 67bda8332): de test controleert `standTabel(`; draait groen | `scripts/hud_kleuren_test.mjs` |

De commits staan op de branch (`git log origin/main..fix-gameplay-22-11`).

### Over ui 3 (V1/V2)

De uitkomst `[A1, A2, V1, V2]` voor een save bij T4 was geen bedoelde keuze maar een bijeffect: `passedBetweenSteps` zocht de volgende stap in `oldSteps` (zonder de later toegevoegde stappen) maar liep daarna met die index door `STEPS` (met de toegevoegde stappen). Daardoor schoof de index en telde V1 en V2 mee, V3 niet. In de oude volgorde (T4 volgt direct op M19) staat een save bij T4 vóór V1 tot en met V3, dus de bedoelde uitkomst is `[A1, A2]` met V1 als volgende stap: dat is wat de test al zei. Daarom is de code aangepast (`storyarc.js`) en niet de test, die blijft zoals hij was. Wil de verhaal-eigenaar toch dat V1 en V2 voor T4-saves als gedaan gelden, dan is dat een nieuw besluit met een nieuwe verwachting.

## Eigenaarsbesluit nodig (niet aangepast)

- **Nit 2: oude save opent snackwagen en voetbalcarrière meteen** (`unlockgate.js:124-128`, `:81`, `bezitgate.js:13-15`). `migrateGate` laat alles open dat in een pre-poort-save "al open" was, ook `snackwagen` (akte 5) en `voetbal` (akte 4). Voorstel van de review: alleen werelden van vóór de poort laten openstaan. Spoiler- en balansvraag, geen dataverlies.
- **Nit 3: oude save bij de opening krijgt een dichte poort** (`story.js:309`). Een save zonder `state.gate` bij M00 zonder gedane stappen is niet te onderscheiden van een nieuw spel. Voorstel: vlag `state.legacy` in `applySave`. Raakt geld en voortgang niet.
