// Measures .glb models straight from their glTF JSON (no 3D library needed): triangles, primitives (draw calls), materials,
// bones per skin, and every animation clip with its name and length in seconds.
//   node scripts/glb_meting.mjs <file-or-folder> [...] [--json]
// Only reads the files; models from outside the repo (e.g. C:\Users\...\gde-assets) are passed as paths, nothing is executed.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export function readGlbJson(file) {
  const buf = readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file}: geen glb`);
  const len = buf.readUInt32LE(12);
  return JSON.parse(buf.toString('utf8', 20, 20 + len));
}

export function measureGlb(file) {
  const j = readGlbJson(file);
  const acc = j.accessors || [];
  let tris = 0, prims = 0;
  for (const m of j.meshes || []) for (const p of m.primitives) {
    prims++;
    const mode = p.mode ?? 4;
    const n = p.indices !== undefined ? acc[p.indices].count : acc[p.attributes.POSITION].count;
    if (mode === 4) tris += n / 3;
  }
  const clips = (j.animations || []).map((a) => {
    let dur = 0;
    for (const s of a.samplers) { const inp = acc[s.input]; if (inp && inp.max) dur = Math.max(dur, inp.max[0]); }
    return { name: a.name, dur: Math.round(dur * 100) / 100 };
  });
  return {
    file: path.basename(file), kb: Math.round(statSync(file).size / 1024), tris: Math.round(tris), prims, materials: (j.materials || []).length,
    textures: (j.textures || []).length, bones: (j.skins || []).map((s) => s.joints.length), clips,
  };
}

if ((process.argv[1] || '').endsWith('glb_meting.mjs')) {
  const args = process.argv.slice(2), json = args.includes('--json');
  const files = [];
  for (const a of args.filter((x) => x !== '--json')) {
    if (statSync(a).isDirectory()) for (const f of readdirSync(a)) { if (f.endsWith('.glb')) files.push(path.join(a, f)); }
    else files.push(a);
  }
  const out = files.map(measureGlb);
  if (json) console.log(JSON.stringify(out, null, 1));
  else for (const r of out) console.log(`${r.file.padEnd(22)} ${String(r.tris).padStart(6)} tri ${String(r.prims).padStart(2)} prim ${String(r.materials).padStart(2)} mat ${String(r.textures)} tex botten ${r.bones.join('/') || '-'} ${r.kb} kB | ${r.clips.map((c) => `${c.name} ${c.dur}s`).join(', ')}`);
}
