// De ballon in het spel (#1377, L3b): de wereldkant van vehicle_balloon.js. Zonder THREE en zonder DOM, zodat scripts/balloonride_test.mjs hem in node draait;
// het tekenen van de inzittenden en de HUD staat in balloonride3d.js.
//
// Een ballonmand staat bij elke lanceerplek die de speler nadert (de vaste plekken van vehicle_balloon.js en de parken en weilanden die skyprops.js zoekt).
// E bij de mand zet je erin; vanaf dan is de speler de piloot: spatie is de brander, shift de klep, E stapt uit zodra de ballon op de grond staat. Het
// lichaam van de speler en zijn metgezel blijven onder de mand hangen (de camera is de ballon zelf), net als bij de duifmodus en de heli-missie:
// main.js draait updateBalloonRide in plaats van het gewone spel zolang `world.balloonRide` bestaat.
//
// Het decor (`world.balloons`, skyprops.js) blijft ongemoeid: de mand krijgt wel een eigen `scripted` ingang in die lijst, zodat skyprops3d.js hem tekent
// (de bestaande ballonmodel met brander en vlam) en skyprops.js zijn drift en spawn-cyclus overslaat.
//
// Samen spelen: de brander draait bij wie het spel opende. Een gast zit mee als passagier (vehicle_balloon.js stapIn met gast) en krijgt zijn eigen
// loon en punten via loopbaanVerdien (deel: true). Valt de piloot weg (pilotWeg), dan landt de ballon zacht met de gast aan boord.
import { hoofdspeler } from './players.js';
import { playerBusy } from './busy.js';
import { isInWater } from './util.js';
import * as VB from './vehicle_balloon.js';
import { driftHeading, BALLOON_MODEL } from './balloonflight.js';

export const SPAWN_R = 450;      // m: een mand verschijnt als de speler zo dichtbij komt
export const DESPAWN_R = 1100;   // m: een lege mand op de grond verdwijnt weer
export const PROMPT_R = 14;      // m: vanaf hier toont het spel "E: Ballon"
export const REWARD = { basis: 40, xp: 24, minAirS: 45, minAltM: 60, minDistM: 120 }; // een echte vlucht, geen op en neer
const CAM = { back: 22, up: 9, look: 4.5, fov: 62, turn: 0.55 };

let parkSites = () => [];
let verdien = null;

const groundAt = (w, x, y) => ((w && w.map && w.map.groundHeightAt && w.map.groundHeightAt(x, y, 0)) || 0);

// opts.parkSites(map) -> [{ x, y }] (skyprops.js launchSites); opts.verdien(w, vak, basis, opts) -> bedrag (loopbaanlive.js loopbaanVerdien).
export function initBalloonRide(w, opts = {}) {
  if (typeof opts.parkSites === 'function') parkSites = opts.parkSites;
  if (typeof opts.verdien === 'function') verdien = opts.verdien;
  w.balloonCrafts = [];
  w.balloonRide = null;
  w._balloonSpawnT = 0;
  return w;
}

// De ingang in world.balloons die skyprops3d.js tekent. scripted: skyprops.js slaat hem over (geen eigen drift, geen despawn).
function makeVisual(c, w) {
  const z = groundAt(w, c.x, c.y);
  return {
    x: c.x, y: c.y, z, ground: z, targetZ: z, vz: 0, vx: 0, vy: 0, drift: 0, spin: 0, yaw: (c.id * 0.9) % (Math.PI * 2), seed: 7300 + c.id,
    phase: 'ground', timer: 0, burn: 0, burnLeft: 0, nextBurn: 1e9, burnSeq: 0, burnDur: 0, age: 0, scripted: true, playerCraft: true,
  };
}

let nextId = 1;
function addCraft(w, site) {
  const c = VB.makeBalloonCraft(site, { id: nextId++ });
  c.siteKey = site.id;
  c.gz = groundAt(w, c.x, c.y);
  c.visual = makeVisual(c, w);
  c.maxZ = 0; c.startX = c.x; c.startY = c.y;
  if (!w.balloons) w.balloons = [];
  w.balloons.push(c.visual);
  w.balloonCrafts.push(c);
  return c;
}
function removeCraft(w, c) {
  const i = w.balloonCrafts.indexOf(c);
  if (i >= 0) w.balloonCrafts.splice(i, 1);
  const j = w.balloons ? w.balloons.indexOf(c.visual) : -1;
  if (j >= 0) w.balloons.splice(j, 1);
}

