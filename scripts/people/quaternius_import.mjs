// Importpijplijn voor de modulaire mensen van Quaternius (ADR 0050, CC0): zet de .glb-figuren om naar ons eigen, kleine formaat
// (game/models/mensen/<rig>.json + <rig>.bin). Leest alleen uit de packmap buiten git; schrijft alleen de omgezette delen.
//   node scripts/people/quaternius_import.mjs [--write] [--rig=man|vrouw]
//
// Wat het doet, per rig (man en vrouw hebben elk hun eigen skelet in rust en hun eigen clips):
// - skelet: 62 botten naar 22 (de vingers gaan op in de pols, de pole targets vallen weg); rust en inverse bind in de assen van
//   ons model (+X vooruit, y omhoog, voeten op 0), dus het model kijkt zoals buildPersonMesh.
// - delen: per figuur hoofd, romp, benen en voeten (wapens en rugzak vallen weg), elk met posities in rust (de huid al toegepast),
//   een kleurindex per vertex (materiaalkleur maal vertexkleur, in een palet met de materiaalnaam erbij, zodat huid, haar en
//   kleding per mens te kleuren zijn) en 4 botten met gewichten. Geen normalen: het materiaal is flatShading, zoals onze mensen.
// - clips: alleen wat het spel gebruikt (Idle, Idle_Neutral, Walk, Run, Wave, Interact), gesampled op 30 beelden per seconde,
//   quaternionen als Int16, posities alleen voor botten die echt bewegen; plus de fase van elk hielcontact (voor de stapgeluiden).
import '../node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
const THREE = await import('three');
const { GLTFLoader } = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'game', 'models', 'mensen');
const ASSETS = process.env.GDE_ASSETS || path.join(os.homedir(), 'gde-assets', 'quaternius');
const WRITE = process.argv.includes('--write');
const ONLY = (process.argv.find((a) => a.startsWith('--rig=')) || '').slice(6) || null;

// Gewone kleding voor voorbijgangers en bijrollen; geen koning, astronaut, ridder, heks of soldaat (die passen niet in Grunn).
// schaal: de importschaal per pack (eis eigenaar 23-11, gemeten met scripts/people/mensen_maten.mjs): het pack is in meters
// (CharacterArmature schaal 100 op centimeters). Man in rust 1,80 m tot de kruin, oog 1,66 m: schaal 1. Vrouw 1,75 m: schaal 0,965
// geeft 1,69 m. Per zaad komt daar hooguit 2,5% (man) of 2% (vrouw) bij of af: man 1,75-1,85 m, vrouw 1,65-1,72 m.
export const RIGS = {
  man: { schaal: 1, variatie: 0.025, oog: 'Eye', dir: path.join(ASSETS, 'ultimate-modular-men', 'glb'), figures: ['Casual Character', 'Hoodie Character', 'Business Man', 'Worker', 'Farmer', 'Punk', 'Beach Character'] },
  vrouw: { schaal: 0.965, variatie: 0.02, oog: 'Brown', dir: path.join(ASSETS, 'ultimate-modular-women', 'pack'), figures: ['Animated Woman', 'Animated Woman-nIItLV9nxS', 'Suit', 'Worker', 'Punk', 'Adventurer'] },
};
export const KEEP = ['Root', 'Body', 'Hips', 'Abdomen', 'Torso', 'Chest', 'Neck', 'Head', 'ShoulderL', 'UpperArmL', 'LowerArmL', 'WristL', 'ShoulderR', 'UpperArmR', 'LowerArmR', 'WristR', 'UpperLegL', 'LowerLegL', 'UpperLegR', 'LowerLegR', 'FootL', 'FootR'];
export const CLIPS = ['Idle', 'Idle_Neutral', 'Walk', 'Run', 'Wave', 'Interact'];
const FPS = 30;
let REST_POS = [];   // rustposities (lokaal) van de bewaarde botten van de rig die nu omgezet wordt
// m: LOD 1 en LOD 2 per vak (LOD 0 = het gelaste origineel); het hoofd fijner, anders verdwijnen haar en gezicht als eerste
export const LOD_CELLS = { hoofd: [0.017, 0.036], romp: [0.05, 0.1], benen: [0.05, 0.1], voeten: [0.04, 0.085] };
const POS_Q = 1 / 8192;          // m per eenheid (Int16: +-4 m)
const SLOT = (name) => /_head$/i.test(name) || /_Head$/.test(name) ? 'hoofd' : /_Body$/i.test(name) ? 'romp' : /_(Legs|Pants)$/i.test(name) ? 'benen' : /_Feet$/i.test(name) ? 'voeten' : null;

