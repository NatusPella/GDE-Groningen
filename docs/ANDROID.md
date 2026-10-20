# Android-testversie (#227)

Lokaal bouwbare **debug-APK** van het spel. Alleen voor testen: niets uploaden, geen Play Console, geen eigen sleutels (constitution 8).
Stand: de APK bouwt (208 MB) en start op een emulator (Pixel 6, Android 15, x86_64) tot en met het startscherm; het spel is nog **niet op een echt toestel of met aanraking gespeeld**. Android wordt later verder opgepakt.

## 1. Aanpak: Capacitor-WebView rond de webversie

| Optie | Voor | Tegen |
|---|---|---|
| **Capacitor (gekozen)** | Hergebruikt `web/build.mjs` ongewijzigd; wereld en geluid zitten in de APK (offline, geen netwerkdiensten); native schil voor volledig scherm, schermvergrendeling, terugknop, liggend | Eigen Gradle-project; WebView-versie hangt van het toestel af |
| PWA / TWA | Geen Gradle, klein | Vereist https-host en Digital Asset Links (dus publiceren, verboden); 220 MB aan cache is onbetrouwbaar (quota, evictie); weinig controle over vergrendeling en terugknop |

Opzet: `android/` (buiten `desktop/`, Electron ongemoeid). `android/scripts/stage.mjs` kopieert `web-dist/` (de bestaande webstaging) naar `android/www`, haalt eruit wat de APK niet nodig heeft (service worker, mp3-muziek, originele geluidspacks, `cutpreview.html`) en zet `android-bridge.js` ervoor. `cap sync` kopieert het naar de assets. `game/` is niet aangepast.

## 2. Grootte (gemeten, v0.35.0)

| Deel | MB |
|---|---|
| `game/world` (tegels `.gdp`, provincie, basiskaart) | 103 |
| Geluid Opus: korte clips (packs) | 41 |
| Muziek Opus (`.webm`, 23 tracks) | 50 |
| `stad.json` en overige json | ca. 10 |
| js, modellen, beelden, fonts | ca. 15 |
| **`android/www`** | **227** |
| Debug-APK | **208** (Opus en `.gdp` zijn al gecomprimeerd; `noCompress` staat aan) |

`web-dist` is 382 MB, maar bevat ook de mp3-muziek (85 MB) en de originele packs (67 MB) voor Safari; die laat de Android-stage weg (de WebView speelt Opus).

Limieten: een APK buiten de Play Store heeft praktisch geen grens (zip 4 GB); 208 MB installeert gewoon. Voor Play geldt: AAB-basismodule 200 MB, install-time asset packs samen tot 1 GB, fast-follow/on-demand tot 4 GB.
**Keuze voor de testversie: alles bundelen** (offline, simpel, geen netwerk). Mocht het ooit naar Play gaan: wereld en geluid (ca. 190 MB) in een install-time asset pack (Play Asset Delivery) met een kleine basis; downloaden bij eerste start is bij deze grootte niet nodig en vraagt netwerktoegang. Dat is een latere keuze.

De grootte hangt van de gebouwde `game/world`; een andere checkout kan afwijken.

## 3. Geheugen en prestaties (schatting, niet op een telefoon gemeten)

- De piek zit vooral in tegelgeometrie en textures. De WebView-limiet is op 3-4 GB-toestellen krap: verwacht dat alleen toestellen met 4 GB RAM of meer en een recente GPU (Adreno 6xx, Mali-G7x of nieuwer) redelijk draaien.
- De kwaliteitsprofielen uit #96 (`gfxprofile.js`: telefoon, tablet, krachtige tablet) passen hierbij; het telefoonprofiel is de standaard op een aanraaktoestel. De emulator gebruikt de GPU van de host (WebGL2 beschikbaar), dus fps zegt daar niets.
- Meten bij een echte test: perf-overlay, `window.__gteWeb` en `chrome://inspect` (de APK is debugbaar, `webContentsDebuggingEnabled`).
- Energie: het scherm blijft aan tijdens het spelen; het pauzemenu opent als de app naar de achtergrond gaat.

## 4. Wat touch, opslag, geluid, oriëntatie en safe-area nodig hebben

