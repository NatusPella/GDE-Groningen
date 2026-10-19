// Missie 8, "Alles klopt, behalve de papieren": een heel rondje Diepenring met
// toeristen aan boord. Rustig begin, dan komt Schipper Wiebe (de echte
// eigenaar) in z'n sloep achter je aan. Botsingen maken de toeristen bang;
// rustig langs bezienswaardigheden varen (de gids vertelt) maakt ze blij.
// missions.js blijft de baas over checkpoints, timer en slagen/zakken.

import { paintSpeaker } from './speakers.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { boatDryPoints, inMapWater, keepBoatOffShore, normalizeAngle, pointInPolygon, clamp } from './util.js';
import { waterPolyAt } from './waterlevels.js';
import { Vehicle, resolveVehicleBuildingCollision, vehicleContacts } from './vehicle.js';
import { getVehicleMesh } from './models3d_vehicles.js';
import { buildPersonMesh, seatPose, SEAT_CONTACT } from './models3d_people.js';
import { boatSeats, BOAT_KINDS } from './boattypes.js';
import { decorVisible } from './decorrules.js';
import { HABBO_PALETTE } from './pixelart3d.js';
import { LINE as GIDS_LINE } from './sidejob_rondvaart.js';
import { isCinematicActive, playCinematic } from './cinematics.js';
import { setDualText } from './subtitles.js';
import { playLineVoice } from './audio.js';
import { lineVoiceFor } from './linevoice.js';
import { TOUR_WELCOME, TOUR_STOPS, TOURIST_REACT, RV_SCENES } from './rondvaartlines.js';
import { playDeckMoment } from './missionstory.js';
import { openBank } from './voicebank.js';

// --- route ---------------------------------------------------------------------
// Clockwise from the Spilsluizen. The eastern arc (Turfsingel, Schuitendiep,
// Oosterhaven, Herebrug) is the Rondvaartgids side job's water centreline;
// the western arc (museum, Emmasingel, der A, Noorderhaven, Lopendediep) was
// grid-searched the same way over the water polygons minus houseboats,
// passing the Groninger Museum south of the island between the piers of the
// H.N. Werkmanbrug.
const WEST = [[165.09, 829.11], [157.12, 832.26], [137.14, 836.61], [115.11, 837.98], [95.1, 840.32], [73.05, 840.68], [51, 841.04], [28.95, 841.4], [6.9, 841.76], [-15.15, 842.12], [-35.26, 838.43], [-57.36, 835.77], [-77.5, 830.06], [-97.68, 822.33], [-113.83, 815.55], [-134, 807.83], [-152.16, 801.08], [-172.33, 793.35], [-190.54, 783.58], [-196.58, 781.67], [-202.64, 778.75], [-208.67, 777.84], [-228.83, 771.12], [-248.99, 764.4], [-269.18, 755.67], [-289.36, 747.95], [-297.44, 744.05], [-315.61, 736.29], [-323.76, 728.37], [-340.03, 714.55], [-354.32, 698.67], [-369.58, 684.83], [-374.79, 672.83], [-375.15, 650.69], [-374.51, 628.54], [-372.67, 618.44], [-371.99, 598.3], [-372.35, 576.16], [-368.71, 553.95], [-369.03, 533.82], [-371.36, 513.73], [-373.73, 491.62], [-372.86, 483.55], [-370.21, 461.36], [-370.57, 439.22], [-370.93, 417.08], [-371.29, 394.94], [-372.62, 374.83], [-373.82, 362.77], [-374.18, 340.63], [-373.44, 324.51], [-371.77, 304.35], [-370.99, 290.25], [-371.35, 268.11], [-371.68, 247.98], [-376.05, 225.9], [-383.39, 205.89], [-392.7, 187.92], [-405.02, 170], [-419.32, 154.13], [-435.59, 139.29], [-451.86, 125.46], [-467.13, 110.61], [-478.35, 98.72], [-489.67, 80.78], [-500.99, 62.84], [-514.31, 44.94], [-519.58, 28.92], [-517.8, 14.8], [-514.83, 12.74], [-502.03, -1.56], [-486.26, -17.93], [-470.44, -31.27], [-452.55, -40.62], [-434.68, -50.98], [-428.73, -55.1], [-410.86, -65.46], [-392.99, -75.82], [-377.09, -84.13], [-365.18, -91.37], [-347.3, -101.73], [-331.42, -111.04], [-313.55, -121.4], [-293.64, -129.78], [-273.74, -139.16], [-253.85, -148.55], [-235.96, -157.9], [-218.06, -166.24], [-200.17, -175.6], [-182.28, -184.95], [-164.39, -194.3], [-144.52, -204.69], [-126.64, -215.05], [-122.65, -216.12], [-102.73, -223.49], [-82.82, -231.87], [-62.93, -241.26], [-42.99, -247.62], [-23.09, -257.01], [-5.24, -268.37], [14.67, -276.75], [16.66, -277.79], [34.5, -290.16], [54.4, -298.54], [66.36, -302.76]];
const FINISH_AT = 96; // WEST index of the finish, just short of the start berth

// where the side job's line hugs one quay in the Schuitendiep, these pull it
// back to mid-channel
const MID_CHANNEL = [[507, 77.57], [505.9, 71.85], [503.81, 66.54], [562.33, 193.22], [559.24, 188.24], [556.55, 182.95], [617.22, 293.99], [613.64, 289.82], [611.05, 285.03], [608.37, 280.35]];

const PTS = [
  [-33.03, -251.81], ...WEST.slice(98, 103),
  ...GIDS_LINE.slice().reverse(),
  ...WEST.slice(1, FINISH_AT + 1),
];
for (const q of MID_CHANNEL) {
  let bi = 0, bd = Infinity;
  for (let i = 0; i < PTS.length - 1; i++) {
    const [ax, ay] = PTS[i], [bx, by] = PTS[i + 1];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    const t = clamp(((q[0] - ax) * dx + (q[1] - ay) * dy) / l2, 0, 1);
    const d = Math.hypot(ax + dx * t - q[0], ay + dy * t - q[1]);
    if (d < bd) { bd = d; bi = i; }
  }
  PTS.splice(bi + 1, 0, q);
}
const CUM = [];
export let ROUTE_LENGTH = 0;
function measure() {
  CUM.length = 0;
  CUM.push(0);
  for (let i = 1; i < PTS.length; i++) CUM.push(CUM[i - 1] + Math.hypot(PTS[i][0] - PTS[i - 1][0], PTS[i][1] - PTS[i - 1][1]));
  ROUTE_LENGTH = CUM[CUM.length - 1];
}
measure();

// Once per session, with the live map (procedural houseboats and all): slide
// the line sideways to where the widest boat still fits, then smooth it, so
// the guidance and Wiebe's sloep keep off the quays in the narrow stretches.
let refined = false;
function refineRoute(map) {
  if (refined) return;
  refined = true;
  const probe = { model: { len: 5.2, wid: 1.9 } };
  const offs = [0];
  for (let o = 0.5; o <= 3.5; o += 0.5) offs.push(o, -o);
  const samples = [];
  for (let s = 0; s <= ROUTE_LENGTH; s += 3) {
    const q = routeAt(s);
    const nx = -Math.sin(q.a), ny = Math.cos(q.a);
    let off = 0;
    search: for (const wid of [5.5, 4.5, 3.5, 2.6]) {
      probe.model.wid = wid;
      for (const o of offs) {
        if (boatDryPoints(map, probe, q.x + nx * o, q.y + ny * o, q.a) === 0) { off = o; break search; }
      }
    }
    samples.push({ q, nx, ny, off });
  }
  const sm = samples.map((_, i) => {
    let sum = 0, n = 0;
    for (let k = i - 3; k <= i + 3; k++) if (samples[k]) { sum += samples[k].off; n++; }
    return i === 0 || i === samples.length - 1 ? 0 : sum / n;
  });
  const last = PTS[PTS.length - 1];
  const out = [PTS[0]];
  for (let i = 2; i < samples.length - 1; i += 2) {
    const { q, nx, ny } = samples[i];
    out.push([q.x + nx * sm[i], q.y + ny * sm[i]]);
  }
  out.push(last);
  PTS.length = 0;
  PTS.push(...out);
  measure();
}

