// Instrumenten, kleppen, landingsgestel en wind van het arcade-vliegtuig (#444, #397).
//   node scripts/instrumenten_test.mjs
import assert from 'node:assert';
import { makePlane, stepPlane, PLANE, tegenwind } from '../game/js/arcadeplane.js';
import { planeInput, planeStatus, attachPlane, flyPlaneVehicle } from '../game/js/planecontrol.js';
import { zomerWind, kompasGraden, kompasLetters, windUit, instrumentData, BEDIENING, UITLEG_INSTAPPEN } from '../game/js/instrumenten.js';

const flat = () => 0;
const dt = 1 / 60;
let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); };

// kompas: 0 is oost in de wereld, y groeit naar het zuiden
ok(kompasGraden(0) === 90 && kompasGraden(Math.PI / 2) === 180 && kompasGraden(-Math.PI / 2) === 0 && kompasGraden(Math.PI) === 270, 'kompasgraden');
ok(kompasLetters(0) === 'N' && kompasLetters(90) === 'O' && kompasLetters(225) === 'ZW' && kompasLetters(359) === 'N', 'kompasletters');

// wind: een zomerse bries, altijd tussen 0 en 7 m/s, en stuurt de richting van het weer
let max = 0, min = 99;
for (let t = 0; t < 6000; t += 7) { const w = zomerWind(t, 1); max = Math.max(max, w.speed); min = Math.min(min, w.speed); ok(Math.abs(Math.hypot(w.x, w.y) - w.speed) < 1e-9, 'wind x,y klopt'); }
ok(max <= 7 && min >= 0 && max > 3, `windbereik ${min.toFixed(1)}..${max.toFixed(1)}`);
ok(windUit({ speed: 4, dir: 0 }) === 'W' && windUit({ speed: 0, dir: 0 }) === 'windstil', 'wind uit');
ok(zomerWind(NaN, NaN).speed >= 0, 'wind zonder getal');

// tegenwind
ok(Math.abs(tegenwind({ x: -5, y: 0 }, 0) - 5) < 1e-9 && Math.abs(tegenwind({ x: 5, y: 0 }, 0) + 5) < 1e-9 && tegenwind(null, 0) === 0, 'tegenwind');

// kleppen: lagere opstijgsnelheid
function startOp(flaps, wind) {
  const p = makePlane(0, 0, 0, 0);
  let t = 0;
  while (p.onGround && t < 60) { stepPlane(p, { throttle: 1, pitch: 1, flaps, wind }, dt, flat); t += dt; }
  return { t, speed: p.speed, p };
}
const a = startOp(0), b = startOp(3);
ok(!a.p.onGround && !b.p.onGround, 'beide komen van de baan');
ok(b.speed < a.speed - 4, `kleppen: lager opstijgen ${b.speed.toFixed(1)} < ${a.speed.toFixed(1)}`);
const tw = startOp(0, { x: -7, y: 0 }), rw = startOp(0, { x: 7, y: 0 });
ok(tw.t < a.t && rw.t > a.t, 'tegenwind: korter, rugwind: langer rollen');

// kleppen klappen boven flapMax vanzelf in
const f = makePlane(0, 0, 200, 0); f.onGround = false; f.speed = PLANE.flapMax + 4;
stepPlane(f, { throttle: 1, flaps: 3 }, dt, flat);
ok(f.flaps === 0, 'kleppen klappen in bij hoge snelheid');

// landingsgestel: in de lucht in en uit, op de grond altijd uit, zonder gestel is een landing een crash
const g = makePlane(0, 0, 100, 0); g.onGround = false; g.speed = 40;
stepPlane(g, { throttle: 0.5, gear: false }, dt, flat);
ok(g.gear === false, 'gestel in');
const bel = makePlane(0, 0, 30, 0); bel.onGround = false; bel.speed = 30; bel.vz = -2; bel.gear = false;
for (let i = 0; i < 9000 && !bel.onGround && !bel.crashed; i++) stepPlane(bel, { throttle: 0.3, pitch: -0.05, gear: false }, dt, flat);
ok(bel.crashed, 'landen zonder gestel is een crash');
const met = makePlane(0, 0, 30, 0); met.onGround = false; met.speed = 30; met.vz = -2;
for (let i = 0; i < 9000 && !met.onGround && !met.crashed; i++) stepPlane(met, { throttle: 0.3, pitch: -0.05 }, dt, flat);
ok(met.onGround && met.landing === 'zacht', 'zachte landing met gestel uit');

