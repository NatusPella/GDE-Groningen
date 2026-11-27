// Modulaire mensen op basis van Quaternius (ADR 0050, CC0; fase 1 = voorbijgangers achter ?mensen=q). Leest het eigen formaat dat
// scripts/people/quaternius_import.mjs maakt (game/models/mensen/<rig>.json + .bin) en bouwt per mens één SkinnedMesh met één gedeeld
// materiaal (één draw call), net als buildPersonMesh: hoofd, romp, benen en voeten uit verschillende figuren van dezelfde rig
// (man of vrouw), gekleurd per zaad (huid, haar, kleding). Animatie: de clips van het pack (Idle, Walk, Run, ...) gemengd op snelheid,
// met de overgangen, blik en voeten op de grond van actorlife.js erbovenop. Geen allocaties per beeld.
//
// Samen spelen: niets hiervan gaat over het netwerk; zaad, snelheid en positie kent elke speler al, dus iedereen ziet dezelfde mens.
// Zolang de rig niet geladen is (of ?mensen=q ontbreekt) bouwt het spel de procedurele mens: niets breekt als het bestand er niet is.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { vcMaterial, markShared } from './pixelart3d.js';
import { crossfade, footPlant, wheelGrip, STEER_TURN } from './actorlife.js';
import { createAnimState, stepAnimState, stateName, STATES, STATE_IDS, UPPER_MASK } from './animstate.js';
import { blinkAmount } from './gait.js';
import { lookFromAppearance } from './modularlooks.js';
import { BODY_TYPES } from './clothinghair.js';
import { setModularActorHook } from './actoranim.js';
import { lodLevel, lodScaleFor, registerLodModel } from './lodregistry.js';
import { buildWear, basis as wearBasis } from './modularwear.js';

const rigs = new Map();               // 'man' | 'vrouw' -> gedecodeerde rig
const loading = new Map();
const MAT = markShared(vcMaterial({ roughness: 0.82 }));
const BOUNDS = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 1.5);
export const MODULAR_SLOTS = ['hoofd', 'romp', 'benen', 'voeten'];
const WALK_SPEED = { man: 1.45, vrouw: 1.3 };   // m/s waarbij de loopclip zonder glijden past (gemeten op het oog, fase 1)
const RUN_SPEED = { man: 4.6, vrouw: 4.2 };

// ---- laden en decoderen ---------------------------------------------------------------------

// Zet een rig uit manifest + binaire data klaar (ook in Node-tests, met fs gelezen).
export function registerModularRig(name, man, buf) {
  const ab = buf instanceof ArrayBuffer ? buf : buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const o = man.offsets, n = man.vertices;
  const posQ = new Int16Array(ab, o.pos, n * 3);
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < pos.length; i++) pos[i] = posQ[i] * man.posQ;
  const totalIdx = man.parts.reduce((s, p) => Math.max(s, p.iStart + p.iCount, ...(p.lods || []).map((l) => l.iStart + l.iCount)), 0);
  const rig = {
    name, man, pos,
    col: new Uint8Array(ab, o.col, n), si: new Uint8Array(ab, o.si, n * 4), sw: new Uint8Array(ab, o.sw, n * 4),
    idx: man.idx32 ? new Uint32Array(ab, o.idx, totalIdx) : new Uint16Array(ab, o.idx, totalIdx),
    slots: {}, clips: {}, geoCache: new Map(),
  };
  // grijphand (quaternius_import.mjs gripPositions): per verschoven vertex de index en de plek met gekrulde vingers
  rig.grip = man.grip > 0 ? { idx: new Uint32Array(ab, o.gripIdx, man.grip), pos: new Int16Array(ab, o.gripPos, man.grip * 3) } : null;
  for (const s of MODULAR_SLOTS) rig.slots[s] = man.parts.filter((p) => p.slot === s);
  // per deel: welk materiaal (niet huid, haar, ogen) het meeste vertices heeft; dat krijgt de kledingkleur van dit zaad
  for (const p of man.parts) {
    const count = new Map();
    for (let v = p.vStart; v < p.vStart + p.vCount; v++) { const m = man.palette[rig.col[v]].mat; if (!/skin|hair|eye|moustache|beard/i.test(m)) count.set(m, (count.get(m) || 0) + 1); }
    p.main = [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }
  for (const c of man.clips) {
    rig.clips[c.name] = {
      dur: c.dur, frames: c.frames, moving: c.moving, contact: c.contact,
      quats: new Int16Array(ab, c.quats, c.frames * man.bones.length * 4),
      pos: c.pos.map((off) => new Float32Array(ab, off, c.frames * 3)),
    };
  }
  // assen voor de blik: de verticale as van de persoon in de assen van de ouder van nek en hoofd (in rust)
  const tmp = buildSkeleton(rig);
  tmp.root.updateMatrixWorld(true);
  const q = new THREE.Quaternion(), up = new THREE.Vector3();
  rig.lookAxis = {};
  for (const n of ['Neck', 'Head']) {
    const b = tmp.bones[man.bones.findIndex((x) => x.name === n)];
    b.parent.getWorldQuaternion(q);
    rig.lookAxis[n] = up.set(0, 1, 0).applyQuaternion(q.invert()).normalize().toArray();
  }
  // de zij-as (+z van de mens) in de assen van de ouder van armen en hoofd: om die as zwaait een arm naar voren en knikt het hoofd
  rig.sideAxis = {};
  for (const n of ['UpperArmL', 'UpperArmR', 'LowerArmL', 'LowerArmR', 'Head', 'Neck', 'Abdomen', 'Torso', 'Chest', 'UpperLegL', 'UpperLegR']) {
    const bb = tmp.bones[man.bones.findIndex((x) => x.name === n)];
    bb.parent.getWorldQuaternion(q);
    rig.sideAxis[n] = up.set(0, 0, 1).applyQuaternion(q.invert()).normalize().toArray();
  }
  // de scheen in rust: van het onderbeen naar de enkel (de voet is geen kind), als as in de assen van het onderbeen en lengte; een clip
  // laat de voet soms los van de scheen staan, dan rekent de IK met de echte scheen (shinEnd)
  rig.shin = {};
  for (const sd of ['L', 'R']) {
    const lo = tmp.bones[man.bones.findIndex((x) => x.name === 'LowerLeg' + sd)], ft = tmp.bones[man.bones.findIndex((x) => x.name === (sd === 'L' ? 'FootL' : 'FootR'))];
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    lo.getWorldPosition(a); ft.getWorldPosition(b);
    lo.getWorldQuaternion(q);
    rig.shin[sd] = { axis: b.clone().sub(a).normalize().applyQuaternion(q.clone().invert()).toArray(), len: a.distanceTo(b) };
  }
  rigs.set(name, rig);
  return rig;
}
const _se = new THREE.Vector3(), _sq = new THREE.Quaternion();
// het einde van de scheen nu (wereld), uit de as en lengte in rust; s = de schaal van de mens
function shinEnd(rig, lo, side, s, out) {
  const sh = rig.shin[side];
  lo.getWorldPosition(out);
  lo.getWorldQuaternion(_sq);
  return out.add(_se.fromArray(sh.axis).applyQuaternion(_sq).multiplyScalar(sh.len * s));
}

// Laadt beide rigs in de achtergrond (browser). Geeft een belofte die nooit faalt: zonder bestand blijft het procedureel.
export function loadModularPeople(base = new URL('../models/mensen/', import.meta.url).href) {
  const all = [];
  for (const name of ['man', 'vrouw']) {
    if (rigs.has(name) || loading.has(name)) { all.push(loading.get(name)); continue; }
    const p = Promise.all([fetch(base + name + '.json').then((r) => r.json()), fetch(base + name + '.bin').then((r) => r.arrayBuffer())])
      .then(([man, buf]) => { registerModularRig(name, man, buf); if (rigs.size === 2) registerModularLods(registerLodModel); })
      .catch((e) => { console.warn('[mensen] rig niet geladen', name, e && e.message); return null; });
    loading.set(name, p);
    all.push(p);
  }
  return Promise.all(all);
}
export const modularReady = (rig) => (rig ? rigs.has(rig) : rigs.size === 2);
// Fasen (ADR 0050): de modulaire mensen zijn de STANDAARD (besluit coördinator 23-11, na de in-game controle): voorbijgangers,
// cutscenes en decorsets, de speler en medespelers (fase 3). ?mensen=oud is de noodschakelaar terug naar de procedurele mensen;
// ?mensen=q (alleen voorbijgangers) en q2 (ook cutscenes) blijven om een fase los te bekijken.
export function mensenFase(flag) { return flag === 'oud' ? 0 : flag === 'q' ? 1 : flag === 'q2' ? 2 : 3; }
// Zitvlak in rust (m boven de voeten, schaal 1) in de zit-clip, gemeten (UAL Sitting_Idle_Loop); de beller zet de mens zo hoog dat
// het zitvlak op de zitting ligt.
const SEAT_CONTACT = { man: 0.444, vrouw: 0.476 };
export function modularSeatContact(mesh) {
  const ud = mesh && mesh.userData;
  return ud && ud.qRig ? SEAT_CONTACT[ud.qRig.name] * (mesh.scale.y || 1) : 0;
}
// De deel-id's per rig (voor modularlooks.js).
export function modularPartIds() {
  const out = {};
  for (const [name, rig] of rigs) out[name] = new Set(rig.man.parts.map((p) => p.id));
  return out;
}
// Een vaste look (Tammo, Tessa, Jelle, bijrollen: de opties van buildPersonMesh) als modulaire mens met dezelfde kleding-identiteit,
// of null als de rig niet geladen is of de look niet te mappen is (dan blijft het de procedurele mens).
export function buildModularFromAppearance(a) {
  const look = lookFromAppearance(a, modularPartIds());
  if (!look) return null;
  const rig = rigs.get(look.rig);
  // lengte: de look (verhaalfiguren) of het lichaam uit de kledingkast (BODY_TYPES.hs), binnen de norm van de rig
  const bt = look.body && BODY_TYPES[look.body];
  look.scale = (rig.man.schaal || 1) * Math.max(0.92, Math.min(1.08, ((a.look && a.look.heightScale) || 1) * (bt ? bt.hs : 1))) * (look.old ? 0.985 : 1);
  // elke gewone figuur (geen verhaalfiguur of speler) krijgt lengte en bouw uit zijn zaad
  if (a.vary) { const sz = personSize(rig, look.seed, { old: look.old, child: !!(a.look && a.look.age === 'child') }); look.scale = sz.scale * (bt ? Math.max(0.92, Math.min(1.08, bt.hs)) : 1); look.wide = sz.wide; }
  const g = buildModularPerson(look.seed, { look });
  if (g && a.vary) g.userData.qFidget = true;   // alledaagse gebaren voor wie stilstaat: alleen de gewone figuren, niet de speler of een verhaalfiguur
  if (g && bt) { g.scale.x *= Math.max(0.9, Math.min(1.15, bt.bs || 1)); g.scale.z = g.scale.x; } // breder of smaller postuur
  return g;
}

// ---- bouwen ------------------------------------------------------------------------------------

function buildSkeleton(rig) {
  const man = rig.man;
  const root = new THREE.Object3D();
  root.name = 'armatuur';
  root.matrixAutoUpdate = false;
  root.matrix.fromArray(man.armature);
  const bones = man.bones.map((b) => { const o = new THREE.Bone(); o.name = b.name; o.position.fromArray(b.pos); o.quaternion.fromArray(b.quat); return o; });
  man.bones.forEach((b, i) => (b.parent < 0 ? root : bones[b.parent]).add(bones[i]));
  return { root, bones };
}

