// De matrix gedaan/ontbreekt van de interieurs (epic Interieurs, #1161 t/m #1165, ronde 6): elke variant van elke soort heeft een recept,
// mensen met een eigen schema en een kledingpool, balieregels, een eigen drukte en (waar er iets te koop is) een product; en het
// prestatiebudget per variant: driehoeken, geheugen en de bouwtijd van een plan en een geometrie, bij drie maten hal.
// Geen game/world; THREE via de vendor-cache (node3d.mjs). Draai: node scripts/interieur_matrix_test.mjs
import './node3d.mjs';
import { variantMatrix, renderMatrix } from './interieur_dekking_audit.mjs';
import { building, subsFor } from './interior_fixtures.mjs';
import { KINDS, KIND_IDS } from '../game/js/interiorkinds.js';
import { planInterior } from '../game/js/interiorrules.js';
import { MAX_ACTORS } from '../game/js/interioractivity.js';
import { DESK_SUBS, productFor } from '../game/js/interiorbuy.js';
import { mulberry32 } from '../game/js/rng.js';
const B3 = await import('../game/js/interiorbuild3d.js');

let bad = 0, n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ' (' + info + ')' : '')); } };

// --- de matrix ---
const rows = variantMatrix();
const key = (r) => r.kind + (r.sub ? '/' + r.sub : '');
ok(rows.length >= 33, 'minstens 33 varianten in de matrix', String(rows.length));
ok(rows.every((r) => r.ok === r.tries), 'elk recept slaagt op elke proefhal', rows.filter((r) => r.ok !== r.tries).map(key).join());
ok(rows.every((r) => r.items >= 15), 'elke variant heeft meer dan 15 items gemiddeld', rows.filter((r) => r.items < 15).map(key).join());
ok(rows.every((r) => r.rollen.length >= 1), 'elke variant heeft mensen', rows.filter((r) => !r.rollen.length).map(key).join());
ok(rows.every((r) => !r.zonderSchema.length), 'elke rol heeft een eigen schema', rows.map((r) => r.zonderSchema.join()).join(''));
ok(rows.every((r) => !r.zonderKleding.length), 'elke rol heeft een kledingpool', rows.map((r) => r.zonderKleding.join()).join(''));
ok(rows.every((r) => r.eigenDrukte), 'elke variant heeft een eigen drukte per uur', rows.filter((r) => !r.eigenDrukte).map(key).join());
ok(rows.filter((r) => r.use.includes('balie')).every((r) => r.eigenBalieregels), 'elke balie heeft regels die bij de variant passen', rows.filter((r) => r.use.includes('balie') && !r.eigenBalieregels).map(key).join());
// wat er aan een balie te koop is: de desk-varianten verkopen iets; wie niets verkoopt staat bewust in deze lijst
const NIETS_TE_KOOP = new Set(['kantoor', 'woning', 'woning/studentenkamer', 'kerk', 'kerk/kapel', 'kerk/gebedshuis', 'station', 'bibliotheek', 'publiek/gemeente', 'publiek/politie', 'publiek/ziekenhuis', 'publiek/school']);
for (const r of rows) {
  const k = key(r);
  if (NIETS_TE_KOOP.has(k)) ok(!r.koop, k + ': bewust niets te koop');
  else ok(!!r.koop, k + ': aan de balie, kassa of bar is iets te koop');
}
for (const s of DESK_SUBS) ok(!!productFor(s === 'werkplaats' || s === 'magazijn' ? 'garage' : 'publiek', s) || ['sportschool', 'museum', 'bioscoop'].includes(s) && !!productFor('publiek', s), 'desk-variant ' + s + ' heeft een product');
ok(renderMatrix(rows).split(String.fromCharCode(10)).length === rows.length + 2, 'de matrix rendert een rij per variant');
ok(KIND_IDS.every((k) => rows.some((r) => r.kind === k)), 'elke soort komt in de matrix');
ok(rows.every((r) => r.rollen.every((x) => KINDS[r.kind].roles.includes(x)) || r.kind === 'winkel' || r.kind === 'horeca' || r.kind === 'garage'), 'rollen van een variant staan in de rollenlijst van de soort', rows.filter((r) => !r.rollen.every((x) => KINDS[r.kind].roles.includes(x))).map((r) => key(r) + ':' + r.rollen.filter((x) => !KINDS[r.kind].roles.includes(x)).join('+')).join(' '));

// --- het prestatiebudget: drie maten hal per variant ---
const BUDGET = { tri: B3.MAX_TRIANGLES, typicalTri: 7000, bytes: 1.5 * 1024 * 1024, planMs: 150, buildMs: 150, people: MAX_ACTORS };
const rnd = mulberry32(2211);
const worst = { tri: 0, plan: 0, build: 0, key: '' };
for (const r of rows) {
  const K = KINDS[r.kind];
  const tris = [];
  for (const [fw, fd] of [[0, 0], [5, 6], [11, 13]]) {
    const w = K.minW + 1.2 + fw * (r.kind === 'kerk' || r.kind === 'station' ? 1.5 : 1), d = K.minD + 1.5 + fd * (r.kind === 'kerk' ? 1.8 : 1);
    const x = building(r.kind, r.sub, w, d, rnd);
    const t0 = performance.now();
    const plan = planInterior(x.b, { spot: x.spot, upper: false });
    const t1 = performance.now();
    if (!plan.ok) { ok(false, key(r) + ' ' + w.toFixed(1) + 'x' + d.toFixed(1) + ': plan slaagt', plan.why); continue; }
    const { geometry, triangles } = B3.buildInteriorGeometry(plan, 0, { x: 0, y: 0 });
    const t2 = performance.now();
    tris.push(triangles);
    const a = geometry.attributes;
    const bytes = a.position.array.byteLength + a.normal.array.byteLength + a.color.array.byteLength + a.uv.array.byteLength;
    ok(triangles <= BUDGET.tri, key(r) + ': driehoeken binnen het harde budget', String(triangles));
    ok(bytes <= BUDGET.bytes, key(r) + ': geheugen binnen het budget', String(bytes));
    ok(geometry.groups.length <= 3, key(r) + ': hooguit 3 materiaalgroepen');
    ok(plan.layout.npc.length <= 24, key(r) + ': aantal mensen in het plan is begrensd', String(plan.layout.npc.length));
    ok(t1 - t0 <= BUDGET.planMs, key(r) + ': het plan maken blijft onder ' + BUDGET.planMs + ' ms', (t1 - t0).toFixed(0) + ' ms');
    ok(t2 - t1 <= BUDGET.buildMs, key(r) + ': de geometrie bouwen blijft onder ' + BUDGET.buildMs + ' ms', (t2 - t1).toFixed(0) + ' ms');
    if (triangles > worst.tri) { worst.tri = triangles; worst.key = key(r); }
    worst.plan = Math.max(worst.plan, t1 - t0); worst.build = Math.max(worst.build, t2 - t1);
    geometry.dispose();
  }
  if (tris.length) ok(Math.min(...tris) <= BUDGET.typicalTri, key(r) + ': de kleinste maat blijft ver onder het harde budget', String(Math.min(...tris)));
}
console.log('  matrix: ' + rows.length + ' varianten; zwaarste ' + worst.tri + ' driehoeken (' + worst.key + '), plan max ' + worst.plan.toFixed(0) + ' ms, bouwen max ' + worst.build.toFixed(0) + ' ms');
void subsFor;
console.log(bad ? 'interieur_matrix_test: ' + bad + ' van ' + n + ' mislukt' : 'interieur_matrix_test: ' + n + ' controles ok');
process.exit(bad ? 1 : 0);
