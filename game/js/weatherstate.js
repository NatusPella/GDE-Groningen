// The province's weather as a pure state machine (issue #19): no THREE, no
// world, no Math.random, so it can be tested and replayed from a seed.
// weather.js feeds it the in-game hour and draws what it says (rain streaks,
// fog, sun strength) for the region the player stands in.
//
// Always summer: the kinds are helder, bewolkt, mist, motregen, regenbui and
// onweer. There is no snow, no ice and no cold front; showers are short and
// the dry spells long.
//
// Regions are compass sectors round the city centre (the world origin), so
// a shower can hang over the Veenkoloniën while Grunn stays dry. A slowly
// drifting national "front" (0..1) makes neighbouring regions wet together.
//
//   const ws = createWeatherState(seed);
//   stepWeather(ws, dt, hour);                 // dt in seconds, hour 0..24
//   const r = regionWeather(ws, regionAt(x, y)); // { kind, rain, overcast, mist, thunder, windAngle }

export const WEATHER_KINDS = ['helder', 'bewolkt', 'mist', 'motregen', 'regenbui', 'onweer'];

// peak rain (0..1; lightning in weather.js starts at 0.75) and cloud cover per kind
const LOOK = {
  helder: { rain: 0, overcast: 0, mist: 0 },
  bewolkt: { rain: 0, overcast: 0.4, mist: 0 },
  mist: { rain: 0, overcast: 0.3, mist: 0.6 },
  motregen: { rain: 0.3, overcast: 0.55, mist: 0 },
  regenbui: { rain: 0.6, overcast: 0.75, mist: 0 },
  onweer: { rain: 0.85, overcast: 0.95, mist: 0 },
};

// seconds a kind holds before the next roll
const DURATION = {
  helder: [120, 300],
  bewolkt: [60, 180],
  mist: [60, 150],
  motregen: [40, 90],
  regenbui: [40, 80],
  onweer: [50, 90],
};

const CITY_RADIUS = 4000;

const REGIONS = {
  stad: { naam: 'Grunn', wet: 1 },
  noord: { naam: 'het Hogeland en de kust', wet: 1.15 },
  oost: { naam: 'de Veenkoloniën', wet: 0.9 },
  zuid: { naam: 'Westerkwartier-zuid en Drenthe-rand', wet: 0.95 },
  west: { naam: 'het Westerkwartier', wet: 1.05 },
};
export const REGION_IDS = Object.keys(REGIONS);

// x east, y south (the game's plane), origin = city centre
export function regionAt(x, y) {
  if (Math.hypot(x, y) < CITY_RADIUS) return 'stad';
  if (Math.abs(x) > Math.abs(y)) return x > 0 ? 'oost' : 'west';
  return y < 0 ? 'noord' : 'zuid';
}

import { mulberry32 } from './rng.js';
import { mistMag, mistWeg, onweerMag } from './weerdag.js';
export { mulberry32 };

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const approach = (v, target, step) => (target > v ? Math.min(target, v + step) : Math.max(target, v - step));

function span(rng, [lo, hi]) { return lo + rng() * (hi - lo); }

// Next kind for a region that just finished `prev`, given the hour and the front.
export function nextKind(prev, hour, front, wet, rng, id = 'stad') {
  const f = (0.4 + front * 1.2) * wet;           // 0.4..1.6 wetter or drier
  const morning = mistMag(id, hour);             // by the sun (weerdag.js), as dayState
  const afternoon = onweerMag(id, hour);         // warm air: thunder
  let w;
  if (prev === 'motregen' || prev === 'regenbui' || prev === 'onweer') {
    w = { helder: 40, bewolkt: 55, mist: 0, motregen: 5 * f, regenbui: 0, onweer: 0 };
  } else if (prev === 'mist') {
    w = { helder: 60, bewolkt: 40, mist: 0, motregen: 0, regenbui: 0, onweer: 0 };
  } else {
    w = {
      helder: prev === 'helder' ? 25 : 45,
      bewolkt: prev === 'bewolkt' ? 20 : 35,
      mist: morning ? 14 : 0,
      motregen: 8 * f,
      regenbui: 6 * f,
      onweer: afternoon ? 3 * f * f : 0,
    };
  }
  const total = WEATHER_KINDS.reduce((s, k) => s + w[k], 0);
  let r = rng() * total;
  for (const k of WEATHER_KINDS) { r -= w[k]; if (r <= 0 && w[k] > 0) return k; }
  return 'helder';
}

export function createWeatherState(seed = 1) {
  const rng = mulberry32(seed);
  const regions = {};
  for (const id of REGION_IDS) {
    const kind = rng() < 0.6 ? 'helder' : 'bewolkt';
    const look = LOOK[kind];
    regions[id] = {
      kind, age: 0, duration: span(rng, DURATION[kind]) * (0.3 + rng() * 0.7),
      rain: look.rain, overcast: look.overcast, mist: look.mist,
    };
  }
  return { rng, front: 0.35 + rng() * 0.3, windAngle: rng() * Math.PI * 2, regions };
}


export function stepWeather(ws, dt, hour) {
  const rng = ws.rng;
  // the front wanders; the wind turns slowly
  ws.front = clamp01(ws.front + (rng() - 0.5) * 0.02 * Math.min(dt, 5));
  ws.windAngle += (rng() - 0.5) * 0.05 * Math.min(dt, 5);
  for (const id of REGION_IDS) {
    const r = ws.regions[id];
    r.age += dt;
    if (r.age >= r.duration || (r.kind === 'mist' && mistWeg(id, hour))) {
      const kind = nextKind(r.kind, hour, ws.front, REGIONS[id].wet, rng, id);
      r.kind = kind;
      r.age = 0;
      r.duration = span(rng, DURATION[kind]);
    }
    const look = LOOK[r.kind];
    // showers build and fade in about nine seconds, clouds and mist more slowly
    r.rain = approach(r.rain, look.rain, dt / 9);
    r.overcast = approach(r.overcast, look.overcast, dt / 20);
    r.mist = approach(r.mist, look.mist, dt / 25);
  }
}

export function regionWeather(ws, id) {
  const r = ws.regions[id] || ws.regions.stad;
  return {
    kind: r.kind, rain: r.rain, overcast: r.overcast, mist: r.mist,
    thunder: r.kind === 'onweer', windAngle: ws.windAngle,
  };
}
