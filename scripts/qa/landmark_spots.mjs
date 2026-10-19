// Plekkenlijst voor de herkenbaarheidsronde (#21 #23 #164 #198): kerken, molens, borgen, torens,
// stations, perrons, monumenten, parken, schoorstenen en masten, verspreid over de streken.
//   node scripts/qa/landmark_spots.mjs > spots.json
//   node scripts/qa/province_shots.mjs --spots=spots.json --out=<map> --settle=7000
import fs from 'node:fs';
import { streekId } from '../../game/js/streekplekken.js';

const kits = JSON.parse(fs.readFileSync(new URL('../../game/landmarkkits.json', import.meta.url), 'utf8')).items;
const land = JSON.parse(fs.readFileSync(new URL('../../game/streekplekken.json', import.meta.url), 'utf8')).plekken;
const out = [];
const used = new Set();
// per soort: een benoemde per streek (eerste die nog niet gebruikt is), tot het maximum
function pick(label, rows, perStreek, max) {
  const seen = {};
  for (const r of rows) {
    const s = streekId(r.x, r.y);
    if ((seen[s] || 0) >= perStreek || out.filter((o) => o.kind === label).length >= max) continue;
    const key = Math.round(r.x / 200) + ',' + Math.round(r.y / 200);
    if (used.has(key)) continue;
    used.add(key); seen[s] = (seen[s] || 0) + 1;
    out.push({ kind: label, name: `${label}-${out.length}-${(r.n || r.sub || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 14)}`, x: r.x - (label === 'park' ? 45 : label === 'mast' || label === 'schoorsteen' ? 40 : 32), y: r.y, a: 0, snap: false, tx: r.x, ty: r.y, inst: !!r.t, ...(r.o ? {} : {}) });
  }
}
const named = (k) => kits.filter((i) => i.k === k && i.n).sort((a, b) => a.x - b.x);
pick('kerk', named('church'), 1, 8);
pick('molen', named('mill'), 1, 8);
pick('borg', named('castle'), 1, 6);
pick('toren', named('tower'), 1, 6);
pick('station', named('station'), 1, 6);
pick('perron', land.filter((p) => p.t === 'perron'), 1, 6);
pick('monument', land.filter((p) => p.t === 'monument' && p.n), 1, 8);
pick('park', land.filter((p) => p.t === 'park' && p.n), 1, 6);
pick('schoorsteen', land.filter((p) => p.t === 'schoorsteen'), 1, 3);
pick('mast', land.filter((p) => p.t === 'mast'), 1, 3);
console.log(JSON.stringify(out.map(({ kind, ...r }) => r)));
console.error(out.length + ' plekken');
