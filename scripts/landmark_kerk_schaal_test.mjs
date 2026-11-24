// De kerkkit blijft binnen zijn maten (#1057, Usquert: "enorme zwarte zuilen"): de kit van de Petrus en Pauluskerk (en elke andere kerk) heeft
// geen onderdeel dat veel groter is dan zijn eigen voetafdruk en toren, met rare hoogtetags, zonder omtrek en met een heel grote omtrek.
// De zuilen in het beeld bleken de binnenkant van deze kit: de speler stond er middenin (de QA-plek 6 teleporteerde naar het midden van de kit).
//   node scripts/landmark_kerk_schaal_test.mjs
import './node3d.mjs';

const K = await import('../game/js/landmarkkit.js');
const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };
const rect = (x, y, len, wid) => [x - len / 2, y - wid / 2, x + len / 2, y - wid / 2, x + len / 2, y + wid / 2, x - len / 2, y + wid / 2];
const X = 2769.7, Y = -20431.3; // Usquert

const gevallen = [
  ['met omtrek 30x14', { k: 'church', n: 'Petrus en Pauluskerk', x: X, y: Y, o: rect(X, Y, 30, 14), t: { building: 'church' } }],
  ['zonder omtrek', { k: 'church', n: 'Petrus en Pauluskerk', x: X, y: Y, t: { building: 'church' } }],
  ['hoogtetag 33', { k: 'church', n: 'Petrus en Pauluskerk', x: X, y: Y, o: rect(X, Y, 28, 12), t: { building: 'church', height: '33' } }],
  ['hoogtetag kapot', { k: 'church', n: 'Petrus en Pauluskerk', x: X, y: Y, o: rect(X, Y, 28, 12), t: { building: 'church', height: '3300 m' } }],
  ['hoogtetag tekst', { k: 'church', n: 'Petrus en Pauluskerk', x: X, y: Y, o: rect(X, Y, 28, 12), t: { building: 'church', height: 'hoog' } }],
  ['enorme omtrek 400x300', { k: 'church', n: 'Petrus en Pauluskerk', x: X, y: Y, o: rect(X, Y, 400, 300), t: { building: 'church' } }],
  ['piepkleine omtrek 2x1', { k: 'church', n: 'Petrus en Pauluskerk', x: X, y: Y, o: rect(X, Y, 2, 1), t: { building: 'church' } }],
];

for (const [naam, it] of gevallen) {
  const p = K.landmarkParams(it);
  check(!!p, `${naam}: params`);
  if (!p) continue;
  check(p.len >= 10 && p.len <= 60 && p.wid >= 6 && p.wid <= 24, `${naam}: maten ${p.len} x ${p.wid} binnen de klem`);
  for (const lod of [K.LOD_FULL, K.LOD_MASS, K.LOD_SKY]) {
    const q = K.landmarkParams(it);
    const g = K.landmarkGeometry(q, lod);
    g.geometry.computeBoundingBox();
    const b = g.geometry.boundingBox;
    const pos = g.geometry.attributes.position;
    let nan = 0; for (let i = 0; i < pos.count * 3; i++) if (!Number.isFinite(pos.array[i])) nan++;
    check(nan === 0, `${naam} lod ${lod}: geen NaN in de geometrie`);
    const w = b.max.x - b.min.x, d = b.max.z - b.min.z, h = b.max.y - b.min.y;
    const rad = K.wierdeRadius(q);
    check(h > 5 && h <= 70, `${naam} lod ${lod}: hoogte ${h.toFixed(1)} m is een kerk (5 tot 70 m)`);
    check(w <= Math.max(q.len + 8, 2 * rad + 20) && d <= Math.max(q.wid + 8, 2 * rad + 20), `${naam} lod ${lod}: ${w.toFixed(0)} x ${d.toFixed(0)} m past in voetafdruk plus wierde`);
    check(b.min.y >= -3, `${naam} lod ${lod}: niets diep onder de grond (${b.min.y.toFixed(1)})`);
    // #1193: de kerkramen zijn glas in lood (blauwgrijs), geen egaal zwart gat: elk glashoekpunt (groep 2) heeft een kanaal boven 0,05 lineair
    if (lod === K.LOD_FULL) {
      const col = g.geometry.attributes.color; let glas = 0, zwart = 0;
      for (const gr of g.geometry.groups) if (gr.materialIndex === 2) for (let i = gr.start; i < gr.start + gr.count; i++) { const v = g.geometry.index ? g.geometry.index.getX(i) : i; glas++; if (Math.max(col.getX(v), col.getY(v), col.getZ(v)) < 0.05) zwart++; }
      check(glas > 0 && zwart === 0, `${naam}: ${glas} glashoekpunten, ${zwart} bijna zwart`);
    }
  }
}

if (fails.length) { console.error(`landmark_kerk_schaal_test: ${fails.length} MISLUKT\n- ` + fails.join('\n- ')); process.exit(1); }
console.log(`landmark_kerk_schaal_test: ${gevallen.length} gevallen ok`);
