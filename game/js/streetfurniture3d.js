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
import { furnitureForTile, furnitureColliders, spotFreeOnMap, LAMP_AWNING, DESTINATIONS } from './streetfurniture.js';
import { worldSignPlaces, worldTownSigns } from './worldplaces.js';
import { boardQuads } from './boardquad.js';
import { mergeGeometries, tint } from './geomerge.js';
import { makeProp, addProp, removeProp, isPropBroken, addStaticCollider, addPropStreamer } from './breakables.js';
import { TILE_M, GRID_X0, GRID_Y0, tileIndexOf } from './gdt.js';
import { markInstancesDirty } from './util.js';

// the game draws its own lamps and path bollards (see above)
export const GAME_OPTS = { lamps: false, bollards: false, livingBumps: false };
// draw distance per kind (m)
const LOD = { guardrail: 220, fence: 160, hedge: 160, noise: 420, hectometer: 120, gantry: 650, placesign: 260, wegwijzer: 200, speedbump: 120, bench: 110, bin: 90, bikerack: 100, shelter: 140, bollard: 90, lamp: 200 };
const CAP = { guardrail: 2600, fence: 600, hedge: 600, noise: 400, hectometer: 120, gantry: 24, placesign: 60, wegwijzer: 60, speedbump: 60, bench: 120, bin: 120, bikerack: 120, shelter: 40, bollard: 200, lamp: 400 };
const TILE_REACH = 900;     // tiles whose square comes this near are generated
const PROP_REACH = 70;      // colliders near the player
const REBUILD_MOVE = 12;
// the items that stand on one spot, and so can stand on the asphalt or in a
// facade: checked against the map's own query before they are drawn (#463)
const POINT_KINDS = new Set(['bench', 'bin', 'bikerack', 'shelter', 'bollard', 'lamp', 'placesign', 'wegwijzer', 'hectometer']);

let scene = null;
let map = null;
const tiles = new Map();    // key -> { items }
const meshes = new Map();   // kind -> InstancedMesh
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
function fenceGeo() {
  return mergeGeometries([
    tint(new THREE.BoxGeometry(1, 1.4, 0.03).translate(0, 0.75, 0), 0x4f5a52),
    tint(new THREE.BoxGeometry(0.06, 1.6, 0.06).translate(-0.48, 0.8, 0), 0x3d4640),
  ]);
}
function hedgeGeo() {
  return mergeGeometries([tint(new THREE.BoxGeometry(1, 1, 0.9).translate(0, 0.5, 0), 0x3f6a30), tint(new THREE.BoxGeometry(1, 0.2, 0.7).translate(0, 1.05, 0), 0x4a7838)]);
}
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
function benchGeo() {
  return mergeGeometries([
    tint(new THREE.BoxGeometry(1.6, 0.06, 0.42).translate(0, 0.45, 0), 0x7a5a3a),
    tint(new THREE.BoxGeometry(1.6, 0.36, 0.05).translate(0, 0.7, -0.2), 0x7a5a3a),
    tint(new THREE.BoxGeometry(0.06, 0.45, 0.4).translate(-0.7, 0.22, 0), 0x3a3d40),
    tint(new THREE.BoxGeometry(0.06, 0.45, 0.4).translate(0.7, 0.22, 0), 0x3a3d40),
  ]);
}
function binGeo() { return mergeGeometries([tint(new THREE.CylinderGeometry(0.25, 0.22, 0.85, 8).translate(0, 0.425, 0), 0x2d4a3a)]); }
function rackGeo() {
  const parts = [];
  for (let i = -2; i <= 2; i++) parts.push(tint(new THREE.TorusGeometry(0.35, 0.025, 4, 10, Math.PI).translate(0, 0.05, 0).rotateY(Math.PI / 2).translate(i * 0.5, 0, 0), 0x9a9ea2));
  return mergeGeometries(parts);
}
function shelterGeo() {
  return mergeGeometries([
    tint(new THREE.BoxGeometry(3.2, 0.1, 1.5).translate(0, 2.45, 0), 0x2b3a4a),
    tint(new THREE.BoxGeometry(3.2, 2.2, 0.04).translate(0, 1.2, -0.7), 0xa9c3cc),
    tint(new THREE.BoxGeometry(0.06, 2.4, 0.06).translate(-1.55, 1.2, -0.7), 0x2b3a4a),
    tint(new THREE.BoxGeometry(0.06, 2.4, 0.06).translate(1.55, 1.2, -0.7), 0x2b3a4a),
  ]);
}
// the post of a place name board or signpost (the board is drawn apart, see rebuildBoards)
function postGeo() { return mergeGeometries([tint(new THREE.BoxGeometry(0.08, 2.2, 0.08).translate(0, 1.1, 0), 0x8a9196)]); }
function bollardGeo() { return mergeGeometries([tint(new THREE.CylinderGeometry(0.08, 0.1, 0.9, 6).translate(0, 0.45, 0), 0x8c2a2a)]); }

