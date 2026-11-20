// De luchtroute: in een luchtvaartuig is de route een rechte lijn naar het doel (airguide.js, scene3d/airline3d.js).
//   node scripts/airguide_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';

const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
const G = await import('../game/js/airguide.js');
const RR = await import('../game/js/scene3d/routeribbon3d.js');
const A3 = await import('../game/js/scene3d/airline3d.js');
const W = await import('../game/js/routeribbonwatch.js');
const RA = await import('../game/js/roadaccess.js');
let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); };
const near = (a, b, e, m) => ok(Math.abs(a - b) <= e, `${m}: ${a} vs ${b}`);

// 1) reiswijze: vliegtuig, helikopter en duif vliegen; auto en lopen niet
ok(G.isAirCraft({}, { inVehicle: { isPlane: true } }), 'vliegtuig vliegt');
ok(G.isAirCraft({}, { inVehicle: { isHeli: true } }), 'helikopter vliegt');
ok(G.isAirCraft({ pigeonMode: true }, { inVehicle: null }), 'duif vliegt');
ok(!G.isAirCraft({}, { inVehicle: { isBoat: true } }) && !G.isAirCraft({}, { inVehicle: null }), 'boot en lopen niet');
ok(RA.travelModeOf({ player: { inVehicle: { isPlane: true } }, players: [{ inVehicle: { isPlane: true } }] }) === 'lucht', 'roadaccess: vliegtuig is lucht');

// 2) de lijn is recht en eindigt op het doel (of is bijgesneden op N m)
const L = G.airLine({ x: 0, y: 0, z: 120 }, { x: 300, y: 400 }, 150, 700);
near(L.len, 500, 1e-6, 'lengte');
ok(!L.clipped && L.x1 === 300 && L.y1 === 400, 'eindigt op het doel');
near(L.z1, 150, 1e-6, 'eindhoogte');
const C = G.airLine({ x: 0, y: 0, z: 100 }, { x: 3000, y: 4000 }, 200, 700);
ok(C.clipped, 'ver doel: bijgesneden');
near(Math.hypot(C.x1, C.y1), 700, 1e-6, 'bijgesneden op 700 m');
near(C.y1 / C.x1, 4000 / 3000, 1e-9, 'bijgesneden lijn blijft op dezelfde richting (recht)');
near(C.z1, 100 + 100 * (700 / 5000), 1e-6, 'hoogte loopt mee');
ok(G.airLine({ x: 1, y: 1 }, { x: 1, y: 1.2 }, 100) === null, 'op het doel: geen lijn');

// 3) peiling, afstand, links/rechts en hoogteadvies. angle 0 = naar het oosten (x+), plus = rechtsaf (kloksgewijs, y is zuid)
const doel = { x: 0, y: -1000, name: 'Eelde' }; // noord
let g = G.airGuide({ x: 0, y: 0, z: 150, angle: -Math.PI / 2 }, doel, { alt: 150 });
near(g.dist, 1000, 1e-6, 'afstand'); ok(g.bearing === 0, `peiling noord = 0, kreeg ${g.bearing}`);
ok(g.side === 'recht voor je' && g.title === 'Rechtdoor naar Eelde', `rechtdoor: ${g.title}`);
ok(g.altAdvice === 'Hoogte goed', 'hoogte goed');
g = G.airGuide({ x: 0, y: 0, z: 50, angle: 0 }, doel, { alt: 150 }); // kijkt oost, doel noord = links
ok(g.relDeg === -90 && g.side === 'links voor je' && /links/.test(g.title), `links: ${g.relDeg} ${g.side}`);
ok(g.altAdvice === 'Stijg naar 150 m', 'stijgen');
g = G.airGuide({ x: 0, y: 0, z: 300, angle: Math.PI }, doel, { alt: 150 }); // kijkt west, doel noord = rechts
ok(g.relDeg === 90 && g.side === 'rechts voor je' && /rechts/.test(g.title), `rechts: ${g.relDeg} ${g.side}`);
ok(g.altAdvice === 'Daal naar 150 m', 'dalen');
g = G.airGuide({ x: 0, y: 0, z: 150, angle: Math.PI / 2 }, doel, { alt: 150 }); // kijkt zuid, doel noord = achter
ok(g.side === 'achter je' && /Draai om/.test(g.title), 'achter je');
g = G.airGuide({ x: 0, y: 0, z: 150, angle: 0 }, { x: 1000, y: 0, name: 'Oost' }, { alt: 150 });
ok(g.bearing === 90, 'peiling oost = 90');
g = G.airGuide({ x: 0, y: 0, z: 150, angle: 0, speed: 50 }, { x: 3000, y: 0 }, {});
near(g.etaS, 60, 1e-6, 'tijd bij 50 m/s');
ok(G.airEtaText(g.etaS) === '± 1 min', 'tijdtekst');
ok(G.airDistText(1500) === '1,5 km' && G.airDistText(430) === '430 m', 'afstandstekst');
ok(/^Koers 090° · /.test(G.airSub(G.airGuide({ x: 0, y: 0, z: 0, angle: 0 }, { x: 10, y: 0 }, { alt: 100 }))), 'subregel: koers drie cijfers');

