# Spec: Publicatie en release

> Canonieke spec. Vervangt de regelinhoud van `docs/RELEASEN.md`,
> `docs/PUBLICEREN.md`, `docs/PUBLICATIECHECKLIST.md`, `docs/STEAM-KLAAR.md`,
> `docs/STEAM-CHECKLIST.md`, `docs/LEEFTIJD.md`, `docs/IARC-ANTWOORDEN.md` en de
> releasesectie van `docs/ONTWIKKELEN.md`; die blijven als detailnaslag.
> `AGENTS.md` wint bij twijfel, zeker constitutie 2, 4, 5 en 8.

## Doel

De keten van wijziging naar downloadbare build, met de checks die daarbij horen
en de grens tussen agent en eigenaar. De repo is privé; elke stap naar buiten
wacht op de eigenaar.

## Releaseketen

### 1. Stage en changelog

Spelerzichtbare regels komen onder `## [Unreleased]` in `CHANGELOG.md`. Vóór een
release verhuizen ze naar `## [X.Y.Z] - <datum>`; zonder die sectie weigert het
script. De werkboom moet schoon zijn (`desktop/release.sh:45`) en de tag
`vX.Y.Z` mag nog niet bestaan (`:64`).

### 2. Lokaal: `npm run release`

Vanuit `desktop/`, in een POSIX-shell (Git Bash op Windows; `npm run release` is
`sh release.sh`, `desktop/package.json:18`):

```
cd desktop && npm run release -- minor|patch --world
```

`minor` is een nieuwe functie, `patch` een bugfix, `current` houdt de versie.
`--world` is verplicht voor de Actions-stap hierna: zonder `gde-world.tgz` stopt
`scripts/release_builds.mjs:127`. `release.sh` zoekt `gh` (`:25`), bumpt de
versie (`:51`), leest de changelog via
`node scripts/changelog_section.cjs "$VERSION"` (`:58`), draait `npm run stage`
en `npx electron-builder --win --x64` (`:81`, `:83`; een dmg bouwt alleen op
macOS, `:77`), tagt en pusht (`:124`) en maakt de release (`:176`) met
`--prerelease` voor `0.*` (`:129`), uploadt
(`:177`), comment op #116 (`:187`) en wist `dist/` en `build/` (`:193`). De
notities waarschuwen voor niet-ondertekende bestanden en geven de
installatiestappen (`:162`). Optioneel: `--linux`, `--web` (webzip, blijft
lokaal) en `--steam` (kopie naar `steam/content/`).

### 3. Actions: `node scripts/release_builds.mjs`

Vanuit de repo-root, na de lokale release:

```
node scripts/release_builds.mjs
```

De tag is `v<versie in desktop/package.json>`, of meegegeven (`v0.38.1`).
Opties: `--only`, `--arm64`, `--notes-only`, `--droog` en `--ref <branch>`
(`scripts/release_builds.mjs:5-14`). Het script start per build
`gh workflow run <workflow> -f tag=<tag>` (`:142`), wacht tot de run klaar is,
start een geannuleerde run één keer opnieuw (`:172`), rekent de gratis minuten
uit (`billable`, `:92`) en zet een beheerd blok installatieregels onderaan de
notities (`applyBlock`, `:79`). Alleen bijlagen die er echt staan komen erin
(`notesFor`, `:38`).

De vier workflows in `.github/workflows/` (`windows-release.yml`,
`mac-release.yml`, `linux-release.yml`, `android-release.yml`) starten alleen
met `workflow_dispatch`, hebben `contents: write` en geen geheimen, en bouwen
uit de tag met de wereld uit `gde-world.tgz` (`GDE_PREBUILT_WORLD`); de
provinciekaart komt dus lokaal. Bijlagen: `GDE-Groningen-<v>-windows-portable.exe`,
`-mac.dmg`, `-linux.AppImage`, `-linux.tar.gz`, `-android-debug.apk` en
`gde-world.tgz` (`scripts/release_builds.mjs:28-31`). Agents pushen, mergen, taggen en releasen nooit; dat
doet de coördinator na de tests. Een agent werkt in een eigen worktree, in kleine
commits, en draait alleen de checks bij zijn wijziging.

## Checks

