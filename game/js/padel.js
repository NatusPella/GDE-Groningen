import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { canvasTex as sharedCanvasTex } from './canvastex.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk, TAMMO_APPEARANCE, ANITA_APPEARANCE, PERSON_RIG } from './models3d_people.js';
import { DURK_LOOK, DOUWE_LOOK } from './storycast.js';
import { isMissionActive, getActiveRace } from './missions.js';
import { isCinematicActive, showBanner } from './cinematics.js';
import { isShopOpen } from './shopui.js';
import { pushAudioEvent } from './pedgeom.js';
import { unlockAchievement, recordChallengeResult, getChallengeRecord, recordStat, setStatMax, MEDALS } from './achievements.js';
import { showCard } from './hudcards.js';
import { banterAfter } from './banter.js';
import { pointInPolygon, isInWater, clamp, nearestOnRoadList } from './util.js';
import { currentStep } from './story.js';
import { PADEL_PAIR, PADEL_TWINS } from './padellines.js';
import { bubbleVoiceFor } from './linevoice.js';
import { playLineVoice } from './audio.js';
import { rand } from './rng.js';
import { SET_GAMES, scorePoint, pointCall, judgeServeHit, serveInBox, serveFault, wallKind, judgeWall } from './padelrules.js';
import { loadEchtePlekken, padelDefs } from './echteplekken.js';
import { tilesIn, withTiles } from './tileplace.js';

// Padel courts where OSM has them (game/mapextras.json "padel", built by
// scripts/add_map_extras.py): a glass cage with blue turf, a net and lights
// that come on at night. E at the court door starts a short doubles match:
// you (and your companion at the net) against two regulars, or Durk and
// Douwe in the story step 's-padel'. A/D (W/S) to move, Space to swing
// when the ball is in reach (the ring under you turns green; A/D/W/S at the
// swing aim the shot). Simplified rules: the ball must bounce once in the
// other half before it may hit a wall there; two bounces, a ball into the
// net or straight into the far glass lose the point. The serve is underhand
// (padelrules.js): the ball bounces, you hit it below the waist into the diagonal
// box, two faults lose the point; glass and fence ring differently. Padel
// counting with a golden point at 40-40, a short set of four games; after MATCH_CAP s the next
// point ends it. Afterwards: full health and PADELFIT (health regenerates
// for a few minutes), a little money for a win, a medal record and a
// cooldown on that court.
//
// main.js calls initPadel, tryPadelInteract, updatePadel (instead of the
// player update while world.padelGame is set) and updatePadelWorld;
// prompts.js, hud_panel.js, mapview.js and spotcheck.js use padelPrompt,
// padelSecondary, getPadelSpotsForRender and drawPadelMapIcon; story.js
// counts matches with getPadelMatchCount. window.__padel (debug): start,
// finish, state, spots.

const FLOOR_Y = 0.1;
const W2 = 5, L2 = 10, NET_H = 0.92, WALL_H = 4, BALL_R = 0.05;
const G = 9.8;
const REACH = 1.45, REACH_Z = 2.4;
// a swing just after the ball left your reach still counts, as a late shot
const LATE_S = 0.15;
const ME_SPEED = 5.8, MATE_SPEED = 3.2;
const SWING_T = 0.32, SWING_BUFFER = 0.24;
const GAMES_TO_WIN = SET_GAMES; // a short set: first to four games (padelrules.js)
const MATCH_CAP = 240;
const INTRO_S = 2.6, POINT_S = 1.5, OUTRO_S = 1.2;
const COOLDOWN_S = 240;
const FIT_WIN_S = 300, FIT_LOSE_S = 180, FIT_RATE = 1.2;
const PRIZE = [0, 0, 40, 60];
const USE_RADIUS = 2.6;
const DETAIL_M = 170, VIS_M = 520;
const ACCENT = '#3aa6e8';
const CALL = ['0', '15', '30', '40'];
// per pair: the chance they miss a return, and of an unforced error when they
// do reach it (into the net or straight into the glass) and of a smash on a
// weak ball; the regulars are the easier pair
const OPP = { pair: { miss: 0.03, err: 0.05, smash: 0.4, speed: 4.3, pace: 1.4 }, twins: { miss: 0.025, err: 0.025, smash: 0.55, speed: 4.6, pace: 1.3 } };

let sites = [];
let game = null;
let matches = 0;
let lodT = 0;
let lastNight = -1;
let hud = null;
let mats = null;


// --- court geometry ------------------------------------------------------------

// Court frame: u across (-5..5), v along (-10..10, your half is v < 0).
function frameOf(cx, cy, rot) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return { cx, cy, rot, ax: -s, ay: c, lx: c, ly: s };
}
function toMap(f, u, v) {
  return { x: f.cx + f.ax * u + f.lx * v, y: f.cy + f.ay * u + f.ly * v };
}

// footprints
function solidAt(map, x, y) {
  for (const b of map.buildingsNear(x, y, 1)) {
    const [minx, miny, maxx, maxy] = b.bounds;
    if (x >= minx && x <= maxx && y >= miny && y <= maxy && pointInPolygon(x, y, b.pts)) return true;
  }
  return false;
}

function roadAt(map, x, y) {
  return map.roadsNear(x, y, 12).some((r) => {
    const q = nearestOnRoadList([r], x, y);
    return q && q.d < (r.width || 5) / 2 + 0.6;
  });
}

// A 12 x 22 m rectangle (court + margin) free of buildings, water and roads
// (buildings on a metre grid: a corner of a hall slips between coarser samples).
function fits(map, cx, cy, rot) {
  const f = frameOf(cx, cy, rot);
  for (let u = -6.2; u <= 6.21; u += 2.07) {
    for (let v = -11.2; v <= 11.21; v += 2.24) {
      const p = toMap(f, u, v);
      if (solidAt(map, p.x, p.y) || isInWater(map, p.x, p.y) || roadAt(map, p.x, p.y)) return false;
    }
  }
  for (let u = -6; u <= 6; u += 1) {
    for (let v = -11; v <= 11; v += 1) {
      const p = toMap(f, u, v);
      if (solidAt(map, p.x, p.y)) return false;
    }
  }
  return true;
}

// On a court's pad (the 12 x 22 m rectangle fits() cleared)?
function onCourt(x, y) {
  for (const s of sites) {
    for (const c of s.courts) {
      const f = c.f, dx = x - f.cx, dy = y - f.cy;
      if (dx * dx + dy * dy > 170) continue;
      if (Math.abs(dx * f.ax + dy * f.ay) < 6.2 && Math.abs(dx * f.lx + dy * f.ly) < 11.2) return true;
    }
  }
  return false;
}

function doorSpot(map, f) {
  for (const side of [1, -1]) {
    const p = toMap(f, side * (W2 + 1.1), -1.1);
    if (!solidAt(map, p.x, p.y) && !isInWater(map, p.x, p.y) && map.canWalkOut(p.x, p.y, 45)) return { ...p, side };
  }
  return null;
}

function searchCourt(map, x, y, rot0) {
  const rots = [rot0, rot0 + Math.PI / 2, 0.35, -0.8];
  for (let r = 0; r <= 160; r += 8) {
    const n = r ? Math.max(8, Math.round(r / 5)) : 1;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + r * 0.013;
      const cx = x + Math.cos(a) * r, cy = y + Math.sin(a) * r;
      if (solidAt(map, cx, cy) || isInWater(map, cx, cy)) continue;
      for (const rot of rots) {
        if (!fits(map, cx, cy, rot)) continue;
        const f = frameOf(cx, cy, rot);
        const door = doorSpot(map, f);
        if (door) return { f, door };
      }
    }
  }
  return null;
}

