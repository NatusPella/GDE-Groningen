// The landmark kits (game/js/landmarkkit.js) over every candidate in
// game/landmarkkits.json: parameters for each, geometry at each level of
// detail, no NaN, triangle budgets per level, a plausible height, the
// hand-tuned icons applied. Prints what each kind became.
//   node scripts/landmark_kits_test.mjs [--list]
import './node3d.mjs';
import fs from 'node:fs';

const K = await import('../game/js/landmarkkit.js');
const data = JSON.parse(fs.readFileSync(new URL('../game/landmarkkits.json', import.meta.url)));
const BUDGET = [16000, 4000, 900];
const fails = [];
const tally = {};
let n = 0;
for (const it of data.items) {
  const p = K.landmarkParams(it);
  if (!p) continue;
  n++;
  const key = p.kit + ':' + (p.tower || p.type || p.kit) + (p.ruin ? '+ruin' : '') + (p.lean ? '+lean' : '');
  tally[key] = (tally[key] || 0) + 1;
  for (const lod of [K.LOD_FULL, K.LOD_MASS, K.LOD_SKY]) {
    const g = K.landmarkGeometry({ ...p }, lod);
    const pos = g.geometry.attributes.position.array;
    let bad = false;
    for (let i = 0; i < pos.length; i++) if (!Number.isFinite(pos[i])) { bad = true; break; }
    const tris = pos.length / 9 + (g.sails ? g.sails.attributes.position.count / 3 : 0);
    if (bad) fails.push(`${it.k} ${it.n}: NaN at lod ${lod}`);
    if (tris > BUDGET[lod]) fails.push(`${it.k} ${it.n}: ${Math.round(tris)} triangles at lod ${lod} (budget ${BUDGET[lod]})`);
    if (g.geometry.groups.length > 3) fails.push(`${it.k} ${it.n}: ${g.geometry.groups.length} groups`);
    if (lod === K.LOD_FULL && (g.height < 4 || g.height > 110)) fails.push(`${it.k} ${it.n}: height ${g.height.toFixed(1)}`);
    if (p.kit === 'mill' && !g.sails) fails.push(`${it.k} ${it.n}: no sails`);
  }
  if (process.argv.includes('--list')) console.log(it.k.padEnd(8), (it.n || '-').padEnd(40), key);
}
const want = { Walfriduskerk: (p) => p.lean > 0, 'Kerk van Garmerwolde': (p) => p.ruin };
for (const [name, ok] of Object.entries(want)) {
  const it = data.items.find((i) => i.n === name);
  if (!it || !ok(K.landmarkParams(it))) fails.push(`icon ${name} not applied`);
}
console.log(`${n} landmarks:`, Object.entries(tally).sort().map(([k, v]) => `${k} ${v}`).join(', '));
if (fails.length) { console.log('FAIL\n' + fails.join('\n')); process.exit(1); }
console.log('ok');
