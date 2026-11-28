// De flat van Tammo en Tessa (#1343): maten van de schil. Normale plafondhoogte voor de muren, een herkenbare voordeur op een plek die
// klopt met de plattegrond, een balkon BUITEN de glasgevel met een schuifdeur ertussen, en een gebouwde flat die dat ook echt toont.
// node scripts/flat_maten_test.mjs
import './node3d.mjs';
import { makeFlatPlan, FLAT_WALL_H, FRONT_DOOR, BALCONY, wallBlocksView } from '../game/js/flatplan.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const P = makeFlatPlan();

ok(FLAT_WALL_H >= 2.4 && FLAT_WALL_H <= 2.7, 'plafondhoogte van de muren is een gewone 2,4 tot 2,7 m', FLAT_WALL_H);
ok(FRONT_DOOR.h >= 2.0 && FRONT_DOOR.h <= 2.2 && FRONT_DOOR.w >= 0.9 && FRONT_DOOR.w <= 1.1, 'de voordeur is 2,0-2,2 bij 0,9-1,1 m', `${FRONT_DOOR.w} x ${FRONT_DOOR.h}`);
ok(FRONT_DOOR.h < FLAT_WALL_H, 'de voordeur past onder het plafond');
// de voordeur zit in de achtermuur van de gang, en de gebruiksplek staat er recht voor
const hall = P.rooms.find((r) => r.name === 'gang');
ok(FRONT_DOOR.x - FRONT_DOOR.w / 2 > hall.x0 + 0.1 && FRONT_DOOR.x + FRONT_DOOR.w / 2 < hall.x1 - 0.1, 'de voordeur ligt binnen de breedte van de gang');
ok(Math.abs(P.spots.door.x - FRONT_DOOR.x) < 1e-6 && P.spots.door.z > P.d - 0.2, 'de spot van de deur is die van het kozijn, tegen de achtermuur');
ok(Math.abs(P.use.door.x - FRONT_DOOR.x) < 0.3 && P.d - P.use.door.z > 0.3 && P.d - P.use.door.z < 1.5, 'de gebruiksplek staat een stap voor de deur');
ok(!P.solids.some(([x0, z0, x1, z1]) => x1 > FRONT_DOOR.x - 0.6 && x0 < FRONT_DOOR.x + 0.6 && z1 > P.d - 1.2 && z0 < P.d), 'geen meubel voor de voordeur');
// het balkon: buiten de gevel (z < 0), binnen de breedte, met een schuifdeur ertussen en een balustrade
ok(BALCONY.depth >= 1.2 && BALCONY.depth <= 2.5, 'het balkon is 1,2-2,5 m diep', BALCONY.depth);
ok(BALCONY.x0 >= 0 && BALCONY.x1 <= P.rooms.find((r) => r.name === 'woonkamer').x1, 'het balkon ligt voor de woonkamer, niet voor de keuken of de slaapkamers');
ok(BALCONY.rail >= 1.0 && BALCONY.rail <= 1.2, 'de balustrade is 1,0-1,2 m', BALCONY.rail);
ok(BALCONY.door.x0 >= BALCONY.x0 && BALCONY.door.x1 <= BALCONY.x1 && BALCONY.door.x1 - BALCONY.door.x0 >= 0.9, 'de schuifdeur zit in het balkon en is minstens 0,9 m');
ok(!P.solids.some(([x0, z0, x1, z1]) => x1 > BALCONY.door.x0 && x0 < BALCONY.door.x1 && z0 < 1.0), 'geen meubel blokkeert de balkondeur (eerste meter)');
ok(!P.walls.some(([x1, z1, x2, z2]) => Math.min(z1, z2) < 0), 'geen muur van de flat ligt buiten de gevel');

// een muur tussen camera en speler zakt weg, een muur ernaast niet
const wl = [0, 5.2, 1.0, 5.2];
ok(wallBlocksView(wl, { lx: 0.5, lz: 9 }, { lx: 0.5, lz: 2 }), 'een muur tussen camera en speler blokkeert het zicht');
ok(!wallBlocksView(wl, { lx: 3, lz: 9 }, { lx: 3, lz: 2 }), 'een muur ernaast blokkeert niets');
ok(!wallBlocksView(wl, { lx: 0.5, lz: 4 }, { lx: 0.5, lz: 2 }), 'een muur achter de camera blokkeert niets');

// gebouwd: het interieur toont dezelfde maten (muurhoogte, balkon buiten de gevel, voordeurkozijn)
const THREE = await import('three');
globalThis.requestAnimationFrame = (f) => setImmediate(f);
const { buildFlat3D, setFlatWalls } = await import('../game/js/home3d.js');
const flat = { w: P.w, d: P.d, tower: { w: 13.5, d: 28 }, rooms: P.rooms, walls: P.walls, spots: P.spots, solids: P.solids, ox: 0, oy: 0, floorY: 0, angle: 0 };
let g = null;
try { g = buildFlat3D(flat); } catch (e) { ok(false, 'buildFlat3D bouwt de flat', e.message); }
if (g) {
  setFlatWalls(g, { lx: 0.5, lz: 9 }, { lx: 0.5, lz: 2 }, 10);
  const wm = g.userData.wallList.find((e) => e.w[1] === 5.2 && e.w[0] === 0);
  ok(wm && Math.abs(wm.m.scale.y - 1.05) < 0.01, 'een muur in de weg zakt tot heuphoogte', wm && wm.m.scale.y.toFixed(2));
  setFlatWalls(g, null, null, 10);
  ok(wm && Math.abs(wm.m.scale.y - FLAT_WALL_H) < 0.01, 'zonder camera staat hij weer op plafondhoogte');
  const balkon = g.getObjectByName('balkon');
  ok(!!balkon, 'het balkon staat in de gebouwde flat');
  if (balkon) {
    balkon.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(balkon);
    ok(b.max.z <= 0.3 && b.min.z <= -BALCONY.depth + 0.1, 'het balkon staat aan de buitenkant van de gevel', `z ${b.min.z.toFixed(2)}..${b.max.z.toFixed(2)}`);
  }
  const wall = new THREE.Box3();
  g.traverse((o) => { if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0xece6da) wall.expandByObject(o); });
  ok(Math.abs(wall.max.y - FLAT_WALL_H) < 0.05, 'de binnenmuren zijn op plafondhoogte gebouwd', wall.max.y.toFixed(2));
  ok(!!g.getObjectByName('meubel:deur'), 'de voordeur is de echte deur uit het interieurregister');
}
console.log(`${fails ? 'FAIL' : 'OK'} flat_maten_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
