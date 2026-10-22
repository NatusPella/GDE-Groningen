// Tipsy after the kroegentocht: world.drunk (0..1) rises at each pub and wears
// off a couple of minutes later (a respawn sobers you up at once). The level
// drives a swaying camera, double vision and a warm vignette, wandering feet,
// a lazy steering wheel, muffled music, hiccups and the odd remark from
// passers-by. Instellingen > Weergave "Dronken effecten" (Aan/Mild/Uit)
// scales all of it; reduced motion tones down the camera and the blur.
import { getSettings } from './settings.js';
import { reportCrime } from './crime.js';

const HOLD_S = 25; // no sobering up while still going from pub to pub
const DECAY_PER_S = 1 / 150;
const FX_SCALE = { aan: 1, mild: 0.45, uit: 0 };
const REMARKS_M = ['Doe mor rustig an, mien jong.', 'Hé, kiek uut woarst lopst!', 'Dij hest ook wel genog had, hè?', 'Nog ain veur de weg?', 'Hou dij goud, joh!', 'Proost!'];
const REMARKS_F = ['Doe mor rustig an, mien wicht.', 'Hé, kiek uut woarst lopst!', 'Dij hest ook wel genog had, hè?', 'Nog ain veur de weg?', 'Hou dij goud, joh!', 'Proost!'];

const st = { holdUntil: 0, hicAt: 0, remarkAt: 0, reportAt: 0, warned: false, heading: null, stumbleUntil: 0, stumbleAngle: 0, vig: null };

let reducedMotion = false;
try {
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  reducedMotion = mq.matches;
  mq.addEventListener('change', (e) => { reducedMotion = e.matches; });
} catch (e) { /* no matchMedia */ }

let current = 0; // effect level of this frame, for postfx3d/scene3d

function fxScale() {
  return FX_SCALE[getSettings().drunkFx] ?? 1;
}

export function addDrunk(world, amount) {
  world.drunk = Math.min(1, (world.drunk || 0) + amount);
  st.holdUntil = world.time + HOLD_S;
  st.warned = false;
  if (!st.hicAt) st.hicAt = world.time + 3;
}

export function clearDrunk(world) {
  world.drunk = 0;
}

// Effect strength for gameplay feel (feet, steering, sounds).
export function drunkLevel() {
  return current;
}

// Camera sway and blur strength: reduced motion keeps it low.
export function drunkVisual() {
  return reducedMotion ? current * 0.35 : current;
}

export function updateDrunk(dt, world) {
  const p = world.player;
  if (world.pendingRespawn || world.health <= 0) world.drunk = 0;
  let lvl = world.drunk || 0;
  if (lvl > 0 && world.time > st.holdUntil) lvl = world.drunk = Math.max(0, lvl - DECAY_PER_S * dt);
  current = lvl * fxScale();
  updateVignette();
  if (lvl <= 0 || world.paused) return;

  const v = p.inVehicle;
  // Driving drunk: a unit that sees it adds some heat (crime.js); a star
  // only after a while in plain view.
  if (v && !v.isBoat && !v.isBike && lvl > 0.3) {
    if (!st.warned) {
      st.warned = true;
      world.addMessage('Met drank op achter het stuur? De pliesie kijkt mee.', 3);
    }
    // world.drunkExempt: a mission that has its own police (the ride to Tjalke, sidejob_tjalke.js) lets the police come at its own moment, not from the first corner
    if (Math.abs(v.speed) > 6 && world.time > st.reportAt && !world.drunkExempt) {
      st.reportAt = world.time + 6;
      reportCrime(world, 'drunkDriving');
    }
  }

  if (current <= 0.02) return;
  if (world.time > st.hicAt) {
    st.hicAt = world.time + (6 + Math.random() * 10) / (0.5 + lvl);
    const giggle = Math.random() < 0.25 + lvl * 0.2;
    const q = world.audioEvents || (world.audioEvents = []);
    q.push({ kind: giggle ? 'giggle' : 'hiccup', x: p.x, y: p.y, female: p.character === 'anita' });
    if (!giggle && !v) {
      const kick = world.camKick || (world.camKick = { pitch: 0, yaw: 0, fov: 0 });
      kick.pitch += 0.02 * drunkVisual();
    }
  }
  if (!v && lvl > 0.25 && world.time > st.remarkAt) {
    st.remarkAt = world.time + 5 + Math.random() * 6;
    const lines = p.character === 'anita' ? REMARKS_F : REMARKS_M;
    for (const ped of world.pedestrians) {
      if (ped.isCop || ped.state === 'dead' || ped.ragdoll || ped.missionCrowd || (ped.speechText && world.time < ped.speechUntil)) continue;
      const dx = ped.x - p.x, dy = ped.y - p.y;
      if (dx * dx + dy * dy > 36) continue;
      ped.speechText = lines[Math.floor(Math.random() * lines.length)];
      ped.speechUntil = world.time + 2.6;
      break;
    }
  }
}

