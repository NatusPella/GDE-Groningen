import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { getStationsForRender, getTrainTripCount } from './stationtravel.js';
import { isMissionActive, getActiveRace } from './missionquery.js';
import { isCinematicActive, playCinematic } from './cinematics.js';
import { isShopOpen, openShopMenu, closeShopMenu } from './shopui.js';
import { shopIconUrl } from './shopicon.js';
import { showCard } from './hudcards.js';
import { recordUnique, hasUnique, recordStat } from './achievements.js';
import { makeTwoWheeler } from './vehicle.js';
import { buildVehicleMesh } from './models3d_vehicles.js';
import { flashScreen } from './postfx3d.js';
import { chash } from './countryfield.js';
import { WATER_Y } from './util.js';
import { buildingAt, tilesIn, withTiles, waterGap, roadNear } from './tileplace.js';
import { findOpenSpot, openGround, waterNear, shoreFrom } from './ommelandplace.js';
import { buildProp, disposeProp, animateProp, eierbalMesh, personMesh } from './ommelandprops3d.js';
import { speak, duoSpeaker } from './ommelandtalk.js';
import { VILLAGES, QUIZ, DUO } from './ommelandlines.js';
import { playerBusy } from './busy.js';

// Dorpsuitjes: a reason to take the train out to each countryside station
// (map.countryStations, stationtravel.js halts). Per village one thing
// to do there (tennis, a canal trip, the Gronings quiz, the mill, the
// leaning tower, the wierde, the bell, the beach), a place to eat, shop or
// hire a bike, a hidden eierbal and a signpost at the platform pointing at
// all of it. Spots are picked once from the real data round the station;
// props only exist within BUILD_R of the player. Done specials and found
// eierballen are lifetime sets (achievements.js 'dorpsuitjes',
// 'dorpseierballen').

const BUILD_R = 320, DROP_R = 440, ANIM_R = 70, PLACE_R = 2600;
const USE_R = 2.6, EGG_R = 1.7, EGG_R_CAR = 2.8, GREET_R = 8, GREET_GAP = 70;
export const SET_DONE = 'dorpsuitjes';
export const SET_EGGS = 'dorpseierballen';
const EGG_PAY = 25, RENT_PRICE = 5, TENNIS_PRICE = 8, BOAT_PRICE = 6, CAFE_PRICE = 6;
const FIT_S = 180;
// the boat rides on the tiles' water, at the level every boat sits at (scene3d.js)
const BOAT_Y = WATER_Y;

// Stock of the farm shops and the beach kiosk: [id, label, desc, price, health, armour]
const FARM_STOCK = [
  ['karnemelk', 'Karnemelk', 'Een koude beker, +20 gezondheid', 3, 20, 0],
  ['kaas', 'Oude boerenkaas', 'Een dikke plak, +45 gezondheid', 6, 45, 0],
  ['krentenwegge', 'Krentenwegge', 'Een halve, met boter. Volle gezondheid', 9, 100, 0],
  ['metworst', 'Metworst', 'Om op te kauwen, +15 pantser', 7, 0, 15],
];
const BEACH_STOCK = [
  ['ijsje', 'IJsje', 'Twee bollen, +15 gezondheid', 3, 15, 0],
  ['patat', 'Patatje met', '+30 gezondheid', 4, 30, 0],
  ['kibbeling', 'Kibbeling', 'Met saus, +50 gezondheid', 7, 50, 0],
];

let world = null;
let villages = null;
let mini = null;
let lastTrips = 0;
let bellRings = 0;

const cosA = Math.cos, sinA = Math.sin;

function toWorld(a, lx, lz) {
  const c = cosA(a.a), s = sinA(a.a);
  return [a.x + lx * c - lz * s, a.y + lx * s + lz * c];
}

// --- placement ------------------------------------------------------------------

function canalDir(map, wx, wy) {
  let best = 0, bestV = -Infinity;
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2;
    let v = Infinity;
    for (let s = 20; s <= 140; s += 20) v = Math.min(v, waterGap(map, wx + cosA(a) * s, wy + sinA(a) * s, 6));
    if (v > bestV) { bestV = v; best = a; }
  }
  return best;
}

// The shore the station's water walk ends at: the water within rMax, on the
// tiles that are in (shoreTiles asks for them).
function shoreCandidate(map, st, depth, rMax) {
  const w = waterNear(map, st.x, st.y, { depth, rMax });
  if (!w) return null;
  const sh = shoreFrom(map, w.x, w.y, st.x, st.y, 3);
  return sh ? { w, sh } : null;
}

// The landing stage of the jetty prop (ommelandprops3d.js jetty) runs 8 m out from its spot, 2 m wide: no road,
// quay path or building under it, and its far end over water (issue #124: stages stood in the road)
export function stageClear(map, x, y, a) {
  const c = Math.cos(a), s = Math.sin(a);
  for (let d = 1; d <= 8.4; d += 0.7) {
    for (const z of [-1, 0, 1]) {
      const px = x + c * d - s * z, py = y + s * d + c * z;
      if (buildingAt(map, px, py, 0.3)) return false;
      const r = roadNear(map, px, py, 1);
      if (r && r.d < 0.3) return false;
    }
  }
  return waterGap(map, x + c * 7.4, y + s * 7.4, 6) > 0.5 && waterGap(map, x + c * 8, y + s * 8, 6) > 0.5;
}

