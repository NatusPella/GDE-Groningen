// The Beppe tribute (issue #832): the last bench of Grunn on the western
// verge, a small direction sign to Kollum, and Beppe's house with its garden
// just over the border in Friesland. A warm, quiet place for a made-up Frisian
// grandmother ("beppe" is the Frisian word for grandmother, a role name; no
// real person or address).
//
// The spot follows the roads and the border, not a hand-placed coordinate:
// worldends.js marks where the western road runs off the province's data, and
// beppe_rules.js walks that same road back to the real provincial border
// (regions.js) and lays the place out there: bench and sign on the Groningen
// side, the house and the garden over the border. The garden bench is a rest
// stop: full health, every vehicle of the player in the world repaired and all
// the shop's weapons, once per visit (the gift text is in beppe_texts.js).
//
// Watcher: the last bench reads its plaque (E, once per player), arriving at
// the place unlocks the hidden achievement "Goed eten" (once), and the garden
// bench shows the remembrance card the first time and a short gift card on
// later visits. Afterwards the pigeons take off when the player walks away.
//
// Samen spelen: the world is the opener's and the place is built from the
// shared road and border data, so everyone who builds it stands there; the
// cards, the achievement and the gift are the local player's own
// (recordUnique/hasUnique/unlockAchievement, own save). A guest does not run
// this world update and gets no conversation with characters (multiplayer.md).
//
// All player-facing text comes from beppe_texts.js. Debug: window.__beppe.

import * as THREE from 'three';
import { hoofdspeler } from './players.js';
import { getScene } from './scene3d.js';
import { canvasTex, signBothSides } from './canvastex.js';
import { showCard } from './hudcards.js';
import { recordUnique, hasUnique, unlockAchievement } from './achievements.js';
import { BEPPE_SIGN, ROAD_SIGN, LAST_BENCH, HOUSE_ARRIVAL, REMEMBRANCE } from './beppe_texts.js';
import {
  TRIBUTE, LAYOUT, pickTributeEnd, nearestOnPath, crossingOnRoad, crossingAhead, layoutTribute,
  housePoint, markerOf, once, tributeTodo, farewellGuide,
} from './beppe_rules.js';
import { ensureWorldEnds, getWorldEndSpots } from './worldends.js';
import { roadNetRows } from './roadgraph.js';
import { inProvinceData } from './provinceworld.js';
import { regionAt } from './regions.js';
import { waterAt } from './waterlevels.js';
import { makeBirds, scatterBirds, updateBirds } from './birds.js';
import { GeoBuilder, vcMaterial, markShared } from './pixelart3d.js';
import { gableRoofX, windowAt, jitterIco } from './countrymodels.js';
import { repairVehicle } from './garages.js';
import { isOwnVehicle } from './ownedvehicles.js';
import { WEAPON_STOCK } from './shops.js';
import { addStaticCollider } from './breakables.js';

const BUILD_R = 340, DROP_R = 520, ANIM_R = 160;
const USE_R = 2.4; // E reach of the two benches
const MAT = markShared(vcMaterial({ roughness: 0.85 }));
const WOOD = 0x7a5a3a, WOOD_DARK = 0x5a4028, IRON = 0x2f3236, STONE = 0x9a968c;

let world = null;
let site = null;
let built = null;
let birds = null;
let colliders = false;
let dovesOff = false;
let retryAt = 0;
let tries = 0;
let warned = false;
const sessionMarks = {};

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function groundAt(map, x, y) {
  try { return map && map.groundHeightAt ? map.groundHeightAt(x, y, 60) : 0; } catch (e) { return 0; }
}

// --- the site: from the western world end back to the provincial border ------

