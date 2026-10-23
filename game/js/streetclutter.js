import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { fitText as sharedFitText } from './canvastex.js';
import { GeoBuilder, composeMatrix, tubeGeometry, HABBO_PALETTE } from './pixelart3d.js';
import { isInsideBuilding, isOnRoad } from './pedgeom.js';
import { isInWater, closestPointOnSegment } from './util.js';
import { railingItems, hasRailings, RAIL_KIND, RAIL_HALF } from './bridgerails.js';
import { yieldArms } from './junctions.js';

// Groningen street clutter for cityprops' per-cell meshes: bikes against
// facades and bridge railings, kliko's, underground waste containers,
// bollards, planters, advertising columns, bus shelters, signposts, street
// cabinets, sandwich boards, scooters and kiosks. Everything shares one
// vertex-coloured material whose map is a small canvas atlas; untextured
// geometry samples its white corner so the cell still merges to one mesh.

const ATLAS_W = 1024, ATLAS_H = 512;

const CLUTTER_PROPS = {
  scooter: { r: 0.3, half: 0.5, h: 1.15, mass: 95, material: 'metal', breakSpeed: 1.5, breakCost: 0.4 },
  kliko: { r: 0.36, h: 1.1, mass: 25, material: 'plastic', breakSpeed: 0.3, breakCost: 0.1, burst: 'litter' },
  container: { r: 0.38, h: 1.3, mass: 450, material: 'metal', breakSpeed: 4, breakCost: 1.2, slide: true, burst: 'litter' },
  bollard: { r: 0.1, h: 1, mass: 45, material: 'metal', breakSpeed: 3.5, breakCost: 0.5 },
  planter: { r: 0.42, half: 0.5, h: 0.8, mass: 700, material: 'wood', breakSpeed: 7, breakCost: 1.8, slide: true },
  zuil: { r: 0.66, h: 3.1, mass: 480, material: 'metal', breakSpeed: 7, breakCost: 1.5, topple: true, burst: 'posters', shotHp: 6 },
  abri: { r: 0.62, half: 1.25, h: 2.5, mass: 450, material: 'metal', breakSpeed: 7, breakCost: 2, burst: 'glass' },
  elecbox: { r: 0.3, half: 0.3, h: 1.3, mass: 200, material: 'metal', breakSpeed: 6, breakCost: 1.5, burst: 'sparks' },
  signpost: { r: 0.08, h: 2.8, mass: 30, material: 'metal', breakSpeed: 2, breakCost: 0.3, topple: true },
  stoepbord: { r: 0.3, h: 1, mass: 8, material: 'wood', breakSpeed: 0.2, breakCost: 0 },
  kiosk: { r: 1.15, half: 0.25, h: 2.7, mass: 2500, material: 'wood', breakSpeed: 99, breakCost: 0 },
  nietje: { r: 0.08, half: 0.35, h: 0.75, mass: 25, material: 'metal', breakSpeed: 3, breakCost: 0.4 },
  // a bridge railing section: holds walkers, bikes and crawling cars; a car at
  // moderate speed, even at a shallow angle, knocks it off
  bridgerail: { r: 0.12, half: 1, h: 1.05, mass: 70, material: 'metal', breakSpeed: 3.4, breakCost: 0.8, glance: 0.25, minBreakKg: 500 },
};

// --- atlas ------------------------------------------------------------------

const R = {
  fietsstraat: [16, 0, 240, 160],
  parkeren: [256, 0, 128, 128],
  bushalte: [256, 128, 128, 48],
  zuil: [0, 256, 512, 192],
  kiosk: [512, 440, 400, 60],
  abriPoster: [128, 256, 128, 192],
};
const BLADE_NAMES = ['Centrum', 'Hoofdstation', 'Zernike', 'Haren', 'Noorderplantsoen', 'Hoogkerk'];
const CHALK_LINES = [
  ['Koffie &', 'appeltaart', '€ 4,50'],
  ['Vandaag:', 'verse', 'snert!'],
  ['Borrel', 'vanaf', '16.00 uur'],
];
BLADE_NAMES.forEach((_, i) => {
  R['bladeR' + i] = [384, i * 40, 256, 40];
  R['bladeL' + i] = [640, i * 40, 256, 40];
});
CHALK_LINES.forEach((_, i) => { R['chalk' + i] = [512 + i * 104, 256, 100, 150]; });
R.b6 = [8, 164, 96, 88];
R.d1 = [112, 164, 88, 88];
R.bus = [206, 176, 46, 46];
const FLYERS = [
  { bg: '#e8c93a', fg: '#1b1b1b', a: 'FEEST', b: 'Vera' },
  { bg: '#d0457a', fg: '#ffffff', a: 'KAMER', b: 'gezocht' },
  { bg: '#2f5a8f', fg: '#ffffff', a: 'DJ', b: 'Tinus' },
];
const STICKERS = [
  { bg: '#1e9e56', fg: '#ffffff', t: 'FCG' },
  { bg: '#1b1b1b', fg: '#e8c93a', t: 'MOI' },
  { bg: '#b3211c', fg: '#ffffff', t: '050' },
  { bg: '#f2f0e8', fg: '#2f5a8f', t: 'Stad!' },
  { bg: '#e0701e', fg: '#1b1b1b', t: 'Eierbal' },
];
FLYERS.forEach((_, i) => { R['flyer' + i] = [900, 4 + i * 62, 42, 58]; });
STICKERS.forEach((_, i) => { R['sticker' + i] = [952, 4 + i * 46, 42, 42]; });

let atlas = null;

