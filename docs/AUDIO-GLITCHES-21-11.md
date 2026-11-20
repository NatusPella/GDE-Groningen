# Audio-glitches en ruis (melding Nikky, playtest 0.64.0, 21-11)

Melding van de eigenaar: Nikky (AMD RX 9070 XT, een sterke pc, maar ook haperingen en lage fps) hoort "wat audio glitches, met soms een ruisgeluid". Dit document zegt wat we onderzochten, wat bewezen is, wat niet, en wat Nikky kan proberen. Niemand heeft het kunnen **beluisteren**: alles hieronder is gemeten (`node scripts/audio/ruis_test.mjs`, zonder Electron) of uit de code gelezen. Issue: zie de stand-comment op het GitHub-issue "Audio-glitches en ruis".

## Wat er al was (geen oorzaak)

- `latencyHint: 'balanced'` (geen `interactive`): de audiodraad heeft ruimte. De motor en het wegruis draaien in een AudioWorklet; er is geen `ScriptProcessorNode` (`grep createScriptProcessor`: geen treffers).
- Master 0,55 maal de volumeschuif; SFX gaan door een zachte knip (tanh, `buildSoftClip`); een stemlimiet en HRTF alleen dichtbij (`HRTF_NEAR`); de watchdog (elke 2 s) herstelt een gestopte context, de gain-standen en een NaN in de mix.
- De scenariomuziek bewaart één gedecodeerde track tegelijk (`evictScenarioBuffers`) en zoekt de lus in stappen (`createLoopScan`).

## Hypotheses: bewezen of niet

| # | Hypothese | Uitkomst | Bewijs |
|---|---|---|---|
| 1 | Hoofdthread-stall hindert de audio-callback | **Niet bewezen, waarschijnlijk niet de oorzaak.** De audio draait op een eigen draad; een stall van het beeld geeft zelf geen gat. Wel kan een overbelaste processor (software-GL, lage fps door de CPU) ook de audiodraad uithongeren. | Code. Nu meetbaar: de glitchdetector en `renderCapacity` in het blok Geluid |
| 2 | Samplefrequentiemismatch en omrekenen | **Uitgesloten als ruisbron, wel een kostenpunt.** Alle 154 opnames zijn 44,1 kHz mono; de browser rekent ze bij het decoderen eenmalig om naar de apparaatfrequentie (48 kHz). Dat is netjes en geen ruis. De context krijgt geen vaste `sampleRate`, dus niets wordt dubbel omgerekend. Procedurele buffers zijn op de contextfrequentie gebouwd; getest op 44,1, 48 en 96 kHz | `ruis_test` B1, `ffprobe` over de map |
| 3 | Optelsom clipt (muziek omzeilt de zachte knip) | **Mogelijk gat, opgelost.** Muziek en SFX werden pas op de bestemming opgeteld; boven 1,0 is dat een harde knip (krak). Nu een snelle limiter (drempel -2 dB, ratio 20) als laatste schakel. Of het in de praktijk gebeurde is niet gemeten (er werd niets geteld) | `audio.js` `buildLimiter`; teller in het blok Geluid |
| 3b | Opnames knippen zelf | **Uitgesloten.** Hoogste piek van alle 154 opnames is +0,7 dBFS (`auto_deur_open`, speelt op 0,85: 0,92 na het niveau); niets boven 1 na het spelniveau | `ruis_test` A |
| 4 | Ruisbronnen met NaN of een filterwaarde 0 | **Niet gevonden.** De motor- en wegsynth leveren in 239.000 gerenderde blokken (13 motoren, drie ondergronden, nat en water, drie samplefrequenties) alleen eindige waarden en geen klikken, en een NaN-doelwaarde vergiftigt de stem niet (`assignFinite`). Wel zat er een gat: een berekende niet-eindige waarde in `setTargetAtTime` gooit een TypeError (Chrome) en laat de rest van de beeldupdate liggen. Nu één helper (`veiligParam`/`veiligWaarde`) en de centrale schrijver (`createParamMemo.set`) vangt het | `ruis_test` B2 en C |
| 4b | Gelijkspanning in de ruisbedden | **Bevestigd, opgelost.** De procedurele bedden (stad, lap, enkele donder- en staplagen) hadden tot 0,02 gelijkspanning (-34 dBFS): een bonk bij elke in- en uitfade. Nu verwijdert `renderData` het gemiddelde voor de lusnaad | `ruis_test` B1 (faalde voor de fix op 7 buffers) |
| 5 | Lusnaden klikken | **Uitgesloten voor de opnames.** 29 lussen: de naad (laatste naar eerste monster) is niet groter dan een gewone stap; de binnenlus van de bandenpiep ook niet. De scenariomuziek en de radio zijn mp3 met een eigen lusscan; die zijn hier niet gemeten | `ruis_test` A |
| 6 | 0.64.0-wijzigingen (ronde 3/4, 24 loops, decode) | **Geen foute opnames gevonden.** Geheugendruk door 60 MB per gedecodeerde track is niet gemeten; decoderen gebeurt buiten de hoofdthread (Chrome), de samples worden één voor één geladen. Een GC-pauze verstoort de audiodraad niet, wel het beeld | code, `ruis_test` A |
| 7 | Windows/AMD: apparaat, exclusieve modus, Bluetooth, 44,1 of 48 | **Niet uit te sluiten zonder de pc van Nikky.** Naast hoge CPU-belasting de meest waarschijnlijke oorzaak. Het blok Geluid toont de apparaatfrequentie, de latentie en de onderbrekingen | zie de checklist hieronder |

