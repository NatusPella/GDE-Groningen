import { SMS_SAY } from './smsvoice.js';
import { lineVoiceFor, NARRATOR } from './linevoice.js';
import { playLineVoice } from './audio.js';
import { radioIsOn } from './radio.js';
import { STATION_NAME } from './musicpick.js';
import { isCinematicActive } from './cinematics.js';
import { getActiveRoute } from './routing.js';
import { getMissionDefs, isMissionCompleted } from './missions.js';
import { Pedestrian, isSpawnHidden, CITY_CENTRE } from './pedestrians.js';
import { isInsideBuilding, isOnRoad } from './pedgeom.js';
import { Vehicle, makeTwoWheeler } from './vehicle.js';
import { isInWater } from './util.js';
import {
  NICKNAMES, NICKNAME_BARKS, BIJNA_THUIS, KROLBRUG_FAULTS, KROLBRUG_SIGNS, RING_ZUID_GPS, KON_MINDER,
  COW_FEED, EVENT_DAYS, PLANTSOEN_BARKS, PLANTSOEN_NEWS, PEERD_NEWS, PEERD_BARKS, BIKE_RESURFACE,
  NACHTSTREEK, NACHTSTREEK_STORY, SUPPORTER_CHANTS,
} from './flavourlines.js';
import { KEYS } from './storagekeys.js';
import { L } from './worldframe.js';
import { isToday } from './calendarday.js';

// World flavour after docs/groningen-memes.md: nicknames, the Gerrit
// Krolbrug gag, Ring Zuid navigation, "Kon minder", the Noorderplantsoen in
// the sun, the commentary cows, event days, the wandering Peerd, cyclists
// taking priority, stolen bikes turning up again, night radio and Oosterpark
// chants. Owns world.flavour (read by flavour3d.js); reads story progress,
// stats, weather and the clock, and only ever adds bubbles, messages,
// parked props and a few extra walkers. Runs on a 0.25 s tick.

const SAVE_KEY = KEYS.flavour;
const TICK = 0.25;
export const KROLBRUG = { x: 839.38, y: -1861.7 };
export const PLANTSOEN = { x: 167.98, y: -707.09, r: 230 };
export const GROTE_MARKT = { x: 100.63, y: 76.18 };
export const OOSTERPARK = { x: 1697.87, y: -673.02 };
const EUROBORG = { x: 1797.64, y: 1457.41 };
const GRIEZE = NICKNAMES[0];

let world = null;
let F = null;
let tickT = 0;
let prevClock = null;
let ringPts = null;
const cd = {};
const ready = (k) => world.time >= (cd[k] || 0);
const hold = (k, s) => { cd[k] = world.time + s; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function load() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') || {}; } catch (e) { return {}; }
}
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ krol: F.krolPasses, night: F.night })); } catch (e) { /* private window */ }
}

export function initFlavour(w) {
  world = w;
  const s = load();
  F = w.flavour = {
    day: 0, night: s.night | 0, event: null, eventDay: -9, sunny: true,
    billboardStage: 0, plantsoen: false, plantsoenNewsDay: -1,
    krolPasses: s.krol | 0, krolInside: false, krolText: '',
    peerd: null,
    coaches: [], crowd: 0, farFromGrieze: false,
    stolen: null, resurface: null,
    lastChaosAt: 0, radioNight: -1,
  };
  F.krolText = KROLBRUG_FAULTS[Math.max(0, F.krolPasses - 1) % KROLBRUG_FAULTS.length];
  placePeerd();
  F.sunny = Math.random() < 0.7;
  F.billboardStage = storyStage();
  window.__flavour = debugApi;
}

// --- helpers ------------------------------------------------------------

function busy() {
  return isCinematicActive() || !!world.pendingRespawn || !!world.pigeonMode || !!world.heliRun;
}

// A recorded line in front of the player (radio, navigation, cows): false
// while another voice talks, so the caller can try again later.
function speak(speaker, text, radio = false) {
  const v = lineVoiceFor(speaker, text);
  if (!v) return true;
  return playLineVoice(v.src, v.dur, radio ? 'radio' : 'react');
}