async function load(file) {
  const buf = fs.readFileSync(file);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Promise((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
}

// Grijphand (eis coördinator 23-11): de vingers gaan bij de import op in de pols, dus een gesloten hand kan alleen als tweede set
// posities. gripPose krult per vinger het basis-, midden- en eindkootje (MCP, PIP, DIP) om de as dwars op de vinger, naar de
// handpalm (die wijst in rust naar het lijf: z naar 0), samen ~3,1 rad: een vuist om een stang van ~3,5 cm (stuur, stuurgreep).
// De duim komt over de wijs- en middelvinger: de hoek die de duimtop het dichtst bij het middenkootje van de wijsvinger brengt.
export const GRIP_CURL = [1.15, 1.25, 0.75];
const FINGERS = ['Index', 'Middle', 'Ring', 'Pinky'];
function gripPose(bones, side) {
  // de top: 2 cm voorbij het laatste bot langs zijn as (de botten dragen de packschaal, dus de as genormaliseerd in de wereld)
  const wp = new THREE.Vector3(), tip = (b) => { bones['Wrist' + side].updateMatrixWorld(true); return wp.setFromMatrixColumn(b.matrixWorld, 1).normalize().multiplyScalar(0.02).add(new THREE.Vector3().setFromMatrixPosition(b.matrixWorld)); };
  const axis = new THREE.Vector3(1, 0, 0), q = new THREE.Quaternion();
  for (const f of FINGERS) {
    const chain = [2, 3, 4].map((k) => bones[f + k + side]).filter(Boolean);
    if (!chain.length) continue;
    const base = chain[0].quaternion.clone();
    // richting: welk teken trekt de top naar de palm (|z| kleiner)
    chain[0].quaternion.copy(base).multiply(q.setFromAxisAngle(axis, 0.5));
    const zPlus = Math.abs(tip(chain[chain.length - 1]).z);
    chain[0].quaternion.copy(base).multiply(q.setFromAxisAngle(axis, -0.5));
    const zMin = Math.abs(tip(chain[chain.length - 1]).z);
    chain[0].quaternion.copy(base);
    const sgn = zPlus < zMin ? 1 : -1;
    chain.forEach((b, k) => b.quaternion.multiply(q.setFromAxisAngle(axis, sgn * GRIP_CURL[k])));
  }
  const t1 = bones['Thumb1' + side], t2 = bones['Thumb2' + side], t3 = bones['Thumb3' + side], aim = bones['Index3' + side];
  if (t1 && t2 && t3 && aim) {
    aim.updateMatrixWorld(true);
    const goal = new THREE.Vector3().setFromMatrixPosition(aim.matrixWorld);
    const b1 = t1.quaternion.clone(), b2 = t2.quaternion.clone();
    let best = null;
    for (let ax = -1.2; ax <= 1.21; ax += 0.1) for (let az = -1.2; az <= 1.21; az += 0.1) for (const a2 of [0, 0.3, 0.6]) {
      t1.quaternion.copy(b1).multiply(q.setFromEuler(new THREE.Euler(ax, 0, az)));
      t2.quaternion.copy(b2).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(a2, 0, 0)));
      t1.updateMatrixWorld(true);
      const d = tip(t3).distanceTo(goal);
      if (!best || d < best.d) best = { d, ax, az, a2 };
    }
    t1.quaternion.copy(b1).multiply(q.setFromEuler(new THREE.Euler(best.ax, 0, best.az)));
    t2.quaternion.copy(b2).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(best.a2, 0, 0)));
  }
}
// De gehuide posities van elke romp-mesh met beide handen gesloten (Map mesh -> Float32Array), daarna weer de rust.
function gripPositions(sc, bones) {
  const saved = new Map();
  for (const b of Object.values(bones)) saved.set(b, b.quaternion.clone());
  gripPose(bones, 'L'); gripPose(bones, 'R');
  sc.updateMatrixWorld(true);
  const out = new Map(), v = new THREE.Vector3();
  sc.traverse((m) => {
    if (!m.isSkinnedMesh || SLOT(partOf(m)) !== 'romp') return;
    const P = m.geometry.attributes.position, a = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); m.applyBoneTransform(i, v); v.applyMatrix4(m.matrixWorld); a[i * 3] = v.x; a[i * 3 + 1] = v.y; a[i * 3 + 2] = v.z; }
    out.set(m, a);
  });
  for (const [b, qq] of saved) b.quaternion.copy(qq);
  sc.updateMatrixWorld(true);
  return out;
}

// Het bovenste deel onder de scène waar een SkinnedMesh onder hangt: de naam is het deel (Casual2_Body), ook als het meerdere primitieven heeft.
function partOf(o) {
  let p = o;
  while (p.parent && p.parent.parent && !/^(RootNode|Root_Scene|Scene)$/.test(p.parent.name)) p = p.parent;
  return p.name;
}