function shoreSpot(map, st, depth, rMax, stage = false) {
  const c = shoreCandidate(map, st, depth, rMax);
  if (!c) return null;
  const { w, sh } = c;
  // the prop's +x looks out over the water
  const a = Math.atan2(-sh.uy, -sh.ux);
  for (const back of [0, 2, 4, 6, 9]) {
    const x = sh.x + sh.ux * back, y = sh.y + sh.uy * back;
    if (openGround(map, x, y, { r: 1.5, road: 0.5 }) && (!stage || stageClear(map, x, y, a))) return { x, y, a, water: w };
  }
  // a road or a quay along the water: the nearest open ground within 16 m of it, looking at the water
  const q = findOpenSpot(map, sh.x, sh.y, { rMin: 3, rMax: 36, step: 3, opts: { r: 1.5, road: 0.5 }, test: (px, py) => { const g = waterGap(map, px, py, 20); return g < -2 && g > -16 && (!stage || stageClear(map, px, py, Math.atan2(w.y - py, w.x - px))); } });
  return q ? { x: q.x, y: q.y, a: Math.atan2(w.y - q.y, w.x - q.x), water: w } : null;
}

function spotFor(map, st, kind) {
  const ao = st.exitAngle;
  const around = (rMin, rMax, r, a0 = ao, spread = 1.4, test = null) => findOpenSpot(map, st.x, st.y, { rMin, rMax, a0, spread, step: 6, opts: { r }, test });
  const face = (q) => (q ? { x: q.x, y: q.y, a: Math.atan2(st.y - q.y, st.x - q.x) + Math.PI } : null);
  const facing = (q) => (q ? { x: q.x, y: q.y, a: Math.atan2(st.y - q.y, st.x - q.x) } : null);
  switch (kind) {
    case 'tennis': return face(around(45, 260, 5, ao - 0.5, 1.6, (x, y, a) => [[11, 6], [-11, 6], [11, -6], [-11, -6], [0, 7]].every(([u, v]) => openGround(map, x + u * cosA(a) - v * sinA(a), y + u * sinA(a) + v * cosA(a), { r: 1 }))));
    case 'boot': return shoreSpot(map, st, ...SHORE.boot, true);
    case 'molen': return facing(around(60, 280, 6.5, ao - 0.4));
    case 'toren': return face(around(45, 260, 5, ao - 0.4, 1.6, (x, y, a) => openGround(map, x + cosA(a) * 12, y + sinA(a) * 12, { r: 1.5 }) && openGround(map, x + cosA(a) * 22, y + sinA(a) * 22, { r: 1 })));
    case 'wierde': return facing(around(50, 260, 3.5, ao - 0.4));
    case 'klok': return facing(around(35, 220, 3, ao - 0.4));
    case 'quiz': case 'cafe': case 'winkel': case 'strandtent': return facing(around(16, 110, 3.4, ao + 0.8, 1.2));
    case 'fiets': return facing(around(10, 60, 2.6, ao + 0.9, 1.2));
    default: return null;
  }
}

// Where each activity has its figure, its E spot and its solid bits (local).
const LAYOUT = {
  tennis: { prop: 'tennis', npc: [-11.5, 3.2, 0], use: [-9.6, 0] },
  boot: { prop: 'jetty', npc: [0.6, 1.4, Math.PI], use: [-1.4, 0] },
  quiz: { prop: 'cafe', npc: [0.3, 0, 0], use: [1.8, 0] },
  cafe: { prop: 'cafe', npc: [0.3, 0, 0], use: [1.8, 0] },
  winkel: { prop: 'stall', npc: [0.1, 0, 0], use: [2.0, 0] },
  strandtent: { prop: 'strandtent', npc: [1.9, -1.9, 0], use: [2.4, 0] },
  fiets: { prop: 'rack', use: [2.1, 0] },
  molen: { prop: 'mill', npc: [4.6, 1.6, 0], use: [4.8, 0] },
  toren: { prop: 'tower', npc: [21, 0.6, Math.PI], use: [12, 0] },
  wierde: { prop: 'wierde', use: [1.4, 0] },
  klok: { prop: 'klok', npc: [2.4, 2.4, -2.3], use: [1.9, 0] },
  strand: { prop: 'beach', use: [2.2, 0] },
};
const NPC_LOOK = { 'Trainer Bouke': 'bouke', 'Kroegbaas Roelf': 'roelf', 'Schipper Lammert': 'lammert', 'Kroegbaas Tjakko': 'tjakko', 'Molenaar Fenna': 'fenna', 'Koster Egbert': 'egbert', 'Boerin Geesje': 'geesje', 'Koster Menno': 'menno', 'Kroegbaas Wilma': 'wilma', 'Strandtent Tineke': 'tineke' };

function makeAct(v, role, def, spot) {
  const L = LAYOUT[def.kind];
  const act = { village: v, role, def, kind: def.kind, x: spot.x, y: spot.y, a: spot.a, water: spot.water || null, L, prop: null, greetAt: -99 };
  [act.ux, act.uy] = toWorld(act, L.use[0], L.use[1]);
  return act;
}

// Where the water and beach uitjes look for their shore: [depth, how far from the station]
const SHORE = { boot: [18, 1600] };
// the tiles a village is placed on: round its station and, for a water uitje, the
// whole disc its shore is searched in (rings of points a window apart)
const PLACE_WINDOW = 460;
function placePoints(map, v) {
  const pts = [[v.st.x, v.st.y]];
  for (const def of [v.V.special, v.V.amenity]) {
    const q = def && SHORE[def.kind];
    if (!q) continue;
    for (let r = 800; r < q[1] + 700; r += 800) {
      const n = Math.round((r / 800) * 6);
      for (let k = 0; k < n; k++) pts.push([v.st.x + Math.cos((k / n) * Math.PI * 2) * r, v.st.y + Math.sin((k / n) * Math.PI * 2) * r]);
    }
  }
  return pts;
}

