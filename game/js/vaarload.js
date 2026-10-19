// Loads the waterway network's files (#184): game/vaarnet_fixes.json puts the missing
// water (the holes under bridges and in locks, a canal the map lacks) into the world,
// game/vaarnet.json is the route graph the barges follow (vaarnet.js, vehicle.js
// setVaarNet). Both are small and optional: a build without them sails as before.
// The same net tells the tile streamer where a boat is heading (vaarPrefetch).
import { createVaarNet, patchRows, routeAhead, setSharedNet } from './vaarnet.js';
import { setVaarNet } from './vehicle.js';
import { tileIndexOf } from './gdt.js';
import { buildSluizen } from './sluizen.js';

let net = null;
const get = (name) => fetch(new URL(name, location.href).href).then((r) => (r.ok ? r.json() : null)).catch(() => null);

export async function loadVaarnet(map) {
  try {
    const [fixes, file, sluizen] = await Promise.all([get('vaarnet_fixes.json'), get('vaarnet.json'), get('sluizen.json')]);
    if (sluizen && Array.isArray(sluizen.sluizen)) buildSluizen(sluizen.sluizen);   // the locks work with their gates (sluizen.js, #236)
    if (fixes && map && map.addWaterPatches) map.addWaterPatches(patchRows(fixes));
    if (file && Array.isArray(file.nodes)) { net = createVaarNet(file); setVaarNet(net); setSharedNet(net); }
  } catch (e) { console.warn('waterway network not loaded', e && e.message); }
}

// The tile focus opts of a boat: the tiles under the net's route ahead (3 km, or 40 s of
// travel when faster) come with the tiles of the heading, so a canal that bends is
// loaded before the bow gets there, at a boat's speed as at a barge's.
// (the lookup is kept while the boat has moved less than 60 m and turned little)
let memo = null;
export function vaarPrefetch(opts, x, y) {
  if (!net || !opts || opts.vx === undefined) return opts;
  const sp = Math.hypot(opts.vx, opts.vy);
  if (!memo || Math.hypot(memo.x - x, memo.y - y) > 60) {
    const pts = routeAhead(net, x, y, opts.vx, opts.vy, Math.max(3000, sp * 40));
    const seen = new Set(), extra = [];
    for (const [px, py] of pts) {
      const [i, j] = tileIndexOf(px, py), k = i + ',' + j;
      if (!seen.has(k)) { seen.add(k); extra.push([i, j, 600]); }
    }
    memo = { x, y, extra };
  }
  return memo.extra.length ? { ...opts, extra: (opts.extra || []).concat(memo.extra) } : opts;
}
