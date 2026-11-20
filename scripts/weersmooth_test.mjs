// Zachte overgangen voor weer en licht (#985, game/js/weersmooth.js) en het Samen-spelen-gelijkspel van tijd en weer.
//   node scripts/weersmooth_test.mjs
import assert from 'node:assert/strict';
import { easeTo, rainFade, flashGain, cloudFill } from '../game/js/weersmooth.js';
import { cloudState, CLOUD_COUNT } from '../game/js/cloudlook.js';
import { createWeatherState, stepWeather, regionWeather, REGION_IDS } from '../game/js/weatherstate.js';
import { weerEvent, leesWeerEvent, pasWeerToe } from '../game/js/coopweer.js';
import { klokEvent, leesKlokEvent, KlokVolger, hourDiff } from '../game/js/net/speelklok.js';
import { createStormPlanner, stepStorm, flashAt } from '../game/js/weatherlook.js';

let n = 0;
const t = (name, f) => { f(); n++; };

t('easeTo: onafhankelijk van de framerate en zonder overshoot', () => {
  let a = 0, b = 0;
  for (let i = 0; i < 60; i++) a = easeTo(a, 1, 1 / 60, 6);
  for (let i = 0; i < 6; i++) b = easeTo(b, 1, 1 / 6, 6);
  assert.ok(Math.abs(a - b) < 1e-9, 'een seconde op 60 fps of 6 fps geeft hetzelfde');
  assert.ok(a > 0 && a < 1);
  assert.equal(easeTo(NaN, 0.4, 0.016), 0.4, 'zonder startwaarde: direct het doel');
  assert.equal(easeTo(0.3, 0.9, 0), 0.3);
});
t('een regiogrens oversteken is geen sprong in bewolking en mist (stap per frame < 2 %)', () => {
  let over = 0.0, mist = 0.0, maxStap = 0;
  for (let i = 0; i < 1800; i++) { const o = easeTo(over, 0.95, 1 / 60), m = easeTo(mist, 0.6, 1 / 60); maxStap = Math.max(maxStap, o - over, m - mist); over = o; mist = m; }
  assert.ok(maxStap < 0.02, 'grootste stap ' + maxStap);
  assert.ok(over > 0.9, 'na tien seconden is het doel bijna bereikt');
});
t('regenstreepjes komen zacht binnen: geen sprong bij de drempel 0,02', () => {
  assert.equal(rainFade(0.02), 0); assert.equal(rainFade(0.16), 1); assert.equal(rainFade(1), 1);
  let vorig = 0;
  for (let x = 0; x <= 1; x += 0.005) { const f = rainFade(x); assert.ok(f >= vorig - 1e-12, 'monotoon'); assert.ok(f - vorig < 0.06, 'kleine stappen'); vorig = f; }
});
t('een verre flits is zwakker, een dichtbije volop', () => {
  assert.equal(flashGain(250), 1); assert.ok(Math.abs(flashGain(3250) - 0.4) < 1e-9); assert.ok(flashGain(1500) < flashGain(500));
  assert.equal(flashGain(undefined), 1); assert.ok(flashGain(1e6) >= 0.4);
});
t('wolkenlaag: het aantal groeit door de weerwisseling zonder dat er een wolk ineens bij komt', () => {
  const droog = cloudState({ overcast: 0 }).fill, nat = cloudState({ intensity: 1, overcast: 1 }).fill;
  assert.equal(Math.round(droog), cloudState({ overcast: 0 }).count); assert.ok(nat <= CLOUD_COUNT + 1e-9);
  let fill = droog, vorigeZichtbaar = 0;
  for (let i = 0; i < 60 * 30; i++) {
    fill = easeTo(fill, nat, 1 / 60, 4);
    const { full, frac } = cloudFill(fill, CLOUD_COUNT);
    const zichtbaar = full + frac; // de som van de groeifactoren: wat het oog telt
    assert.ok(zichtbaar - vorigeZichtbaar < 0.1 || vorigeZichtbaar === 0, 'nooit een sprong van een hele wolk'); vorigeZichtbaar = zichtbaar;
  }
  assert.deepEqual(cloudFill(CLOUD_COUNT + 5, CLOUD_COUNT), { full: CLOUD_COUNT, frac: 0 }); assert.deepEqual(cloudFill(-3), { full: 0, frac: 0 });
});
t('onweer: een inslag is een gebeurtenis; de flits en de donderafstand horen bij dezelfde inslag', () => {
  const p = createStormPlanner(7); let strikes = [];
  for (let i = 0; i < 60 * 120; i++) strikes = strikes.concat(stepStorm(p, 1 / 60, 0.9, 'hoog'));
  assert.ok(strikes.length >= 3);
  for (const s of strikes) {
    assert.ok(s.dist >= 250 && s.dist <= 3250 && s.delay >= 0.3 && s.delay <= 7);
    assert.ok(Math.abs(s.delay - Math.min(7, Math.max(0.3, s.dist / 343))) < 1e-9, 'donder volgt de afstand (343 m/s)');
    assert.ok(flashAt(0, s.flashes) * flashGain(s.dist) > 0.35, 'ook een verre flits is te zien');
  }
});

// Samen spelen (#95, #364): tijd en weer zijn gezamenlijk. Een gast krijgt de klok (speelklok) en het weer (coopweer) van de
// gastheer en loopt na verloop van tijd gelijk.
t('een gast ziet dezelfde tijd en hetzelfde weer als de gastheer', () => {
  const host = { clock: 5.5, time: 0, calendar: { day: 12 }, ws: createWeatherState(11) };
  const gast = { clock: 20, ws: createWeatherState(99) };
  const volger = new KlokVolger();
  let lokaal = 0, sinceKlok = 99, sinceWeer = 99;
  const dt = 1 / 20;
  for (let i = 0; i < 20 * 400; i++) {
    host.time += dt; host.clock = (host.clock + dt * 0.0167) % 24; // ca. 24 minuten per dag
    stepWeather(host.ws, dt, host.clock);
    lokaal += dt; sinceKlok += dt; sinceWeer += dt;
    if (sinceKlok >= 2) { sinceKlok = 0; volger.observe(leesKlokEvent(JSON.parse(JSON.stringify(klokEvent(host)))), lokaal); }
    if (sinceWeer >= 4) { sinceWeer = 0; pasWeerToe(gast.ws, leesWeerEvent(JSON.parse(JSON.stringify(weerEvent(host.ws))))); }
    if (volger.last) gast.clock = volger.step(gast.clock, dt, lokaal);
  }
  assert.ok(Math.abs(hourDiff(gast.clock, host.clock)) < 0.05, 'klok binnen 3 spelminuten: ' + hourDiff(gast.clock, host.clock));
  for (const id of REGION_IDS) {
    const a = regionWeather(gast.ws, id), b = regionWeather(host.ws, id);
    assert.equal(a.kind, b.kind, 'soort weer in ' + id);
    assert.ok(Math.abs(a.rain - b.rain) < 0.05 && Math.abs(a.overcast - b.overcast) < 0.06 && Math.abs(a.mist - b.mist) < 0.06, 'regen, bewolking en mist in ' + id);
  }
});

console.log(`weersmooth_test: ${n} blokken ok`);
