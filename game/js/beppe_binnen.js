// Beppe's house from the inside (issue #1063): the door, the one room (the
// house itself: 5.6 x 7 m), the three things to use (the pan on the stove, the
// note on the kitchen table, the pinboard) and the walk out again. The rules
// are in beppe_visit_rules.js (pure, tested); this file draws the room and
// runs the visit.
//
// How it is "really inside" (the binnensets rule of docs/BINNENSETS-21-11.md):
// the room is the house's own footprint on the real ground. The wall colliders
// of beppe_garden.js already keep the player in, so nothing teleports to a
// pocket and no ground height is hooked. While inside, the outside of the house
// is hidden (the room has its own closed walls and ceiling, seen from inside
// only), the camera is a fixed room camera inside the walls and under the
// ceiling (a hard cut, no pan) and the player is kept off the furniture.
//
// Samen spelen: the world (and the house) is the opener's; whoever walks in
// does it locally, in his own game: the room, the camera and the soup are his,
// the soup's cooldown is in his own profile (lifetime marks, #429). Others only
// see a figure walk through the front door. Nothing here is sent over the net.
//
// All text is in beppe_visit_texts.js (text-only, nothing voiced).

import * as THREE from 'three';
import { hoofdspeler } from './players.js';
import { showCard } from './hudcards.js';
import { hasUnique, markLifetime, recordStat, getStat } from './achievements.js';
import { getStorySave } from './storyquery.js';
import { isMissionCompleted } from './missions.js';
import { MISSION_IDS } from './storyarc.js';
import { today as calendarDay } from './calendarday.js';
import { playerBusy } from './busy.js';
import { isCinematicActive } from './cinematics.js';
import { respawnFade } from './respawn.js';
import { housePoint } from './beppe_rules.js';
import {
  VISIT, ROOM, SPOTS, soupKey, soupState, visitUnlocked, reachedAct, timeOfDay, isRaining,
  pickNote, pickTip, nearestSpot, nearDoorOutside, keepInRoom, insideRoom, roomCamera, canEnter,
} from './beppe_visit_rules.js';
import { DOOR, STOVE, TABLE, BOARD, SOUP, CARD, INVITE } from './beppe_visit_texts.js';

const BRON = 'beppe-huis';
let inside = null;          // { t, last: { note, tip } } while the player is in the room
let busyFade = false;
let cache = { at: -1e9, unlocked: false, act: 'kop' };
let invitedThisSession = false;

// --- the story state, derived and never stored ----------------------------------------

// The snapshot that visitUnlocked/reachedAct read: finished steps from the story
// save and the missions the chain counts as passed. Cached for a second: the map
// asks every frame.
function snapshot() {
  let done = [];
  try { done = getStorySave().done || []; } catch (e) { done = []; }
  const completed = [];
  try { MISSION_IDS.forEach((_, i) => { if (isMissionCompleted(i)) completed.push(i); }); } catch (e) { /* no chain yet */ }
  return { done, completed };
}

export function visitStatus(now = (typeof performance !== 'undefined' ? performance.now() : 0)) {
  if (now - cache.at > 1000) {
    const snap = snapshot();
    cache = { at: now, unlocked: visitUnlocked(snap), act: reachedAct(snap) };
  }
  return cache;
}
export const visitUnlockedNow = () => visitStatus().unlocked;
export const resetVisitCache = () => { cache = { at: -1e9, unlocked: false, act: 'kop' }; };

// --- the room mesh ---------------------------------------------------------------------

const C = {
  wall: 0xdccdb0, wain: 0x6b4a32, floor: 0x9a7448, rug: 0x8a3a3a, wood: 0x7a5a3a, dark: 0x4a3626,
  door: 0x2f5a44, glass: 0xc4e2ee, steel: 0x8e949a, black: 0x2c2f33, white: 0xece8de, cork: 0xb88a52,
  soup: 0xd9a441, chair: 0x4f6a8a, lamp: 0xffe6b0,
};

