import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { markShared } from './pixelart3d.js';

// Small procedural shop products for the shop preview (shopui.js via
// vehiclepreview.js): snacks, drinks, papers, lottery tickets, the stamp card, EIKEA
// vests and workshop parts. Units are "table-top": roughly 1 = 10 cm, the
// preview frames by bounding box. Materials are shared per colour, geometry
// and label textures belong to the mesh (disposed with it).

const mats = new Map();
function mat(color, roughness = 0.7, metalness = 0) {
  const k = `${color}|${roughness}|${metalness}`;
  let m = mats.get(k);
  if (!m) { m = markShared(new THREE.MeshStandardMaterial({ color, roughness, metalness })); mats.set(k, m); }
  return m;
}

function labelMat(lines, bg, fg, w = 128, h = 128) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  lines.forEach(([t, size, y, color], i) => {
    g.font = `bold ${size}px 'Arial Narrow', Arial, sans-serif`;
    if (color) g.fillStyle = color;
    g.fillText(t, w / 2, y ?? (h / (lines.length + 1)) * (i + 1));
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
}

function add(g, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  g.add(o);
  return o;
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, n = 16) => new THREE.CylinderGeometry(rt, rb, h, n);
const ball = (r, n = 16) => new THREE.SphereGeometry(r, n, Math.round(n * 0.7));
const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 5, 12);

const BREAD = 0xb8742c;
const CRUMB = 0x9a5a1e;
const FRY = 0xe8c050;
const MAYO = 0xf2ecd0;
const WHITE = 0xeeeae2;
const PAPER = 0xe8e2d0;

// breaded snack with crumb bumps
function breaded(g, geo, color, bumps, spread, y) {
  add(g, geo, mat(color, 0.95), 0, y);
  const bg = ball(0.06, 6);
  for (let i = 0; i < bumps; i++) {
    const a = i * 2.399, t = (i / bumps) * 2 - 1;
    add(g, bg, mat(CRUMB, 1), Math.cos(a) * spread[0] * Math.sqrt(1 - t * t), y + t * spread[1], Math.sin(a) * spread[2] * Math.sqrt(1 - t * t));
  }
}

function tray(g, w, d, color = 0xe8e6e0) {
  add(g, box(w, 0.08, d), mat(color, 0.5, color === 0xc8ccd0 ? 0.8 : 0), 0, 0.04);
  for (const s of [-1, 1]) {
    add(g, box(w, 0.35, 0.05), mat(color, 0.5, color === 0xc8ccd0 ? 0.8 : 0), 0, 0.2, s * d / 2);
    add(g, box(0.05, 0.35, d), mat(color, 0.5, color === 0xc8ccd0 ? 0.8 : 0), s * w / 2, 0.2, 0);
  }
}

function fries(g, n, w, d, y, seed = 1) {
  const geo = box(0.12, 0.12, 1);
  for (let i = 0; i < n; i++) {
    const r = Math.sin(i * 12.9898 + seed) * 43758.5453;
    const f = r - Math.floor(r), f2 = (r * 7.1) - Math.floor(r * 7.1);
    add(g, geo, mat(FRY, 0.8), (f - 0.5) * w, y + (i % 3) * 0.1, (f2 - 0.5) * d, 0.2 * (f2 - 0.5), f * 3, 0.15);
  }
}

function sauce(g, color, x, z, y, r = 0.3) {
  add(g, ball(r, 10), mat(color, 0.3), x, y, z).scale.set(1, 0.4, 1);
}

function bag(g, color, w, h, label) {
  const body = add(g, box(w, h, 0.5), label ? labelMat(label, `#${color.toString(16).padStart(6, '0')}`, '#f0ede4') : mat(color, 0.4), 0, h / 2);
  add(g, box(w * 1.02, 0.18, 0.18), mat(color, 0.4), 0, h + 0.05);
  return body;
}

