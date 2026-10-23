import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { getTrains, routePoint, placeTrain, railZ, returnStolenTrains } from './railway.js';
import { isMissionActive, getActiveRace } from './missionquery.js';
import { isCinematicActive, playCinematic, skipCinematic } from './cinematics.js';
import { isShopOpen, openShopMenu, closeShopMenu } from './shopui.js';
import { recordStat, recordUnique, unlockAchievement } from './achievements.js';
import { saveGame } from './savehook.js';
import { manageTrafficPopulation, manageBikePopulation } from './vehicle.js';
import { spawnPedestriansNear } from './pedestrians.js';
import { isInWater } from './util.js';
import { buildingAt, withTiles } from './tileplace.js';
import { addStaticCollider } from './breakables.js';
import { VILLAGES } from './ommelandlines.js';
import { setStoryOutfit, storyOutfit } from './shops.js';
import { playerBusy } from './busy.js';
import { noteMoney } from './finance.js';
import { loopbaanTel, loopbaanPrijs } from './loopbaanlive.js';
import { kmPunten } from './loopbaan.js';

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
  'Door de warmte in de wissels rijdt deze trein iets bedachtzamer',
  'Seinstoring bij Haren. Of niet. Niemand die het precies weet',
  'Deze trein rijdt vandaag in omgekeerde volgorde. Voor de gezelligheid',
  'Het bistrorijtuig is dicht. Neem zelf een eierbal mee',
  'Let op: het stiltecoupé is vandaag het gezelligste coupé',
  'Machinist is nog even een bakkie doen, vertrek volgt',
];

let world = null;
let stations = [];
let fadeEl = null;
let trip = null;
let tripsDone = 0;
let lastArrival = null;
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

// A halt out in the country (map.countryStations): no city data round it, so
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
  s.machine = buildMachine(x, y, s.exitAngle);
  scene.add(s.machine);
  scene.add(buildPlatform(px, py, tx, ty, nx, ny));
  return s;
}

// A country halt's machine is first put beside the track without a look at what
// stands there. Once the tiles round it are in (prepareCountryStations, from
// ommelandfun.js) it steps further out, or to the other side of the track, when a
// building of the tiles stands on it.
function settleCountryStation(map, s) {
  if (!buildingAt(map, s.x, s.y, 1)) return;
  const nx = Math.cos(s.exitAngle), ny = Math.sin(s.exitAngle);
  // the track lies 7 m back along -n: further out on this side first, then past it
  for (const d of [3, 6, 9, 12, -14, -17, -20]) {
    const x = s.x + nx * d, y = s.y + ny * d;
    if (buildingAt(map, x, y, 1) || isInWater(map, x, y)) continue;
    if (d < 0) s.exitAngle += Math.PI;
    s.x = x; s.y = y;
    s.arrive = { x: x + Math.cos(s.exitAngle) * 3, y: y + Math.sin(s.exitAngle) * 3 };
    if (s.machine) { s.machine.position.set(x, 0, y); s.machine.rotation.y = -s.exitAngle + Math.PI / 2; }
    return;
  }
}

export async function prepareCountryStations(map) {
  for (const s of stations) {
    if (!s.country || s.settled) continue;
    s.settled = true;
    await withTiles(map, [[s.x, s.y]], () => settleCountryStation(map, s), { radius: 60, token: 'station', slice: 6 });
  }
}

