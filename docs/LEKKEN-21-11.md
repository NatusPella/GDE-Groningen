# Geheugenlekken en stabiliteit (21-11, #1065)

Opdracht van de eigenaar: "zoek ook naar eventuele memory leaks of andere issues". Aanleiding: in `docs/PERF-HEAP-21-11.md` steeg `geometries` binnen een run van ca. 1650 naar ca. 2400 en is een soak van 10 minuten nooit gedraaid.

Dit rapport is het resultaat van statische analyse, drie parallelle leesronden en mock-tests in Node. **Er is geen Electron gebruikt** (de releasegate draaide); alles wat alleen in het echte spel te meten is, staat onder "Nog te meten".

## Gevonden en gefixt

| Wat | Waar | Bewijs | Fix |
|---|---|---|---|
| Padel: vier personen per wedstrijd (skelet met bottextuur, ca. 8 racketgeometrieen elk, persoonsteller) werden alleen uit de scene gehaald | `padel.js` (twee eindpaden) | mock-soak: zonder fix 184 naar 3264 levende geometrieen over 400 wedstrijden, met fix vlak | `disposeObject` bij het einde, racket- en gripmateriaal als gedeeld gemarkeerd |
| Fierljep-duel: twee figuren, zelfde lek | `pg_fierljep.js` | idem | `disposeObject` |
| Minigolf: wissel van venue liet baan, drie personen en hun skeletten staan | `pitchputt.js` `zetVenue` | bronanalyse, zelfde patroon | `disposeObject` per onderdeel |
| Politiehelikopter: ca. 12 eigen geometrieen en een lensmateriaal per helikopter, nooit vrijgegeven | `scene3d.js`, `police.js` | mock-soak (300 helikopters) vlak met fix | `disposeObject`; gedeelde heli-materialen gemarkeerd |
| Vlakke brugwegen: `_geoBridgeCore` werd bij het uit de koude wegcache vallen nooit vrijgegeven (en bij terugkomst als oud object hergebruikt) | `roadsurface.js`, `scene3d.js` `freeRoadGeometry` | bronanalyse (geen andere verwijzing) | zelfde opruiming als `_geoStruct` |
| Gebouwdelen-LRU (800 gebouwen) gooide de oudste weg, ook als zijn mesh nog getekend werd of klaarlag; three.js uploadt hem dan opnieuw en de cache kent hem niet meer: een blijvende geometrie in de GPU-lijst | `models3d_buildings.js` `touchParts` | `buildingparts_lru_test` (9 controles) | `setPartsInUse`: gebouwen in beeld of klaarliggend gaan achteraan de rij; teller `gespaard` in de technische info |
| Missiemarker en de twee coop-bakens: eigen geometrie, materialen en labeltextuur nooit vrijgegeven | `scene3d.js`, `coopentities3d.js`, `worldmarker3d.js` | mock-soak (300 markers) | `disposeWorldMarker3D` (glyph- en kolomtextuur blijven gedeeld) |
| Haltebordjes van de OV-route bleven verstopt in de scene, elk met een eigen canvas | `waymarkers3d.js` | test met nepborden | `trimSigns`: boven 8 ongebruikte borden worden de oudste vrijgegeven |
| Eén uitzondering in een systeem legde de rest van het beeld stil (3D, HUD en de vastloop-bewaking draaiden na `updateGameplay`) | `main.js` | bronanalyse; `frameBody` had één try/catch om alles | `framesafe.js`: `updateGameplay`, `updateSafety`, `update3D`, `updateHud` en vijftien losse systemen draaien veilig, de AI van elk voertuig in een eigen try/catch; de console krijgt de eerste fout en dan elke 600e; teller per systeem in de technische info |
| NaN of Infinity in een AI-voertuig of voetganger werd nooit opgeruimd (afstandstoetsen zijn bij NaN onwaar) | `finitesweep.js`, `main.js` | `stabiliteit_test` | elke 30 beelden opgeruimd; kost 0,2 ms bij 400 auto's |
| Live bussen konden na een fout in `verwerk` nooit meer opvragen (`bezig` bleef staan) | `buslive.js` | bronanalyse | `finally` en een afhandeling van een mislukte opvraag |
| Een fout in `playScript` liet bij een gast `coopCutBezig` hangen | `coopcut.js` | bronanalyse | try/catch, telt als een scene die niet startte |
| `gpu-events.log` groeide zonder grens; coop-TCP-server en routerpoort bleven na een zachte herlaad van het renderproces open; geen melding bij een vastgelopen venster; per venster een nieuwe `child-process-gone`-luisteraar | `desktop/main.js` | bronanalyse | grens 256 kB, `gde-coop-reset`, `unresponsive` en `responsive` loggen, luisteraar weg met het venster |

## Wat geen lek bleek (met bewijs)

