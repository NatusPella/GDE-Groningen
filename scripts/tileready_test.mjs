// De definitie van "tegel klaar voor de speler" (game/js/tileready.js, #1354): node scripts/tileready_test.mjs
// Puur: alle overgangen van het grootboek, de poort met time-out, de cutscenepoort en de gebieden van een shotpad.
import {
  LEVELS, RANK, READY, CUT, requiredLevels, maxRank, leadFor, modeOf, aheadPoint, createTileLedger, regionReadiness, sumCounts, emptyCounts,
  waitText, createReadyGate, shotRegions, createCutsceneGate,
} from '../game/js/tileready.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// 1. niveaus en afstanden
ok(LEVELS.join() === 'data,colliders,geometry,gpu,lod,population', 'zes niveaus in vaste volgorde');
ok(requiredLevels(0).length === 6 && requiredLevels(READY.nearM).length === 6, 'nabije ring: alle niveaus');
ok(requiredLevels(READY.nearM + 1).join() === 'data,colliders,geometry,gpu,lod', 'binnen het zicht: t/m lod (de bevolking komt geleidelijk)');
ok(requiredLevels(READY.viewM + 1).join() === 'data', 'ver weg: alleen data');
ok(requiredLevels(NaN).length === 6, 'onbekende afstand: streng (alle niveaus)');
ok(maxRank(['data', 'gpu']) === RANK.gpu && maxRank([]) === -1, 'maxRank');

// 2. vervoermiddelen en vooruitkijken
ok(modeOf({}) === 'foot' && modeOf({ inVehicle: { kind: 'car' } }) === 'car' && modeOf({ inVehicle: { isHeli: true } }) === 'heli' && modeOf({ inVehicle: { isBoat: true } }) === 'boat' && modeOf({ inVehicle: { kind: 'fiets' } }) === 'bike', 'modeOf');
ok(leadFor('foot', 1.5).lead === 6 && leadFor('foot', 99).lead === 40, 'lopen: 4 s vooruit, hoogstens 40 m');
ok(leadFor('car', 30).lead === 120 && leadFor('car', 200).lead === 200, 'auto: 4 s, hoogstens 200 m');
ok(leadFor('heli', 40).lead === 200 && leadFor('plane', 100).lead === 600, 'heli en vliegtuig kijken verder');
ok(leadFor('car', 30).nearM > leadFor('car', 0).nearM && leadFor('plane', 0).nearM > leadFor('foot', 0).nearM, 'de nabije ring groeit met snelheid en vervoermiddel');
ok(leadFor('car', NaN).lead === 0 && leadFor('onbekend', 5).lead === 5 * 4 && leadFor('car', -3).lead === 0, 'kapotte snelheid: geen vooruitkijken, onbekend mode: lopen');
const a = aheadPoint(10, 10, 0, 2, 50);
ok(Math.abs(a.x - 10) < 1e-9 && Math.abs(a.y - 60) < 1e-9, 'aheadPoint volgt de rijrichting');
ok(aheadPoint(5, 5, 0, 0, 30).x === 5, 'aheadPoint zonder richting is niet NaN');

