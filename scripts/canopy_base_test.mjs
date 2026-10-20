// Perronkappen op de hoogte van het spoor (#323): Groningen Noord ligt op een dijk (het spoor loopt 5,6 m boven de straat);
// de kap hing op straatniveau + 5,2 m, dus onder het perron en "zowat in de Kastanjelaan". Gebruikt de stadstegels van een
// gebouwde wereld (game/world of GAME_WORLD); zonder die: SKIP.
import assert from 'node:assert/strict';
import { heeftWereld, laadStadTegels } from './lib/stadtegels.mjs';

if (!heeftWereld()) { console.log('SKIP canopy_base_test.mjs: geen game/world (cd desktop && npm run stage)'); process.exit(0); }
const { canopyBase } = await import('../game/js/canopies3d.js');
const map = (await laadStadTegels()).world;

// elke kap binnen 8 m van spoor dat hoger dan 2 m ligt, staat minstens op de helft van die hoogte; een kap bij spoor op maaiveld op 0
let high = 0, ground = 0, near = 0;
for (const c of map.canopies) {
  const pts = c.pts;
  const base = canopyBase(map, pts);
  const [cx, cy] = [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
  const zs = [];
  for (const r of map.rails) if (r.z && r.pts.some((p) => Math.hypot(p[0] - cx, p[1] - cy) < 8)) for (const z of r.z) zs.push(z);
  if (!zs.length) { assert.equal(base, 0, `een kap zonder spoor in de buurt staat op ${base}`); continue; }
  near++;
  const zmax = Math.max(...zs);
  if (zmax > 2) { high++; assert.ok(base > 2, `een kap bij spoor van ${zmax.toFixed(1)} m hoog staat op ${base.toFixed(1)} m (${cx.toFixed(0)}, ${cy.toFixed(0)})`); assert.ok(base <= zmax + 0.01); }
  else ground++;
}
assert.ok(near >= 3, `te weinig kappen bij spoor: ${near}`);

// Groningen Noord: de twee perronkappen (type roof) bij het station
const noord = map.canopies.filter((c) => Math.hypot(c.pts[0][0] + 600, c.pts[0][1] + 1140) < 60);
assert.ok(noord.length >= 2, `de perronkappen van Noord ontbreken: ${noord.length}`);
for (const c of noord) { const b = canopyBase(map, c.pts); assert.ok(b > 4.5 && b < 6.5, `Noord: de kap staat op ${b.toFixed(2)} m, het spoor ligt op 5,6 m`); }
console.log(`canopy_base_test: ok (${near} kappen bij spoor, ${high} bij spoor op een dijk of viaduct, de kappen van Noord op ${noord.map((c) => canopyBase(map, c.pts).toFixed(1)).join(' en ')} m)`);