// Houd een mand klaar bij elke lanceerplek in de buurt van de speler, en ruim lege manden ver weg op.
export function ensureCrafts(w) {
  if (!w || !w.balloonCrafts || !w.map) return;
  const p = hoofdspeler(w);
  if (!p) return;
  let sites = [];
  try { sites = VB.lanceerPlekken(parkSites(w.map) || []); } catch { sites = [...VB.VASTE_PLEKKEN]; }
  for (const s of sites) {
    if (Math.hypot(s.x - p.x, s.y - p.y) > SPAWN_R) continue;
    if (w.balloonCrafts.some((c) => c.siteKey === s.id)) continue;
    addCraft(w, s);
  }
  for (const c of [...w.balloonCrafts]) {
    const leeg = !c.driver && !c.passengers.length && c.onGround;
    if (leeg && Math.hypot(c.x - p.x, c.y - p.y) > DESPAWN_R) removeCraft(w, c);
  }
}

export const nearestCraft = (w, x, y, r = Infinity) => {
  let best = null, bd = r;
  for (const c of (w && w.balloonCrafts) || []) { const d = Math.hypot(c.x - x, c.y - y); if (d <= bd) { best = c; bd = d; } }
  return best;
};

// Wat het spel toont als je bij een mand staat: { id, x, y, h, key, label, sub, ring, dim } (prompts.js), of null.
export function balloonPrompt(w) {
  if (!w || w.balloonRide || !w.balloonCrafts || !w.balloonCrafts.length) return null;
  const p = hoofdspeler(w);
  if (!p || p.inVehicle || p.swimming || p.water) return null;
  const c = nearestCraft(w, p.x, p.y, PROMPT_R);
  if (!c) return null;
  const k = VB.kanInstappen(c, { x: p.x, y: p.y, slot: 0 }, w);
  const busy = playerBusy(w).busy;
  const dicht = !k.ok && k.reden !== 'ver';
  return { id: 'ballon-' + c.id, x: c.x, y: c.y, h: 2.4, key: 'E', label: 'Ballon', sub: dicht ? k.tekst : busy ? 'Eerst afmaken waar je mee bezig bent' : 'Stijg op: spatie brandt, shift opent de klep', ring: true, dim: dicht || busy };
}

// E bij de mand. Geeft true als de toets verwerkt is (instappen of een reden getoond).
export function tryBalloonBoard(w) {
  const input = w && w.input;
  if (!input || w.balloonRide || !w.balloonCrafts || !(input.wasPressed('e') || input.wasPressed('f'))) return false;
  const p = hoofdspeler(w);
  if (!p || p.inVehicle || p.swimming || p.water) return false;
  const c = nearestCraft(w, p.x, p.y, VB.INSTAP_AFSTAND);
  if (!c) return false;
  input.consume('e'); input.consume('f');
  if (playerBusy(w).busy) { w.addMessage('Niet nu: maak eerst af waar je mee bezig bent.', 3); return true; }
  const r = VB.stapIn(c, { x: p.x, y: p.y, slot: 0 }, w);
  if (!r.ok) { w.addMessage(r.tekst || 'Je kunt nu niet in de ballon.', 3.5, { kind: 'tip', key: 'ballon-niet' }); return true; }
  startRide(w, c);
  return true;
}

function startRide(w, c) {
  const p = hoofdspeler(w);
  w.balloonRide = { craft: c, t: 0, camYaw: null, flown: 0, prevHide: !!w.cinematicHidePlayers, rewarded: false };
  w.cinematicHidePlayers = true; // de speler en zijn metgezel zitten in de mand (balloonride3d.js tekent ze daar)
  w.cameraOverride = null;
  if (p) { p.vx = 0; p.vy = 0; p.inVehicle = null; }
  c.maxZ = c.flight.z; c.startX = c.x; c.startY = c.y; c.airT = 0;
  syncBodies(w, c);
  w.addMessage('In de ballon: spatie brandt en stijgt, shift opent de klep en daalt. E stapt uit zodra je op de grond staat. Sturen doet de wind.', 6, { kind: 'tip', key: 'ballon-keys' });
}

// Het lichaam van de speler en zijn metgezel hangen in de mand.
function syncBodies(w, c) {
  const p = hoofdspeler(w);
  if (p) { p.x = c.x; p.y = c.y; p.gz = c.gz; }
  const comp = w.companion;
  if (comp) { comp.x = c.x; comp.y = c.y; comp.vx = 0; comp.vy = 0; comp.gz = c.gz; if (comp.inVehicle) { comp.inVehicle.passenger = null; comp.inVehicle = null; } }
}

