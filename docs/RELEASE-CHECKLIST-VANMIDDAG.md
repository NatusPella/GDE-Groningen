# Releasechecklist voor vanmiddag (20-11, speeltest met vier om 13:00)

> Naslag voor de coördinator. De regels staan in [RELEASEN.md](RELEASEN.md) en [RELEASEGATE.md](RELEASEGATE.md); bij verschil wint [AGENTS.md](../AGENTS.md). Dit is alleen de volgorde, met de valkuilen uit eerdere releases. Er is niets gereleased, getagd of gepusht door wie dit schreef.

## Stand bij het opstellen

- Laatste tag: `v0.63.0`; `desktop/package.json` staat op 0.63.0. Er is dus nog nooit een 0.64.0 getagd, ook al stond er al een `## [0.64.0] - 2026-11-17`-blok in de changelog. Dat blok is samengevoegd met `[Unreleased]` tot één `## [0.64.0]`-sectie (Nieuw, Verbeterd, Opgelost). `[Unreleased]` is leeg en wacht op wat er nog bij komt.
- Versie: **minor** (nieuwe functies: Samen spelen met kamercode, opening, taxicabine, missie-aankleding), dus 0.63.0 naar **0.64.0** (zie het geheugen `semver-releases`).
- Nieuwe fixes na dit opstellen: voeg ze toe aan de `0.64.0`-sectie (of onder `[Unreleased]` en verplaats ze) vóór de gate draait.

## Volgorde

Werk in de schone merge-werkmap (`<MERGE-WERKMAP>`, main, schone werkboom). Geen andere Electron-instantie tegelijk, geen nieuwe agents tijdens de bouw.

1. **Voorbereiding**
   - `git status` schoon, `git pull`, `git log v0.63.0..HEAD --oneline | wc -l` om te zien wat erin zit.
   - `node scripts/secrets_scan.mjs` (werkboom en geschiedenis).
   - Kopieer `data/cache` uit de hoofdmap als die in de merge-werkmap ontbreekt (circa 155 MB).
   - `cd desktop && npm ci`.
2. **Changelog definitief:** de datum in `## [0.64.0] - 2026-11-20` controleren, nieuwe fixes erbij, committen. Controle: `node scripts/changelog_section.cjs 0.64.0` geeft de notities en `node scripts/release_docs_test.mjs`.
3. **Stage:** `cd desktop && npm run stage` (bouwt de hele provincie uit `data/cache`, circa 15 minuten; stage-lock vasthouden).
4. **Releasegate** (met de verplichte AI-code-review, ADR 0034), vanuit de repo-root:
   - `node scripts/release_gate.mjs --plan --from=v0.63.0`
   - `node scripts/release_gate.mjs --stage=auto --from=v0.63.0`
   - de AI-reviewers draaien, bevindingen dichten (zie RELEASEGATE.md)
   - `node scripts/release_gate.mjs --verify`

   Zonder groen rapport bouwt `release.sh` niet. De nooduitgang `GDE_RELEASE_SKIP_GATE=1` alleen met akkoord van de eigenaar. Bij tijdnood geldt het besluit van de eigenaar: een werkende release met wat er is.
5. **Eén Electron-verhaaltest** (`--story-test=<dir>`); NaN-waarschuwingen in geometrie laten die falen.
6. **Release lokaal (Windows-exe en wereld):**
   - Zet `gh` op het PATH: `export PATH="$PATH:/c/Program Files/GitHub CLI"`, anders stopt `release.sh` met exit 127 na tag en push.
   - `cd desktop && npm run release -- minor --world` (of `sh release.sh minor --world`). Dit draait eerst `node scripts/run_tests.mjs` (nooduitgang `GDE_RELEASE_SKIP_TESTS=1`, alleen met reden), maakt de versiebump, de tag, de exe `GDE-Groningen-0.64.0-windows-portable.exe` en `gde-world.tgz`, en zet de release als pre-release neer.
   - Het script reageert op issue #116 (playtest) met de medewerkers; niet in de notities.