const GEOS = { guardrail: guardrailGeo, fence: fenceGeo, hedge: hedgeGeo, noise: noiseGeo, hectometer: hectometerGeo, speedbump: speedbumpGeo, gantry: gantryGeo, beam: beamGeo, bench: benchGeo, bin: binGeo, bikerack: rackGeo, shelter: shelterGeo, bollard: bollardGeo, placesign: postGeo, wegwijzer: postGeo };
const MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.15 });

function meshOf(kind) {
  let m = meshes.get(kind);
  if (m) return m;
  const cap = kind === 'beam' ? CAP.gantry : CAP[kind] || 100;
  m = new THREE.InstancedMesh(GEOS[kind](), MAT, cap);
  m.count = 0;
  m.castShadow = kind !== 'speedbump' && kind !== 'hectometer';
  m.receiveShadow = true;
  m.frustumCulled = false;
  m.name = 'furniture:' + kind;
  m.userData.cap = cap;
  scene.add(m);
  meshes.set(kind, m);
  return m;
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
    signMat = new THREE.MeshBasicMaterial({ map: atlasTex, side: THREE.DoubleSide });
  }
  const ctx = atlas.getContext('2d');
  ctx.clearRect(0, 0, atlas.width, atlas.height);
  const pos = [], uv = [];
  let slot = 0;
  for (const g of gantries) {
    const ca = Math.cos(g.a), sa = Math.sin(g.a);
    // across the carriageway (to the right of travel, y south): (-sa, ca)
    const rx = -sa, ry = ca;
    const z = (g.z || 0) + g.h + 0.6;
    for (let p = 0; p < 2 && slot < ATLAS_COLS * ATLAS_ROWS; p++, slot++) {
      const col = slot % ATLAS_COLS, row = Math.floor(slot / ATLAS_COLS);
      drawSign(ctx, col, row, g.text[p] || '', p === 1);
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
  const n = it.text.length, h = (BOARD_H - 10) / n;
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
  const key = boards.map((g) => g.key).join('|');
  if (key === boardKey) return;
  boardKey = key;
  if (typeof document === 'undefined') return;
  if (!boardAtlas) {
    boardAtlas = document.createElement('canvas');
    boardAtlas.width = BOARD_W * BOARD_COLS; boardAtlas.height = BOARD_H * BOARD_ROWS;
    boardTex = new THREE.CanvasTexture(boardAtlas);
    boardTex.colorSpace = THREE.SRGBColorSpace;
    boardMat = new THREE.MeshBasicMaterial({ map: boardTex, side: THREE.FrontSide });
  }
  const ctx = boardAtlas.getContext('2d');
  ctx.clearRect(0, 0, boardAtlas.width, boardAtlas.height);
  const pos = [], uv = [];
  // the last cell of the atlas is the plain back of every board (boardquad.js), so the text is not seen mirrored from behind
  const BACK_CELL = BOARD_COLS * BOARD_ROWS - 1;
  ctx.fillStyle = '#7d848a';
  ctx.fillRect((BACK_CELL % BOARD_COLS) * BOARD_W, Math.floor(BACK_CELL / BOARD_COLS) * BOARD_H, BOARD_W, BOARD_H);
  boards.slice(0, BACK_CELL).forEach((b, slot) => {
    const col = slot % BOARD_COLS, row = Math.floor(slot / BOARD_COLS);
    drawBoard(ctx, col, row, b);
    const w = b.k === 'wegwijzer' ? 1.8 : 1.5, hh = b.k === 'wegwijzer' ? 0.3 * b.text.length + 0.15 : 0.5;
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

function tileItems(i, j) {
  const key = `${i},${j}`;
  let t = tiles.get(key);
  if (t) return t.items;
  const x0 = GRID_X0 + i * TILE_M, y0 = GRID_Y0 + j * TILE_M;
  const roads = map.roadsNear(x0 + TILE_M / 2, y0 + TILE_M / 2, TILE_M * 0.71 + 220);
  const mapped = (map.furniture || []).filter((m) => {
    const p = m.pts ? m.pts : [[m.x, m.y]];
    return p.some((q) => q[0] >= x0 - 50 && q[0] < x0 + TILE_M + 50 && q[1] >= y0 - 50 && q[1] < y0 + TILE_M + 50);
  });
  // (the tiles' flat water too: a fence is not drawn across it)
  const wx = x0 + TILE_M / 2, wy = y0 + TILE_M / 2, wr = TILE_M * 0.71 + 60;
  const water = map.waterNear(wx, wy, wr).concat(map.flatWaterNear ? map.flatWaterNear(wx, wy, wr) : []);
  // the track and the houses of the tiles round it: a mapped fence is not drawn through them (#124)
  const rails = (map.railNear ? map.railNear(wx, wy, wr) : []).concat(map.rails || []);
  const buildings = map.buildingsNear ? map.buildingsNear(wx, wy, wr) : [];
  const res = furnitureForTile({ x0, y0, size: TILE_M, roads, mapped, water, rails, buildings, places: worldSignPlaces() || DESTINATIONS, opts: { ...GAME_OPTS, towns: worldTownSigns() } });
  // nothing that stands on one spot goes on the asphalt, into a house or into
  // the water: the map answers for what is drawn (#463)
  const items = res.items.filter((it) => !POINT_KINDS.has(it.k) || spotFreeOnMap(map, it.x, it.y, it.k === 'lamp' ? { house: LAMP_AWNING } : undefined));
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
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
function put(kind, x, z, y, angle, sx = 1, sy = 1, sz = 1) {
  const m = meshOf(kind);
  if (m.count >= m.userData.cap) return;
  _q.setFromAxisAngle(_up, -angle);
  _p.set(x, z, y);
  _s.set(sx, sy, sz);
  _m.compose(_p, _q, _s);
  m.setMatrixAt(m.count++, _m);
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
    if ((it.k === 'guardrail' || it.k === 'fence') && isPropBroken(it.key)) continue;
    const z = ground(it);
    switch (it.k) {
      case 'guardrail': put('guardrail', it.x, z, it.y, it.a, it.s, 1, 1); break;
      case 'fence': put('fence', it.x, z, it.y, it.a, it.s, 1, 1); break;
      case 'noise': put('noise', it.x, z, it.y, it.a, it.s, it.h || 4, 1); break;
      case 'hedge': put('hedge', it.x, z, it.y, it.a, it.s, (it.h || 1.4) / 1.15, 1); break;
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
  for (const m of meshes.values()) { m.instanceMatrix.needsUpdate = true; markInstancesDirty(m.instanceMatrix, m.count); }
  rebuildBoards(boards.sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py)).slice(0, BOARD_COLS * BOARD_ROWS));
  rebuildSigns(gantries.sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py)).slice(0, 16));
}

// colliders near the player (breakables.js streams every 0.25 s)
function streamFurnitureProps(world, px, py) {
  if (!map) return;
  const want = new Set();
  const [i0, j0] = tileIndexOf(px - PROP_REACH, py - PROP_REACH), [i1, j1] = tileIndexOf(px + PROP_REACH, py + PROP_REACH);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
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

// the tumbling copy of a knocked-out section
function furniturePiece(c) {
  const geo = c.kind === 'hek' ? GEOS.fence() : GEOS.guardrail();
  const m = new THREE.Mesh(geo, MAT);
  m.scale.set((c.half || 0.5) * 2, 1, 1);
  m.rotation.y = -(c.angle || 0);
  const g = new THREE.Group();
  g.add(m);
  return g;
}

export function furnitureStats() {
  let n = 0;
  for (const m of meshes.values()) n += m.count;
  return { tiles: tiles.size, drawn: n, kinds: meshes.size, props: liveProps.size };
}
