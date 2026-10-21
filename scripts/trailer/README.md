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