function bikeGlyph(g, x, y, s, color) {
  g.strokeStyle = color;
  g.lineWidth = s * 0.09;
  g.beginPath(); g.arc(x - s * 0.55, y, s * 0.36, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(x + s * 0.55, y, s * 0.36, 0, Math.PI * 2); g.stroke();
  g.beginPath();
  g.moveTo(x - s * 0.55, y); g.lineTo(x - s * 0.1, y - s * 0.55); g.lineTo(x + s * 0.4, y - s * 0.55);
  g.lineTo(x + s * 0.55, y); g.moveTo(x - s * 0.55, y); g.lineTo(x, y); g.lineTo(x + s * 0.4, y - s * 0.55);
  g.moveTo(x - s * 0.1, y - s * 0.55); g.lineTo(x - s * 0.15, y - s * 0.7); g.moveTo(x + s * 0.4, y - s * 0.55);
  g.lineTo(x + s * 0.35, y - s * 0.75);
  g.stroke();
}

function fitText(g, text, x, y, maxW, px, weight = 'bold') {
  sharedFitText(g, text, maxW, px, weight, 'sans-serif', 8);
  g.fillText(text, x, y);
}

function buildAtlas() {
  const c = document.createElement('canvas');
  c.width = ATLAS_W; c.height = ATLAS_H;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, ATLAS_W, ATLAS_H);
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  let [x, y, w, h] = R.fietsstraat;
  g.fillStyle = '#b3211c'; g.fillRect(x, y, w, h);
  g.fillStyle = '#ffffff'; g.fillRect(x + 8, y + 8, w - 16, h - 16);
  g.fillStyle = '#b3211c';
  fitText(g, 'fietsstraat', x + w / 2, y + 34, w - 30, 34);
  bikeGlyph(g, x + w / 2, y + 88, 34, '#b3211c');
  g.fillStyle = '#1b1b1b';
  fitText(g, 'auto te gast', x + w / 2, y + 132, w - 30, 28);

  [x, y, w, h] = R.parkeren;
  g.fillStyle = '#1f4f9a'; g.fillRect(x, y, w, h);
  g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.strokeRect(x + 6, y + 6, w - 12, h - 12);
  g.fillStyle = '#ffffff';
  g.font = 'bold 64px sans-serif'; g.fillText('P', x + 36, y + 58);
  bikeGlyph(g, x + 86, y + 70, 26, '#ffffff');
  fitText(g, 'fietsen', x + w / 2, y + 108, w - 20, 20);

  [x, y, w, h] = R.bushalte;
  g.fillStyle = '#f2f0e8'; g.fillRect(x, y, w, h);
  g.fillStyle = '#1f4f9a'; g.fillRect(x, y, 10, h);
  g.fillStyle = '#1b1b1b';
  fitText(g, 'Bushalte', x + w / 2 + 5, y + h / 2, w - 24, 26);

  BLADE_NAMES.forEach((name, i) => {
    for (const dir of ['R', 'L']) {
      [x, y, w, h] = R['blade' + dir + i];
      g.fillStyle = '#f4f2ec'; g.fillRect(x, y, w, h);
      g.strokeStyle = '#b3211c'; g.lineWidth = 3; g.strokeRect(x + 3, y + 3, w - 6, h - 6);
      g.fillStyle = '#b3211c';
      const ax = dir === 'R' ? x + w - 22 : x + 22, s = dir === 'R' ? 1 : -1;
      g.beginPath();
      g.moveTo(ax + s * 12, y + h / 2); g.lineTo(ax - s * 6, y + 8); g.lineTo(ax - s * 6, y + h - 8);
      g.fill();
      fitText(g, name, dir === 'R' ? x + (w - 30) / 2 + 6 : x + 30 + (w - 36) / 2, y + h / 2 + 1, w - 50, 24);
    }
  });

  CHALK_LINES.forEach((lines, i) => {
    [x, y, w, h] = R['chalk' + i];
    g.fillStyle = '#6b4a2e'; g.fillRect(x, y, w, h);
    g.fillStyle = '#23302a'; g.fillRect(x + 6, y + 6, w - 12, h - 12);
    const cols = ['#f4f2ec', '#f2d36b', '#f4f2ec'];
    lines.forEach((ln, k) => {
      g.fillStyle = cols[k];
      fitText(g, ln, x + w / 2, y + 36 + k * 38, w - 18, 22, 'italic bold');
    });
  });

  [x, y, w, h] = R.zuil;
  const posters = [
    { bg: '#d9772b', fg: '#fff6e0', a: 'Eierbal', b: 'Festival', c: 'Grote Markt' },
    { bg: '#2f5a8f', fg: '#ffffff', a: 'Popconcert', b: 'Oosterpoort', c: 'zaterdag' },
    { bg: '#b3211c', fg: '#ffe36b', a: 'Kermis', b: 'op de Markt', c: 'mei' },
    { bg: '#2f6a3a', fg: '#ffffff', a: 'Moi!', b: 'Stad', c: 'Groningen' },
  ];
  posters.forEach((p, k) => {
    const px = x + k * 128;
    g.fillStyle = '#e8e2d0'; g.fillRect(px, y, 128, h);
    g.fillStyle = p.bg; g.fillRect(px + 6, y + 8, 116, h - 16);
    g.fillStyle = p.fg;
    fitText(g, p.a, px + 64, y + 52, 104, 30);
    fitText(g, p.b, px + 64, y + 90, 104, 24);
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(px + 16, y + 112, 96, 30);
    g.fillStyle = p.fg;
    fitText(g, p.c, px + 64, y + 160, 104, 18, 'normal');
  });

  // B6: give way. Red-bordered white triangle, point down.
  [x, y, w, h] = R.b6;
  g.fillStyle = '#c21d1d';
  g.beginPath(); g.moveTo(x + 2, y + 2); g.lineTo(x + w - 2, y + 2); g.lineTo(x + w / 2, y + h - 2); g.closePath(); g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath(); g.moveTo(x + 16, y + 11); g.lineTo(x + w - 16, y + 11); g.lineTo(x + w / 2, y + h - 22); g.closePath(); g.fill();
  // D1: roundabout, three white arrows on blue
  [x, y, w, h] = R.d1;
  g.fillStyle = '#1f4f9a'; g.beginPath(); g.arc(x + w / 2, y + h / 2, w / 2 - 1, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#ffffff'; g.fillStyle = '#ffffff'; g.lineWidth = 7;
  for (let k = 0; k < 3; k++) {
    const a0 = k * Math.PI * 2 / 3;
    g.beginPath(); g.arc(x + w / 2, y + h / 2, 22, a0, a0 + 1.4); g.stroke();
    const ax = x + w / 2 + Math.cos(a0 + 1.55) * 22, ay = y + h / 2 + Math.sin(a0 + 1.55) * 22;
    const tx = -Math.sin(a0 + 1.55), ty = Math.cos(a0 + 1.55);
    g.beginPath(); g.moveTo(ax + tx * 9, ay + ty * 9); g.lineTo(ax - ty * 9 - tx * 3, ay + tx * 9 - ty * 3); g.lineTo(ax + ty * 9 - tx * 3, ay - tx * 9 - ty * 3); g.fill();
  }
  // F17-style bus lane sign
  [x, y, w, h] = R.bus;
  g.fillStyle = '#1f4f9a'; g.fillRect(x, y, w, h);
  g.fillStyle = '#ffffff'; fitText(g, 'BUS', x + w / 2, y + h / 2 + 1, w - 6, 18);

  FLYERS.forEach((f, i) => {
    [x, y, w, h] = R['flyer' + i];
    g.fillStyle = '#f4f2ec'; g.fillRect(x, y, w, h);
    g.fillStyle = f.bg; g.fillRect(x + 3, y + 3, w - 6, h - 20);
    g.fillStyle = f.fg; fitText(g, f.a, x + w / 2, y + 16, w - 8, 14);
    g.fillStyle = '#1b1b1b'; fitText(g, f.b, x + w / 2, y + h - 9, w - 6, 10, 'normal');
  });
  STICKERS.forEach((st, i) => {
    [x, y, w, h] = R['sticker' + i];
    g.fillStyle = st.bg; g.beginPath(); g.arc(x + w / 2, y + h / 2, w / 2 - 1, 0, Math.PI * 2); g.fill();
    g.fillStyle = st.fg; fitText(g, st.t, x + w / 2, y + h / 2 + 1, w - 8, 16);
  });

  [x, y, w, h] = R.kiosk;
  g.fillStyle = '#2f5a3f'; g.fillRect(x, y, w, h);
  g.fillStyle = '#f2e6c4';
  fitText(g, 'Broodjes · Koffie · Kranten', x + w / 2, y + h / 2, w - 20, 30);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function uvRect(name) {
  const [x, y, w, h] = R[name];
  return [x / ATLAS_W, 1 - (y + h) / ATLAS_H, (x + w) / ATLAS_W, 1 - y / ATLAS_H];
}

// Points every vertex at a blank patch of the atlas, far enough from any
// artwork to stay white down the mip chain.
export function whiteUV(geo) {
  let uv = geo.attributes.uv;
  if (!uv) geo.setAttribute('uv', uv = new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
  const u = 992 / ATLAS_W, v = 1 - 352 / ATLAS_H;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u, v);
  return geo;
}

function concat(...geos) {
  let n = 0;
  for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Int8Array(n * 3), col = new Uint8Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of geos) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    col.set(g.attributes.color.array, o * 3);
    uv.set(g.attributes.uv.array, o * 2);
    o += c;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3, true));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}

// Builds a prototype from an untextured body builder plus optional textured
// faces builder.
function finish(body, faces = null) {
  const b = whiteUV(body.build());
  return faces ? concat(b, faces.build()) : b;
}

// Textured quad: centre c, unit right/up vectors as seen by the viewer.
function texQuad(T, c, right, up, w, h, region, flipU = false) {
  const [u0, v0, u1, v1] = uvRect(region);
  const hw = w / 2, hh = h / 2;
  const P = (sr, su) => [c[0] + right[0] * sr * hw + up[0] * su * hh, c[1] + right[1] * sr * hw + up[1] * su * hh, c[2] + right[2] * sr * hw + up[2] * su * hh];
  const out = [up[1] * right[2] - up[2] * right[1], up[2] * right[0] - up[0] * right[2], up[0] * right[1] - up[1] * right[0]];
  const a = flipU ? u1 : u0, b = flipU ? u0 : u1;
  T.quad(P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), 0xffffff, 0, [a, v0, b, v0, b, v1, a, v1]);
  return out;
}

// --- prototypes (local space: +X forward/towards the street, y up) ---------

const IRON = 0x2b2f2a, STEEL = 0x6b6e70, BLACK = 0x1a1a1a, CHROME = 0x9a9a98;

function tube(B, a, b, r, col, sides = 3) {
  B.geo(tubeGeometry(a, b, r, r, sides), null, col);
}

function buildBike(color, extra = null) {
  const B = new GeoBuilder(1);
  const r = 0.33;
  for (const x of [-0.52, 0.52]) {
    B.geo(new THREE.TorusGeometry(r, 0.03, 3, 8), composeMatrix(x, r, 0), BLACK);
    B.box(x, r + 0.33, 0, 0.44, 0.02, 0.07, color, 0, 0, 0, x > 0 ? -0.35 : 0.35);
  }
  const hub = [-0.52, r, 0], bb = [0, 0.3, 0], seat = [-0.18, 0.86, 0], head = [0.4, 0.88, 0], fork = [0.52, r, 0];
  tube(B, hub, bb, 0.02, color);
  tube(B, hub, seat, 0.02, color);
  tube(B, bb, seat, 0.026, color);
  tube(B, bb, [0.22, 0.42, 0], 0.028, color);
  tube(B, [0.22, 0.42, 0], head, 0.028, color);
  tube(B, head, fork, 0.022, color);
  tube(B, head, [0.34, 1.05, 0], 0.02, CHROME);
  tube(B, [0.3, 1.05, -0.27], [0.3, 1.05, 0.27], 0.016, CHROME);
  B.box(-0.2, 0.92, 0, 0.26, 0.06, 0.14, 0x2a1d14);
  B.box(-0.55, 0.72, 0, 0.42, 0.03, 0.18, BLACK);
  B.box(-0.18, 0.34, 0.06, 0.46, 0.1, 0.02, color);
  if (extra === 'crateRed' || extra === 'crateBlack') {
    B.box(0.62, 0.8, 0, 0.3, 0.03, 0.3, BLACK);
    B.box(0.62, 0.95, 0, 0.34, 0.26, 0.42, extra === 'crateRed' ? 0xa3281f : 0x222426);
  } else if (extra === 'bags') {
    for (const z of [-0.14, 0.14]) B.box(-0.55, 0.55, z, 0.34, 0.3, 0.08, 0x1f3326);
  } else if (extra === 'basket') {
    B.box(0.6, 0.92, 0, 0.3, 0.2, 0.34, 0x9a7048);
  }
  return tinted(finish(B), color);
}

