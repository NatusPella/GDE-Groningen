// Test van de ketenaudit (scripts/audio_ketenaudit.mjs): de echte bron is schoon, en elke controle slaat aan op een bewust foute bron.
//   node scripts/audio_ketenaudit_test.mjs
import {
  auditAlles, checkBypass, checkLimiter, checkGainKeten, checkLussen, checkOscillatoren, checkRamps, checkMediaElementen,
  checkWerklet, checkBuffers, checkStemmen, stripComments, enclosingFn, fnBody,
} from './audio_ketenaudit.mjs';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };

// de echte bron
{
  const { found, stats } = await auditAlles();
  ok(found.length === 0, 'echte bron: geen bevindingen', found.map((x) => `${x.check} ${x.file}:${x.line}`).join('; '));
  ok(stats.bestanden >= 40 && stats.lussen >= 10 && stats.oscillatoren >= 15, 'echte bron: de audit ziet de audiobestanden', JSON.stringify(stats));
}

// hulp
ok(!/verborgen/.test(stripComments('a(); // verborgen\n/* verborgen */ b();')), 'stripComments haalt commentaar weg');
ok(enclosingFn('function a() {\n x\n}\nfunction b() {\n y\n}', 38) === 'b', 'enclosingFn');
ok(fnBody('function a() {\n x\n}\nfunction b() {\n y\n}', 5).includes('x') && !fnBody('function a() {\n x\n}\nfunction b() {\n y\n}', 5).includes('y'), 'fnBody');

// bypass
ok(checkBypass('game/js/x.js', 'node.connect(ctx.destination);').length === 1, 'bypass: rechtstreeks aan destination');
ok(checkBypass('game/js/x.js', '// node.connect(ctx.destination);').length === 0, 'bypass: commentaar telt niet');
ok(checkBypass('game/js/audio.js', 'function output() { outNode.connect(ctx.destination); }').length === 0, 'bypass: output() mag');
ok(checkBypass('game/js/audio.js', 'sfxBus.connect(output());').length === 1, 'bypass: een bus aan output() slaat aan');
ok(checkBypass('game/js/audio.js', 'limiter.connect(output());\nmusicLp.connect(limiter || output());').length === 0, 'bypass: limiter en musicLp mogen');

// limiter
const lim = (t, r, a, rel, k) => `function buildLimiter() {\n  const l = ctx.createDynamicsCompressor();\n  l.threshold.value = ${t};\n  l.knee.value = ${k};\n  l.ratio.value = ${r};\n  l.attack.value = ${a};\n  l.release.value = ${rel};\n  return l;\n}\n`;
ok(checkLimiter('a.js', lim(-2, 20, 0.002, 0.12, 0)).length === 0, 'limiter: de goede waarden');
ok(checkLimiter('a.js', lim(0, 20, 0.002, 0.12, 0)).length === 1, 'limiter: drempel te hoog');
ok(checkLimiter('a.js', lim(-12, 20, 0.002, 0.12, 0)).length === 1, 'limiter: drempel te laag (pompt)');
ok(checkLimiter('a.js', lim(-2, 4, 0.002, 0.12, 0)).length === 1, 'limiter: ratio te klein');
ok(checkLimiter('a.js', lim(-2, 20, 0.05, 0.12, 0)).length === 1, 'limiter: attack te traag');
ok(checkLimiter('a.js', lim(-2, 20, 0.002, 2, 0)).length === 1, 'limiter: release te lang');
ok(checkLimiter('a.js', 'function iets() {}').length === 1, 'limiter: ontbreekt');

// gainketen
const graaf = (g) => `function buildGraph() {\n  master = ctx.createGain();\n  worldBus = ctx.createGain();\n  worldBus.gain.value = ${g};\n  worldBus.connect(master);\n  sfxBus = ctx.createGain();\n  sfxBus.gain.value = ${g};\n  sfxBus.connect(worldBus);\n}\n`;
ok(checkGainKeten('audio.js', graaf(0.9)).length === 0, 'gainketen: nette keten');
ok(checkGainKeten('audio.js', graaf(1.4)).length > 0, 'gainketen: stapeling 1,4 x 1,4 slaat aan');
ok(checkGainKeten('audio.js', graaf(2)).length > 0, 'gainketen: een bus boven 1,5');

