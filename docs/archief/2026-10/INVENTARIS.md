> **Archief (oktober 2026).** Dit document is vervangen door de GitHub-issues #465-#488 en de specs in `.specs-fire/standards/`.
> Het staat hier alleen als historie: gebruik het niet als bron en werk het niet bij.

# Inventaris en conformiteit

Op 25-10-2026 opgemaakt met vier parallelle scans (game/client, bouw en release,
tests en audits, conformiteitsscan) plus eigen verificatie van elke bevinding in
deel B. Cijfers komen uit `git ls-files` en zijn dus tracked bestanden, geen
werkboomruis.

**Wat deze inventaris niet is:** een regel-voor-regel audit. De modulekaart is op
subsysteemniveau, de conformiteitsscan dekt de regels uit AGENTS.md die zich
mechanisch laten toetsen. Wat niet bekeken is, staat in deel C.

## Deel A — Wat er is

### Vorm van de repo

| Deel | Tracked bestanden | Wat |
| --- | --- | --- |
| `game/` | 4133 | spellogica (`js/` 895), audio (`audio/` 3206), kaartdata |
| `scripts/` | 1142 | tests, audits, wereldbouw, QA, perf |
| `docs/` | 197 | 132 markdown-documenten plus beelden |
| `android/` | 68 | Capacitor-schil |
| `desktop/` | 25 | Electron-schil, build en release |
| `steam/`, `.github/`, `data/`, `web/` | 10 / 11 / 5 / 4 | Steam-materiaal, workflows, open data, webversie |
| root | 14 | AGENTS, ARCHITECTURE, README, CHANGELOG, licenties |

Totaal 5613 tracked bestanden. `game/world/`, `web-dist/`, `data/cache/` en
`data/world/` staan niet in git (build- of downloadartefacten).

### De drie schillen

- **Browser** is het hoofddoel: `game/index.html` laadt als enige module
  `game/js/main.js`; Three.js 0.160.0 komt via een import map van jsDelivr. Geen
  bundler, geen buildstap in ontwikkeling.
- **Desktop**: `desktop/main.js` in Electron 44, met `desktop/build.mjs` dat de
  wereld staget. Scripts: `stage`, `start`, `dist:mac|win|linux`, `dist`, `release`
  (`release.sh`). Uitvoer in `desktop/dist`.
- **Web**: `web/build.mjs` bouwt `web-dist/` — de desktop-staging met relatieve
  paden, elke stem- en muziekclip ook als Opus/WebM, clips verpakt per map (itch.io
  staat max. 1000 bestanden toe), een audio-index, `web.js` en `sw.js`;
  `--zip` maakt de uploadzip.
- **Android**: Capacitor 8.5.3, gestaged vanuit dezelfde webapp.

### Releases

Vijf workflows, allemaal alleen `workflow_dispatch`: `test.yml` (push, Linux +
Windows via `scripts/run_tests.mjs`) en `windows/mac/linux/android-release.yml`.
De coördinator releaset lokaal met `cd desktop && npm run release -- minor|patch
--world` en start daarna `node scripts/release_builds.mjs` voor de andere
platformen. Agents pushen, taggen en releasen niet.

### `game/js`: de modulekaart

- **Boot en loop**: `main.js` (`boot()` → kaart, scene, speler, systemen; `frame()`
  met vaste volgorde), `world.js` (het ene `World`-stateobject).
- **Wereld en streaming**: `scene3d.js`, `tileworld.js`, `tilefocus.js`,
  `tilestore.js`, `gdt.js`, `tileworker.js`; bouw via `worldbuilder.js` en
  `scripts/world/`.
- **Speler en invoer**: `player.js`, `input.js`, `controls.js`, `gamepad.js`,
  `touch.js`, `inputdevice.js`.
- **Voertuigen**: `vehicle.js` (fysica, verkeers-AI, boten, schade) plus
  `heliflight.js`, `trailer.js`, `drift.js`, `models3d_vehicles.js`.
- **Peds en dieren**: `pedestrians.js`, `pedroutes.js`, `wildlife.js`,
  `models3d_people.js`.
- **Politie en combat**: `police.js`, `combat.js`, `crime.js`, `wantedstate.js`.
- **Verhaal en missies**: `missions.js`, `story.js`, `storyarc.js`,
  `missionstory.js`, `cutscenes*.js` + `cutscript.js`/`cutscenehost.js`.
- **Samen spelen**: `coopnet.js`, `coopglue.js`, `coopworld.js`, `coopspelers.js`,
  `coophud.js` en `net/` (19 bestanden: protocol, sessie, brokers, serverlijst).