function keptAncestor(bone) {
  for (let b = bone; b; b = b.parent) if (KEEP.includes(b.name)) return b.name;
  return 'Root';
}

async function importRig(rigName) {
  const spec = RIGS[rigName];
  const palette = [], palKey = new Map();
  const pal = (mat, r, g, b) => {
    const q = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255);
    const key = `${mat}|${q(r)}|${q(g)}|${q(b)}`;
    let i = palKey.get(key);
    if (i === undefined) { i = palette.length; palette.push({ mat, rgb: [q(r), q(g), q(b)] }); palKey.set(key, i); }
    return i;
  };
  const parts = [], pos = [], col = [], si = [], sw = [], idx = [];
  const gp = [];   // dezelfde vertices met de vingers om een stang gekruld (grijphand, zie gripPose); gelijk aan pos waar niets krult
  // Zonder normalen en uv's zijn naden overbodig: vertices met dezelfde (gekwantiseerde) plek, kleur en huid worden er één,
  // en driehoeken die daardoor wegvallen (twee hoeken op één plek) gaan eruit.
  const weld = (vStart, iStart) => {
    const n = pos.length / 3 - vStart, map = new Int32Array(n), keys = new Map();
    const np = [], nc = [], nsi = [], nsw = [], ngp = [];
    for (let i = 0; i < n; i++) {
      const g = vStart + i;
      const key = `${Math.round(pos[g * 3] / POS_Q)},${Math.round(pos[g * 3 + 1] / POS_Q)},${Math.round(pos[g * 3 + 2] / POS_Q)},${col[g]},${si.slice(g * 4, g * 4 + 4)},${sw.slice(g * 4, g * 4 + 4)}`;
      let j = keys.get(key);
      if (j === undefined) { j = np.length / 3; keys.set(key, j); np.push(pos[g * 3], pos[g * 3 + 1], pos[g * 3 + 2]); ngp.push(gp[g * 3], gp[g * 3 + 1], gp[g * 3 + 2]); nc.push(col[g]); for (let k = 0; k < 4; k++) { nsi.push(si[g * 4 + k]); nsw.push(sw[g * 4 + k]); } }
      map[i] = j;
    }
    const tri = idx.splice(iStart).map((i) => map[i]);
    for (let t = 0; t < tri.length; t += 3) if (tri[t] !== tri[t + 1] && tri[t + 1] !== tri[t + 2] && tri[t] !== tri[t + 2]) idx.push(tri[t], tri[t + 1], tri[t + 2]);
    pos.length = vStart * 3; gp.length = vStart * 3; col.length = vStart; si.length = vStart * 4; sw.length = vStart * 4;
    pos.push(...np); gp.push(...ngp); col.push(...nc); si.push(...nsi); sw.push(...nsw);
  };
  // LOD's (eis eigenaar 23-11): vertex-clustering per deel. Vertices in dezelfde cel van `cell` m, met dezelfde kleur en hetzelfde
  // zwaarste bot, worden er één (gemiddelde plek, huid van het eerste lid); driehoeken die wegvallen of dubbel zijn gaan eruit.
  // De kleur en het bot in de sleutel houden naden tussen kleding en huid en tussen ledematen scherp.
  const lodOf = (vStart, vCount, iStart, iCount, cell) => {
    const keys = new Map(), map = new Int32Array(vCount), acc = [];
    const nv0 = pos.length / 3;
    for (let i = 0; i < vCount; i++) {
      const g = vStart + i;
      const key = `${Math.floor(pos[g * 3] / cell)},${Math.floor(pos[g * 3 + 1] / cell)},${Math.floor(pos[g * 3 + 2] / cell)},${col[g]},${si[g * 4]}`;
      let j = keys.get(key);
      if (j === undefined) { j = acc.length; keys.set(key, j); acc.push({ g, x: 0, y: 0, z: 0, n: 0 }); }
      const a = acc[j]; a.x += pos[g * 3]; a.y += pos[g * 3 + 1]; a.z += pos[g * 3 + 2]; a.n++;
      map[i] = j;
    }
    for (const a of acc) { pos.push(a.x / a.n, a.y / a.n, a.z / a.n); gp.push(a.x / a.n, a.y / a.n, a.z / a.n); col.push(col[a.g]); for (let k = 0; k < 4; k++) { si.push(si[a.g * 4 + k]); sw.push(sw[a.g * 4 + k]); } }
    const i0 = idx.length, seen = new Set();
    for (let t = iStart; t < iStart + iCount; t += 3) {
      const A = map[idx[t]], B2 = map[idx[t + 1]], C = map[idx[t + 2]];
      if (A === B2 || B2 === C || A === C) continue;
      const k = [A, B2, C].sort((x, y) => x - y).join(',');
      if (seen.has(k)) continue;
      seen.add(k);
      idx.push(A, B2, C);
    }
    return { vStart: nv0, vCount: acc.length, iStart: i0, iCount: idx.length - i0, tris: (idx.length - i0) / 3 };
  };
  // Gezichtspunten van een hoofd (voor de mond en de oogleden die modularpeople.js erbij zet, cutscene-fase): de ogen zijn het
  // materiaal `oogMat` (man 'Eye', vrouw 'Brown': twee plaatjes van 8 vertices), links en rechts gesplitst op z; de mond ligt 8,5 cm
  // onder de ogen op de voorkant van de huid.
  const faceOf = (part, oogMat) => {
    const eye = [];
    for (let v = part.vStart; v < part.vStart + part.vCount; v++) if (palette[col[v]].mat === oogMat) eye.push(v);
    if (eye.length < 4) return null;
    const zc = eye.reduce((a, v) => a + pos[v * 3 + 2], 0) / eye.length;
    const side = (sgn) => {
      const vs = eye.filter((v) => (pos[v * 3 + 2] - zc) * sgn > 0);
      const c = [0, 1, 2].map((k) => vs.reduce((a, v) => a + pos[v * 3 + k], 0) / vs.length);
      const h = Math.max(...vs.map((v) => pos[v * 3 + 1])) - Math.min(...vs.map((v) => pos[v * 3 + 1]));
      const w = Math.max(...vs.map((v) => pos[v * 3 + 2])) - Math.min(...vs.map((v) => pos[v * 3 + 2]));
      const x = Math.max(...vs.map((v) => pos[v * 3]));
      return { c: c.map((x2) => +x2.toFixed(4)), x: +x.toFixed(4), h: +h.toFixed(4), w: +w.toFixed(4) };
    };
    const L = side(1), R = side(-1);
    const my = (L.c[1] + R.c[1]) / 2 - 0.085;
    let mx = -9;
    for (let v = part.vStart; v < part.vStart + part.vCount; v++) {
      if (!/^skin/i.test(palette[col[v]].mat)) continue;
      if (Math.abs(pos[v * 3 + 1] - my) < 0.015 && Math.abs(pos[v * 3 + 2] - zc) < 0.025) mx = Math.max(mx, pos[v * 3]);
    }
    return { eyes: [L, R], mouth: [+mx.toFixed(4), +my.toFixed(4), +zc.toFixed(4)] };
  };
  let rest = null, clips = null, heightRef = 0;
  for (const fig of spec.figures) {
    const gltf = await load(path.join(spec.dir, `${fig}.glb`));
    const sc = gltf.scene;
    sc.rotation.y = Math.PI / 2;    // glTF kijkt langs +Z, wij langs +X
    sc.updateMatrixWorld(true);
    const bones = {};
    sc.traverse((o) => { if (o.isBone) bones[o.name] = o; });
    if (!rest) {
      // skelet in rust uit de eerste figuur (alle figuren van een rig delen het, zie quaternius_inventaris.mjs)
      const armature = bones.Root.parent;
      rest = {
        armature: armature.matrixWorld.toArray(),
        bones: KEEP.map((n) => {
          const b = bones[n];
          return { name: n, parent: n === 'Root' ? -1 : KEEP.indexOf(b.parent.name), pos: b.position.toArray(), quat: b.quaternion.toArray(), inv: new THREE.Matrix4().copy(b.matrixWorld).invert().toArray() };
        }),
      };
      heightRef = new THREE.Vector3().setFromMatrixPosition(bones.Head.matrixWorld).y;
      REST_POS = rest.bones.map((b) => b.pos);
    }
    const v = new THREE.Vector3(), c = new THREE.Color();
    const byPart = new Map();
    const gripOf = gripPositions(sc, bones);
    sc.traverse((o) => { if (o.isSkinnedMesh) { const n = partOf(o); if (!byPart.has(n)) byPart.set(n, []); byPart.get(n).push(o); } });
    for (const [name, meshes] of byPart) {
      const slot = SLOT(name);
      if (!slot) continue; // wapen, rugzak
      const vStart = pos.length / 3, iStart = idx.length;
      let local = 0;
      for (const m of meshes) {
        const g = m.geometry, P = g.attributes.position, C = g.attributes.color, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
        const mc = m.material.color;
        for (let i = 0; i < P.count; i++) {
          v.fromBufferAttribute(P, i);
          m.applyBoneTransform(i, v);
          v.applyMatrix4(m.matrixWorld);
          pos.push(v.x, v.y, v.z);
          const G = slot === 'romp' ? gripOf.get(m) : null;
          if (G) gp.push(G[i * 3], G[i * 3 + 1], G[i * 3 + 2]); else gp.push(v.x, v.y, v.z);
          c.copy(mc);
          if (C) c.multiply(new THREE.Color(C.getX(i), C.getY(i), C.getZ(i)));
          col.push(pal(m.material.name, c.r, c.g, c.b));
          // gewichten naar de bewaarde botten (een vinger telt voor de pols), samenvoegen, de zwaarste 4, opnieuw genormaliseerd
          const w = new Map();
          for (let k = 0; k < 4; k++) {
            const wt = SW.getComponent(i, k);
            if (wt <= 0) continue;
            const bi = KEEP.indexOf(keptAncestor(m.skeleton.bones[SI.getComponent(i, k)]));
            w.set(bi, (w.get(bi) || 0) + wt);
          }
          const top = [...w.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
          const sum = top.reduce((s, e) => s + e[1], 0) || 1;
          // in hele 255sten die precies optellen tot 255 (een afronding naar -1 zou als Uint8 255 worden: een spies uit het lijf)
          const qs = top.map((e) => Math.floor((e[1] / sum) * 255));
          let left = 255 - qs.reduce((s2, x) => s2 + x, 0);
          for (let k = 0; left > 0 && qs.length; k = (k + 1) % qs.length, left--) qs[k]++;
          for (let k = 0; k < 4; k++) { si.push(top[k] ? top[k][0] : 0); sw.push(top[k] ? qs[k] : 0); }
        }
        const I = g.index;
        if (I) for (let i = 0; i < I.count; i++) idx.push(local + I.getX(i));
        else for (let i = 0; i < P.count; i++) idx.push(local + i);
        local += P.count;
      }
      weld(vStart, iStart);
      const part = { id: name, figure: fig, slot, vStart, vCount: pos.length / 3 - vStart, iStart, iCount: idx.length - iStart, tris: (idx.length - iStart) / 3 };
      // de indices in idx zijn lokaal per deel (0 = eerste vertex van het deel); lodOf werkt met die lokale nummers
      part.lods = LOD_CELLS[slot].map((cell) => lodOf(part.vStart, part.vCount, part.iStart, part.iCount, cell))

      if (slot === 'hoofd') part.face = faceOf(part, spec.oog);
      parts.push(part);
    }
  }
  // de clips uit een verse lading van de eerste figuur (de huid hierboven is in rust genomen)
  {
    const gltf = await load(path.join(spec.dir, `${spec.figures[0]}.glb`));
    const sc = gltf.scene;
    sc.rotation.y = Math.PI / 2;
    sc.updateMatrixWorld(true);
    const bones = {};
    sc.traverse((o) => { if (o.isBone) bones[o.name] = o; });
    clips = sampleClips(gltf, sc, bones);
    // een verse lading in rust (de mixer liet de botten in de laatste stand) voor het retargeten van de UAL-clips
    const fresh = await load(path.join(spec.dir, `${spec.figures[0]}.glb`));
    fresh.scene.rotation.y = Math.PI / 2;
    fresh.scene.updateMatrixWorld(true);
    const fb = {};
    fresh.scene.traverse((o) => { if (o.isBone) fb[o.name] = o; });
    clips.push(...await retargetUAL(fresh.scene, fb));
  }
  return { rest, clips, parts, palette, pos, gp, col, si, sw, idx, heightRef };
}

