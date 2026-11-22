# Kaart-performance (22-11)

Aanleiding: de eigenaar merkte bij het spelen van de test-exe dat de volledige kaart ("M") soms zwaar is bij het zoomen in een gebied.

## Wat er al was

De tegelcache (512 px, 14 niveaus, `renderTile`), de lastGood-laag tijdens het laden van tegels, de 15 Hz-regeling bij stilstand (#661, `mapcache.js`), de breedtecache voor straatnamen en de cel-cache voor `builtUpAt`.

## Gevonden knelpunt

Elke pan- of zoomstap zet `state.dirty`; `compose()` bouwde dan elke frame de hele vaste laag (`drawStaticOverlay`) opnieuw: regiolabels, plaats- en wijknamen, straatnamen met hoekberekening, de labelbotsingsregel, vaste pictogrammen, de veroverd-laag en alle `measureText`-aanroepen. Bij een wielzoom of sleep is dat 60 keer per seconde terwijl labels meteen weer verspringen. Dat is het zware deel, niet het blitten van tegels.

## Aanpak (alleen de renderpijplijn, `game/js/mapview.js` en `mapcache.js`, additief)

1. **Vaste laag op een eigen doek** (`drawOverlayCached`). De beslisregel is zuiver en getest: `overlayPlan` in `mapcache.js` geeft `reuse`, `interim` of `build`.
   - Tijdens pannen en zoomen (het beeld veranderde minder dan 120 ms geleden): de vorige laag wordt als bitmap geschaald en geschoven (`interim`). Geen labelbouw.
   - Na 120 ms stilstand: één scherpe herbouw (`build`). Het eindbeeld is dus hetzelfde als voorheen.
   - Een andere oorzaak van vuil bij hetzelfde beeld (laag aan of uit, pins, reismodus, fase): meteen `build`, zonder wachttijd.
   - Zelfde beeld en niets vuil (de fade van de mist): `reuse`, geen herbouw.
2. **Breedtecache voor labels** (`textWidth`): `measureText` per font en tekst onthouden, gewist bij `document.fonts` `loadingdone` en begrensd op 6000 items.
3. **`keepLastGood`** kopieert het volledige doek alleen als er tegels bij kwamen (`tileGen`) of het beeld veranderde.

Niet gedaan (nog niet nodig gebleken, en gevaarlijk voor pixelgelijkheid): Path2D-wegen per tegel, LOD-simplificatie van polygonen, een aparte mistmasker-cache (het masker `d.edge` is al een voorberekend bitmapje, `drawDiscovery` is één `drawImage`). Culling van markers en labels buiten het venster staat al in `drawStaticOverlay` en `drawDynamicMarkers` (`onScreen`, `viewRect`).

## Meting (node, zonder Electron)

`node scripts/perf/kaart_perf_bench.mjs` modelleert de kadans per frame: per zoomniveau 1 tot 8 een wielzoomburst van 6 stappen, 30 frames stilstand, een pan van 30 frames en weer stilstand, op 60 fps, met de echte `overlayPlan`.

| | voor | na |
|---|---|---|
| Volledige herbouw van de vaste laag (8 niveaus) | 288 | 17 |
| Tussenbeelden (geschaalde bitmap, goedkoop) | 0 | 399 |
| `measureText` per 8 herschilderingen van 300 labels | 2400 | 300 |

Dat is een kadansmodel, geen frametijd op echte kaartdata: er is geen Electron gedraaid en `game/world` was niet beschikbaar voor een draw-call-telling op de echte kaart. De winst per frame is dus de weggelaten labelbouw (in `perf.overlayMs` van `getMapViewStats()` te zien, plus de nieuwe tellers `overlayBuilds`, `overlayInterim`, `overlayHits`).

## Uiterlijk

Stilstaand identiek: dezelfde code tekent de scherpe laag, alleen op een eigen transparant doek dat daarna over de tegels wordt gelegd. Tijdens beweging zijn de labels even meegeschaald (iets zachter of groter) tot de scherpe herbouw na 120 ms. De hover-lijst (`staticHover`) is dan van het vorige beeld; hij ververst bij de herbouw. DS3-palet en iconen zijn ongewijzigd.

## Samen spelen

Lokaal, alleen de eigen weergave; geen protocolwijziging.

## Nog niet bekeken

Niet in beeld gezien (geen Electron). Te controleren op de testexe: zoomen en slepen voelt vloeiender; na stilstand zijn labels scherp; laag aan of uit werkt meteen; de mistfade en de onthulling van een streek lopen soepel.

## Tests

`node scripts/kaart_perf_test.mjs`, `node scripts/kaartlabels_test.mjs`, `node scripts/mapcache_test.mjs`.
