// Het ene duivenmodel (22-11): een gladde, afgeronde duif met drie detailniveaus. Eén bron voor alle duiven in het spel:
// de speelbare duif, de duiven op de pleinen en in cutscenes (hi, pigeonmode.js), de zwermen (mid, birds.js), de duiven
// en vogels van het weidegebied en het wereldleven (mid en far). Geen dozen: de romp is een gelofte ellipsoïde, de nek
// ronde ringen, de vleugels bestaan uit veren die licht doorbuigen en de poten hebben tenen.
//
// Alles staat in het lichaamsframe van pigeonmode.js (x vooruit, y omhoog, z opzij, romp rond de oorsprong, snavel op
// ca. x = 0,29). pigeonParts() geeft de onderdelen per groep (romp, nek, kop, staart, vleugel, handpennen, poot) in de
// lokale ruimte van die groep, zodat poseBird (pigeonmode.js) en het skelet van wildlife.js ze kunnen bewegen;
// pigeonMerged() en pigeonWingGeometry() geven dezelfde duif als één stuk voor instancing. Elke geometrie heeft position,
// normal, color (hoekpuntkleur) en index; niets hier raakt de scène, dus alles is in node te testen.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Driehoekenbudget per niveau: de ondergrens houdt het model af van een doos met vleugels, de bovengrens van een duurder model.
export const PIGEON_LOD = Object.freeze({
  hi: Object.freeze({ min: 600, max: 1200 }), // speler, cutscenes, hokken (dichtbij)
  mid: Object.freeze({ min: 200, max: 400 }), // zwermen en stadsduiven (middel)
  far: Object.freeze({ min: 80, max: 120 }), // ver weg: nog steeds een vogel, geen blok
});

// Draaipunten van de groepen (lichaamsframe); de vleugel- en pootwaarden gelden voor zijde +1, zijde -1 spiegelt z.
export const PIGEON_PIVOT = Object.freeze({
  head: [0.19, 0.115, 0], tail: [-0.15, 0.012, 0], wing: [0.035, 0.055, 0.055], wingOut: [0, 0, 0.19], legs: [0.02, -0.075, 0], leg: [0, 0, 0.03],
});

export const PIGEON_COLORS = Object.freeze({
  pigeon: { body: 0x8a93a6, breast: 0x949db0, head: 0x7b8497, wing: 0x9ea7ba, bar: 0x2f323a, tip: 0x4f5564, tail: 0x7d8699, band: 0x2b2e36, neck: 0x2f8a64, neck2: 0x7b4a93, beak: 0x2b2b2b, eye: 0xff8c1a, leg: 0xe0663a, cere: 0xe8e6de },
  gull: { body: 0xf4f4f0, breast: 0xf7f7f4, head: 0xf8f8f5, wing: 0xb9bec6, bar: 0xb9bec6, tip: 0x1f1f22, tail: 0xf0f0ec, band: 0xe6e6e2, neck: 0xf4f4f0, neck2: 0xf4f4f0, beak: 0xf2c230, eye: 0xf5e26a, leg: 0xe8b04a, cere: 0xf2c230 },
});

// De kleurvarianten van de stadsduif. 'gevlekt' kleurt er donkere vlekken over; de rest is een andere kleurset.
export const PIGEON_VARIANT_COLORS = Object.freeze({
  grijs: {},
  wit: { body: 0xefeee8, breast: 0xf4f2ec, head: 0xeceae3, wing: 0xf2f1ea, bar: 0xd9d6cb, tip: 0xcfcdc3, tail: 0xe9e7df, band: 0xd4d2c8, neck: 0xe0ddd2, neck2: 0xe6e3da, eye: 0xd9552a, leg: 0xd9776a },
  bruin: { body: 0x8c6a4e, breast: 0x9a7556, head: 0x7a5a42, wing: 0x9a7656, bar: 0x4a3326, tip: 0x3a2a20, tail: 0x6e5240, band: 0x2e2420, neck: 0x3f7a58, neck2: 0x7a4a8a },
  gevlekt: { body: 0x9aa0b0, breast: 0xa6adbd, head: 0x8a92a4, wing: 0xb0b4c2, bar: 0x2f323a, tip: 0x4f5564, tail: 0x8a92a4, spots: true },
});

