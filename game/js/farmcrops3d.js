// De gewassen, voren en stoppels van je velden in de wereld (#985). Elk gewas heeft per groeistadium (zaailing, groeiend, bijna rijp, rijp) een
// eigen kleine, samengevoegde vorm met vertexkleur: één geometrie per gewas en stadium, nooit een mesh per plant (de velden zijn InstancedMesh).
// Geen nieuwe shaders of lichten: MeshLambertMaterial met vertexColors. De vormen zijn laag-poly (30 tot 60 driehoeken) en zomers.
// De rij- en celindeling en de status komen van boerderijwereld.js en farmstatus.js; dit bestand maakt alleen geometrie en materiaal.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { STADIA } from './farmstatus.js';

const cache = new Map();
const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(1, 1, 1);

// Voegt een basisvorm met plaats, draaiing (x, y, z in radialen), schaal en kleur toe aan de lijsten (niet-geïndexeerd).
function voegToe(lijst, geo, x, y, z, rx, ry, rz, sx, sy, sz, kleur) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  m4.compose(v3.set(x, y, z), q4.setFromEuler(e4.set(rx, ry, rz)), s3.set(sx, sy, sz));
  g.applyMatrix4(m4);
  const c = new THREE.Color(kleur);
  const n = g.attributes.position.count;
  const kl = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { kl[i * 3] = c.r; kl[i * 3 + 1] = c.g; kl[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(kl, 3));
  g.deleteAttribute('uv');
  lijst.push(g);
}
function voeg(lijst) {
  const delen = lijst.filter(Boolean);
  const totaal = delen.reduce((a, g) => a + g.attributes.position.count, 0);
  const pos = new Float32Array(totaal * 3), nor = new Float32Array(totaal * 3), kl = new Float32Array(totaal * 3);
  let o = 0;
  for (const g of delen) {
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); kl.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
  }
  const uit = new THREE.BufferGeometry();
  uit.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  uit.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  uit.setAttribute('color', new THREE.BufferAttribute(kl, 3));
  return uit;
}

const KEGEL = (r, h, n = 5) => new THREE.ConeGeometry(r, h, n, 1, true).translate(0, h / 2, 0);   // zonder bodem: de voet zit in de grond   // staat met de voet op y = 0
const BOL = (r) => new THREE.IcosahedronGeometry(r, 0);
const lerpHex = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, t))).getHex();

// Per gewas en stadium (0 zaailing .. 3 rijp): de vorm van één plant op ware grootte; de hoogte is in meters.
function bouwPlant(id, gewas, stadium) {
  const d = [];
  const t = stadium / 3;            // 0 .. 1 door de stadia
  const blad = lerpHex(gewas.jong, gewas.rijp, t);
  const hoek = [0, 1.26, 2.51, 3.77, 5.03];
  switch (gewas.vorm) {
    case 'struik': { // aardappelen: een lage bol van loof; bijna rijp en rijp slaat het loof om naar geel
      const hoogte = [0.12, 0.26, 0.38, 0.34][stadium];
      const loof = stadium >= 2 ? lerpHex(0x6aa043, 0xb7b04a, stadium === 3 ? 1 : 0.4) : blad;
      const n = stadium === 0 ? 2 : 3;
      for (let i = 0; i < n; i++) voegToe(d, BOL(hoogte * 0.55), Math.cos(hoek[i]) * hoogte * 0.45, hoogte * 0.5, Math.sin(hoek[i]) * hoogte * 0.45, 0, hoek[i], 0, 1, 0.75, 1, loof);
      if (stadium === 3) voegToe(d, BOL(0.1), 0.12, 0.05, 0.06, 0, 0, 0, 1.3, 0.8, 1, 0xb58a52);   // een knol komt boven de grond
      break;
    }
    case 'kegel': { // bieten (en uien): bladwaaier boven een wortel of bol die tijdens het groeien boven de grond komt
      const hoogte = [0.1, 0.24, 0.36, 0.42][stadium];
      const n = stadium === 0 ? 3 : 5;
      for (let i = 0; i < n; i++) voegToe(d, KEGEL(0.07 + 0.03 * stadium, hoogte, 4), Math.cos(hoek[i]) * 0.07, 0.04, Math.sin(hoek[i]) * 0.07, 0.35 * Math.cos(hoek[i]), 0, -0.35 * Math.sin(hoek[i]), 1, 1, 1, blad);
      if (stadium >= 1) {
        const knol = id === 'uien' ? 0xc9a24f : 0xb8587a;
        voegToe(d, BOL(0.06 + 0.045 * stadium), 0, 0.02 + 0.03 * stadium, 0, 0, 0, 0, 1, 0.9, 1, knol);
      }
      break;
    }
    default: { // halm: graan en gras, een bosje stengels; graan krijgt een aar en wordt goud, gras blijft kort en groen
      const gras = id === 'gras';
      const hoogte = gras ? [0.1, 0.2, 0.3, 0.38][stadium] : [0.14, 0.4, 0.75, 0.95][stadium];
      const n = stadium === 0 ? 3 : 5;
      const halm = gras ? blad : stadium === 3 ? 0xd9b84a : stadium === 2 ? lerpHex(0x8fb04a, 0xd2bd52, 0.5) : blad;
      for (let i = 0; i < n; i++) {
        const x = Math.cos(hoek[i]) * 0.1, z = Math.sin(hoek[i]) * 0.1;
        voegToe(d, KEGEL(gras ? 0.045 : 0.03, hoogte, 3), x, 0, z, 0.18 * Math.sin(hoek[i]), 0, -0.18 * Math.cos(hoek[i]), 1, 1, 1, halm);
        if (!gras && stadium >= 2) voegToe(d, KEGEL(0.04, stadium === 3 ? 0.2 : 0.14, 3), x * 1.15, hoogte * 0.92, z * 1.15, 0, 0, 0, 1, 1, 1, stadium === 3 ? 0xe6c75a : 0xa6bb52);
      }
    }
  }
  return voeg(d);
}

