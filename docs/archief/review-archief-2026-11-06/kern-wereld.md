# Review kern, wereld en streaming

Review op main `9d63ab80`, werkboom schoon. Alleen zelf gelezen code is geflagd, met de aanroepers erbij.
## Dekking

- **Gelezen (volledig of grotendeels):** `main.js`, `tileworld.js`, `tilestore.js`, `tileworker.js`,
  `tileplace.js`, `tilegreenery.js`, `geojobs.js`, `geoworker.js`, `viewdist.js`, `tilefocus.js`,
  `worldframe.js`, `streambudget.js`, `devflags.js`, `worldbuilder.js`, `scene3d/routeribbon3d.js`,
  `worldmarker3d.js`, `missionmarker3d.js`, `countrymap.js`; in `scene3d.js` de stream-/opbouwsecties
  (`syncBuildings`, `syncRoads`, `syncWater`, `syncTrees`, water/oevers, `update3D`, actor-sync,
  culling, prewarm); in `elevation.js` opbouw + streamen; in `roadsurface.js` worker-geometrie/
  markering/kwaliteit; `roadstructures3d.js`, `farlod.js`, `countryside.js`, `wildlife.js`,
  `cityprops.js`, `mapview.js`, `docs/PERF-LAADHANG-0.56.1.md`, `AGENTS.md`, coding-standards,
  constitution.
- **Gegrept/geteld:** ±8 gerichte greps: `streamPending|streamStat|idle` (250+ treffers), `runGeo(` (9),
  `geoFrame` (9), `streamPending` (10), `_geoStruct|_geoOverDeck` (11), `_shore` (15),
  idle-guard-patroon (3), `.cancel(` op de tile-store (0 aanroepers); 895 `.js`-bestanden geteld.
- **Niet bekeken (eerlijk):** `models3d_*` (niet op dispose/leven gecontroleerd), grote delen van
  `scene3d.js` (camera, shaders, schaduwpas, prewarm-batch, link-guard), de grafiekbouw in
  `roadsurface.js`, `wildlife.js`-geometrie, `quaywalls.js` intern, `provinceworld.js`,
  `grass.js`/`farprops.js`/`railway3d.js`, `scripts/world/*` en alle tests.

## Bevindingen (op ernst)

### [Kritiek] Laadscherm blijft op ~92% staan: geo-resultaten worden nooit geleegd vóór de spellus
- **Waar:** `game/js/main.js:557` (`await terrainReady()`), `geojobs.js:70-78` (`klaarQueue`/`leegKlaar`),
  `geojobs.js:135` (`push`), `geojobs.js:151-152` (`geoFrame` → `leegKlaar`), `scene3d.js:1022-1027`
  (terreinjob), `scene3d.js:2497` (enige `geoFrame()`-aanroep, in `update3D`), `main.js:590`.
- **Al gemeld: #557**; het mechanisme ontbreekt daar. Sinds `918243dc` (#553) roept de worker-callback
  `done` niet direct aan maar duwt hem in `klaarQueue`; die wordt alleen geleegd door `leegKlaar()` in
  `geoFrame()`, en `geoFrame()` draait alleen in `update3D`, dat pas in de renderlus van het startscherm
  draait (`main.js:590` → `waitForStart`). `boot()` wacht op `terrainReady()` vóór die lus begint, dus
  de terreinpromise wordt nooit vervuld: de balk blijft op de 0,92-grens van `initLoading` staan,
  zonder foutmelding. Elke start waarbij de worker de terreintaak doet (het normale pad) start niet;
  alleen de worker-terugval of `?noworker` omzeilt het.
- **Fix:** laat de boot de wachtrij leegmaken: `export function flushGeoResults() { leegKlaar(); }` en die
  in `terrainReady()`/`finishLoading` via `setTimeout`/`requestAnimationFrame` aanroepen tot de promise
  klaar is, of geef `runGeo` een `{ direct: true }` voor jobs die vóór de spellus worden afgewacht.
  **Zekerheid:** zeker.

### [Hoog] Hangende tegel-fetch of dode tile-worker bevriest de wereld zonder fout of time-out
- **Waar:** `tilestore.js:21-29` (`HttpRangeSource.read`, geen time-out), `tilestore.js:129`
  (`concurrency: 4`), `tilestore.js:235-262` (`_load` wacht onbegrensd op `source.read` én `decode`),
  `tilestore.js:365-392` (`makeWorkerDecoder`), `tileworld.js:440`, `main.js:384`.