function placeSite(map, def, idx) {
  const courts = [];
  for (const c of def.courts || []) {
    if (courts.length >= 4) break;
    if (courts.some((q) => Math.hypot(q.f.cx - c.x, q.f.cy - c.y) < 11)) continue;
    if (!fits(map, c.x, c.y, c.rot)) continue;
    const f = frameOf(c.x, c.y, c.rot);
    courts.push({ f, door: doorSpot(map, f) });
  }
  if (!courts.some((c) => c.door)) {
    const found = searchCourt(map, def.x, def.y, (def.courts && def.courts[0] && def.courts[0].rot) || 0);
    if (found) courts.unshift(found);
  }
  const play = courts.find((c) => c.door);
  if (!play) return null;
  return { id: 'padel-' + idx, name: def.name || 'Padelbaan', src: def.src, x: play.door.x, y: play.door.y, court: play, courts, nextAt: 0, groups: [] };
}

// --- 3D ------------------------------------------------------------------------------

const canvasTex = (w, h, draw, repeat = null) => sharedCanvasTex(w, h, draw, { anisotropy: 4, repeat });

function materials() {
  if (mats) return mats;
  const PX = 20;
  const floorTex = canvasTex(12 * PX, 22 * PX, (g) => {
    g.fillStyle = '#3f8a4a'; g.fillRect(0, 0, 12 * PX, 22 * PX);
    g.fillStyle = '#2f6fb8'; g.fillRect(PX, PX, 10 * PX, 20 * PX);
    g.strokeStyle = '#f4f4ee'; g.lineWidth = 2.5;
    g.strokeRect(PX, PX, 10 * PX, 20 * PX);
    const sv = 6.95 * PX, mid = 11 * PX;
    g.beginPath();
    g.moveTo(PX, mid - sv); g.lineTo(11 * PX, mid - sv);
    g.moveTo(PX, mid + sv); g.lineTo(11 * PX, mid + sv);
    g.moveTo(6 * PX, mid - sv); g.lineTo(6 * PX, mid + sv);
    g.stroke();
    g.globalAlpha = 0.07;
    for (let i = 0; i < 900; i++) { g.fillStyle = i % 2 ? '#fff' : '#000'; g.fillRect(Math.random() * 12 * PX, Math.random() * 22 * PX, 2, 2); }
  });
  const meshTex = canvasTex(32, 32, (g) => {
    g.clearRect(0, 0, 32, 32);
    g.strokeStyle = 'rgba(40,44,42,0.8)'; g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, 31, 31);
  }, [1, 1]);
  meshTex.colorSpace = THREE.NoColorSpace;
  mats = {
    floor: new THREE.MeshLambertMaterial({ map: floorTex, emissive: new THREE.Color(0x000000), emissiveMap: floorTex }),
    glass: new THREE.MeshBasicMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
    fence: new THREE.MeshBasicMaterial({ map: meshTex, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide, color: 0x8a948d }),
    frame: new THREE.MeshLambertMaterial({ color: 0x1d2024 }),
    net: new THREE.MeshBasicMaterial({ color: 0x15181a, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
    tape: new THREE.MeshBasicMaterial({ color: 0xf2f2ec }),
    lamp: new THREE.MeshBasicMaterial({ color: 0x3a3d40 }),
    cone: new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: true }),
    ball: new THREE.MeshLambertMaterial({ color: 0xdff04a, emissive: new THREE.Color(0x3a4410) }),
    shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
    ring: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }),
    land: new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }),
    racket: new THREE.MeshLambertMaterial({ color: 0x1f5fb8 }),
    grip: new THREE.MeshLambertMaterial({ color: 0x202020 }),
  };
  mats.fenceTex = meshTex;
  return mats;
}

// Merge non-indexed copies of positioned geometries into one.
function merge(list) {
  const parts = list.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0;
  for (const g of parts) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  return out;
}

const M4 = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
function box(w, h, d, x, y, z, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.applyMatrix4(M4.compose(new THREE.Vector3(x, y, z), Q.setFromEuler(E.set(0, ry, 0)), new THREE.Vector3(1, 1, 1)));
  return g;
}
// A wall panel from (x0, z0) to (x1, z1), y0..y1 high; uv in metres.
function panel(x0, z0, x1, z1, y0, y1) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const g = new THREE.PlaneGeometry(len, y1 - y0);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 0.2, uv.getY(i) * (y1 - y0) / 0.2);
  g.applyMatrix4(M4.compose(new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), Q.setFromEuler(E.set(0, -Math.atan2(z1 - z0, x1 - x0), 0)), new THREE.Vector3(1, 1, 1)));
  return g;
}

// Local 3D: x = -u, z = v (the group turns x to the court's u axis).
function buildCourt(f) {
  const m = materials();
  const group = new THREE.Group();
  group.position.set(f.cx, 0, f.cy);
  group.rotation.y = Math.PI / 2 - f.rot;
  const floorGeo = new THREE.PlaneGeometry(12, 22);
  floorGeo.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeo, m.floor);
  floor.position.y = FLOOR_Y;
  floor.receiveShadow = true;
  group.add(floor);

  const detail = new THREE.Group();
  const glass = [], fence = [], frame = [];
  // your end's back fence and posts: hidden during a match, the camera looks through there
  const nearFence = [], nearFrame = [];
  for (const s of [-1, 1]) {
    // back wall: glass to 3 m, fence to 4 m
    glass.push(panel(-W2, s * L2, W2, s * L2, 0, 3));
    (s < 0 ? nearFence : fence).push(panel(-W2, s * L2, W2, s * L2, 3, 4));
    for (const side of [-1, 1]) {
      const x = side * W2;
      glass.push(panel(x, s * L2, x, s * (L2 - 2), 0, 3));
      glass.push(panel(x, s * (L2 - 2), x, s * (L2 - 4), 0, 2));
      fence.push(panel(x, s * (L2 - 4), x, s * 1.7, 0, 3));
      fence.push(panel(x, s * (L2 - 2), x, s * (L2 - 4), 2, 3));
      fence.push(panel(x, s * 0.5, x, -s * 0.5, 0, 3));
    }
  }
  for (let v = -L2; v <= L2 + 0.01; v += 2) {
    const h = Math.abs(v) >= L2 - 0.01 ? 4 : 3;
    for (const side of [-1, 1]) frame.push(box(0.09, h, 0.09, side * W2, h / 2, v));
  }
  for (let u = -W2 + 2; u < W2; u += 2) for (const s of [-1, 1]) (s < 0 ? nearFrame : frame).push(box(0.09, 4, 0.09, u, 2, s * L2));
  nearFrame.push(box(2 * W2, 0.07, 0.07, 0, 4, -L2));
  frame.push(box(2 * W2, 0.07, 0.07, 0, 4, L2));
  for (const side of [-1, 1]) {
    frame.push(box(0.07, 0.07, 2 * L2, side * W2, 3, 0));
    frame.push(box(0.1, 1.05, 0.1, side * (W2 + 0.15), 0.52, 0));
  }
  // light poles outside the corners
  const lamps = [], cones = [];
  for (const side of [-1, 1]) for (const s of [-1, 1]) {
    const x = side * (W2 + 0.7), z = s * (L2 - 3);
    frame.push(box(0.14, 6.4, 0.14, x, 3.2, z));
    frame.push(box(0.9, 0.08, 0.08, x - side * 0.4, 6.3, z));
    lamps.push(box(0.5, 0.16, 0.36, x - side * 0.85, 6.2, z));
    const cone = new THREE.ConeGeometry(2.4, 6.1, 14, 1, true);
    cone.applyMatrix4(M4.compose(new THREE.Vector3(x - side * 1.8, 3.05, z - s * 0.6), Q.setFromEuler(E.set(-s * 0.1, 0, side * 0.16)), new THREE.Vector3(1, 1, 1)));
    cones.push(cone);
  }
  detail.add(new THREE.Mesh(merge(glass), m.glass));
  detail.add(new THREE.Mesh(merge(fence), m.fence));
  const fr = new THREE.Mesh(merge(frame), m.frame);
  fr.castShadow = true;
  detail.add(fr);
  const near = new THREE.Group();
  near.add(new THREE.Mesh(merge(nearFence), m.fence));
  const nf = new THREE.Mesh(merge(nearFrame), m.frame);
  nf.castShadow = true;
  near.add(nf);
  detail.add(near);
  const net = new THREE.Mesh(panel(-W2 - 0.15, 0, W2 + 0.15, 0, 0.05, 0.88), m.net);
  detail.add(net);
  detail.add(new THREE.Mesh(box(2 * W2 + 0.3, 0.06, 0.03, 0, 0.9, 0), m.tape));
  group.add(detail);
  const lamp = new THREE.Mesh(merge(lamps), m.lamp);
  group.add(lamp);
  const cone = new THREE.Mesh(merge(cones), m.cone);
  cone.visible = false;
  cone.renderOrder = 3;
  group.add(cone);
  getScene().add(group);
  return { group, detail, cone, near };
}

