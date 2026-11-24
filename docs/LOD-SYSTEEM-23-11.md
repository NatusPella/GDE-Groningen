# Centraal LOD-systeem (23-11-2026, besluit eigenaar: alle modellen krijgen LOD's)

> Tak `perf-ultra-23-11`. Eén systeem, gebouwd op de LOD-vorm van de tak `vettruck-23-11`: `game/js/lodlevels.js` (de opgave
> `lod: { grenzen, band, weg }`, `lodChoice`, `lodDither`) en `game/js/lod3d.js` (`DitherLOD`) zijn daarvan letterlijk overgenomen.
> Daarop: `lodsimplify.js` (automatische vereenvoudiging), `lodregistry.js` (modelsoorten, meeschalen met de stand, register en
> audit) en `lodkit3d.js` (three.js: lichtere geometrie, dither-crossfade, instancing). Test: `node scripts/lod_audit_test.mjs [--tabel]`.

## 1. Inventaris (stand 23-11)

| Modelsoort | Voor deze tak | Nu |
|---|---|---|
| Landmarks | mesh-LOD's (tak `landmarks-aaa-23-11`) | ongewijzigd, niet in dit register |
| Gebouwen | detail tot de detailring, daarna de verre laag (`farlod.js`), harde wissel | dither-overgang op het gebouwmiddelpunt in beide lagen (`buildingfade.js`, zie 2) |
| Straatmeubilair | één InstancedMesh per soort, eigen tekenafstand | `makeLodInstanced`: LOD-niveaus per soort, dither-crossfade, `prop` (klein, weg op 150 m) of `propfar` (vangrails, schermen, portalen: eigen tekenafstand tot 700 m) |
| Bomen | hele boom tot de nabije straal, daarna een kroon (80 driehoeken), niets voorbij 260 m | grove kroon voorbij 170 m (20 driehoeken), voorbij 260 m billboards (2 driehoeken, naar de camera, ronde kroon) voor de bossen en parken tot de zichtafstand (hoogstens 700 m, meeschalend met de stand); alle overgangen met dither (`treecrown`) |
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
- **Gebouwen** (`buildingfade.js`): beide lagen krijgen hetzelfde middelpunt per gebouw (verre laag: het bestaande attribuut `lodCenter`;
  detailgebouw: het nieuwe attribuut `lodC`, alleen op de eigen geometrie van het gebouw) en dezelfde uniforms (`uLodPlayer`, `uLodDetailR`,
  `uLodBand` van farlod.js). In de 12 m binnen de ring loopt t van 0 naar 1; het detail houdt bayer < 1 - t, de verre kopie bayer >= 1 - t.
  Een gebouw zonder eigen mesh (`uLodKeep`) houdt zijn volle kopie. Zonder verre laag (Laag, kort) is de band 0: de oude wissel.
  `scripts/buildingfade_test.mjs` controleert voor elke afstand en elke pixel van het patroon dat er minstens één laag staat en waar
  beide bestaan precies één. A/B: `?perfoff=gebouwfade` (en `?perfoff=boombillboard` voor de billboards).
  Na de beeldregressie van 24-11: de band staat alleen open terwijl de speler beweegt (`fadeBandStep`: stilstaand in 0,8 s dicht, dus
  nooit blijvend half detail en half kopie); de 16 Bayer-drempels liggen in het midden van hun zestiende (een interpolatiefout liet
  anders één pixel per 4x4 wegvallen: witte spikkels op elk ver gebouw); een gebouw met een eigen model (`ownBuildingModel`: landmark,
  marktgebouw, kit) houdt in beide lagen de harde wissel (`lodHard`); een gedeeld materiaal dat de overgang later kreeg, volgt die nu
  ook in de samengevoegde en gepoolde kopieën (staticbatch3d `bakeSig`, multidraw3d `copyOf`).
  Bisect-vlaggen voor die commit (75054fe95), los of samen met `+`: `?perfoff=dierlodcamera` (dier-LOD alleen op afstand tot de
  speler, niet tot de camera), `?perfoff=poolkopielive` (de poolkopie houdt de shaderpatch van het moment van kopiëren),
  `?perfoff=bandstil` (de gebouwband blijft ook stilstaand open). Met ultrabench: `--builds=a:<map>,b:<map>|perfoff=bandstil`.
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

- Windmolens en landmarks: geen eigen impostor. De windmolens staan al als één instanced laag tot 5,2 km (farprops.js) en de
  landmarks hebben hun eigen verre laag (landmarklayer3d.js, en de mesh-LOD's op landmarks-aaa-23-11); een billboard voegt daar niets toe.
- Het attribuut `lodC` kost 8 bytes per hoekpunt van elk detailgebouw; niet gemeten hoeveel geheugen dat in de stad is.
- Meting in beeld: zie het commitbericht en het rapport; de driehoeken in de drukke routes vallen binnen de ruis van de machine.