const hashf = (seed, k) => { const x = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
// Natuurlijke haarkleuren (donker- tot lichtblond, rossig, zwart), grijs en wit voor ouderen, een geverfde kleur zelden.
const HAIR = [0x2a1d14, 0x3b2a1e, 0x5a3d26, 0x7a5636, 0x9c7a4c, 0xb08f5c, 0xcdb485, 0x93462a, 0x1b1b1d];
const HAIR_OLD = [0x8a8580, 0xb4afa6, 0xd2cec6, 0x6e6a66];
const HAIR_DYED = [0x2f6f8a, 0x8a2f6f, 0xc9694a];
// Hoe vaak een deel voorkomt op een Groningse straat (correctie coördinator 23-11): gewone kapsels en kleding het meest, opvallende
// stijlen (hanenkam, cowboyhoed, punkleer, tuinbroek) zeldzaam (1 tot 3%). Sleutel = deel-id; wat niet genoemd is telt 1.
export const PART_WEIGHT = {
  Punk_Head: 0.02, Farmer_Head: 0.02, Worker_Head: 0.12, Beach_Head: 0.5, Adventurer_Head: 0.6,
  Punk_Body: 0.04, Farmer_Body: 0.05, Worker_Body: 0.08, Adventurer_Body: 0.12, Beach_Body: 0.45, Suit_Body: 0.45, Formal_Body: 0.6,
  Punk_Legs: 0.08, Farmer_Pants: 0.05, Worker_Legs: 0.2, Adventurer_Legs: 0.15, Suit_Legs: 0.55, Beach_Legs: 0.5, Formal_Legs: 0.5,
  Punk_Feet: 0.3, Farmer_Feet: 0.08, Worker_Feet: 0.4,
};
const weightOf = (p) => PART_WEIGHT[p.id] ?? 1;
function pickWeighted(list, u) {
  let total = 0;
  for (const p of list) total += weightOf(p);
  let x = u * total;
  for (const p of list) { x -= weightOf(p); if (x < 0) return p; }
  return list[list.length - 1];
}
const PANTS = [0x2f3b52, 0x232326, 0x3a3b3f, 0x7f7258, 0x4a3a2a, 0x3a4d6e, 0x2f3f5a, 0x55657a];
const _c = new THREE.Color(), _base = new THREE.Color();

// Kleur per paletregel: huid naar de gevraagde huidskleur (met de schaduw van het origineel), haar naar een haarkleur van het zaad,
// het hoofdmateriaal van romp en benen naar shirt- en broekkleur, de rest licht verschoven per zaad.
function colorFor(rig, part, palIdx, look, out) {
  const pe = rig.man.palette[palIdx];
  const m = pe.mat;
  out.setRGB(pe.rgb[0] / 255, pe.rgb[1] / 255, pe.rgb[2] / 255);
  if (/^skin/i.test(m)) {
    const ref = rig.man.palette.find((x) => x.mat === 'Skin') || pe;
    const k = (pe.rgb[0] + pe.rgb[1] + pe.rgb[2] + 1) / (ref.rgb[0] + ref.rgb[1] + ref.rgb[2] + 1);
    return out.copy(_base.setHex(look.skin)).multiplyScalar(Math.min(1.2, k));
  }
  if (/hair|eyebrow|moustache|beard/i.test(m)) return out.copy(_base.setHex(look.hair)).multiplyScalar(/eyebrow/i.test(m) ? 0.8 : 1);
  if (part.main === m && part.slot === 'romp' && look.shirt != null) return out.copy(_base.setHex(look.shirt));
  if (part.main === m && part.slot === 'benen') return out.copy(_base.setHex(look.pants));
  if (part.main === m && part.slot === 'voeten' && look.shoes != null) return out.copy(_base.setHex(look.shoes));   // de schoenen van de kleding (eerst bleven ze het rood of paars van het pack)
  if (/eye/i.test(m)) return out;
  const j = 0.92 + 0.16 * hashf(look.seed, palIdx + 3);
  return out.multiplyScalar(j);
}

// Kiest de delen en kleuren voor een zaad. female: true/false of undefined (dan het zaad).
export function modularLook(seed, opts = {}) {
  const female = opts.female !== undefined ? !!opts.female : hashf(seed, 1) < 0.5;
  const rigName = female ? 'vrouw' : 'man';
  const rig = rigs.get(rigName);
  if (!rig) return null;
  const parts = {};
  MODULAR_SLOTS.forEach((s, k) => { parts[s] = pickWeighted(rig.slots[s], hashf(seed, 10 + k)).id; });
  // leeftijd: ongeveer een op de vijf is ouder (grijs of wit haar, iets kleiner, rustiger tempo); geverfd haar zelden (2%)
  const child = !!opts.child;
  const old = !child && (opts.old !== undefined ? !!opts.old : hashf(seed, 23) < 0.2);
  const dyed = !old && !child && hashf(seed, 24) < 0.02;
  const { scale, wide } = opts.nominal ? { scale: (rig.man.schaal || 1) * (old ? 0.985 : 1), wide: 1 } : personSize(rig, seed, { child, old });   // nominal: de gemiddelde mens (audits van zitplekken)
  // een hoofddeksel bij ongeveer een op de tien volwassenen (pet, en bij oudere mannen de platte pet)
  let cap = null;
  if (!child && opts.hat !== false && !/Punk|Farmer|Worker/.test(parts.hoofd) && hashf(seed, 50) < (opts.hatChance ?? 0.1)) cap = old && !female ? 'flatcap' : 'cap';
  return {
    seed, rig: rigName, parts,
    skin: opts.skin ?? 0xd9a47a, shirt: opts.shirt ?? null,
    old, child,
    hair: old ? HAIR_OLD[Math.floor(hashf(seed, 20) * HAIR_OLD.length)] : dyed ? HAIR_DYED[Math.floor(hashf(seed, 20) * HAIR_DYED.length)] : HAIR[Math.floor(hashf(seed, 20) * HAIR.length)], pants: PANTS[Math.floor(hashf(seed, 21) * PANTS.length)],
    cap, capColor: cap ? CAP_COLORS[Math.floor(hashf(seed, 51) * CAP_COLORS.length)] : null,
    scale, wide,
  };
}
// De maat van een mens uit zijn zaad (stabiel, geloofwaardig): lengte (man ca. 1,70 tot 1,93 m, vrouw 1,58 tot 1,79 m, ouderen iets
// kleiner), bouw (breedte van schouders en middel 0,94 tot 1,08 keer) en kinderen op 55 tot 80 procent van de lengte. Elke speler
// rekent hetzelfde uit het zaad, dus een gast ziet dezelfde lengte en bouw.
export function personSize(rig, seed, { child = false, old = false } = {}) {
  const base = rig.man.schaal || 1;
  if (child) return { scale: base * (0.56 + 0.22 * hashf(seed, 42)), wide: 0.93 + 0.06 * hashf(seed, 41) };
  const tall = ((2 * hashf(seed, 22) - 1) + 0.5 * (2 * hashf(seed, 43) - 1)) / 1.5;   // iets klokvormig: de meesten rond het gemiddelde
  return { scale: base * (1 + (rig.man.variatie ?? 0.02) * 2.3 * tall) * (old ? 0.985 : 1), wide: 0.94 + 0.14 * hashf(seed, 41) + (old ? 0.02 : 0) };
}
const CAP_COLORS = [0x2b2f36, 0x3a4d6e, 0x6e2f2f, 0x46563a, 0x7a6a4a, 0x8a8f98, 0xc8621e, 0x2f2f2f];

// Een pet (Tammo, agent, pet of muts): een lage koepel van CAP_SEG x 3 vlakjes op de schedel en, bij een pet, een klep naar voren,
// op het hoofdbot. Maten uit de gezichtspunten (ogen) van het hoofd; het haar eronder wordt bedekt door een iets ruimere koepel.
function capFrame(face, kind) {
  const e0 = face.eyes[0], e1 = face.eyes[1];
  const eyeY = (e0.c[1] + e1.c[1]) / 2, zc = (e0.c[2] + e1.c[2]) / 2, front = Math.max(e0.x, e1.x);
  return { cx: front - 0.1, cy: eyeY + 0.035, zc, rx: 0.128, ry: kind === 'beanie' ? 0.15 : 0.13, rz: 0.122 };
}
function squashHair(rig, p, P, v0, face, kind) {
  const f = capFrame(face, kind), pal = rig.man.palette;
  for (let v = 0; v < p.vCount; v++) {
    if (!/hair|eyebrow/i.test(pal[rig.col[p.vStart + v]].mat) || /eyebrow/i.test(pal[rig.col[p.vStart + v]].mat)) continue;
    const o = (v0 + v) * 3;
    const dx = P[o] - f.cx, dy = P[o + 1] - f.cy, dz = P[o + 2] - f.zc;
    if (dy < -0.01) continue;
    const r = Math.hypot(dx / f.rx, Math.max(0, dy) / f.ry, dz / f.rz);
    if (r > 0.85) { const k = 0.85 / r; P[o] = f.cx + dx * k; P[o + 1] = f.cy + Math.max(0, dy) * k; P[o + 2] = f.zc + dz * k; }
  }
}
// Uitdrukkingen (personages 2): het pack heeft geen mond in de kleuren en platte ogen; mond en wenkbrauwen komen als dunne vlakken
// op het hoofdbot. look.mood: 'neutraal', 'vrolijk' (mondhoeken omhoog, wenkbrauwen iets op), 'mokkend' (mondhoeken omlaag, wenkbrauwen
// schuin naar binnen omlaag) of 'verbaasd' (ronde open mond, wenkbrauwen hoog). Per look gekozen uit het zaad; setModularMood wisselt.
export const MOODS = ['neutraal', 'vrolijk', 'mokkend', 'verbaasd'];
const MOOD_SEG = 6, MOOD_V = (MOOD_SEG + 1) * 2 + 8, MOOD_I = MOOD_SEG * 6 + 12;
function moodGeometry(face, look, P, C, SI, SW, I, v0, i0, headBone, skinRgb) {
  const mood = look.mood || 'neutraal', [mx, my, mz] = face.mouth, x = face.eyes[0].x - 0.0005;
  const put = (px, py, pz, c) => { P[v0 * 3] = px; P[v0 * 3 + 1] = py; P[v0 * 3 + 2] = pz; C[v0 * 3] = c[0]; C[v0 * 3 + 1] = c[1]; C[v0 * 3 + 2] = c[2]; SI[v0 * 4] = headBone; SW[v0 * 4] = 255; return v0++; };
  const strip = (pts, t, c) => {   // een lijn langs punten [y, z] met toenemende z, dikte t
    const base = v0;
    for (const [py, pz] of pts) { put(x, py + t / 2, pz, c); put(x, py - t / 2, pz, c); }
    for (let k = 0; k < pts.length - 1; k++) { const a = base + k * 2; I[i0++] = a; I[i0++] = a + 2; I[i0++] = a + 3; I[i0++] = a; I[i0++] = a + 3; I[i0++] = a + 1; }
  };
  const lip = [0.2, 0.07, 0.06], brow = [0.7, 0.7, 0.7];
  _base.setHex(look.hair ?? 0x3b2a1e); _base.multiplyScalar(0.55); brow[0] = _base.r; brow[1] = _base.g; brow[2] = _base.b;
  const hw = 0.026, v0s = v0, i0s = i0;
  if (mood === 'verbaasd') {
    const base = v0;
    for (const [py, pz] of [[my + 0.009, mz - 0.007], [my + 0.009, mz + 0.007], [my - 0.009, mz + 0.007], [my - 0.009, mz - 0.007]]) put(x + 0.0005, py, pz, [0.12, 0.03, 0.03]);
    for (const k of [0, 1, 2, 0, 2, 3]) I[i0++] = base + k;
  } else {
    const pts = [];
    for (let k = 0; k <= MOOD_SEG; k++) {
      const u = k / MOOD_SEG, e = (2 * u - 1) ** 2;
      pts.push([mood === 'vrolijk' ? my + 0.011 * e - 0.004 : mood === 'mokkend' ? my - 0.009 * e + 0.003 : my - 0.002, mz - hw + 2 * hw * u]);
    }
    strip(pts, mood === 'neutraal' ? 0.0035 : 0.0045, lip);
  }
  // wenkbrauwen: een staafje boven elk oog; de binnenkant (naar het midden van het gezicht) staat bij mokkend lager
  v0 = v0s + (MOOD_SEG + 1) * 2; i0 = i0s + MOOD_SEG * 6;   // vaste indeling: de mond heeft zijn eigen ruimte, ongebruikt blijft nul
  const zm = (face.eyes[0].c[2] + face.eyes[1].c[2]) / 2;
  const base = v0;
  for (const e of face.eyes) {
    const cz = e.c[2], by = e.c[1] + e.h / 2 + 0.017 + (mood === 'verbaasd' ? 0.013 : mood === 'vrolijk' ? 0.005 : 0), inner = cz > zm ? -1 : 1;   // inner = de kant van het midden langs z
    const lo = mood === 'mokkend' ? -0.007 : 0, hi = mood === 'mokkend' ? 0.004 : mood === 'vrolijk' ? 0.003 : 0;
    const yz = (side) => (side === inner ? lo : hi);   // side -1 = kleine z, +1 = grote z
    const z0 = cz - 0.017, z1 = cz + 0.017, y0 = by + yz(-1), y1 = by + yz(1), t = 0.004;
    put(x, y0 + t / 2, z0, brow); put(x, y1 + t / 2, z1, brow); put(x, y1 - t / 2, z1, brow); put(x, y0 - t / 2, z0, brow);
  }
  for (let k = 0; k < 2; k++) for (const j of [0, 1, 2, 0, 2, 3]) I[i0++] = base + k * 4 + j;
  return { v: v0s + MOOD_V, i: i0s + MOOD_I };
}
const CAP_SEG = 10, CAP_RINGS = 3;
const CAP_V = CAP_SEG * CAP_RINGS + 1 + 4, CAP_I = (CAP_SEG * (CAP_RINGS - 1) * 2 + CAP_SEG) * 3 + 6 + CAP_SEG * 0;
function capGeometry(face, kind, P, C, SI, SW, I, v0, i0, col, headBone) {
  const { cx, cy, zc, rx, ry, rz } = capFrame(face, kind);
  const base = v0;
  const put = (x, y, z) => { P[v0 * 3] = x; P[v0 * 3 + 1] = y; P[v0 * 3 + 2] = z; C[v0 * 3] = col[0]; C[v0 * 3 + 1] = col[1]; C[v0 * 3 + 2] = col[2]; SI[v0 * 4] = headBone; SW[v0 * 4] = 255; return v0++; };
  // ringen van de rand (licht schuin: achter lager dan voor) naar boven, dan de top
  for (let r = 0; r < CAP_RINGS; r++) {
    const a = (r / CAP_RINGS) * (Math.PI / 2);
    for (let s = 0; s < CAP_SEG; s++) {
      const t = (s / CAP_SEG) * Math.PI * 2, cxs = Math.cos(t), szs = Math.sin(t);
      const tilt = r === 0 ? -0.02 * cxs : 0;
      put(cx + rx * Math.cos(a) * cxs, cy + ry * Math.sin(a) + tilt, zc + rz * Math.cos(a) * szs);
    }
  }
  const top = put(cx, cy + ry, zc);
  const tri = (a, b, c) => { I[i0++] = a; I[i0++] = b; I[i0++] = c; };
  for (let r = 0; r < CAP_RINGS - 1; r++) for (let s = 0; s < CAP_SEG; s++) {
    const a = base + r * CAP_SEG + s, b = base + r * CAP_SEG + ((s + 1) % CAP_SEG), c = a + CAP_SEG, d = b + CAP_SEG;
    tri(a, c, b); tri(b, c, d);
  }
  for (let s = 0; s < CAP_SEG; s++) tri(base + (CAP_RINGS - 1) * CAP_SEG + s, top, base + (CAP_RINGS - 1) * CAP_SEG + ((s + 1) % CAP_SEG));
  // klep (alleen een pet): een plat vlak naar voren, iets omlaag
  // klep: een pet krijgt een lange, een platte pet een korte brede klep, een muts geen (zonder breedte was het een draadvlak: een spits puntje)
  const k0 = v0, y = cy - 0.012, w = kind === 'cap' || kind === 'tammo' || kind === 'police' ? 0.085 : kind === 'flatcap' ? 0.075 : 0, ext = kind === 'flatcap' ? 0.035 : 0.075;
  put(cx + rx * 0.85, y, zc - w); put(cx + rx * 0.85, y, zc + w); put(cx + rx + ext, y - 0.02 * (w > 0 ? 1 : 0), zc + w * 0.8); put(cx + rx + ext, y - 0.02 * (w > 0 ? 1 : 0), zc - w * 0.8);
  if (w > 0) { tri(k0, k0 + 1, k0 + 2); tri(k0, k0 + 2, k0 + 3); }
  return { v: v0, i: i0 };
}

// Een kledingdeel (modularwear.js) voor deze look: botten in rust, het kader van de kruin, en het profiel van het lijf uit de delen van
// de look (LOD 0), zodat een band om de arm of de heup precies op de stof ligt. Per rig, deel en combinatie van delen bewaard.
function wearFor(rig, look, face, id) {
  const prm = id === 'voetbalshirt' ? look.kit : look.wearParams && look.wearParams[id];
  const ck = id + '|' + look.parts.hoofd + '|' + look.parts.romp + '|' + look.parts.benen + '|' + JSON.stringify(prm || null);
  rig.wearCache = rig.wearCache || new Map();
  if (rig.wearCache.has(ck)) return rig.wearCache.get(ck);
  const bones = rig.man.bones;
  const bone = (n) => { const i = bones.findIndex((b) => b.name === n); return { i, p: new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(bones[i].inv).invert()).toArray() }; };
  const vertsOf = (slots) => slots.map((sl) => rig.man.parts.find((q) => q.id === look.parts[sl])).filter(Boolean);
  // alleen vertices die vooral aan een van de botten `only` hangen (een band om de arm telt de romp niet mee, het koppel de handen niet)
  const domBone = (k) => { let b = rig.si[k * 4], w = rig.sw[k * 4]; for (let j = 1; j < 4; j++) if (rig.sw[k * 4 + j] > w) { w = rig.sw[k * 4 + j]; b = rig.si[k * 4 + j]; } return b; };
  const profile = (c, axis, n, slots, only = null) => {
    const keep = only ? new Set(only.map((nm) => bones.findIndex((b) => b.name === nm))) : null;
    const a = new THREE.Vector3(...axis).normalize(), [u, v] = wearBasis(axis);
    const r = new Array(n).fill(0);
    for (const p of vertsOf(slots)) for (let k = p.vStart; k < p.vStart + p.vCount; k++) {
      const dx = rig.pos[k * 3] - c[0], dy = rig.pos[k * 3 + 1] - c[1], dz = rig.pos[k * 3 + 2] - c[2];
      if (Math.abs(dx * a.x + dy * a.y + dz * a.z) > 0.018 || (keep && !keep.has(domBone(k)))) continue;
      const x = dx * u[0] + dy * u[1] + dz * u[2], y = dx * v[0] + dy * v[1] + dz * v[2], d = Math.hypot(x, y);
      if (d > 0.3) continue;   // een ander lid of de andere arm
      const s = Math.round(((Math.atan2(y, x) / (Math.PI * 2)) * n + n) % n) % n;
      if (d > r[s]) r[s] = d;
    }
    const known = r.filter((x) => x > 0), avg = known.length ? known.reduce((x, y) => x + y, 0) / known.length : 0.05;
    return r.map((x) => x || avg);
  };
  const surface = (pt, dir, slots) => {
    const d = new THREE.Vector3(...dir).normalize();
    let best = 0;
    for (const p of vertsOf(slots)) for (let k = p.vStart; k < p.vStart + p.vCount; k++) {
      const dx = rig.pos[k * 3] - pt[0], dy = rig.pos[k * 3 + 1] - pt[1], dz = rig.pos[k * 3 + 2] - pt[2];
      const along = dx * d.x + dy * d.y + dz * d.z;
      if (along <= best) continue;
      const px = dx - d.x * along, py = dy - d.y * along, pz = dz - d.z * along;
      if (px * px + py * py + pz * pz < 0.04 * 0.04) best = along;
    }
    return [pt[0] + d.x * best, pt[1] + d.y * best, pt[2] + d.z * best];
  };
  const w = buildWear(id, { cap: capFrame(face, 'police'), face, bone, profile, surface }, prm || null);
  rig.wearCache.set(ck, w);
  return w;
}

