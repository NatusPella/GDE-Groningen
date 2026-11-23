// Silhouette check against the reference: the hare and the eel in a straight side view, with bars in the reference sizes next to
// them (hare: head and body 0.55 m, schoft 0.28 m, ear 0.12 m, hind foot 0.15 m; eel: length 0.6 m, body depth 2.5 to 4% of the
// length). Software render without Electron.   node scripts/soort_referentie.mjs <out.png>
import './node3d.mjs';
import fs, { writeFileSync } from 'node:fs';
import { renderGeometry } from './lib/kleding_clip_png.mjs';
import { bakeColoured } from './lib/glb_node.mjs';
const THREE = await import('three');
const W = await import('../game/js/wildlife.js');
const FM = await import('../game/js/fishmodels.js');
const out = process.argv[2] || 'soort_referentie.png';
const all = { pos: [], col: [] };
// a bar: from (x0, y0) to (x1, y1), thickness t, colour [r, g, b]
const bar = (x0, y0, x1, y1, t, c) => {
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * t / 2, ny = (dx / l) * t / 2;
  const q = [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]];
  for (const [a, b, d] of [[0, 1, 2], [0, 2, 3]]) for (const k of [a, b, d]) { all.pos.push(q[k][0], q[k][1], 0.5); all.col.push(...c); }
};
const red = [0.75, 0.15, 0.1], blue = [0.1, 0.3, 0.7];
// the hare, standing, and the reference bars
const haas = W.buildHareMesh3D(0);
W.animateWildlifeMesh3D(haas, { kind: 'haas', bobSeed: 0.3, angle: 0, speed: 0 }, 12);
haas.updateMatrixWorld(true);
bakeColoured(haas, all);
bar(-0.275, -0.03, 0.275, -0.03, 0.006, red);        // head and body 0.55 m (nose at +x, centred)
bar(-0.31, 0, -0.31, 0.28, 0.006, red);              // schoft 0.28 m
bar(-0.18, -0.05, -0.03, -0.05, 0.006, blue);        // hind foot 0.15 m
bar(0.33, 0.27, 0.33, 0.39, 0.006, blue);            // ear 0.12 m
// the eel, swimming straight, under it
const paling = FM.buildFishModel('paling');
paling.position.set(0, -0.25, 0);
FM.animateFishModel(paling, { state: 'zwem', speed: 0 }, 0);
paling.updateMatrixWorld(true);
bakeColoured(paling, all);
bar(-0.3, -0.29, 0.3, -0.29, 0.006, red);            // 0.6 m
bar(0.34, -0.25 - 0.012, 0.34, -0.25 + 0.012, 0.004, blue);   // 4% of the length (the thickest an eel is)
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(all.pos), 3));
geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(all.col), 3));
writeFileSync(out, renderGeometry(geo, { view: 'zij', box: [-0.4, -0.33, 0.42, 0.42], ppm: 1800 }));
console.log('klaar', out);