export function buildBeppeRoom(own) {
  const g = new THREE.Group();
  g.name = 'beppe-room';
  g.visible = false;
  const mat = (c, extra = {}) => { const m = new THREE.MeshLambertMaterial({ color: c, ...extra }); own.push(m); return m; };
  const box = (x, y, z, sx, sy, sz, c, extra) => {
    const geo = new THREE.BoxGeometry(sx, sy, sz); own.push(geo);
    const m = new THREE.Mesh(geo, mat(c, extra)); m.position.set(x, y, z); g.add(m); return m;
  };
  const { hw, hd, h } = ROOM;
  // the closed shell: walls, floor and ceiling, seen from inside only
  box(0, h / 2, 0, hw * 2 - 0.1, h, hd * 2 - 0.1, C.wall, { side: THREE.BackSide });
  box(0, 0.03, 0, hw * 2 - 0.12, 0.06, hd * 2 - 0.12, C.floor);
  // a wainscot along the walls
  for (const [x, z, sx, sz] of [[0, -hd + 0.07, hw * 2 - 0.2, 0.04], [0, hd - 0.07, hw * 2 - 0.2, 0.04], [-hw + 0.07, 0, 0.04, hd * 2 - 0.2], [hw - 0.07, 0, 0.04, hd * 2 - 0.2]]) box(x, 0.45, z, sx, 0.9, sz, C.wain);
  box(0.4, 0.07, -0.2, 2.4, 0.02, 1.7, C.rug);
  // the front door (in the +x wall) and the windows
  box(hw - 0.09, 1.05, 0, 0.05, 2.1, 1.05, C.door);
  box(hw - 0.07, 2.14, 0, 0.04, 0.1, 1.25, C.white);
  box(hw - 0.12, 1.0, 0.36, 0.05, 0.07, 0.07, C.steel);
  for (const [x, z, w, d] of [[-hw + 0.07, 0.2, 0.04, 1.1], [-1.5, hd - 0.07, 0.9, 0.04], [1.5, hd - 0.07, 0.9, 0.04], [1.5, -hd + 0.07, 0.9, 0.04]]) {
    box(x, 1.55, z, w, 1.1, d, C.glass, { emissive: C.glass, emissiveIntensity: 0.35 });
  }
  // the stove with the pan (soup)
  box(-2.22, 0.45, 1.6, 0.75, 0.9, 1.2, C.white);
  box(-2.22, 0.92, 1.6, 0.77, 0.04, 1.22, C.black);
  const potGeo = new THREE.CylinderGeometry(0.22, 0.2, 0.26, 14); own.push(potGeo);
  const pot = new THREE.Mesh(potGeo, mat(C.steel)); pot.position.set(-2.2, 1.07, 1.35); g.add(pot);
  const soupGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.02, 14); own.push(soupGeo);
  const soup = new THREE.Mesh(soupGeo, mat(C.soup, { emissive: C.soup, emissiveIntensity: 0.25 })); soup.position.set(-2.2, 1.18, 1.35); g.add(soup);
  box(-2.2, 1.55, 2.12, 0.5, 0.25, 0.02, C.steel); // the hood's plate on the wall
  // the kitchen table with two chairs and the note
  box(0, 0.72, -1.35, 1.1, 0.06, 0.8, C.wood);
  for (const [x, z] of [[-0.48, -1.7], [0.48, -1.7], [-0.48, -1.0], [0.48, -1.0]]) box(x, 0.35, z, 0.06, 0.7, 0.06, C.dark);
  box(0.1, 0.755, -1.3, 0.3, 0.01, 0.22, C.white);
  box(-0.1, 0.38, -0.55, 0.42, 0.06, 0.42, C.wood); box(-0.1, 0.65, -0.35, 0.42, 0.5, 0.05, C.wood);
  box(0.1, 0.38, -2.15, 0.42, 0.06, 0.42, C.wood); box(0.1, 0.65, -2.35, 0.42, 0.5, 0.05, C.wood);
  // the cupboard against the back wall, with the photographs on it
  box(-2.38, 1.0, -2.65, 0.5, 2.0, 1.5, C.wood);
  box(-2.1, 1.0, -2.65, 0.02, 1.8, 1.4, C.dark);
  for (const z of [-3.1, -2.65, -2.2]) box(-2.1, 2.1, z, 0.04, 0.25, 0.2, C.wain);
  // the pinboard on the side wall, with a few notes
  box(-0.4, 1.5, -hd + 0.09, 1.1, 0.8, 0.04, C.cork);
  for (const [x, y, c] of [[-0.75, 1.65, C.white], [-0.45, 1.4, 0xe8d58a], [-0.15, 1.62, C.white], [-0.55, 1.78, 0xb9d6e8]]) box(x, y, -hd + 0.12, 0.2, 0.16, 0.01, c);
  // an armchair and a clock
  box(0.3, 0.25, 2.65, 0.85, 0.5, 0.8, C.chair);
  box(0.3, 0.7, 3.0, 0.85, 0.5, 0.15, C.chair);
  const clockGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.04, 16); own.push(clockGeo);
  const clock = new THREE.Mesh(clockGeo, mat(C.white)); clock.position.set(-hw + 0.1, 1.95, -0.6); clock.rotation.z = Math.PI / 2; g.add(clock);
  // the lamp on the ceiling and a warm light (its intensity is 0 outside: a light that
  // appears or disappears makes the renderer rebuild its shaders)
  box(0, h - 0.06, 0, 0.5, 0.05, 0.5, C.lamp, { emissive: C.lamp, emissiveIntensity: 0.9 });
  const light = new THREE.PointLight(0xffe2b0, 0, 9, 1.6);
  light.position.set(0, h - 0.35, 0);
  g.add(light);
  g.userData.light = light;
  return g;
}