const GEO_CACHE_MAX = 120;
// perf-r3 (24-11, profiel: geometryFor 73 ms in één beeld na een sprong): een LOD-wissel van een modulaire mens bouwt zijn
// geometrie pas als die nog niet in de cache staat; per beeld hoogstens GEO_BUILD_MS daarvan. Is het budget op, dan wacht de wissel
// een beeld (de mens houdt zijn huidige niveau). Een NIEUWE mens (buildModularPerson) bouwt altijd: die moet er staan.
const GEO_BUILD_MS = 3;
let geoBuildSpent = 0, geoBudgetOn = false; // aan zodra de spellus het budget per beeld terugzet (tests en losse bouw: geen budget)
export function resetModularGeoBudget() { geoBuildSpent = 0; geoBudgetOn = true; }
function geoCached(rig, look, lod, grip) { return !!rig.geoCache.get(geoKey(look, lod, !!(grip && lod === 0 && rig.grip))); }
function geoKey(look, lod, grip) {
  const wearIds = look.wear && look.wear.length && lod < 2 ? look.wear : null;
  return `${lod}${grip ? 'g' : ''}|${wearIds ? wearIds.join('+') : ''}|${look.mood || ''}|${look.cap || ''}|${look.capColor || ''}|${look.kit ? JSON.stringify(look.kit) : ''}${look.wearParams ? JSON.stringify(look.wearParams) : ''}|${look.parts.hoofd}|${look.parts.romp}|${look.parts.benen}|${look.parts.voeten}|${look.skin}|${look.shirt}|${look.hair}|${look.pants}|${look.shoes ?? ''}|${Math.floor(hashf(look.seed, 3) * 8)}`;
}
function geometryFor(rig, look, lod = 0, grip = false) {
  grip = !!(grip && lod === 0 && rig.grip);   // de LOD's houden een open hand (vanaf 25 m zie je geen vingers)
  const wearIds = look.wear && look.wear.length && lod < 2 ? look.wear : null;   // kledingdelen (modularwear.js); op LOD 2 niet
  const key = geoKey(look, lod, grip); // dezelfde sleutel als geoCached
  let g = rig.geoCache.get(key);
  if (g) { rig.geoCache.delete(key); rig.geoCache.set(key, g); return g; }
  // per deel het bereik van dit LOD-niveau (0 = het origineel, 1 en 2 uit de importpijplijn, LOD_CELLS)
  const parts = MODULAR_SLOTS.map((s) => { const p = rig.man.parts.find((q) => q.id === look.parts[s]); return lod > 0 && p.lods && p.lods[lod - 1] ? { ...p.lods[lod - 1], id: p.id, slot: p.slot, main: p.main } : p; });
  // gezicht (cutscene-fase): een mondopening en twee oogleden als plaatjes op twee extra botten (dicht = schaal 0, dus onzichtbaar)
  const face = rig.man.parts.find((q) => q.id === look.parts.hoofd).face;
  // de eenvoudige pet alleen als er geen kledingdeel voor het hoofd is (de politiepet komt uit modularwear.js)
  const wear = wearIds && face ? wearIds.map((id) => wearFor(rig, look, face, id)).filter(Boolean) : [];
  const capOn = !!(face && look.cap) && !wear.some((w) => w.id === 'politiepet');
  const moodOn = !!(face && lod < 2);   // mond en wenkbrauwen van de uitdrukking (vanaf 25 m niet meer te zien)
  const FV = (face ? 12 : 0) + (moodOn ? MOOD_V : 0) + (capOn ? CAP_V : 0) + wear.reduce((a, w) => a + w.pos.length / 3, 0), FI = (face ? 18 : 0) + (moodOn ? MOOD_I : 0) + (capOn ? CAP_I : 0) + wear.reduce((a, w) => a + w.idx.length, 0);
  const nV = parts.reduce((s, p) => s + p.vCount, 0) + FV, nI = parts.reduce((s, p) => s + p.iCount, 0) + FI;
  const P = new Float32Array(nV * 3), C = new Float32Array(nV * 3), SI = new Uint8Array(nV * 4), SW = new Uint8Array(nV * 4);
  const I = nV < 65536 ? new Uint16Array(nI) : new Uint32Array(nI);
  let v0 = 0, i0 = 0;
  const palColor = new Map();
  for (const p of parts) {
    P.set(rig.pos.subarray(p.vStart * 3, (p.vStart + p.vCount) * 3), v0 * 3);
    SI.set(rig.si.subarray(p.vStart * 4, (p.vStart + p.vCount) * 4), v0 * 4);
    SW.set(rig.sw.subarray(p.vStart * 4, (p.vStart + p.vCount) * 4), v0 * 4);
    // onder een pet of muts: het haar boven de rand gaat binnen de koepel (geen plukken door de stof)
    if (p.slot === 'hoofd' && face && look.cap) squashHair(rig, p, P, v0, face, look.cap);
    // grijphand: de vertices van de vingers op hun gekrulde plek (om een stang van ~3,5 cm)
    if (grip && p.gCount) for (let k = p.gStart; k < p.gStart + p.gCount; k++) {
      const d = (v0 + rig.grip.idx[k] - p.vStart) * 3;
      P[d] = rig.grip.pos[k * 3] * rig.man.posQ; P[d + 1] = rig.grip.pos[k * 3 + 1] * rig.man.posQ; P[d + 2] = rig.grip.pos[k * 3 + 2] * rig.man.posQ;
    }
    for (let v = 0; v < p.vCount; v++) {
      const pi = rig.col[p.vStart + v], ck = p.id + '|' + pi;
      let c = palColor.get(ck);
      if (!c) { colorFor(rig, p, pi, look, _c); c = [_c.r, _c.g, _c.b]; palColor.set(ck, c); }
      C[(v0 + v) * 3] = c[0]; C[(v0 + v) * 3 + 1] = c[1]; C[(v0 + v) * 3 + 2] = c[2];
    }
    for (let i = 0; i < p.iCount; i++) I[i0 + i] = rig.idx[p.iStart + i] + v0;
    v0 += p.vCount; i0 += p.iCount;
  }
  if (face) {
    const nb = rig.man.bones.length, MOUTH = nb, LIDS = nb + 1;
    colorFor(rig, { slot: 'hoofd', main: null }, rig.man.palette.findIndex((x) => x.mat === 'Skin'), look, _c);
    const skin = [_c.r * 0.93, _c.g * 0.93, _c.b * 0.93], dark = [0.035, 0.012, 0.01];
    const quad = (x, y0, y1, z0, z1, c, bone) => {
      const base = v0;
      for (const [y, z] of [[y1, z0], [y1, z1], [y0, z1], [y0, z0]]) {
        P[v0 * 3] = x; P[v0 * 3 + 1] = y; P[v0 * 3 + 2] = z;
        C[v0 * 3] = c[0]; C[v0 * 3 + 1] = c[1]; C[v0 * 3 + 2] = c[2];
        SI[v0 * 4] = bone; SW[v0 * 4] = 255;
        v0++;
      }
      for (const k of [0, 1, 2, 0, 2, 3]) I[i0++] = base + k;
    };
    const [mx, my, mz] = face.mouth;
    quad(mx + 0.0025, my - 0.016, my, mz - 0.014, mz + 0.014, dark, MOUTH);
    for (const e of face.eyes) quad(e.x + 0.003, e.c[1] - e.h / 2 - 0.002, e.c[1] + e.h / 2 + 0.002, e.c[2] - e.w / 2 - 0.003, e.c[2] + e.w / 2 + 0.003, skin, LIDS);
    if (moodOn) {
      const res = moodGeometry(face, look, P, C, SI, SW, I, v0, i0, rig.man.bones.findIndex((b) => b.name === 'Head'), skin);
      v0 = res.v; i0 = res.i;
    }
    if (capOn) {
      _base.setHex(look.capColor ?? 0x2b2f36);
      const res = capGeometry(face, look.cap, P, C, SI, SW, I, v0, i0, [_base.r, _base.g, _base.b], rig.man.bones.findIndex((b) => b.name === 'Head'));
      v0 = res.v; i0 = res.i;
    }
    // kledingdelen uit het register (modularwear.js): elk deel aan zijn eigen bot
    for (const w of wear) {
      const base = v0, n = w.pos.length / 3;
      for (let k = 0; k < n; k++) {
        P[v0 * 3] = w.pos[k * 3]; P[v0 * 3 + 1] = w.pos[k * 3 + 1]; P[v0 * 3 + 2] = w.pos[k * 3 + 2];
        _base.setHex(w.col[k]); C[v0 * 3] = _base.r; C[v0 * 3 + 1] = _base.g; C[v0 * 3 + 2] = _base.b;
        SI[v0 * 4] = w.bone[k]; SW[v0 * 4] = 255;
        v0++;
      }
      for (const ix of w.idx) I[i0++] = base + ix;
    }
  }
  g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4, true));
  g.setIndex(new THREE.BufferAttribute(I, 1));
  markShared(g);
  g.userData.personRefs = 0;
  rig.geoCache.set(key, g);
  if (rig.geoCache.size > GEO_CACHE_MAX) {
    const oud = rig.geoCache.keys().next().value, og = rig.geoCache.get(oud);
    rig.geoCache.delete(oud);
    if (og.userData.personRefs > 0) og.userData.personRetired = true; else og.dispose();
  }
  return g;
}

// LOD-niveaus (eis eigenaar 23-11): 0 dichtbij, 1 vanaf LOD_NEAR m (~49% minder driehoeken), 2 vanaf LOD_FAR m (~77% minder).
// Gekoppeld aan het centrale LOD-register (lodregistry.js, soort 'person': grenzen 25 en 60 m bij Ultra, 4 m hysterese, en korter bij een
// lichtere grafische stand via setModularLodPreset). Anders dan lodForSkinned (LOD1+ als bevroren pose) blijven onze lichtere niveaus
// gehuid en geanimeerd: zelfde skelet, minder driehoeken. Na het laden staan vier mensen per rig in het register (registerModularLods),
// zodat scripts/lod_audit_test.mjs ze ook keurt.
export const LOD_NEAR = 25, LOD_FAR = 60;
let lodPolicy = null, lodScale = 1;
// De grafische stand (de sleutels van gfxprofile.js, zoals setAnimalLodPreset): een lichtere stand wisselt eerder naar een lichter niveau.
export function setModularLodPreset(preset) { lodScale = lodScaleFor(preset); }
export function setModularLodPolicy(fn) { lodPolicy = typeof fn === 'function' ? fn : null; }
export function modularLodLevels(mesh) {
  const ud = mesh && mesh.userData;
  if (!ud || !ud.qRig) return [];
  return [0, 1, 2].map((lod) => ({ lod, distance: [0, LOD_NEAR, LOD_FAR][lod], geometry: () => geometryFor(ud.qRig, ud.qLook, lod) }));
}
// Registreert per rig een paar representatieve mensen (vaste zaden) met hun driehoeken per niveau, in de vorm van lodregistry.js
// registerLodModel(soort, naam, [LOD0, LOD1, LOD2]). Geeft het aantal geregistreerde modellen.
export function registerModularLods(register, seeds = [11, 22, 33, 44]) {
  let n = 0;
  for (const name of rigs.keys()) for (const seed of seeds) {
    const look = modularLook(seed, { female: name === 'vrouw' });
    if (!look) continue;
    const tris = [0, 1, 2].map((lod) => geometryFor(rigs.get(name), look, lod).index.count / 3);
    register('person', `modulair:${name}:${seed}`, tris);
    n++;
  }
  return n;
}
// Zet de uitdrukking (MOODS) van een modulaire mens: neutraal, vrolijk, mokkend of verbaasd. Wisselt alleen als het verandert.
export function setModularMood(mesh, mood) {
  const ud = mesh && mesh.userData;
  if (!ud || !ud.qRig || !ud.qLook || ud.qLook.mood === mood || !MOODS.includes(mood)) return false;
  ud.qMoodBase = ud.qMoodBase || ud.qLook.mood || 'neutraal';
  ud.qLook = { ...ud.qLook, mood };
  swapGeometry(ud);
  return true;
}
// Wisselt de geometrie van een modulaire mens naar niveau lod (alleen als het verandert; telt de gedeelde geometrie netjes af en op).
export function setModularLod(mesh, lod) {
  const ud = mesh && mesh.userData;
  if (!ud || !ud.qRig || ud.qLod === lod) return false;
  const cached = geoCached(ud.qRig, ud.qLook, lod, ud.qGrip);
  if (!cached && geoBudgetOn && geoBuildSpent >= GEO_BUILD_MS) return false; // het budget van dit beeld is op: volgende beeld
  const t0 = cached ? 0 : performance.now();
  ud.qLod = lod;
  swapGeometry(ud);
  if (!cached) geoBuildSpent += performance.now() - t0;
  return true;
}
// Gesloten handen (eis coördinator 23-11): aan het stuur of de stuurgreep krullen de vingers om de stang (de grijpvariant uit de
// import, zelfde vertices en huid, alleen de vingers op een andere plek). Wisselt alleen als het verandert; LOD 1 en 2 houden een open hand.
export function setModularGrip(mesh, on) {
  const ud = mesh && mesh.userData;
  if (!ud || !ud.qRig || !!ud.qGrip === !!on) return false;
  ud.qGrip = !!on;
  swapGeometry(ud);
  return true;
}
function swapGeometry(ud) {
  const body = ud.body, old = body.geometry;
  const g = geometryFor(ud.qRig, ud.qLook, ud.qLod || 0, ud.qGrip);
  if (g === old) return;
  g.userData.personRefs = (g.userData.personRefs || 0) + 1;
  body.geometry = g;
  if (old) { old.userData.personRefs--; if (old.userData.personRefs <= 0 && old.userData.personRetired) old.dispose(); }
}
// Het niveau voor een afstand d (m) met een kleine marge, zodat iemand op de grens niet heen en weer springt.
export function lodForDistance(d, cur = 0) {
  const L = lodPolicy ? lodPolicy(d, cur) : lodLevel('person', d, { levels: 3, prev: cur, scale: lodScale });
  return L >= 0 && L <= 2 ? L : 2;   // 3 = voorbij de weg-afstand: dat ruimt scene3d.js zelf op
}