function updateNight(w) {
  const night = (w.dayNight && w.dayNight.night) || 0;
  if (!mats || Math.abs(night - lastNight) < 0.01) return;
  lastNight = night;
  const on = clamp((night - 0.25) / 0.35, 0, 1);
  mats.floor.emissive.setRGB(0.28 * on, 0.28 * on, 0.28 * on);
  mats.lamp.color.setRGB(0.23 + 0.77 * on, 0.24 + 0.72 * on, 0.25 + 0.55 * on);
  mats.cone.opacity = 0.045 * on;
  for (const s of sites) for (const c of s.courts) if (c.mesh) c.mesh.cone.visible = on > 0.02;
}

function updateLod(w) {
  const p = w.player;
  for (const s of sites) for (const c of s.courts) {
    if (!c.mesh) continue;
    const d = Math.hypot(c.f.cx - p.x, c.f.cy - p.y);
    c.mesh.group.visible = d < VIS_M;
    c.mesh.detail.visible = d < DETAIL_M || (game && game.site.court === c);
  }
}

// --- map icon ----------------------------------------------------------------------

function drawGlyph(g, r) {
  g.save();
  g.scale(r / 10, r / 10);
  g.rotate(-0.6);
  g.fillStyle = '#f2ede0';
  g.beginPath(); g.ellipse(0, -3.2, 4.4, 5.2, 0, 0, Math.PI * 2); g.fill();
  g.fillRect(-1.1, 1.6, 2.2, 7.2);
  g.fillStyle = ACCENT;
  for (const [x, y] of [[-1.6, -5], [1.6, -5], [0, -3.2], [-1.6, -1.4], [1.6, -1.4]]) { g.beginPath(); g.arc(x, y, 0.75, 0, Math.PI * 2); g.fill(); }
  g.restore();
  g.fillStyle = '#dff04a';
  g.beginPath(); g.arc(r * 0.55, r * 0.45, r * 0.26, 0, Math.PI * 2); g.fill();
}

export function drawPadelMapIcon(ctx, s) {
  ctx.beginPath();
  ctx.arc(0, 0, 4.6 * s, 0, Math.PI * 2);
  ctx.fillStyle = ACCENT;
  ctx.fill();
  ctx.lineWidth = 1.2 * s;
  ctx.strokeStyle = '#0c140e';
  ctx.stroke();
  drawGlyph(ctx, 3.4 * s);
}

export function getPadelSpotsForRender() {
  return sites;
}

export function getPadelMatchCount() {
  return matches;
}

// --- init --------------------------------------------------------------------------

export function initPadel(w) {
  const defs = (w.map.meta && w.map.meta.padel) || [];
  sites = [];
  defs.forEach((d, i) => {
    let s = null;
    try { s = placeSite(w.map, d, i); } catch (e) { console.warn('padel', d.name, e); }
    if (!s) return;
    for (const c of s.courts) c.mesh = buildCourt(c.f);
    sites.push(s);
  });
  // de echte padelplekken uit OSM (game/echteplekken.json, #174): in de stad en het Ommeland.
  // Wat de oude lijst al dekt (binnen 250 m) blijft; de rest komt erbij, op de tegels van die plek.
  loadEchtePlekken().then(async (data) => {
    for (const d of padelDefs(data)) {
      if (sites.some((s) => Math.hypot(s.x - d.x, s.y - d.y) < 250)) continue;
      try {
        const idx = defs.length + sites.length;
        const place = () => { const s = placeSite(w.map, d, idx); if (s) { for (const c of s.courts) c.mesh = buildCourt(c.f); sites.push(s); } };
        if (tilesIn(w.map, [[d.x, d.y]], 200)) place();
        else await withTiles(w.map, [[d.x, d.y]], place, { radius: 200, token: 'padel' });
      } catch (e) { console.warn('padel', d.name, e); }
    }
  });
  // no grass through the court floor, no parked cars or clutter on it
  const prev = w.map.reservedAt;
  w.map.reservedAt = (x, y) => (prev ? prev(x, y) : false) || onCourt(x, y);
  window.__padel = {
    spots: () => sites.map((s) => ({ id: s.id, name: s.name, x: s.x, y: s.y, courts: s.courts.length, src: s.src })),
    start: (id) => { const s = id ? sites.find((q) => q.id === id) : nearestAny(w); return s ? startMatch(w, s, { force: true }) : false; },
    auto: (on = true) => { if (game) game.auto = !!on; return !!game; },
    finish: (win = true) => { if (!game) return false; game.games = win ? [GAMES_TO_WIN, 0] : [0, GAMES_TO_WIN]; endMatch(w); return true; },
    state: () => (game ? { phase: game.phase, games: [...game.games], points: [...game.points], t: game.t, rally: game.rally, twins: game.twins } : null),
  };
}

