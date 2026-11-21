// Programma-sleutelinspectie (#1008):  node scripts/programwatch_test.mjs
// Een nep-renderer maakt programma's met sleutels in de vorm van three r160; compile en draw worden onderscheiden en het
// verschil met de tweeling (hetzelfde materiaaltype, andere sleutel) wordt bij naam genoemd. Als de gevendorde three in
// desktop/vendor-cache staat, worden de veldlijsten ook tegen de echte bron gecontroleerd.
import fs from 'node:fs';
import { PARAM_NAMES, BOOL1, BOOL2, parseKey, diffKeys, createProgramWatch } from '../game/js/programwatch.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

// bouwt een sleutel zoals WebGLPrograms.getProgramCacheKey: shaderID, defines, 48 velden, twee maskers, kleurruimte, onBeforeCompile
function makeKey({ shaderID = 'physical', defines = {}, params = {}, bits1 = [], bits2 = [], custom = 'function(s){s.x=1;}' } = {}) {
  const base = { precision: 'highp', outputColorSpace: 'srgb-linear', envMapMode: false, envMapCubeUVHeight: null, numDirLights: 1, numPointLights: 2, numHemiLights: 1, shadowMapType: 1, toneMapping: 0, depthPacking: 0, combine: 0, morphTargetsCount: 0, morphAttributeCount: 0 };
  const p = { ...base, ...params };
  const arr = [shaderID];
  for (const k in defines) arr.push(k, defines[k]);
  for (const name of PARAM_NAMES) arr.push(p[name]);
  arr.push(bits1.reduce((m, b) => m | (1 << BOOL1.indexOf(b)), 0), bits2.reduce((m, b) => m | (1 << BOOL2.indexOf(b)), 0));
  arr.push('srgb', custom);
  return arr.join();
}

ok(PARAM_NAMES.length === 48 && BOOL1.length === 20 && BOOL2.length === 20, 'aantal velden en bits', [PARAM_NAMES.length, BOOL1.length, BOOL2.length]);

const a = makeKey({ bits1: ['isWebGL2', 'supportsVertexTextures'], bits2: ['useFog', 'shadowMapEnabled'] });
ok(parseKey(a) && parseKey(a).params.length === 48, 'sleutel wordt geparst');
ok(diffKeys(a, a).length === 0, 'gelijke sleutels: geen verschil');
ok(diffKeys(a, makeKey({ params: { numPointLights: 4 }, bits1: ['isWebGL2', 'supportsVertexTextures'], bits2: ['useFog', 'shadowMapEnabled'] })).join() === 'numPointLights 2 -> 4', 'aantal puntlichten');
ok(diffKeys(a, makeKey({ bits1: ['isWebGL2', 'supportsVertexTextures', 'instancing', 'instancingColor'], bits2: ['useFog', 'shadowMapEnabled'] })).join() === '+instancing,+instancingColor', 'instancing erbij');
ok(diffKeys(a, makeKey({ bits1: ['isWebGL2', 'supportsVertexTextures'], bits2: ['useFog'] })).join() === '-shadowMapEnabled', 'schaduwkaart eraf');
ok(diffKeys(a, makeKey({ params: { outputColorSpace: 'srgb', toneMapping: 4 }, bits1: ['isWebGL2', 'supportsVertexTextures'], bits2: ['useFog', 'shadowMapEnabled'] })).join('; ') === 'outputColorSpace srgb-linear -> srgb; toneMapping 0 -> 4', 'doel (kleurruimte en tonemapping)');
ok(diffKeys(a, makeKey({ defines: { WATER_Q: 2 }, bits1: ['isWebGL2', 'supportsVertexTextures'], bits2: ['useFog', 'shadowMapEnabled'] }))[0].startsWith('shader/defines'), 'een define erbij');
ok(diffKeys(a, makeKey({ custom: 'function(s){s.y=2;}', bits1: ['isWebGL2', 'supportsVertexTextures'], bits2: ['useFog', 'shadowMapEnabled'] })).join() === 'onBeforeCompile/kleurruimte', 'ander onBeforeCompile');
ok(diffKeys(a, makeKey({ custom: 'function(s, r){ s.a=1, s.b=2; }', bits1: ['isWebGL2', 'supportsVertexTextures'], bits2: ['useFog', 'shadowMapEnabled'] })).join() === 'onBeforeCompile/kleurruimte', 'onBeforeCompile met komma\'s breekt de uitlijning niet');
ok(parseKey('abc,def') === null && diffKeys('abc', 'def')[0] === 'sleutelvorm onbekend', 'onbekende vorm');