// Een modulaire mens als groep (zelfde contract als buildPersonMesh: oorsprong tussen de voeten, kijkt langs +X, userData.body is
// de SkinnedMesh). Geeft null als de rig niet geladen is; dan bouwt de beller de procedurele mens.
export function buildModularPerson(seed, opts = {}) {
  const look = opts.look && opts.look.parts ? opts.look : modularLook(seed, opts);
  if (!look) return null;
  const rig = rigs.get(look.rig);
  const geometry = geometryFor(rig, look);
  geometry.userData.personRefs = (geometry.userData.personRefs || 0) + 1;
  const group = new THREE.Group();
  const sk = buildSkeleton(rig);
  group.add(sk.root);
  const mesh = new THREE.SkinnedMesh(geometry, MAT);
  mesh.boundingSphere = BOUNDS.clone();
  group.add(mesh);
  group.updateMatrixWorld(true);
  const inverses = rig.man.bones.map((b) => new THREE.Matrix4().fromArray(b.inv));
  // mond- en ooglidbot: hangen (via een vaste basis) aan het hoofd, staan in rust zonder draaiing op hun punt, zodat schaal y
  // de plaatjes van boven naar beneden opent of sluit
  const face = rig.man.parts.find((q) => q.id === look.parts.hoofd).face;
  const extra = [];
  if (face) {
    const head = sk.bones[rig.man.bones.findIndex((b) => b.name === 'Head')];
    const headWorld = new THREE.Matrix4().fromArray(rig.man.bones.find((b) => b.name === 'Head').inv).invert();
    const at = (x, y, z) => {
      const base = new THREE.Object3D();
      base.matrixAutoUpdate = false;
      base.matrix.copy(headWorld).invert().multiply(new THREE.Matrix4().makeTranslation(x, y, z));
      head.add(base);
      const b = new THREE.Bone();
      base.add(b);
      extra.push(b);
      inverses.push(new THREE.Matrix4().makeTranslation(-x, -y, -z));
      return b;
    };
    const [mx, my, mz] = face.mouth;
    const mouth = at(mx, my, mz);
    const lidY = Math.max(face.eyes[0].c[1] + face.eyes[0].h / 2, face.eyes[1].c[1] + face.eyes[1].h / 2) + 0.002;
    const lids = at(face.eyes[0].x, lidY, (face.eyes[0].c[2] + face.eyes[1].c[2]) / 2);
    group.userData.mouth = mouth;
    group.userData.lids = lids;
  }
  group.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton([...sk.bones, ...extra], inverses), new THREE.Matrix4());
  if (look.face) { const hb = sk.bones[rig.man.bones.findIndex((b) => b.name === 'Head')]; hb.scale.x *= look.face[0]; hb.scale.y *= look.face[1]; hb.scale.z *= look.face[2]; }   // gezichtsvorm: smaller, breder, langer (uit het zaad)
  if (look.child) sk.bones[rig.man.bones.findIndex((b) => b.name === 'Head')].scale.multiplyScalar(1.22);   // kinderen: groter hoofd bij het lijf
  for (const b of extra) b.scale.y = 0;   // pas na het binden (de inverse van schaal 0 bestaat niet): mond dicht, ogen open
  group.scale.setScalar(look.scale);
  if (look.wide && look.wide !== 1) { group.scale.x *= look.wide; group.scale.z = group.scale.x; }   // bouw: breder of smaller (personSize)
  const ud = group.userData;
  ud.qRig = rig;
  ud.qBones = sk.bones;
  ud.qLook = look;
  ud.qLod = 0;
  ud.qStoop = look.old ? 0.1 + 0.08 * hashf(seed, 44) : 0;   // ouderen lopen iets gebogen
  ud.body = mesh;
  ud.lookSeed = seed;
  ud.animOffset = hashf(seed, 9) * 100;
  ud.female = look.rig === 'vrouw';
  ud.qIdle = rig.clips[hashf(seed, 30) < 0.5 ? 'Idle' : 'Idle_Neutral'] ? (hashf(seed, 30) < 0.5 ? 'Idle' : 'Idle_Neutral') : 'Idle';
  ud.qState = { t: hashf(seed, 31) * 10, phase: hashf(seed, 32), walk: 0, run: 0, gaze: 0 };
  ud.qSM = createAnimState('idle');   // de gedeelde state-machine (animstate.js, ADR 0051)
  const bi = (n) => rig.man.bones.findIndex((b) => b.name === n);
  ud.qIdxBy = Object.fromEntries(rig.man.bones.map((b, i) => [b.name, i]));
  ud.qIdx = { neck: bi('Neck'), head: bi('Head'), body: bi('Body'), root: bi('Root'), upL: bi('UpperLegL'), loL: bi('LowerLegL'), upR: bi('UpperLegR'), loR: bi('LowerLegR'), footL: bi('FootL'), footR: bi('FootR') };
  addProceduralAliases(group);
  return group;
}

// Veel spelcode (minigames, missies, cutscenes) zet nog houdingen op de botten van het eigen model (ud.armR.rotation, ud.head, ...).
// Een modulaire mens krijgt daarvoor houders met dezelfde namen, vast aan het overeenkomende bot (zonder de packschaal, -y langs het
// lid): zo'n houding doet op het nieuwe model niets (de state-machine en de IK sturen het lijf), maar breekt ook niets, en een prop die
// iemand aan ud.elbowR of ud.head hangt, beweegt met de arm of het hoofd mee. ud.qAlias = true markeert ze.
const ALIAS = { pelvis: 'Hips', chest: 'Chest', head: 'Head', armL: 'UpperArmL', armR: 'UpperArmR', elbowL: 'LowerArmL', elbowR: 'LowerArmR', legL: 'UpperLegL', legR: 'UpperLegR', kneeL: 'LowerLegL', kneeR: 'LowerLegR' };
const _as = new THREE.Vector3(), _aq = new THREE.Quaternion(), _ap = new THREE.Vector3();
function addProceduralAliases(group) {
  const ud = group.userData;
  group.updateMatrixWorld(true);
  for (const [k, n] of Object.entries(ALIAS)) {
    const b = ud.qBones[ud.qIdxBy[n]];
    if (!b || ud[k]) continue;
    b.matrixWorld.decompose(_ap, _aq, _as);
    const o = new THREE.Object3D();
    o.name = 'alias-' + k;
    o.scale.setScalar(group.scale.x / (_as.x || 1));
    o.rotation.z = Math.PI;
    b.add(o);
    ud[k] = o;
  }
  ud.qAlias = true;
}

// ---- animatie -------------------------------------------------------------------------------------

const NB = 22;
const _acc = new Float32Array(NB * 4), _pacc = new Float32Array(NB * 3), _pw = new Float32Array(NB);
const _sp = { speed: 0, dir: 0, turn: 0, grounded: true, vy: 0, jump: false, water: false, climbing: false, seated: false, vehicle: null, cutscene: false, knocked: false, emote: null };

// Telt clip `c` op tijd u (0..1 van de cyclus) met gewicht w op bij de accumulatoren (quaternion met tekencorrectie, positie).
function accumulate(rig, c, u, w) {
  if (!c || w <= 0) return;
  const nb = rig.man.bones.length;
  const f = ((u % 1) + 1) % 1 * (c.frames - 1);
  const f0 = Math.floor(f), f1 = Math.min(c.frames - 1, f0 + 1), k = f - f0;
  const q = c.quats;
  for (let b = 0; b < nb; b++) {
    const o0 = (f0 * nb + b) * 4, o1 = (f1 * nb + b) * 4, a = b * 4;
    let x = q[o0] + (q[o1] - q[o0]) * k, y = q[o0 + 1] + (q[o1 + 1] - q[o0 + 1]) * k, z = q[o0 + 2] + (q[o1 + 2] - q[o0 + 2]) * k, ww = q[o0 + 3] + (q[o1 + 3] - q[o0 + 3]) * k;
    if (_acc[a] * x + _acc[a + 1] * y + _acc[a + 2] * z + _acc[a + 3] * ww < 0) { x = -x; y = -y; z = -z; ww = -ww; }
    _acc[a] += x * w; _acc[a + 1] += y * w; _acc[a + 2] += z * w; _acc[a + 3] += ww * w;
  }
  for (let m = 0; m < c.moving.length; m++) {
    const b = c.moving[m], p = c.pos[m];
    _pacc[b * 3] += (p[f0 * 3] + (p[f1 * 3] - p[f0 * 3]) * k) * w;
    _pacc[b * 3 + 1] += (p[f0 * 3 + 1] + (p[f1 * 3 + 1] - p[f0 * 3 + 1]) * k) * w;
    _pacc[b * 3 + 2] += (p[f0 * 3 + 2] + (p[f1 * 3 + 2] - p[f0 * 3 + 2]) * k) * w;
    _pw[b] += w;
  }
}

const _qa = new THREE.Quaternion(), _axis = new THREE.Vector3();
const IDX_SIT = STATE_IDS.indexOf('sit');
// Draai een bot om de zij-as van de mens (+ = arm naar voren, hoofd en romp naar achteren): een kleine bijsturing bovenop de clip.
export function modularTurn(mesh, name, angle) {
  const ud = mesh && mesh.userData, rig = ud && ud.qRig, bi = ud && ud.qIdxBy[name];
  if (!rig || bi === undefined || !rig.sideAxis[name] || Math.abs(angle) < 1e-4) return false;
  ud.qBones[bi].quaternion.premultiply(_gq.setFromAxisAngle(_ax.fromArray(rig.sideAxis[name]), angle));
  return true;
}
const SP0 = { ..._sp };
// Gebaren bij praten (ADR 0051 bovenlijflaag 'talk'): om de zij-as van de mens; w = gewicht 0..1. Geen allocaties.
const _ax = new THREE.Vector3(), _gq = new THREE.Quaternion();
function talkGestures(ud, rig, t, w) {
  const B = ud.qBones, ax = rig.sideAxis, o = ud.animOffset || 0;
  const turn = (name, a) => { const bi = ud.qIdxBy[name]; if (bi >= 0 && Math.abs(a) > 1e-4) B[bi].quaternion.premultiply(_gq.setFromAxisAngle(_ax.fromArray(ax[name]), a)); };
  // om en om een hand naar voren, de onderarm omhoog (een uitleggend gebaar), met een rustpauze ertussen
  const ph = (t * 0.55 + o * 0.13) % 2, k = ph < 1 ? ph : ph - 1, side = ph < 1 ? 'L' : 'R';
  const g = Math.sin(Math.min(1, k * 1.3) * Math.PI) * w;
  turn('UpperArm' + side, 0.35 * g);
  turn('LowerArm' + side, 0.9 * g);
  turn('LowerArm' + (side === 'L' ? 'R' : 'L'), 0.25 * w);
  // het hoofd rechtop (naar de luisteraar) met een kleine knik op het ritme van de zin
  turn('Head', (0.06 + 0.05 * Math.sin(t * 4.1 + o)) * w);   // + = neus omhoog
}
// Welke clip(s) bij welke state (ADR 0051). De pack-clips voor idle/lopen/rennen/zwaaien, de Universal Animation Library voor de rest
// (UAL_*); ontbreekt een clip, dan valt de state terug op idle. Wat geen clip heeft (klimmen, fietsen, opstaan) staat hier met de
// beste benadering tot er een eigen clip is.
export const STATE_CLIPS = {
  sit: ['UAL_Sitting_Idle_Loop', 'UAL_Sitting_Talking_Loop'], enter: ['UAL_Sitting_Enter'], exit: ['UAL_Sitting_Exit'],
  drive: ['UAL_Driving_Loop'], ride: ['UAL_Driving_Loop'], swim: ['UAL_Swim_Idle_Loop', 'UAL_Swim_Fwd_Loop'],
  jump: ['UAL_Jump_Start'], fall: ['UAL_Jump_Loop'], land: ['UAL_Jump_Land'], climb: ['UAL_Push_Loop'],
  knockdown: ['UAL_Death01'], getup: ['UAL_Sitting_Exit'], emote: ['Wave'], cutscene: null,
};
const LOCO = new Set(['idle', 'locomotion', 'sprint', 'start', 'stop', 'turn', 'cutscene']);
// Telt de pose van state si (tijd t in die state) met gewicht w op bij de accumulatoren.
function evalState(ud, rig, st, si, t, w, talk, walkC, runC, idleC, runOff) {
  if (w <= 0) return;
  const name = STATE_IDS[si] || 'idle';
  if (LOCO.has(name)) {
    const wIdle = (1 - st.walk) * w;
    // hurken (ud.crouch, zoals bij het eigen model): de hurkclips in plaats van stilstaan en lopen
    const crouch = ud.crouch && rig.clips.UAL_Crouch_Idle_Loop;
    const idleClip = crouch ? rig.clips.UAL_Crouch_Idle_Loop : idleC;
    accumulate(rig, idleClip, (st.t + ud.animOffset) / idleClip.dur, wIdle);
    if (crouch) accumulate(rig, rig.clips.UAL_Crouch_Fwd_Loop, st.phase, st.walk * w);
    else accumulate(rig, walkC, st.phase, st.walk * (1 - st.run) * w);
    const sprint = ud.qSM.blend.sprint, sprintC = rig.clips.UAL_Sprint_Loop;
    accumulate(rig, runC, st.phase + runOff, st.walk * st.run * (1 - (sprintC ? sprint : 0)) * w);
    if (sprintC && sprint > 0) accumulate(rig, sprintC, st.phase, st.walk * st.run * sprint * w);
    return;
  }
  const list = STATE_CLIPS[name];
  const spec = STATES[name];
  let c = null;
  if (list) c = rig.clips[list[name === 'swim' ? (ud.qSM.speed > 0.4 ? 1 : 0) : 0]] || rig.clips[list[0]];
  if (!c) { accumulate(rig, idleC, (st.t + ud.animOffset) / idleC.dur, w); return; }
  const u = spec.loop ? t / c.dur : Math.min(0.999, t / Math.max(c.dur, spec.dur || 0));
  accumulate(rig, c, u, w);
}
// Elke frame voor een modulaire mens (vanuit animatePersonWalk): idle, lopen en rennen gemengd op snelheid (overgangen van 0,25 s),
// de cyclus synchroon met de afgelegde weg, de hielcontacten voor de stapgeluiden (ud.footN/footSide) en de blik (ud.gazeT).
// Zet een mens op tijd u (0..1) van één clip (vergelijkingspagina's, tests en de states die een vaste clip zijn). Geeft false
// als de clip niet bestaat.
export function poseModularClip(mesh, name, u) {
  const ud = mesh && mesh.userData, rig = ud && ud.qRig;
  const c = rig && rig.clips[name];
  if (!c) return false;
  _acc.fill(0); _pacc.fill(0); _pw.fill(0);
  accumulate(rig, c, u, 1);
  writeBones(ud, rig);
  return true;
}
export const modularClipNames = (mesh) => (mesh && mesh.userData.qRig ? Object.keys(mesh.userData.qRig.clips) : []);