// Neemt een clip op: setFrame(t) zet de doelbotten op tijd t, daarna leest record de bewaarde botten op 30 beelden per seconde:
// quaternion (Int16) en, als het bot echt verschuift, positie (Float32), plus de hielcontacten bij lopen en rennen.
function record(name, dur, sc, bones, setFrame) {
  const frames = Math.max(2, Math.round(dur * FPS) + 1);
  const quats = new Int16Array(frames * KEEP.length * 4);
  const posAll = KEEP.map(() => new Float32Array(frames * 3));
  const footL = new Float32Array(frames), footR = new Float32Array(frames);
  const tmp = new THREE.Vector3();
  for (let f = 0; f < frames; f++) {
    setFrame(Math.min(dur, (f / (frames - 1)) * dur));
    sc.updateMatrixWorld(true);
    KEEP.forEach((n, b) => {
      const bone = bones[n];
      const q = bone.quaternion.clone().normalize();
      const o = (f * KEEP.length + b) * 4;
      quats[o] = Math.round(q.x * 32767); quats[o + 1] = Math.round(q.y * 32767); quats[o + 2] = Math.round(q.z * 32767); quats[o + 3] = Math.round(q.w * 32767);
      posAll[b].set(bone.position.toArray(), f * 3);
    });
    footL[f] = tmp.setFromMatrixPosition(bones.FootL.matrixWorld).x;
    footR[f] = tmp.setFromMatrixPosition(bones.FootR.matrixWorld).x;
  }
  // welke botten verschuiven: ten opzichte van de rust (REST_POS), niet alleen binnen de clip; een zit-clip houdt het lijf de hele
  // tijd op dezelfde (lagere) plek en moet die plek wel meenemen
  const moving = [];
  posAll.forEach((p, b) => {
    const r = REST_POS[b] || [p[0], p[1], p[2]];
    let span = 0;
    for (let f = 0; f < frames; f++) span = Math.max(span, Math.abs(p[f * 3] - r[0]), Math.abs(p[f * 3 + 1] - r[1]), Math.abs(p[f * 3 + 2] - r[2]));
    if (span > 1e-5) moving.push(b);
  });
  const argmax = (a) => { let m = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[m]) m = i; return m / (frames - 1); };
  return { name, dur, frames, quats, moving, pos: moving.map((b) => posAll[b]), contact: /Walk|Run|Jog|Sprint/.test(name) ? [argmax(footL), argmax(footR)] : null };
}