function notify(from, text, opts = {}) {
  if (!world.phoneNotifications) world.phoneNotifications = [];
  world.phoneNotifications.push({ from, text, duration: 5, ...opts });
}

function placeName(x, y) {
  let best = null, bd = 700;
  for (const p of world.map.meta.neighbourhoodPoints || []) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bd) { bd = d; best = p.name; }
  }
  return best || 'Grunn';
}

function nearbyTalker(from, r = 22, not = null) {
  let best = null, bd = r;
  for (const p of world.pedestrians) {
    if (p === not || p.isCop || p.scene || p.state !== 'wander' || p.hideMesh) continue;
    if (p.speechText && world.time < p.speechUntil) continue;
    const d = Math.hypot(p.x - from.x, p.y - from.y);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

function bark(from, lines, r = 22, dur = 3.2) {
  const ped = nearbyTalker(from, r);
  if (!ped) return null;
  ped.speechText = typeof lines === 'string' ? lines : pick(lines);
  ped.speechUntil = world.time + dur;
  return ped;
}

// A bubble over the player, spoken in their own voice (recorded as the
// ~m / ~f bubble of that text in Tammo's / Tessa's voice).
function playerSays(text) {
  const p = world.player;
  if (!world.extraSpeakers) world.extraSpeakers = [];
  world.extraSpeakers.push({ x: p.x, y: p.y, h: 2.2, follow: p, female: p.character === 'anita', speechName: p.character === 'anita' ? 'Anita' : 'Tammo', speechText: text, speechUntil: world.time + 3.2 });
}

function inCar() {
  const v = world.player.inVehicle;
  return v && !v.isBike && !v.isBoat && !v.wrecked ? v : null;
}

function storyStage() {
  let n = 0;
  const defs = getMissionDefs() || [];
  for (let i = 0; i < defs.length; i++) if (isMissionCompleted(i)) n++;
  return n;
}

// --- update ---------------------------------------------------------------

export function updateFlavour(dt, w) {
  if (!F || !dt) return;
  world = w;
  tickT += dt;
  if (tickT < TICK) return;
  const step = tickT;
  tickT = 0;
  clockEdges();
  calendarEvent();
  cyclistsFirst();
  if (busy()) return;
  const p = w.player;
  if (ready('stage')) { hold('stage', 3); F.billboardStage = storyStage(); }
  nicknames(p);
  krolbrug(p);
  ringZuid(p);
  konMinder(p);
  plantsoen(p);
  cows(p);
  events(p, step);
  peerd(p);
  stolenBikes(p);
  nightRadio(p);
  oosterpark(p);
}

function clockEdges() {
  const c = world.clock;
  if (typeof c !== 'number') return;
  if (prevClock != null) {
    const crossed = (h) => (prevClock < h && c >= h) || (prevClock > c && (prevClock < h || c >= h));
    if (crossed(6)) newDay();
    if (crossed(20.5)) newNight();
  }
  prevClock = c;
}

function newDay() {
  F.day++;
  F.sunny = Math.random() < 0.6;
  F.peerdNews = !!F.peerd;
}

function newNight() {
  F.night++;
  placePeerd();
  save();
}

// --- nicknames and "bijna thuis" -------------------------------------------

function nicknames(p) {
  if (ready('nick') && Math.random() < 0.12) {
    for (const n of NICKNAMES) {
      if (d2(p, n) > (n === GRIEZE ? 190 : 140)) continue;
      if (bark(p, NICKNAME_BARKS[n.key])) hold('nick', 40 + Math.random() * 30);
      break;
    }
  }
  const dg = d2(p, GRIEZE);
  if (dg > 900) F.farFromGrieze = true;
  else if (F.farFromGrieze && dg < 260 && ready('thuis') && !world.mission) {
    F.farFromGrieze = false;
    hold('thuis', 240);
    playerSays(pick(BIJNA_THUIS));
  }
}

// --- Gerrit Krolbrug --------------------------------------------------------

function krolbrug(p) {
  const d = d2(p, KROLBRUG);
  if (d > 120) { F.krolInside = false; return; }
  if (F.krolInside || d > 50 || !ready('krol')) return;
  F.krolInside = true;
  hold('krol', 45);
  F.krolPasses++;
  F.krolText = KROLBRUG_FAULTS[(F.krolPasses - 1) % KROLBRUG_FAULTS.length];
  const car = inCar();
  notify('Gerrit Krolbrug', F.krolText, { voiced: car });
  if (car) speak('Verkeersinformatie', F.krolText);
  save();
}

export function krolLevel() {
  return Math.min(KROLBRUG_SIGNS.length - 1, Math.max(0, (F ? F.krolPasses : 0) - 1));
}

// --- Ring Zuid navigation -----------------------------------------------------

function ringPoints() {
  if (ringPts) return ringPts;
  ringPts = [];
  for (const r of world.map.roads) {
    if (!(r.name === 'Weg der Verenigde Naties' || r.name === 'Julianaweg' || (r.ref === 'N7' && r.cat === 'major' && L(r.pts[0][0], r.pts[0][1])[1] > 900))) continue;
    for (const q of r.pts) if (!ringPts.some((o) => Math.abs(o[0] - q[0]) + Math.abs(o[1] - q[1]) < 50)) ringPts.push(q);
  }
  return ringPts;
}

function ringZuid(p) {
  const v = inCar();
  if (!v || Math.abs(v.speed) < 5 || !ready('gps')) return;
  const [, ly] = L(p.x, p.y);
  if (ly < 800 || ly > 2300) return;
  if (!ringPoints().some((q) => Math.abs(q[0] - p.x) < 70 && Math.abs(q[1] - p.y) < 70)) return;
  if (Math.random() > (getActiveRoute() ? 0.3 : 0.1)) return;
  F.gpsIdx = ((F.gpsIdx ?? Math.floor(Math.random() * RING_ZUID_GPS.length)) + 1) % RING_ZUID_GPS.length;
  const line = RING_ZUID_GPS[F.gpsIdx];
  if (!speak('Navigatie', line)) return;
  world.addMessage(`Navigatie: “${line}”`, 4, { key: 'gps' });
  hold('gps', 150 + Math.random() * 90);
}

// --- Kon minder ---------------------------------------------------------------

function konMinder(p) {
  const at = world.lastPerfectRun;
  if (at == null || at === F.perfectSeen) return;
  if (world.time - at < 3) return;
  if (world.time - at > 40) { F.perfectSeen = at; return; }
  if (bark(p, KON_MINDER, 26)) F.perfectSeen = at;
}

// --- Noorderplantsoen at the first sun ---------------------------------------

function plantsoen(p) {
  const w = world.weather || {};
  const h = world.dayNight ? world.dayNight.hour : 12;
  const want = F.sunny && h > 10.5 && h < 20.5 && !w.active && (w.intensity || 0) < 0.05 && (w.wet || 0) < 0.2;
  const d = d2(p, PLANTSOEN);
  // the first minute of play belongs to the story, not to the news
  const started = typeof document !== 'undefined' && document.body.classList.contains('game-started');
  if (!started) F.newsFrom = null; else if (F.newsFrom == null) F.newsFrom = world.time + 60;
  // the park fills up (or empties) while you are not looking
  if (want !== F.plantsoen && (d > 260 || !F.plantsoenSet)) {
    const first = !F.plantsoenSet;
    F.plantsoen = want;
    F.plantsoenSet = true;
    // a park that is already full when the game starts is no news
    if (want && !first && started && world.time >= F.newsFrom && F.plantsoenNewsDay !== F.day && d < 1500) { F.plantsoenNewsDay = F.day; notify('Kiekdoar', PLANTSOEN_NEWS); }
  }
  if (F.plantsoen && d < PLANTSOEN.r && ready('plantsoen') && Math.random() < 0.1 && bark(p, PLANTSOEN_BARKS)) hold('plantsoen', 35 + Math.random() * 25);
}

// --- the commentary cows --------------------------------------------------------

function cows(p) {
  const s = world.stats;
  const cur = { wrecks: s.playerWrecks || 0, wanted: world.wanted, missions: s.missionsDone };
  const prev = F.cowPrev || cur;
  F.cowPrev = cur;
  let kind = null;
  if (cur.wrecks > prev.wrecks) kind = 'wreck';
  else if (cur.wanted >= 3 && prev.wanted < 3) kind = 'wanted';
  else if (cur.missions > prev.missions) kind = 'mission';
  const v = p.inVehicle || F.lastVeh;
  if (p.inVehicle) F.lastVeh = p.inVehicle;
  if (v && v.sinking && !v._cowSeen) { v._cowSeen = true; kind = 'water'; }
  if (kind && kind !== 'mission') F.lastChaosAt = world.time;
  if (!kind && world.time - F.lastChaosAt > 600 && world.time > 300 && Math.random() < 0.01) { kind = 'calm'; F.lastChaosAt = world.time; }
  if (!kind || !ready('cows') || Math.random() > 0.6) return;
  hold('cows', 200 + Math.random() * 120);
  const [cow, line] = pick(COW_FEED[kind]);
  notify('Kiekdoar · De Koeien', `${cow}: “${line}”`, { voiced: true });
  speak('Koe ' + cow, line);
}

// --- event days -------------------------------------------------------------------

// The event of the day comes from the game's calendar (calendar.js
// SPECIAL_DAYS id -> EVENT_DAYS key); the "Vandaag in Grunn" card is
// calendarday.js's, here only the Kiekdoar post.
const CALENDAR_EVENTS = [['ontzet', 'bommenberend'], ['bloemetjesmarkt', 'bloemetjesmarkt'], ['kei', 'keiweek']];
export function calendarEventKey(w = world) {
  for (const [id, key] of CALENDAR_EVENTS) if (isToday(id, w)) return key;
  return null;
}

function calendarEvent() {
  if (F.debugEvent) return;
  const want = calendarEventKey();
  if (want === F.event) return;
  if (want) startEvent(want, 25); else endEvent();
}

function startEvent(key, delay = 0) {
  if (!EVENT_DAYS[key]) return;
  if (F.event) endEvent();
  F.event = key;
  F.eventDay = F.day;
  F.announceAt = (world.time || 0) + delay;
}

function endEvent() {
  for (const c of F.coaches) if (c.v && c.v.parked && !c.v.driver) { const i = world.vehicles.indexOf(c.v); if (i >= 0) world.vehicles.splice(i, 1); }
  F.coaches = [];
  F.event = null;
}

function events(p, step) {
  const key = F.event;
  if (!key) return;
  const ev = EVENT_DAYS[key];
  if (F.announceAt != null && world.time >= F.announceAt) {
    F.announceAt = null;
    notify('Kiekdoar', ev.announce);
  }
  const centre = d2(p, CITY_CENTRE) < CITY_CENTRE.r + 80;
  if (centre && ready('evbark') && Math.random() < 0.12 && bark(p, ev.barks)) hold('evbark', 22 + Math.random() * 18);
  if (key === 'bloemetjesmarkt') coaches(p);
  if (key === 'keiweek') keiCrowd(p, centre || d2(p, PLANTSOEN) < PLANTSOEN.r);
}

const COACH_COLOURS = [['#f2efe6', '#d24a3a', '#2b3a55'], ['#e9e4d4', '#2f7a4f', '#1e2a38'], ['#f4f1ea', '#e0a526', '#383838'], ['#dfe6ee', '#3565a8', '#1a2230']];

function coachSpots() {
  if (F.coachSpots) return F.coachSpots;
  const out = [];
  const map = world.map;
  for (const r of map.roadsNear(GROTE_MARKT.x, GROTE_MARKT.y, 520)) {
    if ((r.cat !== 'major' && r.cat !== 'normal') || r.bridge || r.z || (r.width || 0) < 6.5 || r.roundabout) continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [ax, ay] = r.pts[i], [bx, by] = r.pts[i + 1];
      const len = Math.hypot(bx - ax, by - ay);
      if (len < 20) continue;
      const x = (ax + bx) / 2, y = (ay + by) / 2;
      const dc = Math.hypot(x - GROTE_MARKT.x, y - GROTE_MARKT.y);
      if (dc < 180 || dc > 560 || out.some((o) => Math.hypot(o.x - x, o.y - y) < 45)) continue;
      // half up on the kerb, so the lane stays open
      const tx = (bx - ax) / len, ty = (by - ay) / len;
      for (const side of [1, -1]) {
        const off = r.width / 2 + 0.7;
        const cx = x - ty * off * side, cy = y + tx * off * side;
        const body = [-6, 0, 6].flatMap((k) => [[cx + tx * k - ty * 1.3 * side, cy + ty * k + tx * 1.3 * side], [cx + tx * k, cy + ty * k]]);
        if (body.some(([qx, qy]) => isInsideBuilding(map, qx, qy) || isInWater(map, qx, qy))) continue;
        out.push({ x: cx, y: cy, angle: Math.atan2(ty, tx) });
        break;
      }
    }
  }
  // spread round the centre: the nearest spot in each of eight directions
  const pickd = [];
  for (let k = 0; k < 8; k++) {
    const dir = (k / 8) * Math.PI * 2 - Math.PI;
    let best = null, bd = 0.4;
    for (const o of out) {
      const a = Math.atan2(o.y - GROTE_MARKT.y, o.x - GROTE_MARKT.x);
      const da = Math.abs(Math.atan2(Math.sin(a - dir), Math.cos(a - dir)));
      if (da < bd) { bd = da; best = o; }
    }
    if (best && !pickd.includes(best)) pickd.push(best);
  }
  return (F.coachSpots = pickd);
}

function coaches(p) {
  if (d2(p, GROTE_MARKT) > 650) return;
  const spots = coachSpots();
  if (F.coaches.length < spots.length) F.coaches = spots.map((s, i) => ({ s, i, v: null }));
  for (const c of F.coaches) {
    if (c.v && (c.v.driver || !c.v.parked)) continue; // someone took the coach: it is theirs now
    if (c.v && world.vehicles.includes(c.v)) continue;
    if (Math.hypot(p.x - c.s.x, p.y - c.s.y) > 420 || !isSpawnHidden(world, c.s.x, c.s.y)) continue;
    const [color, stripe, accent] = COACH_COLOURS[c.i % COACH_COLOURS.length];
    const model = { name: 'bus', len: 12, wid: 2.5, maxSpeed: 22, accel: 4, brake: 11, turnRate: 1.0, color, stripe, accent };
    const v = new Vehicle(c.s.x, c.s.y, c.s.angle, model);
    v.isBus = true;
    v.road = null;
    v.speed = 0;
    v.parked = true;
    v.touringcar = true;
    c.v = v;
    world.vehicles.push(v);
  }
}

const KEI_SHIRTS = ['#e8742a', '#2a9fd8', '#d8c32a', '#c23b8e', '#3fbf6a'];

function keiCrowd(p, here) {
  let n = 0;
  for (const q of world.pedestrians) if (q.keiGroup && q.state !== 'dead') n++;
  F.crowd = n;
  if (!here || n >= 15 || !ready('kei')) return;
  hold('kei', 6);
  const map = world.map;
  for (let t = 0; t < 10; t++) {
    const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 45;
    const cx = p.x + Math.cos(a) * r, cy = p.y + Math.sin(a) * r;
    if (isInsideBuilding(map, cx, cy) || isInWater(map, cx, cy) || isOnRoad(map, cx, cy, 0.5) || !isSpawnHidden(world, cx, cy)) continue;
    const shirt = pick(KEI_SHIRTS);
    const k = 4 + Math.floor(Math.random() * 2);
    for (let i = 0; i < k; i++) {
      const ang = (i / k) * Math.PI * 2;
      const ped = new Pedestrian(cx + Math.cos(ang), cy + Math.sin(ang), ang + Math.PI);
      ped.clothing = shirt;
      ped.anchor = { x: cx, y: cy, r: 3 };
      ped.keiGroup = true;
      world.pedestrians.push(ped);
    }
    return;
  }
}

// --- Peerd van Ome Loeks --------------------------------------------------------------

// The statue stands on one fixed island, the roundabout of the H.W. Mesdagplein
// (the middle of its ring in the map): the same spot every night, in every build,
// whatever tiles are loaded (issue #172). scripts/peerd_test.mjs checks it is
// still the middle of a roundabout of citymap.json.
export const PEERD_SPOT = { x: -944.1, y: 377.6, angle: 0.6 };

function placePeerd() {
  F.peerd = { ...PEERD_SPOT };
}

function peerd(p) {
  if (!F.peerd) return;
  if (F.peerdNews) {
    F.peerdNews = false;
    const i = Math.floor(Math.random() * PEERD_NEWS.length);
    notify('Kiekdoar', PEERD_NEWS[i].replace('{w}', placeName(F.peerd.x, F.peerd.y)), { say: SMS_SAY.peerd.lines[i] });
  }
  if (d2(p, F.peerd) < 35 && ready('peerd') && Math.random() < 0.2 && bark(F.peerd, PEERD_BARKS, 30)) hold('peerd', 80);
}

// --- fietsers voorrang ------------------------------------------------------------------

// AI cars stop for a cyclist crossing just ahead of them, and the cyclist
// rides on as if the car were not there.
function cyclistsFirst() {
  const p = world.player;
  const vs = world.vehicles;
  let bikes = F.bikeBuf || (F.bikeBuf = []);
  bikes.length = 0;
  for (const b of vs) {
    if (b.isBike && b.road && b.driver !== 'player' && !b.wrecked && Math.abs(b.speed) > 1.2 && Math.abs(b.x - p.x) < 100 && Math.abs(b.y - p.y) < 100) bikes.push(b);
  }
  if (!bikes.length) return;
  for (const c of vs) {
    if (!c.road || c.isPolice || c.isBike || c.isScooter || c.isBoat || c.driver === 'player' || c.wrecked || c.sirenOn || c.aiOpts) continue;
    if (Math.abs(c.x - p.x) > 100 || Math.abs(c.y - p.y) > 100 || Math.abs(c.speed) < 0.5) continue;
    const fx = Math.cos(c.angle), fy = Math.sin(c.angle);
    for (const b of bikes) {
      const dx = b.x - c.x, dy = b.y - c.y;
      if (dx * dx + dy * dy > 150) continue;
      const fwd = dx * fx + dy * fy, lat = Math.abs(dy * fx - dx * fy);
      if (fwd < c.halfLen || fwd > c.halfLen + 8 || lat > 5) continue;
      if (Math.abs(Math.cos(b.angle - c.angle)) > 0.55) continue;
      c.waitTimer = Math.max(c.waitTimer || 0, 1.1);
      b.ignoreId = c.id;
      b.ignoreUntil = world.time + 1.6;
    }
  }
}

// --- stolen bikes turn up again ----------------------------------------------------------

function stolenBikes(p) {
  const v = p.inVehicle;
  if (v && v.isBike && !v.playerOwned && !v.missionCar && !v._fl_seen) {
    v._fl_seen = true;
    F.stolen = { v, from: placeName(p.x, p.y) };
  }
  const s = F.stolen;
  if (s && s.v !== v && !world.vehicles.includes(s.v) && !F.resurface) {
    F.resurface = { at: world.time + 120 + Math.random() * 180, from: s.from, tint: s.v.model && s.v.model.color };
    F.stolen = null;
  }
  const r = F.resurface;
  if (!r || world.time < r.at || world.mission) return;
  const map = world.map;
  for (let t = 0; t < 8; t++) {
    const a = Math.random() * Math.PI * 2, dist = 60 + Math.random() * 60;
    const q = map.nearestRoadPoint(p.x + Math.cos(a) * dist, p.y + Math.sin(a) * dist, 60, false, true);
    if (!q || q.road.cat === 'major') continue;
    const pts = q.road.pts;
    const ang = Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]);
    const off = (q.road.width || 4) / 2 + 0.8;
    const x = q.x - Math.sin(ang) * off, y = q.y + Math.cos(ang) * off;
    if (isInsideBuilding(map, x, y) || isInWater(map, x, y)) continue;
    const tint = r.tint && /^#[0-9a-f]{6}$/i.test(r.tint) ? parseInt(r.tint.slice(1), 16) : null;
    const b = makeTwoWheeler('bike', x, y, ang + Math.PI / 2, tint);
    b.parked = true;
    world.vehicles.push(b);
    const i = Math.floor(Math.random() * BIKE_RESURFACE.length);
    notify('Kiekdoar', BIKE_RESURFACE[i].replace('{a}', r.from).replace('{b}', placeName(x, y)), { say: SMS_SAY.bike.lines[i] });
    F.resurface = null;
    return;
  }
  r.at = world.time + 30;
}