// Placed once its tiles are in: a village the player nears is placed in the
// background (placeSoon), every one by prepareVillages.
async function placeSoon(map, v) {
  if (v.placed || v.placing) return;
  v.placing = true;
  try { await withTiles(map, placePoints(map, v), () => { if (!v.placed) placeVillage(map, v); }, { radius: PLACE_WINDOW, token: 'village', slice: 6 }); } finally { v.placing = false; }
}

export async function prepareVillages(w = world) {
  for (const v of villageList(w) || []) await placeSoon(w.map, v);
}

function placeVillage(map, v) {
  const st = v.st, V = v.V;
  v.placed = true;
  for (const [role, def] of [['special', V.special], ['amenity', V.amenity]]) {
    if (!def) continue;
    const q = spotFor(map, st, def.kind);
    if (q) v.acts.push(makeAct(v, role, def, q));
    else console.warn('[dorpsuitjes] geen plek voor', st.name, def.kind);
  }
  // the eierbal: a few hundred metres out, tucked beside a building if one is near
  const a0 = chash(Math.round(st.x), Math.round(st.y)) * Math.PI * 2;
  const tucked = (x, y) => !!buildingAt(map, x, y, 7);
  const e = findOpenSpot(map, st.x, st.y, { rMin: 150, rMax: 420, a0, step: 9, opts: { r: 1.2, road: 1 }, test: tucked })
    || findOpenSpot(map, st.x, st.y, { rMin: 120, rMax: 420, a0, step: 9, opts: { r: 1.2, road: 1 } });
  if (e) v.egg = { village: v, x: e.x, y: e.y, id: st.name, mesh: null };
  // the signpost beside the ticket machine
  const p = findOpenSpot(map, st.x, st.y, { rMin: 3, rMax: 14, a0: st.exitAngle + 1.2, spread: 1.4, step: 1.5, opts: { r: 0.8, road: 0.5, rail: 4 } });
  if (p) v.post = { x: p.x, y: p.y, prop: null };
}

function villageList(w) {
  if (villages || !w) return villages;
  const list = (getStationsForRender() || []).filter((s) => s.country && VILLAGES[s.name]);
  if (list.length) villages = list.map((st) => ({ name: st.name, V: VILLAGES[st.name], st, acts: [], egg: null, post: null, placed: false }));
  return villages;
}

// The villages (spotcheck.js, the story test, debug), each one placed whose
// tiles are in; in play a village is placed when the player first comes within
// PLACE_R of its station, the rest by prepareVillages (after the start).
const tilesReady = (w, v) => tilesIn(w.map, placePoints(w.map, v), PLACE_WINDOW);
export function ensureVillages(w = world) {
  const list = villageList(w) || [];
  for (const v of list) if (!v.placed && tilesReady(w, v)) placeVillage(w.map, v);
  return list;
}

// The onderduik stroll (storyfun.js): from the station to the village's first uitje.
export function villageStroll(w, name) {
  const v = (villageList(w) || []).find((q) => q.name === name);
  if (!v) return null;
  if (!v.placed && tilesReady(w, v)) placeVillage(w.map, v);
  if (!v.placed) return null;
  const a = v.acts[0];
  return a && Number.isFinite(a.ux) ? { x: a.ux, y: a.uy, label: a.def.name } : null;
}

// For the maps (ommelandmap.js): the uitjes of every village placed so far
// (the player has been within PLACE_R of its station).
export function getVillageMapSpots() {
  const out = [];
  for (const v of villages || []) {
    if (!v.placed) continue;
    for (const a of v.acts) {
      if (!Number.isFinite(a.ux)) continue;
      const done = a.role === 'special' && hasUnique(SET_DONE, v.name);
      out.push({ x: a.ux, y: a.uy, name: a.def.name, sub: `${a.def.label || (a.role === 'special' ? 'Dorpsuitje' : 'Eten en drinken')} · ${v.name}${done ? ' · gedaan' : ''}`, done });
    }
  }
  return out;
}

// The hidden eierballen of the villages (every village placed first), for
// the Buukenkaas's tips (furniture.js), the same reveal as the city's.
export function getVillageEggs(w = world) {
  const out = [];
  for (const v of ensureVillages(w)) if (v.egg) out.push({ id: 'dorp:' + v.egg.id, x: v.egg.x, y: v.egg.y, found: hasUnique(SET_EGGS, v.egg.id) });
  return out;
}

// For spotcheck.js and the story test.
export function getVillageSpots() {
  const out = [];
  for (const v of ensureVillages()) {
    for (const a of v.acts) out.push({ kind: 'dorp', id: `${v.name} ${a.kind}`, x: a.ux, y: a.uy });
    if (v.egg) out.push({ kind: 'dorp', id: `${v.name} eierbal`, x: v.egg.x, y: v.egg.y });
  }
  return out;
}

// --- props ---------------------------------------------------------------------

function blades(v) {
  const out = [];
  const P = v.post;
  for (const a of v.acts) {
    const d = Math.hypot(a.ux - P.x, a.uy - P.y);
    out.push({ a: Math.atan2(a.uy - P.y, a.ux - P.x), text: a.def.name, sub: `${Math.round(d / 10) * 10} m` });
  }
  return out;
}

