// Mission map layers (game/js/missionmap.js): the layer per kind of mission,
// the minimap's scale and selection, the notices. Run: node scripts/missionmap_test.mjs
import { bridgesAhead } from '../game/js/boatahead.js';
import { racingLine } from '../game/js/kartline.js';
import { escapeSpot, heliZones } from '../game/js/missionmap.js';
import { buildMissionLayer, layerKindOf, missionMinimapScale, selectMiniItems, selectMapItems, layerNotices, compassOf, relativeBearing, distLabel, MINI_MAX_ITEMS, MINI_ZOOM, ROLES } from '../game/js/missionmap.js';
import { mapCategory, mapPriority, mapRimColor, mapKindVisible } from '../game/js/mapicons.js';
import { drawMissionLayerIcon, layerCaption } from '../game/js/missionmapdraw.js';

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };
const P = { x: 0, y: 0, angle: 0, speed: 0 };

// --- direction and distance
ok(compassOf({ x: 0, y: 0 }, { x: 10, y: 0 }) === 'oosten', 'east');
ok(compassOf({ x: 0, y: 0 }, { x: 0, y: -10 }) === 'noorden', 'north (y grows south)');
ok(compassOf({ x: 0, y: 0 }, { x: 10, y: 10 }) === 'zuidoosten', 'south-east');
ok(Math.abs(relativeBearing({ x: 0, y: 0 }, 0, { x: 0, y: 10 }) - Math.PI / 2) < 1e-9, 'bearing right');
ok(distLabel(420) === '420 m' && distLabel(1250) === '1,3 km', 'distance label ' + distLabel(1250));
ok(compassOf(null, P) === '', 'compass of nothing');

// --- kinds
ok(layerKindOf(null) === 'algemeen', 'no snapshot');
ok(layerKindOf({ pigeon: {}, kart: {} }) === 'duif', 'pigeon first');
ok(layerKindOf({ kart: {} }) === 'kart', 'kart');
ok(layerKindOf({ wanted: { phase: 'zoeken' }, mission: { phase: 'active', race: true } }) === 'achtervolging', 'chase beats a race');
ok(layerKindOf({ wanted: { phase: 'rustig' }, mission: { phase: 'active', race: true } }) === 'race', 'race');
ok(layerKindOf({ mission: { type: 'boat', phase: 'active' } }) === 'boot', 'boat mission');

// --- nothing running
ok(buildMissionLayer({ player: P }) === null, 'only the player gives no layer');
ok(buildMissionLayer(null) === null, 'null snapshot');
ok(buildMissionLayer({ player: { x: NaN, y: 0 } }) === null, 'bad player');

// --- general mission: goal with distance and arrival time
const gen = buildMissionLayer({ player: P, mission: { type: 'deliver', label: 'Berend', phase: 'active', marker: { x: 600, y: 0 }, distance: 700, waypoints: [] }, aids: [{ x: 50, y: 50, kind: 'garage', label: 'Garage' }], subgoals: [{ x: 100, y: 0, label: 'Extra' }, { x: 5, y: 5, label: 'klaar', done: true }] });
ok(gen.kind === 'algemeen' && gen.info.distance === 700 && gen.info.compass === 'oosten' && gen.info.etaS > 0 && /min/.test(gen.info.etaLabel), 'general info ' + JSON.stringify(gen.info));
ok(gen.items.filter((i) => i.role === 'subgoal').length === 1, 'done subgoals are dropped');
ok(gen.items.find((i) => i.role === 'aid').mini === false, 'aids stay off the minimap');
ok(gen.quiet === true, 'active mission quiets the minimap');

// --- pigeon
const pig = buildMissionLayer({ player: P, pigeon: { targets: [{ x: 300, y: 0, label: 'Park' }, { x: 900, y: 0 }], threats: [{ x: 20, y: 0, kind: 'kat' }], noFly: [{ x: 100, y: 100, r: 50 }] } });
ok(pig.kind === 'duif' && pig.items.some((i) => i.role === 'threat') && pig.areas.length === 1 && pig.lines[0].style === 'crow', 'pigeon layer');
ok(buildMissionLayer({ player: P, pigeon: { targets: [{ x: 300, y: 0 }], threats: [{ x: 20, y: 0, kind: 'meeuw', label: 'Meeuw' }] } }).items.some((i) => i.role === 'threat' && i.sub === 'Meeuw'), 'gull shows as a named threat');
ok(pig.info.target.x === 300, 'pigeon info points at the next target');