- **Voertuiggeometrie:** 3000 spawn/despawn-cycli met willekeurige modellen en kleuren blijven vlak op 184 levende geometrieen (de LRU van 180 plus persoonsgeometrie). Materialen blijven op 38.
- **Personen:** 1600 personen (400 rondes van vier, met racket) blijven vlak zodra `disposeObject` wordt aangeroepen.
- **Samen spelen in Node:** `node --expose-gc scripts/perf/leak_coop.mjs --n=24` (host en gast met geheugentransport): heap 13,8 naar 14,1 MB, groei 0,19 MB per 10 rondes, timers 0 naar 0, sleutels van de hostwereld 103 naar 103: vlak.
- **Luisteraars en timers:** de bronanalyse vond geen luisteraar die per opening van een paneel wordt toegevoegd zonder weg te gaan; reisrit, laadscherm, fotomodus, trailer, saveslots, samenkeuze en coophold ruimen zichzelf op. Web Audio: `playClip`, `playTone`, `playNoiseBurst` en `playBuf` koppelen los; er is één `AudioContext` in `audio.js` (de trailer heeft een tweede, alleen in de trailerroute).
- **Netwerk:** brokers hebben een begrensd exponentieel herstel, `rtcroom` sluit de verbinding, `livebussen.cjs` heeft een time-out en een groottegrens.
- **Saves:** `localStorage` met een herstelkopie, controle na het schrijven, quota-afhandeling en terugdraaien (`saveslots.js` `writeSlotRaw`). Er zijn geen savebestanden om atomair te schrijven.
- **Dag- en tijdovergangen, geldoverloop:** `calendarday.js` en `daynight.js` normaliseren de klok, `main.js` herstelt een niet-eindig geldbedrag elke frame.

## Waarom `geometries` per route steeg (hypothese, niet gemeten)

De gebouwdelen-cache houdt tot 800 gebouwen vast, elk met `main` en vaak `detail`. Een rit door de stad vult die cache vanzelf tot ca. 1600 extra geometrieen; dat is een plafond, geen lek. Wat daarboven nog steeg was het geval van de LRU die een zichtbaar gebouw weggooide (nu gefixt). De technische info toont nu `gebouwdelen: size, max, gespaard` naast de geometrieteller, zodat de volgende meting beide kan vergelijken.

## Lekbewaking in de technische info (Ctrl+Shift+G)

Blok `[Lekbewaking]` (`leakwatch.js`, een meting per 5 s, niets per beeld): geometrieen, texturen, shaders, scene-objecten, DOM-knopen, luisteraars (netto toegevoegd min verwijderd, `once` telt niet), lopende timers en intervallen, aangemaakte Web Audio-knopen, open WebRTC-verbindingen en de fouten die de veilige updatelus opving. Het alarm komt als een teller na 3 minuten opwarmen vier blokken van een minuut achter elkaar stijgt (het laagste punt per minuut, minstens 5 stuks en 5%); een zaagtand of een opwarmstijging geeft geen alarm. De luisteraar- en timertellers zijn een indicatie: dezelfde handler twee keer toevoegen telt dubbel. Audioknopen worden alleen als aanmaaktotaal getoond (Web Audio kent geen levende teller). Een alarm hoort bij een melding met de tekst van het blok.

## Open (niet gefixt, met reden)

| Wat | Waarom open | Voorstel |
|---|---|---|
| `applySave` die halverwege faalt laat de wereld half geladen en de volgende autosave kan de vorige slot overschrijven (`savegame.js` `loadSlot`) | raakt het laadpad van saves, moet met een echte save worden geprobeerd | issue (bug) |
| `lampByKey` (`nightlights3d.js`) bewaart elke lamp ooit gemaakt (ca. 100 tot 200 byte per lamp); groeit met de gereden wegen | gedrag is bewust (stabiele lampset); winst onbekend | meten met de soak, dan eventueel LRU per tegel |
| `provincemap.js` `imgs`: elke bezochte kaarttegel (met een gerecoloreerd canvas) blijft staan, begrensd door de piramide | begrensd; alleen bij veel pannen op de kaart | LRU van 64 |
| `businterieur3d.js` `reizigersGeo`: de sleutel bevat de bezetting van stoelen (Samen spelen) en wordt nooit geleegd | alleen in een bus met veel wisselende gasten | `bezet` uit de sleutel of een cap |
| Permanente pollers (`overlayhold.js` 150 ms, `samenpanel.js` 500 ms, `touch.js`, `profileoverlay.js`, `storydev.js`, `botaudio.js`) en een `MutationObserver` op `body` (`glyphs.js`) | geen groei, wel kleine constante CPU | pauzeren bij `document.hidden` |
| `multiplayerhostwisselui.js` start een interval en een keydown-luisteraar die nooit stoppen; `lobbyui.js` start-tik heeft geen eigenaar | geen groei na de eerste keer | opruimen bij einde sessie |
| Kart-motor en enkele coop-stemmen laten oscillators lopen (alleen gain naar nul) | audiothread-CPU, geen groei | `stop()` bij verlaten |
| `placeshot.js` houdt twee HalfFloat-rendertargets vast; `vehiclepreview.js` verwijdert de renderer niet bij `webglcontextlost` | zeldzaam | dispose na de opname, dispose bij verlies |
| `dorpsuitjes.js` `placeSoon` heeft geen `catch`: een afgewezen `withTiles` herhaalt elk beeld | ligt in de plaatsing van de andere agent (tileplace) | na zijn werk |
| `desktop/main.js` `gde:save-text` zonder try/catch rond `fs.writeFile` | laag | try/catch |

