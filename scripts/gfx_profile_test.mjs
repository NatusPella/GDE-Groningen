// node scripts/gfx_profile_test.mjs: the GPU classification, the first-run
// advice and the benchmark recommendation (game/js/gfxprofile.js).
import { classifyGpu, adviseFromSample, recommendPreset, describePreset, describeChanges, noteFrame, resetDynamic, dynamicScale, cpuLevel, currentPreset, isDefaultGfx, mobileProfileFor, MOBILE_PROFILES } from '../game/js/gfxprofile.js';
import { VIEW_DISTANCES, viewDistanceFor, propRadius } from '../game/js/viewdist.js';

let fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};
const tier = (renderer, extra = {}) => classifyGpu({ renderer, maxTexture: 16384, cores: 8, memory: 8, ...extra }).tier;

const GPUS = [
  ['ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)', 'laag'],
  ['ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)', 'laag'],
  ['ANGLE (Intel, Intel(R) HD Graphics 520 Direct3D11 vs_5_0 ps_5_0, D3D11)', 'laag'],
  ['ANGLE (Intel, Mesa Intel(R) UHD Graphics 600 (GLK 2), OpenGL 4.6)', 'laag'],
  ['ANGLE (Intel, Intel(R) Arc(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)', 'middel'],
  ['ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)', 'hoog'],
  ['ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)', 'laag'],
  ['ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)', 'laag'],
  ['Mali-G52', 'laag'],
  ['ANGLE (Qualcomm, Adreno (TM) 618, OpenGL ES 3.2)', 'laag'],
  ['ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)', 'middel'],
  ['ANGLE (AMD, AMD Radeon RX 6600 Direct3D11 vs_5_0 ps_5_0, D3D11)', 'hoog'],
  ['ANGLE (NVIDIA, NVIDIA GeForce MX250 Direct3D11 vs_5_0 ps_5_0, D3D11)', 'middel'],
  ['ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Laptop GPU Direct3D11 vs_5_0 ps_5_0, D3D11)', 'hoog'],
  ['ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)', 'hoog'],
  ['', 'hoog'],
];
for (const [r, want] of GPUS) eq(r || '(masked)', tier(r), want);
eq('RTX on 4 cores', tier('NVIDIA GeForce RTX 3060', { cores: 4 }), 'middel');
eq('RTX with 4 GB', tier('NVIDIA GeForce RTX 3060', { memory: 4 }), 'middel');
eq('2 cores', tier('NVIDIA GeForce RTX 3060', { cores: 2 }), 'laag');
eq('small textures', tier('Apple M1', { maxTexture: 4096 }), 'laag');

eq('weak GPU, slow frames', adviseFromSample('laag', 45, 'hoog'), 'laag');
eq('weak GPU, smooth frames', adviseFromSample('laag', 15, 'hoog'), 'middel');
eq('strong GPU, smooth', adviseFromSample('hoog', 16, 'hoog'), null);
eq('strong GPU, busy machine', adviseFromSample('hoog', 25, 'hoog'), 'middel');
eq('already laag', adviseFromSample('laag', 45, 'laag'), null);

eq('rec: hoog smooth', recommendPreset({ hoog: 60, middel: 61, laag: 62 }, 'hoog'), null);
eq('rec: laag only smooth', recommendPreset({ hoog: 23, middel: 35, laag: 56 }, 'hoog'), 'laag');
eq('rec: nothing smooth', recommendPreset({ hoog: 12, middel: 18, laag: 30 }, 'hoog'), 'laag');
eq('rec: room to go up', recommendPreset({ hoog: 70, middel: 90, laag: 120 }, 'laag'), 'hoog');
eq('rec: one measured', recommendPreset({ hoog: 40 }, 'hoog'), null);

