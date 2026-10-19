# Prestatiemeting 19 oktober 2026 (#4)

Meting van main (1a1b4c3e met de testfixes van k1) met de hele provincie aan, op de drie grafische profielen van `gfxprofile.js`. Doel: weten waar de tijd heen gaat en wat een speler merkt. Echte zwakke hardware blijft #56.

## Samenvatting

- Op deze machine (i7-11700KF, RTX 3060, 17 GB) haalt het spel in de stad te voet **24 fps (laag), 27 (middel) en 23 (hoog)**. Autorijden op de ring: 43, 35 en 20 fps. Het is dus niet 60 fps op een sterke pc, en op laag niet veel beter dan op hoog.
- **De renderer is de grootste post**: `3d:render` is 15 tot 41 ms per frame (hoog), en in het CPU-profiel 41% van de bezette hoofdthread (`postfx3d.js:206`, de `renderer.render`). De simulatie (verkeer, voetgangers, politie, systemen) is samen maar 5 tot 6 ms per frame.
- **Snel reizen (trein 39 m/s, A7 33 m/s) breekt het streamen**: spoor 12 fps op hoog (p99 433 ms, langste frame 3,3 s), A7 19 fps met 394 frames boven 50 ms.
- **De geometrie-worker loopt tot 11 tot 26 s achter** (grootste round trip van een job), op elk profiel.
- Geheugen: 1,1 tot 1,9 GB heap. Over 3 minuten rijden komt er geen JS-lek uit (zaagtand door de GC), maar het aantal textures groeit van 135 naar 204 en geometrieën van 1,9k naar 4,4k.
- Gerepareerd: de minimap tekende elk frame de hele vectorkaart (5 tot 14% van de bezette hoofdthread); nu hoogstens elke 33 ms of 4 keer zijn eigen tekentijd. Zie "Reparatie".

## Hoe is gemeten

- `node scripts/perf/run.mjs <naam> [electron-vlaggen]` (nieuw: Windows/Linux/macOS, vervangt `run.sh` dat zsh en macOS vraagt) draait `scripts/perf/routes.js` in de gestagede desktopbuild: 1920x1080 CSS-px, devicePixelRatio 1, wegwerpprofiel, vaste routes, 14:00 helder tenzij de route iets anders vraagt. Per route: 6 s inlopen, dan 20 tot 60 s meten. Frametijd (rAF-interval), hoofdthread-tijd per frame, GPU-tijd (timer query, bovengrens), lange taken, draw calls en driehoeken per frame, heap, en met `--hitch` de tijd per sectie en pieken.
- Profielen (`--preset=...`, exact zoals `gfxprofile.js`): laag = `quality:laag,shadows:false,drawDistance:kort,resolution:0.75,autoResolution:true`; middel = `quality:middel,shadows:true,drawDistance:normaal,resolution:1,autoResolution:true`; hoog = `quality:hoog,shadows:true,drawDistance:heelver,resolution:1,autoResolution:true`. Een eerste reeks met alleen `quality:` (zonder schaduwen en kijkafstand) is weggegooid: de profielen verschilden dan nauwelijks.
- Nieuwe routes (`routes.js`): `a7` (auto Groningen tot Bad Nieuweschans, 33 m/s, 60 s), `platteland` (auto Loppersum, Appingedam, Delfzijl, 20 m/s), `spoor` (**stand-in**: laag vliegen langs de spoorlijn Groningen tot Eemshaven op 39 m/s, geen echte trein; zelfde streaming en spoortekening, hogere camera), `varen` (boot vanaf Zoutkamp, 7 m/s), `druk` (stad te voet om 17:30), `nacht` (23:00), `regen` (regenbui), `lek` (3 minuten ring, alleen met `PERF_ONLY=lek`), `latentie` (20 keer een toets). Auto's volgen de weg (`nearestRoadPoint`), de speler wordt in het voertuig gehouden.
- CPU-profiel: `PERF_PROFILE=foot,druk,spoor` met `GDE_PROFILE_OUT`, verwerkt met `scripts/perf/categories.mjs`. Draw calls per eigenaar: `PERF_DIAG=1`.

## Kanttekeningen (lees dit voor de cijfers)

