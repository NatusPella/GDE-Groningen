# Inefficiënties in de game: audit van 21-11-2026 (#1066)

> Aanleiding: de eigenaar vroeg "kijk welke inefficiëntie er in de game zit die we kunnen fixen". Tak `inefficientie-21-11` (main = 828ec9f57).
> **Geen Electron gebruikt** (de releasegate draaide de perf-fasen): alles hieronder komt uit Node-scripts, statische analyse,
> microbenchmarks en bestandsgroottes. Niets gepusht of gemerged. Meetscripts: `scripts/perf/assetaudit.mjs`, `importtijd.mjs`,
> `hotscan.mjs`, `cachescan.mjs`.

## Samenvatting

De game is op CPU-niveau al vrij netjes (HUD schrijft alleen bij verandering, CSS animeert vrijwel niets op layout, `backdrop-filter` staat
bijna overal uit, JSON-parse kost samen ca. 22 ms). De grote inefficiëntie zit in **data en pakket**: 324 MB audio, waarvan 218 MB muziek
op 192 kbps stereo, 38 MB voiceline-clips die geen code vraagt, en 1186 losse modulebestanden (15 MB broncode) die bij de start worden geladen.
De hoofdthread-hotspots (indexbouw per tegelwissel, GC, `insideBuilding`) staan in `PERF-PROFIEL-21-11.md` en zijn van de streaming-agent.

## Top-20 vondsten (grootste winst eerst)

