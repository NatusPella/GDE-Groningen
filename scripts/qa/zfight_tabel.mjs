// Tabel van de z-fight-meting (#917): leest brug_beeld_analyse.json uit een meetmap (shots-bb-<plek>-n<near>[f<far>]-a/b/c.png)
// en schrijft een markdown-tabel plek x camera-variant met de flikkerpixels (a-b min a-c).
//   node scripts/qa/zfight_tabel.mjs <map>
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(process.argv[2] || '.');
const rows = JSON.parse(fs.readFileSync(path.join(dir, 'brug_beeld_analyse.json'), 'utf8'));
const cel = new Map(), plekken = [], varianten = [];
for (const r of rows) {
  const m = r.stand.match(/^bb-(.+)-(n(?:auto|[\d.]+)(?:f\d+)?)$/);
  if (!m) continue;
  if (!plekken.includes(m[1])) plekken.push(m[1]);
  if (!varianten.includes(m[2])) varianten.push(m[2]);
  cel.set(`${m[1]}|${m[2]}`, r);
}
const sleutel = (v) => (v === 'nauto' ? 1e9 : parseFloat(v.slice(1)));
varianten.sort((a, b) => sleutel(a) - sleutel(b) || a.localeCompare(b));
const kop = (v) => { if (v === 'nauto') return 'near auto (spel)'; const m = v.match(/^n([\d.]+)(?:f(\d+))?$/); return `near ${m[1].replace('.', ',')}${m[2] ? ` far ${m[2]}` : ''}`; };
console.log(`| plek | ${varianten.map(kop).join(' | ')} |`);
console.log(`|---|${varianten.map(() => '---:').join('|')}|`);
for (const p of plekken) console.log(`| ${p} | ${varianten.map((v) => { const r = cel.get(`${p}|${v}`); return r ? `${r.score} (ab ${r.ab}, ac ${r.ac})` : '-'; }).join(' | ')} |`);