- **Opslag**: `savegame.js`, `savemigrate.js`, `storagekeys.js`, `saveslots.js`.
- **Audio**: `audio.js`, `speech.js`, `linevoice.js`, `radio.js`, `sfx/` (17).
- **UI en HUD**: `hud_panel.js`, `hudcards.js`, `hudbus.js`, `pausemenu.js`,
  `mapview.js`, `prompts.js`, `shopui.js`.
- **Gates**: `busy.js` (is de speler bezig), `activityhub.js` (elke activiteit als
  kind), `latehooks.js` (koppelslots), `hudbus.js` (wie mag het scherm).
- **Minigames en bijbanen**: per spel een pure `*rules.js` plus een glue-bestand
  (`discgolfrules.js` + `discgolf.js`, `kartrace.js` + `kartbaan.js`, enz.).

Grootste bestanden (>1500 regels, dus de risicoplekken bij wijzigingen):
`scene3d.js` 4134 · `missions.js` 3921 · `audio.js` 3556 · `vehicle.js` 3439 ·
`models3d_vehicles.js` 2905 · `hud_panel.js` 2641 · `trailer.js` 2443 ·
`mapview.js` 2338 · `missionstory.js` 2245 · `shops.js` 2061.

### Tests en audits

- **613** `*_test.mjs` (602 in `scripts/`, 11 in `scripts/coop/`) en **41**
  `*_audit.mjs`. Geen framework: elk script is een Node-programma met exitcode.
- Grootste clusters: samen spelen 67, wereld/tegels/provincie 42, verhaal en
  cutscenes 41, water en varen 35, UI/HUD/input 28, voertuigen 21, geluid 18,
  bus 13, spoor 11.
- `node scripts/test_all.mjs --fase=licht|zwaar|electron|alles`: `licht` (modulecheck,
  `import_check`, `undef_check`, `voice_coverage`, `text_audit`, dode-code-bewaking,
  alle tests behalve 8 uitgesloten), `zwaar` (31 wereld-audits, één tegelijk),
  `electron` (12 stappen, inclusief de verhaaltest met `--story-test`).
  Schatting: 5–15 min, 20–60 min, 1–2 uur.
- Zware audits: `ring_probe` (obstakels op de ring), `seat_audit` (figuur in elke
  stoel), `prop_conflict_audit` (weilandranden en vee tegen spoor/weg/water/huis),
  `drive_audit` (elke weg met de echte autofysica), `junction_sim_test`,
  `network_drive_test`, water- en spooraudits.

### Documentatie

Naast de rootbestanden (`ARCHITECTURE.md` als kaart, `DESIGN_SYSTEM.md`,
`CONTRIBUTING.md`, `CHANGELOG.md`) staan in `docs/` onder meer `TESTEN.md`,
`RELEASEN.md`, `ONTWIKKELEN.md`, `MULTIPLAYER-VISIE.md`, `COOP-*.md`,
`KANALEN.md`, `ISSUE-STAND.md`, `LICENTIES.md`, `MERKENREGISTER.md`,
`PRIVACY-EN-CREDITS.md` en `PUBLICATIECHECKLIST.md`.

### De FIRE-laag (nieuw)

`.specs-fire/state.yaml` (brownfield, multi-part, balanced) en vijf standaarden in
`.specs-fire/standards/`: constitutie (verwijst naar AGENTS.md), tech-stack,
coding-standards, testing-standards, system-architecture. De rolverdeling met
UltraCode staat in [SPECS-FIRE.md](SPECS-FIRE.md).

## Deel B — Wat niet voldoet

Elke regel hieronder is door mij in de bron gecontroleerd, niet alleen door de scan
gemeld.

| # | Afspraak | Bevinding | Ernst |
| --- | --- | --- | --- |
| B1 | R1: spelertekst is Nederlands | Bushud toont `Kneel`, ook als label van de knop | bug, klein |
| B2 | R1 | Discgolf toont `Driver` / `Midrange` / `Putter` in de aim-HUD | bug, klein |
| B3 | R1 | Skatepark-statistiek heet `Grinds` tussen Nederlandse labels | bug, klein |
| B4 | R1 | 3D-plaquette in de Martinitoren zegt "Made with ♥ in Groningen" | bug, klein |
| B5 | Multiplayer-naamgeving | Nieuwe bestanden (23–25 okt) heten alsnog `coop*` | wens, technisch |
| B6 | R3: altijd zomer | Twee ongebruikte winterregels in de audiobank | klein, opruimen |
| B7 | R2 + Steam | Credits-disclaimer noemt Rockstar/Take-Two/GTA | al open bij #72, eigenaar |

**B1** `game/js/busbestuurhud.js:34` zet `<i>Kneel</i>` in de HUD en `:97` wisselt
naar `Kneel`/`Omhoog`; `game/js/touchlogic.js:122` gebruikt dezelfde naam voor het
pictogram. "Knielt" of "Bus laten zakken" past bij de rest van de bediening.

