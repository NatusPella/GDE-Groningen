// Zet de auto's uit het Quaternius-autopakket (CC0, door de eigenaar gedownload naar C:\Users\abuis\gde-assets\quaternius\cars\pack,
// buiten git) om naar één kleine JS-module met per auto de carrosserie in onze assen (+x voor, +z rechts, y omhoog, op de grond, midden
// op 0), gekwantiseerd op een millimeter, met per driehoek een rol (lak, glas, koplamp, achterlicht, zwart, grijs, onderkant). De wielen
// gaan er niet in: die bouwt het spel zelf (draaien en sturen), alleen hun middelpunt en straal worden bewaard. Bij de politieauto
// gaan hun zwaailichten eruit (het spel heeft eigen, knipperende lampen) en wordt alleen hun plek bewaard (lichtbalk).
//   node scripts/convert_quaternius_car.mjs [map met glb] [uitvoer.js]
import './node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
const THREE = await import('three');
const { GLTFLoader } = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js');

const map = process.argv[2] || 'C:/Users/abuis/gde-assets/quaternius/cars/pack/';
const uit = process.argv[3] || path.join(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1'), '..', 'game', 'js', 'models', 'qcars.js');
// sleutel = ons carType of uitvoering; lak = de materialen die de voertuigkleur krijgen; los = wat eruit gaat
const AUTOS = [
  { key: 'sedan', file: 'Car.glb', lak: ['Blue'] },
  { key: 'hatch', file: 'Car-unqqkULtRU.glb', lak: ['LightBlue'] },
  { key: 'suv', file: 'SUV.glb', lak: ['White'] },
  { key: 'sport', file: 'Sports Car.glb', lak: ['Orange'] },
  { key: 'sport2', file: 'Sports Car-1mkmFkAz5v.glb', lak: ['White'] },
  { key: 'taxi', file: 'Taxi.glb', lak: ['Yellow'] },
  { key: 'police', file: 'Police Car.glb', lak: ['Black', 'White'], los: ['BlueLights', 'WhiteLights'] },
];
const ROLLEN = ['lak', 'glas', 'koplamp', 'achterlicht', 'zwart', 'grijs', 'onder'];
function rol(naam, lak) {
  if (lak.includes(naam)) return 0;
  if (/window/i.test(naam)) return 1;
  if (/headlight/i.test(naam)) return 2;
  if (/taillight/i.test(naam)) return 3;
  if (/^black/i.test(naam)) return 4;
  if (/^grey/i.test(naam)) return 5;
  return 6; // onderkant, donkere randen (Material.007, DarkOrange)
}
const rot = new THREE.Matrix4().makeRotationY(Math.PI / 2); // hun +z voor -> onze +x voor, hun +x (links) -> onze -z (links)
const b64 = (arr) => Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString('base64');
const uitvoer = {};
let regels = '';
for (const auto of AUTOS) {
  const buf = fs.readFileSync(path.join(map, auto.file));
  const gltf = await new Promise((res, rej) => new GLTFLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', res, rej));
  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const P = [], R = [], wielen = [];
  let balk = null;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const naam = (o.parent && o.parent.name) || o.name;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld).applyMatrix4(rot);
    g.computeBoundingBox();
    if (/wheel/i.test(naam)) {
      const b = g.boundingBox, c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
      if (/black/i.test(o.material.name)) wielen.push({ x: c.x, y: c.y, z: c.z, r: s.y / 2, breed: s.z });
      return;
    }
    if ((auto.los || []).includes(o.material.name)) { balk = balk ? balk.union(g.boundingBox) : g.boundingBox.clone(); return; }
    const r = rol(o.material.name, auto.lak);
    const a = g.attributes.position.array;
    for (let i = 0; i < a.length; i += 9) { for (let k = 0; k < 9; k++) P.push(a[i + k]); R.push(r); }
  });
  // lagen die in hun model vlak op elkaar liggen (taxibord, ruit over de flank) zouden in het spel met elkaar vechten: de kleinste
  // van twee evenwijdige, overlappende driehoeken met een andere rol binnen 3 cm schuift naar buiten tot 3,2 cm (ruim boven de grens van
  // scripts/zfight_audit.mjs)
  const T = P.length / 9, nrm = [], opp = [], bb = [];
  for (let t = 0; t < T; t++) {
    const o = t * 9, a3 = [P[o], P[o + 1], P[o + 2]], b3 = [P[o + 3], P[o + 4], P[o + 5]], c3 = [P[o + 6], P[o + 7], P[o + 8]];
    const u = [b3[0] - a3[0], b3[1] - a3[1], b3[2] - a3[2]], w = [c3[0] - a3[0], c3[1] - a3[1], c3[2] - a3[2]];
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], l = Math.hypot(...n) || 1;
    nrm.push(n.map((x) => x / l)); opp.push(l / 2);
    bb.push([0, 1, 2].map((k) => Math.min(a3[k], b3[k], c3[k])).concat([0, 1, 2].map((k) => Math.max(a3[k], b3[k], c3[k]))));
  }
  // overlappen twee driehoeken in het vlak (scheidende-assentest in 2D, met 1 mm marge zodat rakende randen niet tellen)?
  const overlapt = (i, j, n) => {
    const ax = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = [n[1] * ax[2] - n[2] * ax[1], n[2] * ax[0] - n[0] * ax[2], n[0] * ax[1] - n[1] * ax[0]];
    const ul = Math.hypot(...u); for (let k = 0; k < 3; k++) u[k] /= ul;
    const w = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
    const tri = (t) => [0, 1, 2].map((k) => { const o = t * 9 + k * 3; return [P[o] * u[0] + P[o + 1] * u[1] + P[o + 2] * u[2], P[o] * w[0] + P[o + 1] * w[1] + P[o + 2] * w[2]]; });
    const A = tri(i), Bt = tri(j);
    for (const T2 of [A, Bt]) for (let e = 0; e < 3; e++) {
      const p0 = T2[e], p1 = T2[(e + 1) % 3], as = [p1[1] - p0[1], p0[0] - p1[0]];
      const pr = (Q) => Q.map((q) => q[0] * as[0] + q[1] * as[1]);
      const pa = pr(A), pb = pr(Bt), len = Math.hypot(...as) || 1;
      if (Math.min(Math.max(...pa), Math.max(...pb)) - Math.max(Math.min(...pa), Math.min(...pb)) < 0.001 * len) return false;
    }
    return true;
  };
  let geschoven = 0;
  for (let i = 0; i < T; i++) for (let j = i + 1; j < T; j++) {
    if (R[i] === R[j]) continue;
    const dot = nrm[i][0] * nrm[j][0] + nrm[i][1] * nrm[j][1] + nrm[i][2] * nrm[j][2];
    if (dot < 0.9995) continue;
    const A = bb[i], Bb = bb[j];
    if (A[0] > Bb[3] + 0.02 || Bb[0] > A[3] + 0.02 || A[1] > Bb[4] + 0.02 || Bb[1] > A[4] + 0.02 || A[2] > Bb[5] + 0.02 || Bb[2] > A[5] + 0.02) continue;
    const d = (k) => nrm[i][0] * P[k] + nrm[i][1] * P[k + 1] + nrm[i][2] * P[k + 2];
    const sep = d(j * 9) - d(i * 9);
    if (Math.abs(sep) >= 0.03) continue;
    if (!overlapt(i, j, nrm[i])) continue; // alleen echt over elkaar, niet naast elkaar (een ruit die aan de flank grenst)
    const klein = opp[i] < opp[j] ? i : j, sign = klein === j ? Math.sign(sep || 1) : -Math.sign(sep || 1);
    const extra = (0.032 - Math.abs(sep)) * sign;
    for (let k = 0; k < 9; k += 3) for (let q = 0; q < 3; q++) P[klein * 9 + k + q] += nrm[klein][q] * extra * Math.sign(dot);
    geschoven++;
  }
  if (geschoven) console.log(`  ${auto.key}: ${geschoven} lagen uit elkaar geschoven`);
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[i + k]); mx[k] = Math.max(mx[k], P[i + k]); }
  // de grond is de onderkant van de wielen, niet die van de carrosserie (die hangt erboven)
  const grond = Math.min(...wielen.map((w) => w.y - w.r));
  const off = [(mn[0] + mx[0]) / 2, grond, (mn[2] + mx[2]) / 2];
  // gedeelde hoekpunten (per millimeter) en een index per hoek: ongeveer een derde van de grootte
  const sleutels = new Map(), uniek = [], index = [];
  for (let i = 0; i < P.length; i += 3) {
    const v = [0, 1, 2].map((k) => Math.round((P[i + k] - off[k]) * 1000));
    const key = v.join(',');
    let n = sleutels.get(key);
    if (n === undefined) { n = uniek.length / 3; sleutels.set(key, n); uniek.push(...v); }
    index.push(n);
  }
  const q = new Int16Array(uniek), idx = new Uint16Array(index);
  const assen = [];
  for (const w of wielen) {
    const x = +(w.x - off[0]).toFixed(3), y = +(w.y - off[1]).toFixed(3), r = +w.r.toFixed(3);
    if (w.breed > 1) for (const s of [1, -1]) assen.push({ x, y, z: +(s * (w.breed / 2 - 0.09)).toFixed(3), r, voor: false });
    else assen.push({ x, y, z: +(w.z - off[2]).toFixed(3), r, voor: true });
  }
  const lichtbalk = balk ? { x: +((balk.min.x + balk.max.x) / 2 - off[0]).toFixed(3), y: +(balk.max.y - off[1]).toFixed(3), breed: +(balk.max.z - balk.min.z).toFixed(3) } : null;
  uitvoer[auto.key] = { bron: auto.file, maat: { len: +(mx[0] - mn[0]).toFixed(3), wid: +(mx[2] - mn[2]).toFixed(3), hoog: +(mx[1] - grond).toFixed(3) }, wielen: assen, lichtbalk, posities: b64(q), index: b64(idx), rol: b64(new Uint8Array(R)) };
  regels += `${auto.key}: ${auto.file}, ${P.length / 9} driehoeken\n`;
}
const out = `// GEGENEREERD door scripts/convert_quaternius_car.mjs uit de Cars Bundle van Quaternius (CC0 1.0; handle: Quaternius).
// Bron: de Cars Bundle op poly.pizza en het Cars Pack op quaternius.com (adressen en licentie: docs/MODEL-LICENTIES.md).
// Per auto alleen de carrosserie, in onze assen (+x voor, +z rechts, y omhoog), op een millimeter: gedeelde hoekpunten (int16),
// een index per hoek (uint16) en een rol per driehoek (QROLLEN);
// de wielen bouwt het spel zelf. Niet met de hand bewerken.
export const QROLLEN = ${JSON.stringify(ROLLEN)};
export const QCARS = ${JSON.stringify(uitvoer)};
`;
fs.mkdirSync(path.dirname(uit), { recursive: true });
fs.writeFileSync(uit, out);
console.log(regels + `-> ${uit} (${(out.length / 1024).toFixed(0)} kB)`);
