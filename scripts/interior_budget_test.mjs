// Interieurs (epic #1150): het drie-dimensionale deel zonder wereld: elk itemtype dat de generator plaatst heeft een
// tekenaar, een gebouwd interieur blijft binnen het budget (driehoeken, groepen, geheugen), heeft geen NaN en ligt
// binnen de hal, en de deurvleugel past in de deuropening. Geen game/world; THREE via de vendor-cache (node3d.mjs).
// Draai: node scripts/interior_budget_test.mjs
import './node3d.mjs';
const B3 = await import('../game/js/interiorbuild3d.js');
const { planInterior } = await import('../game/js/interiorrules.js');
const { ITEM_TYPES } = await import('../game/js/interiorlayout.js');
const { toLocal } = await import('../game/js/interiorframe.js');
const { KIND_IDS, KINDS } = await import('../game/js/interiorkinds.js');
const { building, subsFor } = await import('./interior_fixtures.mjs');
const { mulberry32 } = await import('../game/js/rng.js');

let bad = 0, n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ` (${info})` : '')); } };

ok(JSON.stringify([...B3.DRAWN_TYPES].sort()) === JSON.stringify([...ITEM_TYPES].sort()), 'elk itemtype heeft een tekenaar en omgekeerd', ITEM_TYPES.filter((t) => !B3.DRAWN_TYPES.includes(t)).join() + '|' + B3.DRAWN_TYPES.filter((t) => !ITEM_TYPES.includes(t)).join());

const rnd = mulberry32(11);
const stats = {};
for (const kind of KIND_IDS) {
  for (const sub of subsFor(kind)) {
    for (let i = 0; i < 6; i++) {
      const K = KINDS[kind];
      const w = K.minW + 1 + rnd() * (kind === 'kerk' || kind === 'station' ? 14 : 10), d = K.minD + 1 + rnd() * (kind === 'kerk' ? 20 : 12);
      const { b, spot } = building(kind, sub, w, d, rnd);
      const plan = planInterior(b, { spot });
      if (!plan.ok) continue;
      const { geometry, triangles } = B3.buildInteriorGeometry(plan, 0, { x: 0, y: 0 });
      const key = `${kind}/${sub}`;
      (stats[key] = stats[key] || []).push(triangles);
      ok(triangles <= B3.MAX_TRIANGLES, `${key} ${w.toFixed(1)}x${d.toFixed(1)}: driehoeken binnen budget`, String(triangles));
      ok(geometry.groups.length <= 3, 'hooguit drie materiaalgroepen', String(geometry.groups.length));
      const pos = geometry.attributes.position.array;
      let finite = true, outside = 0;
      const fr = plan.frame;
      for (let k = 0; k < pos.length; k += 3) {
        if (!Number.isFinite(pos[k]) || !Number.isFinite(pos[k + 1]) || !Number.isFinite(pos[k + 2])) { finite = false; break; }
        const [u, v] = toLocal(fr, pos[k], pos[k + 2]);
        if (u < plan.hall.u0 - 0.45 || u > plan.hall.u1 + 0.45 || v < -0.05 || v > plan.hall.v1 + 0.45 || pos[k + 1] < -0.01 || pos[k + 1] > plan.topY + 0.5) outside++;
      }
      ok(finite, `${key}: geen NaN in de geometrie`);
      ok(outside === 0, `${key}: alles ligt binnen de hal, het plafond en de voorgevel`, String(outside));
      const bytes = pos.byteLength + geometry.attributes.normal.array.byteLength + geometry.attributes.color.array.byteLength + geometry.attributes.uv.array.byteLength;
      ok(bytes < 1.5 * 1024 * 1024, `${key}: geheugen onder 1,5 MB`, String(bytes));
      geometry.dispose();
      if (i === 0) {
        for (const shop of [false, true]) {
          const leaf = B3.buildLeafGeometry(plan, 0, 0x6b2a24, shop);
          const lp = leaf.geometry.attributes.position.array;
          let wide = 0;
          for (let k = 0; k < lp.length; k += 3) if (!Number.isFinite(lp[k]) || Math.hypot(lp[k], lp[k + 2]) > plan.door.w + 0.1 || lp[k + 1] > plan.door.h + 0.01 || lp[k + 1] < 0) wide++;
          ok(wide === 0, `${key}: deurvleugel (${shop ? 'glas' : 'hout'}) past in de opening`, String(wide));
          leaf.geometry.dispose();
        }
      }
    }
  }
}
const rows = Object.entries(stats).map(([k, v]) => `${k}: max ${Math.max(...v)}`);
console.log('  driehoeken per soort: ' + rows.join(', '));
const worst = Math.max(...Object.values(stats).flat());
ok(Object.keys(stats).length >= 27, 'alle 27 soorten/subsoorten gebouwd', String(Object.keys(stats).length));
console.log(bad ? `interior_budget_test: ${bad} van ${n} mislukt` : `interior_budget_test: ${n} controles ok (zwaarste interieur ${worst} driehoeken)`);
if (bad) process.exitCode = 1;