// --- going in and out -------------------------------------------------------------------

const local = (site, p) => {
  const a = site.house.a, c = Math.cos(a), s = Math.sin(a);
  const dx = p.x - site.house.x, dy = p.y - site.house.y;
  return { lx: dx * c + dy * s, lz: -dx * s + dy * c };
};

function putPlayer(w, site, spot, faceIn) {
  const p = hoofdspeler(w), q = housePoint(site, spot.x, spot.z);
  if (p.water && p.leaveWater) p.leaveWater();
  p.x = q.x; p.y = q.y; p.vx = 0; p.vy = 0; p.vz = 0;
  p.angle = site.house.a + (faceIn ? Math.PI : 0);
  w.camYaw = site.house.a + (faceIn ? roomCamera().yaw : 0);
}

function fade(fn) {
  if (busyFade) return false;
  busyFade = true;
  try { respawnFade(1, 260); } catch (e) { /* no DOM */ }
  setTimeout(() => {
    try { fn(); } catch (e) { console.error('beppe-huis', e); }
    setTimeout(() => { try { respawnFade(0, 380); } catch (e) { /* no DOM */ } busyFade = false; }, 100);
  }, 300);
  return true;
}

function setRoom(ctx, on) {
  const r = ctx.room;
  if (r) { r.visible = on; if (r.userData.light) r.userData.light.intensity = on ? 1.15 : 0; }
  if (ctx.house) ctx.house.visible = !on;
}

function clearCamera(w) {
  if (w.cameraOverride && w.cameraOverride.bron === BRON) w.cameraOverride = null;
}

function enter(w, ctx) {
  const site = ctx.site();
  if (!site || inside) return false;
  const first = !hasUnique(VISIT.set, VISIT.first);
  return fade(() => {
    inside = { t: 0, last: { note: '', tip: '' }, got: false };
    setRoom(ctx, true);
    putPlayer(w, site, SPOTS.enter, true);
    cameraNow(w, site);
    markLifetime(VISIT.set, VISIT.first);
    recordStat(w, VISIT.stat, 1);
    if (first) showCard(w, { kind: 'tip', kicker: CARD.kicker, title: DOOR.firstTitle, body: DOOR.firstBody, duration: 9, key: 'beppe-binnen', voice: false });
  });
}

export function leave(w, ctx, silent = false) {
  if (!inside) return false;
  const site = ctx.site();
  const out = () => {
    inside = null;
    setRoom(ctx, false);
    clearCamera(w);
    if (site) putPlayer(w, site, SPOTS.out, false);
  };
  if (silent) { out(); return true; }
  return fade(out);
}

// Drop everything when the site is dropped or the world is left.
export function dropInside(w, ctx) {
  if (!inside) return;
  inside = null;
  setRoom(ctx, false);
  if (w) clearCamera(w);
}