| Moment | Commando | Wat het doet |
| --- | --- | --- |
| elke wijziging | `node --check <gewijzigd bestand>` | syntax van de gewijzigde JS |
| elke wijziging | de `scripts/*_test.mjs` die de code dekt | pure regeltests |
| vóór merge | `node scripts/test_all.mjs --fase=licht` | module-check, `import_check`, `undef_check`, `voice_coverage`, `text_audit`, dode-code en alle `scripts/*_test.mjs` |
| vóór release | `node scripts/test_all.mjs --fase=zwaar` | wereldchecks en audits (`ring_probe`, `seat_audit`, `province_test`, `drive_audit`, spoor en water) |
| vóór release | `node scripts/test_all.mjs --fase=electron` | smoke-run, verhaaltest, `geocheck`, spelbot en beeldrondes |
| alles | `node scripts/test_all.mjs --fase=alles` | de drie fasen achter elkaar |

`zwaar` en `electron` hebben `game/world` nodig (`cd desktop && npm run stage`),
`electron` ook `desktop/node_modules`; ontbreekt dat, dan heet een item **niet
gedraaid**, niet geslaagd. De coördinator draait bij een release de volledige
suite, `province_test`, de zware audits en de verhaaltest
(`--story-test=<dir>`); nooit twee Electron-instanties tegelijk.

