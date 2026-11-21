import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { markShared } from './pixelart3d.js';
import { dsWereld } from './worldpalette.js';

// Kleine procedurele modellen voor de Spullen-viewer (#1086), voor alles wat shopmodels3d.js (eten, meubels, onderdelen) en
// models3d_people.js (wapens, personen) niet al kent: geld, vis, kaarten en onderdelen van de Escapade. Eén generator per
// soort, met parameters, zodat varianten (29 vissoorten, drie geldstapels) uit dezelfde functie komen. Alleen verzonnen of
// generieke vormen, geen letters of merken. Eenheden: ruwweg 1 = 10 cm; de viewer past het kader aan op de omhullende bol.
// Materialen zijn gedeeld per kleur (markShared) en lopen door dsWereld (het wereldpalet); geometrie hoort bij de mesh en gaat
// weg bij dispose. De parameters en kleuren van een item komen uit spullen3d.js (puur, zonder three).

const mats = new Map();
function mat(color, roughness = 0.7, metalness = 0) {
  const c = dsWereld(color);
  const k = `${c}|${roughness}|${metalness}`;
  let m = mats.get(k);
  if (!m) { m = markShared(new THREE.MeshStandardMaterial({ color: c, roughness, metalness })); mats.set(k, m); }
  return m;
}
function glow(color, intensity = 0.9) {
  const k = `glow|${color}|${intensity}`;
  let m = mats.get(k);
  if (!m) { m = markShared(new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 })); mats.set(k, m); }
  return m;
}

function add(g, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  g.add(o);
  return o;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, n = 14) => new THREE.CylinderGeometry(rt, rb, h, n);
const ball = (r, n = 10) => new THREE.SphereGeometry(r, n, Math.max(5, Math.round(n * 0.7)));

const METAAL = 0xb8bec4;
const DONKER = 0x1b1c1f;
const GEEL = 0xe8c93a;

// Een stapel biljetten (gewone gekleurde vellen met een bandje, zonder opdruk) en munten; het niveau (0 tot 3) bepaalt hoeveel.
function money(g, { niveau = 1 } = {}) {
  const n = Math.max(0, Math.min(3, Math.round(niveau)));
  const papier = [0x7fae78, 0x6e9ec4, 0xd8a24a];
  const pile = (x, z, lagen, kleur, rot) => {
    const h = 0.12 * lagen;
    add(g, box(2.6, h, 1.3), mat(kleur, 0.9), x, h / 2, z, 0, rot);
    add(g, box(0.5, h + 0.04, 1.34), mat(0xe8e2d0, 0.9), x, h / 2, z, 0, rot);
  };
  pile(0, 0, 3 + n * 3, papier[0], 0);
  if (n >= 1) pile(-0.2, 1.5, 4 + n * 2, papier[1], 0.12);
  if (n >= 2) pile(0.35, -1.5, 8, papier[2], -0.1);
  const munt = cyl(0.42, 0.42, 0.08, 16);
  const munten = 3 + n * 3;
  for (let i = 0; i < munten; i++) {
    const hoog = i % 3;
    const a = i * 2.2;
    add(g, munt, mat(i % 2 ? 0xd8b040 : 0xc8ccd0, 0.35, 0.8), 2.4 + Math.cos(a) * 0.35 * (i < 3 ? 0 : 1) + (i % 3) * 0.1, 0.04 + hoog * 0.09, 0.6 + Math.sin(a) * 0.5 * (i < 3 ? 0 : 1));
  }
}

