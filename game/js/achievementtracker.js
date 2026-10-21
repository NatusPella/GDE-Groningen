// Polling detectors for achievements.js: reads world state every frame, so
// the other systems only need hooks for things that leave no trace (shops,
// horeca, pigeon perches). Also runs the mission medal bookkeeping and the
// hidden eierballen collectibles.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import {
  initAchievements, recordStat, setStatMax, recordUnique, unlockAchievement, recordMissionResult,
  getSaveSet, addToSaveSet, isUnlocked, MISSION_GOALS, GOLD_DAMAGE, SILVER_DAMAGE, MEDALS, EIERBAL_TOTAL, formatMissionTime,
  ACHIEVEMENTS, getAchievementSummary,
} from './achievements.js';
import { vehicleContacts } from './vehicle.js';
import { getTrains, getLevelCrossings, TRAIN_TYPES } from './railway.js';
import { countryWeight } from './countryfield.js';
import { EIERBAL_FIND_PAY, EIERBAL_ALL_BONUS } from './economy.js';
import { getMissionList, payMedalBonus } from './missionquery.js';
import { getScene } from './scene3d.js';
import { makeNearMiss, nearMissBonus } from './gamefeel.js';
import { chipPopup } from './stunthud.js';
import { noteMoney } from './finance.js';

const NEAR_MISS_SPEED = 12;
const NEAR_MISS_GAP = 0.9;
const WIJK_DWELL = 2;
const LANDMARK_RADIUS = 70;
const TRAIN_SEEN_RADIUS = 70;
const EIERBAL_REACH = 1.7;
const EIERBAL_REACH_VEHICLE = 2.6;
const EIERBAL_SHOW_R = 140;
const DIEPENRING_R = 800;

let world = null;
let lastVehicle = null;
const entered = new Set();
let contactCursor = 0;
const nearCand = new Map();
const nearMiss = makeNearMiss();
const lastHitWith = new Map();
const seenKiss = new WeakSet();
let lastPos = null;
let prevWater = null;
const acc = { driven: 0, walked: 0, swum: 0, sailed: 0, coopTime: 0 };
let accT = 0;
let slowT = 0;
let wantedStreak = 0;
let had5 = false;
let lastWrecks = null;
let wijkCand = null;
let wijkDwell = 0;
let prevSunElev = null;
let stormT = 0;
let trainRaceT = 0;
let crossingT = 0;
const fineSeen = new Map();
let run = null;
let retroT = 0;
let eggs = [];
let eggGroup = null;

const SPEED_TYPES = (v) => (v.isBoat ? 'boot' : v.isBus ? 'bus' : v.isScooter ? 'scooter' : v.isBike ? (v.model && v.model.fat ? 'fatbike' : 'fiets') : v.isPolice ? 'politieauto' : 'auto');

export function initAchievementTracker(w) {
  world = w;
  initAchievements(w);
  contactCursor = vehicleContacts.head;
  w.onRespawn.push((ww, { busted }) => {
    unlockAchievement(ww, busted ? 'opgepakt' : 'wasted');
    had5 = false;
    wantedStreak = 0;
    lastPos = null;
  });
  initEierballen(w);
  if (window.__debug) {
    window.__debug.achievements = {
      unlock: (id) => unlockAchievement(world, id),
      stat: (key, n = 1) => recordStat(world, key, n),
      unique: (key, value) => recordUnique(world, key, value),
      mission: (i, time, opts = {}) => finishRun({ index: i, elapsed: time, damage: 0, maxWanted: 0, ...opts }, true),
      eggs: () => eggs.map((e) => ({ id: e.id, x: e.x, y: e.y, found: getSaveSet('eierballen').has(e.id) })),
      summary: getAchievementSummary,
      list: () => ACHIEVEMENTS.map((a) => a.id),
    };
  }
}

export function updateAchievementTracker(dt, w) {
  world = w;
  if (!document.body.classList.contains('game-started')) return;
  const p = w.player;
  const pv = p.inVehicle;

  processContacts(w, pv);
  if (!w.pigeonMode) {
    trackVehicle(dt, w, pv);
    trackMovement(dt, w, p, pv);
    trackPolice(dt, w);
    trackSocial(w);
    trackRail(dt, w, p, pv);
    trackMission(dt, w, pv);
    updateEierballen(dt, w, p, pv);
  }
  if (eggGroup) eggGroup.visible = !w.pigeonMode;
  trackWorld(dt, w, p, pv);

  retroT -= dt;
  if (retroT <= 0) {
    retroT = 2;
    setStatMax(w, 'maxMoney', Math.floor(w.money || 0));
    // missions finished in a save from before prestaties existed
    for (const m of getMissionList()) if (m.status === 'geklaard' && !m.skipped && !isUnlocked(`m${m.index + 1}_klaar`)) unlockAchievement(w, `m${m.index + 1}_klaar`, { silent: true });
  }
}