- **Scenario/impact:** (a) een fetch blijft hangen (webversie achter proxy, Electron-range zonder
  antwoord): `e.state` blijft `loading`, `active` zakt nooit; na vier zulke requests loopt de hele
  tegelwachtrij vast — geen provincietegels meer, gaten in de wereld, en alles wat op tegels wacht
  (`withTiles`, `registerShots`, het plaatsingsvenster van de boot via `main.js:575-591`) blijft hangen
  met pins die nooit vrijkomen; tijdens de boot hangt `await loadTileWorld(...)` en blijft het
  laadscherm staan. (b) sterft een worker (OOM bij decoderen), dan rejectert `w.onerror`
  (`tilestore.js:380`) alleen de op dat moment open jobs; de dode worker blijft in de pool en volgende
  `postMessage`s leveren nooit antwoord, dus elke volgende decode hangt. Anders dan `geojobs.js:86-96`
  is er hier géén terugval op de hoofdthread en geen time-out.
- **Fix:** per request een `AbortController` + `setTimeout` (bv. 10 s) in `_load`/`HttpRangeSource.read`,
  bij afloop waiters rejecteren en als fout tellen; in `makeWorkerDecoder` bij `onerror` de worker
  vervangen of `decodeCompressed` op de hoofdthread als terugval nemen; en in de boot een time-out die
  `showLoadError` toont. **Zekerheid:** zeker dat er geen tijd/terugval is; waarschijnlijk dat het raakt.

### [Midden] `geojobs.fail()` gooit wachtende jobs weg zonder hun `done` te bellen
- **Waar:** `geojobs.js:86-96`; aanroepers met `done`: `cityprops.js:739-766` (`buildCellMeshes`),
  `quaywalls.js:860-872` (oevers).
- **Scenario/impact:** valt de geometry-worker om midden in een stream-burst, dan worden alleen de
  in-flight jobs opnieuw op de hoofdthread gedraaid (regel 95); alles in `queues[i].items` wordt met
  `length = 0` weggegooid en de `done`-callbacks vuren nooit. Een stadscel blijft `cell.active = true`
  zonder mesh (pas na ver weg en terugkomen bouwt `cityprops.js:931` hem opnieuw); een waterpolygoon
  houdt zijn `poly._shoreWait`-wachters voorgoed vast en krijgt geen oever tot hij opnieuw instroomt.
  Na een workerstoring ontbreken dus plekken straatmeubels/breekbare afzettingen en wateroevers, zonder
  foutmelding of retry.
- **Fix:** in `fail()` de wachtrij niet stil leegmaken: voor elke job `done(null)` aanroepen (de
  `roadGeo`-handler doet dat al: `if (!res) { r._geoMain = true; return; }`) of de jobs opnieuw in de
  queue zetten en begrensd per frame op de hoofdthread draaien; log het aantal. **Zekerheid:** zeker;
  impact waarschijnlijk (alleen bij workeruitval).

### [Midden] Civiele werken van een koude weg worden nooit gedispose: GPU-geheugen groeit op een lange rit
- **Waar:** `scene3d.js:2001-2004` (`freeRoadGeometry`), `roadstructures3d.js:89-108` (`structureGroup`
  maakt per weg eigen `BufferGeometry`), `roadstructures3d.js:276-278`/`666-668` (caching op
  `r._geoStruct`/`r._geoOverDeck`), `scene3d.js:1988`/`2112` (`ROAD_CACHE_MAX` + `coolDown`).
- **Scenario/impact:** verhoogde gestreamde wegen uit de provincie (viaducten, dijklichamen) dragen
  civiele werken. Valt zo'n weg uit de koude cache, dan dispost `freeRoadGeometry` alleen
  `_geoSidewalk/_geoRoad/_geoMark`; `_geoStruct`/`_geoOverDeck` blijven staan terwijl het wegobject
  nergens meer bereikbaar is. Per geëvacueerde verhoogde weg lekt dus de geometrie van brug/talud, de
  hele sessie door; op een lange tocht loopt het GPU-geheugen op (de Hoog-budgetten zijn krap,
  `viewdist.js:20-45`) met haperingen of contextverlies als gevolg.
- **Fix:** in `freeRoadGeometry` ook de kinderen van `r._geoStruct`/`r._geoOverDeck` disposen en de
  velden op `undefined` zetten (materialen zijn gedeeld via `mats` in roadstructures3d.js:19-37);
  bij terugkomst van de tegel worden de structuren opnieuw gebouwd. **Zekerheid:** zeker; impact
  waarschijnlijk (afhankelijk van de route).

### [Laag] Per-frame en per-job allocaties op de hete streamingpaden
- **Waar:** `scene3d.js:2721-2727` (`world.wildlife.filter(...)` per frame) + `2172-2174` (`new Set()`
  per frame in `syncActors`); `scene3d.js:2011-2013` (`new Set()` per frame in `syncWater`);
  `worldmarker3d.js:208` (`new THREE.Color` + `markerColors()` per frame per marker);
  `geojobs.js:172` (`[...open.values()].filter(...)` per `runGeo`, alleen voor een statistiek).