function computeSite() {
  if (!world || !world.map || !world.map.store) return null;
  ensureWorldEnds();
  const end = pickTributeEnd(getWorldEndSpots());
  if (!end) return null;
  const rows = roadNetRows();
  if (!rows || !rows.length) return null;
  const map = world.map;
  const isData = (x, y) => inProvinceData(x, y) === true;
  const areaOf = (x, y) => regionAt(x, y).id;
  // the road of the world end: its polyline and its nearest point to the spot
  let best = null;
  for (const r of rows) {
    if (!r || !r.pts || r.pts.length < 2) continue;
    const q = nearestOnPath(r.pts, end.x, end.y);
    if (q && (!best || q.d < best.q.d)) best = { row: r, q };
  }
  if (!best || best.q.d > 120) return null;
  // inward along the road: the way that still has province data a moment on
  const dir = { x: best.q.ux, y: best.q.uy };
  const inward = isData(end.x + dir.x * 160, end.y + dir.y * 160) && !isData(end.x - dir.x * 160, end.y - dir.y * 160)
    ? { x: -dir.x, y: -dir.y }
    : { x: dir.x, y: dir.y };
  // follow the road row back to the border; a row that ends before it falls
  // back to a straight walk that is snapped to the nearest road at the border
  let crossing = crossingOnRoad(best.row.pts, end, { areaOf, inData: isData });
  if (!crossing) {
    const ahead = crossingAhead(end, inward, { regionOf: areaOf });
    if (ahead) {
      const snap = map.nearestRoadPoint ? map.nearestRoadPoint(ahead.x, ahead.y, 260, true, true) : null;
      if (snap) crossing = { x: snap.x, y: snap.y, ux: ahead.ux, uy: ahead.uy };
    }
  }
  if (!crossing) {
    if (!warned) {
      warned = true;
      console.warn('eerbetoon: geen grens op de weg van wereldeinde', end.id, 'gevonden');
    }
    return null;
  }
  // a dry, free verge: no water on the spots of the place, and no real building
  // of the tiles (the same rule the countryside props keep; the tiles around the
  // spot are not built in this worktree, so this has not been seen in game)
  const dry = (x, y) => {
    if (waterAt(map, x, y)) return false;
    if (map.buildingsNear && map.buildingsNear(x, y, 4).length) return false;
    return true;
  };
  const place = layoutTribute({
    border: crossing,
    ux: crossing.ux,
    uy: crossing.uy,
    hw: (best.row.w || 6) / 2,
    dry,
  });
  return place;
}

function ensureSite() {
  if (site) return site;
  if (!world || typeof world.time !== 'number' || world.time < retryAt) return null;
  tries++;
  // the world's road data arrives with the first tiles: give it a few tries,
  // then back off instead of scanning every two seconds for nothing.
  retryAt = world.time + Math.min(30, 2 + tries * 2);
  site = computeSite();
  return site;
}

// --- textures (all text from beppe_texts.js) ---------------------------------

function plaqueTexture() {
  return canvasTex(256, 80, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#d6a05a');
    gr.addColorStop(1, '#c9a876');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#b06a28';
    g.lineWidth = 5;
    g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#1c1408';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'bold 34px Georgia, serif';
    g.fillText(LAST_BENCH.plaque, w / 2, 32);
    g.font = 'italic 18px Georgia, serif';
    g.fillText(LAST_BENCH.plaqueNl, w / 2, 60);
  });
}

function roadSignTexture() {
  return canvasTex(256, 96, (g, w, h) => {
    g.fillStyle = '#2f6fb0';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f0ede4';
    g.lineWidth = 6;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#f0ede4';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'bold 40px Arial, sans-serif';
    g.fillText(ROAD_SIGN, w / 2, h / 2 + 2);
  });
}

function namePlateTexture() {
  return canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = '#f0ede4';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#1d3a23';
    g.lineWidth = 5;
    g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#1d3a23';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'bold 30px Georgia, serif';
    g.fillText(BEPPE_SIGN, w / 2, h / 2 + 2);
  });
}

function texturedPlane(w, h, tex) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0.05 }));
}

// --- the props ---------------------------------------------------------------

// A wooden bench (like the one in geheimen.js) with a brass plaque; local +x
// is the way the bench looks.
function benchMesh(plaqueTex, own) {
  const g = new THREE.Group();
  const B = new GeoBuilder();
  for (const z of [-0.72, 0.72]) {
    B.box(0, 0.22, z, 0.42, 0.44, 0.06, IRON);
    B.box(-0.24, 0.6, z, 0.05, 0.56, 0.05, IRON);
  }
  B.box(0, 0.47, 0, 0.46, 0.06, 1.62, WOOD);
  for (const y of [0.66, 0.82]) B.box(-0.21, y, 0, 0.05, 0.12, 1.62, WOOD);
  const mesh = new THREE.Mesh(B.build(), MAT);
  mesh.castShadow = mesh.receiveShadow = true;
  own.push(mesh.geometry);
  g.add(mesh);
  if (plaqueTex) {
    const plaque = texturedPlane(0.34, 0.11, plaqueTex);
    plaque.position.set(-0.16, 0.74, 0);
    plaque.rotation.y = Math.PI / 2;
    own.push(plaque.geometry, plaque.material, plaqueTex);
    g.add(plaque);
  }
  return g;
}