function nearestAny(w) {
  let best = null, bd = Infinity;
  for (const s of sites) {
    const d = Math.hypot(s.x - w.player.x, s.y - w.player.y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

// --- prompt and start -----------------------------------------------------------

function blockReason(w, s) {
  if (w.wanted > 0) return 'Niet nu: eerst de politie kwijt';
  if (isMissionActive() || getActiveRace()) return 'Niet nu: maak eerst je missie af';
  if (w.sideJob && w.sideJob.active) return 'Niet nu: je bent aan het werk';
  if (w.challenge) return 'Niet nu: eerst die uitdaging';
  if (s && w.time < s.nextAt && !storyTwins()) return `Baan bezet: nog ${Math.ceil((s.nextAt - w.time) / 60)} min`;
  return null;
}

function storyTwins() {
  try { const st = currentStep(); return !!st && st.id === 's-padel'; } catch (e) { return false; }
}

function nearestSpot(w) {
  const p = w.player;
  if (game || w.pigeonMode || w.heliRun || p.inVehicle || p.swimming) return null;
  let best = null, bd = USE_RADIUS;
  for (const s of sites) {
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

export function padelPrompt(w) {
  const s = nearestSpot(w);
  if (!s) return null;
  const why = blockReason(w, s);
  const rec = getChallengeRecord('padel');
  const sub = why || (storyTwins() ? 'Durk en Douwe staan al klaar' : rec && rec.medal ? `Potje padel · record: ${MEDALS[rec.medal].toLowerCase()}` : 'Potje padel tegen Hinderk en Grietje');
  return { id: s.id, x: s.x, y: s.y, h: 2.4, key: 'E', label: 'Padel spelen', sub, ring: true, dim: !!why };
}

export function padelSecondary(w) {
  if (game || w.player.inVehicle) return [];
  const { x, y } = w.player;
  const out = [];
  for (const s of sites) {
    if (Math.abs(s.x - x) > 25 || Math.abs(s.y - y) > 25) continue;
    out.push({ id: s.id + '-2', x: s.x, y: s.y, h: 2.2, label: s.name, sub: 'Loop naar de deur en druk E', kind: 'place' });
  }
  return out;
}

export function tryPadelInteract(w) {
  const input = w.input;
  if (!input || game || isShopOpen() || isCinematicActive()) return false;
  if (!(input.wasPressed('e') || input.wasPressed('f'))) return false;
  const s = nearestSpot(w);
  if (!s) return false;
  input.consume('e');
  input.consume('f');
  const why = blockReason(w, s);
  if (why) { w.addMessage(why, 2.5); return true; }
  startMatch(w, s);
  return true;
}

function look(opts) {
  const m = buildPersonMesh(opts.shirt, opts.skin, opts);
  const ud = m.userData;
  const hand = ud.elbowR || ud.armR;
  if (hand) {
    const r = new THREE.Group();
    const m2 = materials();
    // a pala: a stringless, solid blade with holes, a short handle
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.045, 18), m2.racket);
    head.rotation.z = Math.PI / 2;
    head.scale.set(1, 1, 1.15);
    head.position.y = -0.34;
    r.add(head);
    for (let k = 0; k < 6; k++) {
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.018, 8), m2.grip);
      hole.position.set(0.024, -0.3 - (k % 3) * 0.05, Math.floor(k / 3) ? 0.05 : -0.05);
      hole.rotation.y = Math.PI / 2;
      r.add(hole);
    }
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.14, 0.035), m2.grip);
    grip.position.y = -0.1;
    r.add(grip);
    r.position.y = -(PERSON_RIG.FOREARM || 0.26) - 0.02;
    hand.add(r);
  }
  getScene().add(m);
  return m;
}

const PAIR_LOOKS = {
  Hinderk: { shirt: 0xf2c230, skin: 0xe2b48c, hair: 0x8a8580, variant: 'male', pants: 0xf2f0ea, shoes: 0xf2f0ea, hairStyle: 'short', seed: 4101, look: { age: 'adult', hat: null, bag: null, umbrella: null, glasses: false } },
  Grietje: { shirt: 0xe0457a, skin: 0xd9a57c, hair: 0x5a3d26, variant: 'female', pants: 0x26262a, shoes: 0xf2f0ea, hairStyle: 'long', seed: 4102, look: { age: 'adult', hat: null, bag: null, umbrella: null } },
};

function startMatch(w, s, { force = false } = {}) {
  if (game) return false;
  const p = w.player;
  if (!force && (p.inVehicle || p.swimming)) return false;
  if (p.inVehicle) p.exitVehicle(w.map, w);
  const twins = storyTwins();
  const meLook = p.character === 'anita' ? ANITA_APPEARANCE : TAMMO_APPEARANCE;
  const mateLook = p.character === 'anita' ? TAMMO_APPEARANCE : ANITA_APPEARANCE;
  const names = twins ? ['Durk', 'Douwe'] : ['Hinderk', 'Grietje'];
  const lines = twins ? PADEL_TWINS : PADEL_PAIR;
  const oppLooks = twins ? [DURK_LOOK, DOUWE_LOOK] : [PAIR_LOOKS.Hinderk, PAIR_LOOKS.Grietje];
  const f = s.court.f;
  const mk = (lk, u, v, side, extra = {}) => ({ mesh: look(lk), u, v, hu: u, hv: v, side, swing: 0, speed: 0, ...extra });
  game = {
    site: s, f, twins, t: 0, phase: 'intro', phaseT: INTRO_S, games: [0, 0], points: [0, 0], server: 0, serveSide: 1,
    rally: 0, bestRally: 0, pointsWon: 0, capped: false, lastWinner: -1, buffer: 0, lines, names, sayT: 0, lastSay: -9,
    me: mk(meLook, 1.5, -8, 0), mate: mk(mateLook, -2.2, -2.6, 0),
    opp: [mk(oppLooks[0], -2.3, 8, 1, { name: names[0] }), mk(oppLooks[1], 2.3, 8, 1, { name: names[1] })],
    ball: null, exitX: s.x, exitY: s.y,
  };
  for (const o of game.opp) o.female = !!lines[o.name].female;
  game.ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), materials().ball);
  game.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.12, 14).rotateX(-Math.PI / 2), materials().shadow);
  game.ring = new THREE.Mesh(new THREE.RingGeometry(REACH - 0.12, REACH, 36).rotateX(-Math.PI / 2), materials().ring);
  game.land = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.32, 20).rotateX(-Math.PI / 2), materials().land);
  for (const m of [game.ballMesh, game.shadow, game.ring, game.land]) { m.visible = false; getScene().add(m); }
  w.padelGame = game;
  if (s.court.mesh) s.court.mesh.near.visible = false;
  w.cinematicHidePlayers = true;
  document.body.classList.add('padel-on');
  ensureHud();
  hud.root.hidden = false;
  showCard(w, { kind: 'tip', kicker: 'Padel', title: twins ? 'Tegen Durk en Douwe' : 'Potje padel', body: '[A] [D] [W] [S] lopen, [Spatie] slaan als de ring groen is. Eerst naar 2 games.', duration: 7, key: 'padel-help', voice: false });
  oppSay(w, 0, 'start', true);
  placeActors(w, 0);
  return true;
}

// --- the match -----------------------------------------------------------------------

function newBall(u, v, z) {
  return { u, v, z, vu: 0, vv: 0, vz: 0, hitter: -1, bounces: 0, crossed: false, live: false };
}

function serveSetup() {
  const g = game;
  const side = g.serveSide;
  const team = side === -1 ? 0 : 1;
  g.server = team;
  const sgn = (g.points[0] + g.points[1]) % 2 ? -1 : 1;
  if (team === 0) {
    g.me.u = 2.2 * sgn; g.me.v = -9.2;
    g.mate.u = -2.2 * sgn; g.mate.v = -2.6;
  } else {
    const o = g.opp[(g.points[0] + g.points[1]) % 2];
    o.u = -2.2 * sgn; o.v = 9.2;
    g.me.v = -8.5;
  }
  g.phase = 'serve';
  g.phaseT = team === 0 ? 6 : rand(0.9, 1.4);
  g.ball = null;
  g.rally = 0;
}

function hitBall(g, who, side, ut, vt, T, fault = false, q = 0.5) {
  const b = g.ball;
  g.shotQ = q;
  g.sinceHot = 9;
  b.hitter = side;
  b.bounces = 0;
  b.crossed = false;
  b.live = true;
  if (fault) { vt = side === 0 ? -0.6 : 0.6; T = 0.55; }
  let t = T;
  for (let k = 0; k < 12; k++) {
    b.vu = (ut - b.u) / t;
    b.vv = (vt - b.v) / t;
    b.vz = (BALL_R - b.z + 0.5 * G * t * t) / t;
    if (fault) break;
    const tc = -b.v / b.vv;
    if (!(tc > 0 && tc < t)) break;
    const zc = b.z + b.vz * tc - 0.5 * G * tc * tc;
    if (zc > NET_H + 0.18) break;
    t += 0.1;
  }
  who.swing = SWING_T;
  g.rally++;
  g.bestRally = Math.max(g.bestRally, g.rally);
  predictLanding(g);
  pushAudioEvent(g.w || { audioEvents: [] }, { kind: 'pala', strength: 0.35 + q * 0.4 });
}

