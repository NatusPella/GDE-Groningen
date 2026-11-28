// Street furniture in the game (docs/PROVINCIE-PLAN.md 2.14): the items of
// streetfurniture.js furnitureForTile, generated per 1 km tile round the
// player (cached), drawn with one InstancedMesh per kind and a level of
// detail per kind, and their colliders streamed in as breakables.js props
// near the player (a guardrail section or a fence panel knocked out stays
// out until it respawns).
//
// In the game the city keeps its own lamps (nightlights3d.js), benches,
// bins, racks and path bollards (cityprops.js, streetclutter.js); this layer
// adds what had no place yet: guardrails along motorways, trunk roads and
// their slip roads at street level, gantries before the exits, hectometre
// posts, mapped fences, noise barriers and speed tables.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { plainBack } from './canvastex.js';
import { furnitureForTile, furnitureColliders, spotFreeOnMap, LAMP_AWNING, DESTINATIONS } from './streetfurniture.js';
import { worldSignPlaces, worldTownSigns } from './worldplaces.js';
import { boardQuads, bordTekst, paneelTekst, bordHeeftTekst } from './boardquad.js';
import { mergeGeometries, tint } from './geomerge.js';
import { makeProp, addProp, removeProp, isPropBroken, addStaticCollider, addPropStreamer } from './breakables.js';
import { TILE_M, GRID_X0, GRID_Y0, tileIndexOf } from './gdt.js';
import { markInstancesDirty } from './util.js';
import { gridItems } from './spatialgrid.js';
import { createCalmGate } from './tilestream.js';
import { dropStaleTiles } from './tilecache.js';
import { makeLodInstanced } from './lodkit3d.js';
const tilesCalmGate = createCalmGate(); // wacht ook op de achtergrondwachtrij van de tegelwereld, hoogstens twee seconden achter elkaar (#1052)
import { EDGE_CLASSES, edgeColour, edgeHeight } from './edgeclasses.js';
import { applyInteriorCut } from './interiorcut3d.js';
import { propGeometry } from './propmodels3d.js'; // de gedeelde props (propregister.js)
import { detailForTile } from './streetdetail.js'; // de detaillaag voor wijken en dorpen (#1353)

// the game draws its own lamps and path bollards (see above)
export const GAME_OPTS = { lamps: false, bollards: false, livingBumps: false };
// draw distance per kind (m)
// straatdetail (#1353): tekenafstand en maximum per soort; de rest van de regel is die van het meubilair
const DETAIL_LOD = { klikogrijs: 75, klikogroen: 75, klikoblauw: 75, fietszwart: 80, fietsrood: 80, fietsblauw: 80, lattenhek: 100, schutting: 110, tuinpad: 80, boomspiegel: 70, plantenbak: 80, kabelkast: 110, afvalzuil: 120, bord30: 130, voorrangsbord: 130, bermpaal: 140, rietpol: 110, hooibaal: 130 };
const DETAIL_CAP = { klikogrijs: 300, klikogroen: 200, klikoblauw: 150, fietszwart: 160, fietsrood: 160, fietsblauw: 160, lattenhek: 400, schutting: 200, tuinpad: 600, boomspiegel: 300, plantenbak: 160, kabelkast: 60, afvalzuil: 40, bord30: 40, voorrangsbord: 40, bermpaal: 160, rietpol: 400, hooibaal: 80 };
// de detaillaag laat zich uitzetten (vergelijkingsbeelden en metingen: window.__noStreetDetail = true voor de bouw van het spel)
const DETAIL_ON = () => !(typeof window !== 'undefined' && window.__noStreetDetail);
const LOD = { ...DETAIL_LOD, guardrail: 220, fence: 160, hedge: 160, noise: 420, hectometer: 120, gantry: 650, placesign: 260, wegwijzer: 200, speedbump: 120, bench: 110, bin: 90, bikerack: 100, shelter: 140, bollard: 90, lamp: 200 };
const CAP = { ...DETAIL_CAP, guardrail: 2600, fence: 600, hedge: 1200, noise: 400, hectometer: 120, gantry: 24, placesign: 60, wegwijzer: 60, speedbump: 60, bench: 120, bin: 120, bikerack: 120, shelter: 40, bollard: 200, lamp: 400 };
const TILE_REACH = 900;     // tiles whose square comes this near are generated
const PROP_REACH = 70;      // colliders near the player
const REBUILD_MOVE = 12;
// the items that stand on one spot, and so can stand on the asphalt or in a
// facade: checked against the map's own query before they are drawn (#463)
const POINT_KINDS = new Set(['bench', 'bin', 'bikerack', 'shelter', 'bollard', 'lamp', 'placesign', 'wegwijzer', 'hectometer']);