// Frame colour, so a parked bike taken for a ride keeps its look.
function tinted(geo, color) {
  geo.userData.tint = color;
  return geo;
}

function buildScooter(color) {
  const B = new GeoBuilder(1);
  for (const x of [-0.5, 0.55]) {
    B.geo(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 8), composeMatrix(x, 0.2, 0, Math.PI / 2, 0, 0), BLACK);
  }
  B.box(-0.35, 0.5, 0, 0.75, 0.42, 0.42, color);
  B.box(-0.3, 0.76, 0, 0.66, 0.1, 0.3, BLACK);
  B.box(0.08, 0.3, 0, 0.6, 0.07, 0.34, 0x3a3b3f);
  B.box(0.4, 0.62, 0, 0.1, 0.72, 0.42, color, 0, 0, 0, -0.25);
  B.box(0.55, 0.36, 0, 0.3, 0.1, 0.18, color);
  tube(B, [0.46, 0.7, 0], [0.4, 1.02, 0], 0.03, 0x3a3b3f, 4);
  tube(B, [0.4, 1.02, -0.3], [0.4, 1.02, 0.3], 0.018, CHROME);
  B.box(0.47, 1.0, 0, 0.1, 0.1, 0.14, 0xe8e2d0);
  B.box(-0.75, 0.55, 0, 0.06, 0.08, 0.16, 0x8a2a24);
  return tinted(finish(B), color);
}

function buildKliko(lid) {
  const B = new GeoBuilder(1);
  const body = 0x4a4d50;
  B.box(0, 0.5, 0, 0.56, 0.96, 0.68, body);
  B.box(0.02, 1.0, 0, 0.64, 0.06, 0.74, lid);
  tube(B, [-0.33, 0.96, -0.26], [-0.33, 0.96, 0.26], 0.025, body, 4);
  for (const z of [-0.3, 0.3]) B.geo(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 7), composeMatrix(-0.22, 0.1, z, Math.PI / 2, 0, 0), BLACK);
  B.box(0.285, 0.72, 0, 0.01, 0.12, 0.22, 0xe8e2d0);
  return finish(B);
}

function buildContainer(band, glass = false) {
  const B = new GeoBuilder(1);
  B.box(0, 0.015, 0, 1.5, 0.03, 1.5, 0x5a5c5e);
  B.box(0, 0.6, 0, 0.62, 1.2, 0.62, 0x4f5357);
  B.box(0, 1.23, 0, 0.7, 0.06, 0.7, 0x3d4043);
  B.box(0, 1.08, 0, 0.64, 0.12, 0.64, band);
  if (glass) {
    for (const z of [-0.15, 0.15]) B.geo(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 8), composeMatrix(0.315, 0.85, z, 0, 0, Math.PI / 2), BLACK);
  } else {
    B.box(0.32, 0.82, 0, 0.04, 0.3, 0.44, 0x2e3134);
    B.box(0.345, 0.95, 0, 0.03, 0.04, 0.3, STEEL);
  }
  return finish(B);
}

function buildBollard(col, band) {
  const B = new GeoBuilder(1);
  B.geo(new THREE.CylinderGeometry(0.07, 0.09, 0.9, 6), composeMatrix(0, 0.45, 0), col);
  B.geo(new THREE.CylinderGeometry(0.075, 0.075, 0.07, 6), composeMatrix(0, 0.76, 0), band);
  B.geo(new THREE.IcosahedronGeometry(0.085, 0), composeMatrix(0, 0.93, 0), col);
  return finish(B);
}

function buildPlanterRect(flowers) {
  const B = new GeoBuilder(1);
  B.box(0, 0.25, 0, 0.8, 0.5, 1.8, 0x9a958a);
  B.box(0, 0.505, 0, 0.7, 0.02, 1.7, 0x3a2e24);
  for (const z of [-0.55, 0, 0.55]) {
    B.geo(new THREE.IcosahedronGeometry(0.34, 0), composeMatrix(0, 0.72, z, 0, z * 2, 0, 1, 0.75, 1), 0x4f6e3a);
  }
  if (flowers) {
    const cols = [0xc9423a, 0xe0c24a, 0xe6e1d6, 0xb85a8a];
    for (let i = 0; i < 8; i++) {
      B.geo(new THREE.IcosahedronGeometry(0.07, 0), composeMatrix((i % 2 ? 0.22 : -0.22), 0.62 + (i % 3) * 0.05, -0.75 + i * 0.21), cols[i % cols.length]);
    }
  }
  return finish(B);
}

function buildPlanterTree() {
  const B = new GeoBuilder(1);
  B.geo(new THREE.CylinderGeometry(0.6, 0.55, 0.55, 8), composeMatrix(0, 0.275, 0), 0x8f8a80);
  B.geo(new THREE.CylinderGeometry(0.54, 0.54, 0.02, 8), composeMatrix(0, 0.555, 0), 0x3a2e24);
  tube(B, [0, 0.5, 0], [0, 2.1, 0], 0.06, HABBO_PALETTE.woodDark, 5);
  B.geo(new THREE.IcosahedronGeometry(0.85, 0), composeMatrix(0, 2.45, 0, 0.3, 0.5, 0, 1, 0.85, 1), 0x5f7d45);
  B.geo(new THREE.IcosahedronGeometry(0.55, 0), composeMatrix(0.3, 2.9, 0.2, 0, 1, 0), 0x6b8a4d);
  return finish(B);
}

function buildZuil() {
  const B = new GeoBuilder(1), T = new GeoBuilder(1);
  const green = 0x2f4a3a;
  B.geo(new THREE.CylinderGeometry(0.66, 0.68, 0.3, 12), composeMatrix(0, 0.15, 0), green);
  B.geo(new THREE.CylinderGeometry(0.66, 0.62, 0.12, 12), composeMatrix(0, 2.56, 0), green);
  B.geo(new THREE.ConeGeometry(0.72, 0.4, 12), composeMatrix(0, 2.82, 0), green);
  B.geo(new THREE.IcosahedronGeometry(0.1, 0), composeMatrix(0, 3.08, 0), 0xb89a4a);
  const cyl = new THREE.CylinderGeometry(0.6, 0.6, 2.2, 12, 1, true).toNonIndexed();
  const [u0, v0, u1, v1] = uvRect('zuil');
  const uv = cyl.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  T.geo(cyl, composeMatrix(0, 1.4, 0), 0xffffff);
  return finish(B, T);
}

function buildAbri() {
  const B = new GeoBuilder(1), T = new GeoBuilder(1);
  const frame = 0x3a3b3f, glass = 0x9aaeb4;
  for (const [x, z] of [[-0.6, -1.6], [-0.6, 1.6], [0.55, -1.6], [0.55, 1.6]]) B.box(x, 1.2, z, 0.06, 2.4, 0.06, frame);
  B.box(0, 2.44, 0, 1.5, 0.09, 3.5, frame);
  B.box(0.72, 2.36, 0, 0.06, 0.16, 3.5, 0xe8e2d0);
  B.box(-0.6, 1.25, 0, 0.02, 1.9, 3.14, glass);
  B.box(-0.03, 1.25, -1.6, 1.12, 1.9, 0.02, glass);
  B.box(-0.03, 1.3, 1.6, 1.1, 2.0, 0.08, frame);
  B.box(-0.42, 0.48, 0, 0.34, 0.05, 1.9, HABBO_PALETTE.woodMid);
  for (const z of [-0.8, 0.8]) B.box(-0.5, 0.24, z, 0.05, 0.48, 0.05, frame);
  texQuad(T, [-0.03, 1.3, 1.556], [-1, 0, 0], [0, 1, 0], 0.95, 1.5, 'abriPoster');
  texQuad(T, [-0.03, 1.3, 1.644], [1, 0, 0], [0, 1, 0], 0.95, 1.5, 'abriPoster');
  tube(B, [0.9, 0, -2.1], [0.9, 2.7, -2.1], 0.04, STEEL, 5);
  B.box(0.9, 2.45, -2.1, 0.04, 0.34, 0.64, 0xf2f0e8);
  texQuad(T, [0.921, 2.45, -2.1], [0, 0, -1], [0, 1, 0], 0.62, 0.23, 'bushalte');
  texQuad(T, [0.879, 2.45, -2.1], [0, 0, 1], [0, 1, 0], 0.62, 0.23, 'bushalte');
  return finish(B, T);
}