// --- contacts / near misses ------------------------------------------------

function processContacts(w, pv) {
  const vc = vehicleContacts;
  if (contactCursor < vc.head - vc.cap) contactCursor = vc.head - vc.cap;
  for (; contactCursor < vc.head; contactCursor++) {
    const c = vc.list[contactCursor % vc.cap];
    if (pv && (c.a === pv || c.b === pv)) {
      const o = c.a === pv ? c.b : c.a;
      if (o) lastHitWith.set(o.id, w.time);
      if (run && o) {
        run.carTouches++;
        if (o.isRacer || o.racer || o.rival) run.rivalTouches++;
      }
    }
    if (run && run.vehicle && (c.a === run.vehicle || c.b === run.vehicle)) {
      run.touches++;
      if (c.impact >= 3) run.hard++;
    }
  }
}

function trackVehicle(dt, w, pv) {
  if (pv && pv !== lastVehicle) {
    recordUnique(w, 'vehicleTypes', SPEED_TYPES(pv));
    if (!pv.isHeroCar && !pv.missionCar && !pv.playerOwned && !entered.has(pv.id)) {
      entered.add(pv.id);
      recordStat(w, 'stolen');
      if (pv.isBus) unlockAchievement(w, 'bus');
      if (pv.isPolice && !pv.isBoat) unlockAchievement(w, 'politieauto');
    }
  }
  lastVehicle = pv || null;

  const wr = w.stats.playerWrecks || 0;
  if (lastWrecks != null && wr > lastWrecks && wr - lastWrecks < 5) recordStat(w, 'wrecks', wr - lastWrecks);
  lastWrecks = wr;

  if (!pv || pv.isBoat || pv.wrecked) { nearCand.clear(); return; }
  setStatMax(w, 'topSpeed', Math.round(Math.abs(pv.speed) * 3.6));

  const small = pv.isBike || pv.isScooter;
  if (!small && Math.abs(pv.speed) > NEAR_MISS_SPEED) {
    const c = Math.cos(pv.angle), s = Math.sin(pv.angle);
    for (const o of w.vehicles) {
      if (o === pv || o.wrecked || o.isBoat || nearCand.has(o.id)) continue;
      const dx = o.x - pv.x, dy = o.y - pv.y;
      if (dx * dx + dy * dy > 100) continue;
      const lx = dx * c + dy * s, ly = -dx * s + dy * c;
      const gap = Math.abs(ly) - (pv.halfWid + o.halfWid);
      if (Math.abs(lx) < pv.halfLen + o.halfLen && gap > 0 && gap < NEAR_MISS_GAP) nearCand.set(o.id, { o, t: w.time, gap, sameDir: Math.cos(pv.angle - o.angle) * (Math.sign(pv.speed) || 1) * (Math.sign(o.speed) || 1) });
    }
  }
  for (const [id, cand] of nearCand) {
    const o = cand.o;
    const far = Math.hypot(o.x - pv.x, o.y - pv.y) > 12;
    if (!far && w.time - cand.t < 3) continue;
    nearCand.delete(id);
    if (far && (lastHitWith.get(id) ?? -99) < cand.t - 0.5 && !o.wrecked) {
      recordStat(w, 'nearMiss');
      // kleine bonus met een chip (#216); geen beloning tegen het verkeer in, afkoeling per paar
      const bonus = nearMissBonus(nearMiss, w.time, { pair: pv.id + '-' + id, speed: pv.speed, gap: cand.gap, sameDir: cand.sameDir });
      if (bonus > 0) { noteMoney('Rijden'); w.money += bonus; chipPopup(`+€${bonus} Rakelings`); }
    }
  }
}