function nearestOnRoute(x, y, i0 = 0, i1 = PTS.length - 1) {
  let best = null;
  for (let i = Math.max(0, i0); i < Math.min(PTS.length - 1, i1); i++) {
    const [ax, ay] = PTS[i], [bx, by] = PTS[i + 1];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1);
    const px = ax + dx * t, py = ay + dy * t;
    const d2 = (x - px) ** 2 + (y - py) ** 2;
    if (!best || d2 < best.d2) {
      const len = Math.sqrt(l2);
      best = { d2, i, s: CUM[i] + t * len, lat: ((x - ax) * -dy + (y - ay) * dx) / len };
    }
  }
  best.d = Math.sqrt(best.d2);
  return best;
}

// Progress along the route, searched near the last known segment so the
// start and finish (which lie side by side) never get confused.
function track(x, y, hint) {
  let r = hint == null ? nearestOnRoute(x, y) : nearestOnRoute(x, y, hint - 6, hint + 14);
  if (hint != null && r.d > 35) {
    const full = nearestOnRoute(x, y, hint - 40, hint + 60);
    if (full.d < r.d) r = full;
  }
  return r;
}

export function routeAt(s) {
  s = clamp(s, 0, ROUTE_LENGTH);
  let i = 0;
  while (i < PTS.length - 2 && CUM[i + 1] < s) i++;
  const [ax, ay] = PTS[i], [bx, by] = PTS[i + 1];
  const len = CUM[i + 1] - CUM[i] || 1;
  const t = (s - CUM[i]) / len;
  return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, a: Math.atan2(by - ay, bx - ax), i };
}

function sOf(x, y) {
  return nearestOnRoute(x, y).s;
}

// For other races over the same water (postgame.js Elf Bruggenrace):
// refine the line once for the live map, then follow progress along it.
export function prepareDiepenringRoute(map) {
  refineRoute(map);
}

export function diepenringProgress(x, y, hint = null) {
  const r = track(x, y, hint);
  return { s: r.s, d: r.d, i: r.i };
}

// Checkpoints under the Diepenring's bridges; `via` points in between keep
// the minimap line and the guidance dots on the water.
const CHECKPOINTS = [
  { at: [224.09, -280.18], bridge: 'Maagdenbrug' },
  { at: [454.24, -58.47], bridge: 'Sint Jansbrug' },
  { at: [513.04, 103.64], bridge: 'Poelebrug' },
  { at: [606.08, 275.25], bridge: 'Steentilbrug' },
  { at: [728.05, 498.73], bridge: 'Trompbrug' },
  { at: [365.39, 756.36], bridge: 'Herebrug' },
  { at: [73.05, 840.68], bridge: 'H.N. Werkmanbrug' },
  { at: [-196.58, 781.67], bridge: 'Emmabrug' },
  { at: [-373.44, 324.51], bridge: 'A-brug' },
  { at: [-451.86, 125.46], bridge: 'Visserbrug' },
  { at: [-273.74, -139.16], bridge: "Kijk in 't Jatbrug" },
  { at: PTS[PTS.length - 1], bridge: 'Spilsluizen' },
];
const VIA_STEP = 70;
const CP_SLACK = 12; // m of time bonus buffer per checkpoint on top of the sailing time
const CP_SPEED = 4.9; // m/s the time bonus is budgeted at

export function rondvaartWaypoints() {
  const out = [];
  let s0 = 0;
  for (const cp of CHECKPOINTS) {
    const s1 = sOf(cp.at[0], cp.at[1]);
    const n = Math.floor((s1 - s0) / VIA_STEP);
    for (let k = 1; k <= n; k++) {
      const s = s0 + (s1 - s0) * (k / (n + 1));
      const p = routeAt(s);
      out.push({ x: p.x, y: p.y, via: true });
    }
    const p = routeAt(s1);
    out.push({ x: p.x, y: p.y, bridge: cp.bridge, bonus: Math.round((s1 - s0) / CP_SPEED + CP_SLACK) });
    s0 = s1;
  }
  return out;
}

// The tour boat lies moored alongside the quay on the Spilsluizen side, bow
// towards the route, with the start marker on the quay next to it: slide out
// from the route line to the quay (left bank) until the hull would touch,
// back off a hand's width, and skip spots where a houseboat is moored.
// The tour boat (boattypes.js rondvaart hull, glass roof, benches) with a
// player tune for a long, heavy boat: slow to get going, wide in the bends.
export const TOUR_BOAT = { ...BOAT_KINDS.rondvaart, maxSpeed: 7.4, accel: 1.7, brake: 2.3 };

const BERTH_FALLBACK = { start: { x: -39.02, y: -262.38 }, boat: { x: -38.18, y: -260.28, angle: -0.3878 } };

export function rondvaartBerth(map) {
  const probe = { model: { len: TOUR_BOAT.len, wid: TOUR_BOAT.wid } };
  const hl = probe.model.len / 2;
  // the whole length of the hull must lie against the quay itself, not
  // against a houseboat moored there (those count as water obstacles)
  const againstQuay = (x, y, a, nx, ny) => [-hl, 0, hl].every((l) => {
    const px = x + Math.cos(a) * l + nx * (probe.model.wid / 2 + 1.6), py = y + Math.sin(a) * l + ny * (probe.model.wid / 2 + 1.6);
    return !inMapWater(map, px, py);
  });
  for (let s = 4; s <= 70; s += 3) {
    const q = routeAt(s);
    const nx = Math.sin(q.a), ny = -Math.cos(q.a);
    let last = null;
    for (let o = 0; o <= 22; o += 0.25) {
      if (boatDryPoints(map, probe, q.x + nx * o, q.y + ny * o, q.a) > 0) break;
      last = o;
    }
    if (last == null || last < 1) continue;
    const off = Math.max(0, last - 0.3);
    const bx = q.x + nx * off, by = q.y + ny * off;
    if (!againstQuay(bx, by, q.a, nx, ny)) continue;
    for (let m = 1.5; m <= 7; m += 0.5) {
      const sx = bx + nx * (probe.model.wid / 2 + m), sy = by + ny * (probe.model.wid / 2 + m);
      if (inMapWater(map, sx, sy) || map.buildingsNear(sx, sy, 1).some((b) => pointInPolygon(sx, sy, b.pts))) continue;
      return { start: { x: sx, y: sy }, boat: { x: bx, y: by, angle: q.a } };
    }
  }
  return BERTH_FALLBACK;
}

// --- sights ----------------------------------------------------------------------

// The tour itself (stops, lines, tourist reactions) lives in rondvaartlines.js.
const SIGHT_R = 40;
const SIGHT_SLOW = 5.2;
const SIGHT_HOLD = 0.8;
const SIGHT_JOY = 5;

// --- tuning ------------------------------------------------------------------------

const JOY_START = 100;
const BUMP_DV = 1.8; // m/s of sudden velocity change in one step that counts as a bump
const BUMP_COOLDOWN = 0.7;
const CALM_AFTER = 6;
const CALM_RATE = 0.3;
const CALM_CAP = 60; // calm water settles nerves, but only the guide's stories make them truly happy
const MEGAPHONE_R = 22;
const MEGAPHONE_RATE = 0.15;

const WIEBE_MODEL = { name: 'boat', kind: 'sloep', len: 4.6, wid: 1.8, maxSpeed: 9.6, accel: 2.8, brake: 4.2, turnRate: 1.35, color: '#2e6b3f', cabin: '#e9e4d4' };
const WIEBE_GRIP = 6; // m/s^2 lateral, like a player boat, so he corners no better than you
const WIEBE_SPAWN_BACK = 125;
const WIEBE_SPAWN_MIN_DIST = 95;
const RAM_R = 34;
const RAM_COOLDOWN = 6.5;
const RAM_MAX_T = 5.5;
const BLOCK_MAX_T = 5.5;
const BRIDGE_CUTOFF_AHEAD = 85;
const HULL_START = 100;