function buildElecBox(col) {
  const B = new GeoBuilder(1);
  B.box(0, 0.05, 0, 0.42, 0.1, 0.95, 0x55575a);
  B.box(0, 0.65, 0, 0.36, 1.1, 0.9, col);
  B.box(0, 1.22, 0, 0.42, 0.05, 0.96, col);
  B.box(0.185, 0.66, 0, 0.01, 1.0, 0.012, 0x3a3b3f);
  B.box(0.185, 0.7, 0.15, 0.015, 0.1, 0.03, 0x3a3b3f);
  B.box(0.185, 1.0, -0.25, 0.01, 0.12, 0.12, 0xd9c24a);
  return finish(B);
}

function buildSignpost(names) {
  const B = new GeoBuilder(1), T = new GeoBuilder(1);
  const white = 0xe8e6e0;
  tube(B, [0, 0, 0], [0, 2.85, 0], 0.045, white, 6);
  B.geo(new THREE.ConeGeometry(0.06, 0.08, 6), composeMatrix(0, 2.89, 0), 0xb3211c);
  names.forEach((n, i) => {
    const dir = i % 2 ? -1 : 1, y = 2.55 - i * 0.3, cx = dir * 0.62;
    B.box(cx, y, 0, 1.12, 0.22, 0.03, 0xf4f2ec);
    const regFront = (dir > 0 ? 'bladeR' : 'bladeL') + n, regBack = (dir > 0 ? 'bladeL' : 'bladeR') + n;
    texQuad(T, [cx, y, 0.016], [1, 0, 0], [0, 1, 0], 1.1, 0.2, regFront);
    texQuad(T, [cx, y, -0.016], [-1, 0, 0], [0, 1, 0], 1.1, 0.2, regBack);
  });
  return finish(B, T);
}

function buildPoleSign(region, w, h, top = 2.5) {
  const B = new GeoBuilder(1), T = new GeoBuilder(1);
  tube(B, [0, 0, 0], [0, top + h / 2, 0], 0.035, STEEL, 5);
  B.box(0.03, top, 0, 0.02, h + 0.02, w + 0.02, 0x9a9a98);
  texQuad(T, [0.041, top, 0], [0, 0, -1], [0, 1, 0], w, h, region);
  return finish(B, T);
}

// Sign plate of any outline: pts in plate units (-1..1), textured from `region`
// on the front, plain grey on the back.
function buildShapedSign(region, pts, w, h, top) {
  const B = new GeoBuilder(1), T = new GeoBuilder(1);
  tube(B, [0, 0, 0], [0, top + h / 2, 0], 0.035, STEEL, 5);
  const [u0, v0, u1, v1] = uvRect(region);
  const P = (sx, sy, x) => [x, top + sy * h / 2, -sx * w / 2];
  const UV = (sx, sy) => [u0 + (sx + 1) / 2 * (u1 - u0), v0 + (sy + 1) / 2 * (v1 - v0)];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[0], b = pts[i], c = pts[i + 1];
    T.triOut(P(...a, 0.045), P(...b, 0.045), P(...c, 0.045), [1, 0, 0], 0xffffff, 0, [...UV(...a), ...UV(...b), ...UV(...c)]);
    B.triOut(P(...a, 0.03), P(...b, 0.03), P(...c, 0.03), [-1, 0, 0], 0x9a9a98);
  }
  return finish(B, T);
}

const TRI_DOWN = [[-1, 1], [1, 1], [0, -1]];
const OCTAGON = Array.from({ length: 12 }, (_, k) => [Math.cos(k * Math.PI / 6), Math.sin(k * Math.PI / 6)]);

// --- small litter (merged into the cell mesh, no props) -------------------------

function buildButts(n, seed) {
  const B = new GeoBuilder(1);
  for (let i = 0; i < n; i++) {
    const a = seed * 7.1 + i * 2.3, r = 0.08 + ((seed * 13 + i * 5) % 7) * 0.035;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    B.box(x, 0.008, z, 0.028, 0.012, 0.012, 0xe8e2d0, 0, 0, a, 0);
    B.box(x + Math.cos(a) * 0.019, 0.008, z - Math.sin(a) * 0.019, 0.012, 0.012, 0.013, 0xc98a4a, 0, 0, a, 0);
  }
  return finish(B);
}

function buildCan(color, lying) {
  const B = new GeoBuilder(1);
  if (lying) B.geo(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 6), composeMatrix(0, 0.033, 0, 0, 0.4, Math.PI / 2), color);
  else B.geo(new THREE.CylinderGeometry(0.033, 0.033, 0.11, 6), composeMatrix(0, 0.055, 0), color);
  return finish(B);
}

function buildCup() {
  const B = new GeoBuilder(1);
  B.geo(new THREE.CylinderGeometry(0.045, 0.032, 0.1, 6), composeMatrix(0, 0.04, 0, 0, 0.3, Math.PI / 2 - 0.2), 0xf2f0e8);
  B.box(0.03, 0.004, 0.05, 0.12, 0.004, 0.09, 0xb3211c, 0, 0, 0.8, 0);
  return finish(B);
}

function buildFlatPaper(region, w, h) {
  const B = new GeoBuilder(1), T = new GeoBuilder(1);
  B.box(0, 0.004, 0, w, 0.004, h, 0xe8e2d0);
  texQuad(T, [0, 0.0075, 0], [1, 0, 0], [0, 0, -1], w, h, region);
  return finish(B, T);
}

function buildBinBag() {
  const B = new GeoBuilder(1);
  B.geo(new THREE.IcosahedronGeometry(0.3, 0), composeMatrix(0, 0.26, 0, 0.2, 0.5, 0, 1, 0.85, 1), 0x1c1d1f);
  B.geo(new THREE.ConeGeometry(0.08, 0.14, 5), composeMatrix(0.02, 0.56, 0, 0.3, 0, 0), 0x1c1d1f);
  return finish(B);
}

function buildBikeWheel(rusty) {
  const B = new GeoBuilder(1);
  B.geo(new THREE.TorusGeometry(0.33, 0.028, 3, 10), composeMatrix(0, 0.03, 0, Math.PI / 2, 0, 0), BLACK);
  B.geo(new THREE.TorusGeometry(0.3, 0.012, 3, 10), composeMatrix(0, 0.03, 0, Math.PI / 2, 0, 0), rusty ? 0x8a4a2a : CHROME);
  for (let k = 0; k < 3; k++) B.box(0, 0.03, 0, 0.6, 0.006, 0.008, rusty ? 0x7a4a2a : STEEL, 0, 0, k * Math.PI / 3, 0);
  return finish(B);
}

function buildSaddle() {
  const B = new GeoBuilder(1);
  B.box(0, 0.035, 0, 0.26, 0.06, 0.15, 0x2a1d14, 0, 0, 0.4);
  tube(B, [0.02, 0.03, 0], [0.3, 0.02, 0.05], 0.013, CHROME, 4);
  return finish(B);
}

// A sticker on a wall: local +X is the wall normal, stuck at y = 0.
function buildStickerWall(k) {
  const T = new GeoBuilder(1);
  texQuad(T, [0.006, 0, 0], [0, 0, -1], [0, 1, 0], 0.09, 0.09, 'sticker' + k);
  return finish(new GeoBuilder(1), T);
}

function buildStoepbord(chalk) {
  const B = new GeoBuilder(1), T = new GeoBuilder(1);
  const t = 0.24, wood = HABBO_PALETTE.woodMid;
  for (const s of [1, -1]) {
    const cx = s * 0.12;
    B.box(cx, 0.48, 0, 0.03, 0.98, 0.58, wood, 0, 0, 0, s * t);
    const up = [-s * Math.sin(t), Math.cos(t), 0];
    const right = [0, 0, -s];
    const out = [s * Math.cos(t), s * Math.sin(t), 0];
    texQuad(T, [cx + out[0] * 0.017, 0.48 + out[1] * 0.017, 0], right, up, 0.52, 0.86, 'chalk' + chalk);
  }
  return finish(B, T);
}