function trackMovement(dt, w, p, pv) {
  if (lastPos) {
    const d = Math.hypot(p.x - lastPos.x, p.y - lastPos.y);
    if (d > 0 && d < 60 * dt + 1) {
      if (pv) { if (pv.isBoat) acc.sailed += d; else acc.driven += d; }
      else if (p.swimming) acc.swum += d;
      else acc.walked += d;
    }
  }
  lastPos = { x: p.x, y: p.y };
  if (w.coop && w.coop.remote) acc.coopTime += dt;
  accT += dt;
  if (accT > 1) {
    accT = 0;
    for (const k of Object.keys(acc)) if (acc[k] > 0) { recordStat(w, k, Math.round(acc[k] * 10) / 10); acc[k] = 0; }
  }
  if (prevWater === 'climb' && !p.water && !p.inVehicle) {
    const lm = (w.map.meta.landmarks || []).find((l) => l.name === 'Martinitoren') || { x: 213.81, y: 9.9 };
    if (Math.hypot(p.x - lm.x, p.y - lm.y) < DIEPENRING_R) unlockAchievement(w, 'kade_klim');
  }
  prevWater = p.water || null;
}

function trackPolice(dt, w) {
  // samen spelen (#370): het gezochtniveau van een gast is dat van de gastheer; ontsnappen is aan de gastheer, niet aan wie meekijkt
  if (w.coopRole === 'client') { wantedStreak = 0; had5 = false; return; }
  const wanted = w.wanted || 0;
  setStatMax(w, 'maxWanted', wanted);
  if (wanted >= 5) had5 = true;
  if (wanted > 0 && !w.pendingRespawn) {
    wantedStreak += dt;
    setStatMax(w, 'wantedStreak', Math.floor(wantedStreak));
  } else {
    if (wantedStreak > 0) setStatMax(w, 'wantedStreak', Math.floor(wantedStreak));
    wantedStreak = 0;
    if (wanted === 0 && had5 && !w.pendingRespawn) unlockAchievement(w, 'ontsnapt_5');
    had5 = false;
  }
}

function trackSocial(w) {
  for (const pt of w.particles) {
    if (pt.kind !== 'kiss' || seenKiss.has(pt)) continue;
    seenKiss.add(pt);
    recordStat(w, 'kisses');
  }
  for (const cam of w.flitspaalen || []) {
    const t = cam.lastFine;
    if (!Number.isFinite(t)) continue;
    if (fineSeen.has(cam) && fineSeen.get(cam) !== t) unlockAchievement(w, 'geflitst');
    fineSeen.set(cam, t);
  }
}

function trackRail(dt, w, p, pv) {
  let racing = false;
  for (const t of getTrains()) {
    if (!t.cars || !t.cars.length) continue;
    let near = Infinity, nearCar = null;
    for (const c of t.cars) {
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < near) { near = d; nearCar = c; }
    }
    if (near < TRAIN_SEEN_RADIUS && TRAIN_TYPES[t.type]) recordUnique(w, 'trains', t.type);
    if (pv && !pv.isBoat && near < 25 && t.v > 8 && Math.abs(Math.cos(nearCar.angle - pv.angle)) > 0.85 && Math.abs(pv.speed) > t.v + 3) racing = true;
  }
  trainRaceT = racing ? trainRaceT + dt : Math.max(0, trainRaceT - dt * 2);
  if (trainRaceT > 3) unlockAchievement(w, 'trein_race');

  let waiting = false;
  if (!pv || Math.abs(pv.speed) < 0.5) {
    for (const c of getLevelCrossings()) {
      if (c.boom > 0.9 && Math.hypot(c.x - p.x, c.y - p.y) < 20) { waiting = true; break; }
    }
  }
  crossingT = waiting ? crossingT + dt : 0;
  if (crossingT > 6) unlockAchievement(w, 'overweg');
}

function trackWorld(dt, w, p, pv) {
  slowT -= dt;
  if (slowT <= 0) {
    slowT = 0.5;
    const pts = w.map.meta.neighbourhoodPoints || [];
    let best = null, bd = Infinity;
    for (const q of pts) {
      const d2 = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
      if (d2 < bd) { bd = d2; best = q; }
    }
    if (best && bd < 700 * 700) {
      if (wijkCand !== best.name) { wijkCand = best.name; wijkDwell = 0; }
      else if ((wijkDwell += 0.5) >= WIJK_DWELL) recordUnique(w, 'wijken', best.name);
    }
    for (const l of w.map.meta.landmarks || []) {
      if (Math.hypot(l.x - p.x, l.y - p.y) < LANDMARK_RADIUS) recordUnique(w, 'landmarks', l.name);
    }
    if (countryWeight(p.x, p.y) > 0.9) unlockAchievement(w, 'ommelanden');
  }
  const dn = w.dayNight;
  if (dn && Number.isFinite(dn.sunElevation)) {
    if (prevSunElev != null && prevSunElev < 0 && dn.sunElevation >= 0 && dn.hour < 12) unlockAchievement(w, 'zonsopgang');
    prevSunElev = dn.sunElevation;
  }
  const wx = w.weather;
  if (wx && wx.active && wx.intensity > 0.3) {
    if (wx.kind === 'onweer') unlockAchievement(w, 'onweer');
    if (wx.kind === 'storm' && pv && !pv.isBoat && Math.abs(pv.speed) > 5) {
      stormT += dt;
      if (stormT > 30) unlockAchievement(w, 'storm');
    }
  }
}

