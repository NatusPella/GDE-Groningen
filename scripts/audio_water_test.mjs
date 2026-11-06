// Watergeluid (#497): het zeil- en roeiboot-audioblok woont nu in
// game/js/audio/water.js. node scripts/audio_water_test.mjs
// Puur: een nep-host telt de geluiden, een nepwereld levert de boten; geen DOM,
// geen WebAudio, geen THREE.
import { setWaterHost, humanPowered, sailPowered, noMotor, updateSailing, updatePaddling } from '../game/js/audio/water.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

function makeHost({ ready = true, dist = () => 10 } = {}) {
  const calls = [];
  const node = { fake: true };
  return {
    calls,
    host: {
      ready: () => ready,
      distToListener: dist,
      spatialOut: () => node,
      playBuf: (name) => calls.push(['buf', name]),
      playNoiseBurst: (o) => calls.push(['noise', o && o.duration]),
      playTone: (o) => calls.push(['tone', o && o.freq]),
    },
  };
}
const sailboat = (props = {}) => ({ isBoat: true, model: { sail: true, kind: 'skiff', maxSpeed: 8 }, x: 0, y: 0, angle: 0, speed: 2, sailLuff: 0, wrecked: false, sinking: false, ...props });
const kayak = (props = {}) => ({ isBoat: true, model: { kind: 'kajak', maxSpeed: 3 }, x: 0, y: 0, angle: 0, speed: 1, throttle: 1, wrecked: false, sinking: false, ...props });
const world = (player, vehicles, extra = {}) => ({ player, vehicles, paused: false, ...extra });
const run = (fn, frames, w) => { for (let i = 0; i < frames; i++) fn(0.05, w); };

// 1. de pure kenmerken: wie heeft geen motor?
ok(humanPowered({ isBoat: true, model: { kind: 'kano' } }), 'kano is human powered');
ok(humanPowered({ isBoat: true, model: { kind: 'waterfiets' } }), 'waterfiets is human powered');
ok(!humanPowered({ isBoat: true, model: { kind: 'sloep' } }), 'sloep niet');
ok(sailPowered({ isBoat: true, model: { sail: true } }), 'sail-model zeilt');
ok(!sailPowered({ isBoat: true, model: { kind: 'sloep' } }), 'sloep zeilt niet');
ok(noMotor(kayak()) && noMotor(sailboat()) && !noMotor({ isBoat: true, model: { kind: 'sloep' } }), 'noMotor = human of sail');
ok(!humanPowered(null) && !sailPowered(undefined) && !noMotor(null), 'null/undefined blijven veilig');

// 2. vóór initAudio (geen host) doet hij niets en crasht hij niet
setWaterHost(null);
updateSailing(0.05, world({ inVehicle: sailboat() }, [sailboat()]));
updatePaddling(0.05, world({ inVehicle: kayak() }, [kayak()]));
ok(true, 'zonder host geen crash');

// 3. gepauzeerd of zonder WebAudio-context: stil
{
  const { host, calls } = makeHost();
  setWaterHost(host);
  updateSailing(0.05, world({ inVehicle: null }, [sailboat()], { paused: true }));
  updatePaddling(0.05, world({ inVehicle: null }, [kayak()], { paused: true }));
  ok(calls.length === 0, 'gepauzeerd is stil', calls.length);
  const h2 = makeHost({ ready: false });
  setWaterHost(h2.host);
  updateSailing(0.05, world({ inVehicle: sailboat() }, [sailboat()]));
  updatePaddling(0.05, world({ inVehicle: kayak() }, [kayak()]));
  ok(h2.calls.length === 0, 'zonder ctx of bij mute stil', h2.calls.length);
}

// 4. de zeilboot klinkt: kraken/hull_slap (buf) en wapperende zeilen (ruis)
{
  const { host, calls } = makeHost();
  setWaterHost(host);
  const v = sailboat();
  run(updateSailing, 200, world({ inVehicle: v }, [v]));
  ok(calls.length > 0, 'zeilboot klinkt', calls.length);
  ok(calls.some((c) => c[0] === 'buf' && c[1] === 'creak'), 'het kraken komt langs');
  ok(calls.some((c) => c[0] === 'noise'), 'de boeggolf/het wapperen komt langs');
}
// 5. een zeilboot van een ander ver weg blijft onhoorbaar
{
  const { host, calls } = makeHost({ dist: () => 200 });
  setWaterHost(host);
  const v = sailboat();
  run(updateSailing, 200, world({ inVehicle: null }, [v]));
  ok(calls.length === 0, 'verre zeilboot onhoorbaar', calls.length);
}
// 6. een wrak of zinkende boot doet niets
{
  const { host, calls } = makeHost();
  setWaterHost(host);
  const v = sailboat({ wrecked: true });
  run(updateSailing, 200, world({ inVehicle: v }, [v]));
  ok(calls.length === 0, 'wrak klinkt niet', calls.length);
}
// 7. de roeiboot: peddelslagen bij het peddelen, stil als hij stil ligt
{
  const { host, calls } = makeHost();
  setWaterHost(host);
  const v = kayak();
  run(updatePaddling, 100, world({ inVehicle: v }, [v]));
  ok(calls.length > 0, 'kajak peddelt', calls.length);
  ok(calls.some((c) => c[0] === 'noise'), 'de peddelslag is ruis');
  const h2 = makeHost();
  setWaterHost(h2.host);
  const stil = kayak({ throttle: 0, speed: 0 });
  run(updatePaddling, 100, world({ inVehicle: stil }, [stil]));
  ok(h2.calls.length === 0, 'stilstand peddelt niet', h2.calls.length);
}
// 8. de waterfiets: het schoepenrad tikt en de crank klinkt elke vierde slag
{
  const { host, calls } = makeHost();
  setWaterHost(host);
  const v = { ...kayak(), model: { kind: 'waterfiets', maxSpeed: 2.5 } };
  run(updatePaddling, 120, world({ inVehicle: v }, [v]));
  ok(calls.length > 0, 'waterfiets klinkt', calls.length);
  ok(calls.some((c) => c[0] === 'tone'), 'de crank komt langs als toon');
}
// 9. een roeiboot van iemand anders ver weg blijft stil
{
  const { host, calls } = makeHost({ dist: () => 200 });
  setWaterHost(host);
  const v = kayak();
  run(updatePaddling, 100, world({ inVehicle: null }, [v]));
  ok(calls.length === 0, 'verre roeiboot onhoorbaar', calls.length);
}

console.log(`${n - fails}/${n} audiowater`);
process.exit(fails ? 1 : 0);