// nep-renderer: programma's ontstaan in compile (voor de start), in compile en in draw (na de start)
const watch = createProgramWatch({ now: (() => { let t = 0; return () => (t += 500); })() });
const prog = (name, key) => ({ name, cacheKey: key });
const base1 = ['isWebGL2', 'supportsVertexTextures'], base2 = ['useFog', 'shadowMapEnabled'];
watch.begin(); watch.note(prog('MeshStandardMaterial', makeKey({ bits1: base1, bits2: base2 }))); watch.end();
ok(watch.stats().beforeStart === 1 && watch.lines().length === 0, 'voor de start: geteld, geen regels');
watch.markStart();
watch.begin(); watch.note(prog('MeshStandardMaterial', makeKey({ params: { numPointLights: 4 }, bits1: base1, bits2: base2 }))); watch.end();
watch.note(prog('MeshStandardMaterial', makeKey({ bits1: [...base1, 'instancing', 'instancingColor'], bits2: base2 })));
watch.note(prog('MeshBasicMaterial', makeKey({ shaderID: 'basic', bits1: base1, bits2: base2 })));
const st = watch.stats();
ok(st.lateCompile === 1 && st.lateDraw === 2 && st.total === 4, 'tellers na de start', st);
const late = watch.late();
ok(late[0].phase === 'compile' && late[1].phase === 'draw', 'fase compile of draw');
ok(late[1].diff.join().includes('instancing') && late[1].diff.join().includes('numPointLights'.slice(0, 0)), 'tweeling met bits genoemd', late[1].diff);
ok(late[2].diff[0].startsWith('geen tweeling'), 'nieuw materiaaltype: geen tweeling');
const lines = watch.lines();
ok(lines.some((l) => l.startsWith('Let op: 2 shaders')) && lines.length === 4, 'regels voor de technische info', lines);
watch.reset();
ok(watch.stats().total === 0 && !watch.started, 'reset');

// de bedrading: de renderer-hook, de compile-markering, de startmarkering en het blok in de technische info
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const sc = read('../game/js/scene3d.js');
ok(/probe\.program\(p\); programWatch\.note\(p\);/.test(sc), 'scene3d: elk nieuw programma gaat langs de teller');
ok(/programWatch\.begin\(\);[\s\S]{0,900}programWatch\.end\(\)/.test(sc), 'scene3d: precompile markeert compile');
ok(/programWatch\.markStart\(\)/.test(read('../game/js/main.js')), 'main: de start wordt gemarkeerd');
const { formatReport } = await import('../game/js/gpudiag.js');
const rapport = formatReport({ programmas: ['Programma\'s: 300 in totaal', 'Let op: 2 shaders zijn pas bij het tekenen gelinkt'] });
ok(rapport.includes('[Shaderprogramma\'s na de start]') && rapport.includes('Let op: 2 shaders'), 'technische info toont het blok');
ok(!formatReport({}).includes('Shaderprogramma'), 'zonder gegevens geen blok');

// tegen de echte bron van three, als die gevendord is
const src = new URL('../desktop/vendor-cache/npm/three@0.160.0/build/three.module.js', import.meta.url);
if (fs.existsSync(src)) {
  const s = fs.readFileSync(src, 'utf8');
  const i0 = s.indexOf('function getProgramCacheKeyParameters'), i1 = s.indexOf('function getProgramCacheKeyBooleans'), i2 = s.indexOf('function getUniforms( material )');
  const params = [...s.slice(i0, i1).matchAll(/array\.push\( parameters\.(\w+) \)/g)].map((m) => m[1]);
  ok(params.join() === PARAM_NAMES.join(), 'PARAM_NAMES gelijk aan three', params.length);
  const bools = s.slice(i1, i2).split('array.push( _programLayers.mask )');
  const bits = (txt) => { const o = []; for (const m of txt.matchAll(/if \( parameters\.(\w+) \)\s*_programLayers\.enable\( (\d+) \)/g)) o[+m[2]] = m[1]; return o; };
  ok(bits(bools[0]).join() === BOOL1.join(), 'BOOL1 gelijk aan three');
  ok(bits(bools[1]).join() === BOOL2.join(), 'BOOL2 gelijk aan three');
} else console.log('(three niet gevendord: veldlijsten niet tegen de bron gecontroleerd)');

console.log(fails ? `${fails} van ${n} mislukt` : `ok: ${n} controles`);
process.exit(fails ? 1 : 0);