// Kleurset: een variantnaam (grijs, wit, bruin, gevlekt), een object met kleuren die erover heen gaan, of een getal (de oude "tint": romp, borst en vleugels in die kleur).
// map (optioneel): een functie hex -> hex die elke kleur van de set omzet (de wereldpalet van de wildlife-dieren).
export function pigeonPalette(kind = 'pigeon', variant = null, map = null) {
  const c = { ...(PIGEON_COLORS[kind] || PIGEON_COLORS.pigeon) };
  if (typeof variant === 'number') { c.body = variant; c.wing = variant; c.breast = variant; }
  else if (variant && typeof variant === 'object') Object.assign(c, variant); // een eigen kleurset (vogels van het weidegebied)
  else if (variant && kind === 'pigeon' && PIGEON_VARIANT_COLORS[variant]) Object.assign(c, PIGEON_VARIANT_COLORS[variant]);
  if (map) for (const k of Object.keys(c)) if (typeof c[k] === 'number') c[k] = map(c[k]);
  return c;
}

// --- bouwstenen --------------------------------------------------------------------------------------------------------

const tc = new THREE.Color();
const shade = (hex, k) => tc.setHex(hex).multiplyScalar(k).getHex();

function setColors(geo, hex, spots = false) {
  const p = geo.attributes.position, n = p.count, a = new Float32Array(n * 3);
  const base = new THREE.Color(hex), dark = new THREE.Color(shade(hex, 0.35));
  for (let i = 0; i < n; i++) {
    let c = base;
    if (spots) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const v = Math.sin(x * 91.3 + z * 47.7) * Math.sin(y * 63.1 + x * 29.9 + 1.7) + Math.sin(z * 71 - x * 37) * 0.3;
      if (v > 0.42) c = dark;
    }
    a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}

// kleurverloop langs de eerste as van de ringen (nekring: paars onder, groen boven)
function gradient(geo, hexA, hexB, axis, lo, hi) {
  const p = geo.attributes.position, n = p.count, a = new Float32Array(n * 3);
  const A = new THREE.Color(hexA), B = new THREE.Color(hexB), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const t = Math.min(1, Math.max(0, ((axis === 'y' ? p.getY(i) : p.getX(i)) - lo) / (hi - lo)));
    c.copy(A).lerp(B, t);
    a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}

// Gelofte vorm langs x: ringen {x, cy, ry, rz}; een ring met straal 0 is een punt (de uiteinden), dus gesloten en glad.
function loft(rings, sides) {
  const pos = [], idx = [];
  const vertexBase = [];
  for (const r of rings) {
    vertexBase.push(pos.length / 3);
    if (r.ry <= 1e-6 && r.rz <= 1e-6) { pos.push(r.x, r.cy, 0); continue; }
    for (let j = 0; j < sides; j++) {
      const a = (j / sides) * Math.PI * 2;
      pos.push(r.x, r.cy + Math.sin(a) * r.ry, Math.cos(a) * r.rz);
    }
  }
  for (let i = 0; i < rings.length - 1; i++) {
    const a = vertexBase[i], b = vertexBase[i + 1];
    const pa = rings[i].ry <= 1e-6 && rings[i].rz <= 1e-6, pb = rings[i + 1].ry <= 1e-6 && rings[i + 1].rz <= 1e-6;
    for (let j = 0; j < sides; j++) {
      const j2 = (j + 1) % sides;
      if (pa) idx.push(a, b + j, b + j2);
      else if (pb) idx.push(a + j, b, a + j2);
      else idx.push(a + j, b + j, b + j2, a + j, b + j2, a + j2);
    }
  }
  return indexed(pos, idx);
}