let scene = null;
let map = null;
const tiles = new Map();    // key -> { items }
let tilesGeoVer = null;     // de kaartstand waar de tegelcache bij hoort (#314 C2)
const meshes = new Map();   // naam -> InstancedMesh (alle niveaus van alle soorten)
let signMesh = null, signKey = '';
let boardMesh = null, boardKey = '';
let lastX = Infinity, lastY = Infinity, dirty = true;
const liveProps = new Map(); // item key -> prop

// --- geometry per kind (one draw each; vertex colours) -----------------------

function guardrailGeo() {
  // a 1 m section along +x: the W-beam on posts (scaled along x to the piece)
  return mergeGeometries([
    tint(new THREE.BoxGeometry(1, 0.32, 0.06).translate(0, 0.6, 0), 0xc9cdd0),
    tint(new THREE.BoxGeometry(0.08, 0.75, 0.1).translate(0, 0.375, 0.06), 0x8d9296),
  ]);
}
// hek en heg: maten en kleuren uit de ene tabel van edgeclasses.js (de collision komt uit dezelfde regel)
function fenceGeo() {
  const v = EDGE_CLASSES.fence.visual;
  return mergeGeometries([
    tint(new THREE.BoxGeometry(1, v.panelH, v.thick).translate(0, v.panelY, 0), edgeColour('fence', 'panel')),
    tint(new THREE.BoxGeometry(v.postW, v.postH, v.postW).translate(-0.48, v.postH / 2, 0), edgeColour('fence', 'post')),
  ]);
}
function hedgeGeo() {
  const v = EDGE_CLASSES.hedge.visual;
  return mergeGeometries([
    tint(new THREE.BoxGeometry(1, v.bodyH, v.depth).translate(0, v.bodyH / 2, 0), edgeColour('hedge', 'body')),
    tint(new THREE.BoxGeometry(1, v.capH, v.capDepth).translate(0, v.bodyH + v.capH / 2 - 0.05, 0), edgeColour('hedge', 'cap')),
  ]);
}
// de top van het hegmodel bij schaal 1 (bodyH + capH - 0,05: de kap overlapt de bak 0,05 m): de y-schaal maakt er de heghoogte van
const HEDGE_TOP = EDGE_CLASSES.hedge.visual.bodyH + EDGE_CLASSES.hedge.visual.capH - 0.05;
function noiseGeo() {
  return mergeGeometries([tint(new THREE.BoxGeometry(1, 1, 0.18).translate(0, 0.5, 0), 0x6f7d6a)]);
}
function hectometerGeo() {
  return mergeGeometries([
    tint(new THREE.BoxGeometry(0.1, 1.0, 0.1).translate(0, 0.5, 0), 0x2f6b3c),
    tint(new THREE.BoxGeometry(0.02, 0.22, 0.26).translate(-0.06, 0.82, 0), 0xf2f2ec),
  ]);
}
function speedbumpGeo() {
  // a speed table across a road of 1 m (scaled along z to the road): ramps and top
  return mergeGeometries([
    tint(new THREE.BoxGeometry(2.4, 0.08, 1).translate(0, 0.04, 0), 0x8f4a3a),
    tint(new THREE.BoxGeometry(0.5, 0.05, 1).translate(-1.45, 0.025, 0), 0xd8d2c4),
    tint(new THREE.BoxGeometry(0.5, 0.05, 1).translate(1.45, 0.025, 0), 0xd8d2c4),
  ]);
}
function gantryGeo() {
  // a portal over a carriageway of 1 m (the beam is scaled along z; the posts
  // stand at +-0.5 of the span: drawn per gantry from two instances, see below)
  return mergeGeometries([
    tint(new THREE.BoxGeometry(0.5, 1, 0.5).translate(0, 0.5, 0), 0x9aa1a6),
  ]);
}
function beamGeo() {
  return mergeGeometries([
    tint(new THREE.BoxGeometry(0.6, 0.5, 1).translate(0, 0, 0), 0x9aa1a6),
    tint(new THREE.BoxGeometry(0.3, 0.3, 1).translate(0, -0.45, 0), 0x8a9196),
  ]);
}
// bank, afvalbak, fietsenrek, bushokje en paaltje komen uit het ene register van propmodels3d.js (propregister.js): dezelfde
// geometrie als in de stad en in de cutscenes. Hier een eigen kopie gedraaid naar de conventie van dit bestand (voorkant +z,
// breedte langs x); een kopie omdat een omvallend stuk (breakables.js) zijn eigen geometrie krijgt.
function rotProp(id, hoek) { const g = propGeometry(id).clone(); g.userData = {}; return hoek ? g.rotateY(hoek) : g; }
function benchGeo() { return rotProp('bank', -Math.PI / 2); }
function binGeo() { return rotProp('afvalbak', -Math.PI / 2); }
function rackGeo() { return rotProp('fietsenrek', -Math.PI / 2); }
function shelterGeo() { return rotProp('bushokje', 0); }
// the post of a place name board or signpost (the board is drawn apart, see rebuildBoards)
function postGeo() { return mergeGeometries([tint(new THREE.BoxGeometry(0.08, 2.2, 0.08).translate(0, 1.1, 0), 0x8a9196)]); }
function bollardGeo() { return rotProp('paaltje', 0); }
// de stukken van de detaillaag: voorkant +x; hekstukken en tuinpad (gebouwd met de lengte langs z) lopen langs x
const detailGeo = (id, hoek = 0) => () => rotProp(id, hoek);
const DETAIL_GEOS = {};
for (const id of ['klikogrijs', 'klikogroen', 'klikoblauw', 'fietszwart', 'fietsrood', 'fietsblauw', 'plantenbak', 'boomspiegel', 'kabelkast', 'afvalzuil', 'bord30', 'voorrangsbord', 'bermpaal', 'rietpol', 'hooibaal']) DETAIL_GEOS[id] = detailGeo(id);
for (const id of ['lattenhek', 'schutting', 'tuinpad']) DETAIL_GEOS[id] = detailGeo(id, Math.PI / 2);

