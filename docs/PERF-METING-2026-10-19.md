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

## Vervolg 5: deterministische tellingen (s3, draw calls, geen fps)

Frametijd is op een drukke machine te ruisig, dus nu tellen op vaste camerastanden: `PERF_DIAG=1 PERF_ONLY=det node scripts/perf/run.mjs <naam> <preset>` (route `det`): vier standen (stad-markt, stad-straat, a7-tussen, dorp-winsum), 8 s wachten tot de batchers 3 s niets meer bouwen, dan 60 frames: GL-draw-aanroepen (hoofdscene en schaduwpas), driehoeken, programmawissels, CPU-tijd van de scene-render en de aanroepen per eigenaar. Beperking: de aanroepen van voertuigen en personen en de toestand van de batchers verschillen van run tot run (stad-straat 775 tegen 804 bij twee runs van dezelfde code), dus alleen de eigenaar-tellingen van het gewijzigde onderdeel zijn exact; het totaal (`staticDraws`, zonder actoren) heeft ruis van ongeveer 5 procent.

Gedaan:
- **Wolken** (`cloud3d.js`): alle blobs in één `InstancedMesh`: 15 transparante draw calls minder in elke stand (alle blobs hebben dezelfde kleur en doorzichtigheid, dus de menvolgorde verandert niets).
- **Oevers** (`staticbatch3d.js` `shoreBatcher`, `scene3d.js`): de oever- en kademeshes van alle waterpolygonen binnen de zichtafstand per materiaal en per cel van 600 m samengevoegd (het wateroppervlak is transparant en blijft los; `extras` en `glass` blijven los omdat `showExtras` ze aanzet). Eigenaar `water`: stad-markt 41 en 40 naar 20 en 19, stad-straat 175 en 181 naar 61 en 59, a7 68 en 44 naar 30 en 30, dorp-winsum 166 en 144 naar 96 en 96 (twee runs elk, hoog). Driehoeken per frame +2 procent (de samengevoegde mesh wordt minder fijn geculld).
- Totaal zonder actoren (`staticDraws`, twee runs elk, basis tegen nu): stad-markt 499/508 tegen 480/472, stad-straat 775/804 tegen 687/660, a7 248/282 tegen 262/258, dorp-winsum 566/468 tegen 407/407. Dat is 4 tot 15 procent in de stad, niet de gevraagde 40.

Onderzocht, niet gehaald:
- Wegen: in de stad blijven ~40 losse wegen over omdat hun cel (96 m) minder dan twee wegen binnen de `inner`-afstand heeft; celgrootte 160 gaf 85 naar 70 calls, binnen de ruis, niet bewaard. Gebouwen: `MIN_MEMBERS` 3 naar 2 gaf geen verschil (de losse gebouwdelen liggen aan de rand tussen `inner` en de detailstraal van de far-LOD).
- Actoren zijn het grootste deel van de rest: in stad-straat ~300 van ~1050 aanroepen (voertuigen met 6 tot 12 meshes per auto, personen met een skinned mesh plus een blob-vlak). Auto-onderdelen samenvoegen raakt `models3d_vehicles.js` (deuren, kap), blobs als één InstancedMesh gaf eerder een zichtbaar ander beeld (zie Vervolg 3).
- Schaduwpas ~100 calls in stand met schaduw (facade-batch 23, building-batch 20); kleiner maken verandert schaduwen van gevelsieraad.

Beeld: `scripts/perf/pngdiff.mjs` en route `vspots` (zeven plekken plus vier aan het water): twee runs van de oude code verschillen al 8 tot 64 procent van de pixels (verkeer, mensen, meldingskaarten, water, schaduw), dus een pixelvergelijking zegt weinig; de opnamen bij het water liggen te hoog achter de speler om de oever te laten zien. Geometrisch is de oever-merge identiek (zelfde vertices en materiaal, `receiveShadow` was overal waar), maar dat is niet in beeld bekeken.

## Vervolg 6: voertuigen en personen erbij, lijst per eigenaar (s3)

Extra stappen (exacte tellingen per eigenaar uit de route `det`, hoog, twee runs van de oude code 7ea959ee tegen twee van nu):
- **Sierdoppen** op de wielen via de wielinstancing (`wheelinstances3d.js`): de cilinders op de wielen waren vier losse aanroepen per auto. Eigenaar `Cylinder`: markt 20 naar 0, straat 18 naar 0, a7 15 naar 3, winsum 8 naar 0.
- **Blobschaduwen** als één `InstancedMesh` (`scene3d.js` `fillBlobPool`, gevuld in `onBeforeRender` van de pool, als de matrices af zijn; zelfde geometrie, materiaal, polygon offset en renderOrder; zwart met gelijke alpha, dus de volgorde onderling doet er niet toe): markt 24 en 28 naar 2, straat 27 en 52 naar 0, winsum 33 en 36 naar 0. Beeldcontrole op een bevroren frame (`PERF_ONLY=blobab`, pool tegen losse blobs tegen pool): het verschil pool-los (4,9 en 4,6 procent) is kleiner dan pool-pool (7,4 en 5,6 procent), dus niet te onderscheiden van de ruis die zelfs een gepauzeerde wereld nog geeft.
- Samen met wolken (-16) en oevers (water -60 tot -100): markt ~-60 van ~630, straat ~-150 tot -190 van 1000 tot 1190, winsum ~-95 van ~600, a7 ~-30 van ~300: **10 tot 16 procent minder aanroepen**. De totaalcijfers (`draws`) lopen ruim 10 procent uiteen tussen runs van dezelfde code (hoeveel voertuigen en personen in beeld, hoe vaak de schaduwpas draait: 36 tegen 72), dus alleen de eigenaar-tellingen zijn te vertrouwen.

Waar de rest zit, per post (FN2, aanroepen per frame) en waarom die niet verder omlaag gaat zonder grote ingreep:

| post | markt | straat | a7 | winsum | waarom niet verder |
|---|---:|---:|---:|---:|---|
| losse gebouwen | 102 | 152 | 38 | 26 | de ring tussen `inner` (175 m) en de detailstraal (190 m) en randcellen met minder dan 3 gebouwen; `MIN_MEMBERS` 2 en een kleinere marge gaven geen meetbare winst; landmarks hebben transparante glasdelen |
| gebouwen gebatcht | 69 | 102 | 8 | 26 | al samengevoegd per cel en materiaal (18 tot 20 materialen blijven over) |
| voertuigen | 71 | 60 | 7 | 53 | per auto 4 meshes met 3 materiaalgroepen (body, deuren, kap, klep); samenvoegen raakt `models3d_vehicles.js` (deuren, schade) |
| overig | 62 | 147 | 72 | 40 | de kermis in stad-straat (~70 losse dozen en bollen), vogels, lantaarnhalo's |
| wegen los | 49 | 38 | 28 | 48 | celgrootte 160 gaf 85 naar 70, binnen de ruis |
| terrein | 44 | 44 | 0 | 0 | één groep per zichtbare tegel, niet samen te voegen zonder de tegelculling te verliezen |
| verre LOD | 43 | 58 | 23 | 23 | één aanroep per tegel en laag; tegel 640 in plaats van 320 gaf -13 aanroepen maar +15 tot 20 procent driehoeken en grotere bouwstappen; teruggedraaid |
| props en landschap | 41 | 35 | 79 | 100 | al per tegel gebatcht; de rest zijn bomen, hekken en draden per soort |
| schaduwpas | 29 | 75 | 38 | 29 | gevelsieraad en detail werpen schaduw; wegnemen verandert het beeld |
| water en oevers | 19 | 64 | 29 | 95 | wateroppervlakken zijn transparant en blijven per polygoon los |
| voetgangers | 15 | 29 | 3 | 10 | skinned meshes, één aanroep per persoon |

