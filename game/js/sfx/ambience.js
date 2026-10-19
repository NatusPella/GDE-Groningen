import { clamp, pointInPolygon } from '../util.js';
import { getScene } from '../scene3d.js';
import { edgeDistance, parcelAt, MAAR_WATER } from '../countryfield.js';
import { urbanWeight } from '../provinceworld.js';
import { trunksNear } from '../countrywalls.js';
import { rand as rnd } from '../rng.js';

// Place-aware ambience: looping beds crossfaded by where/when the listener
// is, scheduled ambient events (birds, gulls, clinks, thunder), the
// Martinitoren carillon + hour strikes, animal calls and the street reverb.

let K = null;
const SCAN_EVERY = 0.5;
const BED_STOP_AFTER = 4;

const place = {
  green: 0, trees: 0, treePts: [], waterD: Infinity, waterX: 0, waterY: 0,
  square: 0, horeca: 0, horecaPts: [], density: 0, open: 0, traffic: 0, peds: 0, rural: 0,
};
export function getPlace() { return place; }

const beds = {};
const BED_DEFS = {
  city: { buf: 'bed_city' },
  wind: { buf: 'bed_wind', filter: true },
  rain: { buf: 'bed_rain', filter: true },
  roof: { buf: 'bed_roof' },
  crowd: { buf: 'bed_crowd' },
  terrace: { buf: 'bed_terrace' },
  crickets: { buf: 'bed_crickets' },
  lap: { buf: 'bed_lap', positional: true },
};

let scanTimer = 0;
let horecaGrid = null;
const HORECA_CELL = 40;
let landmarks = null;
let timers = null;
const queue = [];
let lastHour = null;
let lastFlash = 0;
let lastFlashAt = -1e9;
let nextRandomThunder = 0;
const animalNext = new WeakMap();
const animalSpeed = new WeakMap();

function now() { return K.ctx.currentTime; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function later(delay, fn) {
  if (queue.length > 64) return;
  queue.push({ t: now() + delay, fn });
}

function runQueue() {
  const t = now();
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i].t > t) continue;
    const it = queue[i];
    queue.splice(i, 1);
    it.fn();
  }
}

export function initAmbience(kit, world) {
  K = kit;
  const ctx = K.ctx;
  for (const [key, d] of Object.entries(BED_DEFS)) {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    let tail = gain, filter = null, panner = null;
    if (d.positional) {
      panner = K.makePanner({ ref: 6, rolloff: 1.2, model: 'equalpower' });
      gain.connect(panner);
      tail = panner;
    }
    tail.connect(K.buses.amb);
    if (d.filter) {
      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 12000;
      filter.connect(gain);
    }
    beds[key] = { ...d, gain, filter, panner, src: null, level: 0, target: 0, quietFor: 0, fresh: true };
  }
  K.bank.warm(Object.values(BED_DEFS).map((d) => d.buf));

  const meta = world.map.meta || {};
  const find = (name) => (meta.landmarks || []).find((l) => l.name === name) || null;
  landmarks = {
    tower: find('Martinitoren'),
    aa: find('Der Aa-kerk'),
    squares: ['Grote Markt', 'Vismarkt'].map(find).filter(Boolean),
    vismarkt: find('Vismarkt'),
  };
  horecaGrid = new Map();
  for (const h of meta.horeca || []) {
    const k = Math.floor(h.x / HORECA_CELL) + ',' + Math.floor(h.y / HORECA_CELL);
    let arr = horecaGrid.get(k);
    if (!arr) { arr = []; horecaGrid.set(k, arr); }
    arr.push(h);
  }
  timers = { bird: rnd(1, 4), gull: rnd(4, 10), clink: rnd(2, 6), animals: 0 };
  lastHour = world.dayNight ? world.dayNight.hour : null;
}

function startBed(b) {
  const buffer = K.bank.get(b.buf);
  if (!buffer) return;
  const src = K.ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.connect(b.filter || b.gain);
  src.start(now(), Math.random() * buffer.duration);
  b.src = src;
}

function stopBed(b) {
  if (!b.src) return;
  try { b.src.stop(); } catch (e) { /* already stopped */ }
  b.src.disconnect();
  b.src = null;
}