// Een gebakken pose (verre menigte, farcrowd3d.js): een mens op LOD-niveau `lod` in clip `clip` op fase u (0..1), als vaste geometrie
// zonder huid (position + color + index, in meters met de lengte van het zaad, oorsprong tussen de voeten, kijkt langs +X).
// Daarmee tekent een InstancedMesh honderden verre voorbijgangers in één draw call. Null als de rig niet geladen is.
export function bakeModularPose(seed, opts = {}, clip = 'Walk', u = 0, lod = 2) {
  const m = buildModularPerson(seed, opts);
  if (!m) return null;
  const ud = m.userData;
  setModularLod(m, lod);
  poseModularClip(m, clip, u);
  m.updateMatrixWorld(true);
  const body = ud.body, src = body.geometry, n = src.attributes.position.count;
  const P = new Float32Array(n * 3), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) { v.fromBufferAttribute(src.attributes.position, i); body.applyBoneTransform(i, v); P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('color', src.attributes.color.clone());
  g.setIndex(src.index.clone());
  g.computeBoundingSphere();
  src.userData.personRefs--;   // de mens zelf is alleen een mal
  if (src.userData.personRefs <= 0 && src.userData.personRetired) src.dispose();
  return g;
}

function writeBones(ud, rig) {
  const bones = ud.qBones, restB = rig.man.bones;
  for (let b = 0; b < bones.length; b++) {
    const a = b * 4, l = Math.hypot(_acc[a], _acc[a + 1], _acc[a + 2], _acc[a + 3]);
    if (l > 1e-6) bones[b].quaternion.set(_acc[a] / l, _acc[a + 1] / l, _acc[a + 2] / l, _acc[a + 3] / l);
    const pw = _pw[b], rp = restB[b].pos, k = Math.min(1, pw);
    if (pw > 1e-6) bones[b].position.set(_pacc[b * 3] / pw * k + rp[0] * (1 - k), _pacc[b * 3 + 1] / pw * k + rp[1] * (1 - k), _pacc[b * 3 + 2] / pw * k + rp[2] * (1 - k));
    else bones[b].position.set(rp[0], rp[1], rp[2]);
  }
}

export function animateModular(mesh, speed, dt) {
  if (mesh && mesh.userData.qGrip && !mesh.userData.qInSeat && !mesh.userData.gunKey) setModularGrip(mesh, false);   // uitgestapt (en geen wapen): handen weer open
  const ud = mesh.userData, rig = ud.qRig, st = ud.qState;
  if (!rig) return;
  const s = Number.isFinite(speed) ? Math.max(0, speed) : 0;
  const step = Number.isFinite(dt) ? Math.max(0, Math.min(0.1, dt)) : 0;
  // de state-machine (animstate.js) kiest de toestand en geeft de loopruimte; de clipgewichten volgen die met een overgang
  const sm = ud.qSM;
  sm.tier = ud.qLod || 0;
  // parameters van de state-machine: snelheid altijd, de rest (water, zitten, voertuig, val, cutscene, ...) uit ud.qParams van de beller
  const qp = ud.qParams;
  for (const k in _sp) _sp[k] = qp && qp[k] !== undefined ? qp[k] : SP0[k];
  _sp.speed = s;
  stepAnimState(sm, _sp, step);
  const b = sm.blend, moving = 1 - b.idle, fast = moving > 0 ? (b.run + b.sprint) / moving : st.run;
  st.walk = crossfade(st.walk, moving, step, 0.25);
  st.run = crossfade(st.run, fast, step, 0.3);
  st.t += step;
  const walkC = rig.clips.Walk, runC = rig.clips.Run, idleC = rig.clips[ud.qIdle] || rig.clips.Idle;
  // één fase voor lopen en rennen: de looptijd volgt de snelheid, zodat de voeten niet glijden
  const cycle = walkC.dur * (1 - st.run) + runC.dur * st.run;
  const rate = s > 0.05 ? Math.min(1.8, Math.max(0.5, s / (WALK_SPEED[rig.name] * (1 - st.run) + RUN_SPEED[rig.name] * st.run))) : 0;
  const prev = st.phase;
  st.phase = (st.phase + (step / cycle) * rate) % 1;
  if (s > 0.3 && walkC.contact) {
    for (let side = 0; side < 2; side++) {
      const c = walkC.contact[side];
      if ((prev < c && st.phase >= c) || (prev > st.phase && (c > prev || c <= st.phase))) { ud.footN = (ud.footN || 0) + 1; ud.footSide = side; }
    }
  }
  const runOff = runC.contact && walkC.contact ? runC.contact[0] - walkC.contact[0] : 0;
  _acc.fill(0); _pacc.fill(0); _pw.fill(0);
  // huidige en vorige state, gemengd met de mengfactor van de overgang (sm.k): geen sprong bij een wissel
  const talk = !!(qp && qp.talk);
  if (sm.s !== st.lastS) { st.prevS = st.lastS ?? sm.s; st.prevT = st.stateT || 0; st.lastS = sm.s; st.stateT = 0; }
  st.stateT += step;
  const k = sm.k;
  evalState(ud, rig, st, sm.s, st.stateT, k, talk, walkC, runC, idleC, runOff);
  if (k < 1) evalState(ud, rig, st, st.prevS, st.prevT, 1 - k, talk, walkC, runC, idleC, runOff);
  writeBones(ud, rig);
  // na een ragdoll (ragdollmodular.js): van de pose waarin de mens opstond naar de animatie, in 0,3 s
  const bf = ud.qBlendFrom;
  if (bf) {
    bf.t += step;
    const kb = Math.min(1, bf.t / bf.dur), e = kb * kb * (3 - 2 * kb);
    for (let b = 0; b < ud.qBones.length; b++) { _qa.fromArray(bf.q, b * 4).slerp(ud.qBones[b].quaternion, e); ud.qBones[b].quaternion.copy(_qa); }
    if (kb >= 1) ud.qBlendFrom = null;
  }
  // praten: gebaren met de armen (om en om een onderarm omhoog, een open hand) en het hoofd rechtop met een kleine knik
  st.talkW = crossfade(st.talkW || 0, ud.qParams && ud.qParams.talk ? 1 : 0, step, 0.3);
  if (st.talkW > 0.01) talkGestures(ud, rig, st.t, st.talkW);
  if (ud.qStoop && !ud.qInSeat && sm.s !== IDX_SIT) modularTurn(mesh, 'Torso', -ud.qStoop);
  // knipperen (gait.js blinkAmount, zelfde ritme als het eigen model)
  if (ud.lids) { const bl = blinkAmount(st.t + ud.animOffset, ud.animOffset); if (ud.lids.scale.y !== bl) ud.lids.scale.y = bl; }
  // blik (gait.js glanceAt zet ud.gazeT, + = rechts): hoofd en nek draaien om de verticale as van de persoon, 40/60 verdeeld
  const gz = ud.gazeT;
  st.gaze += ((gz === undefined || gz !== gz ? 0 : gz) - st.gaze) * Math.min(1, step * 6);
  if (Math.abs(st.gaze) > 1e-3) {
    const ax = rig.lookAxis;
    ud.qBones[ud.qIdx.neck].quaternion.premultiply(_qa.setFromAxisAngle(_axis.fromArray(ax.Neck), -st.gaze * 0.4));
    ud.qBones[ud.qIdx.head].quaternion.premultiply(_qa.setFromAxisAngle(_axis.fromArray(ax.Head), -st.gaze * 0.6));
  }
}

// ---- voeten op de grond --------------------------------------------------------------------------
// Zoals plantFeet in models3d_people.js, maar voor het skelet van het pack: de voetbotten hangen aan de wortel (de IK van het
// pack is ingebakken), dus de voet schuift naar zijn grond en het been draait met analytische twee-bot-IK naar de voet toe.
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c3 = new THREE.Vector3(), _t = new THREE.Vector3(), _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();
const _qw = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _qr = new THREE.Quaternion(), _n = new THREE.Vector3();
const _plant = { drop: 0, liftL: 0, liftR: 0 }, _ank = [new THREE.Vector3(), new THREE.Vector3()], _d = [0, 0];

// Draai bot `bone` in wereldruimte met quaternion r (om zijn eigen oorsprong).
function rotateWorld(bone, r) {
  bone.parent.getWorldQuaternion(_qp);
  bone.getWorldQuaternion(_qw);
  _qw.premultiply(r);
  bone.quaternion.copy(_qp.invert().multiply(_qw));
  bone.updateMatrixWorld(true);
}

// Analytische twee-bot-IK in wereldruimte: bot `up` (oorsprong a) en `lo` (oorsprong b) met het einde nu op `end` worden zo gedraaid
// dat het einde op `target` komt (of zo ver als het gestrekte lid reikt; target wordt dan ingekort). De knik blijft in het vlak waarin
// hij nu staat (de knie of elleboog buigt de kant op die de clip al gaf). Geen allocaties.
const _ia = new THREE.Vector3(), _ib = new THREE.Vector3(), _ic = new THREE.Vector3(), _iu = new THREE.Vector3(), _iv = new THREE.Vector3(), _in = new THREE.Vector3(), _iq = new THREE.Quaternion();
function ikTo(up, lo, end, target) {
  up.getWorldPosition(_ia); lo.getWorldPosition(_ib); _ic.copy(end);
  const l1 = _ia.distanceTo(_ib), l2 = _ib.distanceTo(_ic);
  const d = Math.min(l1 + l2 - 1e-4, Math.max(Math.abs(l1 - l2) + 1e-4, _ia.distanceTo(target)));
  if (Math.abs(_ia.distanceTo(target) - d) > 1e-4) target.sub(_ia).setLength(d).add(_ia);
  const cur = _iu.subVectors(_ia, _ib).angleTo(_iv.subVectors(_ic, _ib));
  const want = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2))));
  _in.crossVectors(_iu, _iv);
  const bend = _in.lengthSq() > 1e-10 && Math.abs(want - cur) > 1e-5;
  if (bend) { _in.normalize(); rotateWorld(lo, _iq.setFromAxisAngle(_in, want - cur)); }
  // het einde na de knik: draait mee met het onderste bot om zijn oorsprong
  _iv.subVectors(_ic, _ib);
  if (bend) _iv.applyAxisAngle(_in, want - cur);
  up.getWorldPosition(_ia); lo.getWorldPosition(_ib);
  _ic.copy(_ib).add(_iv);
  _iu.subVectors(_ic, _ia).normalize();
  _iv.subVectors(target, _ia).normalize();
  rotateWorld(up, _iq.setFromUnitVectors(_iu, _iv));
  return target;
}

// De knie naar buiten (schrijlings zitten): draai het hele been om de as heup-voet tot de knie opzij wijst (de voet blijft staan).
const _ka = new THREE.Vector3(), _kk = new THREE.Vector3(), _kd = new THREE.Vector3(), _kx = new THREE.Vector3();
// Draai een lid om de as van zijn begin naar zijn doel tot het gewricht (knie, elleboog) zo goed mogelijk de kant (x, y, z in de assen
// van de mens) op wijst. Het doel blijft staan.
function poleTo(mesh, up, lo, endWorld, x, y, z) {
  up.getWorldPosition(_ka); lo.getWorldPosition(_kk);
  const axis = _kx.subVectors(endWorld, _ka).normalize();
  _kk.sub(_ka); _kk.addScaledVector(axis, -_kk.dot(axis));
  _kd.set(x, y, z).transformDirection(mesh.matrixWorld);
  _kd.addScaledVector(axis, -_kd.dot(axis));
  if (_kk.lengthSq() < 1e-8 || _kd.lengthSq() < 1e-8) return;
  _kk.normalize(); _kd.normalize();
  const ang = Math.atan2(_iu.crossVectors(_kk, _kd).dot(axis), _kk.dot(_kd));
  rotateWorld(up, _iq.setFromAxisAngle(axis, ang));
}
function kneeOut(mesh, up, lo, footWorld, side) {
  up.getWorldPosition(_ka); lo.getWorldPosition(_kk);
  const axis = _kx.subVectors(footWorld, _ka).normalize();
  _kk.sub(_ka); _kk.addScaledVector(axis, -_kk.dot(axis));
  // opzij in de wereld: de z-as van de mens
  _kd.set(0, 0, side).transformDirection(mesh.matrixWorld);
  _kd.addScaledVector(axis, -_kd.dot(axis));
  if (_kk.lengthSq() < 1e-8 || _kd.lengthSq() < 1e-8) return;
  _kk.normalize(); _kd.normalize();
  const ang = Math.atan2(_iu.crossVectors(_kk, _kd).dot(axis), _kk.dot(_kd));
  rotateWorld(up, _iq.setFromAxisAngle(axis, ang));
}