function indexed(pos, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Ellipsoïde met de punt voor en achter op x; sides rond, stacks over de lengte.
function ellip(rx, ry, rz, sides, stacks, cx = 0, cy = 0, cz = 0) {
  const rings = [];
  for (let i = 0; i <= stacks; i++) {
    const a = (i / stacks) * Math.PI;
    const s = i === 0 || i === stacks ? 0 : Math.sin(a);
    rings.push({ x: cx - rx * Math.cos(a), cy, ry: ry * s, rz: rz * s });
  }
  const g = loft(rings, sides);
  if (cz) g.translate(0, 0, cz);
  return g;
}

// Buis tussen twee punten (poot, teen): afgeronde kegelstomp met `sides` zijden, open uiteinden.
function tube(a, b, rA, rB, sides) {
  const pos = [], idx = [];
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length() || 1;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().divideScalar(len));
  const v = new THREE.Vector3();
  for (let k = 0; k < 2; k++) {
    for (let j = 0; j < sides; j++) {
      const an = (j / sides) * Math.PI * 2, r = k ? rB : rA;
      v.set(Math.cos(an) * r, k * len, Math.sin(an) * r).applyQuaternion(q);
      pos.push(a[0] + v.x, a[1] + v.y, a[2] + v.z);
    }
  }
  for (let j = 0; j < sides; j++) { const j2 = (j + 1) % sides; idx.push(j, sides + j, sides + j2, j, sides + j2, j2); }
  return indexed(pos, idx);
}

// Veer langs +x: lengte len, halve breedte w, `segs` stukken; buigt over de lengte door (bend, negatief = hangt naar beneden) en loopt
// rond uit in de punt. Dubbelzijdig, zodat hij van boven en onder gaat zonder dat de materialen dat hoeven te weten.
function feather(len, w, segs, bend, tipFrac, hexBase, hexTip) {
  const pos = [], col = [], idx = [];
  const A = new THREE.Color(hexBase), B = new THREE.Color(hexTip);
  const rows = segs + 1;
  for (let i = 0; i < rows; i++) {
    const t = i / segs, x = len * t, y = bend * t * t;
    const half = i === segs ? 0 : w * Math.pow(1 - Math.pow(t, 2.6), 0.55);
    const c = t > 1 - tipFrac ? B : A;
    if (half <= 1e-6) { pos.push(x, y, 0); col.push(c.r, c.g, c.b); continue; }
    pos.push(x, y, -half, x, y, half);
    col.push(c.r, c.g, c.b, c.r, c.g, c.b);
  }
  let base = 0;
  for (let i = 0; i < segs; i++) {
    const last = i === segs - 1;
    if (last) idx.push(base, base + 2, base + 1);
    else idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    base += 2;
  }
  const g = new THREE.BufferGeometry();
  const n = pos.length / 3;
  const p2 = pos.slice(), i2 = idx.slice(), c2 = col.slice();
  // achterkant: dezelfde hoekpunten opnieuw met omgekeerde winding en omgekeerde normaal
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const nrm = Array.from(g.attributes.normal.array);
  const back = nrm.map((v) => -v);
  const outPos = pos.concat(p2), outCol = col.concat(c2), outNrm = nrm.concat(back);
  const outIdx = idx.concat(i2.map((v) => v + n).reverse());
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(outPos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(outNrm, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(outCol, 3));
  out.setIndex(outIdx);
  return out;
}

const _M = new THREE.Matrix4(), _E = new THREE.Euler(), _Q = new THREE.Quaternion(), _V = new THREE.Vector3(), _S = new THREE.Vector3(1, 1, 1);
const place = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(_V.set(x, y, z), _Q.setFromEuler(_E.set(rx, ry, rz, 'XYZ')), _S);

// geometrie transformeren met correcte winding bij spiegelen (negatieve determinant)
function xform(geo, m) {
  geo.applyMatrix4(m);
  if (m.determinant() < 0 && geo.index) {
    const a = geo.index.array;
    for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; }
  }
  return geo;
}

// --- de duif per niveau ------------------------------------------------------------------------------------------------

