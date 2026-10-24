# NOTICE — GDE Groningen – Zomer vol misdaad

© 2026 NatusPella.

| Wat | Licentie |
|---|---|
| Eigen programmacode (`game/`, `desktop/`, `web/`, `scripts/`, `steam/`) | **GPL-3.0-or-later**, zie [LICENSE](LICENSE) |
| Eigen creatieve inhoud: stemmen en audio, muziek, verhaal en dialogen, het Martinitoren-model, schermafbeeldingen | **CC BY-NC-SA 4.0**, zie [LICENSE-CONTENT.md](LICENSE-CONTENT.md) (met de precieze mappen) |
| De naam "GDE" / "GDE Groningen – Zomer vol misdaad" en het logo | **alle rechten voorbehouden**; forks gebruiken een eigen naam en logo ([LICENSE-CONTENT.md](LICENSE-CONTENT.md#naam-en-logo)) |
| Werk van anderen (hieronder) | de eigen licentie van dat werk |

Waar een bestand zowel code als spelteksten bevat, geldt de GPL voor de
code en CC BY-NC-SA voor de dialogen en verhaalteksten. Dat gaat om de
teksten in `game/js/*lines.js`, `subtitles.js`, `storyarc.js`, `story.js`,
`storycontact.js`, `storyeikea.js`, `storyfun.js`, `missionstory.js`,
`missions.js`, `cinematics.js`, `characters.js`, `smsvoice.js` en
`sidejobvoice.js`, en om elke ingesproken regel (met een opname onder
`game/audio/`) waar die ook staat. Menu's, knoppen en andere
interfaceteksten vallen met de code onder de GPL. De precieze regel staat in
[LICENSE-CONTENT.md](LICENSE-CONTENT.md#teksten-in-codebestanden).
Hieronder staan de verplichte vermeldingen voor gebruikt werk van anderen.

GDE Groningen is een gratis, niet-commercieel fanproject en een parodie.
**Het is niet gelieerd aan, gesponsord door of goedgekeurd door een
gameontwikkelaar of -uitgever, in het bijzonder niet door Rockstar Games of
Take-Two Interactive, de uitgever van GTA.** Namen, personages, bedrijven,
merken en gebeurtenissen in het spel zijn verzonnen; gelijkenis met
bestaande personen of bedrijven berust op toeval. Echte straten en
openbare gebouwen zijn alleen decor.

Dit bestand somt de onderdelen van derden op en de vermeldingen die hun
licenties vragen. De volledige inventaris met bronnen staat in
[docs/LICENTIES.md](docs/LICENTIES.md). De in-game tekst staat in
`game/js/credits.js`; houd die twee gelijk.

## Kaartdata — OpenStreetMap

Kaartdata © OpenStreetMap-bijdragers, beschikbaar onder de
[Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
Zie <https://www.openstreetmap.org/copyright>.

De afgeleide databases in dit project vallen ook onder de ODbL:
`game/stad.json`, `game/mapextras.json`, `scripts/world/cityroutes_src.json`,
de kaarttegels (`game/world/`, bij het bouwen gemaakt) en de Overpass-extracten in `data/` (`*_raw.json`,
`*_raw.json.gz`, `*.overpass`-resultaten). Ze zijn gemaakt met de scripts in
`scripts/` (`scripts/world/extract_province.py`, `fetch_ommeland.py`, de tegelbouw in `scripts/world/*.mjs`; de oude Python-keten (`build_map.py`, `add_*.py`) en de ruwe Overpass-bronnen van de stad zijn met #90 uit de repo gehaald en staan in de git-geschiedenis).

Daaronder vallen ook de plekken voor padel, golf en pitch and putt
(`game/echteplekken.json`, `data/extras_padel_raw.json`), de horeca- en
winkellocaties (`data/horeca_raw.json`, `data/shops_raw.json`) en de overige
`data/*_raw.json`. In het spel krijgen ketens en cafés een verzonnen naam.

## Gebouwhoogtes — 3DBAG

Gebouwhoogtes en dakvormen: 3DBAG door de 3D geoinformation onderzoeksgroep
(TU Delft) en 3DGI, <https://3dbag.nl>, onder
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Gebruikt: per pand
`b3_h_dak_max`, `b3_h_dak_50p`, `b3_h_maaiveld` en `b3_dak_type`, uit de
officiële tegeldownloads (`scripts/world/fetch_3dbag.py`), samengevat in
`data/world/3dbag.json.gz` en in de hoogtes van de kaarttegels en de
tegels. De 3DBAG is zelf gemaakt uit de BAG (Kadaster, publiek domein) en de
AHN (CC0).

## Terreinhoogte — AHN (PDOK)

Hoogte van het terrein (dijken, wierden, de Hondsrug, hellingen): Actueel
Hoogtebestand Nederland (AHN), via de WCS-dienst van PDOK, onder
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (publiek
domein). Een vermelding is niet verplicht maar wordt gegeven:
<https://www.ahn.nl>, <https://www.pdok.nl>. Opgehaald met
`scripts/world/fetch_ahn.py`; de afgeleide rasters (`data/world/ahn/`) zitten
in de kaarttegels (`game/world/`, bij het bouwen gemaakt).

## Grenzen van gemeenten, woonplaatsen, wijken en buurten — Kadaster en CBS (PDOK)

De echte grenzen waarop "gebieden veroveren" rust (`game/grenzen.json`, gemaakt met
`scripts/world/fetch_grenzen.mjs` en `scripts/world/grenzen.mjs`; het spel zelf
haalt niets van het netwerk):

- Provincie- en gemeentegrenzen: Kadaster, PDOK Bestuurlijke Gebieden, onder
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.nl).
- Woonplaatsen: Kadaster, BAG (Basisregistratie Adressen en Gebouwen), via PDOK, onder de
  [Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/deed.nl).
- Wijken en buurten: CBS, Gebiedsindelingen (gegeneraliseerd, peiljaar 2025), via PDOK, onder
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.nl).

De grenzen zijn vereenvoudigd (Douglas-Peucker, 10 tot 40 m) en op hele meters afgerond;
het zijn dus geen officiële grenzen meer en ze zijn niet bruikbaar voor juridische doeleinden.

## Software

| Onderdeel | Licentie | Copyright | Tekst |
|---|---|---|---|
| three.js r160 (CDN, in de desktopbuild meegeleverd) | MIT | © 2010-2023 three.js authors | [licenses/MIT-three.js.txt](licenses/MIT-three.js.txt) |
| Bebas Neue (Google Fonts, in de desktop- en webbuild meegeleverd) | SIL Open Font License 1.1 | © 2010 Dharma Type | [licenses/OFL-BebasNeue.txt](licenses/OFL-BebasNeue.txt) |
| Big Shoulders Display, het logo (Google Fonts, in de desktop- en webbuild meegeleverd, als subset ingebed in `desktop/resources/icon.svg`) | SIL Open Font License 1.1 | © 2019 The Big Shoulders Project Authors | [licenses/OFL-BigShouldersDisplay.txt](licenses/OFL-BigShouldersDisplay.txt) |
| Electron (alleen desktop) | MIT, met Chromium en Node.js onder hun eigen licenties | © Electron contributors, GitHub Inc. | `LICENSE.electron.txt` en `LICENSES.chromium.html` naast de app |
| electron-builder (alleen bouwtool) | MIT | © Loopline Systems, Vladimir Krivosheev | wordt niet meegeleverd |

Andere lettertypen (Arial, Arial Narrow, Georgia, Segoe Print, Menlo,
Consolas, system-ui) komen van het systeem van de speler en worden niet
meegeleverd.

## Gegenereerde inhoud

- **Muziek**: G-Music, de scenario-loops (ook de eigen loops voor kart, padel, golf, klimtoren, trein en bus) en het titelnummer
  (`game/audio/gmusic`, `game/audio/scenario`, `game/audio/theme`) zijn
  gemaakt met Google Gemini.
- **Stings** (`game/js/stings.js`: afteller, finish, winnaar, verliezer, Meedoen?, speler sluit aan, trein vertrekt, halte)
  zijn procedureel in code gemaakt met WebAudio: geen opnames en geen AI-muziek.
- **Stemmen**: alle stemmen (`game/audio/voicelines`, `npc`, `police`,
  `nieuws`, G-Music-jingles) zijn gemaakt met Google Gemini TTS
  (`google/gemini-3.8-flash-tts`) via OpenRouter. Per map
  legt `tts.json` vast hoe elke clip is gemaakt.
- Muziek en stemmen staan onder CC BY-NC-SA 4.0 **voor zover er rechten
  op rusten**; wie ze gebruikt, houdt zich ook aan de voorwaarden van
  Google (Gemini) en OpenRouter, voor zover die gelden. Zie
  [LICENSE-CONTENT.md](LICENSE-CONTENT.md#door-ai-gemaakte-stemmen-en-muziek).
- **Martinitoren-model** (`game/models/martinitoren.glb`): gemaakt met
  Claude Design (Anthropic).
- Geluidseffecten, texturen en alle andere 3D-modellen worden in de code
  zelf gemaakt (procedureel); er zitten geen externe geluids- of
  beeldbestanden in het spel.
