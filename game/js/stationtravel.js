import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { getTrains, routePoint, placeTrain, railZ, returnStolenTrains } from './railway.js';
import { isMissionActive, getActiveRace } from './missions.js';
import { isCinematicActive, playCinematic } from './cinematics.js';
import { isShopOpen, openShopMenu, closeShopMenu } from './shopui.js';
import { recordStat } from './achievements.js';
import { saveGame } from './savegame.js';
import { manageTrafficPopulation, manageBikePopulation } from './vehicle.js';
import { spawnPedestriansNear } from './pedestrians.js';
import { isInWater } from './util.js';
import { VILLAGES } from './ommelandlines.js';
import { setStoryOutfit, storyOutfit } from './shops.js';

// Fast travel by train between the on-map stations (map.stations): a ticket
// machine at each, a small menu, a short skippable ride cinematic.
const USE_RADIUS = 2.6;
const RAIL_CLEAR = 6;
const BADGE_COLOR = '#2d5fa8';
const CREAM = '#f2ede0';
const HUB = 'Groningen Hoofdstation';
const SHOT_A = 2.4, SHOT_B = 2.5, SHOT_C = 2.9;
const DURATION = SHOT_A + SHOT_B + SHOT_C;
const FADE = 0.28;
const CHANGE_LINE = 'Op het treintoilet: het zwart uit, hun eigen kleren weer aan';

const BOARD_LINES = [
  'Vertraging door een koe op het spoor',
  'Door herfstblaadjes op het spoor rijdt deze trein iets bedachtzamer',
  'Seinstoring bij Haren. Of niet. Niemand die het precies weet',
  'Deze trein rijdt vandaag in omgekeerde volgorde. Voor de gezelligheid',
  'Het bistrorijtuig is dicht. Neem zelf een eierbal mee',
  'Let op: het stiltecoupé is vandaag het gezelligste coupé',
  'Machinist is nog even een bakkie doen, vertrek volgt',
];
const OFFMAP_JOKES = {
  Zwolle: 'Daar begint het Westen al zowat',
  Winschoten: 'Het Oldambt valt net buiten de kaart',
  Leeuwarden: 'Friesland? Daar heb je een visum voor nodig',
  Roodeschool: 'Einde van de lijn, einde van de kaart',
  Delfzijl: 'Daar ruikt het naar zee en naar Eemshaven',
  Assen: 'Drenthe. Daar zijn ze nog rustiger dan hier',
};

let world = null;
let stations = [];
let fadeEl = null;
let trip = null;
let tripsDone = 0;
let iconUrl = null;

const shortName = (n) => n.replace(/^Groningen\s+/, '');

function drawTrainGlyph(g, r, color = CREAM, cut = BADGE_COLOR) {
  g.save();
  g.scale(r / 10, r / 10);
  g.fillStyle = color;
  g.beginPath();
  g.roundRect(-6, -8.5, 12, 14, 3);
  g.fill();
  g.fillStyle = cut;
  g.fillRect(-4.3, -6.3, 8.6, 4.6);
  g.beginPath();
  g.arc(-3.2, 2.2, 1.2, 0, Math.PI * 2);
  g.arc(3.2, 2.2, 1.2, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = color;
  g.lineWidth = 1.5;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-3.5, 6.5); g.lineTo(-6.5, 9.5);
  g.moveTo(3.5, 6.5); g.lineTo(6.5, 9.5);
  g.stroke();
  g.restore();
}

// Map marker: blue disc with a cream train (minimap, full map, legend).
export function drawStationMapIcon(ctx, s) {
  ctx.beginPath();
  ctx.arc(0, 0, 4.8 * s, 0, Math.PI * 2);
  ctx.fillStyle = BADGE_COLOR;
  ctx.fill();
  ctx.lineWidth = 1.2 * s;
  ctx.strokeStyle = '#0c140e';
  ctx.stroke();
  drawTrainGlyph(ctx, 3.2 * s);
}

export function getStationsForRender() {
  return stations;
}

