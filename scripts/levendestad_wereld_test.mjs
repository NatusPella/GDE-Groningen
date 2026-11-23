// Levende stad op de echte tegels (#1314, #1316): de wandelaars van het spel lopen in het centrum op een maandagochtend,
// een middag en een avond; we tellen naar welke soort bestemming ze gaan en wat ze bij aankomst doen. Daarna wordt elke
// straatgebeurtenis een keer neergezet en weer opgeruimd (ook als de speler wegrijdt), en meten we de kosten per beeld.
//   node scripts/levendestad_wereld_test.mjs [--secs=150]
// Slaat over zonder game/world (desktop stage of een junction naar een gebouwde wereld).
import './node3d.mjs';
const secsArg = process.argv.find((a) => a.startsWith('--secs='));
const TT = secsArg ? +secsArg.slice(7) : 150;
let seed = +(process.env.SEED || 7);
Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const realNow = performance.now.bind(performance);
let virtueleMs = 0;
try { performance.now = () => virtueleMs; } catch (e) { /* oudere Node */ }
await import('../game/js/player.js');
const { loadGameWorld, loadArea } = await import('./worldload.mjs');
const T = await loadGameWorld();
if (!T) { console.log('SKIP levendestad_wereld_test: geen game/world'); process.exit(0); }
const map = T.world;
const P = await import('../game/js/pedestrians.js');
const R = await import('../game/js/pedroutes.js');
const TL = await import('../game/js/trafficlights.js');
const SE = await import('../game/js/streeteventlive.js');
const { EVENT_IDS, EVENT } = await import('../game/js/streetevents.js');
const { classify } = await import('../game/js/trafficreact.js');
const W = await import('../game/js/wildlife.js');

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log('FAIL', m, info); } };
const DT = 1 / 30;
const CX = 192, CY = 138;
await loadArea(T, [CX - 600, CY - 600, CX + 600, CY + 600]);
const q = map.nearestRoadPoint(CX, CY, 300, true);
const sx = q ? q.x : CX, sy = q ? q.y : CY;

function makeWorld(hour, day) {
  const w = {
    map, vehicles: [], pedestrians: [], bullets: [], particles: [], props: [], wildlife: [], time: 0, wanted: 0, stats: {}, audioEvents: [], addMessage() {},
    weapon: 'fists', input: { mouse: { down: false, rightDown: false }, keys: {} }, player: { x: sx, y: sy, angle: 0, inVehicle: null, radius: 0.35, health: 100, speed: 0 },
    dayNight: { hour }, calendar: { day }, weather: { wet: 0 },
  };
  TL.initTrafficLights(w);
  return w;
}

// --- dagritme: waar gaan ze heen? (dag 4 = maandag) ------------------------------------------------------------
const COMMUTE = ['werk', 'school', 'station', 'halte'];
const result = {};
for (const [label, hour] of [['ochtendspits', 8], ['middag', 15], ['avond', 20.5]]) {
  const stats = R.pedRhythmStats();
  for (const k of Object.keys(stats.rhythm)) stats.rhythm[k] = 0;
  const before = { arrivals: stats.arrivals, entered: stats.entered, talks: stats.talks, bikeLocks: stats.bikeLocks, benchSits: stats.benchSits };
  const w = makeWorld(hour, 4);
  let msPeds = 0, frames = 0, msMax = 0;
  for (let t = 0, f = 0; t < TT; t += DT, f++) {
    virtueleMs = t * 1000; w.time = t; w.dayNight.hour = hour;
    TL.updateTrafficLights(DT, w);
    const a = realNow();
    P.updatePedestrians(DT, w);
    const ms = realNow() - a;
    if (t > 20) { msPeds += ms; frames++; msMax = Math.max(msMax, ms); }
    if (w.particles.length > 200) w.particles.length = 0;
    if (w.audioEvents.length > 100) w.audioEvents.length = 0;
  }
  const rh = stats.rhythm, tot = Object.values(rh).reduce((s, v) => s + v, 0) || 1;
  const share = (ks) => ks.reduce((s, k) => s + (rh[k] || 0), 0) / tot;
  result[label] = { tot, commute: share(COMMUTE), winkel: share(['winkel']), horeca: share(['horeca', 'uitgaan']), arrivals: stats.arrivals - before.arrivals, talks: stats.talks - before.talks, banken: stats.benchSits - before.benchSits, msPeds: msPeds / Math.max(1, frames), msMax, peds: w.pedestrians.length };
  console.log(`  ${label} (${hour} u, maandag): ${tot} bestemmingen, woon-werk ${(share(COMMUTE) * 100).toFixed(0)}%, winkel ${(share(['winkel']) * 100).toFixed(0)}%, horeca ${(share(['horeca', 'uitgaan']) * 100).toFixed(0)}%; ` +
    `${result[label].arrivals} aankomsten, ${result[label].talks} praatjes, ${result[label].banken} op een bank; ${w.pedestrians.length} voetgangers, updatePedestrians ${result[label].msPeds.toFixed(2)} ms/beeld (max ${msMax.toFixed(1)})`);
}
ok(result.ochtendspits.tot >= 15, 'genoeg bestemmingen gekozen', String(result.ochtendspits.tot));
ok(result.ochtendspits.commute > 0.5, 'maandag 08.00: meer dan de helft op weg naar werk, school, station of halte', result.ochtendspits.commute.toFixed(2));
ok(result.middag.winkel > result.ochtendspits.winkel, 'middag: meer winkelend publiek dan in de spits');
ok(result.avond.horeca > result.middag.horeca && result.avond.horeca > 0.3, 'avond: horeca', result.avond.horeca.toFixed(2));

