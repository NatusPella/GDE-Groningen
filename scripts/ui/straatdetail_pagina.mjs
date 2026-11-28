// Voor/na-pagina van de straatdetailbeelden (#1353): één HTML-pagina met per plek vier beelden (ooghoogte en 15 m, zonder en met de
// laag) en de draw calls, driehoeken en frametijd uit het logboek van één run van scripts/ui/straatdetail_scenes.js (de scene zet de
// detailmeshes zelf uit voor het voor-beeld, dus alles in beeld is gelijk behalve de laag).
//   node scripts/ui/straatdetail_pagina.mjs <map met beelden en logboek> <uitvoer.html>
import fs from 'node:fs';
import path from 'node:path';

const [dir, uit] = process.argv.slice(2);
if (!dir || !uit) { console.log('gebruik: straatdetail_pagina.mjs <map> <uitvoer.html>'); process.exit(1); }
const log = fs.readFileSync(path.join(dir, '_log-1600x900.txt'), 'utf8'), m = {};
for (const l of log.split(/\r?\n/)) {
  const x = l.match(/\[wereld\] (\{.*\})(?: \(js|$)/);
  if (!x) continue;
  try { const o = JSON.parse(x[1]); if (o.naam) m[o.naam] = { ...(m[o.naam] || {}), ...o }; } catch { /* regel zonder json */ }
}
const beeld = (naam, soort) => {
  const f = fs.readdirSync(dir).find((n) => n.endsWith('-' + naam + '-' + soort + '.png'));
  return f ? path.relative(path.dirname(uit), path.join(dir, f)).split(path.sep).join('/') : '';
};
const f = (o) => (o ? o.calls + ' calls, ' + (o.tris / 1000).toFixed(0) + 'k driehoeken, ' + o.ms + ' ms' : 'n.v.t.');
const namen = Object.keys(m).filter((n) => m[n].x !== undefined);
const som = { calls: 0, tris: 0, ms: 0, n: 0 };
const rij = (n) => {
  const b = m[n];
  for (const [a, v] of [[b.oog, b.oogVoor], [b.lucht, b.luchtVoor]]) if (a && v) { som.calls += a.calls - v.calls; som.tris += a.tris - v.tris; som.ms += a.ms - v.ms; som.n++; }
  return '<section><h2>' + n + ' <small>' + (b.type || '') + ' (x ' + b.x + ', y ' + b.y + ')</small></h2><p>ooghoogte zonder laag: ' + f(b.oogVoor) + ' | met laag: ' + f(b.oog)
    + '<br>15 m zonder laag: ' + f(b.luchtVoor) + ' | met laag: ' + f(b.lucht)
    + (b.items !== undefined ? '<br>generator op deze tegel: ' + b.generatorMs + ' ms, ' + b.items + ' items ' + JSON.stringify(b.per) : '') + '</p>'
    + '<div class="g"><figure><img src="' + beeld(n, 'oog-voor') + '"><figcaption>zonder laag, oog</figcaption></figure><figure><img src="' + beeld(n, 'oog') + '"><figcaption>met laag, oog</figcaption></figure>'
    + '<figure><img src="' + beeld(n, 'lucht-voor') + '"><figcaption>zonder laag, 15 m</figcaption></figure><figure><img src="' + beeld(n, 'lucht') + '"><figcaption>met laag, 15 m</figcaption></figure></div></section>';
};
const body = namen.map(rij).join('\n');
const gem = (v) => (v / (som.n || 1));
const kop = 'Gemiddeld extra per beeld door de laag: ' + gem(som.calls).toFixed(1) + ' draw calls, ' + (gem(som.tris) / 1000).toFixed(1) + 'k driehoeken, ' + gem(som.ms).toFixed(1) + ' ms frametijd (' + som.n + ' beelden).';
fs.writeFileSync(uit, '<!doctype html><meta charset="utf-8"><title>Straatdetail voor en na (#1353)</title><style>body{font:14px system-ui;background:#222;color:#eee;margin:16px}h2 small{font-weight:normal;color:#aaa}.g{display:grid;grid-template-columns:1fr 1fr;gap:6px}img{width:100%}figure{margin:0}figcaption{color:#bbb}</style><h1>Straatdetail voor en na</h1><p>' + kop + '</p>' + body);
console.log('geschreven', uit, namen.length, 'plekken.', kop);