// ---- Universal Animation Library (CC0, zelfde maker, ander skelet met de UE-namen) ------------------------------------------
// Retarget per beeld: romp, nek, hoofd, schouders, polsen en voeten nemen hun draaiing ten opzichte van de rust over (wereld-delta;
// beide rusthoudingen staan rechtop); bovenarm, onderarm, dij en scheen volgen de richting van het bronbot, zodat elleboog, hand,
// knie en enkel kloppen ook als de armen in rust anders staan. Het lijf schuift mee met het bekken, geschaald op de heuphoogte. De
// voeten hangen bij Quaternius aan de wortel: ze komen op het einde van de scheen.
const UAL_FILE = path.join(ASSETS, 'universal-animation-library', 'pack', 'Universal Animation Library[Standard]', 'Unreal-Godot', 'UAL1_Standard.glb');
// Alleen wat het spel gebruikt; geen spreuken of zwaarden. Death01 mag (besluit eigenaar 23-11, ADR 0051): een val zonder bloed.
export const UAL_CLIPS = ['Idle_Talking_Loop', 'Sprint_Loop', 'Jog_Fwd_Loop', 'Walk_Formal_Loop', 'Crouch_Idle_Loop', 'Crouch_Fwd_Loop', 'Jump_Start', 'Jump_Loop', 'Jump_Land',
  'Sitting_Enter', 'Sitting_Idle_Loop', 'Sitting_Talking_Loop', 'Sitting_Exit', 'Driving_Loop', 'Swim_Fwd_Loop', 'Swim_Idle_Loop', 'PickUp_Table', 'Push_Loop',
  'Hit_Chest', 'Hit_Head', 'Death01', 'Dance_Loop', 'Interact', 'Punch_Jab', 'Punch_Cross', 'Pistol_Idle_Loop', 'Pistol_Shoot'];
