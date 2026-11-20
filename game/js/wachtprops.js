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
import { buildPersonMesh, releasePersonGeometry } from './models3d_people.js';
import { neutralPose, applyPose, makeRng } from './actoranim.js';
import { idlePose } from './idleclips.js';
export { idlePose }; // (de clips zelf staan sinds #985 in idleclips.js, zonder scène)

const KINDS = [
  [/loket|wachtrij|balie|rij\b|nummer/i, 'plant'],
  [/wal|vesting|kanon|kruit|bourtange|beleg|gracht/i, 'ton'],
  [/erf|schuur|boer|koe|akker|graan|wei/i, 'baal'],
  [/boot|kade|haven|veer|brug|sluis/i, 'kist'],
  [/perron|station|halte|bushok/i, 'bank'],
];
// De spullen die een stap met `wacht: { prop }` zelf mag kiezen; de vijf eerste volgen anders de tekst.
export const PROP_KINDS = ['bank', 'kist', 'baal', 'ton', 'plant', 'koffie', 'krant', 'hengel'];
export function waitDressingFor(st = {}) {
  st = st || {};
  if (st.wacht && PROP_KINDS.includes(st.wacht.prop)) return st.wacht.prop;
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
  } else if (kind === 'koffie') { // statafel met een kop en een thermoskan
    g.add(cyl(0.45, 0.06, COL.hout, 0, 0.98, 0, 10), cyl(0.06, 0.95, COL.grijs, 0, 0.48, 0, 6), cyl(0.3, 0.05, COL.grijs, 0, 0.03, 0, 10));
    g.add(cyl(0.09, 0.12, 0xf2efe6, -0.12, 1.07, 0.05, 8), cyl(0.07, 0.26, COL.stof, 0.18, 1.14, -0.08, 8));
  } else if (kind === 'krant') { // leesstandaard met een opengeslagen krant
    g.add(cyl(0.05, 1.3, COL.grijs, 0, 0.65, 0, 6), cyl(0.3, 0.05, COL.grijs, 0, 0.03, 0, 8));
    const blad = box(0.9, 0.6, 0.04, 0xe8e4d6, 0, 1.3, 0); blad.rotation.x = -0.2;
    g.add(blad);
  } else if (kind === 'hengel') { // hengel in een steun, emmer ernaast
    g.add(box(0.08, 0.7, 0.08, COL.hout2, 0, 0.35, 0));
    const stok = box(0.04, 0.04, 2.2, COL.hout, 0, 0.95, 0.5); stok.rotation.x = 0.35;
    g.add(stok, cyl(0.2, 0.3, COL.stof, 0.7, 0.15, 0.1, 8));
  } else { // plant
    g.add(cyl(0.34, 0.5, COL.pot, 0, 0.25, 0, 6));
    const blad = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), mat(COL.blad));
    blad.position.y = 1.0; blad.scale.y = 1.35;
    g.add(blad);
  }
  return g;
}

// ---- de wachtfiguur ------------------------------------------------------------------------------------------
// Een stap met `wacht: { figuur: true }` (of een object met `prop`, `seed`, `rol`) krijgt naast de kring een
// wachtende persoon die rondkijkt, op zijn horloge kijkt, wipt, koffie drinkt of leest. Wachten blijft gewoon
// wachten: de figuur is alleen beeld, de klok, de cirkel en het slagen veranderen niet. Zonder `wacht` geen figuur.
// Samen spelen: elke speler bouwt de figuur bij zijn eigen stap; er wordt niets gedeeld of verstuurd.
export const IDLE_CLIPS = ['rondkijken', 'horloge', 'wippen', 'koffie', 'lezen'];
// Per soort plek de voorkeur voor de clips (de volgorde draait met de seed).
const CLIPS_PER_PLEK = {
  bank: ['horloge', 'rondkijken', 'wippen'],
  plant: ['horloge', 'wippen', 'rondkijken'],
  ton: ['rondkijken', 'wippen', 'horloge'],
  baal: ['rondkijken', 'wippen', 'koffie'],
  kist: ['rondkijken', 'horloge', 'wippen'],
  koffie: ['koffie', 'rondkijken', 'koffie', 'horloge'],
  krant: ['lezen', 'rondkijken', 'lezen', 'horloge'],
  hengel: ['rondkijken', 'wippen', 'rondkijken'],
};
const SHIRTS = [0xc8552e, 0x2f6fb0, 0xe0b93a, 0x3f8a52, 0x8a4a8a, 0x555f6e];
const SKINS = [0xf1c9a5, 0xd9a06e, 0xa9744a, 0x7a4e2e];

const hashText = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return (h >>> 0) / 4294967296; };
// De seed van een stap: `wacht.seed` als die er is, anders een vaste waarde uit het label (dezelfde stap, dezelfde figuur).
export function waitSeed(st) {
  const w = st && st.wacht;
  if (w && Number.isFinite(w.seed)) return w.seed;
  return hashText(`${(st && st.label) || ''}|${(st && st.say) || ''}`);
}