// --- regional night radio: Rikus on G-Music when you drive outside the city at night ------

function outsideCity(p) {
  const b = world.map.meta.bounds;
  const [cx, cy] = [199.57, -2.95];
  return p.x < b[0] || p.x > b[2] || p.y < b[1] || p.y > b[3] || Math.hypot(p.x - cx, p.y - cy) > 3000;
}

function nightRadio(p) {
  const night = world.dayNight ? world.dayNight.night : 0;
  if (night < 0.6 || !radioIsOn() || !inCar() || !outsideCity(p) || !ready('radio') || world.mission) return;
  const first = F.radioNight !== F.night;
  // now and then Rikus has news from the story (a mission done, not said yet)
  const defs = getMissionDefs() || [];
  const news = Object.keys(NACHTSTREEK_STORY).find((id) => !(F.radioNews || (F.radioNews = new Set())).has(id) && defs.some((d, i) => d.id === id && isMissionCompleted(i)));
  const line = first ? NACHTSTREEK[0] : news && Math.random() < 0.5 ? NACHTSTREEK_STORY[news] : NACHTSTREEK[1 + ((F.radioIdx = ((F.radioIdx || 0) + 1)) % (NACHTSTREEK.length - 1))];
  if (!speak(NARRATOR, line, true)) return;
  if (news && line === NACHTSTREEK_STORY[news]) F.radioNews.add(news);
  F.radioNight = F.night;
  world.nowPlaying = { title: 'Nachtstreek', artist: 'Rikus · streekmuziek tot de ochtend', station: STATION_NAME, programme: 'Nachtstreek', at: world.time };
  world.addMessage(`Rikus op Nachtstreek: “${line}”`, 5, { key: 'radio' });
  hold('radio', 300 + Math.random() * 120);
}

