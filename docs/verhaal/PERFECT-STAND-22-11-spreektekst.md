# Perfect-stand 22-11: Groningse spreektekst voor de gesproken verhaalregels

Scope: de verhaalregels in `game/storydata/script.json` die alleen tekst waren, omdat ze nog geen Groningse spreektekst of geen stem hadden (`scripts/tts_waiting.json`). Hoofdissue #1121. Er is niets opgenomen en niets beluisterd.

## Aantallen

| Wat | Aantal |
|---|---:|
| regels die wachtten op een spreektekst (sleutel spreker en tekst) | 389 |
| daarvan verschillende teksten, nu met spreektekst | 375 |
| daarvan gelijk aan de ondertitel (korte uitroepen, namen, Nederlandse woorden) | 38 |
| regels die wachtten op een stemkeuze (Veldkamp, Daan, Anneke, Stien, Lieke) | 26 |
| daarvan nu met stem en spreektekst | 26 |
| nieuwe woorden in `scripts/dialect_woorden.json` (status `afgeleid`) | 32 |
| rijen in `scripts/gronings_spoken.json` | 3278 naar 3678 |
| opdrachten in `scripts/tts_lines.json` en `scripts/voice_wacht.json` | 207 naar 608 |
| regels die nog op spreektekst of stem wachten | 0 |

Per spreker en per stem: [../TTS-ROND3-22-11.md](../TTS-ROND3-22-11.md).

## Gedaan

- Alle 375 teksten kregen een spreekvorm in de bestaande stijl van `gronings_spoken.json`: lichte klankverschuiving (hij naar hai, niet naar nait, mijn naar mien, jullie naar jim, je als onderwerp naar doe), bekende woorden uit het register, geen karikatuur. "Grunn" blijft "Grunn"; "de Grunn" komt niet voor.
- Cijfers, vocale tags en lengte volgen de regels van `scripts/gronings_spoken_test.mjs` (groen).
- De 32 nieuwe woorden staan in het register met status `afgeleid` en een verwijzing naar deze ronde, en zijn aan `scripts/dialect_bronnen.json` toegevoegd als "niet gevonden" (er is niets opgehaald). `dialect_woorden_test` is groen.
- De vijf sprekers zonder stem kregen een bestaande Gemini-stem in `CAST` (`scripts/tts_lines_list.mjs`), met reden in het TTS-rondedocument: Meneer Veldkamp (Alnilam), Daan (Puck), Anneke (Achernar), Stien (Vindemiatrix), Lieke (Leda).
- `scripts/tts_lines.json`, `scripts/tts_waiting.json` (nu leeg) en `scripts/voice_wacht.json` zijn opnieuw gegenereerd; `voice_coverage --quiet` blijft groen.
- Een betekenisfout in een eigen eerste versie is gevonden en hersteld: "Doe de groeten" las in het Gronings als "jij de groeten" ("Groet Trijntje van mie"), en "Woarom doe doe" kreeg "dust".

## Open

- **Geen reviewpaneel gedraaid.** De opdracht vroeg om drie reviewers per veertig regels bij twijfel; er was in deze run geen subagent-hulpmiddel. De twijfel staat daarom hier en niet in een paneeluitkomst. Gronings-droog won waar er een keuze was (korte beurten, niets uitleggends erbij).
- Niet beluisterd en niet door een Groninger nagelopen. Eerst naar de 32 afgeleide woorden kijken: belst, metmoaken, bewoarder, oetslag, wachst, verhoesdag, vandoan, schoap, drinkst, bedoelst, tilst, slapt, ziekenhoes, oavend, zaoterdagoavend, speulst, probeerd, moat, aine, deurstreept, kleinzeun, aindheid, jongje, sluzen, betoalde, vriendelk, zingst, vangst, moandag, nimst, bezwoar, leest.
- Twijfelzinnen waar het Nederlands is blijven staan omdat er geen betrouwbare Groningse vorm is: genomen, zandplaat, spijker, luchtruim, wisselen, danste, nepbisschop, kopje, gelegenheid.
- Het manifest en `textOnly` in `script.json` veranderen pas na de TTS-ronde (`build_story_data`); daarom staat het scriptbestand ongewijzigd.
- Geen muziek, props of beeld in deze scope (geen aparte stappenlijst: de scope is spreektekst en stemkeuze).

## Samen spelen

Geen nieuw gedrag: dit zijn spreekteksten van bestaande stappen. Ze volgen per stap wat het script al zegt (de eigenaar van de wereld start, een gast doet mee met J of N, voortgang en beloning per speler, #429). De stemmen klinken lokaal bij ieder die de regel te zien krijgt.

## Gedraaide controles

Zie het commentaar op #1121 voor de lijst en de uitkomst.
