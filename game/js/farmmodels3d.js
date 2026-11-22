// De boerderijplaatjes in 3D (22-11, docs/BOERDERIJ-VISUEEL-22-11.md): laag-poly previewmodellen voor de boerderijschermen: koe, schaap, kip, silo, schuur, kas
// en een gewasveld per gewas. Elk model is één samengevoegde geometrie met vertexkleur en één materiaal (dus één draw call en geen eigen texturen), met een
// vaste driehoekenbegroting (FARM_BUDGET) die de test bewaakt. Alleen vormen en zomerkleuren; geen echte merken. De voertuigen en werktuigen zelf komen uit
// de bestaande bouwers (models3d_vehicles.js, werktuigen3d.js); farmpics.js koppelt een sleutel aan zo'n bouwer. Het model staat met zijn voeten op y=0,
// midden in x en z, de voorkant naar +z. Lokaal: previews zijn alleen beeld, ze raken geen spelerdata en gaan niet over het net.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GEWAS_KLEUR, bouwWerktuig } from './werktuigen3d.js';

// Maximaal aantal driehoeken per model (de test controleert dit).
export const FARM_BUDGET = { koe: 340, schaap: 260, kip: 170, silo: 260, schuur: 260, kas: 300, veld: 520 };
export const FARM_KEYS = ['koe', 'schaap', 'kip', 'silo', 'schuur', 'kas', 'veld'];
const CROP_IDS = Object.keys(GEWAS_KLEUR);

const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(1, 1, 1);

// Een bouwlijst: elke vorm wordt een niet-geïndexeerde geometrie met een vertexkleur; samenvoegen geeft één BufferGeometry.
function newBuilder() {
  const delen = [];
  const voeg = (geo, x, y, z, color, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    geo.dispose();
    m4.compose(v3.set(x, y, z), q4.setFromEuler(e4.set(rx, ry, rz)), s3.set(sx, sy, sz));
    g.applyMatrix4(m4);
    const c = new THREE.Color(color);
    const n = g.attributes.position.count;
    const kl = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { kl[i * 3] = c.r; kl[i * 3 + 1] = c.g; kl[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(kl, 3));
    g.deleteAttribute('uv');
    delen.push(g);
  };
  return {
    // x, y, z = midden van de vorm; b, h, d = afmeting
    box: (x, y, z, b, h, d, color, rx, ry, rz) => voeg(new THREE.BoxGeometry(b, h, d), x, y, z, color, rx, ry, rz),
    cyl: (x, y, z, rb, h, color, seg = 8, rt = rb, rx, ry, rz) => voeg(new THREE.CylinderGeometry(rt, rb, h, seg), x, y, z, color, rx, ry, rz),
    kegel: (x, y, z, r, h, color, seg = 6, rx, ry, rz) => voeg(new THREE.ConeGeometry(r, h, seg), x, y, z, color, rx, ry, rz),
    bol: (x, y, z, r, color, sx = 1, sy = 1, sz = 1) => voeg(new THREE.IcosahedronGeometry(r, 0), x, y, z, color, 0, 0, 0, sx, sy, sz),
    bouw() {
      const totaal = delen.reduce((a, g) => a + g.attributes.position.count, 0);
      const pos = new Float32Array(totaal * 3), nor = new Float32Array(totaal * 3), kl = new Float32Array(totaal * 3);
      let o = 0;
      for (const g of delen) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); kl.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(kl, 3));
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
      const group = new THREE.Group();
      group.add(mesh);
      return group;
    },
  };
}

const ZWART = 0x2a2623, WIT = 0xf2efe6, ROOD = 0xb23a2e, ROZE = 0xe0a3a0, BRUIN = 0x6b4a32, GRIJS = 0x9aa0a4, DONKERGRIJS = 0x5d6266;

function koe() {
  const b = newBuilder();
  b.box(0, 0.95, 0, 0.62, 0.62, 1.25, WIT);                     // romp
  b.box(0, 0.98, 0.15, 0.64, 0.42, 0.42, ZWART);                // vlek op de romp
  b.box(0.2, 1.02, -0.4, 0.42, 0.34, 0.3, ZWART);               // vlek achter
  b.box(0, 1.1, 0.82, 0.38, 0.4, 0.38, WIT);                    // kop
  b.box(0, 1.0, 1.04, 0.32, 0.22, 0.14, ROZE);                  // snuit
  b.box(-0.2, 1.34, 0.8, 0.09, 0.09, 0.09, 0xf0e6c8);           // hoorns
  b.box(0.2, 1.34, 0.8, 0.09, 0.09, 0.09, 0xf0e6c8);
  b.box(-0.2, 1.17, 0.7, 0.14, 0.1, 0.06, ZWART);               // oren
  b.box(0.2, 1.17, 0.7, 0.14, 0.1, 0.06, ZWART);
  for (const [x, z] of [[-0.2, 0.45], [0.2, 0.45], [-0.2, -0.45], [0.2, -0.45]]) b.box(x, 0.32, z, 0.14, 0.64, 0.14, WIT);
  b.box(0, 0.55, -0.15, 0.22, 0.14, 0.3, ROZE);                 // uier
  b.box(0, 1.0, -0.72, 0.06, 0.5, 0.06, ZWART);                 // staart
  return b.bouw();
}