function sideOf(v) { return v < 0 ? 0 : 1; }

// team: 0 you, 1 them
function pointTo(w, team, why = '') {
  const g = game;
  if (g.phase !== 'rally' && g.phase !== 'serve') return;
  g.lastWinner = team;
  g.ball.live = false;
  if (team === 0) g.pointsWon++;
  const r = scorePoint({ points: g.points, games: g.games }, team, GAMES_TO_WIN);
  const gameWon = r.gameWon;
  g.points = r.points;
  g.games = r.games;
  g.faults = 0;
  if (gameWon) g.serveSide = -g.serveSide;
  const over = r.over || g.capped;
  oppSay(w, Math.random() < 0.5 ? 0 : 1, team === 1 ? 'score' : 'lose');
  g.flash = { text: over ? (team === 0 ? 'Set voor jullie' : 'Set voor hen') : gameWon ? `Game ${team === 0 ? 'voor jullie' : 'voor hen'}` : team === 0 ? 'Punt voor jullie' : 'Punt voor hen', why, t: POINT_S };
  g.phase = over ? 'outro' : 'point';
  g.phaseT = over ? OUTRO_S : POINT_S;
}

// A fault on the serve: a second serve, or after two a point for the receivers.
function fault(w, why) {
  const g = game;
  const f = serveFault(g.faults || 0);
  g.ball.live = false;
  if (f.double) { pointTo(w, 1 - g.server, 'Dubbele fout'); return; }
  g.faults = f.faults;
  g.flash = { text: 'Fout: tweede serve', why, t: POINT_S };
  g.ball = null;
  g.phase = 'serve';
  g.phaseT = g.server === 0 ? 6 : rand(0.9, 1.4);
  g.rally = 0;
}

function stepBall(w, dt) {
  const g = game;
  const b = g.ball;
  if (!b || !b.live) return;
  const n = 4, h = dt / n;
  for (let i = 0; i < n && b.live; i++) {
    const v0 = b.v;
    b.u += b.vu * h; b.v += b.vv * h; b.z += b.vz * h;
    b.vz -= G * h;
    // net
    if ((v0 < 0) !== (b.v < 0)) {
      const into = sideOf(b.v);
      if (b.z < NET_H && b.serve && !b.serveOk) { fault(w, 'Serve in het net'); return; }
      if (b.z < NET_H) {
        b.v = v0 < 0 ? -0.06 : 0.06;
        b.vv *= -0.2; b.vu *= 0.5; b.vz = Math.min(b.vz, 0);
      } else if (into === b.hitter) {
        pointTo(w, b.hitter, 'Terug over het net'); return;
      } else b.crossed = true;
    }
    // floor
    if (b.z < BALL_R) {
      b.z = BALL_R;
      if (b.vz < 0) {
        b.vz = -b.vz * 0.7; b.vu *= 0.86; b.vv *= 0.86;
        pushAudioEvent(w, { kind: 'plop', x: toMap(g.f, b.u, b.v).x, y: toMap(g.f, b.u, b.v).y, strength: 0.25 });
        const s = sideOf(b.v);
        if (b.serve && !b.serveOk) {
          // the serve has to land in the diagonal box on the far side
          if (s !== b.hitter && serveInBox(b.serveU, b.hitter, b.u, b.v)) b.serveOk = true;
          else { fault(w, s === b.hitter ? 'Serve in het net' : 'Serve buiten het vak'); return; }
        }
        if (s === b.hitter) { pointTo(w, 1 - b.hitter, b.crossed ? '' : 'In het net'); return; }
        if (++b.bounces >= 2) { pointTo(w, b.hitter, 'Twee keer gestuit'); return; }
      }
    }
    // glass and fence
    const wallU = Math.abs(b.u) > W2 - BALL_R, wallV = Math.abs(b.v) > L2 - BALL_R;
    if (wallU || wallV) {
      const s = sideOf(b.v);
      const j = judgeWall({ z: b.z, side: s, hitter: b.hitter, bounces: b.bounces });
      if (!j.play) {
        if (b.serve && !b.serveOk) { fault(w, 'Serve buiten het vak'); return; }
        pointTo(w, j.point, j.why); return;
      }
      const wk = wallKind(b.z);
      const mp = toMap(g.f, b.u, b.v);
      pushAudioEvent(w, { kind: wk.kind === 'glas' ? 'padelglas' : 'padelgaas', x: mp.x, y: mp.y, strength: Math.min(1, Math.hypot(b.vu, b.vv) / 12) });
      if (wallU) { b.u = Math.sign(b.u) * (W2 - BALL_R); b.vu *= -wk.rest; b.vv *= 0.9; }
      if (wallV) { b.v = Math.sign(b.v) * (L2 - BALL_R); b.vv *= -wk.rest; b.vu *= 0.9; }
      g.predictAt = 0;
    }
  }
}

// Where the ball will next be playable on its current side: the first time
// after its first bounce there (or before it, near the net) at hitting height.
function simulate(b, maxT = 3) {
  const s = { ...b };
  const h = 0.02;
  let first = null;
  for (let t = 0; t < maxT; t += h) {
    const v0 = s.v;
    s.u += s.vu * h; s.v += s.vv * h; s.z += s.vz * h; s.vz -= G * h;
    if ((v0 < 0) !== (s.v < 0) && s.z < NET_H) { s.v = v0; s.vv *= -0.2; }
    if (s.z < BALL_R && s.vz < 0) {
      s.z = BALL_R; s.vz = -s.vz * 0.7; s.vu *= 0.86; s.vv *= 0.86; s.bounces++;
      if (!first) first = { u: s.u, v: s.v };
      if (s.bounces >= 2) break;
    }
    if (Math.abs(s.u) > W2) { s.u = Math.sign(s.u) * W2; s.vu *= -0.72; }
    if (Math.abs(s.v) > L2) { s.v = Math.sign(s.v) * L2; s.vv *= -0.72; }
    if (s.bounces === 1 && s.z > 0.55 && s.z < 1.35 && s.vz < 1.5) return { u: s.u, v: s.v, t, first };
  }
  return { u: s.u, v: s.v, t: maxT, first };
}

function predictLanding(g) {
  const b = g.ball;
  const r = simulate({ ...b, bounces: 0 });
  g.pred = r;
  g.predictAt = 0.25;
  // the opponents decide once per shot whether they will reach it
  if (b.hitter === 0) {
    const o = g.opp.reduce((a, c) => (Math.abs(c.u - r.u) + Math.abs(c.v - r.v) < Math.abs(a.u - r.u) + Math.abs(a.v - r.v) ? c : a));
    const opp = g.twins ? OPP.twins : OPP.pair;
    const far = Math.hypot(o.u - r.u, o.v - r.v) / opp.speed > r.t + 0.15;
    g.chaser = o;
    g.oppMiss = far ? Math.random() < 0.55 : Math.random() < opp.miss + g.rally * 0.02 + Math.max(0, g.shotQ - 0.6) * 0.7;
    g.mateTry = false;
  } else {
    g.chaser = null;
    g.mateTry = Math.random() < 0.4;
  }
}

function inReach(a, b) {
  return b && b.live && Math.hypot(b.u - a.u, b.v - a.v) < REACH && b.z < REACH_Z && b.z > 0.08;
}