const WIEBE = 'Schipper Wiebe';
const SHOUT = {
  appear: ['HÉ! DAT IS MIEN BOOT! KLAAS, IK WEET DAT JIJ DIT BENT!'],
  chase: [
    'Aanleggen! Nou! Of ik bel de havenmeester!',
    'Die toeristen hebben bij MIJ betaald!',
    'Dat schip is ouder dan jullie bij elkaar!',
    'Moi? MOI?! Niks moi!',
    'Dit is gain rondvaart, dit is een ontvoering!',
    'Ik ken elke brug in Grunn. Jullie niet!',
    'Ik haal je in, al moet ik tot Delfzijl!',
    'Dames en heren, u zit op een gestolen boot!',
    'Ik heb dertig jaar vaarbewijs, jij dertig seconden!',
    'Die gids weet niks! Die toren is niet eens scheef!',
    'Mien boot! Mien toeristen! Mien fooien!',
    'Wie leert jou varen? Een eend?',
    'Ik ruik je dieselwalm tot hier, prutser!',
    'Ze krijgen hun geld terug! Van JOU!',
    'Nog één brug en ik heb je, Klaas!',
    'Stuur eens recht, je vaart als een fietser op een ijsbaan!',
    'Havenmeester! HAVENMEESTER!',
  ],
  ram: ['BOEM! Nog een keer?', 'Zo! Dat was voor mien lak!', 'Aan de kant, zoetwatermatroos!', 'Tik! Nou jij weer!', 'Dat was nummer één, er komen er meer!', 'Hou je vast, dames en heren!'],
  block: ['Hier kom je niet langs! Dit is MIEN diep!', 'Brug dicht! Voor jou wel!', 'Voorrang? Die heb ik altijd!', 'Hier ligt Wiebe. Keer maar om!'],
  brake: ['Remmen kan ik ook!', 'Stop! Tol betalen!'],
  crash: ['Au! Die kade stond er gisteren nog niet!', 'Mien lak! Mien mooie lak!', 'Wie heeft die kade hier neergelegd?!', 'Dat was de kade. De kade is niet van mij.', 'Oei. Dat voelde ik in mien knieën.'],
  far: ['Ik zie je wel, Klaas! Ik zie je WEL!', 'Wacht maar tot ik bij het museum ben!', 'Ik ben er zo! Ik moet alleen even langs deze woonboot!', 'Rennen kan je niet op het water, Klaas!'],
  knock: ['Ik buk voor niemaAU! Mien kop!'],
  sunk: ['Mien motor! Mien mooie motor! Nou vaart hij niet meer!'],
  after: ['Dit is nog niet voorbij, Klaas!'],
};

const BUMP_SOFT = [
  'Tik! Een toerist morst koffie over z\'n kaart van Grunn.',
  'Schrap langs de kade. "Is this part of the tour?"',
  'Bonk. Een Duitse toerist klapt uit beleefdheid.',
];
const BUMP_HARD = [
  'KLABAM! Een toerist omhelst een wildvreemde.',
  'Dreun! Er ligt een selfiestick in het Diep.',
  'Boem! "Ich will aussteigen!"',
  'Krak! De toeristen checken hun reisverzekering.',
];
const BUMP_RAM = [
  'Wiebe ramt je! De toeristen gillen in vier talen.',
  'Dreun van Wiebe! Een toerist belt z\'n ambassade.',
  'Wiebe knalt erop! Iemand vraagt of dit een Gronings gebruik is.',
];

// --- voice (optional recordings, keyed "<speaker>|<text>" like the story) ----------

const VOICE_DIR = openBank('story').dir;
const voices = openBank('story').entries;

// --- subtitles -------------------------------------------------------------------

let subEl = null;
function subtitleEl() {
  if (subEl) return subEl;
  subEl = document.createElement('div');
  subEl.id = 'rv-sub';
  subEl.setAttribute('aria-live', 'polite');
  Object.assign(subEl.style, {
    position: 'fixed', left: '50%', bottom: '17vh', transform: 'translateX(-50%)', width: 'min(86vw, 760px)',
    textAlign: 'center', font: "clamp(15px, 1.5vw, 20px) 'Arial Narrow', Arial, sans-serif", color: '#fff',
    letterSpacing: '0.3px', textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.6)', pointerEvents: 'none',
    opacity: '0', transition: 'opacity 0.25s', zIndex: '40',
  });
  subEl.innerHTML = '<span class="rv-speaker" style="font-weight:bold;margin-right:6px"></span><span class="rv-line"></span>';
  document.body.appendChild(subEl);
  return subEl;
}

// --- figures on the boats ------------------------------------------------------------

const TOURIST_LOOKS = [
  { shirt: 0xe0473c, skin: HABBO_PALETTE.woodLight, variant: 'female', seed: 2203, hairStyle: 'bun' },
  { shirt: 0xf2c230, skin: HABBO_PALETTE.woodMid, variant: 'male', seed: 2291 },
  { shirt: 0x3a8fd9, skin: HABBO_PALETTE.woodLight, variant: 'male', seed: 2377 },
  { shirt: 0x6fb07a, skin: HABBO_PALETTE.woodDark, variant: 'female', seed: 2459 },
  { shirt: 0xf4f1e8, skin: HABBO_PALETTE.woodLight, variant: 'female', seed: 2531 },
  { shirt: 0x8a4fb0, skin: HABBO_PALETTE.woodMid, variant: 'male', seed: 2617 },
  { shirt: 0xd9822b, skin: HABBO_PALETTE.woodLight, variant: 'female', seed: 2699 },
];
const WIEBE_LOOK = { shirt: 0x1d3557, skin: HABBO_PALETTE.woodLight, variant: 'male', seed: 2441 };

// On the benches under the glass roof (boattypes.js seats; 0 is the helm,
// 1 the companion's), one figure per frame so the boat never hitches.
function touristGroup(v) {
  const g = new THREE.Group();
  g.userData.seats = boatSeats(v).slice(2, 2 + TOURIST_LOOKS.length);
  g.userData.people = [];
  return g;
}

function seatTourists(g) {
  const k = g.userData.people.length;
  const seat = g.userData.seats[k];
  if (!seat) return;
  const look = TOURIST_LOOKS[k];
  const m = buildPersonMesh(look.shirt, look.skin, look);
  seatPose(m, seat.pose, 0);
  m.position.set(seat.x, seat.y - SEAT_CONTACT * (m.scale.y || 1), seat.z);
  m.rotation.y = (seat.face || 0) + (seat.z > 0 ? -0.2 : 0.2);
  g.add(m);
  g.userData.people.push(m);
}

function wiebeGroup(v) {
  const g = new THREE.Group();
  const m = buildPersonMesh(WIEBE_LOOK.shirt, WIEBE_LOOK.skin, WIEBE_LOOK);
  m.position.set(-v.model.len * 0.22, 0.14, 0);
  const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.045, 0.34, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0xf4f1e8, side: THREE.DoubleSide }));
  horn.rotation.z = -Math.PI / 2;
  horn.position.set(0.36, 1.5, -0.1);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.05, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0xd23b2f, side: THREE.DoubleSide }));
  band.rotation.z = -Math.PI / 2;
  band.position.set(0.5, 1.5, -0.1);
  m.add(horn, band);
  g.add(m);
  g.userData.man = m;
  g.userData.horn = [horn, band];
  return g;
}

function ensureDecor(v, key, build) {
  const mesh = getVehicleMesh(v.id);
  if (!mesh) return null;
  if (!mesh.userData[key]) {
    mesh.userData[key] = build(v);
    mesh.add(mesh.userData[key]);
  }
  return mesh.userData[key];
}

function dropDecor(v, key) {
  const mesh = v && getVehicleMesh(v.id);
  if (!mesh || !mesh.userData[key]) return;
  mesh.remove(mesh.userData[key]);
  mesh.userData[key] = null;
}

