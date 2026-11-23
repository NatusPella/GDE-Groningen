// Inventaris van een Quaternius-pack (ADR 0050): per .glb het skelet (botten en hiërarchie), de animatieclips (naam, lengte,
// kanalen), de meshes (driehoeken, vertices, materialen, delen) en de draw calls. Leest alleen de JSON-chunk; schrijft niets.
//   node scripts/people/quaternius_inventaris.mjs [map met .glb] [--json]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const DIR = process.argv.slice(2).find((a) => !a.startsWith('--')) || path.join(os.homedir(), 'gde-assets', 'quaternius', 'ultimate-modular-men', 'glb');
const JSON_OUT = process.argv.includes('--json');

export function readGlbJson(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file}: geen glb`);
  const len = buf.readUInt32LE(12);
  return { json: JSON.parse(buf.toString('utf8', 20, 20 + len)), bytes: buf.length };
}

export function inventory(json) {
  const acc = json.accessors || [];
  const skin = (json.skins || [])[0];
  const names = (json.nodes || []).map((n) => n.name);
  const joints = skin ? skin.joints.map((j) => names[j]) : [];
  const parent = {};
  (json.nodes || []).forEach((n, i) => (n.children || []).forEach((c) => (parent[c] = i)));
  const tree = skin ? skin.joints.map((j) => [names[j], parent[j] !== undefined ? names[parent[j]] : null]) : [];
  const clips = (json.animations || []).map((a) => {
    let dur = 0;
    for (const s of a.samplers) { const m = acc[s.input].max; if (m) dur = Math.max(dur, m[0]); }
    return { name: a.name, dur: +dur.toFixed(3), channels: a.channels.length, keys: a.samplers.reduce((k, s) => k + acc[s.input].count, 0) };
  });
  const meshes = (json.meshes || []).map((m) => {
    let tris = 0, verts = 0;
    for (const p of m.primitives) { tris += (p.indices !== undefined ? acc[p.indices].count : acc[p.attributes.POSITION].count) / 3; verts += acc[p.attributes.POSITION].count; }
    return { name: m.name, prims: m.primitives.length, tris, verts, materials: m.primitives.map((p) => (json.materials || [])[p.material]?.name) };
  });
  const materials = (json.materials || []).map((m) => ({ name: m.name, color: (m.pbrMetallicRoughness && m.pbrMetallicRoughness.baseColorFactor || []).map((v) => +v.toFixed(3)), texture: !!(m.pbrMetallicRoughness && m.pbrMetallicRoughness.baseColorTexture) }));
  return { joints, tree, clips, meshes, materials, tris: meshes.reduce((s, m) => s + m.tris, 0), drawcalls: meshes.reduce((s, m) => s + m.prims, 0) };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('quaternius_inventaris.mjs')) {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.glb')).sort();
  const all = {};
  for (const f of files) {
    const { json, bytes } = readGlbJson(path.join(DIR, f));
    all[f] = { bytes, ...inventory(json) };
  }
  if (JSON_OUT) { console.log(JSON.stringify(all, null, 1)); process.exit(0); }
  for (const [f, v] of Object.entries(all)) {
    console.log(`${f}: ${(v.bytes / 1024).toFixed(0)} kB, ${v.joints.length} botten, ${v.clips.length} clips, ${v.meshes.length} meshes / ${v.drawcalls} primitieven, ${v.tris} driehoeken, materialen: ${v.materials.map((m) => m.name + (m.texture ? '(tex)' : '')).join(', ')}`);
    console.log('   delen: ' + v.meshes.map((m) => `${m.name} ${m.tris}`).join(', '));
  }
  const first = Object.values(all)[0];
  if (first) {
    console.log('\nskelet (bot <- ouder): ' + first.tree.map(([b, p]) => `${b}<-${p}`).join(', '));
    console.log('\nclips: ' + first.clips.map((c) => `${c.name} ${c.dur}s`).join(', '));
    const same = Object.values(all).every((v) => JSON.stringify(v.joints) === JSON.stringify(first.joints));
    console.log(`\nzelfde skelet in alle figuren: ${same ? 'ja' : 'nee'}`);
  }
}
