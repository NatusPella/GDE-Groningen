// Audit for issue #21/#23: how many landmarks per type become recognisable
// (game/landmarkkits.json through landmarkkit.js), which hand-tuned icons
// (LANDMARK_LOOKS) still find their candidate, and which candidates the kits
// skip. Pure: no world tiles needed.
//   node scripts/landmark_audit.mjs [--list]
import './node3d.mjs';
import fs from 'node:fs';

const K = await import('../game/js/landmarkkit.js');
const data = JSON.parse(fs.readFileSync(new URL('../game/landmarkkits.json', import.meta.url)));
const rows = {};
const missing = [];
let looksUsed = 0;
for (const it of data.items) {
  const r = (rows[it.k] ||= { items: 0, kit: 0, named: 0, outline: 0 });
  r.items++;
  if (it.n) r.named++;
  if (it.o) r.outline++;
  const p = K.landmarkParams(it);
  if (p) r.kit++; else missing.push(`${it.k} ${it.n || '-'} (${it.x}, ${it.y})`);
}
const stale = K.LANDMARK_LOOKS.filter((q) => !data.items.some((i) => i.n === q.n && Math.hypot(q.x - i.x, q.y - i.y) < 80));
looksUsed = K.LANDMARK_LOOKS.length - stale.length;
const total = Object.values(rows).reduce((a, r) => a + r.kit, 0);
console.log('soort'.padEnd(12), 'kandidaten kit  naam  omtrek');
for (const [k, r] of Object.entries(rows).sort()) console.log(k.padEnd(12), String(r.items).padStart(9), String(r.kit).padStart(4), String(r.named).padStart(5), String(r.outline).padStart(7));
console.log(`herkenbaar: ${total} van ${data.items.length}; met de hand: ${looksUsed} van ${K.LANDMARK_LOOKS.length}`);
const big = ['church', 'chapel', 'mill', 'tower', 'castle', 'watertower', 'lighthouse'].reduce((a, k) => a + (rows[k]?.kit || 0), 0);
console.log(`kerken, molens, torens, borgen: ${big} (doel 500-600)`);
if (missing.length) console.log('Zonder kit:\n  ' + missing.join('\n  '));
if (stale.length) console.log('Handwerk zonder kandidaat:\n  ' + stale.map((q) => q.n).join('\n  '));
if (process.argv.includes('--list')) for (const it of data.items) if (!it.n) console.log('naamloos', it.k, it.x, it.y);
if (K.LANDMARK_LOOKS.length < 30 || big < 500 || big > 600 || stale.length) process.exit(1);