// 3. het grootboek: een tegel kan niet klaar zijn zolang een taak openstaat
const L = createTileLedger();
ok(!L.ready('t1') && L.level('t1') === -1, 'onbekende tegel is niet klaar');
L.complete('t1', 'data');
ok(L.level('t1') === RANK.data && !L.ready('t1') && L.ready('t1', ['data']), 'alleen data gemeld: klaar voor data, niet voor alles');
L.complete('t1', 'geometry');
ok(L.level('t1') === RANK.data, 'een niveau telt niet zolang een lager niveau ontbreekt (colliders)');
L.complete('t1', 'colliders');
ok(L.level('t1') === RANK.geometry, 'keten: data, colliders, geometry');
L.open('t1', 'geometry', 'gebouw:12', 100);
ok(L.level('t1') === RANK.colliders && !L.ready('t1', ['geometry']), 'een open taak zet het niveau terug');
ok(L.blocking('t1', ['geometry']).level === 'geometry' && L.blocking('t1', ['geometry']).jobs[0] === 'gebouw:12', 'blocking noemt de taak');
ok(L.close('t1', 'geometry', 'gebouw:12') && L.ready('t1', ['geometry']), 'taak af: weer klaar voor geometry');
ok(!L.close('t1', 'geometry', 'gebouw:12'), 'dubbel sluiten is een no-op');
L.complete('t1', 'gpu'); L.complete('t1', 'lod'); L.complete('t1', 'population');
ok(L.ready('t1') && L.blocking('t1') === null, 'alle niveaus gemeld en niets open: klaar');
L.open('t1', 'gpu', 'shader:a', 200);
ok(!L.ready('t1') && L.ready('t1', ['data', 'colliders', 'geometry']), 'een shader die nog linkt: niet klaar voor de speler, wel voor verre tegels');
ok(!L.ready('t1', ['population']), 'population kan niet klaar zijn terwijl gpu openstaat');
L.close('t1', 'gpu', 'shader:a');
ok(L.ready('t1'), 'shader gelinkt: klaar');
L.regress('t1', 'geometry');
ok(L.level('t1') === RANK.colliders && !L.ready('t1', ['geometry']), 'regress: de tegel moet geometrie opnieuw melden');
let thrown = false; try { L.open('t1', 'bestaatniet', 'x'); } catch (e) { thrown = true; }
ok(thrown, 'onbekend niveau gooit');
L.drop('t1');
ok(L.size === 0 && !L.ready('t1'), 'drop');
// meerdere taken
const L2 = createTileLedger();
for (const l of LEVELS) L2.complete('k', l);
L2.open('k', 'population', 'auto:1', 0); L2.open('k', 'population', 'auto:2', 0);
L2.close('k', 'population', 'auto:1');
ok(!L2.ready('k') && L2.ready('k', ['gpu']), 'twee taken: één af is niet klaar');
L2.close('k', 'population', 'auto:2');
ok(L2.ready('k'), 'beide af: klaar');
// time-out: een vastgelopen taak wordt gemeld maar blijft blokkeren (de poort beslist)
const L3 = createTileLedger({ ...READY, stuckMs: 1000 });
for (const l of LEVELS) L3.complete('s', l);
L3.open('s', 'gpu', 'tex', 0);
ok(L3.expire(500).length === 0 && L3.expire(1500).join() === 's' && L3.expire(2000).length === 0, 'expire meldt een vastgelopen tegel één keer');
ok(L3.state('s').timedOut && !L3.ready('s'), 'een vastgelopen tegel is niet stilletjes klaar');
L3.close('s', 'gpu', 'tex');
ok(!L3.state('s').timedOut && L3.ready('s'), 'taak alsnog af: weer gewoon klaar');

// 4. tellers per gebied
ok(regionReadiness(emptyCounts()).ready && regionReadiness(null).ready, 'lege tellers: klaar');
const rr = regionReadiness({ data: 0, colliders: 0, geometry: 3, gpu: 2, lod: 0, population: 5 });
ok(!rr.ready && rr.level === RANK.colliders && rr.blocking.map((b) => b.level).join() === 'geometry,gpu,population' && rr.total === 10, 'regionReadiness: eerste blokkade en totaal');
ok(regionReadiness({ population: 5 }, ['data', 'geometry']).ready, 'wat niet nodig is telt niet mee');
ok(regionReadiness({ gpu: 1 }, ['data', 'geometry', 'gpu']).blocking[0].level === 'gpu', 'nodig en open: blokkeert');
ok(regionReadiness({ geometry: NaN, gpu: -2 }).ready, 'NaN en negatief tellen als leeg');
ok(sumCounts([{ data: 1, gpu: 2 }, null, { gpu: 3, population: 1 }]).gpu === 5, 'sumCounts');
ok(/gebouwen/.test(waitText([{ level: 'geometry', n: 1 }])) && /bijna/.test(waitText([])), 'waitText is Nederlands');