// Vis: één generator voor alle soorten. vorm: 'spil' (voorn, baars), 'plat' (bot, schol, tong), 'slang' (paling, prik). Alles in dezelfde
// kleurgroepen: rug, buik, vinnen, en een accent voor strepen of stippen. Neus naar +x.
function vis(g, p) {
  const len = 5 * (p.len || 1), h = len * (p.h || 0.3), w = h * (p.vorm === 'plat' ? 1 : 0.55);
  const rug = mat(p.rug ?? 0x7a8a7a, 0.45, 0.1), buik = mat(p.buik ?? 0xd8dcd4, 0.45, 0.1), vin = mat(p.vin ?? p.rug ?? 0x7a8a7a, 0.6);
  if (p.vorm === 'slang') {
    const n = 16, r0 = Math.max(0.12, h * 0.5);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = len / 2 - t * len;
      const r = r0 * (i === 0 ? 1.15 : 1 - t * 0.45);
      add(g, ball(r, 8), i % 2 ? buik : rug, x, 0.5 + r, Math.sin(t * Math.PI * 3) * len * 0.07);
    }
    add(g, ball(0.06, 6), mat(0x050505), len / 2 - 0.1, 0.5 + r0 * 1.5, r0 * 0.55);
    add(g, ball(0.06, 6), mat(0x050505), len / 2 - 0.1, 0.5 + r0 * 1.5, -r0 * 0.55);
    return;
  }
  if (p.vorm === 'plat') {
    // op de zij op de bodem: een platte ellips met een franje, beide ogen boven
    const dik = Math.max(0.12, len * 0.06);
    add(g, ball(1, 14), rug, 0, dik, 0).scale.set(len * 0.46, dik, len * 0.3);
    add(g, ball(1, 14), vin, 0, dik * 0.6, 0).scale.set(len * 0.5, dik * 0.5, len * 0.34);
    add(g, cone3(len * 0.16, len * 0.26), vin, -len * 0.55, dik, 0, 0, 0, -Math.PI / 2).scale.set(1, 1, 0.5);
    for (const z of [-1, 1]) {
      add(g, ball(0.2, 8), mat(0xf0ede4), len * 0.3, dik * 2, z * len * 0.07);
      add(g, ball(0.1, 6), mat(0x050505), len * 0.33, dik * 2.2, z * len * 0.07);
    }
    if (p.accent) for (let i = 0; i < 6; i++) add(g, ball(0.18, 6), mat(p.accent, 0.6), len * (0.2 - i * 0.12), dik * 1.9, Math.sin(i * 2.3) * len * 0.12).scale.y = 0.4;
    return;
  }
  const y0 = 0.4 + h / 2;
  add(g, ball(1, 14), rug, 0, y0, 0).scale.set(len / 2, h / 2, w / 2);
  add(g, ball(1, 12), buik, 0, y0 - h * 0.17, 0).scale.set(len * 0.47, h * 0.34, w * 0.46);
  add(g, cone3(h * 0.6, len * 0.24), vin, -len / 2 - len * 0.06, y0, 0, 0, 0, -Math.PI / 2).scale.set(1, 1, 0.22); // staart
  add(g, cone3(len * 0.1, h * 0.4), vin, len * 0.02, y0 + h * 0.52, 0).scale.set(1, 1, 0.2); // rugvin
  for (const z of [-1, 1]) {
    add(g, ball(1, 7), vin, len * 0.2, y0 - h * 0.2, z * w * 0.46).scale.set(len * 0.08, h * 0.05, h * 0.12);
    add(g, ball(h * 0.11, 8), mat(0xf0ede4), len * 0.36, y0 + h * 0.1, z * w * 0.4);
    add(g, ball(h * 0.06, 6), mat(0x050505), len * 0.375, y0 + h * 0.1, z * w * 0.46);
  }
  if (p.bek) add(g, box(len * 0.18, h * 0.12, w * 0.55), buik, len * 0.5, y0 - h * 0.05, 0); // snoekbek
  if (p.snor) for (const z of [-1, 1]) add(g, cyl(0.025, 0.02, len * 0.12, 4), vin, len * 0.5, y0 - h * 0.2, z * w * 0.2, Math.PI / 2, 0, 0);
  if (p.strepen) for (let i = 0; i < 5; i++) add(g, box(len * 0.04, h * 0.7, w * 1.02), mat(p.strepen, 0.6), len * (0.24 - i * 0.11), y0 + h * 0.02, 0);
}
// een driehoekig prisma als vin: de punt wijst langs +y
const cone3 = (r, hoogte) => new THREE.ConeGeometry(r, hoogte, 3);

// Een opschrijfboekje met een vergrootglas ervoor: de aanwijzingen van het verhaal (zonder tekst op het boekje).
function aanwijzing(g) {
  add(g, box(2.4, 0.3, 3.2), mat(0x2f5c8a, 0.8), 0, 0.15, 0);
  add(g, box(2.2, 0.2, 3.0), mat(0xece6d6, 0.9), 0.05, 0.4, 0);
  add(g, box(0.18, 0.34, 3.24), mat(0x1b1c1f, 0.6), -1.15, 0.3, 0);
  add(g, box(0.18, 0.04, 2.6), mat(0xc8261e, 0.6), 0.9, 0.52, 0.1); // lint
  add(g, new THREE.TorusGeometry(0.85, 0.12, 8, 20), mat(0x8a5a2a, 0.5, 0.4), 0.7, 1.3, 1.3, Math.PI / 2 - 0.5, 0, 0);
  add(g, cyl(0.78, 0.78, 0.04, 20), new THREE.MeshStandardMaterial({ color: 0xcfe6f0, transparent: true, opacity: 0.35, roughness: 0.1 }), 0.7, 1.3, 1.3, -0.5, 0, 0);
  add(g, cyl(0.1, 0.12, 1.4, 8), mat(0x3a2a1a, 0.7), 1.3, 0.75, 2.2, 0.9, 0.2, 0.3);
}

