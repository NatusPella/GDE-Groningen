import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GeoBuilder, vcMaterial, markShared } from './pixelart3d.js';
import { buildPersonMesh, seatPerson, seatedY, animatePersonWalk } from './models3d_people.js';
import { buildCowMesh3D } from './wildlife.js';
import { buildBike } from './sidejobkit.js';
import { RIKUS_LOOK } from './storycast.js';

// Small procedural props for the Ommeland extras (worldends.js,
// dorpsuitjes.js, pg_koe.js). buildProp(kind, opts) returns a group in local
// space (+x forward, +z to the side, y up) plus `solids` ([lx, lz, r]
// circles that block the player), `people` (their speech anchors) and an
// optional tick(dt, t). One vertex-colour mesh per prop, textured planes for
// the signs; disposeProp frees everything the prop owns.

const MAT = markShared(vcMaterial({ roughness: 0.85 }));
const SHARED_GEO = new Set();

const WOOD = 0x8a6440, DARK = 0x2a2a2a, WHITE = 0xf2efe6, RED = 0xc8202a, GREY = 0x8a8f94, ORANGE = 0xf07a18;
const SKIN = [0xf0c8a0, 0xe6b98f, 0xd9a47a, 0xc98e66];

export const PEOPLE = {
  fries: { shirt: 0x1d4f9c, skin: SKIN[0], variant: 'male', hair: 0xe8c86a, pants: 0x1c1c1c, seed: 4101, look: { top: 'tee', bottom: 'shorts', age: 'young', build: 'slim', shoeType: 'sneaker', hat: null, bag: null, umbrella: null, glasses: false } },
  boer: { shirt: 0x2a4a7a, skin: SKIN[2], variant: 'male', pants: 0x2a4a7a, seed: 4102, look: { top: 'jacket', bottom: 'trousers', hat: 'flatcap', age: 'old', build: 'heavy', shoeType: 'boot', bag: null, umbrella: null } },
  harm: { shirt: ORANGE, skin: SKIN[1], variant: 'male', pants: 0x2b3a55, seed: 4103, look: { top: 'jacket', bottom: 'trousers', hat: 'cap', age: 'old', build: 'heavy', shoeType: 'boot', bag: null, umbrella: null } },
  rikus: RIKUS_LOOK,
  oma: { shirt: 0x7a4a6a, skin: SKIN[0], variant: 'female', hair: 0xd8d4cc, pants: 0x3a3a44, hairStyle: 'bun', seed: 4105, look: { top: 'coat', bottom: 'skirt', age: 'old', shoeType: 'leather', bag: null, umbrella: null, glasses: true } },
  toerist: { shirt: 0xe8e0d0, skin: SKIN[1], variant: 'female', hair: 0x3a2a1e, pants: 0x2a2a30, hairStyle: 'ponytail', seed: 4106, look: { top: 'coat', bottom: 'trousers', age: 'adult', bag: 'shoulder', umbrella: null, glasses: true, shades: true } },
  bouke: { shirt: WHITE, skin: SKIN[0], variant: 'male', pants: WHITE, seed: 4201, look: { top: 'tee', bottom: 'shorts', hat: 'cap', age: 'adult', build: 'slim', shoeType: 'sneaker', bag: null, umbrella: null } },
  roelf: { shirt: 0x7a2e2e, skin: SKIN[2], variant: 'male', pants: 0x2a2a30, seed: 4202, look: { top: 'sweater', bottom: 'trousers', age: 'adult', build: 'heavy', hat: null, bag: null, umbrella: null } },
  lammert: { shirt: 0x1f2f4f, skin: SKIN[3], variant: 'male', pants: 0x2a2a30, seed: 4203, look: { top: 'sweater', bottom: 'trousers', hat: 'cap', age: 'old', facial: 'beard', bag: null, umbrella: null } },
  tjakko: { shirt: 0x3a5a3a, skin: SKIN[1], variant: 'male', pants: 0x2a2a30, seed: 4204, look: { top: 'longsleeve', bottom: 'jeans', age: 'adult', facial: 'moustache', hat: null, bag: null, umbrella: null } },
  fenna: { shirt: 0x9a3a3a, skin: SKIN[0], variant: 'female', hair: 0xb87a3a, pants: 0x2a3a55, hairStyle: 'ponytail', seed: 4205, look: { top: 'sweater', bottom: 'jeans', age: 'adult', shoeType: 'boot', bag: null, umbrella: null } },
  egbert: { shirt: 0x2a2a34, skin: SKIN[0], variant: 'male', pants: 0x2a2a34, seed: 4206, look: { top: 'blazer', bottom: 'trousers', age: 'old', glasses: true, hat: null, bag: null, umbrella: null } },
  geesje: { shirt: 0x4a7a4a, skin: SKIN[1], variant: 'female', hair: 0x6a4a2a, pants: 0x3a3a44, hairStyle: 'bob', seed: 4207, look: { top: 'sweater', bottom: 'trousers', age: 'adult', build: 'heavy', shoeType: 'boot', bag: null, umbrella: null } },
  menno: { shirt: 0x2a2a30, skin: SKIN[2], variant: 'male', pants: 0x2a2a30, seed: 4208, look: { top: 'coat', bottom: 'trousers', hat: 'flatcap', age: 'old', bag: null, umbrella: null } },
  wilma: { shirt: 0x2a6a8a, skin: SKIN[0], variant: 'female', hair: 0x8a6a3a, pants: 0x2a2a30, hairStyle: 'curly', seed: 4209, look: { top: 'longsleeve', bottom: 'skirt', age: 'adult', bag: null, umbrella: null } },
  tineke: { shirt: 0xf2c230, skin: SKIN[1], variant: 'female', hair: 0xe8c86a, pants: 0x3a6a9a, hairStyle: 'ponytail', seed: 4210, look: { top: 'tee', bottom: 'shorts', age: 'young', bag: null, umbrella: null, shades: true } },
  omejan: { shirt: 0x3a4a3a, skin: SKIN[2], variant: 'male', pants: 0x2a3a2a, seed: 4301, look: { top: 'jacket', bottom: 'trousers', hat: 'flatcap', age: 'old', build: 'avg', shoeType: 'boot', facial: 'moustache', bag: null, umbrella: null } },
};

// A standing (or seated) figure; the mesh faces local +x.
export function personMesh(key) {
  const L = PEOPLE[key];
  const m = buildPersonMesh(L.shirt, L.skin, L);
  m.userData.omPerson = true;
  return m;
}

export function sitDown(m, seatTop) {
  seatPerson(m, false);
  m.position.y = seatedY(m, seatTop);
}

