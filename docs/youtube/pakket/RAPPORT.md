# Rapport van de beeld- en geluidscontrole (20 oktober 2026)

Opnames: `scripts/record_trailer.mjs` (Electron-opnamemodus van de game, vaste stap 1/60 s, 1920×1080,
ffmpeg H.264 CRF 18 + AAC 192k). Build: de staged build van main `ca5453cf` plus de herstellen hieronder
(branch `claude/y12-uploadpakket`). Controle: `scripts/video_check.mjs` (contactbladen, zwart, stilte,
luidheid) en daarna met het oog **elk blad doorgelopen** (één beeld per seconde) plus close-ups bij twijfel.

## Resultaat per video

| | Gameplaytrailer | Verhaaltrailer |
|---|---|---|
| Duur | 62,8 s | 80,4 s |
| Formaat | 1920×1080, 60 fps, H.264, AAC 48 kHz stereo | idem |
| Bitrate / grootte | ~14,8 Mbit/s, 116 MB | ~9,3 Mbit/s, 93 MB |
| Zwart beeld | alleen de uitfade in de laatste 0,4 s | het radiobeeld 0-4 s (bedoeld: "06:12" op zwart) en 0,7 s tussen logo en Berend (bedoeld) |
| Stilte | geen | geen |
| Luidheid | -15,9 LUFS, piek -1,2 dB | -13,8 LUFS, piek -0,8 dB |
| Stemmen | geen (alleen muziek en kaarten) | 13 stemregels, alle aanwezig, ondertiteld in beeld |

Het geluid in beide video's is de Gemini-themasong plus (verhaal) bestaande game-stemmen; er zijn geen
nieuwe TTS-regels of eigen muziek gebruikt. De themasong zakt onder de stemmen.

## Gevonden en hersteld (eerste opname → tweede opname)

1. **Ontbrekende audio (verhaaltrailer):** twee stemclips bestonden niet meer (`st-bijbaan_1_a_91280b`,
   `h2-pass-karaat_0_t_739985`); de ondertitel stond er wel, het geluid niet. Vervangen door bestaande
   clips (Tessa: "Zonder die Eierbal geen Fjord Frituur." en "Het museum. De Gouden Eierbal."). Tweede
   opname: 13 van 13 clips gevonden.
2. **Rare camera:** in de Jelle-shot (verhaaltrailer 31-36 s en de trekker-limo in de gameplaytrailer) stond
   de camera 0,6 m hoog achter een brugleuning, met palen die het beeld in sneden. Nu 2,3 m, boven de leuning.
3. **Lege shot:** de Ommeland-shot in de gameplaytrailer (43-45 s) toonde een bijna zwart grasveld met een
   melkbus, dus niets herkenbaars. Vervangen door de traumaheli boven het UMCG.
4. **Brokstukken:** de Escapade ramde aan het eind van haar shot fietsen en vuilnisbakken. Lagere gemelde
   snelheid; er tuimelen af en toe nog fietsen weg. In de achtervolging (verhaal 44-48 s en de HUD-versie in
   de gameplaytrailer) vliegen fietsen over de politieauto's; dat is wereldsimulatie zonder mensen en is zo
   gelaten.

## Gecontroleerd en in orde

- Echte merken in beeld: geen. Winkel- en voertuignamen in de HUD zijn verzonnen (Kanselier, Pakezel,
  Omafiets, Terpstra Trekker-limo, Grachtengast). Naamkaarten tonen Tessa en Tammo (niet de oude naam).
- Spoilers: geen lege vitrine, geen kaartje "Tige tank!"; de vitrine toont de Gouden Eierbal.
- Bloed, geraakte burgers, gore: niet in beeld.
- Stad en detail (lage LOD, ontbrekende gebouwen): de binnenstad staat overal volledig en met het juiste
  detail; alleen de verre horizon is vlak (bedoeld, mist).
- Hoofdstukken in de beschrijvingen komen uit de shotgrenzen (CUT_ORDER); elk is ≥ 10 s.

## Niet getest

Niet in YouTube Studio bekeken (Content ID, hoofdstukken, thumbnail op klein formaat), niet op telefoon of
tv, 4K niet opgenomen.

## Waar de bladen staan

`gameplay/*_blad_NN.jpg` en `verhaal/*_blad_NN.jpg`: elk blad toont 12 seconden, een beeld per seconde met
tijdstempel. `*_controle.txt` heeft de ruwe cijfers. `stills/` zijn de vier beelden achter de thumbnails.
