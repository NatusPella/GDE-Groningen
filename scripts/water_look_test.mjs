// One water look for the city and the province (#87, #181): the water mesh's
// material and the terrain shader's far water read the same tones and timing
// (watertones.js), the quality profiles drive the one material, and an audit
// finds water polygon meshes that do not wear the shared material.
//   node scripts/water_look_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
const W = await import('../game/js/water3d.js');
const T = await import('../game/js/watertones.js');
const CF = await import('../game/js/countryfield.js');

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };
const TONES = T.WATER_TONES;

// the mesh material takes everything from the tones
const m = W.sharedWaterMaterial();
const u = m.uniforms;
ok(m === W.sharedWaterMaterial(), 'one shared material for every water polygon (city and tiles)');
ok(u.uDeepColor.value.getHex() === TONES.deep && u.uShallowColor.value.getHex() === TONES.shallow, 'deep and shallow tones come from watertones');
ok(u.uDuckweedColor.value.getHex() === TONES.duckweed && u.uFoamColor.value.getHex() === TONES.foam, 'duckweed and foam tones too');
ok(u.uOpacity.value === TONES.opacity && u.uWave.value === TONES.wave, 'opacity and swell too');
W.updateWaterMaterial(m, 12, 1, 0);
ok(Math.abs(u.uWave.value - (TONES.wave + TONES.waveRain)) < 1e-9 && W.waterSwellAmp() === u.uWave.value, 'rain raises the swell by the shared amount');

// the terrain shader's far water is written from the same tones
const glsl = CF.COUNTRY_GLSL;
for (const k of ['shallow', 'deep', 'duckweed']) ok(glsl.includes(T.glslTone(TONES[k])), `far water uses the ${k} tone`);
ok(glsl.includes(`uWaterNear.w * ${TONES.sheen[0].toFixed(2)}`), 'far water drifts its sheen at the shared speed');
ok(!/cLin\(44\.0, 74\.0, 56\.0\)|cLin\(11\.0, 36\.0, 32\.0\)|cLin\(93\.0, 127\.0, 44\.0\)/.test(fs.readFileSync(new URL('../game/js/countryfield.js', import.meta.url), 'utf8')), 'no hand-copied water tones left in the terrain shader');
const rgb = T.rgb255(0x2c4a38);
ok(rgb[0] === 44 && rgb[1] === 74 && rgb[2] === 56, 'rgb255');

// the shader source reads the shared timing too
const src = fs.readFileSync(new URL('../game/js/water3d.js', import.meta.url), 'utf8');
ok(T.WATER_SHARED_GLSL.includes(TONES.flowRate.toFixed(3)) && T.WATER_SHARED_GLSL.includes(TONES.deepTo.toFixed(3)), 'the shared GLSL takes flow rate and depth range from the tones');

// the surface maths is one chunk of GLSL, included by the mesh shader and the terrain's far water
ok(glsl.includes(T.WATER_SHARED_GLSL), 'the terrain shader includes the shared water GLSL');
ok(/WATER_SHARED_GLSL/.test(src) && !/float hash2\(vec2 p\) \{|vec2 rainRipple\(/.test(src), 'the mesh shader includes it and has no copy of the noise or ripples');
for (const fn of ['wtrNormal(', 'wtrFoam(', 'wtrDeep(']) ok(glsl.includes(fn) && src.includes(fn), `both shaders call ${fn}`);
ok(/followWaterQuality\(/.test(fs.readFileSync(new URL('../game/js/terrain3d.js', import.meta.url), 'utf8')), 'the terrain material follows the water quality profile');
ok(glsl.includes('#ifndef WATER_Q'), 'the far water has a default profile');

// quality profiles: the one material's WATER_Q define
ok(m.defines.WATER_Q === 2, 'high quality is the default profile of the shared material');

// the audit: a water group whose surface is not the shared material is counted
{
  const root = new THREE.Group();
  const mk = (x, mat) => { const g = new THREE.Group(); g.name = 'water'; g.position.set(x, 0, 0); g.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)); root.add(g); };
  mk(0, m); mk(10, m); mk(20, new THREE.MeshBasicMaterial());
  const a = W.auditWaterMeshes(root, m);
  ok(a.total === 3 && a.shared === 2 && a.stray.length === 1 && a.stray[0] === 'water@20,0', 'the audit finds the polygon with its own material', JSON.stringify(a));
  ok(W.auditWaterMeshes(new THREE.Group(), m).total === 0, 'an empty scene audits clean');
}

// and they compile (headless Chrome, all three profiles) when Chrome is there
{
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, [new URL('./shader_check.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')], { encoding: 'utf8', timeout: 120000 });
  const outp = (r.stdout || '').trim();
  if (/^SKIP/m.test(outp)) console.log('shader compile: ' + outp.split(/\r?\n/)[0]);
  else ok(r.status === 0 && /shaders compile/.test(outp), 'both shaders compile at Laag, Gem. and Hoog', outp.slice(-300));
}

console.log(fails ? `${fails} of ${n} FAILED` : `${n} water look checks passed`);
process.exit(fails ? 1 : 0);
