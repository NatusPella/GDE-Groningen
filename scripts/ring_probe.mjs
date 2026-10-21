// The storytest's "ring roads free of solid obstacles" check (ringcheck.js
// probeRingSolids) in Node, on the static map: buildings, elevation walls and
// barriers, open water, street trees and cell clutter on the ring's lanes.
//   node scripts/ring_probe.mjs
import './node3d.mjs';
import fs from 'node:fs';

const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
await import('../game/js/player.js');
const { probeRingSolids } = await import('../game/js/ringcheck.js');

const root = new URL('../game/', import.meta.url);
const { loadCityData } = await import('./lib/loadworld.mjs');
const data = await loadCityData();
const map = new GameMap(data);
const hits = probeRingSolids({ map, flitspaalen: [] });
for (const h of hits.slice(0, 60)) console.log(`${h.route} +${h.s} m ${h.kind} ${h.what} (${h.x}, ${h.y}, z ${h.z})`);
console.log(`ring solids: ${hits.length}`);
process.exit(hits.length ? 1 : 0);
