// The audit of weiland edges and herds against the real tiles (#124 #185 #210): the limit rules
// and, with the province tiles (game/world), a small run: fences, hedges and herds not over the
// track, a road, water or a house, no herd in water, no herd that can wander onto the carriageway,
// no walker on the asphalt (#502). About 1 minute.
//   node scripts/prop_conflict_audit_test.mjs
import fs from 'node:fs';
import './node3d.mjs';

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

const A = await import('./world/prop_conflict_audit.mjs');
const CS = await import('../game/js/countryside.js');

// the limit rules
ok(A.overLimits({ posts: 1000, wires: 400, hedges: 300 }).length === 0, 'nothing over nothing is fine');
ok(A.overLimits({ postOnRail: 1 }).length === 1, 'one post over the track is too many');
ok(A.overLimits({ cattleInWater: 1 }).length === 1 && A.overLimits({ osmOnRail: 2 }).length === 1, 'a herd in water, a mapped fence over the track too');
ok(A.overLimits({ cattleReachOnRoad: 1 }).length === 1, 'a herd that can reach the carriageway is too many');
ok(A.overLimits({ walkersOnRoad: 1 }).length === 1, 'a walker on the asphalt is too many');
ok(A.overLimits({ posts: 1000, seamGaps: 2 }).length === 0 && A.overLimits({ posts: 1000, seamGaps: 3 }).length === 1, 'a seam gap rate of 0.2% is the limit');
ok(A.streekOf(31789, 7892) === 'Oldambt' && A.streekOf(-12463, 6451) === 'Westerkwartier' && A.streekOf(201, 45) === 'Stad', 'the regions by the nearest anchor place');

// --- #502: walkers beside a road, not on it ---------------------------------
// A T-junction of the tiles' roads: the wide road runs east-west, a lane ends on
// its centreline. A walker spawned beside the lane, 1 to 3 m past its edge, stands
// in the middle of the wide road; that is what the playtest saw.
const PED = await import('../game/js/pedestrians.js');
const { isOnRoad } = await import('../game/js/pedgeom.js');
const wide = { id: 1, type: 'secondary', cat: 'normal', width: 8, pts: [[-200, 0], [200, 0]], bounds: [-200, -4, 200, 4] };
const lane = { id: 2, type: 'service', cat: 'minor', width: 4, pts: [[0, 0], [0, 80]], bounds: [-2, 0, 2, 80] };
const tmap = {
  roadsNear: () => [wide, lane], buildingsNear: () => [], waterNear: () => [], waterGrid: null, meta: {},
  offStreetLevel: () => false, onRingCarriageway: () => false, greenNear: () => [], isOpenSpot: () => true,
};
let s = 502;
const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
const peds = [];
for (let i = 0; i < 8; i++) peds.push(...PED.spawnPedestriansNear(tmap, 0, 4, 20, rnd, true));
const onLane = peds.filter((p) => isOnRoad(tmap, p.x, p.y, 0, ['major', 'normal', 'minor']));
ok(peds.length > 40, 'the junction spawns walkers', String(peds.length));
ok(onLane.length === 0, 'no walker stands in the lane of the road a side road meets', `${onLane.length} of ${peds.length} on the asphalt`);

// --- #502: a herd that grazes to the edge of its pasture ---------------------
// The wander target is drawn within the animal's grazing radius, clamped to the
// pasture; a pasture rect runs to the strip's edge and knows nothing of the road.
ok(typeof CS.animalTarget === 'function', 'the generator picks a wander target with a clearance rule (animalTarget)');
if (typeof CS.animalTarget !== 'function') { console.log(`${n} checks, ${fails} failed`); process.exit(1); }
{
  // a road strip 8 m wide at x = 0; the pasture runs up to it and the herd grazes at its edge
  const onRoad = (x) => Math.abs(x) < 4;
  const clear = (x) => !onRoad(x);
  const a = { kind: 'cow', x: 5.5, y: 0, hx: 5.5, hy: 0, rect: [-30, -30, 30, 30], spread: 14 };
  const rr = (() => { let q = 7; return () => { q = (Math.imul(q, 1664525) + 1013904223) >>> 0; return q / 4294967296; }; })();
  let hits = 0, picks = 0;
  for (let i = 0; i < 400; i++) {
    const t = CS.animalTarget(a, rr, clear);
    if (!t) continue;
    picks++;
    if (onRoad(t[0])) hits++;
  }
  ok(picks > 300, 'the herd keeps grazing: most tries find a spot in the pasture', String(picks));
  ok(hits === 0, 'the wander target never lands on the carriageway', `${hits} of ${picks}`);
}

const out = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', out))) { console.log('SKIP no game/world with the province layer'); console.log(`${n} checks, ${fails} failed`); process.exit(fails ? 1 : 0); }

// the windows are the same every run
const index = JSON.parse(fs.readFileSync(new URL('index-provincie.json', out), 'utf8'));
const W1 = A.pickWindows(index, { rail: 3, random: 3, seed: 7 }), W2 = A.pickWindows(index, { rail: 3, random: 3, seed: 7 });
ok(JSON.stringify(W1) === JSON.stringify(W2) && W1.rail.length === 3 && W1.random.length === 3, 'the windows are picked the same every run');

// a small run on those windows, as main.js sets the world up
const land = JSON.parse(fs.readFileSync(new URL('provincie-land.json', out), 'utf8'));
const CE = await import('../game/js/countryedge.js');
const pairs = (p) => { const o = []; for (let i = 0; i < p.length; i += 2) o.push([p[i], p[i + 1]]); return o; };
CE.initCountryEdge({ meta: { bounds: [-2000, -2000, 2000, 2000] }, railRoutes: [], countryRails: (land.rails || []).map(pairs), roads: [], buildings: [], water: [], green: [] });
const dir = new URL('../game/world', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const list = [];
for (const key of [...W1.rail, ...W1.random]) list.push(A.auditWindow(dir, index, key));
const total = A.sumWindows(list);
ok(total.posts > 1000 && total.wires > 300, 'the windows have fences', JSON.stringify({ posts: total.posts, wires: total.wires }));
const bad = A.overLimits(total);
ok(bad.length === 0, 'no fence, hedge or herd over the track, a road, water or a house; seams and ditches within the limits', bad.join('; '));
ok(list.slice(0, 3).reduce((t, c) => t + (c.postOnRail || 0) + (c.wireOnRail || 0), 0) === 0, 'the windows with a track have no fence on it');
ok(total.walkers > 0, 'the windows have walkers', String(total.walkers || 0));
ok((total.walkersOnRoad || 0) === 0, 'no walker stands on the asphalt of a road in the windows', `${total.walkersOnRoad || 0} of ${total.walkers || 0}`);
ok((total.cattleReachOnRoad || 0) === 0, 'no herd can wander onto the carriageway from its pasture', String(total.cattleReachOnRoad || 0));

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
