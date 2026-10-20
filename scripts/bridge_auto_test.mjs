// Movable bridges (#154): a boat too tall for the closed bridge makes it open by
// itself, timed so the leaf is up as the boat arrives; it stays open until the
// boat is through (several in a row) and then closes. A horn still works.
//   node scripts/bridge_auto_test.mjs
import assert from 'node:assert/strict';
import * as MB from '../game/js/movablebridges.js';

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };

// a bridge over a channel running north-south: the span lies along x, the water along y
const mkBridge = () => {
  const road = { movable: 'bascule', bridge: true, pts: [[0, 0], [20, 0]], width: 6, cat: 'normal' };
  return MB.buildMovableBridges({ roads: [road] })[0];
};
const T = MB.BRIDGE_TIMING;
const world = { vehicles: [], pedestrians: [], player: { x: 900, y: 900 }, time: 0 };
// a boat of this model kind sailing along the water (+y heading = angle pi/2) at speed sp
const boat = (kind, y, sp, extra = {}) => ({ isBoat: true, model: { kind }, x: 10, y, speed: sp, angle: Math.PI / 2, ...extra });
const step = (secs, onTick) => { for (let t = 0; t < secs - 1e-9; t += 0.1) { for (const v of world.vehicles) { v.y += Math.sin(v.angle) * v.speed * 0.1; } MB.updateMovableBridges(0.1, world); if (onTick) onTick(); } };

let b = mkBridge();
ok(MB.boatNeedsOpening(boat('skutsje', 0, 0)) && !MB.boatNeedsOpening(boat('kano', 0, 0)), 'a skutsje needs the bridge open, a canoe does not');
const lead = MB.openingLead();
ok(lead === T.WARN_S + T.BOOMS_S + T.MOVE_S, 'the lead is the time to open');

// 1. a canoe never triggers it; a far or departing skutsje neither
world.vehicles = [boat('kano', -40, 3)];
step(2);
ok(b.state === 'closed', 'a canoe passes under without the bridge opening');
world.vehicles = [boat('skutsje', -400, 4)];
step(2);
ok(b.state === 'closed', 'a boat far away does not trigger it');
world.vehicles = [boat('skutsje', -40, -4)];
step(2);
ok(b.state === 'closed', 'a boat sailing away does not trigger it');

// 2. an approaching skutsje: triggered once its time to the deck is the lead plus a margin
b = mkBridge(); MB.resetMovableBridges();
const sp = 4, edge = Math.max(2, b.half);
const trig = (lead + MB.AUTO.MARGIN_S) * sp + edge; // distance from the middle at the trigger
world.vehicles = [boat('skutsje', -(trig + 12), sp)];
let openedAt = null, t0 = 0, closedState = null, tick = 0;
step(40, () => { tick++; if (openedAt === null && b.state !== 'closed') { openedAt = tick * 0.1; } });
const v = world.vehicles[0];
ok(openedAt !== null && openedAt > 2 && openedAt < 4, `triggered when the boat is ~${(lead + MB.AUTO.MARGIN_S).toFixed(0)} s out (${openedAt && openedAt.toFixed(1)} s in)`);

// run it again, recording the state when the boat reaches the deck edge
b = mkBridge(); MB.resetMovableBridges();
const bt = boat('skutsje', -(trig + 12), sp);
world.vehicles = [bt];
let atEdge = null;
step(60, () => { if (atEdge === null && Math.abs(bt.y) - edge <= 0.5) atEdge = b.state + ':' + b.open.toFixed(2); });
ok(/^(opening:0\.[89]|open:1)/.test(atEdge || ''), `the leaf is (nearly) up when the boat gets to the deck (${atEdge})`);
ok(bt.y > edge + MB.AUTO.PASS_PAD, 'the boat sailed through without stopping');

// 3. it closes some time after the boat is through
step(T.MOVE_S + T.BOOMS_S + MB.AUTO.MIN_OPEN_S + 6);
ok(b.state === 'closed' || b.state === 'up' || b.state === 'closing', `it closes after the boat has passed (${b.state})`);
step(T.MOVE_S + T.BOOMS_S + 4);
ok(b.state === 'closed', 'and is closed again');

