// node scripts/gpudiag_test.mjs: GPU-soort, ANGLE-backend, waarschuwing en het technische-infoblok (game/js/gpudiag.js),
// de vorm van de GPU-gegevens uit het hoofdproces (desktop/gpuinfo.cjs) en de classificatie van nieuwe kaarten.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { gpuKind, angleBackend, gpuWarning, formatReport, frameSummary } from '../game/js/gpudiag.js';
import { classifyGpu } from '../game/js/gfxprofile.js';

let fail = 0;
const ok = (name, cond, extra = '') => { if (!cond) fail++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond ? '' : ' ' + extra}`); };

const RX9070 = 'ANGLE (AMD, AMD Radeon RX 9070 XT (0x00007550) Direct3D11 vs_5_0 ps_5_0, D3D11)';
ok('RX 9070 XT is een losse kaart', gpuKind(RX9070) === 'discrete');
ok('RX 9070 XT klasse hoog', classifyGpu({ renderer: RX9070, maxTexture: 16384, cores: 16, memory: 8 }).tier === 'hoog');
ok('ANGLE-backend D3D11', angleBackend(RX9070) === 'D3D11');
ok('ANGLE-backend Vulkan en OpenGL', angleBackend('ANGLE (AMD, Radeon RX 9070 XT, Vulkan 1.3)') === 'Vulkan' && angleBackend('ANGLE (NVIDIA, GeForce RTX 5090, OpenGL 4.6)') === 'OpenGL');
ok('geen ANGLE-tekst geeft leeg', angleBackend('NVIDIA GeForce RTX 4080') === '');

const cases = [
  ['ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 Direct3D11 vs_5_0 ps_5_0, D3D11)', 'discrete', 'hoog'],
  ['ANGLE (NVIDIA, NVIDIA GeForce RTX 5090 Direct3D11 vs_5_0 ps_5_0, D3D11)', 'discrete', 'hoog'],
  ['ANGLE (AMD, AMD Radeon RX 7900 XTX (0x0000744C) Direct3D11, D3D11)', 'discrete', 'hoog'],
  ['ANGLE (AMD, AMD Radeon RX 6600 Direct3D11, D3D11)', 'discrete', 'hoog'],
  ['ANGLE (Intel, Intel(R) Arc(TM) B580 Graphics Direct3D11, D3D11)', 'discrete', 'hoog'],
  ['ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics Direct3D11, D3D11)', 'discrete', 'hoog'],
  ['ANGLE (AMD, AMD Radeon(TM) Graphics (0x000013C0) Direct3D11, D3D11)', 'integrated', 'middel'],
  ['ANGLE (AMD, AMD Radeon 780M Graphics Direct3D11, D3D11)', 'integrated', 'middel'],
  ['ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)', 'integrated', 'laag'],
  ['ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11, D3D11)', 'integrated', 'laag'],
  ['ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)', 'software', 'laag'],
  ['ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11, D3D11)', 'software', 'laag'],
  ['llvmpipe (LLVM 15.0.7, 256 bits)', 'software', 'laag'],
  ['Vloeibaar Nieuw Merk X1', 'discrete', 'hoog'], // onbekende nieuwe kaart: sterk, tenzij software
];
for (const [r, kind, tier] of cases) {
  ok(`soort ${kind}: ${r.slice(0, 60)}`, gpuKind(r) === kind, gpuKind(r));
  const t = classifyGpu({ renderer: r, maxTexture: 16384, cores: 8, memory: 8 }).tier;
  ok(`klasse ${tier}: ${r.slice(0, 60)}`, t === tier, t);
}
ok('leeg of gemaskeerd is onbekend, klasse hoog', gpuKind('') === 'onbekend' && classifyGpu({ renderer: '', maxTexture: 16384, cores: 8, memory: 8 }).tier === 'hoog');

// waarschuwing
ok('geen waarschuwing voor een losse kaart', gpuWarning(RX9070) === null);
const w = gpuWarning('ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11, D3D11)');
ok('ingebouwde kaart: waarschuwing met uitleg', w && w.kind === 'integrated' && w.help && /Graphics/.test(w.text), JSON.stringify(w));
ok('ingebouwde kaart buiten Windows: geen waarschuwing', gpuWarning('ANGLE (Intel, Intel(R) UHD Graphics 620)', { windows: false }) === null);
ok('Apple-chip: geen waarschuwing', gpuWarning('ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)') === null);
const sw = gpuWarning('ANGLE (Google, Vulkan 1.3 (SwiftShader Device))');
ok('software: waarschuwing zonder Windows-uitleg', sw && sw.kind === 'software' && !sw.help);
ok('softwareProbe wint van de rendertekst', gpuWarning(RX9070, { softwareProbe: true }).kind === 'software');

// het blok
const fs1 = frameSummary(Array(60).fill(16.7));
ok('frameSummary', fs1.n === 60 && Math.abs(fs1.fps - 59.9) < 0.2 && fs1.max === 16.7);
const rep = formatReport({
  version: '0.64.1', platform: 'win32', cores: 16, memory: 8, dpr: 1.5, win: '2560x1440', canvas: '3840x2160', rafHz: 143.8, visible: true, focused: true,
  gl: { renderer: RX9070, vendor: 'Google Inc. (AMD)', version: 'WebGL 2.0 (OpenGL ES 3.0 Chromium)', maxTexture: 16384, parallelCompile: true },
  preset: 'Ultra', settings: 'quality=hoog shadows=true', dyn: 'schaal 1, cpuLevel 0',
  boot: fs1, now: frameSummary(Array(120).fill(41.6)), render: { calls: 880, triangles: 2100000, geometries: 5000, textures: 300, programs: 70 },
  hitches: [{ t: 12.4, ms: 140, programs: 3, longest: 120, heapDrop: 0 }, { t: 30.1, ms: 90, programs: 0, longest: 0, heapDrop: 25 }],
  bench: { avg: 24, p95: 60, low1: 12, preset: 'hoog', cats: { stad: 20, provincie: 31 } },
  electron: { versions: { electron: '45.2.3', chrome: '142.0.0' }, features: { webgl: 'enabled', gpu_compositing: 'enabled', gpu_rasterization: 'enabled_on' }, devices: [{ vendorId: 4098, deviceId: 30032, driverVersion: '32.0.1', active: true }], aux: { glRenderer: 'x' }, switches: ['--force_high_performance_gpu'], displays: [{ width: 2560, height: 1440, scale: 1.5, hz: 144, primary: true }] },
});
for (const need of ['RX 9070 XT', 'ANGLE-backend: D3D11', 'Soort: discrete', 'Klasse voor het advies: hoog', '143,8 Hz', 'devicePixelRatio: 1,5', '3840x2160', '880 drawcalls', 'webgl: enabled', 'gpu_rasterization: enabled_on', 'vendor 0x1002', '+12,4 s: 140 ms, 3 nieuwe shaders', 'heap -25 MB', 'stad 20', 'Electron / Chromium: 45.2.3 / 142.0.0', 'hoofdscherm']) ok(`blok bevat ${need}`, rep.includes(need), need);
ok('blok zonder waarschuwing voor een losse kaart', !/Let op:/.test(rep));
ok('blok waarschuwt bij software', /Let op: Je spel tekent met de processor/.test(formatReport({ platform: 'win32', gl: { renderer: 'ANGLE (Google, SwiftShader)' } })));
ok('blok met niets erin blijft heel', typeof formatReport({}) === 'string' && formatReport(null).includes('technische info'));

// desktop/gpuinfo.cjs: de vorm van de gegevens uit het hoofdproces
const { shapeGpuInfo } = createRequire(import.meta.url)('../desktop/gpuinfo.cjs');
const shaped = shapeGpuInfo({ features: { webgl: 'enabled' }, info: { gpuDevice: [{ vendorId: 4098, deviceId: 1, driverVersion: '1', active: true, extra: 'x' }], auxAttributes: { glRenderer: 'ANGLE', geheim: 'x', optimus: false } }, versions: { electron: '45', chrome: '142', node: '24', v8: 'x' }, argv: ['app.exe', '--use-angle=d3d11', '--user-data-dir=C:\\Users\\naam\\data', '--no-sandbox'], displays: [{ size: { width: 1920, height: 1080 }, scaleFactor: 1, displayFrequency: 60, primary: true }] });
ok('gpuinfo: alleen bekende velden', shaped.aux.glRenderer === 'ANGLE' && shaped.aux.optimus === 'false' && !('geheim' in shaped.aux) && !('extra' in shaped.devices[0]) && !('v8' in shaped.versions));
ok('gpuinfo: geen paden van de speler in de vlaggen', shaped.switches.join(' ') === '--use-angle=d3d11 --no-sandbox', shaped.switches.join(' '));
ok('gpuinfo: schermen', shaped.displays[0].hz === 60 && shaped.displays[0].width === 1920);
ok('gpuinfo zit in het pakket', fs.readFileSync(new URL('../desktop/package.json', import.meta.url), 'utf8').includes('gpuinfo.cjs'));

// 0.64.1: de resultaatkaart verbergt de cursor niet (body.trailer-on liet hem op de kaart weg: "niks te klikken")
const tr = fs.readFileSync(new URL('../game/js/trailer.js', import.meta.url), 'utf8');
ok('cursor: none geldt niet op de resultaatkaart', /body\.trailer-on:not\(\.tr-result-open\)/.test(tr) && !/^body\.trailer-on, body\.trailer-on \* \{ cursor: none/m.test(tr));
ok('de kaart zet en haalt tr-result-open weg', /classList\.add\('tr-result-open'\)/.test(tr) && /classList\.remove\('tr-result-open'\)/.test(tr));

console.log(fail ? `${fail} FAILED` : 'all ok');
process.exit(fail ? 1 : 0);