// Zitten in een voertuig (spelerfase): de voeten naar de vloer voor de stoel (seat.pose.footX/footY: ten opzichte van het heupgewricht,
// in meters, zoals seatPose van het eigen model), en bij sturen de handen aan het stuur (ud.steer: -1..1, actorlife.js wheelGrip).
// Werkt op de pose die de clip net gaf; alleen dichtbij nodig.
const _sv = new THREE.Vector3(), _sw = new THREE.Vector3(), _sg = { x: 0, y: 0, z: 0 };
const SPINE = ['Abdomen', 'Torso', 'Chest', 'Neck', 'Head'];
// Zet alleen de genoemde botten op hun stand in een clip (tijd u 0..1), zonder menging: de rug rechtop uit de staande idle.
function poseBonesFromClip(ud, rig, clipName, u, names) {
  const c = rig.clips[clipName];
  if (!c) return;
  const nb = rig.man.bones.length, f = Math.max(0, Math.min(c.frames - 1, Math.round(u * (c.frames - 1))));
  for (const n of names) {
    const bi = rig.man.bones.findIndex((x) => x.name === n);
    if (bi < 0) continue;
    const o = (f * nb + bi) * 4, q = c.quats;
    ud.qBones[bi].quaternion.set(q[o], q[o + 1], q[o + 2], q[o + 3]).normalize();
  }
}
// Zithouding van een modulaire mens (spelerfase, eis coördinator 23-11): op de basis van de rij- of zitclip legt deze stap de
// houding vast met getallen in plaats van de clip te vertrouwen. Doelen (referentie autozit): rugleuning 20-25 graden achterover,
// heuphoek 95-110, dijen bijna horizontaal, kniehoek 110-130 met de schenen schuin naar voren, voeten plat op de vloer of de pedalen,
// ellebogen 120-140 graden met de handen om het stuur (de echte stuurpositie van het voertuig als die bekend is), hoofd rechtop.
// Passagier: zelfde, handen op de dijen. Fiets: romp licht voorover, knie bijna gestrekt onderaan, handen op de handvatten.
// Achterop: zijzit, knieën gebogen, voeten hangend. ctx.wheel = { c: [x,y,z], r, tilt } in de assen van het voertuig en
// ctx.toWorld(x, y, z, out) zet een punt van het voertuig om naar de wereld.
export const HAND_PALM = 0.075;
const PEDAL_R = 0.17;   // m: de crank van een fiets
export const HIP_ABOVE_SEAT = 0.065;   // m: het heupbot boven de zitting (gemeten op de zitclip)
export const SEAT_SLIDE = 0;   // m: hooguit zo ver schuift een bestuurder naar voren op de zitting (meer zou van de stoel af zijn; seat_audit meldt de rest)
export const SEAT_SLIDE_BACK = 0;   // m: hooguit zo ver naar achteren als het stuur te dichtbij is
export const SEAT_TARGETS = {
  car: { back: 0.42, knee: 2.18, elbow: 2.27 },         // passagier: 24 graden, knie 125 graden
  drive: { back: 0.3, knee: 2.18, elbow: 2.27 },       // bestuurder: 17 graden (meer kan niet: de armen strekken dan, het stuur blijft staan)
  bike: { back: -0.3, knee: 2.7 },                      // 17 graden voorover, knie 155 graden onderaan de slag
  rail: { back: 0.0, knee: 1.48 },                      // achterop: rechtop, knie 85 graden, voeten hangend
};
const _bv = new THREE.Vector3(), _bw = new THREE.Vector3(), _bx = new THREE.Vector3(), _bq = new THREE.Quaternion();
// richt bot `bone` zo dat de wereldrichting van `from` naar `to` (twee botten) `dir` wordt (alleen zwaai, geen draaiing om de as)
function aimBone(bone, from, to, dir) {
  from.getWorldPosition(_bv); to.getWorldPosition(_bw);
  _bx.subVectors(_bw, _bv).normalize();
  rotateWorld(bone, _bq.setFromUnitVectors(_bx, dir));
}
// De greep k (0 = links, -z) van het stuur van een tweewieler in de wereld: het midden van het handvat (grip: x, y, z, px = de stuuras)
// gedraaid met het stuur over dezelfde hoek als de voorwielen (voertuigbediening.js MAX_STUUR 0,5 rad).
const _gp = new THREE.Vector3();
function gripPoint(g, k, ctx, out) {
  const a = -Math.max(-1, Math.min(1, ctx.steer || 0)) * 0.5, c = Math.cos(a), sn = Math.sin(a), z = k ? g.z : -g.z, dx = g.x - (g.px ?? g.x);
  return ctx.toWorld((g.px ?? g.x) + dx * c + z * sn, g.y, -dx * sn + z * c, out);
}
const _dir = new THREE.Vector3(), _hp = new THREE.Vector3(), _tg = new THREE.Vector3(), _ft = new THREE.Vector3(), _c0 = new THREE.Vector3(), _ax1 = new THREE.Vector3(), _ax2 = new THREE.Vector3();
function seatIK(mesh, seat, ctx = null) {
  const ud = mesh.userData, I = ud.qIdx, B = ud.qBones, pose = seat && seat.pose, rig = ud.qRig;
  const rider = !!(seat && seat.rider);
  if (seat && seat.stand && !rider && seat.grip && ctx && ctx.toWorld) { standGrip(mesh, seat, ctx); return; }
  if ((!pose && !rider) || (seat.stand && !rider)) return;
  const bn = (n) => B[ud.qIdxBy[n]];
  const astride = !!(pose && pose.splay);
  const railSit = !!(pose && pose.arms === 'rail');
  const T0 = rider ? (seat.back ? { ...SEAT_TARGETS.bike, back: -seat.back } : SEAT_TARGETS.bike) : railSit ? SEAT_TARGETS.rail : pose && pose.arms === 'wheel' ? SEAT_TARGETS.drive : SEAT_TARGETS.car;
  // een sportstoel ligt verder achterover (pose.recline): de rug gaat mee, zodat de heuphoek open blijft
  const T = pose && !rider && !railSit && (pose.recline || 0) > 0.35 ? { ...T0, back: Math.min(0.48, T0.back + 0.045) } : T0;
  mesh.updateMatrixWorld(true);
  const s = mesh.scale.y || 1;
  const toW = (x, y, z, out) => { out.set(x, y, z); return mesh.localToWorld(out); };
  const dirW = (x, y, z, out) => out.set(x, y, z).transformDirection(mesh.matrixWorld);
  // 0. het bekken recht (de clip draait en kantelt het; dan staan de heupgewrichten scheef en zijn de benen ongelijk)
  if (!astride) { for (const n of ['ShoulderL', 'ShoulderR', 'Abdomen', 'Torso', 'Chest']) bn(n).quaternion.fromArray(rig.man.bones[ud.qIdxBy[n]].quat); B[I.root].quaternion.fromArray(rig.man.bones[I.root].quat); B[I.body].quaternion.fromArray(rig.man.bones[I.body].quat); bn('Hips').quaternion.fromArray(rig.man.bones[ud.qIdxBy.Hips].quat); mesh.updateMatrixWorld(true); }
  // 0b. de heupen haaks op de rijrichting: de lijn tussen de heupgewrichten langs de zij-as van de mens (de rust van het pack staat
  // iets gedraaid), alleen om de verticaal
  if (!astride) {
    B[I.upL].getWorldPosition(_bv); B[I.upR].getWorldPosition(_bw);
    _bx.subVectors(_bw, _bv); dirW(0, 1, 0, _dir); _bx.addScaledVector(_dir, -_bx.dot(_dir)).normalize();
    dirW(0, 0, 1, _ax2); _ax2.addScaledVector(_dir, -_ax2.dot(_dir)).normalize();
    if (_bx.lengthSq() > 0.5) { rotateWorld(B[I.body], _bq.setFromUnitVectors(_bx, _ax2)); mesh.updateMatrixWorld(true); }
  }
  // 1. de rug onder de rughoek (+ = achterover) en het hoofd rechtop
  if (!astride) {
    dirW(-Math.sin(T.back), Math.cos(T.back), 0, _dir);
    // de buik draait om zijn eigen oorsprong, niet om de heup: drie keer richten convergeert
    for (let it = 0; it < 3; it++) aimBone(bn('Abdomen'), bn('Hips'), bn('Neck'), _dir);
    // de schouders haaks (de draai van het bekken zat ook in de rug), dan het hoofd rechtop
    bn('UpperArmL').getWorldPosition(_bv); bn('UpperArmR').getWorldPosition(_bw);
    _bx.subVectors(_bw, _bv).normalize();   // haaks en waterpas: ook de kanteling van de schouders eruit
    dirW(0, 0, 1, _ax2);
    if (_bx.lengthSq() > 0.5) rotateWorld(bn('Chest'), _bq.setFromUnitVectors(_bx, _ax2));
    dirW(Math.sin(0.08), Math.cos(0.08), 0, _dir);   // hoofd rechtop, een tikje voorover (kijkt door de voorruit)
    aimBone(bn('Neck'), bn('Neck'), bn('Head'), _dir);
  }
  // 1b. een bestuurder schuift naar voren tot de handen het echte stuur halen met de ellebogen op de gewenste hoek (de stoelen staan
  // voor het eigen model, de stuurwielen voor de binnenin-camera; hooguit SEAT_SLIDE naar voren, de rest meldt seat_audit)
  if (pose && pose.arms === 'wheel' && ctx && ctx.wheel && ctx.toWorld) {
    mesh.updateMatrixWorld(true);
    const w = ctx.wheel;
    ctx.toWorld(w.c[0], w.c[1], w.c[2], _c0);
    bn('Hips').getWorldPosition(_bv); dirW(1, 0, 0, _dir);
    const ahead = _c0.clone().sub(_bv).dot(_dir);
    if (ahead < 0.02 || ahead > 1.2) ctx = null;   // het stuur ligt niet voor de heup: de bestuurder gebruikt het stuur voor zijn schouders
  }
  if (pose && pose.arms === 'wheel' && ctx && ctx.wheel && ctx.toWorld) {
    const w = ctx.wheel;
    ctx.toWorld(w.c[0], w.c[1], w.c[2], _c0);
    bn('UpperArmL').getWorldPosition(_bv); bn('UpperArmR').getWorldPosition(_bw);
    _bv.add(_bw).multiplyScalar(0.5);
    const ua = bn('UpperArmL').getWorldPosition(_bw).distanceTo(bn('LowerArmL').getWorldPosition(_ft)) / s;
    const la = bn('LowerArmL').getWorldPosition(_bw).distanceTo(bn('WristL').getWorldPosition(_ft)) / s;
    const want = (Math.sqrt(ua * ua + la * la - 2 * ua * la * Math.cos(T.elbow)) + HAND_PALM) * s;
    // schouder tot greep: de greep ligt een straal opzij van het midden, de schouders ook ongeveer
    dirW(1, 0, 0, _dir);
    let slide = 0;
    for (let k = 0; k < 2; k++) {
      const sd = k ? 1 : -1, ct = Math.cos(w.tilt || 0);
      ctx.toWorld(w.c[0], w.c[1], w.c[2] + w.r * sd, _tg);   // de greep op 9 of 3 uur
      bn(k ? 'UpperArmR' : 'UpperArmL').getWorldPosition(_bw);
      const rel = _tg.clone().sub(_bw), dx = rel.dot(_dir), dperp = rel.addScaledVector(_dir, -dx).length();
      slide = Math.max(slide, dx - Math.sqrt(Math.max(0, want * want - dperp * dperp)));
      void ct;
    }
    slide = Math.max(-SEAT_SLIDE_BACK, Math.min(SEAT_SLIDE, slide));   // ook iets naar achteren als het stuur te dichtbij is
    if (slide !== 0) { mesh.position.addScaledVector(mesh.parent ? _dir.transformDirection(mesh.parent.matrixWorld.clone().invert()) : _dir, slide); mesh.updateMatrixWorld(true); }
  }
  // 1c. de heup op de zitting: het heupbot HIP_ABOVE_SEAT boven de zitting (een fietser: het zadel, SADDLE_BELOW_HIP onder de heup
  // van het eigen model), via de omzetting van het voertuig als die er is; zo hangt het niet meer van de zitclip af
  if (seat && !astride && ctx && ctx.toWorld) {
    mesh.updateMatrixWorld(true);
    const top = rider ? (seat.saddle ?? seat.y + (0.93 - 0.17) * s) - (seat.bb ? Math.max(0, 1 - s / (rig.man.schaal || 1)) * 0.3 : 0) : seat.y;
    ctx.toWorld(seat.x, top, seat.z, _c0);
    bn('Hips').getWorldPosition(_bv);
    const dy = _c0.y + HIP_ABOVE_SEAT * s - _bv.y;
    if (Math.abs(dy) > 1e-4) {
      // de wereldplek van de mens dy omhoog, terug naar de assen van de ouder
      mesh.getWorldPosition(_bw); _bw.y += dy;
      if (mesh.parent) mesh.parent.worldToLocal(_bw);
      mesh.position.copy(_bw);
      mesh.updateMatrixWorld(true);
    }
  }
  // 2. benen. Het heupgewricht (bovenbeen) in de assen van de mens; de voet: op de vloer voor de stoel (pose.footY = enkel ten opzichte
  // van het heupgewricht bij het eigen model) of bij de pedalen; afstand heup-enkel uit de gewenste kniehoek.
  const l1 = B[I.upL].getWorldPosition(_bv).distanceTo(B[I.loL].getWorldPosition(_bw));   // in meters, zoals fx en fy (die worden bij het omzetten door s gedeeld)
  const l2 = rig.shin.L.len * s;
  const reachFor = (kneeAng) => Math.sqrt(l1 * l1 + l2 * l2 - 2 * l1 * l2 * Math.cos(kneeAng));
  for (let k = 0; k < 2; k++) {
    const up = B[k ? I.upR : I.upL], lo = B[k ? I.loR : I.loL], foot = B[k ? I.footR : I.footL];
    const side = k ? 1 : -1;
    up.getWorldPosition(_hp); mesh.worldToLocal(_hp);
    let fx, fy, fz = 0;
    if (astride) { fx = pose.footX ?? 0.3; fy = pose.footY ?? -0.6; fz = side * Math.sin(pose.splay) * Math.abs(fy); }
    else if (rider && ctx && ctx.toWorld && (seat.bb || seat.feet)) {
      // de echte trapas of voetplank van dit voertuig (24-11): de enkel op het pedaal (0,07 m erboven), de pedalen een crank van 17 cm
      // rond de trapas (de voeten staan tegenover elkaar); een brommer: de voeten stil op de vloerplaat
      if (seat.bb) {
        const a = (ud.qPedal || 0) + (k ? Math.PI : 0);
        ctx.toWorld(seat.bb.x + PEDAL_R * Math.sin(a), seat.bb.y + 0.07 - PEDAL_R * Math.cos(a), side * (seat.bb.z || 0.11), _tg);
      } else ctx.toWorld(seat.feet.x, seat.feet.y, side * seat.feet.z, _tg);
      fx = null;
    }
    else if (rider) {
      // trappers: de voet op een crank van 17 cm rond de trapas; onderaan de slag is het been op de gewenste kniehoek gestrekt, de
      // twee voeten staan tegenover elkaar en draaien mee met de snelheid (stilstaand blijven ze waar ze waren)
      const d = reachFor(T.knee), by = -0.95 * d, bx = Math.sqrt(Math.max(0, d * d - by * by));   // de trapas iets voor en onder het zadel
      const a = ctx && ctx.pedals ? (ud.qPedal || 0) + (k ? Math.PI : 0) : 0;   // een brommer of step: de voeten stil op de plank
      fx = bx + PEDAL_R * Math.sin(a); fy = by + PEDAL_R * (1 - Math.cos(a));
    }
    else if (railSit) { const d = reachFor(T.knee); fy = -0.7 * d; fx = Math.sqrt(d * d - fy * fy); }
    else {
      // de vloer: 14 cm onder de enkel van het eigen model (pose.footY), en de dij zo schuin (0 tot 25 graden omhoog) dat de knie zo dicht
      // mogelijk bij de gewenste kniehoek uitkomt met de voet op die vloer
      const fyFloor = Math.max(-0.95 * (l1 + l2), (pose.footY ?? -0.3) - 0.12);
      let best = null;
      for (let th = -10; th <= 25; th += 1) {
        const t = th * Math.PI / 180, kx = l1 * Math.cos(t), ky = l1 * Math.sin(t);
        const dy = ky - fyFloor;
        if (dy > l2 || dy < 0) continue;
        const phi = Math.asin(dy / l2), kneeA = Math.PI - t - phi;
        // de knie dicht bij de gewenste hoek, en liefst een bijna vlakke dij (rond 10 graden) voor een open heuphoek
        // een dij die omlaag loopt telt zwaar (dan liever de knie iets meer open)
        const err = Math.abs(kneeA - T.knee) + 1.2 * Math.abs(t - 0.04) + (t < 0.05 ? 12 * (0.05 - t) : 0);
        // alleen een voet op de vloer als de knie dan binnen 10 graden van de gewenste hoek komt met een dij die niet omlaag loopt;
        // anders hangt de voet (een hoge cabine met een diepe vloer: de voet op een voetsteun)
        if (t < -0.02 || Math.abs(kneeA - T.knee) > 0.17) continue;
        if (!best || err < best.err) best = { err, fx: kx + l2 * Math.cos(phi), fy: fyFloor };
      }
      if (best) { fx = best.fx; fy = best.fy; }
      // de vloer is dieper dan het been reikt (hoge cabine): de dij bijna vlak, de knie op de gewenste hoek, de voet hangt boven de vloer (op een voetsteun)
      else { const t = 0.09, kx = l1 * Math.cos(t), ky = l1 * Math.sin(t), a = Math.PI - T.knee - t; fx = kx + l2 * Math.cos(a); fy = ky - l2 * Math.sin(a); }   // a = hoek van de scheen onder de horizontaal
    }
    if (fx !== null) toW(_hp.x + fx / s, _hp.y + fy / s, _hp.z + fz / s, _tg);
    shinEnd(rig, lo, k ? 'R' : 'L', s, _ft);
    ikTo(up, lo, _ft, _tg);
    if (astride) kneeOut(mesh, up, lo, _tg, side);
    else poleTo(mesh, up, lo, _tg, 0, 1, 0);
    foot.parent.worldToLocal(_ft.copy(_tg)); foot.position.copy(_ft);
    // de voet plat (zijn rusthouding ten opzichte van de wortel)
    foot.quaternion.fromArray(rig.man.bones[k ? I.footR : I.footL].quat);
    foot.updateMatrixWorld(true);
  }
  // 3. handen
  // de handpalm (HAND_PALM voorbij de pols, in het verlengde van de onderarm) op het doel: eerst de pols erheen, dan de pols de
  // palmlengte terug langs de onderarm en nog eens (twee stappen is genoeg; de onderarm draait bij de tweede nog maar weinig)
  const reach = (k, tgt) => {
    const up = bn(k ? 'UpperArmR' : 'UpperArmL'), lo = bn(k ? 'LowerArmR' : 'LowerArmL'), wr = bn(k ? 'WristR' : 'WristL');
    _c0.copy(tgt);
    for (let it = 0; it < 2; it++) {
      wr.getWorldPosition(_ft);
      _tg.copy(_c0);
      if (it) { lo.getWorldPosition(_bv); _ax1.subVectors(_ft, _bv).normalize(); _tg.addScaledVector(_ax1, -HAND_PALM * s); }
      ikTo(up, lo, _ft, _tg);
      poleTo(mesh, up, lo, _tg, 0, -1, (k ? 1 : -1) * 0.6);   // elleboog omlaag en iets naar buiten
    }
  };
  const driver = pose && pose.arms === 'wheel';
  if (rider) {
    // handvatten: 0,43 m voor en 0,12 m boven de heup van het eigen model op het zadel, 0,28 m opzij
    bn('Hips').getWorldPosition(_hp); mesh.worldToLocal(_hp);
    for (let k = 0; k < 2; k++) {
      if (seat.grip && ctx && ctx.toWorld) { gripPoint(seat.grip, k, ctx, _gp); reach(k, _gp); }
      else reach(k, toW(_hp.x + 0.43 / s, _hp.y + 0.12 / s, _hp.z + (k ? 0.28 : -0.28) / s, _tg));
    }
    return;
  }
  if (driver) {
    const ang = -Math.max(-1, Math.min(1, ud.steer || 0)) * STEER_TURN;
    if (ctx && ctx.wheel && ctx.toWorld) {
      // het echte stuur van het voertuig (cabin3d.js cabinWheelPose): grepen op 9 en 3, in het vlak van het wiel
      const w = ctx.wheel, ct = Math.cos(w.tilt || 0), st = Math.sin(w.tilt || 0);
      for (let k = 0; k < 2; k++) {
        const sd = k ? 1 : -1, c = Math.cos(ang), sn = Math.sin(ang);
        // in het voertuig: zij-as z, de bovenas van het wiel gekanteld om z (tilt): (-sin, cos, 0)
        const lz = w.r * sd * c, lu = w.r * sd * sn;
        ctx.toWorld(w.c[0] - st * lu, w.c[1] + ct * lu, w.c[2] + lz, _tg);
        reach(k, _tg);
      }
      return;
    }
    // zonder stuurpositie: het stuur zo voor de schouders dat de ellebogen op de gewenste hoek uitkomen
    const ua = bn('UpperArmL').getWorldPosition(_bv).distanceTo(bn('LowerArmL').getWorldPosition(_bw)) / s;
    const la = bn('LowerArmL').getWorldPosition(_bv).distanceTo(bn('WristL').getWorldPosition(_bw)) / s;
    const d = Math.sqrt(ua * ua + la * la - 2 * ua * la * Math.cos(T.elbow - 0.12)) + HAND_PALM;   // tot de handpalm (iets meer gebogen: de palm schuift de pols terug)
    bn('UpperArmL').getWorldPosition(_hp); mesh.worldToLocal(_hp);
    const shx = _hp.x, shy = _hp.y;
    const dy = -0.2, dx = Math.sqrt(Math.max(0.01, d * d - dy * dy));
    for (let k = 0; k < 2; k++) {
      bn(k ? 'UpperArmR' : 'UpperArmL').getWorldPosition(_hp); mesh.worldToLocal(_hp);
      const shz = _hp.z;
      reach(k, toW(shx + dx / s, shy + dy / s, shz, _bx));
    }
    return;
  }
  if (pose && (pose.arms === 'helm' || pose.arms === 'tiller' || pose.arms === 'paddle' || pose.arms === 'row')) return;
  // passagier: de handen op de dijen, halverwege heup en knie
  for (let k = 0; k < 2; k++) {
    const up = B[k ? I.upR : I.upL], lo = B[k ? I.loR : I.loL];
    up.getWorldPosition(_bv); lo.getWorldPosition(_bw);
    _tg.copy(_bv).lerp(_bw, 0.6);
    dirW(0, 1, 0, _dir); _tg.addScaledVector(_dir, 0.07 * s);
    reach(k, _tg);
  }
}

