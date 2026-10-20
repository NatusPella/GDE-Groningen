# Licentie voor de inhoud (CC BY-NC-SA 4.0)

**Nederlands.** De eigen creatieve inhoud van GDE Groningen (stemmen en
andere audio, muziek, verhaal en dialogen, eigen beelden en modellen) valt
onder de **Creative Commons Naamsvermelding-NietCommercieel-GelijkDelen 4.0
Internationaal**-licentie (CC BY-NC-SA 4.0). Je mag het delen en bewerken,
zolang je:

- **naam noemt**: "GDE Groningen – Zomer vol misdaad, door NatusPella", met
  een link naar deze licentie en of je iets hebt veranderd;
- het **niet commercieel** gebruikt;
- je bewerking onder **dezelfde licentie** deelt.

**English.** The game's own creative content (voices and other audio, music,
story and dialogue, own images and models) is licensed under the
**Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International**
licence (CC BY-NC-SA 4.0): share and adapt it with attribution
("GDE Groningen – Zomer vol misdaad, by NatusPella"), not for commercial
purposes, and under the same licence.

Samenvatting: <https://creativecommons.org/licenses/by-nc-sa/4.0/deed.nl>
Volledige juridische tekst (legal code), die geldt:
<https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode>

De **programmacode** valt onder de GPL-3.0-or-later, zie [LICENSE](LICENSE).

## Wat valt onder deze licentie

| Wat | Waar |
|---|---|
| Stemmen, ingesproken regels, radio, nieuws, jingles | `game/audio/voicelines/`, `game/audio/npc/`, `game/audio/police/`, `game/audio/nieuws/`, `game/audio/gmusic/jingles/` |
| Muziek: G-Music, scenario-loops, titelnummer | `game/audio/gmusic/`, `game/audio/scenario/`, `game/audio/theme/` |
| Verhaal, personages en dialogen in documenten | `docs/verhaal/`, `docs/verhaal-voorstel.md`, `docs/personages.md` |
| Dialogen en verhaalteksten in JavaScript-bestanden | alleen de teksten, niet de code; precieze regel hieronder: [Teksten in codebestanden](#teksten-in-codebestanden) |
| Het 3D-model van de Martinitoren | `game/models/martinitoren.glb` |
| Schermafbeeldingen en promotiebeelden (zonder het logo, zie hieronder) | `docs/steam/beelden/`, `docs/youtube/beelden/` |

## Teksten in codebestanden

Een deel van het verhaal staat in JavaScript. Daarvoor geldt:

1. **CC BY-NC-SA 4.0** voor de tekenreeksen (strings) met dialogen,
   ondertitels, verhaal-, missie- en personageteksten in:
   - `game/js/*lines.js` (o.a. `banterlines.js`, `cardlines.js`,
     `flavourlines.js`, `funlines.js`, `ommelandlines.js`,
     `padellines.js`, `pg_lines.js`, `rondvaartlines.js`);
   - `game/js/subtitles.js`, `storyarc.js`, `story.js`,
     `storycontact.js`, `storyeikea.js`, `storyfun.js`,
     `missionstory.js`, `missions.js`, `cinematics.js`, `characters.js`,
     `smsvoice.js`, `sidejobvoice.js`;
   - en, in elk ander bestand, elke regel die is ingesproken: tekst die als
     opname voorkomt in een manifest of `tts.json` onder `game/audio/`
     (sleutel `"<spreker>|<tekst>"`).
2. **GPL-3.0-or-later** voor al het andere in die bestanden (logica,
   structuur, sleutels, namen van variabelen en functies, getallen) en
   voor alle overige teksten in de code, zoals menu's, knoppen, hints,
   foutmeldingen en instellingen.

Twijfel je bij een tekst? Behandel hem dan als inhoud (CC BY-NC-SA). Wie de
code verder wil gebruiken onder alleen de GPL, bijvoorbeeld commercieel,
vervangt die teksten door eigen teksten.

## Door AI gemaakte stemmen en muziek

De stemmen zijn gemaakt met Google Gemini TTS via OpenRouter, de muziek met
Google Gemini (zie [NOTICE.md](NOTICE.md)). We bieden ze aan onder
CC BY-NC-SA 4.0 **voor zover er rechten op rusten**. Puur door AI gemaakte
audio is in de EU mogelijk niet auteursrechtelijk beschermd; dan geeft
deze licentie voor die audio geen rechten en legt ze er ook geen plichten
voor op.

Gebruik je de audio, dan moet je je ook houden aan de voorwaarden van die
diensten, voor zover die voor jou gelden: de
[Google Terms of Service](https://policies.google.com/terms), de
[Generative AI Prohibited Use Policy](https://policies.google.com/terms/generative-ai/use-policy),
de [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms) en
de [OpenRouter Terms](https://openrouter.ai/terms). Doe bijvoorbeeld niet
alsof de audio door mensen is gemaakt.

*The voices (Google Gemini TTS via OpenRouter) and the music (Google
Gemini) are offered under CC BY-NC-SA 4.0 to the extent any rights subsist
in them; purely AI-generated audio may not be protected by copyright in the
EU. Users must also respect the terms of those providers where they apply.*

## Wat er niet onder valt

- **De naam en het logo.** "GDE", "GDE Groningen", "GDE Groningen – Zomer
  vol misdaad" en het logo (het GDE-woordmerk met het groene
  plaatsnaambord, o.a. `desktop/resources/icon.svg` en `icon.png`, en het
  logo in de promotiebeelden): alle rechten voorbehouden. Zie
  [Naam en logo](#naam-en-logo).
- **Werk van anderen** houdt zijn eigen licentie: de kaartdata
  (© OpenStreetMap-bijdragers, ODbL 1.0: `game/stad.json`,
  `game/mapextras.json`, de kaarttegels, `data/`), de lettertypen
  (SIL Open Font License) en three.js (MIT). Zie [NOTICE.md](NOTICE.md) en
  [licenses/](licenses/).

## Naam en logo

De naam GDE / "GDE Groningen – Zomer vol misdaad" en het logo zijn **geen**
onderdeel van de GPL of van CC BY-NC-SA. Je mag de code en de inhoud forken
en aanpassen volgens die licenties, maar een fork of afgeleid spel krijgt
een **eigen naam en een eigen logo**, en mag niet de indruk wekken dat het
de officiële versie is. Feitelijk noemen mag wel ("gebaseerd op GDE
Groningen van NatusPella").

*The name GDE / "GDE Groningen – Zomer vol misdaad" and the logo are not
covered by the GPL or CC BY-NC-SA. Forks and derived games must use their
own name and logo and must not suggest they are the official game. Saying
"based on GDE Groningen by NatusPella" is fine.*