const GEOS = { ...DETAIL_GEOS, guardrail: guardrailGeo, fence: fenceGeo, hedge: hedgeGeo, noise: noiseGeo, hectometer: hectometerGeo, speedbump: speedbumpGeo, gantry: gantryGeo, beam: beamGeo, bench: benchGeo, bin: binGeo, bikerack: rackGeo, shelter: shelterGeo, bollard: bollardGeo, placesign: postGeo, wegwijzer: postGeo };
// het centrale LOD-systeem (lodkit3d.js): de modellen van het straatmeubilair, ook voor de audit (scripts/lod_audit_test.mjs)
export const furnitureModels = () => Object.keys(GEOS).map((k) => [k, GEOS[k](), furnitureLodKind(k)]);
// de LOD-soort: klein meubilair verdwijnt op 150 m, wat je van ver ziet (een portaal op 650 m, een geluidsscherm) houdt zijn eigen tekenafstand
export const furnitureLodKind = (k) => ((LOD[k === 'beam' ? 'gantry' : k] || 0) > 150 ? 'propfar' : 'prop');
// kinds whose instance is hidden once the collider is knocked out (breakables.js owns the tumbling copy)
const BREAKABLE_DRAWN = new Set(['guardrail', 'fence', 'bench', 'bin', 'bikerack', 'placesign', 'wegwijzer']);
const MAT = applyInteriorCut(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.15 })); // geen meubilair in een binnenruimte (interiorisolation.js)

// 23-11 (centraal LOD-systeem, lodkit3d.js): per soort een set InstancedMeshes, één per niveau, met een dither-crossfade ertussen en
// niets meer voorbij de cull-afstand van de soort 'prop' (lodregistry.js); de eigen tekenafstand per soort (LOD) blijft daarbinnen gelden
const sets = new Map();     // kind -> makeLodInstanced-set
function setOf(kind) {
  let set = sets.get(kind);
  if (set) return set;
  const cap = kind === 'beam' ? CAP.gantry : CAP[kind] || 100;
  set = makeLodInstanced(furnitureLodKind(kind), 'furniture:' + kind, GEOS[kind](), MAT, cap, {
    setup: (m) => {
      m.castShadow = kind !== 'speedbump' && kind !== 'hectometer' && !(kind in DETAIL_LOD && kind !== 'kabelkast' && kind !== 'afvalzuil');
      m.receiveShadow = true;
      scene.add(m);
      meshes.set(m.name, m);
    },
  });
  sets.set(kind, set);
  return set;
}