// --- canvas signs -------------------------------------------------------------

export function signTexture(lines, { w = 512, h = 256, bg = '#f4f1e6', fg = '#1b2a44', border = '#1b2a44', arrow = 0, big = 0.36, small = 0.2 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (border) { g.strokeStyle = border; g.lineWidth = h * 0.05; g.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1); }
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const [a, b] = lines;
  const fit = (text, size, maxW) => {
    let s = size;
    g.font = `bold ${Math.round(s)}px Arial, sans-serif`;
    while (g.measureText(text).width > maxW && s > 10) { s *= 0.92; g.font = `bold ${Math.round(s)}px Arial, sans-serif`; }
  };
  const maxW = w * (arrow ? 0.7 : 0.86);
  const cx = arrow ? w * (arrow < 0 ? 0.58 : 0.42) : w / 2;
  fit(a, h * big, maxW);
  g.fillText(a, cx, b ? h * 0.4 : h / 2);
  if (b) { fit(b, h * small, maxW); g.fillText(b, cx, h * 0.72); }
  if (arrow) {
    const ax = arrow < 0 ? w * 0.12 : w * 0.88, dir = arrow < 0 ? -1 : 1;
    g.beginPath();
    g.moveTo(ax + dir * h * 0.1, h / 2);
    g.lineTo(ax - dir * h * 0.06, h * 0.3);
    g.lineTo(ax - dir * h * 0.06, h * 0.7);
    g.closePath();
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

class Kit {
  constructor() {
    this.B = new GeoBuilder();
    this.group = new THREE.Group();
    this.solids = [];
    this.people = [];
    this.own = [];
    this.ticks = [];
  }
  box(x, y, z, sx, sy, sz, color, ry = 0, rx = 0, rz = 0) { this.B.box(x, y, z, sx, sy, sz, color, 0, rx, ry, rz); return this; }
  cyl(x, y, z, r, h, color, seg = 8, rTop = r, rx = 0, rz = 0) {
    const g = new THREE.CylinderGeometry(rTop, r, h, seg);
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, 0, rz)).setPosition(x, y, z);
    this.B.geo(g, m, color);
    g.dispose();
    return this;
  }
  post(x, z, h, color = WOOD, r = 0.06) { return this.cyl(x, h / 2, z, r, h, color, 6); }
  // a textured board facing local +x (and -x when two-sided)
  board(x, y, z, w, h, tex, ry = 0, twoSided = false) {
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: twoSided ? THREE.DoubleSide : THREE.FrontSide });
    const geo = new THREE.PlaneGeometry(w, h);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry + Math.PI / 2;
    this.group.add(m);
    this.own.push(mat, geo, tex);
    return m;
  }
  sign(x, z, lines, { w = 2.2, h = 1.1, y = 1.9, ry = 0, style = {}, posts = true } = {}) {
    const tex = signTexture(lines, style);
    const c = Math.cos(ry), s = Math.sin(ry);
    // board face along local z rotated by ry; posts at the board's ends
    if (posts) for (const k of [-0.42, 0.42]) this.post(x + s * k * w, z + c * k * w, y + h / 2, GREY, 0.05);
    this.box(x - c * 0.03, y, z + s * 0.03, 0.04, h + 0.06, w + 0.06, DARK, ry);
    this.board(x + c * 0.005, y, z - s * 0.005, w, h, tex, ry);
    return this;
  }
  person(key, x, z, face = 0, speaker = null) {
    const m = personMesh(key);
    m.position.set(x, 0, z);
    m.rotation.y = -face;
    this.group.add(m);
    this.people.push({ mesh: m, lx: x, lz: z, speaker });
    return m;
  }
  solid(x, z, r) { this.solids.push([x, z, r]); return this; }
  add(obj) { this.group.add(obj); return obj; }
  finish() {
    const geo = this.B.build();
    const mesh = new THREE.Mesh(geo, MAT);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    this.own.push(geo);
    const ticks = this.ticks;
    return { group: this.group, solids: this.solids, people: this.people, own: this.own, tick: ticks.length ? (dt, t) => { for (const f of ticks) f(dt, t); } : null };
  }
}

export function disposeProp(p) {
  if (!p) return;
  p.group.removeFromParent();
  for (const r of p.own) r.dispose();
  p.group.traverse((o) => {
    if (o.isSkinnedMesh) {
      if (o.skeleton) o.skeleton.dispose();
      if (o.geometry && !o.geometry.userData.shared && !SHARED_GEO.has(o.geometry)) o.geometry.dispose();
    }
  });
}

// --- pieces -------------------------------------------------------------------

function deadEnd(k, x, z) {
  // blue square with a white T: "doodlopende weg"
  const tex = signTexture(['', ''], { w: 128, h: 128, bg: '#1d4f9c', border: '#f2efe6' });
  const g = tex.image.getContext('2d');
  g.fillStyle = '#f2efe6';
  g.fillRect(56, 36, 16, 60);
  g.fillStyle = '#c8202a';
  g.fillRect(34, 28, 60, 14);
  tex.needsUpdate = true;
  k.post(x, z, 2.2, GREY, 0.04);
  k.board(x + 0.05, 2.0, z, 0.6, 0.6, tex, 0);
}

function barrier(k, x, half) {
  for (const z of [-half, half]) k.post(x, z, 1.1, WHITE, 0.07);
  const n = Math.max(3, Math.round(half * 2 / 0.6));
  for (let i = 0; i < n; i++) {
    const z0 = -half + (i + 0.5) * (2 * half / n);
    k.box(x, 0.95, z0, 0.08, 0.22, 2 * half / n, i % 2 ? WHITE : RED);
  }
}

function cone(k, x, z) {
  k.cyl(x, 0.35, z, 0.22, 0.7, ORANGE, 8, 0.03);
  k.cyl(x, 0.42, z, 0.15, 0.1, WHITE, 8, 0.12);
  k.box(x, 0.02, z, 0.45, 0.04, 0.45, DARK);
}

function bench(k, x, z, ry = 0) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const at = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  for (const lz of [-0.7, 0.7]) { const [px, pz] = at(0, lz); k.box(px, 0.22, pz, 0.45, 0.44, 0.06, DARK, ry); }
  const [sx, sz] = at(0, 0);
  k.box(sx, 0.46, sz, 0.45, 0.06, 1.6, WOOD, ry);
  const [bx, bz] = at(-0.22, 0);
  k.box(bx, 0.78, bz, 0.05, 0.36, 1.6, WOOD, ry);
}