// lus
ok(checkLussen('a.js', 'function f() {\n const src = ctx.createBufferSource();\n src.loop = true;\n src.start();\n}').length === 1, 'lus: zonder stop slaat aan');
ok(checkLussen('a.js', 'function f() {\n const src = ctx.createBufferSource();\n src.loop = true;\n src.start();\n return src;\n}\nfunction g(l) { l.src.stop(); }').length === 0, 'lus: stop als eigenschap');
ok(checkLussen('a.js', 'function f() {\n const src = x();\n src.loop = true;\n src.start();\n setTimeout(() => src.stop(), 5);\n}').length === 0, 'lus: stop in dezelfde functie');
ok(checkLussen('a.js', 'function f() { a.loop = true; }\nfunction g() { b.stop(); }').length === 1, 'lus: een stop van iets anders telt niet');
ok(checkLussen('game/js/sfx/aircraft.js', 'function dispose(n) { for (const x of n) if (x.stop) x.stop(); }\nfunction loop() { const src = c(); src.loop = true; }').length === 0, 'lus: algemene dispose-hulp telt');

// oscillator
ok(checkOscillatoren('a.js', 'function f() {\n const osc = ctx.createOscillator();\n osc.start();\n}').length === 1, 'oscillator: zonder stop slaat aan');
ok(checkOscillatoren('a.js', 'function f() {\n const osc = ctx.createOscillator();\n osc.start(); osc.stop(t);\n}').length === 0, 'oscillator: met stop is goed');
ok(checkOscillatoren('a.js', 'function f() {\n const osc = ctx.createOscillator();\n return { osc };\n}\nfunction g(v) { v.osc.stop(); }').length === 0, 'oscillator: stop als eigenschap');
ok(checkOscillatoren('a.js', 'function f() { const osc = ctx.createOscillator(); osc.start(); }\nfunction g() { osc.stop(); }').length === 1, 'oscillator: een stop in een andere functie op een lokale naam telt niet');

// ramp
ok(checkRamps('a.js', 'g.gain.exponentialRampToValueAtTime(0, t);').length === 1, 'ramp: exponentieel naar 0 slaat aan');
ok(checkRamps('a.js', 'g.gain.exponentialRampToValueAtTime(0.0001, t);').length === 0, 'ramp: naar 0,0001 is goed');
ok(checkRamps('a.js', 'p.setTargetAtTime(0.5, t, 0);').length === 1, 'ramp: tijdconstante 0 klikt');
ok(checkRamps('a.js', 'p.setTargetAtTime(0, t, 0.05);').length === 0, 'ramp: doel 0 met tijdconstante is goed');

// mediaelement
ok(checkMediaElementen('a.js', 'const el = new Audio(x); el.play();').length === 1, 'mediaelement: zonder pause slaat aan');
ok(checkMediaElementen('a.js', 'const el = new Audio(x); el.play(); function s() { el.pause(); }').length === 0, 'mediaelement: met pause');

// werklet
const wl = (body) => `class P {\n  process(inputs, outputs) {\n${body}\n  }\n}\n`;
ok(checkWerklet('w.js', wl('    render(); if (!finiteOut(o, 1)) {}\n    return true;')).length === 0, 'werklet: goed');
ok(checkWerklet('w.js', wl('    render(); if (!finiteOut(o, 1)) {}\n    return false;')).length === 1, 'werklet: false stopt de node');
ok(checkWerklet('w.js', wl('    render();\n    return true;')).length === 1, 'werklet: geen NaN-controle');
ok(checkWerklet('w.js', wl('    const b = new Float32Array(128); finiteOut(b);\n    return true;')).length === 1, 'werklet: allocatie in process()');
ok(checkWerklet('w.js', wl('    console.log(1); finiteOut(o);\n    return true;')).length === 1, 'werklet: loggen in process()');

// buffers
ok(checkBuffers('game/js/nieuw.js', 'x.createBuffer(1, 2, 3);').length === 1, 'buffers: een nieuwe plek slaat aan');
ok(checkBuffers('game/js/audio.js', 'x.createBuffer(1, 2, 3);').length === 0, 'buffers: de bekende plek is goed');

// stemmen
{
  const sl = await import('../game/js/sfx/stemlimiet.js');
  ok(checkStemmen(sl.CAT_CAPS, sl.capVoor, [26, 54, 76], sl.createStemTeller).length === 0, 'stemmen: de echte limieten passen');
  ok(checkStemmen({ x: 200 }, () => 200, [26, 54, 76], sl.createStemTeller).length > 0, 'stemmen: een categorie boven de globale limiet slaat aan');
  ok(checkStemmen({ x: 0 }, () => 0, [26, 54, 76], sl.createStemTeller).length > 0, 'stemmen: limiet 0 slaat aan');
  const kapot = () => ({ neem() { return true; }, geef() {}, aantal() { return 3; } });
  ok(checkStemmen({ x: 4 }, () => 4, [26, 54, 76], kapot).length > 0, 'stemmen: een teller die niet terugloopt slaat aan');
}

console.log(`audio_ketenaudit_test: ${fails} fouten van ${n}`);
process.exit(fails ? 1 : 0);
