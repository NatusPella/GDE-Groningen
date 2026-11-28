// Texturen vooraf naar de GPU (game/js/texturewarm.js, #1354): node scripts/texturewarm_test.mjs
import { createTextureWarm, texturesOf } from '../game/js/texturewarm.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// een nepgpu: een texture staat erop als props een __webglTexture en dezelfde versie heeft
const gpu = new Map(); let clock = 0, uploads = 0;
const env = { props: (t) => gpu.get(t) || {}, upload: (t) => { uploads++; clock += t.cost || 0.4; gpu.set(t, { __webglTexture: {}, __version: t.version }); }, now: () => clock };
const tex = (cost = 0.4, o = {}) => ({ isTexture: true, version: 1, image: { complete: true }, cost, ...o });
const mat = (o) => ({ map: null, ...o });
const mesh = (...texs) => ({ material: texs.map((t) => mat({ map: t })), children: [] });

const tw = createTextureWarm(env, { maxPerFrame: 3 });
const a = tex(), b = tex(), c = tex(), d = tex();
const obj = { material: mat({ map: a, normalMap: b }), children: [mesh(c), mesh(d), mesh(a)] };
ok(texturesOf(obj).size === 4, 'texturesOf: vier unieke texturen, ook van kinderen en dubbele verwijzingen');
ok(texturesOf({ material: { uniforms: { u: { value: a }, v: { value: 5 } } } }).size === 1, 'texturen in shader-uniforms tellen mee');
ok(!tw.ready(obj) && tw.pending() === 4, 'niet klaar zolang de texturen niet op de GPU staan');
ok(tw.step(10) === 3 && uploads === 3, 'hoogstens maxPerFrame per beeld (3)');
ok(!tw.ready(obj) && tw.pending() === 1, 'één over');
ok(tw.step(10) === 1 && tw.ready(obj) && tw.pending() === 0, 'beeld twee: klaar');
ok(tw.step(10) === 0, 'een lege wachtrij doet niets');

// budget: altijd minstens één per beeld (anders komt een trage texture nooit aan de beurt), daarna stoppen bij het budget
const tw2 = createTextureWarm(env, { maxPerFrame: 10 });
const slow = [tex(3), tex(3), tex(3)];
tw2.enqueue({ material: mat({ map: slow[0] }), children: [mesh(slow[1]), mesh(slow[2])] });
clock = 0;
ok(tw2.step(1) === 1 && tw2.pending() === 2, 'trage texture (3 ms) in een budget van 1 ms: precies één, de rest volgende beeld');
ok(tw2.step(1) === 1 && tw2.step(1) === 1 && tw2.pending() === 0, 'en binnen drie beelden is alles op de GPU');

// geen upload nodig: nog niet geladen beeld, versie 0, render target, al geüpload
const tw3 = createTextureWarm(env);
const skip = [tex(0.4, { image: { complete: false } }), tex(0.4, { version: 0 }), tex(0.4, { isRenderTargetTexture: true }), tex(0.4, { image: null })];
ok(tw3.enqueue({ material: skip.map((t) => mat({ map: t })), children: [] }) === 0, 'een texture zonder beeld, zonder versie of een render target wacht nergens op');
const done = tex(); gpu.set(done, { __webglTexture: {}, __version: 1 });
ok(tw3.ready(mesh(done)), 'al geüpload: klaar');
done.version = 2;
ok(!tw3.ready(mesh(done)), 'een nieuwe versie (needsUpdate) moet opnieuw omhoog');

// een upload die faalt blokkeert de wachtrij niet
const bad = tex(); const tw4 = createTextureWarm({ ...env, upload: () => { throw new Error('gl'); } });
tw4.enqueue(mesh(bad));
ok(tw4.step(5) === 0 && tw4.pending() === 0 || tw4.pending() === 0, 'een mislukte upload valt uit de wachtrij (de eerste draw meldt het zelf)');
// een texture die na de upload nooit "klaar" blijkt (de nepgpu onthoudt hem niet): na drie pogingen houdt hij niets meer tegen
const stuck = tex(); const tw5 = createTextureWarm({ ...env, upload: () => {} });
let k = 0; while (!tw5.ready(mesh(stuck)) && k < 10) { tw5.step(5); k++; }
ok(tw5.ready(mesh(stuck)) && k === 3 && tw5.stats.gaveUp === 1, 'een texture die niet op de GPU blijft: na drie pogingen geeft de wachtrij op', String(k));
ok(texturesOf(null).size === 0 && texturesOf({}).size === 0, 'leeg of null: geen texturen');

console.log(`${n - fails}/${n} controles in orde`);
process.exit(fails ? 1 : 0);