function flag(k, x, z, h = 5) {
  k.post(x, z, h, WHITE, 0.05);
  // pompeblêd: blue and white bands with red leaves
  const tex = signTexture(['', ''], { w: 192, h: 128, bg: '#f2efe6', border: '' });
  const g = tex.image.getContext('2d');
  g.fillStyle = '#1d4f9c';
  for (let i = 0; i < 7; i += 2) {
    g.beginPath();
    g.moveTo(i * 30, 128); g.lineTo(i * 30 + 30, 128); g.lineTo(i * 30 + 110, 0); g.lineTo(i * 30 + 80, 0);
    g.closePath(); g.fill();
  }
  g.fillStyle = '#c8202a';
  for (const [hx, hy] of [[40, 30], [100, 60], [150, 95]]) {
    g.beginPath(); g.moveTo(hx, hy + 8); g.bezierCurveTo(hx - 12, hy, hx - 6, hy - 10, hx, hy - 3); g.bezierCurveTo(hx + 6, hy - 10, hx + 12, hy, hx, hy + 8); g.fill();
  }
  tex.needsUpdate = true;
  const m = k.board(x, h - 0.5, z + 0.62, 1.2, 0.8, tex, Math.PI / 2, true);
  k.ticks.push((dt, t) => { m.rotation.x = Math.sin(t * 2.3) * 0.08; });
}

function kiosk(k, x, z, { color = 0xe8e0c8, awning = RED, shut = false, sign = null } = {}) {
  k.box(x, 1.25, z, 2.4, 2.5, 3.2, color);
  k.box(x + 1.21, 1.35, z, 0.04, 1.0, 2.6, shut ? GREY : 0x3a2a1a);
  if (!shut) k.box(x + 1.35, 1.0, z, 0.3, 0.06, 2.8, WOOD);
  // striped awning
  for (let i = 0; i < 6; i++) k.box(x + 1.55, 2.25, z - 1.35 + i * 0.54, 0.9, 0.05, 0.54, i % 2 ? WHITE : awning, 0, 0, -0.35);
  k.box(x, 2.56, z, 2.6, 0.12, 3.4, DARK);
  if (sign) k.board(x + 1.22, 2.85, z, 2.6, 0.5, signTexture(sign, { w: 512, h: 100, big: 0.55, small: 0.3, border: '' }));
  k.solid(x, z, 1.9);
}

function van(k, x, z, text) {
  k.box(x, 1.25, z, 4.6, 1.9, 1.9, WHITE);
  k.box(x + 1.7, 1.45, z, 1.1, 0.7, 1.86, 0x2a3440);
  for (const [wx, wz] of [[-1.5, 0.95], [-1.5, -0.95], [1.5, 0.95], [1.5, -0.95]]) k.cyl(x + wx, 0.34, z + wz, 0.34, 0.2, DARK, 10, 0.34, Math.PI / 2);
  k.post(x - 1.4, z, 5.2, GREY, 0.04);
  k.box(x - 1.4, 5.2, z, 0.05, 0.05, 1.0, GREY);
  const tex = signTexture(text, { w: 512, h: 160, bg: '#1f7a44', fg: '#f2efe6', border: '', big: 0.42, small: 0.24 });
  const tex2 = signTexture(text, { w: 512, h: 160, bg: '#1f7a44', fg: '#f2efe6', border: '', big: 0.42, small: 0.24 });
  k.board(x - 0.4, 1.3, z + 0.96, 3.0, 0.9, tex, -Math.PI / 2);
  k.board(x - 0.4, 1.3, z - 0.96, 3.0, 0.9, tex2, Math.PI / 2);
  k.solid(x - 1, z, 1.2).solid(x + 1, z, 1.2);
}

export function eierbalMesh() {
  const B = new GeoBuilder();
  B.geo(new THREE.IcosahedronGeometry(0.32, 1), null, 0xd99a2e);
  B.geo(new THREE.IcosahedronGeometry(0.2, 0), new THREE.Matrix4().makeTranslation(0.08, 0.14, 0.1), 0xf2c25a);
  const geo = B.build();
  const m = new THREE.Mesh(geo, MAT);
  return { mesh: m, geo };
}

// --- props --------------------------------------------------------------------
// opts.hw: half width of the road the prop stands on (world ends).