// The direction sign to Kollum: a grey post with a blue blade, readable from
// both sides of the border (signBothSides, #503); local +x points outwards.
function kollumSign(own) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.6, 8), new THREE.MeshStandardMaterial({ color: 0x9a9a94, roughness: 0.6, metalness: 0.3 }));
  post.position.y = 1.3;
  post.castShadow = true;
  own.push(post.geometry, post.material);
  g.add(post);
  const tex = roadSignTexture();
  const material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide });
  const blade = signBothSides(1.5, 0.56, material);
  blade.position.set(0, 2.32, 0);
  blade.rotation.y = Math.PI / 2;
  for (const q of blade.children) { q.castShadow = true; own.push(q.geometry); }
  own.push(tex, material);
  g.add(blade);
  return g;
}

// A small Frisian cottage: brick walls, gable to the road, veranda at the
// front, one chimney. Local +x faces the road.
function houseMesh(own) {
  const g = new THREE.Group();
  const B = new GeoBuilder();
  const L = { brick: 0x9a6a4e, roof: 0x3c4248, trim: 0xece8de, door: 0x2f5a44 };
  B.box(0, 1.3, 0, 5.6, 2.6, 7, L.brick);
  gableRoofX(B, -2.8, 2.8, 3.6, 2.6, 4.2, L.roof, L.brick);
  for (const z of [-2.0, 2.0]) windowAt(B, 2.8, 1.4, z, 1, 0, 1.1, 1.3, L);
  for (const z of [-3.5, 3.5]) for (const x of [-1.5, 1.5]) windowAt(B, x, 1.5, z, 0, Math.sign(z), 0.9, 1.1, L);
  // attic window in the front gable
  B.box(2.82, 3.2, 0, 0.08, 0.7, 0.6, L.trim);
  B.box(2.86, 3.2, 0, 0.05, 0.5, 0.4, 0x2a3236);
  // door with a frame and a stone step
  B.box(2.84, 1.05, 0, 0.1, 2.1, 1.05, L.door);
  B.box(2.86, 2.16, 0, 0.1, 0.12, 1.25, L.trim);
  B.box(3.15, 0.08, 0, 0.55, 0.16, 1.4, STONE);
  // chimney
  B.box(-0.8, 4.55, 1.1, 0.55, 1.3, 0.55, 0x6e3a2c);
  // veranda: a low roof on two posts, a wooden deck at the front
  B.box(4.15, 2.5, 0, 2.0, 0.12, 5.4, 0x4a5058);
  for (const z of [-2.35, 2.35]) B.box(5.0, 1.25, z, 0.14, 2.5, 0.14, WOOD_DARK);
  B.box(4.05, 0.06, 0, 1.7, 0.12, 5.2, 0x8a7a62);
  const mesh = new THREE.Mesh(B.build(), MAT);
  mesh.castShadow = mesh.receiveShadow = true;
  own.push(mesh.geometry);
  g.add(mesh);
  // "Beppe" by the door
  const plateTex = namePlateTexture();
  const plate = texturedPlane(0.5, 0.25, plateTex);
  plate.position.set(2.92, 1.75, 0.95);
  plate.rotation.y = Math.PI / 2;
  own.push(plate.geometry, plate.material, plateTex);
  g.add(plate);
  return g;
}

