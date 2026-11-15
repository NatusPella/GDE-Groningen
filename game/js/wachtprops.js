// #963: wachten in een cirkel is geen leeg wachten meer. Bij een `hold`-stap
// (blijf in de cirkel tot de tijd om is) zet deze module een echte kring op de
// grond met een voortgangsring en een paar passende spullen eromheen: een bank
// bij het loket, balen op het erf, tonnen op de wal, kisten aan de kade, een
// plant in de wachtrij. De ring licht stukje bij stukje op terwijl de klok loopt.
//
// De keuze is puur (waitDressingFor) en met een test na te spelen; het tekenen
// heeft three.js en de scène nodig.
import * as THREE from 'three';
import { getScene } from './scene3d.js';

const KINDS = [
  [/loket|wachtrij|balie|rij\b|nummer/i, 'plant'],
  [/wal|vesting|kanon|kruit|bourtange|beleg|gracht/i, 'ton'],
  [/erf|schuur|boer|koe|akker|graan|wei/i, 'baal'],
  [/boot|kade|haven|veer|brug|sluis/i, 'kist'],
  [/perron|station|halte|bushok/i, 'bank'],
];
export function waitDressingFor(st = {}) {
  st = st || {};
  const text = `${st.label || ''} ${st.say || ''}`;
  for (const [re, kind] of KINDS) if (re.test(text)) return kind;
  return 'bank';
}

// Waar de spullen staan: drie of vier plekken om de cirkel, niet precies op de
// aanloop (het zuiden), zodat je er niet tegenaan loopt.
export function propSpots(n = 3, radius = 6) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 0.35 + (i / n) * Math.PI * 1.45;
    out.push({ a, x: Math.cos(a) * radius, y: Math.sin(a) * radius });
  }
  return out;
}

const COL = {
  hout: 0x8a6238, hout2: 0x6f4d2a, kist: 0x9a7a4a, ton: 0x6b4a2a, baal: 0xd8c060,
  blad: 0x3d7a3a, pot: 0xa0522d, stof: 0x2f4a6a, grijs: 0x777d88, geel: 0xffc21a,
};
function mat(color) { return new THREE.MeshLambertMaterial({ color }); }
function box(w, h, d, color, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color)); m.position.set(x, y, z); return m; }
function cyl(r, h, color, x, y, z, seg = 8) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat(color)); m.position.set(x, y, z); return m; }

function buildProp(kind) {
  const g = new THREE.Group();
  if (kind === 'bank') {
    g.add(box(2.2, 0.12, 0.6, COL.hout, 0, 0.48, 0), box(2.2, 0.55, 0.1, COL.hout2, 0, 0.82, -0.25));
    for (const x of [-0.9, 0.9]) g.add(box(0.12, 0.48, 0.5, COL.hout2, x, 0.24, 0));
  } else if (kind === 'kist') {
    g.add(box(1.1, 0.7, 0.75, COL.kist, 0, 0.35, 0), box(1.14, 0.08, 0.8, COL.hout2, 0, 0.72, 0));
    g.add(box(0.08, 0.2, 0.1, COL.grijs, 0, 0.62, 0.4));
  } else if (kind === 'baal') {
    g.add(cyl(0.62, 1.1, COL.baal, 0, 0.55, 0, 10));
    g.add(cyl(0.63, 0.06, 0xb89c40, 0, 1.1, 0, 10));
  } else if (kind === 'ton') {
    g.add(cyl(0.42, 0.95, COL.ton, 0, 0.48, 0, 8));
    for (const y of [0.2, 0.75]) g.add(cyl(0.44, 0.06, COL.grijs, 0, y, 0, 8));
  } else { // plant
    g.add(cyl(0.34, 0.5, COL.pot, 0, 0.25, 0, 6));
    const blad = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), mat(COL.blad));
    blad.position.y = 1.0; blad.scale.y = 1.35;
    g.add(blad);
  }
  return g;
}

// De kring met zestien streepjes; samen de voortgang van de wachttijd.
export function buildWaitDressing(st, target, radius = 3.5, world = null) {
  const scene = getScene();
  if (!scene || !target) return null;
  const base = world && world.map && world.map.groundHeightAt ? (world.map.groundHeightAt(target.x, target.y, 0) || 0) : (target.z || 0);
  const group = new THREE.Group();
  group.name = 'wait-circle';
  group.position.set(target.x, base + 0.04, target.y);
  const r = Math.max(2.2, radius || 3.5);
  const segs = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.7, r * 0.22), 0.06, 0.16), mat(COL.grijs));
    seg.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    seg.rotation.y = -a + Math.PI / 2;
    group.add(seg);
    segs.push(seg);
  }
  group.userData.segs = segs;
  // de spullen staan buiten de kring, op de wal of het erf
  const kind = waitDressingFor(st);
  const spots = propSpots(3, r + 2.1);
  for (const p of spots) {
    const prop = buildProp(kind);
    prop.position.set(p.x, 0, p.y);
    prop.rotation.y = -p.a - Math.PI / 2;
    group.add(prop);
  }
  scene.add(group);
  return group;
}

// k: 0..1 van de wachttijd
export function updateWaitDressing(group, k) {
  const segs = group && group.userData.segs;
  if (!segs) return;
  const lit = Math.max(0, Math.min(segs.length, Math.round(k * segs.length)));
  for (let i = 0; i < segs.length; i++) segs[i].material.color.setHex(i < lit ? COL.geel : COL.grijs);
}

export function disposeWaitDressing(group) {
  if (!group) return;
  group.removeFromParent();
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
}
