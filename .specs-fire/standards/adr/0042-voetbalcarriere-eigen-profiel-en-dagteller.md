# 0042 - Voetbalcarrière: eigen profiel, eigen dagteller, geen twintigste vak

- **Status:** voorgesteld
- **Datum:** 2026-11-21
- **Spec:** `docs/VOETBAL-CARRIERE-21-11.md` (hoofdstukken 3, 9 en 12), straks `.specs-fire/standards/mechanica.md`
- **Verwant:** epic #1106, #981, #429, ADR 0024, constitutie punt 3 in AGENTS.md

## Context

De voetbalsim wordt een carrière met meerdere seizoenen (epic #1106). Drie keuzes zijn duur om terug te draaien en iemand gaat ze opnieuw voorstellen: waar de tijd van de carrière vandaan komt, waar de voortgang staat en waar het in het menu en in de loopbaanregels hoort.

## Besluit

1. **Eigen dagteller.** De carrière telt nachten (`voetbaldag`) op het nachtsignaal van `calendarday.js`, los van de verhaaldatum. Salaris en ervaring volgen rondes, niet nachten.
2. **Eigen profiel per speler** in `gde-voetbalcarriere-v1`, nooit in een savegame (zoals `gde-loopbaan-v1`). `gde-voetbal-v1` blijft voor voorkeuren en de vriendschappelijke competitie.
3. **Geen twintigste vak.** De carrière is een eigen systeem met één kaart in het Loopbanen-overzicht en een kindscherm Voetbal (`CHILD`); clubbezit hoort onder Bezit.

## Afgewezen

- **De kalender van `calendar.js` als klok:** de datum is vastgehouden aan de verhaalstap en de zon blijft zomer na dag 40 (constitutie 3); seizoenen over meerdere jaren zouden de kalender breken of winter nodig hebben.
- **Alles in `gde-voetbal-v1`:** per apparaat, niet per speler; een gast kan zijn carrière dan niet meenemen (#429).
- **Voetbal als twintigste vak:** verandert De Duizendpoot, de tellers en de Steam-teksten voor weinig winst; de loonfactor past niet bij een contract.
- **Een savegame-veld:** een levenslang profiel hoort niet in een savegame (spec mechanica, regel 5).
- **Salaris per nacht:** slapen en tijd verspringen zouden geld opleveren.

## Gevolgen

- Pakket 2 begint met een onderzoek van het nachtsignaal en een kleine haak.
- `spec_check --write` voor de tellers van prestaties en sleutels bij het bouwen; `storagekeys.js` krijgt één sleutel.
- Samen spelen: de agenda is per speler; gezamenlijke tijdkeuzes veranderen alleen de wereldklok.

## Aanvulling 21-11 (besluiten van de eigenaar)

- **Rollen:** Speler, later Trainer en Manager, als aparte fasen met eigen schermen. Tammo en Tessa zijn allebei speelbaar (Tessa de ster); de ander is teamgenoot en regelt de papieren. De carrière gebruikt de Tessa-wisselhaak niet.
- **Velden:** geen tweede stadion; de echte sportparken uit de kaartdata zijn de locaties van de lagere klassen (281 parken, 141 plaatsen; `scripts/world/voetbalvelden_audit.mjs`), de top speelt in de Euroborg.
- **Namen en sponsors:** parodienamen (ADR 0043); sponsors zijn parodiebedrijven op echte panden die ook Bezit-panden zijn.
- **Blessures:** blijven, zonder beeld en uit te zetten.