const DETAIL = {
  hi: { sides: 12, headSides: 10, headStacks: 7, eye: [6, 4], pupil: [6, 3], coverts: [10, 5], wingBars: true, secondaries: 6, primaries: 5, featherSegs: 2, tailFeathers: 7, legSides: 6, toes: 3, hindToe: true, cere: true, neckSides: 12, torsoRings: 9 },
  mid: { sides: 8, headSides: 6, headStacks: 4, eye: null, pupil: null, coverts: [6, 4], wingBars: false, secondaries: 4, primaries: 4, featherSegs: 1, tailFeathers: 5, legSides: 4, toes: 0, hindToe: false, cere: false, neckSides: 6, torsoRings: 7 },
  far: { sides: 8, headSides: 7, headStacks: 3, blade: true, eye: null, pupil: null, coverts: [0, 0], wingBars: false, secondaries: 0, primaries: 0, featherSegs: 1, tailFeathers: 0, legSides: 0, toes: 0, hindToe: false, cere: false, neckSides: 0, torsoRings: 5 },
};

// de romp: borst steekt naar voren, rug loopt glad door in de staart, hals rijst op naar de kop
const TORSO_FULL = [
  { x: -0.2, cy: 0.015, ry: 0, rz: 0 }, { x: -0.18, cy: 0.013, ry: 0.025, rz: 0.024 }, { x: -0.13, cy: 0.006, ry: 0.066, rz: 0.062 },
  { x: -0.06, cy: 0, ry: 0.096, rz: 0.09 }, { x: 0.02, cy: -0.006, ry: 0.105, rz: 0.097 }, { x: 0.09, cy: -0.004, ry: 0.099, rz: 0.091 },
  { x: 0.14, cy: 0.014, ry: 0.076, rz: 0.07 }, { x: 0.172, cy: 0.04, ry: 0.044, rz: 0.042 }, { x: 0.185, cy: 0.056, ry: 0, rz: 0 },
];
const TORSO_RINGS = {
  9: TORSO_FULL,
  7: [TORSO_FULL[0], TORSO_FULL[2], TORSO_FULL[3], TORSO_FULL[4], TORSO_FULL[5], TORSO_FULL[6], TORSO_FULL[8]],
  5: [TORSO_FULL[0], TORSO_FULL[3], TORSO_FULL[5], TORSO_FULL[7], TORSO_FULL[8]],
};
const NECK_RINGS = [
  { x: 0.1, cy: 0.0, ry: 0.083, rz: 0.081 }, { x: 0.14, cy: 0.03, ry: 0.067, rz: 0.065 }, { x: 0.18, cy: 0.075, ry: 0.049, rz: 0.048 },
  { x: 0.205, cy: 0.106, ry: 0.04, rz: 0.04 }, { x: 0.222, cy: 0.114, ry: 0, rz: 0 },
];

function addWingParts(out, D, c, side, kind, sp) {
  const s = side, big = kind === 'gull' ? 1.45 : 1; // meeuwen hebben langere vleugels
  const cov = D.coverts;
  const wingHex = c.wing;
  // dekveren: de gladde ovale kap van de vleugel
  if (cov[0]) out.push({ g: 'wing', side, geo: setColors(ellip(0.082, 0.012, 0.098 * big, cov[0], cov[1], -0.025, 0, 0.095 * big * s), wingHex, sp) });
  if (D.wingBars) {
    for (const bx of [-0.055, -0.09]) out.push({ g: 'wing', side, geo: setColors(ellip(0.012, 0.006, 0.085 * big, 6, 3, bx, 0.009, 0.1 * big * s), c.bar) });
  }
  // ver weg: een gebogen, naar achteren geveegde vleugelvorm in plaats van losse veren
  if (D.blade) {
    const f = feather(0.27 * big, 0.075, 2, -0.02, 0.4, wingHex, c.tip);
    xform(f, place(-0.02, 0.005, 0.01 * s, 0, -s * (Math.PI / 2 + 0.3), 0));
    out.push({ g: 'wing', side, geo: f });
    return;
  }
  // armpennen aan de achterrand van de vleugel
  for (let i = 0; i < D.secondaries; i++) {
    const t = D.secondaries > 1 ? i / (D.secondaries - 1) : 0;
    const f = feather((0.085 - t * 0.012) * (kind === 'gull' ? 1.1 : 1), 0.033, D.featherSegs, -0.012, 0.3, wingHex, shade(wingHex, 0.8));
    xform(f, place(-0.065, -0.002, (0.025 + t * (0.15 * big)) * s, 0, Math.PI + 0.05 * s * (1 - t), 0));
    out.push({ g: 'wing', side, geo: f });
  }
  // handpennen aan de buitenvleugel: waaiert naar buiten en wijst iets naar achteren
  for (let i = 0; i < D.primaries; i++) {
    const t = D.primaries > 1 ? i / (D.primaries - 1) : 0;
    const f = feather((0.17 - t * 0.065) * big, 0.027, D.featherSegs, -0.018, 0.4, wingHex, c.tip);
    const psi = 0.04 + t * 0.62; // hoek vanaf +z (naar buiten) naar -x
    xform(f, place(-0.02 - t * 0.01, 0, 0.012 * s, 0, -s * (Math.PI / 2 + psi), 0));
    out.push({ g: 'wingOut', side, geo: f });
  }
  if (D.primaries) out.push({ g: 'wingOut', side, geo: setColors(ellip(0.055, 0.009, 0.075 * big, Math.max(6, cov[0] - 2), 4, -0.03, 0, 0.065 * big * s), wingHex, sp) });
}

