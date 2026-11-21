// Interieurs (epic #1150, ronde 3): wat de mensen doen. Elke rol heeft 3 tot 6 activiteiten, de schema's zijn data, de ankerplekken liggen
// op bereikbare vloer, niemand loopt in een meubel of muur, de keuzes zijn deterministisch uit het zaad, elke rol laat in een uur
// speltijd meerdere verschillende dingen zien, en het personeel blijft in zijn zak achter de balie. Puur.
// Draai: node scripts/interior_activity_test.mjs
import { planInterior } from '../game/js/interiorrules.js';
import { walkGrid, reachable, rectOf } from '../game/js/interiorlayout.js';
import { SCRIPTS, scriptOf, STAFF_ROLES, makeStage, makeActor, stepActor, anchorsOf, MAX_ACTORS } from '../game/js/interioractivity.js';
import { ROLES } from '../game/js/interiornpc.js';
import { KINDS } from '../game/js/interiorkinds.js';
import { building, subsFor } from './interior_fixtures.mjs';
import { mulberry32 } from '../game/js/rng.js';

let bad = 0, n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ` (${info})` : '')); } };

// schema's als data
for (const [role, list] of Object.entries(SCRIPTS)) {
  ok(list.length >= 3 && list.length <= 6, `${role}: 3 tot 6 activiteiten`, String(list.length));
  ok(list.every((a) => a.id && a.at && a.dur[0] > 0 && a.dur[1] >= a.dur[0]), `${role}: elke activiteit heeft een plek en een duur`);
  ok(list.every((a) => [null, 'sit', 'crouch', 'vendor', 'phone', 'call'].includes(a.pose)), `${role}: alleen bestaande houdingen`);
}
for (const role of Object.keys(ROLES)) ok(SCRIPTS[role] || role === 'klant', `rol ${role} heeft een schema`);
ok(scriptOf('onbekend').length >= 2, 'een onbekende rol heeft een terugval');
ok(STAFF_ROLES.has('winkelier') && !STAFF_ROLES.has('klant') && SCRIPTS.serveerster && SCRIPTS.monteur, 'personeel, serveerster en monteur');

const rnd = mulberry32(55);
let actors = 0, seenActs = new Map();
for (const kind of ['winkel', 'horeca', 'kantoor', 'woning', 'kerk', 'station', 'bibliotheek', 'garage', 'publiek']) {
  for (const sub of subsFor(kind).slice(0, 3)) {
    const K = KINDS[kind];
    const { b, spot } = building(kind, sub, K.minW + 5 + rnd() * 6, K.minD + 5 + rnd() * 6, rnd);
    const p = planInterior(b, { spot, upper: false });
    if (!p.ok) continue;
    const L = p.layout, grid = walkGrid(L), reach = reachable(L, grid);
    const mk = () => { const st = makeStage(L, grid, reach); return { st, list: L.npc.slice(0, MAX_ACTORS).map((np, i) => makeActor(st, np, mulberry32(p.seed ^ (i * 7919 + 13)), i, STAFF_ROLES.has(np.role) ? reachable(L, grid, { u: np.u, v: np.v }) : null)) }; };
    const run = () => {
      const { st, list } = mk();
      const log = [];
      const solid = L.items.filter((i) => i.solid).map(rectOf);
      let inSolid = 0, wrongSit = 0;
      for (let t = 0; t < 3600 * 2; t++) { // een uur speltijd bij 0,5 s per stap
        for (const a of list) {
          stepActor(st, a, 0.5);
          if (t % 20 === 0) log.push([a.id, a.u.toFixed(2), a.v.toFixed(2), a.act && a.act.id, a.pose]);
          if (!a.sit) for (const s of solid) if (a.u > s.u0 + 0.05 && a.u < s.u1 - 0.05 && a.v > s.v0 + 0.05 && a.v < s.v1 - 0.05) { inSolid++; break; }
          for (const w of L.walls) if (a.u > w.u0 && a.u < w.u1 && a.v > w.v0 && a.v < w.v1) { inSolid++; break; }
          if (a.pose === 'sit' && !a.sit) wrongSit++;
          if (a.u < L.hall.u0 || a.u > L.hall.u1 || a.v < L.hall.v0 || a.v > L.hall.v1) inSolid++;
          if (a.act) seenActs.set(a.role + ':' + a.act.id, true);
        }
      }
      return { log, inSolid, wrongSit, list };
    };
    const r1 = run(), r2 = run();
    ok(r1.inSolid === 0, `${kind}/${sub}: niemand in een meubel, muur of buiten de hal`, String(r1.inSolid));
    ok(JSON.stringify(r1.log) === JSON.stringify(r2.log), `${kind}/${sub}: dezelfde dag, dezelfde handelingen (deterministisch)`);
    ok(r1.wrongSit === 0, `${kind}/${sub}: zittend alleen op een zitplek`);
    for (const a of r1.list) {
      actors++;
      if (a.staff) ok(Math.hypot(a.u - a.home.u, a.v - a.home.v) < 8, `${kind}/${sub}: ${a.role} blijft achter zijn balie`, `${Math.hypot(a.u - a.home.u, a.v - a.home.v).toFixed(1)} m`);
    }
    const an = anchorsOf(L, reach);
    ok(Object.values(an).flat().every((q) => Number.isFinite(q.u) && Number.isFinite(q.v)), `${kind}/${sub}: ankers zijn getallen`);
  }
}
// elke rol laat meerdere verschillende handelingen zien
for (const role of ['winkelier', 'klant', 'gast', 'medewerker', 'bezoeker', 'lezer', 'reiziger', 'bewoner', 'barman']) {
  const acts = [...seenActs.keys()].filter((k) => k.startsWith(role + ':'));
  ok(acts.length >= 2, `${role}: laat minstens twee verschillende dingen zien`, acts.join(','));
}
ok(actors >= 40, 'genoeg mensen getest', String(actors));
ok(MAX_ACTORS === 8, 'het budget is acht actieve mensen per interieur');
console.log(bad ? `interior_activity_test: ${bad} van ${n} mislukt` : `interior_activity_test: ${n} controles ok (${actors} mensen, ${seenActs.size} verschillende rol-handelingen)`);
if (bad) process.exitCode = 1;
