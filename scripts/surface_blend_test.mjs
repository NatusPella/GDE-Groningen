// Soepele wegdekovergangen (issue #189): game/js/surfaceblend.js op gemaakte
// knopen en de audit op de stadskaart (geen overgang zonder menging).
//   node scripts/surface_blend_test.mjs
import './node3d.mjs';
import { planBlends, blendAttributes, blendFactor, tintToward, colourJump, linearOf, BLEND_LEN } from '../game/js/surfaceblend.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const key = (p) => p.join(',');
const mk = (pts, id, hex, rank = 1) => ({ pts, id, hex, rank });
const surfOf = (r) => ({ id: r.id, colour: linearOf(r.hex), rank: r.rank });
const plan = (roads, J) => {
  const idx = new Map();
  for (const r of roads) r.pts.forEach((p, i) => { const k = key(p); if (!idx.has(k)) idx.set(k, []); idx.get(k).push(r, i); });
  return planBlends(idx, key, roads, surfOf, J);
};
const ASPH = 0x4b4d50, KL = 0x6c4236;

// twee wegen met een ander dek: beide einden krijgen een menging en komen op de knoop op dezelfde kleur uit
{
  const a = mk([[0, 0], [50, 0]], 'asfalt', ASPH, 3), b = mk([[50, 0], [100, 0]], 'klinker', KL, 2);
  const pl = plan([a, b]);
  ok(pl.has(a) && pl.has(b), 'verschillend dek: beide wegen krijgen een menging');
  const ea = pl.get(a).b, eb = pl.get(b).a;
  const ca = surfOf(a).colour.map((v, i) => v * ea.tint[i]), cb = surfOf(b).colour.map((v, i) => v * eb.tint[i]);
  ok(colourJump(ca, cb) < 1e-6, 'op de knoop hebben beide wegen dezelfde kleur', colourJump(ca, cb));
  ok(pl.get(a).a === null && pl.get(b).b === null, 'de vrije einden blijven ongemoeid');
  // factor 1 midden op de weg, volledig op de knoop
  const att = blendAttributes(pl.get(a), 50);
  const mid = blendFactor(att, 25), end = blendFactor(att, 50), start = blendFactor(att, 0);
  ok(mid.every((v) => v === 1) && start.every((v) => v === 1), 'ver van de knoop geen menging');
  ok(end.some((v, i) => Math.abs(v - ea.tint[i]) < 1e-6) && end.every((v, i) => Math.abs(v - ea.tint[i]) < 1e-6), 'op de knoop de volle menging');
  let prev = 1, mono = true;
  for (let al = 50 - BLEND_LEN; al <= 50; al += 0.25) { const f = blendFactor(att, al)[0]; if (Math.abs(f - 1) < Math.abs(prev - 1) - 1e-9) mono = false; prev = f; }
  ok(mono, 'de menging loopt zonder sprong op naar het einde');
}
// gelijk dek en gelijke kleur: geen menging
{
  const a = mk([[0, 0], [50, 0]], 'asfalt', ASPH), b = mk([[50, 0], [100, 0]], 'asfalt', ASPH);
  ok(plan([a, b]).size === 0, 'zelfde dek: geen menging');
}
// zelfde dek maar andere kleur (hoofdweg tegen gewone weg) wordt wel gemengd
{
  const a = mk([[0, 0], [50, 0]], 'major:asphalt', 0x57595c), b = mk([[50, 0], [100, 0]], 'normal:asphalt', 0x4b4d50);
  ok(plan([a, b]).size === 2, 'asfalt in twee klassen: kleurverschil wordt gemengd');
}
// kruispuntzone telt mee in de lengte
{
  const a = mk([[0, 0], [50, 0]], 'asfalt', ASPH, 3), b = mk([[50, 0], [100, 0]], 'klinker', KL, 2);
  const pl = plan([a, b], () => 6);
  ok(pl.get(a).b.len === BLEND_LEN + 6, 'de zone van het kruispunt komt bij de menglengte');
}
// een doorgaande weg (t-aansluiting) wordt niet gemengd; het eindigende deel gaat helemaal naar zijn kleur
{
  const a = mk([[0, 0], [50, 0], [100, 0]], 'asfalt', ASPH, 3), b = mk([[50, 0], [50, 40]], 'klinker', KL, 2);
  const pl = plan([a, b]);
  const eb = pl.get(b).a;
  const cb = surfOf(b).colour.map((v, i) => v * eb.tint[i]);
  ok(colourJump(cb, surfOf(a).colour) < 1e-6, 't-aansluiting: de zijstraat eindigt in de kleur van de doorgaande weg');
}
// symmetrie en hoge rang: tint is begrensd
{
  const t = tintToward(linearOf(0x000000), linearOf(0xffffff), true);
  ok(t.every((v) => v <= 2.8 && v >= 0.35), 'tint is begrensd');
}

// de stadskaart: elke overgang heeft een menging
{
  globalThis.requestAnimationFrame = (f) => setImmediate(f);
  const { loadCityWorld } = await import('./lib/loadworld.mjs');
  const { auditBlends } = await import('./world/surface_blend_audit.mjs');
  const RS = await import('../game/js/roadsurface.js');
  const map = (await loadCityWorld()).map;
  const a = auditBlends(map, RS);
  ok(a.transitions > 1000, 'de kaart heeft veel dekovergangen', a.transitions);
  ok(a.hard.length === 0, 'geen harde overgang zonder menging', JSON.stringify(a.hard.slice(0, 3)));
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