function schaap() {
  const b = newBuilder();
  b.bol(0, 0.62, 0, 0.5, 0xf4f0e4, 1, 0.9, 1.25);               // wol
  b.bol(0, 0.7, 0.2, 0.3, 0xece6d6, 1.1, 1, 1.1);
  b.box(0, 0.74, 0.7, 0.26, 0.3, 0.3, 0x3a3532);                // kop
  b.box(-0.16, 0.8, 0.66, 0.12, 0.08, 0.08, 0x3a3532);          // oren
  b.box(0.16, 0.8, 0.66, 0.12, 0.08, 0.08, 0x3a3532);
  for (const [x, z] of [[-0.16, 0.3], [0.16, 0.3], [-0.16, -0.3], [0.16, -0.3]]) b.box(x, 0.18, z, 0.09, 0.36, 0.09, 0x3a3532);
  return b.bouw();
}

function kip() {
  const b = newBuilder();
  b.bol(0, 0.42, 0, 0.3, 0xe8e0cf, 1, 0.95, 1.2);               // lijf
  b.bol(0, 0.7, 0.26, 0.17, 0xe8e0cf);                           // kop
  b.box(0, 0.88, 0.27, 0.05, 0.11, 0.18, ROOD);                  // kam
  b.kegel(0, 0.68, 0.48, 0.05, 0.14, 0xe0a52b, 4, Math.PI / 2); // snavel
  b.box(0, 0.58, 0.4, 0.05, 0.1, 0.05, ROOD);                    // lel
  b.kegel(0, 0.62, -0.38, 0.14, 0.34, 0xc9a96e, 5, -Math.PI / 2.6); // staart
  b.box(-0.09, 0.12, 0.02, 0.03, 0.24, 0.03, 0xe0a52b);          // poten
  b.box(0.09, 0.12, 0.02, 0.03, 0.24, 0.03, 0xe0a52b);
  return b.bouw();
}

function silo() {
  const b = newBuilder();
  b.box(0, 0.1, 0, 2.9, 0.2, 2.9, DONKERGRIJS);                   // plaat
  b.cyl(0, 2.7, 0, 1.2, 5, GRIJS, 10);                            // romp
  b.cyl(0, 1.5, 0, 1.24, 0.14, DONKERGRIJS, 10);                  // banden
  b.cyl(0, 3.4, 0, 1.24, 0.14, DONKERGRIJS, 10);
  b.cyl(0, 4.9, 0, 1.24, 0.14, DONKERGRIJS, 10);
  b.kegel(0, 5.55, 0, 1.25, 1.1, 0xc9ccd0, 10);                    // dak
  b.cyl(0, 6.25, 0, 0.12, 0.4, DONKERGRIJS, 6);                    // luchtpijp
  b.box(1.28, 2.6, 0, 0.1, 5, 0.34, 0xb8860b);                    // ladder
  return b.bouw();
}

function schuur() {
  const b = newBuilder();
  b.box(0, 1.1, 0, 4.4, 2.2, 3.0, ROOD);                          // muren
  b.box(-1.3, 1.0, 1.51, 1.8, 1.8, 0.06, WIT);                    // grote deur
  b.box(1.4, 1.1, 1.51, 0.6, 0.6, 0.06, 0xdfe7ee);                // raam
  b.box(0, 2.9, -0.78, 4.7, 0.14, 1.9, BRUIN, 0.9, 0, 0);          // dak achter
  b.box(0, 2.9, 0.78, 4.7, 0.14, 1.9, BRUIN, -0.9, 0, 0);          // dak voor
  b.box(0, 2.45, 1.51, 1.1, 0.9, 0.04, WIT);                      // gevelvlak boven
  return b.bouw();
}