// Beppe's garden, in the house's own frame (+x towards the road, +z to the
// side): a path from the veranda to the road, a low hedge, two vegetable beds,
// flowers, a birdhouse and a small fruit tree. The garden bench stands apart
// (its own world spot: it is the rest point).
function gardenMesh(own) {
  const g = new THREE.Group();
  const B = new GeoBuilder();
  const HEDGE = 0x2f5a2a, GRASS = 0x3d7a3a, BED = 0x6a4a32, PATH = 0xb8ac96;
  // the gravel path from the veranda step to the road verge
  B.box(8.3, 0.03, 0, 5.8, 0.06, 1.5, PATH);
  // the low hedge along the road, with a gap for the path
  for (const [z0, z1] of [[-8.2, -1.1], [1.1, 8.2]]) {
    const n = Math.max(2, Math.round((z1 - z0) / 1.4));
    for (let i = 0; i < n; i++) {
      const z = z0 + (i + 0.5) * (z1 - z0) / n;
      B.box(11.4, 0.45, z, 0.6, 0.9, (z1 - z0) / n + 0.15, HEDGE);
    }
  }
  // two vegetable beds with rows of greens
  for (const zc of [3.6, 5.8]) {
    B.box(8.2, 0.18, zc, 1.4, 0.36, 1.7, BED);
    for (let i = 0; i < 3; i++) B.box(7.75, 0.42, zc - 0.5 + i * 0.5, 0.3, 0.2, 1.3, i % 2 ? 0x4f8a3a : 0x6a9a44);
  }
  // flowers: little clumps by the path and the veranda, in summer colours
  const FLOWERS = [0xd84a4a, 0xe8d040, 0xe07ab0, 0xf2f0e6, 0x8a5ad8];
  const spots = [[6.2, 3.0], [6.6, 3.6], [9.6, 3.0], [9.9, 4.6], [6.4, -3.4], [9.8, -4.4], [5.4, -4.6], [10.4, -6.2], [5.2, 6.6], [10.2, 7.2], [4.6, 2.2]];
  spots.forEach(([lx, lz], i) => {
    B.box(lx, 0.16, lz, 0.24, 0.32, 0.24, GRASS);
    B.box(lx, 0.4, lz, 0.22, 0.2, 0.22, FLOWERS[i % FLOWERS.length]);
  });
  // a birdhouse on a pole by the path
  B.box(9.4, 1.0, -2.6, 0.12, 2.0, 0.12, WOOD_DARK);
  B.box(9.4, 2.15, -2.6, 0.55, 0.45, 0.45, 0x8a6440);
  B.box(9.4, 2.45, -2.6, 0.7, 0.12, 0.6, 0x3c4248);
  B.box(9.4, 2.15, -2.37, 0.16, 0.16, 0.06, 0x1a1a1a);
  const mesh = new THREE.Mesh(B.build(), MAT);
  mesh.castShadow = mesh.receiveShadow = true;
  own.push(mesh.geometry);
  g.add(mesh);
  // a small fruit tree at the quiet corner
  const tree = new THREE.Group();
  const TB = new GeoBuilder();
  TB.box(0, 1.1, 0, 0.34, 2.2, 0.34, WOOD_DARK);
  const trunk = new THREE.Mesh(TB.build(), MAT);
  trunk.castShadow = true;
  own.push(trunk.geometry);
  tree.add(trunk);
  const crownGeo = jitterIco(1.7, 0, 832, 1.1, 0.9, 1.1);
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x3d7a3a, roughness: 0.95, flatShading: true });
  const crown = new THREE.Mesh(crownGeo, crownMat);
  crown.position.y = 2.9;
  crown.castShadow = true;
  own.push(crownGeo, crownMat);
  tree.add(crown);
  tree.position.set(10.2, 0, 6.4);
  g.add(tree);
  return g;
}

function placeGroup(obj, spot, y = 0) {
  obj.position.set(spot.x, y, spot.y);
  obj.rotation.y = -(spot.a || 0);
  return obj;
}

// --- colliders (fixed scenery: the player and the traffic must not walk through)

function addColliders() {
  if (colliders || !site) return;
  colliders = true;
  const h = site.house, a = h.a;
  const wall = (lx, lz, half, angle) => {
    const p = housePoint(site, lx, lz);
    addStaticCollider('garagewall', p.x, p.y, 0.2, half, angle);
  };
  wall(0, -3.6, 2.9, a);                 // side walls along the depth
  wall(0, 3.6, 2.9, a);
  wall(2.9, 0, 3.7, a + Math.PI / 2);    // front and back
  wall(-2.9, 0, 3.7, a + Math.PI / 2);
  addStaticCollider('post', site.bench.x, site.bench.y, 0.4, 0.85, site.bench.a);       // the last bench
  addStaticCollider('post', site.sign.x, site.sign.y, 0.2);                            // the Kollum sign
  addStaticCollider('post', site.gardenBench.x, site.gardenBench.y, 0.4, 0.85, site.gardenBench.a); // the garden bench
  const bird = housePoint(site, 9.4, -2.6);
  addStaticCollider('post', bird.x, bird.y, 0.16);
  const tree = housePoint(site, 10.2, 6.4);
  addStaticCollider('post', tree.x, tree.y, 0.35);
  // the hedge, in pieces, so the player keeps to the path
  for (const lz of [-7.5, -4.9, -2.3, 2.3, 4.9, 7.5]) {
    const p = housePoint(site, 11.4, lz);
    addStaticCollider('post', p.x, p.y, 0.45, 0.9, site.house.a + Math.PI / 2);
  }
}