## Restpunten opgelost in #1074 (21-11, zonder Electron)

`provincemap.js` (LRU van 256 bladen), `businterieur3d.js` (reizigersgeometrie hooguit 64), `dorpsuitjes.js` (`placeSoon` vangt een afgewezen `withTiles` af, drie pogingen), `desktop/main.js` (`gde:save-text` met try/catch). Bronchecks in `stabiliteit_test.mjs`. Niet aangeraakt, wachten op de Electron-soak: `lampByKey`, de pollers, `multiplayerhostwisselui`, kartmotor, `placeshot` (de twee doelen worden bewust hergebruikt) en `vehiclepreview` (three.js herstelt zelf na `webglcontextlost`).

## Tests

- `node scripts/leakwatch_test.mjs` (32 controles): alarm bij stijging, geen alarm bij zaagtand of opwarmstijging, begrensd venster, geen NaN, tellers op een nepomgeving, veilige updatelus.
- `node scripts/stabiliteit_test.mjs` (25): `sweepNonFinite`, `trimSigns` en de bedrading van de reparaties in `scene3d.js`, `main.js`, `buslive.js`, `coopcut.js` en `desktop/main.js`.
- `node scripts/buildingparts_lru_test.mjs` (9): de LRU spaart gebouwen in gebruik en blijft begrensd.
- `node scripts/leak_mock_soak_test.mjs` (9, ca. 8 s, staat bij SLOW): 3000 voertuigen, 1600 personen, 300 helikopters en 300 markers bouwen en vrijgeven met een teller van levende geometrieen. De test is discriminerend: zonder `disposeObject` stijgt de personenteller naar 3264.

## Nog te meten in Electron

Dit vraagt een exclusief slot en een gestagede wereld (omgeving zoals bovenin `scripts/perf/leak_soak.mjs`: `GDE_GAME_DIR`, `ELECTRON_EXE`, `PERF_LOCKS`, `PERF_OUT`).

1. **Leak-soak van 12 minuten** (lopen, auto, helikopter, pauzemenu, kaart, missie, Samen-spelen-proefgast; heap, geometrieen, texturen, programma's, DOM-knopen, luisteraars, timers, scene-knopen, materialen, tegels):
   `node scripts/perf/leak_soak.mjs --min=12` (exit 1 bij een lek; `--judge=<soak.json>` beoordeelt een eerdere run). Doel: heap hooguit +2% per 10 minuten, tellers vlak.
2. **Dezelfde soak met 30 minuten** voor de langzame groei: `node scripts/perf/leak_soak.mjs --min=30`.
3. **Geometrieteller voor en na deze tak** op dezelfde twee routes als `PERF-HEAP-21-11.md` (foot en ring, 40 s): daar steeg `geometries` van 1647 naar 2431. Verwacht: minder stijging; lees `gebouwdelen: size/max/gespaard` en `geometrieen` in Ctrl+Shift+G na de rit (ook `window.__scene3d.renderer.info.memory`).
4. **Technische info na 10 minuten spelen** (Ctrl+Shift+G, blok `[Lekbewaking]`): staat er een alarm? Welke teller? Dat is de eerste aanwijzing voor de volgende ronde.
5. **Minigames herhalen** (padel, Fierljep, minigolf, 10 keer starten en stoppen) en `geometrieen` vergelijken voor en na: moet vlak blijven. Idem voor een politiehelikopter oproepen en wegsturen (wanted 5) en 20 missies starten en stoppen.
6. **Heapprofiel** op de soak (`node scripts/perf/cdp_profile.mjs`, daarna `node scripts/perf/heapmap.mjs <profiel>`) om de levende heap per categorie te zien.
7. **Samen spelen met echte vensters** (twee instanties, 10 minuten, gast valt weg en sluit weer aan): `node scripts/perf/leak_coop.mjs` meet alleen het geheugentransport; WebRTC en brokers zijn in Node niet gemeten.
8. **Renderproces herladen** (`GDE_DEV=1`, `webContents.forcefullyCrashRenderer()`): poort vrij na de herlaad? (`gde-coop-reset`).
