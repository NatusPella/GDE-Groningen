# Releasen: wat lokaal, wat in Actions

Een release is een pre-release in de privé-repo (AGENTS.md, "Releases"). De coördinator maakt hem; agents pushen, taggen en releasen niet.

## Stappen

1. **Lokaal, op de Windows-machine:** `CHANGELOG.md` bijwerken (sectie `## [X.Y.Z]`), schone werkboom, dan
   `cd desktop && npm run release -- minor|patch --world`.
   Dat bouwt de Windows-exe, maakt de tag en de release en uploadt de exe en `gde-world.tgz` (de gestagede kaarttegels).
   De provinciekaart wordt alleen hier gebouwd: hij komt uit `data/cache`, die niet in git en niet op een runner staat.
2. **In Actions, met één commando:** `node scripts/release_builds.mjs` (tag = versie in `desktop/package.json`, of `node scripts/release_builds.mjs v0.38.1`).
   Het script start `mac-release.yml`, `linux-release.yml` en `android-release.yml` met `gh workflow run` (de workflows moeten op `main` staan), wacht tot ze klaar zijn, start een door de runner geannuleerde run één keer opnieuw, meldt per workflow de duur en de gebruikte gratis minuten, en zet de installatieregels (macOS, Linux/Steam Deck, Android-sideloaden) in een beheerd blok onderaan de releasenotities. Alleen bijlagen die er echt staan komen erin; twee keer draaien geeft hetzelfde.
   Opties: `--only linux,android`, `--notes-only`, `--droog` (alleen tonen), `--ref <branch>`.
3. Bijlagen daarna: `…-windows-portable.exe` (lokaal), `…-mac.dmg`, `…-linux.AppImage`, `…-linux.tar.gz`, `…-android-debug.apk` en `gde-world.tgz` (invoer voor de runners; blijft staan).

De workflows starten nooit vanzelf (alleen `workflow_dispatch`), gebruiken alleen `GITHUB_TOKEN` met `contents: write` en hebben geen geheimen. Ze bouwen uit de tag, dus een fout in de workflow zelf herstel je op `main` en start je opnieuw; de tag hoeft niet mee. Elke workflow heeft een eigen `concurrency`-groep per tag en een time-out (macOS 20, Linux 25, Android 30 min).

## Wat er in Actions gebouwd wordt

| Build | Workflow | Runner | Uitvoer |
|---|---|---|---|
| macOS (universal) | `mac-release.yml` | `macos-latest` | `GDE-Groningen-X-mac.dmg`, niet ondertekend |
| Linux x64 | `linux-release.yml` | `ubuntu-latest` | `…-linux.AppImage` en `…-linux.tar.gz` (start `gde-groningen`), niet ondertekend |
| Android | `android-release.yml` | `ubuntu-latest`, JDK 21, SDK 36 | `…-android-debug.apk`, ondertekend met de debug-keystore van Gradle (geen eigen sleutel, geen Play Console) |

Alle drie nemen de wereld uit `gde-world.tgz` (`GDE_PREBUILT_WORLD`). De Android-build stagt de webversie (`web/build.mjs`, met ffmpeg voor Opus) en roept `gradlew assembleDebug` aan, zoals in `docs/ANDROID.md`. De Opus-cache (`web/.cache/opus`) en de Gradle-cache staan in `actions/cache`.

Bekende valkuilen:
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
| `mac-release.yml` | 3 tot 8 min (2 geslaagde runs) | 4 tot 9 | 10 | 40 tot 90 |
| **Samen** | | | | **ca. 55 tot 105 per release** |

Dat is 3 tot 5% van het maandbudget per release; zelfs vijf releases in een maand blijven ruim onder de limiet. macOS is bijna al het verbruik: draai die dus niet voor proefjes (`--only linux,android`). Een mislukte stage-stap (Android, eerste poging: 4,5 min) telt ook mee.

Waarom niet alles in Actions? Windows lokaal: de exe bouwt hier in een paar minuten uit de kaart die toch al op deze machine staat, en in Actions kost hij 2x. De provinciebouw (ca. 15 min en veel RAM, uit `data/cache`) kan niet op een runner. Dus: **Windows en de wereld lokaal, macOS, Linux en Android in Actions**. Een Linux-build lokaal kan nog steeds: `npm run release -- minor --linux`, bijvoorbeeld als de Actions-minuten op zijn (`gh api /repos/NatusPella/GDE-Groningen/actions/runs` toont het verbruik; Instellingen > Billing de rest).

## Wat niet getest is

- De AppImage en de tar zijn op de runner gecontroleerd (ELF-header, `gde-groningen` in de tar) maar niet op een echte Linux-machine of Steam Deck gestart.
- De APK is gecontroleerd op een geldige zip, `AndroidManifest.xml`, `classes.dex` en `aapt2 dump badging`, maar niet op een toestel of emulator geïnstalleerd; zie `docs/ANDROID.md` ("Niet getest").
- `versionName` in `android/android/app/build.gradle` blijft `0.35.0-android-test` tot iemand hem met de release laat meelopen.