const UAL_DELTA = { Body: 'pelvis', Abdomen: 'spine_01', Torso: 'spine_02', Chest: 'spine_03', Neck: 'neck_01', Head: 'Head', ShoulderL: 'clavicle_l', ShoulderR: 'clavicle_r', WristL: 'hand_l', WristR: 'hand_r' };
const UAL_DIR = { UpperArmL: ['LowerArmL', 'upperarm_l', 'lowerarm_l'], LowerArmL: ['WristL', 'lowerarm_l', 'hand_l'], UpperArmR: ['LowerArmR', 'upperarm_r', 'lowerarm_r'], LowerArmR: ['WristR', 'lowerarm_r', 'hand_r'],
  UpperLegL: ['LowerLegL', 'thigh_l', 'calf_l'], LowerLegL: [null, 'calf_l', 'foot_l'], UpperLegR: ['LowerLegR', 'thigh_r', 'calf_r'], LowerLegR: [null, 'calf_r', 'foot_r'] };
const ORDER = ['Body', 'Abdomen', 'Torso', 'Chest', 'Neck', 'Head', 'ShoulderL', 'ShoulderR', 'UpperArmL', 'LowerArmL', 'WristL', 'UpperArmR', 'LowerArmR', 'WristR', 'UpperLegL', 'LowerLegL', 'UpperLegR', 'LowerLegR'];

