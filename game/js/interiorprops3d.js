// Meubels en huisraad uit het interieurregister (propregister.js INTERIEUR_REGISTER; de data maakt scripts/akte1/meubels_converteer.mjs
// in interiorprops_data.js). Eén gedeelde geometrie per meubel en LOD-niveau met vertexkleuren, vlak gearceerd (laag-poly), en drie
// gedeelde materialen: vast, gloeiend (lampkappen) en glas. De LOD's komen uit het centrale systeem (lodkit3d.js makeLodObject, soort
// 'interior' van lodregistry.js): lichtere niveaus per materiaalgroep, dither-overgang, weg voorbij de weg-afstand; scene3d.js schakelt ze
// elke frame (updateLodObjects). Zo staan de meubels in de LOD-audit naast straatmeubilair, bomen en boten.
//   interiorPropGeometry(id, 0, kleuren)       -> BufferGeometry van het model zelf (gedeeld: niet weggooien)
//   interiorProp(id, { x, y, z, rot, fit })    -> Group met het model en zijn LOD-niveaus; fit = { b, h, d } (m; b langs x = voorkant)
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { INTERIOR_PROP_DATA } from './interiorprops_data.js';
import { isInterieurProp } from './propregister.js';
import { makeLodObject } from './lodkit3d.js';
import { propGeometry } from './propmodels3d.js';

const cache = new Map();

function decode(b64) {
  if (typeof atob === 'function') {
    const s = atob(b64), u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return u;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

// Het ruwe niveau: posities (m), paletindex per hoekpunt en indices.
export function interiorPropRaw(id, lod = 0) {
  const d = INTERIOR_PROP_DATA[id];
  if (!d) throw new Error('onbekend meubel: ' + id);
  const L = d.lod[Math.max(0, Math.min(d.lod.length - 1, lod))];
  const bytes = decode(L.b64);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const pos = new Float32Array(L.v * 3), col = new Uint8Array(L.v), idx = new Uint16Array(L.t * 3);
  for (let v = 0; v < L.v; v++) for (let c = 0; c < 3; c++) pos[v * 3 + c] = d.box[c] + (dv.getUint16((v * 3 + c) * 2, true) / 65535) * d.box[3 + c];
  for (let v = 0; v < L.v; v++) col[v] = bytes[L.v * 6 + v];
  const io = L.v * 6 + L.v + (L.v % 2);
  for (let k = 0; k < L.t * 3; k++) idx[k] = dv.getUint16(io + k * 2, true);
  return { pos, col, idx, palet: d.palet, soort: d.soort, box: d.box };
}

// Niet-geïndexeerd (vlakke normalen), met een groep per materiaalsoort (0 vast, 1 gloeit, 2 glas) zodat het meubel één mesh blijft.
// kleuren: een andere kleur voor een materiaal van de glb ({ Couch_Blue: 0xd8c7a4 }): een eigen, ook gedeelde variant.
export function interiorPropGeometry(id, lod = 0, kleuren = null) {
  const key = id + '#' + lod + (kleuren ? JSON.stringify(kleuren) : '');
  let g = cache.get(key);
  if (g) return g;
  const r = interiorPropRaw(id, lod);
  const namen = INTERIOR_PROP_DATA[id].namen || [];
  const kleur = r.palet.map((h, i) => new THREE.Color().setHex(kleuren && kleuren[namen[i]] != null ? kleuren[namen[i]] : h));
  const perSoort = [[], [], []];
  for (let k = 0; k < r.idx.length; k += 3) perSoort[r.soort[r.col[r.idx[k]]] || 0].push(k);
  const n = r.idx.length;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  g = new THREE.BufferGeometry();
  let o = 0;
  perSoort.forEach((tris, soort) => {
    if (!tris.length) return;
    const start = o;
    for (const k of tris) for (let j = 0; j < 3; j++) {
      const v = r.idx[k + j], c = kleur[r.col[v]];
      pos.set([r.pos[v * 3], r.pos[v * 3 + 1], r.pos[v * 3 + 2]], o * 3);
      col.set([c.r, c.g, c.b], o * 3);
      o++;
    }
    g.addGroup(start, o - start, soort);
  });
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  g.userData.shared = true;
  cache.set(key, g);
  return g;
}

// De drie gedeelde materialen (ook gedeeld met wie ze opruimt: userData.shared).
export const INTERIOR_PROP_MATERIALS = [
  new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.02 }),
  new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, emissive: 0xffe2b0, emissiveIntensity: 0.9 }),
  new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false }),
];
for (const m of INTERIOR_PROP_MATERIALS) m.userData.shared = true;