// --- kart
const track = Array.from({ length: 40 }, (_, i) => [Math.cos(i / 40 * 6.283) * 150, Math.sin(i / 40 * 6.283) * 150]);
const kart = buildMissionLayer({ player: { x: 150, y: 0, angle: 0, speed: 10 }, kart: { line: track, checkpoints: [{ x: 0, y: 150 }, { x: -150, y: 0 }], nextCheckpoint: 1, karts: [{ x: 150, y: 0, player: true }, { x: 140, y: 5, name: 'Wubbe', lap: 2 }], lap: 1, laps: 3, lapTime: 31.2, bestLap: 40.1, position: 2 } });
ok(kart.kind === 'kart' && kart.lines[0].style === 'track' && kart.items.filter((i) => i.role === 'rival').length === 1, 'kart layer');
ok(kart.items.find((i) => i.state === 'next').label === 'Controlepunt 2', 'kart next checkpoint in order');
ok(kart.info.lap === 1 && kart.info.position === 2 && /Ronde 2\/3/.test(layerCaption(kart)), 'kart caption ' + layerCaption(kart));
ok(kart.focus.r >= 150, 'kart focus covers the whole track');

// --- chase
const chase = buildMissionLayer({ player: P, wanted: { stars: 3, phase: 'zoeken', search: { x: 200, y: 0, r: 80 }, units: [{ x: 30, y: 0, kind: 'police' }, { x: 5000, y: 0, kind: 'police' }], escape: { x: -300, y: 0, r: 60 } } });
ok(chase.kind === 'achtervolging' && chase.areas.length === 2 && chase.info.stars === 3, 'chase layer');
ok(chase.items.filter((i) => i.role === 'police').length === 2 && chase.items.filter((i) => i.role === 'police' && i.focus).length === 1, 'only close units are in the focus');

// --- boat: bridges with air draught
const boat = buildMissionLayer({ player: P, boat: { airDraught: 3, route: [{ x: 0, y: 0 }, { x: 200, y: 0 }], stops: [{ x: 200, y: 0 }], bridges: [{ x: 80, y: 0, clearance: 2.4, name: 'Lage brug' }, { x: 120, y: 0, clearance: 4.2, name: 'Hoge brug' }, { x: 900, y: 0, clearance: 5, name: 'Ver' }] } });
const lo = boat.items.find((i) => i.label === 'Lage brug'), hi = boat.items.find((i) => i.label === 'Hoge brug'), far = boat.items.find((i) => i.label === 'Ver');
ok(lo.role === 'hazard' && /Te laag/.test(lo.sub) && lo.state === 'low', 'low bridge is a hazard');
ok(hi.role === 'bridge' && /4,2 m/.test(hi.sub) && hi.mini, 'high bridge shows its clearance');
ok(!far.mini, 'a far bridge that fits stays off the minimap');

// --- heli, bus, train
const heli = buildMissionLayer({ player: P, heli: { rings: [{ x: 100, y: 0, state: 'next' }, { x: 200, y: 0, state: 'later' }, { x: 5, y: 5, state: 'done' }], pad: { x: 400, y: 0 }, balloon: { x: 300, y: 50 } } });
ok(heli.kind === 'heli' && heli.items.filter((i) => i.role === 'ring').length === 2 && heli.items.some((i) => i.role === 'pad'), 'heli layer');
const bus = buildMissionLayer({ player: P, bus: { route: [{ x: 0, y: 0 }, { x: 500, y: 0 }], stops: [{ x: 100, y: 0, name: 'A', done: true }, { x: 300, y: 0, name: 'B', next: true }, { x: 500, y: 0, name: 'C' }] } });
ok(bus.kind === 'bus' && bus.items.filter((i) => i.role === 'stop').length === 3 && bus.info.label === 'B', 'bus layer, next stop');
ok(selectMiniItems(bus, P).every((i) => i.state !== 'done'), 'passed stops leave the minimap');
const train = buildMissionLayer({ player: P, train: { stops: [{ x: 1000, y: 0, name: 'Station', next: true }] } });
ok(train.kind === 'trein' && train.info.distance === 1000, 'train layer');

