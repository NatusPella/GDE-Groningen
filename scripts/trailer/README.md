# Trailers opnemen en monteren (scripts/trailer)

Twee trailers van het echte spel: de **gameplaytrailer** en de **verhaaltrailer**, 1080p60, H.264 + AAC. Alles is reproduceerbaar; er wordt
niets geüpload of aangemaakt (AGENTS.md, constitution 8). Het uitgebreide controleverslag staat in [docs/TRAILER-CONTROLE.md](../../docs/TRAILER-CONTROLE.md).

## Hoe het werkt

1. **Opnemen met een vaste tijdstap** (`desktop --clip=<map>`, `lib/clip.page.js`). Het spel draait in Electron op 1920x1080 met de preset Hoog
   (schaduwen, zichtafstand heelver, resolutie 100% zonder automatische schaal). `requestAnimationFrame`, timers en CSS-animaties lopen op een
   virtuele klok van 1/60 s. **Elk beeld wordt pas opgenomen als de wereld rond de camera klaar is met laden**: geen tegels in de wachtrij, geen
   werk in de geometrie-worker, geen gebouwen of wegen te gaan. Is er nog iets onderweg, dan draaien er tussenbeelden van 0,02 ms tot het binnen is
   (de klok loopt daar niet door). De opname is dus onafhankelijk van hoe zwaar de machine belast is.
2. **Clipscripts** (`shots/*.page.js`) zetten een plek, tijd en weer klaar, laten een voertuig echt rijden (bestuurder met stuur en gas via de
   invoer van het spel, politie, verkeer), sturen de camera (rigs, sneden binnen één opname) of openen schermen van het spel (pauzemenu, garage,
   Opgeslagen spellen, Samen spelen). De verhaalclips spelen de echte filmpjes van het spel met de bestaande stemopnames.
3. **Montage** (`montage.mjs`) knipt de clips op de maat van de muziek en mixt het geluid (`audio/mix.mjs`): Gemini-muziek uit `game/audio/gmusic`,
   bestaande stemopnames, eigen effecten (in ffmpeg gesynthetiseerd). Muziek zakt onder spraak, daarna -14 LUFS en true peak <= -1 dBTP.
4. **Controle**: `check_video.mjs` (dubbele beelden, zwart, sneden, pop-in), `check_audio.mjs` (RMS per 100 ms, dalingen, sprongen, stiltes,
   luidheid, grafiek), `contact_video.mjs` (één beeld per seconde voor het oog), plus de gebeurtenissenlijst per clip (`<clip>.json`).

## Opnieuw maken

```bash
# 1. de game met de wereld klaarzetten (wereld uit een recente build; stagen kost ~40 s met GDE_PREBUILT_WORLD)
GDE_PREBUILT_WORLD=<ander>/desktop/build/game/world GDE_STAGE_OUT=<map>/game node desktop/build.mjs

# 2. clips opnemen (neemt zelf een Electron-slot uit ~/gde-locks; ELECTRON_EXE en ffmpeg op het PATH of GDE_FFMPEG)
node scripts/trailer/run.mjs --shots=gameplay --out=<map-buiten-de-repo>/clips --game-dir=<map>/game
node scripts/trailer/run.mjs --shots=verhaal  --out=<map-buiten-de-repo>/clips --game-dir=<map>/game

# 3. monteren en controleren
node scripts/trailer/montage.mjs scripts/trailer/plans/gameplay.json --out=<map>/pakket
node scripts/trailer/check_video.mjs <map>/pakket/<naam>.mp4 --out=<map>/controle
node scripts/trailer/check_audio.mjs <map>/pakket/<naam>.mp4 --out=<map>/controle --allow=<allow.json>
node scripts/trailer/contact_video.mjs <map>/pakket/<naam>.mp4 --out=<map>/controle --every=1
```

Tijdens het ontwikkelen houdt `run.mjs --repl` één Electron open (één slot); met `repl_shot.mjs` (voorbeeld: `--preview` geeft 6 stills per clip,
`pv.mjs` maakt er een blad van), `repl_lib.mjs` (de bibliotheek herladen zonder herstart) en `repl_boot.mjs` (het spel opnieuw starten zonder het
slot los te laten) loopt een proef in een minuut.