function buildKiosk() {
  const B = new GeoBuilder(1), T = new GeoBuilder(1);
  const green = 0x2f5a3f;
  B.box(0, 1.2, 0, 1.9, 2.4, 2.4, green);
  B.box(0, 2.5, 0, 2.3, 0.14, 2.8, 0x3a3b3f);
  B.box(0.96, 1.35, 0, 0.04, 0.9, 1.9, 0x2a3236);
  B.box(1.05, 0.92, 0, 0.22, 0.05, 2.0, HABBO_PALETTE.woodLight);
  for (let i = 0; i < 6; i++) B.box(1.2, 1.95, -1.15 + i * 0.46, 0.5, 0.03, 0.46, i % 2 ? 0xe6e1d6 : 0x8f2f2a, 0, 0, 0, -0.3);
  B.box(1.0, 1.25, -0.6, 0.08, 0.3, 0.4, 0xd8c89a);
  texQuad(T, [0.955, 2.2, 0], [0, 0, -1], [0, 1, 0], 2.2, 0.33, 'kiosk');
  return finish(B, T);
}

function buildNietje() {
  const B = new GeoBuilder(1);
  const pts = [[-0.35, 0, 0], [-0.35, 0.62, 0], [-0.27, 0.72, 0], [0.27, 0.72, 0], [0.35, 0.62, 0], [0.35, 0, 0]];
  for (let i = 0; i < pts.length - 1; i++) tube(B, pts[i], pts[i + 1], 0.028, STEEL, 5);
  return finish(B);
}

function buildRailing() {
  const B = new GeoBuilder(1);
  const col = 0x2f4a3a;
  for (const x of [-1, 1]) B.box(x, 0.5, 0, 0.06, 1.0, 0.06, col);
  tube(B, [-1, 1.0, 0], [1, 1.0, 0], 0.04, col, 5);
  tube(B, [-1, 0.55, 0], [1, 0.55, 0], 0.02, col, 4);
  for (let i = 1; i < 8; i++) tube(B, [-1 + i * 0.25, 0.1, 0], [-1 + i * 0.25, 1.0, 0], 0.012, col, 3);
  tube(B, [-1, 0.1, 0], [1, 0.1, 0], 0.02, col, 4);
  return finish(B);
}

let P = null;

export function initClutter() {
  atlas = buildAtlas();
  const bikeCols = [0x1e1e1e, 0x1e1e1e, 0x1e1e1e, 0x23324a, 0x2f4a3a, 0x5a2a24, 0x3a3b3f, 0x8fb3a3, 0xd8cfb4, 0x6b2a5a];
  P = {
    bikes: [
      ...bikeCols.map((c) => buildBike(c)),
      buildBike(0x1e1e1e, 'crateRed'), buildBike(0x23324a, 'crateBlack'), buildBike(0x2f4a3a, 'bags'),
      buildBike(0xd8cfb4, 'basket'), buildBike(0x1e1e1e, 'crateBlack'), buildBike(0x5a2a24, 'bags'),
    ],
    scooters: [0xe6e1d6, 0x8f2f2a, 0x7fa9b8, 0x1e1e1e].map(buildScooter),
    klikos: [0x3f7a3a, 0x2a4f8a, 0x4a4d50, 0x3f7a3a].map(buildKliko),
    containers: [buildContainer(0x6b6e70), buildContainer(0x2a5a9a), buildContainer(0x2f7a3a, true), buildContainer(0xd0782a)],
    bollards: [buildBollard(0x2b2d2e, 0xe6e1d6), buildBollard(0x5a2a24, 0x2b2d2e), buildBollard(0x2b2d2e, 0x2b2d2e)],
    planters: [buildPlanterRect(false), buildPlanterRect(true)],
    planterTree: buildPlanterTree(),
    zuil: buildZuil(),
    abri: buildAbri(),
    elecBoxes: [buildElecBox(0x7d8a7a), buildElecBox(0xb5ae98), buildElecBox(0x6b6e70)],
    signposts: [[0, 3], [1, 2, 0], [4, 1], [5, 0, 2], [2, 1], [0, 4, 1]].map(buildSignpost),
    fietsstraat: buildPoleSign('fietsstraat', 0.6, 0.4, 2.2),
    parkeren: buildPoleSign('parkeren', 0.42, 0.42, 2.2),
    stoepborden: CHALK_LINES.map((_, i) => buildStoepbord(i)),
    kiosk: buildKiosk(),
    nietje: buildNietje(),
    railing: buildRailing(),
    b6: buildShapedSign('b6', TRI_DOWN, 0.75, 0.66, 2.1),
    d1: buildShapedSign('d1', OCTAGON, 0.6, 0.6, 2.75),
    busSign: buildPoleSign('bus', 0.5, 0.5, 2.3),
    butts: [3, 5, 8, 12].map((n, i) => buildButts(n, i + 1)),
    cans: [0x2f7a3a, 0xb9bcbf, 0xb3211c, 0xd9b21b, 0x2a4f8a].flatMap((c) => [buildCan(c, true), buildCan(c, false)]),
    cup: buildCup(),
    flyers: FLYERS.map((_, i) => buildFlatPaper('flyer' + i, 0.21, 0.29)),
    binBag: buildBinBag(),
    wheels: [buildBikeWheel(false), buildBikeWheel(true)],
    saddle: buildSaddle(),
    stickers: STICKERS.map((_, i) => buildStickerWall(i)),
  };
  return atlas;
}

// --- placement ----------------------------------------------------------------

const pick = (rng, arr) => arr[Math.floor(rng.next() * arr.length)];

function mat(x, y, angle, tilt = 0, y0 = 0) {
  return composeMatrix(x, y0, y, tilt, -angle, 0, 1, 1, 1, 'YXZ');
}

function item(geo, kind, x, y, angle, opts = {}) {
  const it = { geo, m: mat(x, y, angle, opts.tilt || 0, opts.y0 || 0) };
  if (kind) {
    const d = CLUTTER_PROPS[kind];
    it.prop = { kind, x, y, face: angle, axis: opts.axis ?? angle, opts: d ? { ...d } : null, tilted: !!opts.tilt };
    if (opts.half) it.prop.half = opts.half;
    if (geo.userData.tint !== undefined) it.prop.tint = geo.userData.tint;
    if (opts.locked) it.prop.locked = true;
  }
  return it;
}

function solid(map, x, y) {
  return isInsideBuilding(map, x, y) || isInWater(map, x, y);
}

// Free of buildings/water/trees and clear of carriageways. Residential and
// service streets may be overlapped a little: their edges, right against the
// facades, are exactly where Groningen parks its bikes.
function roadMargin(r, rad) {
  if (r.cat === 'major' || (r.cat === 'normal' && r.type !== 'residential')) return rad;
  if (r.cat === 'cycle') return rad - 0.3;
  if (r.cat === 'normal' || r.cat === 'minor') return rad - 0.7;
  return null;
}

function roadClear(map, x, y, rad) {
  for (const r of map.roadsNear(x, y, rad + 2)) {
    const m = roadMargin(r, rad);
    if (m === null) continue;
    const hw = (r.width || 5) / 2 + m;
    if (hw <= 0) continue;
    const pts = r.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      if (closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]).dist2 < hw * hw) return false;
    }
  }
  return true;
}

function spotOk(map, x, y, r) {
  if (solid(map, x, y)) return false;
  for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]]) if (solid(map, x + dx, y + dy)) return false;
  if (!roadClear(map, x, y, r)) return false;
  for (const t of map.treesNear(x, y, r + 1)) if (Math.hypot(t[0] - x, t[1] - y) < r + 0.6) return false;
  return true;
}

function findWall(map, x, y, nx, ny, from, to) {
  let prev = from;
  for (let d = from; d <= to; d += 0.35) {
    if (isInsideBuilding(map, x + nx * d, y + ny * d)) {
      if (d === from) return -1;
      let lo = prev, hi = d;
      for (let k = 0; k < 4; k++) {
        const m = (lo + hi) / 2;
        if (isInsideBuilding(map, x + nx * m, y + ny * m)) hi = m; else lo = m;
      }
      return lo;
    }
    prev = d;
  }
  return -1;
}

function samples(roads, cx0, cy0, CELL, filter, spacing, rng, fn) {
  for (const r of roads) {
    if (!filter(r)) continue;
    const pts = r.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 3) continue;
      const segA = Math.atan2(b[1] - a[1], b[0] - a[0]);
      for (let t = rng.range(0, spacing); t < len; t += spacing) {
        const x = a[0] + (b[0] - a[0]) * (t / len), y = a[1] + (b[1] - a[1]) * (t / len);
        if (x < cx0 || x >= cx0 + CELL || y < cy0 || y >= cy0 + CELL) continue;
        fn(r, x, y, segA);
      }
    }
  }
}

