import { hoofdspeler } from './players.js';
import { findProps, breakProp } from './breakables.js';
import { clearZones, clearZoneAt, pushOutOfClearZone } from './clearzone.js';

// Keeps the clear zones (clearzone.js) empty of people, traffic and props: a
// pedestrian is led out of the corridor, an AI vehicle is taken out of the
// world, a loose prop is knocked clear. Runs twice a second, and only when the
// player is near a zone. The ped and car spawners also refuse zone positions.
let timer = 0;
let propTimer = 0;

export function updateClearZones(dt, world) {
  if (!dt || world.paused || !hoofdspeler(world)) return;
  timer -= dt;
  if (timer > 0) return;
  timer = 0.5;
  const p = hoofdspeler(world);
  const zs = clearZones();
  if (!zs.length) return;
  let near = false;
  for (const z of zs) { const b = z.bounds; if (p.x > b[0] - 250 && p.x < b[2] + 250 && p.y > b[1] - 250 && p.y < b[3] + 250) { near = true; break; } }
  if (!near) return;
  for (const ped of world.pedestrians) {
    if (ped.scene || ped.scripted || ped.jobPed || ped.state === 'dead' || ped.ragdoll || ped.pose) continue;
    if (!clearZoneAt(ped.x, ped.y)) continue;
    const o = pushOutOfClearZone(ped.x, ped.y);
    ped.x = o.x; ped.y = o.y;
    ped.waypoint = null;
  }
  const vs = world.vehicles;
  for (let i = vs.length - 1; i >= 0; i--) {
    const v = vs[i];
    if (v === p.inVehicle || v.driver === 'player' || v.isBoat || v.isHeli || v.missionCar || v.isHeroCar || v.playerOwned || v.scripted) continue;
    if (clearZoneAt(v.x, v.y, v.halfLen || 1)) vs.splice(i, 1);
  }
  propTimer -= 0.5;
  if (propTimer > 0) return;
  propTimer = 2;
  for (const z of zs) {
    for (const [x, y] of z.pts) {
      if (Math.hypot(x - p.x, y - p.y) > 300) continue;
      for (const pr of findProps(x, y, z.r + 1.5)) {
        if (pr.mass >= 1e5 || !pr.cell || !clearZoneAt(pr.x, pr.y, pr.r || 0.3)) continue;
        // knocked clear of the track the way a kick does it (the owner of the prop hides the original)
        const o = pushOutOfClearZone(pr.x, pr.y, 3);
        const nx = o.x - pr.x, ny = o.y - pr.y, l = Math.hypot(nx, ny) || 1;
        breakProp(pr, { vx: nx / l * 4, vy: ny / l * 4, speed: 4, lift: 0.4, nx: nx / l, ny: ny / l, byPlayer: false });
      }
    }
  }
}

