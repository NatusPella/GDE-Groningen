// Helikopter, vliegtuig en boot met opnames (sfx/aircraftmap.js en sfx/aircraft.js): de koppeling van gas, toeren en snelheid aan niveau en
// toonhoogte, de lussen (naad en lengte), de bronnen (CC0 of CC-BY, in het manifest, in docs/AUDIO-VOERTUIGEN.md) en een
// nagemaakte audiograaf waarin het vliegtuig start, vliegt, overtrekt, landt en uitloopt zonder fout.
//   node scripts/aircraft_sfx_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rotorParams, planeParams, planeRpmTarget, rpmStep, gearEvent, startNeeded, dopplerFactor, boatParams, edge } from '../game/js/sfx/aircraftmap.js';
import { updateAircraftSfx, HELI_KEYS, PLANE_KEYS, BOAT_KEYS, keysReady, motorBoat, STEM_STIL_NA } from '../game/js/sfx/aircraft.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };

// -- helikopter: het toerental stuurt de afspeelsnelheid, snelheid en dalen de lagen ------------------------------------------
const r0 = rotorParams({ rotor: 0 }), r5 = rotorParams({ rotor: 0.5 }), r1 = rotorParams({ rotor: 1 });
ok(r0.level === 0 && r0.rate < r5.rate && r5.rate < r1.rate, 'rotor: niveau en afspeelsnelheid stijgen met het toerental');
ok(Math.abs(r1.rate - 1) < 0.01 && r0.rate > 0.3, 'rotor: bij vol toerental de oorspronkelijke toonhoogte');
const hov = rotorParams({ rotor: 1, speed: 0 }), fast = rotorParams({ rotor: 1, speed: 25 });
ok(fast.flightGain > hov.flightGain && fast.statGain < hov.statGain, 'rotor: snelheid brengt de vluchtlaag omhoog en de stationairlaag omlaag');
const lvl = rotorParams({ rotor: 1, speed: 15, vz: 0 }), dalen = rotorParams({ rotor: 1, speed: 15, vz: -4 });
ok(dalen.flightGain > lvl.flightGain && dalen.flightRate < lvl.flightRate, 'rotor: dalen in vooruitvaart geeft sterkere wop-wop en een iets lager ritme');
ok(rotorParams({ rotor: 1, bank: 0.5, speed: 15 }).flightGain > lvl.flightGain, 'rotor: schuin vliegen geeft meer wop');
ok(rotorParams({ rotor: 1, inside: true }).cutoff < rotorParams({ rotor: 1 }).cutoff, 'rotor: in de cabine dof');
for (const k of ['rate', 'flightRate', 'statGain', 'flightGain', 'level', 'cutoff']) ok(Object.values({ r0, r5, r1, hov, fast, dalen }).every((o) => Number.isFinite(o[k])), `rotor: ${k} eindig`);
ok(edge(100, 1400) === 1 && edge(1400, 1400) === 0 && edge(1250, 1400) === 0.5, 'afstandsrand loopt lineair naar nul aan de grens');

