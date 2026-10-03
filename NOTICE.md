# NOTICE — GDE Groningen – Zomer vol misdaad

GDE Groningen (tot 0.24: GTE VI) is een gratis, niet-commercieel
fanproject. **GDE is een fanparodie op GTA, niet gelieerd aan of
goedgekeurd door Rockstar Games of Take-Two Interactive.**
"Grand Theft Auto" en "GTA" zijn merken van Take-Two Interactive. Namen,
personages, merken en gebeurtenissen in het spel zijn verzonnen; echte
straten en openbare gebouwen zijn alleen decor.

Dit bestand somt de onderdelen van derden op en de vermeldingen die hun
licenties vragen. De volledige inventaris met bronnen staat in
[docs/LICENTIES.md](docs/LICENTIES.md). De in-game tekst staat in
`game/js/credits.js`; houd die twee gelijk.

## Kaartdata — OpenStreetMap

Kaartdata © OpenStreetMap-bijdragers, beschikbaar onder de
[Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
Zie <https://www.openstreetmap.org/copyright>.

De afgeleide databases in dit project vallen ook onder de ODbL:
`game/citymap.json`, `game/mapextras.json`, `game/ommeland.json`,
`game/ommeland.bin` en de Overpass-extracten in `data/` (`*_raw.json`,
`*_raw.json.gz`, `*.overpass`-resultaten). Ze zijn gemaakt met de scripts in
`scripts/` (`fetch_osm.py`, `fetch_ommeland.py`, `build_map.py`, `add_*.py`).

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

- **Muziek**: G-Music, de scenario-loops en het titelnummer
  (`game/audio/gmusic`, `game/audio/scenario`, `game/audio/theme`) zijn
  gemaakt met Google Gemini.
- **Stemmen**: alle stemmen (`game/audio/voicelines`, `npc`, `police`,
  `sikkom`, G-Music-jingles) zijn gemaakt met Google Gemini TTS
  (`google/gemini-3.8-flash-tts` en eerdere modellen) via OpenRouter. Per map
  legt `tts.json` vast hoe elke clip is gemaakt.
- **Martinitoren-model** (`game/models/martinitoren.glb`): gemaakt met
  Claude Design (Anthropic).
- Geluidseffecten, texturen en alle andere 3D-modellen worden in de code
  zelf gemaakt (procedureel); er zitten geen externe geluids- of
  beeldbestanden in het spel.
