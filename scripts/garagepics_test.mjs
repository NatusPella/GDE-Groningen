// Garagefoto's (#196, #170): elk voertuig uit het register krijgt in de garage een echt model
// (de modelbouwer van de wereld en de cutscenes, nooit een plaatsvervanger) in zijn eigen lak,
// en de kaart draait alleen op de goede momenten.
//   node scripts/garagepics_test.mjs   (heeft de gevendorde three nodig: cd desktop && npm run stage)
import './node3d.mjs';

const { VOERTUIGEN } = await import('../game/js/vehicleregister.js');
const { VEHICLE_STOCK, PAINTS } = await import('../game/js/shops.js');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
const {
  garagePreviewSpec, previewVehicle, garageCardLook, garageSaleShop, turntableTarget, registerNameOf,
  GARAGE_3Q_ANGLE, GARAGE_PIC_W, GARAGE_PIC_H, GARAGE_PIC_ZOOM, garagePicZoom, TURN_FPS,
} = await import('../game/js/garagepics.js');
const { garageCategory } = await import('../game/js/menumodels.js');

let n = 0, fails = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

const HERO = { label: 'Fjord Escapade', kind: 'car', color: '#a11f1f', model: { name: 'escort', len: 4.0, wid: 1.65, maxSpeed: 50, accel: 11, brake: 25, turnRate: 3.4 } };
// de modellen zijn gemengd met hoekpuntkleuren; de lak zit in die kleuren
const triangles = (mesh) => { let t = 0; mesh.traverse((o) => { if (o.isMesh) t += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return t; };
const hasPaint = (mesh, hex) => {
  const c = new THREE.Color(hex);
  let found = false;
  mesh.traverse((o) => {
    const a = o.isMesh && o.geometry.attributes.color;
    if (!a) return;
    for (let i = 0; i < a.count && !found; i++) found = Math.abs(a.getX(i) - c.r) < 0.02 && Math.abs(a.getY(i) - c.g) < 0.02 && Math.abs(a.getZ(i) - c.b) < 0.02;
  });
  return found;
};
const entryOf = (key, spec, extra = {}) => ({ id: key, key, spec, color: spec.color, owned: false, locked: false, hero: false, status: 'forsale', ...extra });

// --- elk winkelvoertuig: een spec uit het register, gebouwd met de echte bouwer ---
const gezien = new Set();
const kleur = new Map();
for (const [key, spec] of Object.entries(VEHICLE_STOCK)) {
  const e = entryOf(key, spec);
  const ps = garagePreviewSpec(e);
  ok(!!ps, `${key}: heeft een voorbeeldspec`);
  if (!ps) continue;
  ok(!!registerNameOf(ps, VOERTUIGEN), `${key}: model ${ps.model.name} staat in het voertuigregister`);
  gezien.add(ps.model.name);
  ok(ps.color === spec.color && ps.kind === spec.kind, `${key}: eigen lak en soort`);
  const v = previewVehicle(ps);
  ok(v.model.color === spec.color, `${key}: de lak gaat naar de bouwer`);
  let mesh = null;
  try { mesh = buildVehicleMesh(v); } catch (err) { ok(false, `${key}: bouwer valt om`, err.message); }
  if (!mesh) continue;
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mesh);
  const size = box.getSize(new THREE.Vector3());
  const tris = triangles(mesh);
  ok(!box.isEmpty() && [size.x, size.y, size.z].every(Number.isFinite), `${key}: eindige afmetingen`, size.toArray().join(','));
  ok(tris >= 150, `${key}: een echt model, geen blokje (${tris} driehoeken)`);
  ok(Math.max(size.x, size.z) > 0.8 && size.y > 0.3 && size.y < 9, `${key}: afmetingen van een voertuig`, size.toArray().map((x) => x.toFixed(2)).join(','));
  ok(box.min.y > -1.5 && box.min.y < 0.6, `${key}: staat op de grond`, `min.y ${box.min.y.toFixed(2)}`);
  kleur.set(key, mesh);
}
// het startvoertuig staat niet in de winkel maar wel in de garage
{
  const ps = garagePreviewSpec(entryOf('hero', HERO, { hero: true, owned: true }));
  ok(!!ps && registerNameOf(ps, VOERTUIGEN) === 'escort' && ps.flags.isHeroCar, 'de Fjord Escapade krijgt het eigen model');
  gezien.add('escort');
}

// --- het register: elk te bezitten model is in de garage te zien ---
for (const [naam, e] of Object.entries(VOERTUIGEN)) {
  if (e.uitzondering) {
    ok(!gezien.has(naam), `${naam}: uitzondering (${e.klasse}) staat niet in de garage`);
    continue;
  }
  const bereikbaar = gezien.has(naam) || (e.alias && gezien.has(e.alias)) || e.winkel.some((k) => VEHICLE_STOCK[k]);
  ok(bereikbaar, `${naam}: heeft een garagefoto`);
}
// alle soorten komen langs: auto's, bussen, vrachtwagens, tweewielers, boten, trekker, heli
const cats = new Set(Object.entries(VEHICLE_STOCK).map(([key, spec]) => garageCategory(entryOf(key, spec))));
for (const c of ['autos', 'bussen', 'fietsen', 'scooters', 'boten', 'luchtvaart']) ok(cats.has(c), `categorie ${c} heeft voertuigen`);
for (const naam of ['truck', 'tractor', 'bike', 'scooter', 'motor', 'boat', 'heli', 'bus']) ok(gezien.has(naam), `soort ${naam} komt in de garage voor`);

// --- lak en tuning: een andere lak is een ander voertuig, elke lak werkt ---
{
  const spec = VEHICLE_STOCK.mug;
  const a = garagePreviewSpec(entryOf('mug', spec));
  const b = garagePreviewSpec(entryOf('mug', spec, { color: PAINTS[1].color, owned: true }));
  ok(JSON.stringify(a) !== JSON.stringify(b), 'een andere lak geeft een andere foto (eigen cachesleutel)');
  ok(previewVehicle(b).model.color === b.color, 'de gekozen lak bereikt de bouwer');
  const m1 = buildVehicleMesh(previewVehicle(b));
  ok(hasPaint(m1, b.color), 'het model draagt die lak werkelijk');
  ok(!hasPaint(buildVehicleMesh(previewVehicle(a)), b.color), 'en de fabriekslak niet');
}

// --- stijl van de kaart ---
ok(garageCardLook({ owned: true, locked: false, status: 'garage' }) === 'owned', 'van jou');
ok(garageCardLook({ owned: true, locked: false, status: 'lost' }) === 'lost', 'afgeschreven');
ok(garageCardLook({ owned: false, locked: false }) === 'sale', 'te koop');
ok(garageCardLook({ owned: false, locked: true }) === 'locked', 'op slot');
ok(garagePreviewSpec(null) === null && garagePreviewSpec({ spec: {} }) === null, 'zonder model geen spec');

// --- te koop: waar staat hij, voor de knop Kopen met een waypoint (#435) ---
ok(garageSaleShop({ owned: false, locked: false, spec: { shop: 'auto' } }) === 'auto', 'te koop bij de autodealer');
ok(garageSaleShop({ owned: false, locked: false, spec: { shop: 'fietsen' } }) === 'fietsen', 'te koop bij de fietsenwinkel');
ok(garageSaleShop({ owned: true, spec: { shop: 'auto' } }) === '', 'van jou: geen winkel');
ok(garageSaleShop({ owned: false, locked: true, spec: { shop: 'auto' } }) === '', 'op slot: geen winkel');
ok(garageSaleShop({ owned: false, spec: { unlock: 'verhaal', shop: 'auto' } }) === '', 'vrijgespeeld: geen winkel');
ok(garageSaleShop({ owned: false, locked: false }) === '' && garageSaleShop(null) === '', 'zonder spec geen winkel');
for (const [key, spec] of Object.entries(VEHICLE_STOCK)) {
  const e = entryOf(key, spec);
  const verwacht = spec.unlock || !spec.shop ? '' : spec.shop;
  ok(garageSaleShop(e) === verwacht, `${key}: Kopen wijst naar de winkel waar hij staat`);
}

// --- wie draait: muis, focus, aanraking, beperkte beweging ---
ok(turntableTarget({ hover: 'a', focus: 'b', selected: 'c', touch: true }) === 'a', 'de muis wint');
ok(turntableTarget({ focus: 'b', selected: 'c' }) === 'b', 'toetsenbord en controller: de focus');
ok(turntableTarget({ selected: 'c', touch: true }) === 'c', 'aanraking: de aangetikte kaart');
ok(turntableTarget({ hover: 'a', focus: 'b', latest: 'focus' }) === 'b', 'het laatst gebruikte invoerapparaat wint (toetsen na muis)');
ok(turntableTarget({ hover: 'a', focus: 'b', latest: 'hover' }) === 'a', 'en andersom (muis na toetsen)');
ok(turntableTarget({ hover: 'a', latest: 'focus' }) === 'a', 'zonder focus blijft de muis');
ok(turntableTarget({ selected: 'c' }) === null, 'zonder aanraking draait de gekozen kaart niet vanzelf');
ok(turntableTarget({ hover: 'a', focus: 'b', selected: 'c', touch: true, reduced: true }) === null, 'Beweging beperken: niets draait');
ok(turntableTarget() === null, 'niets gekozen: niets draait');

// --- de maten ---
ok(GARAGE_PIC_W / GARAGE_PIC_H > 1.5 && GARAGE_PIC_W <= 512, 'foto breder dan hoog en licht');
ok(GARAGE_PIC_ZOOM > 0.5 && GARAGE_PIC_ZOOM <= 1, 'de foto komt dichterbij, niet verder weg');
ok(garagePicZoom({ model: { len: 4.2 } }) === GARAGE_PIC_ZOOM, 'een gewone auto: de standaardzoom');
ok(garagePicZoom({ model: { len: 11.2, trailer: 6.8 } }) > garagePicZoom({ model: { len: 4.2 } }) && garagePicZoom({ model: { len: 11.2, trailer: 6.8 } }) <= 1.2, 'een lange bus houdt meer ruimte');
ok(Number.isFinite(garagePicZoom({})) && Number.isFinite(garagePicZoom(null)), 'zoom zonder model blijft een getal');
ok(TURN_FPS <= 30 && Number.isFinite(GARAGE_3Q_ANGLE), 'draaien op hoogstens 30 beelden per seconde');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