// --- Oosterpark nostalgia ---------------------------------------------------------------

function oosterpark(p) {
  if (!(d2(p, OOSTERPARK) < 170 || d2(p, EUROBORG) < 230)) return;
  if (!ready('chant') || Math.random() > 0.15) return;
  const line = pick(SUPPORTER_CHANTS);
  const a = bark(p, line, 30, 3.4);
  if (!a) return;
  hold('chant', 25 + Math.random() * 20);
  const b = nearbyTalker(a, 6, a);
  if (b) { b.speechText = line; b.speechUntil = world.time + 3.4; }
}

// --- debug (window.__flavour) ------------------------------------------------------------

const debugApi = {
  get state() { return F; },
  event(k = 'bloemetjesmarkt') { F.debugEvent = !!k; if (k) startEvent(k, 0); else endEvent(); return F.event; },
  end() { endEvent(); },
  krol() { F.krolInside = false; cd.krol = 0; krolbrug({ x: KROLBRUG.x, y: KROLBRUG.y }); return F.krolText; },
  peerd() { F.night++; placePeerd(); F.peerdNews = true; return F.peerd; },
  sun(on = true) { F.sunny = on; F.plantsoenSet = false; },
  cows(kind = 'wreck') { cd.cows = 0; F.cowPrev = null; const [cow, line] = pick(COW_FEED[kind]); notify('Kiekdoar · De Koeien', `${cow}: “${line}”`, { voiced: true }); return speak('Koe ' + cow, line); },
  gps() { cd.gps = 0; const l = pick(RING_ZUID_GPS); world.addMessage(`Navigatie: “${l}”`, 4); return speak('Navigatie', l); },
  radio() { const l = pick(NACHTSTREEK); world.nowPlaying = { title: 'Nachtstreek', artist: 'Rikus · streekmuziek tot de ochtend', station: STATION_NAME, programme: 'Nachtstreek', at: world.time }; return speak(NARRATOR, l, true); },
  perfect() { world.lastPerfectRun = world.time - 3; },
};