- **Touch** (#96): `touch.js` staat aan op aanraakapparaten. Gamepad via de Gamepad API van de WebView (niet getest).
- **Saveslots**: `localStorage`/IndexedDB van de WebView, origin `https://localhost` (`androidScheme: https`). `allowBackup=false` (geen cloudback-up); opslagsleutels blijven `gde-*`. Een reïnstall met een andere handtekening wist de saves.
- **Geluid**: het spel start geluid na een tik op het startscherm, dus de autoplay-regels van WebAudio zouden geen probleem moeten zijn. Niet beluisterd (de emulator draaide met `-no-audio`).
- **Oriëntatie**: `sensorLandscape` in het manifest (alleen liggend, beide kanten). De 'Draai je toestel'-hint is in de APK overbodig.
- **Volledig scherm**: `MainActivity` verbergt de systeembalken (immersive, vegen toont ze even), `FLAG_KEEP_SCREEN_ON`, `windowLayoutInDisplayCutoutMode=shortEdges`. Het spel gebruikt `env(safe-area-inset-*)` (viewport-fit=cover); `adjustMarginsForEdgeToEdge: disable` laat Capacitor geen marges om de uitsparing zetten (zonder dat bleef links 127 px wit).
- **Terugknop**: `android-bridge.js` stuurt Escape (pauzemenu) via `@capacitor/app`.
- **Range-verzoeken**: de lokale server van Capacitor beantwoordt `Range` met een kapotte 206, waardoor de wereldtegels niet laadden ("Fout bij laden: Failed to fetch"). De brug leest zulke bestanden heel en knipt zelf het stuk eruit (LRU 48 MB). Een native oplossing (eigen `PathHandler`) kan later.
- **Geen INTERNET-toestemming**: coöp (#95) werkt dus niet in de testversie.

## 5. Bouwen en testen

Eenmalig, alles buiten de repo en alleen uit officiële bronnen: JDK 21, de Android command-line tools (dl.google.com) en daarmee `platform-tools`, `platforms;android-36`, `build-tools;36.0.0`, en voor de emulator `emulator` en `system-images;android-35;google_apis;x86_64`, in bijvoorbeeld `C:\Users\<jij>\android-sdk` (`ANDROID_HOME` of `~/android-sdk`). Gradle komt via de wrapper (services.gradle.org), de npm-pakketten via `npm install` in `android/`.

```
cd android && npm install
npm run stage    # web-dist (bouwt web/build.mjs als hij ontbreekt) -> android/www -> cap sync
npm run build    # stage + gradlew assembleDebug -> android/out/gde-groningen-debug.apk
npm run smoke    # emulator of toestel via adb: installeren, starten, controles, screenshot
node scripts/icons.mjs   # launcher-icoon opnieuw uit desktop/resources/icon.png (ffmpeg)
```

`--rebuild` bouwt `web-dist` opnieuw. De eerste `web/build.mjs` duurt ca. 15 minuten (wereld bouwen); daarna is de wereldcache er. Ondertekend wordt alleen met de lokale debug-keystore van Gradle.

De rooktest controleert: app draait, WebView debugbaar, canvas en touch-UI, Capacitor-platform, liggend, brug actief, geen service worker, Opus, WebGL2, terugknop, geen fatale fouten in logcat.

## 6. Niet getest / open

- Geen echt toestel, geen touch-play, geen fps, geen geluid beluisterd, geen saveslot-rondgang, geen lange sessie (geheugen).
- De laatste wijziging (cutout-marges `disable`, zwarte vensterachtergrond) is gebouwd maar niet meer op de emulator bekeken.
- Terugknop naar pauzemenu: de brug is aangesloten, maar de rooktestcontrole gaf op het startscherm `false` (het pauzemenu opent pas na 'Nieuw spel'); niet bevestigd.
- Het startscherm past niet in 412 px hoogte: 'Nieuw spel' overlapt de voettekst (spelcode; apart issue voor #96). Het toont ook toetsenhints.
- Eigen icoon: voorlopig `desktop/resources/icon.png`; zodra het icoon van de a1-appicoon-sessie klaar is: `node scripts/icons.mjs <icoon>`.
- Geen release-build, AAB of signing (bewust).

## 7. Hervatten (Android is bewaard voor later)

Alle processen (Gradle-daemon, adb, emulator) zijn gestopt; er loopt niets.

Al op de machine, buiten de repo:
- `%USERPROFILE%\android-sdk` (ca. 5,1 GB): command-line tools, platform-tools, `platforms;android-35` en `-36`, `build-tools;35.0.0` en `36.0.0`, `emulator`, systeemimage `android-35;google_apis;x86_64`. Licenties zijn geaccepteerd. De AVD `gde_phone` (Pixel 6) staat in `~\.android\avd`.
- `~\.gradle` (Gradle 8.14.3 en afhankelijkheden), `android\node_modules` (28 MB) en `web-dist/` in de worktree (382 MB; gitignored, kan weg met `Remove-Item -Recurse web-dist`). De wereldcache `desktop\.world-cache` hoort bij het gewone webbuild.
- Opruimen als Android definitief niet doorgaat: `%USERPROFILE%\android-sdk`, `~\.android`, `~\.gradle`.

Volgende stappen:
1. `cd android && npm install`, dan `npm run build` (de eerste keer bouwt dat `web-dist`; ca. 15 min).
2. Emulator starten: `%USERPROFILE%\android-sdk\emulator\emulator.exe -avd gde_phone -gpu host` (laat hem draaien; `Start-Process`, niet in een tool die afbreekt), daarna `npm run smoke`.
3. Op een echt toestel (USB-foutopsporing): `adb install -r android\out\gde-groningen-debug.apk` en spelen; `chrome://inspect` voor de console.
4. Beoordelen: touch-layout, fps/geheugen per profiel (#96), geluid, saves, terugknop in het spel, notch-marges, startscherm in 412 px hoogte.
5. Icoon van a1-appicoon: `node scripts/icons.mjs <icoon>`.

Getest: APK bouwt, installeert en start op de emulator; rooktest geslaagd (Range-fix, WebGL2, Opus, liggend, geen service worker). `run_tests --quick` en `import_check` blijven groen op mijn wijzigingen (2 bestaande fouten, zie hierboven). Niet getest: zie sectie 6.

## 8. Stand 19 oktober: het spel draait op de emulator

Gemeten op de emulator (Pixel 6, Android 15, x86_64, 4 GB, WHPX, `-gpu host` en `swiftshader_indirect`), APK 208 MB met de hele wereld erin:
- Het spel start, het startscherm werkt met tikken, "Nieuw spel" start de openingsscène met de touchknoppen erbij. Screenshots: zie de notitiemap van de coördinator (`android-emulator`).
- **Wat het echte spelen verhinderde:** (1) het startscherm paste niet in 412 px hoogte (menu onder in beeld, credit eroverheen), dus tikken raakte de verkeerde regel; dat is nu een compacte indeling onder 460 px (`startscreen.css`); (2) een witte strook naast de uitsparing (thema, gerepareerd); (3) de emulator is langzaam: ca. 1,5 fps in het menu met het telefoonprofiel (resolutie 60%, korte afstand), ook met de RTX-GPU van de host (`(program)` 3,3 s van 8,8 s in een CPU-profiel, tegels laden en GC erbij; JS zelf is snel: 3e7 iteraties in 82 ms). CDP-evaluaties en `adb` hangen daardoor soms; de emulator verdween ook één keer tijdens een lange sessie. Dit zegt niets over een echt toestel; fps op een telefoon is nog niet gemeten.
- Meten: `node android/scripts/cdp.mjs "<js>"` (WebView-console) en `node android/scripts/cdpprofile.mjs [ms]` (CPU-profiel).
- Een kleine wereld-subset (`?mobiel=klein`) is niet nodig gebleken: de APK met de hele wereld laadt en speelt; de grootte (208 MB) is voor een testversie geen probleem.
- Nog te doen: touch-spelen na de openingsscène (stick, camera, instappen), saves na herstart, WebAudio, terugknop = pauzemenu in het spel, notch-marges op de HUD (de ondertitel overlapt "Houd SPRING ingedrukt" op een telefoon), fps op een echt toestel.