function animateTourists(g, st, t) {
  const scared = t - st.lastBumpAt < 1.6 || st.joy < 30;
  const cheer = t - st.lastJoyAt < 2.2;
  g.userData.people.forEach((m, k) => {
    const ud = m.userData;
    const ph = t * (scared ? 9 : 3) + k * 1.7;
    if (scared) {
      ud.armL.rotation.set(-0.3, 0, 2.7 + Math.sin(ph) * 0.25);
      ud.armR.rotation.set(0.3, 0, 2.7 - Math.sin(ph) * 0.25);
      if (ud.elbowL) { ud.elbowL.rotation.z = 0.3; ud.elbowR.rotation.z = 0.3; }
    } else if (cheer || (st.joy > 75 && Math.sin(t * 0.7 + k * 2.1) > 0.93)) {
      ud.armL.rotation.set(0, 0, 0.35);
      ud.armR.rotation.set(0.25, 0, 2.5 + Math.sin(ph * 2.4) * 0.35);
      if (ud.elbowR) ud.elbowR.rotation.z = 0.5;
    } else {
      ud.armL.rotation.set(0, 0, 0.35);
      ud.armR.rotation.set(0, 0, 0.35);
      if (ud.elbowL) { ud.elbowL.rotation.z = 1.05; ud.elbowR.rotation.z = 1.05; }
    }
    ud.head.rotation.y = scared ? Math.sin(ph * 1.3) * 0.5 : Math.sin(t * 0.4 + k) * 0.4;
  });
}

function animateWiebe(g, w, t) {
  const m = g.userData.man, ud = m.userData;
  if (w.out) {
    const k = clamp((t - w.outAt) / 0.5, 0, 1);
    m.rotation.z = -1.35 * k;
    m.position.y = 0.14 + 0.1 * k;
    ud.armL.rotation.set(0, 0, 2.2 * k);
    ud.armR.rotation.set(0, 0, 2.2 * k);
    return;
  }
  m.rotation.z = 0;
  const shouting = t - w.shoutAt < 2.5;
  ud.armR.rotation.set(-0.2, 0, shouting ? 1.1 : 0.9);
  if (ud.elbowR) ud.elbowR.rotation.z = 1.9;
  ud.armL.rotation.set(0, 0, shouting ? 1.6 + Math.sin(t * 8) * 0.5 : 0.3);
  if (ud.elbowL) ud.elbowL.rotation.z = shouting ? 0.6 : 0.2;
  ud.head.rotation.z = shouting ? Math.sin(t * 9) * 0.06 : 0;
}

// --- state -----------------------------------------------------------------------------

let st = null;
let bridgeS = null;
let triggerS = null;
const wiebeTriggerS = () => triggerS ?? (triggerS = sOf(CHECKPOINTS[1].at[0], CHECKPOINTS[1].at[1]));
let werkmanS = 0;

// Shuffle bag per line list: every line once before any repeats, and never
// the same line twice in a row across a refill.
const bags = new Map();
function pick(list) {
  let bag = bags.get(list);
  if (!bag || !bag.left.length) {
    const left = list.slice();
    for (let i = left.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [left[i], left[j]] = [left[j], left[i]];
    }
    const last = bag && bag.last;
    if (left.length > 1 && left[left.length - 1] === last) [left[0], left[left.length - 1]] = [left[left.length - 1], left[0]];
    bag = { left, last };
    bags.set(list, bag);
  }
  bag.last = bag.left.pop();
  return bag.last;
}

function findBridges(map) {
  if (bridgeS) return bridgeS;
  refineRoute(map);
  const out = [];
  let inside = false, start = 0;
  for (let s = 0; s <= ROUTE_LENGTH; s += 2) {
    const p = routeAt(s);
    const on = map.isOnBridge(p.x, p.y);
    if (on && !inside) { inside = true; start = s; }
    if (!on && inside) { inside = false; out.push((start + s) / 2); }
  }
  bridgeS = out;
  werkmanS = sOf(73.05, 840.68);
  return out;
}

// opts.relaxed: the tour on its own (sidejob_rondvaarttour.js): no Wiebe,
// no fleeing tourists, every stop told whatever the speed.
export function startRondvaart(world, boat, opts = {}) {
  stopRondvaart(world);
  findBridges(world.map);
  st = {
    world,
    boat,
    relaxed: !!opts.relaxed,
    grp: 0,
    gapUntil: 0,
    reactAt: 40,
    joy: JOY_START,
    bumps: 0,
    lastBumpAt: -99,
    lastJoyAt: -99,
    bumpMsgAt: -99,
    moodShown: 100,
    prevVel: null,
    ps: 0,
    pi: null,
    sights: TOUR_STOPS.map((q) => {
      const s = sOf(q.at[0], q.at[1]);
      const p = routeAt(s);
      return { ...q, s, px: p.x, py: p.y, hold: 0, done: false };
    }).sort((a, b) => a.s - b.s),
    welcomed: false,
    slowHintShown: false,
    wiebe: null,
    wiebeGone: false,
    contactCursor: vehicleContacts.head,
    sub: null,
    subQueue: [],
    t: 0,
    cheerAt: 3,
  };
}

// relaxedOnly / missionOnly: a caller only ends its own run.
export function stopRondvaart(world, only = null) {
  if (!st || (only === 'mission' && st.relaxed) || (only === 'relaxed' && !st.relaxed)) return;
  const w = st.wiebe;
  if (w && w.v) {
    const v = w.v;
    v.scripted = false;
    v.waterPoly = waterPolyAt(world.map, v.x, v.y);
    if (w.out) v.speed = 0;
  }
  dropDecor(st.boat, 'rvTourists');
  if (subEl) subEl.style.opacity = '0';
  if (st.bubble) st.bubble.speechUntil = 0;
  st = null;
}

export function rondvaartStatus() {
  if (!st) return null;
  const w = st.wiebe;
  const near = w && !w.out ? Math.hypot(w.v.x - st.boat.x, w.v.y - st.boat.y) : Infinity;
  return { joy: Math.round(st.joy), bumps: st.bumps, wiebeDist: near < 90 ? Math.round(near) : null, told: st.sights.filter((q) => q.done).length, stops: st.sights.length };
}

export function rondvaartTip() {
  if (!st) return 0;
  const j = clamp(st.joy, 0, 100);
  return Math.round((j * j) / 100 * 3);
}

export function rondvaartOutro() {
  const j = st ? st.joy : 50;
  if (j >= 85) return 'Rondje Diepenring! De toeristen klappen, geven dikke fooi en boeken meteen voor morgen. Wiebe zoekt z\'n boot nog.';
  if (j >= 55) return 'Rondje Diepenring voltooid. Een paar blauwe plekken, maar de fooienpot rammelt. Wiebe zoekt z\'n boot nog.';
  return 'Rondje Diepenring gehaald, net. De toeristen kussen de kade en geven een fooi uit medelijden.';
}

// --- subtitles & shouts ------------------------------------------------------------------

const SPEAKER = { T: 'Tammo (gids)', G: 'Tammo (gids)', t: 'Tammo', A: 'Anita', W: 'Schipper Wiebe (megafoon)' };
// the tourists speak in bubbles, recorded per voice sex (linevoice.js)
const TOURIST = { D: { name: 'Toeriste', female: true }, E: { name: 'Toerist', female: false }, R: { name: 'Toeriste', female: true } };
const VOICE_WAIT = 5; // s a line waits for the talking channel before it shows without its voice
const LINE_GAP = 0.35;
const STALE_AFTER = 140; // m past its stop an exchange that never started is dropped

function voiceOf(speaker, text) {
  const v = voices[speaker + '|' + text];
  if (v) return { src: VOICE_DIR + v.src, dur: v.dur };
  return lineVoiceFor(speaker, text);
}

function lineItem([k, text], extra = {}) {
  const t = TOURIST[k];
  const speaker = t ? (t.female ? '~f' : '~m') : SPEAKER[k] || k;
  return { speaker, text, name: t ? t.name : speaker, bubble: t || null, voice: voiceOf(speaker, text), ...extra };
}

function itemDur(it) {
  const read = clamp(1.4 + it.text.length * 0.052, it.bubble ? 1.8 : 2.2, it.guide ? 10 : 5);
  return Math.max(read, it.voice ? it.voice.dur + 0.3 : 0);
}