// De camera: achter de ballon, een flink eind boven de mand, met de koers van de drift langzaam gevolgd (geen schok bij een windvlaag).
export function rideCamera(ride, c, dt = 0) {
  const f = c.flight;
  const target = driftHeading(f);
  if (ride.camYaw == null) ride.camYaw = target;
  else { let d = (target - ride.camYaw) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; ride.camYaw += d * Math.min(1, dt * CAM.turn); }
  const z = c.gz + f.z;
  const back = CAM.back + Math.min(14, f.z * 0.04);
  return {
    position: { x: c.x - Math.cos(ride.camYaw) * back, y: c.y - Math.sin(ride.camYaw) * back, z: z + CAM.up },
    lookAt: { x: c.x, y: c.y, z: z + CAM.look },
    fov: CAM.fov, cut: true, bron: 'ballon',
  };
}

// De HUD-regels voor balloonride3d.js: { regel, waarschuwing, toetsen }.
export function rideHud(w) {
  const r = w && w.balloonRide;
  if (!r) return null;
  const h = VB.ballonHud(r.craft);
  const water = r.craft.onGround && r.craft.opWater;
  return {
    regel: h.tekst,
    waarschuwing: water ? 'Je drijft op het water: brand op en zoek land om uit te stappen.' : h.waarschuwing,
    toetsen: r.craft.onGround && !water ? 'Spatie: brander   Shift: klep   E: uitstappen' : 'Spatie: brander   Shift: klep',
  };
}

const kijkInput = (w) => ({ burn: !!w.input.isDown(' '), vent: !!w.input.isDown('shift') });

// Eén stap van de ballon voor een mand (met piloot uit de invoer, zonder piloot zacht landen).
function stepCraft(w, c, dt, invoer) {
  const ev = VB.stepBalloonCraft(c, invoer, dt, w);
  c.gz = groundAt(w, c.x, c.y);
  c.maxZ = Math.max(c.maxZ || 0, c.flight.z);
  if (!c.onGround) c.airT = (c.airT || 0) + dt;
  const v = c.visual;
  if (v) {
    v.x = c.x; v.y = c.y; v.z = c.gz + c.flight.z; v.ground = c.gz; v.vz = c.flight.vz; v.vx = c.flight.vx; v.vy = c.flight.vy;
    v.age += dt; v.yaw += Math.min(0.05, (Math.hypot(c.flight.vx, c.flight.vy) > 0.3 ? 0.012 : 0.003)) * dt;
    v.burn += ((c.input && c.input.burn && c.flight.fuel > 0 ? 1 : 0) - v.burn) * Math.min(1, dt * 10);
    v.phase = c.onGround ? 'ground' : 'float';
  }
  return ev;
}

function afrekenen(w, c) {
  const r = w.balloonRide;
  if (!r || r.rewarded || !verdien) return 0;
  const afstand = Math.hypot(c.x - c.startX, c.y - c.startY);
  if ((c.airT || 0) < REWARD.minAirS || (c.maxZ || 0) < REWARD.minAltM || afstand < REWARD.minDistM) return 0;
  r.rewarded = true;
  const bedrag = verdien(w, 'lucht', REWARD.basis, { xp: REWARD.xp, n: 1, uniek: 'ballon:' + (c.siteKey || c.id), rubriek: 'Overig inkomsten' });
  return bedrag;
}

function handleEvents(w, c, ev) {
  for (const e of ev) {
    if (e.type === 'geland') {
      c.opWater = !!(w.map && isInWater(w.map, c.x, c.y));
      if (c.opWater) { w.addMessage('Je landt op het water. Brand op en zoek land.', 4, { kind: 'tip', key: 'ballon-water' }); continue; }
      const bedrag = e.hard ? 0 : afrekenen(w, c);
      w.addMessage(e.hard ? 'Harde landing. Je staat, maar de mand heeft een mening.' : 'Zachte landing. Dat noemen ze meevaren.', 4, { kind: 'tip', key: 'ballon-geland' });
      if (bedrag > 0) w.addMessage(`Vlucht beloond: €${Math.round(bedrag)}`, 3.5, { kind: 'geld', key: 'ballon-loon' });
      c.airT = 0; c.maxZ = 0; c.startX = c.x; c.startY = c.y; if (w.balloonRide) w.balloonRide.rewarded = false;
    } else if (e.type === 'opgestegen') {
      c.opWater = false; c.startX = c.x; c.startY = c.y; c.airT = 0; c.maxZ = 0;
    } else if (e.type === 'brandstof-op') {
      w.addMessage('De brander slikt lucht: de tank is leeg. Zacht dalen en landen.', 4, { kind: 'tip', key: 'ballon-leeg' });
    } else if (e.type === 'plafond') {
      w.addMessage('Hoger komt de ballon niet: de lucht is te ijl.', 3, { kind: 'tip', key: 'ballon-plafond' });
    }
  }
}