function badgeCanvas(S) {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  g.beginPath(); g.arc(0, 0, S / 2 - S * 0.05, 0, Math.PI * 2);
  g.fillStyle = BADGE_COLOR; g.fill();
  g.lineWidth = S * 0.055; g.strokeStyle = CREAM; g.stroke();
  drawTrainGlyph(g, S * 0.3);
  return c;
}

function stationIcon() {
  if (!iconUrl) iconUrl = badgeCanvas(96).toDataURL();
  return iconUrl;
}

let badgeMat = null;
function badgeMaterial() {
  if (badgeMat) return badgeMat;
  const tex = new THREE.CanvasTexture(badgeCanvas(128));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  badgeMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: true });
  return badgeMat;
}

// A plain ticket machine: dark-blue cabinet, yellow front, lit screen.
function buildMachine(x, y, facing) {
  const group = new THREE.Group();
  group.position.set(x, 0, y);
  group.rotation.y = -facing + Math.PI / 2;
  const box = (w, h, d, color, px, py, pz, emissive) => {
    const mat = new THREE.MeshLambertMaterial({ color });
    if (emissive) { mat.emissive = new THREE.Color(emissive); mat.emissiveIntensity = 0.6; }
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(px, py, pz);
    m.castShadow = true;
    group.add(m);
    return m;
  };
  box(0.7, 1.75, 0.45, 0x1d3f73, 0, 0.875, 0);
  box(0.62, 1.1, 0.02, 0xe8c93a, 0, 0.95, 0.235);
  box(0.4, 0.28, 0.02, 0x9fd4ff, 0, 1.3, 0.25, 0x3a8ad0);
  box(0.16, 0.06, 0.03, 0x222222, 0, 0.82, 0.25);
  box(0.74, 0.14, 0.5, 0x2d5fa8, 0, 1.8, 0);
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 0.04, 20),
    new THREE.MeshLambertMaterial({ color: new THREE.Color(BADGE_COLOR), transparent: true, opacity: 0.8 }),
  );
  pad.position.set(0, 0.03, 0.75);
  group.add(pad);
  const badge = new THREE.Sprite(badgeMaterial());
  badge.scale.set(0.55, 0.55, 1);
  badge.position.y = 2.45;
  const phase = Math.random() * Math.PI * 2;
  badge.onBeforeRender = () => { badge.position.y = 2.45 + Math.sin(performance.now() / 650 + phase) * 0.06; };
  group.add(badge);
  return group;
}

function tangentAt(route, s) {
  const a = routePoint(route, s - 6), b = routePoint(route, s + 6);
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
}

function stopsFor(name) {
  const out = [];
  const seen = new Set();
  for (const t of getTrains()) {
    const r = t.route;
    if (seen.has(r)) continue;
    seen.add(r);
    const idx = r.stops.findIndex((s) => s.name === name);
    if (idx >= 0) out.push({ route: r, train: t, idx, s: r.stops[idx].s });
  }
  return out;
}

function railDist(map, x, y) {
  let best = Infinity;
  for (const r of map.rails || []) {
    const pts = r.pts;
    for (let i = 1; i < pts.length; i++) {
      const ax = pts[i - 1][0], ay = pts[i - 1][1], dx = pts[i][0] - ax, dy = pts[i][1] - ay;
      if (Math.min(ax, ax + dx) > x + best || Math.max(ax, ax + dx) < x - best || Math.min(ay, ay + dy) > y + best || Math.max(ay, ay + dy) < y - best) continue;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
      best = Math.min(best, Math.hypot(ax + dx * t - x, ay + dy * t - y));
    }
  }
  return best;
}

function freeSpot(map, qx, qy) {
  const [sx, sy] = map.escapeBuilding(qx, qy, 0.5);
  if (Math.hypot(sx - qx, sy - qy) > 0.2 || isInWater(map, sx, sy) || railDist(map, sx, sy) < RAIL_CLEAR) return null;
  return map.canWalkOut(sx, sy) ? { x: sx, y: sy } : null;
}