// --- signs: every visible gantry's two panels in one mesh over a canvas atlas

const SIGN_W = 256, SIGN_H = 64, ATLAS_COLS = 4, ATLAS_ROWS = 16;
let atlas = null, atlasTex = null, signMat = null;
function drawSign(ctx, col, row, text, exit) {
  const x = col * SIGN_W, y = row * SIGN_H;
  ctx.fillStyle = '#1f4fa0';
  ctx.fillRect(x, y, SIGN_W, SIGN_H);
  ctx.strokeStyle = '#f4f4f0';
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 3, y + 3, SIGN_W - 6, SIGN_H - 6);
  ctx.fillStyle = '#f4f4f0';
  ctx.font = 'bold 26px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(exit ? '↘ ' + text : '↑ ' + text, x + 14, y + SIGN_H / 2 + 1, SIGN_W - 26);
}

function rebuildSigns(gantries) {
  const key = gantries.map((g) => g.key).join('|');
  if (key === signKey) return;
  signKey = key;
  if (typeof document === 'undefined') return;
  if (!atlas) {
    atlas = document.createElement('canvas');
    atlas.width = SIGN_W * ATLAS_COLS; atlas.height = SIGN_H * ATLAS_ROWS;
    atlasTex = new THREE.CanvasTexture(atlas);
    atlasTex.colorSpace = THREE.SRGBColorSpace;
    signMat = plainBack(applyInteriorCut(new THREE.MeshBasicMaterial({ map: atlasTex }))); // hertest 24-11: de achterkant is een effen bordrug, geen spiegelschrift (canvastex.js plainBack)
  }
  const ctx = atlas.getContext('2d');
  ctx.clearRect(0, 0, atlas.width, atlas.height);
  // de atlas is ondoorzichtig: een vakje dat niet getekend is zou zwart in de wereld staan (#436)
  ctx.fillStyle = '#1f4fa0';
  ctx.fillRect(0, 0, atlas.width, atlas.height);
  const pos = [], uv = [];
  let slot = 0;
  for (const g of gantries) {
    if (!bordHeeftTekst(g)) continue; // een portaal zonder tekst is geen portaal
    const ca = Math.cos(g.a), sa = Math.sin(g.a);
    // across the carriageway (to the right of travel, y south): (-sa, ca)
    const rx = -sa, ry = ca;
    const z = (g.z || 0) + g.h + 0.6;
    for (let p = 0; p < 2 && slot < ATLAS_COLS * ATLAS_ROWS; p++) {
      const tekst = paneelTekst(g.text, p);
      if (!tekst) continue; // een leeg paneel komt niet in de wereld (geen blauw vlak zonder naam)
      const col = slot % ATLAS_COLS, row = Math.floor(slot / ATLAS_COLS);
      slot++;
      drawSign(ctx, col, row, tekst, p === 1);
      // panel p: left (way on) and right (the exit) of the carriageway's middle, facing the traffic
      const w = Math.min(4.2, g.s / 2 - 0.3), off = (p === 0 ? -1 : 1) * (w / 2 + 0.15);
      const cx = g.x + rx * off - ca * 0.35, cy = g.y + ry * off - sa * 0.35;
      const corners = [[-w / 2, -0.55], [w / 2, -0.55], [w / 2, 0.55], [-w / 2, 0.55]].map(([u, v]) => [cx + rx * u, z + v, cy + ry * u]);
      const u0 = col / ATLAS_COLS, u1 = (col + 1) / ATLAS_COLS, v0 = 1 - (row + 1) / ATLAS_ROWS, v1 = 1 - row / ATLAS_ROWS;
      const quad = [[0, u0, v0], [1, u1, v0], [2, u1, v1], [0, u0, v0], [2, u1, v1], [3, u0, v1]];
      for (const [i, u, v] of quad) { pos.push(...corners[i]); uv.push(u, v); }
    }
  }
  atlasTex.needsUpdate = true;
  if (signMesh) { scene.remove(signMesh); signMesh.geometry.dispose(); signMesh = null; }
  if (!pos.length) return;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeBoundingSphere();
  signMesh = new THREE.Mesh(geo, signMat);
  signMesh.name = 'furniture:signs';
  scene.add(signMesh);
}