function driveBeds(dt) {
  const t = now();
  for (const key in beds) {
    const b = beds[key];
    if (b.target > 0.002 && !b.src) startBed(b);
    const rate = b.target > b.level ? 0.7 : 0.45;
    b.level += (b.target - b.level) * Math.min(1, dt * rate);
    if (b.level < 0.0015 && b.target <= 0.002) {
      b.level = 0;
      b.quietFor += dt;
      if (b.quietFor > BED_STOP_AFTER) stopBed(b);
    } else b.quietFor = 0;
    b.gain.gain.setTargetAtTime(b.src ? b.level : 0, t, 0.08);
  }
}

// --- place analysis -----------------------------------------------------

function nearestWater(map, x, y) {
  let best = Infinity, bx = x, by = y;
  for (const w of map.waterNear(x, y, 45)) {
    const [minx, miny, maxx, maxy] = w.bounds;
    if (x >= minx && x <= maxx && y >= miny && y <= maxy && pointInPolygon(x, y, w.pts)) return { d: 0, x, y };
    const pts = w.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i][0], ay = pts[i][1], dx = pts[i + 1][0] - ax, dy = pts[i + 1][1] - ay;
      const l2 = dx * dx + dy * dy;
      const u = l2 > 1e-9 ? clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1) : 0;
      const px = ax + dx * u, py = ay + dy * u, d = Math.hypot(px - x, py - y);
      if (d < best) { best = d; bx = px; by = py; }
    }
  }
  return { d: best, x: bx, y: by };
}

function scan(world) {
  const map = world.map;
  const p = world.player;
  const src = p.inVehicle || p;
  const x = src.x, y = src.y;

  let green = 0;
  for (const g of map.greenNear(x, y, 25)) {
    if (g.kind === 'outdoor_seating' || g.kind === 'pitch') continue;
    const [minx, miny, maxx, maxy] = g.bounds;
    if (x >= minx && x <= maxx && y >= miny && y <= maxy && pointInPolygon(x, y, g.pts)) { green = 1; break; }
    const dx = Math.max(minx - x, 0, x - maxx), dy = Math.max(miny - y, 0, y - maxy);
    green = Math.max(green, clamp(1 - Math.hypot(dx, dy) / 30, 0, 0.6));
  }
  place.green = green;

  const trees = map.treesNear(x, y, 30);
  place.treePts.length = 0;
  let tn = 0;
  for (const t of trees) {
    const d = Math.hypot(t[0] - x, t[1] - y);
    if (d > 35) continue;
    tn++;
    if (place.treePts.length < 10) place.treePts.push(t);
  }
  place.trees = clamp(tn / 12, 0, 1);

  const w = nearestWater(map, x, y);
  place.waterD = w.d; place.waterX = w.x; place.waterY = w.y;

  let sq = 0;
  for (const l of landmarks.squares) sq = Math.max(sq, clamp(1 - (Math.hypot(l.x - x, l.y - y) - 35) / 80, 0, 1));
  place.square = sq;

  place.horecaPts.length = 0;
  let hn = 0;
  const cx = Math.floor(x / HORECA_CELL), cy = Math.floor(y / HORECA_CELL);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const arr = horecaGrid.get((cx + i) + ',' + (cy + j));
    if (!arr) continue;
    for (const h of arr) {
      const d = Math.hypot(h.x - x, h.y - y);
      if (d > 55) continue;
      hn += 1 - d / 55;
      if (place.horecaPts.length < 8) place.horecaPts.push(h);
    }
  }
  for (const g of map.greenNear(x, y, 30)) if (g.kind === 'outdoor_seating') hn += 0.8;
  place.horeca = clamp(hn / 5, 0, 1);

  let dens = 0, near70 = 0;
  for (const b of map.buildingsNear(x, y, 60)) {
    const [minx, miny, maxx, maxy] = b.bounds;
    const d = Math.hypot(Math.max(minx - x, 0, x - maxx), Math.max(miny - y, 0, y - maxy));
    if (d < 60) near70++;
    if (d < 22) dens += clamp((b.h || 8) / 12, 0.3, 1.6) * (1 - d / 22);
  }
  place.density = clamp(dens / 5, 0, 1);
  place.open = place.density < 0.35 && near70 > 8 ? clamp((near70 - 8) / 20, 0, 1) * (1 - place.density) : 0;

  let traffic = 0;
  for (const v of world.vehicles) {
    if (v.isBike || v.isBoat || v.wrecked || Math.abs(v.speed) < 1) continue;
    const d = Math.hypot(v.x - x, v.y - y);
    if (d < 110) traffic += 1 - d / 110;
  }
  place.traffic = clamp(traffic / 6, 0, 1);

  let peds = 0;
  for (const ped of world.pedestrians) if (ped.state !== 'dead' && Math.abs(ped.x - x) < 30 && Math.abs(ped.y - y) < 30) peds++;
  place.peds = clamp(peds / 14, 0, 1);

  countryPlace(x, y);

  const v = p.inVehicle;
  const closed = !!v && !v.isBike && !v.isScooter && !v.isBoat;
  K.setReverb(place.density, place.open, closed);
}

