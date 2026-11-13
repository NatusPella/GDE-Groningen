// Test van de LOD-interieurs van andere treinen (#847): de afstandstrap (twee niveaus en verbergen voorbij de verste
// straal), de gedeelde, eenvoudige geometrie per rijtuigtype en niveau, de open raambanden van de treinromp met
// doorzichtig glas en een donkere vuller, het bouwbudget per frame, en dat de bereden trein het volledige interieur
// houdt. De trein wordt hier synthetisch opgebouwd (dezelfde wagenbouw als railway3d.js), zonder wereld of scene.
//   node scripts/trein_lod_test.mjs
import './node3d.mjs';
const THREE = await import('three');
const R3 = await import('../game/js/railway3d.js');
const TI = await import('../game/js/treininterieur.js');
const TL = await import('../game/js/treinlayout.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const triangles = (g) => g.attributes.position.count / 3;
const finite = (g) => g.attributes.position.array.every(Number.isFinite);

// Dezelfde soorten als railway.js TRAIN_TYPES, hier los zodat de test geen wereld hoeft te laden.
const GTW = {
  label: 'Stoptrein', height: 3.75, doubleDeck: false, front: 'gtw',
  body: 0xf2f4f3, stripe: 0x00a3ad, door: 0x00a3ad, nose: 0x00a3ad, accent: 0x0b3b4f,
  segments: [{ len: 17.5, kind: 'car', cab: 1 }, { len: 4.6, kind: 'power' }, { len: 17.5, kind: 'car', cab: -1 }],
};
const VIRM = {
  label: 'Intercity', height: 4.7, doubleDeck: true, front: 'virm',
  body: 0xffc917, stripe: 0x003082, door: 0x003082, nose: 0xffc917, accent: 0xd52b1e,
  segments: [{ len: 26.5, kind: 'car', cab: 1 }, { len: 26.5, kind: 'car' }, { len: 26.5, kind: 'car' }, { len: 26.5, kind: 'car', cab: -1 }],
};
const TRAIN_HALF_WIDTH = 1.45;

// --- 1. de afstandstrap ------------------------------------------------------------------------
{
  const R = TI.TREIN_LOD_R;
  check('LOD: two distance levels', Array.isArray(R) && R.length === 2 && R[0] < R[1], JSON.stringify(R));
  check('LOD: the far radius hides the room', R[1] >= 100 && R[1] <= 200, String(R[1]));
  const want = [[0, 0], [R[0] - 0.01, 0], [R[0], 1], [R[1] - 0.01, 1], [R[1], -1], [250, -1], [NaN, -1], [Infinity, -1], [-1, -1]];
  for (const [d, lod] of want) check(`LOD: treinLodAt(${d}) = ${lod}`, TI.treinLodAt(d) === lod, String(TI.treinLodAt(d)));
  check('LOD: a build budget per frame of two', TI.TREIN_LOD_BUILD_BUDGET === 2, String(TI.TREIN_LOD_BUILD_BUDGET));
}

// --- 2. per rijtuigtype één gedeelde, eenvoudige geometrie per niveau --------------------------
const rows = [];
for (const [naam, cfg] of [['gtw', GTW], ['virm', VIRM]]) {
  const layout = TL.trainLayout(cfg);
  const band = TL.raamband(cfg);
  check(`${naam}: ramen in de romp (raamband)`, band.length >= 1 && band.every((b) => b.y0 > 0 && b.y1 > b.y0 && b.y1 < cfg.height), JSON.stringify(band));
  for (let i = 0; i < cfg.segments.length; i++) {
    const seg = cfg.segments[i], cl = layout[i];
    const g0 = TI.buildCarLodGeometry(cfg, seg, cl, 0);
    const g1 = TI.buildCarLodGeometry(cfg, seg, cl, 1);
    if (!cl || seg.kind !== 'car') {
      check(`${naam}: wagen ${i} (${seg.kind}) heeft geen salon-LOD`, triangles(g0) === 0 && triangles(g1) === 0);
      continue;
    }
    for (const [lod, g] of [[0, g0], [1, g1]]) {
      g.computeBoundingBox();
      const b = g.boundingBox;
      check(`${naam}: wagen ${i} lod ${lod} finite`, finite(g));
      check(`${naam}: wagen ${i} lod ${lod} binnen de wagen`, b.min.x >= -seg.len / 2 - 1e-3 && b.max.x <= seg.len / 2 + 1e-3 && Math.abs(b.min.z) <= TRAIN_HALF_WIDTH + 1e-3 && Math.abs(b.max.z) <= TRAIN_HALF_WIDTH + 1e-3 && b.min.y >= 0 && b.max.y <= cfg.height + 1e-3, JSON.stringify([b.min.toArray(), b.max.toArray()]));
      check(`${naam}: wagen ${i} lod ${lod} onverlicht (één groep)`, g.groups.length === 1);
    }
    const t0 = triangles(g0), t1 = triangles(g1);
    check(`${naam}: wagen ${i} lod 0 duurder dan lod 1 (${t0} > ${t1})`, t0 > t1 && t1 > 0);
    check(`${naam}: wagen ${i} lod 1 minstens 40% goedkoper`, t1 <= 0.6 * t0, `${t0} -> ${t1}`);
    if (i === 0) rows.push({ naam, seg: 'car', tri0: t0, tri1: t1 });
  }
}

// --- 3. de romp: open raamband, doorzichtig glas en een donkere vuller -------------------------
// De treinromp was een dichte doos met glasplaten erop (opaque GLASS_MAT); daar zag je geen interieur door. Nu zijn
// de raambanden open, met doorzichtig glas en een donkere vuller die verdwijnt zodra het LOD-interieur er is (#847).
for (const [naam, cfg] of [['gtw', GTW], ['virm', VIRM]]) {
  const seg = cfg.segments[0];
  const car = R3.buildCar(cfg, seg);
  const band = TL.raamband(cfg);
  const meshes = [];
  car.traverse((o) => { if (o.isMesh) meshes.push(o); });
  const filler = car.userData.interiorFiller;
  check(`${naam}: de romp heeft een donkere vuller`, !!filler && filler.parent === car && filler.material.color.getHex() === 0x26282c, filler && filler.material.color.getHexString());
  check(`${naam}: de vuller werpt geen schaduw`, !!filler && filler.castShadow === false);
  const glas = meshes.filter((m) => m.material && m.material.transparent === true);
  check(`${naam}: de raambanden zijn doorzichtig glas (één mesh)`, glas.length === 1 && glas[0].material.opacity < 0.6 && glas[0].material.depthWrite === false, `${glas.length} glasmeshes`);
  if (glas.length === 1) {
    glas[0].geometry.computeBoundingBox();
    const b = glas[0].geometry.boundingBox;
    check(`${naam}: het glas zit op de raambandhoogte`, b.min.y >= band[0].y0 - 0.02 && b.max.y <= band[band.length - 1].y1 + 0.02, `${b.min.y}..${b.max.y}`);
    check(`${naam}: het glas zit op de rompzijkanten`, Math.abs(b.min.z + TRAIN_HALF_WIDTH) < 0.1 && Math.abs(b.max.z - TRAIN_HALF_WIDTH) < 0.1, `${b.min.z}..${b.max.z}`);
  }
  // de livrei buiten de raamband is dicht; midden in de band is er geen dichte plaat meer (daar zit het glas)
  const layout0 = TL.trainLayout(cfg)[0];
  const xMid = 0;
  check(`${naam}: het meetpunt ligt niet op een deur`, layout0.doors.every((d) => Math.abs(d - xMid) > 1.5), JSON.stringify(layout0.doors));
  let dichtInBand = 0, dichtTussenBanden = 0;
  for (const m of meshes) {
    if (m === filler || (m.material && m.material.transparent)) continue;
    const pos = m.geometry.attributes.position;
    for (let t = 0; t < pos.count; t += 3) {
      const x = [pos.getX(t), pos.getX(t + 1), pos.getX(t + 2)];
      if (Math.max(...x) < xMid - 1 || Math.min(...x) > xMid + 1) continue;   // alleen het middendeel van de rompzijkant
      const cy = (pos.getY(t) + pos.getY(t + 1) + pos.getY(t + 2)) / 3;
      const cz = Math.abs((pos.getZ(t) + pos.getZ(t + 1) + pos.getZ(t + 2)) / 3);
      if (cz < TRAIN_HALF_WIDTH - 0.15) continue;
      if (band.some((b) => cy > b.y0 + 0.1 && cy < b.y1 - 0.1)) dichtInBand++;
      if (cfg.doubleDeck && cy > band[0].y1 + 0.1 && cy < band[1].y0 - 0.1) dichtTussenBanden++;
    }
  }
  check(`${naam}: midden in de raamband is de romp open`, dichtInBand === 0, `${dichtInBand} dichte driehoeken`);
  if (cfg.doubleDeck) check(`${naam}: tussen de twee raambanden is de romp dicht`, dichtTussenBanden > 0, String(dichtTussenBanden));
}

// --- 4. de sync: LOD-trap, budget, verbergen en de bereden trein -------------------------------
function maakTrein(cfg, posities) {
  const cars = cfg.segments.map((seg) => R3.buildCar(cfg, seg));
  const t = {
    cfg, halfLen: 30,
    cars: cfg.segments.map((seg, i) => ({ x: posities[i] || 0, y: 0, z: 0, angle: 0, pitch: 0, seg })),
  };
  const view = { group: new THREE.Group(), cars };
  return { t, view };
}
const fillerOf = (view, i) => view.cars[i].userData.interiorFiller;
const lodVan = (view, i) => TI.lodInterieurVan(view)[i];
const budget = () => ({ left: TI.TREIN_LOD_BUILD_BUDGET });

{
  // een stoptrein bij de speler: de twee rijtuigen (niet de tussenmodule) krijgen een LOD-interieur
  const { t, view } = maakTrein(GTW, [10, 22, 40]);
  const b = budget();
  TI.syncTreinLodInterieur(view, t, 0, 0, b);
  const lods = TI.lodInterieurVan(view);
  check('sync: een rijtuig in de buurt krijgt een LOD-interieur', !!lods[0] && !!lods[2], String(lods.map((m) => !!m)));
  check('sync: de tussenmodule krijgt er geen', lods[1] === null || lods[1] === undefined);
  check('sync: het LOD-interieur hangt aan de wagen (het rijdt mee)', lods[0].parent === view.cars[0]);
  check('sync: draw style', lods[0].name === 'treininterieur-lod' && lods[0].castShadow === false && lods[0].userData.noBatch === true && lods[0].userData.treinLod === true);
  check('sync: lod 0 geometrie', triangles(lods[0].geometry) === rows[0].tri0, `${triangles(lods[0].geometry)} tegen ${rows[0].tri0}`);
  check('sync: de donkere vuller is weg als het interieur er staat', fillerOf(view, 0).visible === false && fillerOf(view, 2).visible === false);
  check('sync: het budget is na twee rijtuigen op', b.left === 0, String(b.left));
  // een tweede stoptrein van hetzelfde type deelt de geometrie
  const tweede = maakTrein(GTW, [12, 24, 42]);
  TI.syncTreinLodInterieur(tweede.view, tweede.t, 0, 0, budget());
  check('sync: twee treinen van hetzelfde type delen de LOD-geometrie', TI.lodInterieurVan(tweede.view)[0].geometry === lods[0].geometry);
  check('sync: de geometrie is als gedeeld gemarkeerd', lods[0].geometry.userData.shared === true);
  // halfverwege: hetzelfde mesh, andere geometrie (lod 1)
  t.cars.forEach((c) => { c.x = 100; c.y = 0; });
  TI.syncTreinLodInterieur(view, t, 0, 0, budget());
  check('sync: 100 m is lod 1', TI.lodInterieurVan(view)[0].visible && triangles(TI.lodInterieurVan(view)[0].geometry) === rows[0].tri1, `${triangles(TI.lodInterieurVan(view)[0].geometry)} tegen ${rows[0].tri1}`);
  check('sync: hetzelfde mesh wisselt alleen van geometrie', TI.lodInterieurVan(view)[0] === lods[0]);
  // voorbij de verste straal: verborgen en de donkere vuller terug
  t.cars.forEach((c) => { c.x = TI.TREIN_LOD_R[1] + 1; c.y = 0; });
  TI.syncTreinLodInterieur(view, t, 0, 0, budget());
  check('sync: voorbij de verste straal is het interieur weg', TI.lodInterieurVan(view)[0].visible === false);
  check('sync: en dan is de donkere vuller weer in beeld', fillerOf(view, 0).visible === true);
  // chebyshev: 100 m opzij is net zo ver als 100 m vooruit
  t.cars.forEach((c) => { c.x = 0; c.y = 100; });
  TI.syncTreinLodInterieur(view, t, 0, 0, budget());
  check('sync: vierkante (Chebyshev) afstand opzij', TI.lodInterieurVan(view)[0].visible && triangles(TI.lodInterieurVan(view)[0].geometry) === rows[0].tri1);
  // een NaN-positie verbergt de wagen in plaats van te crashen
  t.cars.forEach((c) => { c.x = NaN; c.y = 0; });
  TI.syncTreinLodInterieur(view, t, 0, 0, budget());
  check('sync: een NaN-positie verbergt het interieur', TI.lodInterieurVan(view)[0].visible === false);
}

{
  // alleen dichtbij bouwen: ver weg wordt er niets gebouwd, ook al is er budget
  const { t, view } = maakTrein(VIRM, [200, 226, 253, 279]);
  const b = budget();
  TI.syncTreinLodInterieur(view, t, 0, 0, b);
  check('budget: ver weg wordt niets gebouwd', TI.lodInterieurVan(view).every((m) => !m), JSON.stringify(TI.lodInterieurVan(view).map((m) => !!m)));
  check('budget: het budget blijft dan vol', b.left === TI.TREIN_LOD_BUILD_BUDGET, String(b.left));
  // dichtbij: de vier rijtuigen komen over twee frames (budget 2), de laatste op lod 1 (79,5 m)
  const posities = [0, 26, 52, 79];
  t.cars.forEach((c, i) => { c.x = posities[i]; });
  const b2 = budget();
  TI.syncTreinLodInterieur(view, t, 0, 0, b2);
  const na1 = TI.lodInterieurVan(view).map((m) => !!m);
  // de twee middelste rijtuigen delen hun geometrie, dus de eerste aanroep toont er drie met twee geometrieën
  check('budget: de eerste aanroep bouwt twee geometrieën (en toont drie rijtuigen)', na1.filter(Boolean).length === 3 && b2.left === 0, `${JSON.stringify(na1)} budget ${b2.left}`);
  TI.syncTreinLodInterieur(view, t, 0, 0, budget());
  const na2 = TI.lodInterieurVan(view).map((m) => !!m);
  check('budget: de tweede aanroep het verste rijtuig (eigen type geometrie)', na2.every(Boolean), JSON.stringify(na2));
  const laatste = TI.lodInterieurVan(view)[3];
  check('budget: het verste rijtuig staat op lod 1 (goedkoper)', laatste.visible && triangles(laatste.geometry) === rows[1].tri1, `${triangles(laatste.geometry)} tegen ${rows[1].tri1}`);
  check('budget: de dichtbije rijtuigen staan op lod 0', triangles(TI.lodInterieurVan(view)[0].geometry) === rows[1].tri0);
}

{
  // de bereden trein houdt het volledige interieur: geen LOD-mesh, en de vuller blijft weg zolang de speler binnen is
  const { t, view } = maakTrein(GTW, [0, 22, 40]);
  TI.syncTreinLodInterieur(view, t, 0, 0, budget());     // eerst als gewone trein in de buurt
  check('trein: eerst een LOD-interieur', !!TI.lodInterieurVan(view)[0]);
  const world = { player: { x: 0, y: 0 }, trainDriving: t, trainCam: { inside: true }, trainWalk: { car: 0, lx: 0, lz: 0, yaw: 0 }, vehicles: [], coopFigures: {}, coopZitters: [] };
  TI.syncTreinInterieur(view, t, world, 1 / 60);        // de speler stapt in: het volledige interieur
  TI.hideTreinLodInterieur(view);
  check('trein: de bereden trein houdt het volledige interieur', TI.builtCount(view) >= 1, String(TI.builtCount(view)));
  check('trein: het LOD-interieur is weg', TI.lodInterieurVan(view)[0].visible === false);
  check('trein: de donkere vuller blijft weg binnen (de schil is verborgen)', fillerOf(view, 0).visible === false);
  check('trein: de wagen met het volledige interieur is zichtbaar', view.cars[0].children.some((c) => c.userData.interieur && c.visible));
}

// --- 5. metingen ------------------------------------------------------------------------------
const layoutGtw = TL.trainLayout(GTW);
const volGtw = triangles(TI.buildCarGeometry(GTW, GTW.segments[0], layoutGtw[0]));
const layoutVirm = TL.trainLayout(VIRM);
const volVirm = triangles(TI.buildCarGeometry(VIRM, VIRM.segments[0], layoutVirm[0]));
console.log('trein-LOD measurements (triangles per carriage; full interior of the driven train on the left):');
console.log(`  gtw  lod0 ${rows[0].tri0} > lod1 ${rows[0].tri1}   (volledig interieur: ${volGtw}, LOD0 is ${(100 * rows[0].tri0 / volGtw).toFixed(1)}%)`);
console.log(`  virm lod0 ${rows[1].tri0} > lod1 ${rows[1].tri1}   (volledig interieur: ${volVirm}, LOD0 is ${(100 * rows[1].tri0 / volVirm).toFixed(1)}%)`);
console.log(`  straal: lod 0 tot ${TI.TREIN_LOD_R[0]} m, lod 1 tot ${TI.TREIN_LOD_R[1]} m, daarna verborgen; budget ${TI.TREIN_LOD_BUILD_BUDGET} geometrieën per frame`);
console.log(`  draw calls per rijtuig met LOD: 1 (het interieur); zonder LOD: 0; de romp kost 2 meshes extra (doorzichtig glas + vuller)`);

console.log(bad ? `${bad} mislukt` : 'trein_lod_test: ok');
process.exit(bad ? 1 : 0);