// --- place name boards and signposts: one mesh over a canvas atlas

const BOARD_W = 256, BOARD_H = 96, BOARD_COLS = 4, BOARD_ROWS = 16;
let boardAtlas = null, boardTex = null, boardMat = null;
function drawBoard(ctx, col, row, it) {
  const x = col * BOARD_W, y = row * BOARD_H, sign = it.k === 'wegwijzer';
  // a place name board is white with black letters, a signpost is blue
  ctx.fillStyle = sign ? '#1f4fa0' : '#f4f4f0';
  ctx.fillRect(x, y, BOARD_W, BOARD_H);
  ctx.strokeStyle = sign ? '#f4f4f0' : '#202428';
  ctx.lineWidth = 4;
  ctx.strokeRect(x + 3, y + 3, BOARD_W - 6, BOARD_H - 6);
  ctx.fillStyle = sign ? '#f4f4f0' : '#202428';
  ctx.textBaseline = 'middle';
  const n = Math.max(1, it.text.length), h = (BOARD_H - 10) / n;
  ctx.font = `bold ${Math.min(34, Math.floor(h * 0.7))}px sans-serif`;
  // a place name stands in the middle; signpost lines run from the left
  if (!sign) ctx.textAlign = 'center';
  it.text.forEach((t, i) => ctx.fillText(t, sign ? x + 14 : x + BOARD_W / 2, y + 5 + h * (i + 0.5) + 1, BOARD_W - 26));
  ctx.textAlign = 'left';
  if (it.end) { // "einde bebouwde kom": a red diagonal across the name
    ctx.strokeStyle = '#c4282d';
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(x + 14, y + BOARD_H - 12); ctx.lineTo(x + BOARD_W - 14, y + 12); ctx.stroke();
  }
}

function rebuildBoards(boards) {
  // een bord zonder tekst is geen bord (#436): het levert geen vlak op, want dan stond er een leeg
  // (en met een ondoorzichtige atlas zwart) bord in de wereld
  const bruikbaar = boards.filter(bordHeeftTekst).slice(0, BOARD_COLS * BOARD_ROWS - 1);
  const key = bruikbaar.map((g) => g.key).join('|');
  if (key === boardKey) return;
  boardKey = key;
  if (typeof document === 'undefined') return;
  if (!boardAtlas) {
    boardAtlas = document.createElement('canvas');
    boardAtlas.width = BOARD_W * BOARD_COLS; boardAtlas.height = BOARD_H * BOARD_ROWS;
    boardTex = new THREE.CanvasTexture(boardAtlas);
    boardTex.colorSpace = THREE.SRGBColorSpace;
    boardMat = applyInteriorCut(new THREE.MeshBasicMaterial({ map: boardTex, side: THREE.FrontSide }));
  }
  const ctx = boardAtlas.getContext('2d');
  ctx.clearRect(0, 0, boardAtlas.width, boardAtlas.height);
  // de atlas is ondoorzichtig: een vakje dat niet getekend is zou zwart in de wereld staan
  ctx.fillStyle = '#f4f4f0';
  ctx.fillRect(0, 0, boardAtlas.width, boardAtlas.height);
  const pos = [], uv = [];
  // the last cell of the atlas is the plain back of every board (boardquad.js), so the text is not seen mirrored from behind
  const BACK_CELL = BOARD_COLS * BOARD_ROWS - 1;
  ctx.fillStyle = '#7d848a';
  ctx.fillRect((BACK_CELL % BOARD_COLS) * BOARD_W, Math.floor(BACK_CELL / BOARD_COLS) * BOARD_H, BOARD_W, BOARD_H);
  bruikbaar.forEach((b, slot) => {
    const col = slot % BOARD_COLS, row = Math.floor(slot / BOARD_COLS);
    const tekst = bordTekst(b.text);
    drawBoard(ctx, col, row, { ...b, text: tekst });
    const w = b.k === 'wegwijzer' ? 1.8 : 1.5, hh = b.k === 'wegwijzer' ? 0.3 * tekst.length + 0.15 : 0.5;
    const q = boardQuads(b, slot, BACK_CELL, BOARD_COLS, BOARD_ROWS, w, hh, (b.z || 0) + 2.2 - hh / 2);
    pos.push(...q.pos); uv.push(...q.uv);
  });
  boardTex.needsUpdate = true;
  if (boardMesh) { scene.remove(boardMesh); boardMesh.geometry.dispose(); boardMesh = null; }
  if (!pos.length) return;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeBoundingSphere();
  boardMesh = new THREE.Mesh(geo, boardMat);
  boardMesh.name = 'furniture:boards';
  scene.add(boardMesh);
}