// 5. de poort: min tijd, rust, time-out
const g = createReadyGate({ ...READY, minMs: 400, calmTicks: 3, maxMs: 2000 });
const busy = { geometry: 4 }, calm = {};
let r = g.tick(0, calm);
ok(r.phase === 'wait' && !r.ready, 'poort start (idle -> wait) en wacht minstens minMs');
r = g.tick(100, calm); r = g.tick(200, calm); r = g.tick(300, calm);
ok(!r.ready, 'rustig maar nog geen minMs: niet klaar');
r = g.tick(450, calm);
ok(r.ready && r.phase === 'ready', 'minMs voorbij en calmTicks rustig: klaar', JSON.stringify(r));
ok(g.tick(900, busy).ready, 'na klaar blijft de uitkomst staan (geen terugval op een volgende meting)');
g.reset();
g.tick(0, busy); g.tick(500, calm); g.tick(600, calm); r = g.tick(700, busy);
ok(!r.ready && r.blocking[0].level === 'geometry', 'een nieuwe uitbarsting zet de rust terug');
r = g.tick(1400, calm); r = g.tick(1500, calm); r = g.tick(1600, calm);
ok(r.ready, 'weer rustig: klaar');
g.reset();
g.tick(0, busy);
r = g.tick(1999, busy); ok(!r.timedOut && /gebouwen/.test(r.text), 'vlak voor de max: nog wachten, met een reden');
r = g.tick(2000, busy);
ok(r.timedOut && r.phase === 'timeout' && !r.ready && r.text.length > 0 && g.stats.timeouts === 1, 'na maxMs: time-out met nette melding (nooit eeuwig hangen)');
r = g.tick(5000, calm);
ok(r.phase === 'timeout', 'na een time-out blijft de poort open (geen nieuwe wacht)');
// een poort met alleen data nodig
const g2 = createReadyGate({ ...READY, minMs: 0, calmTicks: 1, maxMs: 1000 });
ok(g2.tick(0, { gpu: 9 }, ['data']).ready, 'niet-benodigde niveaus houden de poort niet op');

// 6. de gebieden van een shotpad
const poses = [
  { position: { x: 0, y: 0, z: 2 }, lookAt: { x: 30, y: 0, z: 1 } },
  { position: { x: 200, y: 0, z: 2 }, lookAt: { x: 230, y: 0, z: 1 }, actors: [{ x: 215, y: 3 }] },
];
const reg = shotRegions(poses);
ok(reg.length >= 2 && reg.some((q) => q.x > 190), 'het eindpunt van het pad is een gebied');
ok(reg.every((q) => q.r >= CUT.actorM), 'elk gebied heeft een straal');
ok(reg.some((q) => q.x > 90 && q.x < 150) || reg.some((q) => q.r >= 150 && q.x < 120 && q.x + q.r > 200), 'de baan ertussen is gedekt (geen gat)');
const hoog = shotRegions([{ position: { x: 0, y: 0, z: 150 }, lookAt: { x: 0, y: 50, z: 0 } }]);
ok(hoog[0].r > shotRegions([{ position: { x: 0, y: 0, z: 2 }, lookAt: { x: 0, y: 50, z: 0 } }])[0].r, 'een luchtshot ziet verder');
ok(shotRegions([]).length === 0 && shotRegions(null).length === 0 && shotRegions([{ position: { x: NaN, y: 0 } }]).length === 0, 'kapotte of lege invoer: geen gebieden, geen crash');
const veel = shotRegions(Array.from({ length: 200 }, (_, i) => ({ position: { x: i * 1000, y: 0, z: 2 }, lookAt: { x: i * 1000, y: 10, z: 1 } })));
ok(veel.length <= CUT.maxRegions, 'hoogstens maxRegions gebieden', String(veel.length));

// 7. de cutscenepoort
const c = createCutsceneGate({ shot: false });
let s = c.tick(0, { gpu: 2 });
ok(!s.done && s.holdClock && !s.black, 'begin: de scèneklok staat stil, nog geen zwart');
s = c.tick(CUT.blackAfterMs + 1, { gpu: 2 });
ok(s.black && s.holdClock, 'te lang wachten: zwart (liever zwart dan pop-in in beeld)');
for (let i = 0; i < 12; i++) s = c.tick(300 + i * 100, {});
ok(s.done && s.phase === 'ready' && !s.holdClock && s.black, 'klaar: klok loopt weer (de aanroeper haalt het zwart weg)');
c.reset();
let t2 = createCutsceneGate({ shot: true });
t2.tick(0, { population: 1 });
s = t2.tick(CUT.shotMaxMs + 1, { population: 1 });
ok(s.done && s.phase === 'timeout' && s.holdClock === false && s.text.length > 0, 'shot-wissel: time-out na shotMaxMs, de film gaat door');
const t3 = createCutsceneGate({ shot: false });
t3.tick(0, { geometry: 1 });
s = t3.tick(CUT.shotMaxMs + 1, { geometry: 1 });
ok(!s.done, 'het begin van een scène mag langer wachten dan een shot-wissel');
s = t3.tick(CUT.startMaxMs + 1, { geometry: 1 });
ok(s.done && s.phase === 'timeout', 'maar ook het begin heeft een eind');

console.log(`${n - fails}/${n} controles in orde`);
process.exit(fails ? 1 : 0);