// De onderdelen van één duif per groep, in de lokale ruimte van die groep. Zie de kop van dit bestand.
export function pigeonParts(lod = 'hi', { kind = 'pigeon', variant = null, map = null, legScale = 1 } = {}) {
  const D = DETAIL[lod];
  if (!D) throw new Error(`pigeonParts: onbekend niveau ${lod}`);
  const c = pigeonPalette(kind, variant, map), sp = !!c.spots;
  const out = [];
  const iri = kind === 'pigeon';
  // romp (een stuk) en nek (glanzend bij een stadsduif)
  const torso = loft(TORSO_RINGS[D.torsoRings], D.sides);
  out.push({ g: 'body', geo: gradient(torso, c.breast, c.body, 'x', -0.2, 0.14) });
  if (sp) setColors(torso, c.body, true);
  if (D.neckSides) {
    const neck = loft(NECK_RINGS, D.neckSides);
    out.push({ g: 'body', shiny: iri && lod === 'hi', geo: gradient(neck, c.neck2, c.neck, 'y', 0.0, 0.11) });
  }
  // kop: rond, met snavel, was(cere), oog met pupil. In de koplokale ruimte.
  const head = ellip(0.05, 0.046, 0.044, D.headSides, D.headStacks, 0.004, 0, 0);
  out.push({ g: 'head', geo: setColors(head, c.head, sp) });
  const beak = loft([{ x: 0.04, cy: -0.006, ry: 0.014, rz: 0.015 }, { x: 0.075, cy: -0.006, ry: 0.009, rz: 0.01 }, { x: 0.103, cy: -0.012, ry: 0, rz: 0 }], lod === 'hi' ? 6 : lod === 'mid' ? 5 : 4);
  out.push({ g: 'head', geo: setColors(beak, c.beak) });
  if (D.cere) out.push({ g: 'head', geo: setColors(ellip(0.013, 0.009, 0.012, 8, 4, 0.042, 0.012, 0), c.cere) });
  if (D.eye) {
    for (const s of [1, -1]) {
      out.push({ g: 'head', geo: setColors(ellip(0.011, 0.011, 0.011, D.eye[0], D.eye[1], 0.02, 0.014, 0.037 * s), c.eye) });
      out.push({ g: 'head', geo: setColors(ellip(0.006, 0.006, 0.006, D.pupil[0], D.pupil[1], 0.026, 0.015, 0.045 * s), 0x0c0c0c) });
    }
  } else if (lod === 'mid') {
    // een oogvlek zodat de kop leest als een kop: een enkele driehoek per zijde in de kleur van het oog
    for (const s of [1, -1]) out.push({ g: 'head', geo: setColors(ellip(0.011, 0.011, 0.011, 4, 2, 0.022, 0.014, 0.038 * s), c.eye) });
  }
  // staart: een waaier van veren met een donkere eindband
  if (D.tailFeathers) {
    const n = D.tailFeathers;
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) - 0.5 : 0;
      const f = feather(0.15, 0.03, D.featherSegs, -0.01, 0.25, c.tail, c.band);
      xform(f, place(0, 0, 0, 0, Math.PI + t * 0.5, 0.04 - Math.abs(t) * 0.05));
      out.push({ g: 'tail', geo: f });
    }
  }
  if (D.blade) { const f = feather(0.16, 0.055, 2, -0.01, 0.3, c.tail, c.band); xform(f, place(0, 0, 0, 0, Math.PI, 0)); out.push({ g: 'tail', geo: f }); }
  for (const side of [1, -1]) addWingParts(out, D, c, side, kind, sp);
  // poten met tenen; bij 'mid' alleen de poot zelf
  if (D.legSides) {
    for (const side of [1, -1]) {
      out.push({ g: 'leg', side, geo: setColors(tube([0, 0, 0], [0, -0.07 * legScale, 0], 0.009, 0.006, D.legSides), c.leg) });
      if (D.toes) {
        const angles = D.hindToe ? [-0.55, 0, 0.55, Math.PI] : [-0.55, 0, 0.55];
        for (const a of angles) {
          const l = a === Math.PI ? 0.025 : 0.042;
          out.push({ g: 'leg', side, geo: setColors(tube([0, -0.07 * legScale, 0], [Math.cos(a) * l, -0.073 * legScale, Math.sin(a) * l], 0.0055, 0.0035, 4), c.leg) });
        }
      }
    }
  }
  return out;
}

