# 0030 - De terreingrond is een build-cache, geen runtime-werk

- **Status:** voorgesteld
- **Datum:** 2026-11-08
- **Spec:** `.specs-fire/standards/wereld.md` ("Bron", "Regels voor een nieuwe feature")

## Context

Het spel bouwt bij het starten de grond onder de stad: `terrainArrays()`
(`game/js/terrain3d.js`) maakt uit de kaartgrenzen en de waterpolygonen een grid
van ~1,45 miljoen punten met echte watergaten (subdivisie tot ~2,5 m langs de
oevers), in de geometry-worker. Dat is op een referentiemachine ~2,4 s rekenen en
~56 MB arrays; op zwakke machines is het de langste stap van het opstarten (de
boot wacht er met een harde grens op, `TERRAIN_READY_DEADLINE_MS`).

De invoer is deterministisch en de stad staat gepind (ADR 0003), dus dit werk
gebeurt elke start opnieuw met precies dezelfde uitkomst. De wegdekgeometrie is
geen kandidaat: alle 12.159 stadswegen samen kosten ~0,56 s en worden alleen
gebouwd voor wat in zicht komt; die zou juist tientallen MB's aan
zichtbaarheidsvarianten vragen.

## Besluit

De stage bakt de terreingrond één keer als **build-artefact**:
`world/terrain.bin`, geschreven door `scripts/world/bake_terrain.mjs` en gecontroleerd
door `scripts/lib/stagecheck.mjs`. Formaat en lezer staan in
`game/js/terraincache.js`: een kop met grenzen, gridparameters en een
watervingerafdruk, daarachter dozen, indexlengtes, de extra (waterrand-)punten en
de indexen als zigzag-varints. Normalen en het regelmatige basisgrid worden bij
het lezen opnieuw gemaakt; het bestand is deflate-raw en 2,8 MB (was 16,7 MB
rauw).

Het spel leest het bestand bij het opstarten naast de tegels (`tileworld.js`,
`scene3d.js`) en gebruikt het alleen als het bij deze wereld hoort: dezelfde
kaartgrenzen en dezelfde waterlijst. Anders — bestand weg, oude versie, andere
wereld — bouwt de geometry-worker de grond zoals voorheen. De build faalt liever
op een kapot bestand dan dat de speler het bij elke start alsnog zelf bouwt.

De webversie krijgt het bestand ook mee (eenmalig 2,8 MB; daarna uit de
service-worker-cache). Met `GDE_TERRAIN_CACHE=0` slaat de stage de bak over.

## Afgewezen

- **Alles (wegen, gebouwen, grond) als GLB of mesh-cache bakken.** De
  wegdekgeometrie kost maar ~0,6 s voor de hele stad en hangt aan kwaliteit, LOD
  en zichtafstand; bakken zou tientallen megabytes en varianten per
  kwaliteitsprofiel kosten.
- **De grond als nieuwe tegel-sectie.** Hij beslaat het hele stadsframe, niet één
  tegel, en dan moet de kaartbakker (`pack_tiles.mjs`) de render-kernels van
  `terrain3d.js` kennen en bij elke renderwijziging de wereld opnieuw bouwen.
- **De arrays als typed arrays in de tegels (het grote ontwerp).** Groter project
  met eigen migratie; dit lost alleen het terrein op en kan later alsnog.
- **Niets bakken en de worker sneller maken.** De winst zit juist in het overslaan
  van het werk; optimaliseren van de subdivisie raakt de vorm van de grond.

## Gevolgen

- Elke stage duurt ~5 s langer (bakken en verpakken) en de app wordt 2,8 MB
  groter; het opstarten scheelt op de referentiemachine ~2,1 s en op zwakke
  machines meer. Gemeten: verse bouw 2,4 s, lezen (inflate + arrays) ~0,3 s.
- `terrain.bin` hoort bij de wereld en de code: een nieuwe cacheversie
  (`TERRAIN_CACHE_VERSION`), andere grenzen of een andere waterlijst laten het
  spel terugvallen op zelf bouwen. De zware testfase draait
  `bake_terrain.mjs --check`: verse bak, opgeslagen bestand en de lezer moeten
  dezelfde arrays geven.
- Het bestand is een build-artefact in `game/world/` (niet in git), net als de
  tegels; het is geen kaartbron en volgt niet de sectieregel uit `wereld.md`.
