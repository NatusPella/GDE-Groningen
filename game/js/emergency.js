// Lights and sirens. Ambulances in the traffic get a call now and then and
// race to it with the siren on; a police car or ambulance the player drives
// can switch its lights and siren with L. Traffic ahead of any running siren
// hugs the kerb and slows down, and stops when it is right behind
// (sirenYield, read by the traffic AI in vehicle.js).

import { spawnVehicleOnRoad } from './vehicle.js';
import { carModel, applyFleetFlags } from './trafficfleet.js';
import { nearestFacility } from './facilities.js';
import { activeSirens, sirenYield } from './trafficyield.js';
export { activeSirens, sirenYield };

const HOSPITAL_NEAR = 300;
const CALL_CHANCE_PER_S = 1 / 45;
const CALL_TIMEOUT = 120;
const ARRIVE_M = 25;

function canSiren(v) {
  return !!v && !v.wrecked && (v.isPolice || v.isAmbulance) && !v.isBike && !v.isScooter;
}

function startCall(v, world) {
  const map = world.map;
  for (let k = 0; k < 6; k++) {
    const a = Math.random() * Math.PI * 2, d = 250 + Math.random() * 400;
    const rp = map.nearestRoadPoint(v.x + Math.cos(a) * d, v.y + Math.sin(a) * d, 120, true);
    if (!rp || rp.road.cat === 'foot' || rp.road.cat === 'cycle' || (map.offStreetLevel && map.offStreetLevel(rp.x, rp.y))) continue;
    v.call = { x: rp.x, y: rp.y, until: world.time + CALL_TIMEOUT };
    v.sirenOn = true;
    v.aiOpts = { goal: { x: rp.x, y: rp.y }, chase: true, cruise: 15 };
    return;
  }
}

function endCall(v) {
  v.call = null;
  v.sirenOn = false;
  v.aiOpts = null;
  v.waitTimer = 6;
}

// Where ambulances wait: the UMCG entrance, else the nearest real hospital or
// ambulance post (facilities.js), in town or out in the Ommelanden.
function ambulanceBase(world, x, y) {
  const h = world.map.meta.hospital;
  if (h && Math.hypot(x - h.x, y - h.y) <= HOSPITAL_NEAR) return h;
  const f = nearestFacility(['hospital', 'ambulance'], x, y, { maxD: HOSPITAL_NEAR });
  return f && !f.umcg ? f : null;
}

function baseRoad(world, h) {
  return world.map.nearestRoadPoint(h.x, h.y, 120, true, true);
}

// A few ambulances waiting at the base whenever the player is near.
let hospitalTimer = 0;
function hospitalAmbulances(world, dt) {
  hospitalTimer -= dt;
  if (hospitalTimer > 0) return;
  hospitalTimer = 3;
  const p = world.player;
  const h = ambulanceBase(world, p.x, p.y);
  if (!h) return;
  if (world.vehicles.some((v) => v.hospitalCar)) return;
  const rp = baseRoad(world, h);
  if (!rp) return;
  const count = h.kind === 'ambulance' ? 2 : 3;
  for (let i = 0; i < count; i++) {
    const v = spawnVehicleOnRoad(world.map, rp.road, false, Math.random, false, false, { x: rp.x, y: rp.y }, false, carModel('ambulance'));
    applyFleetFlags(v, 'ambulance');
    const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
    const kerb = Math.max(0, (rp.road.width || rp.road.w || 6) / 2 - 1.2);
    v.x += -fy * kerb + fx * (i - 1) * 6.5;
    v.y += fx * kerb + fy * (i - 1) * 6.5;
    [v.x, v.y] = world.map.escapeBuilding(v.x, v.y, 1.2);
    v.road = null;
    v.speed = 0;
    v.hospitalCar = true;
    if (Math.hypot(v.x - p.x, v.y - p.y) < 25) continue;
    world.vehicles.push(v);
  }
}

export function updateEmergency(dt, world) {
  hospitalAmbulances(world, dt);
  const p = world.player;
  const pv = p.inVehicle;
  const input = world.input;
  if (input && input.wasPressed('l') && pv && pv.driver === 'player') {
    if (canSiren(pv)) {
      pv.sirenOn = !pv.sirenOn;
      world.addMessage(pv.sirenOn ? 'Zwaailicht en sirene aan: opzij, opzij!' : 'Zwaailicht en sirene uit', 2.5, { key: 'siren' });
    } else world.addMessage('Dit voertuig heeft geen zwaailicht', 2);
  }
  for (const v of world.vehicles) {
    if (v.fleetKind !== 'ambulance' || v.driver === 'player' || v.wrecked || v.hospitalCar) continue;
    if (v.stolenByPlayer || v.hijacked) { if (v.call) endCall(v); continue; }
    if (v.call) {
      if (Math.hypot(v.call.x - v.x, v.call.y - v.y) < ARRIVE_M || world.time > v.call.until || !v.road) endCall(v);
    } else if (v.road && Math.random() < CALL_CHANCE_PER_S * dt) startCall(v, world);
  }
}