// --- built / dropped ---------------------------------------------------------

function build() {
  if (built || !site || !world) return;
  const scene = getScene();
  if (!scene) return;
  const own = [];
  const root = new THREE.Group();
  root.name = 'beppe-tribute';
  const map = world.map;
  const benchY = groundAt(map, site.bench.x, site.bench.y);
  const signY = groundAt(map, site.sign.x, site.sign.y);
  const houseY = groundAt(map, site.house.x, site.house.y);
  const gardenY = groundAt(map, site.gardenBench.x, site.gardenBench.y);
  root.add(placeGroup(benchMesh(plaqueTexture(), own), site.bench, benchY));
  root.add(placeGroup(kollumSign(own), site.sign, signY));
  root.add(placeGroup(houseMesh(own), site.house, houseY));
  root.add(placeGroup(gardenMesh(own), site.house, houseY));
  root.add(placeGroup(benchMesh(null, own), site.gardenBench, gardenY));
  scene.add(root);
  // the pigeons of the birdhouse: they sit until the player walks away after
  // the remembrance, then the flock takes off (birds.js)
  const pigeonGroup = new THREE.Group();
  scene.add(pigeonGroup);
  const birdhouse = housePoint(site, 9.4, -2.6);
  birds = makeBirds(pigeonGroup, birdhouse.x, birdhouse.y, 2.6, 8, {});
  built = { root, own, pigeonGroup };
  addColliders();
}

function drop() {
  if (!built) return;
  built.root.removeFromParent();
  for (const r of built.own) if (r && typeof r.dispose === 'function') r.dispose();
  built.pigeonGroup.removeFromParent();
  built = null;
  birds = null;
}

// --- the gift of the garden bench --------------------------------------------

// Repair every vehicle of the player that stands in the world (the hero car
// and the owned ones). Vehicles parked away in the garage keep the damage in
// the save; the garage/levens are where those are fixed: the bench cannot
// reach them, and that limitation is fine.
function repairOwnVehicles(w) {
  const p = hoofdspeler(w);
  let n = 0;
  const done = new Set();
  const fix = (v) => {
    if (!v || done.has(v)) return;
    done.add(v);
    repairVehicle(v);
    n++;
  };
  for (const v of w.vehicles || []) if (v.isHeroCar || isOwnVehicle(v)) fix(v);
  if (p && p.inVehicle) fix(p.inVehicle);
  return n;
}

// Every weapon from the shop: the melee ones owned (ammo 1), the guns to their
// full reserve. Idempotent, so a second visit changes nothing.
function giveAllWeapons(w) {
  w.ammo = w.ammo || {};
  let n = 0;
  for (const s of WEAPON_STOCK) {
    if (s.melee) {
      if (w.ammo[s.key] !== 1) { w.ammo[s.key] = 1; n++; }
      continue;
    }
    const full = Math.max(1, s.cap || s.ammo || 1);
    const have = Number.isFinite(w.ammo[s.key]) ? w.ammo[s.key] : 0;
    if (have < full) { w.ammo[s.key] = full; n++; }
  }
  if (w.weapon === 'fists' || !w.weapon) w.weapon = 'pistol';
  return n;
}

function gift(w) {
  w.health = 100;
  const vehicles = repairOwnVehicles(w);
  const weapons = giveAllWeapons(w);
  return { vehicles, weapons };
}

// --- cards (text from beppe_texts.js) ---------------------------------------