// Concrete platform with a shelter beside a country halt: its top 0.76 m
// above the rails (RAIL_TOP 0.26), the edge 1.7 m from the track's centre,
// a ramp down at either end. Solid to walkers (a static collider).
const PLAT_LEN = 80, PLAT_W = 3.2, PLAT_OFF = 3.3, PLAT_TOP = 1.02, RAMP_LEN = 7;
function buildPlatform(px, py, tx, ty, nx, ny) {
  const g = new THREE.Group();
  g.position.set(px + nx * PLAT_OFF, 0, py + ny * PLAT_OFF);
  g.rotation.y = -Math.atan2(ty, tx);
  // local frame: x along the track, z away from it (the side the station is on)
  const side = Math.sign((-ty) * nx + tx * ny) || 1;
  const mat = new THREE.MeshLambertMaterial({ color: 0xa8a49a });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(PLAT_LEN, PLAT_TOP, PLAT_W), mat);
  slab.position.y = PLAT_TOP / 2;
  slab.receiveShadow = true;
  g.add(slab);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(PLAT_LEN, 0.02, 0.3), new THREE.MeshLambertMaterial({ color: 0xe8e2c8 }));
  edge.position.set(0, PLAT_TOP + 0.01, -side * (PLAT_W / 2 - 0.25));
  g.add(edge);
  const slope = Math.atan2(PLAT_TOP, RAMP_LEN), rl = Math.hypot(PLAT_TOP, RAMP_LEN);
  for (const e of [-1, 1]) {
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(rl, 0.2, PLAT_W - 0.6), mat);
    ramp.position.set(e * (PLAT_LEN / 2 + RAMP_LEN / 2), PLAT_TOP / 2 - 0.08, side * 0.3);
    ramp.rotation.z = -e * slope;
    ramp.receiveShadow = true;
    g.add(ramp);
  }
  const glass = new THREE.MeshLambertMaterial({ color: 0x9fb8c0, transparent: true, opacity: 0.45 });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(6, 0.12, 1.8), new THREE.MeshLambertMaterial({ color: 0x2d5fa8 }));
  const back = new THREE.Mesh(new THREE.BoxGeometry(6, 2.2, 0.05), glass);
  for (const [m, o, h] of [[roof, 0.9, PLAT_TOP + 2.35], [back, 1.4, PLAT_TOP + 1.12]]) {
    m.position.set(12, h, side * o);
    m.castShadow = true;
    g.add(m);
  }
  const cx = px + nx * PLAT_OFF, cy = py + ny * PLAT_OFF;
  // walkers only (base above the road): a level crossing may run past its ends
  addStaticCollider('perron', cx, cy, PLAT_W / 2, PLAT_LEN / 2 + RAMP_LEN * 0.4, Math.atan2(ty, tx), false, PLAT_TOP).base = 0.05;
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
  const scene = getScene() || { add() {} };
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
  if (playerBusy(w, ['mission', 'activeRace', 'missionPhase']).busy) return 'Niet nu: maak eerst je missie af';
  if (playerBusy(w, ['sideJob']).busy) return 'Niet nu: eerst je klusje afmaken';
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
  return { id: 'trein-' + s.short, x: s.x, y: s.y, h: 2.9, key: 'E', label: 'Met de trein', sub: why || `Kaartautomaat ${s.short}`, ring: true, dim: !!why };
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
  const price = loopbaanPrijs('trein', Math.max(4, Math.min(8, Math.round(3 + len / 900)))); // vaste reizigers krijgen korting (#381)
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
          desc: `${lineLabel(legs[0])} · ${spoor(here, legs[0])}${via}${VILLAGES[dest.name] ? ` · Te doen: ${VILLAGES[dest.name].teaser.toLowerCase()}` : ''}`,
          cols: [`${info.minutes} min`], verb: 'Instappen ·',
          route: { from: here.short, to: dest.short, minutes: info.minutes, text: `${lineLabel(legs[0])}, ${spoor(here, legs[0])}${via}.`, teaser: VILLAGES[dest.name] ? `Te doen: ${VILLAGES[dest.name].teaser.toLowerCase()}` : '', board },
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
      // onderduiken (r-trein): the villages out in the Ommeland first
      if (w.storyActivity === 'hideout') {
        const isVillage = (it) => !!VILLAGES[it.label];
        for (const it of trips) if (isVillage(it)) it.tag = 'Onderduiken';
        trips.sort((a, b) => isVillage(b) - isVillage(a));
        return [{ title: 'Vertrekken', note: 'Onderduiken: kies een dorp in het Ommeland, daar zoekt niemand jullie', items: trips }];
      }
      // only stations inside the map: the off-map ends of the lines aren't offered
      return [{ title: 'Snel reizen (kaartje)', note: `${board}. Een korte scène en je staat er. Zelf rijden? Loop naar een stilstaande trein, druk E en daarna G.`, items: trips }, { title: 'Als passagier meerijden', note: 'Je zit in de trein en ziet elke halte langskomen. Houd Spatie ingedrukt om naar je halte te springen.', items: rideItems(w, here) }];
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
  noteMoney('Reizen');
  w.money -= info.price;
  const first = legs[0], last = legs[legs.length - 1];
  const dirA = Math.sign(first.to.s - first.from.s) || 1;
  const A = sideOf(first.route, first.from.s, from.x, from.y);
  const arrive3 = arrivalShot(w, last, to);
  // the ride shot stays near the origin, where the city is already streamed in
  const midLeg = first;
  const midDir = dirA;
  const midS = first.from.s + dirA * Math.min(first.len * 0.4, 320);
  returnStolenTrains();
  const trains = [...new Set(legs.map((l) => l.train))];
  trip = { saved: trains.map(saveTrain), from, to, legs, info, phase: '' };
  // after the kraak (H6) they travel in black: on the train toilet they change back
  const change = !!storyOutfit();
  const tA = first.train, tB = midLeg.train;
  const halfA = tA.halfLen;
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
    return arrive3(t - SHOT_A - SHOT_B);
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

