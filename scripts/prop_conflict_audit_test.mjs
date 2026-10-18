// The audit of weiland edges and herds against the real tiles (#124 #185 #210): the limit rules
// and, with the province tiles (game/world), a small run: fences, hedges and herds not over the
// track, a road, water or a house, no herd in water. About 1 minute.
//   node scripts/prop_conflict_audit_test.mjs
import fs from 'node:fs';

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

const A = await import('./world/prop_conflict_audit.mjs');

// the limit rules
ok(A.overLimits({ posts: 1000, wires: 400, hedges: 300 }).length === 0, 'nothing over nothing is fine');
ok(A.overLimits({ postOnRail: 1 }).length === 1, 'one post over the track is too many');
ok(A.overLimits({ cattleInWater: 1 }).length === 1 && A.overLimits({ osmOnRail: 2 }).length === 1, 'a herd in water, a mapped fence over the track too');
ok(A.overLimits({ posts: 1000, seamGaps: 2 }).length === 0 && A.overLimits({ posts: 1000, seamGaps: 3 }).length === 1, 'a seam gap rate of 0.2% is the limit');
ok(A.streekOf(31789, 7892) === 'Oldambt' && A.streekOf(-12463, 6451) === 'Westerkwartier' && A.streekOf(201, 45) === 'Stad', 'the regions by the nearest anchor place');

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

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
