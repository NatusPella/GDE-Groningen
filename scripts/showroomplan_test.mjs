// De showroom van de pimp-werkplaats zonder THREE (game/js/showroomplan.js, epic Autotuning #1155 ronde 3): camerastanden,
// sfeer per werkplaats, draaitafel, effecten, splitsing en iconen. Pure test.
import {
  ENVS, envFor, VIEW_IDS, viewPreset, nextView, orbitPosition, angleDelta, ease, easeAngle, stepCamera, turntableAz, TURNTABLE_AFTER, TURNTABLE_SPEED,
  EFFECT_OF_CATEGORY, categoryOfField, flashSpot, EFFECT_MS, effectLevel, splitViewports, SHOWROOM_BUDGET, TAB_ICON, FIELD_ICON, iconOfField,
} from '../game/js/showroomplan.js';
import { ICON_MAP } from '../game/js/iconmap.js';
import { PHOSPHOR } from '../game/js/phosphordata.js';
import { LOOK_FIELDS, CATEGORIES } from '../game/js/vehiclelook.js';
import { PARTS } from '../game/js/tuningplan.js';
import { tabsFor } from '../game/js/tuningdraft.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };
const size = { L: 4.6, W: 1.8, H: 1.5 };

for (const k of ['garage', 'pomp', 'thuis', 'werf', 'fietsenmaker', 'tuning']) { const e = envFor(k); ok(e && e.neon.length >= 2 && Number.isInteger(e.wall) && Number.isInteger(e.rim), 'sfeer per werkplaats', k); }
ok(envFor('onbekend') === ENVS.garage && envFor(null) === ENVS.garage, 'onbekend is garage');
ok(new Set(Object.values(ENVS).map((e) => e.neon[0] + '|' + e.wall)).size === 6, 'elke werkplaats ziet er anders uit');

for (const id of VIEW_IDS) {
  const v = viewPreset(id, size, { x: 1.3, y: 0.3, z: 0.8 });
  ok(Number.isFinite(v.az) && v.el >= 0.02 && v.el <= 1.25 && v.dist > 1 && v.target.every(Number.isFinite), 'camerastand geldig', id);
  const p = orbitPosition(v.az, v.el, v.dist, v.target);
  ok(p.every(Number.isFinite) && p[1] >= 0, 'camera boven de vloer', id);
}
ok(viewPreset('wiel', size, { x: 1.3, y: 0.3, z: 0.8 }).target[0] === 1.3 && viewPreset('wiel', size, null).target.every(Number.isFinite), 'wielstand volgt het wiel, ook zonder wiel');
ok(viewPreset('wiel', size).dist < viewPreset('zij', size).dist && viewPreset('detail', size).dist < viewPreset('schuin', size).dist && viewPreset('hoogte', size).el > 0.9, 'wiel en detail komen dichterbij, hoogte kijkt van boven');
ok(viewPreset('schuin', { L: 0, W: 0, H: 0 }).dist > 1 && viewPreset('bestaatniet', size).dist > 0, 'nul maten en onbekende stand geven iets bruikbaars');
ok(nextView('schuin') === 'voor' && nextView('hoogte') === 'schuin' && nextView('schuin', -1) === 'hoogte', 'standen draaien rond');
const o = orbitPosition(0, 0, 5, [0, 1, 0]); ok(Math.abs(o[0] - 5) < 1e-9 && o[1] === 1, 'azimut 0 kijkt van voren');

ok(Math.abs(angleDelta(0.1, 2 * Math.PI - 0.1) + 0.2) < 1e-9, 'kortste weg om de cirkel');
ok(ease(0, 10, 1000) > 9.99 && ease(0, 10, 0) === 0 && easeAngle(0, 3, 0.016) > 0, 'zachte stap');
let cam = { az: 0, el: 0.1, dist: 5, target: [0, 0, 0] };
const goal = { az: 3, el: 0.9, dist: 9, target: [1, 2, 3] };
for (let i = 0; i < 400; i++) cam = stepCamera(cam, goal, 1 / 60);
ok(Math.abs(angleDelta(cam.az, 3)) < 0.01 && Math.abs(cam.dist - 9) < 0.01 && Math.abs(cam.target[2] - 3) < 0.01, 'de camera komt aan');

ok(turntableAz(1, 0, 0.1) === 1 && turntableAz(1, TURNTABLE_AFTER - 0.1, 0.1) === 1, 'geen draaitafel vlak na aanraking');
ok(Math.abs(turntableAz(1, TURNTABLE_AFTER + 1, 0.5) - (1 + TURNTABLE_SPEED * 0.5)) < 1e-9, 'daarna draait hij zacht');
ok(turntableAz(1, 99, 0.5, true) === 1, 'beweging beperkt: nooit draaien');

ok(categoryOfField('body') === 'lak' && categoryOfField('finish') === 'lak' && categoryOfField('rimStyle') === 'velgen' && categoryOfField('glow') === 'licht' && categoryOfField('spoiler') === 'carrosserie' && categoryOfField('awning') === 'snack' && categoryOfField('ophanging') === 'onderdelen', 'veld naar categorie');
ok(EFFECT_OF_CATEGORY[categoryOfField('body')] === 'spray' && EFFECT_OF_CATEGORY[categoryOfField('rimStyle')] === 'spin' && EFFECT_OF_CATEGORY[categoryOfField('glow')] === 'neon' && EFFECT_OF_CATEGORY[categoryOfField('spoiler')] === 'flash', 'effect per soort wijziging');
for (const f of LOOK_FIELDS) ok(flashSpot(f).length === 3 && flashSpot(f).every((v) => v >= -1 && v <= 1), 'flitsplek', f);
for (const k of Object.keys(EFFECT_MS)) ok(effectLevel(k, 0) === 1 && effectLevel(k, EFFECT_MS[k]) === 0 && effectLevel(k, EFFECT_MS[k] / 2) > 0 && EFFECT_MS[k] <= 1600, 'effect loopt af en blijft kort', k);
const [a, b] = splitViewports(1000);
ok(a.x === 0 && a.w === 500 && b.x === 500 && b.w === 500 && splitViewports(1000, 0.9)[0].w === 800 && splitViewports(1000, 0.1)[0].w === 200, 'splitsing');
ok(SHOWROOM_BUDGET.renderers === 1 && SHOWROOM_BUDGET.shadowMaps === 0 && SHOWROOM_BUDGET.lights <= 5 && SHOWROOM_BUDGET.maxPixelRatio <= 1.5, 'budget: een renderer, geen schaduwkaarten, hoogstens vijf lichten');

// iconen: elk veld, elk onderdeel en elk tabblad heeft een betekenis die naar een gebundeld Phosphor-icoon wijst
for (const f of [...LOOK_FIELDS, 'body', ...PARTS]) { const ic = iconOfField(f); ok(ICON_MAP[ic] && PHOSPHOR[ICON_MAP[ic]], 'veldicoon bestaat', `${f} ${ic}`); }
for (const t of [...CATEGORIES.map((c) => c.id), 'onderdelen', 'builds']) ok(TAB_ICON[t] && ICON_MAP[TAB_ICON[t]] && PHOSPHOR[ICON_MAP[TAB_ICON[t]]], 'tabicoon bestaat', t);
for (const t of tabsFor('snackwagen')) ok(TAB_ICON[t.id], 'elk tabblad heeft een icoon', t.id);
ok(Object.values(FIELD_ICON).every((x) => ICON_MAP[x]), 'alle veldiconen staan in iconmap.js');

console.log(`showroomplan_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
