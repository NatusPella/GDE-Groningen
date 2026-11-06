# Review desktop, tooling en CI

## Dekking

Gelezen (volledig, tenzij vermeld) op HEAD `9d63ab80`, werkboom schoon op `.test-temp/` na:
`desktop/main.js`, `preload.js`, `coopcore.cjs`, `livebussen.cjs`, `userdata.js`, `devtools.js` (471 regels, helemaal), `clipvideo.js`, `trailervideo.js`, `build.mjs`, `release.sh`, `args.cjs`, `steamflags.cjs`, `envcompat.js`, `package.json`, `scripts/adhoc-sign.cjs` en `scripts/changelog_section.cjs`; alle zes `.github/workflows/*.yml`, `dependabot.yml`; `scripts/test_all.mjs`, `run_tests.mjs`, `lib/testrapport.mjs`, `lib/testoorzaken.mjs`, `lib/syntaxcheck.mjs`, `lib/stagecheck.mjs`, `secrets_scan.mjs`, `publish_check.mjs`, `install_hooks.mjs` + `scripts/hooks/pre-commit`, `spec_check.mjs`, `import_check.mjs`, `import_cycles_test.mjs`, `dead_code.mjs`, `release_builds.mjs`, `release_hashes.mjs`, `world_eigenaar.mjs` (kop) en `scripts/world_eigenaar.json`-doel; daarnaast gerichte greps op `rmSync`/`unlink`, `.cjs`, `openExternal`, `process.exit`, `fetch-depth` en `window.open`.
Niet gedaan: geen runtime (sandbox blokkeert `child_process` met pipes; geen Electron, geen volledige suite, geen releasebouw), geen `web/build.mjs`/`android/`-scripts (buiten dit gebied, alleen grep), geen `package-lock`/dependabot-PR's. Al gemelde punten van het bord zijn niet herhaald: #558 (workflow/publicatierechten), #570 (testrunner toont alleen de laatste 25 regels), #576 (CI test main niet, release niet gegate), #573/#574/#575, #572 (docdrift). Waar een bevinding daaraan raakt, staat dat erbij.
**Grens:** dit is een leesreview; alle uitspraken zijn uit de code afgeleid, niet uit een draaiende app.

## Bevindingen (op ernst)

### [Hoog] `shell.openExternal` krijgt elk URL uit de pagina, zonder scheme-allowlist
- **Waar:** `desktop/main.js:155` (setWindowOpenHandler) en `desktop/main.js:157` (will-navigate)
- **Scenario:** de pagina doet `window.open(...)` of navigeert naar een niet-`app://game/`-URL; de handler geeft die URL 1-op-1 aan het OS. Concreet: `location='file:///C:/pad/prog.exe'` wordt `shell.openExternal`, en Windows voert het bestand uit; ook `ms-msdt:`, `search-ms:` e.d. worden zo gestart. Dit is de klassieke Electron-RCE-val: de renderer is gesandboxed, de shell niet.
- **Impact:** scriptuitvoering in de pagina (F12, zie volgende bevinding, of een toekomstige injectie) escaleert van "JS in de renderer" naar "OS voert uit wat de pagina zegt". Daarbij werkt een legitieme same-origin `window.open` niet meer: `game/js/testmenu.js:57` opent `cutpreview.html`, wat `app://game/cutpreview.html` wordt en dus bij de OS-shell belandt in plaats van in een nieuw venster.
- **Fix:** `new URL(url)` en alleen `http:`/`https:` (eventueel `mailto:`) doorgeven aan `shell.openExternal`; `app://game/` in een eigen `BrowserWindow` openen of weigeren; al het overige blokkeren.
- **Zekerheid:** zeker (code); de escalatie vereist scriptuitvoering in de pagina.

### [Midden] F12/Ctrl+Shift+I opent DevTools ook in de packaged app
- **Waar:** `desktop/main.js:168`
- **Scenario:** de `before-input-event`-handler staat buiten de `devtools`-vlag (die op regel 43 alleen unpackaged of `GDE_DEV=1` laadt). In een release-exe opent F12 de DevTools-console op `app://game`, met toegang tot `localStorage` (saves, instellingen, prestaties) en de preload-bridge; vandaar is de vorige bevinding (en `file:`-exec) een plak-opdracht.
- **Impact:** de gedocumenteerde grens "debugharness alleen in dev" (`main.js:41-43`, `devtools.js:1-4`, constitutie 9) wordt in de praktijk niet gehaald; DevTools geeft elke speler een scripting-ingang in de productie-renderer (self-XSS, save-manipulatie).
- **Fix:** `if (devtools && (input.key === 'F12' || ...)) win.webContents.toggleDevTools();`, of alleen met een expliciete `--devtools`-vlag.
- **Zekerheid:** zeker.

