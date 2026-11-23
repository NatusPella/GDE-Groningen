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
import { createAnimState, stepAnimState, stateName, STATES, STATE_IDS } from './animstate.js';
import { blinkAmount } from './gait.js';
import { lookFromAppearance } from './modularlooks.js';
import { BODY_TYPES } from './clothinghair.js';
import { setModularActorHook } from './actoranim.js';

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
  rigs.set(name, rig);
  return rig;
}

// Laadt beide rigs in de achtergrond (browser). Geeft een belofte die nooit faalt: zonder bestand blijft het procedureel.
export function loadModularPeople(base = new URL('../models/mensen/', import.meta.url).href) {
  const all = [];
  for (const name of ['man', 'vrouw']) {
    if (rigs.has(name) || loading.has(name)) { all.push(loading.get(name)); continue; }
    const p = Promise.all([fetch(base + name + '.json').then((r) => r.json()), fetch(base + name + '.bin').then((r) => r.arrayBuffer())])
      .then(([man, buf]) => registerModularRig(name, man, buf))
      .catch((e) => { console.warn('[mensen] rig niet geladen', name, e && e.message); return null; });
    loading.set(name, p);
    all.push(p);
  }
  return Promise.all(all);
}
export const modularReady = (rig) => (rig ? rigs.has(rig) : rigs.size === 2);
// Fasen achter ?mensen= (ADR 0050): q = voorbijgangers, q2 = ook cutscenes en decorsets, q3 = ook de speler en medespelers.
export function mensenFase(flag) { return flag === 'q3' ? 3 : flag === 'q2' ? 2 : flag === 'q' ? 1 : 0; }
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
  const g = buildModularPerson(look.seed, { look });
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
  Punk_Head: 0.03, Farmer_Head: 0.03, Worker_Head: 0.12, Beach_Head: 0.5, Adventurer_Head: 0.6,
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
  const old = opts.old !== undefined ? !!opts.old : hashf(seed, 23) < 0.2;
  const dyed = !old && hashf(seed, 24) < 0.02;
  return {
    seed, rig: rigName, parts,
    skin: opts.skin ?? 0xd9a47a, shirt: opts.shirt ?? null,
    old,
    hair: old ? HAIR_OLD[Math.floor(hashf(seed, 20) * HAIR_OLD.length)] : dyed ? HAIR_DYED[Math.floor(hashf(seed, 20) * HAIR_DYED.length)] : HAIR[Math.floor(hashf(seed, 20) * HAIR.length)], pants: PANTS[Math.floor(hashf(seed, 21) * PANTS.length)],
    // importschaal per pack (quaternius_import.mjs RIGS) met een kleine variatie per zaad: man 1,75-1,85 m, vrouw 1,65-1,72 m
    scale: (rig.man.schaal || 1) * (1 + (rig.man.variatie ?? 0.02) * (2 * hashf(seed, 22) - 1)) * (old ? 0.985 : 1),
  };
}

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
  const k0 = v0, y = cy - 0.012, w = kind === 'cap' || kind === 'tammo' || kind === 'police' ? 0.085 : 0;
  put(cx + rx * 0.85, y, zc - w); put(cx + rx * 0.85, y, zc + w); put(cx + rx + 0.075, y - 0.02 * (w > 0 ? 1 : 0), zc + w * 0.8); put(cx + rx + 0.075, y - 0.02 * (w > 0 ? 1 : 0), zc - w * 0.8);
  tri(k0, k0 + 1, k0 + 2); tri(k0, k0 + 2, k0 + 3);
  return { v: v0, i: i0 };
}

