// Arcade-vliegtuig aan de wereld (#15): de eigen "Kist Kees" op een grasbaan bij
// het kleine vliegveld van Eelde, naast de helikopter (heliflight.js) maar met het
// vastevleugelmodel van arcadeplane.js. De pure kant (toetsen, baan, status) staat
// in planecontrol.js en heeft tests; dit bestand is de lijm met Vehicle, scene en
// HUD en is nog niet in beeld bekeken. Meldt zich in main.js als activiteitenkind.

import { Vehicle } from './vehicle.js';
import { isInWater } from './util.js';
import { getVehicleMesh } from './models3d_vehicles.js';
import { attachPlane, flyPlaneVehicle, idlePlane, makeStrip, planeStatus } from './planecontrol.js';

export const PLANE_MODEL = { name: 'plane', len: 8, wid: 10.6, maxSpeed: 70, accel: 14, brake: 10, turnRate: 1, color: '#e9e4d3' };
const DEALER = { x: 1764.51, y: 9959.94 };   // Rotor Roelf op Eelde, zie shops.js

let strip = null;
let plane = null;
let hud = null;
let msgAt = -Infinity;

const groundOf = (map) => (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) : 0);

// Een vrije, vlakke strook zoeken rond de dealer: geen gebouwen, weinig hoogteverschil.
function findStrip(map, from = DEALER, length = 520) {
  const gh = groundOf(map);
  let best = null;
  for (let h = 0; h < 16; h++) {
    const heading = (h / 16) * Math.PI * 2;
    for (const off of [70, 110, 160]) {
      const cand = makeStrip({ x: from.x + Math.cos(heading + 1.2) * off, y: from.y + Math.sin(heading + 1.2) * off, heading, length });
      let bad = 0, lo = Infinity, hi = -Infinity;
      for (let a = 0; a <= length; a += 20) {
        for (const across of [-14, 0, 14]) {
          const p = cand.point(a, across);
          if (map.buildingsNear && map.buildingsNear(p.x, p.y, 8).length) bad++;
          if (isInWater(map, p.x, p.y)) bad += 2;
          const g = gh(p.x, p.y);
          lo = Math.min(lo, g); hi = Math.max(hi, g);
        }
      }
      const score = bad * 100 + (hi - lo);
      if (!best || score < best.score) best = { strip: cand, score, bad };
    }
  }
  return best && best.bad === 0 ? best.strip : null;
}

function initPlanes(w) {
  strip = findStrip(w.map);
  if (!strip) return;
  const gh = groundOf(w.map);
  const at = strip.point(30);
  const v = new Vehicle(at.x, at.y, strip.heading, { ...PLANE_MODEL });
  v.isPlane = true;
  v.playerOwned = true;
  attachPlane(v, at.x, at.y, gh(at.x, at.y), strip.heading);
  v.name = 'Kist Kees';
  w.vehicles.push(v);
  plane = v;
  w.planeStrip = strip;
}

function card() {
  if (hud || typeof document === 'undefined') return hud;
  const root = document.getElementById('hud');
  if (!root) return null;
  const st = document.createElement('style');
  st.textContent = `#hud .hud-plane{position:absolute;right:var(--hud-edge,46px);bottom:var(--hud-edge,46px);display:none;min-width:188px;padding:8px 16px 10px 12px;color:#f0ede4;text-shadow:var(--hud-shadow);background:linear-gradient(90deg,rgba(12,20,14,.86),rgba(23,48,31,.55) 80%,rgba(23,48,31,.1));border-left:3px solid #3fc97a}
body.plane-flying #hud .hud-plane{display:block}
body.plane-flying #hud .hud-speedo{display:none}
#hud .hud-plane small{display:block;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#3fc97a}
#hud .hud-plane .hp-row{display:flex;gap:16px;align-items:baseline;margin-top:2px}
#hud .hud-plane .hp-row b{font-weight:normal;font-size:30px;letter-spacing:1px}
#hud .hud-plane .hp-row span{font-size:12px;letter-spacing:1px;color:rgba(240,237,228,.65)}
#hud .hud-plane .hp-st{margin-top:5px;font-size:15px}`;
  document.head.appendChild(st);
  const el = document.createElement('div');
  el.className = 'hud-plane';
  el.innerHTML = '<small>Kist Kees</small><div class="hp-row"><div><b data-k="speed">0</b><span>km/u</span></div><div><b data-k="alt">0</b><span>m hoogte</span></div><div><b data-k="thr">0</b><span>% gas</span></div></div><div class="hp-st" data-k="st"></div>';
  root.appendChild(el);
  hud = { el, q: (k) => el.querySelector(`[data-k="${k}"]`) };
  return hud;
}

function showCard(mine) {
  const h = card();
  if (typeof document !== 'undefined') document.body.classList.toggle('plane-flying', !!mine);
  if (!h || !mine) return;
  const s = planeStatus(mine);
  h.q('speed').textContent = s.speed;
  h.q('alt').textContent = s.alt;
  h.q('thr').textContent = s.throttle;
  h.q('st').textContent = s.state;
}

function updatePlanes(dt, w) {
  if (!dt) return;
  const gh = groundOf(w.map);
  const pv = w.player.inVehicle;
  for (const v of w.vehicles) {
    if (!v.isPlane) continue;
    if (v !== pv) idlePlane(v, dt, gh);
    const mesh = getVehicleMesh(v.id);
    if (mesh && mesh.userData.prop) mesh.userData.prop.rotation.x += dt * (6 + 60 * (v.throttle || 0)) * (v.wrecked ? 0 : 1);
  }
  if (pv && pv.isPlane && pv.plane && pv.plane.landing && w.time - msgAt > 3) {
    msgAt = w.time;
    w.addMessage(pv.plane.landing === 'zacht' ? 'Zachte landing!' : 'Harde landing, maar heel', 3, { kind: 'tip' });
  }
  showCard(pv && pv.isPlane ? pv : null);
}

export function flyPlane(v, dt, w) {
  const s = w.planeStrip;
  flyPlaneVehicle(v, dt, (k) => w.input.isDown(k), groundOf(w.map), s ? (x, y) => s.contains(x, y) : () => false);
}

export const planeKind = { id: 'planes', initPhase: 'late', init: initPlanes, tickPhase: 'world', tick: updatePlanes };