### [Midden] De testrunner eindigt met exitcode 0 als er niets gedraaid is
- **Waar:** `scripts/test_all.mjs:335-340` (alle Electron-stappen SKIP), `scripts/test_all.mjs:573` (exitcode), `scripts/lib/testrapport.mjs:182` ("Er is niets gedraaid.")
- **Scenario:** (a) `--fase=electron` terwijl Electron ontbreekt, `game/world` ontbreekt of er draait al een instantie: elke stap wordt SKIP, `alle.some(isFout)` is onwaar, exitcode 0; (b) `--only=<typefout>` levert nul items en dus ook exitcode 0. Rapporten zeggen netjes "niets gedraaid", de exitcode zegt "geslaagd".
- **Impact:** elke automaat (`&&`-keten, nachtelijke taak, releasechecklist) ziet succes terwijl de fase niets mat; dat ondermijnt de regel "niet gedraaid heet niet geslaagd". Ander mechanisme dan #570 (foutregels afgekapt) en #576 (CI/main), dus aanvullend.
- **Fix:** exit 1 (of een eigen code 3) bij nul PASS-items of een gevraagde fase zonder PASS; `--allow-skip`/`--partial` voor bewuste deelruns; exitcodes documenteren.
- **Zekerheid:** zeker.

### [Midden] CI mist de wereldvelden-keuring die de lichte fase wél draait
- **Waar:** `scripts/run_tests.mjs:107-124` (CI-selectie) tegenover `scripts/test_all.mjs:149` (`world_eigenaar`, toegevoegd in `d2298488`, Refs #498)
- **Scenario:** een nieuwe module schrijft een veld op `World`; `node scripts/test_all.mjs --fase=licht` wordt rood op `world_eigenaar`, maar CI draait `run_tests.mjs` en blijft groen. `run_tests.mjs:12-15` en `publicatie.md:89-94` beloven dat CI dezelfde meting doet als de lichte fase (met als bekende gaten alleen zware/Electron, dode code en trend).
- **Impact:** de poort uit #498 die nieuwe schrijvers van het gedeelde wereldobject moet tegenhouden, draait niet op PR's; regressie kan met groene CI naar main.
- **Fix:** `['world_eigenaar', ['scripts/world_eigenaar.mjs']]` aan de losse lijst in `run_tests.mjs` toevoegen en de spec/comment bijwerken. (Raakt #576, maar andere oorzaak: dit is een pariteitsgat, niet het ontbreken van een push-trigger.)
- **Zekerheid:** zeker.

### [Midden] De geheimenscan over de geschiedenis is in CI in de praktijk leeg (shallow checkout)
- **Waar:** `.github/workflows/test.yml:28` (`actions/checkout@v4` zonder `fetch-depth`), scanstap `test.yml:58-60`, `scripts/secrets_scan.mjs:63-65`
- **Scenario:** de standaard checkout is diep 1; `git rev-list --all --objects` en `git log --all` zien in een shallow kloon alleen de opgehaalde commit. Een geheim dat in een tussencommit van een PR-branch staat en later is weggehaald, wordt door de historie-scan niet gezien; alleen de werkboom van de merge-commit wordt gescand. De comment bij de stap noemt de scan expliciet het "vangnet achter de pre-commit-haak".
- **Impact:** de CI-historiescan (het enige netwerk dat een geheim in de geschiedenis had moeten vangen, want push protection staat uit) is in CI vrijwel inert; het vangnet bestaat alleen bij een lokale volledige kloon.
- **Fix:** `with: fetch-depth: 0` bij deze job/stap (of een tweede volledige checkout vóór de scan) en in `secrets_scan` weigeren/waarschuwen als `git rev-list --all --count` 1 is. (CI draait ook niet op push naar main; dat deel is #576.)
- **Zekerheid:** zeker.

### [Midden] De pre-commit-haak scant de werkboom, niet de index
- **Waar:** `scripts/hooks/pre-commit:12`, `scripts/secrets_scan.mjs:98-108`
- **Scenario:** `scanTree` haalt de bestandslijst uit `git ls-files` (de index) maar leest de inhoud met `fs.readFileSync` van schijf. Wie een bestand met sleutel staged (`git add`), daarna de sleutel op schijf weghaalt zonder opnieuw te stagen, en commit, laat de haak de schone schijfversie scannen terwijl de commit de sleutel bevat. Omgekeerd blokkeert een niet-gestagede sleutel in een getrackt bestand een commit waarin hij niet zit.
- **Impact:** de enige voorzorg tegen "sleutel één keer in de geschiedenis" (de repo is privé op Free, push protection staat uit) is met een half-gestaged bestand te omzeilen; valse meldingen leren mensen `--no-verify` gebruiken.
- **Fix:** in de haak de index scannen (`git ls-files -s` + `git cat-file --batch` of `git show :<pad>`), en `--tree` houden voor ad-hoc schijfscans.
- **Zekerheid:** zeker.

### [Midden] `build.mjs` verwijdert bij `GDE_STAGE_OUT` de hele meegegeven map
- **Waar:** `desktop/build.mjs:165` (met `OUT` uit regel 19 en `GDE_STAGE_OUT`), ook `:75`/`:156` (`OUT/world`)
- **Scenario:** de gedocumenteerde vorm is `GDE_STAGE_OUT=<map>/game node desktop/build.mjs` (bijv. `docs/TESTEN.md:105-106`); `OUT` wordt zonder controle `fs.rmSync(..., { recursive: true, force: true })`. Een typefout als `GDE_STAGE_OUT=%USERPROFILE%` of een pad naar een projectmap wist die map recursief, zonder bevestiging en zonder log van wat er weg ging.
- **Impact:** onherstelbaar gegevensverlies buiten de repo bij een verkeerde omgevingsvariabele (precies het scenario "script dat per ongeluk buiten de repo opruimt").
- **Fix:** valideer `OUT`: alleen toestaan onder `desktop/build`, in de temp-map of met basename `game`; weiger root/`%USERPROFILE%`/repo-root en `..`-paden; log het verwijderde pad; schrijf naar een verse `.tmp-<pid>` en rename.
- **Zekerheid:** zeker.

### [Midden] De offline-controle van de stage waarschuwt alleen, faalt nooit
- **Waar:** `desktop/build.mjs:248-255`
- **Scenario:** de stap "nothing may still come from the internet at load time" verzamelt externe `http(s)`-URL's in JS/HTML/CSS en doet `console.log('WARNING - still external: ...')`; de stage en dus de release gaan door. Een nieuwe CDN-link (niet jsDelivr, dus niet gevendord) of een dynamische import-URL komt zo in de packaged app.
- **Impact:** de desktopbuild kan ongemerkt toch van internet laden; dat breekt de belofte "de desktopversie laadt na de build niets van internet" (`publicatie.md:157-158`) en kan bij een online speler een verzoek met IP naar een derde partij doen (constitutie 4). Geen poort vangt dit.
- **Fix:** `throw` bij `left.length` (met expliciete allowlist + reden), en dezelfde controle in `stagecheck`/CI opnemen zodat `--no-world`-stages het ook dekken.
- **Zekerheid:** zeker.

### [Midden] Vendored three.js en fonts worden zonder integriteitscontrole binnengehaald
- **Waar:** `desktop/build.mjs:36-45` (`cached`), `:177-215` (crawlen en vendoren), cache in `desktop/vendor-cache/` (gitignored)
- **Scenario:** de build downloadt `three@0.160.0` en de Google-fonts van jsDelivr/Google Fonts met alleen een User-Agent; er is geen hash, SRI of lockbestand, en een bestaand cachebestand wordt blind vertrouwd. Een gecompromitteerde CDN/edge of een aangepast cachebestand komt ongewijzigd in elke desktop-, web-, Android- en CI-build.
- **Impact:** supply-chain-code-injectie in alle distributies; de code draait met de rechten van de renderer (saves, klembord via preload, netwerk) en geen test controleert de bytes.
- **Fix:** een gecommit `vendor-cache.lock.json` met sha256 per bestand, controleren na download én bij cache-hit, en falen bij afwijking; lock bewust bijwerken.
- **Zekerheid:** zeker (het ontbreken van de controle).

### [Laag] `app://`-padcontrole gebruikt een stringprefix in plaats van een mapprens
- **Waar:** `desktop/main.js:72-74`
- **Scenario:** `file.startsWith(GAME_DIR)` zonder scheidingsteken. `app://game/../game2/x` (of `..%2F`, of `..\game2` via `%5C`) resolveert naar `.../game2/x`, en dat begint met de string van `.../game` en wordt dus geserveerd (met `path.join`/`normalize` geverifieerd). In dev bestaan zulke buren (oude stage `game-old`, perf-builds) en met `GDE_GAME_DIR` zijn ze te maken.
- **Impact:** een script in de pagina kan bestanden lezen uit een zustermap waarvan de naam met "game" begint; beperkt (geen willekeurige paden, geen remote), maar de grens is niet wat hij lijkt.
- **Fix:** `const rel = path.relative(GAME_DIR, file); if (rel.startsWith('..') || path.isAbsolute(rel)) 403;` en `GAME_DIR` eenmalig resolven/reëel maken.
- **Zekerheid:** zeker.

### [Laag] `.cjs`-bestanden vallen buiten de syntaxcontrole van beide runners
- **Waar:** `scripts/run_tests.mjs:95` en `scripts/test_all.mjs:133` (`/\.(js|mjs)$/`), terwijl `scripts/lib/syntaxcheck.mjs:10-12` `.cjs` expliciet aankan
- **Scenario:** er staan tien getrackte `.cjs`-bestanden in de repo, waaronder de runtime-afhankelijkheden van `main.js` (`args.cjs`, `coopcore.cjs`, `livebussen.cjs`, `steamflags.cjs`). De meesten worden indirect door tests geladen, maar `desktop/scripts/adhoc-sign.cjs` (afterPack) en `scripts/depth_shots.main.cjs` door niets; een syntaxfout daarin komt pas bij het packen of in een harness boven.
- **Impact:** de module-check belooft "alle JS", maar slaat een categorie structureel over; fouten in release- of harnesscode worden niet opgemerkt.
- **Fix:** `\.(js|mjs|cjs)$` in beide `listFiles`-aanroepen (syntaxcheck kiest zelf de CJS-route) en een `.cjs`-geval in `syntaxcheck_test`.
- **Zekerheid:** zeker.

### [Laag] "Er draait al een Electron"-controle herkent de geïnstalleerde app niet en is uit met een lockmap
- **Waar:** `scripts/test_all.mjs:289-300` (`elektronDraait`) en `:335-337` (de `!LOCKS`-voorwaarde)
- **Scenario:** `elektronDraait` zoekt op Windows naar processen met naam `electron.exe` (en op Linux/macOS `pgrep -x electron`), maar de geïnstalleerde game heet `GDE Groningen.exe` (electron-builder `productName`, `desktop/package.json:3`). Bovendien wordt de controle alleen uitgevoerd als `LOCKS` leeg is; de standaard `~/gde-locks` bestaat na de eerste run, dus daarna start de fase altijd door (de slots coordineren alleen test-Electrons). `docs/TESTEN.md:170` belooft dat een draaiende instantie (bijvoorbeeld de eigenaar die speelt) de fase tegenhoudt.
- **Impact:** de coördinator kan 's avonds drie Electron-stappen naast het spel van de eigenaar starten: trage, flaky timingtests (verhaaltest, bots) en een verpeste speelsessie, tegen de testafspraken in.
- **Fix:** ook op de packaged procesnaam matchen (per platform), en de check niet uitschakelen omdat er een lockmap bestaat; laat de eigenaar-app desnoods een slot bezetten of weiger met een duidelijke melding + `--force`.
- **Zekerheid:** zeker.

### [Laag] `--clip-repl` ruimt oude opdrachten niet op (regex `${d}` in plaats van `\d`)
- **Waar:** `desktop/clipvideo.js:87`
- **Scenario:** `/^(cmd-d+.js|res-d+.json|quit)$/` matcht letterlijke `d`'s, dus alleen `quit` wordt opgeruimd; `cmd-N.js` en `res-N.json` van een afgebroken run blijven staan. `setupRepl` begint daarna weer bij `n=1` en voert zo'n oude `cmd-1.js` bij de start uit (regels 88-104).
- **Impact:** dev-harness voert onbedoeld een vorige opdracht uit en meet verkeerde resultaten; alleen trailer-/repl-werk, geen spelerspad.
- **Fix:** `/^(cmd-\d+\.js|res-\d+\.json|quit)$/`.
- **Zekerheid:** zeker.

## In orde (gecontroleerd, geen bevinding)

- **Electron-basis:** `desktop/main.js:136-139` zet `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`; `preload.js` exposeert alleen de vaste bridge (geen `require`/`ipcRenderer` naar de pagina), `coop-send` valideert integer-id en 8192-bytegrens, `live-bussen` neemt geen argumenten, de save-dialog gebruikt `path.basename` en kapt tekst op 2 MB, en er is een single-instance-lock plus een wegwerpprofiel in de temp-map voor testruns.
- **Live bussen (constitutie 4):** `livebussen.cjs` doet één vaste GET-URL met `credentials: 'omit'`, `referrerPolicy: 'no-referrer'`, 8 s abort en 3 MB-limiet, in het main-proces; de URL/grenzen zijn met de renderer gedeeld via `scripts/livebussen_test.mjs`. Geen spelergegevens, geen schrijfactie.
- **CI- en releasehygiëne (voor zover niet al op het bord):** `test.yml` heeft `contents: read`, `npm ci --ignore-scripts` en Python `-I`; de vier release-workflows starten alleen met `workflow_dispatch`, hebben uitsluitend `GITHUB_TOKEN`/`contents: write` en geen `pull_request_target` of geheimen; `release.sh` eist een schone werkboom, een changelog-sectie en een nieuwe tag, schrijft `SHA256SUMS.txt` en zet `--prerelease` voor 0.x; `adhoc-sign.cjs` ondertekent de macOS-app ad-hoc. Ontbrekende signing/bijlagen-hashes voor CI-artifacts zijn in de releasenotities gedocumenteerd als bewuste keuze (geen bevinding).