// guide: a stop's exchange, queued in full and never dropped for chatter.
// prio: an event line (Wiebe rams, crashes) goes next, between two lines of
// an exchange if need be, and drops that speaker's queued chatter; after:
// an event reaction that waits for the exchange being told to finish.
// Anything else only plays when nothing is waiting.
function sayLines(lines, { guide = false, prio = false, after = false, s = null } = {}) {
  const grp = ++st.grp;
  const items = lines.map((l) => lineItem(l, { guide, prio: prio || after, grp, s }));
  if (guide) {
    st.subQueue = st.subQueue.filter((q) => q.guide || q.prio);
    st.subQueue.push(...items);
  } else if (prio) {
    st.subQueue = st.subQueue.filter((q) => q.guide || q.prio || q.speaker !== items[0].speaker);
    st.subQueue.splice(0, 0, ...items);
  } else if (after) {
    const at = st.subQueue.findIndex((q) => q.guide && !q.started);
    st.subQueue.splice(at < 0 ? st.subQueue.length : at, 0, ...items);
  } else if (!st.subQueue.length && !st.sub) st.subQueue.push(...items);
}

function say(speaker, text, color, prio = false) {
  sayLines([[speaker, text]], { prio });
}

// One line at a time, through the one talking channel (speech.js via
// audio.playLineVoice): a line waits until its recording may play, so the
// guide, Tessa, the tourists and Wiebe never talk over each other or over
// a phone call; car banter and the radio give way to the mission's lines.
function updateSubs(dt) {
  const el = subtitleEl();
  const hidden = isCinematicActive();
  if (st.sub) {
    st.sub.left -= dt;
    if (st.sub.left <= 0) { st.sub = null; st.gapUntil = st.t + LINE_GAP; }
  }
  // a whole exchange about a stop far behind is no use any more
  while (st.subQueue.length && st.subQueue[0].s != null && !st.subQueue[0].started && st.ps > st.subQueue[0].s + STALE_AFTER) {
    const g = st.subQueue[0].grp;
    st.subQueue = st.subQueue.filter((q) => q.grp !== g);
  }
  if (!st.sub && st.subQueue.length && !hidden && st.t >= st.gapUntil) {
    const it = st.subQueue[0];
    let go = true;
    if (it.voice) {
      go = playLineVoice(it.voice.src, it.voice.dur, st.relaxed ? 'job' : 'mission');
      if (!go) {
        it.waited = (it.waited || 0) + dt;
        go = it.waited > VOICE_WAIT;
      }
    }
    if (go) {
      st.subQueue.shift();
      for (const q of st.subQueue) if (q.grp === it.grp) q.started = true;
      const dur = itemDur(it);
      st.sub = { ...it, left: dur };
      if (it.bubble) showBubble(it, dur);
      else {
        paintSpeaker(el.querySelector('.rv-speaker'), it.name);
        setDualText(el.querySelector('.rv-line'), it.text);
      }
    }
  }
  el.style.opacity = st.sub && !st.sub.bubble && !hidden ? '1' : '0';
}

// a tourist's bubble over the boat (scene3d.js world.extraSpeakers); its
// recording already plays through updateSubs, so the bubble stays silent
function showBubble(it, dur) {
  const w = st.world;
  const list = w.extraSpeakers || (w.extraSpeakers = []);
  if (st.bubble) st.bubble.speechUntil = 0;
  st.bubble = { x: st.boat.x, y: st.boat.y, h: 2.5, follow: st.boat, female: it.bubble.female, speechName: it.name, speechText: it.text, _voicedText: it.text, speechUntil: w.time + dur };
  list.push(st.bubble);
}

function touristReact(kind, chance = 1, after = false) {
  if (Math.random() > chance || st.t - (st.reactedAt || -99) < 12) return;
  st.reactedAt = st.t;
  sayLines([pick(TOURIST_REACT[kind])], { after });
}

const SHOUT_GAP = 7; // s of quiet after any line before chatter may follow
const EVENT_GAP = 3; // event lines (rams, crashes) interrupt, but not back to back
const ALWAYS = new Set(['appear', 'knock', 'sunk', 'after']);

function shout(kind, force = false) {
  const w = st.wiebe;
  if (!w) return;
  const since = st.t - w.shoutAt;
  if (!force && since < SHOUT_GAP) return;
  if (force && !ALWAYS.has(kind) && since < EVENT_GAP) return;
  w.shoutAt = st.t;
  w.nextChatAt = st.t + 11 + Math.random() * 7;
  say(WIEBE + ' (megafoon)', pick(SHOUT[kind]), '#ffcf4a', force);
}

// --- happiness ---------------------------------------------------------------------------

function scare(amount, msg) {
  const world = st.world;
  st.joy = Math.max(0, st.joy - amount);
  st.bumps++;
  st.lastBumpAt = st.t;
  if (msg && st.t - st.bumpMsgAt > 2.2) {
    st.bumpMsgAt = st.t;
    world.addMessage(`${msg} (toeristen -${Math.round(amount)})`, 2.6);
  }
}

function cheer(amount) {
  st.joy = Math.min(100, st.joy + amount);
  st.lastJoyAt = st.t;
}

function moodMessages(world) {
  const j = st.joy;
  const steps = [[60, 'De toeristen kijken nerveus naar de kant. Rustig aan, kaptein.'], [30, 'De toeristen zoeken de dichtstbijzijnde kade. Nog één klap en ze springen!']];
  for (const [lvl, text] of steps) {
    if (j < lvl && st.moodShown > lvl) { st.moodShown = lvl; world.addMessage(text, 3.2); }
  }
  if (j >= 75) st.moodShown = 100;
  else if (j >= 45 && st.moodShown < 60) st.moodShown = 60;
}

function boatVel(v) {
  return [Math.cos(v.angle) * v.speed + v.driftX, Math.sin(v.angle) * v.speed + v.driftY];
}

// Sudden velocity changes of the tour boat: quays, houseboats, piers, other
// boats and Wiebe's rams all show up here, the size of the jolt being the
// strength of the impact.
function checkBumps(world, driving) {
  const v = st.boat;
  const w = st.wiebe;
  let ram = 0;
  for (; st.contactCursor < vehicleContacts.head; st.contactCursor++) {
    if (vehicleContacts.head - st.contactCursor > vehicleContacts.cap) continue;
    const c = vehicleContacts.list[st.contactCursor % vehicleContacts.cap];
    if (!w || !((c.a === v && c.b === w.v) || (c.a === w.v && c.b === v))) continue;
    const n = c.a === v ? [c.nx, c.ny] : [-c.nx, -c.ny];
    const [pvx, pvy] = boatVel(v), [wvx, wvy] = boatVel(w.v);
    const mine = pvx * n[0] + pvy * n[1];
    const his = -(wvx * n[0] + wvy * n[1]);
    if (mine > his + 1 && c.impact > 2) {
      w.hull -= c.impact * 7;
      w.hitByPlayerAt = st.t;
    } else if (c.impact >= 1.5) {
      w.rammedAt = st.t;
      ram = Math.max(ram, c.impact);
    }
  }
  if (!driving || isCinematicActive()) { st.prevVel = null; return; }
  const vel = boatVel(v);
  let dv = 0;
  if (st.prevVel) dv = Math.hypot(vel[0] - st.prevVel[0], vel[1] - st.prevVel[1]);
  st.prevVel = vel;
  if (st.t - st.lastBumpAt < BUMP_COOLDOWN) return;
  if (ram > 0) {
    scare(clamp(2 + ram * 0.75, 2, 10), pick(BUMP_RAM));
  } else if (dv > BUMP_DV) {
    const amount = clamp((dv - 1.4) * 2.4, 2, 28);
    scare(amount, amount > 10 ? pick(BUMP_HARD) : pick(BUMP_SOFT));
    if (amount > 6) touristReact('bump', 0.6, true);
  }
}