// --- tiles ---------------------------------------------------------------------

// 24-11 (profiel heli: furnitureForTile 4,4% van de hoofdthread): elke nieuwe of weggevallen kaarttegel gooide de HELE meubelcache weg, en
// bij een vlucht of rit is dat om de paar seconden; alle tegels rond de speler werden dan opnieuw uitgerekend. Een meubeltegel hangt alleen af
// van de kaart binnen STALE_REACH_M (wegen tot 220 m van het midden, water en gebouwen tot 60 m, plus de halve tegel): alleen die tegels gaan
// weg (tilecache.js). Zonder log (of als de log niet ver genoeg teruggaat) alles, zoals voorheen.
const STALE_REACH_M = 300;

function tileItems(i, j) {
  // #314 C2: komt er een tegel bij of gaat die weg (map.geoVer), dan is de cache oud.
  // Tijdens een reeks streamende tegels (of de opening, die van plek naar plek springt)
  // wacht de opruiming tot de tegelwachtrij leeg is: de bestaande meubels blijven dan
  // even staan en er valt geen halve seconde per tegel in het spel (#4).
  if (map && map.geoVer !== tilesGeoVer) {
    const tilesCalm = tilesCalmGate(map);
    if (tilesCalm) { dropStaleTiles(tiles, map.geoLog, tilesGeoVer, STALE_REACH_M); tilesGeoVer = map.geoVer; }
  }
  const key = `${i},${j}`;
  let t = tiles.get(key);
  if (t) return t.items;
  const x0 = GRID_X0 + i * TILE_M, y0 = GRID_Y0 + j * TILE_M;
  const roads = map.roadsNear(x0 + TILE_M / 2, y0 + TILE_M / 2, TILE_M * 0.71 + 220);
  // #314 C2b: het gecombineerde straatmeubilair uit het meubelraster (pinned stad
  // plus gestroomde tegels), niet uit de hele array.
  const mapped = (map.furnitureGrid ? map.furnitureGrid.query(x0 - 50, y0 - 50, x0 + TILE_M + 50, y0 + TILE_M + 50) : []).filter((m) => {
    const p = m.pts ? m.pts : [[m.x, m.y]];
    return p.some((q) => q[0] >= x0 - 50 && q[0] < x0 + TILE_M + 50 && q[1] >= y0 - 50 && q[1] < y0 + TILE_M + 50);
  });
  // (the tiles' flat water too: a fence is not drawn across it)
  const wx = x0 + TILE_M / 2, wy = y0 + TILE_M / 2, wr = TILE_M * 0.71 + 60;
  const water = map.waterNear(wx, wy, wr).concat(map.flatWaterNear ? map.flatWaterNear(wx, wy, wr) : []);
  // the track and the houses of the tiles round it: a mapped fence is not drawn through them (#124)
  const rails = map.railNear ? map.railNear(wx, wy, wr) : gridItems(map.railGrid);
  const buildings = map.buildingsNear ? map.buildingsNear(wx, wy, wr) : [];
  // In de openingsfilm geen plaatsnaam-/wegwijzerborden per nieuwe wijk bouwen:
  // die regel (alle plaatsen langs de wegen) is de duurste stap van de tegel en
  // valt in het niet bij wat de film laat zien (#4).
  const intro = typeof document !== 'undefined' && document.body && document.body.classList.contains('intro-montage');
  const res = furnitureForTile({ x0, y0, size: TILE_M, roads, mapped: intro ? [] : mapped, water, rails, buildings, places: worldSignPlaces() || DESTINATIONS, opts: { ...GAME_OPTS, towns: intro ? [] : worldTownSigns() } });
  // nothing that stands on one spot goes on the asphalt, into a house or into
  // the water: the map answers for what is drawn (#463)
  let all = res.items;
  if (DETAIL_ON() && !intro) {
    // de detaillaag: een gemapte heg of hek op dezelfde plek gaat voor (geen dubbele rand)
    const lin = res.items.filter((it) => it.k === 'hedge' || it.k === 'fence');
    const det = detailForTile({ x0, y0, size: TILE_M, roads, buildings, water, rails, trees: map.treesNear ? map.treesNear(wx, wy, wr) : [] }).filter((it) => !(it.k === 'hedge' || it.k === 'fence' || it.k === 'lattenhek') || !lin.some((o) => Math.abs(o.x - it.x) < 3 && Math.abs(o.y - it.y) < 3));
    if (det.length) all = res.items.concat(det);
  }
  const items = all.filter((it) => !POINT_KINDS.has(it.k) || spotFreeOnMap(map, it.x, it.y, it.k === 'lamp' ? { house: LAMP_AWNING } : undefined));
  tiles.set(key, t = { items, colliders: items.length === res.items.length ? res.colliders : furnitureColliders(items) });
  return t.items;
}

