// #917: twee panden die een muur delen mogen niet exact coplanair staan, anders
// flikkert de gevel (Z-fighting). models3d_buildings.js geeft elk pand daarom een
// deterministische nudge van hooguit 4 mm; deze test controleert dat de nudge
// vastligt, klein blijft en buren uit elkaar haalt (en dus niet per frame wisselt).
//   node scripts/building_nudge_test.mjs
import './node3d.mjs';

const { buildingNudge } = await import('../game/js/models3d_buildings.js');
let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };
const rect = (x, y, w, d) => ({ pts: [[x, y], [x + w, y], [x + w, y + d], [x, y + d]], bounds: [x, y, x + w, y + d] });

// twee rijtjeshuizen die de muur op x = 10 delen
const a = buildingNudge(rect(0, 0, 10, 10));
const b = buildingNudge(rect(10, 0, 10, 10));
const again = buildingNudge(rect(0, 0, 10, 10));
ok(!!a && Number.isFinite(a.x) && Number.isFinite(a.y) && Number.isFinite(a.z), 'de nudge is een getal');
ok(Math.abs(a.x) <= 0.004 + 1e-9 && Math.abs(a.y) <= 0.004 + 1e-9 && Math.abs(a.z) <= 0.004 + 1e-9, 'de nudge blijft onder 4 mm', JSON.stringify(a));
ok(JSON.stringify(a) === JSON.stringify(again), 'dezelfde voetafdruk geeft dezelfde nudge');
ok(Math.abs(a.x - b.x) > 0.002 || Math.abs(a.y - b.y) > 0.002 || Math.abs(a.z - b.z) > 0.002, 'buren op een gedeelde muur krijgen een andere nudge', JSON.stringify({ a, b }));
ok(buildingNudge({}) !== null && Number.isFinite(buildingNudge({}).x), 'zonder voetafdruk werkt de nudge ook');
// een reeks panden: geen twee directe buren met dezelfde nudge
const row = [];
for (let i = 0; i < 20; i++) row.push(buildingNudge(rect(i * 8, 0, 8, 9)));
let same = 0;
for (let i = 1; i < row.length; i++) if (Math.abs(row[i].x - row[i - 1].x) < 1e-6 && Math.abs(row[i].z - row[i - 1].z) < 1e-6) same++;
ok(same === 0, 'geen enkel belendend pand krijgt dezelfde nudge', String(same));

console.log(`building_nudge_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
