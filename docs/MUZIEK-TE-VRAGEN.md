# Muziek: wat is gekoppeld en wat de eigenaar nog moet leveren

Stand: 20 november 2026 (#986, #988). Naslag; de regels staan in [MUZIEK.md](MUZIEK.md) en `.specs-fire/standards/mechanica.md`. Het spel krijgt geen muziek of stings die door Claude zijn gemaakt (besluit 18-10, #66); de eigenaar levert tracks uit Gemini.

## Gekoppeld (gecontroleerd op 20-11)

- **Radio (G-Music):** alle 34 mp3's in `game/audio/gmusic/` staan in `manifest.json`, en elke regel in het manifest heeft een bestand. Vier radiojingles (`jingles/`: `hoge_wanted`, `nummerovergang`, `rij_knipoog`, `station_id`) zijn gekoppeld.
- **Scenario-loops:** alle 15 mp3's in `game/audio/scenario/` staan in `SCENARIO_TRACKS` of de achtervolgings- en racelijst van `game/js/audio/scenario.js`, ook `pvp_arena_loop` (PvP-arena, #454). De rij "PvP-arena: de radio" in de tabel "Nog te maken" van MUZIEK.md is daarmee achterhaald.
- **Titelnummer:** `game/audio/theme/miles_past_the_city_square.mp3` (theme.js, trailer.js, de openingsmontage).
- **Stings en missiegeluiden:** procedureel in code (`game/js/stings.js`, `game/js/sfx/missiebank.js`, `sfx/stingen.js`), besluit 24-10: geen opnames. Dus er ligt niets om te koppelen.

Er is geen ongekoppeld bestand in de repo. Er is daarom in deze ronde niets nieuws gekoppeld en niets gemaakt.

## Nog te vragen aan de eigenaar

1. **Missiesferen (#988), in volgorde van impact:** negen loops die de koppeling in `game/js/missiesfeer.js` automatisch oppakt; nu speelt vrijwel elke missie dezelfde `missie_spanning_loop`. Volgorde: `missie_komisch` (de klusjes van akte 1 en 2), `missie_sluipen` (M06, M13, M14, M18, M20, M21, M23), `missie_feest` (M16, M17, M26, kermis), daarna `missie_ontdekken`, `missie_warm` (M27 tot M29), `missie_werk` (bijbanen), `missie_finale` (M30), `missie_nacht` en `missie_water` (M11, skûtsje). Kant-en-klare prompts en het stappenplan (bestand neerzetten en op de lijst zetten): [MUZIEK-OPDRACHT-GEMINI.md](MUZIEK-OPDRACHT-GEMINI.md). Tot dan valt een missie terug op `missie` en houdt een bijbaan de radio.
2. **Dagmuziek voor de radio:** 4 tot 6 nieuwe nummers in andere stijlen dan drill, punk en eurodance (de dagpool). Stijlomschrijvingen staan in MUZIEK.md onder "Voorstellen"; de eerdere prompts `dag_01` tot `dag_06` stonden alleen in een gesprek en zijn niet in de repo bewaard. Tracks gaan in `game/audio/gmusic/` en `manifest.json` (`"stations": ["gmusic"]`).
3. **`Afternoon_Boulevard.mp3`** staat sinds 24-10 in de Downloads-map van de eigenaar (4,1 MB) en is nergens in de repo genoemd. Vraag: is dit een track voor de radio of een loop, en van welke bron (voor `docs/LICENTIES.md`)? Niet gekopieerd, omdat herkomst en licentie onbekend zijn.
4. **Eigen loops** voor skatepark, botsauto, waterski, rondvaart, trekker en landbouw (de boerderijloop bestaat al voor de machines), vliegschool en helikopter; zie de tabel in MUZIEK.md (prompts staan er). Tot die er zijn, speelt de radio.
5. **Echte opnames van de acht stings** alleen als de eigenaar de procedurele versie wil vervangen (prompts: MUZIEK.md, "Stings die nu synthetisch zijn"). Geen blokkade.
6. **De opening** (trailer, keuken, verhuisdag) heeft alleen het titelnummer en stemmen. Wil de eigenaar een eigen track onder de keuken of de verhuisdag? Dan een loop van 1,5 tot 2 minuten, rustig en zomers.

## Audiocontrole

Niveau en clipping van de nieuwe stings en geluiden zijn niet met het gehoor gecontroleerd maar met de audiograaf (`--audio-graph`, `scripts/qa/audiotap.js`); de uitkomst staat in het issue #988 en, als er afwijkingen zijn, hieronder.

(Nog geen afwijkingen genoteerd.)
