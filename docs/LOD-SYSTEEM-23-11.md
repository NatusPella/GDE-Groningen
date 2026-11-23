# Centraal LOD-systeem (23-11-2026, besluit eigenaar: alle modellen krijgen LOD's)

> Tak `perf-ultra-23-11`. Eén systeem, gebouwd op de LOD-vorm van de tak `vettruck-23-11`: `game/js/lodlevels.js` (de opgave
> `lod: { grenzen, band, weg }`, `lodChoice`, `lodDither`) en `game/js/lod3d.js` (`DitherLOD`) zijn daarvan letterlijk overgenomen.
> Daarop: `lodsimplify.js` (automatische vereenvoudiging), `lodregistry.js` (modelsoorten, meeschalen met de stand, register en
> audit) en `lodkit3d.js` (three.js: lichtere geometrie, dither-crossfade, instancing). Test: `node scripts/lod_audit_test.mjs [--tabel]`.

## 1. Inventaris (stand 23-11)

| Modelsoort | Voor deze tak | Nu |
|---|---|---|
| Landmarks | mesh-LOD's (tak `landmarks-aaa-23-11`) | ongewijzigd, niet in dit register |
| Gebouwen | detail tot de detailring, daarna de verre laag (`farlod.js`), harde wissel | ongewijzigd; soort `building` staat in het register, **dither-overgang nog niet gebouwd** (zie 4) |
| Straatmeubilair | één InstancedMesh per soort, eigen tekenafstand | `makeLodInstanced`: LOD-niveaus per soort, dither-crossfade, `prop` (klein, weg op 150 m) of `propfar` (vangrails, schermen, portalen: eigen tekenafstand tot 700 m) |
| Bomen | hele boom tot de nabije straal, daarna een kroon (80 driehoeken) | daarbij een grove kroon voorbij 170 m (20 driehoeken) met dither-crossfade (`treecrown`) |
| Boten | geen | `makeLodObject` in `buildBoatMesh`: 2 lichtere niveaus per romp (per materiaalgroep: glas blijft glas), weg op 600 m |
| Treinen | alleen LOD-interieurs (#847) | `makeLodObject` per wagen: lichtere niveaus per mesh, weg op 820 m (de railzichtafstand is hoogstens 800 m) |
| Personen, dieren | alleen een animatie-afstandstrap | **nog niet gekoppeld**: API hieronder voor de agent personages en dieren (`lodForSkinned`) |
| Voertuigen, vet-truck | cabine-LOD; de vet-truck heeft `DitherLOD` (vettruck-23-11) | **nog niet gekoppeld** (agent voertuigen): `DitherLOD` of `makeLodObject`, soort `vehicle` |
| Interieurprops | geen | **nog niet gekoppeld** (agent interieur): `makeLodInstanced`, soort `interior` |

## 2. Hoe het werkt

- **Vereenvoudiging** (`lodsimplify.js`): vertexclustering op een raster per as (een lange smalle romp blijft breed genoeg); het punt
  van een cel is het hoekpunt dat het verst van het midden ligt (het silhouet krimpt niet), de vertexkleur het gemiddelde. Een niveau
  telt alleen als de bounding box binnen 80% blijft en het genoeg driehoeken scheelt (`minCut` per soort). Modellen met meerdere
  materialen worden per groep vereenvoudigd. Een mesh met een textuur wordt niet vereenvoudigd (de UV's gaan verloren); de audit meldt hem.
- **Overgangen**: de dither van `lod3d.js` (Bayer 4x4, aanvullend: elke pixel komt van precies één niveau), in de band rond elke grens.
  Bij instancing staat een exemplaar in de band in beide niveaus; de shader kiest per pixel op afstand tot de camera. De CPU deelt in met
  12 m marge (afstand tot de speler tegen afstand tot de camera), dus er flikkert niets op een grens (`lodLevelsForFade`).
- **Stand**: de grenzen schalen mee (Laag 0,6, Midden 0,8, Hoog 0,9, Ultra 1; `setLodPreset` vanuit `scene3d.js`).

## 3. API voor de andere agents

```js
import { makeLodInstanced, makeLodObject, lodForSkinned, makeLodGeometries } from './lodkit3d.js';
// instanced (interieurprops, kuddes): per niveau een InstancedMesh; elke rebuild: begin(), put(matrix, afstandTotSpeler), end()
const set = makeLodInstanced('interior', 'stoel', geometrie, materiaal, cap, { setup: (mesh, L) => scene.add(mesh) });
// los model (een voertuig met gedeelde materialen): lichtere niveaus naast elke mesh; scene3d.js wisselt ze elke frame
makeLodObject('vehicle', 'bestelbus', group);
// gerigd model (persoon, dier): LOD1+ zijn vaste meshes in de rustpose
lodForSkinned('person', 'wandelaar', skinnedMesh);
```

Een model met eigen materialen per exemplaar kan ook `DitherLOD` (`lod3d.js`) met de opgave uit het propregister gebruiken: dezelfde regels.
Elk model dat via `lodkit3d.js` gebouwd wordt, staat in het register; zet de bouw ook in `scripts/lod_audit_test.mjs` (blok "bouwen"),
dan faalt de test als het geen LOD's heeft of als LOD1/LOD2 te weinig scheelt.

## 4. Open

- **Gebouwen: dither-overgang detail naar verre laag.** De detailgebouwen zitten samengevoegd in batches zonder middelpunt per gebouw, en
  de verre laag klapt een gebouw in de vertexshader in op afstand van het middelpunt tot de speler. Een overgang zonder gat vraagt per
  vertex het middelpunt van het gebouw in beide lagen (een attribuut in de batches) en dezelfde afstand (speler, niet camera). Niet gebouwd.
- Impostors/billboards voor heel ver: niet gebouwd; de bomen hebben een grove kroon, de rest verdwijnt op de weg-afstand.
- Meting in beeld: zie het commitbericht en het rapport; de driehoeken in de drukke routes vallen binnen de ruis van de machine.
