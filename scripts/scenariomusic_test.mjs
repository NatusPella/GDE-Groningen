// Scenario music: priorities, debounce and which activity counts for this player.
import assert from 'node:assert/strict';
import { existsSync, statSync, readFileSync } from 'node:fs';
import { createScenarioDirector, activityMusicKey, registerMusicProbe, loopPoints } from '../game/js/scenariomusic.js';

const run = (d, secs, st, dt = 0.1) => { let r = null; for (let t = 0; t < secs; t += dt) r = d.update(dt, st); return r; };

// plain radio: nothing happens without race, chase or activity
{
  const d = createScenarioDirector();
  assert.equal(run(d, 30, {}), null);
  assert.equal(d.update(0.1), null);
}

// race and chase as before
{
  const d = createScenarioDirector();
  assert.equal(run(d, 1, { chasing: true }), null, 'chase is debounced');
  assert.equal(run(d, 2, { chasing: true }), 'chase');
  assert.equal(run(d, 3, {}), 'chase', 'stays 6 s after the police lost you');
  assert.equal(run(d, 4, {}), null);
  assert.equal(run(d, 1, { race: true, chasing: true }), 'race');
}

// each activity plays its own loop, with a short start and stop debounce
for (const k of ['kart', 'padel', 'golf', 'klimtoren', 'trein', 'bus']) {
  const d = createScenarioDirector();
  assert.equal(d.update(0.1, { activity: k }), null, k + ': not on the first frame');
  assert.equal(run(d, 1, { activity: k }), k);
  assert.equal(run(d, 0.5, {}), k, k + ': a short gap between rounds keeps the music');
  assert.equal(run(d, 0.3, { activity: k }), k);
  assert.equal(run(d, 3, {}), null, k + ': stops after the gap');
}

// a brief blip of an activity does not start music
{
  const d = createScenarioDirector();
  assert.equal(d.update(0.1, { activity: 'golf' }), null);
  assert.equal(run(d, 3, {}), null);
}

// priorities: race > kart > chase > padel/golf/klimtoren
{
  const d = createScenarioDirector();
  run(d, 1, { activity: 'golf' });
  assert.equal(run(d, 1, { activity: 'golf', chasing: true }), 'golf', 'chase still debounced');
  assert.equal(run(d, 2, { activity: 'golf', chasing: true }), 'chase', 'a chase beats golf');
  assert.equal(run(d, 1, { activity: 'golf' }), 'chase');
  assert.equal(run(d, 6, { activity: 'golf' }), 'golf', 'back to golf after the chase');
  assert.equal(run(d, 1, { activity: 'padel', chasing: true }), 'padel', 'switching activity is immediate, chase restarts its debounce');
  assert.equal(run(d, 2, { activity: 'padel', chasing: true }), 'chase');
  assert.equal(run(d, 3, { activity: 'klimtoren', chasing: true }), 'chase');
  assert.equal(run(d, 0.5, { activity: 'kart', chasing: true }), 'kart', 'a kart race beats a chase');
  assert.equal(run(d, 1, { activity: 'kart', chasing: true, race: true }), 'race', 'the car race beats everything');
}

// unknown activity keys are ignored
{
  const d = createScenarioDirector();
  assert.equal(run(d, 3, { activity: 'zwembad' }), null);
}

// reset
{
  const d = createScenarioDirector();
  assert.equal(run(d, 2, { activity: 'padel' }), 'padel');
  d.reset();
  assert.equal(d.update(0.1, {}), null);
}