// Een dichte brief met een rode lakzegel: een geheimpje, we verklappen niets.
function secret(g) {
  add(g, box(3.2, 0.12, 2.1), mat(0xe8e0c8, 0.9), 0, 0.06, 0);
  add(g, cone3(1.55, 1.0), mat(0xd8cfb4, 0.9), 0, 0.15, 0.55, Math.PI / 2, 0, Math.PI).scale.set(1, 1, 0.12);
  add(g, cyl(0.38, 0.38, 0.1, 14), mat(0xa81e1e, 0.4), 0, 0.22, 0.2);
  add(g, ball(0.2, 8), mat(0xc8261e, 0.4), 0, 0.28, 0.2).scale.y = 0.4;
}

// Het motorblok van de Escapade: blok, vier cilinders, klepdeksel en een paar slangen.
function engine(g) {
  add(g, box(3.4, 1.2, 1.8), mat(0x6a7078, 0.4, 0.7), 0, 0.6, 0);
  add(g, box(3.2, 0.4, 1.6), mat(0x3a3e44, 0.5, 0.5), 0, 1.4, 0);
  for (let i = 0; i < 4; i++) add(g, box(0.5, 0.35, 1.4), mat(0xc8261e, 0.4, 0.3), -1.2 + i * 0.8, 1.77, 0);
  for (let i = 0; i < 4; i++) add(g, cyl(0.13, 0.13, 0.7, 8), mat(METAAL, 0.3, 0.9), -1.2 + i * 0.8, 1.4, 1.0, Math.PI / 2);
  add(g, cyl(0.55, 0.55, 0.3, 16), mat(0x2a2c30, 0.5), 2.0, 0.7, 0, 0, 0, Math.PI / 2); // poelie
  add(g, new THREE.TorusGeometry(0.5, 0.07, 6, 14, Math.PI * 1.4), mat(DONKER, 0.9), -2.0, 1.6, 0.4, 0, 1.2, 0);
}

// Een brede band op een velg met vijf spaken (Brede banden); bandBreedte en velgkleur uit de data.
function bredeband(g, { velg = 0xc8ccd0 } = {}) {
  const buis = new THREE.TorusGeometry(1.35, 0.62, 10, 28);
  add(g, buis, mat(0x1b1c1f, 0.95), 0, 1.9, 0).scale.z = 0.9;
  add(g, cyl(0.95, 0.95, 0.9, 20), mat(velg, 0.3, 0.9), 0, 1.9, 0, Math.PI / 2);
  for (let i = 0; i < 5; i++) add(g, box(0.16, 1.6, 0.3), mat(0x9aa0a6, 0.3, 0.9), 0, 1.9, 0.4, 0, 0, (i * Math.PI * 2) / 5);
  add(g, cyl(0.2, 0.2, 1.0, 8), mat(DONKER, 0.4), 0, 1.9, 0.1, Math.PI / 2);
}

// Sperdifferentieel: tandwielhuis, krans en twee assen.
function sperdiff(g) {
  add(g, cyl(1.1, 1.1, 0.7, 24), mat(0x7a7f86, 0.4, 0.8), 0, 1.2, 0, Math.PI / 2);
  add(g, cyl(1.25, 1.25, 0.18, 24), mat(METAAL, 0.3, 0.9), 0, 1.2, 0.5, Math.PI / 2);
  for (let i = 0; i < 12; i++) add(g, box(0.18, 0.22, 0.2), mat(METAAL, 0.3, 0.9), Math.cos((i * Math.PI) / 6) * 1.3, 1.2 + Math.sin((i * Math.PI) / 6) * 1.3, 0.5);
  for (const s of [-1, 1]) add(g, cyl(0.22, 0.22, 1.6, 10), mat(0x3a3e44, 0.4, 0.8), s * 1.4, 1.2, 0, 0, 0, Math.PI / 2);
  add(g, cyl(0.3, 0.3, 0.7, 10), mat(0x3a3e44, 0.4, 0.8), 0, 1.2, -0.9, Math.PI / 2);
}