function showBenchCard(w) {
  if (!recordUnique(w, TRIBUTE.set, TRIBUTE.bench)) return false;
  showCard(w, {
    kind: 'prestatie', kicker: LAST_BENCH.plaqueNl, title: LAST_BENCH.cardTitle, body: LAST_BENCH.cardBody,
    duration: 8, key: 'beppe-bankje', voice: false,
  });
  return true;
}

function showArrivalCard(w) {
  if (!recordUnique(w, TRIBUTE.set, TRIBUTE.arrival)) return false;
  unlockAchievement(w, TRIBUTE.achievement);
  showCard(w, {
    kind: 'prestatie', kicker: BEPPE_SIGN, title: HOUSE_ARRIVAL.title, body: HOUSE_ARRIVAL.body,
    duration: 8, key: 'beppe-aankomst', voice: false,
  });
  return true;
}

function showRemembranceCard(w, first) {
  if (first) {
    const body = `${REMEMBRANCE.her.fries} — ${REMEMBRANCE.her.nl} ${REMEMBRANCE.hope} ${REMEMBRANCE.certain} ${REMEMBRANCE.gift}`;
    const bodyHtml = `${esc(REMEMBRANCE.her.fries)}<br><span class="nl-sub" lang="nl">${esc(REMEMBRANCE.her.nl)}</span>`
      + `<br>${esc(REMEMBRANCE.hope)}`
      + `<br>${esc(REMEMBRANCE.certain)}`
      + `<br>${esc(REMEMBRANCE.gift)}`;
    showCard(w, {
      kind: 'tip', kicker: BEPPE_SIGN, title: REMEMBRANCE.title, body, bodyHtml,
      duration: 14, key: 'beppe-herinnering', voice: false, important: true,
    });
    return;
  }
  showCard(w, {
    kind: 'tip', kicker: BEPPE_SIGN, title: REMEMBRANCE.giftShort,
    duration: 6, key: 'beppe-rust', voice: false,
  });
}

// --- per frame ---------------------------------------------------------------

function onFoot(w) {
  const p = hoofdspeler(w);
  return !!p && !p.inVehicle && !p.swimming && !p.dead && !w.pigeonMode && !w.heliRun
    && !w.activityGame && !w.padelGame;
}

function near(p, spot, r, car = false) {
  if (!spot) return false;
  const v = p.inVehicle;
  const x = v ? v.x : p.x, y = v ? v.y : p.y;
  if (car && !v) return false;
  return Math.hypot(x - spot.x, y - spot.y) <= r;
}

// Which bench the player can use right now: 'bench', 'garden' or null.
function useNow(w) {
  if (!onFoot(w) || !site) return null;
  const p = hoofdspeler(w);
  if (Math.hypot(p.x - site.bench.x, p.y - site.bench.y) <= USE_R) return 'bench';
  if (Math.hypot(p.x - site.gardenBench.x, p.y - site.gardenBench.y) <= USE_R) return 'garden';
  return null;
}

export function beppePrompt(w) {
  if (!w || !world || !site || !built) return null;
  if (w.paused || w.uiPaused || w.pigeonMode || w.heliRun) return null;
  const id = useNow(w);
  if (id === 'bench') {
    return { id: 'beppe-bankje', x: site.bench.x, y: site.bench.y, h: 1.3, key: 'E', label: LAST_BENCH.promptLabel, sub: LAST_BENCH.promptSub, ring: true };
  }
  if (id === 'garden') {
    return { id: 'beppe-tuinbankje', x: site.gardenBench.x, y: site.gardenBench.y, h: 1.3, key: 'E', label: REMEMBRANCE.promptLabel, sub: REMEMBRANCE.promptSub, ring: true };
  }
  return null;
}

export function tryBeppeGardenInteract(w) {
  if (!w || !w.input || !site) return false;
  const id = useNow(w);
  if (!id) return false;
  if (!(w.input.wasPressed('e') || w.input.wasPressed('f'))) return false;
  w.input.consume('e');
  w.input.consume('f');
  if (id === 'bench') {
    if (!showBenchCard(w)) w.addMessage(`${LAST_BENCH.plaque} ${LAST_BENCH.plaqueNl}`, 3, { kind: 'tip' });
    return true;
  }
  // the garden bench: the rest stop, every visit (the weapons and the repaired
  // vehicles are idempotent); the remembrance card only the first time
  const first = !hasUnique(TRIBUTE.set, TRIBUTE.remembrance);
  gift(w);
  if (first) recordUnique(w, TRIBUTE.set, TRIBUTE.remembrance);
  showRemembranceCard(w, first);
  if (!dovesOff) sessionMarks.waitForDoves = true;
  return true;
}

