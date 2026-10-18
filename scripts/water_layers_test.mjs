// Dubbel water (#231): the far LOD's flat water of the streamed tiles lay on the ground over the real water
// (the ground shader's opening and the animated surface at WATER_Y). It is drawn only beyond STREAM_WATER_R now;
// the audit counts where tile rows lie over each other.
//   node scripts/water_layers_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

const F = await import('../game/js/farlod.js');
const TM = await import('../game/js/tilewatermask.js');
const A = await import('./world/water_layers_audit.mjs');

// the flat stream water is discarded inside the radius, in the fragment shader, by the distance to the player
const m = F.waterStreamMaterial();
const shader = { uniforms: {}, vertexShader: '#include <common>\n#include <project_vertex>\nvoid main(){}', fragmentShader: '#include <common>\nvoid main() {\n}' };
m.onBeforeCompile(shader);
ok(/discard/.test(shader.fragmentShader) && /uLodWaterR/.test(shader.fragmentShader) && shader.uniforms.uLodWaterR && shader.uniforms.uLodPlayer, 'the stream water material discards near the player');
ok(shader.uniforms.uLodWaterR.value === F.STREAM_WATER_R, 'by STREAM_WATER_R');
ok(F.STREAM_WATER_R >= TM.MASK_SIZE && F.STREAM_WATER_R < TM.FAR_SIZE / 2, 'which is beyond the fine mask and inside the far mask (the ground paints the water there)', `${F.STREAM_WATER_R} vs ${TM.MASK_SIZE}..${TM.FAR_SIZE / 2}`);
const src = fs.readFileSync(new URL('../game/js/farlod.js', import.meta.url), 'utf8');
ok(/t\.stream && name === 'water' \? 'waterStream'/.test(src), 'a streamed tile uses it for its water');
ok(!/water: groundMaterial\(0\.3, true\),\s*\n\s*\};/.test(src), 'and the plain near water material is not the last word');

// the pure area functions
const sq = (x, y, s) => ({ pts: [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]] });
const box = [0, 0, 400, 400];
const one = A.doubleArea([sq(0, 0, 100)], box);
ok(Math.abs(one.covered - 10000) < 400 && one.double === 0, 'one polygon covers its area, nothing twice', JSON.stringify(one));
const two = A.doubleArea([sq(0, 0, 100), sq(50, 0, 100)], box);
ok(Math.abs(two.double - 5000) < 400 && Math.abs(two.covered - 15000) < 600, 'two overlapping: the overlap is double', JSON.stringify(two));
const apart = A.doubleArea([sq(0, 0, 100), sq(200, 0, 100)], box);
ok(apart.double === 0, 'apart: no double');
const adj = A.doubleArea([sq(0, 0, 100), sq(100, 0, 100)], box);
ok(adj.double <= 4 * 100 * 4, 'abutting rows are no overlap beyond a cell', String(adj.double));
ok(Math.abs(A.overlapArea([sq(0, 0, 100)], [sq(50, 50, 100)], box) - 2500) < 300, 'two lists: the part both have');

// the real tiles
const out = new URL('../game/world/', import.meta.url);
if (fs.existsSync(new URL('index-provincie.json', out))) {
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, [new URL('./world/water_layers_audit.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), '--json'], { encoding: 'utf8' });
  const j = JSON.parse(r.stdout);
  ok(j.total.tiles > 1000 && j.total.doubleShare < A.LIMITS.doubleShare, 'tile rows over each other stay under the limit', `${(j.total.doubleShare * 100).toFixed(2)} %`);
  ok(j.total.cityOverShare <= A.LIMITS.cityOverShare, 'the city map does not lie over the province tiles', `${(j.total.cityOverShare * 100).toFixed(2)} %`);
  ok(j.total.flatOnly === 0, 'no tile row without nav (the old flat layer)', String(j.total.flatOnly));
} else console.log('SKIP the real tiles: no game/world with the province layer');

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