// Sportuitlaat: een gebogen pijp naar een demper met een afgeschuinde punt.
function uitlaat(g) {
  const m = mat(0xc0c4c8, 0.25, 0.9);
  add(g, cyl(0.2, 0.2, 1.4, 12), m, -1.9, 0.9, 0); // pijp omlaag
  add(g, ball(0.28, 8), m, -1.9, 0.2, 0); // knik
  add(g, cyl(0.2, 0.2, 2.0, 12), m, -0.9, 0.2, 0, 0, 0, Math.PI / 2); // pijp naar achteren
  add(g, cyl(0.55, 0.55, 2.4, 18), mat(0x9a9ea2, 0.3, 0.9), 1.0, 0.2, 0, 0, 0, Math.PI / 2);
  add(g, cyl(0.58, 0.58, 0.1, 18), mat(0x3a3e44, 0.4, 0.8), 2.25, 0.2, 0, 0, 0, Math.PI / 2);
  add(g, cyl(0.3, 0.3, 0.7, 14), mat(0x6a5a4a, 0.3, 0.9), 2.5, 0.2, 0, 0, 0, Math.PI / 2);
  add(g, box(1.0, 0.1, 0.5), mat(METAAL, 0.3, 0.9), 0.2, 0.9, 0); // beugel
}

// Knijffles met kegeldop (Grunneger mosterd), de kleur van de saus uit de data.
function mosterd(g, { saus = 0xe0b020 } = {}) {
  add(g, cyl(0.7, 0.8, 2.0, 16), mat(saus, 0.4), 0, 1.0, 0);
  add(g, cyl(0.5, 0.7, 0.4, 16), mat(saus, 0.4), 0, 2.2, 0);
  add(g, cyl(0.18, 0.5, 0.5, 12), mat(0xc8261e, 0.4), 0, 2.65, 0);
  add(g, box(1.4, 0.7, 0.06), mat(0xf0ede4, 0.6), 0, 1.0, 0.76).rotation.y = 0;
  add(g, box(1.4, 0.18, 0.07), mat(0x1e5ea8, 0.6), 0, 1.1, 0.77);
}

// Een koperen fietsbel-achtige bel op een beugel (de bel die "moi" zegt): draaivorm, klepel, hamer.
function bel(g, { kleur = 0xd8b040 } = {}) {
  const pr = [[0, 0], [1.0, 0.0], [1.15, 0.12], [1.1, 0.45], [0.8, 0.95], [0.3, 1.25], [0, 1.3]].map(([x, y]) => new THREE.Vector2(x, y));
  add(g, new THREE.LatheGeometry(pr, 20), mat(kleur, 0.3, 0.8), 0, 0.5, 0);
  add(g, ball(0.2, 8), mat(0x3a2a1a, 0.6), 0, 0.45, 0);
  add(g, cyl(0.1, 0.1, 0.5, 8), mat(0x3a2a1a, 0.6), 0, 1.95, 0);
  add(g, box(2.4, 0.2, 0.6), mat(0x3a3e44, 0.5, 0.5), 0, 0.2, 0);
  add(g, ball(0.28, 8), mat(0xc8261e, 0.5), 1.15, 0.5, 0);
}

// Een neon-meeuw: platte meeuwsilhouet van blokken met een gloeiende rand, op een voetplaat.
function neonmeeuw(g, { kleur = 0xff4fa8 } = {}) {
  add(g, box(3.4, 0.14, 1.4), mat(0x2a2c30, 0.5, 0.4), 0, 0.07, 0);
  const line = glow(kleur);
  add(g, ball(0.5, 10), line, 0, 1.2, 0).scale.set(1.5, 0.7, 0.5);
  add(g, ball(0.28, 8), line, 0.85, 1.55, 0);
  add(g, cone3(0.14, 0.5), glow(0xf2c14a), 1.35, 1.5, 0, 0, 0, -Math.PI / 2);
  for (const s of [-1, 1]) {
    add(g, box(0.18, 0.1, 1.9), line, -0.2, 1.55, s * 0.95, s * 0.2, 0.2 * s, 0).rotation.x = s * 0.5;
    add(g, box(0.16, 0.08, 1.0), line, -0.2, 2.1, s * 1.75, s * 0.4, 0, 0);
  }
  add(g, cyl(0.05, 0.05, 0.9, 6), mat(0x3a3e44, 0.5), 0, 0.5, 0);
}

