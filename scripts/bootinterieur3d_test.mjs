// Bootinterieurs in 3D (#847): bootinterieur3d.js bouwt de inrichting van de boten met een roef of stuurhut
// als één gedeelde geometrie per (soort, maat, niveau) op één mesh per boot. Deze test controleert in gewone
// node (three.js uit desktop/vendor-cache) de LOD-trap met strikt afnemende driehoeken, de gedeelde
// geometrie, het bouwbudget, het verbergen voorbij de verste straal, dat een open boot zonder roef niets
// krijgt, en het eigen-boot-detail aan/uit in eerste persoon. Ook meet hij de driehoeken en bouwtijden per
// niveau voor het verslag.
//   node scripts/bootinterieur3d_test.mjs   (een keer: cd desktop && npm run stage)
import './node3d.mjs';
const THREE = await import('three');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { Vehicle } = await import('../game/js/vehicle.js');
const { BOAT_KINDS } = await import('../game/js/boattypes.js');
const BI = await import('../game/js/bootinterieur.js');
const M3 = await import('../game/js/bootinterieur3d.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const triangles = (g) => g.attributes.position.count / 3;
const finite = (g) => {
  const p = g.attributes.position;
  for (let i = 0; i < p.array.length; i++) if (!Number.isFinite(p.array[i])) return false;
  return true;
};

// Een nep-boot voor de pure indeling, en een echte Vehicle + mesh voor de wereldtick.
function nepBoot(kind, extra = {}) {
  return { id: extra.id || 1, isBoat: true, model: { ...BOAT_KINDS[kind] }, ...extra };
}
function setup(kind, extra = {}) {
  const v = new Vehicle(0, 0, 0, { ...BOAT_KINDS[kind] });
  v.isBoat = true;
  if (extra.isPolice) v.isPolice = true;
  const mesh = buildVehicleMesh(v);          // dezelfde mesh die scene3d voor deze boot tekent
  const root = new THREE.Group();            // getVehicleMesh geeft alleen een mesh terug die in de scène hangt
  root.add(mesh);
  return { v, mesh, root, model: v.model };
}
const tick = (world) => M3.bootInterieurKind.tick(1 / 60, world);

// De soorten met een roef of stuurhut, met een label voor de meting. De politieboot is een sloep met roef.
const SOORTEN = [
  ['rondvaart', nepBoot('rondvaart')],
  ['slp-roef', { ...nepBoot('sloep'), isPolice: true }],
  ['spits', nepBoot('spits')],
  ['kempenaar', nepBoot('kempenaar')],
  ['zee-vracht', nepBoot('zeeVracht')],
  ['zee-container', nepBoot('zeeContainer')],
  ['zee-tanker', nepBoot('zeeTanker')],
  ['sleper', nepBoot('zeeSleper')],
  ['skutsje', nepBoot('skutsje')],
  ['zeilboot', nepBoot('zeilboot')],
];

// --- de afstandstrap: drie niveaus, grotere schepen verder zichtbaar ---------------------------
{
  const R = M3.BOOT_LOD_R;
  check('LOD: drie afstandsgrenzen', Array.isArray(R) && R.length === 3 && R[0] < R[1] && R[1] < R[2], JSON.stringify(R));
  check('LOD: de verste grens is 100 m', R[2] === 100, String(R[2]));
  check('LOD: kleine boot heeft maatfactor 1', M3.bootMaatFactor(5.5) === 1, String(M3.bootMaatFactor(5.5)));
  const groot = M3.bootMaatFactor(86);
  check('LOD: zeeschip heeft maatfactor 2,2', Math.abs(groot - 2.2) < 1e-9, String(groot));
  const smal = 5.5;
  const want = [[0, 0], [R[0] - 0.01, 0], [R[0], 1], [R[1] - 0.01, 1], [R[1], 2], [R[2] - 0.01, 2], [R[2], -1], [200, -1], [NaN, -1], [Infinity, -1], [-1, -1]];
  for (const [afstand, lod] of want) check(`LOD: bootLodAt(${afstand}, 5,5) = ${lod}`, M3.bootLodAt(afstand, smal) === lod, String(M3.bootLodAt(afstand, smal)));
  // dezelfde afstand, groter schip: verder zichtbaar (66/132/220 m in plaats van 30/60/100)
  check('LOD: zeeschip op 70 m is nog lod 1', M3.bootLodAt(70, 86) === 1, String(M3.bootLodAt(70, 86)));
  check('LOD: zeeschip op 150 m is nog lod 2', M3.bootLodAt(150, 86) === 2, String(M3.bootLodAt(150, 86)));
  check('LOD: sloep op 150 m is weg', M3.bootLodAt(150, 5.5) === -1, String(M3.bootLodAt(150, 5.5)));
  check('LOD: zeeschip op 221 m is weg', M3.bootLodAt(221, 86) === -1, String(M3.bootLodAt(221, 86)));
  check('LOD: zonder lengte rekent hij met 20 m', M3.bootLodAt(0) === 0 && M3.bootLodAt(999) === -1);
}

// --- de drie niveaus: strikt minder driehoeken, eindig, binnen de romp ------------------------
const rows = [];
const firstBuild = new Array(3).fill(null);
let builds = 0;
function binnenRomp(g, model, L, label) {
  g.computeBoundingBox();
  const b = g.boundingBox, hl = model.len / 2, hw = model.wid / 2;
  const xOk = b.min.x >= -hl - 0.05 && b.max.x <= hl + 0.05;
  const zOk = b.min.z >= -hw - 0.05 && b.max.z <= hw + 0.05;
  check(`${label}: binnen de romp (x/z)`, xOk && zOk, `x ${b.min.x.toFixed(2)}..${b.max.x.toFixed(2)} van ±${hl}, z ${b.min.z.toFixed(2)}..${b.max.z.toFixed(2)} van ±${hw}`);
  const yMin = L.open ? -0.1 : L.vloer - 0.45;
  const yMax = (L.dak || 2.5) + 0.5;
  check(`${label}: hoogte klopt met de roef`, b.min.y >= yMin && b.max.y <= yMax, `y ${b.min.y.toFixed(2)}..${b.max.y.toFixed(2)} van ${yMin.toFixed(2)}..${yMax.toFixed(2)}`);
}
for (const [label, v] of SOORTEN) {
  const L = BI.bootInterieur(v);
  check(`${label}: de indeling bestaat`, !!L);
  if (!L) continue;
  const row = { label, open: L.open, tri: [], ms: [], eigen: 0 };
  for (let lod = 0; lod < 3; lod++) {
    const t0 = performance.now();
    const g = M3.buildBootInterieur(L, lod);
    const ms = performance.now() - t0;
    if (firstBuild[lod] === null) firstBuild[lod] = ms;
    builds++;
    row.tri.push(triangles(g));
    row.ms.push(ms);
    check(`${label}: lod ${lod} eindig`, finite(g));
    check(`${label}: lod ${lod} één groep (één tekenaanroep)`, g.groups.length === 1);
    binnenRomp(g, v.model, L, `${label} lod ${lod}`);
  }
  check(`${label}: driehoeken dalen strikt (${row.tri.join(' > ')})`, row.tri[0] > row.tri[1] && row.tri[1] > row.tri[2], row.tri.join(' > '));
  const gEigen = M3.buildBootInterieur(L, 0, true);
  row.eigen = triangles(gEigen);
  check(`${label}: eigen detail is rijker dan lod 0`, row.eigen > row.tri[0], `${row.tri[0]} -> ${row.eigen}`);
  check(`${label}: eigen detail eindig`, finite(gEigen));
  rows.push(row);
}

// Warme bouwtijd: dezelfde geometrieën een tweede keer bouwen (de JIT is dan warm), zodat het verslag niet
// alleen de koude eerste bouw laat zien. De wereld bouwt elke geometrie maar één keer, dus dit is de marge.
const warm = new Array(3).fill(0);
for (const [, v] of SOORTEN) {
  const L = BI.bootInterieur(v);
  for (let lod = 0; lod < 3; lod++) {
    const t0 = performance.now();
    M3.buildBootInterieur(L, lod);
    warm[lod] += performance.now() - t0;
  }
}
const warmGem = warm.map((t) => t / SOORTEN.length);

// --- het echte bootmodel: één mesh per boot, gedeelde geometrie, gedeeld materiaal -------------
{
  const a = setup('rondvaart'), b = setup('rondvaart');
  const world = { player: { x: 0, y: 0 }, vehicles: [a.v, b.v] };
  tick(world);
  const ia = a.mesh.userData.bootInt, ib = b.mesh.userData.bootInt;
  check('sync: dichtbij krijgt de boot een interieur', !!ia && ia.visible, String(a.mesh.userData.bootIntLod));
  check('sync: niveau 0 dichtbij', a.mesh.userData.bootIntLod === 0, String(a.mesh.userData.bootIntLod));
  check('sync: precies één interieurmesh per boot', a.mesh.children.filter((c) => c.name === 'bootinterieur').length === 1);
  check('sync: de mesh hangt aan de bootmesh (boten hebben geen userData.body)', ia.parent === a.mesh);
  check('sync: draw-stijl', ia.name === 'bootinterieur' && ia.userData.noBatch === true && ia.castShadow === false && ia.receiveShadow === false);
  check('sync: renderOrder na het dek', ia.renderOrder === 11, String(ia.renderOrder));
  const row = rows.find((r) => r.label === 'rondvaart');
  check('sync: geometrie is de gebouwde lod 0', triangles(ia.geometry) === row.tri[0], `${triangles(ia.geometry)} tegen ${row.tri[0]}`);
  check('sync: twee boten van hetzelfde model delen de geometrie', ib && ia.geometry === ib.geometry);
  check('sync: de gedeelde geometrie is als gedeeld gemarkeerd', ia.geometry.userData.shared === true);
  check('sync: één gedeeld materiaal', ia.material === ib.material && ia.material.userData.shared === true);
  check('sync: de meshes zelf zijn apart', ia !== ib);
  // een rustig frame verandert niets
  const geo = ia.geometry;
  tick(world);
  check('sync: een rustig frame houdt dezelfde mesh en geometrie', a.mesh.userData.bootInt === ia && ia.geometry === geo && ia.visible);
}

// --- de afstand wisselt alleen de geometrie, en verbergt voorbij de verste straal --------------
{
  const it = setup('rondvaart');                 // 14 m: maatfactor 1 + 4/60 = 1,0667 -> 32 / 64 / 106,67 m
  const f = M3.bootMaatFactor(14);
  const world = { player: { x: 0, y: 0 }, vehicles: [it.v] };
  tick(world);
  const int = it.mesh.userData.bootInt;
  const lod0 = int.geometry;
  world.player.x = M3.BOOT_LOD_R[0] * f + 0.5;
  tick(world);
  check('afstand: halverwege is lod 1', it.mesh.userData.bootIntLod === 1, String(it.mesh.userData.bootIntLod));
  check('afstand: dezelfde mesh, alleen de geometrie wisselt', it.mesh.userData.bootInt === int && int.geometry !== lod0);
  const lod1 = int.geometry;
  check('afstand: lod 1 heeft de gemeten driehoeken', triangles(lod1) === rows.find((r) => r.label === 'rondvaart').tri[1]);
  world.player.x = M3.BOOT_LOD_R[1] * f + 0.5;
  tick(world);
  check('afstand: verder weg is lod 2', it.mesh.userData.bootIntLod === 2, String(it.mesh.userData.bootIntLod));
  check('afstand: lod 2 is goedkoper dan lod 1', triangles(int.geometry) < triangles(lod1), `${triangles(int.geometry)} < ${triangles(lod1)}`);
  world.player.x = M3.BOOT_LOD_R[2] * f + 0.5;
  tick(world);
  check('afstand: voorbij de verste straal is het interieur verborgen', int.visible === false);
  world.player.x = 5;
  tick(world);
  check('afstand: dichterbij komt lod 0 terug', it.mesh.userData.bootIntLod === 0 && int.visible && int.geometry === lod0);
  // Chebyshev: 50 m opzij is net zo ver als 50 m vooruit
  const zijd = setup('rondvaart');
  world.vehicles.push(zijd.v);
  zijd.v.x = 0; zijd.v.y = 50;
  world.player.x = 0; world.player.y = 0;
  tick(world);
  check('afstand: vierkante (Chebyshev) afstand opzij', zijd.mesh.userData.bootIntLod === 1, String(zijd.mesh.userData.bootIntLod));
}

// --- het bouwbudget: hooguit BOOT_BUILD_BUDGET nieuwe geometrieën per aanroep ------------------
{
  const items = [setup('zeeVracht'), setup('zeeContainer'), setup('zeeTanker')];
  const world = { player: { x: 0, y: 0 }, vehicles: items.map((i) => i.v) };
  const gebouwd = () => items.filter((i) => i.mesh.userData.bootInt).length;
  tick(world);
  check('budget: de eerste aanroep bouwt twee boten', gebouwd() === M3.BOOT_BUILD_BUDGET, String(gebouwd()));
  check('budget: de boot die nog niet gebouwd is tekent niets', items.filter((i) => !i.mesh.userData.bootInt || !i.mesh.userData.bootInt.visible).length === 1);
  tick(world);
  check('budget: de tweede aanroep bouwt de derde boot', gebouwd() === 3, String(gebouwd()));
  check('budget: elke boot heeft zijn eigen geometrie', new Set(items.map((i) => i.mesh.userData.bootInt.geometry)).size === 3);
}

// --- een open boot zonder roef krijgt niets ---------------------------------------------------
{
  const kano = setup('kano');
  const world = { player: { x: 0, y: 0 }, vehicles: [kano.v] };
  for (let i = 0; i < 3; i++) tick(world);
  check('open boot: geen interieurmesh', !kano.mesh.userData.bootInt && !kano.mesh.userData.bootIntLod);
  check('open boot: geen kind in de bootmesh', kano.mesh.children.every((c) => c.name !== 'bootinterieur'));
  const rubber = setup('rubberboot');
  const w2 = { player: { x: 0, y: 0 }, vehicles: [rubber.v] };
  tick(w2);
  check('open boot (rubberboot): geen interieurmesh', !rubber.mesh.userData.bootInt);
}

// --- een wrak of zinkende boot, en een NaN-positie --------------------------------------------
{
  const wrak = setup('rondvaart');
  wrak.v.wrecked = true;
  const w1 = { player: { x: 0, y: 0 }, vehicles: [wrak.v] };
  tick(w1);
  check('wrak: geen interieur', !wrak.mesh.userData.bootInt);
  const zink = setup('spits');
  tick({ player: { x: 0, y: 0 }, vehicles: [zink.v] });
  check('sync: een gezonde boot heeft een interieur', !!zink.mesh.userData.bootInt && zink.mesh.userData.bootInt.visible);
  zink.v.wrecked = true;
  tick({ player: { x: 0, y: 0 }, vehicles: [zink.v] });
  check('wrak: het bestaande interieur wordt verborgen', zink.mesh.userData.bootInt.visible === false);
  // NaN-positie: verbergen in plaats van crashen (de verhaaltest faalt op NaN-meetkunde)
  zink.v.wrecked = false;
  tick({ player: { x: 0, y: 0 }, vehicles: [zink.v] });
  check('sync: na het wrak weer zichtbaar', zink.mesh.userData.bootInt.visible === true);
  const ox = zink.v.x;
  zink.v.x = NaN;
  tick({ player: { x: 0, y: 0 }, vehicles: [zink.v] });
  check('NaN-positie: het interieur is verborgen', zink.mesh.userData.bootInt.visible === false);
  zink.v.x = ox;
  tick({ player: { x: 0, y: 0 }, vehicles: [zink.v] });
  check('NaN-positie: een echte positie toont het weer', zink.mesh.userData.bootInt.visible === true);
}

// --- eigen boot in eerste persoon: detail aan bij instappen, uit bij uitstappen ---------------
{
  const it = setup('spits');
  const int = null;
  const world = { player: { x: 0, y: 0, inVehicle: it.v }, firstPersoon: { on: true }, vehicles: [it.v] };
  tick(world);
  const ud = it.mesh.userData;
  check('eigen boot: detailniveau in eerste persoon', ud.bootIntLod === M3.BOOT_EIGEN_LOD, String(ud.bootIntLod));
  const eigenGeo = ud.bootInt.geometry;
  const row = rows.find((r) => r.label === 'spits');
  check('eigen boot: de detailvariant is rijker dan lod 0', triangles(eigenGeo) > row.tri[0], `${triangles(eigenGeo)} > ${row.tri[0]}`);
  check('eigen boot: de detailvariant zit in dezelfde ene mesh', it.mesh.children.filter((c) => c.name === 'bootinterieur').length === 1 && ud.bootInt.visible);
  check('eigen boot: de detailgeometrie is gedeeld en gemarkeerd', eigenGeo.userData.shared === true);
  // de speler zit in deze boot: ook al staat de afstand (theoretisch) ver, het detail blijft
  world.player.x = 500;
  tick(world);
  check('eigen boot: detail blijft ook buiten de LOD-straal zichtbaar', ud.bootIntLod === M3.BOOT_EIGEN_LOD && ud.bootInt.visible);
  // eerste persoon uit: terug naar het gewone niveau (op 500 m verborgen)
  world.firstPersoon.on = false;
  tick(world);
  check('eigen boot: eerste persoon uit verbergt het op 500 m', ud.bootInt.visible === false);
  // weer dichtbij en uitgestapt: het gewone lod 0 staat er weer
  world.player.x = 0; world.player.inVehicle = null; world.firstPersoon.on = true;
  tick(world);
  check('eigen boot: uitgestapt is het weer gewoon lod 0', ud.bootIntLod === 0 && ud.bootInt.visible, String(ud.bootIntLod));
  check('eigen boot: de detailvariant is uit de mesh', ud.bootInt.geometry !== eigenGeo && triangles(ud.bootInt.geometry) === row.tri[0]);
  // in een boot zitten zonder eerste persoon: gewoon lod 0
  world.player.inVehicle = it.v; world.firstPersoon.on = false;
  tick(world);
  check('eigen boot: zonder eerste persoon gewoon lod 0', ud.bootIntLod === 0 && ud.bootInt.visible);
  // een andere boot in de buurt houdt zijn gewone niveau als de speler in deze zit
  const ander = setup('kempenaar');
  ander.v.x = 8;
  world.vehicles.push(ander.v);
  world.player.inVehicle = it.v; world.firstPersoon.on = true;
  tick(world);
  check('eigen boot: de andere boot houdt zijn LOD-niveau', ander.mesh.userData.bootIntLod === 0 && ander.mesh.userData.bootInt && ander.mesh.userData.bootInt.visible);
}

// --- meting: driehoeken per niveau, eerste bouwtijd, som van de drie niveaus -------------------
console.log('bootinterieur3d: driehoeken per niveau (lod 0 > 1 > 2) en eerste bouwtijd in ms:');
for (const r of rows) {
  const sum = r.tri[0] + r.tri[1] + r.tri[2];
  console.log(`  ${r.label.padEnd(14)} ${String(r.tri[0]).padStart(4)} > ${String(r.tri[1]).padStart(4)} > ${String(r.tri[2]).padStart(4)}  som ${String(sum).padStart(4)}  eigen ${String(r.eigen).padStart(4)}  ${r.ms.map((m) => m.toFixed(3) + ' ms').join(' | ')}`);
}
console.log(`  eerste bouw per niveau: lod0 ${firstBuild[0].toFixed(3)} ms, lod1 ${firstBuild[1].toFixed(3)} ms, lod2 ${firstBuild[2].toFixed(3)} ms, som ${(firstBuild[0] + firstBuild[1] + firstBuild[2]).toFixed(3)} ms (${builds} geometrieën)`);
console.log(`  warme bouw (tweede ronde, gemiddeld over ${SOORTEN.length} soorten): lod0 ${warmGem[0].toFixed(3)} ms, lod1 ${warmGem[1].toFixed(3)} ms, lod2 ${warmGem[2].toFixed(3)} ms; som ${warmGem.reduce((a, b) => a + b, 0).toFixed(3)} ms per boot`);
const grootste = rows.reduce((a, r) => (r.tri[0] > a.tri[0] ? r : a), rows[0]);
console.log(`  zwaarste lod 0: ${grootste.label} met ${grootste.tri[0]} driehoeken; verste straal: ${M3.BOOT_LOD_R[2]} m voor een kleine boot, ${(M3.BOOT_LOD_R[2] * M3.bootMaatFactor(98)).toFixed(0)} m voor de zee-tanker (98 m, maatfactor ${M3.bootMaatFactor(98).toFixed(2)})`);

console.log(bad ? `${bad} mislukt` : 'bootinterieur3d_test: ok');
process.exit(bad ? 1 : 0);