async function retargetUAL(tgtScene, tgtBones) {
  if (!fs.existsSync(UAL_FILE)) { console.warn('UAL niet gevonden, overgeslagen:', UAL_FILE); return []; }
  const src = await load(UAL_FILE);
  const ss = src.scene;
  ss.rotation.y = Math.PI / 2;
  ss.updateMatrixWorld(true);
  const sb = {};
  ss.traverse((o) => { if (o.isBone) sb[o.name] = o; });
  const restQ = (b) => b.getWorldQuaternion(new THREE.Quaternion());
  const wp = (b) => b.getWorldPosition(new THREE.Vector3());
  const srcRest = Object.fromEntries(Object.keys(sb).map((n) => [n, restQ(sb[n])]));
  const tgtRest = Object.fromEntries(Object.keys(tgtBones).map((n) => [n, restQ(tgtBones[n])]));
  const tgtRestLocal = Object.fromEntries(Object.keys(tgtBones).map((n) => [n, { p: tgtBones[n].position.clone(), q: tgtBones[n].quaternion.clone() }]));
  const srcPelvis0 = wp(sb.pelvis), tgtBody0 = wp(tgtBones.Body);
  const scale = wp(tgtBones.UpperLegL).y / wp(sb.thigh_l).y;
  const shin = { L: wp(tgtBones.LowerLegL).distanceTo(wp(tgtBones.FootL)), R: wp(tgtBones.LowerLegR).distanceTo(wp(tgtBones.FootR)) };
  // de as van de scheen in de assen van het onderbeen (de voet is geen kind): in rust van knie naar enkel
  const shinAxis = Object.fromEntries(['L', 'R'].map((k) => [k, wp(tgtBones['Foot' + k]).sub(wp(tgtBones['LowerLeg' + k])).normalize().applyQuaternion(tgtRest['LowerLeg' + k].clone().invert())]));
  const q = new THREE.Quaternion(), qp = new THREE.Quaternion(), v = new THREE.Vector3(), d = new THREE.Vector3(), t = new THREE.Vector3();
  const setWorldQuat = (bone, wq) => { bone.parent.getWorldQuaternion(qp); bone.quaternion.copy(qp.invert().multiply(wq)); bone.updateMatrixWorld(true); };
  const delta = (srcName, tgtName) => q.copy(restQ(sb[srcName])).multiply(srcRest[srcName].clone().invert()).multiply(tgtRest[tgtName]);
  const out = [];
  for (const name of UAL_CLIPS) {
    const clip = src.animations.find((a) => a.name === name);
    if (!clip) { console.warn('UAL-clip ontbreekt', name); continue; }
    const mixer = new THREE.AnimationMixer(ss);
    mixer.clipAction(clip).play();
    const frame = (time) => {
      mixer.setTime(time);
      ss.updateMatrixWorld(true);
      for (const n of Object.keys(tgtRestLocal)) { tgtBones[n].position.copy(tgtRestLocal[n].p); tgtBones[n].quaternion.copy(tgtRestLocal[n].q); }
      tgtScene.updateMatrixWorld(true);
      // alleen de hoogte van het bekken: de clips staan op hun plek (het spel zet de mens neer), zwemmen ligt dan ook in beeld
      v.copy(wp(sb.pelvis)).sub(srcPelvis0).multiplyScalar(scale); v.x = 0; v.z = 0; v.add(tgtBody0);
      tgtBones.Body.parent.worldToLocal(v);
      tgtBones.Body.position.copy(v);
      tgtBones.Body.updateMatrixWorld(true);
      for (const n of ORDER) {
        if (UAL_DELTA[n]) { setWorldQuat(tgtBones[n], delta(UAL_DELTA[n], n)); continue; }
        const [tc, sa, sbn] = UAL_DIR[n];
        const side = n.endsWith('L') ? 'L' : 'R';
        d.copy(wp(sb[sbn])).sub(wp(sb[sa])).normalize();
        const a = wp(tgtBones[n]);
        if (tc) t.copy(wp(tgtBones[tc])).sub(a).normalize();
        else t.copy(shinAxis[side]).applyQuaternion(restQ(tgtBones[n]));
        const rot = new THREE.Quaternion().setFromUnitVectors(t, d);
        setWorldQuat(tgtBones[n], rot.multiply(restQ(tgtBones[n])));
        if (!tc) {
          const foot = tgtBones['Foot' + side];
          const end = a.clone().addScaledVector(d, shin[side]);
          foot.parent.worldToLocal(end);
          foot.position.copy(end);
          foot.updateMatrixWorld(true);
          setWorldQuat(foot, delta('foot_' + side.toLowerCase(), 'Foot' + side));
        }
      }
    };
    out.push(record('UAL_' + name, clip.duration, tgtScene, tgtBones, frame));
    mixer.stopAllAction();
    mixer.uncacheRoot(ss);
  }
  for (const n of Object.keys(tgtRestLocal)) { tgtBones[n].position.copy(tgtRestLocal[n].p); tgtBones[n].quaternion.copy(tgtRestLocal[n].q); }
  return out;
}

// De clips van het pack zelf (zelfde skelet): gewoon afspelen en opnemen.
function sampleClips(gltf, sc, bones) {
  const out = [];
  for (const want of CLIPS) {
    const clip = gltf.animations.find((a) => a.name.split('|').pop() === want);
    if (!clip) continue;
    const mixer = new THREE.AnimationMixer(sc);
    mixer.clipAction(clip).play();
    out.push(record(want, clip.duration, sc, bones, (t) => mixer.setTime(t)));
    mixer.stopAllAction();
    mixer.uncacheRoot(sc);
  }
  return out;
}