// 4. two boats in a row: it stays open until both are through
b = mkBridge(); MB.resetMovableBridges();
const a1 = boat('skutsje', -(trig + 12), sp), a2 = boat('skutsje', -(trig + 12) - 90, sp);
world.vehicles = [a1, a2];
let closedWhile = false;
step(80, () => { if ((b.state === 'closing' || b.state === 'up') && a2.y < edge && a2.y > -200) closedWhile = true; });
ok(!closedWhile, 'it does not close on the second boat');
ok(a1.y > edge && a2.y > edge, 'both sailed through');

// 5. a boat lying still at the bridge asks for it; a horn still works by hand
b = mkBridge(); MB.resetMovableBridges();
world.vehicles = [boat('skutsje', -30, 0)];
step(0.3);
ok(b.state === 'warn', 'a skutsje lying still in front of it asks for it');
b = mkBridge(); MB.resetMovableBridges();
world.vehicles = [];
MB.hornAt(10, -20, null);
step(0.2);
ok(b.state === 'warn' && b.manual, 'the horn opens it by hand');
step(T.WARN_S + T.BOOMS_S + T.MOVE_S + 4);
ok(b.state === 'open', 'and it holds open for the full hold time');

// 6. a boat that turns back is let go
b = mkBridge(); MB.resetMovableBridges();
const tb = boat('skutsje', -60, 3);
world.vehicles = [tb];
step(1);
tb.speed = -4;
step(T.WARN_S + T.BOOMS_S + T.MOVE_S + MB.AUTO.MIN_OPEN_S + T.MOVE_S + T.BOOMS_S + 14);
ok(b.state === 'closed', `it closes when the boat turns back (${b.state})`);

// 7. a moored barge near the bridge (lying still for good) does not hold it open for ever or make it open again (#235)
b = mkBridge(); MB.resetMovableBridges();
const moored = boat('binnenvaart', 30, 0);
world.vehicles = [moored];
step(T.WARN_S + T.BOOMS_S + T.MOVE_S + 2);
ok(b.state === 'open', 'a moored barge in front of it still opens it once');
step(MB.AUTO.STILL_PATIENCE_S + T.MOVE_S + T.BOOMS_S + 6);
ok(b.state === 'closed', `it closes on its own once the barge has stayed put (${b.state})`);
step(120);
ok(b.state === 'closed' && b.ignored.has(moored), 'and does not open again for the barge lying there');
moored.speed = 1.5; moored.angle = -Math.PI / 2; // the barge sails off (away from the bridge), then comes back lying still
step(12);
ok(!b.ignored.has(moored), 'a barge that sails off is looked at again');
moored.speed = 0; moored.y = 20; // (the loop moved it; put it back in front of the bridge)
step(0.5);
ok(b.state === 'warn', 'and asks again when it lies still in front of the bridge afterwards');
// a horn from a boat that then stays put holds the bridge no longer than the patience either
b = mkBridge(); MB.resetMovableBridges();
const horn = boat('skutsje', -20, 0);
world.vehicles = [horn];
MB.hornAt(10, -20, horn);
step(T.WARN_S + T.BOOMS_S + T.MOVE_S + MB.AUTO.STILL_PATIENCE_S + T.MOVE_S + T.BOOMS_S + 12);
ok(b.state === 'closed', `a hornblower that lies still does not keep it open (${b.state})`);

// 8. a footway beside a movable carriageway opens with it (OSM tags only the carriageway; the Herebrug case, #235)
{
  const roads = [
    { movable: 'bascule', bridge: true, cat: 'normal', width: 9.9, pts: [[353, 755], [364, 778], [365, 780]] },
    { bridge: true, cat: 'foot', width: 1.8, pts: [[357, 784], [345, 759]] },
    { bridge: true, cat: 'foot', width: 1.8, pts: [[500, 500], [510, 520]] },
    { bridge: true, cat: 'normal', width: 6, pts: [[357, 784], [345, 759]] },
  ];
  const bs = MB.buildMovableBridges({ roads });
  ok(roads[1].movable === 'bascule' && bs.length === 2, 'a parallel footway beside the span becomes part of the movable bridge');
  ok(!roads[2].movable && !roads[3].movable, 'a far footway and a car road beside it stay as they are');
}

