import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { canvasTex } from './canvastex.js';
import { getScene } from './scene3d.js';
import { WATER_Y, isInWater } from './util.js';
import { getWaterIndex } from './waterindex.js';
import { Pedestrian, isSpawnHidden } from './pedestrians.js';
import { isInsideBuilding, pushAudioEvent } from './pedgeom.js';
import { spawnFxPuff, spawnFxSpark } from './fx3d.js';
import { today, isToday } from './calendarday.js';
import { isCinematicActive } from './cinematics.js';
import { isMissionActive } from './missionquery.js';
import { isActivityActive } from './activities.js';
import { inHomeFlat } from './home.js';
import { GROTE_MARKT } from './flavour.js';
import { showFor } from './evenementen.js';
import { updateMarktSigns } from './marktfiets.js';
import {
  QUAKE, rollQuakeGap, mayQuake, rollQuake, quakeEnvelope, quakeStrength, bikeWobble, QUAKE_BARKS, quakeNewsText,
  ALGAE, algaePatches, patchAt, algaeEffect, algaeHurt, algaeDay, nextAlgaeDay, ALGAE_SIGN, ALGAE_NEWS, ALGAE_SWIM_MSG,
  SHOW, showState, shellGap, makeShell, soundLag,
  TOURISTS, touristTarget, GERMAN_LINES, GERMAN_HELLO, touristGroup,
} from './eventrules.js';

// Open-wereld events, batch 2 (rules in eventrules.js): the light earthquake,
// blue-green algae in the big lakes (green patches, "Niet zwemmen" signs, a
// swim penalty through world.algaeAt), the Gronings Ontzet fireworks over the
// city and the German tourists on the bloemetjesmarkt. Summer only, text only,
// no recorded voice. `window.__worldevents` debug.

const S = {
  quakeIn: 0, quake: null, quakeBars: [], news: null,
  algae: { day: -1, lakes: null, patches: [], built: new Map(), msgAt: -Infinity, newsDay: -1, group: null },
  fw: { gap: 2, shells: [], sounds: [], seed: 1 },
  tourists: { t: 3 },
  force: { algae: false, fireworks: null, tourists: false },
};
let world = null;
const pick = (a, rng = Math.random) => a[Math.floor(rng() * a.length)];

export function initWorldEvents(w) {
  world = w;
  S.quakeIn = rollQuakeGap(Math.random, true);
  S.quake = null;
  S.news = null;
  w.quake = null;
  w.algaeAt = algaeAt;
  window.__worldevents = {
    state: () => ({
      quakeIn: S.quakeIn, quake: S.quake && { t: S.quake.t, dur: S.quake.dur, mag: S.quake.mag }, algaeDay: algaeDay(today(world)),
      patches: S.algae.patches.length, shells: S.fw.shells.length, tourists: countTourists(),
    }),
    quake: (mag) => startQuake(mag),
    algae: (on = true) => { S.force.algae = !!on; S.algae.day = -1; return S.force.algae; },
    fireworks: (progress = 0.5) => { S.force.fireworks = progress === false ? null : progress; return S.force.fireworks; },
    tourists: (on = true) => { S.force.tourists = !!on; S.tourists.t = 0; return S.force.tourists; },
    patches: () => S.algae.patches.map((p) => ({ ...p })),
  };
}