// 4) aankomst op afstand en hoogte
ok(G.airArrival({ x: 0, y: 0, z: 100 }, { x: 30, y: 0 }), 'binnen R zonder doelhoogte: aangekomen');
ok(!G.airArrival({ x: 0, y: 0, z: 100 }, { x: 60, y: 0 }), 'buiten R: nog niet');
ok(G.airArrival({ x: 0, y: 0, z: 100 }, { x: 30, y: 0, z: 90 }), 'binnen R en hoogte: aangekomen');
ok(!G.airArrival({ x: 0, y: 0, z: 200 }, { x: 30, y: 0, z: 90 }), 'er boven: niet aangekomen');

// 5) waakhondregels
ok(G.airLineFault({ wanted: false }) === null, 'niet gewenst: geen fout');
const goed = { wanted: true, meshExists: true, inScene: true, visible: true, vertexCount: 16, finite: true };
ok(G.airLineFault(goed) === null, 'gezonde luchtlijn');
ok(G.airLineFault({ ...goed, meshExists: false }) === 'geen-mesh' && G.airLineFault({ ...goed, inScene: false }) === 'niet-in-scene'
  && G.airLineFault({ ...goed, visible: false }) === 'verborgen' && G.airLineFault({ ...goed, vertexCount: 0 }) === 'leeg'
  && G.airLineFault({ ...goed, finite: false }) === 'niet-eindig', 'elke luchtlijnfout wordt gezien');
ok(W.ribbonFault({ wanted: true, flying: true, meshExists: false }) === null, 'vliegen: geen grondstrook is geen fout');
ok(W.ribbonFault({ wanted: true, flying: false, meshExists: false }) === 'geen-mesh', 'op de grond blijft het een fout');
ok(!G.groundRibbonWanted({ mode: 'fly' }, true) && !G.groundRibbonWanted({ mode: 'drive' }, true) && G.groundRibbonWanted({ mode: 'drive' }, false), 'grondstrook gewenst alleen op de grond');

// 6) de scene: route-modus wisselt bij in/uit het vliegtuig
const scene = new THREE.Scene();
RR.setRouteLinks({ getActiveRoute: () => route, getRouteAhead: () => ahead(), getUserWaypoint: () => null });
RR.setRouteRibbonScene(scene, new THREE.PerspectiveCamera());
const pts = []; const cum = [];
for (let i = 0; i <= 60; i++) { pts.push([i * 5, 0]); cum.push(i * 5); }
let route = { version: 1, mode: 'drive', kind: 'mission', px: 0, py: 0, idx: 0, pts, cum, remaining: 300, target: { x: 300, y: 0, kind: 'mission', name: 'Doel' } };
const ahead = () => { const out = [[route.px, route.py]]; for (let i = route.idx + 1; i < pts.length && pts[i][0] < 80; i++) out.push(pts[i]); return out; };
const map = { roadsNear: () => [{ cat: 'normal', width: 6, pts: [[-50, 0], [400, 0]] }], elev: null };
const plane = { isPlane: true, x: 0, y: 0, z: 100, angle: 0, speed: 40 };
const world = { map, player: { x: 0, y: 0, gz: 0, inVehicle: null }, mission: null };
const grond = () => scene.children.find((c) => c.isMesh && c.material && c.material.vertexColors && c.material.polygonOffset);
const lucht = () => A3.getAirLineState();
const stap = (k = 1) => { for (let i = 0; i < k; i++) RR.updateRouteRibbon3D(0.1, world); };

