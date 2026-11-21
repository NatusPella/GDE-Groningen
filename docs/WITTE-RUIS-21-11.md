# Witte ruis in het spel (melding eigenaar, 21-11, issue #1084)

Melding: "Soms hoor ik een white noise in game, had je dat al weggehaald?" Dit document is de audit van alle ruisbronnen, zegt wat er gefixt is en wat nog **beluisterd** moet worden. Niets is beluisterd door de agent: alles is uit de code gelezen of gemeten zonder Electron (`node scripts/audio/ruisbronnen_test.mjs`, `node scripts/audio/ruisachtig_scan.mjs`).

## Eerder werk (al weggehaald)

Commit 48ab4afa6 en [AUDIO-GLITCHES-21-11.md](AUDIO-GLITCHES-21-11.md) (melding Nikky): diagnoseblok Geluid, limiter, NaN-guard in de centrale parameterschrijver, DC-correctie van de procedurele bedden, een regressietest voor alle opnames en synths. Er is geen `ScriptProcessorNode`. Dat dekte clipping, gelijkspanning en NaN in de synth, maar niet: een mixer die blijft hangen na een fout, een NaN in een bed, en het ontbreken van een teller voor ruislussen.

## Alle ruisbronnen: wanneer horen ze aan en uit

| Bron | Waar | Aan | Uit | Opgeruimd door |
|---|---|---|---|---|
| Noise-bursts (schot, botsing, regen op de paraplu, sis) | `audio.js` playNoiseBurst, uit `noiseBuffer` (2 s wit, door een filter) | per gebeurtenis, 0,01 tot 1,7 s | gain-ramp naar 0,0001 en `stop()` na `duration + 0,03` | `onended` ruimt de nodes op en telt `activeVoices` terug. **Gat gevonden:** een NaN of Infinity in een parameter gooide na het tellen, de teller bleef staan. Nu geweigerd en gemeld |
| Motor en weg (banden, wind, nat, water, gras, vrijloop) | AudioWorklet `gde-engine` (`sfx/engineworklet.js`, RoadVoice) | rijdend; nat = sis boven 2,2 kHz bij regen | `T.gain` naar 0 buiten een voertuig, bij pauze, in een vliegtuig met opnames | worklet zet zichzelf op nul bij NaN en bouwt de stem opnieuw |
| Helikoptersynth (verkeer) | `audio/vehiclevoices.js` buildHeliVoice, `noiseBuffer` als lus | `world.policeHeli` | gain 0 | nu bewaakt: staat de gain open terwijl er geen politieheli is, dan dicht na twee controles (4 s) |
| Schuren, bandenpiep-synth, rommel | `audio/vehiclevoices.js`, `noiseBuffer` als lus | contact, slip, rijden | gain naar 0 | bewaakt zoals de heli |
| Helikopter en burner (sky.js) | `sfx/sky.js`, bruinruis | rotor draait | gain naar 0, voice blijft als nodes bestaan | niet aangepast; de gain gaat naar 0 |
| Ambience-bedden: wind, regen (licht, bui, plens, auto, dak), stad, kust, polder, riet, industrie, menigte, terras, krekels, kikkers | `sfx/ambience.js` driveBeds, buffers uit `sfx/dsp.js` of opnames | `target` > 0,002 | na 4 s onder 0,0015 `stop()` | **Gat gevonden:** een NaN-doel of NaN-niveau bleef in `b.level` hangen, `setTargetAtTime(NaN)` gooide, het bed ging nooit meer uit. Nu afgevangen en geteld als lus onder `bed:<naam>` |
| Motorlaag, ritmotor, bandpiep- en drift-lussen | `audio.js` | rijdend of slippend | gain naar 0 en `stop()` | nu geteld (`motorlaag`, `ritmotor`, `bandpiep`, `banddrift`) |
| Radio en G-Music | `audio/radio.js`, mp3 via media-element | zender aan | pauze bij menu, watchdog | geen eigen statica of ruisgenerator: `grep static` vindt niets |
| Scenariomuziek | `audio/scenario.js`, één gedecodeerde track | scenario | fade en `evictScenarioBuffers` | niet aangepast |
| Spraak, nieuws, NPC en politieclips | mp3 per clip | per regel | clip eindigt | zie de scan hieronder (ruisstaarten) |
| Microfoon, WebRTC-voicechat | niet aanwezig (komt later, #451) | | | `grep getUserMedia`: geen treffers |

## Wat er mis kon gaan en nu gefixt is

1. **Een mixer die gooit, houdt alles erna op de laatste stand.** `updateWorldMixers` riep engine, squeal, rumble, scrape, ambience, foley, sky en UI achter elkaar aan in één `guarded`. Gooit één (een NaN in een AudioParam), dan werd elke volgende mixer overgeslagen, elk beeld opnieuw: het regenbed, de wind, de schuurstem bleven op hun laatste gain staan. Nu staat elke mixer in zijn eigen `guarded`.
2. **NaN in een bed.** Zie de tabel. Een plaatsmeting die één keer NaN geeft vergiftigde het bed voor de rest van de sessie.
3. **NaN in een noise-burst.** Zie de tabel (teller `activeVoices` bleef hangen, uiteindelijk stilte, geen ruis, maar wel een stem minder).
4. **Een doorlopende ruisstem die dicht moet maar open staat.** Een vangnet: `audio/ruisbronnen.js` bewaakt de vier synthruisstemmen. Meer dan 4 s open terwijl de bron uit hoort te zijn: dichtgezet, geteld, gemeld in de technische info (regel "Ruis die bleef hangen") en in het watchdoglogboek (`ruis-vast:<naam>`).
5. **Stapelende lussen.** Een lus die er twee tegelijk heeft terwijl er één bedoeld is, wordt als "te veel tegelijk" geteld (`bed:*` max 1, motorlaag en ritmotor max 2, bandpiep en banddrift max 2). Geen stapeling gevonden in de code; de teller is er om het in een echte sessie te zien.

## Technische info (Ctrl+Shift+G, blok Geluid)

Nieuw: "Ruisbronnen (lussen)": aantal levende ruislussen met hun namen, en "Ruis die bleef hangen": hoe vaak er een stem is dichtgezet, hoe vaak er te veel tegelijk klonk, en de laatste melding. Een speler die witte ruis hoort kan dit blok meesturen: staat daar een lus die niet bij de plek hoort, dan weten we de bron.

## Scan van alle clips

`node scripts/audio/ruisachtig_scan.mjs --paneel` decodeert elke clip (ffmpeg, 22,05 kHz mono) en meet per frame van 1024 monsters de spectrale vlakheid (1 = witte ruis), de nulkruisingsgraad en de toonhoogte (autocorrelatie). Een frame is ruisachtig als het hoorbaar is, vlak en zonder toonhoogte. Spraak en muziek zijn verdacht bij meer dan 60 procent ruisframes of een ruisstaart van minstens 8 frames (0,37 s). Bij de effecten (sfx) zijn ruisachtige clips juist normaal (regen, wind, sis): daar is de lijst alleen informatie. De uitkomst en het luisterpaneel: zie "Uitkomst van de scan" onderaan.

## Wat de agent niet kon

- Niets beluisterd, geen Electron-run, geen echte uitvoer. De aansluiting in `audio.js` is gecontroleerd met `node --check`, de bestaande audiotests en de nieuwe bronnentest, niet in een draaiend spel. Nog niet bekeken.
- De regenhiss van de wegvoice (`wetAmp`, hoogdoorlaat 2,2 kHz, tot 0,14 maal de wegvoicegain) is witte ruis op bedoeling bij regen op een rijdend voertuig. Als dat de "white noise" is, is het niet kapot maar te hard of te vlak: dat kan alleen de eigenaar horen.
- Een stem die per ongeluk wel in een van de bewaakte stemmen zit maar niet bij `verwacht` hoort, wordt na 4 s dichtgezet: kloppen de verwachtingen niet, dan hoor je een stem wegvallen. Ze zijn conservatief gekozen (heli: alleen `policeHeli`; schuren: tot 1,5 s na het laatste contact).

## Wat de eigenaar zelf moet beluisteren

1. Het luisterpaneel [WITTE-RUIS-LUISTER.html](WITTE-RUIS-LUISTER.html) (open het in een browser vanuit de map docs): de verdachte spraak- en muziekclips en de ruisachtigste effecten. Hoor je daar sissen zonder stem, noteer de bestandsnaam.
2. In het spel: rijden in de regen (de wegsis), een boot stilstaand, de politieheli die weggaat, schuren langs een muur, de overgang van menu naar spel. Staat de witte ruis er nog, open dan Ctrl+Shift+G en kijk bij "Ruisbronnen (lussen)" welke lus levend is en bij "Ruis die bleef hangen" of er iets is dichtgezet.
3. `?geenlimiter` (zie AUDIO-GLITCHES-21-11.md) om de limiter als oorzaak uit te sluiten.