export function updateWorldEvents(dt, w) {
  if (!dt || w.paused || !w.player || !w.map) return;
  world = w;
  updateQuake(dt, w);
  updateAlgae(dt, w);
  updateFireworks(dt, w);
  updateTourists(dt, w);
  updateMarktSigns(dt, w);
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const hourOf = (w) => ((w.clock % 24) + 24) % 24;

// --- earthquake ----------------------------------------------------------------------------------

function situation(w) {
  const p = w.player;
  return {
    cinematic: isCinematicActive(), minigame: isActivityActive(), paused: w.paused, dead: p.dead || w.pendingRespawn,
    indoors: inHomeFlat(), heliRun: !!w.heliRun, pigeon: !!w.pigeonMode, wanted: w.wanted || 0,
    call: typeof document !== 'undefined' && document.body.classList.contains('hud-call-on'),
    mission: isMissionActive(), sideJob: !!(w.sideJob && w.sideJob.active),
  };
}

function startQuake(mag) {
  if (S.quake) return false;
  const q = rollQuake();
  if (Number.isFinite(mag)) q.mag = mag;
  S.quake = { ...q, t: 0, strength: quakeStrength(q.mag), reacted: false, news: false, alarms: false };
  pushAudioEvent(world, { kind: 'weapon', sub: 'rumble', x: world.player.x, y: world.player.y, dur: q.dur });
  return true;
}

function updateQuake(dt, w) {
  const q = S.quake;
  if (!q) {
    S.quakeIn -= dt;
    if (S.quakeIn <= 0) {
      if (mayQuake(situation(w))) startQuake();
      else S.quakeIn = 20;
    }
    return;
  }
  q.t += dt;
  const env = quakeEnvelope(q.t, q.dur);
  w.quake = { amp: env * q.strength, t: q.t };
  const p = w.player;
  if (q.t > 1.0 && !q.reacted) {
    q.reacted = true;
    let n = 0;
    for (const ped of w.pedestrians) {
      if (n >= QUAKE.reactors) break;
      if (ped.state !== 'wander' || ped.scene || ped.isCop || (ped.speechText && w.time < ped.speechUntil)) continue;
      if (dist(p, ped) > QUAKE.reactRadius) continue;
      ped.speechText = pick(QUAKE_BARKS);
      ped.speechUntil = w.time + 3.4;
      n++;
    }
  }
  if (q.t > 1.4 && !q.alarms) {
    q.alarms = true;
    let n = 0;
    for (const v of w.vehicles) {
      if (n >= QUAKE.alarms) break;
      if (!v.parked || v.isBike || v.driver || dist(p, v) > QUAKE.bikeRadius) continue;
      pushAudioEvent(w, { kind: 'alarm', x: v.x, y: v.y });
      n++;
    }
  }
  // parked bikes rattle on their stands and settle again
  for (const v of w.vehicles) {
    if (!v.isBike || v.driver || v.wrecked || v.speed || dist(p, v) > QUAKE.bikeRadius) continue;
    if (v._quakeBase === undefined) { v._quakeBase = v.angle; S.quakeBars.push(v); }
    v.angle = v._quakeBase + bikeWobble(w.time, env * q.strength, v.x + v.y);
  }
  if (q.t > 4 && !q.news) {
    q.news = true;
    if (!w.phoneNotifications) w.phoneNotifications = [];
    w.phoneNotifications.push({ from: 'Kiekdoar', text: quakeNewsText(q.mag), duration: 6 });
  }
  if (q.t >= q.dur) {
    for (const v of S.quakeBars) { if (v._quakeBase !== undefined) { v.angle = v._quakeBase; delete v._quakeBase; } }
    S.quakeBars.length = 0;
    S.quake = null;
    w.quake = null;
    S.quakeIn = rollQuakeGap();
  }
}

// --- blue-green algae -----------------------------------------------------------------------------

function lakesOf(map) {
  const out = [];
  map.water.forEach((poly, i) => {
    if (!poly.bounds || !poly.pts || poly.pts.length < 12) return;
    let a = 0;
    for (let j = 0; j < poly.pts.length; j++) {
      const q = poly.pts[j], r = poly.pts[(j + 1) % poly.pts.length];
      a += q[0] * r[1] - r[0] * q[1];
    }
    const area = Math.abs(a / 2);
    if (area >= ALGAE.minArea) out.push({ id: i + 1, bounds: poly.bounds, area, poly });
  });
  return out;
}

function algaeAt(x, y) {
  const p = S.algae.patches;
  return p.length ? patchAt(p, x, y) : null;
}

let algaeTex = null;
function patchTexture() {
  if (algaeTex) return algaeTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(90,190,70,0.85)');
  grad.addColorStop(0.55, 'rgba(70,170,80,0.6)');
  grad.addColorStop(1, 'rgba(60,160,90,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 54;
    g.fillStyle = Math.random() < 0.5 ? 'rgba(30,120,60,0.35)' : 'rgba(150,220,90,0.3)';
    g.beginPath();
    g.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 2 + Math.random() * 5, 0, Math.PI * 2);
    g.fill();
  }
  algaeTex = new THREE.CanvasTexture(c);
  algaeTex.colorSpace = THREE.SRGBColorSpace;
  return algaeTex;
}