## Wat we veranderd hebben

- `game/js/audiodiag.js` (nieuw): het blok Geluid voor de technische info (de diagnose op de tak `worktree-agent-a796a70933d1c23e3` kan `audioBlokTekst()` importeren): context-staat, samplefrequentie, `baseLatency` en `outputLatency`, uitvoerkanalen, stemmen, master en limiter, de belasting van de audiodraad (`renderCapacity`, Chrome 126+) en de uitvoergaten (`playoutStats`, waar de browser die heeft), de glitchdetector (de audioklok loopt meer dan 50 ms achter op de echte tijd: een stall van het beeld telt niet, een stilgevallen uitvoer wel; per minuut geteld), de teller van niet-eindige waarden en de laatste meldingen.
- Limiter op de uitvoer (`?geenlimiter` zet hem uit voor een A/B-vergelijking); een NaN in de mix bouwt hem opnieuw (zijn detector zou anders vergiftigd blijven).
- `latencyHint`: de volgende sessie kiest `playback` als de vorige sessie op het laatst 5 of meer glitches per minuut had (opslagsleutel `gde-audioglitch-v1`, alleen de telling). Anders `balanced` zoals voorheen.
- `veiligParam` en `veiligWaarde`: NaN of Infinity wordt de vorige of een terugvalwaarde, en geteld.
- `removeDc` in `sfx/dsp.js`.
- `scripts/audio/ruis_test.mjs` (met de haak `scripts/audio_ruis_test.mjs`): piek, NaN, gelijkspanning, stilte en lusnaad voor alle opnames en alle procedurele bronnen, de motor- en wegsynth bij 44,1, 48 en 96 kHz, en de pure delen van `audiodiag.js`.

## Wat niet is gemeten of gedaan

- Niets is beluisterd. De limiter kan in theorie pompen op een luide scène; de makeup-versterking die Chrome aan een compressor toevoegt (orde 0,5 dB) is niet gemeten. `?geenlimiter` is de vergelijking.
- Geen Electron-run en geen echte audio-uitvoer: de aansluiting in `audio.js` is syntactisch gecontroleerd (`node --check`) en door de bestaande audiotests gehaald, maar niet in een draaiend spel gezien. Nog niet bekeken.
- De scenariomuziek en de G-Music zijn niet op klikken in de lus gemeten (mp3, grote bestanden).
- Een AudioWorklet voor alles is niet nodig: er is geen `ScriptProcessorNode`.

## Checklist voor Nikky

1. Open de technische info (Ctrl+Shift+G, zodra de diagnose in een build zit) en stuur het blok Geluid mee: Samplefrequentie, Basislatentie, Belasting audiodraad en Glitches.
2. Windows Instellingen, Systeem, Geluid, het uitvoerapparaat, Geavanceerd: kies **24 bit, 48000 Hz** (en probeer 44100 als het al 48000 was). Een apparaat op 96 of 192 kHz of met ruimtelijk geluid geeft extra omrekenwerk.
3. Zelfde scherm of de stuurprogrammatab: **zet "Exclusieve modus" (programma's mogen het apparaat exclusief gebruiken) uit**. Zet ook geluidseffecten en ruimtelijk geluid (Windows Sonic, Dolby) uit.
4. Probeer een ander uitvoerapparaat: de luidsprekers van de monitor (via de videokaart) hebben een eigen stuurprogramma, een USB-headset gedraagt zich anders. Een Bluetooth-headset heeft een eigen vertraging en soms een lage frequentie: probeer een kabel.
5. Sluit andere programma's die geluid of de videokaart gebruiken (opname- en overlaysoftware). Zet de resolutieschaal in het spel omlaag: hapert het beeld door de processor, dan hapert ook de audiodraad.
6. Hoor je het nog? Start het spel met `?geenlimiter` om te zien of de limiter er iets mee te maken heeft, en meld of het ruisgeluid bij een bepaalde plek of een bepaald geluid hoorde (rijden, regen, muziek).

## Nog te bekijken

Zie de sectie "Glitches en ruis" in [SFX-LUISTERLIJST.md](SFX-LUISTERLIJST.md).