// -- vliegtuig -----------------------------------------------------------------------------------------------------------
ok(planeRpmTarget({ running: false, throttle: 1, speed: 60 }) === 0, 'vliegtuig: uit is nul toeren');
const idle = planeRpmTarget({ running: true }), full = planeRpmTarget({ running: true, throttle: 1, speed: 70 });
ok(idle > 0.15 && idle < 0.3 && full === 1, `vliegtuig: stationair ${idle.toFixed(2)} en vol gas ${full}`);
ok(planeRpmTarget({ running: true, throttle: 0.5, speed: 20 }) > planeRpmTarget({ running: true, throttle: 0.2, speed: 20 }), 'vliegtuig: meer gas, meer toeren');
const pi = planeParams({ rpm: idle }), ph = planeParams({ rpm: 1, speed: 60, onGround: false, airborne: true });
ok(pi.idleGain > 0.9 && pi.highGain < 0.05, 'vliegtuig: stationair klinkt de lage laag');
ok(ph.highGain > 0.9 && ph.idleGain < 0.05, 'vliegtuig: vol gas klinkt de hoge laag');
ok(ph.highRate > pi.idleRate * 0.7 && planeParams({ rpm: 1 }).highRate > planeParams({ rpm: 0.4 }).highRate, 'vliegtuig: toonhoogte stijgt met de toeren');
ok(planeParams({ rpm: 0 }).level === 0, 'vliegtuig: bij stilstaande motor geen niveau (de schroef is uitgelopen)');
const w0 = planeParams({ rpm: 1, speed: 5, onGround: false }), w1 = planeParams({ rpm: 1, speed: 60, onGround: false });
ok(w1.windGain > w0.windGain * 3 && w1.windCutoff > w0.windCutoff && w1.windRate > w0.windRate, 'vliegtuig: wind groeit met de snelheid (niveau, helderheid, toonhoogte)');
const ga = planeParams({ rpm: 0.5, speed: 12, onGround: true, surface: 'gras' }), aa = planeParams({ rpm: 0.5, speed: 12, onGround: true, surface: 'asfalt' }), lucht = planeParams({ rpm: 0.5, speed: 40, onGround: false });
ok(ga.rollGrasGain > 0.3 && ga.rollAsfaltGain === 0 && aa.rollAsfaltGain > 0.3 && aa.rollGrasGain === 0, 'vliegtuig: de rolklank volgt de ondergrond');
ok(lucht.rollGrasGain === 0 && lucht.rollAsfaltGain === 0, 'vliegtuig: in de lucht rollen de wielen niet');
ok(planeParams({ rpm: 0.5, speed: 0.2, onGround: true }).rollGrasGain === 0, 'vliegtuig: stilstaand geen rolklank');
ok(planeParams({ rpm: 0.5, speed: 15, onGround: true }).rollGrasGain < planeParams({ rpm: 0.5, speed: 30, onGround: true }).rollGrasGain, 'vliegtuig: harder rollen is luider');
ok(planeParams({ rpm: 0.5, speed: 30, airborne: true, stalled: true }).stallGain === 1, 'vliegtuig: overtrek geeft de zoemer vol');
ok(planeParams({ rpm: 0.5, speed: 23, airborne: true, stallV: 22 }).stallGain > 0.2, 'vliegtuig: vlak boven de overtrek klinkt de zoemer al zacht');
ok(planeParams({ rpm: 0.5, speed: 60, airborne: true }).stallGain === 0 && planeParams({ rpm: 0.5, speed: 10, airborne: false, stalled: true }).stallGain === 0, 'vliegtuig: geen zoemer bij snelheid of op de grond');
ok(planeParams({ rpm: 1, speed: 60, inside: true }).cutoff < planeParams({ rpm: 1, speed: 60 }).cutoff, 'vliegtuig: in de cabine dof');
ok(gearEvent(true, false, true) && gearEvent(false, true, true) && !gearEvent(true, true, true) && !gearEvent(undefined, false, true) && !gearEvent(true, false, false), 'landingsgestel: klank bij een wissel in de lucht');
ok(startNeeded(false, true, 0) && !startNeeded(true, true, 0) && !startNeeded(false, true, 40) && !startNeeded(false, false, 0), 'motorstart: alleen bij aangaan op de grond');
let rpm = 1; const down = []; for (let i = 0; i < 300; i++) { rpm = rpmStep(rpm, 0, 0.033); down.push(rpm); }
ok(down[30] > 0.5 && down[299] < 0.02 && down.every((x, i) => i === 0 || x <= down[i - 1]), 'schroef: loopt in ~10 s monotoon uit');
let up = 0; for (let i = 0; i < 30; i++) up = rpmStep(up, 1, 0.033);
ok(up > 0.6, 'schroef: loopt in een seconde op');
const dpp = dopplerFactor({ x: 100, y: 0, h: 0 }, { x: -60, y: 0, h: 0 }, { x: 0, y: 0, h: 0 }), dpa = dopplerFactor({ x: 100, y: 0, h: 0 }, { x: 60, y: 0, h: 0 }, { x: 0, y: 0, h: 0 });
ok(dpp.f > 1 && dpa.f < 1 && Math.abs(dpp.f - 343 / (343 - 60)) < 1e-9, 'doppler: hoger bij naderen, lager bij wegvliegen');
const b0 = boatParams({ speed: 0, throttle: 0 }), b1 = boatParams({ speed: 14, throttle: 1 });
ok(b0.idleGain > 0.8 && b0.fullGain < 0.05 && b1.fullGain > 0.9 && b1.idleGain < 0.05 && b1.fullRate > b0.fullRate, 'boot: stationair kruist naar vol gas op snelheid en gas');