## Bestanden

| Bestand | Wat |
|---|---|
| `run.mjs`, `lib/clip.page.js`, `desktop/clipvideo.js` | opnamemodus, vaste tijdstap, wachten op laden, camera, rijden, bijschriften |
| `shots/gameplay.page.js`, `shots/verhaal.page.js` | de clips |
| `plans/*.json` | de montageplannen (clips, tijden, geluid) |
| `montage.mjs`, `audio/mix.mjs` | montage en geluidsmix (SFX-synthese, ducking, -14 LUFS) |
| `audio/analyze_music.mjs`, `audio/voice_catalog.mjs` | tempo en schone stukken van de nummers; alle bestaande stemopnames |
| `check_video.mjs`, `check_audio.mjs`, `contact*.mjs`, `pv.mjs` | controle en contactbladen |
| `thumbs.mjs`, `kenburns.mjs` | miniaturen (1280x720) en zoom over een stilstaand beeld |

## Valkuilen (uit de praktijk)

- `repl_shot.mjs` laadt de bibliotheek niet opnieuw: na een wijziging in `lib/clip.page.js` eerst `repl_lib.mjs` (of `repl_boot.mjs`) draaien.
- Het hoofdmenu (Alleen spelen / Samen spelen) wordt voorbijgegaan met `window.__menuStart('nieuw')` (in `prepare()`); het openingsfilmpje begint pas enkele seconden daarna en pauzeert het spel, dus `skipCinematics` wacht 6 s rust.
- Samen spelen (`repl_boot.mjs --url-add=coop`): de gebouwen laden pas na een paar seconden terwijl `pending()` al 0 meldt; eerst een proefscript (`resetUi`, `placePlayer`, `settle`) en dan 400 beelden wachten. Een opname direct na de herstart bleef twee keer hangen.
- Menu-opnames (`uiRun`): het scherm opent vóór de opname en krijgt 50 beelden om in te faden, anders zijn de eerste beelden de wereld met HUD. Neem ze op in een schone sessie: na scriptmatig rijden toonde Prestaties een negatief getal.
- Doelmarkeringen (zuil, ring, pictogram) worden verborgen (`hideMarkers`); het pictogram in de rit is een winkel- of deurmarkering die de camera anders binnenvliegt.
- Bijschriftensporen samenvoegen in RGB (`gbrp`), niet in YUV: `blend=multiply` op de kleurvlakken geeft een paarse zweem. Een bijschriftenspoor kost ~8 minuten per trailer; wijzig daarom eerst de lijst en neem pas dan op.
- De draaiende app saneert sidecar-namen met de oude regex alleen goed in een nieuwe start (`clipvideo.js`); een Electron die vóór de fix startte schreef `___-___.json`.
- Slots: een tweede `run.mjs --repl` met `--electron=<pad naar de hoofdmap-electron>` aan de wachtrij zetten vóór het oude `quit` krijgt het slot als eerste; zonder werkend `--electron` kost de wachtrij 25 minuten.

## Cijfers en kaarten voor een langere showcase-trailer

- `plans/cijfers.mjs` leest het cijferblad van de schaalmeting (`scripts/stats/schaal.mjs`; pad: `--cijfers=`, `$GDE_CIJFERS` of een `cijfers.json` in het uploadpakket). Overlays in een shot: `nums: [[id, start, duur, label, achtervoegsel, pos]]` (in `make_plan.mjs` / `make_story.mjs`), bijschriften mogen `{id}` bevatten. Een onbekend id stopt de montage: er komt geen verzonnen getal in beeld.
- `plans/showcase_kaarten.mjs` maakt de JSON per kaart (cijfers, commits per dag, sessies, testuitvoer, balken); `shots/kaarten.page.js` neemt ze op (`repl_shot.mjs --args=<kaart.json> shots/kaarten.page.js kaart`) en de slotkaart (`slot`). De lijst met de montage zelf staat buiten git.
- Nieuwe opnames: `u09-provincie` (kaart over de hele provincie; mist vooraf via `exploreCity`), `k-*` (vluchten per streek), `m-*` (minigames), `s13-brug`, `x-trein`, `x-daguur`, `c01-samen` (met `repl_boot.mjs --url-add=coop`).
