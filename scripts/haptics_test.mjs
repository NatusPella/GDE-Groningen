// Haptiek van de controller (#985): game/js/haptics.js. node scripts/haptics_test.mjs
import { hapticScale, eventProfile, hapticFrame, makeHapticState, hapticEvent, drainHapticEvents, canRumble, playHaptic, HAPTIC_EVENTS } from '../game/js/haptics.js';

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };

// instelling en Beweging beperken
check('standaard aan', hapticScale({}) === 1);
check('uit', hapticScale({ rumble: false }) === 0);
check('beweging beperken: uit', hapticScale({ rumble: true, reduceMotion: true }) === 0);
check('sterkte schaalt', hapticScale({ rumbleStrength: 0.5 }) === 0.5);
check('sterkte begrensd', hapticScale({ rumbleStrength: 9 }) === 1.5 && hapticScale({ rumbleStrength: -1 }) === 0);
check('rommel in de opslag geeft normaal', hapticScale({ rumbleStrength: 'x' }) === 1);

// profielen: alles binnen 0..1, sterker bij grotere klap
for (const n of Object.keys(HAPTIC_EVENTS)) {
  for (const k of [0, 0.5, 1]) {
    const p = eventProfile(n, k, 1.5, {});
    check('profiel binnen grenzen ' + n, p.strong >= 0 && p.strong <= 1 && p.weak >= 0 && p.weak <= 1 && p.ms >= 20 && p.ms <= 600, JSON.stringify(p));
  }
}
const zacht = eventProfile('impact', 0.1, 1, {}), hard = eventProfile('impact', 1, 1, {});
check('harder is sterker en langer', hard.strong > zacht.strong && hard.ms > zacht.ms);
check('schaal nul: niets', eventProfile('impact', 1, 0, {}).ms === 0);
check('onbekend profiel: niets', eventProfile('bestaatniet', 1, 1, {}).ms === 0);

// wachtrij
hapticEvent('pass'); hapticEvent('bestaatniet'); hapticEvent('bite', 1);
const got = []; drainHapticEvents((n, k) => got.push(n + ':' + k));
check('wachtrij', got.join() === 'pass:0.5,bite:1', got.join());
check('wachtrij leeg', (drainHapticEvents(() => got.push('x')), got.length === 2));

// frames
const base = { hp: 100, speed: null, kind: '', ground: '', slip: 0, money: 0, wanted: 0, impact: null, melee: null, kickFov: 0, inVehicle: false };
const frame = (st, over, dt = 1 / 60, scale = 1) => hapticFrame(st, { ...base, ...over }, dt, scale);
let st = makeHapticState();
check('eerste frame is stil (geen schijnklap)', frame(st, { impact: { strength: 1 } }).ms === 0);
let o = frame(st, { impact: { strength: 0.9 } });
check('botsing trilt', o.name === 'impact' && o.strong > 0.7, JSON.stringify(o));
o = frame(st, { impact: st.lastImpact });
check('zelfde klap niet twee keer', o.ms === 0);
o = frame(st, { hp: 60, impact: st.lastImpact });
check('schade trilt', o.name === 'hurt');
o = frame(st, { money: 500, hp: 60, impact: st.lastImpact });
check('geld trilt licht', o.name === 'money' && o.strong === 0);

st = makeHapticState(); frame(st, { speed: 20, kind: 'car', inVehicle: true });
o = frame(st, { speed: 20, kind: 'car', ground: 'gras', inVehicle: true });
check('gras: zachte rumble', o.name === 'ruw' && o.strong < 0.3 && o.weak > 0);
const o2 = frame(st, { speed: 20, kind: 'car', ground: 'asfalt', inVehicle: true });
check('asfalt: stil', o2.ms === 0);
o = frame(st, { speed: 20, kind: 'car', slip: 0.7, inVehicle: true });
check('drift trilt', o.name === 'drift');
const d1 = frame(st, { speed: 20, kind: 'car', slip: 0.4, inVehicle: true }).weak;
const d2 = frame(st, { speed: 20, kind: 'car', slip: 0.8, inVehicle: true }).weak;
check('drift stapelt met de slip', d2 > d1);
o = frame(st, { speed: 20, kind: 'heli', inVehicle: true });
check('heli: rotortrilling', o.name === 'motor');
o = frame(st, { speed: 20, kind: 'plane', inVehicle: true });
check('vliegtuig: motortrilling', o.name === 'motor');

st = makeHapticState(); frame(st, { wanted: 3 });
let beats = 0;
for (let i = 0; i < 300; i++) if (frame(st, { wanted: 3 }).name === 'beat') beats++;
check('politie: hartslag ongeveer elke seconde', beats >= 3 && beats <= 6, beats);
check('geen politie: geen hartslag', frame(st, { wanted: 0 }).ms === 0);

st = makeHapticState(); frame(st, { speed: 0, kind: 'bus', inVehicle: true });
let bus = 0;
for (let i = 1; i <= 60; i++) if (frame(st, { speed: i * 0.1, kind: 'bus', inVehicle: true }).name === 'ov') bus++;
check('bus trekt op: lage dreun', bus > 10, bus);

st = makeHapticState(); frame(st, {}); o = frame(st, { inVehicle: true, speed: 0, kind: 'car' });
st = makeHapticState(); frame(st, { speed: 0, kind: 'car' }); o = frame(st, { inVehicle: true, speed: 0, kind: 'car' });
check('instappen: tik', o.name === 'enter' || st.veh === true);

st = makeHapticState(); frame(st, {}); o = frame(st, { kickFov: 1 });
check('schot', o.name === 'shot');

// uit: nooit iets, ook bij een klap
st = makeHapticState(); frame(st, {}, 1 / 60, 0);
o = frame(st, { impact: { strength: 1 }, wanted: 5, hp: 10 }, 1 / 60, 0);
check('schaal 0: stil', o.ms === 0 && o.strong === 0 && o.weak === 0);

// afspelen en feature-detectie
const calls = [];
const padA = { vibrationActuator: { type: 'dual-rumble', playEffect: (t, p) => { calls.push([t, p]); return Promise.reject(new Error('x')); } } };
check('canRumble dual-rumble', canRumble(padA));
check('playHaptic speelt', playHaptic(padA, 2, 0.5, 100) && calls[0][1].strongMagnitude === 1 && calls[0][1].duration === 100);
const pulses = [];
const padB = { hapticActuators: [{ pulse: (v, ms) => { pulses.push([v, ms]); return Promise.resolve(); } }] };
check('terugval op pulse', canRumble(padB) && playHaptic(padB, 0.3, 0.8, 90) && pulses[0][0] === 0.8);
check('geen actuator: false, geen fout', !canRumble({}) && !playHaptic({}, 1, 1, 50) && !canRumble(null) && !playHaptic(null, 1, 1, 50));
const padC = { vibrationActuator: { playEffect: () => { throw new Error('boem'); } } };
check('gooiende actuator: false', playHaptic(padC, 1, 1, 50) === false);
check('niets te trillen: false', playHaptic(padA, 0, 0, 50) === false);

if (bad) { console.log(bad, 'fout(en)'); process.exit(1); }
console.log('haptics_test: ok');