function updateSights(dt, world, speed) {
  const v = st.boat;
  for (const q of st.sights) {
    if (q.done || q.gone) continue;
    if (st.ps > q.s + 20) { q.gone = true; continue; }
    if (st.ps < q.s - SIGHT_R - 10) continue;
    const d = Math.hypot(v.x - q.px, v.y - q.py);
    if (d > SIGHT_R) continue;
    if (st.relaxed || speed < SIGHT_SLOW) {
      q.hold += dt;
      if (q.hold >= SIGHT_HOLD) {
        q.done = true;
        sayLines(q.lines, { guide: true, s: q.s });
        const joy = st.relaxed && speed >= SIGHT_SLOW ? 1 : SIGHT_JOY;
        cheer(joy);
        world.addMessage(`Klik klik: de toeristen fotograferen ${q.name} (+${joy})`, 2.6);
      }
    } else if (!st.slowHintShown) {
      st.slowHintShown = true;
      world.addMessage(`Gas eraf bij ${q.name}: dan vertelt de gids en worden de toeristen vrolijker.`, 3.6);
    }
    break;
  }
}

// --- Schipper Wiebe ------------------------------------------------------------------------

function poseClear(map, v, x, y, a) {
  if (boatDryPoints(map, v, x, y, a) > 0) return false;
  const c = Math.cos(a), s = Math.sin(a);
  const h = v.model.len / 2 + 1.2, w = v.model.wid / 2 + 1.2;
  for (const [lx, ly] of [[h, 0], [-h, 0], [0, w], [0, -w], [h, w], [h, -w], [-h, w], [-h, -w]]) {
    const px = x + lx * c - ly * s, py = y + lx * s + ly * c;
    if (!inMapWater(map, px, py)) return false;
    if (map.buildingsNear(px, py, 1).some((b) => pointInPolygon(px, py, b.pts))) return false;
  }
  return true;
}

// Out of sight behind the player (well back along the canal, round a bend),
// on open water: he is heard before he is seen, and never pops up in view.
function spawnWiebe(world) {
  const map = world.map, p = st.boat;
  const probe = new Vehicle(0, 0, 0, WIEBE_MODEL);
  probe.isBoat = true;
  for (let back = WIEBE_SPAWN_BACK; back <= WIEBE_SPAWN_BACK + 80; back += 8) {
    const s = st.ps - back;
    if (s < 20) break;
    const q = routeAt(s);
    if (Math.hypot(q.x - p.x, q.y - p.y) < WIEBE_SPAWN_MIN_DIST) continue;
    for (const lat of [0, 1.5, -1.5]) {
      const x = q.x - Math.sin(q.a) * lat, y = q.y + Math.cos(q.a) * lat;
      if (!poseClear(map, probe, x, y, q.a)) continue;
      const v = new Vehicle(x, y, q.a, { ...WIEBE_MODEL });
      v.isBoat = true;
      v.scripted = true;
      v.driver = 'wiebe';
      v.speed = 6;
      world.vehicles.push(v);
      return { v, mode: 'chase', modeT: 0, hull: HULL_START, s, wi: q.i, shoutAt: -99, rammedAt: -99, hitByPlayerAt: -99, ramReadyAt: 0, stuckT: 0, reverseT: 0, crashAt: -99, blockAt: -99, out: false, outAt: 0 };
    }
  }
  return null;
}

function playerLat() {
  const p = st.boat;
  return (st.pi == null ? nearestOnRoute(p.x, p.y) : nearestOnRoute(p.x, p.y, st.pi - 4, st.pi + 6)).lat;
}

function setMode(w, mode) {
  w.mode = mode;
  w.modeT = 0;
}

function latClamp(map, s, lat) {
  const q = routeAt(s);
  const nx = -Math.sin(q.a), ny = Math.cos(q.a);
  for (const k of [lat, lat * 0.5, 0]) {
    const edge = k + Math.sign(k || 1) * 2.6;
    if (inMapWater(map, q.x + nx * edge, q.y + ny * edge)) return { x: q.x + nx * k, y: q.y + ny * k };
  }
  return { x: q.x, y: q.y };
}

// the fastest he can take the bends ahead with a boat's grip (v^2 = grip * R)
function cornerSpeed(s, top) {
  let v = top;
  for (const [from, span] of [[2, 20], [12, 24], [26, 30]]) {
    const turn = Math.abs(normalizeAngle(routeAt(s + from + span).a - routeAt(s + from).a));
    if (turn < 0.05) continue;
    const r = span / turn;
    v = Math.min(v, Math.sqrt(WIEBE_GRIP * 0.85 * r) + from * 0.12);
  }
  return clamp(v, 3.5, top);
}

function driveWiebe(dt, world, w, aim, vDes) {
  const v = w.v, map = world.map;
  const speed = v.speed;
  let steer = clamp(normalizeAngle(Math.atan2(aim.y - v.y, aim.x - v.x) - v.angle) * 1.8, -1, 1);
  let throttle = 0, brake = 0;
  if (w.reverseT > 0) {
    w.reverseT -= dt;
    throttle = -1;
    steer = -steer;
  } else if (speed < vDes - 0.3) throttle = 1;
  else if (speed > vDes + 0.6) brake = clamp((speed - vDes) / 3, 0.2, 1);
  // his sloep corners like any other boat: cap the yaw at the same lateral grip
  const s = Math.abs(speed);
  if (s > 1) {
    const yawMax = Math.min(s / (v.model.len * 1.25), v.model.turnRate, 16 / s);
    steer = clamp(steer, -1, 1) * Math.min(1, (WIEBE_GRIP / s) / yawMax);
  }
  const px = v.x, py = v.y, pa = v.angle;
  const before = boatVel(v);
  v.applyControls(dt, throttle, steer, brake);
  resolveVehicleBuildingCollision(v, map, dt);
  // the same shore rule as the player's boat (player.js driveVehicle)
  if (!keepBoatOffShore(map, v, px, py, pa)) {
    v.speed *= -0.25;
    v.driftX = 0; v.driftY = 0;
  }
  const after = boatVel(v);
  const dv = Math.hypot(after[0] - before[0], after[1] - before[1]);
  // only crashes the player baited him into count: going for a ram, or close behind
  const baited = w.mode === 'ram' || w.mode === 'block' || Math.hypot(st.boat.x - v.x, st.boat.y - v.y) < 30;
  if (dv > 3.5 && baited && st.t - w.crashAt > 1 && st.t - w.rammedAt > 0.4 && st.t - w.hitByPlayerAt > 0.4) {
    w.crashAt = st.t;
    w.hull -= clamp((dv - 2.5) * 6, 0, 60);
    if (w.hull > 0) shout('crash', true);
  }
  // wedged against a quay: back off and try again
  if (w.reverseT <= 0) {
    if (Math.abs(v.speed) < 0.6 && vDes > 2) w.stuckT += dt;
    else w.stuckT = 0;
    if (w.stuckT > 1.2) { w.stuckT = 0; w.reverseT = 1.1; }
  }
}

// --- H13's scenes: why Wiebe is angry, the bonk, the boarding, the build-up -------------

const SCENE_NAME = { W: WIEBE, G: 'Tammo', t: 'Tammo', A: 'Anita' };

// [key, text] lines -> cinematic lines with their recordings, back to back from `lead`
function sceneLines(list, lead = 0.4) {
  let t = lead;
  const lines = list.map(([k, text]) => {
    const v = voiceOf(SPEAKER[k] || k, text);
    const dur = Math.max(1.6, Math.min(4.2, 0.9 + text.length * 0.045), v ? v.dur + 0.25 : 0);
    const l = { speaker: SCENE_NAME[k] || k, text, at: t, dur, voice: v ? v.src : undefined };
    t += dur + 0.1;
    return l;
  });
  return { lines, total: t + 0.3 };
}

// boat-space (x forward, z to the side) to world
function onBoat(v, lx, lz) {
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  return { x: v.x + c * lx - s * lz, y: v.y + s * lx + c * lz };
}

// the tour boat from just off its bow, looking back over the benches to the helm
function tourBoatShot(v, u) {
  const L = v.model.len;
  const cam = onBoat(v, L / 2 + 2.2, lerpN(1.6, 0.6, u));
  const look = onBoat(v, -L / 2 + 1, 0);
  return { position: { x: cam.x, y: cam.y, z: 2.6 - u * 0.3 }, lookAt: { x: look.x, y: look.y, z: 1.2 }, fov: 50 };
}