const BUILD = {
  // --- wereldeinden: at the road end, facing out along the road (+x)
  bord(k, o, def) {
    barrier(k, 1.5, o.hw + 0.6);
    k.sign(0.8, -o.hw - 1.4, def.sign, { w: 2.6, h: 1.3, y: 2.1, ry: Math.PI, style: { big: 0.3, small: 0.24 } });
    k.sign(2.2, 0, def.sign, { w: 3.2, h: 1.5, y: 2.3, ry: Math.PI, style: { big: 0.28, small: 0.22 } }).solid(2.2, 0, 0.4);
  },
  fries(k, o) {
    barrier(k, 2.5, o.hw + 0.6);
    const m = k.person('fries', 0.5, o.hw + 1.4, Math.PI * 0.85, 'Verdwaalde Fries');
    const B = new GeoBuilder();
    B.geo(new THREE.CylinderGeometry(0.04, 0.05, 9, 6), null, 0xc8a878);
    const pole = new THREE.Mesh(B.build(), MAT);
    k.own.push(pole.geometry);
    pole.position.set(0.25, 4.1, 0.28);
    pole.rotation.z = -0.12;
    m.add(pole);
    k.solid(0.5, o.hw + 1.4, 0.5);
  },
  boer(k, o) {
    // a five-bar farm gate across the road end
    const half = o.hw + 0.5;
    for (const z of [-half, half]) k.post(1.5, z, 1.4, WOOD, 0.09);
    for (let i = 0; i < 5; i++) k.box(1.5, 0.3 + i * 0.24, 0, 0.07, 0.08, half * 2, 0xb8b0a0);
    k.box(1.5, 0.8, 0, 0.07, 0.08, half * 2.1, 0xb8b0a0, 0, 0.5);
    k.person('boer', 0.6, 0.8, Math.PI, 'Boer Hindrik');
    k.solid(0.6, 0.8, 0.5);
  },
  koe(k, o) {
    const cow = buildCowMesh3D(0.37);
    cow.position.set(0.5, 0, 0);
    cow.rotation.y = Math.PI / 2;
    k.add(cow);
    k.people.push({ mesh: cow, lx: 0.5, lz: 0, speaker: 'Koe Aaltje', h: 2.0, animal: true });
    k.solid(0.5, -0.8, 0.8).solid(0.5, 0.8, 0.8);
    barrier(k, 3, o.hw + 0.6);
  },
  werk(k, o, def) {
    barrier(k, 1.2, o.hw + 0.6);
    barrier(k, 1.7, o.hw + 0.6);
    for (let i = -2; i <= 2; i++) cone(k, 0.2, i * (o.hw / 2.2));
    k.sign(2.5, 0, def.sign, { w: 3.0, h: 1.3, y: 2.0, ry: Math.PI, style: { bg: '#f2c230', fg: '#1b1b1b', border: '#1b1b1b', big: 0.26, small: 0.2 } }).solid(2.5, 0, 0.4);
    const m = k.person('harm', 0.4, o.hw + 1.5, Math.PI * 0.8, 'Harm');
    const B = new GeoBuilder();
    B.box(0.3, 0.6, 0.35, 0.05, 1.2, 0.05, WOOD);
    B.box(0.3, 0.02, 0.35, 0.22, 0.28, 0.04, GREY);
    const shovel = new THREE.Mesh(B.build(), MAT);
    k.own.push(shovel.geometry);
    m.add(shovel);
    k.solid(0.4, o.hw + 1.5, 0.5);
  },
  radio(k, o) {
    van(k, 1.2, 0, ['Radio Nachtstreek', 'Live vanaf het einde']);
    k.person('rikus', 0.2, o.hw + 1.4, Math.PI * 0.9, 'Rikus');
    k.solid(0.2, o.hw + 1.4, 0.5);
  },
  friesland(k, o, def) {
    barrier(k, 2.2, o.hw + 0.6);
    // "Welkom in Fryslân", its arrow pointing back the way you came
    k.sign(1.0, -o.hw - 1.6, def.sign, { w: 2.8, h: 1.1, y: 2.2, ry: Math.PI, style: { bg: '#1d4f9c', fg: '#f2efe6', border: '#f2efe6', arrow: 1, big: 0.3, small: 0.22 } });
    flag(k, 1.4, o.hw + 1.4);
    k.solid(1.0, -o.hw - 1.6, 0.4);
  },
  bankje(k, o, def) {
    barrier(k, 2.2, o.hw + 0.6);
    // the bench looks out over the end of the world (+x)
    bench(k, 0.6, o.hw + 1.6, 0);
    const m = k.person('oma', 0.66, o.hw + 1.6, 0, 'Oma Geessien');
    sitDown(m, 0.49);
    k.people[k.people.length - 1].seated = true;
    k.sign(1.8, o.hw + 2.8, def.sign, { w: 1.4, h: 0.7, y: 1.2, ry: Math.PI, style: { big: 0.34, small: 0.3 } });
    k.solid(0.6, o.hw + 1.6, 0.9);
  },
  toerist(k, o) {
    barrier(k, 2.4, o.hw + 0.6);
    k.person('toerist', 0.8, -0.6, Math.PI, 'Verdwaalde toeriste');
    k.box(1.3, 0.35, -0.2, 0.25, 0.6, 0.42, 0xc8202a).box(1.3, 0.72, -0.2, 0.04, 0.16, 0.04, DARK);
    k.solid(0.9, -0.5, 0.6);
  },
  frituur(k, o, def) {
    barrier(k, 2.6, o.hw + 0.6);
    kiosk(k, 0.2, o.hw + 3.2, { shut: true, sign: def.sign });
  },
  fietsen(k, o, def) {
    barrier(k, 2.8, o.hw + 0.6);
    const tints = [RED, 0x1c1c1c, 0x2f5c8a, 0x3f6b3f, 0xc9a227, 0x6a6a6a, 0x7a2e2e];
    tints.forEach((c, i) => {
      const b = buildBike(c);
      b.position.set(0.2 + (i % 3) * 0.7, (i > 3 ? 0.35 : 0), o.hw + 1.6 + Math.floor(i / 3) * 0.9);
      b.rotation.set(i % 2 ? 1.3 : -1.2, i * 0.9, 0);
      k.add(b);
    });
    k.sign(1.0, o.hw + 3.6, def.sign, { w: 2.2, h: 0.9, y: 1.6, ry: Math.PI, style: { big: 0.3, small: 0.22 } });
    k.solid(0.9, o.hw + 2.1, 1.4);
  },
  brievenbus(k, o, def) {
    barrier(k, 2.2, o.hw + 0.6);
    k.post(0.6, o.hw + 1.2, 1.0, GREY, 0.05);
    k.box(0.6, 1.2, o.hw + 1.2, 0.5, 0.7, 0.4, RED).box(0.86, 1.34, o.hw + 1.2, 0.02, 0.06, 0.24, DARK);
    k.sign(0.62, o.hw + 1.2, def.sign, { w: 0.45, h: 0.3, y: 0.98, ry: Math.PI, posts: false, style: { big: 0.36, small: 0.3, border: '' } });
    k.solid(0.6, o.hw + 1.2, 0.4);
  },

  // --- dorpen
  signpost(k, o) {
    // a wegwijzer: one blade per thing to do, pointing at it (the group stays unrotated)
    k.post(0, 0, 3.0, WHITE, 0.07);
    (o.blades || []).forEach((b, i) => {
      const y = 2.7 - i * 0.36, ca = Math.cos(b.a), sa = Math.sin(b.a);
      const cx = ca * 0.68, cz = sa * 0.68, nx = -sa * 0.022, nz = ca * 0.022;
      k.box(cx, y, cz, 1.3, 0.3, 0.03, WHITE, -b.a);
      const front = k.board(cx + nx, y, cz + nz, 1.28, 0.28, signTexture([b.text, b.sub || ''], { w: 512, h: 110, big: 0.42, small: 0.26, border: '', arrow: 1 }), -b.a - Math.PI / 2);
      const back = k.board(cx - nx, y, cz - nz, 1.28, 0.28, signTexture([b.text, b.sub || ''], { w: 512, h: 110, big: 0.42, small: 0.26, border: '', arrow: -1 }), -b.a + Math.PI / 2);
      front.renderOrder = back.renderOrder = 1;
    });
    k.solid(0, 0, 0.3);
  },
  tennis(k) {
    // a single court (18 x 9 m of it), the ball machine at the far end
    k.box(0, 0.02, 0, 22, 0.04, 11, 0xb8603a);
    for (const z of [-4.1, 4.1]) k.box(0, 0.05, z, 20, 0.02, 0.08, WHITE);
    for (const x of [-10, 10, 0]) k.box(x, 0.05, 0, 0.08, 0.02, 8.3, x ? WHITE : 0x3a8a3a);
    k.box(0, 0.5, 0, 0.04, 0.9, 9.6, 0x1c1c1c).box(0, 0.95, 0, 0.06, 0.06, 9.8, WHITE);
    for (const z of [-4.9, 4.9]) k.post(0, z, 1.07, DARK, 0.04);
    for (let i = -5; i <= 5; i++) { k.post(i * 2.2, -5.6, 3, 0x2a4a2a, 0.04); }
    k.box(0, 1.5, -5.6, 22, 3, 0.02, 0x2a4a2a);
    k.box(8.8, 0.45, 0, 0.8, 0.9, 0.8, 0x2f6fb0).cyl(8.8, 1.0, 0, 0.22, 0.2, DARK, 10);
    k.box(-11.5, 0.5, 2.5, 0.08, 0.02, 1.2, 0x3a8a3a);
    k.solid(8.8, 0, 0.6);
  },
  jetty(k, o) {
    // a wooden landing stage out over the water (+x), the boat alongside
    for (let i = 0; i < 6; i++) k.box(1 + i * 1.2, 0.25, 0, 1.15, 0.1, 2.0, WOOD);
    for (const x of [1, 4, 7]) for (const z of [-0.9, 0.9]) k.post(x, z, 0.6, 0x5a4028, 0.08);
    k.sign(-0.8, 1.6, o.sign || ['Rondvaart', 'Instappen'], { w: 1.6, h: 0.8, y: 1.5, ry: Math.PI, style: { big: 0.32, small: 0.26 } });
  },
  cafe(k, o) {
    // a terrace: two tables with chairs, a parasol, a board with the name
    for (const [tx, tz] of [[1.2, -1.4], [1.2, 1.4]]) {
      k.cyl(tx, 0.37, tz, 0.05, 0.74, DARK, 6).cyl(tx, 0.75, tz, 0.4, 0.04, WHITE, 12);
      for (const d of [-0.6, 0.6]) k.box(tx, 0.23, tz + d, 0.4, 0.46, 0.04, DARK).box(tx, 0.45, tz + d, 0.4, 0.04, 0.4, WOOD);
      k.solid(tx, tz, 0.7);
    }
    k.cyl(1.2, 1.2, 0, 0.03, 2.4, WHITE, 5).cyl(1.2, 2.3, 0, 1.4, 0.3, o.color || 0x2f6fb0, 10, 0.1);
    k.sign(-0.6, -2.6, [o.name || 'Café', 'Kovvie · bier · proatjes'], { w: 2.0, h: 0.8, y: 1.5, ry: Math.PI / 2, style: { big: 0.26, small: 0.2 } });
    k.solid(-0.6, -2.6, 0.3);
  },
  stall(k, o) {
    // a farm stall: table, crates, milk churns, honesty box
    k.box(0.9, 0.8, 0, 0.9, 0.06, 2.4, WOOD);
    for (const z of [-1.1, 1.1]) k.box(0.9, 0.4, z, 0.8, 0.8, 0.06, WOOD);
    for (let i = 0; i < 3; i++) k.box(0.9, 0.95, -0.8 + i * 0.8, 0.5, 0.26, 0.6, [0xd98a2a, 0xe8d8a0, 0xb83a2a][i]);
    for (const z of [1.6, 2.1]) k.cyl(0.8, 0.4, z, 0.2, 0.8, 0xc8ccd0, 10, 0.16);
    k.box(0.9, 1.05, 1.1, 0.24, 0.2, 0.2, 0x3a5a8a);
    for (let i = 0; i < 5; i++) k.box(1.2, 1.9, -1.3 + i * 0.52, 1.1, 0.05, 0.52, i % 2 ? WHITE : 0x3a7a3a, 0, 0, -0.25);
    for (const z of [-1.3, 1.3]) k.post(1.7, z, 1.8, WOOD, 0.05);
    k.sign(-0.4, -1.8, [o.name || 'Boerderijwinkel', 'Vers van t erf'], { w: 1.8, h: 0.7, y: 1.4, ry: Math.PI / 2, style: { bg: '#3a7a3a', fg: '#f4f1e6', border: '#f4f1e6', big: 0.26, small: 0.22 } });
    k.solid(0.9, 0, 1.2).solid(0.8, 1.85, 0.5);
  },
  rack(k, o) {
    k.box(0.8, 0.45, 0, 0.1, 0.06, 3.2, GREY);
    for (let i = 0; i < 4; i++) {
      const b = buildBike([0x2f6fb0, 0x2f6fb0, 0xf2c230, 0x2f6fb0][i]);
      b.position.set(0.8, 0, -1.2 + i * 0.8);
      b.rotation.y = Math.PI / 2;
      k.add(b);
    }
    k.sign(-0.6, 0, [o.name || 'Fietsverhuur', '€5 per rit'], { w: 1.8, h: 0.7, y: 1.5, ry: Math.PI, style: { bg: '#2f6fb0', fg: '#f4f1e6', border: '#f4f1e6', big: 0.26, small: 0.22 } });
    k.solid(0.8, 0, 1.2);
  },
  mill(k, o) {
    // a stellingmolen: brick base, octagonal body, the gallery, cap and sails
    k.cyl(0, 2.5, 0, 3.6, 5, 0x8a3e30, 8, 3.3);
    k.cyl(0, 5.1, 0, 4.6, 0.18, WOOD, 8);
    k.cyl(0, 9.2, 0, 3.1, 8.2, 0x3a3e40, 8, 1.9);
    k.cyl(0, 13.6, 0, 2.1, 1.2, 0x2a2e30, 8, 1.2);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; k.post(Math.cos(a) * 4.4, Math.sin(a) * 4.4, 5.1, WOOD, 0.08); }
    k.box(3.35, 1.1, 0, 0.1, 2.2, 1.2, 0x3a2a1a);
    const sails = new THREE.Group();
    const B = new GeoBuilder();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      B.geo(new THREE.BoxGeometry(0.2, 11, 0.2), new THREE.Matrix4().makeRotationX(a).multiply(new THREE.Matrix4().makeTranslation(0, 5.5, 0)), WOOD);
      B.geo(new THREE.BoxGeometry(0.06, 8.5, 1.6), new THREE.Matrix4().makeRotationX(a).multiply(new THREE.Matrix4().makeTranslation(0, 6.6, 0.85)), 0xd8d0c0);
    }
    const sm = new THREE.Mesh(B.build(), MAT);
    k.own.push(sm.geometry);
    sails.add(sm);
    sails.position.set(2.4, 13.4, 0);
    k.add(sails);
    k.ticks.push((dt) => { sails.rotation.x += dt * 0.55; });
    k.solid(0, 0, 3.7);
  },
  tower(k, o) {
    // the leaning tower: a brick tower with a saddle roof, off true by 5°
    const t = new GeoBuilder();
    t.box(0, 7, 0, 5, 14, 5, 0x9a4a36);
    t.box(0, 14.8, 0, 5.2, 1.6, 5.2, 0x8a3e30);
    t.geo(new THREE.ConeGeometry(3.7, 4.5, 4), new THREE.Matrix4().makeRotationY(Math.PI / 4).setPosition(0, 17.8, 0), 0x3e4246);
    for (const y of [4, 8, 12]) for (const s of [-1, 1]) t.box(s * 2.51, y, 0, 0.04, 1.4, 0.8, 0x2a2a30);
    const tm = new THREE.Mesh(t.build(), MAT);
    k.own.push(tm.geometry);
    tm.rotation.z = -0.085;
    tm.castShadow = true;
    k.add(tm);
    k.solid(0, 0, 3.8);
    // the photo spot, 12 m out, with a board
    k.box(12, 0.03, 0, 1.2, 0.06, 1.2, 0xd8b04a);
    k.sign(13.2, 1.6, ['Fotoplek', 'Duw de toren recht'], { w: 1.4, h: 0.6, y: 1.2, ry: Math.PI, style: { big: 0.3, small: 0.24 } });
  },
  wierde(k, o) {
    k.sign(0, 0, ['Wierde van Stedum', 'Hoog en droog sinds de ijzertijd'], { w: 2.2, h: 1.0, y: 1.3, ry: Math.PI, style: { bg: '#5a4a2a', fg: '#f4f1e6', border: '#f4f1e6', big: 0.24, small: 0.16 } });
    bench(k, 1.8, 2.2, 0);
    k.solid(0, 0, 0.5);
  },
  klok(k, o) {
    // klokkenstoel: four posts, braces, a small roof and the bell
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.post(x, z, 4.2, 0x3a2a1a, 0.12);
    k.box(0, 3.4, 0, 2.3, 0.14, 0.14, 0x3a2a1a).box(0, 3.4, 0, 0.14, 0.14, 2.3, 0x3a2a1a);
    k.box(0, 4.45, -0.6, 2.8, 0.1, 1.5, 0x2a2e30, 0, 0.5).box(0, 4.45, 0.6, 2.8, 0.1, 1.5, 0x2a2e30, 0, -0.5);
    const bell = new THREE.Group();
    const B = new GeoBuilder();
    B.geo(new THREE.CylinderGeometry(0.22, 0.48, 0.7, 12), new THREE.Matrix4().makeTranslation(0, -0.45, 0), 0xb08a3a);
    B.geo(new THREE.SphereGeometry(0.1, 6, 4), new THREE.Matrix4().makeTranslation(0, -0.85, 0), 0x6a5020);
    const bm = new THREE.Mesh(B.build(), MAT);
    k.own.push(bm.geometry);
    bell.add(bm);
    bell.position.set(0, 3.3, 0);
    k.add(bell);
    k.group.userData.bell = bell;
    k.ticks.push((dt) => {
      const s = bell.userData.swing || 0;
      if (s > 0) { bell.userData.swing = Math.max(0, s - dt * 0.35); bell.rotation.x = Math.sin((1 - s) * 18) * s * 0.6; }
    });
    k.solid(0, 0, 1.5);
  },
  beach(k, o) {
    k.box(0, 0.015, 0, 10, 0.03, 6, 0xe8d8a0);
    for (const [x, z, c] of [[-2.5, -1.5, RED], [1.5, 1.2, 0x2f6fb0]]) {
      k.cyl(x, 1.1, z, 0.03, 2.2, WHITE, 5).cyl(x, 2.15, z, 1.2, 0.25, c, 10, 0.1);
      k.box(x + 0.6, 0.25, z + 0.5, 1.4, 0.08, 0.6, WHITE, 0, 0, 0.25);
    }
    k.box(3.5, 0.08, -1.6, 1.8, 0.02, 0.9, 0xc84a6a);
  },
  strandtent(k, o) {
    kiosk(k, 0, 0, { color: 0x3a8ab0, awning: 0xf2c230, sign: [o.name || 'Strandtent', 'IJs · patat · limonade'] });
  },
  erf(k, o) {
    // Ome Jan's yard gate, churns and his board
    for (const z of [-2.5, 2.5]) k.post(0, z, 1.5, WOOD, 0.1);
    for (let i = 0; i < 5; i++) k.box(0.9, 0.3 + i * 0.24, 1.9, 1.9, 0.08, 0.07, 0xb8b0a0, 0.6);
    for (const [x, z] of [[-1, -3.2], [-1.4, -3.6], [-0.6, -3.7]]) k.cyl(x, 0.4, z, 0.2, 0.8, 0xc8ccd0, 10, 0.16);
    k.sign(-1.4, 3.4, ['Boerderij t Kouwenest', 'J. Kuipers · melkvee'], { w: 2.2, h: 0.8, y: 1.4, ry: Math.PI / 2, style: { bg: '#3a5a2a', fg: '#f4f1e6', border: '#f4f1e6', big: 0.26, small: 0.2 } });
    k.solid(-1.4, 3.4, 0.3).solid(-1, -3.5, 0.7);
  },
  hideout(k, o) {
    // the twins' camp: hay bales, a crate with a bottle, a painted board
    for (const [x, z, r] of [[2, -2.5, 0], [2, -1.2, 0], [3.2, -1.9, 1]]) k.cyl(x, 0.6, z, 0.65, 1.2, 0xd8b85a, 12, 0.65, Math.PI / 2 * r, Math.PI / 2 * (1 - r));
    k.box(-1.5, 0.3, 2, 0.6, 0.6, 0.6, WOOD).cyl(-1.5, 0.75, 2, 0.05, 0.3, 0x3a6a3a, 6);
    k.sign(-2.4, -3.2, ['Privé', 'Gjin tagong'], { w: 1.4, h: 0.7, y: 1.2, ry: Math.PI / 2, style: { bg: '#c8102e', fg: '#f4f1e6', border: '#f4f1e6', big: 0.34, small: 0.26 } });
    k.solid(2.4, -1.9, 1.4).solid(-1.5, 2, 0.5);
  },
};