// -- lussen en bronnen ------------------------------------------------------------------------------------------------------
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'game', 'audio', 'sfx', 'manifest.json'), 'utf8')).geluiden;
const LUSSEN = ['heli_rotor_stat', 'heli_rotor_vlucht', 'vliegtuig_stationair', 'vliegtuig_toeren', 'vliegtuig_wind', 'vliegtuig_overtrek', 'vliegtuig_rol_asfalt', 'vliegtuig_rol_gras', 'boot_motor_stat', 'boot_motor_vol'];
const EEN = ['vliegtuig_start', 'vliegtuig_gestel'];
const licDoc = ['AUDIO-VOERTUIGEN.md', 'AUDIO-LICENTIES.md'].map((f) => { try { return fs.readFileSync(path.join(ROOT, 'docs', f), 'utf8'); } catch { return ''; } }).join('\n');
for (const k of [...LUSSEN, ...EEN]) {
  const m = man[k];
  ok(m, `${k}: staat in het manifest`);
  if (!m) continue;
  ok(fs.existsSync(path.join(ROOT, 'game', 'audio', 'sfx', m.bestand)), `${k}: bestand bestaat`);
  ok(m.loop === LUSSEN.includes(k), `${k}: loop-vlag klopt`);
  ok(/^Creative Commons (0|Attribution)/.test(m.herkomst.licentie) && !/NonCommercial|NoDerivatives|Sampling/i.test(m.herkomst.licentie), `${k}: CC0 of CC-BY (${m.herkomst.licentie})`);
  ok(m.herkomst.url && m.herkomst.auteur && m.herkomst.freesound_id, `${k}: bron, auteur en id`);
  ok(licDoc.includes(String(m.herkomst.freesound_id)), `${k}: id ${m.herkomst.freesound_id} staat in docs/AUDIO-VOERTUIGEN.md of AUDIO-LICENTIES.md`);
  ok(m.grootte_kb < 120, `${k}: klein genoeg (${m.grootte_kb} kB)`);
  if (m.loop) ok(m.naad && m.naad.sprong_ratio < 3 && Math.abs(m.naad.niveaustap_db) < 3.5, `${k}: naad zonder klik of niveausprong`, JSON.stringify(m.naad));
  ok(m.niveau && m.niveau.piek_db <= -1.9, `${k}: piek onder -2 dB`);
}
const totaal = [...LUSSEN, ...EEN].reduce((s, k) => s + (man[k] ? man[k].grootte_kb : 0), 0);
ok(totaal < 4096, `samen ${Math.round(totaal)} kB, onder 4 MB`);

