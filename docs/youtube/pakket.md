# YouTube-uploadpakket (#63)

Het complete pakket voor de eerste YouTube-upload staat lokaal klaar, buiten git, in
`~/GIT/GDE-uploadpakket` (video's van 100 MB horen niet in de repo; `trailervideo.js`
weigert dat ook). **Niets is geüpload of aangemaakt**; kanaal, uploads en publicatie doet de
eigenaar zelf (constitution 8). Het stappenplan voor de eigenaar staat in
`LEES-MIJ-EERST.md` in die map. De teksten (titels, beschrijvingen, tags, kanaaltekst), het stappenplan
en het controlerapport staan als bron ook in [pakket/](pakket/).

| Onderdeel | Waar |
|---|---|
| Gameplaytrailer (cut `gameplay`, ~63 s) en verhaaltrailer met Tessa (cut `verhaal`, ~80 s), 1080p60, H.264 + AAC | `video/` |
| Thumbnails 1280×720, titel "GDE Groningen – Zomer vol misdaad" | `thumbnails/` |
| Titels, beschrijvingen met hoofdstukken, tags, instellingen, kanaaltekst en bannertekst | `teksten/` |
| Profielfoto, banner, watermerk (uit `docs/youtube/beelden/`) | `kanaal/` |
| Contactbladen en rapport van de beeldcontrole | `controle/` |

## Opnieuw maken

```bash
cd desktop && npm run stage      # of wijs met --game-dir naar een recente staged build
node scripts/record_trailer.mjs --run --slot --cut=gameplay,verhaal --res=1080p --out=<map buiten de repo>
node scripts/video_check.mjs <video.mp4> --out=<map>          # contactbladen, zwart/stilte/luidheid
node scripts/youtube_thumbnails.mjs --game-dir=<staged game> --frames=<beelden> --out=<map>
```

- `record_trailer.mjs` kent de cuts `teaser`, `hoofd`, `gameplay`, `verhaal`, `kort` en `vol`.
  `--slot` wacht op en houdt een Electron-slot uit `~/gde-locks` (max. drie tegelijk);
  `--game-dir` of `GDE_GAME_DIR` en `ELECTRON_EXE` laten het draaien zonder eigen stage.
- Muziek en stemmen mixt `desktop/trailervideo.js` zelf in (themasong uit `game/audio/theme`, stemmen uit
  `game/audio/voicelines`, effecten gesynthetiseerd); er is dus geen losse audiotap nodig. De controle
  van het geluid is `video_check.mjs`: stilte, piek en luidheid (LUFS) met ffmpeg.
- `video_check.mjs` vervangt het kijken niet: de contactbladen (één beeld per seconde met tijdstempel)
  moeten met het oog worden doorgelopen op zwart beeld, rare camera, ontbrekende stad (lage LOD),
  echte merken en geraakte burgers.

## Wat de controle opleverde (en hier is hersteld)

- **Ontbrekende stemclips in de verhaaltrailer**: `st-bijbaan_1_a_91280b` en `h2-pass-karaat_0_t_739985`
  bestaan niet meer (de regels zijn herschreven); de ondertitel stond er wel, het geluid niet.
  Vervangen door bestaande clips met dezelfde rol (*Zonder die Eierbal geen Fjord Frituur.* en
  *Het museum. De Gouden Eierbal.*).
- **Camera achter een brugleuning** in de Jelle-shot (verhaaltrailer en H18 in de gameplaytrailer):
  de camera staat nu boven de leuning.
- **De Escapade ramde fietsen en vuilnisbakken** aan het eind van de shot (brokstukken in beeld): de
  gemelde snelheid is laag, de auto glijdt wel gewoon door. Een paar fietsen tuimelen nog steeds weg;
  er zitten geen mensen op. In de achtervolging vliegen op dezelfde manier fietsen over de politieauto's
  (de wereldsimulatie), zonder voetgangers of bloed; dat is zo gelaten.
- **Lege Ommeland-shot** in de gameplaytrailer (donker veld met een melkbus): vervangen door de
  traumaheli boven het UMCG; de kaart "Een hele stad. Een heel Ommeland." blijft.

## Leeftijd

De game is 18+ (`docs/LEEFTIJD.md`, `docs/IARC-ANTWOORDEN.md`). De beschrijvingen openen met een 18+-waarschuwing;
de trailers tonen geen bloed en geen geraakte burgers, dus advies: de YouTube-leeftijdsbeperking niet aanzetten.

## Niet getest

Niet in YouTube zelf bekeken (auteursrecht/Content ID op de Gemini-muziek, hoofdstukken, thumbnail op klein
formaat), niet op telefoon of tv. De opnames zijn met één build gemaakt (de staged build van de
`sweep-visueel`-worktree op main `ca5453cf`, plus de herstellen hierboven); 4K is niet opgenomen.
