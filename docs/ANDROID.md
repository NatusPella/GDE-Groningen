# Android-testversie (#227, #96)

Lokaal bouwbare **debug-APK** van het spel (Capacitor-WebView rond de webversie). Alleen voor testen: niets uploaden, geen Play Console, geen eigen sleutels (constitution 8); ondertekend wordt met de debug-keystore van Gradle.
Stand 20 oktober: de APK bouwt (162 MB), draait op een Android-emulator (Pixel 6, Android 15) en is daar met echte aanrakingen gespeeld. **Nog niet op een echt toestel getest.**

## Bouwen

Eenmalig, buiten de repo en alleen uit officiële bronnen: JDK 21, de Android command-line tools (dl.google.com) met `platform-tools`, `platforms;android-36`, `build-tools;36.0.0`, `emulator` en `system-images;android-35;google_apis;x86_64` in `~/android-sdk` (of `ANDROID_HOME`); Gradle komt via de wrapper.

```
cd android && npm install
npm run build -- --rebuild   # web-dist (web/build.mjs) -> android/www -> cap sync -> gradlew assembleDebug
# resultaat: android/out/gde-groningen-debug.apk
npm run smoke                # emulator/toestel via adb: installeren, starten, controles, screenshot
```

De eerste `web/build.mjs` bouwt de wereld (ca. 15 min); met een bestaande wereldcache (`desktop/.world-cache`, `game/world`) en Opus-cache (`web/.cache`) duurt de hele build ca. 3 min. Zonder `--rebuild` hergebruikt hij `web-dist/`.
Installeren op een toestel (USB-foutopsporing): `adb install -r android/out/gde-groningen-debug.apk`; `chrome://inspect` voor de console.

## Hoe het in elkaar zit

- `android/scripts/stage.mjs` kopieert `web-dist` naar `android/www` zonder service worker, mp3-muziek en originele geluidspacks (de WebView speelt Opus) en zet `android-bridge.js` voor de loader. `game/` is niet aangepast voor Android, behalve de touch-, opslag- en geluidsfixes hieronder.
- Alles zit in de APK (wereld ca. 100 MB, geluid ca. 90 MB): offline, geen INTERNET-toestemming, dus coöp (#95) werkt niet.
- `MainActivity`: volledig scherm (immersive), scherm blijft aan, alleen liggend (`sensorLandscape`, 180° draaien blijft liggend), uitsparing via `env(safe-area-inset-*)`. Gaat het WebView-renderproces dood (geheugen, driver), dan start de activiteit opnieuw en staat de reden in logcat (tag `GDE`).
- `android-bridge.js`: terugknop = Escape (pauzemenu), de app pauzeert als hij naar de achtergrond gaat, Range-verzoeken worden zelf afgehandeld (de lokale server van Capacitor beantwoordt ze fout), vraagt blijvende opslag aan.

## Touch (game/js/touch.js, touchlogic.js)

Linker duim: zwevende stick; rechter helft: camera; knoppen per situatie (te voet, voertuig, boot, helikopter, duif, trein, minigames, carillon, pannenkoeken, Fjord Frituur) met de Nederlandse labels van de gamepad-indeling; "Meer" bevat de overige acties, "II" is de pauzeknop. Tijdens een **cutscene** staat er één knop **Overslaan** (vasthouden); eerder werkte overslaan met aanraking niet. Sturen en gas tegelijk werkte ook niet: `Input.axis()` gaf alleen de stick terug zodra die niet nul was, dus een auto stond stil zodra je stuurde (nu per as; getest in `touch_test.mjs`). De toetsenhints (`hud-ctx`) zijn op touch verborgen. Het geluid ontgrendelt ook op `pointerup`/`touchend` (Chrome telt een aanraking pas bij het loslaten als gebruikersgebaar).

## Opslag, geluid, kwaliteit

- Saves: `localStorage` van de WebView (origin `https://localhost`), sleutels `gde-*`; `allowBackup=false`. De stand wordt ook bewaard zodra de pagina naar de achtergrond gaat. De migratie van oude `gte-*`-sleutels is getest in `scripts/save_migration_test.mjs`, niet in de WebView. Let op: de WebView schrijft localStorage met vertraging naar schijf; een app die direct na Opslaan geforceerd wordt gestopt kan die laatste opslag kwijt zijn.
- Kwaliteit: `gfxprofile.js` kiest bij de eerste start op een aanraaktoestel zelf: `telefoon` (laag, geen schaduwen, korte afstand, resolutie 0,6), `telefoonZwak` bij weinig geheugen of kernen (`deviceMemory` <= 3 of <= 4 kernen: resolutie 0,5), `tablet` en `tabletKrachtig`; automatische resolutie stuurt bij.

## Testen op de emulator

`android/scripts/ride.mjs` (met `driver.mjs`) installeert de APK, start het spel en speelt het met touch-events via de WebView-DevTools; status komt uit `window.__debug`. Schermafdrukken en verslag staan in `android/out/ride/`.
```
node scripts/ride.mjs --hulp --min 12   # nieuw spel, opening, camera, lopen, M01 rijden, opslaan, herstart, terugknop, rotatie, achtergrond, geluid, fps, app doden
node scripts/ride.mjs --alleen-opslaan  # alleen opslaan en systeemstappen, vanaf het startmenu met een bestaande stand
```
Emulator: `emulator -avd gde_phone -gpu host -no-audio -no-snapshot -no-window -memory 5120`. **Minstens 4 GB** voor de gast: met 2 of 3 GB sneuvelt het renderproces zodra de wereld laadt (het WebView-proces zit dan boven 1,3 GB). Herstart de emulator als hij na uren traag of onstabiel wordt. Met `-gpu swiftshader_indirect` hangt hij.

Gemeten op de emulator (zegt niets over een telefoon): 47-60 fps met profiel `telefoonZwak`/`telefoon` op een RTX-GPU van de host; laden tot het startscherm ca. 50 s.

## Niet getest of niet gelukt

- Geen echt toestel; geen fps, geheugen of warmte op een telefoon; geen Bluetooth-gamepad; geen tablet.
- Het geluid is niet beluisterd (`-no-audio`); wel draait de AudioContext (`running`) en wisselt de muziek van titel.
- **M01** (stuntmissie, "nul krassen") is met touch gestart: instappen, rijden met stick en Gas/Rem, Handrem, de stuntzone en rekwisieten raken (tot 140 punten), maar **niet uitgespeeld**. Het rijscript is te traag en te onhandig voor de volle Grote Markt (voetgangers raken kost 250 punten) en de emulator draait bij weinig vrij werkgeheugen op de host nauwelijks door (spelklok 59 s na minuten). De 1,8 km naar Berend is met de dev-sprong overbrugd, en bij vastlopen met de dev-teleport naar de markering.
- Het pauzemenu van een telefoon is hoger dan het scherm (Opslaan staat onderaan de rail); scrollen met een veeg werkte op de emulator niet, programmatisch scrollen wel.
- `Input.dispatchTouchEvent` met `touchEnd` en een puntenlijst laat precies die vingers los (`driver.mjs`). Raakt een pointerup verloren, dan negeert touch.js nieuwe aanrakingen aan die kant; `lostpointercapture` beëindigt nu stick en camera, en het script gebruikt `blur` als noodknop.
- Het terugkeren uit de achtergrond (pauzemenu) is handmatig bevestigd; in `ride.mjs` is die stap soms flaky door time-outs van de DevTools.
- Opruimen als Android definitief niet doorgaat: `C:Users<jij>android-sdk`, `~.android`, `~.gradle`, `android/node_modules`, `web-dist/`.
