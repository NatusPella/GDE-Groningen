// The province's weather machine (game/js/weatherstate.js): summer kinds only,
// seeded and repeatable, regions, mist only in the morning. node scripts/weatherstate_test.mjs
import {
  createWeatherState, stepWeather, regionWeather, regionAt, REGION_IDS, WEATHER_KINDS, nextKind, mulberry32,
} from '../game/js/weatherstate.js';

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// regions
ok(regionAt(0, 0) === 'stad' && regionAt(3000, -1000) === 'stad', 'city centre is stad');
ok(regionAt(20000, 1000) === 'oost' && regionAt(-20000, 0) === 'west', 'east and west');
ok(regionAt(0, -20000) === 'noord' && regionAt(0, 20000) === 'zuid', 'north and south');

// a long run: only summer kinds, values in range, no snow or ice, every kind seen
const seen = new Set();
let maxRain = 0;
function run(seed, seconds, hourAt) {
  const ws = createWeatherState(seed);
  const log = [];
  for (let t = 0; t < seconds; t += 0.5) {
    stepWeather(ws, 0.5, hourAt(t));
    for (const id of REGION_IDS) {
      const r = regionWeather(ws, id);
      seen.add(r.kind);
      maxRain = Math.max(maxRain, r.rain);
      ok(WEATHER_KINDS.includes(r.kind), 'known kind', r.kind);
      ok(!/sneeuw|ijs|vorst|snow|ice|winter/i.test(r.kind), 'never winter');
      ok(r.rain >= 0 && r.rain <= 1 && r.overcast >= 0 && r.overcast <= 1 && r.mist >= 0 && r.mist <= 1, 'values in 0..1');
      ok(r.kind !== 'mist' || r.mist >= 0, 'mist value');
      if (id === 'stad') log.push(r.kind);
    }
  }
  return log;
}
const day = (t) => (t / 60) % 24; // an hour a minute
const a = run(7, 24 * 3600, day);
const b = run(7, 24 * 3600, day);
ok(a.join() === b.join(), 'same seed, same weather');
const c = run(8, 24 * 3600, day);
ok(a.join() !== c.join(), 'other seed, other weather');
for (let s = 10; s < 16; s++) run(s, 6 * 3600, day);
for (const k of WEATHER_KINDS) ok(seen.has(k), `kind seen: ${k}`);
ok(maxRain <= 0.85 + 1e-9, 'rain stays below storm level', String(maxRain));

// mist only rolls in the morning; thunder only in the warm hours
const rng = mulberry32(3);
let mistNoon = 0, mistMorning = 0, thunderNight = 0;
for (let i = 0; i < 4000; i++) {
  if (nextKind('helder', 13, 0.5, 1, rng) === 'mist') mistNoon++;
  if (nextKind('helder', 6, 0.5, 1, rng) === 'mist') mistMorning++;
  if (nextKind('bewolkt', 2, 1, 1.2, rng) === 'onweer') thunderNight++;
}
ok(mistNoon === 0, 'no mist at noon');
ok(mistMorning > 100, 'mist in the early morning', String(mistMorning));
ok(thunderNight === 0, 'no thunder at night');

// rain eases: no jump between two half-second steps
{
  const ws = createWeatherState(21);
  let prev = 0, maxJump = 0;
  for (let t = 0; t < 7200; t += 0.5) {
    stepWeather(ws, 0.5, 14);
    const r = regionWeather(ws, 'stad').rain;
    maxJump = Math.max(maxJump, Math.abs(r - prev)); prev = r;
  }
  ok(maxJump < 0.1, 'rain eases in and out', String(maxJump));
}

// mist burns off once the sun is up
{
  const ws = createWeatherState(5);
  for (const id of REGION_IDS) { ws.regions[id].kind = 'mist'; ws.regions[id].age = 0; ws.regions[id].duration = 1e6; }
  stepWeather(ws, 1, 11);
  ok(REGION_IDS.every((id) => ws.regions[id].kind !== 'mist'), 'mist ends in the late morning');
}

console.log(fails ? `${fails} of ${n} failed` : `weatherstate_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
