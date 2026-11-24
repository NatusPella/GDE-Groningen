// Detail and view distances per profile (viewdist.js, issues #157 and #158):
// rails reach further than the old fixed 190 m, the high-detail ring grows
// with the quality profile inside the memory budget, and the streaming focus
// of a cutscene camera far from the player is the camera's, not the player's.
//   node scripts/viewdist_test.mjs
import * as V from '../game/js/viewdist.js';
import { tileFocus, cameraFocus, LOOK_MAX } from '../game/js/tilefocus.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } };

// rails: never nearer than before, grow with the view distance, capped
let prev = 0;
for (const k of ['kort', 'normaal', 'ver', 'heelver']) {
  const r = V.railViewDistance(V.VIEW_DISTANCES[k]);
  ok(r >= 190 && r <= V.RAIL_VIEW.max && r >= prev, `rail view ${k}: ${r}`);
  prev = r;
}
ok(V.railViewDistance(V.VIEW_DISTANCES.ver) >= V.VIEW_DISTANCES.ver, 'rails reach at least the view distance on "ver"');
ok(V.railViewDistance(V.VIEW_DISTANCES.heelver) > 600, 'rails on "heel ver" go beyond 600 m');
ok(V.railViewDistance(1e9) === V.RAIL_VIEW.max && V.railViewDistance(0) === V.RAIL_VIEW.min, 'rail view is clamped');
ok(V.railViewDistance(300, { min: 100, factor: 2, max: 900 }) === 600, 'rail view takes its own config');

// memory: the worst case of resident track chunks stays a small part of the GPU budget (1.2 GB on Hoog)
const worst = V.railChunkCount(V.railViewDistance(V.VIEW_DISTANCES.heelver)) * V.RAIL_CHUNK_MB;
ok(worst <= 120, `rail chunks worst case ${worst} MB`);

// the high-detail ring: unchanged for laag and for short views, bigger on better profiles, area bounded
ok(V.detailDistanceFor('hoog', 150) === V.DETAIL_BASE, 'a short view keeps 140 m');
ok(V.detailDistanceFor('laag', 900) === V.DETAIL_BASE, 'laag keeps 140 m');
ok(V.detailDistanceFor('middel', 600) > V.DETAIL_BASE && V.detailDistanceFor('hoog', 600) > V.detailDistanceFor('middel', 600), 'middel < hoog');
for (const q of Object.keys(V.DETAIL_DIST)) ok((V.DETAIL_DIST[q] / V.DETAIL_BASE) ** 2 <= V.DETAIL_AREA_MAX, `detail area ratio ${q}`);
// #1039: Ultra (hoog, heel ver) heeft een ring van 170 m: hoogstens 1,5x de meshes van de ring van 140 m (was 1,84x)
ok(V.detailDistanceFor('hoog', 900) === 170 && (170 / V.DETAIL_BASE) ** 2 <= 1.5, '#1039 de ring van Ultra is 170 m, hoogstens 1,5x de oppervlakte van 140 m');
ok(V.detailDistanceFor('onbekend', 900) === V.DETAIL_BASE, 'unknown profile falls back');
ok(V.detailDistanceFor('hoog', 900, 3) === V.DETAIL_WEAK && V.DETAIL_WEAK < V.DETAIL_BASE, 'cpuLevel 3 shrinks the ring');
ok(V.detailDistanceFor('hoog', 900, 2) === V.detailDistanceFor('hoog', 900), 'cpuLevel 2 does not');