// De vorm van één plant van dit gewas in dit stadium (0..3), gecachet.
export function plantGeometrie(id, gewas, stadium) {
  const s = Math.max(0, Math.min(3, stadium | 0));
  const sl = `${id}:${s}`;
  let g = cache.get(sl);
  if (!g) { g = bouwPlant(id, gewas, s); cache.set(sl, g); }
  return g;
}

// Een stoppel: een kort stoppeltje na het maaien; zelfde geometrie voor elk gewas, de kleur volgt de soort.
let stoppelGeo = null;
export function stoppelGeometrie() {
  if (!stoppelGeo) {
    const d = [];
    for (let i = 0; i < 4; i++) voegToe(d, KEGEL(0.035, 0.14, 3), Math.cos(i * 1.6) * 0.12, 0, Math.sin(i * 1.6) * 0.12, 0.1, 0, 0.1, 1, 1, 1, 0xc9b062);
    stoppelGeo = voeg(d);
  }
  return stoppelGeo;
}

// De voren: een lage aarden rug over de lengte van één cel (5 m). In 5 banen per rij voor een geploegd veld.
let vorenGeo = null;
export function voorGeometrie(lengte = 5) {
  if (!vorenGeo) {
    const d = [];
    voegToe(d, new THREE.BoxGeometry(lengte * 0.96, 0.16, 0.34), 0, 0.08, 0, 0, 0, 0, 1, 1, 1, 0xffffff);
    vorenGeo = voeg(d);
  }
  return vorenGeo;
}

// Hoe dicht en hoe groot de plantjes staan: lijnen (dwars op de rij, in m), stap (langs de rij, in m) en schaal; per gewas, zodat een veld er als dat gewas uitziet.
const LAYOUT = {
  aardappelen: { lijnen: [-2.6, -1.3, 0, 1.3, 2.6], stap: 1.8, schaal: 1.35 },
  bieten: { lijnen: [-2.6, -1.3, 0, 1.3, 2.6], stap: 1.8, schaal: 1.3 },
  uien: { lijnen: [-2.6, -1.3, 0, 1.3, 2.6], stap: 1.8, schaal: 1.3 },
  graan: { lijnen: [-2.8, -1.4, 0, 1.4, 2.8], stap: 1.6, schaal: 1.15 },
  gras: { lijnen: [-2.8, -1.4, 0, 1.4, 2.8], stap: 1.6, schaal: 1.2 },
};
export const plantLayout = (id) => LAYOUT[id] || { lijnen: [-2.2, 0, 2.2], stap: 2.5, schaal: 1 };

export const plantMateriaal = () => new THREE.MeshLambertMaterial({ vertexColors: true });
export const STADIUM_NAMEN = STADIA;