// --- missions ---------------------------------------------------------------

function trackMission(dt, w, pv) {
  const m = w.mission;
  const active = m && m.phase === 'active';
  if (run && (!active || m.index !== run.index)) {
    finishRun(run, w.stats.missionsDone > run.doneBase);
    run = null;
  }
  if (!active) return;
  if (!run) {
    run = {
      index: m.index, type: m.type, elapsed: 0, doneBase: w.stats.missionsDone,
      hp: w.health + w.armor, damage: 0, maxWanted: w.wanted || 0, timeLeft: m.timeLeft,
      vehicle: null, vehHealth0: 100, touches: 0, hard: 0, carTouches: 0, rivalTouches: 0, rivalsSeen: false,
      fatHits: 0, boatSpeed: 0,
    };
  }
  const r = run;
  r.elapsed += dt;
  const hp = w.health + w.armor;
  if (hp < r.hp) r.damage += r.hp - hp;
  r.hp = hp;
  // missions.js also counts damage to the mission vehicle
  if (Number.isFinite(m.damage)) r.damage = Math.max(r.damage, m.damage);
  r.maxWanted = Math.max(r.maxWanted, w.wanted || 0);
  if (Number.isFinite(m.timeLeft)) r.timeLeft = m.timeLeft;
  if (Number.isFinite(m.fatbikeHits)) r.fatHits = m.fatbikeHits;
  if (Number.isFinite(m.racePos)) r.racePos = m.racePos;
  if (Number.isFinite(m.happiness)) r.happiness = m.happiness;
  if (Number.isFinite(m.bumps)) r.bumps = m.bumps;
  if (!r.vehicle) {
    const v = w.vehicles.find((x) => x.missionCar && !x.racer);
    if (v) { r.vehicle = v; r.vehHealth0 = v.health; }
  }
  if (!r.rivalsSeen && w.vehicles.some((x) => x.isRacer || x.racer || x.rival)) r.rivalsSeen = true;
  if (r.vehicle && r.vehicle.isBoat && pv === r.vehicle) {
    const s = pv.speed;
    if (Math.abs(r.boatSpeed) > 0.8 && Math.sign(s) !== Math.sign(r.boatSpeed) && Math.abs(s) < Math.abs(r.boatSpeed) * 0.5) r.touches++;
    r.boatSpeed = s;
  }
}

function challengeMet(r) {
  const v = r.vehicle;
  const hurt = v ? v.health < (r.vehHealth0 ?? 100) - 0.5 : false;
  switch (r.index) {
    case 0: return r.touches === 0 && !hurt;
    case 1: return r.elapsed <= 20;
    case 2: return r.timeLeft >= 60;
    case 3: return r.hard === 0;
    case 4: return (r.racePos ?? 1) === 1 && (r.rivalsSeen ? r.rivalTouches : r.carTouches) === 0;
    case 5: return r.timeLeft >= 60;
    case 6: return r.fatHits === 0;
    case 7: return (r.bumps ?? r.touches) === 0 && !hurt;
    default: return false;
  }
}

function medalFor(r) {
  const g = MISSION_GOALS[r.index];
  if (g.byPlace && Number.isFinite(r.racePos)) return r.racePos === 1 && r.damage <= SILVER_DAMAGE ? 3 : r.racePos <= 2 ? 2 : 1;
  const happy = (k) => !g.happy || (r.happiness ?? 0) >= g.happy[k];
  if (r.elapsed <= g.gold && r.damage <= GOLD_DAMAGE && r.maxWanted <= g.wanted && happy(0)) return 3;
  if (r.elapsed <= g.silver && r.damage <= SILVER_DAMAGE && happy(1)) return 2;
  return 1;
}

