// Lights and sirens. Ambulances in the traffic get a call now and then and
// race to it with the siren on; a police car or ambulance the player drives
// can switch its lights and siren with L. Traffic ahead of any running siren
// hugs the kerb and slows down, and stops when it is right behind
// (sirenYield, read by the traffic AI in vehicle.js).

const YIELD_REACH = 55;
const CALL_CHANCE_PER_S = 1 / 45;
const CALL_TIMEOUT = 120;
const ARRIVE_M = 25;

let cache = { t: -1, list: [] };

export function activeSirens(world) {
  if (cache.t !== world.time) {
    cache.t = world.time;
    cache.list = world.vehicles.filter((v) => v.sirenOn && !v.wrecked && !v.sinking && !v.isBoat);
  }
  return cache.list;
}

// 'stop' | 'aside' | null for AI vehicle v.
export function sirenYield(v, world) {
  const list = activeSirens(world);
  if (!list.length) return null;
  const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  for (const e of list) {
    if (e === v) continue;
    const dx = e.x - v.x, dy = e.y - v.y;
    if (dx * dx + dy * dy > YIELD_REACH * YIELD_REACH) continue;
    if (Math.abs((e.z || 0) - (v.z || 0)) > 3) continue;
    const fwd = dx * fx + dy * fy, lat = Math.abs(dy * fx - dx * fy);
    const rel = Math.cos(e.angle - v.angle);
    if (fwd < 0 && rel > 0.5 && lat < 8) return fwd > -20 ? 'stop' : 'aside';
    if (fwd > 0 && rel < -0.5 && lat < 8 && fwd < 35) return 'aside';
    if (fwd > 0 && fwd < 25 && Math.abs(rel) < 0.5 && lat < 22 && Math.abs(e.speed) > 3) return 'stop';
  }
  return null;
}

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

export function updateEmergency(dt, world) {
  const p = world.player;
  const pv = p.inVehicle;
  const input = world.input;
  if (input && input.wasPressed('l') && pv && pv.driver === 'player') {
    if (canSiren(pv)) {
      pv.sirenOn = !pv.sirenOn;
      world.addMessage(pv.sirenOn ? 'Zwaailicht en sirene aan: opzij, opzij!' : 'Zwaailicht en sirene uit', 2.5);
    } else world.addMessage('Dit voertuig heeft geen zwaailicht', 2);
  }
  for (const v of world.vehicles) {
    if (v.fleetKind !== 'ambulance' || v.driver === 'player' || v.wrecked) continue;
    if (v.stolenByPlayer || v.hijacked) { if (v.call) endCall(v); continue; }
    if (v.call) {
      if (Math.hypot(v.call.x - v.x, v.call.y - v.y) < ARRIVE_M || world.time > v.call.until || !v.road) endCall(v);
    } else if (v.road && Math.random() < CALL_CHANCE_PER_S * dt) startCall(v, world);
  }
}
