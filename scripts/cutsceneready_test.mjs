// De poort van een cutscene (game/js/cutsceneready.js, tileready.js, #1354): node scripts/cutsceneready_test.mjs
// Een scène is niet klaar zolang een tegel of job op het shotpad openstaat, wordt zwart bij een voelbare wacht, en valt na de maximumtijd
// terug (de film gaat door). Met een nepwereld: een eigen klok, een eigen frame-lus en tellers die we zelf leegmaken.
import { ensureCutsceneReady, posesFromScene } from '../game/js/cutsceneready.js';
import { CUT, emptyCounts, shotRegions } from '../game/js/tileready.js';
import { collectReady, legacyPending, toReadinessQuery } from '../game/js/readysensors.js';
import { readiness } from '../game/js/cutscenewarm.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// een nepwereld met een klok en een frame-lus die we met de hand draaien
function world(counts) {
  let t = 0; const frames = []; const log = { warm: [], fade: [], flags: [] };
  const env = {
    now: () => t,
    counts: () => (typeof counts === 'function' ? counts(t) : counts),
    warm: (g) => log.warm.push(g),
    fade: (k, ms) => log.fade.push([k, ms]),
    flags: (f) => log.flags.push(f.loading),
    schedule: (fn) => frames.push(fn),
  };
  const run = (ms, step = 16) => { const end = t + ms; while (t < end) { t += step; const f = frames.splice(0); for (const fn of f) fn(); } };
  return { env, log, run, now: () => t };
}
const poses = [{ position: { x: 0, y: 0, z: 3 }, lookAt: { x: 30, y: 0, z: 1 }, actors: [{ x: 15, y: 2 }] }, { position: { x: 120, y: 0, z: 3 }, lookAt: { x: 150, y: 0, z: 1 } }];

// 1. alles klaar: de scène begint zonder zwart, na minMs en calmTicks
{
  const w = world(emptyCounts());
  const g = ensureCutsceneReady(poses, { env: w.env });
  let r = null; g.promise.then((x) => { r = x; });
  ok(g.regions.length >= 2 && w.log.warm.length === g.regions.length, 'elk gebied van het pad wordt vooruit gewarmd');
  w.run(2000); await Promise.resolve();
  ok(r && r.ready && !r.timedOut && !r.black && w.log.fade.length === 0, 'alles klaar: geen zwart, geen wachttijd van betekenis', JSON.stringify(r));
  ok(r.waitedMs >= CUT.minMs, 'toch minstens minMs (de streams volgen het focus)');
}

// 2. een tegel op het pad is nog niet binnen: wachten, zwart na blackAfterMs, daarna klaar en het zwart weg
{
  const w = world((t) => (t < 1500 ? { ...emptyCounts(), data: 1 } : emptyCounts()));
  const g = ensureCutsceneReady(poses, { env: w.env });
  let r = null; g.promise.then((x) => { r = x; });
  w.run(200); await Promise.resolve();
  ok(r === null && w.log.fade.length === 0, 'een tegel mist: nog niet klaar, nog geen zwart');
  w.run(300); await Promise.resolve();
  ok(r === null && w.log.fade.length === 1 && w.log.fade[0][0] === 1, 'te lang wachten: het beeld duikt naar zwart');
  ok(w.log.flags.includes(true), 'onder zwart krijgt het streamen het laadbudget');
  w.run(2500); await Promise.resolve();
  ok(r && r.ready && r.black, 'tegel binnen: klaar');
  ok(w.log.fade.length === 2 && w.log.fade[1][0] === 0 && w.log.flags[w.log.flags.length - 1] === false, 'het zwart gaat weg en de vlag gaat terug');
}

// 3. elk niveau houdt de scène tegen (een job op het shotpad)
for (const level of ['colliders', 'geometry', 'gpu', 'lod', 'population']) {
  const w = world((t) => (t < 800 ? { ...emptyCounts(), [level]: 2 } : emptyCounts()));
  const g = ensureCutsceneReady(poses, { env: w.env, black: false });
  let r = null; g.promise.then((x) => { r = x; });
  w.run(700); await Promise.resolve();
  ok(r === null, `niet klaar zolang ${level} openstaat`);
  w.run(2000); await Promise.resolve();
  ok(r && r.ready, `klaar zodra ${level} leeg is`);
}