const hasSidewalk = (r) => r.cat === 'major' || r.cat === 'normal';
const edgeOff = (r) => (r.width || 5) / 2 + (hasSidewalk(r) ? 0.15 : 0);
const probeFrom = (r) => Math.max(0.5, (r.width || 5) / 2 - 1);
const isPedestrian = (r) => r.cat === 'foot' && (r.type === 'pedestrian' || r.type === 'living_street');
const isResidential = (r) => (r.cat === 'normal' && r.type === 'residential') || (r.cat === 'minor' && r.type !== 'track' && r.type !== 'service');

// A bike leaning with its side against something on side (nx, ny) of heading `a`.
function leanTilt(a, nx, ny, amt) {
  return (-Math.sin(a) * nx + Math.cos(a) * ny) > 0 ? amt : -amt;
}

function bikeItem(rng, x, y, a, tilt = 0, locked = false) {
  return item(pick(rng, P.bikes), 'bike', x, y, a, { tilt, y0: Math.abs(tilt) > 1 ? 0.04 : 0, locked });
}

function fallenBike(rng, x, y, a) {
  return bikeItem(rng, x, y, a, (rng.next() < 0.5 ? 1 : -1) * (Math.PI / 2 - 0.1));
}

// Bikes against a facade: perpendicular (front wheel to the wall) when there
// is room, otherwise parallel and leaning.
function facadeBikes(ctx, x, y, nx, ny, segA, wallD, n) {
  const { map, rng, items, clear, take } = ctx;
  const tx = Math.cos(segA), ty = Math.sin(segA);
  const wx = x + nx * wallD, wy = y + ny * wallD;
  const perp = wallD - (ctx.roadHW || 0) > 1.7 && rng.next() < 0.7;
  const spacing = perp ? 0.52 : 1.15;
  const depth = perp ? 0.95 : 0.42;
  const cxm = wx - nx * depth, cym = wy - ny * depth;
  const half = (n * spacing) / 2;
  if (!clear(cxm, cym, half + 0.3)) return 0;
  let placed = 0;
  for (let i = 0; i < n; i++) {
    const s = -half + spacing * (i + 0.5);
    const stagger = !perp && i % 2 ? 0.2 : 0;
    const bx = cxm + tx * s - nx * stagger, by = cym + ty * s - ny * stagger;
    const outer = perp ? [bx - nx * 0.85, by - ny * 0.85] : [bx - nx * 0.3, by - ny * 0.3];
    if (!spotOk(map, bx, by, 0.2) || !spotOk(map, outer[0], outer[1], 0.15)) continue;
    const roll = rng.next();
    if (roll < 0.06) {
      items.push(fallenBike(rng, bx - nx * 0.4, by - ny * 0.4, segA + rng.range(-0.4, 0.4)));
    } else if (perp) {
      const a = Math.atan2(ny, nx) + (roll < 0.25 ? Math.PI : 0) + rng.range(-0.18, 0.18);
      items.push(bikeItem(rng, bx, by, a, rng.range(-0.1, 0.1)));
    } else {
      const a = segA + (rng.next() < 0.5 ? 0 : Math.PI) + rng.range(-0.06, 0.06);
      items.push(bikeItem(rng, bx, by, a, leanTilt(a, nx, ny, 0.22 + rng.range(0, 0.06))));
    }
    placed++;
  }
  if (placed) take(cxm, cym, half + 0.2);
  return placed;
}

function facadeObject(ctx, r, x, y, segA, maxGap, fn) {
  const { map, rng } = ctx;
  const side = rng.next() < 0.5 ? 1 : -1;
  const nx = -Math.sin(segA) * side, ny = Math.cos(segA) * side;
  const wallD = findWall(map, x, y, nx, ny, probeFrom(r), edgeOff(r) + maxGap);
  if (wallD < 0) return false;
  ctx.roadHW = (r.width || 5) / 2;
  return fn(nx, ny, wallD);
}

function row(ctx, geos, kind, cx, cy, tx, ty, n, spacing, angle, r, opts) {
  const { map, items, clear, take } = ctx;
  const half = (n - 1) * spacing / 2;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const x = cx + tx * (-half + i * spacing), y = cy + ty * (-half + i * spacing);
    if (!spotOk(map, x, y, r) || !clear(x, y, r)) return false;
    pts.push([x, y]);
  }
  for (const [x, y] of pts) {
    take(x, y, r);
    items.push(item(typeof geos === 'function' ? geos() : geos, kind, x, y, angle, opts));
  }
  return true;
}

let yieldCells = null;
function yieldsInCell(map, cx0, cy0, CELL) {
  if (!yieldCells || yieldCells.map !== map || yieldCells.cell !== CELL) {
    yieldCells = { map, cell: CELL, byCell: new Map() };
    for (const yv of yieldArms(map)) {
      const k = Math.floor(yv.node.x / CELL) + ',' + Math.floor(yv.node.y / CELL);
      if (!yieldCells.byCell.has(k)) yieldCells.byCell.set(k, []);
      yieldCells.byCell.get(k).push(yv);
    }
  }
  return yieldCells.byCell.get(Math.floor(cx0 / CELL) + ',' + Math.floor(cy0 / CELL)) || [];
}

