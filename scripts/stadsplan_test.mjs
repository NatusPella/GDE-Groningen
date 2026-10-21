// stadsplan.js (#67): the candidate spots of the town profiles, the kerb snap and the
// placing, pure; plus that every prop kind of a profile has a builder that builds.
//   node scripts/stadsplan_test.mjs
import { PROP_BUILD, planTown, roadside, resolveItem, placeAll, tallyPlan, countFor, mulberry, SPACING, SHOP_SPACING, CAP, VEE_RING } from '../game/js/stadsplan.js';
import { TOWN_PROFILES, townCentre } from '../game/js/stadsprofielen.js';

let n = 0, bad = 0;
const ok = (c, name) => { n++; if (!c) { bad++; console.log('FAIL', name); } };

// the generator
const r1 = mulberry(5), r2 = mulberry(5);
ok(r1() === r2() && mulberry(6)() !== mulberry(5)(), 'mulberry is seeded');
ok(countFor(14, 1800) === CAP && countFor(0.5, 1800) >= 1 && countFor(0, 1800) === 0 && countFor(1, 100) === 1, 'counts are capped, at least one, zero for none');

// every profile prop kind is known (a builder, or null for tile work)
for (const t of TOWN_PROFILES) for (const p of t.props) ok(p.kind in PROP_BUILD, `${t.id}: prop ${p.kind} is mapped`);

// plans: deterministic, near the town, shops inside
for (const t of TOWN_PROFILES) {
  const a = planTown(t), b = planTown(t);
  ok(JSON.stringify(a) === JSON.stringify(b), `${t.id}: plan is deterministic`);
  ok(planTown(t, { seed: 2 }).items[0].x !== a.items[0].x, `${t.id}: another seed, another plan`);
  const c = townCentre(t);
  ok(a.items.every((i) => i.tries.every(([x, y]) => Math.hypot(x - c.x, y - c.y) <= t.reach + 1)), `${t.id}: all spots within reach`);
  const shops = a.items.filter((i) => i.shop);
  ok(shops.length === t.shops.length && shops.every((s) => s.build === 'stad_bord' && s.tries.every(([x, y]) => Math.hypot(x - c.x, y - c.y) <= t.reach * 0.36)), `${t.id}: every shop has a board near the centre`);
  ok(a.items.length >= 6, `${t.id}: a town gets props (${a.items.length})`);
  ok(new Set(a.items.map((i) => i.id)).size === a.items.length, `${t.id}: ids are unique`);
}
ok(planTown(TOWN_PROFILES.find((t) => t.id === 'appingedam')).skipped.includes('brug'), 'bridges are tile work, reported as skipped');
ok(planTown(TOWN_PROFILES.find((t) => t.id === 'delfzijl')).items.filter((i) => i.water).length > 0, 'harbour props want water');
// #330: schapen staan aan de rand van het dorp (weide, dijk), niet in de kom
{
  let vee = 0;
  for (const t of TOWN_PROFILES) {
    const c = townCentre(t);
    for (const it of planTown(t).items.filter((i) => i.kind === 'schaap')) {
      vee++;
      ok(it.vee === true && it.tries.every(([x, y]) => { const d = Math.hypot(x - c.x, y - c.y) / t.reach; return d >= VEE_RING[0] - 1e-9 && d <= VEE_RING[1] + 1e-9; }), `${t.id}: schapen alleen in de buitenring`);
    }
  }
  ok(vee > 0, 'er zijn dorpen met schapen');
}

// roadside: kerb spot beside a road, on free ground, facing the road
const road = [{ pts: [[0, 0], [100, 0]], width: 6 }];
const q = roadside(50, 10, road, () => true);
ok(q && Math.abs(q.y - 4.6) < 0.01 && Math.abs(q.x - 50) < 0.01, 'snapped to the kerb on the side it was on');
ok(Math.abs(q.a - -Math.PI / 2) < 1e-9 || Math.abs(q.a - Math.PI / 2) < 1e-9, 'faces the road');
const south = roadside(50, -10, road, () => true);
ok(south && south.y < 0, 'the other side too');
const blocked = roadside(50, 10, road, (x, y) => y < 0);
ok(blocked && blocked.y < 0, 'a blocked side falls back to the other kerb');
ok(roadside(50, 10, road, () => false) === null, 'no free ground, no spot');
ok(roadside(50, 500, road, () => true) === null, 'no road in reach, no spot');

// resolveItem / placeAll keep their distance
const item = { id: 'x', kind: 'bank', tries: [[0, 0], [0, 50], [200, 0]] };
const res = (x, y) => ({ x, y, a: 0 });
ok(resolveItem(item, res, []) && resolveItem(item, res, []).x === 0, 'first try wins');
ok(resolveItem(item, res, [{ x: 0, y: 0 }]).y === 50, 'a placed prop within the spacing pushes to the next try');
ok(resolveItem(item, () => null, []) === null, 'no try resolves: null');
ok(SPACING < SHOP_SPACING, 'shops keep more distance');
{
  const t = TOWN_PROFILES[0];
  const plan = planTown(t);
  const all = placeAll(plan, (x, y) => ({ x, y, a: 0 }));
  ok(all.placed.length + all.missing.length === plan.items.length, 'placeAll accounts for every item');
  ok(all.placed.every((p, i) => all.placed.every((o, j) => i === j || Math.hypot(p.x - o.x, p.y - o.y) >= Math.min(SPACING, SHOP_SPACING))), 'placed items keep their distance');
  const tl = tallyPlan(plan, all.placed);
  ok(Object.values(tl).every((v) => v.got <= v.want) && tl.winkel.want === t.shops.length, 'tally per kind');
  const none = placeAll(plan, () => null);
  ok(none.placed.length === 0 && none.missing.length === plan.items.length, 'nothing resolves, everything is missing');
}

// every builder builds (a canvas stub for the signs)
await import('./node3d.mjs');
const P = await import('../game/js/ommelandprops3d.js');
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: (o, k) => (k === 'measureText' ? () => ({ width: 1 }) : () => {}), set: () => true }) }) };
const kinds = new Set(Object.values(PROP_BUILD).filter(Boolean).concat('stad_bord'));
for (const kind of kinds) {
  try { const pr = P.buildProp(kind, {}, { name: 'Test', sub: 'bakker' }); ok(pr.group.children.length > 0, kind + ' builds'); P.disposeProp(pr); } catch (e) { ok(false, kind + ' builds: ' + e.message); }
}
ok(P.TOWN_PROP_KINDS.every((k) => kinds.has(k)), 'no builder without a profile kind using it');

console.log(bad ? `${bad} of ${n} failed` : 'all passed');
process.exit(bad ? 1 : 0);