stap();
ok(grond() && grond().visible, 'op de grond: wegstrook zichtbaar');
ok(!lucht().visible, 'op de grond: geen luchtlijn');

// instappen: de route wordt een luchtroute
world.player.inVehicle = plane;
route = { ...route, version: 2, mode: 'fly', remaining: 300, alt: 150, target: { x: 300, y: 400, kind: 'mission', name: 'Doel' } };
W.resetRouteRibbonStats();
stap(8);
ok(!grond().visible, 'in het vliegtuig: grondstrook verborgen');
ok(lucht().visible && lucht().shown && lucht().vertexCount > 0 && lucht().finite, 'in het vliegtuig: luchtlijn zichtbaar');
near(lucht().len, 500, 1e-6, 'luchtlijn loopt tot het doel (500 m recht)');
// de geometrie is echt recht: het uiteinde van het liggende lint ligt op de lijn naar het doel
const lijn = scene.children.find((c) => c.isGroup && c.children.some((m) => m.material && m.material.map)).children.find((m) => m.material && m.material.map);
const pa = lijn.geometry.attributes.position.array;
const mid = (s) => [(pa[s * 2 * 3] + pa[(s * 2 + 1) * 3]) / 2, (pa[s * 2 * 3 + 2] + pa[(s * 2 + 1) * 3 + 2]) / 2];
const [ex, ey] = mid(3);
near(ex, 300, 1e-3, 'eind van het lint op het doel (x)'); near(ey, 400, 1e-3, 'eind van het lint op het doel (y)');
const [mx, my] = mid(1);
near(my / mx, 4 / 3, 1e-6, 'tussenpunt ligt op dezelfde rechte lijn');
ok(W.getRouteRibbonStats().repairs === 0, 'waakhond: tijdens vliegen geen herstelacties (geen grondstrook is geen fout)');

// de waakhond herstelt een verdwenen luchtlijn en telt het
const root = lijn.parent;
root.visible = false; lijn.visible = false;
stap(1); // updateAirLine3D zet root zichtbaar; een verborgen mesh vangt de waakhond
stap(6);
ok(lucht().visible && lijn.visible, 'luchtlijn hersteld na verbergen');
scene.remove(root); stap(6);
ok(root.parent === scene, 'luchtlijn terug in de scene');

// uitstappen / landen: terug naar de wegroute, luchtlijn weg
world.player.inVehicle = null;
route = { ...route, version: 3, mode: 'drive', alt: undefined };
stap(8);
ok(grond().visible, 'uitgestapt: wegstrook terug');
ok(!lucht().visible, 'uitgestapt: luchtlijn weg');

// zonder doel (geen actieve route) in de lucht: niets
world.player.inVehicle = plane;
const eerder = route;
route = null; stap(3);
ok(!lucht().visible, 'geen route: geen luchtlijn');
route = eerder;

// 7) beeld: bestand (de minimap-lijn: route.fly altijd waar in de lucht)
import { readFileSync } from 'node:fs';
const rt = readFileSync(new URL('../game/js/routing.js', import.meta.url), 'utf8');
ok(/fly: mode === 'fly',/.test(rt), 'minimap: luchtroutes krijgen altijd de rechte kraailijn');
ok(/v\.isHeli \|\| v\.isPlane\) return 'fly'/.test(rt), 'routing: een vliegtuig plant een luchtroute, geen wegroute');

console.log(`airguide_test: ${n} controles gehaald`);
