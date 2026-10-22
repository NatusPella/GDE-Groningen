// Vindt elke jachthaven van marinas.json een regattabaan (#384), en ligt geen enkele ton of baanpunt op een gebouw (#362)?
// Het water is dat van het spel (regatta.js waterOk): tegelwater plus de gaten van vaarnet_fixes.json, bevaarbaar en dieper
// dan 1,5 m, zonder gebouw. Leest de tegels van game/world, GAME_WORLD of --world; zonder wereld SKIP.
//   node scripts/regattabaan_haven_test.mjs [--world=<map>]
import fs from 'node:fs';
import path from 'node:path';
import './node3d.mjs';
import { fileURLToPath } from 'node:url';
import { heeftTegels, leesTegelRijen } from './lib/tegelrijen.mjs';
import { maakHuizenIndex } from './lib/huizenindex.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const dir = path.resolve(arg('world', process.env.GAME_WORLD || path.join(ROOT, 'game', 'world')));
if (!heeftTegels(dir)) { console.log('SKIP regattabaan_haven_test: geen wereld in ' + dir); process.exit(0); }
const V = await import('../game/js/vaarnet.js');
const { WATER_KINDS } = await import('../game/js/waterlevels.js');
const { kiesBaan } = await import('../game/js/regattabaan.js');

const fixes = JSON.parse(fs.readFileSync(path.join(ROOT, 'game', 'vaarnet_fixes.json'), 'utf8'));
const rows = await leesTegelRijen(dir);
const huizen = maakHuizenIndex(rows.buildings);
const marinas = JSON.parse(fs.readFileSync(path.join(ROOT, 'game', 'marinas.json'), 'utf8')).marinas;

const B = 100, grid = new Map();
const add = (w) => {
  const K = WATER_KINDS[w.kind || 'diep'] || WATER_KINDS.diep;
  if (!((w.nav ?? K.nav) >= 2 && (w.dp ?? K.depth) > 1.5)) return;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of w.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const o = { pts: w.pts, b: [x0, y0, x1, y1] };
  for (let i = Math.floor(x0 / B); i <= Math.floor(x1 / B); i++) for (let j = Math.floor(y0 / B); j <= Math.floor(y1 / B); j++) { const k = i * 100003 + j; (grid.get(k) || grid.set(k, []).get(k)).push(o); }
};
for (const w of rows.water) add(w);
for (const w of V.patchRows(fixes)) if (!w.strip) add(w);
const inP = (x, y, P) => { let ins = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins; } return ins; };
const water = (x, y) => (grid.get(Math.floor(x / B) * 100003 + Math.floor(y / B)) || []).some((o) => x >= o.b[0] && x <= o.b[2] && y >= o.b[1] && y <= o.b[3] && inP(x, y, o.pts));
const opGebouw = (x, y) => huizen.raakt([[x - 0.5, y - 0.5], [x + 0.5, y - 0.5], [x + 0.5, y + 0.5], [x - 0.5, y + 0.5]]);
const ok = (x, y) => water(x, y) && !opGebouw(x, y);

let n = 0, fails = 0;
const check = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };
check(marinas.length >= 8, 'marinas.json heeft de jachthavens', String(marinas.length));
const vormen = [];
for (const m of marinas) {
  const baan = kiesBaan(m.x, m.y, ok);
  check(!!baan, `${m.name}: een regattabaan`);
  if (!baan) continue;
  vormen.push(`${m.name} ${baan.vorm} ${Math.round(Math.hypot(baan.midden.x - m.x, baan.midden.y - m.y))} m`);
  let opHuis = 0, dood = 0;
  for (let i = 0; i < baan.tonnen.length; i++) {
    const a = baan.tonnen[i], b = baan.tonnen[(i + 1) % baan.tonnen.length];
    for (let k = 0; k <= 20; k++) { const x = a.x + (b.x - a.x) * k / 20, y = a.y + (b.y - a.y) * k / 20; if (opGebouw(x, y)) opHuis++; if (!water(x, y)) dood++; }
  }
  check(opHuis === 0, `${m.name}: geen baanpunt op een gebouw`, String(opHuis));
  check(dood === 0, `${m.name}: de hele baan in het water`, String(dood));
  check(baan.tonnen.every((t, i) => baan.tonnen.every((q, j) => i === j || Math.hypot(t.x - q.x, t.y - q.y) >= 30)), `${m.name}: tonnen minstens 30 m uit elkaar`);
}
console.log(fails ? `${fails} van ${n} mislukt` : `regattabaan_haven_test ok (${n} checks): ${vormen.join('; ')}`);
process.exit(fails ? 1 : 0);