// --- the turn-back scenes at the edge of the world (edgescene.js, edgeguard.js) ---
// Local +x points inside (the way back); boards face +x, so whoever drives
// towards the edge reads them.
function mistPlane(k, x, w, h, op) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xdfe5e8, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide, fog: true });
  const geo = new THREE.PlaneGeometry(w, h);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, h / 2, 0);
  m.rotation.y = Math.PI / 2;
  k.add(m);
  k.own.push(mat, geo);
  return m;
}

function hull(k, len, color) {
  k.box(0, 0.45, 0, len, 0.9, len * 0.3, color);
  k.box(len * 0.5, 0.45, 0, len * 0.25, 0.8, len * 0.22, color, 0, 0, 0);
  k.box(-len * 0.1, 1.3, 0, len * 0.28, 0.9, len * 0.2, WHITE);
  k.box(-len * 0.1, 1.85, 0, len * 0.3, 0.1, len * 0.22, DARK);
}

const EDGE_BUILD = {
  rand_grenspost(k) {
    // a little guard hut beside the road, blue-yellow roof, flag pole
    k.box(0, 1.3, -5.5, 2.6, 2.6, 2.4, 0xe8e0c8);
    k.box(0, 2.7, -5.5, 3.0, 0.2, 2.8, 0x1d4f9c);
    k.box(1.31, 1.4, -5.5, 0.04, 0.9, 1.4, 0x3a4a5a);
    k.post(0, -7.2, 6, WHITE, 0.06);
    k.sign(1.5, -5.5, ['GRENSPOST', 'Even stoppen graag'], { w: 2.2, h: 0.8, y: 3.4, posts: false, style: { bg: '#1d4f9c', fg: '#f4f1e6', border: '#f4f1e6', big: 0.3, small: 0.2 } });
    k.solid(0, -5.5, 1.8);
  },
  rand_slagboom(k, o) {
    const half = (o.hw || 3) + 0.8;
    k.box(0, 0.6, -half, 0.5, 1.2, 0.5, WHITE);
    for (let i = 0; i < 8; i++) k.box(0, 1.15, -half + 0.25 + (i + 0.5) * ((2 * half - 0.5) / 8), 0.12, 0.2, (2 * half - 0.5) / 8, i % 2 ? WHITE : RED);
    k.post(0, half, 1.2, GREY, 0.08);
    k.solid(0, 0, half);
  },
  rand_bord(k) {
    k.sign(0, 0, ['Verboden', 'verder te gaan'], { w: 1.8, h: 0.9, y: 1.7, style: { bg: '#c8202a', fg: '#f4f1e6', border: '#f4f1e6', big: 0.3, small: 0.22 } });
    k.solid(0, 0, 0.5);
  },
  rand_grenswachtboot(k) {
    hull(k, 9, 0x1d4f9c);
    k.solid(0, 0, 3);
  },
  rand_kustwachtboot(k) {
    hull(k, 8, ORANGE);
    k.solid(0, 0, 3);
  },
  rand_veerboot(k) {
    hull(k, 14, 0xf4f1e6);
    k.box(0, 2.2, 0, 3.2, 1.6, 5, 0xf4f1e6);
    k.box(0, 3.1, 0, 3.4, 0.2, 5.2, 0x1d4f9c);
    k.sign(0, 0, ['Veerdienst', 'naar het eiland'], { w: 3, h: 0.8, y: 1.8, posts: false, style: { bg: '#1d4f9c', fg: '#f4f1e6', border: '#f4f1e6', big: 0.28, small: 0.2 } });
    k.solid(0, 0, 4);
  },
  rand_natuurbord(k) {
    k.sign(0, 0, ['Rottum', 'verboden natuur'], { w: 2, h: 0.9, y: 1.7, style: { bg: '#2f6b3a', fg: '#f4f1e6', border: '#f4f1e6', big: 0.3, small: 0.22 } });
    k.solid(0, 0, 0.5);
  },
  rand_boei(k) {
    k.cyl(0, 0.5, 0, 0.45, 1.0, RED, 8, 0.3);
    k.cyl(0, 1.2, 0, 0.12, 0.6, WHITE, 6);
  },
  rand_mistbank(k) {
    mistPlane(k, 0, 90, 16, 0.5);
    mistPlane(k, 6, 70, 10, 0.4);
    mistPlane(k, -6, 110, 22, 0.45);
  },
  rand_wegversperring(k, o) {
    barrier(k, 0, (o.hw || 3) + 0.6);
    k.sign(-0.2, -(o.hw || 3) - 1.2, ['Hjir net, jong', 'Fryslân is dicht'], { w: 2.2, h: 1.0, y: 1.9, style: { bg: '#1d4f9c', fg: '#f4f1e6', border: '#f4f1e6', big: 0.28, small: 0.22 } });
    k.solid(0, 0, (o.hw || 3) + 0.6);
  },
  rand_neef(k) {
    // De twee neven bij de Friese grens staan niet stil (#436): ze ijsberen
    // langs het hek en zwaaien, in plaats van als etalagepoppen te wachten.
    const a = k.person('fries', 0, 0, Math.PI);
    const b = k.person('fries', 1.3, 1.1, Math.PI);
    const pace = (m, base, amp, phase) => {
      m.userData.neefBase = base; m.userData.neefAmp = amp; m.userData.neefPhase = phase;
    };
    pace(a, 0, 1.1, 0);
    pace(b, 1.3, 0.9, 1.7);
    k.ticks.push((dt, t) => {
      for (const m of [a, b]) {
        const u = m.userData;
        const s = Math.sin(t * 0.9 + u.neefPhase);
        const c = Math.cos(t * 0.9 + u.neefPhase);
        const moving = Math.abs(c) > 0.08;
        m.position.x = u.neefBase + s * u.neefAmp;
        if (moving) m.rotation.y = c >= 0 ? 0 : -Math.PI; // het model kijkt naar lokale +x
        animatePersonWalk(m, moving ? 1.1 : 0, dt);
        const arm = m.userData.armR;
        if (!moving && arm) arm.rotation.z = 0.5 + Math.sin(t * 5 + u.neefPhase) * 0.35; // zwaaien
      }
    });
    k.solid(0, 0, 0.5);
  },
  rand_hunebed(k) {
    // capstones on upright stones, a board "Drenthe is dicht"
    for (const z of [-2.2, 0, 2.2]) for (const x of [-1.2, 1.2]) k.box(x, 0.8, z, 0.9, 1.6, 0.9, 0x8a8a84);
    for (const z of [-1.1, 1.1]) k.box(0, 1.8, z, 4.2, 0.6, 2.2, 0x9a9a92);
    k.sign(3.4, 0, ['Drenthe is dicht', 'probeer het morgen'], { w: 2.2, h: 0.9, y: 1.5, style: { big: 0.26, small: 0.2 } });
    k.solid(0, -1.1, 1.8).solid(0, 1.1, 1.8);
  },
};
export const EDGE_PROP_KINDS = Object.keys(EDGE_BUILD);
Object.assign(BUILD, EDGE_BUILD);

