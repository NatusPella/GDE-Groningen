# Muziek: wat is gekoppeld en wat de eigenaar nog moet leveren

Stand: 20 november 2026 (#986, #988). Naslag; de regels staan in [MUZIEK.md](MUZIEK.md) en `.specs-fire/standards/mechanica.md`. Het spel krijgt geen muziek of stings die door Claude zijn gemaakt (besluit 18-10, #66); de eigenaar levert tracks uit Gemini.

## Gekoppeld (gecontroleerd op 20-11)

- **Radio (G-Music):** alle 34 mp3's in `game/audio/gmusic/` staan in `manifest.json`, en elke regel in het manifest heeft een bestand. Vier radiojingles (`jingles/`: `hoge_wanted`, `nummerovergang`, `rij_knipoog`, `station_id`) zijn gekoppeld.
- **Scenario-loops:** alle 15 mp3's in `game/audio/scenario/` staan in `SCENARIO_TRACKS` of de achtervolgings- en racelijst van `game/js/audio/scenario.js`, ook `pvp_arena_loop` (PvP-arena, #454). De rij "PvP-arena: de radio" in de tabel "Nog te maken" van MUZIEK.md is daarmee achterhaald.
- **Titelnummer:** `game/audio/theme/miles_past_the_city_square.mp3` (theme.js, trailer.js, de openingsmontage).
- **Stings en missiegeluiden:** procedureel in code (`game/js/stings.js`, `game/js/sfx/missiebank.js`, `sfx/stingen.js`), besluit 24-10: geen opnames. Dus er ligt niets om te koppelen.

Er is geen ongekoppeld bestand in de repo. Er is daarom in deze ronde niets nieuws gekoppeld en niets gemaakt.

## Nog te vragen aan de eigenaar

1. **Dagmuziek voor de radio:** 4 tot 6 nieuwe nummers in andere stijlen dan drill, punk en eurodance (de dagpool). Stijlomschrijvingen staan in MUZIEK.md onder "Voorstellen"; de eerdere prompts `dag_01` tot `dag_06` stonden alleen in een gesprek en zijn niet in de repo bewaard. Tracks gaan in `game/audio/gmusic/` en `manifest.json` (`"stations": ["gmusic"]`).
2. **`Afternoon_Boulevard.mp3`** staat sinds 24-10 in de Downloads-map van de eigenaar (4,1 MB) en is nergens in de repo genoemd. Vraag: is dit een track voor de radio of een loop, en van welke bron (voor `docs/LICENTIES.md`)? Niet gekopieerd, omdat herkomst en licentie onbekend zijn.
3. **Eigen loops** voor skatepark, botsauto, waterski, rondvaart, trekker en landbouw (de boerderijloop bestaat al voor de machines), vliegschool en helikopter; zie de tabel in MUZIEK.md (prompts staan er). Tot die er zijn, speelt de radio.
4. **Echte opnames van de acht stings** alleen als de eigenaar de procedurele versie wil vervangen (prompts: MUZIEK.md, "Stings die nu synthetisch zijn"). Geen blokkade.
5. **De opening** (trailer, keuken, verhuisdag) heeft alleen het titelnummer en stemmen. Wil de eigenaar een eigen track onder de keuken of de verhuisdag? Dan een loop van 1,5 tot 2 minuten, rustig en zomers.

## Audiocontrole

Niveau en clipping van de nieuwe stings en geluiden zijn niet met het gehoor gecontroleerd maar met de audiograaf (`--audio-graph`, `scripts/qa/audiotap.js`); de uitkomst staat in het issue #988 en, als er afwijkingen zijn, hieronder.

(Nog geen afwijkingen genoteerd.)
