// Toerental en versnelling voor elk motormodel (#33): een volle optrekrit van stilstand tot
// topsnelheid en terug met de pure gearbox, zonder het spel.
//   node scripts/gearbox_sweep_test.mjs
import { PROFILES, createGearbox, stepGearbox, gearboxReadout, wheelieLift } from '../game/js/gearbox.js';

let bad = 0;
const check = (name, ok) => { if (!ok) { bad++; console.log('FAIL', name); } };
const DT = 1 / 60;

for (const [id, p] of Object.entries(PROFILES)) {
  for (const top of [12, 30, 60]) {
    const gb = createGearbox(id);
    let last = 1, drops = 0, maxRpm = 0, minRpm = 1e9, shifts = 0;
    for (let s = 0; s <= top * 1.02; s += top / 600) {
      stepGearbox(gb, { speed: s, top, throttle: 1, mode: 'auto' }, DT);
      if (gb.gear < last) drops++;
      if (gb.gear !== last) shifts++;
      last = gb.gear;
      maxRpm = Math.max(maxRpm, gb.rpm); minRpm = Math.min(minRpm, gb.rpm);
      if (!Number.isFinite(gb.rpm)) { check(`${id}/${top}: rpm is een getal`, false); break; }
    }
    const tag = `${id} top ${top}`;
    check(`${tag}: toerental blijft onder de begrenzer`, maxRpm <= p.red + 1);
    check(`${tag}: toerental blijft boven stationair`, minRpm >= p.idle - 1);
    check(`${tag}: nooit terugschakelen tijdens optrekken`, drops === 0);
    check(`${tag}: alle versnellingen gebruikt`, gb.gear === p.tops.length);
    check(`${tag}: ${shifts} keer schakelen is precies het aantal versnellingen min een`, shifts === p.tops.length - 1);
    const r = gearboxReadout(gb);
    check(`${tag}: uitlezing heeft toerental en versnelling`, r && typeof r === 'object');
    // terug naar stilstand: weer in de eerste
    for (let s = top; s >= 0; s -= top / 300) stepGearbox(gb, { speed: s, top, throttle: 0, mode: 'auto' }, DT);
    check(`${tag}: stilstaand weer in de eerste`, gb.gear === 1);
    check(`${tag}: stilstand blijft op of boven stationair`, gb.rpm >= p.idle - 1);
  }
  if (p.wheelie) check(`${id}: wheelie alleen met gas`, wheelieLift(createGearbox(id), 0.2, 1) >= 0 && wheelieLift(createGearbox(id), 0.2, 0) === 0);
}
if (bad) process.exit(1);
console.log('gearbox_sweep: all passed');