// a cutscene camera far from the player: the streamer follows the camera's look point
const player = { x: 0, y: 0 };
const cam = { position: { x: 5000, y: 3000 }, lookAt: { x: 5300, y: 3000 } };
const f = cameraFocus(cam);
ok(f && Math.hypot(f.x - cam.position.x, f.y - cam.position.y) <= LOOK_MAX + 1e-6, 'focus is within LOOK_MAX of the eye');
const st = {};
const t1 = tileFocus(player, cam, st, 0.016);
ok(Math.hypot(t1.x - 5000, t1.y - 3000) <= LOOK_MAX + 1e-6 && Math.hypot(t1.x, t1.y) > 4000, 'tiles follow the camera, not the player');
ok(LOOK_MAX >= 80, 'wide shots keep detail at their far side');
const t2 = tileFocus(player, null, st, 0.016);
ok(t2.x === 0 && t2.y === 0 && Object.keys(t2.opts).length === 0, 'back to the player after the cut: a jump, no speed');

// de mist (24-11): zachte diepte, geen muur. Begint minstens op 40% van de zichtafstand, is dicht op de zichtafstand en groeit met de afstand
for (const [name, view] of Object.entries(V.VIEW_DISTANCES)) {
  const ring = V.detailDistanceFor('hoog', view, 0);
  const fog = V.fogRange(view, ring);
  ok(fog.near >= view * V.FOG_NEAR_SHARE - 1e-9, `mist ${name}: begint op minstens ${V.FOG_NEAR_SHARE * 100}% van de zichtafstand (${fog.near} van ${view})`);
  ok(fog.far > fog.near && Math.abs(fog.far - view * 1.02) < 1e-9, `mist ${name}: dicht op de zichtafstand`);
  ok(fog.far - fog.near >= view * 0.3, `mist ${name}: een brede, zachte overgang (${Math.round(fog.far - fog.near)} m)`);
}
const kort = V.fogRange(V.VIEW_DISTANCES.kort, V.detailDistanceFor('hoog', V.VIEW_DISTANCES.kort, 0));
ok(kort.near === 63 && Math.round(kort.far) === 153, 'mist kort ongewijzigd (Laag): 63 tot 153 m');
const verFog = V.fogRange(V.VIEW_DISTANCES.ver, V.detailDistanceFor('hoog', V.VIEW_DISTANCES.ver, 0));
ok(verFog.near >= 240, `Hoog (ver): de mist begint pas op ${verFog.near} m (was 188 m)`);
const ultraFog = V.fogRange(V.VIEW_DISTANCES.heelver, V.detailDistanceFor('hoog', V.VIEW_DISTANCES.heelver, 0));
ok(ultraFog.near >= 360, `Ultra (heel ver): de mist begint pas op ${ultraFog.near} m (was 263 m)`);

// Ultra valt alleen in de stad terug, en pas als de renderschaal het niet meer redt (24-11); in de lucht en op het water nooit
ok(V.viewDistanceFor('heelver', 0.8, 1, 'stad') === 900, 'stad: 80% renderschaal redt het nog: 900 m');
ok(V.viewDistanceFor('heelver', V.VIEW_FALLBACK_SCALE, 1, 'stad') === 600, 'stad: renderschaal op de bodem: 600 m');
ok(V.viewDistanceFor('heelver', 1, 2, 'stad') === 600, 'stad: de CPU houdt het niet bij: 600 m');
for (const ctx of ['lucht', 'water']) ok(V.viewDistanceFor('heelver', 0.5, 2, ctx) === 900, `${ctx}: Ultra blijft 900 m`);
ok(V.viewDistanceFor('heelver', 0.5, 3, 'lucht') === 150, 'cpuLevel 3 blijft de noodstand, overal');
// de context, met hysterese op de hoogte
ok(V.viewContext('stad', 40, false) === 'stad' && V.viewContext('stad', 46, false) === 'lucht', 'pas boven 45 m in de lucht');
ok(V.viewContext('lucht', 35, false) === 'lucht' && V.viewContext('lucht', 29, false) === 'stad', 'pas onder 30 m weer de stad (geen heen en weer)');
ok(V.viewContext('lucht', 200, true) === 'water', 'op een boot: water');

if (fails) { console.log(fails + ' failed'); process.exit(1); }
console.log('viewdist: all passed');
