// Genre-style auto-aim. Holding the right mouse button soft-locks onto the best
// target in a cone around the camera heading (hostiles first, never through a
// building); left click then fires at it. Tab or a mouse flick switches
// target. Hip fire only bends shots a few degrees toward a target that is
// already close to the crosshair.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { normalizeAngle } from './util.js';
import { getSettings } from './settings.js';
import { getCamera } from './scene3d.js';
import { propsInRadius } from './breakables.js';
import { wallOnPath } from './wallpath.js';

const LOCK_CONE = 0.45; // rad either side of the camera heading
const KEEP_CONE = 0.8; // a held lock survives this far off-centre
const MAX_LOCK_RANGE = 34;
const TRACK_RATE = 9; // camera yaw pull toward the locked target, 1/s
const HIP_CONE = 0.1;
const HIP_BEND = 0.07; // at most ~4 degrees
const FLICK_PX = 70;
const FLICK_WINDOW = 0.18;

const state = {
  target: null, kind: null, time: -1, x: 0, y: 0, z: 0,
  vx: 0, vy: 0, lastX: 0, lastY: 0,
  flickAcc: 0, flickT: 0, free: false, wasAiming: false,
};


// Distance to the locked target this frame (throwables aim their arc at it), else null.
export function aimedTargetDistance(world) {
  if (!state.target || state.time !== world.time) return null;
  return Math.hypot(state.x - world.player.x, state.y - world.player.y);
}

const alive = (t, kind) => kind === 'ped' ? t.state !== 'dead' && !t.hidden && !t.inVehicle
  : kind === 'veh' ? !t.wrecked && !t.sinking : !!t.cell && !t.water;

function targetPoint(t, kind) {
  if (kind === 'ped') return (t.gz || 0) + (t.ragdoll ? 0.35 : 1.2);
  if (kind === 'veh') return (t.z || 0) + (t.isBike || t.isScooter ? 1.1 : 0.9);
  return Math.min(1.1, (t.h || 1) * 0.6);
}

function isHostile(world, t, kind) {
  if (kind === 'ped') return !!t.hostile || (t.isCop && world.wanted > 0);
  if (kind === 'veh') return !!t.chaseTarget || (t.isPolice && !t.hijacked && world.wanted > 0);
  return false;
}

// Every lockable target in front: { t, kind, off (signed rad), d, score }.
function candidates(world, yaw, cone, range) {
  const p = world.player;
  const own = p.inVehicle;
  const out = [];
  const consider = (t, kind) => {
    if (!alive(t, kind)) return;
    const dx = t.x - p.x, dy = t.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.4 || d > range) return;
    const off = normalizeAngle(Math.atan2(dy, dx) - yaw);
    // near targets are wide, so allow a bit more angle up close
    if (Math.abs(off) > cone + Math.min(0.25, 0.6 / d)) return;
    if (wallOnPath(world.map, p.x, p.y, t.x, t.y)) return;
    let score = Math.abs(off) / cone + (d / range) * 0.45;
    if (isHostile(world, t, kind)) score -= 0.5;
    if (kind === 'ped' && t.ragdoll) score += 0.3;
    if (kind === 'veh' && !isHostile(world, t, kind)) score += 0.25;
    out.push({ t, kind, off, d, score });
  };
  for (const ped of world.pedestrians) consider(ped, 'ped');
  for (const v of world.vehicles) {
    if (v === own || v.driver === 'player') continue;
    if (!v.driver && !v.chaseTarget && !(v.isPolice && world.wanted > 0)) continue;
    consider(v, 'veh');
  }
  if (!out.length) {
    for (const pr of propsInRadius(p.x, p.y, Math.min(range, 18))) consider(pr, 'prop');
  }
  return out;
}

function best(list) {
  let b = null;
  for (const c of list) if (!b || c.score < b.score) b = c;
  return b;
}

function setTarget(world, c) {
  if (!c) { state.target = null; state.kind = null; return; }
  if (state.target !== c.t) {
    state.vx = 0; state.vy = 0;
    state.lastX = c.t.x; state.lastY = c.t.y;
  }
  state.target = c.t;
  state.kind = c.kind;
}

