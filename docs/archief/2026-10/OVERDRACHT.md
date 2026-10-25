> **Archief (oktober 2026).** Dit document is vervangen door `AGENTS.md` (Context per sessie) en de GitHub-issues.
> Het staat hier alleen als historie: gebruik het niet als bron en werk het niet bij.
> Relatieve links in dit document verwijzen naar de oude plek in `docs/` en
> werken hier niet meer.

# Overdracht (stand 18 oktober 2026, laatste release 0.35.0, daarna veel op main)

Voor wie het project overneemt (een andere AI of machine). Lees dit eerst, daarna `AGENTS.md` (regels en werkwijze), `README.md` en `ARCHITECTURE.md`.

## 1. Wat je krijgt met `git clone` en wat niet
**In git:** alle code, de data die versiebeheer nodig heeft (`game/stad.json`, `data/world/3dbag*.json.gz`, facilities enz.), alle documenten (`docs/`), de scripts, de tests, het nieuwe verhaal (`docs/verhaal/nieuw/`, het script in `game/storydata/script.json`), `AGENTS.md`.
**Op GitHub, niet in git:** de issues, het bord (project 5 van NatusPella, kolommen Bugs, Wensen, Bezig, Review, Klaar), de milestones (de epics) en de releases met de builds. Daarvoor heb je `gh` nodig, ingelogd met de rechten `repo`, `project` en `read:project`.
**Niet in git en dus op de nieuwe machine opnieuw te maken:**
- `desktop/node_modules`: `cd desktop && npm install`.
- `desktop/vendor-cache` (three.js en lettertypen): `cd desktop && npm run stage` haalt ze op (netwerk nodig). Gebruik in tests een ECHTE map, nooit een symlink: een symlink verandert de simulatie en verbergt fouten.
- `data/cache/` (89 MB, provincie-extracten van Geofabrik en de 3D BAG-scratch): nodig om de provinciegegevens opnieuw te bouwen (`scripts/world/build_province.mjs`, `scripts/world/extract_province.py`, `scripts/world/fetch_3dbag.py --province`). Zonder `data/cache` werken de meeste tests en het spel nog wel; alleen een volledige tegelbouw niet. Zie `docs/ONTWIKKELEN.md` en `docs/PROVINCIE-PLAN.md`.
- `game/world/` (de tegels): wordt bij het bouwen gemaakt door `npm run stage` (ongeveer 2 tot 3 minuten).
- `.env` met de OpenRouter-sleutel: alleen voor de TTS-scripts. Die sleutel hoort vervangen te worden (issue #36, taak van de eigenaar). Nooit lezen of committen.
- De geheugenbestanden van de vorige AI (`~/.claude/projects/.../memory/`): niet overgedragen; de belangrijkste afspraken staan hieronder en in `AGENTS.md`.
**Lokale branches die niet op `main` zitten** (halfwerk van gestopte agents) zijn als `wip/...` naar GitHub gezet: `wip/treinmachinist-14`, `wip/landmarks-21`, `wip/winter-schepen-32-7`.

## 1b. Nieuwe Windows-machine, stap voor stap
Getest is dit op macOS; de stappen hieronder zijn de Windows-vertaling. `docs/ONTWIKKELEN.md` heeft een tabel van welke scripts waar werken ("Git Bash" betekent een POSIX-shell op Windows, dus Git Bash of WSL, niet PowerShell of cmd), en `docs/RELEASEN.md` beschrijft het release op Windows.
1. **Installeren:** Git for Windows (met Git Bash), Node.js (zelfde grote versie als op de Mac: 26.x), Python 3 en de GitHub CLI. Daarna `gh auth login` en `gh auth refresh -s project,read:project` (voor het bord).
2. **Clonen:** `git clone https://github.com/NatusPella/GDE-Groningen.git` en `cd GDE-Groningen`. `.gitattributes` zet de regeleindes goed (sh en mjs blijven LF); verander `core.autocrlf` niet.
3. **Bouwen:** `cd desktop`, `npm install`, `npm run stage` (haalt three.js en lettertypen op in `desktop/vendor-cache`, bouwt de tegels en bundelt het spel; de eerste keer een paar minuten).
4. **De provinciegegevens (`data/cache`)** staan niet in git. Een reservekopie (72 MB, zonder de Python-venv) staat als bijlage bij het concept-release `data-cache-backup`. Haal hem op met `gh release download data-cache-backup --repo NatusPella/GDE-Groningen --pattern data-cache.tgz` en pak hem uit in de repo-map met `tar -xzf data-cache.tgz -C data` (Windows 10 en later heeft `tar`). Is er een Python-venv nodig (sommige scripts in `scripts/world/`), maak die opnieuw: `python -m venv data/cache/venv`. Zonder `data/cache` werkt het spel en bijna alle tests, maar een volledige tegelbouw (en dus een release met de provinciekaart) niet.
5. **`.env`** (OpenRouter-sleutel) is er alleen nodig voor de TTS-scripts en wordt nu niet gebruikt. Kopieer hem zelf (nooit via git); de sleutel moet sowieso vervangen worden (issue #36).
6. **Spelen:** in Git Bash `sh scripts/play_local.sh`; in PowerShell: `cd desktop; $env:GDE_TEST_PROFILE="gde-lokaal"; .\node_modules\.bin\electron.cmd . --windowed`.
7. **Testen:** `node scripts/run_tests.mjs` (een set in één keer, gewone `node`), of per bestand `node scripts\<naam>_test.mjs`. Zware tests en de Electron-verhaaltest bij het release (zie sectie 2).
8. **Releasen op Windows:** `cd desktop && npm run release -- minor|patch --world` bouwt de Windows-exe en `gde-world.tgz`; de Mac-, Linux- en Android-builds komen uit Actions met `node scripts/release_builds.mjs` (zie `docs/RELEASEN.md`). Een Mac-dmg kan niet op Windows gebouwd worden.

## 2. Starten en testen
- Lokaal spelen: `sh scripts/play_local.sh` (testprofiel, nieuw verhaal aan; `--echt` voor je eigen profiel, `--vers` om opnieuw te beginnen).
- Alle tests: `for t in scripts/*_test.mjs; do node $t || echo FAIL $t; done` (gewone `node`, macOS heeft geen `timeout`), plus `node scripts/voice_coverage.mjs --quiet`, `node scripts/junction_sim_test.mjs` (moet 17/17 zijn) en `node scripts/world/drive_audit.mjs` (norm: ongeveer 2 botsingen).
- Zware tests (`province_test` met een timingdrempel 'decode p95', die onder belasting toevallig faalt: dan apart herhalen) en de Electron-verhaaltest draai je bij het maken van een release, niet per kleine wijziging.
- Release: `cd desktop && npm run release -- minor|patch` (macOS en Windows; Linux staat voorlopig uit, `--linux` toevoegen als het moet). Het script heeft een `## [X.Y.Z]`-sectie in `CHANGELOG.md` nodig en een schone werkboom, en plaatst een comment met vermelding van de testers op issue #116.
- Eén Electron-instantie tegelijk; wegwerpprofiel via `GDE_TEST_PROFILE`; raak poort 9000 en een geïnstalleerde app nooit aan.

## 3. Afspraken van de eigenaar (naast `AGENTS.md`)
- Prioriteit: eerst `bug`, dan wensen op hoge impact en lage kosten; elk issue is een `bug` of `wens` met één impact- en één kostenlabel; epics zijn milestones (geen versienummers).
- Roadmap en backlog staan alleen in GitHub-issues, niet in markdown in git.
- Geen TTS-uitgaven tot de eigenaar het zegt: nieuwe of herschreven regels blijven tekst (ondertitel). Nooit de TTS-scripts draaien.
- Niets openbaar maken zonder akkoord (repo-zichtbaarheid, Pages, YouTube, posts). De repo is privé; het playtest-issue is #116.
- Releases zonder Linux, met vermelding van de testers in #116 (niet in de releasenotities).
- Meten alleen als er een prestatieprobleem is gemeld; geen zware benchmarktools.
- Echte merken en personen komen nooit in speltekst; altijd zomer; alleen Nederlands; "Grunn", nooit "de Grunn".
- Subagents: eigen worktree en branch, kleine commits, alleen eigen tests; de coördinator test en merget bij het release. Houd de schijf vrij.

## 4. Waar het project staat
- **Spel:** de hele provincie draait op tegels (de Ommeland-laag is weg); ook de stad komt uit het tegelpad (issue #90): `game/stad.json` (0,2 MB handlaag) plus wegen, spoor, gebouwen, water, groen en bomen uit de OSM-tegelbouw; `citymap.json` en de Python-keten zijn weg (plan en stand in `docs/ARCHITECTUUR-STAD-NAAR-TEGELS.md`).
- **Verhaal:** het nieuwe verhaal (vijf akten, 26 missies) staat in `docs/verhaal/nieuw/` (begin met `HET-VERHAAL.md` en `00-OVERZICHT.md`). Het is het enige verhaal: het oude verhaal en de keuze ertussen zijn verwijderd (#187). Wat gebouwd is staat in `game/js/storyarc_nieuw.js` (`built`). Implementatieplan: `docs/verhaal/nieuw/08-IMPLEMENTATIE.md`. Het script wordt omgezet door `scripts/build_story_data.mjs`.
- **Trailer:** `docs/verhaal/nieuw/TRAILER-SCRIPT.md` (spoilervrij; nog niet in de game gebouwd).
- **Issues:** bekijk de milestones: Tegelwereld werkt, Levende open wereld, Verhaal Deel 4 en missies, Provincie leeft, Publiceren en 1.0, Afwerking en menu's. Open vragen aan de eigenaar: #92 (UI-smaakvragen), #81 (teleport-fout bij het Lauwersmeer: retest in 0.35.0), #93 (verhaal).
- **Bekende gaten:** zichtbare Waddenzee/Noordzee in de wereld, het vliegtuig als nieuw voertuig (spawn op echte vliegvelden), `building:part` ontbreekt in de OSM-extract, de game leest de kruispunt- en lichtgegevens van de provincie nog niet, #114 en #115 en #2 en #3 wachten op een beeldcheck.

## 4b. Nieuw sinds 0.35.0 (alleen onder `[Unreleased]`, nog niet vrijgegeven)
Rond de 70 branches zijn in één dag op `main` gemerged. Wat je moet weten (details per module in `ARCHITECTURE.md`, "Modules sinds 0.35"):
- **Eén poort voor "is de speler bezig":** `busy.js` (`playerBusy`) en `activityhub.js` (register voor activiteiten, bijbanen, postgame en uitjes). Nieuwe code vraagt de poort, maakt geen eigen lijst met `world.xxx`-vlaggen.
- **Eén planner voor wat de aandacht vraagt:** `hudbus.js`; `hudlook.js` is de visuele taal van de HUD; `voicebank.js` is de ene loader voor voice-manifesten.
- **Cutscenes zijn data:** `cutscript.js` (regietaal) + `cutscenehost.js` + `actoranim.js` + `cutscenes.js`.
- **Wanted, verkeer, simulatie:** `wantedstate.js` (rustig, achtervolging, zoeken), `simlagen.js` (standaard aan, `?zonderlagen`), simulatie-worker `simhost.js`/`simkernel.js`/`simworker.js` (standaard aan, `?zonderworker`; nog niet aan `main.js` gekoppeld), `spatialgrid.js` onder alle ruimtelijke indexen (#111).
- **Kaart:** `mapstyle.js` is de ene stijltabel voor minimap, grote kaart, provinciepiramide en zee; `regions.js` en `regiondata.js` kennen de provincie en wat eromheen ligt.
- **Laden, invoer, mobiel:** `loadlogic.js` (laadschermen), `padlogic.js` en `glyphs.js` (controller), `touchlogic.js` (raakbediening).
- **Verhaal:** reisbeats (`reisbeats.js`, `reiskeuze.js`, `reistijd.js`, achter `?reizen`), drie keuze-zijmissies; `?coop` (`coop.js`) voor twee spelers. De stad komt uit het tegelpad (#90): geen schakelaar meer.
- **Wereld en leven:** machinist, vrachtbijbaan met oplegger, bus-sim, binnenvaart en jachthavens, motoren in het verkeer, lekke band, verkeersruzie, weer per streek, spookauto's, Kroketkoning, stadsprofielen en streekleven. Zie `CHANGELOG.md`.
- **Gereedschap:** `scripts/run_tests.mjs` (alle tests in één keer, `--quick`), `scripts/text_audit.mjs` (constitution-controle op speltekst), `.github/workflows/test.yml` (CI op Linux en Windows), `scripts/lib/loadworld.mjs` (`WORLD_SRC=json|tiles`), `desktop/devtools.js` (debug-harnas, alleen unpackaged of `GDE_DEV=1`) en `desktop/args.cjs`/`envcompat.js`.
- **Nog niet vrijgegeven:** `[Unreleased]` in `CHANGELOG.md` is de lijst voor de volgende release; het versienummer kiest de coördinator.
- **Nog niet in beeld bekeken** (agents draaiden vooral code en tests): laadschermen, nieuwe HUD, binnenin-camera, jachthavens en binnenvaart, skateboarders en kennismakingsgroep, touchbediening. Zie de comments in de issues.

## 5. Valkuilen
- Test nooit met een symlink als `desktop/vendor-cache`; maak nooit een symlink in een map die al bestaat.
- `MISSION_IDS` in `storyarc*.js` en de opslagsleutels: alleen toevoegen, nooit herordenen of hernoemen zonder migratie; een save van het oude verhaal (arc 'oud', of zonder arc) wordt bij het laden een save van het nieuwe verhaal (`savemigrate.js` stap 9: spullen blijven, het verhaal begint opnieuw, melding bij het laden); `oudmigratie.js` kopieert eenmalig de save en de prestaties van `gde-save-v1`/`gde-prestaties-v1` naar de `-nieuw`-sleutels en laat de oude sleutels staan. De oude missie-ids staan in `storyarc_basis.js`; de missies die het verhaal niet meer speelt zijn lege plekken (`retiredDef` in `missions.js`). Stemopnames van het oude verhaal staan nog op schijf (opruimen is #76).
- Spreekregels die al zijn opgenomen mogen niet wijzigen (`voice_coverage` bewaakt dat); het briefje "Tige tank! – J." blijft zoals het is.
- Zet geen persoonlijke gegevens in de repo; alleen NatusPella in credits.
- **Windows en regeleinden:** `core.autocrlf=true` zet bestanden in de werkmap op CRLF; `.gitattributes` zet `*.sh`, `*.mjs` en `*.js` vast op LF (#144). Tests die tekstbestanden lezen of vergelijken moeten daar tegen kunnen (`\r?\n`); importeer met `pathToFileURL` voor `file://`-URL's. Bewerk je een CRLF-bestand met een tool die LF verwacht, controleer dan met `git diff --stat` dat niet het hele bestand veranderde.
- **Nieuwe opslagsleutel (`gde-*`):** altijd registreren in `game/js/storagekeys.js` (`BASE_KEYS`; een sleutel die per verhaallijn verschilt ook in `ARC_KEYS`) en laat `scripts/storage_migration_test.mjs` en `save_migration_test.mjs` slagen. Tests blokkeren `localStorage` voor `gde-save-v1`, `gde-settings` en `gde-prestaties-v1`.
- **Nieuwe URL-schakelaar:** alleen in `FLAGS` en `FLAG_DOCS` van `devflags.js` (`devflags_test` bewaakt de lijst) en in `docs/ONTWIKKELEN.md`; een nieuwe `window.__x`-hook ook daar noteren.
- **"Bezig"-controles:** gebruik `playerBusy` uit `busy.js`; voeg een reden toe in plaats van een nieuwe lijst. `busy_test` dekt de redenen.
- **Hulpjes die al bestaan:** `rng.js` (`hash2`, `mulberry32`, `rand`), `util` (meetkunde), `canvastex.js` (canvas-texturen), `SpatialGrid` (ruimtelijke opzoeking), `tileplace.nearestOnRoads` (dichtstbijzijnde weg), `waterPolyAt` (waterpolygoon). Geen lokale kopieën.
- **Voice en tekst:** wat is ingesproken blijft tekengelijk (de sleutel is `spreker|tekst`); een bewerkte regel wordt stil. `scripts/text_audit.mjs` markeert zulke regels als `ingesproken`: rapporteer, wijzig niet. Nooit de TTS-scripts draaien.
- **Zware tests zitten niet in `run_tests.mjs`:** `province_test`, `province_detail_test`, `network_drive_test`, `junction_sim_test`, `ring_probe` en `drive_audit` draait de coördinator apart.

## 6. De provincie lokaal bouwen
Nodig voor een volledige tegelbouw (`game/world/` staat niet in git; `npm run stage` doet de gewone bouw uit de ingecheckte data). Wat hieronder staat is een download of een zwaar proces: vraag eerst akkoord van de eigenaar (AGENTS.md).
1. **Python.** Op de dev-machine stond Python niet in `PATH`. Installeer een Python met `uv` (`uv python install`) of met `winget`, en maak een venv in `data/cache/venv` (`python -m venv data/cache/venv`; installeer wat de imports bovenaan `extract_province.py` en `fetch_3dbag.py` vragen). `data/cache` staat niet in git.
2. **OSM-extract:** haal het Geofabrik-extract voor Noord-Nederland binnen (zie de kop van het script voor het bestand en de buurgebieden). `data/cache/venv/Scripts/python scripts/world/extract_province.py` maakt er de pack-caches in `data/cache/province` van.
3. **3D BAG (hoogtes en daken):** `data/cache/venv/Scripts/python scripts/world/fetch_3dbag.py --province` (tijdelijk enkele GB, CC BY-vermelding #70).
4. **Bouwen:** `node scripts/world/build_province.mjs` (opties bovenaan het script). Controleer daarna met `node scripts/world/placement_audit.mjs`, `node scripts/world/province_water_audit.mjs` en `node scripts/province_test.mjs` (de timingdrempel "decode p95" kan onder belasting falen: herhalen).
5. Op macOS en Linux is de interpreter `data/cache/venv/bin/python`. Zie `docs/PROVINCIE-PLAN.md` en `docs/ARCHITECTUUR-STAD-NAAR-TEGELS.md` voor het waarom en de tegel-indeling.

## 7. Sessies en worktrees
Elke agent-sessie werkt in een eigen git-worktree (`.claude/worktrees/<naam>`) op een eigen branch (`claude/<naam>`), in kleine commits met `Refs #n` of `Closes #n`. Agents pushen, mergen, taggen en releasen niet; de coördinator merget in `main` na de tests. Alle worktrees delen één stash: gebruik geen kale `git stash`, zet werk weg in een WIP-commit. Ruim worktrees van gemergde branches op om schijf vrij te houden. Notities tussen sessies staan buiten de repo, niet in git. Eén Electron-instantie tegelijk.

## 8. Wat de coördinator nog moet doen bij een release
1. De gewenste branches mergen in `main` (conflicten zitten meestal in `CHANGELOG.md` en `FLAGS`); `node --check` op gewijzigde JS.
2. `node scripts/run_tests.mjs` (volledig), `node scripts/voice_coverage.mjs --quiet`, `node scripts/text_audit.mjs`, en apart `junction_sim_test` (17/17), `province_test`, `drive_audit` (ongeveer 2 botsingen) en de andere zware wereldchecks.
3. Eén Electron-verhaaltest (`--story-test=<dir>`, wegwerpprofiel via `GDE_TEST_PROFILE`); NaN-waarschuwingen in geometrie laten die falen.
4. `[Unreleased]` in `CHANGELOG.md` omzetten naar `## [X.Y.Z] - datum` en nalopen dat alles erin staat wat spelerzichtbaar is; schone werkboom.
5. `cd desktop && npm run release -- minor|patch` (zonder Linux). Daarna issues op het bord naar Klaar, `Closes #n` nalopen en de testers laten vermelden in #116.
6. Niets openbaar maken zonder akkoord van de eigenaar.
