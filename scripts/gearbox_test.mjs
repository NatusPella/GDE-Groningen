// Gearbox: ratios, shift logic, rev limiter, stall, engine braking.
//   node scripts/gearbox_test.mjs
import { PROFILES, createGearbox, stepGearbox, shift, torqueCurve, autoGear, profileFor } from '../game/js/gearbox.js';

let bad = 0;
const check = (name, ok) => { if (!ok) { bad++; console.log('FAIL', name); } };
const DT = 1 / 60;
const run = (gb, inp, secs) => { for (let i = 0; i < secs / DT; i++) stepGearbox(gb, inp, DT); };

for (const [id, p] of Object.entries(PROFILES)) {
  check(id + ' tops rise', p.tops.every((t, i) => i === 0 || t > p.tops[i - 1]));
  check(id + ' last gear covers top speed', p.tops[p.tops.length - 1] >= 1);
  check(id + ' layout has every gear once', p.tops.every((_, i) => p.layout.filter((x) => x === i + 1).length === 1));
  check(id + ' idle under redline', p.idle < p.red * 0.3);
}
check('bike layout is 1-N-2', PROFILES.motorSport.layout.slice(0, 3).join('') === '1N2');
check('car layout is N-1-2', PROFILES.car.layout.slice(0, 3).join('') === 'N12');
check('six gears on the bikes', ['motorSport', 'motorNaked', 'motorOld'].every((k) => PROFILES[k].tops.length === 6));
check('moped has 3-4 gears', PROFILES.moped.tops.length >= 3 && PROFILES.moped.tops.length <= 4);

check('torque curve: weak low, full mid, none on the limiter', torqueCurve(0.1) < 0.5 && torqueCurve(0.6) >= 1 && torqueCurve(1) === 0 && torqueCurve(0.95) > 0.5);

// automatic: gear and rpm follow speed, power untouched
{
  const gb = createGearbox('car');
  const top = 50;
  let last = 0;
  for (let s = 0; s <= top; s += 0.5) {
    stepGearbox(gb, { speed: s, top, throttle: 1, mode: 'auto' }, DT);
    check('auto gear never drops while speeding up', gb.gear >= last);
    last = gb.gear;
    check('auto torque stays 1', gb.torque === 1 && gb.engineBrake === 0);
    check('auto rpm within range', gb.rpm >= PROFILES.car.idle - 1 && gb.rpm <= PROFILES.car.red);
  }
  check('auto ends in top gear', gb.gear === 5);
  stepGearbox(gb, { speed: 5, top, throttle: 0, mode: 'auto' }, DT);
  check('auto downshifts when slowing', gb.gear === 1);
  check('auto never uses neutral', autoGear(PROFILES.car, 0, 1) === 1);
}

// automatic: speed hovering on a shift point (#126) must not make the gear hunt
for (const id of Object.keys(PROFILES)) {
  const p = PROFILES[id];
  for (let g = 1; g < p.tops.length; g++) {
    const top = 40;
    const gb = createGearbox(id);
    let shifts = 0, last = -1;
    // 20 s at constant gas, speed wobbling +-3% of top around the up-shift point and the down-shift point
    for (const base of [p.tops[g - 1] + 0.005, p.tops[g - 1] - 0.02]) {
      for (let i = 0; i < 20 / DT; i++) {
        const frac = base + 0.03 * Math.sin(i * DT * 2 * Math.PI * 0.7);
        stepGearbox(gb, { speed: frac * top, top, throttle: 1, mode: 'auto' }, DT);
        if (last >= 0 && gb.gear !== last) shifts++;
        last = gb.gear;
      }
    }
    check(id + ' gear ' + g + '/' + (g + 1) + ' does not hunt (' + shifts + ' shifts in 40 s)', shifts <= 40 / 1.2 * 0.5);
  }
}

