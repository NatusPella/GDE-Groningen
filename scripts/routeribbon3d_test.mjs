// De 3D-routelijn (scene3d/routeribbon3d.js) na de gebeurtenissen die hem deden verdwijnen terwijl de
// minimap de route nog toonde. Invariant: bij een actieve route met een stuk vooruit is er een zichtbare,
// niet-lege strook in de scene.
//   node scripts/routeribbon3d_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';

const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
const RR = await import('../game/js/scene3d/routeribbon3d.js');
const W = await import('../game/js/routeribbonwatch.js');
let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); };

const scene = new THREE.Scene();
RR.setRouteRibbonScene(scene, new THREE.PerspectiveCamera());
const pts = []; const cum = [];
for (let i = 0; i <= 60; i++) { pts.push([i * 5, 0]); cum.push(i * 5); }
let route = { version: 1, mode: 'walk', kind: 'mission', px: 0, py: 0, idx: 0, pts, cum, remaining: 300 };
const ahead = (m) => { const out = [[route.px, route.py]]; for (let i = route.idx + 1; i < pts.length && pts[i][0] - route.px < m; i++) out.push(pts[i]); return out; };
RR.setRouteLinks({ getActiveRoute: () => route, getRouteAhead: ahead, getUserWaypoint: () => null });

let roads = [{ cat: 'normal', width: 6, pts: [[-50, 0], [400, 0]] }];
let failBuild = false;
const map = {
  roadsNear: () => { if (failBuild) throw new Error('tegel weg'); return roads; },
  elev: null,
};
const world = { map, player: { x: 0, y: 0, gz: 0, inVehicle: null }, mission: null };
const lijn = () => scene.children.find((c) => c.isMesh && c.material && c.material.vertexColors);
const gezond = () => { const m = lijn(); return !!m && m.parent === scene && m.visible && m.geometry.index && m.geometry.index.count > 0 && m.geometry.userData.maxAlpha >= W.RIBBON_MIN_VISIBLE_ALPHA; };
const stap = (k = 1) => { for (let i = 0; i < k; i++) RR.updateRouteRibbon3D(0.1, world); };

stap();
ok(gezond(), 'normale route: strook zichtbaar');

// 1) route over gras / wegen nog niet geladen: eerst alpha overal 0
roads = [];
route = { ...route, version: 2 };
stap();
ok(gezond(), 'zonder wegen in de buurt: strook blijft zichtbaar (bodem)');
roads = [{ cat: 'normal', width: 6, pts: [[-50, 0], [400, 0]] }];

// 2) bouw mislukt (kaart gooit): geen lege strook met een gezette sleutel; herstel zodra het weer kan
W.resetRouteRibbonStats();
failBuild = true;
route = { ...route, version: 3 };
stap();
failBuild = false;
for (let i = 0; i < 12; i++) stap(); // 1,2 s: de herpoging na 1 s
ok(gezond(), 'na een mislukte bouw: de strook komt terug zonder dat de speler 2 m verder is');

// 3) mesh uit de scene (scene geleegd bij laden of reizen)
scene.remove(lijn());
stap();
ok(gezond(), 'terug in de scene na verwijderen');

// 4) visible-vlag blijft uit
lijn().visible = false;
stap();
ok(gezond(), 'visible wordt elk frame hersteld');

// 5) waakhond ziet en telt een leeg geworden geometrie
lijn().geometry.setIndex([]);
stap(6);
ok(gezond(), 'lege geometrie: herbouwd door de waakhond');
ok(W.getRouteRibbonStats().repairs >= 1, 'de herstelactie is geteld');

// 6) geen route: geen strook
route = null;
stap();
ok(!lijn().visible, 'zonder route geen strook');

console.log(`routeribbon3d_test: ${n} controles ok; herstelacties ${JSON.stringify(W.getRouteRibbonStats())}`);
