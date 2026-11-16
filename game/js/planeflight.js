import { hoofdspeler } from './players.js';
import { bestuurInvoer } from './coopgast.js';
// Arcade-vliegtuig aan de wereld (#15): de eigen "Kist Kees" op een grasbaan bij
// het kleine vliegveld van Eelde, naast de helikopter (heliflight.js) maar met het
// vastevleugelmodel van arcadeplane.js. De pure kant (toetsen, baan, status) staat
// in planecontrol.js en heeft tests; dit bestand is de lijm met Vehicle, scene en
// HUD en is nog niet in beeld bekeken. Meldt zich in main.js als activiteitenkind.
// Sinds #492 staan ook de gemeten velden uit game/vliegplekken.json in de wereld als
// echte banen (w.planeVelden): de vluchtdienst vliegt van veld naar veld en een landing
// op een tweede veld is geen crash.

import { Vehicle } from './vehicle.js';
import { isInWater } from './util.js';
import { getVehicleMesh } from './models3d_vehicles.js';
import { levelShadow } from './shadowlevel.js';
import { attachPlane, flyPlaneVehicle, idlePlane, makeStrip, planeStatus } from './planecontrol.js';
import { veldBaan } from './arcadeplane.js';
import { instrumentData, maakPaneel, zomerWind, UITLEG_INSTAPPEN } from './instrumenten.js';

export const PLANE_MODEL = { name: 'plane', len: 8, wid: 10.6, maxSpeed: 70, accel: 14, brake: 10, turnRate: 1, color: '#e9e4d3' };
const DEALER = { x: 1764.51, y: 9959.94 };   // Rotor Roelf op Eelde, zie shops.js
const RESPAWN_AT_M = 900;   // #856: binnen deze afstand van Eelde zet de attractie de Kist terug
// #856: findStrip has no data around Eelde at start-up and picks the first flat candidate; once
// the airport buildings are streamed in it rejects every candidate. That first candidate is the
// grass strip the attraction has always used, so keep it as a fallback instead of having no Kist
// at all. Its centre line is clear; the plane starts 30 m along it, between the buildings.
const EELDE_STRIP = makeStrip({ x: DEALER.x + Math.cos(1.2) * 70, y: DEALER.y + Math.sin(1.2) * 70, heading: 0, length: 520 });

let strip = null;
let plane = null;
let hud = null;
let plekken = null;   // de gemeten velden (game/vliegplekken.json), voor de vluchtdienst (#492)
let msgAt = -Infinity;
let uitgelegd = null;
let vlagVanMij = false;   // heeft deze module world.noLookBack gezet (Q is in de kist het roer)
let missingSince = -Infinity;   // #856: laatste controle of de Kist nog in de wereld staat

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

// De velden voor de dienst (#492): Eelde als thuisveld en de gemeten velden uit
// game/vliegplekken.json, elk met een echte baan. De eigen strip komt uit findStrip; de velden
// uit het bestand zijn het midden van hun baan (zo meet scripts/world/vliegplekken.mjs ze).
function veldenVan() {
  const uit = [];
  if (strip) {
    const m = strip.point(strip.length / 2);
    uit.push({ id: 'eelde', naam: 'Eelde', x: m.x, y: m.y, heading: strip.heading, lengte: strip.length, breedte: strip.width, strip, thuis: true });
  }
  for (const v of plekken || []) {
    const baan = veldBaan(v);
    if (!baan) continue;
    uit.push({ id: v.id || `veld-${uit.length + 1}`, naam: v.naam || 'Veld', x: v.x, y: v.y, heading: baan.heading, lengte: baan.length, breedte: baan.width, strip: baan });
  }
  return uit;
}

function laadPlekken(w) {
  if (plekken) { w.planeVelden = veldenVan(); return; }
  if (typeof fetch === 'undefined' || typeof location === 'undefined') return;
  fetch(new URL('vliegplekken.json', location.href).href)
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (!j || j.v !== 1 || !Array.isArray(j.velden)) return;
      plekken = j.velden;
      w.planeVelden = veldenVan();
    })
    .catch(() => {});
}

// The strip of Eelde: found on the streamed map, or the fixed first candidate when the tiles
// around the airport are not there (yet) or are too built up for findStrip.
function ensureStrip(w) {
  if (!strip) strip = findStrip(w.map) || EELDE_STRIP;
  return strip;
}

// Put a Kist on the strip. Once at start-up; if the plane goes missing later (the traffic
// cull used to remove it while the player was far away, #856), updatePlanes puts it back as
// soon as the player is near Eelde again.
function spawnPlane(w) {
  if (!ensureStrip(w)) return null;
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
  return v;
}