function playerSwing(w, g) {
  const b = g.ball, me = g.me;
  const input = w.input;
  const d = Math.hypot(b.u - me.u, b.v - me.v);
  const dq = 1 - Math.abs(d - 0.75) / 0.8, hq = 1 - Math.abs(b.z - 1.05) / 1.35;
  let q = clamp(0.55 * clamp(dq, 0, 1) + 0.45 * clamp(hq, 0, 1) + (b.bounces && b.vz < 0 ? 0.1 : 0) - (g.late || 0), 0, 1);
  const left = input.isDown('a') || input.isDown('arrowleft'), right = input.isDown('d') || input.isDown('arrowright');
  const deep = input.isDown('w') || input.isDown('arrowup'), short = input.isDown('s') || input.isDown('arrowdown');
  let ut = right ? 3.7 : left ? -3.7 : -Math.sign((g.opp[0].u + g.opp[1].u) / 2 || 1) * rand(1.2, 3);
  let vt = deep ? 8.8 : short ? 3.4 : 6.6;
  let T = (deep ? 0.5 : 0) + 1.4 - 0.6 * q;
  ut += rand(-1, 1) * (1 - q) * 2.4;
  vt += rand(-1, 1) * (1 - q) * 1.8;
  const fault = q < 0.16 && Math.random() < 0.55;
  hitBall(g, me, 0, clamp(ut, -4.6, 4.6), clamp(vt, 1.2, 9.6), T, fault, q);
  g.lastQ = q;
  if (q > 0.85 && !fault) g.flash = { text: 'Perfect!', t: 0.8, small: true };
}

function oppHit(g, o) {
  const me = g.me;
  const q = rand(0.4, 0.92);
  const away = me.u > 0 ? rand(-4.2, -1.2) : rand(1.2, 4.2);
  const ut = Math.random() < 0.65 ? away : rand(-4, 4);
  const lob = Math.random() < 0.2;
  const opp = g.twins ? OPP.twins : OPP.pair;
  if (Math.random() < opp.err + g.rally * 0.004) {
    // an unforced error: into the net, or long, straight into your back glass
    if (Math.random() < 0.6) hitBall(g, o, 1, ut, 0, 0.55, true);
    else hitBall(g, o, 1, ut, -11.5, 0.9);
    return;
  }
  // a weak ball of yours sits up for a smash: fast and deep into a corner
  if (g.shotQ < 0.45 && Math.random() < opp.smash) {
    hitBall(g, o, 1, away, rand(-9.2, -7.4), rand(0.85, 1));
    g.flash = { text: 'Smash!', t: 0.8, small: true };
    return;
  }
  hitBall(g, o, 1, ut, rand(-9, -4.2), (lob ? 0.6 : 0) + opp.pace - 0.5 * q);
}

function moveTo(a, u, v, speed, dt) {
  const du = u - a.u, dv = v - a.v, d = Math.hypot(du, dv);
  const step = Math.min(d, speed * dt);
  if (d > 1e-3) { a.u += du / d * step; a.v += dv / d * step; }
  a.speed = dt > 0 ? step / dt : 0;
}

function updateMatch(w, dt) {
  const g = game;
  g.w = w;
  // Space and the movement keys belong to the match (player.js: no jump meanwhile)
  w.minigameUntil = w.time + 0.25;
  g.t += dt;
  g.phaseT -= dt;
  if (g.flash && (g.flash.t -= dt) <= 0) g.flash = null;
  if (g.t > MATCH_CAP && !g.capped) { g.capped = true; g.flash = { text: 'Beslissend punt!', t: 2 }; }
  const input = w.input;
  const me = g.me;
  // you: A/D across, W/S along your half
  let mu = 0, mv = 0;
  if (input.isDown('a') || input.isDown('arrowleft')) mu -= 1;
  if (input.isDown('d') || input.isDown('arrowright')) mu += 1;
  if (input.isDown('w') || input.isDown('arrowup')) mv += 1;
  if (input.isDown('s') || input.isDown('arrowdown')) mv -= 1;
  if (g.auto && g.ball && g.ball.live && g.ball.hitter === 1 && g.pred) {
    const tu = g.pred.u - 0.5, tv = Math.min(-1, g.pred.v - 0.3);
    mu = Math.abs(tu - me.u) > 0.15 ? Math.sign(tu - me.u) : 0;
    mv = Math.abs(tv - me.v) > 0.15 ? Math.sign(tv - me.v) : 0;
    if (inReach(me, g.ball) && g.ball.crossed) g.buffer = 0.1;
  }
  if (g.auto && g.phase === 'serve' && g.server === 0 && g.phaseT < 5) g.buffer = 0.1;
  const ml = Math.hypot(mu, mv) || 1;
  if (g.phase !== 'serve' || g.server !== 0) {
    me.u = clamp(me.u + mu / ml * ME_SPEED * dt, -W2 + 0.35, W2 - 0.35);
    me.v = clamp(me.v + mv / ml * ME_SPEED * dt, -L2 + 0.4, -0.9);
  }
  me.speed = (mu || mv) ? ME_SPEED : 0;
  const swingKey = input.wasPressed(' ');
  if (swingKey) { input.consume(' '); g.buffer = SWING_BUFFER; if (me.swing <= 0) { me.swing = SWING_T; pushAudioEvent(w, { kind: 'whoosh', strength: 0.2 }); } }
  else g.buffer = Math.max(0, g.buffer - dt);
  if (input.wasPressed('backspace')) { input.consume('backspace'); endMatch(w, { quit: true }); return; }

  if (g.phase === 'intro') {
    if (g.phaseT <= 0) serveSetup();
  } else if (g.phase === 'serve') {
    const server = g.server === 0 ? me : g.opp[(g.points[0] + g.points[1]) % 2];
    // underhand: the ball is held at the waist, dropped and hit after its bounce
    if (!g.ball) {
      g.ball = newBall(server.u + (g.server === 0 ? 0.4 : -0.4), server.v + (g.server === 0 ? 0.3 : -0.3), 1.0);
      g.ball.toss = { wait: 0.5, bounced: false };
    }
    const tb = g.ball;
    if (tb.toss) {
      if ((tb.toss.wait -= dt) <= 0) {
        tb.vz -= G * dt; tb.z += tb.vz * dt;
        if (tb.z <= BALL_R) {
          tb.z = BALL_R; tb.vz = Math.abs(tb.vz) * 0.75;
          if (!tb.toss.bounced) pushAudioEvent(w, { kind: 'plop', x: toMap(g.f, tb.u, tb.v).x, y: toMap(g.f, tb.u, tb.v).y, strength: 0.3 });
          tb.toss.bounced = true;
        }
      }
      const ready = judgeServeHit({ bounced: tb.toss.bounced, z: tb.z }) === 'ok';
      if (g.server === 0) {
        if (g.buffer > 0 && !ready) g.buffer = 0;
        if (ready && (g.buffer > 0 || g.phaseT <= 0)) {
          g.buffer = 0;
          const ut = -Math.sign(me.u || 1) * 2.6 + ((input.isDown('a') ? -1 : 0) + (input.isDown('d') ? 1 : 0)) * 3.0;
          hitBall(g, me, 0, ut, rand(3.5, 6.4), 1.2);
          g.ball.serve = true; g.ball.serveU = me.u; g.phase = 'rally';
        }
      } else if (ready && g.phaseT <= 0) {
        const slip = Math.random() < 0.04;
        hitBall(g, server, 1, -Math.sign(server.u || 1) * 2.6 + (slip ? Math.sign(server.u || 1) * 4 : 0), rand(-6.4, -3.5), 1.25);
        g.ball.serve = true; g.ball.serveU = server.u; g.phase = 'rally';
      }
    }
  } else if (g.phase === 'rally') {
    stepBall(w, dt);
    const b = g.ball;
    if (g.phase === 'rally' && b.live) {
      // you (a moment after the ball passed you still counts, as a late shot)
      const hot = b.hitter === 1 && b.crossed && inReach(me, b);
      g.sinceHot = hot ? 0 : g.sinceHot + dt;
      const late = !hot && b.hitter === 1 && g.sinceHot < LATE_S && b.z > 0.08 && b.z < REACH_Z;
      if ((hot || late) && g.buffer > 0) {
        g.late = late ? 0.2 : me.swing < SWING_T - 0.12 ? 0.12 : 0;
        g.buffer = 0;
        playerSwing(w, g);
      }
      // your partner at the net takes a volley now and then
      const mate = g.mate;
      if (b.live && b.hitter === 1 && b.crossed && b.bounces === 0 && g.mateTry && inReach(mate, b) && b.z > 0.7 && Math.hypot(b.u - me.u, b.v - me.v) > 2.4) {
        g.mateTry = false;
        hitBall(g, mate, 0, rand(-4, 4), rand(4, 8.5), 1.15, false, 0.6);
      }
      // them
      if (b.live && b.hitter === 0 && b.crossed && g.chaser && !g.oppMiss) {
        const o = g.chaser;
        const d = Math.hypot(b.u - o.u, b.v - o.v);
        if (d < 1.05 && b.z < 2.2 && b.z > 0.2 && (b.bounces === 1 || b.v < 4)) oppHit(g, o);
      }
    }
  } else if (g.phase === 'point') {
    if (g.phaseT <= 0) serveSetup();
  } else if (g.phase === 'outro') {
    if (g.phaseT <= 0) { endMatch(w); return; }
  }

  // AI movement
  const b = g.ball;
  for (const o of g.opp) {
    let tu = o.hu, tv = o.hv;
    if (g.phase === 'rally' && b && b.live && o === g.chaser && g.pred) { tu = g.pred.u + (o.u < g.pred.u ? -0.35 : 0.35); tv = Math.max(1.2, g.pred.v + 0.4); }
    else if (g.phase === 'rally' && b) tu = clamp(o.hu * 0.6 + b.u * 0.25, -4.5, 4.5);
    if (g.phase === 'serve' && g.server === 1 && o === g.opp[(g.points[0] + g.points[1]) % 2]) continue;
    moveTo(o, tu, tv, (g.twins ? OPP.twins : OPP.pair).speed * (g.oppMiss && o === g.chaser ? 0.7 : 1), dt);
  }
  const mate = g.mate;
  const mu2 = clamp(-Math.sign(me.u || 1) * 2.2 + (b ? b.u * 0.25 : 0), -4.3, 4.3);
  if (!(g.phase === 'serve' && g.server === 0)) moveTo(mate, mu2, -2.6, MATE_SPEED, dt);
  if (g.phase === 'point' || g.phase === 'outro') for (const o of g.opp) moveTo(o, o.hu, o.hv, 2, dt);
  for (const a of [me, mate, ...g.opp]) a.swing = Math.max(0, a.swing - dt);
  placeActors(w, dt);
  updateHud(w);
}

