// Map icon rules (game/js/mapicons.js): categories by zoom, size by zoom, and
// the thinning where icons would overlap. Run: node scripts/mapicons_test.mjs
import { mapCategory, mapKindVisible, mapIconScale, placeIcons, mapPriority } from '../game/js/mapicons.js';

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };

// every kind the map draws has a category
const KINDS = ['player', 'userWaypoint', 'missionIdle', 'missionActive', 'mi-3', 'ma-3', 'home', 'homeGarage', 'own', 'station', 'hospital', 'politiebureau', 'garage',
  'sj-taxi', 'sj-target', 'shop-snack', 'pigeon', 'heli', 'padel', 'act-skate', 'pg-jelle', 'dorp', 'companion', 'eierbalTip', 'horeca', 'flitspaal', 'cash', 'policeFoot', 'waypoint'];
for (const k of KINDS) ok(mapCategory(k) && mapPriority(k) > 0, 'category for ' + k);

// zoomed out only the important ones
ok(mapKindVisible('player', 0.3) && mapKindVisible('ma-1', 0.3) && mapKindVisible('station', 0.3) && mapKindVisible('home', 0.3), 'goals, you, stations and home at every zoom');
ok(!mapKindVisible('shop-snack', 1) && mapKindVisible('shop-snack', 2.5), 'shops from zoom 2');
ok(!mapKindVisible('horeca', 4) && mapKindVisible('horeca', 7), 'food only close up (zoom 6)');
ok(!mapKindVisible('flitspaal', 2), 'speed cameras only close up');
ok(mapKindVisible('hospital', 1) && !mapKindVisible('hospital', 0.5), 'hospital and police from zoom 0.9');

// icon size grows with zoom, within bounds, and is much bigger than the old 1.25
ok(mapIconScale(0.3) >= 1.5 && mapIconScale(12) <= 2.4 && mapIconScale(12) > mapIconScale(1), 'scale grows with zoom, bounded');

// collisions: the higher priority stays, a kept category never drops
const placed = placeIcons([
  { kind: 'horeca', sx: 100, sy: 100 }, { kind: 'shop-snack', sx: 104, sy: 102 }, { kind: 'hospital', sx: 300, sy: 300 },
  { kind: 'flitspaal', sx: 301, sy: 301 }, { kind: 'ma-1', sx: 500, sy: 500 }, { kind: 'home', sx: 502, sy: 501 },
], 22);
const has = (k) => placed.some((p) => p.kind === k);
ok(has('shop-snack') && !has('horeca'), 'a shop beats food');
ok(has('hospital') && !has('flitspaal'), 'a hospital beats a speed camera');
ok(has('ma-1') && has('home'), 'goal and home are never dropped');
ok(mapPriority(placed[placed.length - 1].kind) >= mapPriority(placed[0].kind), 'drawn last = highest priority');

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
