# Overdracht (stand 18 oktober 2026, release 0.35.0)

Voor wie het project overneemt (een andere AI of machine). Lees dit eerst, daarna `AGENTS.md` (regels en werkwijze), `README.md` en `ARCHITECTURE.md`.

## 1. Wat je krijgt met `git clone` en wat niet
**In git:** alle code, de data die versiebeheer nodig heeft (`game/citymap.json`, `data/world/3dbag*.json.gz`, facilities enz.), alle documenten (`docs/`), de scripts, de tests, het nieuwe verhaal (`docs/verhaal/nieuw/`, het script in `game/storydata/script.json`), `AGENTS.md`.
**Op GitHub, niet in git:** de issues, het bord (project 5 van NatusPella, kolommen Bugs, Wensen, Bezig, Review, Klaar), de milestones (de epics) en de releases met de builds. Daarvoor heb je `gh` nodig, ingelogd met de rechten `repo`, `project` en `read:project`.
**Niet in git en dus op de nieuwe machine opnieuw te maken:**
- `desktop/node_modules`: `cd desktop && npm install`.
- `desktop/vendor-cache` (three.js en lettertypen): `cd desktop && npm run stage` haalt ze op (netwerk nodig). Gebruik in tests een ECHTE map, nooit een symlink: een symlink verandert de simulatie en verbergt fouten.
- `data/cache/` (89 MB, provincie-extracten van Geofabrik en de 3D BAG-scratch): nodig om de provinciegegevens opnieuw te bouwen (`scripts/world/build_province.mjs`, `scripts/world/extract_province.py`, `scripts/world/fetch_3dbag.py --province`). Zonder `data/cache` werken de meeste tests en het spel nog wel; alleen een volledige tegelbouw niet. Zie `docs/ONTWIKKELEN.md` en `docs/PROVINCIE-PLAN.md`.
- `game/world/` (de tegels): wordt bij het bouwen gemaakt door `npm run stage` (ongeveer 2 tot 3 minuten).
- `.env` met de OpenRouter-sleutel: alleen voor de TTS-scripts. Die sleutel hoort vervangen te worden (issue #36, taak van de eigenaar). Nooit lezen of committen.
- De geheugenbestanden van de vorige AI (`~/.claude/projects/.../memory/`): niet overgedragen; de belangrijkste afspraken staan hieronder en in `AGENTS.md`.
**Lokale branches die niet op `main` zitten** (halfwerk van gestopte agents) zijn als `wip/...` naar GitHub gezet: `wip/treinmachinist-14`, `wip/landmarks-21`, `wip/winter-schepen-32-7`.

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
- **Spel:** de hele provincie draait op tegels (de Ommeland-laag is weg); de stad draait nog op `game/citymap.json` (issue #90: stad via het tegelpad, plan in `docs/ARCHITECTUUR-STAD-NAAR-TEGELS.md`, met de besluiten van de eigenaar onderaan).
- **Verhaal:** het nieuwe verhaal (vijf akten, 26 missies) staat in `docs/verhaal/nieuw/` (begin met `HET-VERHAAL.md` en `00-OVERZICHT.md`). In het spel is alleen akte 1 gebouwd (tweede verhaallijn naast het klassieke, keuze in Instellingen › Verhaal; nu standaard). Akten 2 tot en met 5 zijn stubs ('Akte 2 volgt'). Implementatieplan: `docs/verhaal/nieuw/08-IMPLEMENTATIE.md`. Het script wordt omgezet door `scripts/build_story_data.mjs`.
- **Trailer:** `docs/verhaal/nieuw/TRAILER-SCRIPT.md` (spoilervrij; nog niet in de game gebouwd).
- **Issues:** bekijk de milestones: Tegelwereld werkt, Levende open wereld, Verhaal Deel 4 en missies, Provincie leeft, Publiceren en 1.0, Afwerking en menu's. Open vragen aan de eigenaar: #92 (UI-smaakvragen), #81 (teleport-fout bij het Lauwersmeer: retest in 0.35.0), #93 (verhaal).
- **Bekende gaten:** zichtbare Waddenzee/Noordzee in de wereld, het vliegtuig als nieuw voertuig (spawn op echte vliegvelden), `building:part` ontbreekt in de OSM-extract, de game leest de kruispunt- en lichtgegevens van de provincie nog niet, #114 en #115 en #2 en #3 wachten op een beeldcheck.

## 5. Valkuilen
- Test nooit met een symlink als `desktop/vendor-cache`; maak nooit een symlink in een map die al bestaat.
- `MISSION_IDS` in `storyarc*.js` en de opslagsleutels: alleen toevoegen, nooit herordenen of hernoemen zonder migratie; saves hebben een arc-id ('oud' of 'nieuw').
- Spreekregels die al zijn opgenomen mogen niet wijzigen (`voice_coverage` bewaakt dat); het briefje "Tige tank! – J." blijft zoals het is.
- Zet geen persoonlijke gegevens in de repo; alleen NatusPella in credits.