// Wiebe in his sloep, close: the megaphone towards the camera
function wiebeShot(w, u, push = 0) {
  const v = w.v;
  const man = onBoat(v, -v.model.len * 0.22, 0);
  const cam = onBoat(v, -v.model.len * 0.22 + lerpN(4.2, 3.2 - push, u), 1.4);
  return { position: { x: cam.x, y: cam.y, z: 1.9 }, lookAt: { x: man.x, y: man.y, z: 1.45 }, fov: 42 };
}

const lerpN = (a, b, t) => a + (b - a) * clamp(t, 0, 1);

// One of H13's scenes: `wiebeFor` seconds on Wiebe, then the tour boat.
function playRvScene(world, list, { kicker = '', wiebeFor = 0, animate = null, onEnd = null } = {}) {
  const { lines, total } = sceneLines(list);
  const w = st.wiebe;
  return playCinematic({
    id: 'rondvaart-scene', priority: 3, duration: total, pause: true, letterbox: true, skippable: true, hideHud: true,
    kicker, cardFor: 1.6, lines,
    shot: (u, t) => {
      if (animate) animate(t);
      if (w && t < wiebeFor) return { ...wiebeShot(w, t / wiebeFor), cut: true };
      return { ...tourBoatShot(st.boat, (t - wiebeFor) / Math.max(1, total - wiebeFor)), cut: true };
    },
    onEnd: () => { if (onEnd) onEnd(); },
  });
}

// When Wiebe turns up: why he is after them (his boat, his paying tourists).
function playWhyScene(world) {
  const w = st.wiebe;
  const g = ensureDecor(w.v, 'rvWiebe', wiebeGroup);
  if (!g) return false;
  w.shoutAt = st.t;
  const first = sceneLines(RV_SCENES.why).lines[0];
  return playRvScene(world, RV_SCENES.why, {
    kicker: 'Schipper Wiebe', wiebeFor: first.at + first.dur + 0.1,
    animate: (t) => animateWiebe(g, w, st.t + Math.min(t, 2)),
  });
}

// Under the H.N. Werkmanbrug: BONK, then the guide carries on as if nothing happened.
function playBonkScene(world, w) {
  const g = ensureDecor(w.v, 'rvWiebe', wiebeGroup);
  if (!g) return false;
  const first = sceneLines(RV_SCENES.bonk).lines[0];
  return playRvScene(world, RV_SCENES.bonk, {
    kicker: 'H.N. Werkmanbrug', wiebeFor: first.at + first.dur + 0.3,
    animate: (t) => animateWiebe(g, w, w.outAt + Math.max(0, t - first.at - 0.9)),
    onEnd: () => { if (st) sayLines(RV_SCENES.resume, { guide: true }); },
  });
}

// The tour boat at its berth, Tammo and Tessa now aboard: from the water,
// drifting slowly along the hull so the whole boat and the quay show.
export function playRondvaartBoarding(world, boat, { queue = true } = {}) {
  if (!boat) return false;
  const map = world.map, a = boat.angle;
  const L = boat.model.len;
  // the open water side: away from the quay
  let side = 1;
  for (const s of [1, -1]) {
    const q = onBoat(boat, 0, s * 9);
    if (inMapWater(map, q.x, q.y)) { side = s; break; }
  }
  const board = () => {
    const p = world.player;
    if (p.inVehicle !== boat) { p.water = null; p.swimming = false; p.z = 0; p.enterVehicle(boat, world); }
    const c = world.companion;
    if (c && c.state !== 'dead' && c.inVehicle !== boat && !boat.passenger) { if (c.inVehicle) c.inVehicle.passenger = null; c.inVehicle = boat; boat.passenger = 'companion'; c.x = boat.x; c.y = boat.y; }
  };
  return playCinematic({
    id: 'rondvaart-boarding', priority: 3, duration: 4.2, pause: true, letterbox: true, skippable: true, hideHud: true, queue,
    kicker: 'De Spilsluizen', title: 'Alle toeristen aan boord',
    shot: (u) => {
      const k = u * u * (3 - 2 * u);
      const cam = onBoat(boat, lerpN(-L * 0.9, L * 0.35, k), side * lerpN(9.5, 7.5, k));
      const look = onBoat(boat, lerpN(-L * 0.2, L * 0.1, k), 0);
      return { position: { x: cam.x, y: cam.y, z: lerpN(3.6, 2.6, k) }, lookAt: { x: look.x, y: look.y, z: 1.1 }, fov: 48 };
    },
    onStart: board,
    onEnd: board,
  }) || (board(), false);
}

// The build-up to the kiss in the outro, at fixed points of the tour.
const MOMENTS = [
  { at: 0.22, key: 'glance' },
  { at: 0.6, key: 'hands', scene: true },
  { at: 0.86, key: 'later' },
];

function updateMoments(world) {
  const frac = st.ps / ROUTE_LENGTH;
  const m = MOMENTS[st.moment || 0];
  if (!m || frac < m.at || isCinematicActive()) return;
  const busy = st.wiebe && !st.wiebe.out && Math.hypot(st.wiebe.v.x - st.boat.x, st.wiebe.v.y - st.boat.y) < 60;
  // a guide's story or a chase takes precedence: the moment waits a little
  if ((busy || st.sub || st.subQueue.length) && frac < m.at + 0.06) return;
  st.moment = (st.moment || 0) + 1;
  const lines = RV_SCENES[m.key];
  if (m.scene && !busy && playDeckMoment(world, { boat: st.boat, lines: lines.map(([k, t]) => [k === 'A' ? 'A' : 'T', t]) })) return;
  sayLines(lines, { guide: true });
}

function knockOut(world, w, how) {
  w.out = how;
  w.outAt = st.t;
  st.wiebeGone = true;
  const near = Math.hypot(w.v.x - st.boat.x, w.v.y - st.boat.y) < 90;
  if (how === 'brug') {
    if (!(near && !isCinematicActive() && playBonkScene(world, w))) {
      shout('knock', true);
      world.addMessage(near ? 'BONK! Wiebe vergat te bukken onder de H.N. Werkmanbrug. Die is pas dertig jaar oud.' : 'In de verte: BONK. Wiebe vergat te bukken onder de H.N. Werkmanbrug.', 4.5);
    }
  } else {
    shout('sunk', true);
    world.addMessage('Wiebes sloep geeft de geest. Hij dobbert nog wat na, met z\'n megafoon als peddel.', 4.5);
  }
  world.audioEvents = world.audioEvents || [];
  world.audioEvents.push({ kind: 'impact', x: w.v.x, y: w.v.y, strength: 0.7 });
  cheer(10);
  w.afterAt = st.t + 6;
}

