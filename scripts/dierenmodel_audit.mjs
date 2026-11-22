import './node3d.mjs';
const W = await import('../game/js/wildlife.js');
const out = {};
const kinds = [['cow',{bobSeed:0.3}],['cow',{bobSeed:2,variant:'red'}],['sheep',{}],['duck',{variant:'drake'}],['duck',{variant:'hen'}],['duck',{variant:'swan'}],['duck',{variant:'goose'}],['gans',{}],['reiger',{}],['zeehond',{}],['vis',{}],['pigeon',{bobSeed:0.2}],['seagull',{}],['cat',{variant:1}],['dog',{breed:1,color:0.4}]];
for (const [k, a] of kinds) {
  const g = W.buildWildlifeMesh3D({ kind: k, ...a });
  let tris = 0, meshes = 0, bad = 0; const bb = new (await import('three')).Box3();
  g.updateMatrixWorld(true);
  g.traverse((o) => { if (o.geometry) { meshes++; const p = o.geometry.attributes.position; tris += (o.geometry.index ? o.geometry.index.count : p.count) / 3; for (let i = 0; i < p.array.length; i++) if (!Number.isFinite(p.array[i])) bad++; } });
  bb.setFromObject(g);
  console.log(k, a.variant || '', 'tris', tris, 'meshes', meshes, 'bad', bad, 'size', bb.getSize(new bb.min.constructor()).toArray().map(v=>+v.toFixed(2)).join('x'));
}