function placeActors(w, dt) {
  const g = game, f = g.f;
  const b = g.ball;
  for (const a of [g.me, g.mate, ...g.opp]) {
    const p = toMap(f, a.u, a.v);
    a.mesh.position.set(p.x, FLOOR_Y, p.y);
    const face = a.side === 0 ? f.rot : f.rot + Math.PI;
    a.mesh.rotation.y = -face;
    animatePersonWalk(a.mesh, a.speed || 0, dt);
    const ud = a.mesh.userData;
    if (ud.armR) {
      const k = a.swing > 0 ? 1 - a.swing / SWING_T : -1;
      if (k >= 0) ud.armR.rotation.set(0, 0, -1.2 + 2.6 * Math.sin(k * Math.PI * 0.5));
      else ud.armR.rotation.set(0, 0, -0.5);
      if (ud.elbowR) ud.elbowR.rotation.z = 0.3;
    }
  }
  // player position follows the actor (map icon, audio, streaming)
  const mp = toMap(f, g.me.u, g.me.v);
  const pl = w.player;
  pl.x = mp.x; pl.y = mp.y; pl.angle = f.rot;
  if (b) {
    const q = toMap(f, b.u, b.v);
    g.ballMesh.visible = true;
    g.ballMesh.position.set(q.x, FLOOR_Y + b.z + 0.05, q.y);
    g.shadow.visible = true;
    g.shadow.position.set(q.x, FLOOR_Y + 0.015, q.y);
    g.shadow.scale.setScalar(clamp(1 - b.z / 6, 0.4, 1));
  } else { g.ballMesh.visible = false; g.shadow.visible = false; }
  const hot = b && b.live && b.hitter === 1 && b.crossed && inReach(g.me, b);
  g.ring.visible = g.phase === 'rally' || (g.phase === 'serve' && g.server === 0);
  g.ring.position.set(mp.x, FLOOR_Y + 0.02, mp.y);
  materials().ring.color.set(hot ? 0x5dff7a : 0xffffff);
  materials().ring.opacity = hot ? 0.85 : 0.35;
  const land = g.pred && g.pred.first && b && b.live && b.hitter === 1 && b.bounces === 0;
  g.land.visible = !!land;
  if (land) { const lp = toMap(f, g.pred.first.u, g.pred.first.v); g.land.position.set(lp.x, FLOOR_Y + 0.025, lp.y); }
  padelCamera(w);
}

// The camera behind your baseline; main.js calls it again after the cutscene
// update, which clears cameraOverride every frame.
export function padelCamera(w) {
  const g = game;
  if (!g) return;
  const f = g.f;
  const cu = g.me.u * 0.6, cam = toMap(f, cu, -L2 - 5.2), at = toMap(f, g.me.u * 0.15, 2);
  w.cameraOverride = { position: { x: cam.x, y: cam.y, z: 5.3 }, lookAt: { x: at.x, y: at.y, z: 0.7 }, fov: 55, cut: true };
}

// An opponent's line: a speech bubble, voiced up front like the other
// minigame voices (the court is wide, a positional bubble voice got lost).
function voiceBubble(w, sp) {
  const v = bubbleVoiceFor(sp.speechText, sp.female);
  if (v && playLineVoice(v.src, v.dur, 'job')) sp._voicedText = sp.speechText;
}

// A line from one of the opponents (a speech bubble with its recording).
function oppSay(w, who, kind, force = false) {
  const g = game;
  if (!g || (!force && g.t - g.lastSay < 5)) return;
  if (!force && Math.random() < 0.45) return;
  const o = g.opp[who] || g.opp[0];
  const set = g.lines[o.name] && g.lines[o.name][kind];
  if (!set || !set.length) return;
  const text = set[Math.floor(Math.random() * set.length)];
  g.lastSay = g.t;
  const pos = { get x() { return toMap(g.f, o.u, o.v).x; }, get y() { return toMap(g.f, o.u, o.v).y; } };
  const list = w.extraSpeakers || (w.extraSpeakers = []);
  const sp = { x: pos.x, y: pos.y, h: 2.3, follow: pos, female: o.female, speechName: o.name, speechText: text, speechUntil: w.time + Math.max(2.6, 1.2 + text.length * 0.06) };
  voiceBubble(w, sp);
  list.push(sp);
}

function medalOf(g) {
  const [a, b] = g.games;
  if (a > b) return b === 0 ? 3 : 2;
  if (a === b && g.lastWinner === 0) return 2;
  return a > 0 || g.pointsWon >= 4 ? 1 : 0;
}