// --- minimap: selection and scale
const many = { player: P, mission: { phase: 'active', marker: { x: 100, y: 0 }, label: 'x' }, hazards: Array.from({ length: 20 }, (_, i) => ({ x: i * 10, y: 20 })) };
const ml = buildMissionLayer(many);
const sel = selectMiniItems(ml, P);
ok(sel.length === MINI_MAX_ITEMS && sel.some((i) => i.role === 'goal'), 'the minimap caps its icons and keeps the goal');
ok(sel[0].pri >= sel[sel.length - 1].pri, 'sorted by priority');
ok(selectMapItems(gen, 1).every((i) => i.role !== 'aid') && selectMapItems(gen, 4).some((i) => i.role === 'aid'), 'aids only when zoomed in on the full map');
ok(missionMinimapScale(null, 1.2, 250) === 1.2, 'no layer keeps the scale');
const near = missionMinimapScale(buildMissionLayer({ player: P, mission: { phase: 'active', marker: { x: 40, y: 0 } } }), 1.2, 250);
const far2 = missionMinimapScale(buildMissionLayer({ player: P, mission: { phase: 'active', marker: { x: 4000, y: 0 } } }), 1.2, 250);
ok(near <= 1.2 * MINI_ZOOM.maxFactor + 1e-9 && near > 1.2, 'a near goal zooms in, capped: ' + near);
ok(far2 >= 1.2 * MINI_ZOOM.minFactor - 1e-9 && far2 < 1.2, 'a far goal zooms out, capped: ' + far2);
ok(missionMinimapScale(buildMissionLayer({ player: P, mission: { phase: 'active', marker: { x: 150, y: 0 } } }), 1.2, 250) > far2, 'nearer is more zoomed in');

// --- notices (hudbus kinds)
const seen = new Set();
const n1 = layerNotices(null, chase, P, seen);
ok(n1.length === 1 && n1[0].kind === 'politie' && n1[0].rank === 4, 'chase notice is a police card');
ok(layerNotices(chase, chase, P, seen).length === 0, 'said once');
const low = buildMissionLayer({ player: P, boat: { airDraught: 3, bridges: [{ x: 100, y: 0, clearance: 2, name: 'Lage brug' }] } });
const n2 = layerNotices(null, low, P, new Set());
ok(n2.length === 1 && n2[0].kind === 'gevaar' && /Te laag/.test(n2[0].body), 'low bridge warning');
ok(layerNotices(null, pig, P, new Set()).some((c) => c.kind === 'gevaar'), 'threat nearby warns');
ok(layerNotices(null, null, P).length === 0, 'no layer, no notice');