// ---- Ronde 2 (spullen-r2): herkenbare modellen voor wat eerst een kaal winkelblokje was (12 tot 150 driehoeken). Geen tekst of merk;
// elk ding heeft een eigen silhouet en twee tot vier materialen. Eenheden zoals hierboven (1 = 10 cm).

// Spaarkaart: twee kaarten waaiervormig, voorop een stempelraster (gevulde en lege rondjes) en een lichte strook.
function spaarkaart(g) {
  add(g, box(5.4, 0.1, 3.4), mat(0x2f5c8a, 0.5), 0.35, 0.05, -0.15, 0, 0.22);
  add(g, box(5.4, 0.12, 3.4), mat(0xc23f78, 0.5), 0, 0.16, 0);
  add(g, box(5.4, 0.14, 0.7), mat(0xf0ede4, 0.6), 0, 0.17, -1.25);
  for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) {
    const vol = r * 5 + i < 6;
    add(g, cyl(0.3, 0.3, vol ? 0.1 : 0.04, 14), vol ? mat(0xe8c93a, 0.35, 0.7) : mat(0xf0ede4, 0.6), -2.0 + i * 1.0, 0.26, 0.25 + r * 1.0);
  }
  add(g, box(0.7, 0.06, 0.5), mat(0xe8c93a, 0.3, 0.8), 2.1, 0.25, 1.35); // chipje
}

// Kauwgom: een pakje met een opengescheurde bovenkant, folie en drie waaiervormige stukjes.
function kauwgom(g) {
  add(g, box(1.9, 0.5, 3.6), mat(0x1e5ea8, 0.5), 0, 0.25, 0);
  add(g, box(1.94, 0.3, 1.2), mat(0xe8f4f8, 0.4), 0, 0.26, 0.9);
  add(g, box(1.6, 0.05, 0.9), mat(0xc8ced2, 0.25, 0.85), 0, 0.52, -1.45);
  for (let i = 0; i < 3; i++) add(g, box(1.3, 0.06, 2.4), mat(i % 2 ? 0xe8f4f8 : 0xcfe9ee, 0.5), 0, 0.62 + i * 0.07, -1.9, -0.25 - i * 0.12, (i - 1) * 0.12);
  add(g, box(0.5, 0.52, 3.64), mat(0x3fb8c8, 0.5), -0.55, 0.26, 0);
  add(g, box(0.18, 0.54, 3.64), mat(0xe8f4f8, 0.4), 0.55, 0.27, 0); // twee strepen over de lengte
  add(g, box(1.9, 0.06, 0.3), mat(0xc8ced2, 0.25, 0.85), 0, 0.53, -1.8, -0.2, 0, 0); // gescheurde folierand
  add(g, ball(0.2, 8), mat(0x6ad0a0, 0.5), 0.5, 0.55, 1.1).scale.set(1.2, 0.4, 1.0); // muntblaadje
}

// Pakket: een kartonnen doos met plakband kruislings, een adreslabel (zonder tekst) en een strikje.
function pakket(g) {
  add(g, box(3.6, 2.6, 2.8), mat(0xb08a58, 0.85), 0, 1.3, 0);
  add(g, box(0.55, 0.05, 2.84), mat(0xd8c090, 0.4), 0, 2.62, 0); // tape over de bovenkant
  add(g, box(0.55, 2.62, 0.05), mat(0xd8c090, 0.4), 0, 1.3, 1.42);
  add(g, box(1.2, 0.8, 0.04), mat(0xf0ede4, 0.7), -0.9, 1.5, 1.44);
  for (let i = 0; i < 3; i++) add(g, box(0.8 - i * 0.15, 0.06, 0.05), mat(0x4a4a50, 0.7), -0.9, 1.7 - i * 0.2, 1.47);
  add(g, box(3.64, 0.14, 0.4), mat(0x9a7648, 0.9), 0, 2.45, -0.9, 0, 0, 0.02); // flap
  add(g, new THREE.TorusGeometry(0.28, 0.04, 6, 12), mat(0xc8261e, 0.7), 0.9, 2.8, 0, Math.PI / 2, 0, 0);
}