// Elk frame, ook als je niet meevaart: manden aanmaken, een zwevende zonder piloot zacht naar beneden brengen, de tekening bijwerken.
export function updateBalloonCrafts(dt, w) {
  if (!w || !w.balloonCrafts) return;
  w._balloonSpawnT = (w._balloonSpawnT || 0) - dt;
  if (w._balloonSpawnT <= 0) { w._balloonSpawnT = 1; ensureCrafts(w); }
  for (const c of w.balloonCrafts) {
    if (w.balloonRide && w.balloonRide.craft === c) continue;
    if (!c.onGround || (c.visual && c.visual.burn > 0.01)) { const ev = stepCraft(w, c, dt, { burn: false, vent: false }); handleEvents(w, c, ev); }
  }
}

// De hele wereld staat stil behalve de ballon (main.js: `else if (world.balloonRide) updateBalloonRide(dt, world)`).
export function updateBalloonRide(dt, w) {
  const r = w.balloonRide;
  if (!r) return;
  const c = r.craft;
  r.t += dt;
  const input = c.driver ? kijkInput(w) : { burn: false, vent: false };
  const ev = stepCraft(w, c, dt, input);
  handleEvents(w, c, ev);
  syncBodies(w, c);
  for (const o of w.balloonCrafts) if (o !== c && (!o.onGround)) handleEvents(w, o, stepCraft(w, o, dt, { burn: false, vent: false }));
  w.cameraOverride = rideCamera(r, c, dt);
  if (c.onGround && !c.opWater && w.input.wasPressed('e')) { w.input.consume('e'); stopBalloonRide(w); }
}

// Uitstappen: alleen op de grond (vehicle_balloon.js stapUit), naast de mand op open grond.
export function stopBalloonRide(w, { force = false } = {}) {
  const r = w.balloonRide;
  if (!r) return false;
  const c = r.craft;
  if (!force) {
    const u = VB.stapUit(c, 0);
    if (!u.ok) { w.addMessage(u.tekst || 'Uitstappen kan pas op de grond.', 3, { kind: 'tip', key: 'ballon-uit' }); return false; }
  } else { c.driver = null; c.passengers.length = 0; }
  const p = hoofdspeler(w);
  const map = w.map;
  let sp = { x: c.x + 2.6, y: c.y + 0.6 };
  if (map && map.openSpotNear) { try { const o = map.openSpotNear(sp.x, sp.y); if (o && Number.isFinite(o.x)) sp = o; } catch { /* de eerste plek blijft */ } }
  if (p) { p.x = sp.x; p.y = sp.y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0; p.gz = groundAt(w, sp.x, sp.y); p.inVehicle = null; }
  const comp = w.companion;
  if (comp) { comp.x = sp.x + 1.1; comp.y = sp.y + 0.4; comp.vx = 0; comp.vy = 0; comp.z = 0; comp.gz = p ? p.gz : 0; }
  w.cinematicHidePlayers = r.prevHide;
  if (w.cameraOverride && w.cameraOverride.bron === 'ballon') w.cameraOverride = null;
  w.balloonRide = null;
  return true;
}

// Samen spelen: de piloot valt weg (afsluiten, netwerk). In de lucht blijft de gast aan boord en landt de ballon zacht; op de grond stapt iedereen uit.
export function balloonPilotLeft(w) {
  const r = w && w.balloonRide;
  if (!r) return false;
  VB.pilootWeg(r.craft);
  if (r.craft.onGround) return stopBalloonRide(w, { force: true });
  w.balloonRide = null; // de camera en het lichaam zijn weer van het gewone spel; de mand landt zelf (updateBalloonCrafts)
  w.cinematicHidePlayers = r.prevHide;
  if (w.cameraOverride && w.cameraOverride.bron === 'ballon') w.cameraOverride = null;
  return true;
}

export const BALLOON_CEILING = BALLOON_MODEL.ceiling;