// De gedeelde materialen: glad (geen flatShading), de kleur zit in de hoekpunten. Eén stel voor alle duiven.
let _mat = null, _shiny = null;
export function pigeonMaterial() {
  if (!_mat) { _mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 }); _mat.userData.shared = true; }
  return _mat;
}
export function pigeonShinyMaterial() {
  if (!_shiny) { _shiny = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.2, emissive: 0x120a1c }); _shiny.userData.shared = true; }
  return _shiny;
}

// --- samengevoegd (instancing) ----------------------------------------------------------------------------------------

function groupMatrix(p, side) {
  const g = p.g;
  const M = new THREE.Matrix4();
  const pv = PIGEON_PIVOT;
  const sd = side || 1;
  if (g === 'head') return M.makeTranslation(...pv.head);
  if (g === 'tail') return M.makeTranslation(...pv.tail);
  if (g === 'wing') return M.makeTranslation(pv.wing[0], pv.wing[1], pv.wing[2] * sd);
  if (g === 'wingOut') return M.makeTranslation(pv.wing[0], pv.wing[1], pv.wing[2] * sd).multiply(new THREE.Matrix4().makeTranslation(0, 0, pv.wingOut[2] * sd));
  if (g === 'leg') return M.makeTranslation(pv.legs[0], pv.legs[1], pv.legs[2] + pv.leg[2] * sd);
  return M;
}

export function mergePigeonGeometries(geos) {
  const names = Object.keys(geos[0].attributes);
  let nv = 0, ni = 0;
  for (const g of geos) { nv += g.attributes.position.count; ni += g.index.count; }
  const arrays = {};
  for (const k of names) { const a0 = geos[0].attributes[k]; arrays[k] = new a0.array.constructor(nv * a0.itemSize); }
  const idx = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const g of geos) {
    for (const k of names) arrays[k].set(g.attributes[k].array, ov * g.attributes[k].itemSize);
    for (let i = 0; i < g.index.count; i++) idx[oi + i] = g.index.array[i] + ov;
    ov += g.attributes.position.count; oi += g.index.count;
  }
  const out = new THREE.BufferGeometry();
  for (const k of names) out.setAttribute(k, new THREE.BufferAttribute(arrays[k], geos[0].attributes[k].itemSize));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

