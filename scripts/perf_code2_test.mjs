// Prestaties zonder Electron (22-11): #1067 discard-schakelaars in edgefade3d, #1074 pollers die pauzeren bij een verborgen tabblad,
// de kartmotor die echt stopt, en de bedrading van beide in de bronnen. Meetpunten: docs/PERF-CODE2-22-11.md.
//   GDE_VENDOR_CACHE=desktop/vendor-cache node scripts/perf_code2_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
// dynamisch: de loader van node3d.mjs (three uit de vendor-cache) moet eerst geregistreerd zijn
const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
const { applyEdgeFade, edgeFadeClone } = await import('../game/js/edgefade3d.js');
const { setVisibleInterval } = await import('../game/js/visibletimer.js');

let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const src = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- edgefade: met patch een discard in de fragmentshader, met off=true geen patch en geen uniform ---
const frag = (mat) => { const sh = { uniforms: {}, fragmentShader: 'void main() {\n}' }; mat.onBeforeCompile(sh, {}); return sh; };
const on = applyEdgeFade(new THREE.MeshLambertMaterial(), 10, 20);
ok(frag(on).fragmentShader.includes('discard'), 'gepatcht materiaal bevat een discard');
ok(on.userData.edgeFade && on.customProgramCacheKey().includes('edgefade'), 'gepatcht materiaal heeft uniform en programmasleutel');
const off = applyEdgeFade(new THREE.MeshLambertMaterial(), 10, 20, true);
ok(!off.onBeforeCompile.toString().includes('discard') && !off.userData.edgeFade, 'off: geen patch, geen uniform');
const offClone = edgeFadeClone(on, 10, 20, true);
ok(!offClone.userData.edgeFade && offClone.userData.shared, 'off geldt ook voor een kloon');
const onClone = edgeFadeClone(on, 10, 20);
ok(!!onClone.userData.edgeFade && onClone.userData.edgeFade !== on.userData.edgeFade, 'een kloon heeft een eigen band');

// --- setVisibleInterval: verborgen = geen tik; ?stil = altijd tikken ---
const doc = { hidden: true };
let ticks = 0;
const id = setVisibleInterval(() => { ticks++; }, 5, doc, false);
await sleep(40);
ok(ticks === 0, 'geen tik zolang het tabblad verborgen is', String(ticks));
doc.hidden = false;
await sleep(40);
ok(ticks >= 2, 'tikt weer zodra het zichtbaar is', String(ticks));
const t1 = ticks;
doc.hidden = true;
await sleep(30);
ok(ticks <= t1 + 1, 'pauzeert opnieuw bij verbergen', `${t1}->${ticks}`);
clearInterval(id);
let always = 0;
const id2 = setVisibleInterval(() => { always++; }, 5, { hidden: true }, true);
await sleep(40);
clearInterval(id2);
ok(always >= 2, 'met keepOn (?stil) tikt het ook verborgen');
let nodoc = 0;
const id3 = setVisibleInterval(() => { nodoc++; }, 5, null, false);
await sleep(30);
clearInterval(id3);
ok(nodoc >= 2, 'zonder document tikt het gewoon');
// microbench: 10 pollers van 100 ms over een verborgen minuut = 0 uitvoeringen (was 6000)
let calls = 0;
const fakeDoc = { hidden: true };
const ids = [];
for (let i = 0; i < 10; i++) ids.push(setVisibleInterval(() => { calls++; }, 1, fakeDoc, false));
await sleep(30);
ids.forEach(clearInterval);
ok(calls === 0, 'tien pollers doen niets terwijl het venster verborgen is', String(calls));

// --- bronchecks ---
for (const f of ['overlayhold', 'samenpanel', 'touch', 'profileoverlay', 'storydev', 'hud_panel', 'coopspelersui']) {
  const s = src(`game/js/${f}.js`);
  ok(s.includes("from './visibletimer.js'") && /setVisibleInterval\(/.test(s) && !/[^.\w]setInterval\(/.test(s.replace(/typeof setInterval/g, '')), `${f}.js gebruikt setVisibleInterval`);
}
const scene = src('game/js/scene3d.js');
ok(scene.includes("perfOff('boomfade')") && scene.includes("perfOff('gevelfade')"), 'scene3d: schakelaars boomfade en gevelfade');
ok(scene.includes('if (m.userData.edgeFade) m.userData.edgeFade.value.set(a, b)'), 'updateFacadeFade slaat ongepatchte materialen over');
const kart = src('game/js/kartbaan.js');
ok(/function stopEngine\(\)[\s\S]*\.stop\(\)[\s\S]*disconnect\(\)/.test(kart) && /engine = null;/.test(kart), 'kartbaan: stopEngine stopt en koppelt de oscillators los');

console.log(`perf_code2_test: ${n - bad}/${n} groen`);
if (bad) process.exit(1);