// Next target sideways from the current one: dir 1 = to the right on screen.
function neighbour(list, dir) {
  const cur = list.find((c) => c.t === state.target);
  const curOff = cur ? cur.off : 0;
  let pick = null;
  for (const c of list) {
    if (c.t === state.target) continue;
    const delta = (c.off - curOff) * dir;
    if (delta <= 0.01) continue;
    if (!pick || delta < (pick.off - curOff) * dir) pick = c;
  }
  return pick;
}

function cycle(list) {
  const sorted = [...list].sort((a, b) => a.off - b.off);
  const i = sorted.findIndex((c) => c.t === state.target);
  return sorted[(i + 1) % sorted.length] || null;
}

// Runs each frame before the weapon fires. Returns nothing; the fire angle
// comes from aimFireAngle().
export function updateAim(dt, world, weaponRange) {
  const { input } = world;
  const p = world.player;
  const armed = weaponRange > 0 && !world.scoped;
  const aiming = armed && input.mouse.rightDown && getSettings().autoAim !== false && !world.paused;
  const wasAiming = state.wasAiming;
  state.wasAiming = aiming;
  state.time = world.time;
  if (!aiming) { setTarget(world, null); state.flickAcc = 0; state.free = false; return; }

  const range = Math.min(MAX_LOCK_RANGE, weaponRange * 1.15);
  const yaw = world.camYaw ?? p.angle;

  if (state.target && !alive(state.target, state.kind)) setTarget(world, null);

  // mouse flick: a fast sideways swipe moves the lock to the next target
  state.flickT -= dt;
  if (state.flickT <= 0) { state.flickAcc = 0; state.flickT = FLICK_WINDOW; }
  state.flickAcc += input.mouse.dx || 0;
  const flickDir = Math.abs(state.flickAcc) > FLICK_PX ? Math.sign(state.flickAcc) : 0;
  const tab = input.wasPressed('tab');

  // a flick with nothing beside it frees the aim until Tab or a new press
  if (tab) state.free = false;
  if (state.free) return;

  if (flickDir || tab || !state.target || !wasAiming) {
    const list = candidates(world, yaw, flickDir || tab ? LOCK_CONE * 1.6 : LOCK_CONE, range);
    if (flickDir && state.target) {
      const n = neighbour(list, flickDir);
      if (n) setTarget(world, n);
      else { setTarget(world, null); state.free = true; }
      state.flickAcc = 0;
    } else if (tab && state.target && list.length > 1) {
      setTarget(world, cycle(list));
    } else if (!state.target) {
      setTarget(world, best(list));
    }
  }
  if (tab) input.consume('tab');
  if (!state.target) return;

  const t = state.target;
  const dx = t.x - p.x, dy = t.y - p.y;
  const d = Math.hypot(dx, dy);
  const off = normalizeAngle(Math.atan2(dy, dx) - yaw);
  if (d > range * 1.2 || Math.abs(off) > KEEP_CONE || wallOnPath(world.map, p.x, p.y, t.x, t.y)) {
    setTarget(world, null);
    return;
  }

  // smoothed velocity for leading moving targets
  if (dt > 0) {
    const k = Math.min(1, dt * 8);
    state.vx += ((t.x - state.lastX) / dt - state.vx) * k;
    state.vy += ((t.y - state.lastY) / dt - state.vy) * k;
  }
  state.lastX = t.x; state.lastY = t.y;
  state.x = t.x; state.y = t.y; state.z = targetPoint(t, state.kind);

  // on foot the camera (and the body with it) swings onto the target; in a
  // vehicle the camera is the car's, only the shots turn
  if (!p.inVehicle) {
    world.camYaw = normalizeAngle(yaw + off * Math.min(1, dt * TRACK_RATE));
    p.angle = world.camYaw;
  }
}

