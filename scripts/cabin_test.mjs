// De cabine van auto's, bestelbussen en vrachtwagens van buiten gezien (#389, #833): cabin3d.js bouwt per
// voertuigsoort en detailniveau één samengevoegde geometrie in Node; die moet eindig zijn, in het voertuig blijven
// en klein genoeg voor één draw call. De drie niveaus moeten strikt in driehoeken aflopen (en ver genoeg dalen),
// syncCabins moet op de afstandsdrempels van geometrie wisselen en nooit meer dan het bouwbudget per aanroep bouwen.
//   node scripts/cabin_test.mjs   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';
const THREE = await import('three');
await import('../game/js/player.js');
const { buildVehicleMesh, carBodyFit } = await import('../game/js/models3d_vehicles.js');
const { Vehicle, TRAFFIC_MODELS } = await import('../game/js/vehicle.js');
const C = await import('../game/js/cabin3d.js');
const { vehicleSeat } = await import('../game/js/seating3d.js');
const { interiorKlasse } = await import('../game/js/carinteriorlayout.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const models = new Map();
for (const m of TRAFFIC_MODELS()) if (!models.has(m.name)) models.set(m.name, m);
const extra = [['escort', { name: 'escort', len: 4.0, wid: 1.65, color: '#a11f1f' }, { isHeroCar: true }], ['truck', { name: 'truck', len: 8.5, wid: 2.5, color: '#e8e6e0' }, {}], ['ambulance', { ...models.get('van') }, { isAmbulance: true }], ['police', { ...models.get('sedan') }, { isPolice: true }], ['taxi', { name: 'taxi', len: 4.6, wid: 1.8, color: '#1b1c1f' }, {}]];
// De cockpitklassen (#847) lopen door hetzelfde cabinepad: trekker, heli, vliegtuig en de
// machines van de boerderij, met de maten uit vehicle.js/heliflight.js/planeflight.js.
const cockpit = [
  ['tractor', { name: 'tractor', len: 4.3, wid: 2.3, color: '#3f7d3a' }, {}],
  ['heli', { name: 'heli', len: 8.8, wid: 2.1, color: '#b8322a' }, { isHeli: true }],
  ['plane', { name: 'plane', len: 8, wid: 10.6, color: '#e9e4d3' }, { isPlane: true }],
  ['maaidorser', { name: 'maaidorser', len: 7.4, wid: 3.3, color: '#c43d2b' }, {}],
  ['laadmachine', { name: 'laadmachine', len: 3.4, wid: 1.8, color: '#e0a92b' }, {}],
];
const cases = [...['hatch', 'sedan', 'wagon', 'van', 'sport', 'taxi'].filter((n) => models.has(n)).map((n) => [n, models.get(n), {}]), ...extra, ...cockpit];
const triangles = (g) => g.attributes.position.count / 3;
const finite = (g) => {
  const p = g.attributes.position;
  for (let i = 0; i < p.array.length; i++) if (!Number.isFinite(p.array[i])) return false;
  return true;
};
const insideBody = (g, len, wid) => {
  g.computeBoundingBox();
  const b = g.boundingBox, hl = len / 2, hw = wid / 2;
  return b.min.x >= -hl - 0.05 && b.max.x <= hl + 0.05 && b.min.z >= -hw && b.max.z <= hw;
};
const span = (g, len, wid) => {
  g.computeBoundingBox();
  const b = g.boundingBox;
  return `x ${b.min.x.toFixed(2)}..${b.max.x.toFixed(2)} z ${b.min.z.toFixed(2)}..${b.max.z.toFixed(2)} (romp ${len / 2} x ${wid / 2})`;
};

for (const [name, model, flags] of cases) {
  const v = Object.assign(new Vehicle(0, 0, 0, model), flags);
  check(name + ': wil een cabine', C.wantsCabin(v));
  const mesh = buildVehicleMesh(v);
  const meshes = new Map([[v.id, mesh]]);
  C.syncCabins({ vehicles: [v] }, meshes, 0, 0);
  const cab = mesh.userData.cabin;
  check(name + ': cabine aangemaakt', !!cab && cab.visible);
  if (!cab) continue;
  const g = cab.geometry;
  check(name + ': eindige posities', finite(g));
  check(name + ': binnen de carrosserie', insideBody(g, model.len, model.wid), span(g, model.len, model.wid));
  check(name + ': klein genoeg (<= 1200 driehoeken)', triangles(g) <= 1200, 'driehoeken ' + triangles(g));
  check(name + ': gedeeld en één groep', g.userData.shared === true && g.groups.length === 1);
  check(name + ': één mesh per voertuig', cab === mesh.userData.cabin && cab.name === 'cabine');
  check(name + ': geen schaduwkosten', cab.castShadow === false);
  // een tweede voertuig van dezelfde soort hergebruikt de geometrie
  const v2 = Object.assign(new Vehicle(0, 0, 0, model), flags);
  const mesh2 = buildVehicleMesh(v2);
  C.syncCabins({ vehicles: [v2] }, new Map([[v2.id, mesh2]]), 0, 0);
  check(name + ': geometrie gedeeld met een tweede voertuig', mesh2.userData.cabin && mesh2.userData.cabin.geometry === g);
  // ver weg: onzichtbaar
  C.syncCabins({ vehicles: [v] }, meshes, 200, 0);
  check(name + ': verborgen op afstand', !cab.visible);
  // de binnenin-camera tekent zijn eigen interieur
  mesh.userData.interior = { visible: true };
  C.syncCabins({ vehicles: [v] }, meshes, 0, 0);
  check(name + ': verborgen bij de binnenin-camera', !cab.visible);
}

// --- de afstandstrap (#833) ---
{
  const R = C.CABIN_LOD_R;
  check('LOD: drie afstandsgrenzen', Array.isArray(R) && R.length === 3 && R[0] < R[1] && R[1] < R[2], JSON.stringify(R));
  check('LOD: CABIN_R is de verste grens', C.CABIN_R === R[2], `${C.CABIN_R} tegen ${R[2]}`);
  const want = [[0, 0], [R[0] - 0.01, 0], [R[0], 1], [R[1] - 0.01, 1], [R[1], 2], [R[2] - 0.01, 2], [R[2], -1], [200, -1], [NaN, -1], [Infinity, -1]];
  for (const [afstand, lod] of want) check(`LOD: cabinLodAt(${afstand}) = ${lod}`, C.cabinLodAt(afstand) === lod, String(C.cabinLodAt(afstand)));
}

// De drie niveaus: strikt minder driehoeken, flink minder op lod 1 en 2 (prestatie-eis #833: minstens 35% en 70%
// minder dan lod 0), eindig en binnen de carrosserie. De bouwtijd van de eerste geometrie per niveau wordt gemeten
// en aan het eind gerapporteerd: de LOD's moeten goedkoop blijven.
const rows = [];
const firstBuild = new Array(3).fill(null);
let builds = 0;
for (const [name, model, flags] of cases) {
  const v = Object.assign(new Vehicle(0, 0, 0, model), flags);
  const seat = vehicleSeat(v, true);
  const klasse = interiorKlasse(v);
  const romp = carBodyFit(v);
  const row = { name, tri: [], ms: [] };
  for (let lod = 0; lod < 3; lod++) {
    const t0 = performance.now();
    const g = C.buildCabinGeometry(seat, model.len, model.wid, klasse, romp, lod, { naam: name });
    const ms = performance.now() - t0;
    if (firstBuild[lod] === null) firstBuild[lod] = ms;
    builds++;
    row.tri.push(triangles(g));
    row.ms.push(ms);
    check(`${name}: lod ${lod} eindig`, finite(g));
    check(`${name}: lod ${lod} binnen de carrosserie`, insideBody(g, model.len, model.wid), span(g, model.len, model.wid));
    check(`${name}: lod ${lod} één groep`, g.groups.length === 1);
  }
  check(`${name}: driehoeken lopen strikt af (${row.tri.join(' > ')})`, row.tri[0] > row.tri[1] && row.tri[1] > row.tri[2], row.tri.join(' > '));
  check(`${name}: lod 1 minstens 35% minder driehoeken`, row.tri[1] <= 0.65 * row.tri[0], `${row.tri[0]} -> ${row.tri[1]}`);
  check(`${name}: lod 2 minstens 70% minder driehoeken`, row.tri[2] <= 0.3 * row.tri[0], `${row.tri[0]} -> ${row.tri[2]}`);
  rows.push(row);
}

// syncCabins wisselt op de drempels van geometrie (zelfde mesh, zelfde naam/renderOrder/noBatch), deelt de
// geometrie per niveau met een tweede auto en verbergt voorbij de verste grens. De LOD kiest op de
// spelerafstand (Chebyshev), niet op de camera-afstand: dat is de goedkope keuze en zo bedoeld (#833).
{
  const model = models.get('sedan') || models.get('hatch');
  const v = new Vehicle(0, 0, 0, { ...model });
  const mesh = buildVehicleMesh(v);
  const world = { vehicles: [v] };
  const meshes = new Map([[v.id, mesh]]);
  C.syncCabins(world, meshes, 0, 0);
  const cab = mesh.userData.cabin;
  const g0 = cab && cab.geometry;
  check('sync: dichtbij lod 0', !!cab && mesh.userData.cabinLod === 0 && cab.visible);
  check('sync: gedeeld en één groep op lod 0', g0 && g0.userData.shared === true && g0.groups.length === 1);
  const tri0 = g0 ? triangles(g0) : 0;
  C.syncCabins(world, meshes, C.CABIN_LOD_R[0], 0);
  const g1 = cab && cab.geometry;
  check('sync: op de eerste drempel lod 1', mesh.userData.cabinLod === 1, String(mesh.userData.cabinLod));
  check('sync: wisselt van geometrie, niet van mesh', cab === mesh.userData.cabin && g1 !== g0 && cab.geometry === g1);
  check('sync: lod 1 heeft minder driehoeken', triangles(g1) < tri0, `${tri0} -> ${triangles(g1)}`);
  check('sync: naam en tekenwijze blijven', cab.name === 'cabine' && cab.renderOrder === 11 && cab.userData.noBatch === true);
  // dezelfde auto op een andere plek in de file: dezelfde gedeelde geometrie per niveau
  const v2 = new Vehicle(0, 0, 0, { ...model });
  const mesh2 = buildVehicleMesh(v2);
  C.syncCabins({ vehicles: [v2] }, new Map([[v2.id, mesh2]]), C.CABIN_LOD_R[0], 0);
  check('sync: lod 1-geometrie gedeeld tussen twee auto\'s', mesh2.userData.cabin && mesh2.userData.cabin.geometry === g1);
  C.syncCabins(world, meshes, C.CABIN_LOD_R[1], 0);
  check('sync: op de tweede drempel lod 2', mesh.userData.cabinLod === 2, String(mesh.userData.cabinLod));
  const g2 = cab.geometry;
  check('sync: lod 2 heeft minder driehoeken dan lod 1', triangles(g2) < triangles(g1), `${triangles(g1)} -> ${triangles(g2)}`);
  C.syncCabins({ vehicles: [v2] }, new Map([[v2.id, mesh2]]), C.CABIN_LOD_R[1], 0);
  check('sync: lod 2-geometrie gedeeld tussen twee auto\'s', mesh2.userData.cabin && mesh2.userData.cabin.geometry === g2);
  // de afstand is Chebyshev: 50 m opzij telt net zo zwaar als 50 m vooruit
  C.syncCabins(world, meshes, 0, C.CABIN_LOD_R[1]);
  check('sync: Chebyshev-afstand op zij', mesh.userData.cabinLod === 2, String(mesh.userData.cabinLod));
  C.syncCabins(world, meshes, C.CABIN_LOD_R[2], 0);
  check('sync: verborgen voorbij de verste grens', !cab.visible, `op ${C.CABIN_LOD_R[2]} m`);
  C.syncCabins(world, meshes, C.CABIN_LOD_R[2] - 1, 0);
  check('sync: vlak binnen de verste grens weer zichtbaar op lod 2', cab.visible && mesh.userData.cabinLod === 2);
  C.syncCabins(world, meshes, 0, 0);
  check('sync: terug naar lod 0 hergebruikt de eerste geometrie', mesh.userData.cabinLod === 0 && cab.geometry === g0);
  // NaN-positie: geen crash en geen zichtbare cabine (de verhaaltest faalt op NaN)
  const ox = v.x;
  v.x = NaN;
  C.syncCabins(world, meshes, 0, 0);
  check('sync: NaN-positie verbergt de cabine', !cab.visible);
  v.x = ox;
}

// Bouwbudget (#833): een rij geparkeerde auto's bouwt per aanroep hooguit CABIN_BUILD_BUDGET nieuwe geometrieën;
// de rest blijft die ene frame verborgen en komt in de volgende aanroep aan de beurt.
{
  const cars = [];
  for (let i = 0; i < 5; i++) {
    const v = new Vehicle(0, 0, 0, { name: 'budgetcar', len: 4.1 + i * 0.01, wid: 1.8, color: '#6a707a' });
    const mesh = buildVehicleMesh(v);
    cars.push({ v, mesh });
  }
  const world = { vehicles: cars.map((c) => c.v) };
  const meshes = new Map(cars.map((c) => [c.v.id, c.mesh]));
  const built = () => cars.filter((c) => c.mesh.userData.cabin && c.mesh.userData.cabin.visible).length;
  C.syncCabins(world, meshes, 0, 0);
  check('budget: eerste aanroep bouwt er precies 3', built() === 3, String(built()));
  // bewust één frame verborgen: wie nog niet gebouwd is krijgt pas in de volgende aanroep een mesh, zodat
  // een rij geparkeerde auto's nooit in één frame alles bouwt (#833). Dat is geen fout, maar het gedrag.
  check('budget: de twee die nog niet gebouwd zijn tekenen die frame niets', cars.filter((c) => !c.mesh.userData.cabin || !c.mesh.userData.cabin.visible).length === 2, String(cars.filter((c) => !c.mesh.userData.cabin || !c.mesh.userData.cabin.visible).length));
  C.syncCabins(world, meshes, 0, 0);
  check('budget: volgende aanroep bouwt de rest', built() === 5, String(built()));
  const geos = new Set(cars.map((c) => c.mesh.userData.cabin.geometry));
  check('budget: elke aparte maat heeft eigen gedeelde geometrie', geos.size === 5, String(geos.size));
}

// Meetrapport (#833): driehoeken per niveau, bouwtijd van de eerste geometrie per niveau en de som van de drie
// niveaus. De eerste bouw van lod 0 is koud (Three.js en de JIT moeten nog opwarmen); daarom staat er ook een
// gemiddelde over alle voertuigen bij.
console.log('cabin LOD-metingen (driehoeken per niveau; eerste bouw in ms):');
for (const r of rows) console.log(`  ${r.name.padEnd(10)} ${String(r.tri[0]).padStart(4)} > ${String(r.tri[1]).padStart(4)} > ${String(r.tri[2]).padStart(4)}  som ${String(r.tri[0] + r.tri[1] + r.tri[2]).padStart(4)}  ${r.ms.map((m) => m.toFixed(3) + ' ms').join(' | ')}`);
const avg = (lod) => rows.reduce((n, r) => n + r.ms[lod], 0) / rows.length;
const sumTri = rows.reduce((n, r) => n + r.tri[0] + r.tri[1] + r.tri[2], 0);
console.log(`  eerste bouw per niveau: lod0 ${firstBuild[0].toFixed(3)} ms, lod1 ${firstBuild[1].toFixed(3)} ms, lod2 ${firstBuild[2].toFixed(3)} ms, som ${(firstBuild[0] + firstBuild[1] + firstBuild[2]).toFixed(3)} ms (${builds} geometrieën)`);
console.log(`  gemiddeld over ${rows.length} voertuigen: lod0 ${avg(0).toFixed(3)} ms, lod1 ${avg(1).toFixed(3)} ms, lod2 ${avg(2).toFixed(3)} ms; ${sumTri} driehoeken voor alle drie de niveau's samen`);
const worst1 = Math.max(...rows.map((r) => r.tri[1] / r.tri[0]));
const worst2 = Math.max(...rows.map((r) => r.tri[2] / r.tri[0]));
console.log(`  slechtste verhouding: lod1 ${(100 * (1 - worst1)).toFixed(1)}% minder, lod2 ${(100 * (1 - worst2)).toFixed(1)}% minder`);

// een gewone personenauto heeft een zichtbaar interieur (#442): de cabine hangt aan de echte raamlijn
// en het echte dak, met onderdelen boven de raamlijn (stuur, binnenspiegel, dakhemel) zodat je hem
// van buiten door de ruiten en door een open portier gevuld ziet
for (const name of ['hatch', 'sedan', 'wagon', 'sport', 'van']) {
  const model = models.get(name);
  if (!model) continue;
  const v = new Vehicle(0, 0, 0, { ...model });
  const romp = carBodyFit(v);
  check(name + ': romp bekend', !!romp);
  if (!romp) continue;
  const g = C.buildCabinGeometry(vehicleSeat(v, true), v.model.len, v.model.wid, interiorKlasse(v), romp);
  g.computeBoundingBox();
  const b = g.boundingBox;
  check(name + ': interieur boven de raamlijn', b.max.y > romp.belt + 0.02, `max y ${b.max.y.toFixed(2)} raamlijn ${romp.belt}`);
  check(name + ': interieur onder het echte dak', b.max.y < romp.roof, `max y ${b.max.y.toFixed(2)} dak ${romp.roof}`);
}

// De taxi en de politieauto hebben een ingerichte passagiersruimte (#442): meer onderdelen dan dezelfde auto
// zonder die klasse (taxameter, betaalautomaat en scheidingsruit; kooi, mobilofoon en stopbord), en alles
// binnen de carrosserie en onder het echte dak, zodat je het van buiten door de ruiten ziet.
for (const [naam, model, flags] of [['taxi', { name: 'taxi', len: 4.6, wid: 1.8 }, {}], ['politie', { name: 'sedan', len: 4.3, wid: 1.8 }, { isPolice: true }]]) {
  const v = Object.assign(new Vehicle(0, 0, 0, model), flags);
  const romp = carBodyFit(v);
  check(naam + ': romp bekend', !!romp);
  if (!romp) continue;
  const seat = vehicleSeat(v, true);
  const g = C.buildCabinGeometry(seat, v.model.len, v.model.wid, interiorKlasse(v), romp);
  const gewoon = C.buildCabinGeometry(seat, v.model.len, v.model.wid, 'auto', romp);
  g.computeBoundingBox();
  const b = g.boundingBox;
  check(naam + ': rijker ingericht dan een gewone auto', g.attributes.position.count >= gewoon.attributes.position.count + 100, `${g.attributes.position.count} tegen ${gewoon.attributes.position.count}`);
  check(naam + ': onder het echte dak', b.max.y < romp.roof, `max y ${b.max.y.toFixed(2)} dak ${romp.roof}`);
  check(naam + ': binnen de carrosserie', b.min.x >= -v.model.len / 2 - 0.05 && b.max.x <= v.model.len / 2 + 0.05 && b.min.z >= -v.model.wid / 2 && b.max.z <= v.model.wid / 2, `x ${b.min.x.toFixed(2)}..${b.max.x.toFixed(2)} z ${b.min.z.toFixed(2)}..${b.max.z.toFixed(2)}`);
  // op afstand vallen de klasse-extra's weg: lod 1 is dan niet rijker dan een gewone auto van dezelfde maat
  check(naam + ': lod 1 zonder klasse-extra\'s', triangles(C.buildCabinGeometry(seat, v.model.len, v.model.wid, interiorKlasse(v), romp, 1)) === triangles(C.buildCabinGeometry(seat, v.model.len, v.model.wid, 'auto', romp, 1)));
}

// geen cabine voor bus, fiets en boot; een wrak krijgt zijn eigen wrakvariant (#847)
const bus = Object.assign(new Vehicle(0, 0, 0, { ...models.get('bus') }), {});
check('bus: geen cabine', !C.wantsCabin(bus));
const fiets = Object.assign(new Vehicle(0, 0, 0, models.get('bike')), { isBike: true });
check('fiets: geen cabine', !C.wantsCabin(fiets));
const wrak = Object.assign(new Vehicle(0, 0, 0, models.get('sedan')), { wrecked: true });
check('wrak: wel een cabine (de wrakvariant)', C.wantsCabin(wrak));
check('wrak: de normale cabine niet', !C.wantsNormalCabin(wrak) && C.wantsWreckCabin(wrak));

// --- de wrakvariant (#847) ---------------------------------------------------------------
// Een wrak krijgt een eigen, gedeelde geometrie (verkoold, scheve stoelen, scheef dashboard) en
// het glas van dat ene voertuig wordt opengezet, zodat je erdoor naar binnen kijkt. De gewone
// cabine wordt nooit getoond; bij een reparatie komt het glas terug en wisselt de geometrie terug.
{
  const model = models.get('sedan') || models.get('hatch');
  const v = Object.assign(new Vehicle(0, 0, 0, { ...model }), { wrecked: true });
  const mesh = buildVehicleMesh(v);
  const glasmateriaal = () => mesh.userData.body.material[1];
  check('wrak: het glas is dicht voordat de wrakcabine bestaat', glasmateriaal().transparent !== true);
  C.syncCabins({ vehicles: [v] }, new Map([[v.id, mesh]]), 0, 0);
  const cab = mesh.userData.cabin;
  check('wrak: cabine gebouwd en zichtbaar', !!cab && cab.visible);
  if (!cab) { console.log(bad ? `${bad} mislukt` : 'cabin_test: ok'); process.exit(1); }
  check('wrak: mesh kent de wrakstand', mesh.userData.cabinWreck === true && mesh.userData.cabinLod === 0);
  const gw = cab.geometry;
  check('wrak: eindige wrakgeometrie', finite(gw));
  check('wrak: binnen de carrosserie', insideBody(gw, model.len, model.wid), span(gw, model.len, model.wid));
  check('wrak: één groep en gedeeld', gw.userData.shared === true && gw.groups.length === 1);
  check('wrak: geen schaduwkosten', cab.castShadow === false);
  check('wrak: het glas is opengezet (doorzichtig, geen diepte)', glasmateriaal().transparent === true && glasmateriaal().opacity <= 0.2 && glasmateriaal().depthWrite === false);
  // roetzwarte kleuren: alle vertexkleuren blijven donker
  {
    const col = gw.attributes.color.array;
    let max = 0;
    for (let i = 0; i < col.length; i++) if (col[i] > max) max = col[i];
    check('wrak: verkoold kleurgebruik (geen felle kleuren)', max <= 150, String(max));
  }
  // de wrakgeometrie is niet de gewone cabine
  const seat = vehicleSeat(v, true);
  const romp = carBodyFit({ ...v, wrecked: false });
  const normaal = C.buildCabinGeometry(seat, model.len, model.wid, interiorKlasse(v), romp, 0, { naam: model.name });
  check('wrak: eigen geometrie, niet de gewone cabine', triangles(gw) !== triangles(normaal), `${triangles(gw)} tegen ${triangles(normaal)}`);
  // de drie wrakniveaus: strikt aflopend, eindig, binnen de carrosserie en gedeeld
  const wrakTri = [];
  for (let lod = 0; lod < 3; lod++) {
    const g = C.buildWreckCabinGeometry(seat, model.len, model.wid, interiorKlasse(v), romp, lod, { naam: model.name });
    wrakTri.push(triangles(g));
    check(`wrak: lod ${lod} eindig`, finite(g));
    check(`wrak: lod ${lod} binnen de carrosserie`, insideBody(g, model.len, model.wid), span(g, model.len, model.wid));
    check(`wrak: lod ${lod} één groep en gedeeld`, g.userData.shared === true && g.groups.length === 1);
  }
  check(`wrak: driehoeken lopen strikt af (${wrakTri.join(' > ')})`, wrakTri[0] > wrakTri[1] && wrakTri[1] > wrakTri[2], wrakTri.join(' > '));
  // een tweede wrak van dezelfde soort en maat deelt de geometrie
  const v2 = Object.assign(new Vehicle(0, 0, 0, { ...model }), { wrecked: true });
  const mesh2 = buildVehicleMesh(v2);
  C.syncCabins({ vehicles: [v2] }, new Map([[v2.id, mesh2]]), 0, 0);
  check('wrak: geometrie gedeeld met een tweede wrak', mesh2.userData.cabin && mesh2.userData.cabin.geometry === gw);
  // de afstandstrap wisselt ook de wrakgeometrie
  const world = { vehicles: [v] };
  const meshes = new Map([[v.id, mesh]]);
  C.syncCabins(world, meshes, C.CABIN_LOD_R[0], 0);
  check('wrak: op de eerste drempel lod 1', mesh.userData.cabinLod === 1 && triangles(cab.geometry) === wrakTri[1], String(mesh.userData.cabinLod));
  C.syncCabins(world, meshes, C.CABIN_LOD_R[2], 0);
  check('wrak: verborgen voorbij de verste grens', !cab.visible);
  C.syncCabins(world, meshes, 0, 0);
  check('wrak: terug op lod 0 met dezelfde geometrie', mesh.userData.cabinLod === 0 && cab.geometry === gw);
  // een reparatie: de gewone cabine komt terug en het glas gaat weer dicht
  v.wrecked = false;
  C.syncCabins(world, meshes, 0, 0);
  check('reparatie: de gewone cabine terug', mesh.userData.cabinWreck === false && cab.geometry !== gw && cab.visible);
  check('reparatie: het glas weer dicht', glasmateriaal().transparent !== true && glasmateriaal().opacity !== 0.14);
  // het bouwbudget geldt ook voor wrakken: een rij van vier verschillende wrakken bouwt er per aanroep hooguit drie
  {
    const autos = [];
    for (let i = 0; i < 4; i++) {
      const w = Object.assign(new Vehicle(0, 0, 0, { name: 'wrak' + i, len: 4.0 + i * 0.11, wid: 1.8, color: '#6a707a' }), { wrecked: true });
      autos.push({ v: w, mesh: buildVehicleMesh(w) });
    }
    const wworld = { vehicles: autos.map((c) => c.v) };
    const wmeshes = new Map(autos.map((c) => [c.v.id, c.mesh]));
    const zichtbaar = () => autos.filter((c) => c.mesh.userData.cabin && c.mesh.userData.cabin.visible).length;
    C.syncCabins(wworld, wmeshes, 0, 0);
    check('wrak-budget: eerste aanroep bouwt er precies 3', zichtbaar() === 3, String(zichtbaar()));
    C.syncCabins(wworld, wmeshes, 0, 0);
    check('wrak-budget: volgende aanroep bouwt de rest', zichtbaar() === 4, String(zichtbaar()));
  }
}
console.log(bad ? `${bad} mislukt` : `cabin_test: ok (${cases.length} voertuigen)`);
process.exit(bad ? 1 : 0);