// De maat van het model zelf (m): [b, h, d] langs x, y, z.
export const interiorPropSize = (id) => { const d = INTERIOR_PROP_DATA[id]; return d ? [d.box[3], d.box[4], d.box[5]] : null; };

// Schaal waarmee het model in de doos { b, h, d } past; een maat die ontbreekt volgt de andere (gelijkmatig).
export function fitScale(id, fit) {
  const s = interiorPropSize(id);
  if (!s || !fit) return [1, 1, 1];
  const want = [fit.b, fit.h, fit.d];
  const f = want.map((w, i) => (typeof w === 'number' && w > 0 ? w / s[i] : null));
  const known = f.filter((v) => v != null);
  const avg = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 1;
  return f.map((v) => (v == null ? avg : v));
}

// Het model zelf (lod 0) houdt zijn gewone materiaal, zonder de dither die het voorbij de eerste grens wegfadet: wordt het object niet
// (meer) geschakeld (updateLodObjects draait pas als scene3d.js hem aanroept, en een set die buiten de scène gebouwd is valt uit de lijst),
// dan blijft het volle model staan in plaats van te verdwijnen. Wordt hij wel geschakeld, dan wisselt lod 0 hard en dooft lod 1 in.
function keepFull(mesh) {
  mesh.material = mesh.userData.lodBase || mesh.material;
}

// Een meubel op zijn plek. rot draait om de verticaal (rad, three-zin); de voorkant is +x voor rot = 0. De groep krijgt zijn LOD-niveaus van
// makeLodObject (een kleurvariant heeft een eigen naam: anders deelt hij de lichtere niveaus met de gewone kleur).
export function interiorProp(id, { x = 0, y = 0, z = 0, rot = 0, fit = null, scale = null, kleuren = null, shadows = false } = {}) {
  if (!isInterieurProp(id)) throw new Error('meubel niet in het register: ' + id);
  const g = new THREE.Group();
  g.name = 'meubel:' + id;
  const geo = interiorPropGeometry(id, 0, kleuren);
  // één materiaalsoort: één materiaal (de lichtere niveaus van lodkit3d.js hebben dan geen groepen, en een materiaallijst zonder groepen
  // tekent niets)
  const m = new THREE.Mesh(geo, geo.groups.length === 1 ? INTERIOR_PROP_MATERIALS[geo.groups[0].materialIndex] : INTERIOR_PROP_MATERIALS);
  m.userData.lodBase = m.material;
  m.castShadow = shadows; m.receiveShadow = shadows;
  g.add(m);
  g.position.set(x, y, z);
  g.rotation.y = rot;
  const s = scale ? (Array.isArray(scale) ? scale : [scale, scale, scale]) : fitScale(id, fit);
  g.scale.set(s[0], s[1], s[2]);
  g.userData.meubel = id;
  makeLodObject('interior', kleuren ? id + '~' + Object.values(kleuren).join('.') : id, g);
  keepFull(m);
  return g;
}

// Huisraad uit het propregister (propregister.js PROP_REGISTER, gebruik 'interieur': tv, frituurpan, buisradio; gebouwd door
// propmodels3d.js), op dezelfde manier geplaatst: één vertexkleurmesh met LOD-niveaus van het centrale systeem.
export function registeredProp(id, { x = 0, y = 0, z = 0, rot = 0, scale = 1 } = {}) {
  const g = new THREE.Group();
  g.name = 'prop:' + id;
  const pm = new THREE.Mesh(propGeometry(id), INTERIOR_PROP_MATERIALS[0]);
  pm.userData.lodBase = pm.material;
  g.add(pm);
  g.position.set(x, y, z);
  g.rotation.y = rot;
  g.scale.setScalar(scale);
  g.userData.prop = id;
  makeLodObject('interior', 'prop-' + id, g);
  keepFull(g.children[0]);
  return g;
}