// --- icons: every role's kind has a category, a rim colour and a size rule
for (const [role, r] of Object.entries(ROLES)) {
  ok(mapCategory(r.kind) && mapPriority(r.kind) > 0, 'category for ' + role);
  ok(mapKindVisible(r.kind, 0.5) || mapCategory(r.kind) === 'other', 'visible zoomed out: ' + role);
}
for (const k of ['mm-gevaar', 'mm-rival', 'mm-halte', 'mm-ring', 'mm-pad', 'mm-brug', 'mm-subdoel', 'mm-hulp']) {
  ok(mapCategory(k) !== 'other', 'mm category ' + k);
  ok(/^#/.test(mapRimColor(k)), 'mm rim colour ' + k);
  const calls = [];
  const ctx = new Proxy({}, { get: (_, p) => (p === 'canvas' ? {} : (...a) => { calls.push(p); }), set: () => true });
  drawMissionLayerIcon(ctx, k, 2);
  ok(calls.length > 2, 'glyph draws ' + k);
}

// the boat layer's live source: bridges on the heading (boatahead.js)
{
  const deck = (x0, x1, h) => (x, y) => (x >= x0 && x <= x1 ? h : Infinity);
  const b = bridgesAhead({ x: 0, y: 0, angle: 0 }, deck(60, 80, 2.4));
  ok(b.length === 1 && b[0].x >= 60 && b[0].x <= 80 && b[0].clearance === 2.4, 'one deck ahead is one bridge');
  ok(bridgesAhead({ x: 0, y: 0, angle: 0 }, () => Infinity).length === 0, 'open water has no bridge');
  ok(bridgesAhead({ x: 0, y: 0, angle: Math.PI }, deck(60, 80, 2.4)).length === 0, 'a bridge behind the boat is not ahead');
  const two = bridgesAhead({ x: 0, y: 0, angle: 0 }, (x) => (x > 48 && x < 72 ? 3 : x > 150 && x < 170 ? 1.9 : Infinity));
  ok(two.length === 2 && two[1].clearance === 1.9, 'two decks are two bridges');
  const low = buildMissionLayer({ player: { x: 0, y: 0, angle: 0, speed: 5 }, boat: { airDraught: 2.5, bridges: [{ x: 90, y: 0, clearance: 2.4, name: 'Brug' }, { x: 180, y: 0, clearance: 4, name: 'Brug' }] } });
  ok(low && low.kind === 'boot' && low.items.some((i) => i.role === 'hazard') && low.items.some((i) => i.role === 'bridge'), 'a bridge too low is a hazard, one that fits is a bridge');
}

// the kart's ideal line (kartline.js): to the inside of a bend, the middle on a straight
{
  const N = 48, R = 100;
  const circle = Array.from({ length: N }, (_, i) => [R * Math.cos((2 * Math.PI * i) / N), R * Math.sin((2 * Math.PI * i) / N)]);
  const ccw = racingLine(circle, 7);
  ok(ccw.length === N && ccw.every((p, i) => Math.hypot(p[0], p[1]) < R && Math.hypot(p[0] - circle[i][0], p[1] - circle[i][1]) <= 3.5 * 0.6 + 1e-6), 'a left bend moves the line inside, within the width');
  const cw = racingLine([...circle].reverse(), 7);
  ok(cw.every((p) => Math.hypot(p[0], p[1]) < R), 'a right bend moves the line inside too');
  const long = Array.from({ length: 20 }, (_, i) => [i * 10, 0]).concat(Array.from({ length: 20 }, (_, i) => [190 - i * 10, 30]));
  const st = racingLine(long, 7);
  ok(Math.abs(st[10][1]) < 1e-6 && Math.abs(st[30][1] - 30) < 1e-6, 'a straight stays on the middle');
  ok(racingLine([[0, 0], [1, 1]], 7).length === 2 && racingLine(circle, 0).length === N, 'too few points or no width: unchanged');
}
// the pigeon layer's areas to avoid: helicopter pads
{
  const z = heliZones([{ x: 10, y: 20, r: 12 }, { x: 0, y: 0 }, { x: NaN, y: 1 }]);
  ok(z.length === 2 && z[0].r === 72 && z[1].r === 60 && z[0].label === 'Helikopterplek', 'a pad is an area of 6x its radius, at least 60 m');
  const l = buildMissionLayer({ player: { x: 0, y: 0, angle: 0, speed: 0 }, pigeon: { targets: [], threats: [], noFly: z } });
  ok(l && l.areas.some((a) => a.label === 'Helikopterplek' && a.role === 'hazard'), 'the pigeon layer draws the pad areas');
  ok(heliZones(null).length === 0, 'no pads, no areas');
}
// where to run to when the police search (escapeSpot): just outside the circle, on the player's side
{
  const e = escapeSpot({ x: 0, y: 0, r: 100 }, { x: 50, y: 0 });
  ok(e && Math.abs(e.x - 140) < 1e-6 && Math.abs(e.y) < 1e-6 && e.r === 30, 'escape lies margin outside the circle on the player side');
  ok(escapeSpot({ x: 0, y: 0, r: 100 }, { x: 0, y: 0, angle: Math.PI / 2 }).y > 100, 'at the centre: ahead of the heading');
  ok(escapeSpot(null, { x: 0, y: 0 }) === null && escapeSpot({ x: 0, y: 0, r: 0 }, { x: 1, y: 1 }) === null, 'no circle, no escape');
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