// which activity is this player in?
assert.equal(activityMusicKey(null), null);
assert.equal(activityMusicKey({}), null);
assert.equal(activityMusicKey({ padelGame: {} }), 'padel');
assert.equal(activityMusicKey({ activityGame: 'kartbaan' }), 'kart');
assert.equal(activityMusicKey({ activityGame: 'discgolf' }), 'golf');
assert.equal(activityMusicKey({ activityGame: 'pitchputt' }), 'golf');
assert.equal(activityMusicKey({ activityGame: 'klimtoren' }), 'klimtoren');
assert.equal(activityMusicKey({ player: { inVehicle: { model: { name: 'tractor' } } } }), 'boerderij');
assert.equal(activityMusicKey({ player: { inVehicle: { model: { name: 'sedan' } } } }), null);
assert.equal(activityMusicKey({ player: { inVehicle: { isHeli: true } } }), 'vlucht');
assert.equal(activityMusicKey({ player: { inVehicle: { model: { name: 'plane' } } } }), 'vlucht');
assert.equal(activityMusicKey({ mission: { phase: 'active' }, player: {} }), 'missie');
assert.equal(activityMusicKey({ mission: { phase: 'active' }, player: { inVehicle: { model: { name: 'tractor' } } } }), 'boerderij');
assert.equal(activityMusicKey({ player: { inVehicle: { isBike: true } } }), 'fiets');
assert.equal(activityMusicKey({ activityGame: 'zwembad' }), null);
assert.equal(activityMusicKey({ activityGame: null }), null);
// Samen spelen: a guest who said yes hears his own match, one who said no keeps the radio
assert.equal(activityMusicKey({ coopWedGast: { id: 'kartbaan', spiegel: {}, score: null }, coopWedstrijd: true }), 'kart');
assert.equal(activityMusicKey({ coopWedGast: { id: 'pitchputt', spiegel: null, score: { id: 'pitchputt' } } }), 'golf');
assert.equal(activityMusicKey({ coopWedGast: { id: 'klimtoren', spiegel: null, score: {} } }), 'klimtoren');
assert.equal(activityMusicKey({ coopWedGast: { id: 'kartbaan', spiegel: null, score: null, uitn: { id: 'kartbaan' } } }), null, 'an invitation alone is not taking part');
assert.equal(activityMusicKey({ coopWedGast: { id: 'discgolf', spiegel: null, score: null, uitslag: {} } }), null, 'after the match');

// train and bus
{
  let dienst = false;
  registerMusicProbe('trein', (w) => dienst && !!w.trainDriving);
  assert.equal(activityMusicKey({ trainDriving: {} }), null, 'a train without service is radio');
  dienst = true;
  assert.equal(activityMusicKey({ trainDriving: {} }), 'trein', 'machinist service');
  assert.equal(activityMusicKey({ trainCam: {} }), 'trein', 'passenger ride between stations');
  dienst = false;
  assert.equal(activityMusicKey({ trainCam: {}, trainDriving: {} }), null, 'driving any train is not a service');
  const bus = (o) => ({ player: { inVehicle: { isBus: true, ...o } } });
  assert.equal(activityMusicKey(bus({ sideJob: true })), 'bus');
  assert.equal(activityMusicKey(bus({ rideLine: {} })), 'bus');
  assert.equal(activityMusicKey(bus({ busBediend: { coop: {} } })), 'bus');
  assert.equal(activityMusicKey(bus({})), null, 'a loose bus is radio');
  assert.equal(activityMusicKey({ player: { inVehicle: { sideJob: true } } }), null, 'a job car is not a bus');
  assert.equal(activityMusicKey({ coopRole: 'client', coopZit: 'bus' }), 'bus');
  assert.equal(activityMusicKey({ coopRole: 'client', coopZit: 'trein' }), 'trein');
  assert.equal(activityMusicKey({ coopRole: 'client', coopZit: 'auto' }), null);
  assert.equal(activityMusicKey({ coopRole: 'host', coopZit: 'bus' }), null);
  const d = createScenarioDirector();
  run(d, 1, { activity: 'bus' });
  assert.equal(run(d, 3, { activity: 'bus', chasing: true }), 'chase', 'a police chase beats the bus');
  assert.equal(run(d, 7, { activity: 'bus' }), 'bus');
}

// loop points still skip the silence at both ends
{
  const c = new Float32Array(10000); c.fill(0.5, 2000, 9000);
  const p = loopPoints([c], 1000);
  assert.deepEqual(p, { start: 2, end: 9 });
}

// the four loops exist, are mp3s and are wired in audio.js
const dir = new URL('../game/audio/scenario/', import.meta.url);
for (const f of ['kart_loop.mp3', 'padel_loop.mp3', 'golf_loop.mp3', 'klimtoren_loop.mp3', 'trein_loop.mp3', 'bus_loop.mp3', 'boerderij_loop.mp3', 'pvp_arena_loop.mp3', 'vlucht_loop.mp3', 'missie_spanning_loop.mp3', 'fiets_loop.mp3']) {
  const u = new URL(f, dir);
  assert.ok(existsSync(u), f + ' ontbreekt');
  const b = readFileSync(u);
  assert.ok(statSync(u).size > 1e6, f + ' te klein');
  assert.ok((b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0), f + ' geen mp3-kop');
}
const audioSrc = readFileSync(new URL('../game/js/audio.js', import.meta.url), 'utf8');
for (const f of ['kart_loop', 'padel_loop', 'golf_loop', 'klimtoren_loop', 'trein_loop', 'bus_loop']) assert.ok(audioSrc.includes(f + '.mp3'), f + ' niet in audio.js');

console.log('scenariomusic_test: ok');