eq('describe laag', describePreset('laag'), 'schaduwen uit · resolutie 75%, automatisch · zichtafstand kort');
eq('describe hoog', describePreset('hoog'), 'schaduwen aan · resolutie 100%, automatisch · zichtafstand heel ver');
const OLD_HOOG = { quality: 'hoog', shadows: true, drawDistance: 'ver', resolution: 1, autoResolution: true };
eq('default (old hoog) is no preset', currentPreset(OLD_HOOG), null);
eq('default is the default', isDefaultGfx(OLD_HOOG), true);
eq('hoog is hoog', currentPreset({ ...OLD_HOOG, drawDistance: 'heelver' }), 'hoog');
eq('hoog is not the default', isDefaultGfx({ ...OLD_HOOG, drawDistance: 'heelver' }), false);
eq('changes old hoog->hoog', describeChanges('hoog', { quality: 'hoog', shadows: true, drawDistance: 'ver', resolution: 1, autoResolution: true }), 'zichtafstand heel ver');

// view distance: 'heel ver' only while adaptive quality has not stepped down
eq('view distances', Object.values(VIEW_DISTANCES), [150, 350, 600, 900]);
eq('heel ver at full scale', viewDistanceFor('heelver', 1, 0), 900);
eq('heel ver at 95%', viewDistanceFor('heelver', 0.95, 0), 900);
eq('heel ver at 85% -> ver', viewDistanceFor('heelver', 0.85, 0), 600);
eq('heel ver on cpuLevel 1 -> ver', viewDistanceFor('heelver', 1, 1), 600);
eq('ver stays ver when scaled', viewDistanceFor('ver', 0.6, 2), 600);
eq('unknown -> normaal', viewDistanceFor('reuzever'), 350);
eq('prop radius per setting', Object.values(VIEW_DISTANCES).map(propRadius), [260, 410, 620, 855]);

eq('changes hoog->laag', describeChanges('laag', { quality: 'hoog', shadows: true, drawDistance: 'ver', resolution: 1, autoResolution: true }), 'kwaliteit laag · schaduwen uit · zichtafstand kort · resolutie 75%');

// adaptive resolution: frames(i) -> [interval ms, main-thread ms]; the scale
// steps taken over `secs` seconds of play
function steps(secs, frames) {
  resetDynamic();
  const seen = [];
  let t = 0;
  for (let i = 0; t < secs * 1000; i++) {
    const [ms, cpu] = frames(i);
    t += ms;
    if (noteFrame(ms, cpu)) seen.push(`${dynamicScale()}/${cpuLevel()}`);
  }
  return seen;
}
eq('fast GPU with hitches: no steps', steps(120, (i) => (i % 40 === 0 ? [180, 170] : i % 9 === 0 ? [60, 12] : [7, 4])), []);
eq('fast GPU, a slow second now and then: no steps', steps(120, (i) => (i % 1000 < 30 ? [34, 6] : [7, 4])), []);
eq('GPU-bound on hoog: steps after 3 s', steps(4.5, () => [35, 8]), ['0.9/0']);
eq('CPU-bound: detail first, not resolution', steps(5, () => [35, 30]), ['1/1']);
// slow for 4 s every 30 s: it settles low; each step back up waits longer
eq('flapping: at most 9 steps in 3 min', steps(180, (i) => (i % 2350 < 115 ? [35, 8] : [12, 6])).length <= 9, true);
resetDynamic();
eq('mobile: phone', mobileProfileFor({ width: 390, height: 844 }), 'telefoon');
eq('mobile: phone landscape', mobileProfileFor({ width: 844, height: 390 }), 'telefoon');
eq('mobile: weak phone (memory)', mobileProfileFor({ width: 844, height: 390, cores: 8, memory: 2 }), 'telefoonZwak');
eq('mobile: weak phone (cores)', mobileProfileFor({ width: 844, height: 390, cores: 4, memory: 6 }), 'telefoonZwak');
eq('mobile: good phone', mobileProfileFor({ width: 844, height: 390, cores: 8, memory: 8 }), 'telefoon');
eq('mobile: tablet', mobileProfileFor({ width: 820, height: 1180, cores: 6, memory: 4 }), 'tablet');
eq('mobile: strong tablet', mobileProfileFor({ width: 1024, height: 1366, cores: 8, memory: 8 }), 'tabletKrachtig');
eq('mobile: unknown screen', mobileProfileFor({}), 'tablet');
eq('mobile: profiles in range', Object.values(MOBILE_PROFILES).every((p) => p.resolution >= 0.5 && p.resolution <= 1 && ['laag', 'middel', 'hoog'].includes(p.quality)), true);
process.exit(fail ? 1 : 0);