// Out in the Ommeland the city's green and trees are gone: the meadows all
// round and the trunks of the road trees and hedgerows (countrywalls.js)
// take their place (the water is the tiles' polygons, scanned above), and
// the polder is open (no city hum, more wind) outside a village's built-up
// part.
const _trunks = [];
function countryPlace(x, y) {
  const e = edgeDistance(x, y);
  const urban = urbanWeight(x, y);
  place.rural = smooth01(20, 220, e) * (1 - 0.8 * urban);
  if (e < 20) return;
  const k = smooth01(20, 220, e);
  place.green = Math.max(place.green, 0.85 * k * (1 - 0.6 * urban));
  _trunks.length = 0;
  const tn = trunksNear(x, y, 35, _trunks, 10);
  if (tn) {
    place.trees = Math.max(place.trees, clamp(tn / 12, 0, 1));
    if (place.treePts.length < 4) place.treePts.push(..._trunks);
  }
  place.open = Math.max(place.open, place.rural);
  // a maar of the polder grid (past the real data)
  const pm = parcelAt(x, y).dMaar - MAAR_WATER;
  if (pm < place.waterD) { place.waterD = Math.max(0, pm); place.waterX = x; place.waterY = y; }
}

function smooth01(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

function setTargets(world) {
  const dn = world.dayNight || { hour: 12, night: 0 };
  const night = dn.night || 0, day = 1 - night, hour = dn.hour;
  const rain = clamp(world.weather ? world.weather.intensity : 0, 0, 1);
  const v = world.player.inVehicle;
  const closed = !!v && !v.isBike && !v.isScooter && !v.isBoat;
  const evening = smooth01(16, 19, hour) * (1 - smooth01(23.5, 24, hour)) + (hour < 2 ? 0.6 : 0);
  const paused = K.muted() ? 0 : world.paused ? 0.45 : 1;
  const cabin = closed ? 0.45 : 1;

  beds.city.target = (0.07 + place.traffic * 0.1 + place.density * 0.04 - place.green * 0.04) * (0.55 + 0.45 * day) * (1 - 0.9 * place.rural) * cabin * paused;
  beds.wind.target = (0.03 + place.open * 0.04 + place.green * 0.015 + rain * 0.26) * (closed ? 0.35 : 1) * paused;
  beds.rain.target = rain * (closed ? 0.1 : 0.28) * paused;
  beds.roof.target = closed ? rain * 0.32 * paused : 0;
  beds.crowd.target = Math.max(place.square * (0.2 * day + 0.08 * night), place.peds * 0.08, world.eventSound ? world.eventSound.gain * 0.22 : 0) * (1 - rain * 0.7) * cabin * paused;
  beds.terrace.target = place.horeca * (0.05 * day + evening * 0.16) * (1 - rain * 0.85) * cabin * paused;
  beds.crickets.target = night * Math.max(place.green, place.trees * 0.7) * 0.13 * (1 - rain) * cabin * paused;
  beds.lap.target = clamp(1 - place.waterD / 28, 0, 1) * (v && v.isBoat ? 0.32 : 0.2) * paused;

  const t = now();
  if (beds.wind.filter) beds.wind.filter.frequency.setTargetAtTime(closed ? 700 : 2500 + rain * 6000, t, 0.3);
  if (beds.rain.filter) beds.rain.filter.frequency.setTargetAtTime(closed ? 1400 : 12000, t, 0.3);
  if (beds.lap.panner && place.waterD < 60) {
    K.setPannerPos(beds.lap.panner, place.waterX, place.waterY, 0.2, !beds.lap.fresh);
    beds.lap.fresh = false;
  }
}

// --- scheduled ambient events -------------------------------------------

function playAt(buf, x, y, h, o) {
  const out = K.spatial(x, y, { ref: o.ref ?? 6, rolloff: o.rolloff ?? 1.2, range: o.range ?? 80, h, model: 'equalpower', bus: K.buses.amb, prio: 0 });
  if (!out) return;
  K.buf(buf, { out, gain: o.gain, rate: o.rate ?? 1, prio: 0, lp: o.lp || 0 });
}

function ambientEvents(dt, world) {
  const dn = world.dayNight || { hour: 12, night: 0 };
  const daylight = 1 - (dn.night || 0);
  const rain = clamp(world.weather ? world.weather.intensity : 0, 0, 1);
  const L = K.listener;
  const lx = L.x, ly = L.z;

  timers.bird -= dt;
  if (timers.bird <= 0) {
    const dawn = dn.hour > 4.5 && dn.hour < 8 ? 1.8 : 1;
    const act = daylight * (0.12 + place.green + place.trees * 0.8) * (1 - rain * 0.9) * dawn;
    timers.bird = act > 0.05 ? rnd(1.2, 5) / Math.min(2.5, act) : rnd(4, 8);
    if (act > 0.05 && !world.paused) {
      const tr = place.treePts.length ? pick(place.treePts) : null;
      const a = Math.random() * Math.PI * 2, r = rnd(8, 25);
      const x = tr ? tr[0] : lx + Math.cos(a) * r, y = tr ? tr[1] : ly + Math.sin(a) * r;
      playAt('bird_' + Math.floor(Math.random() * 5), x, y, rnd(4, 9), { gain: rnd(0.1, 0.2), rate: rnd(0.9, 1.12), ref: 5, rolloff: 1.4, range: 60 });
    }
  }

  timers.gull -= dt;
  if (timers.gull <= 0) {
    const vis = landmarks.vismarkt ? clamp(1 - Math.hypot(landmarks.vismarkt.x - lx, landmarks.vismarkt.y - ly) / 180, 0, 1) : 0;
    const act = Math.max(clamp(1 - place.waterD / 70, 0, 1), vis) * (0.3 + daylight * 0.7) * (1 - rain * 0.6);
    timers.gull = act > 0.05 ? rnd(5, 14) / act : rnd(6, 12);
    if (act > 0.05 && !world.paused) {
      const a = Math.random() * Math.PI * 2, r = rnd(15, 45);
      playAt('gull_' + (Math.random() < 0.5 ? 0 : 1), lx + Math.cos(a) * r, ly + Math.sin(a) * r, rnd(12, 25), { gain: rnd(0.12, 0.22), rate: rnd(0.9, 1.1), ref: 10, rolloff: 1, range: 120 });
    }
  }

  timers.clink -= dt;
  if (timers.clink <= 0) {
    const evening = dn.hour > 16 || dn.hour < 1.5 ? 1 : 0.3;
    const act = place.horeca * evening * (1 - rain);
    timers.clink = act > 0.1 ? rnd(2.5, 7) / act : rnd(5, 9);
    if (act > 0.1 && place.horecaPts.length && !world.paused) {
      const h = pick(place.horecaPts);
      playAt('clink', h.x + rnd(-3, 3), h.y + rnd(-3, 3), 1, { gain: rnd(0.06, 0.12), rate: rnd(0.92, 1.1), ref: 4, rolloff: 1.4, range: 50 });
    }
  }
}

// --- bells --------------------------------------------------------------

// Original short phrase (semitones above C5, beat lengths) for the carillon.
const CARILLON = [[12, 1], [7, 1], [9, 1], [4, 2], [5, 1], [9, 1], [7, 1], [0, 3]];
const CARILLON_BEAT = 0.34;

function bellOut(lm, h) {
  return K.spatial(lm.x, lm.y, { h, ref: 70, rolloff: 0.7, range: 3000, maxDist: 2500, model: 'equalpower', prio: 2 });
}

function bellLowpass(lm) {
  const d = K.dist(lm.x, lm.y, 60);
  return clamp(9000 - d * 5, 1200, 9000);
}

function playCarillon() {
  const lm = landmarks.tower;
  if (!lm) return;
  let t = 0;
  for (const [semi, beats] of CARILLON) {
    later(t, () => {
      const out = bellOut(lm, 70);
      if (out) K.buf('bell_carillon', { out, gain: 0.32, rate: Math.pow(2, semi / 12), prio: 2, lp: bellLowpass(lm) });
    });
    t += beats * CARILLON_BEAT;
  }
}

function strikeHour(count, lm, rate = 1, gain = 0.55) {
  if (!lm) return;
  for (let i = 0; i < count; i++) {
    later(i * 1.7, () => {
      const out = bellOut(lm, 60);
      if (out) K.buf('bell_big', { out, gain, rate, prio: 2, lp: bellLowpass(lm) });
    });
  }
}

function bells(world) {
  if (!world.dayNight) return;
  const h = world.dayNight.hour;
  const prevH = lastHour;
  lastHour = h;
  if (prevH === null) return;
  const hh = h < prevH - 12 ? h + 24 : h;
  const dh = hh - prevH;
  if (dh <= 0 || dh > 0.2) return;
  const crossed = (mark) => Math.floor(prevH - mark) !== Math.floor(hh - mark);
  // a game day lasts 24 real minutes, so ringing every game hour would mean
  // a carillon plus up to 12 strikes every real minute: ring every 3rd hour
  const nextHour = Math.ceil(prevH) % 24;
  if (crossed(0.93) && (Math.round(hh + 0.07) % 24) % BELL_EVERY_HOURS === 0) playCarillon();
  if (crossed(0) && nextHour % BELL_EVERY_HOURS === 0) {
    const hr = Math.round(h) % 24;
    strikeHour(hr % 12 || 12, landmarks.tower);
  }
}
const BELL_EVERY_HOURS = 3;

// --- thunder ------------------------------------------------------------

function thunder(distance) {
  const variant = distance < 700 ? 'thunder_0' : Math.random() < 0.5 ? 'thunder_1' : 'thunder_2';
  const delay = clamp(distance / 343, 0.3, 7);
  const gain = clamp(0.75 - distance / 5000, 0.25, 0.7);
  later(delay, () => {
    K.buf(variant, { bus: K.buses.sfx, gain, rate: 0.9 + Math.random() * 0.15, prio: 2, lp: clamp(6000 - distance * 1.5, 900, 6000) });
    K.duckAmb(0.35, 2.5);
  });
}

function weatherEvents(world) {
  const sc = getScene();
  const flash = sc && sc.userData ? sc.userData.lightningFlash || 0 : 0;
  const t = now();
  if (flash > 0.9 && lastFlash < 0.5) {
    lastFlashAt = t;
    thunder(sc.userData.lightningDistance || rnd(250, 3200));
  }
  lastFlash = flash;
  const w = world.weather;
  if (w && w.active && w.intensity > 0.75 && t - lastFlashAt > 25) {
    if (!nextRandomThunder) nextRandomThunder = t + rnd(8, 20);
    else if (t > nextRandomThunder) { thunder(rnd(1500, 4500)); nextRandomThunder = t + rnd(12, 30); }
  } else nextRandomThunder = 0;
}

// --- animals ------------------------------------------------------------

const ANIMALS = {
  cow: { buf: 'cow', gap: [9, 26], gain: 0.3, rate: [0.9, 1.08], h: 1.3, range: 80 },
  sheep: { buf: 'sheep', gap: [6, 18], gain: 0.22, rate: [0.9, 1.15], h: 0.8, range: 60 },
  seagull: { buf: 'gull', gap: [7, 20], gain: 0.18, rate: [0.92, 1.1], h: 8, range: 90 },
  duck: { buf: 'duck', gap: [4, 12], gain: 0.16, rate: [0.9, 1.1], h: 0.2, range: 45 },
  heron: { buf: 'heron', gap: [14, 40], gain: 0.2, rate: [0.9, 1.1], h: 0.8, range: 70 },
  seal: { buf: 'seal', gap: [12, 30], gain: 0.2, rate: [0.9, 1.1], h: 0.2, range: 60 },
  fish: { buf: 'imp_water', gap: [8, 20], gain: 0.07, rate: [1.6, 2.1], h: 0, range: 18 },
  pigeon: { buf: 'pigeon', gap: [5, 14], gain: 0.1, rate: [0.92, 1.08], h: 0.3, range: 30 },
  dog: { buf: 'dog', gap: [4, 14], gain: 0.22, rate: [0.8, 1.25], h: 0.5, range: 70, double: true },
  cat: { buf: 'cat', gap: [10, 30], gain: 0.14, rate: [0.9, 1.15], h: 0.3, range: 35 },
};
const ALIASES = { gans: 'duck', gull: 'seagull', meeuw: 'seagull', eend: 'duck', duif: 'pigeon', hond: 'dog', kat: 'cat', koe: 'cow', schaap: 'sheep', reiger: 'heron', zeehond: 'seal', vis: 'fish' };

function animalDef(kind) {
  if (typeof kind !== 'string') return null;
  const k = kind.toLowerCase();
  return ANIMALS[k] || ANIMALS[ALIASES[k]] || null;
}

function animals(dt, world) {
  timers.animals -= dt;
  const extra = world.countryAudible;
  const list = extra && extra.length ? (world.wildlife || []).concat(extra) : world.wildlife;
  if (!list || !list.length || world.paused) return;
  const check = timers.animals <= 0;
  if (check) timers.animals = 0.4;
  const t = now();
  for (const a of list) {
    if (!a || typeof a.x !== 'number') continue;
    const def = animalDef(a.kind);
    if (!def) continue;
    const sp = typeof a.speed === 'number' ? a.speed : 0;
    const prevSp = animalSpeed.get(a) ?? sp;
    animalSpeed.set(a, sp);
    const h = typeof a.z === 'number' ? a.z + 0.2 : def.h;
    if (def.buf === 'pigeon' && sp - prevSp > 1.2 && K.dist(a.x, a.y, h) < 25) {
      playAt('flutter', a.x, a.y, h, { gain: 0.14, rate: rnd(0.9, 1.15), ref: 3, rolloff: 1.4, range: 25 });
    }
    if (!check) continue;
    const next = animalNext.get(a);
    if (next === undefined) { animalNext.set(a, t + rnd(1, def.gap[1])); continue; }
    if (t < next) continue;
    animalNext.set(a, t + rnd(def.gap[0], def.gap[1]));
    if (K.dist(a.x, a.y, h) > def.range) continue;
    const buf = def.buf === 'gull' ? 'gull_' + (Math.random() < 0.5 ? 0 : 1) : def.buf;
    const rate = rnd(def.rate[0], def.rate[1]);
    playAt(buf, a.x, a.y, h, { gain: def.gain, rate, ref: 4, rolloff: 1.2, range: def.range });
    if (def.double && Math.random() < 0.5) later(rnd(0.25, 0.4), () => playAt(buf, a.x, a.y, h, { gain: def.gain * 0.9, rate: rate * 1.03, ref: 4, rolloff: 1.2, range: def.range }));
  }
}

export function updateAmbience(dt, world) {
  if (!K) return;
  runQueue();
  scanTimer -= dt;
  if (scanTimer <= 0) {
    scanTimer = SCAN_EVERY;
    scan(world);
  }
  setTargets(world);
  driveBeds(dt);
  if (K.muted()) return;
  ambientEvents(dt, world);
  bells(world);
  weatherEvents(world);
  animals(dt, world);
}

export function ambienceStats() {
  let running = 0;
  for (const k in beds) if (beds[k].src) running++;
  return { bedsRunning: running, queued: queue.length };
}