function card(g, w, h, lines, bg, fg) {
  const m = labelMat(lines, bg, fg, 256, Math.round(256 * h / w));
  const mats6 = [mat(0xdddddd), mat(0xdddddd), mat(0xdddddd), mat(0xdddddd), m, mat(0xd8d4cc)];
  add(g, box(w, h, 0.03), mats6, 0, h / 2 + 0.2, 0, -0.12);
}

const BUILD = {
  eierbal(g) { breaded(g, ball(0.9, 20), BREAD, 36, [0.85, 0.95, 0.85], 1.0); g.children[0].scale.set(1, 1.12, 1); add(g, box(2.4, 0.06, 2.4), mat(PAPER), 0, 0.03); },
  kroket(g) { add(g, capsule(0.5, 1.6), mat(BREAD, 0.95), 0, 0.55, 0, 0, 0, Math.PI / 2); breaded(g, box(0.01, 0.01, 0.01), BREAD, 30, [1.2, 0.4, 0.4], 0.55); add(g, box(3, 0.06, 1.6), mat(PAPER), 0, 0.03); },
  frikandel(g) {
    add(g, box(3.6, 0.1, 1.4), mat(0xe8e6e0, 0.5), 0, 0.05);
    add(g, capsule(0.28, 2.8), mat(0x8a4a2a, 0.6), 0, 0.38, 0, 0, 0, Math.PI / 2);
    add(g, box(2.4, 0.08, 0.3), mat(MAYO, 0.3), 0, 0.68, -0.05);
    add(g, box(2.4, 0.08, 0.2), mat(0xb8341e, 0.3), 0, 0.7, 0.14);
    const u = box(0.1, 0.06, 0.1);
    for (let i = 0; i < 14; i++) add(g, u, mat(0xe8e0b0, 0.6), -1.1 + i * 0.17, 0.76, Math.sin(i * 3) * 0.12);
  },
  oorlog(g) { tray(g, 2.2, 1.5); fries(g, 26, 1.8, 1.1, 0.35, 2); sauce(g, MAYO, -0.3, 0, 0.62, 0.45); sauce(g, 0x8a5a24, 0.35, 0.15, 0.66, 0.4); for (let i = 0; i < 8; i++) add(g, box(0.1, 0.06, 0.1), mat(0xf0ecd8), Math.sin(i) * 0.5, 0.78, Math.cos(i * 2) * 0.3); },
  patat(g) { add(g, cyl(0.8, 0.35, 1.6, 12), mat(0xc8261e, 0.6), 0, 0.8); fries(g, 18, 1.0, 1.0, 1.55, 5); sauce(g, MAYO, 0, 0, 1.85, 0.4); },
  kapsalon(g) { tray(g, 2.4, 1.6, 0xc8ccd0); fries(g, 24, 2, 1.2, 0.3, 3); add(g, box(2, 0.25, 1.2), mat(0xc88a4a, 0.8), 0, 0.62); add(g, box(2.1, 0.1, 1.3), mat(0xf0d060, 0.5), 0, 0.78); for (let i = 0; i < 10; i++) add(g, box(0.3, 0.05, 0.2), mat(0x4a9a3a, 0.8), Math.sin(i * 2.1) * 0.8, 0.86, Math.cos(i * 1.3) * 0.45, 0, i); },
  krentenbol(g) { add(g, ball(0.9, 20), mat(0xc8843a, 0.8), 0, 0.6).scale.set(1, 0.65, 1); const d = ball(0.07, 6); for (let i = 0; i < 18; i++) { const a = i * 2.4, t = i / 18; add(g, d, mat(0x2a1a14, 0.8), Math.cos(a) * 0.85 * Math.sqrt(1 - t * t), 0.6 + t * 0.55, Math.sin(a) * 0.85 * Math.sqrt(1 - t * t)); } },
  koffie(g) { add(g, cyl(0.55, 0.42, 1.8, 18), mat(0xf0ede4, 0.3), 0, 0.9); add(g, cyl(0.52, 0.52, 0.05, 18), mat(0x5a3a22, 0.3), 0, 1.6); add(g, cyl(0.58, 0.58, 0.12, 18), mat(0xf0ede4, 0.3), 0, 1.86); add(g, cyl(0.05, 0.05, 1.2, 8), mat(0x1e9e56, 0.4), 0.15, 2.2, 0, 0, 0, 0.2); add(g, cyl(0.56, 0.5, 0.5, 18), mat(0x8a5a2a, 0.6), 0, 0.9); },
  mok(g) { add(g, cyl(0.5, 0.45, 1.1, 18), mat(0xe8e6e0, 0.3), 0, 0.55); add(g, cyl(0.46, 0.46, 0.04, 18), mat(0x2a1a10, 0.2), 0, 1.06); add(g, new THREE.TorusGeometry(0.28, 0.07, 8, 16), mat(0xe8e6e0, 0.3), 0.55, 0.55); add(g, box(0.5, 0.2, 0.02), mat(0xe8d8b8), -0.2, 0.5, 0.5); },
  drop(g) { bag(g, 0x1b1716, 1.6, 2, [['DROP', 34, 45, '#e8c93a'], ['dubbelzout', 18, 85, '#f0ede4']]); const d = cyl(0.2, 0.2, 0.1, 6); for (let i = 0; i < 5; i++) add(g, d, mat(0x151212, 0.3), -1.4 + i * 0.25, 0.05, 0.8 + (i % 2) * 0.2); },
  energie(g) { add(g, cyl(0.45, 0.45, 1.9, 18), labelMat([['GRUNN', 26, 40, '#e8c93a'], ['BULL', 34, 80, '#f0ede4']], '#1d4fa3', '#fff'), 0, 0.95); add(g, cyl(0.4, 0.45, 0.12, 18), mat(0xb8bec4, 0.3, 0.8), 0, 1.96); add(g, cyl(0.42, 0.42, 0.08, 18), mat(0xb8bec4, 0.3, 0.8), 0, 0.04); },
  ehbo(g) { add(g, box(2, 1.3, 1), mat(0x1e9e56, 0.5), 0, 0.65); add(g, box(0.9, 0.3, 0.02), mat(WHITE), 0, 0.7, 0.51); add(g, box(0.3, 0.9, 0.02), mat(WHITE), 0, 0.7, 0.51); add(g, box(0.8, 0.1, 0.2), mat(0x222222), 0, 1.35); },
  koek(g) { add(g, box(2.6, 0.5, 1), mat(0x7a3e1a, 0.8), 0, 0.25); add(g, box(2.62, 0.06, 1.02), mat(0x5a2a10, 0.6), 0, 0.5); for (let i = 0; i < 4; i++) add(g, box(0.04, 0.02, 1), mat(0x4a2210), -0.9 + i * 0.6, 0.54, 0); },
  kauwgom(g) { add(g, box(1.6, 0.35, 0.8), labelMat([['FRIS', 40, 64, '#1e5ea8']], '#e8f4f8', '#1e5ea8'), 0, 0.18); add(g, box(0.9, 0.08, 0.6), mat(0xe8f4f8, 0.3), 0.7, 0.04, 0.3, 0, 0.4); },
  ballen(g) { add(g, cyl(1.5, 1.2, 0.15, 24), mat(WHITE, 0.3), 0, 0.08); const b = ball(0.28, 10); for (let i = 0; i < 10; i++) { const a = i * 0.9, r = i < 3 ? 0.25 : 0.75; add(g, b, mat(0x6a3a1e, 0.8), Math.cos(a) * r, 0.36, Math.sin(a) * r); } add(g, ball(0.35, 12), mat(0xb8202a, 0.3), 0.9, 0.2, 0.6).scale.set(1, 0.4, 1); add(g, ball(0.6, 12), mat(0x7a4a2a, 0.3), -0.6, 0.2, -0.6).scale.set(1, 0.3, 1); },
  hotdog(g) { add(g, capsule(0.38, 1.6), mat(0xd89a50, 0.9), 0, 0.4, 0, 0, 0, Math.PI / 2).scale.set(1, 1, 1.3); add(g, capsule(0.2, 2.1), mat(0xa84a2a, 0.5), 0, 0.72, 0, 0, 0, Math.PI / 2); add(g, box(1.8, 0.06, 0.1), mat(0xe8b820, 0.3), 0, 0.93); },
  krant(g) {
    const m = labelMat([['GRUNNEGER', 26, 22], ['KWEBBELKRANT', 22, 48], ['Duif steelt', 16, 80, '#333'], ['eierbal!', 16, 100, '#333']], '#ece6d6', '#1b1c1f');
    add(g, box(2.2, 0.08, 3), [mat(PAPER), mat(PAPER), m, mat(PAPER), mat(PAPER), mat(PAPER)], 0, 0.3, 0, -0.9);
    add(g, box(2.2, 0.05, 3), mat(0xd8d2c0), 0, 0.02, -0.4, -0.15);
  },
  strip(g) { add(g, box(2, 2.6, 0.2), [mat(0xe8e6e0), mat(0xe8e6e0), mat(0xe8e6e0), mat(0xe8e6e0), labelMat([['TAMMO', 28, 30, '#c8261e'], ['en de', 16, 55, '#1b1c1f'], ['EIERBAL', 28, 80, '#c8261e'], ['deel 12', 14, 110, '#1b1c1f']], '#e8c93a', '#000', 128, 160), mat(0x1b1c1f)], 0, 1.3, 0, -0.15); },
  kaart(g) { card(g, 2.6, 1.8, [['Groeten uit', 30, 45, '#1b1c1f'], ['GRUNN', 60, 105, '#1e9e56']], '#9ccbe8', '#000'); },
  kraskaart(g) { card(g, 1.8, 2.6, [['GRUNNEGER', 26, 40, '#f0ede4'], ['GOKJE', 40, 80, '#e8c93a'], ['▒▒▒ ▒▒▒', 30, 160, '#c8ccd0'], ['▒▒▒ ▒▒▒', 30, 200, '#c8ccd0'], ['€500', 30, 300, '#e8c93a']], '#c23f78', '#fff'); },
  lot(g) { card(g, 2.8, 1.4, [['STADSLOTERIJ', 26, 30, '#1b1c1f'], ['Nr. 050-1234', 22, 70, '#1b1c1f'], ['€2500', 34, 108, '#c8261e']], '#f0e6b8', '#000'); },
  duifkaart(g) { card(g, 1.8, 2.2, [['DUIVEN', 30, 40, '#f0ede4'], ['KRASLOT', 26, 74, '#f0ede4'], ['▒▒▒▒▒', 34, 150, '#c8ccd0'], ['€150', 30, 240, '#e8c93a']], '#4a6a8a', '#fff'); },
  spaarkaart(g) { card(g, 2.8, 1.8, [['ROOK & GELUK', 22, 30, '#f0ede4'], ['SPAARKAART', 30, 64, '#e8c93a'], ['● ● ● ● ●', 28, 104, '#f0ede4'], ['● ● ○ ○ ○', 28, 140, '#f0ede4']], '#c23f78', '#fff'); },
  kast(g) {
    const w = mat(0xe8d8b0, 0.8);
    for (const x of [-1, 1]) add(g, box(0.12, 3.6, 1), w, x, 1.8);
    for (let i = 0; i < 5; i++) add(g, box(2.1, 0.1, 1), w, 0, 0.05 + i * 0.88);
    add(g, box(2.1, 3.6, 0.04), mat(0xd8c8a0), 0, 1.8, -0.5);
    const cols = [0xa11f1f, 0x1e5ea8, 0x1e9e56, 0xe8c93a, 0x6a2e8a];
    for (let s = 0; s < 3; s++) for (let i = 0; i < 6; i++) add(g, box(0.18, 0.62 - (i % 3) * 0.08, 0.7), mat(cols[(i + s) % 5], 0.7), -0.8 + i * 0.22, 0.98 + s * 0.88 + 0.3 - (i % 3) * 0.04, 0);
  },
  bank(g) { const c = mat(0x5a6a7a, 0.95); add(g, box(3.6, 0.6, 1.5), c, 0, 0.55); add(g, box(3.6, 1.2, 0.35), c, 0, 1.2, -0.6); for (const x of [-1.85, 1.85]) add(g, box(0.35, 0.95, 1.5), c, x, 0.7); for (const x of [-0.88, 0.88]) add(g, box(1.7, 0.3, 1.2), mat(0x6a7a8a, 0.95), x, 1.0, 0.1); for (const x of [-1.8, 1.8]) for (const z of [-0.6, 0.6]) add(g, cyl(0.07, 0.05, 0.25, 8), mat(0x3a2a1a), x, 0.12, z); },
  lamp(g) { add(g, cyl(0.5, 0.6, 0.12, 20), mat(0xe8e6e0, 0.4), 0, 0.06); add(g, cyl(0.05, 0.05, 2.4, 8), mat(0xe8e6e0, 0.4), 0, 1.25); add(g, cyl(0.45, 0.85, 0.8, 20, 1), mat(0xf4d27a, 0.8), 0, 2.7); add(g, ball(0.18, 10), new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffd870, emissiveIntensity: 1 }), 0, 2.55); },
  bed(g) {
    const w = mat(0xe8d8b0, 0.8);
    add(g, box(4, 0.8, 5), w, 0, 0.4);
    add(g, box(3.8, 0.45, 4.8), mat(0xf1efe9, 0.9), 0, 1.02);
    add(g, box(3.9, 0.22, 3.1), mat(0x1d4fa3, 0.9), 0, 1.3, 0.85);
    add(g, box(3.92, 0.24, 0.35), mat(0xe8c93a, 0.9), 0, 1.31, -0.55);
    for (const x of [-0.95, 0.95]) add(g, box(1.5, 0.3, 0.8), mat(WHITE, 0.9), x, 1.38, -1.8);
    add(g, box(4.1, 2.4, 0.22), w, 0, 1.2, -2.5);
    for (let i = 0; i < 5; i++) add(g, box(0.5, 1.6, 0.05), mat(0xd8c8a0), -1.6 + i * 0.8, 1.35, -2.37);
  },
  // een klein huisje (safehouse, #436): witte muren, rood dak, deur en twee ramen
  huisje(g) {
    const wall = mat(0xe8dcc0, 0.9), roof = mat(0xa8442a, 0.85), dark = mat(0x3a2a1a, 0.7);
    add(g, box(5.4, 2.6, 4.4), wall, 0, 1.3);
    add(g, box(5.6, 0.12, 2.7), roof, 0, 3.15, 1.0, -0.62);
    add(g, box(5.6, 0.12, 2.7), roof, 0, 3.15, -1.0, 0.62);
    add(g, box(5.4, 0.3, 0.12), wall, 0, 2.75, 2.2);
    add(g, box(1.0, 1.9, 0.08), dark, 0, 0.95, 2.22);
    for (const x of [-1.8, 1.8]) {
      add(g, box(1.1, 0.9, 0.08), mat(0x9ccbe8, 0.2), x, 1.5, 2.22);
      add(g, box(1.2, 0.08, 0.1), mat(WHITE, 0.6), x, 0.98, 2.24);
    }
    add(g, box(0.6, 1.4, 0.6), mat(0x8a4a3a, 0.9), 1.6, 3.5, -0.4);
  },
  tv(g) {
    add(g, box(3.4, 1.0, 1.0), mat(0x2a2c30, 0.6), 0, 0.5);
    add(g, box(0.5, 0.5, 0.3), mat(0x1b1c1f, 0.5), 0, 1.25);
    add(g, box(3.6, 2.1, 0.14), mat(0x1b1c1f, 0.4), 0, 2.5);
    const scr = labelMat([['KIEKDOAR', 34, 50, '#e8c93a'], ['TV', 50, 100, '#f0ede4']], '#1e3a5a', '#fff', 192, 112);
    scr.emissive = new THREE.Color(0x6a8aa8); scr.emissiveMap = scr.map;
    add(g, box(3.4, 1.9, 0.02), scr, 0, 2.5, 0.08);
  },
  plant(g) {
    add(g, cyl(0.62, 0.45, 1.0, 14), mat(0xb8603a, 0.9), 0, 0.5);
    add(g, cyl(0.58, 0.58, 0.05, 14), mat(0x3a2a1a, 1), 0, 0.98);
    const leaf = ball(0.55, 10);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4, r = 0.25 + (i % 3) * 0.22;
      add(g, leaf, mat(i % 2 ? 0x3c7a3a : 0x4f9a48, 0.8), Math.cos(a) * r, 1.5 + (i % 4) * 0.45, Math.sin(a) * r).scale.set(1, 1.3, 0.5);
    }
    for (const x of [1.1, 1.6]) { add(g, cyl(0.2, 0.16, 0.35, 10), mat(0xb8603a, 0.9), x, 0.18, 0.5); add(g, ball(0.18, 8), mat(0x4f9a48, 0.8), x, 0.45, 0.5); }
  },
  bureau(g) {
    const w = mat(0xe8d8b0, 0.8);
    add(g, box(4, 0.12, 1.8), w, 0, 2.3);
    for (const x of [-1.9, 1.9]) add(g, box(0.1, 2.3, 1.7), w, x, 1.15);
    add(g, box(1.2, 1.6, 1.6), w, 1.2, 1.4);
    add(g, box(0.3, 0.6, 0.3), mat(0x2a2c30), 0, 2.6, -0.55);
    add(g, box(2.0, 1.2, 0.1), mat(0x1b1c1f, 0.4), 0, 3.4, -0.6);
    const scr = labelMat([['UBBO', 34, 44, '#3fc97a'], ['+10%', 28, 88, '#f0ede4']], '#15241a', '#fff', 160, 112);
    scr.emissive = new THREE.Color(0x3a6a4a); scr.emissiveMap = scr.map;
    add(g, box(1.85, 1.05, 0.02), scr, 0, 3.4, -0.54);
    add(g, box(1.4, 0.06, 0.45), mat(0x2a2c30), -0.1, 2.39, 0.25);
    add(g, cyl(0.16, 0.14, 0.35, 10), mat(0xc8261e, 0.4), 1.4, 2.53, 0.3);
  },
  frituur(g) {
    const st = mat(0xb8bec4, 0.3, 0.8);
    add(g, box(1.8, 1.2, 1.4), st, 0, 0.6);
    add(g, box(1.6, 0.04, 1.2), mat(0xd9a53a, 0.2), 0, 1.21);
    add(g, box(1.1, 0.5, 0.9), mat(0x9a9ea2, 0.5, 0.6), 0, 1.3, 0);
    add(g, box(0.12, 0.12, 1.2), mat(0x1b1c1f), 0, 1.5, 0.95);
    add(g, box(1.0, 0.25, 0.04), labelMat([['VETPOT', 40, 64, '#1b1c1f']], '#e8c93a', '#000', 160, 128), 0, 0.8, 0.71);
    for (const x of [-0.6, 0.6]) add(g, cyl(0.1, 0.1, 0.1, 10), mat(0xc8261e), x, 1.0, 0.72, Math.PI / 2);
  },
  prikbord(g) {
    const c = document.createElement('canvas');
    c.width = 192; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#cfe0b8'; x.fillRect(0, 0, 192, 128);
    x.strokeStyle = '#4a86b8'; x.lineWidth = 7;
    x.beginPath(); x.arc(96, 64, 38, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = '#f0ede4'; x.lineWidth = 4;
    x.beginPath(); x.moveTo(0, 64); x.lineTo(192, 64); x.moveTo(96, 0); x.lineTo(96, 128); x.moveTo(20, 10); x.lineTo(170, 118); x.stroke();
    x.fillStyle = '#1b1c1f'; x.font = "bold 20px 'Arial Narrow', Arial, sans-serif"; x.textAlign = 'center'; x.fillText('GRUNN', 96, 70);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    add(g, box(3.4, 2.4, 0.14), mat(0x8a5a36, 0.9), 0, 1.2);
    add(g, box(3.1, 2.1, 0.02), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), 0, 1.2, 0.08);
    const pin = ball(0.09, 6);
    [[-1, 0.6, 0xc8261e], [0.8, 0.3, 0xe8c93a], [0.3, -0.6, 0x1d4fa3], [-0.5, -0.3, 0x3fc97a], [1.2, 0.8, 0xc8261e]].forEach(([px, py, col]) => add(g, pin, mat(col, 0.4), px, 1.2 + py, 0.14));
  },
  tas(g) { const b = mat(0x1d4fa3, 0.5); add(g, box(2.8, 1.8, 1.2), b, 0, 0.9); for (const x of [-0.7, 0.7]) add(g, new THREE.TorusGeometry(0.45, 0.07, 6, 16, Math.PI), mat(0xe8c93a, 0.6), x, 1.8, 0); add(g, box(2.82, 0.12, 1.22), mat(0xe8c93a, 0.6), 0, 1.72); },
  pakket(g) { add(g, box(4.4, 0.6, 1.8), mat(0xc8a878, 0.9), 0, 0.3); add(g, box(4.42, 0.3, 0.5), mat(0x1d4fa3, 0.6), 0, 0.3, 0); add(g, box(1.2, 0.02, 0.5), mat(0xe8c93a, 0.6), -1.2, 0.61, 0.4); },
  potlood(g) { add(g, cyl(0.12, 0.12, 2.4, 6), mat(0xe8d8b0, 0.7), 0, 0.14, 0, 0, 0, Math.PI / 2); add(g, cyl(0.001, 0.12, 0.35, 6), mat(0xd8b88a), 1.37, 0.14, 0, 0, 0, -Math.PI / 2); add(g, box(0.4, 0.26, 0.16), mat(0x1d4fa3), -1.0, 0.14, 0); for (let i = 1; i < 4; i++) add(g, cyl(0.12, 0.12, 2.4, 6), mat(0xe8d8b0, 0.7), 0.1 * i, 0.14, 0.3 * i, 0, 0.2 * i, Math.PI / 2); },
  vest(g) { const v = mat(0x2a3a2a, 0.8); add(g, box(2.2, 2.6, 0.7), v, 0, 1.4); for (const x of [-0.55, 0.55]) add(g, box(0.5, 0.6, 0.72), v, x, 2.95); for (const x of [-0.5, 0.5]) for (const y of [0.8, 1.6]) add(g, box(0.8, 0.65, 0.12), mat(0x3a4a3a, 0.5), x, y, 0.38); add(g, box(2.24, 0.25, 0.74), mat(0x1c1c1e), 0, 0.5); },
  bodywarmer(g) { const v = mat(0x2f5c8a, 0.9); add(g, box(2.2, 2.4, 0.7), v, 0, 1.3); for (const x of [-0.55, 0.55]) add(g, box(0.5, 0.5, 0.72), v, x, 2.7); for (let i = 0; i < 4; i++) add(g, box(2.24, 0.06, 0.74), mat(0x234a70), 0, 0.5 + i * 0.55); add(g, box(0.06, 2.4, 0.74), mat(0xb8bec4, 0.3, 0.7), 0, 1.3); },
  moersleutel(g) { const m = mat(0xb8bec4, 0.3, 0.9); add(g, box(3, 0.3, 0.12), m, 0, 0.3); add(g, new THREE.TorusGeometry(0.38, 0.14, 8, 16, Math.PI * 1.5), m, 1.7, 0.3, 0, 0, 0, Math.PI * 0.75); add(g, new THREE.TorusGeometry(0.3, 0.12, 8, 16), m, -1.7, 0.3); add(g, box(1.2, 0.8, 0.8), mat(0xc8261e, 0.4, 0.2), -0.2, 0.4, -1.4); },
  kenteken(g) { card(g, 3.4, 0.8, [['GR-050-EB', 40, 32, '#1b1c1f']], '#e8c01a', '#000'); },
  band(g) { add(g, new THREE.TorusGeometry(1.2, 0.14, 10, 32), mat(0x1b1c1f, 0.9), 0, 1.4); add(g, cyl(0.12, 0.12, 0.3, 12), mat(0xb8bec4, 0.3, 0.8), 0, 1.4, 0, Math.PI / 2); for (let i = 0; i < 12; i++) add(g, cyl(0.012, 0.012, 1.1, 4), mat(0xd8dce0, 0.3, 0.8), 0, 1.4, 0, 0, 0, i * Math.PI / 12); },
  versnelling(g) { for (let i = 0; i < 7; i++) add(g, cyl(0.9 - i * 0.1, 0.9 - i * 0.1, 0.06, 20), mat(0xb8bec4, 0.3, 0.9), 0, 1.0, -0.3 + i * 0.1, Math.PI / 2); add(g, cyl(0.15, 0.15, 0.9, 10), mat(0x3a3a3a), 0, 1.0, 0, Math.PI / 2); },
  accu(g) { add(g, box(1, 2.4, 0.9), mat(0x1b1c1f, 0.5), 0, 1.2); add(g, box(1.02, 0.4, 0.92), mat(0x3fc97a, 0.4), 0, 2.0); for (let i = 0; i < 4; i++) add(g, box(0.5, 0.12, 0.02), new THREE.MeshStandardMaterial({ color: 0x3fc97a, emissive: 0x3fc97a, emissiveIntensity: 0.8 }), 0, 0.5 + i * 0.25, 0.46); },
  schijf(g) { add(g, cyl(1.2, 1.2, 0.16, 28), mat(0xb8bec4, 0.35, 0.9), 0, 1.3, 0, Math.PI / 2); add(g, box(0.9, 1, 0.5), mat(0xc8261e, 0.4, 0.3), 0.9, 1.9, 0); },
  turbo(g) { add(g, new THREE.TorusGeometry(0.7, 0.35, 12, 20), mat(0xb8bec4, 0.3, 0.9), 0, 1.0); add(g, cyl(0.35, 0.35, 1.4, 14), mat(0xc0c4c8, 0.3, 0.9), 1.0, 1.0, 0, 0, 0, Math.PI / 2); add(g, cyl(0.25, 0.25, 0.8, 14), mat(0x9a9ea2, 0.3, 0.9), 0, 1.0, 0.7, Math.PI / 2); },
  chip(g) { add(g, box(1.8, 0.12, 1.2), mat(0x1e6a3a, 0.4), 0, 0.3); add(g, box(0.7, 0.14, 0.7), mat(0x1b1c1f, 0.3), 0, 0.42); for (let i = 0; i < 8; i++) add(g, box(0.06, 0.04, 0.3), mat(0xd8b040, 0.3, 0.8), -0.8 + i * 0.22, 0.38, 0.72); },
};

const ALIAS = {
  f_kroket: 'kroket', f_frikandel: 'frikandel', f_eierbal: 'eierbal', f_oorlog: 'oorlog', f_kapsalon: 'kapsalon',
  f_krentenbol: 'krentenbol', f_koffie: 'koffie', f_drop: 'drop', f_energie: 'energie', f_ehbo: 'ehbo',
  eierbal: 'eierbal', koek: 'koek', drop: 'drop', kauwgom: 'kauwgom', krant: 'krant', strip: 'strip', kaart: 'kaart',
  scratch: 'kraskaart', lot: 'lot', duif: 'duifkaart', spaarkaart: 'spaarkaart', ballen: 'ballen', hotdog: 'hotdog', kast: 'kast', bank: 'bank',
  lamp: 'lamp', tas: 'tas', potlood: 'potlood',
  pakket: 'pakket',
};

export function productKey(id) {
  const k = ALIAS[id] || id;
  return BUILD[k] ? k : null;
}

export function buildProductMesh(key) {
  const b = BUILD[key];
  if (!b) return null;
  const inner = new THREE.Group();
  b(inner);
  inner.scale.setScalar(0.1);
  const g = new THREE.Group();
  g.add(inner);
  return g;
}

