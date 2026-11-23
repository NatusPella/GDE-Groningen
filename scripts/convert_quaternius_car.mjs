// Zet een auto uit het Quaternius-autopakket (CC0, door de eigenaar gedownload naar C:\Users\abuis\gde-assets\quaternius\cars\pack,
// buiten git) om naar een kleine JS-module met de carrosserie in onze assen (+x voor, +z rechts, y omhoog, op de grond, midden op 0),
// gekwantiseerd op een millimeter, met per hoekpunt een rol (lak, glas, koplamp, achterlicht, zwart, grijs, onderkant). De wielen gaan
// er niet in: die bouwt het spel zelf (draaien en sturen), alleen hun middelpunt en straal worden bewaard.
//   node scripts/convert_quaternius_car.mjs [bestand.glb] [uitvoer.js]
import './node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
const THREE = await import('three');
const { GLTFLoader } = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js');

const bron = process.argv[2] || 'C:/Users/abuis/gde-assets/quaternius/cars/pack/Car.glb';
const uit = process.argv[3] || path.join(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1'), '..', 'game', 'js', 'models', 'qcar_sedan.js');
const buf = fs.readFileSync(bron);
const gltf = await new Promise((res, rej) => new GLTFLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', res, rej));
const root = gltf.scene;
root.updateMatrixWorld(true);

// rol per materiaalnaam (de eerste, gekleurde carrosserie is de lak)
const ROLLEN = ['lak', 'glas', 'koplamp', 'achterlicht', 'zwart', 'grijs', 'onder'];
function rol(naam, eerste) {
  if (/window/i.test(naam)) return 1;
  if (/headlight/i.test(naam)) return 2;
  if (/taillight/i.test(naam)) return 3;
  if (/^black/i.test(naam)) return 4;
  if (/^grey/i.test(naam)) return 5;
  if (/material|dark/i.test(naam)) return 6;
  return eerste ? 0 : 5;
}
const rot = new THREE.Matrix4().makeRotationY(Math.PI / 2); // hun +z voor -> onze +x voor, hun +x (links) -> onze -z (links)
const P = [], R = [], wielen = [];
let eerste = true;
root.traverse((o) => {
  if (!o.isMesh) return;
  const naam = (o.parent && o.parent.name) || o.name;
  const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
  g.applyMatrix4(o.matrixWorld).applyMatrix4(rot);
  if (/wheel/i.test(naam)) {
    g.computeBoundingBox();
    const b = g.boundingBox, c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
    if (/black/i.test(o.material.name)) wielen.push({ naam, x: c.x, y: c.y, z: c.z, r: s.y / 2, breed: s.z });
    return;
  }
  const m = o.material.name;
  const r = rol(m, eerste && !/window|light|black|grey/i.test(m));
  if (r === 0) eerste = false;
  const a = g.attributes.position.array;
  for (let i = 0; i < a.length; i += 3) { P.push(a[i], a[i + 1], a[i + 2]); R.push(r); }
});
// midden op 0 in x en z, op de grond
const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[i + k]); mx[k] = Math.max(mx[k], P[i + k]); }
// de grond is de onderkant van de wielen, niet die van de carrosserie (die hangt erboven)
const grond = Math.min(...wielen.map((w) => w.y - w.r));
const off = [(mn[0] + mx[0]) / 2, grond, (mn[2] + mx[2]) / 2];
const q = new Int16Array(P.length);
for (let i = 0; i < P.length; i++) q[i] = Math.round((P[i] - off[i % 3]) * 1000);
const maat = { len: mx[0] - mn[0], wid: mx[2] - mn[2], hoog: mx[1] - grond };
// achteras: één groep voor beide achterwielen (breed); splits in links en rechts
const assen = [];
for (const w of wielen) {
  const x = +(w.x - off[0]).toFixed(3), y = +(w.y - off[1]).toFixed(3), r = +w.r.toFixed(3);
  if (w.breed > 1) for (const s of [1, -1]) assen.push({ x, y, z: +(s * (w.breed / 2 - 0.09)).toFixed(3), r, voor: false });
  else assen.push({ x, y, z: +(w.z - off[2]).toFixed(3), r, voor: true });
}
const b64 = (arr) => Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString('base64');
const out = `// GEGENEREERD door scripts/convert_quaternius_car.mjs uit ${path.basename(bron)} (Quaternius, Cars Bundle, CC0 1.0; handle: Quaternius).
// Bron: https://poly.pizza/bundle/Cars-Bundle-FE5IWe6OMk / https://quaternius.com/packs/cars.html. Alleen de carrosserie, in onze assen
// (+x voor, +z rechts, y omhoog), op een millimeter; de wielen bouwt het spel zelf. Niet met de hand bewerken.
export const QCAR = {
  bron: ${JSON.stringify(path.basename(bron))},
  maat: ${JSON.stringify({ len: +maat.len.toFixed(3), wid: +maat.wid.toFixed(3), hoog: +maat.hoog.toFixed(3) })},
  rollen: ${JSON.stringify(ROLLEN)},
  wielen: ${JSON.stringify(assen)},
  posities: '${b64(q)}',
  rol: '${b64(new Uint8Array(R))}',
};
`;
fs.mkdirSync(path.dirname(uit), { recursive: true });
fs.writeFileSync(uit, out);
console.log(`${path.basename(bron)} -> ${uit}: ${P.length / 9} driehoeken, ${wielen.length} wielgroepen, maat ${maat.len.toFixed(2)} x ${maat.wid.toFixed(2)} x ${maat.hoog.toFixed(2)}, ${(out.length / 1024).toFixed(0)} kB`);