- **De machine was niet leeg.** Tijdens alle runs draaiden de Electron-instanties van andere agents (8 Electron-processen aan het begin van een run, zie `machine.electronProcsBefore`) en node-tests. De Windows-load average is altijd 0 en zegt niets. Elke run houdt Electron-slots bij (mkdir-protocol) maar dat voorkomt de CPU- en GPU-concurrentie niet. Herhalingen verschillen tot 2x (foot hoog 65 tegen 75 ms, ring hoog 30 tegen 54 ms). Lees de getallen als "ruwweg", de verhoudingen tussen secties zijn betrouwbaarder dan de absolute ms.
- De routes bewegen het voertuig of de speler met vaste snelheid langs een lijn (teleport per frame): de simulatie zoekt dus geen echte route, en een route kan een gebouw of oever raken. `spoor` is geen trein.
- **De eigen lastaanpassing van het spel (`simload.js`) stond op niveau 2** in elke run (`window.__gfxDyn`: cpuLevel 2, mediaan 33 tot 67 ms): het spel schakelt zelf dingen terug. De cijfers zijn dus mét die aanpassing; zonder zou het slechter zijn.
- De GPU-kolom is een bovengrens: de timer query loopt om de hele frame-callback en telt gaten mee.
- Latentie is een software-schatting: van de synthetische keydown tot het eerste frame waarin de speler verplaatst is, plus één frame beeld. Geen fotodiode.
- De volledige run draait 12 routes achter elkaar; latere routes erven geheugen van eerdere (heap groeit tot 1,3 tot 1,9 GB). De losse herhalingen van foot en ring hieronder zijn schoner.
- Niet gemeten: echte zwakke hardware (#56), een echte trein, tegel-hitches in een lange sessie met de echte tijdklok, driehoeken per tegel (alleen per frame), `input-naar-beeld` met een camera, geheugen langer dan 3 minuten, andere resoluties dan 1920x1080 en andere GPU's.

## Resultaten per profiel

Gemiddeld frame-interval (ms), fps daaruit, percentielen, aantal frames boven 50 ms, hoofdthread-tijd per frame (cpu), GPU-bovengrens, draw calls en driehoeken per frame.


### laag

| route | gem. ms | fps | p95 | p99 | max | >50 ms | cpu ms | gpu ms (bovengrens) | draw calls | driehoeken | heap MB |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| foot | 41.6 | 24 | 66.5 | 183.3 | 2433.4 | 42 | 30.4 | 12.8 | 449 | 450k | 1121 |
| ring | 23.1 | 43 | 33.4 | 49.9 | 66.6 | 2 | 21.1 | 9.1 | 263 | 373k | 1310 |
| heli | 19.9 | 50 | 33.4 | 49.9 | 599.9 | 6 | 17.3 | 9.5 | 156 | 701k | 1484 |
| a7 | 29.3 | 34 | 50 | 83.4 | 1466.8 | 83 | 26.4 | 12.3 | 258 | 349k | 1343 |
| platteland | 23.7 | 42 | 33.4 | 50.1 | 2016.5 | 17 | 20.6 | 9.5 | 232 | 413k | 1125 |
| spoor | 42.2 | 24 | 66.7 | 83.3 | 349.9 | 216 | 38.6 | 20.5 | 425 | 391k | 1144 |
| varen | 23.1 | 43 | 33.4 | 33.5 | 50 | 0 | 21.4 | 8.4 | 191 | 369k | 1357 |
| druk | 27.7 | 36 | 33.4 | 49.9 | 50.1 | 3 | 26 | 10.3 | 427 | 449k | 1244 |
| nacht | 29.1 | 34 | 33.5 | 50 | 50.1 | 1 | 27 | 10.6 | 503 | 455k | 1296 |
| regen | 28.3 | 35 | 33.5 | 50 | 116.7 | 4 | 26.2 | 10.3 | 438 | 459k | 1358 |
| pause | 16.7 | 60 | 16.8 | 16.8 | 33.3 | 0 | 6.1 | 2.5 | 97 | 131k | 1164 |
| sheet | 16.7 | 60 | 16.8 | 16.8 | 17.3 | 0 | 6.3 | 2.8 | 115 | 132k | 1178 |

### middel

| route | gem. ms | fps | p95 | p99 | max | >50 ms | cpu ms | gpu ms (bovengrens) | draw calls | driehoeken | heap MB |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| foot | 37.6 | 27 | 50.1 | 83.2 | 366.7 | 55 | 35.1 | 17.8 | 572 | 619k | 1217 |
| ring | 28.3 | 35 | 34 | 50.1 | 66.7 | 9 | 25.7 | 14.6 | 366 | 493k | 1435 |
| heli | 25.7 | 39 | 33.5 | 50.1 | 599.9 | 10 | 23.4 | 13.7 | 252 | 1206k | 1601 |
| a7 | 48.2 | 21 | 83.4 | 233.3 | 2216.9 | 230 | 42 | 23.9 | 366 | 480k | 1322 |
| platteland | 31.5 | 32 | 50 | 66.8 | 899.9 | 38 | 29.2 | 15.4 | 306 | 519k | 1644 |
| spoor | 63.9 | 16 | 116.6 | 283.5 | 1766.6 | 343 | 57.5 | 30.9 | 566 | 556k | 1463 |
| varen | 28.4 | 35 | 33.6 | 66.7 | 416.7 | 30 | 25.9 | 13.7 | 283 | 590k | 1336 |
| druk | 41.4 | 24 | 50.2 | 183.4 | 499.9 | 57 | 38.6 | 21.1 | 578 | 617k | 1483 |
| nacht | 45.1 | 22 | 66.7 | 83.4 | 100.1 | 114 | 42.4 | 22.4 | 647 | 627k | 1547 |
| regen | 38.4 | 26 | 50.1 | 66.8 | 350 | 56 | 36.2 | 18.3 | 570 | 615k | 1295 |
| pause | 16.9 | 59 | 16.8 | 33 | 83.3 | 2 | 7.6 | 4.2 | 153 | 179k | 1296 |
| sheet | 16.7 | 60 | 16.8 | 16.9 | 33.5 | 0 | 7.3 | 4.4 | 152 | 177k | 1305 |

### hoog

| route | gem. ms | fps | p95 | p99 | max | >50 ms | cpu ms | gpu ms (bovengrens) | draw calls | driehoeken | heap MB |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| foot | 42.8 | 23 | 66.7 | 116.8 | 200 | 91 | 40.1 | 20.2 | 693 | 735k | 1280 |
| ring | 50.6 | 20 | 66.8 | 200.1 | 2033.4 | 98 | 43.5 | 23 | 471 | 575k | 1448 |
| heli | 33.4 | 30 | 50.1 | 100 | 766.8 | 37 | 31.1 | 16.3 | 324 | 1830k | 1670 |
| a7 | 52.3 | 19 | 100 | 233.3 | 883.3 | 394 | 47.1 | 26.3 | 500 | 611k | 1633 |
| platteland | 38.8 | 26 | 66.6 | 116.6 | 2450.2 | 110 | 33.7 | 20 | 380 | 648k | 1947 |
| spoor | 83.5 | 12 | 166.6 | 433.4 | 3266.7 | 342 | 72.5 | 40.5 | 693 | 706k | 1308 |
| varen | 37.9 | 26 | 66.6 | 133.3 | 1267 | 104 | 34.8 | 17.5 | 386 | 843k | 1527 |
| druk | 58.8 | 17 | 66.8 | 100 | 1333.4 | 127 | 49.4 | 27 | 717 | 737k | 1453 |
| nacht | 77 | 13 | 116.6 | 266.6 | 516.4 | 220 | 69.4 | 34.7 | 824 | 760k | 1506 |
| regen | 48.9 | 20 | 66.8 | 100 | 283.3 | 113 | 46.8 | 21.7 | 698 | 722k | 1576 |
| pause | 21.6 | 46 | 33.4 | 50.1 | 166.7 | 14 | 13.9 | 7.3 | 240 | 271k | 1407 |
| sheet | 17 | 59 | 16.8 | 33.3 | 49.9 | 0 | 8.2 | 5 | 194 | 219k | 1417 |


\* "fps" is 1000 gedeeld door het gemiddelde interval; frames boven 50 ms tellen over 20 tot 60 s per route.

## Waar blijft de tijd (hoog, tijd per sectie van de frame)

| route | grootste secties (ms/frame) | grootste pieken (ms, aantal) |
|---|---|---|
| foot | 3d:render 22,3, 3d:buildings 3,7, hud 2,0, traffic 1,6 | 3d:render 156 (470x), audio 88 (10x), 3d:buildings 36 (23x) |
| ring | 3d:render 19,6, audio 5,1, hud 2,6, traffic 1,6 | audio 1945 (1x), wildlife 137 (1x), 3d:render 94 (395x) |
| heli | 3d:render 14,5, hud 2,8, 3d:grass 2,1, 3d:rail+country 1,4 | 3d:roads 683 (2x), 3d:lights 192 (1x), 3d:render 63 (590x) |
| a7 | 3d:render 22,3, 3d:buildings 4,2, hud 3,1, 3d:vehicles 2,3 | 3d:vehicles 655 (38x), 3d:render 366 (1151x), 3d:prewarm 345 (71x) |
| platteland | 3d:render 17,2, hud 2,4, 3d:buildings 2,2, 3d:vehicles 1,2 | 3d:render 705 (1027x), 3d:roads 284 (1x), systems 172 (1x) |
| spoor | 3d:render 28,2, hud 13,2, 3d:buildings 7,7, 3d:vehicles 3,0 | 3d:render 1120 (539x), 3d:vehicles 479 (25x), 3d:roads 344 (5x) |
| varen | 3d:render 19,5, 3d:grass 1,9, hud 1,7, traffic 1,7 | 3d:render 1189 (1050x), 3d:grass 294 (8x), traffic 184 (4x) |
| druk | 3d:render 29,0, 3d:buildings 4,7, hud 2,1, traffic 1,6 | 3d:render 50 (341x), 3d:buildings 20 (15x), 3d:prewarm 18 (26x) |
| nacht | 3d:render 41,3, 3d:buildings 5,0, hud 3,6, 3d:prewarm 2,2 | hud 109 (8x), 3d:grass 84 (1x), 3d:render 78 (260x) |
| regen | 3d:render 27,2, 3d:buildings 4,0, hud 2,3, traffic 1,4 | hud 129 (3x), 3d:buildings 112 (11x), 3d:render 99 (411x) |
| pause | 3d:render 9,0, hud 1,4, 3d:buildings 0,7, audio 0,3 | 3d:render 160 (350x), hud 41 (1x), audio 18 (1x) |

Simulatie op de voetroute (hoog), ms per frame: traffic 1,6, police+collide 0,9, audio 0,8, systems 0,6, peds 0,6, player 0,6, wildlife 0,4, populate 0,3, fx+gore 0,2. Samen ongeveer 6 ms: de simulatietik is niet het knelpunt.

CPU-profiel (hoog, 17 s, aandeel van de bezette hoofdthread): voet in de stad: render 49% (waarvan `postfx3d.js:206` = `renderer.render` 41%), native/GL-driver 17%, streaming/geometrie 9%, simulatie 9%, overig spelcode 8%, actoren 3D 4%, HUD 3%, GC 1%. Druk (stad, 17:30): render 33%, native 22%, **HUD/DOM 14%** (`drawMinimap` 5,2%, `fillPoly` 4,5%, `drawNeighbourhoodBorders` 1,0%, `mmHash` 0,7%), streaming 11%.

Draw calls per eigenaar op de voetroute (694 per frame): building-batch 63, road (los, <100 punten) 55, terrein 43, building (los) 36, road-batch 32, farlod 29, water 21+17, plus de schaduwpassen (facade-batch 24, building-batch 20, building:detail 18+17). Op `spoor` komen daar 109 losse `building Extrude<100` bij: de gebouwbatcher haalt het tempo van de trein niet.

## Herhalingen (alleen foot en ring, één route per run, 2 runs per profiel)

Dit zijn de schoonste getallen: geen route-volgorde-effect en minder concurrentie.

| run | route | gem. ms | p95 | cpu ms | gpu ms | 3d:render ms | hud ms |
|---|---|---:|---:|---:|---:|---:|---:|
| r1-laag | foot | 42,4 | 83,3 | 38,3 | 16,5 | 21,2 | 2,2 |
| r1-laag | ring | 29,0 | 50 | 27,0 | 13,6 | 14,6 | 1,9 |
| r2-laag | foot | 38,9 | 66,7 | 33,2 | 18,5 | 19,5 | 2,3 |
| r2-laag | ring | 28,3 | 50 | 25,9 | 13,0 | 13,7 | 2,3 |
| r1-hoog | foot | 75,2 | 166,3 | 63,9 | 34,2 | 34,6 | 3,2 |
| r1-hoog | ring | 30,4 | 50 | 28,6 | 14,5 | 13,8 | 2,2 |
| r2-hoog | foot | 65,4 | 116,7 | 55,4 | 29,3 | 28,6 | 2,8 |
| r2-hoog | ring | 33,5 | 50,1 | 31,1 | 17,9 | 16,6 | 1,8 |

(Die herhalingen draaiden met alleen `quality:laag` of `quality:hoog`, dus zonder schaduwen en kijkafstand van het volledige profiel; ze meten vooral de postfx-stap.) De volledige profielen staan in de tabellen hierboven.

## Input-naar-beeld

Software-schatting (20 toetsaanslagen op de voetroute, mediaan / langste): laag 24,9 / 33 ms, middel 34,1 / 44 ms, hoog 47,1 / 1252 ms, plus één frame beeld (17 tot 80 ms). De langste meting op hoog is één frame met een hitch.

## Geheugen over tijd (`lek`, hoog, 180 s ring)

| t (s) | heap MB | geometrieën | textures | voertuigen | voetgangers |
|---:|---:|---:|---:|---:|---:|
| 15 | 1180 | 1908 | 135 | 46 | 20 |
| 60 | 1443 | 3408 | 133 | 45 | 2 |
| 105 | 1125 | 4411 | 175 | 42 | 13 |
| 150 | 1261 | 4233 | 197 | 43 | 21 |
| 180 | 1430 | 4403 | 191 | 48 | 4 |

De heap beweegt als een zaagtand (GC, geen stijgende lijn). Geometrieën stijgen tot ongeveer 4,4k en vlakken af (cache). Textures stijgen van 135 naar ongeveer 200 in 3 minuten en zijn daarna niet gedaald: **mogelijk een textureleak of een onbegrensde cache**; drie minuten is te kort om het te zeggen.

## Reparatie: de minimap

`hud_panel.js drawMinimap` tekende elk frame de hele vectorkaart (wegen, gebouwen, water, spoor, grenzen). Nu hoogstens elke 33 ms, en niet vaker dan een kwart van de frametijd (4 keer de gemeten eigen tekentijd). De bestaande overslag bij simload niveau 2 blijft.

Voor/na op `foot`, `druk`, `spoor` (hoog, afwisselend voor/na/voor/na, 2 runs per variant), HUD-sectie in ms per frame:

| route | voor | na |
|---|---|---|
| foot | 2,87 en 3,61 | 2,24 en 2,23 |
| druk | 2,06 en 1,84 | 1,58 en 1,76 |
| spoor | 10,93 en 9,86 | 8,79 en 10,11 |

De winst is 0,6 tot 1,4 ms per frame op foot en druk, op spoor binnen de ruis. Het gemiddelde frame-interval was bij "na" ook lager (foot 43 en 46 tegen 58 en 74 ms), maar dat is meer dan de HUD-winst kan verklaren en valt binnen de run-tot-run-ruis: er is niet bewezen dat de frametijd erdoor daalt. Op spoor blijft de HUD 9 tot 13 ms per frame kosten: de kaart tekent daar de provincie, en elke tekenbeurt is duur (zie knelpunt 8).

## Top 10 knelpunten

1. **Renderer-CPU.** `3d:render` 14 tot 41 ms per frame op hoog en 41% van de bezette hoofdthread op foot (CPU-profiel `postfx3d.js:206`); 450 tot 820 draw calls en 450k tot 830k driehoeken per frame. Bewijs: secties en profiel hierboven. Eerste kandidaten: de ongebatchte kleine wegmeshes (55 per frame), losse gebouwen (36), water per cel (38), schaduwpassen (ongeveer 100 calls), minder driehoeken in de verte. Issue nodig.
2. **Streamen bij snel reizen.** Spoor en A7: 12 tot 24 fps, p99 83 tot 433 ms, langste frame 3,3 s; pieken in `3d:render` (1,1 s), `3d:vehicles` (0,48 s), `3d:roads` (0,34 s); in een eerdere run ook `3d:buildings` 1,7 s, `3d:prewarm` 1,6 s, `3d:lights` 3,8 s. De gebouwbatcher (budget 1 tot 2 ms per frame) haalt het tempo niet: 109 losse gebouwmeshes per frame. Issue nodig.
3. **Geometrie-worker achterstand.** Grootste round trip 11 tot 26 s (`geo.maxRoundTrip`), op alle profielen. De `province_test` op de virtuele klok meldt 0 late tegels; in het echte spel loopt de wachtrij dus wel op. Issue nodig.
4. **Shader-prewarm.** `3d:prewarm` piekt op 345 ms (A7) en tot 2,6 s (druk, eerdere run); `gl:getProgramParameter` 1,2 ms per frame. Compilatie in het spel in plaats van vooraf.
5. **Heap 1,1 tot 1,9 GB.** Zaagtand, geen lek, maar groot; op een machine met 8 GB gaat dat zwaar worden (#56).
6. **Textures en geometrieën groeien** in drie minuten (135 naar 204, 1,9k naar 4,4k). Langere run nodig.
7. **Nacht.** Hoog: 77 ms (13 fps) tegen 43 ms (23 fps) overdag op dezelfde route; `3d:render` 41 ms. Nachtlampen en verlichting kosten het meeste.
8. **Minimap/HUD.** 5 tot 14% van de bezette hoofdthread; `fillPoly` en `drawMinimap`. Gedeeltelijk gerepareerd (zie boven). Verder: de kaart cachen in tegels of in een worker.
9. **Pauzemenu en instellingen** renderen de scène op volle kwaliteit door (`3d:render` 9 ms, 5 ms met het instellingenblad), terwijl het beeld stilstaat. Frames 21,6 ms op hoog.
10. **Audio-pieken.** `audio` piekt op 1945 ms (ring, 1 keer) en 88 ms (foot, 10 keer) op de hoofdthread.

Het spel haalt dit zelf niet op: `simload.js` staat op niveau 2 (het meest teruggeschakeld) in alle runs.

## Wat blijft open

- Echte zwakke hardware: #56. Deze machine is sterk; de zwakke pc is het echte probleem.
- Meten op een lege machine: dit moet nog eens met alle andere Electron-instanties gesloten, bij voorkeur 's nachts.
- Een echte trein, een lange sessie (geheugen over 30 minuten), tegel-hitches met de echte tijdklok, en een fysieke input-naar-beeld-meting.

## Herhalen

```
cd desktop && npm run stage
node scripts/perf/run.mjs hoog "--preset=quality:hoog,shadows:true,drawDistance:heelver,resolution:1,autoResolution:true" --hitch
PERF_ONLY=foot,ring node scripts/perf/run.mjs laag-foot-ring "--preset=quality:laag,shadows:false,drawDistance:kort,resolution:0.75,autoResolution:true" --hitch
PERF_ONLY=lek node scripts/perf/run.mjs lek "--preset=quality:hoog,shadows:true,drawDistance:heelver,resolution:1,autoResolution:true"
```

`PERF_LOCKS=<map>` neemt een Electron-slot (mkdir-protocol) tijdens de run; `PERF_LOCK_POLL=5000` wacht korter tussen pogingen; `PERF_ONLY`, `PERF_DUR`, `PERF_DIAG=1` en `PERF_PROFILE=<routes>` (met `GDE_PROFILE_OUT=<map>`) werken zoals in `run.sh`. Uitvoer: `$PERF_OUT/<naam>.json` en `.log`.

## Vervolg: optimaliseren (zelfde dag)

Wat is onderzocht en wat het opleverde. Alles met `routes.js` (nieuwe routes `census`, `cost`, `staan`, en een texture-telling in `lek`).

- **Geen textureleak (#248 bijgewerkt).** In de `lek`-run zijn de 84 nieuw geüploade textures die na 90 tot 180 s nog leven: 36 tot 41 skeletdata-textures van 8x8 (de botten van de zichtbare skinned voetgangers), 18 x 256x128 en 18 x 128x64 canvas-textures van de Discgolf-baan (`discgolf.js` `holeSign`, `basketMesh`: de baan wordt één keer gebouwd zodra je binnen `DETAIL_M` komt en nooit afgebroken), en enkele borden van museum, zwembad, skatepark en straatnaamborden (die laatste worden wel vrijgegeven). De groei van 135 naar 204 textures is dus de eenmalige bouw van activiteitslocaties langs de ring, geen onbegrensde groei. Goedkope winst die overblijft: de 36 Discgolf-textures delen in één atlas.
- **Het pauzemenu rendert al op lagere frequentie** (`main.js` `MENU_FRAME_S`, 30 of 20 fps achter een menu). Het knelpunt "pauze rendert door" in #248 is daarmee grotendeels al opgelost; wat overblijft is de 9 ms per gerenderde frame.
- **Scene-walk.** Census op de voetroute: 6600 tot 7000 nodes in de scene, 4800 daarvan met `matrixAutoUpdate`; `scene.updateMatrixWorld(true)` kost 2,7 tot 2,8 ms per aanroep (laag), ruim 7% van het frame. Het CPU-profiel geeft `updateMatrixWorld` 7,3% self, `projectObject` 4%, `intersectsObject` 2,5%. De grootste groepen zijn de wildlife-dieren (6 groepen van 169 nodes) en de personen en voertuigen (dynamisch). Een groot deel vastzetten kan, maar levert hooguit 1 tot 1,5 ms; niet gedaan.
- **Stilstaan versus lopen.** Stilstaand in het centrum (hoog): 793 draw calls, 23 ms per frame; lopend: 705 calls, 28 ms. Alleen de losse wegmeshes (57 per frame onderweg) verdwijnen bij stilstaan: de batchers komen er stilstaand wel aan toe, onderweg niet.
- **Batcher-budget (gedaan).** `scene3d.js`: de gebouwbatcher mocht 2 ms per frame samenvoegen en de wegbatcher 1 ms; nu allebei 3 ms. Gemeten met afwisselend voor/na (3 paren, hoog, foot en ring):

  | route | voor (3 runs) | na (3 runs) |
  |---|---|---|
  | ring gem. ms | 26,8 / 31,8 / 29,7 | 23,6 / 26,5 / 23,9 |
  | foot gem. ms | 37,7 / 32,1 / 61,8 | 31,3 / 63,8 / 37,0 |

  Ring wordt in alle drie de paren sneller (mediaan 29,7 naar 23,9 ms), foot is binnen de ruis (twee uitschieters van 62 en 64 ms, één in elke groep). Niet bewezen voor de p99; de A/B draaide op de gestagede build van de nacht en is niet opnieuw gedaan op de nieuwste main.
- **Schaduwen: niet bewezen.** Een directe meting (30 renders met en zonder schaduwen) gaf 16,1 ms tegen 9,3 ms, maar na het opnieuw aanmaken van de schaduwkaart ook op 4096 nog 10,6 ms (en 2048 en 1024 evenzo): de eerste meting was een opwarm-effect. Schaduwen kosten dus ongeveer 1 ms in dit pad (9,3 tegen 10,6), niet 6 ms. Het schaduwgebied is al smal (32 tot 40 m) en slaat al passes over bij `cpuLevel` 1+.
- **De machine was later rustiger:** dezelfde `foot`-route op hoog gaf 28,5 ms (35 fps) in de A/B-runs van de nacht, tegen 42,8 ms (23 fps) in de eerste volledige runs. De getallen in de tabellen hierboven zijn dus pessimistisch door concurrentie; de verhoudingen blijven. Een lege machine meten blijft nodig.
- **Wat niet gelukt is:** een winst in draw calls per tegel op de voetroute. De drie grote eigenaren (building-batch 63 tot 87, terrein 43, losse gebouwen 36 tot 39) zijn gebatcht of tegelgebonden; verder samenvoegen is een groter werk (#246).

## Vervolg 2: minder draw calls (stad te voet)

**Nieuwe basislijn op een rustige machine** (later in de nacht, 6 tot 8 Electron-processen minder): te voet in de stad op hoog is 21 ms per frame (47 fps), de ring 20 ms (49 fps), stilstaand 22 ms. Dat is CPU-gebonden: hoofdthread 19 tot 21 ms per frame, GPU-bovengrens 10 ms, en uitzetten van vsync (`--disable-frame-rate-limit --disable-gpu-vsync`) verandert de gemiddelde frametijd niet (20,9 tegen 21,0 ms). De eerdere 23 fps (concurrentie) was dus te pessimistisch; 60 fps vraagt ongeveer 4 ms minder CPU per frame. Van die 20 ms is `3d:render` 11 ms voor ongeveer 780 draw calls (14 µs per call) en de rest 9 ms (HUD 2, gebouwen streamen en batchen 3 tot 4, verkeer 1,6, politie en botsingen 0,9, audio 0,8, systemen, voetgangers en speler elk ongeveer 0,6).

**Draw calls per scene-deel** (hoog, 1 frame gemiddeld, `PERF_DIAG=1`, twee plekken):

| scene-deel | lopend (705) | stilstaand (793) | stilstaand, andere run (986) |
|---|---:|---:|---:|
| gebouwen (batch, los, detail, gevel, landmark) | 169 | 229 | 282 |
| overig (blob-schaduwen onder personen en vogels ~30, stadsmeubilair, bordjes, lampen, shaders) | 140 | 191 | 223 |
| wegen | 97 | 65 | 78 |
| water (oppervlak en oevers) | 49 | 58 | 129 |
| schaduwpass gebouwen | 72 | 34 | 39 |
| grond (terreinmeshes) | 43 | 43 | 49 |
| verre LOD | 40 | 39 | 46 |
| voertuigen | 33 | 22 | 68 |
| personen (skinned) | 28 | 55 | 30 |
| instanced props, bomen, platteland, overige schaduwen | 34 | 29 | 40 |

(Het aantal voertuigen verschilt per run; de som kan enkele calls afwijken van het totaal omdat de diag de top 80 telt.)

**Gedaan: kleur bakken in gebouwbatches** (`staticbatch3d.js`). Materialen die alleen in kleur verschillen delen nu één batchmateriaal; de kleur gaat als vertexkleur in de geometrie (lineair, dezelfde getallen die de shader vermenigvuldigt). Alleen voor gebouwen en gevels. Meshes in de gebouwbatches: 318 naar 137 in de scene, materialen 23 naar 8. Draw calls gebouwen: 282 naar 230 (stilstaand), totaal ongeveer 4 procent. Gemeten (3 paren, hoog, afwisselend, vsync uit): foot 21,0 / 20,9 / 21,0 ms voor tegen 19,9 / 21,5 / 20,7 na; draw calls 739 / 755 / 742 tegen 718 / 701 / 730. De winst is dus ongeveer 0,2 ms of minder en valt in de ruis; ik houd hem omdat hij minder driehoeken per call en minder schaduwcalls geeft, niet omdat hij bewezen sneller is. Beeld: zes vaste plekken voor en na vergeleken; het verschil na is gelijk aan het verschil tussen twee runs van het oude spel (ruis door verkeer en personen: 10 tot 28 procent van de pixels, gemiddeld 1 tot 5 van 255).

**Mislukt (en teruggedraaid):** dezelfde kleur-bakstap voor de wegbatches. De wegmaterialen tekenen hun bestrating via hun eigen shader en de gebakken kopie verloor de straatstenen (het trottoir werd effen grijs). Dat zag ik pas in de schermafdruk; een pixelvergelijking op ruis had het ook gemist (51 procent verschil tegen 52 procent ruis op één plek). Les: voor deze scène moet de beeldvergelijking tegen een ruisbasislijn (twee runs van het oude) worden gedaan en per plek worden bekeken.

**Wat de volgende 4 ms zou kunnen opleveren** (niet gedaan, schattingen):
- Losse gebouwmeshes (landmarks 15, `building Buffer<1k` ongeveer 37, `building:detail` ongeveer 24) alsnog batchen of instancen: 40 tot 60 calls, ongeveer 0,6 ms.
- Water (49 tot 129 calls): de oppervlak- en oevermeshes per cel samenvoegen; de batcher sluit transparante materialen en meshes zonder normalen uit, dus dit vraagt een eigen pad: ongeveer 0,5 tot 1 ms.
- Blob-schaduwen onder personen en vogels (ongeveer 30 transparante calls) als één InstancedMesh: ongeveer 0,4 ms.
- De scene-walk (`updateMatrixWorld` 2,8 ms, 4800 nodes): dieren en verre actoren vastzetten: ongeveer 1 ms.
- Gebouwen bouwen tijdens het lopen (`3d:buildings` 3,7 ms gemiddeld, vooral `makeBuildingMesh`): sneller of in de worker: tot 2 ms.
Samen komt dat op de 4 ms, maar elk onderdeel is een eigen stap met eigen risico op beeldverschil; dat is werk voor een volgende ronde met voor/na-metingen en een ruisbasislijn voor de beeldvergelijking.

## Vervolg 3: blob-schaduwen in één mesh (teruggedraaid)

Alle blob-schaduwen (onder personen, vogels en voertuigen) als quads van één dynamische mesh getekend, de losse blobs op laag 1 gezet. Draw calls: 714/734/721 naar 694/716/699 lopend, 717/761/751 naar 686/672/708 stilstaand (ongeveer 20 tot 90 minder). Frametijd (3 afwisselende paren, hoog, vsync uit): foot 27,0/24,2/24,1 ms voor tegen 26,3/24,5/24,4 na, stilstaan 22,9/22,0/22,5 tegen 22,9/24,2/22,1: geen meetbaar verschil (20 calls is ongeveer 0,3 ms). In de screenshot op één plek (spot 2) tekende de blob onder de speler nu wel zichtbaar op de gele markering waar hij eerder niet zichtbaar was: een beeldverandering zonder meetbare winst. Teruggedraaid (`6c1ff3c4`).

**Conclusie van de draw-call-ronde:** met de rustige machine is de frametijd 20 tot 22 ms en elke losse stap (bakken, blob-batch, budgetten) levert minder dan 0,5 ms op, onder de run-tot-run-ruis van ongeveer 1 ms. De resterende 4 ms voor 60 fps zit verspreid over tientallen posten (render 11 ms voor 700 calls, HUD 2, gebouwen 3 tot 4, verkeer en simulatie 5). Een volgende winst vraagt een structurele stap: de simulatie naar de worker (#58, bezig bij x2), een minder dure render per call (instancing/GPU-gedreven tekenen) of lagere kwaliteit op de zwakkere profielen. Meer losse micro-optimalisaties zijn met deze meetnauwkeurigheid niet aan te tonen.

## Vervolg 4: s3 (verborgen groepen, prewarm-scan, markDryRoad)

Gedaan, in de code (branch `claude/s3-perf-draws`):
- **Verborgen groepen bovenaan de scene doen niet meer mee aan `updateMatrixWorld`** (`scene3d.js` `skipHiddenMatrixWalk`, vlak voor de render). De census (`PERF_ONLY=census`) vond ~1100 van ~5000 auto-update-nodes in verborgen groepen (gepoolde voertuigen en voetgangers, verre dieren), die three toch doorloopt. Gemeten in hetzelfde proces, zonder geforceerde update (`walkSoftMs`): 5,1 en 2,9 ms voor tegen 2,35 en 0,62 ms na (twee paren, machine niet leeg, het aantal nodes verschilt per run).
- **Prewarm-scan** (`prewarmLightVariants`): na twee ronden zonder nieuwe materialen scant hij 12 in plaats van 120 groepen per frame (hij liep elke ~3 frames over alle nodes). Sectie `3d:prewarm`: 0,7 tot 0,9 ms (3,2 in een zeer drukke run) voor, 0,2 tot 0,8 na (een rustige run 0,21).
- **`markDryRoad`** haalt het water van een hele weg één keer op in plaats van per punt van 2 m: dezelfde 30 droge kruisingen op 10616 wegen, 54 tegen 30 ms. In een CPU-profiel van foot was dit 2% (`addTile`, tegelhitches).

Gemeten maar **niet bewezen sneller in frametijd**: vijf afwisselende paren foot hoog (basis 0d83967c tegen deze branch, machine met 8 andere Electron-processen): gem. frame 24,5 / 45,2 / 36,5 / 27,2 / 26,4 ms voor tegen 24,6 / 41,0 / 29,1 / 25,3 / 32,0 na. Mediaan 27,2 tegen 29,1; de run-tot-run-ruis (25 tot 45 ms) is veel groter dan de winst van een paar tienden ms tot ~2 ms. De drie stappen verminderen aantoonbaar werk (zie boven), maar de 60 fps is niet gehaald.

Waar de tijd zit (CPU-profiel foot, 17 s, `categories.mjs`): `renderer.render` 46%, native 17%, streaming 8%, simulatie 7%. Binnen de render: `updateMatrixWorld` 3%, `renderObject` 3%, `projectObject` 2,4%, `setProgram` 1,2%, `intersectsObject` 1%. Eén run had een stal van 3,3 s in `gl.getProgramParameter` (programma's linken bij het eerste gebruik) en de `progs`-route (`PERF_ONLY=progs`) vond in een andere run drie stallen van 120 ms of meer (500 ms in 25 s); een programma voor een gevelstijl (`zandsteen_donker`) linkt pas bij het eerste zicht. De 16 `render()`-aanroepen per frame in `rendersPerFrame` zijn de bloom-blurs van de hoog-preset, geen dubbele scene-render.

Verder onderzocht, niet gedaan: roadInit in de worker is alleen 2,4 s op een vrije thread (`scripts/perf/roadinit_meet.mjs`); de 9 tot 14 s in het spel is wachten op andere jobs en een drukke machine. Water en losse gebouwdelen batchen vraagt eigen paden (transparant, geen normalen); #58 (auto's naar de worker) is niet verder gebracht.

Hulpmiddelen: `PERF_ONLY=census` meldt nu ook welke groepen niet bewegen en `walkSoftMs`; nieuwe routes `progs` en `renders`; `scripts/perf/markdry_meet.mjs`; de batchers houden hun eigen tijd bij (`batches().*.ms`).