function buildAct(a) {
  const L = a.L;
  a.prop = buildProp(L.prop, { name: a.def.name, sign: [a.def.name, a.kind === 'boot' ? `Instappen · €${BOAT_PRICE}` : ''] });
  const g = a.prop.group;
  g.position.set(a.x, 0, a.y);
  g.rotation.y = -a.a;
  getScene().add(g);
  if (L.npc && a.def.who && a.def.who !== DUO && NPC_LOOK[a.def.who]) {
    const m = personMesh(NPC_LOOK[a.def.who]);
    m.position.set(L.npc[0], 0, L.npc[1]);
    m.rotation.y = -L.npc[2];
    g.add(m);
    a.prop.people.push({ mesh: m });
    const [mx, my] = toWorld(a, L.npc[0], L.npc[1]);
    a.mouth = { x: mx, y: my };
  }
  if (a.kind === 'boot') {
    const boat = buildVehicleMesh({ id: 'om-boat-' + a.village.name, isBoat: true, model: { name: 'boat', kind: 'sloep', len: 5.2, wid: 1.9, color: '#e8e6e0', cabin: '#1d4f9c' } });
    const [bx, by] = toWorld(a, 5, 2.2);
    boat.position.set(bx, BOAT_Y, by);
    boat.rotation.y = -a.a;
    getScene().add(boat);
    a.boat = boat;
  }
  a.solids = a.prop.solids.map(([lx, lz, r]) => { const [x, y] = toWorld(a, lx, lz); return { x, y, r }; });
}

function dropAct(a) {
  disposeProp(a.prop);
  a.prop = null;
  a.solids = null;
  if (a.boat) { a.boat.removeFromParent(); a.boat = null; }
}

function buildPost(v) {
  const P = v.post;
  P.prop = buildProp('signpost', { blades: blades(v) });
  P.prop.group.position.set(P.x, 0, P.y);
  getScene().add(P.prop.group);
}

function buildEgg(e) {
  const { mesh, geo } = eierbalMesh();
  e.mesh = mesh;
  e.geo = geo;
  mesh.position.set(e.x, 0.55, e.y);
  getScene().add(mesh);
}

function dropEgg(e) {
  if (!e.mesh) return;
  e.mesh.removeFromParent();
  e.geo.dispose();
  e.mesh = null;
}

// --- helpers ---------------------------------------------------------------------

function blockReason(w) {
  if (w.wanted > 0) return 'Niet nu: eerst de politie kwijt';
  if (playerBusy(w, ['mission', 'activeRace', 'challenge']).busy) return 'Niet nu: maak eerst je missie af';
  if (playerBusy(w, ['sideJob']).busy) return 'Niet nu: eerst je klusje afmaken';
  return null;
}

function heal(w, hp, armour = 0) {
  if (hp) w.health = Math.min(100, (w.health || 0) + hp);
  if (armour) w.armor = Math.min(100, (w.armor || 0) + armour);
}

function pay(w, price) {
  if (w.money < price) return false;
  w.money -= price;
  recordStat(w, 'purchases');
  recordStat(w, 'spent', price);
  return true;
}

function doneSpecial(w, a) {
  if (!recordUnique(w, SET_DONE, a.village.name)) return;
  const n = Object.keys(VILLAGES).filter((k) => hasUnique(SET_DONE, k)).length;
  showCard(w, { kind: 'prestatie', kicker: 'Dorpsuitje', title: a.def.name, body: `${n} van ${Object.keys(VILLAGES).length} dorpen gedaan`, duration: 4.5, key: 'dorpsuitje' });
}

function say(w, a, text) {
  const who = a.def.who;
  if (!who || !text) return 0;
  return speak(w, who, text, who === DUO ? null : a.mouth || { x: a.x, y: a.y }, { h: 2.2 });
}

const W3 = (x, y, z) => ({ x, y, z });

// A short scene: [who, text] lines (DUO = the companion), a camera function.
function scene(w, a, { id, title, lines, duration, shot, onEnd, hide = false }) {
  const duo = duoSpeaker(w).name;
  const L = lines.map(([who, text]) => ({ speaker: who === DUO ? duo : who, text }));
  return playCinematic({
    id, priority: 2, duration, pause: true, letterbox: true, skippable: true, hideHud: true,
    kicker: a.village.V.gro || a.village.name, title, cardFor: 2.2, lines: L, shot,
    onStart() { if (hide) w.cinematicHidePlayers = true; },
    onEnd() { if (hide) w.cinematicHidePlayers = false; w.cameraOverride = null; if (onEnd) onEnd(); },
  });
}

function stand(w, x, y, angle) {
  const p = w.player;
  if (p.inVehicle) return;
  p.x = x; p.y = y; p.angle = angle; p.vx = 0; p.vy = 0;
}

// --- the activities ------------------------------------------------------------------

function shopMenu(w, a, stock, { type, color, tagline }) {
  const who = a.def.who;
  openShopMenu(w, {
    type: 'dorp-' + a.kind, icon: shopIconUrl(type, 92), color, name: a.def.name, tagline,
    sections: () => [{
      title: 'Te koop', items: stock.map(([id, label, desc, price, hp, ar]) => ({
        id, label, desc, price, swatch: [color],
        disabled: w.money < price ? 'Te weinig geld' : null,
        buy() {
          if (!pay(w, price)) return null;
          heal(w, hp, ar);
          if (who && a.def.lines && a.def.lines[1]) setTimeout(() => say(w, a, a.def.lines[1]), 400);
          return 'Smakelijk!';
        },
      })),
    }],
  });
}