// On foot: the heading lags behind the keys and wanders, and now and then
// a stumble takes a step of its own. dir is player.js's {angle} or null.
export function drunkMove(world, dir, dt) {
  const k = current;
  if (k <= 0.01) { st.heading = null; return dir; }
  const t = world.time;
  if (t < st.stumbleUntil) return { angle: st.stumbleAngle };
  if (dir && Math.random() < dt * 0.08 * k) {
    st.stumbleUntil = t + 0.3 + Math.random() * 0.25;
    st.stumbleAngle = dir.angle + (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random() * 0.6);
    const kick = world.camKick || (world.camKick = { pitch: 0, yaw: 0, fov: 0 });
    kick.yaw += (Math.random() - 0.5) * 0.06 * drunkVisual();
  }
  if (!dir) { st.heading = null; return null; }
  const want = dir.angle + (Math.sin(t * 0.8) * 0.6 + Math.sin(t * 2.3 + 1) * 0.25) * 0.55 * k;
  if (st.heading === null) st.heading = want;
  let d = want - st.heading;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  const rate = 9 - 6 * k;
  st.heading += Math.max(-rate * dt, Math.min(rate * dt, d));
  return { angle: st.heading };
}

// In a car or on a bike: a slow sway on the steering, added to the input.
export function drunkSteer(world, v) {
  const k = current;
  if (k <= 0.01 || Math.abs(v.speed) < 1) return 0;
  const t = world.time;
  return (Math.sin(t * 0.7) * 0.16 + Math.sin(t * 1.9 + 2) * 0.06) * k;
}

// scene3d.js, after the follow camera's lookAt: roll, sway and bob.
export function applyDrunkCamera(cam) {
  const k = drunkVisual();
  if (k <= 0.005) return;
  const t = performance.now() / 1000;
  cam.rotateZ((Math.sin(t * 0.55) * 0.045 + Math.sin(t * 1.6) * 0.01) * k);
  cam.rotateY(Math.sin(t * 0.42 + 1) * 0.022 * k);
  cam.rotateX(Math.sin(t * 1.15) * 0.014 * k);
}

// Warm vignette as a DOM overlay: works on every quality preset for the
// price of one composited layer. Plain alpha blending (a blend mode would
// make the compositor read the canvas back every frame) and no layer at all
// while sober.
function updateVignette() {
  const k = current;
  if (!st.vig) {
    if (k <= 0) return;
    const el = document.createElement('div');
    el.className = 'drunk-vignette';
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = 'position:fixed;inset:0;pointer-events:none;opacity:0;'
      + 'background:radial-gradient(ellipse at center, rgba(90,34,8,0) 45%, rgba(90,34,8,0.5) 100%);display:none;';
    // right above the 3D canvas, under the HUD
    const canvas = document.getElementById('game3d');
    if (canvas) canvas.after(el); else document.body.appendChild(el);
    st.vig = el;
  }
  const hide = document.body.classList.contains('pigeon-mode');
  const o = hide ? 0 : Math.min(0.9, k * 0.9);
  const s = o.toFixed(2);
  if (st.vig.style.opacity !== s) {
    st.vig.style.opacity = s;
    st.vig.style.display = o > 0 ? '' : 'none';
  }
}