// First free, walkable spot clear of the tracks, from the station point
// outwards away from the platform: the forecourt when the point lies inside
// the station hall, the station square when it lies between the tracks.
function entranceSpot(map, x, y, px, py) {
  let ux = x - px, uy = y - py;
  const ul = Math.hypot(ux, uy);
  if (ul > 2) {
    ux /= ul; uy /= ul;
    for (let k = 0; k <= 60; k += 2) {
      const hit = freeSpot(map, x + ux * k, y + uy * k);
      if (hit) return hit;
    }
  }
  for (let r = 4; r <= 70; r += 3) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const hit = freeSpot(map, x + Math.cos(a) * r, y + Math.sin(a) * r);
      if (hit) return hit;
    }
  }
  return map.findOpenSpawn(x, y, 150);
}

// A halt out in the Ommelanden (countryreal.js): no city data round it, so
// the machine simply stands on the platform side a few metres off the track.
function placeCountryStation(def, stops, scene) {
  const st = stops[0];
  const [px, py] = routePoint(st.route, st.s);
  const [tx, ty] = tangentAt(st.route, st.s);
  let nx = -ty, ny = tx;
  if ((def.x - px) * nx + (def.y - py) * ny < 0) { nx = -nx; ny = -ny; }
  const x = px + nx * 7, y = py + ny * 7;
  const s = {
    name: def.name, short: shortName(def.name), x, y, stops, exitAngle: Math.atan2(ny, nx), country: true,
    arrive: { x: x + nx * 3, y: y + ny * 3 },
  };
  scene.add(buildMachine(x, y, s.exitAngle));
  scene.add(buildPlatform(px, py, tx, ty, nx, ny));
  return s;
}