function endMatch(w, { quit = false } = {}) {
  const g = game;
  if (!g) return;
  game = null;
  w.padelGame = null;
  if (g.site.court.mesh) g.site.court.mesh.near.visible = true;
  w.cinematicHidePlayers = false;
  w.cameraOverride = null;
  document.body.classList.remove('padel-on');
  for (const a of [g.me, g.mate, ...g.opp]) getScene().remove(a.mesh);
  for (const m of [g.ballMesh, g.shadow, g.ring, g.land]) { getScene().remove(m); m.geometry.dispose(); }
  if (hud) hud.root.hidden = true;
  const p = w.player;
  p.x = g.exitX; p.y = g.exitY; p.angle = g.f.rot + Math.PI;
  if (w.extraSpeakers) w.extraSpeakers = w.extraSpeakers.filter((e) => !g.opp.some((o) => e.speechName === o.name));
  // a match given up only blocks the court for a moment
  g.site.nextAt = w.time + (quit ? 20 : COOLDOWN_S);
  if (quit) { w.addMessage('Potje padel opgegeven', 2.5); return; }
  matches++;
  const win = g.games[0] > g.games[1] || (g.games[0] === g.games[1] && g.lastWinner === 0);
  const medal = medalOf(g);
  const rec = recordChallengeResult(w, 'padel', { value: g.pointsWon, medal });
  recordStat(w, 'padelMatches');
  setStatMax(w, 'padelRally', g.bestRally);
  unlockAchievement(w, 'padel_klaar');
  if (win) unlockAchievement(w, 'padel_winst');
  if (medal >= 3) unlockAchievement(w, 'padel_goud');
  const prize = PRIZE[medal] || 0;
  if (prize) w.money += prize;
  w.health = 100;
  w.padelFitUntil = w.time + (win ? FIT_WIN_S : FIT_LOSE_S);
  const stats = [['Games', `${g.games[0]}-${g.games[1]}`], ['Langste rally', `${g.bestRally} slagen`], ['Padelfit', `${Math.round((win ? FIT_WIN_S : FIT_LOSE_S) / 60)} min herstel`]];
  if (medal) stats.push(['Medaille', MEDALS[medal]]);
  if (rec && rec.newBest) stats.push(['Record', 'Nieuw!']);
  showBanner({ kind: win ? 'pass' : 'fail', title: win ? 'PADEL GEWONNEN' : 'PADEL VERLOREN', reason: g.twins ? (win ? 'Durk en Douwe druipen af' : 'Durk en Douwe waren groter') : '', reward: prize, stats });
  showCard(w, { kind: 'prestatie', kicker: 'Padelfit', title: 'Volle gezondheid', body: `En ${Math.round((win ? FIT_WIN_S : FIT_LOSE_S) / 60)} minuten extra herstel`, key: 'padel-fit', voice: false });
  const who = g.opp[win ? 1 : 0];
  const list = w.extraSpeakers || (w.extraSpeakers = []);
  const text = (g.lines[who.name][win ? 'lost' : 'won'] || [])[0];
  if (text) {
    const sp = { x: g.exitX, y: g.exitY, h: 2.3, female: who.female, speechName: who.name, speechText: text, speechUntil: w.time + 3.5 };
    voiceBubble(w, sp);
    list.push(sp);
  }
  banterAfter(`after:padel:${win ? 'pass' : 'fail'}`);
}

export function updatePadel(dt, w) {
  if (!game) return;
  if (w.pendingRespawn) { endMatch(w, { quit: true }); return; }
  updateMatch(w, dt);
}

// Every frame, match or not: LOD, the lights and the padelfit regen.
export function updatePadelWorld(dt, w) {
  if ((lodT -= dt) <= 0) { lodT = 0.5; updateLod(w); }
  updateNight(w);
  if (w.padelFitUntil && w.time < w.padelFitUntil && !w.pendingRespawn && w.health > 0 && w.health < 100) w.health = Math.min(100, w.health + FIT_RATE * dt);
}

export function isPadelActive() {
  return !!game;
}

// A loaded save ends a running match (savegame.js).
export function quitPadel(w) {
  if (game) endMatch(w, { quit: true });
}

// --- HUD: the scoreboard (the HUD card look) -------------------------------------

const CSS = `
#hud .padel-board[hidden] { display: none; }
#hud .padel-board { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 14px; padding: 8px 20px 9px 12px;
  color: #f0ede4; text-shadow: var(--hud-shadow); pointer-events: none; z-index: 4;
  background: linear-gradient(90deg, rgba(12,20,14,0.88), rgba(23,48,31,0.62) 80%, rgba(23,48,31,0.2)); border-left: 3px solid ${ACCENT}; }
#hud .padel-board small { display: block; font-size: 12px; letter-spacing: 3px; color: ${ACCENT}; }
#hud .padel-board .pb-teams { display: grid; grid-template-columns: auto auto auto; gap: 0 14px; align-items: baseline; font-size: 20px; letter-spacing: 1px; line-height: 1.15; }
#hud .padel-board .pb-teams b { font-weight: normal; font-size: 24px; text-align: right; }
#hud .padel-board .pb-teams i { font-style: normal; font-size: 24px; color: #ffd23f; text-align: right; min-width: 30px; }
#hud .padel-board .pb-side { display: flex; flex-direction: column; align-items: flex-end; font: 13px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.75); letter-spacing: .3px; }
#hud .padel-board .hud-key { margin: 0 2px; vertical-align: middle; }
#hud .padel-board .pb-help { display: flex; align-items: center; gap: 3px; margin-top: 3px; }
#hud .padel-board .pb-flash { font-size: 22px; letter-spacing: 1.5px; color: #5dff7a; min-height: 1em; }
#hud .padel-board .pb-flash.them { color: #ff9a3c; }
body.padel-on #hud .hud-speedo, body.padel-on #hud .hud-route, body.padel-on #hud .phonefeed .pf-card { display: none !important; }
@media (max-width: 480px) { #hud .padel-board { top: 64px; } }
`;

function ensureHud() {
  if (hud) return hud;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const root = document.createElement('div');
  root.className = 'padel-board';
  root.hidden = true;
  root.innerHTML = '<div><small>PADEL</small><div class="pb-teams"></div></div><div class="pb-side"><span class="pb-flash"></span><span class="pb-help"></span></div>';
  (document.getElementById('hud') || document.body).appendChild(root);
  hud = { root, teams: root.querySelector('.pb-teams'), flash: root.querySelector('.pb-flash'), help: root.querySelector('.pb-help'), key: '' };
  return hud;
}

function callOf(g, team) {
  return pointCall(g.points, team);
}

function updateHud(w) {
  const g = game;
  if (!g || !hud) return;
  const us = w.player.character === 'anita' ? 'Tessa & Tammo' : 'Tammo & Tessa';
  const them = `${g.names[0]} & ${g.names[1]}`;
  const serve = (t) => (g.server === t && g.phase !== 'intro' ? ' •' : '');
  const left = Math.max(0, Math.ceil(MATCH_CAP - g.t));
  const flash = g.flash ? g.flash.text : g.phase === 'serve' && g.server === 0 ? 'Jij serveert: Spatie' : '';
  const clock = g.capped ? 'Laatste punt' : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  const k = (t) => `<span class="hud-key">${t}</span>`;
  const help = `${clock} · ${k('A')}${k('D')}${k('W')}${k('S')} lopen · ${k('SPATIE')} slaan · ${k('BACKSPACE')} opgeven`;
  const key = [us, them, g.games, g.points, g.server, g.phase === 'intro', flash, help, g.lastWinner].join('|');
  if (key === hud.key) return;
  hud.key = key;
  hud.teams.innerHTML = `<span>${us}${serve(0)}</span><b>${g.games[0]}</b><i>${callOf(g, 0)}</i><span>${them}${serve(1)}</span><b>${g.games[1]}</b><i>${callOf(g, 1)}</i>`;
  hud.flash.textContent = flash;
  hud.flash.classList.toggle('them', !!g.flash && g.lastWinner === 1 && !g.flash.small);
  hud.help.innerHTML = help;
}