function rentBike(w, a) {
  openShopMenu(w, {
    type: 'dorp-fiets', icon: shopIconUrl('fietsen', 92), color: '#2f6fb0', name: a.def.name,
    tagline: 'Een fiets voor het Ommeland. Hij rijdt zelf terug naar de stalling.',
    sections: () => [{ title: 'Huren', items: [{
      id: 'huurfiets', label: 'Huurfiets', desc: 'Stevig, zwaar en met een bel', price: RENT_PRICE, verb: 'Huren voor', swatch: ['#2f6fb0'],
      disabled: w.money < RENT_PRICE ? 'Te weinig geld' : null,
      buy() {
        if (!pay(w, RENT_PRICE)) return null;
        closeShopMenu();
        const [bx, by] = toWorld(a, 2.4, 1.6);
        const bike = makeTwoWheeler('bike', bx, by, a.a + Math.PI / 2, 0x2f6fb0);
        bike.missionCar = true;
        bike.rental = true;
        w.vehicles.push(bike);
        w.player.x = bx; w.player.y = by;
        w.player.enterVehicle(bike, w);
        return 'Veel plezier!';
      },
    }] }],
  });
}

function cafe(w, a) {
  openShopMenu(w, {
    type: 'dorp-cafe', icon: shopIconUrl('snack', 92), color: '#b27850', name: a.def.name,
    tagline: 'Kovvie, bier en proatjes',
    sections: () => [{ title: 'Aan de bar', items: [
      { id: 'kovvie', label: 'Kovvie met kouk', desc: 'Koffie met koek, +30 gezondheid', price: CAFE_PRICE, swatch: ['#6a4a2a'], disabled: w.money < CAFE_PRICE ? 'Te weinig geld' : null,
        buy() { if (!pay(w, CAFE_PRICE)) return null; heal(w, 30); recordUnique(w, 'horeca', a.def.name); setTimeout(() => say(w, a, a.def.lines[1]), 400); return 'Smakelijk!'; } },
      { id: 'bier', label: 'Een biertje', desc: 'Eentje dan, +15 gezondheid', price: 4, swatch: ['#d8a83a'], disabled: w.money < 4 ? 'Te weinig geld' : null,
        buy() { if (!pay(w, 4)) return null; heal(w, 15); recordUnique(w, 'horeca', a.def.name); return 'Proost!'; } },
    ] }],
  });
}

function quiz(w, a) {
  const L = a.def.lines;
  const order = [...QUIZ.keys()].sort((i, j) => chash(i * 7 + Math.floor(w.time), 3) - chash(j * 7 + Math.floor(w.time), 3)).slice(0, 3);
  let k = 0, right = 0;
  // a question only pops up while you are still at the table (not after walking off, a respawn or a load)
  const load0 = w.loadCount || 0;
  const here = () => !w.pendingRespawn && !w.player.inVehicle && (w.loadCount || 0) === load0 && !isMissionActive()
    && Math.hypot(w.player.x - a.ux, w.player.y - a.uy) < 8;
  const ask = () => {
    if (!here()) return;
    const [q, good, ...bad] = QUIZ[order[k]];
    const answers = [good, ...bad].map((t, i) => ({ t, ok: i === 0, h: chash(order[k] * 13 + i, k) })).sort((x, y) => x.h - y.h);
    openShopMenu(w, {
      type: 'dorp-quiz', icon: shopIconUrl('tabak', 92), color: '#3a5a3a', name: `${a.def.name}`,
      tagline: `Vraag ${k + 1} van 3 · goed is €10`,
      sections: () => [{ title: q, items: answers.map((ans, i) => ({
        id: 'q' + i, label: ans.t, desc: '', price: 0, plain: true, verb: 'Dit is het', tag: 'ABC'[i], swatch: ['#3a5a3a'],
        buy() {
          closeShopMenu();
          if (ans.ok) { right++; w.money += 10; }
          say(w, a, ans.ok ? L.right : L.wrong);
          k++;
          if (k < 3) setTimeout(() => { if (!isCinematicActive() && !isShopOpen()) ask(); }, 2600);
          else setTimeout(() => {
            if ((w.loadCount || 0) !== load0) return;
            if (right === 3) { w.money += 25; say(w, a, L.all); }
            w.addMessage(`Dorpsquiz: ${right} van 3 goed · +€${right * 10 + (right === 3 ? 25 : 0)}`, 4, { kind: 'geld' });
            doneSpecial(w, a);
          }, 2600);
          return ans.ok ? 'Goed!' : 'Fout';
        },
      })) }],
    });
  };
  say(w, a, L.start);
  setTimeout(ask, 2200);
}

function tennis(w, a) {
  if (!pay(w, TENNIS_PRICE)) { w.addMessage('Te weinig geld: ballen slaan kost €8', 2.5); return; }
  const [px, py] = toWorld(a, a.L.use[0], a.L.use[1]);
  stand(w, px, py, a.a);
  say(w, a, a.def.lines.start);
  const [mx, my] = toWorld(a, 8.8, 0);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshStandardMaterial({ color: 0xd8f050, roughness: 0.6 }));
  getScene().add(ball);
  mini = { kind: 'tennis', a, n: 0, hits: 0, t: -2.4, ball, from: [mx, my], to: [px, py], hit: false, done: false, el: miniUi('Ballen slaan'), px, py };
}

