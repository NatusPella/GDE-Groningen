// Arcade-vliegtuig aan de wereld (#15): de eigen "Kist Kees" op een grasbaan bij
// het kleine vliegveld van Eelde, naast de helikopter (heliflight.js) maar met het
// vastevleugelmodel van arcadeplane.js. De pure kant (toetsen, baan, status) staat
// in planecontrol.js en heeft tests; dit bestand is de lijm met Vehicle, scene en
// HUD en is nog niet in beeld bekeken. Meldt zich in main.js als activiteitenkind.

import { Vehicle } from './vehicle.js';
import { isInWater } from './util.js';
import { getVehicleMesh } from './models3d_vehicles.js';
import { attachPlane, flyPlaneVehicle, idlePlane, makeStrip, planeStatus } from './planecontrol.js';
import { instrumentData, maakPaneel, zomerWind, UITLEG_INSTAPPEN } from './instrumenten.js';

export const PLANE_MODEL = { name: 'plane', len: 8, wid: 10.6, maxSpeed: 70, accel: 14, brake: 10, turnRate: 1, color: '#e9e4d3' };
const DEALER = { x: 1764.51, y: 9959.94 };   // Rotor Roelf op Eelde, zie shops.js

let strip = null;
let plane = null;
let hud = null;
let msgAt = -Infinity;
let uitgelegd = null;

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

// De wind van dit moment (zomerbries). In de lessen van de vliegschool staat hij zachter, zodat smalle openingen te halen blijven.
export function windNu(w, v) {
  const k = v && v.schoolKist ? 0.4 : 1;
  const wd = zomerWind(w.time || 0, w.windAngle || 0);
  return { x: wd.x * k, y: wd.y * k, speed: wd.speed * k, dir: wd.dir };
}

function showCard(mine, w) {
  if (typeof document !== 'undefined') document.body.classList.toggle('plane-flying', !!mine);
  if (!mine) return;
  if (!hud) hud = maakPaneel();
  if (!hud) return;
  hud.zet(instrumentData(mine, windNu(w, mine)), planeStatus(mine).state, mine.schoolKist ? 'Schoolkist' : 'Kist Kees');
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
  // uitleg bij het instappen: een keer per sessie per toestel, in tekst
  if (pv && pv.isPlane && pv !== uitgelegd) { uitgelegd = pv; w.addMessage(UITLEG_INSTAPPEN, 9, { kind: 'tip' }); }
  else if (!(pv && pv.isPlane)) uitgelegd = null;
  showCard(pv && pv.isPlane ? pv : null, w);
}

export function flyPlane(v, dt, w) {
  const s = w.planeStrip;
  flyPlaneVehicle(v, dt, (k) => w.input.isDown(k), groundOf(w.map), s ? (x, y) => s.contains(x, y) : () => false, windNu(w, v));
}

export const planeKind = { id: 'planes', initPhase: 'late', init: initPlanes, tickPhase: 'world', tick: updatePlanes };