let signTex = null;
function signTexture() {
  if (signTex) return signTex;
  signTex = canvasTex(256, 192, (g) => {
    g.fillStyle = '#f4f2ea'; g.fillRect(0, 0, 256, 192);
    g.strokeStyle = '#c9342b'; g.lineWidth = 12; g.strokeRect(6, 6, 244, 180);
    g.fillStyle = '#c9342b'; g.font = 'bold 34px Arial'; g.textAlign = 'center';
    g.fillText(ALGAE_SIGN[0], 128, 70);
    g.beginPath(); g.moveTo(40, 100); g.lineTo(216, 100); g.lineWidth = 5; g.stroke();
    g.fillStyle = '#1d3a24'; g.font = 'bold 22px Arial';
    g.fillText(ALGAE_SIGN[1], 128, 140);
  });
  return signTex;
}

function buildLake(lake, patches) {
  const grp = new THREE.Group();
  for (const p of patches) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(p.r, 28), new THREE.MeshBasicMaterial({ map: patchTexture(), transparent: true, opacity: 0.8, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(p.x, WATER_Y + 0.05, p.y);
    m.renderOrder = 2;
    m.userData.p = p;
    grp.add(m);
  }
  const idx = getWaterIndex(world.map);
  const map = world.map;
  for (const p of patches.slice(0, 2)) {
    const sh = idx.nearestShore(p.x, p.y, p.r + 90);
    if (sh.i < 0) continue;
    const ex = idx.bx[sh.i] - idx.ax[sh.i], ey = idx.by[sh.i] - idx.ay[sh.i];
    const l2 = ex * ex + ey * ey || 1;
    const t = Math.max(0, Math.min(1, ((p.x - idx.ax[sh.i]) * ex + (p.y - idx.ay[sh.i]) * ey) / l2));
    const qx = idx.ax[sh.i] + ex * t, qy = idx.ay[sh.i] + ey * t;
    const dl = Math.hypot(qx - p.x, qy - p.y) || 1;
    const sx = qx + (qx - p.x) / dl * 2.2, sy = qy + (qy - p.y) / dl * 2.2;
    if (isInWater(map, sx, sy) || isInsideBuilding(map, sx, sy)) continue;
    const sign = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.9, 6), new THREE.MeshStandardMaterial({ color: 0x4a4e52, metalness: 0.4, roughness: 0.6 }));
    pole.position.y = 0.95;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.86), new THREE.MeshBasicMaterial({ map: signTexture(), side: THREE.DoubleSide }));
    board.position.y = 1.7;
    sign.add(pole, board);
    sign.position.set(sx, map.groundHeightAt ? map.groundHeightAt(sx, sy) : 0, sy);
    sign.rotation.y = Math.atan2(p.x - sx, p.y - sy);
    sign.userData.at = { x: sx, y: sy };
    grp.add(sign);
  }
  getScene().add(grp);
  return grp;
}

