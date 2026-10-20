// Network audit (docs/PROVINCIE-PLAN.md 2.11, punt 8): every car road driven
// both ways in a headless sim, with the player's car physics and collision
// (ringcheck.js driveAcross), at the road's speed (slowed only for bends):
// no snag (a knock: more than 1.5 m/s lost in a step), no jump (in the air
// for more than 0.3 s), no sink (into water) or fall (off a deck), no push off
// the road, no standstill. Each drive runs on 25 m into the ways that carry
// on at both ends, so the joints are driven too.
//   node scripts/world/drive_audit.mjs [--all] [--solids] [--limit=N] [--name=Straat] [--strict] [--json=out.json]
// Default: the main and normal roads (secondary and up, tertiary, residential,
// unclassified, their links); --all adds the minor ones (service, living
// streets). --solids also probes every lane of those roads for anything solid
// (ringcheck.js probeRoadSolids: footprints, walls, barriers, trees, poles,
// clutter). The ring's own checks (ring_probe.mjs, the story test) stay as
// they are; this is the same harness over the whole network.
import '../node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

globalThis.requestAnimationFrame = (f) => setImmediate(f);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const opt = (k) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null; };
const { GameMap, applyMapExtras } = await import('../../game/js/mapdata.js');
await import('../../game/js/player.js');
const RC = await import('../../game/js/ringcheck.js');

const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'game/citymap.json'), 'utf8'));
applyMapExtras(data, JSON.parse(fs.readFileSync(path.join(ROOT, 'game/mapextras.json'), 'utf8')));
const map = new GameMap(data);
const world = { map, flitspaalen: [], player: { x: 0, y: 0 }, vehicles: [], props: [], particles: [], stats: {}, time: 0, addMessage() {}, audioEvents: [] };
// the signal poles stand in the world as in the game (props a car can hit)
(await import('../../game/js/trafficlights.js')).initTrafficLights(world);

const CLASSES = args.includes('--all') ? new Set(['major', 'normal', 'minor']) : new Set(['major', 'normal']);
const len = (P) => P.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - P[i][0], q[1] - P[i][1]), 0);
let roads = map.roads.filter((r) => CLASSES.has(r.cat) && r.type !== 'track' && !r.busOnly && len(r.pts) >= 8);
const limit = +(opt('limit') || 0);
if (limit) roads = roads.slice(0, limit);
if (opt('name')) roads = roads.filter((r) => r.name === opt('name'));

const t0 = performance.now();
const fails = [];
const bends = [];
let drives = 0;
for (const r of roads) {
  const L = len(r.pts);
  // the road and 25 m on into the ways that carry on, in pieces of at most 400 m
  const full = RC.crossingPath(map, { road: r, s0: 0, s1: L }, 25);
  if (full.length < 12) continue;
  const speed = Math.max(6, Math.min(r.speed || 11, 30));
  for (let a = 0; a < full.length - 12; a += 400) {
    const piece = full.slice(a, Math.min(full.length, a + 425));
    if (piece.length < 12) continue;
    for (const dir of [1, -1]) {
      drives++;
      const res = await RC.driveAcross(world, dir > 0 ? piece : piece.slice().reverse(), speed, { jump: true, maxT: 60 });
      // a side scrape of a house by a car swinging round a sharp joint (yawed over 20 deg off
      // the path's heading, or more than 1.5 m off it) is the audit's own bend, not a
      // footprint on the carriageway: listed apart (building_clearance.mjs keeps 1.5 m
      // between every car centreline and a footprint, a 4.1 x 1.85 m body swings wider in a bend)
      if (res && res.what.startsWith('botst') && /^gebouw [^,]*\(zijkant\)$/.test(res.by || '') && (res.yaw > 20 || res.dev > 1.5)) {
        bends.push({ road: `${r.ref || ''} ${r.name || r.type}`.trim(), type: r.type, dir: dir > 0 ? 'mee' : 'tegen', ...res });
        continue;
      }
      if (res) fails.push({ road: `${r.ref || ''} ${r.name || r.type}`.trim(), type: r.type, dir: dir > 0 ? 'mee' : 'tegen', ...res });
    }
  }
}
const secs = (performance.now() - t0) / 1000;
const by = {};
for (const f of fails) { const k = f.what.split(" (")[0]; by[k] = (by[k] || 0) + 1; }
console.log(`${roads.length} roads, ${drives} drives in ${secs.toFixed(0)} s: ${fails.length} failed${fails.length ? ' (' + Object.entries(by).map(([k, v]) => `${k} ${v}`).join(', ') + ')' : ''}`);
if (bends.length) console.log(`${bends.length} side scrapes in a sharp joint (yaw over 20 deg or 1.5 m off the path), not counted:`);
for (const f of bends) console.log(`  ${f.road} (${f.type}, ${f.dir}) at ${f.x}, ${f.y} ${f.v} km/h yaw ${f.yaw} dev ${f.dev} m`);
for (const f of fails.slice(0, 40)) console.log(`  ${f.what.padEnd(22)} ${f.road} (${f.type}, ${f.dir}) at ${f.x}, ${f.y} z ${f.z} ${f.v} km/h${f.by ? ' by ' + f.by : ''}`);

let solids = [];
if (args.includes('--solids')) {
  const t1 = performance.now();
  solids = RC.probeRoadSolids(world, roads);
  const sk = {};
  for (const h of solids) sk[h.kind] = (sk[h.kind] || 0) + 1;
  console.log(`solids on the lanes of ${roads.length} roads in ${((performance.now() - t1) / 1000).toFixed(0)} s: ${solids.length}${solids.length ? ' (' + Object.entries(sk).map(([k, v]) => `${k} ${v}`).join(', ') + ')' : ''}`);
  for (const h of solids.slice(0, 30)) console.log(`  ${h.kind.padEnd(8)} ${h.what} on ${h.route} +${h.s} m at ${h.x}, ${h.y} z ${h.z}`);
}
if (opt('json')) fs.writeFileSync(opt('json'), JSON.stringify({ drives, fails, bends, solids }));
process.exit(args.includes('--strict') && (fails.length || solids.length) ? 1 : 0);