const GEO_CACHE_MAX = 120;
function geometryFor(rig, look, lod = 0) {
  const key = `${lod}|${look.cap || ''}|${look.capColor || ''}|${look.parts.hoofd}|${look.parts.romp}|${look.parts.benen}|${look.parts.voeten}|${look.skin}|${look.shirt}|${look.hair}|${look.pants}|${Math.floor(hashf(look.seed, 3) * 8)}`;
  let g = rig.geoCache.get(key);
  if (g) { rig.geoCache.delete(key); rig.geoCache.set(key, g); return g; }
  // per deel het bereik van dit LOD-niveau (0 = het origineel, 1 en 2 uit de importpijplijn, LOD_CELLS)
  const parts = MODULAR_SLOTS.map((s) => { const p = rig.man.parts.find((q) => q.id === look.parts[s]); return lod > 0 && p.lods && p.lods[lod - 1] ? { ...p.lods[lod - 1], id: p.id, slot: p.slot, main: p.main } : p; });
  // gezicht (cutscene-fase): een mondopening en twee oogleden als plaatjes op twee extra botten (dicht = schaal 0, dus onzichtbaar)
  const face = rig.man.parts.find((q) => q.id === look.parts.hoofd).face;
  const capOn = !!(face && look.cap);
  const FV = (face ? 12 : 0) + (capOn ? CAP_V : 0), FI = (face ? 18 : 0) + (capOn ? CAP_I : 0);
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
    if (capOn) {
      _base.setHex(look.capColor ?? 0x2b2f36);
      const res = capGeometry(face, look.cap, P, C, SI, SW, I, v0, i0, [_base.r, _base.g, _base.b], rig.man.bones.findIndex((b) => b.name === 'Head'));
      v0 = res.v; i0 = res.i;
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

// LOD-niveaus (eis eigenaar 23-11): 0 dichtbij, 1 vanaf LOD_NEAR m (~46% minder driehoeken), 2 vanaf LOD_FAR m (~80% minder).
// Dezelfde vorm als het centrale LOD-register van perf-ultra-23-11 kan afnemen: een lijst niveaus met een afstand en een bouwer.
export const LOD_NEAR = 15, LOD_FAR = 40;
export function modularLodLevels(mesh) {
  const ud = mesh && mesh.userData;
  if (!ud || !ud.qRig) return [];
  return [0, 1, 2].map((lod) => ({ lod, distance: [0, LOD_NEAR, LOD_FAR][lod], geometry: () => geometryFor(ud.qRig, ud.qLook, lod) }));
}
// Wisselt de geometrie van een modulaire mens naar niveau lod (alleen als het verandert; telt de gedeelde geometrie netjes af en op).
export function setModularLod(mesh, lod) {
  const ud = mesh && mesh.userData;
  if (!ud || !ud.qRig || ud.qLod === lod) return false;
  const body = ud.body, old = body.geometry;
  const g = geometryFor(ud.qRig, ud.qLook, lod);
  g.userData.personRefs = (g.userData.personRefs || 0) + 1;
  body.geometry = g;
  ud.qLod = lod;
  if (old && old !== g) { old.userData.personRefs--; if (old.userData.personRefs <= 0 && old.userData.personRetired) old.dispose(); }
  return true;
}
// Het niveau voor een afstand d (m) met een kleine marge, zodat iemand op de grens niet heen en weer springt.
export function lodForDistance(d, cur = 0) {
  const m = 1.5;
  if (cur === 0) return d > LOD_NEAR + m ? (d > LOD_FAR + m ? 2 : 1) : 0;
  if (cur === 1) return d < LOD_NEAR - m ? 0 : d > LOD_FAR + m ? 2 : 1;
  return d < LOD_NEAR - m ? 0 : d < LOD_FAR - m ? 1 : 2;
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
  for (const b of extra) b.scale.y = 0;   // pas na het binden (de inverse van schaal 0 bestaat niet): mond dicht, ogen open
  group.scale.setScalar(look.scale);
  const ud = group.userData;
  ud.qRig = rig;
  ud.qBones = sk.bones;
  ud.qLook = look;
  ud.qLod = 0;
  ud.body = mesh;
  ud.lookSeed = seed;
  ud.animOffset = hashf(seed, 9) * 100;
  ud.female = look.rig === 'vrouw';
  ud.qIdle = rig.clips[hashf(seed, 30) < 0.5 ? 'Idle' : 'Idle_Neutral'] ? (hashf(seed, 30) < 0.5 ? 'Idle' : 'Idle_Neutral') : 'Idle';
  ud.qState = { t: hashf(seed, 31) * 10, phase: hashf(seed, 32), walk: 0, run: 0, gaze: 0 };
  ud.qSM = createAnimState('idle');   // de gedeelde state-machine (animstate.js, ADR 0051)
  const bi = (n) => rig.man.bones.findIndex((b) => b.name === n);
  ud.qIdx = { neck: bi('Neck'), head: bi('Head'), body: bi('Body'), root: bi('Root'), upL: bi('UpperLegL'), loL: bi('LowerLegL'), upR: bi('UpperLegR'), loR: bi('LowerLegR'), footL: bi('FootL'), footR: bi('FootR') };
  return group;
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
const SP0 = { ..._sp };
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
    const idleClip = crouch ? rig.clips.UAL_Crouch_Idle_Loop : talk && rig.clips.UAL_Idle_Talking_Loop ? rig.clips.UAL_Idle_Talking_Loop : idleC;
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
  if (list) c = rig.clips[list[name === 'swim' ? (ud.qSM.speed > 0.4 ? 1 : 0) : talk && list[1] ? 1 : 0]] || rig.clips[list[0]];
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
  // knipperen (gait.js blinkAmount, zelfde ritme als het eigen model)
  if (ud.lids) { const bl = blinkAmount(st.t + ud.animOffset, ud.animOffset); if (ud.lids.scale.y !== bl) ud.lids.scale.y = bl; }
  // blik (gait.js glanceAt zet ud.gazeT, + = rechts): hoofd en nek draaien om de verticale as van de persoon, 40/60 verdeeld
  const gz = ud.gazeT;
  st.gaze += ((gz === undefined || gz !== gz ? 0 : gz) - st.gaze) * Math.min(1, step * 6);
  if (Math.abs(st.gaze) > 1e-3) {
    const ax = rig.lookAxis;
    bones[ud.qIdx.neck].quaternion.premultiply(_qa.setFromAxisAngle(_axis.fromArray(ax.Neck), -st.gaze * 0.4));
    bones[ud.qIdx.head].quaternion.premultiply(_qa.setFromAxisAngle(_axis.fromArray(ax.Head), -st.gaze * 0.6));
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
function seatIK(mesh, seat) {
  const ud = mesh.userData, I = ud.qIdx, B = ud.qBones, pose = seat && seat.pose;
  const rider = !!(seat && seat.rider);
  if ((!pose && !rider) || (seat.stand && !rider)) return;
  mesh.updateMatrixWorld(true);
  const s = mesh.scale.y || 1;
  const bn = (n) => B[ud.qRig.man.bones.findIndex((b) => b.name === n)];
  // op de fiets: de voeten bij de trappers (onder en iets voor het zadel), anders de voeten van de stoel
  const fx = rider ? 0.25 : pose.footX ?? 0.6, fy = rider ? -0.7 : pose.footY ?? -0.3;
  for (let k = 0; k < 2; k++) {
    const up = B[k ? I.upR : I.upL], lo = B[k ? I.loR : I.loL], foot = B[k ? I.footR : I.footL];
    const side = k ? 1 : -1;   // L zit bij deze mensen aan -z
    up.getWorldPosition(_sv); mesh.worldToLocal(_sv);
    _sv.x += fx / s; _sv.y += fy / s;
    // schrijlings (paard, quad): de voeten wijken uit naar opzij, zoals seatPose met pose.splay
    if (pose && pose.splay) _sv.z += side * Math.sin(pose.splay) * Math.abs(fy) / s;
    mesh.localToWorld(_sv);
    foot.getWorldPosition(_sw);
    ikTo(up, lo, _sw, _sv);
    if (pose && pose.splay) kneeOut(mesh, up, lo, _sv, side);
    foot.parent.worldToLocal(_sv); foot.position.copy(_sv); foot.updateMatrixWorld(true);
  }
  if (rider) {
    // de handvatten van het fietsstuur: 0,43 m voor de heup, op heuphoogte, 0,28 m opzij (bikeStuurOnderdelen)
    const hips = bn('Hips');
    hips.getWorldPosition(_sv); mesh.worldToLocal(_sv);
    const hx = _sv.x, hy = _sv.y, hz = _sv.z;
    for (let k = 0; k < 2; k++) {
      _sv.set(hx + 0.43 / s, hy + 0.03 / s, hz + (k ? 0.28 : -0.28) / s);
      mesh.localToWorld(_sv);
      const up = bn(k ? 'UpperArmR' : 'UpperArmL'), lo = bn(k ? 'LowerArmR' : 'LowerArmL'), wr = bn(k ? 'WristR' : 'WristL');
      wr.getWorldPosition(_sw);
      ikTo(up, lo, _sw, _sv);
    }
    return;
  }
  if (!pose || pose.arms !== 'wheel') return;
  // het stuur: voor de heup (0,42 m naar voren, 0,5 m omhoog), gekanteld naar de bestuurder; de grepen draaien met de stuurhoek
  const hips = bn('Hips');
  hips.getWorldPosition(_sv); mesh.worldToLocal(_sv);
  const cx = _sv.x + 0.42 / s, cy = _sv.y + 0.5 / s, cz = _sv.z;
  const ang = -Math.max(-1, Math.min(1, ud.steer || 0)) * STEER_TURN;
  for (let k = 0; k < 2; k++) {
    wheelGrip(cx, cy, 0.19 / s, 0.5, ang, k ? 1 : -1, _sg);   // L zit bij deze mensen aan -z
    _sv.set(_sg.x, _sg.y, cz + _sg.z);
    mesh.localToWorld(_sv);
    const up = bn(k ? 'UpperArmR' : 'UpperArmL'), lo = bn(k ? 'LowerArmR' : 'LowerArmL'), wr = bn(k ? 'WristR' : 'WristL');
    wr.getWorldPosition(_sw);
    ikTo(up, lo, _sw, _sv);
  }
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
export function seatModular(mesh, seat, t) {
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
  animateModular(mesh, 0, dt);
  if (!(ud.qLod > 0)) seatIK(mesh, seat);
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