// Street furniture of the province towns (stadsprofielen.js, stadsplan.js, stadsleven.js, #67).
// Small, low-poly, one per spot; `stad_bord` carries a shop's made-up name.
const TOWN_BUILD = {
  stad_bank(k) { bench(k, 0, 0, 0); k.solid(0, 0, 0.9); },
  stad_bolder(k) { k.cyl(0, 0.35, 0, 0.28, 0.7, DARK, 8, 0.2); k.cyl(0, 0.75, 0, 0.3, 0.12, DARK, 8); k.solid(0, 0, 0.35); },
  stad_container(k) {
    const c = [0x2f6fb0, 0xc8202a, 0x3a8a4a, 0xd8a020][Math.floor(Math.random() * 4)];
    k.box(0, 1.3, 0, 6.1, 2.6, 2.4, c);
    k.box(0, 2.62, 0, 6.1, 0.06, 2.4, DARK);
    k.solid(-2, 0, 1.4).solid(2, 0, 1.4);
  },
  stad_bloembak(k) {
    k.box(0, 0.35, 0, 1.4, 0.7, 0.6, WOOD);
    for (let i = 0; i < 5; i++) k.box(-0.55 + i * 0.275, 0.82, 0, 0.22, 0.22, 0.3, [RED, ORANGE, 0xe8d040, 0xe070a0, WHITE][i]);
    k.solid(0, 0, 0.7);
  },
  stad_fietsenrek(k) {
    k.box(0, 0.45, 0, 0.1, 0.06, 3.2, GREY);
    for (let i = 0; i < 4; i++) { const b = buildBike([0x2f6fb0, 0xc8202a, 0xf2c230, 0x3a8a4a][i]); b.position.set(0.5, 0, -1.2 + i * 0.8); b.rotation.y = Math.PI / 2; k.add(b); }
    k.solid(0.3, 0, 1.2);
  },
  stad_vlaggenmast(k) {
    k.post(0, 0, 7, WHITE, 0.06);
    const f = new THREE.Group();
    const g = new GeoBuilder();
    g.box(0.7, 0, 0, 1.4, 0.45, 0.02, 0x1d4f9c);
    g.box(0.7, -0.45, 0, 1.4, 0.45, 0.02, WHITE);
    const m = new THREE.Mesh(g.build(), MAT);
    k.own.push(m.geometry);
    f.add(m);
    f.position.set(0.06, 6.7, 0);
    k.add(f);
    k.ticks.push((dt, t) => { f.rotation.y = Math.sin(t * 2.1) * 0.12; });
    k.solid(0, 0, 0.3);
  },
  stad_aardappelkist(k) { for (let i = 0; i < 3; i++) k.box(0, 0.25 + i * 0.5, 0, 1.2 - i * 0.1, 0.5, 0.8, [WOOD, 0x9a7448, WOOD][i]); k.box(0, 1.55, 0, 1.0, 0.1, 0.6, 0xc8a050); k.solid(0, 0, 0.8); },
  stad_graanbaal(k) { k.cyl(0, 0.7, 0, 0.8, 1.4, 0xd8c060, 10); k.cyl(0, 1.42, 0, 0.8, 0.05, 0xb89c40, 10); k.solid(0, 0, 0.85); },
  stad_visnet(k) {
    k.post(-1.3, 0, 2.2, WOOD, 0.07); k.post(1.3, 0, 2.2, WOOD, 0.07);
    k.box(0, 1.2, 0, 2.5, 1.7, 0.03, 0x5a7a7a);
    k.box(0, 2.15, 0, 2.7, 0.06, 0.06, WOOD);
    k.solid(-1.3, 0, 0.3).solid(1.3, 0, 0.3);
  },
  stad_wasdraad(k) {
    k.post(-1.6, 0, 2.2, GREY, 0.04); k.post(1.6, 0, 2.2, GREY, 0.04);
    k.box(0, 2.1, 0, 3.3, 0.02, 0.02, DARK);
    for (let i = 0; i < 4; i++) k.box(-1.1 + i * 0.75, 1.75, 0, 0.45, 0.65, 0.03, [WHITE, 0xe8a0b0, 0x7aa0d0, 0xe8d880][i]);
  },
  stad_boom(k) { k.cyl(0, 1.2, 0, 0.18, 2.4, WOOD, 6); k.cyl(0, 3.4, 0, 1.6, 2.6, 0x3d7a3a, 7, 0.2); k.solid(0, 0, 0.4); },
  stad_schaap(k) {
    for (const [x, z, r] of [[0, 0, 0], [1.6, 0.9, 0.6], [-1.2, 1.4, -0.4]]) {
      k.box(x, 0.5, z, 0.9, 0.55, 0.5, 0xeeeadd, r);
      k.box(x + 0.55 * Math.cos(r), 0.62, z - 0.55 * Math.sin(r) * 0.3, 0.25, 0.28, 0.25, DARK, r);
      for (const dx of [-0.3, 0.3]) for (const dz of [-0.15, 0.15]) k.box(x + dx, 0.12, z + dz, 0.07, 0.25, 0.07, DARK);
    }
  },
  stad_vuurtoren(k) {
    k.cyl(0, 3.5, 0, 1.5, 7, WHITE, 10, 1.0);
    k.cyl(0, 7.4, 0, 1.15, 0.3, DARK, 10);
    k.cyl(0, 8.2, 0, 0.7, 1.3, 0xe8d880, 10);
    k.cyl(0, 9.3, 0, 0.9, 0.9, RED, 10, 0.1);
    k.solid(0, 0, 1.6);
  },
  stad_bord(k, o, def) {
    k.sign(0, 0, [def.name || 'Winkel', def.sub || ''], { w: 1.8, h: 0.8, y: 1.6, ry: Math.PI / 2, style: { bg: '#f4f1e6', fg: '#1b2a44', border: '#1b2a44', big: 0.26, small: 0.18 } });
    k.solid(0, 0, 0.5);
  },
};
export const TOWN_PROP_KINDS = Object.keys(TOWN_BUILD);
Object.assign(BUILD, TOWN_BUILD);

// kind: a WORLD_ENDS prop or a village/mission prop; def: its text entry.
export function buildProp(kind, opts = {}, def = {}) {
  const k = new Kit();
  const fn = BUILD[kind];
  if (!fn) throw new Error('onbekende prop ' + kind);
  if (opts.worldEnd) deadEnd(k, -1.5, -(opts.hw || 3) - 0.9);
  fn(k, { hw: 3, ...opts }, def);
  return k.finish();
}

// Idle breathing for the figures of a prop within sight.
export function animateProp(p, dt, t) {
  for (const q of p.people) if (!q.animal && !q.seated) animatePersonWalk(q.mesh, 0, dt);
  if (p.tick) p.tick(dt, t);
}