function finishRun(r, success) {
  if (!success || !MISSION_GOALS[r.index]) return null;
  r = { touches: 0, hard: 0, carTouches: 0, rivalTouches: 0, fatHits: 0, timeLeft: 0, ...r };
  const medal = medalFor(r);
  const res = recordMissionResult(world, r.index, { time: r.elapsed, medal, extra: challengeMet(r) });
  const bonus = world ? payMedalBonus(world, r.index, medal) : 0;
  if (res && world) {
    const bits = [`${MEDALS[medal]} · ${formatMissionTime(r.elapsed)}`];
    if (res.newBest) bits.push('nieuw record!');
    if (bonus) bits.push(`medaillebonus +€${bonus}`);
    world.addMessage(bits.join(' · '), 4);
  }
  return res;
}

// --- eierballen -------------------------------------------------------------

function hash(s) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

// Deterministic spots: a few dozen metres off every landmark (tucked around
// a corner) plus every fourth wijk, each snapped to an open walkable spot.
function eggSpots(map) {
  const anchors = [];
  for (const l of map.meta.landmarks || []) anchors.push({ key: 'l:' + l.name, x: l.x, y: l.y, off: 28 });
  const wijken = map.meta.neighbourhoodPoints || [];
  for (let i = 0; i < wijken.length && anchors.length < EIERBAL_TOTAL; i += 4) anchors.push({ key: 'w:' + wijken[i].name, x: wijken[i].x, y: wijken[i].y, off: 14 });
  const out = [];
  for (const a of anchors.slice(0, EIERBAL_TOTAL)) {
    const h = hash(a.key);
    const ang = (h % 3600) / 3600 * Math.PI * 2;
    const tx = a.x + Math.cos(ang) * a.off, ty = a.y + Math.sin(ang) * a.off;
    const s = (map.findOpenSpawn && map.findOpenSpawn(tx, ty, 60)) || { x: tx, y: ty };
    out.push({ id: 'e' + (h % 100000).toString(36), x: s.x, y: s.y, phase: (h % 628) / 100, mesh: null });
  }
  return out;
}

function buildEggMesh(geo, mat, glowGeo, glowMat) {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(geo, mat);
  ball.scale.set(1, 0.9, 1);
  ball.position.y = 0.75;
  g.add(ball);
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.04;
  g.add(glow);
  g.userData.ball = ball;
  return g;
}

// The hidden eierballen with their found state (story.js: the egg step).
export function getEierballen() {
  const found = getSaveSet('eierballen');
  return eggs.map((e) => ({ id: e.id, x: e.x, y: e.y, found: found.has(e.id) }));
}

function initEierballen(w) {
  const scene = getScene && getScene();
  eggs = eggSpots(w.map);
  if (!scene) return;
  eggGroup = new THREE.Group();
  eggGroup.name = 'eierballen';
  const geo = new THREE.IcosahedronGeometry(0.22, 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0xb06a28, roughness: 1, metalness: 0, emissive: 0x3a1e06, emissiveIntensity: 0.5, flatShading: true });
  const glowGeo = new THREE.CircleGeometry(0.6, 20);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffc85a, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending });
  for (const e of eggs) {
    e.mesh = buildEggMesh(geo, mat, glowGeo, glowMat);
    e.mesh.position.set(e.x, 0, e.y);
    e.mesh.visible = false;
    eggGroup.add(e.mesh);
  }
  scene.add(eggGroup);
}

function updateEierballen(dt, w, p, pv) {
  const found = getSaveSet('eierballen');
  for (const e of eggs) {
    const has = found.has(e.id);
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (e.mesh) {
      e.mesh.visible = !has && d < EIERBAL_SHOW_R;
      if (e.mesh.visible) {
        const b = e.mesh.userData.ball;
        b.rotation.y += dt * 1.6;
        b.position.y = 0.75 + Math.sin(w.time * 2.2 + e.phase) * 0.12;
      }
    }
    if (has || d > (pv ? EIERBAL_REACH_VEHICLE : EIERBAL_REACH)) continue;
    if (pv && pv.isBoat) continue;
    addToSaveSet(w, 'eierballen', e.id);
    const n = found.size;
    const all = n >= EIERBAL_TOTAL;
    w.money += EIERBAL_FIND_PAY + (all ? EIERBAL_ALL_BONUS : 0);
    w.addMessage(all ? `Alle ${EIERBAL_TOTAL} eierballen gevonden! Smakelijk. +€${EIERBAL_FIND_PAY + EIERBAL_ALL_BONUS}` : `Eierbal gevonden! ${n}/${EIERBAL_TOTAL} · +€${EIERBAL_FIND_PAY}`, 3);
    const q = w.audioEvents || (w.audioEvents = []);
    if (q.length < 64) q.push({ kind: 'notify', x: e.x, y: e.y });
  }
}
