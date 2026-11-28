# Regels die opnieuw opgenomen of herschreven moeten worden (28-11, #1395)

Besluit eigenaar 28-11: **Oma Trijntje is Tessa's oma, Beppe is Tammo's oma** (bijbel `docs/verhaal/bijbel-28-11/01-verhaal-en-personages.md` §6.4). Dossiers, relaties en docs zijn aangepast. Deze lijst **markeert** de regels waarvan de tekst of de opname nu iets anders zegt. De scripttekst, `script.json`, de cutscenes en `scripts/gronings_spoken.json` zijn hier bewust **niet** gewijzigd: dat gebeurt in de opnameronde. `TTS-OPNAMELIJST-735.md` is gegenereerd en wordt niet met de hand aangepast; de nieuwe regels komen via `scripts/voice_wacht.json` (akkoord eigenaar) in de volgende opnameronde.

## Opnieuw op te nemen (2 regels, opgenomen in `game/audio/voicelines/lines/manifest.json`)

| Bron | Nu | Voorstel | Ook aanpassen |
|---|---|---|---|
| `docs/verhaal/nieuw/09-script-akte2.md:65`, `game/storydata/script.json` r. ~5554 (OMA TRIJNTJE, telefoon) | "Tammo, met je oma. Kom naar de Noorderhaven. Wil je eerlijk winnen, dan heb je mijn recept nodig." | "Tammo, met Oma Trijntje. Kom naar de Noorderhaven. Wil je eerlijk winnen, dan heb je mijn recept nodig." | `game/js/cutscenes_akte2.js:118-119` (`on: 'Tammo, met je oma'`, twee keer), `scripts/gronings_spoken.json:3073`; manifestsleutel `Oma Trijntje\|Tammo, met je oma. …` |
| `docs/verhaal/nieuw/09-script-akte3.md:155`, `game/storydata/script.json` r. ~10590 (TAMMO) | "Het is niet eens van ons. Het is van mijn oma." | "Het is van Tessa's oma." of "Het is van Oma." (keuze bij de opnameronde; de tweede past bij "Oma van de straat") | `scripts/gronings_spoken.json:1466`; manifestsleutel `Tammo\|Het is niet eens van ons. …` |

## Stille regel (1, geen opname)

| Bron | Nu | Voorstel |
|---|---|---|
| `docs/verhaal/nieuw/09-script-akte2.md:493`, `game/storydata/script.json` r. ~9120 (app Tammo naar Tessa, stil) | "Het is mijn oma, dus ik." | "Het is jouw oma, dus ik ben te gast." |

## Blijft geldig (opgenomen, niets doen)

- M08.3: "Eet je krentjebrij." / "Ik ben vierentwintig, oma." / "Dan eet je hem al vierentwintig jaar te weinig." Ze kent hem sinds zijn geboorte als buurvrouw; de hele straat zegt Oma.
- Tessa's "Oma", "We slapen, Oma." enz. in akte 2 tot 5: klopt nu beter.
- "Oma… hoe zei opa het eigenlijk? Tegen jou." (`09-script-akte5.md:211`, `missionstory.js:422`, `cutscenes_akte4.js:352`, `gronings_spoken.json:2756`): geldig zolang Opa haar buurman en vriend is en niet haar man.

## Samen spelen

Geen nieuwe spelregel: het gaat om tekst en stemclips die voor elke speler hetzelfde zijn.
