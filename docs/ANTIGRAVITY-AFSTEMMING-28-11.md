# Afstemming met Antigravity (28-11)

Antigravity werkt parallel aan codekwaliteit. Wij (Claude, coordinator en agents) werken tegelijk aan inhoud en beeld. Om dubbel werk en conflicten te voorkomen gelden deze afspraken.

## Werkwijze
- Antigravity werkt op een eigen branch (nu `code-quality-improvements-27-11`) in kleine, losse commits met tests, in het Nederlands, met `Refs #n`.
- Begin elke nieuwe reeks op de **nieuwste `origin/main`** (nu v0.66.0 plus de README; binnenkort 0.66.1), niet op een oude basis: de vorige reeks stond op een basis van vóór 0.65 en gaf 46 conflicten. Maak per reeks een nieuwe branch (`code-quality-<datum>`) vanaf `origin/main`.
- Wij nemen elke reeks over op de huidige `main` (branch `antigravity-port-*`), met de tests erbij, en noemen het commitnummer van Antigravity in ons bericht. Zet na elke reeks de commits met een korte omschrijving onderaan `docs/antigravity/STAND.md` (hash, wat, tests); wij zetten er "overgenomen" achter.
- Geen push naar `main`, geen tags of releases: dat doet de coordinator.

## Wat past bij Antigravity (graag meer hiervan)
Tests en testhulpen, beveiliging en robuustheid (escaping, listeners opruimen, timers, foutafhandeling), diagnostiek, dode code en importcycli, prestaties van code die niet renderen is (I/O, caches, allocaties), toegankelijkheid en toetsenbord/controller-gedrag, documentatie en specs, `world.player` verminderen voor Samen spelen.

## Wat wij nu doen (niet aanraken, of eerst afstemmen)
- **Cutscenes en camera:** `cutscenes_*.js`, `cutdirector.js`, `cinetemplates.js`, `cutscript.js`, `cineshots.js`, `shotlight.js`, `interiorcut3d.js`, de openingsscènes, en de geluidsmix van cutscenes (`cutaudio.js`, `cutscenehost.js`, muziek).
- **Voertuigen en LOD:** `models3d_vehicles.js`, `vehicle_*.js`, `wheelinstances3d.js`, `vehiclelod3d.js`, `lod*.js`, `buildingfade.js`.
- **Mensen en animatie:** `modularpeople.js`, `modularlooks.js`, `modularwear.js`, `models3d_people.js`, `ragdoll*.js`, `seating3d.js`, `animstate.js`.
- **Spoor en wereld:** `railway*.js`, `trainservice.js`, `ambienttrains.js`, wereldbouw van spoor en viaducten, straatdetail en props (`propregister.js`, `streetclutter.js`).
- **Thuis en missies:** `home.js`, flat en garage, missie- en skiplogica.
- **Nieuwe ontwerpen:** Spel-overzicht, Land en bedrijf, Samen spelen, het voetbalclubhuis en de wedstrijd-HUD. Concrete fouten mag je melden of oplossen in een aparte, kleine commit.
- **README en docs/screenshots.**

Raakt een wijziging een van deze gebieden, houd haar dan klein en mechanisch (bijvoorbeeld alleen een import of een rename) en vermeld het in `STAND.md`, zodat wij hem kunnen inplannen.

## Regels uit AGENTS.md die altijd gelden
Alleen Nederlands voor alles wat de speler ziet of hoort; code in het Engels; geen echte merken of personen; altijd zomer; saves nooit breken (opslagsleutels `gde-*`); geen geheimen of `.env` aanraken; elke nieuwe functie krijgt een regel over Samen spelen. Voor de volledige lijst zie [AGENTS.md](../AGENTS.md).