function updateAlgae(dt, w) {
  const A = S.algae;
  const day = today(w);
  if (!A.lakes) A.lakes = lakesOf(w.map);
  const on = S.force.algae || algaeDay(day);
  if (A.day !== day || A.forced !== S.force.algae) {
    A.day = day;
    A.forced = S.force.algae;
    for (const g of A.built.values()) { getScene().remove(g); g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    A.built.clear();
    A.patches = [];
    A.byLake = new Map();
    if (on) {
      for (const lake of A.lakes) {
        const inW = (x, y) => isInWater(w.map, x, y);
        const patches = algaePatches(lake, S.force.algae ? nextAlgaeDay(day) : day, inW);
        if (S.force.algae && !patches.length) continue;
        A.byLake.set(lake.id, { lake, patches });
        A.patches.push(...patches);
      }
    }
  }
  if (!on) { if (A.group) A.group = null; return; }
  const p = w.player;
  // meshes only for the lakes near the player
  for (const [id, e] of A.byLake) {
    if (!e.patches.length) continue;
    const near = e.patches.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 700);
    const have = A.built.get(id);
    if (near && !have) { if (getScene()) A.built.set(id, buildLake(e.lake, e.patches)); }
    else if (!near && have) { getScene().remove(have); have.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); A.built.delete(id); }
    else if (have) have.traverse((o) => { if (o.userData.p) { o.rotation.z += dt * 0.02; o.material.opacity = 0.72 + Math.sin(w.time * 0.7 + o.userData.p.x) * 0.08; } });
  }
  // the news, once per algae day, when the player is near one of the lakes
  if (A.newsDay !== day && A.patches.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 400)) {
    A.newsDay = day;
    if (!w.phoneNotifications) w.phoneNotifications = [];
    w.phoneNotifications.push({ from: 'Kiekdoar', text: ALGAE_NEWS, duration: 6 });
  }
  // the swim penalty
  if (p.swimming && !p.inVehicle) {
    const hit = patchAt(A.patches, p.x, p.y);
    if (hit) {
      const eff = algaeEffect(true);
      w.health = algaeHurt(w.health, dt, eff);
      if (w.time - A.msgAt > 25) { A.msgAt = w.time; w.addMessage(ALGAE_SWIM_MSG, 4); }
    }
  }
}


// --- the Ontzet fireworks ---------------------------------------------------------------------------

function updateFireworks(dt, w) {
  const F = S.fw;
  const forced = S.force.fireworks;
  let st = forced != null ? { on: true, progress: forced } : showState(hourOf(w), isToday('ontzet', w));
  // no Ontzet show: a firework show of the summer agenda (evenementen.js, #131) goes up over its own town
  if (!st.on) st = showFor(today(w), hourOf(w));
  const where = st.at || GROTE_MARKT;
  const p = w.player;
  const d = dist(p, where);
  // shells already in the air finish their flight
  for (let i = F.shells.length - 1; i >= 0; i--) {
    const s = F.shells[i];
    s.t += dt;
    const k = Math.min(1, s.t / s.rise);
    if (k < 1) {
      const hh = s.h * (1 - (1 - k) * (1 - k));
      if (Math.random() < dt * 40) spawnFxSpark(s.x, hh, s.y, (Math.random() - 0.5) * 2, -3, (Math.random() - 0.5) * 2, 0.5);
      continue;
    }
    burst(s, d);
    F.shells.splice(i, 1);
  }
  for (let i = F.sounds.length - 1; i >= 0; i--) {
    const q = F.sounds[i];
    q.t -= dt;
    if (q.t <= 0) { pushAudioEvent(w, q.ev); F.sounds.splice(i, 1); }
  }
  if (!st.on || d > SHOW.range) return;
  F.gap -= dt;
  if (F.gap > 0) return;
  F.gap = shellGap(st.progress);
  const shell = makeShell(Math.random, where, st.progress);
  shell.t = 0;
  F.shells.push(shell);
  pushAudioEvent(w, { kind: 'weapon', sub: 'launch', x: shell.x, y: shell.y });
}

