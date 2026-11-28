// Voor/na-pagina van de straatdetailbeelden (#1353): één HTML-pagina met per plek vier beelden (ooghoogte en 15 m, voor en na) en
// de draw calls, driehoeken, frametijd en generatorkosten uit de logboeken van de twee runs van scripts/ui/straatdetail_scenes.js.
//   node scripts/ui/straatdetail_pagina.mjs <voor-map> <na-map> <uitvoer.html>
import fs from 'node:fs';
import path from 'node:path';
const [voor, na, uit] = process.argv.slice(2);
if (!voor || !na || !uit) { console.log('gebruik: straatdetail_pagina.mjs <voor-map> <na-map> <uitvoer.html>'); process.exit(1); }
const meting = (dir) => {
  const log = fs.readFileSync(path.join(dir, '_log-1600x900.txt'), 'utf8'), out = {};
  for (const l of log.split(/\r?\n/)) { const m = l.match(/\[wereld\] (\{.*\})(?: \(js|$)/); if (!m) continue; try { const o = JSON.parse(m[1]); if (o.naam) out[o.naam] = { ...(out[o.naam] || {}), ...o }; } catch { /* regel zonder json */ } }
  return out;
};
const mv = meting(voor), mn = meting(na);
const beeld = (dir, naam, soort) => { const f = fs.readdirSync(dir).find((x) => x.endsWith(`-${naam}-${soort}.png`)); return f ? path.relative(path.dirname(uit), path.join(dir, f)).split(path.sep).join('/') : ''; };
const namen = Object.keys(mn).filter((n) => mn[n].x !== undefined);
const rij = (n) => {
  const a = mv[n] || {}, b = mn[n] || {};
  const f = (o, k) => (o[k] ? `${o[k].calls} calls, ${(o[k].tris / 1000).toFixed(0)}k driehoeken, ${o[k].ms} ms` : 'n.v.t.');
  return `<section><h2>${n} <small>${b.type || ''} (x ${b.x}, y ${b.y})</small></h2>
<p>ooghoogte voor: ${f(a, 'oog')} | na: ${f(b, 'oog')}<br>15 m voor: ${f(a, 'lucht')} | na: ${f(b, 'lucht')}${b.items !== undefined ? `<br>generator: ${b.generatorMs} ms, ${b.items} items ${JSON.stringify(b.per)}` : ''}</p>
<div class="g"><figure><img src="${beeld(voor, n, 'oog')}"><figcaption>voor, oog</figcaption></figure><figure><img src="${beeld(na, n, 'oog')}"><figcaption>na, oog</figcaption></figure>
<figure><img src="${beeld(voor, n, 'lucht')}"><figcaption>voor, 15 m</figcaption></figure><figure><img src="${beeld(na, n, 'lucht')}"><figcaption>na, 15 m</figcaption></figure></div></section>`;
};
fs.writeFileSync(uit, `<!doctype html><meta charset="utf-8"><title>Straatdetail voor en na (#1353)</title><style>body{font:14px system-ui;background:#222;color:#eee;margin:16px}h2 small{font-weight:normal;color:#aaa}.g{display:grid;grid-template-columns:1fr 1fr;gap:6px}img{width:100%}figure{margin:0}figcaption{color:#bbb}</style><h1>Straatdetail voor en na</h1>${namen.map(rij).join('\n')}`);
console.log('geschreven', uit, namen.length, 'plekken');
