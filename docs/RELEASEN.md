# Releasen: wat lokaal, wat in Actions

> **Naslag.** De regels staan in de canonieke spec [`.specs-fire/standards/publicatie.md`](../.specs-fire/standards/publicatie.md); dit document is uitleg en geschiedenis. Bij verschil wint de spec (en bij twijfel `AGENTS.md`).

Een release is een pre-release in de privé-repo (AGENTS.md, "Releases"). De coördinator maakt hem; agents pushen, taggen en releasen niet.

## Stappen

Sinds ADR [0034](../.specs-fire/standards/adr/0034-ai-releasegate-met-bewijs.md)
gaat er één verplichte stap aan de release vooraf: de **releasegate**.
Draai vóór de bump `node scripts/release_gate.mjs --stage=auto --from=<vorige tag>`
en de AI-reviewlus zoals beschreven in [docs/RELEASEGATE.md](RELEASEGATE.md).
`desktop/release.sh` verifieert het bewaarde rapport (`--verify
--allow-release-commit`) en stopt zonder groen bewijs; de eigenaarsnooduitgang
`GDE_RELEASE_SKIP_GATE=1` staat luid in de uitvoer.

1. **Lokaal, op de Windows-machine (of in Actions, zie onder):** `CHANGELOG.md` bijwerken (sectie `## [X.Y.Z]`), schone werkboom, dan
   `cd desktop && npm run release -- minor|patch --world`.
   `release.sh` draait eerst de CI-selectie (`node scripts/run_tests.mjs`) en stopt bij een rode suite (#576; nooduitgang `GDE_RELEASE_SKIP_TESTS=1`, dan staat het in de uitvoer).
   Daarna bouwt het de Windows-exe, maakt de tag en de release en uploadt de exe en `gde-world.tgz` (de gestagede kaarttegels).
   De provinciekaart wordt alleen hier gebouwd: hij komt uit `data/cache`, die niet in git en niet op een runner staat.
2. **In Actions, met één commando:** `node scripts/release_builds.mjs` (tag = versie in `desktop/package.json`, of `node scripts/release_builds.mjs v0.38.1`).
   Het script start `windows-release.yml`, `mac-release.yml`, `linux-release.yml` en `android-release.yml` (alle vier, behalve wat als bijlage al op de release staat: de lokale exe blijft dus staan; `--only windows` bouwt hem toch in Actions) met `gh workflow run` (de workflows moeten op `main` staan), wacht tot ze klaar zijn, start een door de runner geannuleerde run één keer opnieuw, meldt per workflow de duur en de gebruikte gratis minuten, en zet de installatieregels (macOS, Linux/Steam Deck, Android-sideloaden) in een beheerd blok onderaan de releasenotities. Alleen bijlagen die er echt staan komen erin; twee keer draaien geeft hetzelfde.
   Opties: `--only windows,linux,android`, `--arm64`, `--notes-only`, `--droog` (alleen tonen), `--ref <branch>`.
   **Let op (stand 10 november 2026):** de 2000 gratis Actions-minuten van deze maand zijn op. Start voor 0.60.x alleen de lokale Windows-build en de wereld; de platformworkflows (macOS, Linux, Android) pas na de maandelijkse reset of na aankoop van extra minuten. Zie [Kosten (gratis minuten)](#kosten-gratis-minuten).
3. Bijlagen daarna: `…-windows-portable.exe` (lokaal), `…-mac.dmg`, `…-linux.AppImage`, `…-linux.tar.gz`, `…-android-debug.apk` en `gde-world.tgz` (invoer voor de runners; blijft staan). **Stand 10 november 2026:** `v0.60.3` heeft alleen de lokaal gebouwde Windows-exe, `gde-world.tgz` en `SHA256SUMS.txt`; de platformbijlagen staan nog op `v0.60.0` en volgen voor 0.60.1/0.60.2/0.60.3 pas na de Actions-reset of aankoop (zie §Kosten).

De workflows starten nooit vanzelf (alleen `workflow_dispatch`), gebruiken alleen `GITHUB_TOKEN` met `contents: write` en hebben geen geheimen. Ze bouwen uit de tag, dus een fout in de workflow zelf herstel je op `main` en start je opnieuw; de tag hoeft niet mee. Elke workflow heeft een eigen `concurrency`-groep per tag en een time-out (macOS 20, Linux 25, Android 30 min).

## Versienummers bij een release

Een release raakt deze plekken; `scripts/release_docs_test.mjs` bewaakt de eerste twee en de
versiebron.

- **`desktop/package.json` + `desktop/package-lock.json`** — de versiebron. `release.sh` doet de
  bump (`minor`/`patch`) en weigert zonder een `## [X.Y.Z]`-sectie in `CHANGELOG.md`.
- **`android/package.json` + `android/package-lock.json`** — het Android-toolpakket. `release.sh`
  zet die bij de bump gelijk aan de releaseversie; de test `release_docs_test` eist gelijkheid.
- **`android/version.properties`** — de APK-versie, gegenereerd uit `desktop/package.json` door
  `android/scripts/version.mjs` in de Android-workflow (geen tweede handmatig getal).
- **`CHANGELOG.md`** — eerst de `[Unreleased]`-regels naar `## [X.Y.Z] - datum` verplaatsen; de
  release weigert een lege sectie.
- **Documentatie met een stand-datum** — `docs/1.0-TRACK.md`, `docs/PUBLICATIECHECKLIST.md`,
  `docs/LICENTIES.md`, `docs/MUZIEK.md`, `docs/PROVINCIE-PLAN.md`, `docs/STEAM-CHECKLIST.md` en de
  versieregel in `.specs-fire/standards/publicatie.md` bijwerken zodra de versie vaststaat.
- **Web-cache** — `web/build.mjs` print `gde-<versie>-<hash>`; alleen informatief, geen invoer.

Controle vóór de tag: `node scripts/release_docs_test.mjs`, `node scripts/release_builds_test.mjs`
en `node scripts/spec_check.mjs`, plus de changelog-sectie van de nieuwe versie.

## Wie mag publiceren (#558)

Alleen de eigenaar publiceert. De vier release-workflows hebben daarvoor twee sloten:

- **Owner-guard:** de release-taak heeft `if: github.actor == github.repository_owner`. Een collaborator met push kan de workflow nog starten (dat kost alleen bouwminuten), maar de taak wordt overgeslagen en er komt niets op de release; `node scripts/release_builds.mjs` meldt dat als "overgeslagen".
- **Environment `release`:** de taak hangt aan dat environment. Zet daar één keer een verplichte beoordelaar op (GitHub → Settings → Environments → release → Required reviewers: de eigenaar). Zonder die instelling is de owner-guard het enige slot; met die instelling moet de eigenaar elke release-run ook zelf goedkeuren.

`scripts/publish_check.mjs` keurt een workflow die een release uploadt zonder environment én owner-guard af (`release-zonder-eigenaar`, FAIL), zodat een nieuwe workflow die fout niet stil kan invoeren.

Wat dit niet afdekt, en dus een eigenaarsbesluit is (hier niet gedaan): `desktop/release.sh` draait lokaal met het GitHub-account van de gebruiker, dus een collaborator met schrijfrechten kan daarmee nog steeds een release maken. Geef playtesters daarom een **pull-rol** in plaats van push, en zet **immutable releases** aan (GitHub → Settings → General → Releases): dan kunnen bestaande assets niet meer vervangen worden en is de lokale upload de enige, door de eigenaar gemaakte release. Tot dat is gedaan is dit voor de lokale route een afspraak, geen technische grendel. Releases zijn nu `immutable:false` (gemeten op 7-11); de environments bestaan nog niet (`total_count: 0`).

## Poorten vóór een release (#576)

- **Releasegate (ADR 0034).** `node scripts/release_gate.mjs --stage=auto --from=<vorige tag>`
  draait de vijf fasen met bewijs (static, world indien geraakt, perf, visual en de
  verplichte AI-code-review) en schrijft één rapport. `desktop/release.sh` verifieert
  dat rapport vóór de build met `--verify`; zonder groen bewijs geen release. Zie
  [docs/RELEASEGATE.md](RELEASEGATE.md).
- **CI op main.** De Tests-workflow draait sinds #576 ook bij een push naar `main`; op een push alleen de Linux-run (de Windows-run kost dubbele gratis minuten en draait al op elke PR). Zo staat er een groene meting op de commit waaruit getagd wordt.
- **Lokaal vóór de tag.** `desktop/release.sh` draait vóór de versiebump `node scripts/run_tests.mjs` (dezelfde selectie als CI) en stopt bij rood. Nooduitgang voor een hotfix: `GDE_RELEASE_SKIP_TESTS=1`; de uitvoer zegt dan expliciet dat de suite niet gedraaid is.
- **Tagvalidatie.** `scripts/release_builds.mjs` weigert een tag die niet `^v\d+\.\d+\.\d+$` is (de release 0.55.0 staat zonder `v`; zo'n tag valt niet stil terug op `desktop/package.json` meer).
- **Hashes.** De Windows-workflow regenereert `SHA256SUMS.txt` na zijn `--clobber`-upload, zodat de hash bij de nieuwe exe hoort en de regel van `gde-world.tgz` blijft staan.

## npm audit: dev-only build-tooling

`cd desktop && npm audit` meldt op 13-11-2026 **zes moderate** kwetsbaarheden. Ze komen alle zes uit
dezelfde advisory, [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249):
`minimatch` 7.0.0–11.0.0 heeft een denial-of-service via globparts-amplificatie. In deze keten zitten
twee kwetsbare kopieën: `@electron/universal` 2.0.3 gebruikt `minimatch` 9.0.9 en
`app-builder-lib` 26.18.1 gebruikt `minimatch` 10.2.6. De andere vier meldingen zijn dezelfde
advisory die via `electron-builder`/`dmg-builder`/`electron-builder-squirrel-windows` omhoog propageert.
`npm audit --omit=dev` geeft **0**: het is dev-only buildgereedschap en het zit niet in de app
(`desktop/package.json` `build.files` bevat geen `node_modules`; de app bevat alleen de stage-bestanden).
De DoS raakt alleen de machine die bouwt en alleen patronen die dit project zelf in de
electron-builder-config of in een dependency-naam aanlevert; er is geen productie- of spelerspad.

**Waarom geen override/upgrade.** Geprobeerd met `npm 12.2.0` op `electron-builder@26.18.1`:

- Een override voor `@electron/universal` → `minimatch ^11.0.1` werkt (die tak verdwijnt), maar
  `app-builder-lib` houdt zijn eigen `minimatch` 10.2.6; de audit blijft dan 5 meldingen. Een
  override op `app-builder-lib` zelf werd door npm niet doorgevoerd (ook niet na een verse lock of
  een herinstallatie van die tak), en een globale `minimatch ^11.0.1` raakt ook de oude
  `glob@7`/`filelist`/`dir-compare`-kopieën die de function-API van `minimatch` 3/5 verwachten.
  Zo'n boom is geen veilige override en is niet met packaging getest.
- De door npm voorgestelde `electron-builder@25.1.0` is een **major downgrade** en daarmee een
  groter release-risico dan deze buildtijdmelding.
- `electron-builder@27.0.0-alpha.14` (alpha) gebruikt nog `app-builder-lib` met
  `minimatch ^10.2.5`; `@electron/universal@3.0.6` lost de minimatch-tak op maar vraagt Node ≥22.12
  en is een major voor de macOS-universal-merge, die zonder aparte mac-packagingtest niet veilig is.

**Besluit:** dit is geaccepteerd build-toolingrisico, geen productie-afhankelijkheid en geen
spelerrisico. Geen override of versiewijziging in `desktop/package.json`/`package-lock.json`.
Bij een volgende release blijven `npm audit --omit=dev`, `node scripts/desktop_packaging_test.mjs` en
`npm run stage` groen (13-11-2026: 21 controles, stage ok). Opnieuw bekijken zodra
`electron-builder` zelf `minimatch` ≥11.0.1 meeneemt; dan is de schone route een gewone
`electron-builder`-update. Reproduceren: `cd desktop && npm audit`, `npm audit --omit=dev`,
`node scripts/desktop_packaging_test.mjs`, `npm run stage`.

## Voorstel aan de eigenaar: release-rechten (#558)

De workflows hebben twee technische sloten (owner-guard en `environment: release`, zie hierboven), maar de omgeving zelf en de rollen zijn nog niet ingesteld (gemeten 7-11: `total_count: 0`). Concreet voorstel, uit te voeren door de eigenaar:

1. **Environment met verplichte beoordeling:** GitHub → Settings → Environments → New environment `release`; zet **Required reviewers** op de eigenaar (en eventueel **Deployment branches** op `main`). Daarna moet elke release-run van een workflow door de eigenaar zelf worden goedgekeurd voordat er iets uploadt.
2. **Playtesters naar pull:** Settings → Collaborators: geef de acht push-collaborators **Read** in plaats van **Write**. Wie alleen pull heeft, kan geen release-workflow starten en geen `release.sh` met schrijfrechten gebruiken.
3. **Immutable releases aan:** Settings → General → Releases → **Immutable releases**. Dan kan een bestaande asset niet meer vervangen worden; de lokale release van de eigenaar is dan de enige die blijft staan.
4. **Controleren:** `node scripts/release_builds.mjs --droog` en een test-run van `windows-release.yml` moeten daarna op de goedkeuringsvraag stuiten; `scripts/publish_check.mjs` keurt een nieuwe workflow zonder environment én owner-guard al af (`release-zonder-eigenaar`).

Zonder stap 1 blijft de owner-guard het enige slot; zonder 2 en 3 kan een push-collaborator nog steeds lokaal een release maken of een asset vervangen. Dat is de eigenaarsbeslissing uit #558, geen technische vraag meer.

## Wat er in Actions gebouwd wordt

| Build | Workflow | Runner | Uitvoer |
|---|---|---|---|
| Windows x64 | `windows-release.yml` | `windows-latest` | `GDE-Groningen-X-windows-portable.exe`, niet ondertekend (de naam van `release.sh`) |
| macOS (universal) | `mac-release.yml` | `macos-latest` | `GDE-Groningen-X-mac.dmg`, niet ondertekend |
| Linux x64 | `linux-release.yml` | `ubuntu-latest` | `…-linux.AppImage` en `…-linux.tar.gz` (start `gde-groningen`), niet ondertekend |
| Android | `android-release.yml` | `ubuntu-latest`, JDK 21, SDK 36 | `…-android-debug.apk`, ondertekend met de debug-keystore van Gradle (geen eigen sleutel, geen Play Console) |

Alle vier nemen de wereld uit `gde-world.tgz` (`GDE_PREBUILT_WORLD`). De Android-build stagt de webversie (`web/build.mjs`, met ffmpeg voor Opus) en roept `gradlew assembleDebug` aan, zoals in `docs/ANDROID.md`. De Opus-cache (`web/.cache/opus`) en de Gradle-cache staan in `actions/cache`.

Bekende valkuilen:
- Op de Windows-runner leest GNU `tar` een pad met `D:` als een andere computer ("Cannot connect to D"): de workflow gaat eerst naar de map.
- `electron-builder` in CI heeft `--publish never` plus expliciete `--config.publish.provider/owner/repo` nodig (anders zoekt hij een GitHub-token en een git-remote).
- macOS-runners hebben soms capaciteitsproblemen en annuleren dan zonder kosten; het script probeert één keer opnieuw.
- `gradlew` verliest op Windows de uitvoerbit in git; de workflow doet `chmod +x`.
- Wordt de wereldstructuur gewijzigd, dan moet `gde-world.tgz` opnieuw met `--world` (anders bouwen de runners een oude kaart).

## Kosten (gratis minuten)

Een privé-repo op het Free-plan krijgt **2000 minuten per maand**; Linux telt 1x, Windows 2x, macOS 10x (jobs worden per job naar boven op hele minuten afgerond).

Gemeten (v0.38.1, 21 oktober):

| Workflow | Duur | Afgerond | Factor | Gratis minuten |
|---|---|---|---|---|
| `linux-release.yml` | 6,1 min | 7 | 1 | 7 |
| `android-release.yml` (koude cache) | 6,6 min | 7 | 1 | 7 |
| `windows-release.yml` (alleen x64) | 4,8 min | 5 | 2 | 10 |
| `mac-release.yml` | 3 tot 8 min (2 geslaagde runs) | 4 tot 9 | 10 | 40 tot 90 |
| **Samen, alle vier** | | | | **ca. 65 tot 115 per release** |

Die 3 tot 6% geldt bij één release per keer; op 9 november stapelden meerdere releases op één dag op en was het budget daarna op. macOS is bijna al het verbruik: draai die dus niet voor proefjes (`--only linux,android`). Een mislukte stage-stap (Android, eerste poging: 4,5 min) telt ook mee.

**Stand 10 november 2026: de 2000 gratis minuten van deze maand zijn op.** `v0.60.0` kreeg nog alle vier de platformbijlagen; `v0.60.1`, `v0.60.2` en `v0.60.3` hebben daarom alleen de lokaal gebouwde Windows-exe en `gde-world.tgz`. De platformbijlagen staan nog op `v0.60.0`; de macOS-, Linux- en Android-builds voor 0.60.1/0.60.2/0.60.3 (en verdere releases deze maand) kunnen pas na de maandelijkse reset of na aankoop van extra minuten. Windows bouwt lokaal altijd door; een Linux-build kan desnoods lokaal met `npm run release -- current --linux`, macOS en Android hebben Actions of een eigen machine nodig. Dit is een eigenaarsbesluit over geld en timing, geen codeblok.

Waarom niet alles in Actions? Windows lokaal blijft de snelste en goedkoopste keus: de exe bouwt hier in een paar minuten uit de kaart die toch al op deze machine staat, en in Actions kost hij 2x (10 gratis minuten). `windows-release.yml` is de reserve en de weg naar een Windows-build zonder deze pc (op een andere computer: `release.sh` hoeft er dan niet te draaien, alleen `gh workflow run`). De provinciebouw (ca. 15 min en veel RAM, uit `data/cache`) kan niet op een runner. Dus: **Windows en de wereld lokaal (Windows in Actions als reserve), macOS, Linux en Android in Actions** — zolang er minuten zijn. Nu de limiet op is: alleen Windows lokaal, en de platformbijlagen na de reset of aankoop. Een Linux-build lokaal kan nog steeds: `npm run release -- current --linux`, bijvoorbeeld als de Actions-minuten op zijn (`gh api /repos/NatusPella/GDE-Groningen/actions/runs` toont het verbruik; Instellingen > Billing de rest).

## ARM64 later aanzetten

Nu bouwen we alleen x64 (Windows en Linux), macOS universal (arm64 en x64 in één dmg) en de Android-APK (universeel: geen native bibliotheken, geen ABI-filter; zie `docs/ANDROID.md`). De workflows hebben wel een boolean-input `arm64` (standaard `false`) die de ARM64-variant er bij bouwt, in dezelfde run en met dezelfde tag:

- `windows-release.yml`: `electron-builder --win --arm64` (cross-build op `windows-latest`) geeft `GDE-Groningen-<v>-windows-arm64-portable.exe`;
- `linux-release.yml`: `electron-builder --linux --arm64` (cross-build op `ubuntu-latest`) geeft `GDE-Groningen-<v>-linux-arm64.AppImage` en `.tar.gz`;
- aanzetten: `node scripts/release_builds.mjs --arm64` (of `gh workflow run windows-release.yml -f tag=vX.Y.Z -f arm64=true`). Het script zet de uitleg welke variant je nodig hebt (x64 voor een gewone pc, ARM64 voor Snapdragon of een Raspberry Pi) alleen in de notities als de bijlagen er echt staan.
- Extra kosten per release: Windows-ARM ca. 5 min x 2 = 10, Linux-ARM ca. 6 min x 1 = 6 gratis minuten (geschat uit de x64-runs).

**De ARM-paden zijn niet getest**: niet op Electron 44 gebouwd in een run en niet op echte ARM-hardware gestart. Controleer bij het eerste gebruik dat de build slaagt en dat de bestandsnamen kloppen (`--config.portable.artifactName` bij Windows, `--config.linux.artifactName` bij Linux).

## Wat niet getest is

- De Windows-exe uit Actions (v0.38.1, onder een testnaam; daarna weggehaald) is gebouwd en heeft de MZ-header, maar is niet gestart; hij is even groot als de lokale exe (310,47 MB).
- De AppImage en de tar zijn op de runner gecontroleerd (ELF-header, `gde-groningen` in de tar) maar niet op een echte Linux-machine of Steam Deck gestart.
- De APK is gecontroleerd op een geldige zip, `AndroidManifest.xml`, `classes.dex` en `aapt2 dump badging`, maar niet op een toestel of emulator geïnstalleerd; zie `docs/ANDROID.md` ("Niet getest"). De APK-versie komt uit `desktop/package.json` via `android/scripts/version.mjs` → `android/version.properties`; `android/android/app/build.gradle` leest dat bestand en heeft geen eigen testversie meer. `android/package.json` is de versie van het Android-toolpakket en wordt met de release gelijkgehouden (test: `release_docs_test`).

## Webversie publiceren (#57)

De webversie wordt lokaal gebouwd en nergens automatisch geüpload. `web-dist/` staat in
`.gitignore`; er gaat niets de repo in.

```bash
cd desktop
node ../web/build.mjs            # web-dist/ (three.js en lettertypen gevendord, audio als Opus)
node ../web/build.mjs --zip      # en GDE-Groningen-<versie>-web.zip voor itch.io
node ../web/serve.mjs 8790       # lokaal testen op http://localhost:8790/gde/
node ../scripts/web_shell_test.mjs   # controle van de gebouwde map (vanuit de repo-root)
```

- **Vereisten:** Node en `ffmpeg` (Opus). `--zip` vraagt een `zip`-binary; ontbreekt die op
  Windows, zip dan vanuit `web-dist/` met `Compress-Archive` of in Git Bash/WSL. Op een machine
  zonder `data/cache/province` bouwt `desktop/build.mjs` de wereld opnieuw; lukt dat niet, gebruik
  dan een bestaande wereld: `GDE_PREBUILT_WORLD=<repo>/game/world node ../web/build.mjs`
  (de releaseworkflows doen dat ook met `gde-world.tgz`).
- **Wat de build afdwingt:** three.js en de lettertypen staan lokaal (geen CDN op load), de
  losse geluidsbestanden gaan als Opus mee, en de kleine clips worden per map verpakt (itch.io
  staat maximaal 1000 bestanden toe). De build print de maten en of het binnen de itch.io-grenzen
  past.
- **Laatste meting (7-11-2026, 0.57.5):** 1.488 bestanden en 503,2 MB op schijf; audio 3.565 clips
  naar 148,1 MB Opus; offline-check schoon; `web_shell_test` ok; geserveerd en met Range (206)
  getest. Dat past **niet** op itch.io (1.000 bestanden / 500 MB), wel op GitHub Pages (1 GB) —
  maar Pages vraagt een publieke repo (#37) en de eigenaar zet Pages aan (constitution 8).
- **Plek kiezen (eigenaar):**
  1. **GitHub Pages** na #37: workflow die `web-dist/` publiceert (three.js/fonts zijn al
     gevendord). Let op: Pages serveert geen Git LFS en de site-limiet is 1 GB; 503 MB past.
  2. **itch.io:** dan is trimmen nodig (bestandslimiet) of een download-zip in plaats van HTML5.
     Een HTML5-upload boven de 1.000 bestanden/500 MB wordt geweigerd.
  3. Lokaal/handenmatig (nu): `web:serve` voor testers, geen upload.
- **Na het uploaden:** URL in het website-veld (#72), in README en in SOCIAL-EN-WEBSITE.md zetten;
  de service worker-cache (`gde-<versie>-<hash>`) zorgt dat spelers de nieuwe versie krijgen.

## 1.0.0-release (#65)

Het eindspel, in deze volgorde (de eigenaar kiest het startmoment; agents doen niets openbaars):

1. **Twee weken alleen bugfixes.** Geen nieuwe features; alleen `bug`-issues en regressies.
   Elke merge: `node --check`, de tests van die code, `voice_coverage --quiet` en vlak vóór de
   release de volledige suite van de coördinator.
2. **Definitieve trailer.** Zie #63 en `docs/youtube/trailers.md`: shot 5 met Tessa in plaats van
   Anita, besluit over shot 11 (lege vitrine), daarna de Steam-cut met HUD. Niets uploaden zonder
   akkoord.
3. **Versie 1.0.0.** `desktop/package.json`, `CHANGELOG.md` (`## [1.0.0] - <datum>`, alle
   spelerzichtbare regels uit `[Unreleased]`), `android/package.json` (toolpakket) en
   `android/version.properties` (schrijft `android/scripts/version.mjs` uit `desktop/package.json`;
   `build.gradle` leest dat bestand).
4. **Builds.** `npm run release -- minor` (macOS/Windows) of de Actions-workflows met
   `workflow_dispatch`; Linux/Android optioneel. Het script schrijft `SHA256SUMS.txt` en zet de
   bestanden op de release; de comment op #116 noemt de testers (geen namen in de notities).
5. **Webversie.** `web/build.mjs` opnieuw, de gekozen plek uit #57 bijwerken, cache-naam
   controleren.
6. **Laatste checks vóór Public/verkoop:** `publish_check --history` zonder FAIL, `gitleaks
   detect`, `secrets_scan`, de IARC/Steam-leeftijdsvragen (#60/#64), en de credits/disclaimer
   (#72). Daarna pas tags, releases en winkels — dat blijven eigenaarshandelingen.