Conclusie: met alleen beeldgelijke stappen is het gevraagde -40 procent niet haalbaar; de laatste grote posten (losse gebouwen aan de batchrand, voertuigdelen, schaduwpas) vragen een eigen pad per post met eigen beeldrisico. Dit is wat ik kon aantonen; niet bekeken door een mens.

## Vervolg 7: de CPU-kant van de stad te voet (r8b, #246)

**Uitkomst: de 60 fps zijn niet gehaald.** Beeld-gelijke stappen geven samen ongeveer **2 tot 3 ms CPU-tijd per frame minder** (6 tot 10 procent, `mcpu` hieronder) op de echte RTX 3060 (`ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 ... Direct3D11`, GPU-timer aanwezig). Op de rustige machine van de vorige ronde (21 ms, 47 fps) is dat grofweg 19 ms (52 fps); een rustige machine was er deze nacht niet, dus die laatste omrekening is een schatting, geen meting.

### Hoe is gemeten (nieuw)

- De machine draaide de hele nacht 3 tot 4 andere Electron-instanties en tientallen processen: dezelfde route gaf 21 tot 60 ms per frame, van minuut tot minuut. Frametijden zeggen daarom niets. `run.mjs` meet nu de **CPU-tijd van de renderer-hoofdthread per frame** (`mcpu`, `threadcpu.ps1`: threadtijden van het Electron-proces tussen de meetmarkeringen van de route), zonder de tijd dat de thread door andere processen werd onderbroken.
- `PERF_ONLY=ab` wisselt varianten **binnen één proces** af in vensters van 4 s (A B, B A, ...; `?perfoff=` of `window.__perfOffDyn` zet een stap uit), zodat de varianten dezelfde belasting voelen. `node scripts/perf/abin.mjs <naam>.json` toont per variant de mediaan van `mcpu`, het verschil per ronde en deterministische werktellers per frame (aantal `updateMatrixWorld`-aanroepen en frustumtests). Venster tegen venster blijft de ruis 3 tot 5 ms; een stap van minder dan ~1 ms is niet aan te tonen, de totalen wel.
- Zonder vertraging door Chromium zelf: `run.mjs` zet `--disable-renderer-backgrounding`, `--disable-backgrounding-occluded-windows` en `CalculateNativeWinOcclusion` uit (een venster onder andere vensters liep anders trager). `PERF_AB_MOVE=2` meet staand en lopend (3 m/s, route `wandel`), `PERF_SETTLE` laat de route langer inlopen, autoResolution staat uit zodat de lastaanpassing van het spel de werklast niet verandert.

### De top 10 (hoog, heelver, te voet in de stad)