function updateTennis(dt, w) {
  const m = mini;
  const p = w.player;
  p.x = m.px; p.y = m.py; p.vx = 0; p.vy = 0; p.angle = m.a.a;
  m.t += dt;
  const FLY = 1.25;
  const k = m.t / FLY;
  if (m.t >= 0) {
    const [fx, fy] = m.hit ? m.to : m.from, [tx, ty] = m.hit ? m.from : m.to;
    const u = Math.min(1.1, m.hit ? (m.t - m.hitAt) / 0.8 : k);
    m.ball.position.set(fx + (tx - fx) * u, 0.9 + Math.sin(Math.min(1, u) * Math.PI) * 1.6, fy + (ty - fy) * u);
    m.ball.visible = true;
  } else m.ball.visible = false;
  const zone = k > 0.78 && k < 0.98;
  if (!m.hit && w.input && (w.input.wasPressed('e') || w.input.wasPressed(' '))) {
    w.input.consume('e');
    if (m.t >= 0 && zone) {
      m.hit = true; m.hitAt = m.t; m.hits++;
      (w.audioEvents || (w.audioEvents = [])).push({ kind: 'bonk', x: m.px, y: m.py, strength: 0.7 });
    } else if (m.t >= 0) m.t = FLY;
  }
  const over = m.hit ? m.t - m.hitAt > 0.8 : k > 1.08;
  if (over) {
    m.n++;
    m.hit = false;
    m.t = -0.7;
    if (m.n >= 6) {
      const good = m.hits >= 4;
      say(w, m.a, good ? m.a.def.lines.good : m.a.def.lines.bad);
      heal(w, good ? 100 : 30);
      w.padelFitUntil = w.time + (good ? FIT_S : FIT_S / 3);
      w.addMessage(`Ballen slaan: ${m.hits} van 6 raak${good ? ' · volle gezondheid, lekker fit' : ''}`, 4);
      doneSpecial(w, m.a);
      endMini();
      return;
    }
  }
  setMini(`Bal ${Math.min(6, m.n + 1)} van 6 · raak: ${m.hits}`, m.t < 0 ? -1 : k, zone);
}

// the ride: out from the jetty, along the canal, back again (a cutscene)
function boatTrip(w, a) {
  if (!pay(w, BOAT_PRICE)) { w.addMessage('Te weinig geld: het rondvaartje kost €6', 2.5); return; }
  const wp = a.water;
  const dir = canalDir(w.map, wp.x, wp.y);
  const [sx, sy] = toWorld(a, 5, 2.2);
  const P = [[sx, sy], [wp.x, wp.y], [wp.x + cosA(dir) * 170, wp.y + sinA(dir) * 170]];
  const boat = a.boat;
  const home = boat ? { x: boat.position.x, z: boat.position.z, r: boat.rotation.y } : null;
  const at = (u) => {
    const s = u * 2, i = Math.min(1, Math.floor(s)), f = s - i;
    return [P[i][0] + (P[i + 1][0] - P[i][0]) * f, P[i][1] + (P[i + 1][1] - P[i][1]) * f, Math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0])];
  };
  scene(w, a, {
    id: 'dorp-boot', title: a.def.name, duration: 14, hide: true,
    lines: a.def.lines.map((t) => [a.def.who, t]),
    shot(u) {
      const [bx, by, h] = at(Math.min(1, u * 1.05));
      if (boat) { boat.position.set(bx, BOAT_Y, by); boat.rotation.y = -h; }
      return { position: W3(bx - cosA(h) * 9 + cosA(h + 1.4) * 7, by - sinA(h) * 9 + sinA(h + 1.4) * 7, 4.2), lookAt: W3(bx + cosA(h) * 6, by + sinA(h) * 6, 0.6), fov: 52 };
    },
    onEnd() {
      if (boat && home) { boat.position.x = home.x; boat.position.z = home.z; boat.rotation.y = home.r; }
      heal(w, 20);
      if (typeof w.clock === 'number') w.clock = (w.clock + 0.25) % 24;
      doneSpecial(w, a);
    },
  });
}

function millView(w, a) {
  const c = { x: a.x, y: a.y };
  scene(w, a, {
    id: 'dorp-molen', title: a.def.name, duration: 11, hide: true,
    lines: a.def.lines.map((t) => [a.def.who, t]),
    shot(u) {
      const h = a.a + 0.4 + u * 1.3;
      return { position: W3(c.x + cosA(h) * 5.2, c.y + sinA(h) * 5.2, 6.4), lookAt: W3(c.x + cosA(h) * 60, c.y + sinA(h) * 60, 2.5), fov: 58 };
    },
    onEnd() { doneSpecial(w, a); },
  });
}

function towerPhoto(w, a) {
  const [px, py] = toWorld(a, 12, 0);
  stand(w, px, py, a.a + Math.PI);
  const [cx, cy] = toWorld(a, 23, 0.8);
  let flashed = false;
  scene(w, a, {
    id: 'dorp-toren', title: a.def.name, duration: 7.5,
    lines: a.def.lines.map((t) => [a.def.who, t]),
    shot(u, t) {
      if (!flashed && u > 0.55) {
        flashed = true;
        flashScreen(true);
        (w.audioEvents || (w.audioEvents = [])).push({ kind: 'camera_shutter', x: cx, y: cy });
      }
      return { position: W3(cx, cy, 1.7), lookAt: W3(a.x + cosA(a.a) * 4, a.y + sinA(a.a) * 4, 6.5), fov: 48 };
    },
    onEnd() {
      w.addMessage('Foto gemaakt: jij tegen de scheve toren van Beem. De toren wint', 4);
      doneSpecial(w, a);
    },
  });
}

function wierdeView(w, a) {
  scene(w, a, {
    id: 'dorp-wierde', title: a.def.name, duration: 11,
    lines: a.def.lines.map((t) => [a.def.who, t]),
    shot(u) {
      const h = a.a + Math.PI + u * 1.1;
      return { position: W3(a.x + cosA(h) * (8 + u * 30), a.y + sinA(h) * (8 + u * 30), 3 + u * 32), lookAt: W3(a.x, a.y, 1.5), fov: 55 };
    },
    onEnd() { doneSpecial(w, a); },
  });
}

function ringBell(w, a) {
  bellRings++;
  const bell = a.prop && a.prop.group.userData.bell;
  if (bell) bell.userData.swing = 1;
  const q = w.audioEvents || (w.audioEvents = []);
  for (let i = 0; i < 3; i++) setTimeout(() => q.push({ kind: 'crossing_bell', x: a.x, y: a.y }), i * 650);
  say(w, a, bellRings >= 3 ? a.def.lines.more : a.def.lines.first);
  doneSpecial(w, a);
}