function initPlanes(w) {
  strip = findStrip(w.map) || EELDE_STRIP;
  spawnPlane(w);
  w.planeVelden = veldenVan();
  laadPlekken(w);
}

// De baan onder dit punt: de strip van de eigen Kist (of van een vliegschoolles, die zet
// w.planeStrip tijdelijk) en de banen van de gemeten velden (#492). Buiten die banen is de
// grond geen landingsbaan.
function opBaan(w, x, y) {
  if (w.planeStrip === null) return false; // een les zonder baan (ringen, slalom): de grond is geen landing
  if (w.planeStrip && w.planeStrip.contains(x, y)) return true;
  for (const f of w.planeVelden || []) if (f.strip && f.strip.contains(x, y)) return true;
  return false;
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

// #852: the blob shadow is a child of the mesh, so it rose to flight level and tilted with the
// plane. The heli already flattens it on the ground and lets it fade with height (heliflight.js
// + shadowlevel.js); a plane does the same here. `groundZ` is the ground under the plane now,
// not the take-off field, so a shadow stays on the ground over hills too.
export function updatePlaneShadow(mesh, v, groundZ) {
  const sh = mesh && mesh.userData && mesh.userData.shadow;
  if (!sh || !v) return null;
  const alt = Math.max(0, (v.z || 0) - (Number.isFinite(groundZ) ? groundZ : 0));
  levelShadow(sh, mesh, alt - 0.03);
  const k = Math.max(0, Math.min(1, 1 - alt / 60));
  sh.visible = k > 0.05;
  const f = 1 + (1 - k) * 0.4;   // farther away: a larger, vaguer patch
  const len = (v.model && v.model.len) || PLANE_MODEL.len;
  const wid = (v.model && v.model.wid) || PLANE_MODEL.wid;
  sh.scale.set(len * 1.12 * f, 1, wid * 1.3 * f);
  return sh;
}

function updatePlanes(dt, w) {
  if (!dt) return;
  const gh = groundOf(w.map);
  const pv = hoofdspeler(w).inVehicle;
  for (const v of w.vehicles) {
    if (!v.isPlane) continue;
    if (v !== pv) idlePlane(v, dt, gh);
    const mesh = getVehicleMesh(v.id);
    if (mesh) {
      if (mesh.userData.prop) mesh.userData.prop.rotation.x += dt * (6 + 60 * (v.throttle || 0)) * (v.wrecked ? 0 : 1);
      updatePlaneShadow(mesh, v, gh(v.x, v.y));
    }
  }
  // #856: if the Kist is no longer in the world (culled while the player was far away, or a
  // first findStrip that ran before the tiles were there), put it back near Eelde.
  if ((!plane || !w.vehicles.includes(plane)) && (w.time || 0) - missingSince > 1.5) {
    missingSince = w.time || 0;
    const p = hoofdspeler(w);
    if (p && Math.hypot(p.x - DEALER.x, p.y - DEALER.y) < RESPAWN_AT_M) {
      const v = spawnPlane(w);
      if (v) w.planeVelden = veldenVan();
    }
  }
  if (pv && pv.isPlane && pv.plane && pv.plane.landing && w.time - msgAt > 3) {
    msgAt = w.time;
    w.addMessage(pv.plane.landing === 'zacht' ? 'Zachte landing!' : 'Harde landing, maar heel', 3, { kind: 'tip' });
  }
  // uitleg bij het instappen: een keer per sessie per toestel, in tekst
  if (pv && pv.isPlane && pv !== uitgelegd) { uitgelegd = pv; w.addMessage(UITLEG_INSTAPPEN, 9, { kind: 'tip' }); }
  else if (!(pv && pv.isPlane)) uitgelegd = null;
  // Q is in het vliegtuig het roer (planecontrol.js) en niet "achterom kijken": zonder deze vlag
  // kantelt de camera naar achteren zodra je links stuurt. Alleen zetten zolang je zelf in de kist
  // zit, en alleen terugnemen als wij hem gezet hebben (de skûtsje-minigame gebruikt dezelfde vlag).
  if (pv && pv.isPlane) { w.noLookBack = true; vlagVanMij = true; }
  else if (vlagVanMij) { w.noLookBack = false; vlagVanMij = false; }
  showCard(pv && pv.isPlane ? pv : null, w);
}

export function flyPlane(v, dt, w) {
  const inp = bestuurInvoer(w, v) || w.input;
  flyPlaneVehicle(v, dt, (k) => inp.isDown(k), groundOf(w.map), (x, y) => opBaan(w, x, y), windNu(w, v));
}

export const planeKind = { id: 'planes', initPhase: 'late', init: initPlanes, tickPhase: 'world', tick: updatePlanes };