// Een staander op een step: alleen de handen naar de handvatten van het stuur (de voeten staan op het dek).
function standGrip(mesh, seat, ctx) {
  const ud = mesh.userData, B = ud.qBones, I = ud.qIdx, s = mesh.scale.y || 1;
  mesh.updateMatrixWorld(true);
  const bn = (n) => B[ud.qIdxBy[n]];
  for (let k = 0; k < 2; k++) {
    const up = bn(k ? 'UpperArmR' : 'UpperArmL'), lo = bn(k ? 'LowerArmR' : 'LowerArmL'), wr = bn(k ? 'WristR' : 'WristL');
    gripPoint(seat.grip, k, ctx, _gp);
    for (let it = 0; it < 5; it++) {
      wr.getWorldPosition(_ft);
      _tg.copy(_gp);
      if (it) { lo.getWorldPosition(_bv); _ax1.subVectors(_ft, _bv).normalize(); _tg.addScaledVector(_ax1, -HAND_PALM * s); }
      ikTo(up, lo, _ft, _tg);
      poleTo(mesh, up, lo, _tg, 0, -1, (k ? 1 : -1) * 0.6);
    }
  }
  void I;
}

export function plantFeetModular(mesh, ground, w = 1) {
  const ud = mesh && mesh.userData, I = ud && ud.qIdx;
  if (!I || typeof ground !== 'function' || !(w > 0)) return false;
  const B = ud.qBones;
  mesh.updateMatrixWorld(true);
  for (let k = 0; k < 2; k++) {
    B[k === 0 ? I.footL : I.footR].getWorldPosition(_ank[k]);
    const g = ground(_ank[k].x, _ank[k].z);
    _d[k] = Number.isFinite(g) ? g - mesh.position.y : 0;
  }
  if (Math.abs(_d[0]) < 0.008 && Math.abs(_d[1]) < 0.008) return false;
  footPlant(_d[0], _d[1], _plant);
  // het lijf (heup en bovenbenen hangen eraan) zakt; de voeten hangen aan de wortel en blijven staan
  const body = B[I.body];
  body.getWorldPosition(_v1);
  _v1.y -= _plant.drop * w;
  body.parent.worldToLocal(_v1);
  body.position.copy(_v1);
  body.updateMatrixWorld(true);
  for (let k = 0; k < 2; k++) {
    const up = B[k === 0 ? I.upL : I.upR], lo = B[k === 0 ? I.loL : I.loR], foot = B[k === 0 ? I.footL : I.footR];
    _t.copy(_ank[k]); _t.y += _d[k] * w;
    up.getWorldPosition(_a); lo.getWorldPosition(_b); _c3.copy(_ank[k]);
    const l1 = _a.distanceTo(_b), l2 = _b.distanceTo(_c3);
    const d = Math.min(l1 + l2 - 1e-4, Math.max(Math.abs(l1 - l2) + 1e-4, _a.distanceTo(_t)));
    // buiten bereik: de voet komt zo ver als het gestrekte been reikt en blijft aan de scheen vast
    if (Math.abs(_a.distanceTo(_t) - d) > 1e-4) _t.sub(_a).setLength(d).add(_a);
    foot.parent.worldToLocal(_v1.copy(_t));
    foot.position.copy(_v1);
    foot.updateMatrixWorld(true);
    // 1. knie: de hoek tussen dij en scheen zo dat de afstand heup-enkel d wordt
    const cur = _v1.subVectors(_a, _b).angleTo(_v2.subVectors(_c3, _b));
    const want = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2))));
    _n.crossVectors(_v1, _v2);
    if (_n.lengthSq() > 1e-10 && Math.abs(want - cur) > 1e-5) {
      _n.normalize();
      rotateWorld(lo, _qr.setFromAxisAngle(_n, want - cur));   // om n = dij x scheen: positief maakt de hoek groter
    }
    // 2. dij: het been als geheel naar het doel
    up.getWorldPosition(_a);
    const endNow = _v2.copy(_ank[k]);
    // het einde van de scheen na stap 1: de enkel draait mee met de scheen om de knie
    lo.getWorldPosition(_b);
    {
      const len = l2;
      const dirLo = _v1.subVectors(_c3, _b);
      if (Math.abs(want - cur) > 1e-5 && _n.lengthSq() > 0.5) dirLo.applyAxisAngle(_n, want - cur);
      endNow.copy(_b).addScaledVector(dirLo.normalize(), len);
    }
    _v1.subVectors(endNow, _a).normalize();
    _v2.subVectors(_t, _a).normalize();
    _qr.setFromUnitVectors(_v1, _v2);
    rotateWorld(up, _qr);
  }
  return true;
}

// ---- cutscenes en decorsets (actoranim.js animateActor, cutscene-fase) ---------------------------------------------------------
// Een anim uit de regietaal (idle, walk, run, talk, wave, ride, zwem, klim, sprong, ...) wordt parameters voor dezelfde
// state-machine: geen eigen animatiecode voor cutscenes. jaw = kaak 0..1 (lipsync, actoranim.js), gaze = hoofddraai (+ = rechts).
const EMOTES = new Set(['wave', 'cheer', 'clap']);
// In een voertuig of op een stoel (seating3d.js placeSeated, spelerfase): zit- of rijclip uit de state-machine. seat = de stoel van
// seating3d.js (pose.arms 'wheel' = sturen); t = wereldtijd (de stap volgt uit het verschil). Staan (fiets, step, achterop) is idle.
const _seatP = { ...SP0 };
export function seatModular(mesh, seat, t, ctx = null) {
  const ud = mesh && mesh.userData;
  if (!ud || !ud.qRig) return false;
  const dt = Math.max(0, Math.min(0.1, t - (ud.qSeatT ?? t)));
  ud.qSeatT = t;
  const p = ud.qSeatP || (ud.qSeatP = { ..._seatP });
  const arms = seat && seat.pose && seat.pose.arms;
  // bestuurder: instappen en rijden (vehicle); passagier: zitten (seated); staand (fiets, step, achterop): idle
  const rider = !!(seat && seat.rider);
  const drive = rider || (!(seat && seat.stand) && (arms === 'wheel' || arms === 'helm' || arms === 'tiller'));
  p.vehicle = drive ? (rider ? 'bike' : 'car') : null;
  p.seated = !drive && !(seat && seat.stand);
  ud.qParams = p;
  // trappers: een omwenteling per ~5,4 m (wiel 0,34 m, verzet 2,5), alleen voor een fietser
  if (rider) ud.qPedal = ((ud.qPedal || 0) + ((ctx && ctx.speed) || 0) * dt * 1.17) % (Math.PI * 2);
  ud.qInSeat = true;
  animateModular(mesh, 0, dt);
  ud.qInSeat = false;
  // vuisten om het stuur (met de echte stuurpositie) of de stuurgreep van de fiets
  setModularGrip(mesh, rider || arms === 'wheel' || !!(seat && seat.stand && seat.grip));
  if (!(ud.qLod > 0)) seatIK(mesh, seat, ctx);
  return true;
}