// the items within reach of (x, y), from the tiles round it
function itemsNear(x, y, r) {
  const [i0, j0] = tileIndexOf(x - r, y - r), [i1, j1] = tileIndexOf(x + r, y + r);
  const out = [];
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (const it of tileItems(i, j)) if (Math.abs(it.x - x) < r && Math.abs(it.y - y) < r) out.push(it);
  return out;
}

export function initStreetFurniture3D(sceneRef, mapRef) {
  scene = sceneRef;
  map = mapRef;
  tiles.clear();
  dirty = true;
  addPropStreamer(streamFurnitureProps);
  // perf-r3 (24-11): alle soorten nu al, achter het laadscherm: hun LOD-ketens (lodsimplify.js) en shaders kostten na een
  // camerasprong tot ~130 ms in één beeld (3d:roads:meubilair) bij de eerste keer dat een soort in beeld kwam
  for (const k of Object.keys(GEOS)) setOf(k);
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
function put(kind, x, z, y, angle, sx = 1, sy = 1, sz = 1) {
  _q.setFromAxisAngle(_up, -angle);
  _p.set(x, z, y);
  _s.set(sx, sy, sz);
  _m.compose(_p, _q, _s);
  setOf(kind).put(_m, Math.hypot(x - lastX, y - lastY));
}

export function updateStreetFurniture3D(px, py, force = false) {
  if (!scene || !map) return;
  if (!force && !dirty && Math.hypot(px - lastX, py - lastY) < REBUILD_MOVE) return;
  lastX = px; lastY = py; dirty = false;
  for (const m of meshes.values()) m.count = 0;
  const near = itemsNear(px, py, LOD.gantry);
  const gantries = [], boards = [];
  const ground = (it) => (it.z !== undefined ? it.z : map.groundHeightAt ? map.groundHeightAt(it.x, it.y, 0) : 0);
  for (const it of near) {
    const lod = LOD[it.k];
    if (!lod || Math.abs(it.x - px) > lod || Math.abs(it.y - py) > lod) continue;
    if (BREAKABLE_DRAWN.has(it.k) && isPropBroken(it.key)) continue;
    const z = ground(it);
    switch (it.k) {
      case 'guardrail': put('guardrail', it.x, z, it.y, it.a, it.s, 1, 1); break;
      case 'fence': put('fence', it.x, z, it.y, it.a, it.s, 1, 1); break;
      case 'noise': put('noise', it.x, z, it.y, it.a, it.s, it.h || 4, 1); break;
      case 'lattenhek': put('lattenhek', it.x, z, it.y, it.a, it.s || 1, 1, 1); break;
      case 'hedge': put('hedge', it.x, z, it.y, it.a, it.s, edgeHeight('hedge', it.h) / HEDGE_TOP, 1); break;
      case 'hectometer': put('hectometer', it.x, z, it.y, it.a); break;
      case 'speedbump': put('speedbump', it.x, z, it.y, it.a, 1, 1, it.s || 6); break;
      case 'gantry': {
        const rx = -Math.sin(it.a), ry = Math.cos(it.a);
        for (const s of [1, -1]) put('gantry', it.x + rx * s * it.s / 2, z, it.y + ry * s * it.s / 2, it.a, 1, it.h + 1.1, 1);
        put('beam', it.x, z + it.h + 0.85, it.y, it.a, 1, 1, it.s + 0.5);
        gantries.push(it);
        break;
      }
      case 'placesign': case 'wegwijzer':
        put(it.k, it.x, z, it.y, it.a);
        boards.push({ ...it, z });
        break;
      default: if (GEOS[it.k]) put(it.k, it.x, z, it.y, it.a);
    }
  }
  for (const m of meshes.values()) { m.instanceMatrix.needsUpdate = true; markInstancesDirty(m.instanceMatrix, m.count); m.visible = m.count > 0; }
  rebuildBoards(boards.filter(bordHeeftTekst).sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py)).slice(0, BOARD_COLS * BOARD_ROWS));
  rebuildSigns(gantries.filter(bordHeeftTekst).sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py)).slice(0, 16));
}