export function updateBeppeGarden(dt, w) {
  if (!w || !w.map || !w.map.store) return;
  world = w;
  ensureSite();
  if (!site) return;
  const p = hoofdspeler(w);
  const v = p.inVehicle;
  const x = v ? v.x : p.x, y = v ? v.y : p.y;
  const d = Math.hypot(x - site.border.x, y - site.border.y);
  if (!built && d < BUILD_R) build();
  else if (built && d > DROP_R) { drop(); return; }
  if (!built) return;
  // the pigeons
  if (birds && d < ANIM_R) updateBirds(birds, dt, w.time);
  // arrival: the card, the hidden achievement and the doves are in place
  if (d < LAYOUT.arrivalR) showArrivalCard(w);
  // the memory also comes when the player walks up to the house without using
  // the bench (the garden bench is the normal way)
  if (!hasUnique(TRIBUTE.set, TRIBUTE.remembrance) && near(p, site.house, LAYOUT.houseR)) {
    const first = true;
    recordUnique(w, TRIBUTE.set, TRIBUTE.remembrance);
    gift(w);
    showRemembranceCard(w, first);
    sessionMarks.waitForDoves = true;
  }
  // walking away after the remembrance sets the doves off once
  if (sessionMarks.waitForDoves && !dovesOff && d > LAYOUT.leaveR) {
    dovesOff = once(sessionMarks, 'doves');
    sessionMarks.waitForDoves = false;
    if (dovesOff && birds) scatterBirds(birds, p.x, p.y);
  }
}

export function initBeppeGarden(w) {
  world = w;
  site = null;
  built = null;
  colliders = false;
  dovesOff = false;
  tries = 0;
  warned = false;
  retryAt = 0;
  // The post-game guided route (postgame.js) asks this: point at the place
  // until the remembrance there has been read. A closure, so the site may
  // still be computed later; no import from postgame here (no cycle).
  w.beppeGuide = {
    target: () => farewellGuide(site, hasUnique(TRIBUTE.set, TRIBUTE.remembrance)),
  };
  if (typeof window !== 'undefined') {
    window.__beppe = {
      site: () => site,
      spots: () => (site ? {
        border: site.border, bench: site.bench, sign: site.sign, house: site.house,
        gardenBench: site.gardenBench, marker: markerOf(site),
      } : null),
      gift: () => gift(world),
      place: () => ensureSite(),
      go: (spot = 'bench') => {
        const p = hoofdspeler(world), s = site && site[spot];
        if (!p || !s) return false;
        if (p.inVehicle) p.exitVehicle(world.map, world);
        p.x = s.x; p.y = s.y;
        return true;
      },
    };
  }
}

// The special map icon (hud_panel.js draws kind 'beppe'): the garden bench,
// always visible so the place can be found. It is computed on demand, so the
// map also knows the bench before the player has been near the place.
export function beppeMapSpot() {
  if (!site) ensureSite();
  return markerOf(site);
}

// The "Te doen" entry (todo.js asks for it): the place as a goal, and done once
// the remembrance has been read. Null until the site is known.
export function beppeTodoItem(w) {
  if (!site) ensureSite();
  if (!site) return null;
  return tributeTodo(site, !!(w && hasUnique(TRIBUTE.set, TRIBUTE.remembrance)));
}

export function beppeSpots() {
  if (!site) ensureSite();
  if (!site) return [];
  return [
    { id: 'bankje', name: 'laatste bankje van Grunn', x: site.bench.x, y: site.bench.y },
    { id: 'kollum', name: 'Kollum-bordje', x: site.sign.x, y: site.sign.y },
    { id: 'huis', name: "Beppes huis", x: site.house.x, y: site.house.y },
    { id: 'tuinbankje', name: 'tuinbankje', x: site.gardenBench.x, y: site.gardenBench.y },
  ];
}

export const BEPPE_KIND = {
  id: 'beppe',
  init: initBeppeGarden,
  slot: 'uitje',
  interact: tryBeppeGardenInteract,
  tickPhase: 'late',
  tick: updateBeppeGarden,
};


