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
import { crossfade, footPlant } from './actorlife.js';
import { createAnimState, stepAnimState } from './animstate.js';

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

const GEO_CACHE_MAX = 120;
function geometryFor(rig, look, lod = 0) {
  const key = `${lod}|${look.parts.hoofd}|${look.parts.romp}|${look.parts.benen}|${look.parts.voeten}|${look.skin}|${look.shirt}|${look.hair}|${look.pants}|${Math.floor(hashf(look.seed, 3) * 8)}`;
  let g = rig.geoCache.get(key);
  if (g) { rig.geoCache.delete(key); rig.geoCache.set(key, g); return g; }
  // per deel het bereik van dit LOD-niveau (0 = het origineel, 1 en 2 uit de importpijplijn, LOD_CELLS)
  const parts = MODULAR_SLOTS.map((s) => { const p = rig.man.parts.find((q) => q.id === look.parts[s]); return lod > 0 && p.lods && p.lods[lod - 1] ? { ...p.lods[lod - 1], id: p.id, slot: p.slot, main: p.main } : p; });
  const nV = parts.reduce((s, p) => s + p.vCount, 0), nI = parts.reduce((s, p) => s + p.iCount, 0);
  const P = new Float32Array(nV * 3), C = new Float32Array(nV * 3), SI = new Uint8Array(nV * 4), SW = new Uint8Array(nV * 4);
  const I = nV < 65536 ? new Uint16Array(nI) : new Uint32Array(nI);
  let v0 = 0, i0 = 0;
  const palColor = new Map();
  for (const p of parts) {
    P.set(rig.pos.subarray(p.vStart * 3, (p.vStart + p.vCount) * 3), v0 * 3);
    SI.set(rig.si.subarray(p.vStart * 4, (p.vStart + p.vCount) * 4), v0 * 4);
    SW.set(rig.sw.subarray(p.vStart * 4, (p.vStart + p.vCount) * 4), v0 * 4);
    for (let v = 0; v < p.vCount; v++) {
      const pi = rig.col[p.vStart + v], ck = p.id + '|' + pi;
      let c = palColor.get(ck);
      if (!c) { colorFor(rig, p, pi, look, _c); c = [_c.r, _c.g, _c.b]; palColor.set(ck, c); }
      C[(v0 + v) * 3] = c[0]; C[(v0 + v) * 3 + 1] = c[1]; C[(v0 + v) * 3 + 2] = c[2];
    }
    for (let i = 0; i < p.iCount; i++) I[i0 + i] = rig.idx[p.iStart + i] + v0;
    v0 += p.vCount; i0 += p.iCount;
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
  mesh.bind(new THREE.Skeleton(sk.bones, inverses), new THREE.Matrix4());
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
// Elke frame voor een modulaire mens (vanuit animatePersonWalk): idle, lopen en rennen gemengd op snelheid (overgangen van 0,25 s),
// de cyclus synchroon met de afgelegde weg, de hielcontacten voor de stapgeluiden (ud.footN/footSide) en de blik (ud.gazeT).
export function animateModular(mesh, speed, dt) {
  const ud = mesh.userData, rig = ud.qRig, st = ud.qState;
  if (!rig) return;
  const s = Number.isFinite(speed) ? Math.max(0, speed) : 0;
  const step = Number.isFinite(dt) ? Math.max(0, Math.min(0.1, dt)) : 0;
  // de state-machine (animstate.js) kiest de toestand en geeft de loopruimte; de clipgewichten volgen die met een overgang
  const sm = ud.qSM;
  sm.tier = ud.qLod || 0;
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
  const wIdle = 1 - st.walk;
  accumulate(rig, idleC, (st.t + ud.animOffset) / idleC.dur, wIdle);
  accumulate(rig, walkC, st.phase, st.walk * (1 - st.run));
  accumulate(rig, runC, st.phase + runOff, st.walk * st.run);
  const bones = ud.qBones, restB = rig.man.bones;
  for (let b = 0; b < bones.length; b++) {
    const a = b * 4, l = Math.hypot(_acc[a], _acc[a + 1], _acc[a + 2], _acc[a + 3]);
    if (l > 1e-6) bones[b].quaternion.set(_acc[a] / l, _acc[a + 1] / l, _acc[a + 2] / l, _acc[a + 3] / l);
    const pw = _pw[b], rp = restB[b].pos;
    if (pw > 1e-6) bones[b].position.set(_pacc[b * 3] / pw * Math.min(1, pw) + rp[0] * (1 - Math.min(1, pw)), _pacc[b * 3 + 1] / pw * Math.min(1, pw) + rp[1] * (1 - Math.min(1, pw)), _pacc[b * 3 + 2] / pw * Math.min(1, pw) + rp[2] * (1 - Math.min(1, pw)));
    else bones[b].position.set(rp[0], rp[1], rp[2]);
  }
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