function updateWiebe(dt, world) {
  const w = st.wiebe;
  const v = w.v, p = st.boat, map = world.map;
  if (!world.vehicles.includes(v)) world.vehicles.push(v); // the boat population despawns far boats
  const tr = track(v.x, v.y, w.wi);
  w.wi = tr.i;
  w.s = tr.s;
  w.modeT += dt;
  if (w.out) {
    v.applyControls(dt, 0, 0, 0.35);
    if (w.afterAt && st.t > w.afterAt) { w.afterAt = 0; shout('after', true); }
    return;
  }
  if (w.hull <= 0 || v.wrecked) { knockOut(world, w, 'motor'); return; }
  if (w.s >= werkmanS - 1 && w.s <= werkmanS + 25) { knockOut(world, w, 'brug'); return; }

  const gap = st.ps - w.s; // > 0: player ahead
  const d = Math.hypot(p.x - v.x, p.y - v.y);
  const pSpeed = Math.abs(p.speed);
  const baseTop = WIEBE_MODEL.maxSpeed;
  // far behind and out of sight he catches up quicker: no teleports, just a heavier throttle hand
  v.model.maxSpeed = gap > 80 && d > 70 ? baseTop + Math.min(2.5, (gap - 80) / 30) : baseTop;
  const top = v.model.maxSpeed;
  const nextBridge = (bridgeS || []).find((b) => b > st.ps + 8 && b < werkmanS - 20);
  const bridgeAhead = nextBridge != null && nextBridge - st.ps < BRIDGE_CUTOFF_AHEAD;

  if (st.t > (w.nextChatAt || 0)) shout(d > 110 ? 'far' : 'chase');

  let aim, vDes;
  switch (w.mode) {
    case 'chase': {
      const look = 6 + Math.abs(v.speed) * 0.65;
      if (gap < -6) { setMode(w, 'block'); shout('block', true); break; }
      if (d < RAM_R && gap > -3 && gap < 30 && st.t >= w.ramReadyAt) { setMode(w, 'ram'); break; }
      if (st.t < w.ramReadyAt && d < 30 && bridgeAhead && st.t - w.blockAt > 14) {
        // overtake on the far side to cut the player off at the bridge
        const lat = tr.lat - clamp(playerLat(), -3, 3) > 0 ? 2 : -2;
        aim = latClamp(map, w.s + look, lat);
        vDes = top;
      } else if (st.t < w.ramReadyAt && gap < 18) {
        aim = latClamp(map, w.s + look, 0);
        vDes = Math.max(3, pSpeed * 0.95);
      } else {
        aim = latClamp(map, w.s + look, 0);
        vDes = cornerSpeed(w.s, top);
      }
      break;
    }
    case 'ram': {
      // go for the stern quarter on his own side: a shove that spins the
      // tour boat towards the quay, not a polite tap on the transom
      const [vx, vy] = boatVel(p);
      const lead = clamp(d / 9, 0.35, 1.3);
      const side = ((v.x - p.x) * -Math.sin(p.angle) + (v.y - p.y) * Math.cos(p.angle)) > 0 ? 1 : -1;
      const back = p.model.len * 0.3;
      aim = {
        x: p.x + vx * lead - Math.cos(p.angle) * back - Math.sin(p.angle) * side * 0.7,
        y: p.y + vy * lead - Math.sin(p.angle) * back + Math.cos(p.angle) * side * 0.7,
      };
      vDes = Math.min(top + 2, pSpeed + 7.5);
      w.ramClosest = Math.min(w.ramClosest ?? 99, d);
      if (st.t - w.rammedAt < 0.3 || w.modeT > RAM_MAX_T || gap < -8 || d > RAM_R + 14) {
        if (st.t - w.rammedAt < 0.3) shout('ram', true);
        else if ((w.ramClosest ?? 99) < 8 && st.t - st.lastBumpAt > 1.5) {
          cheer(4);
          world.addMessage('Gemist! Wiebe schiet voorbij. De toeristen juichen (+4)', 2.4);
        }
        w.ramReadyAt = st.t + RAM_COOLDOWN;
        w.ramClosest = 99;
        setMode(w, gap < -8 ? 'block' : 'backoff');
      }
      break;
    }
    case 'backoff':
      aim = latClamp(map, w.s + 12, -Math.sign(tr.lat || 1) * 1.5);
      vDes = Math.max(2, pSpeed * 0.55);
      if (w.modeT > 2.5) setMode(w, 'chase');
      break;
    case 'block': {
      // ahead of the player: sit on their line, slow them down, brake-check once
      w.blockAt = st.t;
      const pl = playerLat();
      aim = latClamp(map, w.s + 10, clamp(pl, -3, 3));
      vDes = Math.max(2.5, pSpeed * 0.85);
      if (gap > 6) { setMode(w, 'chase'); break; }
      if (w.modeT > BLOCK_MAX_T) {
        if (-gap < 14) { setMode(w, 'brake'); shout('brake', true); } else setMode(w, 'yield');
      }
      break;
    }
    case 'brake':
      aim = latClamp(map, w.s + 10, tr.lat);
      vDes = 0;
      if (w.modeT > 1.1) setMode(w, 'yield');
      break;
    case 'yield':
      aim = latClamp(map, w.s + 12, tr.lat > 0 ? 3 : -3);
      vDes = 2;
      if (gap > 8 || w.modeT > 4) { w.ramReadyAt = st.t + 2.5; setMode(w, 'chase'); }
      break;
    default:
      setMode(w, 'chase');
      aim = latClamp(map, w.s + 12, 0);
      vDes = top;
  }
  if (!aim) { aim = latClamp(map, w.s + 12, 0); vDes = cornerSpeed(w.s, top); }
  driveWiebe(dt, world, w, aim, vDes);
  if (d < MEGAPHONE_R) st.joy = Math.max(0, st.joy - MEGAPHONE_RATE * dt);
}

// --- per frame ---------------------------------------------------------------------------------

// Returns a failure reason, or null.
export function updateRondvaart(dt, world) {
  if (!st) return null;
  st.t += dt;
  const v = st.boat, p = world.player;
  const driving = p.inVehicle === v;
  if (driving) {
    const tr = track(v.x, v.y, st.pi);
    st.pi = tr.i;
    st.ps = Math.max(st.ps, tr.s);
  }
  checkBumps(world, driving);
  const speed = Math.abs(v.speed);

  if (driving) {
    if (!st.welcomed && !isCinematicActive()) {
      st.welcomed = true;
      sayLines(TOUR_WELCOME, { guide: true });
    }
    if (st.t > st.reactAt) {
      st.reactAt = st.t + 45 + Math.random() * 30;
      if (st.t - st.lastBumpAt > CALM_AFTER * 2 && (!st.wiebe || st.wiebe.out)) touristReact('calm');
    }
    if (st.cheerAt && st.t > st.cheerAt) {
      st.cheerAt = 0;
      world.addMessage('De toeristen zwaaien naar de terrassen. Vaar rustig, dan blijven ze blij.', 3.5);
    }
    updateSights(dt, world, speed);
    if (!st.relaxed) updateMoments(world);
    const calm = st.t - st.lastBumpAt > CALM_AFTER && (!st.wiebe || st.wiebe.out || Math.hypot(st.wiebe.v.x - v.x, st.wiebe.v.y - v.y) > 50);
    if (calm && st.joy < CALM_CAP) st.joy = Math.min(CALM_CAP, st.joy + CALM_RATE * dt);
  }

  if (!st.relaxed && !st.wiebe && !st.wiebeGone && driving && st.ps >= wiebeTriggerS() - 5) {
    st.wiebe = spawnWiebe(world);
    if (st.wiebe) {
      shout('appear', true);
      touristReact('wiebe', 1, true);
      world.addMessage('Achter je: Schipper Wiebe, de échte eigenaar, in z\'n sloep. Laat hem op een kade knallen of lok hem naar het museum: Wiebe bukt voor niemand.', 6);
      // a moment later, once his boat is in the world: the scene that says why
      st.whyAt = st.t + 1.5;
    }
  }
  if (st.whyAt && st.t > st.whyAt && st.wiebe && !st.wiebe.out && !isCinematicActive()) { if (playWhyScene(world) || st.t > st.whyAt + 5) st.whyAt = 0; }
  if (st.wiebe) updateWiebe(dt, world);

  if (!st.relaxed) moodMessages(world);
  updateSubs(dt);

  const tg = ensureDecor(v, 'rvTourists', touristGroup);
  if (tg) {
    tg.visible = decorVisible(v);
    seatTourists(tg);
    animateTourists(tg, st, st.t);
  }
  if (st.wiebe) {
    const wg = ensureDecor(st.wiebe.v, 'rvWiebe', wiebeGroup);
    if (wg) { wg.visible = decorVisible(st.wiebe.v); animateWiebe(wg, st.wiebe, st.t); }
  }

  if (st.relaxed) return null;
  if (st.joy <= 0) return 'de toeristen zijn gevlucht. Bij de eerste de beste kade sprongen ze aan wal';
  if (!driving && p.inVehicle && p.inVehicle.isBoat && Math.hypot(p.x - v.x, p.y - v.y) > 45) return 'je liet de toeristen gewoon op het water achter';
  return null;
}

// The relaxed tour's progress (sidejob_rondvaarttour.js): metres sailed,
// the route length, whether the guide is still talking.
export function rondvaartProgress() {
  if (!st) return null;
  return { s: st.ps, length: ROUTE_LENGTH, talking: !!st.sub || st.subQueue.length > 0, joy: st.joy, told: st.sights.filter((q) => q.done).length, stops: st.sights.length };
}

// Debug/test access.
export function getRondvaartDebug() {
  return st ? { st, PTS, CUM, bridgeS, werkmanS, ROUTE_LENGTH } : { PTS, CUM, ROUTE_LENGTH };
}