function useAct(w, a) {
  switch (a.kind) {
    case 'winkel': shopMenu(w, a, FARM_STOCK, { type: 'super', color: '#3a7a3a', tagline: 'Vers van t erf. Eerlijk betalen.' }); break;
    case 'strandtent': shopMenu(w, a, BEACH_STOCK, { type: 'snack', color: '#3a8ab0', tagline: 'IJs, patat en limonade, met je tenen in het zand' }); break;
    case 'cafe': cafe(w, a); break;
    case 'fiets': rentBike(w, a); break;
    case 'quiz': quiz(w, a); break;
    case 'tennis': tennis(w, a); break;
    case 'boot': boatTrip(w, a); break;
    case 'molen': millView(w, a); break;
    case 'toren': towerPhoto(w, a); break;
    case 'wierde': wierdeView(w, a); break;
    case 'klok': ringBell(w, a); break;
    default: break;
  }
}

// --- the minigame panel --------------------------------------------------------------

function miniUi(title) {
  let el = document.getElementById('om-mini');
  if (!el) {
    el = document.createElement('div');
    el.id = 'om-mini';
    el.style.cssText = 'position:fixed;left:50%;bottom:24vh;transform:translateX(-50%);width:min(360px,calc(100vw - 32px));padding:10px 14px;z-index:6;pointer-events:none;'
      + 'font:15px "Arial Narrow",Arial,sans-serif;color:#f0ede4;background:rgba(10,18,34,0.78);border-left:4px solid #3fc97a;border-radius:0 6px 6px 0;';
    el.innerHTML = '<div class="t" style="font:22px \'Bebas Neue\',\'Arial Narrow\',sans-serif;letter-spacing:2px;color:#8fd8a8"></div>'
      + '<div class="b" style="position:relative;height:16px;margin-top:6px;background:rgba(240,237,228,.14);border-radius:8px;overflow:hidden">'
      + '<i style="position:absolute;top:0;bottom:0;left:78%;width:20%;background:rgba(93,255,122,.45)"></i><u style="position:absolute;top:-2px;bottom:-2px;width:4px;margin-left:-2px;background:#fff"></u></div>'
      + '<div class="s" style="margin-top:6px"></div><div style="margin-top:4px;font-size:13px;opacity:.75">Druk E als de bal in het groene vak is</div>';
    document.body.appendChild(el);
  }
  el.querySelector('.t').textContent = title;
  el.hidden = false;
  return el;
}

function setMini(text, k, zone) {
  const el = mini.el;
  el.querySelector('.s').textContent = text;
  const u = el.querySelector('u');
  u.style.display = k < 0 ? 'none' : 'block';
  u.style.left = `${Math.max(0, Math.min(1, k)) * 100}%`;
  u.style.background = zone ? '#5dff7a' : '#fff';
}

function endMini() {
  if (!mini) return;
  if (mini.ball) { mini.ball.removeFromParent(); mini.ball.geometry.dispose(); mini.ball.material.dispose(); }
  if (mini.el) mini.el.hidden = true;
  mini = null;
}

export function isVillageMiniActive() {
  return !!mini;
}

// A loaded save ends a running minigame (savegame.js).
export function stopVillageMini() {
  endMini();
}

// --- per frame, prompts, input -------------------------------------------------------------

function nearestAct(w) {
  if (!villages || mini || w.pigeonMode) return null;
  const p = w.player;
  if (p.inVehicle) return null;
  let best = null, bd = USE_R;
  for (const v of villages) {
    if (Math.abs(v.st.x - p.x) > 2800 || Math.abs(v.st.y - p.y) > 2800) continue;
    for (const a of v.acts) {
      if (!a.prop) continue;
      const d = Math.hypot(a.ux - p.x, a.uy - p.y);
      if (d < bd) { bd = d; best = a; }
    }
  }
  return best;
}

const LABEL = { winkel: 'Iets kopen', strandtent: 'Iets bestellen', cafe: 'Iets bestellen', fiets: 'Fiets huren', quiz: 'Dorpsquiz' };
const SUB = { winkel: 'Zuivel, kaas en worst van het erf', strandtent: 'IJsje, patat of kibbeling', cafe: `Kovvie met kouk: €${CAFE_PRICE}, +30 gezondheid`, fiets: `€${RENT_PRICE}: een fiets om het dorp te verkennen` };

export function villagePrompt(w) {
  const a = nearestAct(w);
  if (!a) return null;
  const why = blockReason(w);
  const label = a.role === 'special' ? a.def.label : LABEL[a.kind] || a.def.name;
  const sub = why || (a.role === 'special' ? a.def.sub : `${a.def.name}: ${SUB[a.kind] || ''}`);
  return { id: 'dorp-' + a.village.name + a.kind, x: a.ux, y: a.uy, h: 2.4, key: 'E', label, sub, ring: true, dim: !!why };
}

export function villageSecondary(w) {
  if (!villages || mini || w.pigeonMode) return [];
  const p = w.player;
  const out = [];
  for (const v of villages) {
    for (const a of v.acts) {
      if (!a.prop || Math.abs(a.ux - p.x) > 24 || Math.abs(a.uy - p.y) > 24) continue;
      out.push({ id: 'dorp2-' + v.name + a.kind, x: a.ux, y: a.uy, h: 2.6, label: a.def.name, sub: p.inVehicle ? 'Stap uit en loop erheen' : 'Loop erheen en druk E', kind: 'place' });
    }
  }
  return out;
}