Draw calls per frame per eigenaar (`PERF_DIAG=1`, 712 in totaal, daarvan ~97 in de schaduwpas): actoren 218 (~8 per auto bij ~9 auto's in beeld, 66 voor 65 personen), schaduwpas 97, losse wegen 63, losse gebouwen 63, gebouwbatch 46, terrein 43, verre LOD 39, wegbatch 32, gebouwdetail 29, water 28 (en oevers 9).

CPU-tijd (CPU-profielen, 14 s bezette hoofdthread). Stilstaand: `renderer.render` **50%** (hoofdpas `renderObjects` 22%, schaduwpas 9%, `projectObject` 12%, `updateMatrixWorld` 8%; `setProgram` is een kwart van de render), spelsimulatie 22% (verkeers-AI 6,5%, waarvan voertuig-gebouwbotsingen 3%, voertuig-voertuigbotsingen 2%; personen 3,5%), HUD 7%. Lopend: render 39%, spelsimulatie 15%, `syncBuildings` 8,7% (waarvan gebouwen bouwen 6%), HUD 7% (minimap 3,8%, hints 1,9%), prewarm 5%, tegelstreaming 4%, `farlod.update` 2,8%, batcher-update 2,6%.

De doorslaggevende vondst: de **eigen tijd van three's `renderObject` in de schaduwpas** (de recursie over alle knopen van de scene, ~9000 stuks) was de grootste enkele post van het hele profiel, groter dan `projectObject` van de hoofdpas. 3509 van de 9369 knopen (37%) zitten in groepen op het hoogste niveau zonder één schaduwwerper (het terrein 529, de losse wegen, de verre LOD, en 1638 in actoren buiten het schaduwbereik), en de schaduwpas liep ze toch allemaal af.

Verder: de 16 `render()`-aanroepen per frame zijn de bloom-blurs: 0,3 ms in totaal (20 µs per stuk), dus daar valt niets te halen. Chromium-vlaggen: `--in-process-gpu` was 2x trager, `--use-angle=gl` in een van twee paren sneller (74 tegen 99 ms) en in het andere gelijk (110 tegen 107 ms, drukke machine, autoResolution aan), `--use-angle=vulkan` gaf geen resultaat; niet verder uitgezocht (een gepaarde run vraagt twee Electron-slots tegelijk).

### Gedaan (beeld-gelijk bedoeld; elke stap achter `?perfoff=<stap>` uit te zetten voor een A/B)

| stap (perfoff) | wat | gemeten (staand, 10 tot 16 vensters per variant) |
|---|---|---|
| `schaduwpas` en `schaduwgroepen` (`scene3d.js` `hookShadowPass`) | groepen zonder schaduwwerper (terrein, losse wegen, verre LOD, weg- en oeverbatches, flavour) en actoren buiten `ACTOR_SHADOW_DIST` doen niet mee aan de schaduwpas (even onzichtbaar, direct erna terug); een groep wordt één keer doorzocht en opnieuw bij een andere kinderenteller en gespreid elke 45 passes (zes keer zo zelden voor groepen die wel werpen) | **2,4 ms (10%), 9 van 10 vensters** |
| `actoren` (`cullOffscreenActors`) | voertuigen, personen en dieren buiten beeld (plus de reikwijdte van hun schaduw bij de zon van dat moment, `actorShadowReach`) blijven buiten de scene-wandeling van de hoofdpas; zichtbare actoren lopen hun verborgen kinderen (bestuurder, uitgezette lampen) niet af; een gewone voetganger buiten beeld krijgt geen pose | **1,2 ms (5%)** |
| `schaduw` (`shadowPassSkipped`) | rustige straat (speler loopt, niets sneller dan 4 m/s in het schaduwgebied): de schaduwkaart om het andere frame, ook bij cpuLevel 0 | 0,7 ms (2,6%) |
| `groepen` (`cullOffscreenGroups`) | bevroren gebouw-, weg-, water- en landmarkgroepen buiten beeld doen niet mee aan de hoofdpas (bol eenmalig berekend, voor de schaduwpas weer zichtbaar) | binnen de ruis; lopend 950 matrixwandelingen per frame minder |
| `wielen` | `addVehicleWheels` dwong voor elk voertuig een volledige `updateMatrixWorld(true)` af, ook voor die buiten beeld | 640 (staand) tot 1040 (lopend) matrixwandelingen per frame minder; tijd binnen de ruis |
| `terreinvast` | de terreingroep (~500 tegelmeshes) loopt niet meer mee in de matrixwandeling | 150 tot 210 matrixwandelingen per frame minder; tijd binnen de ruis |
| `bouwsync` | `syncBuildings` doet na een pas zonder bouwwerk of prefetch niets tot de focus 15 cm verschuift of 12 frames voorbij zijn | 2,0 ms staand, 1,6 ms lopend (11 en 10 van 14 vensters; drukke machine) |
| `verresync` | idem voor `farlod.update` (elke tegel van de wereld met een hypot per frame): rust tot 1 m of 30 frames | niet apart gemeten |
| `terreinsamen` (`terrainmerge.js`) | de tegels van 400 m delen één vertexbuffer: vier indexlijsten worden één mesh (minder draws en knopen; alleen bij het laden) | geometrisch gelijk (eenheidstest), tijd niet apart |
| voertuig-gebouwbotsing (`vehicle.js`) | de zes kanten per auto vroegen elk frame zes keer het raster en bouwden zes kleine arrays; nu één lijst per auto, bewaard zolang de auto binnen 1,5 m blijft | ~3% van de hoofdthread in het profiel; `junction_sim_test --quick` geeft dezelfde uitkomsten (zelfde zaad) |

**Alles aan tegen alles uit, afwisselend in één proces, 16 vensters van 4 s per variant (`fin2`):**

| | staand | lopend (3 m/s) |
|---|---:|---:|
| `mcpu` alles aan, mediaan | 31,4 ms | 36,6 ms |
| `mcpu` alles uit, mediaan | 33,7 ms | 40,4 ms |
| mediaan van het verschil per paar | **3,5 ms (9,0%)** | **3,4 ms (9,9%)** |
| matrixwandelingen per frame, uit tegen aan | 7765 tegen 6097 (-21%) | 7473 tegen 4957 (-34%) |
| frustumtests per frame, uit tegen aan | 3611 tegen 2843 (-21%) | 3363 tegen 2692 (-20%) |

Vijf onafhankelijke runs van dezelfde vergelijking geven 3,1 ms (staand, de eerste drie stappen, 14 van 14 vensterparen), 2,5 en 3,6, 1,2 en 2,0, 1,7 en 2,6 en 3,5 en 3,4 ms: ruwweg **2 tot 3 ms**. De spreiding is de ruis van de machine; daarom de mediaan van het paarverschil en niet het gemiddelde (één venster kan 50 ms zijn).

### Beeld

- **`PERF_ONLY=verify`** (nieuw, `scene3d.js` `verifyCull`): draaiend en wandelend op vijf plekken (centrum, straat, kanaal, Winsum, Hoogezand; 1634 frames) is elk afgekapt actor en elke afgekapte groep (431.662 controles) opnieuw getest met de exacte doos van wat zichtbaar is tegen de frustum van de camera, en elke groep die uit de schaduwpas bleef (11.925.163 controles) opnieuw op schaduwwerpers: **0 missers**. Een eerdere versie van de controle meldde 3516 missers; dat bleek de doos van verborgen kinderen waarvan de matrix niet wordt bijgewerkt (die staat op de oorsprong): de controle telt nu alleen wat zichtbaar is.
- Een pixelvergelijking van een stilgezette wereld is niet bruikbaar gebleken: `world.uiPaused` wordt elk frame door de UI overschreven, dus mensen en verkeer bewegen door. De route `beeld` (aan, uit, aan) liet dat zien: zelfs stappen zonder beeldeffect gaven honderden tot duizenden afwijkende pixels. Daarom blijft alleen `verify` over.
- Niet door een mens in beeld bekeken. De schaduwkaart om het andere frame laat de schaduw van een bewegend ding een frame (16 ms) achterlopen; bij looptempo is dat 5 cm, ongeveer een texel.

### Onderzocht, niet gedaan

- **BatchedMesh of eigen multi-draw voor de statische stad:** de statische delen zijn al per cel samengevoegd; wat overblijft (losse gebouwen aan de batchrand ~100, losse wegen ~60, terrein 43, verre LOD 39) is geen kandidaat voor één BatchedMesh zonder materialen te delen, three r160 kent geen `deleteGeometry` (dus geen streaming in en uit) en ANGLE-D3D11 voert `multiDraw` toch als losse draws uit in het GPU-proces. De CPU-kosten zitten in three's werk per object (`setProgram` een kwart van de render, `renderObject`, `projectObject`), niet in de GL-aanroep zelf: de nette winst was minder knopen per frame, niet minder draws.
- **Dubbelzijdige transparante `MeshBasicMaterial`s** (de gele markeringen en lichtvlakken, 4 per frame): three tekent ze in twee doorgangen en zet daarvoor `side` en `needsUpdate = true` om, 7,9 keer per frame een `getProgram`. ~0,25 ms; `forceSinglePass` verandert de menging, dus niet gedaan.
- **Minimap** (4% van de hoofdthread): dun verdeeld (zee 0,3%, buitenkant 0,25%, spoor 0,35%, plekken 0,7%); een gecachte onderlaag kost meer beeldrisico dan ze oplevert.
- **Verkeers-AI** (6,5%): de ring van volle simulatie (150 m voor auto's, `simlagen.js`) is een ontwerpkeuze; smaller maken scheelt 0,3 tot 0,7 ms maar verandert het verkeer.
- **Statische groepen die niet bevroren zijn** (232 naamloze groepen, 3719 knopen, 4001 van de ~4771 niet-actorknopen bewegen drie seconden niet): zouden ook kunnen worden afgekapt, maar zonder bevroren matrix is de bol niet vast. Kandidaat voor een volgende ronde: de makers (kermis, straatmeubilair) hun groepen laten bevriezen of per groep samenvoegen.
- **Bouwen tijdens het lopen** (`3d:buildings`, tot 4 ms per frame zolang er iets ontbreekt) verschuift werk, het haalt het niet weg; een budget dat alleen de rest van de frame gebruikt zou de uitschieters (p95) verlagen. Geen gemiddelde winst, niet gedaan.
- **60 fps blijft buiten bereik:** rond 19 ms (schatting op een rustige machine) zit nog `3d:render` ~8 tot 9 ms, simulatie ~5 ms, bouwen en HUD ~3 ms. De volgende stap is het aantal knopen en meshes zelf omlaag (kermis en straatmeubilair samenvoegen, de voertuigdelen per auto) of de simulatie naar de worker (#58).

## Vervolg 8: snel reizen (A7, heli langs het spoor) en een 60 fps-voorinstelling (r8b, #247 en #246)

Gemeten met de gereedschappen van Vervolg 7 (`mcpu`, `PERF_ONLY=ab`, `abin.mjs`), op de echte RTX 3060, hoog en heelver, autoResolution uit, de machine niet leeg (de runs van dezelfde code verschillen onderling 20 tot 40%; lees de verhoudingen en de pieken, niet één getal).

### #247: wat er bij snel reizen mis was

Routes `a7` (auto, 33 m/s, 60 s) en `spoor` (heli langs het spoor, 39 m/s, 45 s) met `--hitch`, voor de wijzigingen (`s247a`, `s247b`) en na (`s247e` tot `s247j`):

| | voor | na |
|---|---|---|
| a7: gem. frame, p99, frames >100 ms | 51 en 34 ms, 300 en 117 ms, 54 en 20 | 28 tot 38 ms, 67 tot 100 ms, 9 tot 12 |
| a7: `gl:getProgramParameter` per frame | 0,5 tot 1,0 ms (3 stallen van 335 tot 406 ms, een frame van 2,1 s) | 0,0 tot 0,01 ms (met de linkwacht; 0,6 tot 1,2 ms zonder) |
| a7: `3d:buildings` per frame | 2,3 tot 3,4 ms | 1,4 tot 2,1 ms |
| spoor: gem. frame, p99, frames >100 ms | 67 en 89 ms, 167 en 533 ms, 21 en 70 | 35 tot 62 ms, 67 tot 200 ms, 3 tot 52 |
| spoor: HUD per frame | 12,7 tot 14,6 ms | 5,6 tot 13 ms (meer bij meer last) |

Bevindingen uit de CPU-profielen (14 s bezette hoofdthread):
- **De minimap** was op de A7 12% en in de heli 18% van de hoofdthread: bij de uitgezoomde schalen (0,24 tot 0,55 px/m, straal 360 tot 830 m) een pad, een fill en een `fillStyle` per gebouw en een rasterquery van alle vijf lagen per tekenbeurt. Nu een pad per kleur en wikkelrichting (zonder `closePath`: in een pad van duizenden subpaden kost die ~1 ms per stuk, een eerste versie met `closePath` gaf 18 ms HUD), het raster 25% ruimer gevraagd en 0,4 s bewaard, geen bomenlaag, en de weg-lus rekent niets uit voor wegen die op die zoom wegvallen.
- **Shaders die voor het eerst worden getekend** blokkeerden het frame 0,3 tot 1 s (`getProgramParameter` wacht op de link): een nieuwe gebouwstijl, een nieuw batchmateriaal, een landmark-kit. Nu compileert een nieuw gebouw of nieuwe batchmesh eerst in de achtergrond en wacht tot 2 s tot zijn programma's klaar zijn (`?perfoff=bouwklaar`), en een tekenaanroep van de spelscene waarvan het materiaal nog geen gelinkt programma heeft blijft een paar frames uit en het object wordt na het frame gecompileerd (`?perfoff=linkwacht`; pas na 600 getekende frames, zodat het laadscherm en de eerste beelden niet op een lege scene wachten; alleen met `KHR_parallel_shader_compile`).
- **`renderer.compile` liep per aanroep door de hele scene** (~9000 knopen) om de lampen te vinden: 6% van de hoofdthread in de heli-run, omdat het voor elk nieuw gebouw werd aangeroepen. Nu een scene met alleen de lampen, fog en omgeving (`?perfoff=compileklein`).
- **Personen**: `buildPersonMesh` kostte 3,5 tot 6% van de hoofdthread (93% daarvan is de geometrie, die per persoon uniek is door zijn look). Bij snelheden boven 12 m/s krijgen mensen op meer dan 90 m (6 m per m/s erboven) geen mesh meer (`?perfoff=persoonsbereik`).
- **De geometrie-worker** liep niet 11 tot 26 s achter, afgezien van het opstarten: per taak 40 tot 70 ms gemiddeld (`geo.byKind`), `roadGeo` hoogstens 1,3 tot 2,5 s met ten hoogste 8 open (het plafond van x2), `cityMerge` 0,6 tot 1,4 s. Het getal in het issue is `roadInit`: 9 tot 13 s eenmalig bij het starten, waarachter alles in dezelfde worker moest wachten. Nu twee workers: wegen en oevers (`roadInit`, `roadGeo`, `shoreInit`, `shore`) in de een, `cityMerge` en `terrain` in de ander (`?perfoff=eenworker` zet het terug). `roadInit` zelf blijft 9 tot 13 s (2,4 s op een vrije thread); een kortere start vraagt een worker die de gebouwtegels niet decodeert.
- Tegels vooruit: `tilefocus.js` en `syncRoads` (x2) sorteren al op rijrichting tot 8 s vooruit; `tiles.late` bleef 0 op beide routes.

### #246: een 60 fps-voorinstelling

De zichtafstand is de grootste enkele hefboom in de stad, niet de detailstraal. In één proces afwisselend gemeten (6 vensters per variant, `mcpu`, hoog):

| variant | staand | lopend (3 m/s) | draw calls |
|---|---:|---:|---:|
| hoog (heel ver, 900 m) | 26,1 ms | 24,1 ms | 779 |
| zichtafstand ver (600 m, de standaard van het spel) | 23,6 ms | 24,8 ms | 737 |
| **zichtafstand kort (150 m)** | **20,2 ms** | **21,3 ms** | 432 |
| verschil kort tegen heel ver (mediaan per paar) | **-3,7 ms (-16%), 6 van 6** | **-3,0 ms (-13%), 6 van 6** | -347 |

Eerdere reeksen (`s247f`, `s247g`, `s247h`, `s247i`): kort scheelt 3,4 tot 10 ms (-15 tot -30%, alle ronden), normaal (350 m) 1,5 tot 1,7 ms, ver 2,0 ms, Gemiddeld (kwaliteit middel, normaal) 3,3 ms, de schaduwen uit 0,5 ms, een detailstraal van 160 of 140 m bij dezelfde zichtafstand niets (de gebouwen verhuizen naar de verre LOD). Draw calls per eigenaar, hoog tegen kort (`s247i`): verre LOD 60 tegen 0, landmarks 14 tegen 0, water en oevers ~33 tegen 0, terrein 15 tegen 3, en door de detailstraal van 140 m gebouwbatches 148 tegen 82, losse wegen 39 tegen 11, gebouwdetails 44 tegen 18, losse gebouwen 44 tegen 24. De standaard 'ver' is dus bijna even zwaar als 'heel ver'; 'normaal' pas lichter.

Daarom is er een nieuwe voorinstelling **Vlot** (`gfxprofile.js`): kwaliteit hoog, schaduwen aan, resolutie 100% met automatische bijsturing, zichtafstand kort. De volgorde is Laag, Gemiddeld, Vlot, Hoog; de beeldadvisor op het titelscherm stelt Vlot voor als de mediaan van de frametijd tussen 17,5 en 22 ms ligt (boven 22 ms Gemiddeld, boven 30 ms Laag), zodat een machine als deze (47 fps op Hoog) een kaartje krijgt. Op deze machine: 20,2 ms staand en 21,3 ms lopend op een belaste machine; op een rustige (Hoog 21 ms) is Vlot ruwweg 16 tot 17 ms, dus rond de 60 fps (afgeleid, niet gemeten). De 60 fps zijn met beeld-gelijke stappen dus niet gehaald en alleen met een korte zichtafstand bereikt of benaderd: wie ver wil kijken blijft op 47 tot 52 fps.

Gereedschap erbij: `PERF_ONLY=ab` neemt tokens `set:<instelling>:<waarde>` (instellingen voor dat venster) en `detail:<m>` (andere detailstraal) en met `PERF_DIAG=1` de draw calls per eigenaar per venster; `abin.mjs` toont het verschil per eigenaar. `PERF_AB_PRE=<ms>` laat een variant eerst inlopen.

### Niet gedaan
- **Personen cachen:** de geometrie is per persoon uniek (kleren, huid, look); een cache per sleutel haalt weinig en kost veel geheugen; zonder per-persoon geometrie in een worker is het bereik de goedkope winst.
- **Een snelheidsafhankelijke gebouwdetailstraal:** kleiner dan 190 m scheelt niets zolang de verre LOD de rest tekent (zie de tabel); het zou alleen het bouwen vermindren, en dat is nu al ruim binnen het budget.
- **De eerste 11 s `roadInit` verkorten:** vraagt een andere opbouw van de worker-kaart (geen gebouwtegels decoderen).

## Vervolg 9: draw calls zijn niet de kost; de multi-draw-pool en wat er wel toe doet (r42, #246, #247, #58, #4)

**Uitkomst: de 60 fps zijn niet gehaald, en met stappen op draw calls en GL-aanroepen zijn ze niet te halen.** Wat is aangetoond: de CPU-tijd van de hoofdthread per scene-render daalt met 0,7 ms (11,0 naar 10,3 ms, 6,5%) bij 46% minder draw calls (746 naar 404); te voet is een hele frame 1,3 ms korter (25,0 naar 23,4 ms; 6 van 6 paren lager; 3 standaardfouten); staand is het verschil binnen de ruis (22,7 naar 22,3 ms; gepaard -1,6 ± 1,3 ms). Een GL-aanroep kost 25 tot 300 ns, een draw call in three ongeveer 2 µs: de 14 µs per draw call van Vervolg 2 was een gemiddelde over alles wat een frame doet, geen kost per aanroep. Dat verklaart waarom elke eerdere stap met minder aanroepen onder de ruis bleef. De simulatie van het verkeer is maar 1,2 ms per frame (simbench), dus naar een worker verplaatsen (#58) levert hooguit 1 ms.

### De machine, en hoe er gemeten is

De machine was bij elke run in gebruik door andere sessies (CPU-gebruik 17 tot 48% vóór en tot 76% na een run, 1,6 tot 6 GB vrij, 4 tot 9 Electron-processen; `machine` in elke JSON). Een rustige machine voor #4 is er dus niet geweest. Daarom gepaarde, afwisselende vensters in één proces, de CPU-tijd van de renderer-hoofdthread (`mcpu`, het thread-sampleren van Vervolg 7) en voor elke verschil de gemiddelde met standaardfout (`scripts/perf/abpair.mjs`): een verschil telt pas bij een paar standaardfouten. Nieuw in `scripts/perf/routes.js` (docs/ONTWIKKELEN.md): `renderab` (alleen de scene-render, CPU per render), `renderprof` + `selftime.mjs`/`callers.mjs` (profiel van alleen die render), `glcalls` (GL-aanroepen per frame per functie en per eigenaar, programmawissels), `glbench` (ns per GL-aanroep), `shadowtris`/`shadowmap` (wat de schaduwpas tekent, de kaart zelf), `poolvis`, `progready`/`startup`, en `scripts/perf/simbench.mjs` (verkeerssimulatie zonder browser). Alle runs: hoog, heel ver, resolutie 100%, `autoResolution` uit, 1904x993, RTX 3060 via ANGLE/D3D11, 14:00 helder.

### Wat de metingen zeggen

1. **Een GL-aanroep kost bijna niets** (`glbench`, ns per aanroep, minimum van 5 reeksen): `uniformMatrix4fv` 275, `uniform3f` 275, `bindVertexArray` 25, `bindTexture` 25, `drawElements` 25, `multiDrawElementsWEBGL` met 40 bereiken 450, `bufferSubData` 850. Een frame heeft 3200 aanroepen (hieronder): ongeveer 1 ms. De 17% 'native' in het CPU-profiel van Vervolg 7 is dus voor het grootste deel niet het schrijven van commando's maar de aanroep zelf in V8 en wachten op het GPU-proces.
2. **De pool haalt 46% van de draw calls weg en 0,7 ms.** `renderab` (40 reeksen van 20 renders, afwisselend oud en nieuw, 4 rondes, hoog, staand in de markt): oud 11,01 ms CPU per render en 746 aanroepen, nieuw 10,29 ms en 404 (onderste kwartiel 10,50 tegen 9,93). Een eerdere ronde met de pool alleen: 13,26 tegen 12,90 (alleen de cellen) en 12,11 ms (cellen, losse gebouwen en verre LOD) bij 746, 525 en 421 aanroepen. Samen ongeveer 2 µs per draw call.
3. **Hele frame (`ab`, vier varianten in één proces, 5 s vensters).** Te voet (3 m/s), twee reeksen op een rustigere machine: oud 25,0 ms, nieuw 23,4 ms, gepaard -1,33 ms ± 0,43 (6 van 6 rondes lager); en na de reparatie van de wegen, 8 rondes: oud 27,8 ms, nieuw 22,6 ms, gepaard -3,88 ms ± 1,54 (6 van 8 lager; in de middelste vensters p50 -2,6 ± 1,5). In die tweede reeks draagt de pool het verschil (pool alleen -3,33 ± 1,79; zonder pool +0,21 ± 1,87). Staand, drukke machine (48 tot 76% CPU): 35,6 tegen 31,1 ms, gepaard -1,5 ± 2,2. Staand, rustigere machine, 8 rondes, nadat de wegen hun bestrating terug hadden: 22,7 tegen 22,3 ms, gepaard -1,6 ± 1,3 (4 van 8 rondes lager). Staand liggen de onderdelen apart (de pool alleen; sortering, GL-filter en voetgangers zonder pool) binnen de ruis (+0,5 ± 0,4 tot -1,9 ± 1,1 ms); te voet draagt de pool het verschil. Die runs draaiden deels nog met het GL-filter van hieronder.
4. **GL-aanroepen per frame (`glcalls`, hoofdpas, 90 frames).** Hoofdversie van vóór deze ronde: 3208 aanroepen, 733 draws, 133 programmawissels. Nu: 2661 (met een filter voor overbodige `pixelStorei`- en `texParameteri`-aanroepen, dat 226 ervan niet doorgaf: 2435; zie onder), 440 draws, 94 wissels: -24% aanroepen met het filter, -17% zonder. Per eigenaar: de pool 460, personen (skinned) 257, wegen die nog los zijn 163, voertuigonderdelen ongeveer 300, water 108.
5. **De linkwacht vroeg per tekenaanroep naar `COMPLETION_STATUS`.** Dat is een synchrone ronde naar het GPU-proces. Zolang er programma's linken (de eerste minuten, en bij elk nieuw materiaal) was dat in een directe renderlus 46 tot 69% van de hoofdthread (`getProgramParameter` in `WebGLUniforms`/de linkwacht), in het spel zelf 5,65 ms per frame in de hitch-sectie van de eerste run. Nu hoogstens elke 25 ms voor alle programma's samen, en een gelinkt programma wordt onthouden (`?perfoff=linkpoll` voor de oude regel). Het effect op een spelframe is niet los gemeten: de startup-vensters van losse runs (gemiddelde van venster 4 tot 8: hoofdversie 20,9 ms, pool met de oude linkwacht 22,6, pool met de nieuwe 24,3; CPU-gebruik vooraf 22, 38 en 23%) verschillen meer door de belasting van dat moment dan door de wijziging, en de pool-runs zijn zonder meer niet sneller dan de hoofdversie. Behouden omdat ze een synchrone vraag per draw weghaalt, niet omdat het frame er aantoonbaar sneller van wordt.
6. **Programma's:** de pool voegt 23 programma's toe (285 naar 308: de variant met batching van elk poolmateriaal en één dieptemateriaal per kant); ze worden bij het maken van de pool op de achtergrond gecompileerd en een cel wacht tot de zijne gelinkt zijn (dieptemateriaal inbegrepen, want de schaduwpas wordt niet door de linkwacht gedekt).
7. **#58, het verkeer:** `simbench.mjs`, 32 auto's rond het centrum, 60 stappen per seconde, 2401 stappen: 1,24 ms CPU per stap (`updateTrafficAI` 15%, `followSpeedLimit` 12%, voertuig-gebouwbotsing 10%, `curveSpeedLimit` 7%, voertuig-voertuigbotsing 5%). In het spel is dat 1,3 tot 1,6 ms: de hele auto-simulatie naar een worker verplaatsen kan nooit meer dan ongeveer 1 ms opleveren, minus de overdracht. Voor voetgangers geldt hetzelfde (0,6 ms). Het blijft dus liggen.

### Gedaan (alles achter een `?perfoff=`-stap)

| stap | wat | effect |
|---|---|---|
| `pool` (`multidraw3d.js`, `drawpool.js`) | de samengevoegde cellen van `staticbatch3d.js` (gebouwen, gevels, wegen) en de tegels van de verre LOD gaan in één buffer per materiaal en worden met één `WEBGL_multi_draw`-aanroep per materiaal getekend (een `BatchedMesh` met een eenheidsmatrix, bereiken per cel gekozen met een bolltest op getypeerde arrays; eigen materiaalkopie met de `defines`, eigen dieptemateriaal, toewijzer en compactie; materialen die dat niet kunnen (alfatest, shaders) blijven losse meshes; de kademuren blijven los) | 746 naar 404 draws, -0,7 ms per render |
| `poolklein`, `poolrand` | met de pool mag een cel uit één item bestaan en reikt het samenvoegen tot 3 m van de rand van de detailstraal (was 15 m en 2 of 3 items): de losse gebouwen en wegen aan de rand worden ook gepoold | zit in bovenstaande |
| `progsort` (`compareOpaque`) | de dekkende lijst van three sorteert eerst op programma | programmawissels 164 naar 94, ~270 GL-aanroepen minder |
| `pedtier` | voetgangers op meer dan ~55 m krijgen hun pose om de 2e, meer dan ~130 m om de 4e frame, zonder dat three hun botten opnieuw uitrekent en uploadt | niet apart gemeten |
| (geen stap) | streek- en waterplekken: eigen geometrie per InstancedMesh, zodat three de attributen niet bij elke tekenaanroep opnieuw instelt | 164 GL-aanroepen per frame, 12 draws |
| `linkpoll` | zie 5 | zie 5 |

### Geprobeerd en teruggedraaid

- **Een filter voor overbodige GL-aanroepen** (`pixelStorei` en `texParameteri` per texture, 226 van de 2661 aanroepen per frame, vooral de bottextures van ~70 personen): werkt (de tellers kloppen) maar een aanroep kost 25 tot 300 ns en het filter zet zelf een wikkel om vijf aanroepen die bijna 540 keer per frame voorkomen: per saldo niets aantoonbaars en een risico voor de toestand van de hele context. Eruit; de meetroute `glcalls` blijft.

### Wat er onderweg misging

- **Wegen effen grijs.** `Material.clone()` neemt de `defines` van een MeshStandardMaterial niet mee (de `copy` zet ze terug op `STANDARD`), en de wegdekken kiezen hun bestrating met een define (`SURF_KLINKER`, `SURF_TILES`). In de eerste schermafdrukken van de pool was elk wegdek effen; gezien op de beelden (een pixelvergelijking had het niet gemeld). Opgelost met een kopie van de defines en het volgen van een wijziging ervan; `scripts/multidraw_test.mjs` test het nu.
- **De directe renderlus** (`renderprof`) rendert naar het canvas, wat voor elk programma een nieuwe variant is (toonmapping en kleurruimte van het doel horen bij een programma); de eerste renders linkten dus seconden lang. Opgewarmd vóór de meting.
- Een slot-lek van mezelf: een run die ik afbrak liet zijn Electron-slot staan; na controle (geen proces, mijn run) vrijgegeven.

### Beeld

Schermafdrukken van elf vaste plekken (`vspots`) van de hoofdversie (twee runs) en van de pool: markt en kanaal komen overeen met de hoofdversie (herringbone-bestrating, schaduwen, gevels). De schaduwkaart zelf is op drie plekken gelijk aan die van de hoofdversie (`shadowmap`: 0, 0 en 4 van 256 blokken wijken 25 punten of meer af, gemiddeld 4,1, 0,1 en 3,0) en de schaduwpas tekent vergelijkbaar veel driehoeken (10391 tegen 10524, 6639 tegen 7289, 13654 tegen 13196; in een latere run tekende de hoofdversie op de markt de helft, 5264, een teken dat die telling van run tot run schommelt). Eén plek niet verklaard: bij de Gracht (`gracht2`, aan het water) missen in de poolversie de brede schaduw van de kademuur en een deel van de bestrating-kleur; in dezelfde run met de pool aan en uit is dat verschil er niet (Ebbingestraat), dus de oorzaak is niet bevestigd. Omdat de kademuren daar de grote werpers zijn, blijft `shoreBatcher` buiten de pool. Niet door een mens bekeken.

### #247, snel reizen

Routes `a7` (auto, 33 m/s) en `spoor` (heli langs het spoor, 39 m/s), hoofdversie tegen de pool (losse runs, niet afwisselend; de machine verschilt per run). A7: hoofdversie 31,4 ms gemiddeld (mcpu 29,4), p99 83 ms, 135 frames boven 50 ms, langste frame 1134 ms; pool 36,3 ms (mcpu 33,1), p99 83, 160 frames, langste 3567 ms in de eerste run en 33,9 ms (mcpu 32,5), p99 100, 159 frames, langste 767 ms in een tweede run met `--hitch`. Spoor: hoofdversie 62,5 ms (mcpu 58,3), p99 233, 356 frames; pool 46,3 ms (mcpu 42,9), p99 100, 216 frames. De twee runs met `--hitch` kort na elkaar (CPU-gebruik vooraf 24 en 26%): hoofdversie 43,9 ms (mcpu 40,3), p99 217, 251 frames boven 50 ms, langste 1617 ms; pool 33,9 ms (mcpu 32,5), p99 100, 159 frames, langste 767 ms. Het beeld is dus gemengd (de eerste A7-run wijst de andere kant op): boven het spoor lichter, op de A7 een keer lichter en een keer zwaarder; geen run is genoeg om dat te scheiden. De hitch-sectie van de tweede A7-run laat zien dat nieuwe poolmaterialen in het frame zelf een programma krijgen (`getProgram`/`acquireProgram` voor een poolmateriaal en voor het dieptemateriaal: 1 tot 3 ms JS per programma, en de piek van `3d:render` van 345 ms) en dat `3d:buildings` (53 ms piek) en `3d:peds` (10 ms) de grootste hakkers blijven. #247 blijft open: een volgende stap is de pools voor de bekende materialen vooraf aan te maken (prewarm bij het laden), zodat er onderweg alleen nog nieuwe stijlen compileren.

### Niet gehaald, en wat voor 60 fps nodig is

Op deze machine kost een stad te voet nog 20 tot 23 ms, ook op een rustiger moment. De rest zit verdeeld: de render (~10 ms in de directe lus, waarvan three's eigen werk per object en per knoop het grootste deel is), de simulatie (~6 ms), HUD en minimap (~2 ms), bouwen tijdens het lopen (tot 3 ms). Wat nog kan en hoeveel (schattingen, niet gedaan):
1. **Knopen i.p.v. aanroepen.** Er blijven ~9400 knopen in de scene (matrixwandeling 1,2 ms, `projectObject` ~2 ms, schaduwwandeling ~1,5 ms). Gepoolde gebouwdelen zijn verborgen maar worden nog doorlopen; hun groepen kunnen `visible = false` en `matrixWorldAutoUpdate = false` krijgen en de ~1500 niet-bevroren statische knopen kunnen worden bevroren: 1 tot 1,5 ms.
2. **Voetgangers en fietsers**: de rijders op fiets en scooter hebben nog geen `pedtier` (~200 aanroepen per frame), en een eenvoudige pose voor ver weg (geen botten) zou 0,5 ms besparen.
3. **De enige stap van meer dan 3 ms is parallellisme:** de scene in een worker (OffscreenCanvas) en de simulatie op de hoofdthread laten overlappen: frametijd wordt dan het maximum van de twee (~12 ms op deze machine). Dat vraagt dat de ongeveer 90 `*3d.js`-modules niet meer rechtstreeks uit `world` lezen maar uit een snapshot per frame; geschat op weken, niet dagen. Dat is de 'X' die #246 nodig heeft; tot dan is **Vlot** (zichtafstand kort) de weg naar 60 fps.
4. Een rustige machine blijft nodig voor #4: dit alles zou 's nachts met alle andere sessies dicht opnieuw moeten.

### Herhalen

```
cd desktop && npm run stage            # of GDE_PREBUILT_WORLD=<bestaande build>/game/world GDE_STAGE_OUT=<map>/game node build.mjs
PERF_AB_RENDERAB='oud=pool+progsort+pedtier+settle;nieuw=settle' PERF_AB_ROUNDS=4 PERF_SAMPLES=40 PERF_ONLY=renderab node scripts/perf/run.mjs <naam> <voorinstelling>
node scripts/perf/renderab.mjs <PERF_OUT>/<naam>.json
PERF_AB='old=pool+progsort+pedtier+settle;new=settle' PERF_AB_PRE=25000 PERF_AB_ROUNDS=8 PERF_AB_MOVE=1 PERF_ONLY=ab node scripts/perf/run.mjs <naam> <voorinstelling>
node scripts/perf/abpair.mjs <PERF_OUT>/<naam>.json
GDE_PROVINCE_SRC=<repo>/data/cache/province node scripts/perf/simbench.mjs --seconds=40
```

## Vervolg 10: waar de 20 ms echt blijft, gemeten met een profiel (r46, #246, #247, #58, #4)

**Uitkomst: de 60 fps zijn niet gehaald, maar het profiel vond één grote vermijdbare post en wijst de rest aan.** De eigen schaduwhaak (`hookShadowPass`, sinds Vervolg 7) liep bij elke `renderer.render()`-aanroep, en een frame op Hoog heeft er 16 (de scène en 15 fullscreen-quads van de bloom en de grade): elke keer een scan van de bovenste laag van de scène plus het verbergen en tonen van groepen, terwijl de quads geen licht hebben en three direct terugkeert. Nu slaat de haak die aanroepen over. Gepaard (oud tegen nieuw, afwisselend in één proces, `?perfoff=schaduwhaak` is het oude gedrag): hoofdthread-CPU **-4,1 ± 1,4 ms per frame op een belaste machine (11 van 14 paren lager, mediaan -3,8 ms, op een frame van 28 tot 43 ms)**, de schaduwscan zelf 2,5 naar 0,3 ms (14 van 14 paren). Op een rustige machine is dat naar schatting 2 tot 3 ms van de ~21; die rustige meting is niet gelukt (een uur gewacht op CPU-gebruik onder 30% met 3 GB vrij: dat kwam niet voor, en daarna waren de drie Electron-slots uren bezet).

### De machine was niet rustig, en hoe er dus gemeten is

Elke run draaide naast 4 tot 11 Electron-processen en tientallen node-tests van andere sessies (CPU-gebruik 34 tot 93% vóór en na een run, 0,3 tot 3,4 GB vrij van 17; `machine` in elke JSON). Frames waren daardoor 1,5 tot 3 keer zo traag als op de rustige machine van Vervolg 2 (21 ms). Wat dan nog betrouwbaar is: verhoudingen binnen één venster, secties van de hitchprobe (de tijd op de eigen thread), de CPU-tijd van de renderer-hoofdthread (`mcpu`) en gepaarde, afwisselende vensters in één proces. Een eigen route `r46` (`scripts/perf/routes.js`, `PERF_ONLY=r46`, `PERF_R46='base;nopostfx;pauzesim;...'`, zie docs/ONTWIKKELEN.md) speelt dezelfde wandeling (3 m/s door de stad, Hoog, heel ver, 14:00) in vensters van 8 s, waarin telkens één onderdeel van het frame uit staat. Nieuw gereedschap: Chromium-trace (`[trace] ms`, `scripts/perf/trace.mjs`), heap-allocatieprofiel (`[heapprof] ms`), GL-tijd per functie (variant `gltime`), `progcalls`, `disposewho`, `scripts/perf/personbench.mjs`; `selftime.mjs` en `categories.mjs` kappen nu de eerste tijdsdelta af (die is de wachttijd sinds de start van de profiler en telde als '(program)': 41 tot 51% van een profiel op een drukke machine was die ene delta).

### 1. Waar de tijd zit (variant per venster, 3 rondes, Hoog, heel ver, belaste machine, oude haak)

| variant | rAF-callback ms | hoofdthread-CPU ms | GPU-proces-CPU ms | interval ms | draws |
|---|---:|---:|---:|---:|---:|
| alles aan | 37,5 | 39,8 | 18,0 | 41,3 | 497 |
| schaduwpas uit | 29,2 | 30,8 | 13,3 | 31,0 | 375 |
| simulatie gepauzeerd (`world.coopHold`) | 25,8 | 26,6 | 13,2 | 28,5 | 475 |
| render uit (`postfx.render` leeg) | 14,5 | 15,9 | 4,7 | 17,4 | 1 |
| beide: simulatie en render uit | 6,6 | 7,1 | 3,2 | 17,7 | 0 |

Dus op de hoofdthread: **render ongeveer 60%** (23 van 37 ms), simulatie (`updateGameplay`) ongeveer 30% (12 ms), de rest (3D-bijwerken, HUD, audio, tegelvolger) ongeveer 6,5 ms. De GPU is niet de rem: de GPU-timer geeft 15 tot 22 ms op een GPU die met de Electron-vensters van andere sessies gedeeld wordt, het GPU-proces zelf is 32% bezet (`CrGpuMain`, `CommandBufferService:PutChanged` 18%).

Secties van de hitchprobe (ms per frame, gemiddeld, dezelfde runs): alles aan: `3d:render` samen 19,6 (met de oude haak: 15,1 vóór de schaduwpas door de herhaalde scans en terugzetlussen, schaduwscan 2,8, schaduwpas 1,6), `3d:buildings` 1,7, `3d:peds` 1,2, hud 1,9, traffic 2,8, police+collide 1,9, peds 0,9, wildlife 0,6, systems 0,6, player 0,6, `3d:prewarm` 0,5, `3d:lights` 0,5, `3d:grass` 0,5. Met de simulatie en de render uit blijft 6,4 ms over: gebouwen 1,3, hud 0,7, `3d:peds` 0,7, `3d:grass` 0,5, `3d:vehicles` 0,5, audio 0,2.

### 2. De hoofdthread in een Chromium-trace (6 s, alles aan)

De renderer-hoofdthread is 95% bezet; 86% daarvan is `FunctionCall` (JS en wat JS aanroept), 7,5% taakplanning, `CommandBufferProxyImpl::Flush` 1,1%, stijl, layout, paint en commit samen ongeveer 1,5%, V8-GC (scavenges) 0,7%. **DOM, layout, CSS-filters en de minimap-canvas zijn dus niet de rem**: de variant `hudoff` (`#hud` op `display: none`) scheelt -0,2 ± 0,9 ms (de HUD-JS blijft: 1,4 ms per frame), en de schermtegels van de compositor zijn in de trace niet te zien. GC: het spel alloceert 2,4 tot 3,8 MB heap per frame (met de simulatie gepauzeerd 1,0 tot 1,2 MB; de grootste allocators zijn de geometriebouwers van `pixelart3d.js` met `Array.push` ongeveer 28%, de voertuigsimulatie ongeveer 19%: `followSpeedLimit`, `resolveVehicleBuildingCollision`, `halfLen`, `resolveVehicleVehicleCollisions`), maar de scavenges (3 tot 8 per seconde) kosten samen 0,7% van de hoofdthread. Allocaties verminderen levert dus geen frametijd op.

GL-aanroepen (variant `gltime`, elke functie van de context tijdt zichzelf): 3100 tot 3600 aanroepen per frame kosten samen 2,6 ms (7% van het frame): `bindVertexArray` 0,84 ms (650 per frame, 1,3 µs per stuk), `uniformMatrix4fv` 0,43 (730), `uniform3f` 0,31 (600), `bindTexture` 0,20 (260). Dat bevestigt Vervolg 9: GL-aanroepen zijn niet de kost. Textures en buffers: `deleteBuffer` en `deleteVertexArray` kosten in sommige vensters 1 tot 2,8 ms per frame (1 tot 2 aanroepen van ~1 ms: het opruimen van tegelgeometrie tijdens het lopen), `bufferData` 1 tot 11 ms per frame in vensters met streaming; samen spiegelen ze de pieken in `3d:buildings`, `cityprops` en `3d:water`, niet het gemiddelde. De eerste `getProgram`-tellingen: 18 tot 37 programma-opzoekingen per frame (12 daarvan het gedeelde dieptemateriaal van de schaduwpas, 2,5 per frame elk voor drie dubbelzijdige transparante `MeshBasicMaterial`s): ~0,5 ms.

### 3. Frametempo en vsync (punt 4 van de opdracht)

De frame-intervallen (rAF-tijdstempel, 8 s per venster) vallen in twee emmers, 16,7 en 33,3 ms, en bijna nooit ertussen (`hist` in de JSON): de tijdstempel is vsync-gebonden, een frame dat net te laat is kost een volle vsync. Zonder vertraging van de render (variant `render uit`, CPU 14 tot 15 ms) haalt het spel 56 tot 58 fps (94 tot 97% van de frames 16,7 ms, de rest 33 ms: de pieken van personen bouwen, tegelbatchers en omgevingsbakken); bij 25 tot 27 ms CPU is het gemiddelde interval 28 tot 33 ms. Met `--disable-frame-rate-limit --disable-gpu-vsync` verdwijnen de emmers (alle intervallen in 10 tot 36 ms), maar het gemiddelde interval blijft gelijk aan de CPU-tijd van de frame (34,6 ms interval bij 33,0 ms CPU, alles aan): vsync is de rem niet, de hoofdthread is het. **Voor 60 fps moet ook het 95e percentiel van de CPU onder ~16 ms: het gemiddelde moet naar ~13 ms en de pieken (personen bouwen 2,7 ms, gebouwbatcher 3 ms budget, programma-linking) moeten ervoor weg.**

### 4. De stappen

| stap | wat | effect |
|---|---|---|
| `schaduwhaak` (`scene3d.js` `hookShadowPass`) | de haak slaat renders over die niet de spelscène met een bij te werken schaduwkaart zijn (de 15 quads van de postketen, een scènepas zonder werpers, een frame waarin de schaduwkaart niet wordt herbouwd): geen scan, geen verbergen en tonen van groepen | hoofdthread **-4,1 ± 1,4 ms** per frame (14 paren in drie runs, 11 lager, mediaan -3,8), schaduwscan -2,5 ± 0,2 ms (14 van 14 paren); schaduwkaart en hoofdpas ongewijzigd |
| extra secties in `3d:render` | `3d:render:pre`, `:cull`, `:voorpas`, `:schaduwscan`, `:schaduwpas`, `:hoofdpas+post` (alleen met `?hitch`) | meetinstrument |

Het beeld is niet bekeken door een mens: de logica voor de spelscène met schaduwwerpers is ongewijzigd (zelfde code, alleen overgeslagen waar `run()` toch al terugkeerde); alleen een pixelvergelijking van schaduwen zou het nog tonen en die is op deze scène niet bruikbaar (Vervolg 7).

### 5. Geprobeerd zonder winst

- **Personen bouwen** (`buildPersonMesh`, 8 tot 10 per seconde tijdens het lopen, 1497 driehoeken, **2,7 ms per persoon in Node**, `scripts/perf/personbench.mjs`): een versie van `GeoBuilder` zonder vectoren en arrays per driehoek en met een sjabloon in plaats van `BoxGeometry` gaf bit-identieke geometrie (zelfde hash) maar geen snellere bouw (2,7 tegen 2,7 ms): het profiel is vlak (de `push`es van positie, kleur, uv, botindex en botgewicht, 17% en 12%; `build` 6%; GC 7%). Teruggedraaid. De skinned bounding box van `actorRadius` (0,41 tegen 0,06 ms per persoon) is te klein om te lonen.
- **`?simauto`** (#58: gewone auto's ver weg door de simulatieworker): `traffic` 2,4 tegen 2,3 ms per frame, `police+collide` 1,8 tegen 1,7: geen winst te voet in de stad (er zijn weinig auto's voorbij de 150 m van volle simulatie), dus niet standaard gemaakt.
- **Omgevingsbak** (`updateEnvironment`, elke seconde): geen sectiepiek boven 4 ms; geen stap.
- **`set:resolution:0.5`** in een venster: onbruikbaar (de instelling vraagt een langere inloop dan de 1,5 s van de variant); niet verder gemeten.

### 6. Wat dit zegt over 60 fps, en over #246, #247, #58 en #4

De ontleding hierboven is de eerlijke stand: render ~60%, simulatie ~30%, de rest ~10%; elke volgende stap zit onder de 1 ms (in de CPU-profielen als aandeel van de bezette hoofdthread: `setProgram` 7 tot 12%, `projectObject` en `updateMatrixWorld` samen 7 tot 12%, `buildPersonMesh` 4%, gebouwbatcher 3 tot 5%, hud 4 tot 5%, de schaduwpas van three zelf 4 tot 5,5% met de haak nu 0,9%), behalve parallellisme. **#246 blijft open**: 60 fps te voet vraagt ongeveer 13 ms gemiddeld en een 95e percentiel onder 16 ms ms CPU per frame, zonder pieken. Vervolgplan, in volgorde van winst per risico: (1) de vermelde ~1500 niet-bevroren statische knopen bevriezen en de gepoolde verborgen delen buiten de wandeling houden (1 tot 1,5 ms, Vervolg 9); (2) de pieken: personen met een budget van één per frame (het model is 2,7 ms), de batchers en `cityprops` op de rest van het frame laten wachten; (3) de scène in een worker (OffscreenCanvas) met een snapshot per frame: de enige stap boven 3 ms, weken werk, en de reden dat #246 niet zonder X te sluiten is. #247 volgt het profiel niet als grote post (streaming ~10% van de hoofdthread te voet, de worker is niet de rem). #58: de simulatie is 30% van het frame op deze machine, maar de bestaande overdracht van auto's naar de worker (`?simauto`) wint te voet niets; een echte winst vraagt dat het verkeer binnen 150 m ook de worker in gaat, en dat is het grote ontwerp van (3). #4 (meten op een rustige machine) blijft open: geen enkele run van deze ronde was rustig.

### Herhalen

```
cd desktop && npm run stage            # of GDE_PREBUILT_WORLD=<bestaande build>/game/world GDE_STAGE_OUT=<map>/game node build.mjs
PERF_ONLY=r46 PERF_R46='base;nopostfx;pauzesim;pauzesim+nopostfx;noshadow;hudoff;stand;gltime;progcalls;disposewho;off:schaduwhaak' PERF_AB_ROUNDS=3 PERF_AB_WIN=8000 PERF_SETTLE=20000 \
  node scripts/perf/run.mjs r46 "--preset=quality:hoog,shadows:true,drawDistance:heelver,resolution:1,autoResolution:false" --hitch --enable-precise-memory-info
PERF_PROFILE=r46,r46:nopostfx,heap:base,r46trace GDE_PROFILE_OUT=<map> GDE_TRACE_OUT=<map> ...    # CPU-profiel, allocatieprofiel, Chromium-trace
node scripts/perf/trace.mjs <map>/trace-*.json            # threads van de trace
node scripts/perf/selftime.mjs <profiel> ; node scripts/perf/categories.mjs <profiel>
node scripts/perf/personbench.mjs --n=300 --hash          # bouwkosten van een persoon in Node
```