// The last shot of a trip (SHOT_C s): the train rolls into the destination
// platform, its head stopping short of the camera.
function arrivalShot(w, last, to) {
  const dirC = Math.sign(last.to.s - last.from.s) || 1;
  const C = sideOf(last.route, last.to.s, to.x, to.y);
  const tC = last.train, halfC = tC.halfLen;
  return (tt) => {
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
}

// --- meerijden: the whole ride, halte voor halte -------------------------------
// The train runs on railway.js's own physics (it stops at every halte on the
// way); the player sits in it, hidden, while the camera switches between the
// window, the side and a high shot. Hold Space to skip: a short arrival
// scene, then you step off at your halte.
const RIDE_VIEW_S = 24;
const RIDE_AVG_MS = 17; // average speed with the stops (a stoptrein tops out at 22 m/s), for the estimate
let ride = null;
let rideEl = null;

export function rideMinutes(leg) {
  const stops = Math.max(0, Math.abs(leg.to.idx - leg.from.idx) - 1);
  return Math.max(1, Math.round(leg.len / RIDE_AVG_MS / 60 + stops * 0.5));
}

function rideItems(w, here) {
  const out = [];
  for (const dest of stations) {
    if (dest === here) continue;
    const leg = directLeg(here, dest);
    if (!leg) continue;
    const info = tripInfo([leg]);
    const min = rideMinutes(leg);
    out.push({
      id: 'rit-' + dest.short, label: dest.name,
      desc: `${lineLabel(leg)} · ${spoor(here, leg)} · de hele rit, ongeveer ${min} min`,
      cols: [`${min} min`], verb: 'Meerijden ·',
      route: { from: here.short, to: dest.short, minutes: min, text: `${lineLabel(leg)}, ${spoor(here, leg)}. Houd Spatie ingedrukt om naar ${dest.short} te springen.`, teaser: '', board: '' },
      price: info.price, swatch: [leg.train.type === 'virm' ? '#ffc917' : '#00a3ad'],
      disabled: w.money < info.price ? 'Te weinig geld' : null,
      buy() {
        if (w.money < info.price) return null;
        closeShopMenu();
        startRide(w, here, dest, leg, info);
        return 'Instappen, een plekje bij het raam';
      },
    });
  }
  return out;
}

function rideBoard(text) {
  if (!rideEl && !text) return;
  if (!rideEl) {
    rideEl = document.createElement('div');
    rideEl.id = 'train-ride-board';
    rideEl.style.cssText = 'position:fixed;left:50%;bottom:13%;transform:translateX(-50%);z-index:15;pointer-events:none;'
      + 'padding:7px 16px;background:rgba(12,20,14,0.78);border-left:3px solid ' + BADGE_COLOR + ';color:' + CREAM + ';'
      + "font:18px 'Bebas Neue','Arial Narrow',Arial,sans-serif;letter-spacing:1.5px;text-align:center;white-space:nowrap;";
    document.body.appendChild(rideEl);
  }
  rideEl.style.display = text ? '' : 'none';
  if (rideEl.textContent !== text) rideEl.textContent = text || '';
}

function startRide(w, here, dest, leg, info) {
  w.money -= info.price;
  returnStolenTrains();
  const t = leg.train;
  const dir = Math.sign(leg.to.s - leg.from.s) || 1;
  const saved = saveTrain(t);
  // the train waits at the origin a moment, then railway.js runs it halte by halte
  Object.assign(t, { c: leg.from.s, v: 0, dir, state: 'dwell', target: leg.from.idx, timer: 4 });
  placeTrain(t);
  trip = { saved: [saved], from: here, to: dest, legs: [leg], info, ride: true };
  const minutes = rideMinutes(leg);
  ride = { t, leg, dir, toIdx: leg.to.idx, dest, start: w.time, view: -1, cam: null, arrived: false, minutes, lastStop: -1 };
  // routing and the traffic law see a passenger (roadaccess.js 'ov')
  w.trainCam = { angle: 0, speed: 0, z: 0, model: { len: 9, wid: 3 } };
  w.challengeHoldPlayer = true;
  const ok = playCinematic({
    id: 'train-ride', priority: 2, duration: minutes * 60 * 3 + 240, pause: false, letterbox: true, skippable: true, hideHud: true,
    kicker: 'Meerijden', title: `${lineLabel(leg)} · naar ${dest.short}`, cardFor: 3.5,
    shot: (u, tt) => rideShot(w, tt),
    onStart() {
      w.cinematicHidePlayers = true;
      const q = w.audioEvents || (w.audioEvents = []);
      q.push({ kind: 'train_horn', x: t.cars[0].x, y: t.cars[0].y });
    },
    onEnd() { endRide(w, !(ride && ride.arrived)); },
  });
  if (!ok) endRide(w, true);
}

function rideShot(w, tt) {
  const r = ride;
  if (!r) return null;
  const t = r.t;
  const stops = t.route.stops;
  if (!r.arrived && t.state === 'dwell' && t.target === r.toIdx) {
    r.arrived = true;
    // end the ride after this frame's cutscene update, not inside it
    queueMicrotask(() => { if (ride === r && isCinematicActive('train-ride')) skipCinematic(); });
  }
  // the board: the next halte, and a line when the train stands at one
  const atStop = t.state === 'dwell' && t.target !== r.leg.from.idx;
  if (atStop && t.target !== r.lastStop && t.target !== r.toIdx) {
    r.lastStop = t.target;
    w.addMessage(`Halte ${shortName(stops[t.target].name)}`, 2.5);
  }
  const next = stops[Math.max(0, Math.min(stops.length - 1, atStop ? t.target + r.dir : t.target))];
  const left = Math.max(1, Math.round(r.minutes - (w.time - r.start) / 60));
  rideBoard(`Volgende halte: ${shortName(next.name)}  ·  ${r.dest.short} over ${left} min  ·  Spatie ingedrukt houden: uitstappen bij ${r.dest.short}`);
  // the camera: a car in the middle of the train, cycling three views
  const car = t.cars[Math.floor(t.cars.length / 2)] || t.cars[0];
  const fx = Math.cos(car.angle) * t.dir, fy = Math.sin(car.angle) * t.dir;
  const nx = -fy, ny = fx;
  const z0 = car.z || 0;
  const view = Math.floor(tt / RIDE_VIEW_S) % 3;
  let pos, at;
  if (view === 0) { // by the window, looking out and a little ahead
    pos = { x: car.x + nx * 1.9 - fx * 2, y: car.y + ny * 1.9 - fy * 2, z: z0 + 2.5 };
    at = { x: car.x + nx * 40 + fx * 22, y: car.y + ny * 40 + fy * 22, z: z0 + 1.6 };
  } else if (view === 1) { // alongside, the whole train in the polder
    pos = { x: car.x + nx * 18 - fx * 16, y: car.y + ny * 18 - fy * 16, z: z0 + 6 };
    at = { x: car.x + fx * 10, y: car.y + fy * 10, z: z0 + 2 };
  } else { // high behind
    pos = { x: car.x - fx * 45 - nx * 22, y: car.y - fy * 45 - ny * 22, z: z0 + 32 };
    at = { x: car.x + fx * 35, y: car.y + fy * 35, z: z0 };
  }
  // per seconde, niet per beeld: de camera achter een trein van 22 m/s liep bij elke afwijkende beeldtijd een meter voor of achter (stotterend beeld, #436)
  const camDt = r.lastTT == null ? 0 : Math.max(0, Math.min(0.1, tt - r.lastTT));
  r.lastTT = tt;
  const camK = 1 - Math.exp(-camDt * 17);
  const cut = view !== r.view;
  if (cut || !r.cam) r.cam = { pos: { ...pos }, at: { ...at } };
  else for (const k of ['x', 'y', 'z']) { r.cam.pos[k] += (pos[k] - r.cam.pos[k]) * camK; r.cam.at[k] += (at[k] - r.cam.at[k]) * camK; }
  r.view = view;
  // the hidden player (and companion) ride along, clear of the track, so
  // the world streams round the train; the tiles follow it too
  setFocus(w, car.x + nx * 9, car.y + ny * 9);
  w.trainCam.angle = car.angle;
  w.trainCam.speed = t.v;
  if (w.map.follow) w.map.follow(car.x, car.y, { vx: fx * t.v, vy: fy * t.v }, 1.5);
  return { position: { ...r.cam.pos }, lookAt: { ...r.cam.at }, fov: view === 0 ? 62 : 52, cut };
}

function endRide(w, skipped) {
  const r = ride;
  ride = null;
  rideBoard('');
  w.challengeHoldPlayer = false;
  w.trainCam = null;
  if (!r || !trip) return;
  const rode = (w.time - r.start) / 60;
  trip.info = { ...trip.info, minutes: Math.max(1, Math.round(skipped ? Math.max(rode, r.minutes) : rode)), clockMinutes: skipped ? Math.max(0, r.minutes - rode) : 0 };
  // the arrival scene: skipped, the train rolls in (the rest of the time
  // passes); ridden to the end, it stands at the platform a moment
  const shot = arrivalShot(w, r.leg, r.dest);
  const dur = skipped ? SHOT_C : 2.4;
  const ok = playCinematic({
    id: 'train-arrive', priority: 3, duration: dur, pause: true, letterbox: true, skippable: true,
    kicker: 'Met de trein', title: `Aankomst ${r.dest.name}`, cardFor: 2,
    lines: [{ at: 0.3, dur: Math.min(2.2, dur - 0.4), speaker: '', text: `Welkom in ${r.dest.name}` }],
    shot: (u, tt) => {
      if (fadeEl) fadeEl.style.opacity = String(Math.max(0, skipped ? 1 - tt / FADE : 0, (tt - (dur - FADE)) / FADE));
      return shot(skipped ? tt : SHOT_C);
    },
    onStart() { w.cinematicHidePlayers = true; },
    onEnd() { arrive(w); },
  });
  if (!ok) arrive(w);
}

// The player is riding along in a train (meerijden).
export function isTrainRideActive() {
  return !!ride;
}

// A ride between two stations by name, as the menu starts it (dev panel,
// scripts/train_ride_test.mjs); false when there is no direct line.
export function startRideBetween(w, fromName, toName) {
  const here = stations.find((s) => s.name === fromName), dest = stations.find((s) => s.name === toName);
  const leg = here && dest && directLeg(here, dest);
  if (!leg || trip) return false;
  startRide(w, here, dest, leg, tripInfo([leg]));
  return true;
}

function arrive(w) {
  if (!trip) return;
  const { to, legs, info, saved, ride: rode } = trip;
  const last = legs[legs.length - 1];
  for (const s of saved) if (s.t !== last.train) restoreTrain(s);
  // the train you came with waits at the platform for a bit, then goes on
  const t = last.train, stops = last.route.stops, idx = last.to.idx;
  const dir = Math.sign(last.to.s - last.from.s) || 1;
  Object.assign(t, { c: last.to.s, v: 0, state: 'dwell', target: idx, timer: 14, dir: idx === 0 ? 1 : idx === stops.length - 1 ? -1 : dir });
  placeTrain(t);
  trip = null;
  lastArrival = { name: to.name, village: !!VILLAGES[to.name] };
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
  // a ride ran on the game clock; a skipped one adds what was left
  const clockMin = rode ? info.clockMinutes || 0 : info.minutes;
  if (typeof w.clock === 'number') w.clock = (w.clock + clockMin / 60) % 24;
  if (w.input) w.input.reset();

  try {
    manageTrafficPopulation(w);
    manageBikePopulation(w);
    w.pedestrians = w.pedestrians.filter((q) => q.state === 'dead' || Math.hypot(q.x - p.x, q.y - p.y) < 150);
    if (w.pedestrians.length < 45) w.pedestrians.push(...spawnPedestriansNear(w.map, p.x, p.y, 45 - w.pedestrians.length, Math.random));
  } catch (e) { console.warn(e); }

  recordStat(w, 'trainTrips');
  if (rode && !(info.clockMinutes > 0)) recordStat(w, 'trainRidesWatched');
  recordUnique(w, 'trainStations', to.name);
  loopbaanTel(w, 'trein', { ...kmPunten('trein', info.len), uniek: to.name });
  if (VILLAGES[to.name]) unlockAchievement(w, 'trein_dorp');
  w.addMessage(`Aangekomen in ${to.name}. Reistijd ${info.minutes} minuten, €${info.price} armer.`, 4);
  saveGame(w, { toast: false });
}

// Train trips finished this session (story.js: the "onderduiken" step).
export function getTrainTripCount() {
  return tripsDone;
}

// The station the last trip ended at (storyfun.js: onderduiken counts out in the Ommeland).
export function lastTrainArrival() {
  return lastArrival;
}

export function isTrainTripActive() {
  return !!trip;
}
