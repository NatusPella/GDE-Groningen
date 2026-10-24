// Vooruitkijken en budget voor het streamen (#247): de rangschikking in de
// rijrichting (streambudget.js), de wachtrij van de geometrie-worker en de
// terugval zonder worker. Puur: geen browser, geen three.js.
//   node scripts/streambudget_test.mjs
import {
  createStreamAhead, advanceStreamAhead, streamLead, streamRank, streamNear,
  noteStreamFocus, streamAheadHere, streamRankHere, streamNearHere,
  makeGeoQueue, geoPush, geoTake,
  STREAM_SPEED_MIN, STREAM_LEAD_S, STREAM_MAX_LEAD, GEO_OPEN_PER_WORKER, GEO_DISPATCH_PER_FRAME,
} from '../game/js/streambudget.js';
const { registerKernels, runGeo, geoStats, geoOpenCount, geoFrame } = await import('../game/js/geojobs.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const near = (a, b, m = 0.01) => Math.abs(a - b) <= m;

// ---- 1. vooruitkijken ---------------------------------------------------
// stilstand: geen vooruitzicht, de rang is gewoon de afstand
const s = createStreamAhead();
ok(streamRank(s, 30, 40) > 1e8, 'zonder focus krijgt niets voorrang');
advanceStreamAhead(s, 0, 0, 1 / 60);
ok(s.speed === 0 && streamRank(s, 30, 40) === 50, 'stilstand: rang is de afstand', String(streamRank(s, 30, 40)));

// 30 m/s recht vooruit (x+), 2 s lang
for (let i = 0; i < 120; i++) advanceStreamAhead(s, (i + 1) * 0.5, 0, 1 / 60);
ok(near(s.speed, 30, 1), 'snelheid volgt de verplaatsing', s.speed.toFixed(2));
ok(near(s.dirX, 1, 0.01) && near(s.dirY, 0, 0.01), 'richting is de rijrichting', `${s.dirX.toFixed(2)},${s.dirY.toFixed(2)}`);
const lead = streamLead(s);
ok(near(lead.lead, 30 * STREAM_LEAD_S, 1), 'vooruitzicht is 3 s reizen', String(lead.lead));
ok(near(lead.x, s.x + 30 * STREAM_LEAD_S, 1), 'het vooruitzicht ligt voor de speler', String(lead.x));

// de kern: 100 m vooruit gaat voor 20 m achter
const ahead = streamRank(s, s.x + 100, s.y), behind = streamRank(s, s.x - 20, s.y);
ok(ahead < behind, '100 m vooruit gaat voor 20 m achter', `${ahead.toFixed(1)} < ${behind.toFixed(1)}`);
ok(behind > 20, 'wat achter ligt zakt in de rij', behind.toFixed(1));
ok(ahead < streamRank(s, s.x + 120, s.y), 'binnen het vooruitzicht: dichterbij eerst');
ok(streamRank(s, s.x + 400, s.y) > streamRank(s, s.x + 200, s.y), 'voorbij het vooruitzicht telt weer de afstand');

// zijwaarts telt minder dan recht vooruit, maar meer dan achter
const side = streamRank(s, s.x, s.y + 50);
ok(side > streamRank(s, s.x + 50, s.y) && side < streamRank(s, s.x - 50, s.y), 'zijwaarts zit tussen voor en achter', `${side.toFixed(1)}`);

// 0..1 voor de workerprioriteit: 1 bij de speler, 0 op de rand
ok(near(streamNear(s, s.x, s.y, 300), 1), 'op de focus is de prioriteit 1');
ok(streamNear(s, s.x - 300, s.y, 300) === 0, 'op de rand van 300 m is de prioriteit 0', String(streamNear(s, s.x - 300, s.y, 300)));
ok(streamNear(s, s.x + 100, s.y, 300) > streamNear(s, s.x - 100, s.y, 300), 'vooruit weegt zwaarder dan achteruit');

// ---- 2. gladstrijken, sprongen en stilvallen --------------------------
// één frame op snelheid zet de snelheid nog niet op 30 (de richting draait mee)
const one = createStreamAhead();
advanceStreamAhead(one, 0, 0, 1 / 60);
advanceStreamAhead(one, 0.5, 0, 1 / 60);
ok(one.speed > 0 && one.speed < 10, 'de snelheid loopt glad in, niet in één frame', one.speed.toFixed(2));

// een sprong van 200 m is geen snelheid: de oude richting blijft, de snelheid valt weg
const jump = createStreamAhead();
for (let i = 0; i < 60; i++) advanceStreamAhead(jump, (i + 1) * 0.5, 0, 1 / 60);
advanceStreamAhead(jump, jump.x + 200, jump.y, 1 / 60);
ok(jump.speed === 0 && jump.lead === 0, 'een sprong is geen snelheid', String(jump.speed));
ok(near(jump.dirX, 1, 0.01), 'na een sprong blijft de rijrichting staan');

// een bocht van 90 graden draait de richting mee, in plaats van om te klappen
const turn = createStreamAhead();
for (let i = 0; i < 60; i++) advanceStreamAhead(turn, 0, (i + 1) * 0.5, 1 / 60);
advanceStreamAhead(turn, 0.5, turn.y, 1 / 60);
ok(turn.dirY > 0.5 && turn.dirX < 0.9, 'de richting draait mee met een bocht', `${turn.dirX.toFixed(2)},${turn.dirY.toFixed(2)}`);

// stilstaan zakt onder de drempel en dan is het weer gewoon afstand
for (let i = 0; i < 240; i++) advanceStreamAhead(s, s.x, s.y, 1 / 60);
ok(s.speed < STREAM_SPEED_MIN && s.lead === 0, 'stilstaan zakt onder de drempel', s.speed.toFixed(2));
ok(streamRank(s, s.x + 100, s.y) === 100, 'onder de drempel telt alleen de afstand');

// dt 0 (gepauzeerd frame) maakt geen snelheid van niets
const paused = createStreamAhead();
advanceStreamAhead(paused, 10, 10, 0);
ok(paused.speed === 0 && paused.x === 10, 'dt 0 levert geen snelheid op');

// het vooruitzicht is begrensd
const fast = createStreamAhead();
advanceStreamAhead(fast, 0, 0, 1 / 60);
for (let i = 0; i < 200; i++) advanceStreamAhead(fast, (i + 1) * 5, 0, 1 / 60);
ok(streamLead(fast).lead <= STREAM_MAX_LEAD, 'het vooruitzicht is begrensd', String(streamLead(fast).lead));
ok(fast.speed <= 80, 'de snelheid is begrensd', String(fast.speed));

// ---- 3. de gedeelde focus (wat de streamers lezen) --------------------
noteStreamFocus(0, 0, 1 / 60);
ok(streamAheadHere().x === 0 && streamRankHere(0, 0) === 0, 'de focus staat waar hij gezet wordt');

// ---- 4. de wachtrij van de geometrie-worker --------------------------
const q = makeGeoQueue();
const jobs = [['a', 0], ['b', 30], ['c', 60], ['d', 30]].map(([id, prio]) => geoPush(q, { id }, prio));
ok(q.items.map((j) => j.id).join('') === 'cbda', 'hoogste prioriteit eerst, gelijken in volgorde', q.items.map((j) => j.id).join(''));
ok(jobs[0].seq === 0 && jobs[1].seq === 1, 'de volgorde van binnenkomst wordt bewaard');
let out = geoTake(q, 0, GEO_OPEN_PER_WORKER, 2);
ok(out.map((j) => j.id).join('') === 'cb' && q.items.map((j) => j.id).join('') === 'da', 'hooguit het budget per frame', out.map((j) => j.id).join(''));
ok(geoTake(q, GEO_OPEN_PER_WORKER, GEO_OPEN_PER_WORKER, 99).length === 0, 'niets boven het plafond van open taken');
ok(geoTake(q, 0, GEO_OPEN_PER_WORKER, 0).length === 0, 'een budget van 0 geeft niets uit');
out = geoTake(q, GEO_OPEN_PER_WORKER - 1, GEO_OPEN_PER_WORKER, 5);
ok(out.length === 1, 'de laatste vrije plek wordt gevuld', String(out.length));
ok(GEO_DISPATCH_PER_FRAME > 0 && GEO_OPEN_PER_WORKER > GEO_DISPATCH_PER_FRAME, 'het budget per frame past binnen het plafond', `${GEO_DISPATCH_PER_FRAME}/${GEO_OPEN_PER_WORKER}`);

// ---- 5. zonder worker: dezelfde weg als voorheen, niets blijft hangen --
registerKernels({ ping: (d) => ({ result: d.x * 2, transfer: [] }) });
let got = null;
runGeo('ping', { x: 21 }, (r) => { got = r; });
ok(got === 42, 'zonder worker rekent de kernel meteen op de hoofdthread', String(got));
ok(geoOpenCount() === 0 && geoStats.queued === 0, 'niets blijft in de wachtrij hangen', `${geoOpenCount()}/${geoStats.queued}`);
ok(typeof geoFrame === 'function', 'het frame-budget is er ook zonder worker');
geoFrame();
ok(geoStats.sync === 1 && got === 42, 'de terugval telt mee in geoStats');

console.log(fails ? `${fails} van ${n} mislukt` : `ok: ${n} controles`);
process.exit(fails ? 1 : 0);