- **Scenario/impact:** rijden door stad of provincie: honderden `runGeo`s per seconde, elke frame een
  filter-array + Set voor dieren en een Color voor de marker. Extra GC-druk precies tijdens het
  streamen, dus microhaperingen; geen crash.
- **Fix:** de wildlife-lus met een herbruikbare module-Set die per frame `clear()`t (zoals `_vehSeen` in
  `syncVehicleMeshes`, `scene3d.js:767-769`), het filter in dezelfde lus doen, `markerColors()` één keer
  per frame cachen, en de `maxOpen`-statistiek achter `geoStats.enabled` zetten. **Zekerheid:** zeker.

### [Laag] `TileStore.cancel(token)`/`tokenPrefix` is dood: tokens verliezen nooit interesse
- **Waar:** `tilestore.js:189-198` (`cancel`), `tilestore.js:324` (`e.token === tokenPrefix`),
  `tilestore.js:176-187` (`request` zet `token` alleen op de waiter, nooit op `e`).
- **Scenario/impact:** snelreis-, menu- en kaartvensters vragen tegels met een eigen token
  (`mapview.js:2303`, `tileplace.js:176`, `tileworld.js:407/416`), maar er is in heel `game/js` géén
  aanroeper van `store.cancel(...)`. `e.token` bestaat niet, dus de token-tak in `prefetch` is dode
  code; alleen "geen waiters" breekt een prefetch af. Afgebroken vensters houden hun loads en pins in de
  wachtrij: werk en bandbreedte naar tegels die niemand meer ziet, en de dode API nodigt uit tot
  verkeerd gebruik.
- **Fix:** óf `request` zet `e.token` en de aanroepers roepen `store.cancel(token)` in hun `finally`
  (zoals `withTiles` de pins opruimt), óf `cancel`/`tokenPrefix` en de tokens verwijderen.
  **Zekerheid:** zeker.

### [Laag] `elevation.js`: lege `if` en achterblijvende vlakke stukken na het vallen van een tegel
- **Waar:** `elevation.js:154-169` (het `if (!o.z || elev.byRoad.get(o)) { /* ... */ }` op regel 158
  heeft een leeg blok), `elevation.js:186-212` (`shrinkElevation`).
- **Scenario/impact:** `extendElevation` voegt voor wegen van andere tegels vlakke stukken toe
  (`addFlatPiece`, regel 157-168, opgeslagen onder die andere weg); `shrinkElevation` ruimt alleen de
  stukken van de gevallen tegel zelf op (regel 197-199). De stukken voor blijvende buurwegen blijven in
  `elev.flatGrid`/`flatOf` staan: traag groeiende hoogte-grids na een lange tocht langs verhoogde
  wegen, en meer segmenten per `grid.at()`. De lege `if` suggereert dat hier ooit iets overgeslagen
  moest worden.
- **Fix:** houd bij welke `flatOf`-sleutels bij een `extendElevation` voor vreemde wegen zijn
  toegevoegd en ruim die mee op in `shrinkElevation`, of verwijder de lege `if` en documenteer dat
  vlakke stukken van buurwegen blijven staan. **Zekerheid:** lege `if` zeker; groei waarschijnlijk.

## Gecontroleerd en in orde

- **De 0.56.1-klasse zit er op main niet meer in:** `syncRoads` (`scene3d.js:2048-2114`) heeft geen
  idle-guard en zet `streamStat.r` in beide takken (2097, 2105); de gebouw-guard
  (`scene3d.js:1693-1709`, record pas op 1806-1808 na een pas zonder ontbrekende gebouwen) en de
  far-LOD-guard (`farlod.js:473-533`, record alleen als de wachtrij leeg was) doen het veilig
  (`FrameQueue.run`, `tilestore.js:95-119`, draait altijd minstens één item, dus ook het verlaagde
  tegelbudget van 0,6 ms in `main.js:697` kan de tegelstroom niet laten stilstaan).
- **Dispose-discipline bij actoren klopt:** `disposeObject` slaat gedeelde geometrie/materialen over
  (`scene3d.js:647-655`); voertuigen, voetgangers en dieren disposen op despawn (`syncVehicleMeshes`
  768-790, `syncActors` 2172-2189); de waypoint-stippen delen bewust één geometrie/materiaal.
- **Streaming-grenzen zijn begrensd:** `TileStore` heeft een bytebudget met pins en hysterese
  (`tilestore.js:124-129`, `264-279`, `336-343`), de weg-/watercaches zijn begrensd
  (`scene3d.js:1988-1999`) en de mini-kaart bouwt tegels in idle-tijd (`countrymap.js:362-379`).