// -- de sturing met een nagemaakte audiograaf -----------------------------------------------------------------------------------
const calls = [];
const bronnen = [];
const param = (name) => ({ value: 0, setTargetAtTime(v, t, tau) { this.value = v; calls.push([name, v]); } });
const node = (name) => ({ gain: param(name + '.gain'), frequency: param(name + '.f'), playbackRate: param(name + '.rate'), Q: { value: 0 }, positionX: param(''), positionY: param(''), positionZ: param(''), connect(x) { return x; }, disconnect() {}, start() {}, stop() {}, type: '' });
const ctx = { currentTime: 0, createGain: () => node('gain'), createBiquadFilter: () => node('bq'), createBufferSource: () => { const s = node('src'); s.started = 0; s.start = () => { s.started++; }; s.stop = () => { s.stopped = true; }; bronnen.push(s); return s; } };
const bufs = new Set([...HELI_KEYS, ...PLANE_KEYS, ...BOAT_KEYS]);
const kit = { ctx, samples: { has: (k) => bufs.has(k), buffer: () => ({ duration: 5 }) }, buses: { sfx: node('bus') }, listener: { x: 0, y: 1.6, z: 0 }, makePanner: () => node('pan'), setPannerPos() {} };
ok(keysReady(kit, PLANE_KEYS) && keysReady(kit, HELI_KEYS) && !keysReady({ samples: { has: () => false } }, PLANE_KEYS) && !keysReady(null, PLANE_KEYS), 'keysReady: alleen met alle opnames');
ok(motorBoat({ isBoat: true, model: { kind: 'sloep' } }) && !motorBoat({ isBoat: true, model: { sail: true } }) && !motorBoat({ isBoat: true, model: { kind: 'kano' } }) && !motorBoat({ isBoat: false }), 'motorBoot: geen zeil- of peddelboot');
const kist = { isPlane: true, driver: 'player', x: 0, y: 0, z: 0, speed: 0, vx: 0, vy: 0, vz: 0, throttle: 0, onGround: true, airborne: false, gear: true, model: { maxSpeed: 70 }, plane: { stalled: false } };
const world = { vehicles: [kist], players: [], paused: false };
let thrown = null;
const stap = (dt = 0.033) => { try { updateAircraftSfx(dt, world, kit); ctx.currentTime += dt; } catch (e) { thrown = thrown || e; } };
const lastOf = (name) => { for (let i = calls.length - 1; i >= 0; i--) if (calls[i][0] === name) return calls[i][1]; return undefined; };
for (let i = 0; i < 30; i++) stap();
ok(thrown === null, 'audiograaf: geen fout bij stilstaan', String(thrown && thrown.stack));
kist.throttle = 1; kist.speed = 40; kist.onGround = false; kist.airborne = true; kist.vx = 40;
for (let i = 0; i < 90; i++) stap();
ok(thrown === null, 'audiograaf: geen fout bij vliegen', String(thrown && thrown.stack));
ok(calls.every(([, v]) => Number.isFinite(v)), 'audiograaf: elke parameter eindig');
kist.speed = 18; kist.plane.stalled = true;
for (let i = 0; i < 10; i++) stap();
ok(thrown === null, 'audiograaf: geen fout bij overtrek');
kist.gear = false; stap();
kist.driver = null; kist.throttle = 0; kist.speed = 0; kist.onGround = true; kist.airborne = false;
for (let i = 0; i < 400; i++) stap();
ok(thrown === null, 'audiograaf: geen fout bij uitlopen');
ok(calls.length > 100, 'audiograaf: parameters gezet');

// een stille lusstem wordt na STEM_STIL_NA gestopt (audit 21-11: de zes vliegtuiglussen liepen anders de hele sessie door op gain 0)
{
  const levend = () => bronnen.filter((b) => b.loop && b.started && !b.stopped).length;
  ok(bronnen.length >= 6 && levend() >= 6, 'stemstop: de vliegtuiglussen lopen zolang het toestel net stilstond');
  const per = 0.033; for (let i = 0; i < Math.ceil(STEM_STIL_NA / per) + 5; i++) stap();
  ok(levend() === 0, 'stemstop: na lange stilte zijn alle lusbronnen gestopt', String(levend()));
  ok(thrown === null, 'stemstop: geen fout bij het afbreken', String(thrown && thrown.stack));
  const voor = bronnen.length;
  kist.driver = 'player'; kist.throttle = 0.5; for (let i = 0; i < 20; i++) stap();
  ok(bronnen.length > voor && levend() >= 6 && thrown === null, 'stemstop: het toestel bouwt de stem opnieuw bij nieuw gebruik');
}

// -- bedrading ----------------------------------------------------------------------------------------------------------
const audioSrc = fs.readFileSync(path.join(ROOT, 'game', 'js', 'audio.js'), 'utf8');
const skySrc = fs.readFileSync(path.join(ROOT, 'game', 'js', 'sfx', 'sky.js'), 'utf8');
ok(/samples,\s+\/\/ de opnames/.test(audioSrc) && /planeSamplesReady/.test(audioSrc), 'audio.js geeft de opnames door en laat de motorsynth voor een vliegtuig met opnames zwijgen');
ok(/updateAircraftSfx\(dt, world, k\)/.test(skySrc) && /buildHeliVoice\(\)/.test(skySrc), 'sky.js: opnames voor het vliegtuig en de rotor, de procedurele rotor blijft de terugval');

console.log(`aircraft_sfx_test: ${fails} fouten van ${n}`);
process.exit(fails ? 1 : 0);
