// AI-tells in beeld (23-11, docs/AI-TELLS-BEELD-23-11.md): de regels die scripts/world/beeld_tells_audit.mjs op de hele stad telt,
// hier op een proefstraat zonder wereld. Een pand kijkt met zijn voordeur naar de straat (facadefront.js), een deur is hoger dan
// een mens, de markies hangt boven je hoofd en een winkelbord rekt zijn letters niet uit.
//   node scripts/beeld_tells_test.mjs
import './node3d.mjs';

const { GameMap } = await import('../game/js/mapdata.js');
const MB = await import('../game/js/models3d_buildings.js');
const { streetFrontEdge, edgeStreet, isStreet } = await import('../game/js/facadefront.js');
const { buildPersonMesh } = await import('../game/js/models3d_people.js');
const THREE = await import('three');

let n = 0, bad = 0;
const ok = (c, name) => { n++; if (!c) { bad++; console.log('FAIL', name); } };
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
const bld = (pts, extra = {}) => ({ pts, bounds: [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))], h: 1, type: 'house', ...extra });

// een straat langs y = 0 en een vrijstaand huis van 6 x 10 m met de korte kant naar de straat: de lange zijkant is de langste muur,
// maar de voordeur hoort aan de straatkant (de oude regel koos de langste muur: een zijgevel of de achterkant)
const street = { pts: [[-200, 0], [200, 0]], cat: 'normal', type: 'residential', width: 6.5, name: 'Proefstraat' };
const alley = { pts: [[-200, 40], [200, 40]], cat: 'minor', type: 'service', width: 4 };
const houses = [];
for (let i = 0; i < 12; i++) houses.push(bld(rect(-90 + i * 15, 5, -84 + i * 15, 15), { h: 0.8 + i * 0.4 }));
// een pand achter een ander pand: de straat is er niet te zien, dus geen voorgevel aan die kant
const front = bld(rect(100, 4, 112, 12), { h: 2 });
const back = bld(rect(100, 14, 112, 24), { h: 2 });
const map = new GameMap({ meta: { bounds: [-250, -250, 250, 250], landmarks: [] }, roads: [street, alley], buildings: [...houses, front, back], water: [], green: [], trees: [] });
MB.setBuildingMap(map);

ok(isStreet(street) && !isStreet(alley) && !isStreet({ cat: 'cycle', type: 'cycleway' }), 'een woonstraat telt als straat, een steeg of fietspad niet');
for (const b of map.buildings.filter((o) => houses.includes(o) || o === front)) {
  MB.buildBuildingMesh(b);
  const E = b.entrance;
  ok(E && E.ny < -0.9, `voordeur van ${b.bounds.slice(0, 2)} kijkt naar de straat (normaal ${E ? E.nx.toFixed(2) + ',' + E.ny.toFixed(2) : 'geen deur'})`);
  if (E) ok(E.h >= 2.0, `deur van ${b.bounds.slice(0, 2)} (h ${b.h}) is hoger dan een mens: ${E.h.toFixed(2)} m`);
}
{
  const b = map.buildings.find((o) => o.bounds[1] === 14 && o.bounds[0] === 100);
  const edges = b._ring || (MB.buildBuildingMesh(b), b._ring);
  const north = edges.find((e) => e.ny < -0.9);
  ok(north && !edgeStreet(map, b, north), 'een gevel achter een ander pand kijkt niet naar de straat');
  ok(streetFrontEdge(map, b, edges.filter((e) => e.ny < -0.9)) === null, 'zonder vrij zicht op de straat geen straatgevel');
}
ok(streetFrontEdge(null, null, []) === null, 'zonder kaart houdt de bouwer zijn eigen keuze');

// deurhoogte, winkeldeur en markies over alle hoogtes en soorten (zonder kaart: de oude keuze van de gevel)
MB.setBuildingMap(null);
for (const type of ['house', 'apartments', 'retail', 'industrial', 'yes']) {
  for (let h = 0.6; h <= 6; h += 0.1) {
    const b = bld(rect(0, 0, 9, 12), { h: Math.round(h * 10) / 10, type });
    MB.buildBuildingMesh(b);
    const E = b.entrance;
    if (E) ok(E.h >= 2.0, `${type} h${b.h}: deur ${E.h.toFixed(2)} m hoger dan een mens`);
    if (E && !E.shop) ok(E.floorH >= 2.4, `${type} h${b.h}: verdieping ${E.floorH.toFixed(2)} m`);
    const F = b.shopFront;
    if (F && F.awningLow != null) ok(F.awningLow >= 2.1, `${type} h${b.h}: markies ${F.awningLow.toFixed(2)} m boven de stoep`);
  }
}
for (let top = 2.55; top <= 3.2; top += 0.05) {
  ok(MB.shopDoorH(top) >= MB.DOOR_MIN_H - 1e-9 && MB.shopDoorH(top) <= top - 0.3 + 1e-9, `pui ${top.toFixed(2)}: winkeldeur ${MB.shopDoorH(top).toFixed(2)} past eronder`);
  ok(MB.awningEdge(top) - 0.22 >= MB.AWNING_MIN_H - 1e-9 && MB.awningEdge(top) < top - 0.05, `pui ${top.toFixed(2)}: markies ${(MB.awningEdge(top) - 0.22).toFixed(2)} m`);
}

// schaal: de mens tegen de deur
const pb = new THREE.Box3().setFromObject(buildPersonMesh(0x3366aa, 0xe0b090));
const ph = pb.max.y - pb.min.y;
ok(ph > 1.6 && ph < 1.95, `een mens is ${ph.toFixed(2)} m`);
ok(MB.DOOR_MIN_H > ph + 0.15, `de laagste deur (${MB.DOOR_MIN_H} m) is ruim hoger dan een mens (${ph.toFixed(2)} m)`);

console.log(`${n - bad}/${n} checks passed`);
process.exit(bad ? 1 : 0);
