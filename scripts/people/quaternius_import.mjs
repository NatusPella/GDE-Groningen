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
export const RIGS = {
  man: { dir: path.join(ASSETS, 'ultimate-modular-men', 'glb'), figures: ['Casual Character', 'Hoodie Character', 'Business Man', 'Worker', 'Farmer', 'Punk', 'Beach Character'] },
  vrouw: { dir: path.join(ASSETS, 'ultimate-modular-women', 'pack'), figures: ['Animated Woman', 'Animated Woman-nIItLV9nxS', 'Suit', 'Worker', 'Punk', 'Adventurer'] },
};
export const KEEP = ['Root', 'Body', 'Hips', 'Abdomen', 'Torso', 'Chest', 'Neck', 'Head', 'ShoulderL', 'UpperArmL', 'LowerArmL', 'WristL', 'ShoulderR', 'UpperArmR', 'LowerArmR', 'WristR', 'UpperLegL', 'LowerLegL', 'UpperLegR', 'LowerLegR', 'FootL', 'FootR'];
export const CLIPS = ['Idle', 'Idle_Neutral', 'Walk', 'Run', 'Wave', 'Interact'];
const FPS = 30;
// m: LOD 1 en LOD 2 per vak (LOD 0 = het gelaste origineel); het hoofd fijner, anders verdwijnen haar en gezicht als eerste
export const LOD_CELLS = { hoofd: [0.016, 0.036], romp: [0.046, 0.1], benen: [0.046, 0.1], voeten: [0.038, 0.085] };
const POS_Q = 1 / 8192;          // m per eenheid (Int16: +-4 m)
const SLOT = (name) => /_head$/i.test(name) || /_Head$/.test(name) ? 'hoofd' : /_Body$/i.test(name) ? 'romp' : /_(Legs|Pants)$/i.test(name) ? 'benen' : /_Feet$/i.test(name) ? 'voeten' : null;

async function load(file) {
  const buf = fs.readFileSync(file);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Promise((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
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
  // Zonder normalen en uv's zijn naden overbodig: vertices met dezelfde (gekwantiseerde) plek, kleur en huid worden er één,
  // en driehoeken die daardoor wegvallen (twee hoeken op één plek) gaan eruit.
  const weld = (vStart, iStart) => {
    const n = pos.length / 3 - vStart, map = new Int32Array(n), keys = new Map();
    const np = [], nc = [], nsi = [], nsw = [];
    for (let i = 0; i < n; i++) {
      const g = vStart + i;
      const key = `${Math.round(pos[g * 3] / POS_Q)},${Math.round(pos[g * 3 + 1] / POS_Q)},${Math.round(pos[g * 3 + 2] / POS_Q)},${col[g]},${si.slice(g * 4, g * 4 + 4)},${sw.slice(g * 4, g * 4 + 4)}`;
      let j = keys.get(key);
      if (j === undefined) { j = np.length / 3; keys.set(key, j); np.push(pos[g * 3], pos[g * 3 + 1], pos[g * 3 + 2]); nc.push(col[g]); for (let k = 0; k < 4; k++) { nsi.push(si[g * 4 + k]); nsw.push(sw[g * 4 + k]); } }
      map[i] = j;
    }
    const tri = idx.splice(iStart).map((i) => map[i]);
    for (let t = 0; t < tri.length; t += 3) if (tri[t] !== tri[t + 1] && tri[t + 1] !== tri[t + 2] && tri[t] !== tri[t + 2]) idx.push(tri[t], tri[t + 1], tri[t + 2]);
    pos.length = vStart * 3; col.length = vStart; si.length = vStart * 4; sw.length = vStart * 4;
    pos.push(...np); col.push(...nc); si.push(...nsi); sw.push(...nsw);
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
    for (const a of acc) { pos.push(a.x / a.n, a.y / a.n, a.z / a.n); col.push(col[a.g]); for (let k = 0; k < 4; k++) { si.push(si[a.g * 4 + k]); sw.push(sw[a.g * 4 + k]); } }
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
    }
    const v = new THREE.Vector3(), c = new THREE.Color();
    const byPart = new Map();
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
  }
  return { rest, clips, parts, palette, pos, col, si, sw, idx, heightRef };
}

// Elke clip op 30 beelden per seconde, voor de bewaarde botten: quaternion (Int16) en, als het bot echt verschuift, positie (Float32).
function sampleClips(gltf, sc, bones) {
  const out = [];
  for (const want of CLIPS) {
    const clip = gltf.animations.find((a) => a.name.split('|').pop() === want);
    if (!clip) continue;
    const mixer = new THREE.AnimationMixer(sc);
    const act = mixer.clipAction(clip);
    act.play();
    const frames = Math.max(2, Math.round(clip.duration * FPS) + 1);
    const quats = new Int16Array(frames * KEEP.length * 4);
    const posAll = KEEP.map(() => new Float32Array(frames * 3));
    const footL = new Float32Array(frames), footR = new Float32Array(frames);
    const tmp = new THREE.Vector3();
    for (let f = 0; f < frames; f++) {
      mixer.setTime(Math.min(clip.duration, (f / (frames - 1)) * clip.duration));
      sc.updateMatrixWorld(true);
      KEEP.forEach((n, b) => {
        const bone = bones[n];
        const q = bone.quaternion;
        const o = (f * KEEP.length + b) * 4;
        quats[o] = Math.round(q.x * 32767); quats[o + 1] = Math.round(q.y * 32767); quats[o + 2] = Math.round(q.z * 32767); quats[o + 3] = Math.round(q.w * 32767);
        posAll[b].set(bone.position.toArray(), f * 3);
      });
      footL[f] = tmp.setFromMatrixPosition(bones.FootL.matrixWorld).x;
      footR[f] = tmp.setFromMatrixPosition(bones.FootR.matrixWorld).x;
    }
    // welke botten verschuiven (wortel, heup, voeten): alleen die krijgen posities mee
    const moving = [];
    posAll.forEach((p, b) => {
      let span = 0;
      for (let f = 1; f < frames; f++) span = Math.max(span, Math.abs(p[f * 3] - p[0]), Math.abs(p[f * 3 + 1] - p[1]), Math.abs(p[f * 3 + 2] - p[2]));
      if (span > 1e-5) moving.push(b);
    });
    // hielcontact: de voet het verst naar voren (fase 0..1)
    const argmax = (a) => { let m = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[m]) m = i; return m / (frames - 1); };
    out.push({ name: want, dur: clip.duration, frames, quats, moving, pos: moving.map((b) => posAll[b]), contact: /Walk|Run/.test(want) ? [argmax(footL), argmax(footR)] : null });
    mixer.stopAllAction();
    mixer.uncacheRoot(sc);
  }
  // terug in rust (de mixer liet de botten in de laatste stand)
  return out;
}