// 4. een job die nooit klaar komt: time-out, de film gaat door (nooit eeuwig hangen), met een nette melding
{
  const w = world({ ...emptyCounts(), population: 3 });
  const g = ensureCutsceneReady(poses, { env: w.env });
  let r = null; g.promise.then((x) => { r = x; });
  w.run(CUT.startMaxMs - 200); await Promise.resolve();
  ok(r === null, 'vlak voor de maximumtijd: nog wachten');
  w.run(500); await Promise.resolve();
  ok(r && r.timedOut && !r.ready && r.text.length > 0, 'na de maximumtijd: terugval met melding', JSON.stringify(r));
  ok(w.log.fade[w.log.fade.length - 1][0] === 0, 'ook na een time-out komt het beeld terug uit zwart');
}
{
  const w = world({ ...emptyCounts(), gpu: 1 });
  const g = ensureCutsceneReady(poses, { env: w.env, shot: true });
  let r = null; g.promise.then((x) => { r = x; });
  w.run(CUT.shotMaxMs + 200); await Promise.resolve();
  ok(r && r.timedOut, 'een shot-wissel wacht korter (shotMaxMs) dan het begin van een scène');
}

// 5. annuleren (de scène wordt overgeslagen): het zwart weg, de vlaggen terug, geen tweede uitkomst
{
  const w = world({ ...emptyCounts(), geometry: 5 });
  const g = ensureCutsceneReady(poses, { env: w.env });
  let r = null; g.promise.then((x) => { r = x; });
  w.run(600); g.cancel(); await Promise.resolve();
  ok(r && r.cancelled && w.log.fade[w.log.fade.length - 1][0] === 0 && w.log.flags[w.log.flags.length - 1] === false, 'cancel: zwart weg en vlag terug');
  w.run(CUT.startMaxMs); ok(w.log.fade.filter((f) => f[0] === 1).length === 1, 'na cancel geen nieuw zwart');
}

// 6. een kapotte meting mag de scène niet laten hangen
{
  const w = world(null); w.env.counts = () => { throw new Error('kapot'); };
  const g = ensureCutsceneReady(poses, { env: w.env });
  let r = null; g.promise.then((x) => { r = x; });
  w.run(100); await Promise.resolve();
  ok(r && r.timedOut && /kapot/.test(r.error), 'een gooiende meting: de poort geeft op (de film gaat door)');
}
// zonder gebieden (geen camerastanden) is er niets om op te wachten behalve het focus
{
  const w = world(emptyCounts());
  const g = ensureCutsceneReady([], { env: w.env });
  ok(g.regions.length === 0, 'geen standen: geen gebieden');
  g.cancel();
}

// 7. de camerastanden uit een gecompileerde scène (mock van cutscript.js)
const mock = {
  shots: [{ t: 0 }, { t: 3 }],
  sample: (t) => ({ camera: { position: { x: t * 20, y: 0, z: 2 }, lookAt: { x: t * 20 + 10, y: 0, z: 1 } }, actors: { a: { x: t * 20 + 5, y: 1 }, b: { x: NaN, y: 0 } } }),
};
const ps = posesFromScene(mock, { x: 0, y: 0 }, 6);
ok(ps.length >= 7 && ps.every((q) => q.position && q.lookAt), 'posesFromScene: elke seconde een stand', String(ps.length));
ok(ps.every((q) => q.actors.length === 1), 'acteurs met een kapotte plek vallen weg');
ok(posesFromScene(null, {}, 5).length === 0 && posesFromScene({ sample() { throw new Error('x'); } }, {}, 5).length === 0, 'posesFromScene: kapotte scène geeft niets');
ok(shotRegions(ps).length > 0, 'de standen worden gebieden');

// 8. de sensoren: de oude definitie tegenover de nieuwe
const c = collectReady({ tilesMissing: () => 0, buildings: () => 0, roads: () => 0, programs: () => 3, textures: () => 2, far: () => 1, peopleMissing: () => 4, rigsWaiting: () => 1 });
ok(c.gpu === 5 && c.lod === 1 && c.population === 5 && c.geometry === 0 && c.total === 11, 'collectReady telt per niveau', JSON.stringify(c));
ok(legacyPending(c) === 0, 'de oude definitie noemt dit klaar (dat was het probleem)');
ok(!readiness(toReadinessQuery(c), true).ready && readiness(toReadinessQuery(c), true).reason === 'gpu', 'de wachtpoort van een sprong wacht nu op shaders en texturen');
ok(readiness(toReadinessQuery(collectReady({ far: () => 2 })), false).reason === 'verre laag' && readiness(toReadinessQuery(collectReady({ peopleMissing: () => 1 })), false).reason === 'bevolking', 'ook de snelle check kijkt naar verre laag en bevolking');
ok(readiness(toReadinessQuery(collectReady({})), true).ready, 'lege bronnen: klaar');
ok(collectReady({ buildings: () => { throw new Error('x'); }, roads: () => NaN }).total === 0, 'een gooiende of NaN-bron telt als 0');

console.log(`${n - fails}/${n} controles in orde`);
process.exit(fails ? 1 : 0);