// een te snelle landing is hard (maar je leeft), een zachte telt als zacht
const snel = makePlane(0, 0, 4, 0); snel.onGround = false; snel.speed = 64; snel.vz = -2.5;
for (let i = 0; i < 3000 && !snel.onGround && !snel.crashed; i++) stepPlane(snel, { throttle: 1, pitch: -0.08 }, dt, flat);
ok(snel.onGround && snel.landing === 'hard', `te snel is hard: ${snel.landing} ${snel.crashed}`);

// wind laat het vliegtuig in de lucht driften, niet op de grond
const dr = makePlane(0, 0, 200, 0); dr.onGround = false; dr.speed = 45;
const x0 = dr.x, y0 = dr.y;
for (let i = 0; i < 600; i++) stepPlane(dr, { throttle: 0.5, wind: { x: 0, y: 6 } }, dt, flat);
ok(dr.y - y0 > 50, `drift door zijwind ${dr.y - y0}`);

// toetsen: T en G werken per druk, niet zolang je ze vasthoudt
const keys = new Set();
const st = { thr: 0 };
const down = (k) => keys.has(k);
keys.add('k'); let i1 = planeInput(down, st, dt); i1 = planeInput(down, st, dt);
ok(i1.flaps === 1, 'K een keer per druk');
keys.delete('k'); planeInput(down, st, dt); keys.add('k'); ok(planeInput(down, st, dt).flaps === 2, 'tweede druk');
keys.delete('k'); keys.add('g'); ok(planeInput(down, st, dt).gear === false, 'G haalt het gestel in'); keys.delete('g'); planeInput(down, st, dt); keys.add('g'); ok(planeInput(down, st, dt).gear === true, 'G zet het weer uit');
for (let i = 0; i < 5; i++) { keys.delete('k'); planeInput(down, st, dt); keys.add('k'); planeInput(down, st, dt); }
ok(st.flaps >= 0 && st.flaps <= 3, 'kleppen blijven tussen 0 en 3');

// op het voertuig: data en status voor het paneel
const v = { groundZ: 0, plane: null };
attachPlane(v, 0, 0, 0, 0);
v.plane.onGround = false; v.plane.z = 120; v.plane.speed = 40; v.plane.flaps = 2; v.plane.gear = false; v.plane.pitch = 0.1; v.plane.roll = -0.2;
const d = instrumentData(v, { x: -3, y: 0, speed: 3, dir: 0 });
ok(d.speedKmh === 144 && d.altM === 120 && d.graden === 90 && d.flaps === 2 && d.gear === false && d.tegenwind === 3 && d.windUit === 'W', JSON.stringify(d));
ok(instrumentData({}, null) === null, 'geen vliegtuig, geen data');
v.plane.z = 20; v.groundZ = 0; v.plane.speed = 30;
ok(/G/.test(planeStatus(v).state), 'waarschuwing: gestel nog in, laag en langzaam');
const v2 = { groundZ: 0 }; attachPlane(v2, 0, 0, 0, 0); v2.plane.onGround = false; v2.plane.z = 100; v2.plane.speed = 40;
flyPlaneVehicle(v2, dt, (k) => k === 'g', flat, () => false, { x: 0, y: 5 });
ok(v2.gear === false && v2.flaps === 0, 'flyPlaneVehicle volgt G');

// teksten: Nederlands, geen merken
ok(/kleppen/i.test(UITLEG_INSTAPPEN) && /landingsgestel/i.test(BEDIENING), 'uitleg noemt kleppen en gestel');
ok(!/\b(the|and|you|your|flaps|gear)\b/i.test(UITLEG_INSTAPPEN + BEDIENING), 'alleen Nederlands');

console.log(`instrumenten_test: alles goed (${n} controles)`);
