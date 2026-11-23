// Kroonbobbels, kroonschaduw en boomtint (23-11): node scripts/kroon_variatie_test.mjs
import './node3d.mjs';
const GR = await import('../game/js/greenery.js');
let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
let lo = 9, hi = 0;
for (let i = 0; i < 4000; i++) {
  const a = i * 2.399963, y = ((i % 400) / 200) - 1, r = Math.sqrt(1 - y * y), k = GR.crownBump(Math.cos(a) * r, y, Math.sin(a) * r);
  lo = Math.min(lo, k); hi = Math.max(hi, k);
}
ok(lo > 0.75 && hi < 1.25 && hi - lo > 0.15, 'crownBump blijft binnen 25% en bolt echt', `${lo.toFixed(2)}..${hi.toFixed(2)}`);
ok(GR.crownBump(0.3, 0.5, -0.2) === GR.crownBump(0.3, 0.5, -0.2), 'crownBump is deterministisch');
ok(GR.crownShade(-1) < GR.crownShade(0) && GR.crownShade(0) < GR.crownShade(1) && GR.crownShade(-1) > 0.6 && GR.crownShade(1) < 1.2, 'crownShade: onder donkerder dan boven');
const col = { r: 0, g: 0, b: 0, setHex(h) { this.r = ((h >> 16) & 255) / 255; this.g = ((h >> 8) & 255) / 255; this.b = (h & 255) / 255; return this; }, multiplyScalar(v) { this.r *= v; this.g *= v; this.b *= v; return this; } };
const seen = new Set();
for (let i = 0; i < 60; i++) { GR.treeColor([i * 7.3, i * 3.1, GR.SPECIES_INDEX.linde, 150, 0], col); seen.add((col.r / col.b).toFixed(2)); ok(col.r < 1 && col.g < 1 && col.b < 1, 'boomtint blijft geldig'); }
ok(seen.size > 20, 'een rij linden heeft veel verschillende tinten', String(seen.size));
console.log(`${n - fails}/${n} kroon-checks geslaagd`);
process.exit(fails ? 1 : 0);
