// Weather look (game/js/weatherlook.js, #194): quality scaling, mist, sunset glow, storm planner.
import { QUALITY_LOOK, qualityLook, mistFog, sunGlow, stepWet, createStormPlanner, stepStorm, flashAt, weatherLook, REGION_HAZE } from '../game/js/weatherlook.js';
import { REGION_IDS, WEATHER_KINDS } from '../game/js/weatherstate.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };

ok(qualityLook('nope') === QUALITY_LOOK.hoog, 'unknown quality falls back');
ok(QUALITY_LOOK.laag.rain < QUALITY_LOOK.middel.rain && QUALITY_LOOK.middel.rain < QUALITY_LOOK.hoog.rain, 'rain scales with quality');
ok(QUALITY_LOOK.laag.puddles === 0, 'no puddles on laag');
for (const id of REGION_IDS) ok(!!REGION_HAZE[id], 'haze for region ' + id);

// mist: thicker mist = shorter view, monotone, bounded
let prev = Infinity;
for (let m = 0; m <= 1.0001; m += 0.1) {
  const f = mistFog(m);
  ok(f.far <= prev && f.far >= 70 && f.near >= 0, 'mist monotone', m);
  prev = f.far;
}
ok(mistFog(0).far === 400, 'no mist keeps base');
ok(mistFog(0.6, 'hoog', 'oost').far < mistFog(0.6, 'hoog', 'stad').far, 'peat mist thicker than city');

// sunset glow: peaks near the horizon, absent at noon and midnight, weak under cloud
ok(sunGlow(2).strength > 0.95, 'glow at horizon');
ok(sunGlow(45).strength === 0 && sunGlow(-30).strength === 0, 'no glow at noon or night');
ok(sunGlow(2, 1).strength < 0.2, 'cloud weakens glow');
ok(sunGlow(-6).color[2] > sunGlow(6).color[2], 'gold turns to dusk blue');

// wetness: wets quicker than it dries, stays in 0..1
let w = 0; for (let i = 0; i < 60; i++) w = stepWet(w, 1, 0.1);
const wetUp = w; for (let i = 0; i < 60; i++) w = stepWet(w, 0, 0.1);
ok(wetUp > 0.6 && w > 0.5 * wetUp && w >= 0 && wetUp <= 1, 'wet up fast, dry slow', `${wetUp} ${w}`);

// storm planner: seeded, only strikes in heavy rain, thunder follows light
function strikes(seed, rain, secs, q) {
  const p = createStormPlanner(seed), out = [];
  for (let t = 0; t < secs; t += 0.25) out.push(...stepStorm(p, 0.25, rain, q));
  return out;
}
const a = strikes(5, 0.85, 600), b = strikes(5, 0.85, 600);
ok(a.length > 5 && JSON.stringify(a) === JSON.stringify(b), 'same seed, same storm', a.length);
ok(strikes(5, 0.6, 600).length === 0, 'no strikes in a plain shower');
ok(a.every((s) => s.delay >= 0.3 && s.delay <= 7 && s.flashes >= 1 && s.flashes <= 3), 'strike values');
ok(strikes(5, 0.85, 600, 'laag').every((s) => s.flashes === 1), 'laag: single flash');
ok(flashAt(-1, 2) === 0 && flashAt(0.01, 2) === 1 && flashAt(0.2, 1) === 0 && flashAt(0.2, 2) > 0, 'flash pattern');

// every kind, region, quality and sun height gives sane numbers
for (const kind of WEATHER_KINDS) for (const region of REGION_IDS) for (const quality of Object.keys(QUALITY_LOOK)) for (const elevation of [-20, 0, 3, 30]) {
  const l = weatherLook({ kind, rain: 0.5, overcast: 0.5, mist: 0.5, elevation, quality, region, wet: 0.5 });
  const nums = [l.rainDrops, l.puddles, l.sheen, l.fog.near, l.fog.far, l.glow.strength, ...l.glow.color, ...l.haze];
  ok(nums.every((v) => Number.isFinite(v) && v >= 0), 'finite look', `${kind} ${region} ${quality}`);
}
console.log(`weatherlook_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
