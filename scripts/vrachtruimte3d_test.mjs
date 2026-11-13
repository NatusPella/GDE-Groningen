// De 3D-kant van de laadruimtes (#847): vrachtruimte3d.js bouwt per (soort, maat, detailniveau) één
// gedeelde geometrie en hangt per voertuig één mesh aan de body die alleen van geometrie wisselt.
// Deze test bouwt in Node de echte voertuigmeshes (three via node3d.mjs) en controleert de LOD-trap,
// de gedeelde geometrie en materialen, het bouwbudget, de zichtbaarheid bij open/losse deur en bij een
// wrak, verbergen bij dichte deuren en voorbij de verste straal, en dat niets buiten de romp steekt.
//   node scripts/vrachtruimte3d_test.mjs   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';
const THREE = await import('three');
await import('../game/js/player.js');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { Vehicle } = await import('../game/js/vehicle.js');
const V = await import('../game/js/vrachtruimte.js');
const V3 = await import('../game/js/vrachtruimte3d.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const tri = (g) => g.attributes.position.count / 3;
const finite = (g) => {
  const p = g.attributes.position;
  for (let i = 0; i < p.array.length; i++) if (!Number.isFinite(p.array[i])) return false;
  return true;
};
const rond = (n) => +n.toFixed(2);

const world = { vehicles: [], player: { x: 0, y: 0 } };
const root = new THREE.Group();
const maak = (model, { open = [], loose = [], flags = {} } = {}) => {
  const v = new Vehicle(0, 0, 0, model);
  Object.assign(v, flags);
  v.doors = { open: {}, loose: {} };
  for (const id of open) v.doors.open[id] = 1;
  for (const id of loose) v.doors.loose[id] = true;
  const mesh = buildVehicleMesh(v);
  root.add(mesh);
  world.vehicles.push(v);
  return { v, mesh };
};

// De voertuigen die een laadruimte hebben, met de deur die hem opent (of niets bij de foodtruck).
const GEVALLEN = [
  ['bestelbus', { name: 'van', len: 5.0, wid: 2.0, color: '#d9d9d9' }, ['klep'], 'klep'],
  ['bestelbus-schuif', { name: 'van', len: 5.4, wid: 2.1, color: '#c9541e' }, ['sl'], 'sl'],
  ['ambulance', { name: 'ambulance', len: 6.0, wid: 2.0, color: '#f1d21c' }, ['klep'], 'klep', { isAmbulance: true }],
  ['foodtruck', { name: 'foodtruck', len: 5.4, wid: 2.1, color: '#2f6fb0' }, [], 'luik', {}],
  ['vrachtwagen', { name: 'truck', len: 8.5, wid: 2.5, color: '#e8e6e0' }, [V.VIRTUELE_LAADDEUR], 'laaddeur'],
  ['cashvan', { name: 'cashvan', len: 5.2, wid: 2.0, color: '#1f4f33' }, [V.VIRTUELE_LAADDEUR], 'laaddeur'],
  ['hatch', { name: 'hatch', len: 3.8, wid: 1.7, color: '#c7c9cc' }, ['klep'], 'klep'],
  ['sedan', { name: 'sedan', len: 4.3, wid: 1.8, color: '#4a4d52' }, ['klep'], 'klep'],
  ['wagon', { name: 'wagon', len: 4.5, wid: 1.8, color: '#2e4a34' }, ['klep'], 'klep'],
  ['suv', { name: 'suv', len: 4.7, wid: 1.95, color: '#2f6f4a' }, ['klep'], 'klep'],
  ['politie', { name: 'police', len: 4.3, wid: 1.8, color: '#1c1c1c' }, ['klep'], 'klep', { isPolice: true }],
];

const rijen = [];
for (const [naam, model, open, gatId, flags = {}] of GEVALLEN) {
  const { v, mesh } = maak(model, { open, flags });
  V3.syncVrachtruimtes(world);
  const cargo = mesh.userData.vrachtruimte;
  check(`${naam}: laadruimte-mesh aangemaakt`, !!cargo, 'geen mesh');
  if (!cargo) continue;
  check(`${naam}: één mesh met de juiste naam`, cargo.name === 'vrachtruimte' && mesh.userData.vrachtruimte === cargo);
  check(`${naam}: geen schaduwkosten`, cargo.castShadow === false && cargo.receiveShadow === false);
  check(`${naam}: na de cabine (renderOrder 12)`, cargo.renderOrder === 12);
  check(`${naam}: niet in de batch`, cargo.userData.noBatch === true);
  check(`${naam}: aan de body gehangen`, cargo.parent === (mesh.userData.body || mesh));
  const m = V.vrachtruimteIndeling(v).maten;
  const romp = V.vrachtruimteIndeling(v).romp;
  let g0 = cargo.geometry;
  check(`${naam}: dichtbij LOD0`, mesh.userData.vrachtruimteLod === 0 && cargo.visible, String(mesh.userData.vrachtruimteLod));
  check(`${naam}: gedeelde geometrie`, g0.userData.shared === true);
  check(`${naam}: eindige posities`, finite(g0));
  const groepen = g0.groups.length;
  check(`${naam}: masker + gat + lading in één geometrie`, groepen === 3, `groepen ${groepen}`);
  if (groepen === 3) {
    const masker = g0.groups.find((q) => q.materialIndex === 0);
    const gat = g0.groups.find((q) => q.materialIndex === 1);
    check(`${naam}: masker van 2 driehoeken`, !!masker && masker.count === 6, masker ? String(masker.count) : 'geen masker');
    check(`${naam}: gat van 2 driehoeken`, !!gat && gat.count === 6, gat ? String(gat.count) : 'geen gat');
  }
  const mat = cargo.material;
  check(`${naam}: gedeeld ladingmateriaal met vertexkleuren`, Array.isArray(mat) && mat[2].isMeshLambertMaterial === true && mat[2].vertexColors === true && mat[2].userData.shared === true);
  check(`${naam}: masker- en gatmateriaal gedeeld`, Array.isArray(mat) && mat[0].userData.shared === true && mat[1].userData.shared === true);
  // de tekenafspraak van de opening: masker (gewone dieptetest) zet stencil 2, gat en lading tekenen
  // alleen binnen dat masker en de lading staat van achter naar voren gesorteerd (schilder-volgorde),
  // zodat de lading achter het plaatwerk tevoorschijn komt zonder door de dichte carrosserie te schijnen.
  if (Array.isArray(mat) && mat[0] && mat[1] && mat[2]) {
    check(`${naam}: masker zet stencil 2`, mat[0].stencilWrite === true && mat[0].stencilRef === 2 && mat[0].colorWrite === false && mat[0].depthTest === true);
    check(`${naam}: gat binnen het masker`, mat[1].stencilWrite === true && mat[1].stencilRef === 2 && mat[1].depthTest === false);
    check(`${naam}: lading binnen het masker zonder dieptetest`, mat[2].stencilWrite === true && mat[2].stencilRef === 2 && mat[2].depthTest === false && mat[2].depthWrite === false);
    check(`${naam}: masker vóór gat vóór lading (materiaal-id)`, mat[0].id < mat[1].id && mat[1].id < mat[2].id, `${mat[0].id} < ${mat[1].id} < ${mat[2].id}`);
    check(`${naam}: lading is enkelzijdig`, mat[2].side === THREE.FrontSide, String(mat[2].side));
  }
  // het gat ligt net buiten het plaatwerk: bij een achterklep achter de achterwand, bij een
  // kofferdeksel boven het deksel (zodat de diepte-truc daar werkt)
  g0.computeBoundingBox();
  const bbGat = g0.boundingBox;
  if (naam === 'bestelbus' || naam === 'ambulance' || naam === 'vrachtwagen' || naam === 'cashvan') {
    check(`${naam}: gat achter de achterwand`, bbGat.min.x <= -model.len / 2 - 0.01, `min x ${rond(bbGat.min.x)} bij halve lengte ${model.len / 2}`);
  }
  if (naam === 'hatch') {
    // hatchback: de opening zit in de achterwand (de hele achterklep), niet horizontaal op het deksel
    check('hatch: opening in de achterwand', bbGat.min.x <= -model.len / 2 - 0.01, `min x ${rond(bbGat.min.x)}`);
  } else if (naam === 'sedan') {
    check(`${naam}: gat boven het kofferdeksel`, bbGat.max.y > V.vrachtruimteIndeling(v).maten.ceil + 0.02, `max y ${rond(bbGat.max.y)}`);
  }
  // binnen de romp: de lading (inclusief de gaten net buiten het plaatwerk) blijft binnen het model
  g0.computeBoundingBox();
  const bb = g0.boundingBox;
  const xOk = bb.min.x >= -romp.halveLengte - 0.06 && bb.max.x <= romp.halveLengte + 0.06;
  const zOk = bb.min.z >= -romp.halveBreedte - 0.06 && bb.max.z <= romp.halveBreedte + 0.06;
  const yOk = bb.min.y >= 0.05 && bb.max.y <= romp.hoogte + 0.08;
  check(`${naam}: niets buiten de romp`, xOk && zOk && yOk, `x ${rond(bb.min.x)}..${rond(bb.max.x)} y ${rond(bb.min.y)}..${rond(bb.max.y)} z ${rond(bb.min.z)}..${rond(bb.max.z)} (romp ${rond(romp.halveLengte)} x ${rond(romp.halveBreedte)} x ${romp.hoogte})`);
  // de lading blijft boven de bodem (geen z-fighting met de vloer van de carrosserie)
  check(`${naam}: lading boven de bodem`, bb.min.y > m.floor - 0.12, `${rond(bb.min.y)} vs vloer ${m.floor}`);

  const t0 = performance.now();
  const tri0 = tri(g0);
  // LOD-trap: op de drempels een andere, kleinere geometrie op dezelfde mesh
  world.player.x = V3.VRACHT_LOD_R[0];
  V3.syncVrachtruimtes(world);
  check(`${naam}: op de eerste drempel LOD1`, mesh.userData.vrachtruimteLod === 1, String(mesh.userData.vrachtruimteLod));
  const g1 = cargo.geometry;
  check(`${naam}: wisselt van geometrie, niet van mesh`, g1 !== g0 && cargo === mesh.userData.vrachtruimte);
  check(`${naam}: LOD1 kleiner dan LOD0`, tri(g1) < tri0, `${tri0} -> ${tri(g1)}`);
  check(`${naam}: LOD1-gat blijft`, g1.groups.length === 3, `groepen ${g1.groups.length}`);
  world.player.x = V3.VRACHT_LOD_R[1];
  V3.syncVrachtruimtes(world);
  check(`${naam}: op de tweede drempel LOD2`, mesh.userData.vrachtruimteLod === 2, String(mesh.userData.vrachtruimteLod));
  const g2 = cargo.geometry;
  check(`${naam}: LOD2 kleiner dan LOD1`, tri(g2) < tri(g1), `${tri(g1)} -> ${tri(g2)}`);
  world.player.x = V3.VRACHT_LOD_R[2];
  V3.syncVrachtruimtes(world);
  check(`${naam}: verborgen voorbij de verste straal`, cargo.visible === false, `op ${V3.VRACHT_LOD_R[2]} m`);
  world.player.x = V3.VRACHT_LOD_R[2] - 1;
  V3.syncVrachtruimtes(world);
  check(`${naam}: vlak binnen de verste straal weer zichtbaar`, cargo.visible === true && mesh.userData.vrachtruimteLod === 2);
  world.player.x = 0;
  V3.syncVrachtruimtes(world);
  check(`${naam}: terug naar LOD0 hergebruikt de eerste geometrie`, cargo.geometry === g0);
  // de gedeelde geometrie per niveau: een tweede voertuig van hetzelfde model op dezelfde stand
  const tweede = maak(model, { open, flags });
  world.player.x = 0;
  V3.syncVrachtruimtes(world);
  const cargo2 = tweede.mesh.userData.vrachtruimte;
  check(`${naam}: geometrie gedeeld met een tweede voertuig`, !!cargo2 && cargo2.geometry === g0);
  check(`${naam}: materiaal gedeeld met een tweede voertuig`, !!cargo2 && cargo2.material === cargo.material);
  // dichte deuren (en geen wrak): de laadruimte hoort verborgen te zijn, behalve bij de foodtruck
  // (het luik is een vaste opening in het model en staat altijd open)
  const dicht = maak(model, { flags });
  V3.syncVrachtruimtes(world);
  const cargoDicht = dicht.mesh.userData.vrachtruimte;
  if (naam === 'foodtruck') check('foodtruck: vaste opening blijft zichtbaar bij dichte deuren', !!cargoDicht && cargoDicht.visible === true);
  else check(`${naam}: dichte deuren verbergen de laadruimte`, !cargoDicht || cargoDicht.visible === false);
  rijen.push({ naam, gatId, tri: [tri0, tri(g1), tri(g2)], ms: performance.now() - t0 });
}

// --- losse deur, wrak en de kapot-variant ---------------------------------------------------
{
  const model = { name: 'van', len: 6.2, wid: 2.2, color: '#e8e6e0' }; // een maat die nog niet in de cache zit
  const los = maak(model, { loose: ['klep'] });
  V3.syncVrachtruimtes(world);
  check('losse deur: laadruimte zichtbaar', los.mesh.userData.vrachtruimte && los.mesh.userData.vrachtruimte.visible === true);
  const gLos = los.mesh.userData.vrachtruimte.geometry;
  check('losse deur: opening in de geometrie', gLos.groups.length === 3, `groepen ${gLos.groups.length}`);
  // een wrak met dichte deuren toont de kapotte lading (en bouwt een eigen, gedeelde variant)
  const wrak = maak(model, { flags: { wrecked: true } });
  V3.syncVrachtruimtes(world);
  const cargoWrak = wrak.mesh.userData.vrachtruimte;
  check('wrak: laadruimte zichtbaar', !!cargoWrak && cargoWrak.visible === true);
  check('wrak: kapot-variant gemarkeerd', wrak.mesh.userData.vrachtruimteKapot === true);
  check('wrak: andere geometrie dan heel', !!cargoWrak && cargoWrak.geometry !== gLos);
  check('wrak: geen gat bij dichte deuren', !!cargoWrak && cargoWrak.geometry.groups.length === 1, cargoWrak ? String(cargoWrak.geometry.groups.length) : '');
  check('wrak: kapotte lading is groter dan de hele', !!cargoWrak && tri(cargoWrak.geometry) > tri(gLos), cargoWrak ? `${tri(gLos)} -> ${tri(cargoWrak.geometry)}` : '');
  cargoWrak.geometry.computeBoundingBox();
  const bb = cargoWrak.geometry.boundingBox;
  check('wrak: kapotte lading blijft binnen de romp', bb.min.x > -model.len / 2 && bb.max.x < model.len / 2 && bb.min.z > -model.wid / 2 && bb.max.z < model.wid / 2);
  // een tweede wrak deelt de kapotte geometrie (per maat)
  const wrak2 = maak(model, { flags: { wrecked: true } });
  V3.syncVrachtruimtes(world);
  check('wrak: kapotte geometrie gedeeld', !!wrak2.mesh.userData.vrachtruimte && wrak2.mesh.userData.vrachtruimte.geometry === cargoWrak.geometry);
}

// --- bouwbudget: een rij busjes bouwt per tick hooguit VRACHT_BUILD_BUDGET geometrieën ----------
{
  world.vehicles.length = 0;
  world.player.x = 0;
  const rij = [];
  for (let i = 0; i < 5; i++) {
    const model = { name: 'van', len: 4.2 + i * 0.1, wid: 2.0, color: '#d9d9d9' };
    rij.push(maak(model, { open: ['klep'] }));
  }
  const zichtbaar = () => rij.filter((r) => r.mesh.userData.vrachtruimte && r.mesh.userData.vrachtruimte.visible).length;
  V3.syncVrachtruimtes(world);
  check('budget: eerste aanroep bouwt er precies 2', zichtbaar() === 2, String(zichtbaar()));
  V3.syncVrachtruimtes(world);
  check('budget: tweede aanroep bouwt de volgende 2', zichtbaar() === 4, String(zichtbaar()));
  V3.syncVrachtruimtes(world);
  check('budget: derde aanroep bouwt de rest', zichtbaar() === 5, String(zichtbaar()));
  const geos = new Set(rij.map((r) => r.mesh.userData.vrachtruimte.geometry));
  check('budget: elke maat heeft een eigen gedeelde geometrie', geos.size === 5, String(geos.size));
}

// --- geen laadruimte voor voertuigen zonder bak, en geen crash zonder mesh -------------------
{
  world.vehicles.length = 0;
  world.player.x = 0;
  const tractor = maak({ name: 'tractor', len: 4.3, wid: 2.3, color: '#3f7d3a' });
  check('trekker: geen laadruimte-soort', V.vrachtruimteSoort(tractor.v) === null);
  V3.syncVrachtruimtes(world);
  check('trekker: geen laadruimte-mesh', !tractor.mesh.userData.vrachtruimte);
  // een voertuig waarvan de mesh (nog) niet bestaat: geen crash, niets gebouwd
  const { v: vZonderMesh } = maak({ name: 'van', len: 5.0, wid: 2.0, color: '#d9d9d9' }, { open: ['klep'] });
  root.remove(root.children.find((o) => o.userData && o.userData.vehicleId === vZonderMesh.id));
  V3.syncVrachtruimtes(world);
  check('zonder mesh: geen laadruimte en geen crash', getGeenCargo(vZonderMesh));
  function getGeenCargo(v) { return ![...root.children].some((o) => o.userData && o.userData.vehicleId === v.id && o.userData.vrachtruimte); }
  // NaN-positie: geen crash en niets zichtbaar
  world.vehicles.length = 0;
  const nan = maak({ name: 'van', len: 5.1, wid: 2.0, color: '#d9d9d9' }, { open: ['klep'] });
  V3.syncVrachtruimtes(world);
  const cargoNan = nan.mesh.userData.vrachtruimte;
  nan.v.x = NaN;
  V3.syncVrachtruimtes(world);
  check('NaN-positie: laadruimte verborgen', !!cargoNan && cargoNan.visible === false);
}

// --- de afstandstrap en de wereld-tick -----------------------------------------------------
{
  const R = V3.VRACHT_LOD_R;
  check('LOD: drie afstandsgrenzen', Array.isArray(R) && R.length === 3 && R[0] < R[1] && R[1] < R[2], JSON.stringify(R));
  check('LOD: VRACHT_R is de verste grens', V3.VRACHT_R === R[2], `${V3.VRACHT_R} tegen ${R[2]}`);
  const want = [[0, 0], [R[0] - 0.01, 0], [R[0], 1], [R[1] - 0.01, 1], [R[1], 2], [R[2] - 0.01, 2], [R[2], -1], [200, -1], [NaN, -1], [Infinity, -1]];
  for (const [afstand, lod] of want) check(`LOD: vrachtruimteLodAt(${afstand}) = ${lod}`, V3.vrachtruimteLodAt(afstand) === lod, String(V3.vrachtruimteLodAt(afstand)));
  check('tick: id en fase kloppen', V3.vrachtruimteKind.id === 'vrachtruimte' && V3.vrachtruimteKind.tickPhase === 'world' && typeof V3.vrachtruimteKind.tick === 'function');
  check('tick: de tick werkt op de wereld', (() => {
    world.player.x = 0;
    const t = world.vehicles.find((v) => v.model.name === 'van' && v.model.len === 5.1);
    if (!t) return false;
    t.wrecked = false;
    V3.vrachtruimteKind.tick(1 / 60, world);
    const mesh = [...root.children].find((o) => o.userData && o.userData.vehicleId === t.id);
    return !!mesh && !!mesh.userData.vrachtruimte;
  })());
}

// --- meting --------------------------------------------------------------------------------
console.log('vrachtruimte LOD-metingen (driehoeken per niveau, eerste keer LOD0 t/m 2 in ms):');
for (const r of rijen) console.log(`  ${r.naam.padEnd(15)} ${String(r.tri[0]).padStart(4)} > ${String(r.tri[1]).padStart(4)} > ${String(r.tri[2]).padStart(4)}   ${r.ms.toFixed(2)} ms`);
const gem = (i) => (rijen.reduce((n, r) => n + r.tri[i], 0) / rijen.length).toFixed(1);
console.log(`  gemiddeld: LOD0 ${gem(0)}, LOD1 ${gem(1)}, LOD2 ${gem(2)} driehoeken; ${rijen.length} voertuigsoorten`);
console.log(bad ? `${bad} mislukt` : `vrachtruimte3d_test: ok (${rijen.length} voertuigen)`);
process.exit(bad ? 1 : 0);