**Twee runners (#481).** `scripts/run_tests.mjs` (CI) draait `node --check`,
`voice_coverage`, `import_check` en alle `scripts/*_test.mjs` behalve `EXCLUDED`
(`:26-29`), met `--quick`, `--only`, `--list` en `--timeout`; het kent geen
fasen, `text_audit`, `undef_check`, dode-code-bewaking of rapport met trend.
`test_all.mjs` doet dat wel, en dat is de runner die AGENTS.md noemt.

**CI draait** `.github/workflows/test.yml` bij `pull_request` en met de hand
(niet bij elke push), op Linux en Windows: `npm ci --ignore-scripts`,
`npm run stage` en `node scripts/run_tests.mjs`, plus drie Python-tests in
`scripts/world/`. De zware fasen en de verhaaltest draaien lokaal.

## Publicatiestatus

- **Repo:** privé; niets is openbaar gemaakt, geüpload of gepost
  (`docs/PUBLICATIECHECKLIST.md:3`). Vóór Public: `node scripts/publish_check.mjs
  --history` zonder FAIL, plus `secrets_scan`, `text_audit` en
  `merkenregister_check`.
- **Versie:** `0.53.0` in `desktop/package.json:4`, met `## [0.53.0] - 2026-10-25`
  als nieuwste changelogsectie; elke versie die met `0.` begint, wordt een
  pre-release (`desktop/release.sh:129`).
- **Ondertekening:** niets is ondertekend. Windows `signExecutable: false`,
  macOS `identity: null` en `hardenedRuntime: false`
  (`desktop/package.json:62-64`, `:79`); de APK gebruikt de debug-keystore van
  Gradle, geen eigen sleutel en geen Play Console.
- **Platforms:** Windows lokaal (de exe bouwt uit de kaart op deze machine),
  macOS, Linux en Android via Actions; Linux kan ook lokaal met `--linux`.
- **Nog niet getest of niet mogelijk:** de exe uit Actions is nooit gestart;
  AppImage en tar niet op een echte Linux-machine of Steam Deck; de APK niet op
  een toestel; de ARM64-paden niet op echte ARM-hardware; de webversie wordt
  alleen lokaal gemaakt; Steam heeft geen account, app-id of upload.

## Wettelijk

### Leeftijd

Het spel is **18+** (`docs/LEEFTIJD.md:3`). Verwachte labels: PEGI 18, USK 18 en
ESRB Mature 17+. De IARC-antwoorden staan als concept in
`docs/IARC-ANTWOORDEN.md`: geweld tegen weerloze personages, bloed en ledematen
(standaard aan), gesimuleerd gokken met spelgeld, alcohol en licht grof
taalgebruik; geen drugs, seks of aankopen. De eigenaar vult de lijst zelf in en
verstuurt niets zonder akkoord (`docs/IARC-ANTWOORDEN.md:121-123`). De
instelling "Bloed en ledematen" verlaagt de leeftijd niet.

### Licenties

- Code GPL-3.0-or-later (`LICENSE`, `desktop/package.json:7`); eigen inhoud
  (stemmen, muziek, verhaal, dialogen, eigen beelden en modellen) CC BY-NC-SA
  4.0 (`LICENSE-CONTENT.md`); naam en logo alle rechten voorbehouden. Het
  Martinitoren-model is met Claude Design gemaakt.
- Kaartdata ODbL (OpenStreetMap) en die bestanden blijven ODbL; 3DBAG CC BY 4.0;
  AHN CC0; three.js MIT; Bebas Neue en Big Shoulders Display SIL OFL 1.1;
  Electron MIT. Vermeldingen staan in `NOTICE.md`, `licenses/` en in het spel.
- Effecten zijn in de code gesynthetiseerd, op acht CC0-opnames van Freesound na
  (`game/audio/sfx/`). Muziek en stemmen komen van Google Gemini, aangeboden
  "voor zover er rechten op rusten"; het muziekproduct staat nog niet vast.

### Privacy

Geen account, telemetrie, analytics, advertenties of aankopen. Saves,
instellingen en prestaties staan alleen lokaal (`gde-save-v1`, `gde-settings`,
`gde-prestaties-v1`); het foutenlogboek blijft op het apparaat. Bij Samen spelen
gaat het IP-adres naar een openbare STUN-server en loopt de versleutelde
signalering via openbare brokers, alleen na toestemming in het spel. De
openbare sessielijst is opt-in en toont naam, aantal spelers, versie en
kamercode, nooit een IP-adres. Er is geen tekstchat en geen spraak. De
desktopversie laadt na de build niets van internet; de webbuild levert three.js
en de lettertypen zelf mee.

### Merken

Echte plaatsen en gebouwen mogen. Personen, bedrijven en merken zijn verzonnen
of parodieën met eigen naam en kleur (Kiekdoar, Radio Proat, Albert Hijgt,
Wiebel, Rook & Geluk); nooit de naam, het logo of de huisstijl van een bestaand
merk of een andere game. De disclaimer staat in README, `NOTICE.md` en Over.

### Niets naar buiten zonder akkoord

Zichtbaarheid van de repo, GitHub Pages, posts, uploads, een
geschiedenisherscrijving en een force push gebeuren alleen met akkoord van de
eigenaar (constitutie 8). Geheimen blijven geheim: nooit `.env` lezen, printen of
committen; de OpenRouter-sleutel is alleen voor de TTS-scripts.

## Eigenaarsbesluiten die open staan

Alleen deze, uit de docs:

1. Auteursnaam in de git-historie laten staan of met `--mailmap` herschrijven;
   OSM-contactgegevens in `data/*_raw.json` laten staan of de tags eruit halen.
2. Merkenregisters (EUIPO, TMview, BOIP) met de hand doorzoeken; het
   muziekproduct vastleggen (Gemini-app of API, welk abonnement).
3. "Noorderzon" laten of vervangen; interne docs met spoilers doorlezen; de
   webversie three.js en de lettertypen zelf meedragen of de CDN laten.
4. Websitetekst, About en social preview goedkeuren; IARC-vragenlijst en Steam
   Content Survey zelf invullen.
5. Steam: account, Steam Direct-bijdrage, app-id, depots, 217 prestaties,
   winkelpagina, Deck-test en het publicatiemoment.
6. De disclaimer met de namen van Rockstar Games en Take-Two: laten of weglaten
   (`docs/STEAM-CHECKLIST.md:23`, #72).

## Open punten (met issue)

1. **#483** — `versionName` in `android/android/app/build.gradle:11` staat op
   `0.35.0-android-test` (`versionCode 1`) en loopt niet mee met de release. De
   belofte van SHA-256 in de releasenotes bestaat niet in de code:
   `desktop/release.sh` en `scripts/release_builds.mjs` schrijven geen checksum.
   Een afwijking, geen regel.
2. **#484** — de juridische teksten zijn niet overal gelijk.
   `docs/LICENTIES.md:489` zegt in de Steam-sectie "geen online", terwijl Samen
   spelen optioneel online is; `:50` noemt 20 muzieknummers en 8 loops, `:62` 34
   en 15; `docs/PRIVACY-EN-CREDITS.md:45` zegt dat effecten zelf gesynthetiseerd
   zijn, terwijl er acht CC0-opnames zijn (`docs/LICENTIES.md:68`).
3. **#481** — twee testrunners naast elkaar, met verschillende dekking; zie
   "Checks".
4. **#485** — de webversie (`web/build.mjs`) heeft geen eigen tests in
   `scripts/`; de build en de service worker worden alleen met de hand
   gecontroleerd.