export const isInside = () => !!inside;
export function resetVisit() { inside = null; busyFade = false; invitedThisSession = false; resetVisitCache(); }

function cameraNow(w, site) {
  const cam = roomCamera();
  const pos = housePoint(site, cam.pos.x, cam.pos.z), look = housePoint(site, cam.look.x, cam.look.z);
  const base = (w.map && w.map.groundHeightAt ? w.map.groundHeightAt(site.house.x, site.house.y, 60) : 0) || 0;
  w.cameraOverride = {
    position: { x: pos.x, y: pos.y, z: base + cam.pos.h }, lookAt: { x: look.x, y: look.y, z: base + cam.look.h },
    fov: cam.fov, cut: true, bron: BRON,
  };
}

// --- what the player can use --------------------------------------------------------------

function onFoot(w) {
  const p = hoofdspeler(w);
  return !!p && !p.inVehicle && !p.swimming && !p.dead && !w.pigeonMode && !w.heliRun && !w.activityGame && !w.padelGame;
}

function ctxOf(w) {
  const p = hoofdspeler(w);
  return { act: visitStatus().act, who: p ? p.character || '' : '', time: timeOfDay(w.clock), rain: isRaining(w.weather) };
}
const dayOf = (w) => { try { return calendarDay(w); } catch (e) { return 0; } };

export function visitPrompt(w, ctx) {
  const site = ctx.site();
  if (!w || !site || busyFade || w.paused || w.uiPaused || w.pigeonMode || w.heliRun) return null;
  const p = hoofdspeler(w);
  if (!p) return null;
  const { lx, lz } = local(site, p);
  if (inside) {
    const k = nearestSpot(lx, lz);
    const at = (s) => housePoint(site, s.x, s.z);
    const base = (w.map && w.map.groundHeightAt ? w.map.groundHeightAt(site.house.x, site.house.y, 60) : 0) || 0;
    if (k === 'door') { const q = at(SPOTS.door); return { id: 'beppe-uit', x: q.x, y: q.y, h: base + 1.3, key: 'E', label: DOOR.leavePrompt, sub: DOOR.leaveSub, ring: true }; }
    if (k === 'stove') {
      const due = soupState({ day: dayOf(w), has: hasUnique, health: w.health, maxHealth: 100 }).due;
      const q = at(SPOTS.stove);
      return { id: 'beppe-soep', x: q.x, y: q.y, h: base + 1.3, key: 'E', label: STOVE.prompt, sub: due ? STOVE.promptReady : STOVE.promptDone, ring: true, dim: !due };
    }
    if (k === 'table') { const q = at(SPOTS.table); return { id: 'beppe-briefje', x: q.x, y: q.y, h: base + 1.0, key: 'E', label: TABLE.prompt, sub: TABLE.sub, ring: true }; }
    if (k === 'board') { const q = at(SPOTS.board); return { id: 'beppe-prikbord', x: q.x, y: q.y, h: base + 1.4, key: 'E', label: BOARD.prompt, sub: BOARD.sub, ring: true }; }
    return null;
  }
  const status = visitStatus();
  const ok = canEnter({
    unlocked: status.unlocked, near: nearDoorOutside(lx, lz), onFoot: onFoot(w), wanted: w.wanted | 0,
    busy: playerBusy(w).busy, cinematic: isCinematicActive() || !!w.cameraOverride,
  });
  if (!ok) return null;
  const q = housePoint(site, SPOTS.doorOutside.x, SPOTS.doorOutside.z);
  const base = (w.map && w.map.groundHeightAt ? w.map.groundHeightAt(site.house.x, site.house.y, 60) : 0) || 0;
  return { id: 'beppe-deur', x: q.x, y: q.y, h: base + 1.4, key: 'E', label: DOOR.prompt, sub: DOOR.promptSub, ring: true };
}