function pack(rigName, r) {
  const chunks = [];
  let off = 0;
  const add = (arr) => { const pad = (4 - (off % 4)) % 4; if (pad) { chunks.push(new Uint8Array(pad)); off += pad; } const u8 = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength); chunks.push(u8); const at = off; off += u8.byteLength; return at; };
  const P = new Int16Array(r.pos.length);
  for (let i = 0; i < r.pos.length; i++) P[i] = Math.max(-32767, Math.min(32767, Math.round(r.pos[i] / POS_Q)));
  const maxIdx = Math.max(...r.parts.map((p) => p.vCount));
  const man = {
    versie: 1, rig: rigName, bron: 'Quaternius, Ultimate Modular ' + (rigName === 'man' ? 'Men' : 'Women') + ' Pack (CC0 1.0), zie docs/ANIMATIE-LICENTIES.md',
    posQ: POS_Q, fps: FPS, hoofdhoogte: +r.heightRef.toFixed(4),
    armature: r.rest.armature, bones: r.rest.bones, palette: r.palette,
    parts: r.parts, vertices: r.pos.length / 3,
    offsets: {
      pos: add(P), col: add(Uint8Array.from(r.col)), si: add(Uint8Array.from(r.si)), sw: add(Uint8Array.from(r.sw)),
      idx: add(maxIdx < 65536 ? Uint16Array.from(r.idx) : Uint32Array.from(r.idx)),
    },
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
  report.push(`${rig}: ${r.parts.length} delen (${Object.entries(bySlot).map(([s, a]) => `${s} ${a.length}x gem ${avg(a)} drh`).join(', ')}), ${man.vertices} vertices, palet ${r.palette.length}, ${man.clips.length} clips (${man.clips.map((c) => `${c.name} ${c.dur}s`).join(', ')}), bin ${(bin.length / 1024).toFixed(0)} kB + json ${(json.length / 1024).toFixed(0)} kB`);
  if (WRITE) {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, `${rig}.bin`), bin);
    fs.writeFileSync(path.join(OUT, `${rig}.json`), json);
  }
}
console.log(report.join('\n'));
if (!WRITE) console.log('(proefdraai: --write schrijft game/models/mensen/)');