function kas() {
  const b = newBuilder();
  const GLAS = 0xcfe9e2, FRAME = 0x7c8a86, GROEN = 0x4f9a43;
  b.box(0, 0.9, 0, 4.2, 1.8, 2.8, GLAS);                          // wanden
  b.box(0, 2.15, -0.74, 4.4, 0.08, 1.7, GLAS, 0.62, 0, 0);          // dak achter
  b.box(0, 2.15, 0.74, 4.4, 0.08, 1.7, GLAS, -0.62, 0, 0);          // dak voor
  for (const x of [-2.1, -0.7, 0.7, 2.1]) b.box(x, 1.0, 1.42, 0.07, 2.0, 0.07, FRAME);   // spanten
  for (const x of [-2.1, 2.1]) b.box(x, 1.0, -1.42, 0.07, 2.0, 0.07, FRAME);
  b.box(0, 0.05, 0, 4.4, 0.1, 3.0, 0x8b7355);                     // voet
  for (const x of [-1.4, 0, 1.4]) b.bol(x, 1.0, 0, 0.55, GROEN, 0.9, 1.3, 2.2);   // planten binnen
  return b.bouw();
}

// Een gewasveld: grond met rijen. Per gewas een eigen vorm, zodat je het gewas herkent (graan hoog en goud, gras vlak, fruit als bomen).
function cropField(gewas = 'graan') {
  const b = newBuilder();
  const color = GEWAS_KLEUR[gewas] ?? 0xd9b84a;
  b.box(0, 0.06, 0, 4.4, 0.12, 3.6, 0x6b5238);
  const rijen = gewas === 'fruit' ? [-1.1, 1.1] : [-1.3, 0, 1.3];
  const per = gewas === 'fruit' ? 2 : 4;
  for (const z of rijen) {
    for (let i = 0; i < per; i++) {
      const x = gewas === 'fruit' ? -1.1 + i * 2.2 : -1.5 + i * 1.0;
      if (gewas === 'fruit') { b.cyl(x, 0.6, z, 0.1, 1.0, BRUIN, 5); b.bol(x, 1.5, z, 0.6, 0x4f8f3a); b.bol(x + 0.3, 1.45, z + 0.2, 0.16, color); }
      else if (gewas === 'graan') { b.cyl(x, 0.6, z, 0.04, 1.0, color, 3, 0.04, 0.15); b.kegel(x, 1.3, z, 0.16, 0.5, 0xe6c860, 5); }
      else if (gewas === 'gras') { b.kegel(x, 0.4, z, 0.4, 0.55, color, 5); b.kegel(x + 0.3, 0.3, z + 0.2, 0.25, 0.4, 0x7fc15a, 5); }
      else if (gewas === 'bieten') { b.bol(x, 0.28, z, 0.24, color, 1, 0.9, 1); b.kegel(x, 0.6, z, 0.3, 0.45, 0x3f8a3a, 5); }
      else if (gewas === 'uien') { b.bol(x, 0.22, z, 0.2, color); b.kegel(x, 0.6, z, 0.07, 0.6, 0x5fa84a, 4); }
      else { b.bol(x, 0.3, z, 0.3, 0x4a8a3a, 1.2, 0.8, 1.2); b.bol(x + 0.15, 0.2, z, 0.12, color); }   // aardappelen: loof met knol
    }
  }
  return b.bouw();
}

// Een model per sleutel: 'koe', 'schaap', 'kip', 'silo', 'schuur', 'kas', 'veld' of 'veld:<gewas>'. Onbekend geeft null.
export function bouwFarmModel(sleutel) {
  const [naam, deel] = String(sleutel).split(':');
  if (naam === 'koe') return koe();
  if (naam === 'schaap') return schaap();
  if (naam === 'kip') return kip();
  if (naam === 'silo') return silo();
  if (naam === 'schuur') return schuur();
  if (naam === 'kas') return kas();
  if (naam === 'veld') return cropField(CROP_IDS.includes(deel) ? deel : 'graan');
  return null;
}

// Wat vehiclepreview.js als lichaam van een 'farm'-spec bouwt: een boerderijmodel of 'werktuig:<type>' (de bestaande werktuigbouwer, voorkant naar +z). Onbekend geeft null.
export function farmBody(sleutel) {
  const s = String(sleutel);
  if (s.startsWith('werktuig:')) return bouwWerktuig(s.slice(9));
  return bouwFarmModel(s);
}

// Alles weer vrij: de geometrie en het materiaal van een model (de previewcode doet dit ook via disposeMesh).
export function ruimFarmModel(g) {
  if (!g) return;
  if (g.parent) g.parent.remove(g);
  g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
}
export const driehoeken = (g) => { let n = 0; g.traverse((o) => { if (o.geometry) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return n; };