**B2** `game/js/discgolfrules.js:36-38` (`name: 'Driver'`, `'Midrange'`,
`'Putter'`), getoond via `game/js/discgolf.js:701`. Discgolftermen zijn
internationaal, maar de HUD verder is Nederlands; kies bewust: vertalen
("afstand", "mid", "putter") of expliciet als vakterm toestaan in
`scripts/text_audit_allow.json`.

**B3** `game/js/skatepark.js:426` in de statistiekregel. "Grinds" is
skatejargon; zelfde keuze als B2 — vertalen of allowlisten.

**B4** `game/js/geheimen.js:145` (`fillText('Made with', …)`) en `:430` citeert
die tekst in de ontdekt-regel. De grap werkt ook in het Nederlands.

**B5** `game/js/cooppvpwereld.js` en `game/js/coopwedstrijd.js` zijn op 25-10
toegevoegd, dus na de regel dat nieuwe code "multiplayer" zegt;
`game/js/coophostwisselui.js` is van 23-10. De UI zegt al netjes "Samen spelen".
Hernoemen mag per bestand zodra je het toch aanraakt (met imports en tests mee);
geen haast, wel bijhouden.

**B6** `game/audio/voicelines/lines/tts.json:9942` ("Nee. Van de winter ook
niet.") en `game/audio/voicelines/banter/tts.json:5762` ("Die vinden we in de
winter wel terug."). Geen JS verwijst ernaar; het zijn losse opnames. Omdat nieuwe
TTS een eigenaarsbesluit vraagt: alleen opruimen, niet heropnemen.

**B7** `game/js/credits.js:9`: de disclaimer noemt "Rockstar Games of Take-Two
Interactive, de uitgever van GTA". Staat op de allowlist van `text_audit` en is al
als open punt beschreven in `docs/STEAM-CHECKLIST.md:23`, met een tekstvoorstel op
#72. Geen nieuwe vondst, wel de enige echte R2-afwijking in speltekst.

**Schoon bevonden:** opslagsleutels (alles `gde-*` via `storagekeys.js`, `gte-`
alleen in de migratie), secrets (geen `.env`, geen sleutels, alleen
`scripts/secrets_scan.mjs`), externe endpoints (alleen de goedgekeurde STUN,
brokers en `gtfs.ovapi.nl`, plus CDN-leesopvragen voor Three.js en fonts).

## Deel C — Wat er niet is

Deze gaten zijn geen overtredingen, maar ze betekenen wel dat "alles in kaart" een
grens heeft.

1. **Geen enkele test voor de webversie.** `web/build.mjs`, `web/web.js`,
   `web/sw.js` en `web/serve.mjs` komen in geen test voor, alleen in de
   modulecheck. Er is ook geen test die web- en desktopgedrag vergelijkt.
2. **De 11 tests in `scripts/coop/` draaien niet in de lichte fase** (die leest
   alleen `scripts/*_test.mjs`); ze hangen aan de 20-minuten testbank in de
   electron-fase.
3. **79 van de 847 modules in `game/js` worden door geen enkel script genoemd** —
   vooral renderlagen (`*3d.js`, `*layer3d.js`) en losse verhaalmdules. Ze worden
   Indirect gedekt via de verhaaltest, niet gericht.
4. **174 van de 296 niet-testscripts worden door geen gate aangeroepen**; een deel
   zijn handmatige QA- en perftools, maar ook audits zonder bewaking
   (`clearance_audit`, `markt_audit`, `mesh_audit`, `missiongoals_audit`,
   `overhang_audit`, `passage_audit`, `pad_input_audit`, `swim_audit`,
   `world/kerk_audit`, `world/hedge_tile_audit`).
5. **Geen linter of formatter**; stijl leunt op `node --check` en op de
   omliggende code.
6. **De electron-fase is volgens `docs/TESTEN.md` zelf nooit op deze machine
   uitgeprobeerd** — de duur en de slagingskans zijn schattingen.
7. **`game/stad.json` komt uit OSM en kan winkelnamen bevatten.** De render padt
   volgens `game/js/facilities.js:7` verzonnen namen (soort + plaats), maar of
   geen enkel pad de ruwe namen toont, is niet geverifieerd. Open vraag, geen
   bevinding.

## Prioriteit

1. **B1–B4** zijn vier kleine, echte schendingen van "alles Nederlands"; samen één
   bug-issue met vier regels werk.
2. **B5** is technische schuld met een duidelijke regel; per bestand meenemen.
3. **B6** is opruimen van ongebruikte opnames.
4. **B7** wacht op de eigenaar (#72).
5. **C1 en C2** zijn de twee gaten met de meeste kans op stille regressies: de
   webversie en de coop-tests buiten de lichte fase.