// De figuur van een stap, puur: null zonder `wacht` (of met `figuur: false`), anders het plan met de plek, de
// kleren en een rooster van clips (elk 3 tot 6 s) dat doorloopt zolang de stap duurt.
export function waitFigureFor(st, seed = waitSeed(st)) {
  const w = st && st.wacht;
  if (!w || typeof w !== 'object' || w.figuur === false) return null;
  const prop = waitDressingFor(st);
  const rng = makeRng(seed);
  const voorkeur = CLIPS_PER_PLEK[prop] || CLIPS_PER_PLEK.bank;
  const draai = Math.floor(rng() * voorkeur.length);
  const rooster = [];
  for (let i = 0; i < voorkeur.length; i++) rooster.push({ clip: voorkeur[(i + draai) % voorkeur.length], dur: 3 + rng() * 3 });
  let totaal = 0;
  for (const r of rooster) totaal += r.dur;
  return {
    prop, seed, rol: typeof w.rol === 'string' ? w.rol : 'wachter',
    plek: Math.floor(rng() * 3), // welke van de drie plekken om de kring (propSpots)
    shirt: SHIRTS[Math.floor(rng() * SHIRTS.length)], skin: SKINS[Math.floor(rng() * SKINS.length)],
    rooster, totaal, fase: rng() * totaal, // elke figuur begint ergens anders in zijn rooster
  };
}

// Welke clip er op tijd t loopt, en hoe ver daarin (tl) en hoe lang hij duurt; schrijft in `uit`, maakt niets aan.
export function figureClipAt(plan, t, uit = { clip: '', tl: 0, dur: 1 }) {
  let tt = (((t + plan.fase) % plan.totaal) + plan.totaal) % plan.totaal;
  for (let i = 0; i < plan.rooster.length; i++) {
    const r = plan.rooster[i];
    if (tt < r.dur || i === plan.rooster.length - 1) { uit.clip = r.clip; uit.tl = Math.min(tt, r.dur); uit.dur = r.dur; return uit; }
    tt -= r.dur;
  }
  return uit;
}

// De kring met zestien streepjes; samen de voortgang van de wachttijd.
export function buildWaitDressing(st, target, radius = 3.5, world = null) {
  const scene = getScene();
  if (!scene || !target) return null;
  // een doel op een brugdek (M20: deur twee en drie in Bourtange): met de hoogte van de speler die er al staat als hint pakt de kring het dek,
  // met hint 0 lag hij op het water eronder
  const pl = world && world.player;
  const hint = pl && Number.isFinite(pl.z) && Math.hypot(pl.x - target.x, pl.y - target.y) < Math.max(12, radius + 4) ? pl.z : 0;
  const base = world && world.map && world.map.groundHeightAt ? (world.map.groundHeightAt(target.x, target.y, hint) || 0) : (target.z || 0);
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
  // de wachtfiguur (alleen op verzoek van de stap): staat tussen twee spullen, kijkt naar het midden
  const plan = waitFigureFor(st);
  if (plan) {
    try {
      const mesh = buildPersonMesh(plan.shirt, plan.skin, { seed: Math.floor(plan.seed * 1e6) });
      const a = spots[plan.plek].a + 0.5;
      mesh.position.set(Math.cos(a) * (r + 1.6), 0, Math.sin(a) * (r + 1.6));
      mesh.rotation.y = -a - Math.PI / 2;
      group.add(mesh);
      group.userData.figuur = { mesh, plan, pose: neutralPose(), t: 0, uit: { clip: '', tl: 0, dur: 1 } };
    } catch (e) { /* een figuur die niet bouwt, is geen reden voor een kapotte stap */ }
  }
  scene.add(group);
  return group;
}

// Elk beeld: de wachtfiguur doorspelen. Geen allocaties: de pose en het tijdsvak worden hergebruikt.
export function tickWaitFigure(group, dt) {
  const f = group && group.userData && group.userData.figuur;
  if (!f) return false;
  f.t += Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.25) : 0;
  const c = figureClipAt(f.plan, f.t, f.uit);
  idlePose(f.pose, c.clip, c.tl, c.dur);
  applyPose(f.mesh.userData, f.pose);
  return true;
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
  const fig = group.userData && group.userData.figuur;
  group.traverse((o) => {
    if (!o.geometry && !o.material) return;
    // de persoon deelt zijn geometrie met andere mensen: die telt af in plaats van weg te gaan (#796)
    if (fig && o.geometry && typeof o.geometry.userData.personRefs === 'number') releasePersonGeometry(o);
    else if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) if (m && m.dispose) m.dispose();
  });
  if (fig) group.userData.figuur = null;
}
