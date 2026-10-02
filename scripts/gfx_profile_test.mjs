// node scripts/gfx_profile_test.mjs: the GPU classification, the first-run
// advice and the benchmark recommendation (game/js/gfxprofile.js).
import { classifyGpu, adviseFromSample, recommendPreset, describePreset, describeChanges } from '../game/js/gfxprofile.js';

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
eq('changes hoog->laag', describeChanges('laag', { quality: 'hoog', shadows: true, drawDistance: 'ver', resolution: 1, autoResolution: true }), 'kwaliteit laag · schaduwen uit · zichtafstand kort · resolutie 75%');
process.exit(fail ? 1 : 0);