// #804: een nieuwe tegel bouwen (furnitureForTile met alle kaartvragen) kost
// tientallen ms; bij een sprong komen er in één streambeurt veel tegels bij
// (br-stream-piek 261 ms). Per beurt hoogstens twee nieuwe tegels; de rest
// volgt de volgende 0,25 s-beurt. Bestaande tegels blijven gewoon stromen.
const PROP_NEW_TILES_PER_CALL = 2;
function streamFurnitureProps(world, px, py) {
  if (!map) return;
  const want = new Set();
  let newTiles = 0;
  const [i0, j0] = tileIndexOf(px - PROP_REACH, py - PROP_REACH), [i1, j1] = tileIndexOf(px + PROP_REACH, py + PROP_REACH);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const wasNew = !tiles.has(`${i},${j}`);
    if (wasNew && newTiles >= PROP_NEW_TILES_PER_CALL) continue;
    if (wasNew) newTiles++;
    tileItems(i, j);
    const t = tiles.get(`${i},${j}`);
    for (const c of t.colliders) {
      if (Math.abs(c.x - px) > PROP_REACH || Math.abs(c.y - py) > PROP_REACH) continue;
      want.add(c.key);
      if (liveProps.has(c.key)) continue;
      let p;
      if (c.static) p = addStaticCollider(c.kind, c.x, c.y, c.r, c.half || 0, c.angle || 0, false, c.top ?? null);
      else {
        p = makeProp(c.kind, c.x, c.y, {
          r: c.r, half: c.half || 0, angle: c.angle || 0, key: c.key,
          onBreak: () => { dirty = true; }, onRestore: () => { dirty = true; },
          makeMesh: () => furniturePiece(c),
        });
        if (!addProp(p)) continue;
      }
      liveProps.set(c.key, p);
    }
  }
  for (const [k, p] of liveProps) if (!want.has(k)) { removeProp(p); liveProps.delete(k); }
}

// the tumbling copy of a knocked-out piece (null: nothing drawn here for that kind)
const PIECE_GEO = { hek: 'fence', vangrail: 'guardrail', bench: 'bench', bin: 'bin', rail: 'bikerack' };
let bordPieceGeo = null;
function furniturePiece(c) {
  let geo;
  if (c.kind === 'bord') {
    // the post with a small board on top (the textured panel itself is drawn by rebuildBoards and goes with the instance)
    geo = bordPieceGeo || (bordPieceGeo = mergeGeometries([tint(new THREE.BoxGeometry(0.08, 2.2, 0.08).translate(0, 1.1, 0), 0x8a9196), tint(new THREE.BoxGeometry(0.9, 0.5, 0.05).translate(0, 1.9, 0), 0xdfe3e6)]));
  } else if (PIECE_GEO[c.kind]) geo = GEOS[PIECE_GEO[c.kind]]();
  else return null;
  const m = new THREE.Mesh(geo, MAT);
  if (c.kind === 'hek' || c.kind === 'vangrail') m.scale.set((c.half || 0.5) * 2, 1, 1);
  if (c.half) m.rotation.y = -(c.angle || 0);
  const g = new THREE.Group();
  g.add(m);
  return g;
}

export function furnitureStats() {
  let n = 0;
  for (const m of meshes.values()) n += m.count;
  return { tiles: tiles.size, drawn: n, kinds: meshes.size, props: liveProps.size };
}
