// Licht per shot (#1323): de presets, het oplossen (shot wint van scène, preset plus eigen velden), de toepassing op de lichtparameters
// van een beeld (zonder THREE: kleuren als { r, g, b }), de validatie in cutscript.js en `lights` in een missiespec (missionScene).
//   node scripts/shotlight_test.mjs
import { LIGHT_PRESETS, LIGHT_PRESET_NAMES, lightIssues, resolveShotLight, kelvinToRgb, keyDirection, rimPosition, applyShotLight, rimOf, describeLight } from '../game/js/shotlight.js';
import { compileScene, validateScene } from '../game/js/cutscript.js';
import { missionScene } from '../game/js/cutscenes_akte1.js';

let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ` (${info})` : ''}`); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

// presets
for (const p of LIGHT_PRESET_NAMES) ok(lightIssues(p).length === 0 && lightIssues({ ...LIGHT_PRESETS[p] }).length === 0, `preset ${p} is geldig`, lightIssues(LIGHT_PRESETS[p]).join('; '));
ok(LIGHT_PRESET_NAMES.includes('avond-binnen') && LIGHT_PRESET_NAMES.includes('gouden-uur'), 'de presets uit het issue bestaan');
ok(lightIssues('nachtclub').length === 1, 'onbekende preset is een fout');
ok(lightIssues({ key: { kelvin: 99999 } }).length === 1, 'kelvin buiten het bereik is een fout');
ok(lightIssues({ key: { kleur: 3 } }).length === 1, 'onbekend veld is een fout');
ok(lightIssues({ rim: 3 }).length === 1, 'rim moet een object zijn');
ok(lightIssues(null).length === 0, 'geen licht is goed (wereldlicht)');

// oplossen
ok(resolveShotLight(null, null) === null && resolveShotLight(undefined, undefined) === null, 'geen licht: null (terugval op de wereld)');
const r1 = resolveShotLight('gouden-uur', null);
ok(r1.name === 'gouden-uur' && r1.key.kelvin === 3300 && r1.rim.intensity === 1.6, 'scènelicht geldt voor een shot zonder eigen licht');
const r2 = resolveShotLight('gouden-uur', { preset: 'avond-binnen', key: { intensity: 0.3 } });
ok(r2.name === 'avond-binnen' && r2.key.kelvin === 2900 && r2.key.intensity === 0.3, 'shotlicht wint en breidt zijn preset uit');
ok(resolveShotLight('gouden-uur', 'dag').key === undefined, "'dag' zet het wereldlicht terug in een scène met eigen licht");

// kleurtemperatuur
const warm = kelvinToRgb(2700), koel = kelvinToRgb(10000), wit = kelvinToRgb(6600);
ok(warm.r > warm.b && koel.b > koel.r, 'warm is rood, koel is blauw');
ok(wit.r > 0.95 && wit.g > 0.95 && wit.b > 0.95, '6600 K is bijna wit');

// richting: azimut 0 komt van achter de camera, +90 van rechts in beeld
const cam = { position: { x: 0, y: 0, z: 1.6 }, lookAt: { x: 10, y: 0, z: 1.6 } };
const d0 = keyDirection(cam, 0, 0);
ok(near(d0.x, -1) && near(d0.y, 0) && near(d0.z, 0), 'azimut 0: het licht staat achter de camera', JSON.stringify(d0));
const d90 = keyDirection(cam, 90, 0);
ok(near(d90.x, 0) && near(d90.y, 1), 'azimut 90: rechts in beeld (spel-y bij een camera langs +x)', JSON.stringify(d90));
const dUp = keyDirection(cam, 0, 90);
ok(near(dUp.z, 1), 'elevatie 90: recht van boven');
const rp = rimPosition(cam);
ok(rp.x > 10 && near(rp.y, 0) && rp.z > 1.6, 'het tegenlicht staat achter het onderwerp en hoger', JSON.stringify(rp));

// toepassen op de lichtparameters van een beeld
const vec = () => ({ x: 0, y: 1, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } });
const L = () => ({ sun: { r: 1, g: 0.8, b: 0.6 }, sunI: 3, hemiSky: { r: 0.5, g: 0.6, b: 0.8 }, hemiGnd: { r: 0.3, g: 0.3, b: 0.25 }, hemiI: 0.9, exp: 1.05, sat: 1, lightDir: vec(), isMoon: false });
const a = applyShotLight(L(), resolveShotLight('avond-binnen'), cam);
ok(near(a.sunI, 3 * 0.6) && near(a.hemiI, 0.9 * 0.85) && near(a.exp, 1.05 * 0.95), 'intensiteit en belichting zijn factoren op de wereld');
ok(a.sun.r > a.sun.b * 2, 'het hoofdlicht kleurt warm', JSON.stringify(a.sun));
ok(a.lightDir.y > 0 && Math.hypot(a.lightDir.x, a.lightDir.y, a.lightDir.z) > 0.99, 'de lichtrichting is gezet (THREE: y omhoog)', JSON.stringify(a.lightDir));
const b = applyShotLight(L(), null, cam);
ok(b.sunI === 3 && b.hemiI === 0.9 && b.lightDir.y === 1, 'zonder licht blijft alles staan');
const maan = { ...L(), isMoon: true };
applyShotLight(maan, resolveShotLight('spanning'), cam);
ok(maan.lightDir.y === 1, "'s nachts (maanlicht) blijft de richting van de maan");
ok(rimOf(resolveShotLight('gouden-uur')).intensity === 1.6 && rimOf(resolveShotLight('ochtend')) === null, 'tegenlicht alleen waar een preset het heeft');
ok(/gouden-uur/.test(describeLight(r1)) && describeLight(null) === 'wereldlicht', 'beschrijving voor het contactvel');

// cutscript: validatie en de camera van een sample draagt het licht van zijn shot
const def = {
  id: 'licht-test', light: 'gouden-uur',
  actors: { a: { look: 'tammo', at: [0, 0], face: 0 } },
  shots: [{ t: 0, shot: 'cut', at: [3, 0, 1.6], look: 'a', fov: 40 }, { t: 2, shot: 'cut', at: [3, 1, 1.6], look: 'a', fov: 40, light: 'avond-binnen' }, { t: 4, shot: 'cut', at: [3, -1, 1.6], look: 'a', fov: 40, light: { key: { kelvin: 5000 } } }],
};
ok(validateScene(def, { duration: 6 }).length === 0, 'een scène met licht valideert', validateScene(def, { duration: 6 }).join('; '));
ok(validateScene({ ...def, light: 'disco' }, { duration: 6 }).some((m) => /light/.test(m)), 'een onbekend scènelicht is een fout');
ok(validateScene({ ...def, shots: [def.shots[0], { ...def.shots[1], light: { fill: { intensity: 9 } } }] }, { duration: 6 }).some((m) => /shot 1: light/.test(m)), 'een fout shotlicht noemt het shot');
const sc = compileScene(def, { duration: 6 });
const anker = { x: 0, y: 0, facing: 0, z: 0 };
ok(sc.sample(1, anker).camera.light.name === 'gouden-uur', 'shot 0 erft het scènelicht');
ok(sc.sample(3, anker).camera.light.name === 'avond-binnen', 'shot 1 heeft zijn eigen preset');
ok(sc.sample(5, anker).camera.light.key.kelvin === 5000 && sc.sample(5, anker).camera.light.name === 'eigen', 'shot 2 heeft een eigen licht');
const zonder = compileScene({ ...def, light: undefined, shots: def.shots.map(({ light, ...s }) => s) }, { duration: 6 });
ok(zonder.sample(3, anker).camera.light === null, 'zonder licht is de camera null (wereldlicht)');

// missionScene: `light` en `lights` in een spec
const lines = [0, 1, 2, 3].map((i) => ({ speaker: i % 2 ? 'Tammo' : 'Anita', text: `Regel ${i} van de test.`, at: 1 + i * 3, dur: 2.6 }));
const spec = { cast: {}, props: {}, open: [], beats: [], shots: [], light: 'ochtend', lights: [{ on: 2, light: 'warm-intiem' }], wide: { from: [-5, 3, 3], to: [-3, 2.5, 2.4], look: 'mid:tammo,tessa@1', fov: 48, until: 0 } };
const md = missionScene('TEST', lines, { spec });
ok(md && md.light === 'ochtend', 'spec.light wordt def.light');
const tn = (t) => (typeof t === 'number' ? t : ((m) => lines[+m[1]].at + (m[2] ? +m[2] : 0))(/^L(\d+)([+-][\d.]+)?$/.exec(t)));
const voor = md.shots.filter((s) => tn(s.t) < lines[2].at - 0.06), na = md.shots.filter((s) => tn(s.t) >= lines[2].at - 0.05);
ok(voor.length && voor.every((s) => s.light === undefined), 'shots voor de ingang houden het scènelicht');
ok(na.length && na.every((s) => s.light === 'warm-intiem'), 'shots vanaf de ingang krijgen het nieuwe licht', JSON.stringify(md.shots.map((s) => [s.t, s.light])));

console.log(fails ? `shotlight_test: ${fails} van ${n} FOUT` : `shotlight_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