function burst(s, playerDist) {
  const [r, g, b] = s.color;
  const scale = (1 + Math.min(7, playerDist / 260)) * (s.big ? 1.5 : 1);
  const speed = (s.kind === 'ring' ? 17 : 14) * (s.big ? 1.3 : 1);
  const life = s.kind === 'willow' ? 2.8 : 1.5;
  for (let k = 0; k < s.n; k++) {
    const a = (k / s.n) * Math.PI * 2;
    const tilt = s.kind === 'ring' ? 0 : (Math.random() - 0.5) * 1.9;
    const sp = speed * (s.kind === 'ring' ? 1 : 0.55 + Math.random() * 0.5);
    spawnFxPuff(s.x, s.h, s.y, Math.cos(a) * sp * Math.cos(tilt * 0.5), Math.sin(tilt) * sp * 0.8, Math.sin(a) * sp * Math.cos(tilt * 0.5), life * (0.8 + Math.random() * 0.4),
      0.45 * scale, 1.4 * scale, r, g, b, 0.95, 1.7, s.kind === 'willow' ? -3.2 : -1.6);
    if (k % 3 === 0) spawnFxSpark(s.x, s.h, s.y, Math.cos(a) * sp * 1.1, Math.sin(tilt) * sp, Math.sin(a) * sp * 1.1, 1.1);
  }
  S.fw.sounds.push({ t: soundLag(playerDist), ev: { kind: 'weapon', sub: 'firework', x: s.x, y: s.y, z: s.h, far: true } });
}

// --- German tourists on the bloemetjesmarkt ------------------------------------------------------------

function countTourists() {
  let n = 0;
  for (const q of world ? world.pedestrians : []) if (q.tourist && q.state !== 'dead') n++;
  return n;
}

function updateTourists(dt, w) {
  const T = S.tourists;
  const p = w.player;
  // a tourist says something when you walk past, once in a while
  if (w.time - (T.sayAt || 0) > 6) {
    for (const q of w.pedestrians) {
      if (!q.tourist || q.state === 'dead' || (q.speechText && w.time < q.speechUntil)) continue;
      const d = dist(p, q);
      if (d > 7) continue;
      T.sayAt = w.time;
      q.speechText = pick(d < 3.2 ? GERMAN_HELLO : GERMAN_LINES);
      q.speechUntil = w.time + 3.6;
      break;
    }
  }
  T.t -= dt;
  if (T.t > 0) return;
  T.t = TOURISTS.spawnGap;
  const market = S.force.tourists || isToday('bloemetjesmarkt', w);
  const nearCentre = dist(p, GROTE_MARKT) < TOURISTS.radius + 120;
  const want = touristTarget({ market, hour: S.force.tourists ? 12 : hourOf(w), nearCentre });
  const have = countTourists();
  if (have >= want) return;
  const map = w.map;
  for (let tries = 0; tries < 12; tries++) {
    const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 45;
    const cx = p.x + Math.cos(a) * r, cy = p.y + Math.sin(a) * r;
    if (dist({ x: cx, y: cy }, GROTE_MARKT) > TOURISTS.radius) continue;
    if (isInsideBuilding(map, cx, cy) || isInWater(map, cx, cy) || !isSpawnHidden(w, cx, cy)) continue;
    const grp = touristGroup();
    for (let i = 0; i < grp.size; i++) {
      const ang = (i / grp.size) * Math.PI * 2;
      const ped = new Pedestrian(cx + Math.cos(ang) * 1.2, cy + Math.sin(ang) * 1.2, ang);
      ped.clothing = grp.shirt;
      ped.hasBag = true;
      ped.look = { bag: 'backpack', hat: 'cap', hatColor: grp.hat };
      ped.tourist = true;
      ped.anchor = { x: cx, y: cy, r: 35 };
      w.pedestrians.push(ped);
    }
    return;
  }
}