// ctx: { map, rng, cx0, cy0, CELL, centreD, roads, items, clear, take, horeca }
export function generateClutter(ctx) {
  if (!P) return;
  const { map, rng, cx0, cy0, CELL, centreD, roads, items, clear, take } = ctx;
  const inner = centreD < 500, mid = centreD < 1100, far = centreD > 1800;
  const S = (filter, spacing, fn) => samples(roads, cx0, cy0, CELL, filter, spacing, rng, fn);
  const nearRoad = roads.length > 0;
  if (!nearRoad) return;

  // Bridges: railings with bikes locked to them. The sections come from
  // bridgerails.js, which also builds their walker collision.
  for (const r of roads) {
    // (a movable span carries its own railings, movablebridges3d.js)
    if (!hasRailings(r) || r.movable) continue;
    const bikesOk = hasSidewalk(r) || r.cat === 'foot' || r.cat === 'cycle';
    for (const it of railingItems(map, r)) {
      const { x, y, angle: segA, tx, ty } = it;
      if (x < cx0 || x >= cx0 + CELL || y < cy0 || y >= cy0 + CELL) continue;
      items.push(item(P.railing, RAIL_KIND, x, y, segA, { half: RAIL_HALF }));
      if (!bikesOk || rng.next() > (inner ? 0.55 : mid ? 0.3 : 0.1)) continue;
      const nx = -ty * it.side, ny = tx * it.side;
      const cnt = 1 + Math.floor(rng.next() * 3);
      for (let j = 0; j < cnt; j++) {
        const s = -0.7 + j * 0.7 + rng.range(-0.1, 0.1);
        const bx = x + tx * s - nx * 0.4, by = y + ty * s - ny * 0.4;
        const ba = segA + (rng.next() < 0.5 ? 0 : Math.PI) + rng.range(-0.05, 0.05);
        items.push(bikeItem(rng, bx, by, ba, leanTilt(ba, nx, ny, 0.2 + rng.range(0, 0.07)), true));
      }
    }
  }

  // Bikes against facades: the defining Groningen street picture.
  const facadeP = inner ? 0.6 : mid ? 0.32 : far ? 0.06 : 0.14;
  S((r) => r.cat !== 'cycle' && r.cat !== 'major' && !r.bridge && (r.cat !== 'foot' || isPedestrian(r)), 9, (r, x, y, segA) => {
    if (rng.next() > facadeP) return;
    facadeObject(ctx, r, x, y, segA, 5, (nx, ny, wallD) => {
      if (inner && rng.next() < 0.08) {
        const bx = x + nx * (wallD - 0.5), by = y + ny * (wallD - 0.5);
        if (!spotOk(map, bx, by, 0.35) || !clear(bx, by, 0.9)) return false;
        take(bx, by, 0.9);
        items.push(item(pick(rng, P.scooters), 'scooter', bx, by, Math.atan2(ny, nx) + Math.PI / 2 + rng.range(-0.2, 0.2), { tilt: 0.12 }));
        return true;
      }
      const n = 2 + Math.floor(rng.next() * (inner ? 7 : 4));
      return facadeBikes(ctx, x, y, nx, ny, segA, wallD, n) > 0;
    });
  });

  // Fallen bikes lying about on pavements.
  if (mid) {
    S((r) => hasSidewalk(r) || isPedestrian(r), 40, (r, x, y, segA) => {
      if (rng.next() > (inner ? 0.25 : 0.1)) return;
      const side = rng.next() < 0.5 ? 1 : -1;
      const off = hasSidewalk(r) ? (r.width || 6) / 2 + 1.2 : (r.width || 4) * 0.35;
      const bx = x - Math.sin(segA) * side * off, by = y + Math.cos(segA) * side * off;
      if (!spotOk(map, bx, by, 0.4) || !clear(bx, by, 0.9)) return;
      take(bx, by, 0.9);
      items.push(fallenBike(rng, bx, by, segA + rng.range(-0.8, 0.8)));
    });
  }

  // Fietsnietjes in pedestrian streets, full of bikes.
  if (mid) {
    // a pedestrian street stays walkable: at most two racks per street in a cell
    const racks = new Map();
    S(isPedestrian, 22, (r, x, y, segA) => {
      if (rng.next() > (inner ? 0.4 : 0.25)) return;
      if ((racks.get(r) || 0) >= 2) return;
      racks.set(r, (racks.get(r) || 0) + 1);
      const side = rng.next() < 0.5 ? 1 : -1;
      const nx = -Math.sin(segA) * side, ny = Math.cos(segA) * side;
      const off = Math.max(1.2, (r.width || 4) * 0.38);
      const cx = x + nx * off, cy = y + ny * off;
      const tx = Math.cos(segA), ty = Math.sin(segA);
      const n = 3 + Math.floor(rng.next() * 4);
      const a = Math.atan2(ny, nx);
      if (!row(ctx, P.nietje, 'nietje', cx, cy, tx, ty, n, 1.0, a, 0.45, { half: 0.35 })) return;
      for (let i = 0; i < n; i++) {
        const s = -(n - 1) * 0.5 + i;
        for (const zs of [-0.28, 0.28]) {
          if (rng.next() < 0.22) continue;
          const bx = cx + tx * (s + zs), by = cy + ty * (s + zs);
          items.push(bikeItem(rng, bx, by, a + (rng.next() < 0.5 ? 0 : Math.PI) + rng.range(-0.1, 0.1), 0, true));
        }
      }
      if (rng.next() < 0.5) {
        const px = cx + tx * ((n + 1) * 0.5), py = cy + ty * ((n + 1) * 0.5);
        if (spotOk(map, px, py, 0.15) && clear(px, py, 0.2)) {
          take(px, py, 0.2);
          items.push(item(P.parkeren, 'signpost', px, py, Math.atan2(-ty, -tx)));
        }
      }
    });
  }

  // Kliko's at house fronts (and at the kerb on collection day).
  if (!inner || rng.next() < 0.3) {
    S((r) => isResidential(r) && !r.bridge, 13, (r, x, y, segA) => {
      if (rng.next() > (mid ? 0.28 : 0.4)) return;
      facadeObject(ctx, r, x, y, segA, 6, (nx, ny, wallD) => {
        const kerb = rng.next() < 0.3;
        const d = kerb ? edgeOff(r) + 0.5 : wallD - 0.45;
        if (kerb && d > wallD - 0.5) return false;
        const cx = x + nx * d, cy = y + ny * d;
        const n = 1 + Math.floor(rng.next() * 3);
        return row(ctx, () => pick(rng, P.klikos), 'kliko',
          cx, cy, Math.cos(segA), Math.sin(segA), n, 0.72, Math.atan2(-ny, -nx) + rng.range(-0.15, 0.15), 0.38);
      });
    });
  }

  // Underground waste containers: rows of steel columns on the pavement.
  if (!far || rng.next() < 0.3) {
    let sites = inner ? 2 : 1;
    S((r) => (hasSidewalk(r) || isResidential(r) || isPedestrian(r)) && !r.bridge, 30, (r, x, y, segA) => {
      if (sites <= 0 || rng.next() > 0.3) return;
      const side = rng.next() < 0.5 ? 1 : -1;
      const nx = -Math.sin(segA) * side, ny = Math.cos(segA) * side;
      const off = hasSidewalk(r) ? (r.width || 6) / 2 + 1.0 : (r.width || 4) / 2 + 1.0;
      const cx = x + nx * off, cy = y + ny * off;
      const n = 2 + Math.floor(rng.next() * 3);
      const first = Math.floor(rng.next() * 4);
      let k = 0;
      if (row(ctx, () => P.containers[(first + k++) % 4], 'container', cx, cy, Math.cos(segA), Math.sin(segA), n, 1.6, Math.atan2(-ny, -nx), 0.8)) {
        sites--;
        const tx = Math.cos(segA), ty = Math.sin(segA);
        const end = (n * 1.6) / 2 + 0.4;
        for (const sgn of [1, -1]) {
          if (rng.next() > 0.6) continue;
          const bx = cx + tx * end * sgn, by = cy + ty * end * sgn;
          if (solid(map, bx, by) || !clear(bx, by, 0.35)) continue;
          take(bx, by, 0.35);
          items.push(item(rng.next() < 0.6 ? P.binBag : pick(rng, P.cans), null, bx, by, rng.next() * 6.28, { y0: 0.15 }));
          if (rng.next() < 0.5) items.push(item(pick(rng, P.butts), null, bx + nx * 0.4, by + ny * 0.4, rng.next() * 6.28, { y0: 0.15 }));
        }
      }
    });
  }

  // Bollards: across pedestrian street mouths and along inner kerbs.
  if (mid) {
    for (const r of roads) {
      if (!isPedestrian(r) || r.pts.length < 2) continue;
      for (const [a, b] of [[r.pts[0], r.pts[1]], [r.pts[r.pts.length - 1], r.pts[r.pts.length - 2]]]) {
        if (a[0] < cx0 || a[0] >= cx0 + CELL || a[1] < cy0 || a[1] >= cy0 + CELL) continue;
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len < 5) continue;
        const tx = (b[0] - a[0]) / len, ty = (b[1] - a[1]) / len;
        const cx = a[0] + tx * 2.5, cy = a[1] + ty * 2.5;
        if (!isOnRoad(map, a[0], a[1], 3, ['major', 'normal', 'minor'])) continue;
        const n = Math.max(2, Math.min(6, Math.round((r.width || 4) / 1.4)));
        row(ctx, P.bollards[inner ? 0 : 1], 'bollard', cx, cy, -ty, tx, n, 1.4, Math.atan2(ty, tx), 0.12);
      }
    }
    // (rows of four to nine posts along the kerb of a street are gone: they stood in front of shop windows, in the Folkingestraat
    // among others (#419), and no street has them; the posts at the mouth of a pedestrian street above and the mapped ones stay)
  }

  // Planters in pedestrian areas.
  if (mid) {
    S(isPedestrian, 17, (r, x, y, segA) => {
      if (rng.next() > (inner ? 0.35 : 0.2)) return;
      const side = rng.next() < 0.5 ? 1 : -1;
      const nx = -Math.sin(segA) * side, ny = Math.cos(segA) * side;
      const off = Math.max(1.0, (r.width || 4) * 0.3);
      const bx = x + nx * off, by = y + ny * off;
      const tree = rng.next() < 0.35;
      const rad = tree ? 0.7 : 1.0;
      if (!spotOk(map, bx, by, rad) || !clear(bx, by, rad + 0.2)) return;
      take(bx, by, rad + 0.2);
      items.push(tree
        ? item(P.planterTree, 'planter', bx, by, segA, { half: 0.1 })
        : item(pick(rng, P.planters), 'planter', bx, by, segA + Math.PI / 2, { axis: segA, half: 0.5 }));
    });
  }

  // One-off pieces per cell: pick a few random sidewalk spots.
  const spot = (filter, offFn, r, tries = 12) => {
    const cand = roads.filter(filter);
    for (let k = 0; k < tries && cand.length; k++) {
      const road = pick(rng, cand);
      const i = Math.floor(rng.next() * (road.pts.length - 1));
      const a = road.pts[i], b = road.pts[i + 1];
      if (!a || !b) continue;
      const t = rng.next();
      const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      if (x < cx0 || x >= cx0 + CELL || y < cy0 || y >= cy0 + CELL) continue;
      const segA = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const side = rng.next() < 0.5 ? 1 : -1;
      const nx = -Math.sin(segA) * side, ny = Math.cos(segA) * side;
      const off = offFn(road);
      const px = x + nx * off, py = y + ny * off;
      if (!spotOk(map, px, py, r) || !clear(px, py, r)) continue;
      take(px, py, r);
      return { x: px, y: py, segA, nx, ny, road };
    }
    return null;
  };

  if (mid && rng.next() < (inner ? 0.6 : 0.35)) {
    const s = spot((r) => hasSidewalk(r) || isPedestrian(r), (r) => (hasSidewalk(r) ? (r.width || 6) / 2 + 1.1 : (r.width || 4) * 0.35), 0.75);
    if (s) items.push(item(P.zuil, 'zuil', s.x, s.y, rng.next() * Math.PI * 2));
  }

  if (rng.next() < (far ? 0.12 : 0.3)) {
    const s = spot((r) => hasSidewalk(r) && !r.bridge, (r) => (r.width || 6) / 2 + 1.0, 1.75, 16);
    if (s) {
      const ends = [-1.8, 1.8].map((d) => [s.x + Math.cos(s.segA) * d, s.y + Math.sin(s.segA) * d]);
      if (ends.every(([ex, ey]) => !solid(map, ex, ey) && !isOnRoad(map, ex, ey, 0.4, ['major', 'normal']))) {
        items.push(item(P.abri, 'abri', s.x, s.y, Math.atan2(-s.ny, -s.nx), { axis: s.segA, half: 1.25 }));
      }
    }
  }

  const boxes = inner ? 2 : 1;
  for (let k = 0; k < boxes; k++) {
    if (rng.next() > 0.55) continue;
    S((r) => r.cat !== 'cycle' && r.cat !== 'foot' && !r.bridge, 60, (r, x, y, segA) => {
      facadeObject(ctx, r, x, y, segA, 5, (nx, ny, wallD) => {
        const bx = x + nx * (wallD - 0.25), by = y + ny * (wallD - 0.25);
        if (!spotOk(map, bx, by, 0.3) || !clear(bx, by, 0.6)) return false;
        take(bx, by, 0.6);
        items.push(item(pick(rng, P.elecBoxes), 'elecbox', bx, by, Math.atan2(-ny, -nx), { axis: segA, half: 0.3 }));
        return true;
      });
    });
  }

  if (!inner && rng.next() < 0.35) {
    const s = spot((r) => (r.cat === 'cycle' || hasSidewalk(r)) && !r.bridge, (r) => (r.width || 4) / 2 + (hasSidewalk(r) ? 0.9 : 0.7), 0.4);
    if (s) items.push(item(pick(rng, P.signposts), 'signpost', s.x, s.y, s.segA));
  }

  if (mid && !inner && rng.next() < 0.45) {
    for (const r of roads) {
      if (!isResidential(r) || r.bridge || r.pts.length < 2) continue;
      const a = r.pts[0], b = r.pts[1];
      if (a[0] < cx0 || a[0] >= cx0 + CELL || a[1] < cy0 || a[1] >= cy0 + CELL) continue;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 8) continue;
      const tx = (b[0] - a[0]) / len, ty = (b[1] - a[1]) / len;
      const off = (r.width || 5) / 2 + 0.5;
      const x = a[0] + tx * 4 + ty * off, y = a[1] + ty * 4 - tx * off;
      if (!spotOk(map, x, y, 0.2) || !clear(x, y, 0.3)) continue;
      take(x, y, 0.3);
      items.push(item(P.fietsstraat, 'signpost', x, y, Math.atan2(-ty, -tx)));
      break;
    }
  }

  if (inner && rng.next() < 0.15) {
    const s = spot(isPedestrian, (r) => (r.width || 5) * 0.3, 1.7);
    if (s) items.push(item(P.kiosk, 'kiosk', s.x, s.y, Math.atan2(-s.ny, -s.nx), { axis: s.segA, half: 0.25 }));
  }

  // B6 (give way) at every arm that gives way, D1 above it at a roundabout;
  // the same arms carry the haaientanden (roadsurface.js).
  for (const yv of yieldsInCell(map, cx0, cy0, CELL)) {
    const half = (yv.road.width || 6) / 2;
    const rx = yv.uy, ry = -yv.ux;
    const along = yv.J + 1.4;
    const off = half + (hasSidewalk(yv.road) ? 0.9 : 0.5);
    const x = yv.node.x + yv.ux * along + rx * off, y = yv.node.y + yv.uy * along + ry * off;
    if (solid(map, x, y) || !clear(x, y, 0.25) || (map.offStreetLevel && map.offStreetLevel(x, y))) continue;
    take(x, y, 0.25);
    const face = Math.atan2(yv.uy, yv.ux);
    items.push(item(P.b6, 'signpost', x, y, face));
    if (yv.roundabout) items.push(item(P.d1, null, x, y, face));
  }

  // Bus lane signs where a bus lane or busway starts.
  for (const r of roads) {
    if (!(r.busOnly || r.busLane) || r.pts.length < 2 || r.bridge) continue;
    const a = r.pts[0], b = r.pts[1];
    if (a[0] < cx0 || a[0] >= cx0 + CELL || a[1] < cy0 || a[1] >= cy0 + CELL) continue;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 6) continue;
    const tx = (b[0] - a[0]) / len, ty = (b[1] - a[1]) / len;
    const off = (r.width || 6) / 2 + 0.8;
    const x = a[0] + tx * 3 - ty * off, y = a[1] + ty * 3 + tx * off;
    if (solid(map, x, y) || !clear(x, y, 0.25)) continue;
    take(x, y, 0.25);
    items.push(item(P.busSign, 'signpost', x, y, Math.atan2(-ty, -tx)));
  }

  // Litter: fag ends in the gutter and at doors, cans, cups and flyers on
  // the pavement, bin bags and cans next to the containers and klikos, odd
  // bike parts, stickers on facades. Tiny merged geometry, no props.
  const litterP = inner ? 1 : mid ? 0.6 : far ? 0.15 : 0.3;
  S((r) => hasSidewalk(r) || isPedestrian(r) || isResidential(r), 7, (r, x, y, segA) => {
    if (rng.next() > litterP * 0.55) return;
    const side = rng.next() < 0.5 ? 1 : -1;
    const nx = -Math.sin(segA) * side, ny = Math.cos(segA) * side;
    const pedestrian = isPedestrian(r);
    const gutter = !pedestrian && rng.next() < 0.45;
    const off = pedestrian ? rng.range(0.3, (r.width || 4) * 0.45) : gutter ? (r.width || 6) / 2 - 0.25 : edgeOff(r) + rng.range(0.4, 1.6);
    const lx = x + nx * off + Math.cos(segA) * rng.range(-2, 2), ly = y + ny * off + Math.sin(segA) * rng.range(-2, 2);
    if (solid(map, lx, ly)) return;
    const roll = rng.next();
    const a = rng.next() * Math.PI * 2;
    if (roll < 0.42) items.push(item(pick(rng, P.butts), null, lx, ly, a, { y0: gutter ? 0 : 0.15 }));
    else if (roll < 0.62) items.push(item(pick(rng, P.cans), null, lx, ly, a, { y0: gutter ? 0 : 0.15 }));
    else if (roll < 0.74) items.push(item(P.cup, null, lx, ly, a, { y0: gutter ? 0 : 0.15 }));
    else if (roll < 0.9) items.push(item(pick(rng, P.flyers), null, lx, ly, a, { y0: gutter ? 0.001 : 0.151 }));
    else if (roll < 0.95 && !gutter) items.push(item(pick(rng, P.wheels), null, lx, ly, a, { y0: 0.15 }));
    else if (!gutter) items.push(item(P.saddle, null, lx, ly, a, { y0: 0.15 }));
  });
  // stickers on the lower facade along busy pavements
  S((r) => hasSidewalk(r) || isPedestrian(r), 11, (r, x, y, segA) => {
    if (rng.next() > litterP * 0.45) return;
    facadeObject(ctx, r, x, y, segA, 5, (nx, ny, wallD) => {
      const n = 1 + Math.floor(rng.next() * 4);
      for (let k = 0; k < n; k++) {
        const t = rng.range(-0.8, 0.8);
        const sx = x + nx * (wallD - 0.01) + Math.cos(segA) * t, sy = y + ny * (wallD - 0.01) + Math.sin(segA) * t;
        items.push(item(pick(rng, P.stickers), null, sx, sy, Math.atan2(-ny, -nx), { y0: rng.range(0.9, 1.8) + (hasSidewalk(r) ? 0.15 : 0) }));
      }
      return true;
    });
  });

  // Sandwich boards and scooters at horeca doors.
  for (const h of (ctx.horeca || []).slice(0, 5)) {
    let done = false;
    for (const rr of [1.2, 2, 2.8]) {
      if (done) break;
      for (let k = 0; k < 12 && !done; k++) {
        const a = (k / 12) * Math.PI * 2 + rng.next() * 0.3;
        const x = h.x + Math.cos(a) * rr, y = h.y + Math.sin(a) * rr;
        if (!spotOk(map, x, y, 0.35) || !clear(x, y, 0.5)) continue;
        take(x, y, 0.5);
        if (rng.next() < 0.7) items.push(item(pick(rng, P.stoepborden), 'stoepbord', x, y, a + Math.PI / 2));
        const sx = x + Math.cos(a + Math.PI / 2) * 1.6, sy = y + Math.sin(a + Math.PI / 2) * 1.6;
        if (rng.next() < 0.4 && spotOk(map, sx, sy, 0.4) && clear(sx, sy, 0.8)) {
          take(sx, sy, 0.8);
          items.push(item(pick(rng, P.scooters), 'scooter', sx, sy, a + Math.PI / 2 + rng.range(-0.3, 0.3), { tilt: 0.12 }));
        }
        done = true;
      }
    }
  }
}