function pack(rigName, r) {
  const chunks = [];
  let off = 0;
  const add = (arr) => { const pad = (4 - (off % 4)) % 4; if (pad) { chunks.push(new Uint8Array(pad)); off += pad; } const u8 = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength); chunks.push(u8); const at = off; off += u8.byteLength; return at; };
  const P = new Int16Array(r.pos.length);
  for (let i = 0; i < r.pos.length; i++) P[i] = Math.max(-32767, Math.min(32767, Math.round(r.pos[i] / POS_Q)));
  const maxIdx = Math.max(...r.parts.map((p) => p.vCount));
  const gi = [], gq = [];
  for (const p of r.parts) {
    p.gStart = gi.length;
    if (p.slot === 'romp') for (let v = p.vStart; v < p.vStart + p.vCount; v++) {
      const q3 = [0, 1, 2].map((k) => Math.max(-32767, Math.min(32767, Math.round(r.gp[v * 3 + k] / POS_Q))));
      if (q3.some((x, k) => x !== P[v * 3 + k])) { gi.push(v); gq.push(...q3); }
    }
    p.gCount = gi.length - p.gStart;
    if (!p.gCount) { delete p.gStart; delete p.gCount; }
  }
  const man = {
    versie: 1, rig: rigName, bron: 'Quaternius, Ultimate Modular ' + (rigName === 'man' ? 'Men' : 'Women') + ' Pack (CC0 1.0), zie docs/ANIMATIE-LICENTIES.md',
    posQ: POS_Q, fps: FPS, hoofdhoogte: +r.heightRef.toFixed(4), schaal: RIGS[rigName].schaal, variatie: RIGS[rigName].variatie,
    armature: r.rest.armature, bones: r.rest.bones, palette: r.palette,
    parts: r.parts, vertices: r.pos.length / 3,
    offsets: {
      pos: add(P), col: add(Uint8Array.from(r.col)), si: add(Uint8Array.from(r.si)), sw: add(Uint8Array.from(r.sw)),
      idx: add(maxIdx < 65536 ? Uint16Array.from(r.idx) : Uint32Array.from(r.idx)),
      gripIdx: add(Uint32Array.from(gi)), gripPos: add(Int16Array.from(gq)),
    },
    grip: gi.length,
    idx32: maxIdx >= 65536,
    clips: [],
  };
  for (const c of r.clips) {
    const entry = { name: c.name, dur: +c.dur.toFixed(4), frames: c.frames, moving: c.moving, contact: c.contact, quats: add(c.quats), pos: c.pos.map((p) => add(p)) };
    man.clips.push(entry);
  }
  const bin = Buffer.concat(chunks.map((u) => Buffer.from(u.buffer, u.byteOffset, u.byteLength)));
  return { man, bin };
}

const report = [];
for (const rig of Object.keys(RIGS)) {
  if (ONLY && rig !== ONLY) continue;
  const r = await importRig(rig);
  const { man, bin } = pack(rig, r);
  const json = JSON.stringify(man);
  const bySlot = {};
  for (const p of r.parts) (bySlot[p.slot] = bySlot[p.slot] || []).push(p.tris);
  const avg = (a) => (a.reduce((s, x) => s + x, 0) / a.length).toFixed(0);
  const lodSum = (L) => r.parts.reduce((s2, p) => s2 + (L ? p.lods[L - 1].tris : p.tris), 0);
  report.push(`${rig} LOD-driehoeken (alle delen): LOD0 ${lodSum(0)}, LOD1 ${lodSum(1)} (-${(100 - 100 * lodSum(1) / lodSum(0)).toFixed(0)}%), LOD2 ${lodSum(2)} (-${(100 - 100 * lodSum(2) / lodSum(0)).toFixed(0)}%)`);
  report.push(`${rig}: ${r.parts.length} delen (${Object.entries(bySlot).map(([s, a]) => `${s} ${a.length}x gem ${avg(a)} drh`).join(', ')}), ${man.vertices} vertices, palet ${r.palette.length}, ${man.clips.length} clips (${man.clips.map((c) => `${c.name} ${c.dur}s`).join(', ')}), grijphand ${man.grip} vertices, bin ${(bin.length / 1024).toFixed(0)} kB + json ${(json.length / 1024).toFixed(0)} kB`);
  if (WRITE) {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, `${rig}.bin`), bin);
    fs.writeFileSync(path.join(OUT, `${rig}.json`), json);
  }
}
console.log(report.join('\n'));
if (!WRITE) console.log('(proefdraai: --write schrijft game/models/mensen/)');
