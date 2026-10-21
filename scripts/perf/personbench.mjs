// What building a person costs (buildPersonMesh, the SkinBuilder): CPU per mesh in Node, and a hash of the geometry so a faster builder can be shown to
// make the same vertices (r46, #246: the walk through the city builds 8 to 10 people a second, ~3 ms each).
//   node scripts/perf/personbench.mjs [--n=400] [--hash]    (needs desktop/vendor-cache, see scripts/node3d.mjs)
import '../node3d.mjs';
import crypto from 'node:crypto';
const N = Number((process.argv.find((a) => a.startsWith('--n=')) || '--n=400').slice(4));
const { buildPersonMesh } = await import('../../game/js/models3d_people.js');
const SHIRTS = [0xc0392b, 0x2980b9, 0x27ae60, 0xf39c12, 0x8e44ad, 0x16a085, 0xd35400, 0x7f8c8d];
const SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];
const build = (i) => buildPersonMesh(SHIRTS[i % SHIRTS.length], SKINS[(i * 7) % SKINS.length], { seed: 1000 + i * 17 });
for (let i = 0; i < 40; i++) build(i); // warm up the JIT
const t0 = performance.now();
const hash = crypto.createHash('sha1');
let tris = 0;
const times = [];
for (let i = 0; i < N; i++) {
  const t = performance.now();
  const g = build(i);
  times.push(performance.now() - t);
  const geo = g.children.find((c) => c.isSkinnedMesh).geometry;
  tris += geo.attributes.position.count / 3;
  if (process.argv.includes('--hash') || i < 64) for (const k of ['position', 'normal', 'color', 'uv', 'skinIndex', 'skinWeight']) hash.update(Buffer.from(geo.attributes[k].array.buffer, geo.attributes[k].array.byteOffset, geo.attributes[k].array.byteLength));
}
times.sort((a, b) => a - b);
console.log(`n ${N}  mean ${((performance.now() - t0) / N).toFixed(3)} ms  median ${times[N >> 1].toFixed(3)}  p10 ${times[Math.floor(N * 0.1)].toFixed(3)}  p90 ${times[Math.floor(N * 0.9)].toFixed(3)}  triangles/person ${(tris / N).toFixed(0)}  hash ${hash.digest('hex').slice(0, 16)}`);