// Televisie: een kijkdoos met scherm, twee knoppen, voetjes en een antenne.
function tv(g) {
  add(g, box(4.6, 3.2, 2.4), mat(0x2a2c30, 0.5), 0, 2.1, 0);
  add(g, box(3.5, 2.4, 0.08), glow(0x6a9ac0, 0.55), -0.3, 2.15, 1.24);
  add(g, box(0.7, 2.4, 0.08), mat(0x3a3e44, 0.5), 1.75, 2.15, 1.24);
  for (let i = 0; i < 2; i++) add(g, cyl(0.17, 0.17, 0.14, 10), mat(0xb8bec4, 0.3, 0.8), 1.75, 2.7 - i * 0.55, 1.33, Math.PI / 2);
  add(g, box(0.5, 0.3, 0.06), mat(0x5a5f66, 0.5), 1.75, 1.3, 1.28);
  for (const x of [-1.8, 1.8]) add(g, box(0.5, 0.35, 1.8), mat(0x1b1c1f, 0.7), x, 0.18, 0);
  add(g, cyl(0.05, 0.05, 2.4, 6), mat(METAAL, 0.3, 0.9), -0.7, 4.6, 0, 0, 0, 0.55);
  add(g, cyl(0.05, 0.05, 2.4, 6), mat(METAAL, 0.3, 0.9), 0.7, 4.6, 0, 0, 0, -0.55);
  add(g, cyl(0.45, 0.6, 0.3, 12), mat(0x1b1c1f, 0.6), 0, 3.85, 0);
}

// EHBO-doos: groen koffertje met wit kruis, hengsel, twee sluitingen en een rolletje verband ernaast.
function ehbo(g) {
  add(g, box(4.0, 2.8, 1.6), mat(0x1e9e56, 0.5), 0, 1.4, 0);
  add(g, box(4.04, 0.12, 1.64), mat(0x137a41, 0.5), 0, 1.5, 0);
  add(g, box(1.8, 0.5, 0.06), mat(0xf0ede4, 0.5), 0, 1.7, 0.83);
  add(g, box(0.5, 1.8, 0.06), mat(0xf0ede4, 0.5), 0, 1.7, 0.83);
  add(g, new THREE.TorusGeometry(0.7, 0.09, 6, 12, Math.PI), mat(0x2a2c30, 0.5), 0, 2.8, 0);
  for (const x of [-1.4, 1.4]) add(g, box(0.45, 0.4, 0.14), mat(METAAL, 0.3, 0.9), x, 1.5, 0.84);
  add(g, cyl(0.45, 0.45, 1.2, 14), mat(0xf0ede4, 0.8), 2.9, 0.45, 0.6, 0, 0, Math.PI / 2);
  add(g, cyl(0.3, 0.3, 1.24, 12), mat(0xd8b898, 0.8), 2.9, 0.45, 0.6, 0, 0, Math.PI / 2);
}

// Koek: een stapeltje ronde koeken met een gegolfde rand, amandelschaafsel en suikerkorrels.
function koek(g) {
  for (let i = 0; i < 3; i++) {
    const y = 0.22 + i * 0.4;
    add(g, cyl(1.4 - i * 0.05, 1.45 - i * 0.05, 0.36, 18), mat(0x8a4a1e, 0.8), i * 0.1, y, 0, 0, i * 0.5);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + i;
      add(g, ball(0.17, 6), mat(0x6a3414, 0.8), Math.cos(a) * 1.38 + i * 0.1, y, Math.sin(a) * 1.38);
    }
  }
  for (let k = 0; k < 6; k++) add(g, box(0.5, 0.05, 0.22), mat(0xe8d49a, 0.8), Math.cos(k * 1.1) * 0.7 + 0.2, 1.42, Math.sin(k * 1.1) * 0.7, 0, k * 0.9);
  add(g, ball(0.1, 6), mat(0xf0ede4, 0.6), 0.3, 1.45, 0.2);
}

// Drop: een opgerolde dropwiel met geel hart, een handvol ruitjes en twee zeshoekige munten.
function drop(g) {
  const zwart = mat(0x151212, 0.3);
  add(g, new THREE.TorusGeometry(1.0, 0.35, 8, 20), zwart, 0, 0.35, 0, Math.PI / 2, 0, 0);
  add(g, new THREE.TorusGeometry(0.55, 0.3, 8, 16), zwart, 0, 0.35, 0, Math.PI / 2, 0, 0);
  add(g, ball(0.3, 8), mat(0xe8c93a, 0.4), 0, 0.4, 0);
  for (let i = 0; i < 4; i++) add(g, box(0.9, 0.35, 0.9), zwart, 2.2 + (i % 2) * 0.5, 0.18 + Math.floor(i / 2) * 0.35, -0.8 + i * 0.5, 0, 0.78 + i * 0.3);
  add(g, cyl(0.6, 0.6, 0.22, 6), mat(0x23201f, 0.3), -2.2, 0.12, 0.6);
  add(g, cyl(0.6, 0.6, 0.22, 6), mat(0x23201f, 0.3), -2.0, 0.34, 0.7, 0, 0.5);
  add(g, ball(0.1, 5), mat(0xf0ede4, 0.7), 0.7, 0.72, 0.2);
  add(g, ball(0.09, 5), mat(0xf0ede4, 0.7), -0.6, 0.72, -0.5);
}

