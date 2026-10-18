// Wat AI-verkeer van voetgangers en sirenes moet weten (zebra's, uitwijken voor hulpdiensten):
// leaf-module, zodat vehicle.js geen cyclus met pedroutes.js en emergency.js vormt (#108).
// pedroutes.js en emergency.js exporteren de functies opnieuw.

const YIELD_REACH = 55;

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
    // a siren standing still (at the scene) is simply passed
    if (e === v || Math.abs(e.speed) < 1.5) continue;
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

// Walkers waiting at or walking over a zebra; AI traffic stops for them.
const zebraUsers = new Map();

export function markZebraUser(ped, cr, t) {
  zebraUsers.set(ped, { t, reach: (cr.road.width || 6) * 0.75 + 2.2 });
}

// Traffic AI hook (vehicle.js): speed that stops the vehicle before a zebra
// with a walker on or at it. `project` is vehicle.js's projectOnPath.
export function zebraSpeedLimit(v, path, project, now) {
  if (!zebraUsers.size) return Infinity;
  let vmax = Infinity;
  const decel = v.model.brake * 0.45;
  for (const [ped, z] of zebraUsers) {
    if (now - z.t > 0.6 || ped.state === 'dead') { zebraUsers.delete(ped); continue; }
    const dx = ped.x - v.x, dy = ped.y - v.y;
    if (dx * dx + dy * dy > 45 * 45) continue;
    const pr = project(path, ped.x, ped.y);
    if (!pr || pr.lat > z.reach) continue;
    const stopS = pr.s - v.halfLen - 2.5;
    // too close to stop comfortably: carry on, the walker waits for the gap
    if (stopS < -0.5 || v.speed * v.speed > 2 * decel * 1.6 * (stopS + 1)) continue;
    vmax = Math.min(vmax, Math.sqrt(2 * decel * Math.max(0, stopS)));
  }
  return vmax;
}