// De onderdelen in het absolute lichaamsframe (verschaald met k), gegroepeerd per bot voor een skelet (wildlife.js):
// body (romp, staart), leg (poten), head, wingL/wingR (zijde +1/-1, dekveren en armpennen) en wingOutL/wingOutR (handpennen).
export function pigeonBoneParts(lod = 'mid', opts = {}, k = 1) {
  return pigeonParts(lod, opts).map((p) => {
    const bone = p.g === 'leg' ? 'leg' : p.g === 'wing' ? (p.side > 0 ? 'wingL' : 'wingR') : p.g === 'wingOut' ? (p.side > 0 ? 'wingOutL' : 'wingOutR') : p.g === 'head' ? 'head' : 'body';
    p.geo.applyMatrix4(groupMatrix(p, p.side));
    if (k !== 1) p.geo.scale(k, k, k);
    return { bone, geo: p.geo };
  });
}

// Eén geometrie van de hele duif in het lichaamsframe. wings: 'none' (de vleugels apart, voor instancing), 'folded' (aan de
// flank, zoals zittend) of een getal: de opslaghoek in radialen (0 = recht naar buiten, positief omhoog).
// De geometrie is een nieuw object (de aanroeper bewaart en ruimt op).
export function pigeonMerged(lod = 'mid', opts = {}, { wings = 'none', legs = true, scale = 1 } = {}) {
  const parts = pigeonParts(lod, opts);
  const list = [];
  for (const p of parts) {
    if (p.g === 'leg' && !legs) continue;
    const wing = p.g === 'wing' || p.g === 'wingOut';
    if (wing && wings === 'none') continue;
    const m = groupMatrix(p, p.side);
    if (wing) {
      const s = p.side;
      const inner = new THREE.Matrix4().makeTranslation(PIGEON_PIVOT.wing[0], PIGEON_PIVOT.wing[1], PIGEON_PIVOT.wing[2] * s);
      if (wings === 'folded') {
        // gevouwen, zoals poseBird (pigeonmode.js) hem zet: de vleugel klapt naar achteren en kantelt langs de flank
        inner.copy(new THREE.Matrix4().makeTranslation(PIGEON_PIVOT.wing[0] + 0.015, PIGEON_PIVOT.wing[1] - 0.02, PIGEON_PIVOT.wing[2] * s * 1.3)).multiply(new THREE.Matrix4().makeRotationFromEuler(_E.set(0.5 * s, -1.55 * s, 0, 'XYZ')));
        if (p.g === 'wingOut') inner.multiply(new THREE.Matrix4().makeTranslation(0, 0, PIGEON_PIVOT.wingOut[2] * s)).multiply(new THREE.Matrix4().makeRotationY(2.9 * s));
      } else {
        inner.multiply(new THREE.Matrix4().makeRotationX(-s * wings));
        if (p.g === 'wingOut') inner.multiply(new THREE.Matrix4().makeTranslation(0, 0, PIGEON_PIVOT.wingOut[2] * s)).multiply(new THREE.Matrix4().makeRotationX(s * wings * 0.4));
      }
      p.geo.applyMatrix4(inner);
    } else p.geo.applyMatrix4(m);
    list.push(p.geo);
  }
  const g = mergePigeonGeometries(list);
  for (const x of list) x.dispose();
  if (scale !== 1) g.scale(scale, scale, scale);
  return g;
}

// Eén vleugel (zijde +1) in de schoudervorm: dekveren, armpennen en handpennen, gespreid langs +z. Voor een InstancedMesh:
// de aanroeper zet de schouder op PIGEON_PIVOT.wing en spiegelt met z-schaal -1 voor de andere kant.
export function pigeonWingGeometry(lod = 'mid', opts = {}) {
  const parts = pigeonParts(lod, opts).filter((p) => (p.g === 'wing' || p.g === 'wingOut') && p.side === 1);
  const list = parts.map((p) => (p.g === 'wingOut' ? p.geo.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, PIGEON_PIVOT.wingOut[2])) : p.geo));
  const g = mergePigeonGeometries(list);
  for (const x of list) x.dispose();
  return g;
}

// Tel de driehoeken van een geometrie (geïndexeerd of niet).
export function geoTris(g) { return Math.round((g.index ? g.index.count : g.attributes.position.count) / 3); }
export function partsTris(parts) { let t = 0; for (const p of parts) t += geoTris(p.geo); return t; }