function eatSoup(w) {
  const st = soupState({ day: dayOf(w), has: hasUnique, health: w.health, maxHealth: 100, heal: SOUP.heal, cookieMoney: SOUP.cookieMoney });
  if (!st.due) {
    showCard(w, { kind: 'tip', kicker: CARD.kicker, title: STOVE.title, body: STOVE.done, duration: 5, key: 'beppe-soep', voice: false });
    return;
  }
  markLifetime(VISIT.set, soupKey(dayOf(w)));
  if (st.heal) w.health = Math.min(100, (w.health || 0) + st.heal);
  if (st.money) w.money = (w.money || 0) + st.money;
  const parts = [st.heal ? STOVE.eat : STOVE.eatFull];
  if (st.money) parts.push(STOVE.cookie);
  showCard(w, { kind: st.money ? 'geld' : 'tip', kicker: CARD.kicker, title: STOVE.title, body: parts.join(' '), duration: 7, key: 'beppe-soep', voice: false });
}

function readNote(w, kind) {
  const list = kind === 'tip' ? pickTip : pickNote;
  const visit = getStat(VISIT.stat);
  const beat = list(ctxOf(w), { day: dayOf(w), visit, last: inside ? inside.last[kind] : '' });
  if (!beat) return;
  if (inside) inside.last[kind] = beat.id;
  const spec = kind === 'tip' ? BOARD : TABLE;
  showCard(w, { kind: 'tip', kicker: spec.kicker, title: kind === 'tip' ? 'Een tip' : 'Van Beppe', body: beat.text, duration: 9, key: `beppe-${kind}`, voice: false });
}

export function visitInteract(w, ctx) {
  const site = ctx.site();
  if (!w || !w.input || !site || busyFade) return false;
  const pr = visitPrompt(w, ctx);
  if (!pr) return false;
  if (!(w.input.wasPressed('e') || w.input.wasPressed('f'))) return false;
  w.input.consume('e'); w.input.consume('f');
  switch (pr.id) {
    case 'beppe-deur': enter(w, ctx); break;
    case 'beppe-uit': leave(w, ctx); break;
    case 'beppe-soep': eatSoup(w); break;
    case 'beppe-briefje': readNote(w, 'note'); break;
    case 'beppe-prikbord': readNote(w, 'tip'); break;
    default: return false;
  }
  return true;
}

// Per frame (from beppe_garden's tick): inside, keep the player in the room and the
// camera fixed; outside, send the invitation once when the house opens.
export function visitTick(dt, w, ctx) {
  if (!w) return;
  if (!inside) { invite(w); return; }
  const site = ctx.site();
  if (!site) { dropInside(w, ctx); return; }
  {
    const p = hoofdspeler(w);
    const { lx, lz } = local(site, p);
    // a respawn, a vehicle, a teleport or a cutscene takes the player out of the room
    if (!p || p.inVehicle || w.pigeonMode || w.pendingRespawn || !insideRoom(lx, lz, 0.6) || p.dead
      || (w.cameraOverride && w.cameraOverride.bron !== BRON)) {
      leave(w, ctx, true);
      return;
    }
    inside.t += dt;
    const k = keepInRoom(lx, lz);
    const q = housePoint(site, k.lx, k.lz);
    p.x = q.x; p.y = q.y;
    w.camYaw = site.house.a + roomCamera().yaw;
    if (!w.cameraOverride || w.cameraOverride.bron !== BRON) cameraNow(w, site);
  }
}

// The invitation: one text from Tammo as soon as the house is open and the
// player is free, once in a lifetime (also for a save that was already past it:
// the house simply is open there; the text tells it once).
function invite(w) {
  if (invitedThisSession || !w.phoneNotifications) return;
  const st = visitStatus();
  if (!st.unlocked) return;
  if (hasUnique(VISIT.set, VISIT.invited)) { invitedThisSession = true; return; }
  if (playerBusy(w).busy || isCinematicActive() || w.cameraOverride) return;
  invitedThisSession = true;
  markLifetime(VISIT.set, VISIT.invited);
  w.phoneNotifications.push({ from: INVITE.from, text: INVITE.text, duration: 9 });
  showCard(w, { kind: 'tip', kicker: CARD.kicker, title: INVITE.card.title, body: INVITE.card.body, duration: 8, key: 'beppe-uitnodiging', voice: false });
}

export const visitDebug = () => ({ inside: !!inside, status: visitStatus() });
