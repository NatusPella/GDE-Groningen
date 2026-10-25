# Spec: Wereld, kaart en provincie

> Canonieke spec. De code is de waarheid (`gdt.js`, `tileworld.js`,
> `worldbuilder.js`); deze spec bundelt de regels. Detail: `docs/PROVINCIE-PLAN.md`
> (projectie, formaat, LOD), `docs/GEBIEDEN.md` (gebieden) en
> `docs/ARCHITECTUUR-STAD-NAAR-TEGELS.md` (migratie, deels historisch).

## Doel

Eén wereld, één bouwer, één tegelpad; stad en platteland verschillen alleen in wat
er in de tegels staat.

## Bron

De wereld is data: `.gdt`-tegels uit `scripts/world/pack_tiles.mjs` (stad) en
`build_province.mjs` (provincie), gebouwd uit het Geofabrik-extract
(`extract_province.py`), 3D BAG, AHN en een kleine handlaag. `game/citymap.json`
bestaat niet meer (#90/C3).

- **Stad** = 54 stadstegels (`game/stad.json`: `meta`, handgebouwen, gemapte
  meubelrijen, `cover`-masker) + OSM-lagen (`stad_laag.mjs`), eigen weg- en
  spooroplossers (`stad_wegen.mjs`, `stad_spoor.mjs`), `mapextras.json` (patches op
  osm-id) en `landmarkkits.json`.
- **Provincie** = alle tegels binnen 3 km van de grens (`BUFFER_M`), met vlaggen
  LAND 1, BUILT 4, OLD 8, BUFFER 16, PROVINCE 32, OVERLAY 64; het oude
  Ommeland-vak komt uit `ommeland_raw.json.gz`. Water is geen eigen vlag: zee en
  water zijn de plekken waar `LAND` ontbreekt (`build_province.mjs:51`).

Een pack is content-gehasht (`<naam>-<hash>.gdp`) en `merge_overlays.mjs`
herschrijft de packs met de overlaytegels als laatste, vóór de index. Een
onderbroken bouw laat daardoor een index en packs uit verschillende generaties
achter. Daarom controleert `desktop/build.mjs` elke stage met
`scripts/lib/stagecheck.mjs`: elk pack uit elke index bestaat met de grootte die
de index noemt, en een onvolledige wereld-cache wordt opnieuw gebouwd in plaats
van hergebruikt (#496).

## Stad gepind, provincie gestreamd

`tileworld.js` houdt de stadstegels resident (`index.pins.city`: 54 verklaarde plus
elke tegel die een handrij raakt, samen 58) omdat ~37 modules hele arrays lezen
(#314 C1). De rest streamt via `TileStore`/`addTile` (L0 350 m, L1 1,2 km, L2 4 km,
L3 4-40 km). De overlay is geen tegel maar een rijklasse: rijen met
gid ≥ 20.000.000 achter de stadstegel (`merge_overlays.mjs`, `splitOverlay`), vlag
64 blijft in de index; `citycover.mjs` bepaalt de dekking.

## Projectie en tegelformaat

RD New (EPSG:28992): `x = RD_x − 233670`, `y = −(RD_y − 582075)`; three.x = x,
three.z = y (`rdnew.js`). Tegelraster op RD-kilometerlijnen: `x = 330 + 1000i`,
`y = 75 + 1000j`, sleutel `(234+i)_(581−j)` (`gdt.js`). Posities int32
tegel-lokaal in cm, delta+zigzag; 8×8 tegels per pack, plus `global` en
`index.json`; zelfde invoer geeft byte-gelijke tegels. Absolute
wereldcoördinaten zijn te grof op 40 km: tegel-lokaal bakken en via `toRender()`
tekenen. Hoogte: HEIGHTS-rij (`z`, `pnet`, `st`, `ly`, optioneel terrein `zt`), AHN
in RASTER; één vraag `surfaceAt`, `groundHeightAt` als stateloze terugval; één
`waterAt` met peil per lichaam (`waterlevels.js`).

## Wat waar ligt

Stad: binnen de ring plus ~300 m, vol detail, handwerk als objecten op de tegel.
Provincie: dorpen, polders, Eemshaven, Wad; 3 km buffer op L1/L2, daar buiten L3 en
`worldedge`-regels. Plaatsen (POI's) staan als rijen in de POIS-sectie van de tegel
van hun punt (14 lijsten, 2.274 punten in 40 stadstegels, 7 in `poiRest`;
`index.pois.layers` zegt welke tegel welke lijst draagt). Lezers vragen per laag
(`poiLayerPlaces`/`poiLayerPlace`) met `map.meta` als terugval. Gebieden: vijf lagen
uit `game/grenzen.json` (Kadaster/CBS, 1/10/202/123/644), een catalogus van 151
dingen, profiel `gde-gebieden-v1` per speler, safehouses in wijken en woonplaatsen.

## Regels voor een nieuwe feature

1. Geen nieuwe kaartbron: lees de tegel van je punt, of de handlaag met
   osm-/bag-id als sleutel. Geen `citymap`-achtig bestand, geen `inCity`, geen
   tweede waarheid.
2. Coördinaten in het world-frame (via `worldframe.js`-helpers of RD); nooit het
   oude equirectangulaire frame, nooit een eigen projectie.
3. Eén systeem per onderwerp: `worldbuilder.js` + `derive.js` voor afleiding,
   `surfaceAt` voor hoogte, `waterAt` voor water, `junctionModel`/`laneFields` voor
   wegen. Geen eigen hoogte-, water- of routeafleiding.
4. Nieuwe data hoort in een sectie: `gdt.js SECTION` + schrijver
   (`pack_tiles`/`tileBlob`) + lezer (`tileworld`) + test. Onbekende secties worden
   overgeslagen en een oude wereld blijft werken; een indexblok is een toevoeging,
   geen voorwaarde.
5. Lees per tegel, niet per wereld: geen nieuwe hele-array-lezer (#314 C1);
   gebruik de grids of `poiLayerPlaces` met terugval, en houd de gepinde set klein.
6. Een nieuwe plek met iets te doen krijgt een sleutel in `SPEL_SLEUTELS`
   (`game/js/gebieden.js`, #414), anders telt hij niet mee voor de gebieden.
7. Nederlands, verzonnen namen voor merken, altijd zomer; echte plaatsen en
   gebouwen mogen.
8. Bewijs: determinisme, `world_tiles_test`, `tileworld_test`, `province_test`,
   `poisections_test`, `gebieden_test`, en beeld op de vaste plekken.

## Open punten (met issue)

- Werelddocumentatie loopt achter (#468).
- Het kruispuntmodel leest de gestreamde provincietegels niet (#469).
- Twee safehouse-systemen naast elkaar (#470).
- C2 (water-tweeling) is teruggedraaid; de gepinde stad houdt elke rij.