// Low concrete platform with a shelter beside a country halt.
function buildPlatform(px, py, tx, ty, nx, ny) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xa8a49a });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(80, 0.55, 3.2), mat);
  slab.position.set(px + nx * 3.7, 0.27, py + ny * 3.7);
  slab.rotation.y = -Math.atan2(ty, tx);
  slab.receiveShadow = true;
  g.add(slab);
  const glass = new THREE.MeshLambertMaterial({ color: 0x9fb8c0, transparent: true, opacity: 0.45 });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(6, 0.12, 1.8), new THREE.MeshLambertMaterial({ color: 0x2d5fa8 }));
  const back = new THREE.Mesh(new THREE.BoxGeometry(6, 2.2, 0.05), glass);
  for (const [m, o, h] of [[roof, 4.6, 2.9], [back, 5.1, 1.7]]) {
    m.position.set(px + nx * o + tx * 12, h, py + ny * o + ty * 12);
    m.rotation.y = -Math.atan2(ty, tx);
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

function placeStation(map, def, scene) {
  const stops = stopsFor(def.name);
  if (!stops.length || !Number.isFinite(def.x)) return null;
  if (def.country) return placeCountryStation(def, stops, scene);
  const st = stops[0];
  const [px, py] = routePoint(st.route, st.s);
  const open = entranceSpot(map, def.x, def.y, px, py);
  if (!open) return null;
  let ex = open.x - px, ey = open.y - py;
  const el = Math.hypot(ex, ey) || 1;
  ex /= el; ey /= el;
  const exitAngle = Math.atan2(ey, ex);
  // arrivals step off a few metres further out, facing away from the tracks
  let arrive = null;
  for (const r of [3, 2, 4.5, 1.2]) {
    const [ax, ay] = map.escapeBuilding(open.x + ex * r, open.y + ey * r, 0.4);
    if (!isInWater(map, ax, ay) && Math.hypot(ax - open.x, ay - open.y) > 0.9 && railDist(map, ax, ay) > RAIL_CLEAR - 2) { arrive = { x: ax, y: ay }; break; }
  }
  const s = {
    name: def.name, short: shortName(def.name), x: open.x, y: open.y, stops, exitAngle,
    arrive: arrive || { x: open.x, y: open.y },
  };
  scene.add(buildMachine(s.x, s.y, exitAngle));
  return s;
}

export function initStationTravel(w) {
  world = w;
  const scene = getScene();
  const defs = (w.map.stations || []).concat((w.map.countryStations || []).map((d) => ({ ...d, country: true })));
  stations = defs.map((d) => placeStation(w.map, d, scene)).filter(Boolean);
  if (!fadeEl) {
    fadeEl = document.createElement('div');
    fadeEl.id = 'train-fade';
    fadeEl.style.cssText = 'position:fixed;inset:0;z-index:14;background:#0c140e;opacity:0;pointer-events:none;';
    document.body.appendChild(fadeEl);
  }
}

function blockReason(w) {
  if (w.wanted > 0) return 'Kaartje? Met die sterren boven je hoofd?';
  if (isMissionActive() || getActiveRace() || (w.mission && w.mission.phase === 'active')) return 'Niet nu: maak eerst je missie af';
  if (w.sideJob && w.sideJob.active) return 'Niet nu: eerst je klusje afmaken';
  return null;
}

function nearestStation(w) {
  const p = w.player;
  if (trip || w.pigeonMode || p.inVehicle || w.trainDriving || p.swimming || p.water) return null;
  let best = null, bd = USE_RADIUS;
  for (const s of stations) {
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

export function stationPrompt(w) {
  const s = nearestStation(w);
  if (!s) return null;
  const why = blockReason(w);
  return { id: 'trein-' + s.short, x: s.x, y: s.y, h: 2.9, key: 'E', label: 'Reizen met de trein', sub: why || `Kaartautomaat ${s.short}`, ring: true, dim: !!why };
}

export function stationSecondary(w) {
  if (trip || w.pigeonMode || w.player.inVehicle) return [];
  const { x, y } = w.player;
  const out = [];
  for (const s of stations) {
    if (Math.abs(s.x - x) > 22 || Math.abs(s.y - y) > 22) continue;
    out.push({ id: 'trein2-' + s.short, x: s.x, y: s.y, h: 2.3, label: 'Kaartautomaat', sub: 'Reizen met de trein: loop erheen en druk E', kind: 'place' });
  }
  return out;
}

// --- routes and prices -------------------------------------------------------

function directLeg(a, b) {
  let best = null;
  for (const sa of a.stops) {
    const sb = b.stops.find((x) => x.route === sa.route);
    if (!sb) continue;
    const leg = { route: sa.route, train: sa.train, from: sa, to: sb, len: Math.abs(sb.s - sa.s) };
    // the double-deck intercity looks best in the ride shot
    if (!best || (sa.train.type === 'virm' && best.train.type !== 'virm')) best = leg;
  }
  return best;
}

function planTrip(a, b) {
  const d = directLeg(a, b);
  if (d) return [d];
  const hub = stations.find((s) => s.name === HUB);
  if (!hub || hub === a || hub === b) return null;
  const l1 = directLeg(a, hub), l2 = directLeg(hub, b);
  return l1 && l2 ? [l1, l2] : null;
}

function tripInfo(legs) {
  const len = legs.reduce((n, l) => n + l.len, 0);
  const price = Math.max(4, Math.min(8, Math.round(3 + len / 900)));
  const minutes = Math.round(3 + len / 450) + (legs.length > 1 ? 4 : 0);
  return { len, price, minutes };
}

function lineLabel(leg) {
  const last = leg.route.stops[leg.to.idx > leg.from.idx ? leg.route.stops.length - 1 : 0].name;
  return `${leg.train.cfg.label} richting ${last}`;
}

function spoor(station, leg) {
  let n = station.name.length;
  for (const ch of leg.route.name) n += ch.charCodeAt(0);
  n %= 5;
  return `spoor ${n + 1}${n % 2 ? 'b' : ''}`;
}

function menuFor(w, here) {
  const board = BOARD_LINES[Math.floor(Math.random() * BOARD_LINES.length)];
  const offmap = new Map();
  for (const st of here.stops) {
    for (const stop of st.route.stops) if (stop.offmap && !offmap.has(stop.name)) offmap.set(stop.name, st);
  }
  return {
    type: 'station', icon: stationIcon(), color: BADGE_COLOR,
    name: `Kaartautomaat ${here.short}`,
    tagline: 'Inchecken met je ov-chipkaart. Of gewoon contant, we zijn in Grunn.',
    sections() {
      const trips = [];
      for (const dest of stations) {
        if (dest === here) continue;
        const legs = planTrip(here, dest);
        if (!legs) continue;
        const info = tripInfo(legs);
        const via = legs.length > 1 ? ` · overstappen op ${legs[0].to.route.stops[legs[0].to.idx].name.replace(/^Groningen\s+/, '')}` : '';
        trips.push({
          id: 'trein-' + dest.short, label: dest.name,
          desc: `${lineLabel(legs[0])} · ${spoor(here, legs[0])} · ${info.minutes} min${via}${VILLAGES[dest.name] ? ` · Te doen: ${VILLAGES[dest.name].teaser.toLowerCase()}` : ''}`,
          price: info.price, swatch: [legs[0].train.type === 'virm' ? '#ffc917' : '#00a3ad'],
          disabled: w.money < info.price ? 'Te weinig geld' : null,
          buy() {
            if (w.money < info.price) return null;
            closeShopMenu();
            startTrip(w, here, dest, legs, info, board);
            return 'Instappen, deuren sluiten';
          },
        });
      }
      const far = [...offmap.keys()].map((name) => ({
        id: 'ver-' + name, label: name, desc: OFFMAP_JOKES[name] || 'Daar houdt de kaart op',
        price: 0, swatch: ['#6b6f6a'], disabled: 'Buiten het speelgebied',
      }));
      const out = [{ title: 'Vertrekken', note: board, items: trips }];
      if (far.length) out.push({ title: 'Verder weg', items: far });
      return out;
    },
  };
}

// Runs before the shop/horeca/player E handlers.
export function tryStationInteract(w) {
  const input = w.input;
  if (!input || isShopOpen() || isCinematicActive() || w.pigeonMode || trip) return false;
  if (!(input.wasPressed('e') || input.wasPressed('f'))) return false;
  const s = nearestStation(w);
  if (!s) return false;
  input.consume('e');
  input.consume('f');
  const why = blockReason(w);
  if (why) { w.addMessage(why, 2.8); return true; }
  openShopMenu(w, menuFor(w, s));
  return true;
}

// --- the ride ----------------------------------------------------------------

const W3 = (x, y, z) => ({ x, y, z });
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c); };

function saveTrain(t) {
  return { t, c: t.c, v: t.v, dir: t.dir, target: t.target, state: t.state, timer: t.timer };
}

function restoreTrain(s) {
  Object.assign(s.t, { c: s.c, v: s.v, dir: s.dir, target: s.target, state: s.state, timer: s.timer });
  placeTrain(s.t);
}

function poseTrain(t, c, dir) {
  t.c = c;
  t.dir = dir;
  t.state = 'run';
  placeTrain(t);
}

function sideOf(route, s, x, y) {
  const [tx, ty] = tangentAt(route, s);
  const [px, py] = routePoint(route, s);
  const nx = -ty, ny = tx;
  const k = (x - px) * nx + (y - py) * ny >= 0 ? 1 : -1;
  return { tx, ty, nx: nx * k, ny: ny * k, px, py };
}

function setFocus(w, x, y) {
  w.player.x = x;
  w.player.y = y;
  const c = w.companion;
  if (c && !c.inVehicle) { c.x = x; c.y = y; }
}

function startTrip(w, from, to, legs, info, board) {
  w.money -= info.price;
  const first = legs[0], last = legs[legs.length - 1];
  const dirA = Math.sign(first.to.s - first.from.s) || 1;
  const dirC = Math.sign(last.to.s - last.from.s) || 1;
  const A = sideOf(first.route, first.from.s, from.x, from.y);
  const C = sideOf(last.route, last.to.s, to.x, to.y);
  // the ride shot stays near the origin, where the city is already streamed in
  const midLeg = first;
  const midDir = dirA;
  const midS = first.from.s + dirA * Math.min(first.len * 0.4, 320);
  returnStolenTrains();
  const trains = [...new Set(legs.map((l) => l.train))];
  trip = { saved: trains.map(saveTrain), from, to, legs, info, phase: '' };
  // after the kraak (H6) they travel in black: on the train toilet they change back
  const change = !!storyOutfit();
  const tA = first.train, tB = midLeg.train, tC = last.train;
  const halfA = tA.halfLen, halfC = tC.halfLen;
  const lines = [
    { at: 0.4, dur: 2.0, speaker: '', text: `${lineLabel(first)} vertrekt van ${spoor(from, first)}` },
    { at: SHOT_A + 0.3, dur: 2.1, speaker: '', text: change ? CHANGE_LINE : legs.length > 1 ? `Overstappen op ${HUB}` : board },
    { at: SHOT_A + SHOT_B + 0.3, dur: 2.1, speaker: '', text: `Welkom in ${to.name}` },
  ];

  const shot = (u, t) => {
    const fadeIn = Math.min(1, t / FADE);
    let fade = 1 - fadeIn;
    // after a cut the screen stays dark a moment while the new spot streams in
    for (const [cut, hold] of [[SHOT_A, 0.2], [SHOT_A + SHOT_B, 0.45]]) {
      const d = t < cut ? (cut - t) / FADE : Math.max(0, t - cut - hold) / 0.35;
      fade = Math.max(fade, 1 - Math.min(1, d));
    }
    if (t > DURATION - FADE) fade = Math.max(fade, (t - (DURATION - FADE)) / FADE);
    if (fadeEl) fadeEl.style.opacity = String(fade);

    if (t < SHOT_A) {
      // pulling out of the origin platform, seen from the platform edge
      const k = Math.max(0, t - 0.7);
      poseTrain(tA, first.from.s + dirA * 0.5 * 4.5 * k * k, dirA);
      setFocus(w, A.px + A.nx * 5, A.py + A.ny * 5);
      const q = t / SHOT_A;
      const cs = first.from.s + dirA * lerp(-halfA * 0.1, halfA * 0.1, q);
      const [cx, cy] = routePoint(first.route, cs);
      const [lx, ly] = routePoint(first.route, first.from.s + dirA * (halfA + 40));
      return { position: W3(cx + A.nx * 6.2, cy + A.ny * 6.2, 2.4 + railZ(cx, cy)), lookAt: W3(lx + A.nx * 1.5, ly + A.ny * 1.5, 2.2 + railZ(lx, ly)), fov: 55, cut: true };
    }
    if (t < SHOT_A + SHOT_B) {
      // exterior: a calm side-on tracking shot through the countryside
      const tt = t - SHOT_A;
      const c = midS + midDir * 20 * tt;
      poseTrain(tB, c, midDir);
      const S = sideOf(midLeg.route, c, from.x, from.y);
      setFocus(w, S.px, S.py);
      const back = lerp(22, 12, smooth(tt / SHOT_B));
      const px = S.px - S.tx * midDir * back + S.nx * 26, py = S.py - S.ty * midDir * back + S.ny * 26;
      const z = railZ(S.px, S.py);
      return { position: W3(px, py, 11 + z), lookAt: W3(S.px + S.tx * midDir * 10, S.py + S.ty * midDir * 10, 2.5 + z), fov: 50, cut: true };
    }
    // rolling into the destination platform, the head stopping short of the camera
    const tt = t - SHOT_A - SHOT_B;
    const stopAt = SHOT_C - 0.5;
    const rem = Math.max(0, stopAt - tt);
    const decel = 7;
    const cC = last.to.s - dirC * 0.5 * decel * rem * rem;
    poseTrain(tC, cC, dirC);
    setFocus(w, C.px + C.nx * 5, C.py + C.ny * 5);
    const K = sideOf(last.route, last.to.s + dirC * (halfC + 30), to.x, to.y);
    const [hx, hy] = routePoint(last.route, cC + dirC * (halfC - 10));
    return { position: W3(K.px + K.nx * 4.6, K.py + K.ny * 4.6, 2.3 + railZ(K.px, K.py)), lookAt: W3(hx, hy, 2.2 + railZ(hx, hy)), fov: 50, cut: true };
  };

  const ok = playCinematic({
    id: 'train-travel', priority: 3, duration: DURATION, pause: true, letterbox: true, skippable: true,
    kicker: 'Met de trein', title: `Naar ${to.name}`, cardFor: 2.2, lines, shot,
    onStart() {
      w.cinematicHidePlayers = true;
      if (change) setStoryOutfit(null);
      const q = w.audioEvents || (w.audioEvents = []);
      q.push({ kind: 'train_horn', x: A.px, y: A.py });
    },
    onEnd() { arrive(w); },
  });
  if (!ok) { if (change) setStoryOutfit(null); arrive(w); }
}

function arrive(w) {
  if (!trip) return;
  const { to, legs, info, saved } = trip;
  const last = legs[legs.length - 1];
  for (const s of saved) if (s.t !== last.train) restoreTrain(s);
  // the train you came with waits at the platform for a bit, then goes on
  const t = last.train, stops = last.route.stops, idx = last.to.idx;
  const dir = Math.sign(last.to.s - last.from.s) || 1;
  Object.assign(t, { c: last.to.s, v: 0, state: 'dwell', target: idx, timer: 14, dir: idx === 0 ? 1 : idx === stops.length - 1 ? -1 : dir });
  placeTrain(t);
  trip = null;
  tripsDone++;
  if (fadeEl) fadeEl.style.opacity = '0';

  const p = w.player;
  p.x = to.arrive.x; p.y = to.arrive.y;
  p.angle = to.exitAngle;
  p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0; p.gz = 0;
  p.inVehicle = null; p.water = null; p.swimming = false; p.climb = null;
  const c = w.companion;
  if (c && c.state !== 'dead') {
    if (c.inVehicle) { c.inVehicle.passenger = null; c.inVehicle = null; }
    let spot = null;
    for (const side of [1, -1, 2]) {
      const a = to.exitAngle + side * Math.PI / 2;
      const [cx, cy] = w.map.escapeBuilding(p.x + Math.cos(a) * 1.1, p.y + Math.sin(a) * 1.1, 0.3);
      if (!isInWater(w.map, cx, cy)) { spot = [cx, cy]; break; }
    }
    [c.x, c.y] = spot || [p.x, p.y];
    c.vx = 0; c.vy = 0; c.z = 0; c.vz = 0; c.angle = to.exitAngle;
    c.water = null; c.swimming = false; c.climb = null;
  }
  w.cinematicHidePlayers = false;
  w.cameraOverride = null;
  // no new-wijk flyover straight after the train cutscene
  w.quietUntil = Math.max(w.quietUntil || 0, w.time + 60);
  if (typeof w.clock === 'number') w.clock = (w.clock + info.minutes / 60) % 24;
  if (w.input) w.input.reset();

  try {
    manageTrafficPopulation(w);
    manageBikePopulation(w);
    w.pedestrians = w.pedestrians.filter((q) => q.state === 'dead' || Math.hypot(q.x - p.x, q.y - p.y) < 150);
    if (w.pedestrians.length < 45) w.pedestrians.push(...spawnPedestriansNear(w.map, p.x, p.y, 45 - w.pedestrians.length, Math.random));
  } catch (e) { console.warn(e); }

  recordStat(w, 'trainTrips');
  w.addMessage(`Aangekomen in ${to.name}. Reistijd ${info.minutes} minuten, €${info.price} armer.`, 4);
  saveGame(w, { toast: false });
}

// Train trips finished this session (story.js: the "onderduiken" step).
export function getTrainTripCount() {
  return tripsDone;
}

export function isTrainTripActive() {
  return !!trip;
}