// Direction a shot leaves in: at the locked target (led for its motion), or
// the given heading bent slightly toward a target near the crosshair.
export function aimFireAngle(world, angle, weapon) {
  const p = world.player;
  if (state.target && state.time === world.time) {
    const d = Math.hypot(state.x - p.x, state.y - p.y);
    const lead = Math.min(0.6, d / (weapon.speed || 55));
    const sp = Math.hypot(state.vx, state.vy);
    const k = sp > 25 ? 0 : lead; // teleports/respawns, not motion
    return Math.atan2(state.y + state.vy * k - p.y, state.x + state.vx * k - p.x);
  }
  if (getSettings().autoAim === false || !weapon.range) return angle;
  const c = best(candidates(world, angle, HIP_CONE, weapon.range));
  if (!c || c.kind === 'prop') return angle;
  return angle + Math.max(-HIP_BEND, Math.min(HIP_BEND, c.off));
}

// Lock reticle: a small ring of four ticks over the target.
let el = null;
const tmp = new THREE.Vector3();
let scopeEl = null;
function renderScope(world, hide) {
  const on = !!world.scoped && !hide;
  if (!scopeEl) {
    if (!on) return;
    scopeEl = document.createElement('div');
    scopeEl.className = 'aim-scope';
    scopeEl.setAttribute('aria-hidden', 'true');
    scopeEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:39;opacity:0;transition:opacity .12s;'
      + 'background:radial-gradient(circle at 50% 50%, transparent 0, transparent min(38vw,38vh), rgba(0,0,0,.55) calc(min(38vw,38vh) + 2px), #000 calc(min(38vw,38vh) + 14px));';
    scopeEl.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style="position:absolute;inset:0;width:100%;height:100%">'
      + '<g stroke="#000" stroke-width="0.4" fill="none" opacity=".85"><path d="M50 12v34M50 54v34M12 50h34M54 50h34"/>'
      + '<path d="M50 30v-0.01M50 70v0.01" stroke-width="1.2"/><circle cx="50" cy="50" r="0.6" fill="#c0261e" stroke="none"/></g></svg>';
    document.body.appendChild(scopeEl);
  }
  scopeEl.style.opacity = on ? '1' : '0';
}

export function renderAimReticle(world) {
  const lock = state.target && state.time === world.time && !world.paused;
  const b = document.body.classList;
  renderScope(world, !b.contains('game-started') || b.contains('cine-hide-hud') || world.paused);
  const hide = !lock || !b.contains('game-started') || b.contains('cine-hide-hud') || b.contains('pigeon-mode');
  if (!el) {
    if (hide) return;
    el = document.createElement('div');
    el.className = 'aim-lock';
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = 'position:fixed;left:0;top:0;width:26px;height:26px;margin:-13px 0 0 -13px;pointer-events:none;z-index:40;transition:opacity .12s;';
    el.innerHTML = '<svg viewBox="0 0 26 26" width="26" height="26" fill="none" stroke-width="2.2" stroke-linecap="round">'
      + '<path d="M13 2v5M13 19v5M2 13h5M19 13h5" stroke="rgba(0,0,0,.45)" stroke-width="4"/>'
      + '<path class="aim-ticks" d="M13 2v5M13 19v5M2 13h5M19 13h5"/>'
      + '<circle cx="13" cy="13" r="1.6" stroke="none" class="aim-dot"/></svg>';
    document.body.appendChild(el);
  }
  const cam = getCamera();
  if (hide || !cam) { el.style.opacity = '0'; return; }
  tmp.set(state.x, state.z, state.y).project(cam);
  if (tmp.z > 1 || tmp.z < -1) { el.style.opacity = '0'; return; }
  const sx = (tmp.x + 1) * 0.5 * innerWidth, sy = (1 - tmp.y) * 0.5 * innerHeight;
  const hostile = isHostile(world, state.target, state.kind);
  const col = hostile ? '#ff5a4a' : '#ffffff';
  el.style.opacity = '0.9';
  el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
  el.dataset.target = state.kind;
  el.querySelector('.aim-ticks').setAttribute('stroke', col);
  el.querySelector('.aim-dot').setAttribute('fill', col);
}