// Accu: blok met groene bovenband, twee polen met kapjes, een draaggreep en vier lampjes.
function accu(g) {
  add(g, box(3.2, 2.2, 1.8), mat(0x1b1c1f, 0.5), 0, 1.1, 0);
  add(g, box(3.3, 0.55, 1.9), mat(0x3fc97a, 0.4), 0, 2.2, 0);
  for (const s of [-1, 1]) {
    add(g, cyl(0.26, 0.3, 0.5, 10), mat(METAAL, 0.3, 0.9), s * 1.0, 2.7, -0.3);
    add(g, cyl(0.31, 0.31, 0.18, 10), mat(s > 0 ? 0xc8261e : 0x2a2c30, 0.5), s * 1.0, 3.0, -0.3);
  }
  add(g, new THREE.TorusGeometry(0.7, 0.08, 6, 12, Math.PI), mat(0x2a2c30, 0.5), 0, 2.5, 0.45);
  for (let i = 0; i < 4; i++) add(g, box(0.45, 0.14, 0.04), glow(0x3fc97a, 0.8), -0.95 + i * 0.63, 1.0, 0.92);
}

// Remschijf: geventileerde schijf met gaten, naaf met bouten en een rode remklauw met twee blokken.
function schijf(g) {
  add(g, cyl(2.4, 2.4, 0.3, 32), mat(0xb8bec4, 0.35, 0.9), 0, 2.6, 0, Math.PI / 2);
  add(g, cyl(0.95, 0.95, 0.7, 20), mat(0x7a7f86, 0.4, 0.8), 0, 2.6, 0, Math.PI / 2);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    add(g, cyl(0.16, 0.16, 0.34, 8), mat(DONKER, 0.9), Math.cos(a) * 1.7, 2.6 + Math.sin(a) * 1.7, 0, Math.PI / 2);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    add(g, cyl(0.09, 0.09, 0.78, 6), mat(0x3a3e44, 0.3, 0.9), Math.cos(a) * 0.6, 2.6 + Math.sin(a) * 0.6, 0, Math.PI / 2);
  }
  add(g, box(1.6, 1.1, 1.1), mat(0xc8261e, 0.4, 0.3), 0, 4.55, 0);
  add(g, box(1.0, 0.4, 0.14), mat(0x3a3e44, 0.6), 0, 3.85, 0);
  add(g, cyl(0.2, 0.2, 0.5, 8), mat(METAAL, 0.3, 0.9), 0.5, 5.2, 0);
}

// Bureau: blad op een ladenblok en een zijpaneel, met laptop, mok en een leeslamp.
function bureau(g) {
  const hout = mat(0xa0764a, 0.65);
  add(g, box(7.0, 0.3, 3.4), hout, 0, 3.4, 0);
  add(g, box(2.2, 3.2, 3.0), mat(0x7a5632, 0.7), -2.3, 1.6, 0);
  for (let i = 0; i < 3; i++) {
    add(g, box(1.9, 0.9, 0.06), mat(0x8a6238, 0.7), -2.3, 0.55 + i * 1.0, 1.52);
    add(g, box(0.7, 0.1, 0.1), mat(METAAL, 0.3, 0.9), -2.3, 0.65 + i * 1.0, 1.6);
  }
  add(g, box(0.3, 3.2, 3.0), hout, 3.2, 1.6, 0);
  add(g, box(2.0, 0.12, 1.4), mat(0x6a6f76, 0.35, 0.7), 0.4, 3.62, 0.3);
  add(g, box(2.0, 1.3, 0.1), mat(0x23262b, 0.4), 0.4, 4.3, -0.4, -0.25, 0, 0);
  add(g, box(1.8, 1.05, 0.04), glow(0x6a9ac0, 0.5), 0.4, 4.3, -0.34, -0.25, 0, 0);
  add(g, cyl(0.28, 0.25, 0.5, 10), mat(0xe8e2d0, 0.6), 2.4, 3.8, 0.8);
  add(g, cyl(0.2, 0.3, 0.12, 10), mat(0x3a3e44, 0.5), 2.7, 3.62, -1.0);
  add(g, cyl(0.04, 0.04, 1.4, 6), mat(0x3a3e44, 0.5), 2.7, 4.3, -1.0, 0, 0, -0.35);
  add(g, cone3(0.4, 0.5), mat(0xe8c93a, 0.5), 2.3, 4.9, -1.0, 0, 0, Math.PI);
}