export function tryVillageInteract(w) {
  const input = w.input;
  if (!input || isShopOpen() || isCinematicActive() || mini) return false;
  if (!(input.wasPressed('e') || input.wasPressed('f'))) return false;
  const a = nearestAct(w);
  if (!a) return false;
  input.consume('e');
  input.consume('f');
  const why = blockReason(w);
  if (why) { w.addMessage(why, 2.5); return true; }
  useAct(w, a);
  return true;
}

function teaser(w) {
  const n = getTrainTripCount();
  if (n === lastTrips) return;
  lastTrips = n;
  const p = w.player;
  for (const v of villages) {
    if (!v.placed || Math.hypot(v.st.x - p.x, v.st.y - p.y) > 40) continue;
    const eggs = v.egg && !hasUnique(SET_EGGS, v.name) ? ' Ergens in het dorp ligt ook een eierbal.' : '';
    showCard(w, { kind: 'tip', kicker: v.V.gro ? `${v.name} · ${v.V.gro}` : v.name, title: 'Te doen', body: `${v.V.teaser}.${eggs} Kijk op de wegwijzer.`, duration: 7, key: 'dorp-teaser' });
  }
}

export function updateVillages(dt, w) {
  world = w;
  if (!villageList(w)) return;
  const p = w.player, v0 = p.inVehicle;
  const px = v0 ? v0.x : p.x, py = v0 ? v0.y : p.y;
  // one village placed per frame, once the player heads its way
  const next = villages.find((v) => !v.placed && !v.placing && Math.hypot(v.st.x - px, v.st.y - py) < PLACE_R);
  if (next && !villages.some((v) => v.placing)) placeSoon(w.map, next);
  teaser(w);
  if (mini) {
    if (mini.kind === 'tennis') {
      if (w.wanted > 0 || w.pendingRespawn || isShopOpen() || p.inVehicle) endMini();
      else updateTennis(dt, w);
    }
  }
  for (const v of villages) {
    if (!v.placed) continue;
    const dv = Math.hypot(v.st.x - px, v.st.y - py);
    if (dv > 3200) {
      for (const a of v.acts) if (a.prop) dropAct(a);
      if (v.post && v.post.prop) { disposeProp(v.post.prop); v.post.prop = null; }
      if (v.egg) dropEgg(v.egg);
      continue;
    }
    if (v.post) {
      const d = Math.hypot(v.post.x - px, v.post.y - py);
      if (!v.post.prop && d < BUILD_R) buildPost(v);
      else if (v.post.prop && d > DROP_R) { disposeProp(v.post.prop); v.post.prop = null; }
    }
    for (const a of v.acts) {
      const d = Math.hypot(a.x - px, a.y - py);
      if (!a.prop && d < BUILD_R) buildAct(a);
      else if (a.prop && d > DROP_R) { dropAct(a); continue; }
      if (!a.prop) continue;
      if (d < ANIM_R) animateProp(a.prop, dt, w.time);
      // the owner says hello
      if (a.role === 'amenity' && a.def.who && a.def.lines && !v0 && !isCinematicActive() && !isShopOpen()) {
        const du = Math.hypot(a.ux - p.x, a.uy - p.y);
        if (du < GREET_R && w.time - a.greetAt > GREET_GAP) { a.greetAt = w.time; say(w, a, a.def.lines[0]); }
      }
    }
    const e = v.egg;
    if (e && !hasUnique(SET_EGGS, e.id)) {
      const d = Math.hypot(e.x - px, e.y - py);
      if (!e.mesh && d < 160) buildEgg(e);
      else if (e.mesh && d > 220) dropEgg(e);
      if (e.mesh) {
        e.mesh.rotation.y += dt * 1.4;
        e.mesh.position.y = 0.55 + Math.sin(w.time * 2.2) * 0.08;
        if (d < (v0 ? EGG_R_CAR : EGG_R) && !w.pigeonMode) {
          recordUnique(w, SET_EGGS, e.id);
          dropEgg(e);
          const n = Object.keys(VILLAGES).filter((k) => hasUnique(SET_EGGS, k)).length;
          w.money += EGG_PAY;
          heal(w, 100);
          w.addMessage(`Ommelander eierbal gevonden! ${n}/${Object.keys(VILLAGES).length} · +€${EGG_PAY}, volle gezondheid`, 3.5);
        }
      }
    } else if (e && e.mesh) dropEgg(e);
  }
}

export function villageSolids(out) {
  if (!villages) return out;
  for (const v of villages) for (const a of v.acts) if (a.solids) out.push(...a.solids);
  return out;
}

export function initVillages(w) {
  world = w;
  lastTrips = getTrainTripCount();
}

export function villageDebug() {
  return ensureVillages().map((v) => ({
    name: v.name, st: [Math.round(v.st.x), Math.round(v.st.y)],
    acts: v.acts.map((a) => ({ kind: a.kind, x: Math.round(a.ux), y: Math.round(a.uy), d: Math.round(Math.hypot(a.ux - v.st.x, a.uy - v.st.y)), built: !!a.prop })),
    egg: v.egg ? [Math.round(v.egg.x), Math.round(v.egg.y)] : null, done: hasUnique(SET_DONE, v.name), eggFound: hasUnique(SET_EGGS, v.name),
  }));
}

// debug: run an activity from anywhere (the storytest and ?dev)
export function villageUse(name, role = 'special') {
  const v = ensureVillages().find((q) => q.name === name);
  const a = v && v.acts.find((q) => q.role === role);
  if (!a || !world) return false;
  if (!a.prop) buildAct(a);
  world.player.x = a.ux; world.player.y = a.uy;
  useAct(world, a);
  return true;
}