// --- straatgebeurtenissen: neerzetten, laten spelen, wegrijden ----------------------------------------------------
const placed = [], missed = [];
let msEv = 0, evFrames = 0, evMax = 0;
for (const id of EVENT_IDS) {
  const w = makeWorld(15, 4);
  w.time = 500; virtueleMs = 500000;
  P.updatePedestrians(DT, w);
  const ev = SE.forceStreetEvent(w, id);
  if (!ev) { missed.push(id); continue; }
  placed.push(id);
  const actors = ev.rollen.map((a) => a.ped);
  ok(actors.length >= 1 && actors.every((p) => w.pedestrians.includes(p)), id + ': figuren staan in de wereld');
  ok(actors.every((p) => P.walkerSpotClear(map, p.x, p.y)), id + ': niemand op de rijbaan, in een gebouw of in het water');
  if (id === 'hond') ok(w.wildlife.some((a) => a.kind === 'dog' && a.state === 'loose'), 'hond: een losgebroken hond in de dierenlijst');
  // een halve minuut spelen, dichtbij
  let said = 0;
  for (let t = 0; t < 30; t += DT) {
    w.time += DT; virtueleMs = w.time * 1000;
    const near = ev.rollen.find((a) => a.ped);
    if (near) { w.player.x = near.ped.x + 8; w.player.y = near.ped.y; }
    const a = realNow();
    SE.updateStreetEvents(DT, w);
    const ms = realNow() - a;
    msEv += ms; evFrames++; evMax = Math.max(evMax, ms);
    P.updatePedestrians(DT, w);
    W.updateWildlife(DT, w);
    for (const p of actors) if (p.speechText && p.speechUntil > w.time) said++;
  }
  ok(said > 0, id + ': er wordt iets gezegd');
  if (id === 'hond') {
    const dog = w.wildlife.find((a) => a.kind === 'dog');
    ok(dog && dog.speed > 1, 'hond: hij rent', dog ? dog.speed.toFixed(1) : '-');
  }
  // de speler rijdt weg: alles weg
  w.player.x += EVENT.despawnDist + 40;
  w.time += DT;
  SE.updateStreetEvents(DT, w);
  ok(SE.activeStreetEvent() === null, id + ': weggereden, scène voorbij');
  ok(actors.every((p) => !w.pedestrians.includes(p) || !p.scene), id + ': de figuren zijn opgeruimd of lopen gewoon verder');
}
console.log(`  straatgebeurtenissen neergezet: ${placed.join(', ')}${missed.length ? '; geen plek gevonden (zonder cityprops in Node): ' + missed.join(', ') : ''}`);
console.log(`  updateStreetEvents: ${(msEv / Math.max(1, evFrames)).toFixed(3)} ms/beeld gemiddeld met een actieve scène, max ${evMax.toFixed(2)} ms`);
ok(placed.length >= 5, 'minstens vijf soorten vinden een plek in het centrum', placed.join());
ok(evMax < 8, 'geen enkel beeld boven 8 ms voor de straatgebeurtenissen', evMax.toFixed(2));

// --- verkeersreacties: kosten van de classificatie per AI-voertuig ---------------------------------------------------
{
  const v = { x: 0, y: 0, angle: 0, speed: 12, halfLen: 2.1, halfWid: 0.9, id: 3 };
  const pl = { x: 9, y: 0.3, angle: 0, speed: 6, halfLen: 2.1, halfWid: 0.9 };
  const N = 200000;
  const a = realNow();
  let hits = 0;
  for (let i = 0; i < N; i++) { pl.x = 5 + (i % 50); if (classify(v, pl)) hits++; }
  const us = (realNow() - a) / N * 1000;
  console.log(`  trafficreact.classify: ${us.toFixed(3)} µs per AI-voertuig per speler (${hits} treffers); 40 auto's x 1 speler = ${(us * 40 / 1000).toFixed(4)} ms/beeld`);
  ok(us < 2, 'classificatie goedkoop (< 2 µs)', us.toFixed(3));
}

console.log(fails ? `levendestad_wereld_test: ${fails} van ${n} mislukt` : `levendestad_wereld_test: ${n}/${n}`);
process.exit(fails ? 1 : 0);
