// De blokkade bij de grens staat op de weg (#436), ook als je ernaast staat.
//   node scripts/edgescene_snap_test.mjs
import { scenePlan, snapSceneToRoad, SCENE_SNAP_M } from '../game/js/edgescene.js';

let n = 0, bad = 0;
const ok = (name, c, extra = '') => { n++; if (!c) { bad++; console.log('FAIL', name, extra); } };
const rule = { edge: 'friesland', face: Math.PI / 2, d: 60, warnAt: 20, text: ['Terug.'] };
const plan = scenePlan(rule, 100, 100);
const at = plan.props[0];

// een weg die 4 m naast de eerste prop ligt, oost-west
const road = { pts: [[0, at.y - 4], [200, at.y - 4]], bridge: false };
const map = { nearestRoadPoint: (x, y, r, drivable) => (Math.hypot(x - 100, y - (at.y - 4)) <= r ? { x: 100, y: at.y - 4, road } : null) };
const snapped = snapSceneToRoad(map, plan, 'car');
ok('de eerste prop staat op de weg', Math.abs(snapped.props[0].y - (at.y - 4)) < 1e-9, String(snapped.props[0].y));
ok('de andere props schuiven mee', Math.abs((snapped.props[1].x - plan.props[1].x) - (snapped.props[0].x - plan.props[0].x)) < 1e-9);
ok('de versperring staat dwars op de weg', Math.abs(Math.abs(Math.cos(snapped.props[0].angle)) - 1) < 1e-9, String(snapped.props[0].angle));
ok('de voorkant wijst naar binnen', Math.cos(snapped.props[0].angle - rule.face) >= 0);

ok('te voet snapt ook', snapSceneToRoad(map, plan, 'foot').road != null);
ok('op het water blijft de scène staan', snapSceneToRoad(map, plan, 'boat') === plan);
ok('een brug krijgt geen blokkade', snapSceneToRoad({ nearestRoadPoint: () => ({ x: 100, y: 100, road: { pts: [[0, 0], [1, 1]], bridge: true } }) }, plan, 'car') === plan);
ok('zonder weg blijft de scène staan', snapSceneToRoad({ nearestRoadPoint: () => null }, plan, 'car') === plan);
ok('een weg verder dan de snap-afstand laat alles staan', snapSceneToRoad({ nearestRoadPoint: () => ({ x: 100 + SCENE_SNAP_M + 1, y: 100, road: { pts: [[0, 0], [1, 1]] } }) }, plan, 'car') === plan);
console.log(`edgescene_snap_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