// Frituurpan: roestvrijstalen kast met twee mandjes (beugel en handgreep), bedieningsknoppen en een controlelampje.
function frituur(g) {
  const staal = mat(0xb8bec4, 0.35, 0.8);
  add(g, box(5.4, 2.6, 3.0), staal, 0, 1.3, 0);
  add(g, box(5.4, 0.25, 3.0), mat(0x8a8e94, 0.4, 0.7), 0, 2.72, 0);
  for (const x of [-1.3, 1.3]) {
    add(g, box(2.1, 0.12, 2.3), mat(0x3a2a14, 0.4), x, 2.86, -0.1);
    add(g, box(1.9, 0.3, 2.1), mat(0x8a8e94, 0.3, 0.8), x, 3.0, -0.1);
    add(g, cyl(0.13, 0.13, 1.7, 8), mat(0x2a2c30, 0.8), x, 3.55, 1.5, Math.PI / 2 + 0.3);
    add(g, box(0.06, 0.6, 2.0), mat(0x6a6f76, 0.4, 0.7), x - 0.9, 3.3, -0.1);
    add(g, box(0.06, 0.6, 2.0), mat(0x6a6f76, 0.4, 0.7), x + 0.9, 3.3, -0.1);
  }
  add(g, box(4.8, 0.9, 0.08), mat(0x2a2c30, 0.5), 0, 1.6, 1.52);
  for (const x of [-1.3, 0, 1.3]) add(g, cyl(0.2, 0.2, 0.16, 10), mat(0xc8261e, 0.5), x, 1.6, 1.6, Math.PI / 2);
  add(g, ball(0.12, 6), glow(0xff6a2a, 0.9), 2.0, 1.9, 1.58);
  for (const x of [-2.4, 2.4]) add(g, cyl(0.2, 0.25, 0.3, 8), mat(0x1b1c1f, 0.7), x, 0.15, 1.2);
}

// Bed: houten frame met hoofd- en voeteneind, matras, deken en twee kussens.
function bed(g) {
  const hout = mat(0x8a5a2a, 0.65);
  add(g, box(6.2, 0.7, 3.6), hout, 0, 0.7, 0);
  for (const [x, z] of [[-2.9, -1.6], [2.9, -1.6], [-2.9, 1.6], [2.9, 1.6]]) add(g, box(0.4, 0.7, 0.4), hout, x, 0.35, z);
  add(g, box(0.3, 2.4, 3.8), hout, -3.1, 1.6, 0);
  add(g, box(0.3, 1.2, 3.8), hout, 3.1, 1.1, 0);
  add(g, box(5.9, 0.7, 3.3), mat(0xf0ede4, 0.9), 0, 1.4, 0);
  add(g, box(3.8, 0.78, 3.4), mat(0x3d6a9a, 0.85), 0.9, 1.45, 0);
  add(g, box(3.8, 0.05, 0.5), mat(0xd8cfb4, 0.9), 0.9, 1.87, 1.5);
  for (const z of [-0.8, 0.8]) add(g, ball(0.7, 8), mat(0xe8e2d0, 0.9), -2.2, 2.0, z).scale.set(1.2, 0.5, 1.0);
}

const BOUWERS = { geld: money, vis, aanwijzing, geheim: secret, motor: engine, bredeband, sperdiff, uitlaat, mosterd, bel, neonmeeuw, spaarkaart, kauwgom, pakket, tv, ehbo, koek, drop, accu, schijf, bureau, frituur, bed };
export const SPUL_TYPES = Object.keys(BOUWERS);

// Het model voor { type, ...parameters }, of null voor een onbekende soort (de viewer valt dan terug op het icoon).
export function buildSpulMesh(spul) {
  const b = spul && BOUWERS[spul.type];
  if (!b) return null;
  const inner = new THREE.Group();
  b(inner, spul);
  const g = new THREE.Group();
  g.add(inner);
  return g;
}

// Het aantal driehoeken van een model, voor de test op het budget.
export function driehoeken(obj) {
  let n = 0;
  obj.traverse((o) => {
    const geo = o.geometry;
    if (!geo) return;
    n += geo.index ? geo.index.count / 3 : (geo.attributes.position ? geo.attributes.position.count / 3 : 0);
  });
  return n;
}