// manual: shifts walk the layout, the cut and the protections
{
  const gb = createGearbox('car');
  const top = 50;
  stepGearbox(gb, { speed: 0, top, throttle: 0, mode: 'manual' }, DT);
  check('manual starts in first', gb.gear === 1);
  check('up goes to second', shift(gb, 1, 0) === 'ok' && gb.gear === 2);
  stepGearbox(gb, { speed: 8, top, throttle: 1, mode: 'manual' }, DT);
  check('shift cuts torque for a moment', gb.torque === 0);
  run(gb, { speed: 8, top, throttle: 1, mode: 'manual' }, 0.4);
  check('torque back after the shift', gb.torque > 0);
  check('down into first at speed 6 is fine', shift(gb, -1, 6 / top) === 'ok');
  gb.pos = 5; gb.gear = 5;
  check('no gear above the last', shift(gb, 1, 0.5) === 'none');
  const hi = createGearbox('car');
  stepGearbox(hi, { speed: 0, top, throttle: 0, mode: 'manual' }, DT);
  hi.pos = 3; hi.gear = 3;
  check('over-rev downshift refused', shift(hi, -1, 0.6) === 'refuse' && hi.gear === 3);
  // rev limiter: a gear held at full throttle hits the limiter and stays under red
  const lim = createGearbox('car');
  stepGearbox(lim, { speed: 0, top, throttle: 1, mode: 'manual' }, DT);
  let hits = 0, over = 0;
  for (let i = 0; i < 200; i++) {
    stepGearbox(lim, { speed: top * 0.2, top, throttle: 1, mode: 'manual' }, DT);
    if (lim.limiter) hits++;
    if (lim.rpm > PROFILES.car.red) over++;
  }
  check('first gear at 20% of top hits the limiter', hits > 20 && over === 0);
  stepGearbox(lim, { speed: top * 0.2, top, throttle: 1, mode: 'manual' }, DT);
  check('limiter cuts power', lim.limiter && lim.torque === 0);
  // engine braking: absent on the throttle, there off it
  const eb = createGearbox('car');
  stepGearbox(eb, { speed: 0, top, throttle: 0, mode: 'manual' }, DT);
  eb.pos = 2; eb.gear = 2;
  stepGearbox(eb, { speed: 12, top, throttle: 0, mode: 'manual' }, DT);
  const second = eb.engineBrake;
  check('engine braking exists in manual', second > 0.2);
  eb.pos = 5; eb.gear = 5;
  stepGearbox(eb, { speed: 12, top, throttle: 0, mode: 'manual' }, DT);
  check('engine braking weaker in the top gear at the same speed', eb.engineBrake < second);
  eb.pos = 2; eb.gear = 2;
  stepGearbox(eb, { speed: 12, top, throttle: 1, mode: 'manual' }, DT);
  check('no engine braking on the throttle', eb.engineBrake === 0);
  // neutral: no pull, free revs
  const n = createGearbox('motorSport');
  stepGearbox(n, { speed: 0, top: 70, throttle: 0, mode: 'manual' }, DT);
  check('bike starts in first', n.gear === 1);
  check('first -> N', shift(n, 1, 0) === 'ok' && n.gear === 0);
  run(n, { speed: 0, top: 70, throttle: 1, mode: 'manual' }, 0.6);
  check('neutral revs freely with no torque', n.torque === 0 && n.rpm > PROFILES.motorSport.red * 0.8);
  shift(n, 1, 0);
  check('N -> second', n.gear === 2);
}

// clutch mode: grinding, stalling, restart
{
  const gb = createGearbox('car');
  const top = 50;
  stepGearbox(gb, { speed: 0, top, throttle: 0, mode: 'clutch', clutchIn: false }, DT);
  check('clutch mode at a standstill starts in neutral', gb.gear === 0);
  check('shift without the clutch grinds', shift(gb, 1, 0) === 'grind' && gb.gear === 0);
  stepGearbox(gb, { speed: 0, top, throttle: 0, mode: 'clutch', clutchIn: true }, DT);
  check('shift with the clutch in works', shift(gb, 1, 0) === 'ok' && gb.gear === 1);
  stepGearbox(gb, { speed: 0, top, throttle: 0, mode: 'clutch', clutchIn: true }, DT);
  check('clutch in: no torque, no stall', gb.torque === 0 && !gb.stalled);
  run(gb, { speed: 0, top, throttle: 0, mode: 'clutch', clutchIn: false }, 0.1);
  check('clutch out at a standstill without gas stalls', gb.stalled);
  run(gb, { speed: 0, top, throttle: 1, mode: 'clutch', clutchIn: false }, 1.5);
  check('stays stalled until the clutch goes in', gb.stalled);
  run(gb, { speed: 0, top, throttle: 0, mode: 'clutch', clutchIn: true }, 1.2);
  check('restarts with the clutch in', !gb.stalled);
  run(gb, { speed: 0, top, throttle: 1, mode: 'clutch', clutchIn: false }, 0.3);
  check('a launch with gas in first does not stall', !gb.stalled && gb.torque > 0);
  const m = createGearbox('car');
  run(m, { speed: 0, top, throttle: 0, mode: 'manual' }, 1);
  shift(m, 1, 0);
  run(m, { speed: 0, top, throttle: 1, mode: 'manual' }, 1);
  check('manual without clutch cannot stall', !m.stalled && m.rpm >= PROFILES.car.idle);
}

{
  const veh = (model, extra = {}) => ({ model, ...extra });
  check('hatch -> car', profileFor(veh({ name: 'hatch' })) === 'car');
  check('sport -> sport', profileFor(veh({ name: 'sport' })) === 'sport');
  check('police -> sport', profileFor(veh({ name: 'sedan' }, { isPolice: true })) === 'sport');
  check('bus -> bus', profileFor(veh({ name: 'bus' }, { isBus: true })) === 'bus');
  check('truck -> truck', profileFor(veh({ name: 'truck' })) === 'truck');
  check('bicycle has none', profileFor(veh({ name: 'bike' }, { isBike: true })) === null);
  check('e-step has none', profileFor(veh({ name: 'scooter' }, { isScooter: true })) === null);
  check('automatic moped has none', profileFor(veh({ name: 'scooter', moped: true }, { isScooter: true })) === null);
  check('geared moped has one', profileFor(veh({ name: 'scooter', moped: true, geared: true }, { isScooter: true })) === 'moped');
  check('motorbike -> bike profile', profileFor(veh({ name: 'motor', motorbike: 'naked' }, { isScooter: true })) === 'motorNaked');
  check('boat has none', profileFor(veh({ name: 'boat' }, { isBoat: true })) === null);
}

if (bad) process.exit(1);
console.log('gearbox: all passed');