// 9. a barge that lies still and drifts a hair backwards (speed -0.001) is not "turned back": the bridge does not cycle open-closed-open (#235)
b = mkBridge(); MB.resetMovableBridges();
const drift = boat('binnenvaart', -30, -0.001);
world.vehicles = [drift];
let opens = 0, was = b.state;
step(150, () => { if (b.state === 'opening' && was !== 'opening') opens++; was = b.state; });
ok(opens === 1, `a drifting barge makes the bridge open once, not again and again (${opens})`);
ok(b.state === 'closed', `and it ends closed (${b.state})`);

// 10. a boat that has sailed through and then lies still just beyond the bridge does not hold it open or call it back (#235)
b = mkBridge(); MB.resetMovableBridges();
const through = boat('skutsje', -60, 4);
world.vehicles = [through];
let reopens = 0, st = b.state, passedAt = null, closedAt = null, t10 = 0;
step(70, () => {
  t10 += 0.1;
  if (passedAt === null && through.y > 40) { passedAt = t10; through.speed = 0; } // through, sails on a good way and then stops 40 m beyond the bridge (the real case: it pushed on until a quay stopped it)
  if (passedAt && b.state === 'opening' && st !== 'opening') reopens++;
  if (passedAt && closedAt === null && (b.state === 'closing' || b.state === 'closed')) closedAt = t10 - passedAt;
  st = b.state;
});
ok(passedAt !== null && reopens === 0, `a boat lying still beyond the bridge after passing does not call it back (${reopens})`);
ok(closedAt !== null && closedAt < MB.AUTO.MIN_OPEN_S + 3, `the bridge starts to close within seconds of the boat being through, not after the patience (${closedAt && closedAt.toFixed(1)} s)`);

// 11. a boat that keeps nosing at the bridge (never lies still, never gets through) cannot hold it open for ever (#235)
b = mkBridge(); MB.resetMovableBridges();
const nose = boat('skutsje', -12, 0.8);
world.vehicles = [nose];
let maxOpen = 0, openFor = 0;
for (let t = 0; t < 300; t += 0.1) { nose.y = -12 + Math.sin(t); MB.updateMovableBridges(0.1, world); if (b.state === 'open') { openFor += 0.1; maxOpen = Math.max(maxOpen, openFor); } else openFor = 0; }
ok(maxOpen <= MB.AUTO.MAX_OPEN_S + 1, `the bridge never stays open longer than the cap (${maxOpen.toFixed(0)} s)`);

// 12. the province's movable bridges join with the streamed tiles and leave with them (#235: they never opened before)
{
  const city = { movable: 'bascule', bridge: true, pts: [[0, 0], [20, 0]], width: 6, cat: 'normal' };
  const list = MB.buildMovableBridges({ roads: [city] });
  const v0 = MB.movableBridgesVersion();
  const tileRoad = { movable: 'lift', bridge: true, pts: [[5000, 0], [5030, 0]], width: 6, cat: 'normal' };
  const side = { bridge: true, cat: 'foot', width: 1.8, pts: [[5003, 6], [5027, 6]] };
  assert.ok(MB.addMovableRoads([tileRoad, side, city]) === 2 && list.length === 3, 'a streamed movable bridge (and its footway) is added once, the city one is not doubled');
  ok(MB.getMovableBridges() === list && MB.movableBridgesVersion() > v0, 'the same array, a new version');
  ok(MB.addMovableRoads([tileRoad]) === 0, 'adding it again changes nothing');
  const resident = new Set([city, tileRoad, side]);
  const map = { roadsNear: (x, y) => [...resident].filter((r) => r.pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < 30 || Math.hypot((r.pts[0][0] + r.pts[1][0]) / 2 - x, (r.pts[0][1] + r.pts[1][1]) / 2 - y) < 5)) };
  resident.delete(tileRoad); resident.delete(side); tileRoad._open = true;
  ok(MB.pruneMovableBridges(map) === 2 && list.length === 1 && list[0].r === city && !tileRoad._open, 'a bridge whose tile left is dropped (and its road no longer counts as open), the city one stays');
  // a lift bridge opens and closes for a boat like the others
  const lift = MB.addMovableRoads([tileRoad]);
  const lb = list.find((q) => q.r === tileRoad);
  ok(lift === 1 && lb.kind === 'lift', 'a lift bridge is a bridge');
}

console.log(fails ? `${fails} of ${n} FAILED` : `${n} automatic bridge checks passed`);
process.exit(fails ? 1 : 0);