export function animateModularActor(mesh, anim, speed, gaze, dt, jaw = 0, seated = false) {
  const ud = mesh && mesh.userData;
  if (!ud || !ud.qRig) return false;
  const p = ud.qActorP || (ud.qActorP = { ...SP0, talk: false });
  p.seated = seated;
  p.vehicle = anim === 'ride' ? 'bike' : null;
  p.water = anim === 'zwem';
  p.climbing = anim === 'klim';
  p.jump = anim === 'sprong';
  p.emote = EMOTES.has(anim) ? anim : null;
  p.talk = anim === 'talk' || anim === 'laugh' || jaw > 0.02;
  ud.qParams = p;
  ud.gazeT = gaze;
  const sp = anim === 'walk' ? Math.max(speed, 1.4) : anim === 'run' ? Math.max(speed, 4.2) : anim === 'zwem' ? speed : 0;
  animateModular(mesh, sp, dt);
  if (ud.mouth) { const y = jaw > 0.01 ? Math.min(1, jaw) : 0; if (ud.mouth.scale.y !== y) ud.mouth.scale.y = y; }
  return true;
}

// cutscenes, decorsets en menigtes (actoranim.js animateActor) sturen een modulaire mens via deze haak
setModularActorHook(animateModularActor);


// ---- handen: wapen, aanvallen en dragen (eis coördinator 23-11: de speler op het nieuwe model) ---------------------------------
// De wapens van models3d_people.js (setHeldWeapon) hangen in een houder op de rechterpols (aan de onderarm). De botten dragen de packschaal (~100):
// de houder schaalt dat terug, zodat een wapen zijn eigen maat houdt (en met de lengte van de mens meeschaalt), en draait een halve
// slag om z: dan is -y van de houder de richting van de vingers en +x voor, net als de onderarm van het eigen model.
const _sp3 = new THREE.Vector3(), _sq3 = new THREE.Quaternion(), _ss = new THREE.Vector3();
export function modularHandSocket(mesh) {
  const ud = mesh && mesh.userData;
  if (!ud || !ud.qRig) return null;
  if (ud.qSocketR) return ud.qSocketR;
  // aan de onderarm, op de pols: de loop volgt de onderarm (zoals bij het eigen model), niet de knik van de pols in de clip
  const lo = ud.qBones[ud.qIdxBy.LowerArmR], wr = ud.qBones[ud.qIdxBy.WristR];
  mesh.updateMatrixWorld(true);
  lo.matrixWorld.decompose(_sp3, _sq3, _ss);
  const sock = new THREE.Object3D();
  sock.name = 'handR';
  sock.scale.setScalar(mesh.scale.x / _ss.x);
  sock.position.copy(wr.position);
  sock.rotation.z = Math.PI;
  lo.add(sock);
  ud.qSocketR = sock;
  return sock;
}
// Een houder op een willekeurig bot (zonder draaiing), met dezelfde maat-regel als de handhouder: 1 eenheid = 1 m van de gewone mens.
export function modularBoneSocket(mesh, name) {
  const ud = mesh && mesh.userData;
  if (!ud || !ud.qRig) return null;
  ud.qSockets = ud.qSockets || {};
  if (ud.qSockets[name]) return ud.qSockets[name];
  const b = ud.qBones[ud.qIdxBy[name]];
  mesh.updateMatrixWorld(true);
  b.matrixWorld.decompose(_sp3, _sq3, _ss);
  const sock = new THREE.Object3D();
  sock.name = 'socket-' + name;
  sock.scale.setScalar(mesh.scale.x / _ss.x);
  b.add(sock);
  return (ud.qSockets[name] = sock);
}
// Een prop (telefoon, hengel, gitaar) aan een bot, maar in de assen van de mens: world = de plek (wereld, bijvoorbeeld de handpalm uit
// modularHandPoint), rot = [x, y, z] Euler in de assen van de mens (x voor, y omhoog, z naar rechts). Elk beeld opnieuw na de clip en de IK,
// zodat de prop niet meedraait met de willekeurige assen van het bot.
const _ppq = new THREE.Quaternion(), _ppe = new THREE.Euler(), _ppm = new THREE.Quaternion(), _ppb = new THREE.Quaternion(), _ppP = new THREE.Vector3(), _pps = new THREE.Vector3(), _ppw = new THREE.Vector3();
export function modularPlaceProp(mesh, prop, boneName, world, rot) {
  const ud = mesh && mesh.userData;
  if (!ud || !ud.qRig) return false;
  const b = ud.qBones[ud.qIdxBy[boneName]];
  if (prop.parent !== b) b.add(prop);
  b.matrixWorld.decompose(_ppP, _ppb, _pps);
  mesh.getWorldQuaternion(_ppm);
  prop.scale.setScalar(mesh.scale.x / _pps.x);
  prop.position.copy(b.worldToLocal(_ppw.copy(world)));
  prop.quaternion.copy(_ppb.invert().multiply(_ppm).multiply(_ppq.setFromEuler(_ppe.set(rot[0], rot[1], rot[2]))));
  return true;
}
// De handpalm (wereld) van hand `side`: een stukje voorbij de pols langs de onderarm; extra = mesh-lokale verschuiving [x, y, z] (m, ongeschaald)
const _hpA = new THREE.Vector3(), _hpB = new THREE.Vector3();
export function modularHandPoint(mesh, side, out, extra = null) {
  const ud = mesh.userData, wr = ud.qBones[ud.qIdxBy['Wrist' + side]], lo = ud.qBones[ud.qIdxBy['LowerArm' + side]];
  wr.getWorldPosition(out); lo.getWorldPosition(_hpA);
  out.addScaledVector(_hpB.subVectors(out, _hpA).normalize(), HAND_PALM * (mesh.scale.y || 1));
  if (extra) { _hpB.set(extra[0], extra[1], extra[2]).multiplyScalar(mesh.scale.y || 1); mesh.getWorldQuaternion(_ppm); out.add(_hpB.applyQuaternion(_ppm)); }
  return out;
}
// Zet een mens meteen in een toestand (zonder menging), bijvoorbeeld zittend bij het verschijnen.
export function modularSetState(mesh, name) {
  const ud = mesh && mesh.userData;
  if (!ud || !ud.qSM) return false;
  const i = STATE_IDS.indexOf(name);
  if (i < 0) return false;
  ud.qSM.s = ud.qSM.prev = i; ud.qSM.k = 1; ud.qSM.fade = 0; ud.qSM.t = 0; ud.qSM.nt = 0; ud.qSM.done = false;
  if (ud.qState) { ud.qState.lastS = i; ud.qState.prevS = i; ud.qState.stateT = 0; }
  return true;
}
// waar de handpalm in de houder zit (m): de greep van een wapen komt hier
export const MODULAR_GRIP_AT = [0.01, -0.075, 0];

// Een clip alleen op het bovenlijf (animstate.js UPPER_MASK: borst, armen, nek, hoofd) met gewicht w over de pose die er al staat.
let _upperIdx = null;
export function overlayModularClip(mesh, name, u, w = 1) {
  const ud = mesh && mesh.userData, rig = ud && ud.qRig;
  const c = rig && rig.clips[name];
  if (!c || !(w > 0)) return false;
  if (!_upperIdx || _upperIdx.rig !== rig.man) _upperIdx = { rig: rig.man, idx: UPPER_MASK.map((n) => rig.man.bones.findIndex((b) => b.name === n)).filter((i) => i >= 0) };
  _acc.fill(0); _pacc.fill(0); _pw.fill(0);
  accumulate(rig, c, u, 1);
  for (const b of _upperIdx.idx) {
    const a = b * 4, l = Math.hypot(_acc[a], _acc[a + 1], _acc[a + 2], _acc[a + 3]);
    if (l < 1e-6) continue;
    _qa.set(_acc[a] / l, _acc[a + 1] / l, _acc[a + 2] / l, _acc[a + 3] / l);
    ud.qBones[b].quaternion.slerp(_qa, Math.min(1, w));
  }
  return true;
}

// Aanvallen (models3d_people.js applyAttackPose kiest): 'aim' richt het pistool (UAL Pistol_Idle_Loop), 'shoot' de terugslag van
// een schot (Pistol_Shoot, u = 0..1), 'jab' en 'cross' een stoot (Punch_Jab, Punch_Cross; ook voor een zwaai met een slagwapen).
const ATTACK_CLIP = { aim: 'UAL_Pistol_Idle_Loop', shoot: 'UAL_Pistol_Shoot', jab: 'UAL_Punch_Jab', cross: 'UAL_Punch_Cross' };
export function modularAttackPose(mesh, kind, u, w = 1) {
  const ud = mesh && mesh.userData;
  if (!ud || !ud.qRig || !ATTACK_CLIP[kind]) return false;
  const c = ud.qRig.clips[ATTACK_CLIP[kind]];
  if (!c) return false;
  // de lus (richten) loopt op de eigen klok, een eenmalige beweging op u
  const uu = kind === 'aim' ? ((ud.qState.t || 0) / c.dur) % 1 : Math.max(0, Math.min(0.999, u));
  const ok = overlayModularClip(mesh, ATTACK_CLIP[kind], uu, w);
  if (ok) mesh.updateMatrixWorld(true);
  return ok;
}

// Dragen (streetlife3d.js carryPose, models3d_people.js carryOverlay): beide handen naar de last. 'front' een bank, plant of doos voor
// de borst; 'up' een matras boven het hoofd; 'low' een tas of krat laag voor de buik. Hand en elleboog met de IK van het zitten.
const HOLD_AT = { front: [0.42, 1.02, 0.2], up: [0.08, 1.98, 0.24], low: [0.3, 0.86, 0.18] };
export function modularHoldPose(mesh, mode = 'front') {
  const ud = mesh && mesh.userData, at = HOLD_AT[mode];
  if (!ud || !ud.qRig || !at) return false;
  const B = ud.qBones, bn = (n) => B[ud.qIdxBy[n]];
  mesh.updateMatrixWorld(true);
  const s = mesh.scale.x || 1;
  for (let k = 0; k < 2; k++) {
    const up = bn(k ? 'UpperArmR' : 'UpperArmL'), lo = bn(k ? 'LowerArmR' : 'LowerArmL'), wr = bn(k ? 'WristR' : 'WristL');
    mesh.localToWorld(_c0.set(at[0], at[1], (k ? 1 : -1) * at[2]));
    for (let it = 0; it < 2; it++) {
      wr.getWorldPosition(_ft);
      _tg.copy(_c0);
      if (it) { lo.getWorldPosition(_bv); _ax1.subVectors(_ft, _bv).normalize(); _tg.addScaledVector(_ax1, -HAND_PALM * s); }
      ikTo(up, lo, _ft, _tg);
      poleTo(mesh, up, lo, _tg, 0, -1, (k ? 1 : -1) * 0.6);
    }
  }
  mesh.updateMatrixWorld(true);
  return true;
}


// Eén hand naar een punt (houdingen van voorbijgangers: bellen, hengelen, een kraam, een gitaar): at = [x, y, z] in de assen van de
// mens (x voor, y omhoog, z naar rechts; de linkerhand krijgt zijn z dus negatief mee), w = hoeveel (0..1) van de weg van de hand
// van de clip naar dit punt, pole = waar de elleboog heen wijst. mesh.updateMatrixWorld moet na de clip zijn gedaan.
const _rw = new THREE.Vector3();
export function modularReach(mesh, side, at, w = 1, pole = [0, -1, 0.6]) {
  const ud = mesh && mesh.userData;
  if (!ud || !ud.qRig || !(w > 0)) return false;
  const B = ud.qBones, bn = (n) => B[ud.qIdxBy[n]];
  const up = bn('UpperArm' + side), lo = bn('LowerArm' + side), wr = bn('Wrist' + side), k = side === 'R' ? 1 : -1;
  mesh.localToWorld(_c0.set(at[0], at[1], at[2]));
  for (let it = 0; it < 2; it++) {
    wr.getWorldPosition(_ft);
    _tg.copy(_c0);
    if (it) { lo.getWorldPosition(_bv); _ax1.subVectors(_ft, _bv).normalize(); _tg.addScaledVector(_ax1, -HAND_PALM * (mesh.scale.y || 1)); }
    if (w < 1) _tg.lerpVectors(_ft, _tg, w);
    ikTo(up, lo, _ft, _tg);
    poleTo(mesh, up, lo, _tg, pole[0], pole[1], k * Math.abs(pole[2]));
  }
  mesh.updateMatrixWorld(true);
  return true;
}

// Eerste-persoonhanden (firstpersonhands.js) op het nieuwe model: de onderarm met de gesloten hand (grijpvariant) van een look als vaste
// geometrie (position + color) in het assenstelsel van de arm in die module: oorsprong in de pols, -z naar de vingers, +x naar rechts
// van de mens, +y de kant van de duim. De driehoeken staan van ver naar dichtbij (de handen tekenen zonder dieptetest, als overlay).
export function bakeModularForearm(look, side = 'R') {
  const rig = look && rigs.get(look.rig);
  if (!rig) return null;
  const g = geometryFor(rig, look, 0, true);
  const bones = rig.man.bones, bi = (n) => bones.findIndex((b) => b.name === n);
  const lo = bi('LowerArm' + side), wr = bi('Wrist' + side);
  const at = (i) => new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(bones[i].inv).invert());
  const W = at(wr), f = W.clone().sub(at(lo)).normalize();
  const x = new THREE.Vector3(0, 0, 1).addScaledVector(f, -f.z).normalize(), z = f.clone().negate(), y = new THREE.Vector3().crossVectors(z, x);
  const P = g.attributes.position.array, C = g.attributes.color.array, SI = g.attributes.skinIndex.array, SW = g.attributes.skinWeight.array, I = g.index.array;
  const ok = (v) => { let b = SI[v * 4], w = SW[v * 4]; for (let k = 1; k < 4; k++) if (SW[v * 4 + k] > w) { w = SW[v * 4 + k]; b = SI[v * 4 + k]; } return b === lo || b === wr; };
  const s = look.scale || 1, tris = [], d = new THREE.Vector3();
  const loc = (v) => { d.set(P[v * 3] - W.x, P[v * 3 + 1] - W.y, P[v * 3 + 2] - W.z); return [d.dot(x) * s, d.dot(y) * s, d.dot(z) * s]; };
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t], b = I[t + 1], c = I[t + 2];
    if (!ok(a) || !ok(b) || !ok(c)) continue;
    const pa = loc(a), pb = loc(b), pc = loc(c);
    tris.push({ z: pa[2] + pb[2] + pc[2], v: [a, b, c], p: [pa, pb, pc] });
  }
  tris.sort((A, B) => A.z - B.z);
  const pos = new Float32Array(tris.length * 9), col = new Float32Array(tris.length * 9);
  tris.forEach((t2, k) => { for (let j = 0; j < 3; j++) { pos.set(t2.p[j], k * 9 + j * 3); col.set(C.subarray(t2.v[j] * 3, t2.v[j] * 3 + 3), k * 9 + j * 3); } });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeVertexNormals();
  return out;
}
// De look van een verhaalfiguur (TAMMO_APPEARANCE, ANITA_APPEARANCE) zoals buildModularFromAppearance hem kiest; null zonder rigs.
export function modularLookFromAppearance(a) {
  const m = rigs.size === 2 ? buildModularFromAppearance(a) : null;
  if (!m) return null;
  const look = m.userData.qLook, g = m.userData.body.geometry;
  g.userData.personRefs--;
  return { ...look, scale: m.scale.y };
}