7. **Actions-builds** (macOS, Linux, Android; de workflows moeten op `main` staan en de owner-guard laat alleen de eigenaar bouwen): `node scripts/release_builds.mjs v0.64.0`. Dat start alle workflows via `workflow_dispatch`, wacht, start een door de runner geannuleerde run één keer opnieuw en zet de installatieregels onderaan de notities. Los te starten: `gh workflow run mac-release.yml -f tag=v0.64.0` (ook `linux-release.yml`, `android-release.yml`). Besluit eigenaar 20-11: alle platforms, publieke repo, geen Actions-limiet.
8. **Installatietest** op een schone map of machine: download de exe van de release, start hem (niet ondertekend, dus Windows kan om bevestiging vragen), nieuw spel: de opening verschijnt en is met spatie over te slaan; hoofdmenu toont 0.64.0.
9. **Samen-spelen-rooktest** (zie [SPEELGIDS-4-SPELERS.md](SPEELGIDS-4-SPELERS.md) en [SPEELGIDS-VIER-SPELERS.md](SPEELGIDS-VIER-SPELERS.md)): host opent, twee of drie gasten voegen toe met de kamercode, spelerslijst (Tab) klopt, gast blijft langer dan een minuut verbonden, een gast valt weg en verbindt opnieuw. Alle spelers dezelfde versie. De kamercode-route is met echte Electron-instanties alleen op één computer bewezen; over echt internet nog niet.
10. **Opruimen en melden:** `rm -rf desktop/dist desktop/build` na de upload; comment op issue #116 met de uitslag; bord bijwerken (Klaar). Het geheugen bijwerken met de stand.

## Valkuilen (uit eerdere releases)

- **`gh` niet op het PATH** van Git Bash: PATH aanvullen (stap 6) of het volledige pad `"C:/Program Files/GitHub CLI/gh.exe"` gebruiken.
- **Geen junction `game/world` naar `desktop/build/game/world`** in de merge-werkmap: stage kopieert dan een symlink naar zichzelf en de bouw stopt na "vendored fonts" zonder fout (exit 0). Verwijder zo'n koppeling eerst: `cmd //c "rmdir game\\world"`.
- **Halverwege gestopt** na de versiebump (er staat al een commit, nog geen tag): hervat met `sh release.sh current --world`, met de stage-lock vast.
- **`test_all.mjs`** negeert positionele argumenten: gebruik `--fase=` of `--only=`. De Electron-fase draait op de gestagede build, dus eerst `npm run stage` na elke merge. De licht-fase hoort bij de gate (static), niet los vooraf als er geen tijd is.
- **Notes-extractie:** gebruik node (`scripts/changelog_section.cjs`), niet awk met `\[`.
- **Electron na een pc-herstart** crasht bij opstarten (exit 2147483651) zonder `--no-sandbox --in-process-gpu`; geef `GDE_ELECTRON_FLAGS` mee en een profielmap via `GDE_PROFILE_DIR`, buiten de Bash-sandbox. Gebruik een uitvoerpad zonder de worktreenaam in de opdrachtregel.
- **Electron-runs langer dan circa 170 s** in de Bash-tool worden gethrottled: draai ze op de achtergrond en lees de log.
- **Alleen één Electron-instantie tegelijk**; filter bij `tasklist` op `--smoke-test` of `--perf-script` in de commandoregel, want ook andere apps tellen mee. Een opruimscript mag nooit andermans Electron doden.
- **macOS-runner vol:** de job wordt geannuleerd zonder kosten; opnieuw starten (het script doet dat één keer zelf).
- **Wereldstructuur gewijzigd** na de laatste `gde-world.tgz`: opnieuw met `--world`, anders bouwen de runners een oude kaart.
- **Geheimen:** `.env` nooit lezen of committen.

## Wat nog niet gedaan of bekend rood is (20-11)

- Geen beeldbewijs voor een deel van de hertest-issues (zie [HERTEST-TRIAGE.md](HERTEST-TRIAGE.md)); de triage meldt vier rode tests die bij andere lopende werkzaamheden horen (`voice_lookup_audit_test`, `buildonly_test`, `firstperson_test`, `menu_issues_062_test`). Kijk of de gate ze nog meldt.
- Host-overname bij wegvallen van de host is alleen in code getest, niet over echte WebRTC.
- De TTS-ronde voor de gaten staat nog open (eigenaarsbesluit: eerst de tekstronde).