| # | Vondst | Waar | Geschatte winst | Risico | Stand |
|---|---|---|---|---|---|
| 1 | 59 muziekbestanden op **192 kbps stereo** (217,6 MB van 294 MB mp3) | `game/audio/gmusic`, `scenario`, `theme` | 128 kbps: **-72 MB** (-33%); 96 kbps: **-109 MB** (-50%). Gemeten op `Hooge_Lucht.mp3`: 4,35 MB naar 2,90 MB (128k) en 2,17 MB (96k) | lossy naar lossy: kwaliteitsbesluit voor de eigenaar; de mix blijft ongemoeid | **open** (issue) |
| 2 | 1.891 voiceline-clips (37,8 MB) die geen code of lijst meer vraagt (1.920 manifestregels: lines 1.288, banter 534, sms 63, hints 20, story 15) | `game/audio/voicelines/*` | **-37,8 MB** op schijf en in het pakket | middel: de collector kent dynamische sleutels misschien niet; `audio_unused.mjs --delete` weigert op de CRLF-werkboom (terecht) | **open**: draai `node scripts/audio_unused.mjs --delete` op een LF-checkout, daarna `voice_coverage` en de voicetests |
| 3 | 55 Chromium-taalbestanden (49 MB uitgepakt) in elke Windows- en Linux-build; op macOS 55 `.lproj` | `desktop/package.json` | **-47 MB** uitgepakt per build (installer ca. -12 MB; portable-exe pakt bij elke eerste start minder uit) | laag: `nl` en `en-US` blijven | **gefixt** (`electronLanguages`); effect pas zichtbaar in de volgende `npm run release` (niet gebouwd) |
| 4 | 1.186 modulebestanden (14,95 MB) bij de start via `main.js`; geen bundel | `game/js` | Niet in Node te vertalen naar Electron-ms; in Node kost laden + parsen 1,9 tot 5,7 s (belaste machine), de eigen top-level code van alle modules samen maar 106 tot 300 ms | hoog (bundelen raakt het streaming-pad, de importmap en de web-build) | **open** (issue): meten in Electron (zie onder), daarna kiezen tussen `modulepreload`, bundelen of V8-codecache |
| 5 | 3,1 MB aan regelcommentaar (20% van de broncode, + 0,7 MB inspringing) wordt meegeleverd en geparsed | `game/js` | -3,1 tot -4 MB pakket; parse-winst klein (commentaar is goedkoop te scannen) | middel: een naïeve strip raakt template-strings | **open** (alleen met een echte tokenizer, bijvoorbeeld in `desktop/build.mjs`) |
| 6 | 111 WAV-bestanden in PCM (10,1 MB): npc, nieuws, police, kill-barks | `game/audio/npc`, `nieuws`, `police`, `voicelines/*.wav` | ca. **-8,5 MB** als ogg of mp3 (24 kHz mono) | middel: lossy en de paden staan in `audio.js` (`.wav`) | **open** |
| 7 | `three.module.js` is 1,27 MB onverkleind (gz 258 KB) | `desktop/vendor-cache/npm/three@0.160.0` | ca. -0,6 MB, parse enkele ms; de importmap blijft één URL | middel (vendor-lock, stacktraces) | **open** |
| 8 | **Dode exports:** 240 (drempel 221 werd al overschreden) | 54 bestanden in `game/js` | 121 minder: 101 `export`-sleutels weg (naam alleen intern gebruikt) en 20 declaraties weg die nergens meer voorkomen; drempel 221 naar **119** | laag: elke naam is eerst in de hele repo gezocht | **gefixt** |
| 9 | `scripts/audio_unused.mjs` was kapot op Windows: backslashes in de vergelijking en geen submappen in de codescan: 4.365 van 4.410 bestanden "ongebruikt" | `scripts/audio_unused.mjs` | gereedschap klopt weer (nu 2.045: 1.891 voicelines plus 154 sfx die via `sfx/manifest.json` lopen en dus vals-positief zijn) | geen | **gefixt** |
| 10 | `wijkProfileAt` cache groeit met elke gereden 60 m-cel, nooit geleegd | `game/js/trafficfleet.js` | geheugen: grens van 8.192 cellen; test `wijkprofiel_cache_test` | laag (pure functie van de plek) | **gefixt** |
| 11 | `nightlights3d.lampByKey` en `lampGrid` bewaren elke lantaarn "ooit gemaakt" (bedoeld, tegelherlaad) en groeien over een lange rit | `game/js/nightlights3d.js` | enkele MB na een provincierit (niet gemeten) | middel (de herlaadlogica leunt erop) | **open**, meet met `leak_soak.mjs` |
| 12 | Audiobuffers werden nooit vrijgegeven (voorstel in `PERF-RONDE-21-11.md`) | `game/js/audio.js` | geheugen | n.v.t. | **al opgelost in #1040** (weer-, vliegtuig- en diergeluiden gaan na vijf minuten of boven 48 MB weer los); de oude bevinding is achterhaald |
| 13 | `clamp` staat in 42 bestanden (drie vormen, met en zonder NaN-gedrag), `lerp` in 15 | `game/js/*` | ca. 3 KB broncode, vooral onderhoud | laag per bestand, maar `util.js` trekt `waterindex` binnen (importcyclus-risico) | **open**: eerst een kaal `mathutil.js` |
| 14 | `marinas.json` wordt door drie modules apart opgehaald en geparsed, `vliegplekken.json` door twee | `activities.js`, `marinas3d.js`, `regatta.js`, `planeflight.js`, `vliegschool.js` | < 1 ms | laag | **open** (niet de moeite) |
| 15 | `overlayhold.js` pollt elke 150 ms met 12 `querySelector`-aanroepen, `touch.js` elke 200 ms (ook op desktop zonder touch) | zie bestanden | ca. 80 selectorquery's per seconde, < 0,5 ms/s | laag | **open** (micro) |
| 16 | `FrameQueue.run` sorteert de rij elke aanroep en gebruikt `shift()` | `game/js/tilestore.js` | bij 2.000 items 30 µs sorteren plus 78 µs shiften per frame: **verwaarloosbaar** (gemeten) | n.v.t. | **bewust niet gedaan** |
| 17 | JSON bij de start: `vaarnet.json` 1,9 MB (8,0 ms parse), `facilities` 0,8 MB (2,6 ms), `waterplekken` (1,9 ms), `grenzen` (1,8 ms), samen ca. **22 ms** warm | `game/*.json` | minify scheelt 228 KB totaal; lui laden scheelt hooguit enkele ms | n.v.t. | **geen probleem** (gemeten) |
| 18 | Tegels (`.gdp`, 56 MB, 82 stuks) zijn al gecomprimeerd: gzip wint nog 4% | `game/world` | geen | n.v.t. | **geen probleem** (gemeten) |
| 19 | Geen exacte duplicaten in `game/audio`, `img`, `fonts`, `models` (md5 over 4.700 bestanden); `tts.json` (3 MB) komt al niet in het pakket | repo | geen | n.v.t. | **geen probleem** |
| 20 | CSS: slechts twee `@keyframes` op layoutproperties (`hx-shake`, `cb-bar-in`, allebei kort), 19 `backdrop-filter`-regels waarvan de meeste `none` zijn (menu's en fotomodus) | `game/js/*.css` | geen | n.v.t. | **geen probleem** |

## Meetresultaten (voor en na)

| Meting | Voor | Na |
|---|---|---|
| Ongebruikte exports (`dead_code.mjs`) | 240 (drempel 221: overschreden) | **119** (drempel 119) |
| `audio_unused.mjs` "ongebruikte bestanden" op Windows | 4.365 (218 MB, onzin) | 2.045 (42 MB; 1.891 echte voicelines) |
| Locales in de build | 55 paks, 49 MB | 2 (nl, en-US) na de volgende build |
| Modules via `main.js` | 1.186 (14,95 MB) | gelijk (ongewijzigd: de dode exports waren klein) |

## Wat is hot-path-gedrag (C en D)

`scripts/perf/hotscan.mjs` scant 152 update-/tick-functies. Bovenaan staan paneelfuncties die alleen draaien als het paneel open is
(`renderAchievementsPanel`, `syncPresets`, `renderDetail`), en de enige echte per-frame-kandidaten (`drawMinimapPois`, `drawMinimap`,
`updateCards`, `updateCityProps`, `syncVehicleDoors`) hebben vroege uitgangen of werken op kleine lijsten (7x7 cellen, < 20 kaarten). Geen
daarvan haalt een meetbare tijd; de bewezen hotspots blijven die uit `PERF-PROFIEL-21-11.md` (indexbouw per tegelwissel, `insideBuilding`,
GC). `cachescan.mjs` vond 28 caches zonder `clear`; 26 hebben een beperkte sleutelruimte (soorten, kleuren, geometrieën per type), twee
groeien met de gereden afstand (`profileCache`: gefixt; `lampByKey`: open).

## Welke Electron-metingen nog nodig zijn

1. **Opstart:** `scripts/perf/loadcheck.mjs` en `__loadMarks` voor de tijd van de 1.186 `import`-verzoeken (netwerk/schijf plus parse) tegenover de
   rest van het laden; pas daarna beslissen over bundelen (vondst 4). Vergelijk met `modulepreload` voor de top-100 modules en met V8-codecache.
2. **Pakket:** een echte `npm run release`-bouw (installer- en uitgepakte grootte met `electronLanguages`; controleer dat de app met `nl` start
   en dat `en-US` voldoet als terugval).
3. **Muziek:** een luistertest 128 kbps tegenover 192 kbps (eigenaar), plus `memcheck.js` voor de buffer-grootte van het stream-element.
4. **Geheugen:** `leak_soak.mjs` over een provincierit voor `lampByKey` (vondst 11).
5. **Overlayhold/touch-poll** (vondsten 15): `PERF_HUD_MARKS=1`; waarschijnlijk niets.

## Open voor de coördinator

- Vondst 2 uitvoeren (op een LF-checkout; 37,8 MB). Vondst 1 en 6 zijn een besluit van de eigenaar over kwaliteit.
- Vondst 4 is de grootste mogelijke opstartwinst en de enige die een ADR verdient (bundelen tegenover losse modules).
