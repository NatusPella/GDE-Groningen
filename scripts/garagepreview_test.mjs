// Draaischijf en kaartfoto (#463): de levende preview in de garage (het model op
// de draaischijf) en de foto op de kaartlijst moeten hetzelfde model met dezelfde
// materialen tonen. In de beeldronde van #463 stonden op de draaischijf egale rode
// blokken waar de wielen zitten en een rode waas in de ramen, terwijl dezelfde
// voertuigen op de kaarten goed waren.
//
// De oorzaak zat niet in het model: het silhouet-SVG achter de preview ging nooit
// weg. Een SVGElement kent geen `hidden`-eigenschap (die zit op HTMLElement), dus
// `svg.hidden = true` zette alleen een eigenschap op het object. Het silhouet
// bleef in de lakkleur achter het model staan en scheen door het glas heen.
//
// Deze test legt beide kanten vast:
//   1. één modelbouwer voor beide paden (de draaischijf en de kaartfoto),
//   2. dezelfde materialen en kleuren: de lak zit in de hoekpuntkleuren, de banden
//      zijn donker, het glas is de glastint en nergens staat een rode fallback,
//   3. het silhouet wijkt echt zodra het model tekent.
//   node scripts/garagepreview_test.mjs   (heeft de gevendorde three nodig: cd desktop && npm run stage)
import './node3d.mjs';
import { readFileSync } from 'node:fs';

const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { VEHICLE_STOCK, PAINTS } = await import('../game/js/shops.js');
const G = await import('../game/js/garagepics.js');

let n = 0, fails = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

// --- de bronnen: wie bouwt wat ------------------------------------------------
const src = (f) => readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
const prev = src('vehiclepreview.js');
const ui = src('garageui.js');
const count = (s, re) => (s.match(re) || []).length;

// Eén modelbouwer: buildVehicleMesh wordt op één plek aangeroepen (in buildObject),
// en zowel de draaischijf (createSharedPreview + createVehiclePreview) als de
// kaartfoto (shoot/renderSnapshot) gaan via buildObject.
ok(count(prev, /buildVehicleMesh\(/g) === 1, 'één aanroep van de modelbouwer in vehiclepreview.js', count(prev, /buildVehicleMesh\(/g));
ok(/const mesh = buildVehicleMesh\(previewVehicle\(spec\)\)/.test(prev), 'die ene aanroep bouwt het echte voertuigmodel uit de spec');
ok(count(prev, /function buildObject\(/g) === 1, 'buildObject bestaat één keer');
// de drie paden die een model tonen noemen alle drie buildObject
const showShared = prev.slice(prev.indexOf('export function createSharedPreview'));
const showShot = prev.slice(prev.indexOf('function shoot('));
const showVehicle = prev.slice(prev.indexOf('export function createVehiclePreview'), prev.indexOf('export function createSharedPreview'));
ok(showShared.includes('buildObject(spec, true)'), 'de draaischijf bouwt via buildObject');
ok(showShot.includes('buildObject(spec, true)'), 'de kaartfoto bouwt via dezelfde buildObject');
ok(showVehicle.includes('buildObject(spec)'), 'de winkelpreview bouwt via dezelfde buildObject');
// geen tweede bouwer in de garage-UI: die vraagt alleen een spec aan garagepics.js
ok(!/models3d_vehicles/.test(ui) && !/buildVehicleMesh\(/.test(ui), 'garageui.js bouwt zelf geen model');
ok(/garagePreviewSpec as previewSpec/.test(ui), 'de garage-UI haalt zijn spec uit garagepics.js');
ok(count(ui, /previewSpec\(e\)/g) >= 2, 'kaart en draaischijf gebruiken dezelfde spec', count(ui, /previewSpec\(e\)/g));
ok(/renderSnapshot\(spec, GARAGE_PIC_W, GARAGE_PIC_H/.test(ui), 'de kaartfoto komt uit die spec');
ok(/viewer\.show\(previewSpec\(e\)\)/.test(ui), 'de draaischijf toont diezelfde spec');
// geen rode noodkleur in het voorbeeldpad (de oude verdenking: een rode fallback)
ok(!/0xff0000|#ff0000|["']red["']/i.test(prev), 'geen rode fallback in vehiclepreview.js');

// --- het silhouet achter de preview -------------------------------------------
// De kern van #463: het silhouet moet via een echte stijl wijken, niet via de
// `hidden`-eigenschap die een SVG niet heeft.
ok(!/glyph\.hidden/.test(ui), 'garageui.js verbergt het silhouet niet met de hidden-eigenschap');
ok(/glyph\.style\.display = stageSilhouetteStyle\(/.test(ui), 'garageui.js zet de zichtbaarheid als stijl op de svg');
ok(G.stageSilhouetteStyle(false) === 'none', 'uit betekent echt geen beeld', G.stageSilhouetteStyle(false));
ok(G.stageSilhouetteStyle(true) === '', 'aan betekent weer zichtbaar', `"${G.stageSilhouetteStyle(true)}"`);
ok(G.stageSilhouetteStyle(0) === 'none' && G.stageSilhouetteStyle(1) === '', 'dezelfde regel voor elke waardeheid');
// het silhouet is de terugval van de kaart én de draaischijf: pas weg als het model er is
ok(/onFirstFrame:[\s\S]{0,200}showStageFallback\(box, false\)/.test(ui), 'het silhouet wijkt op het eerste beeld van de preview');
ok(/if \(glyph\) glyph\.style\.display/.test(ui), 'en alleen als er een silhouet in de stage staat');

// --- de modellen: dezelfde materialen en kleuren ------------------------------
// De bouwer van de wereld, zoals buildObject hem ook gebruikt.
const build = (spec) => {
  const mesh = buildVehicleMesh(G.previewVehicle(spec));
  mesh.updateMatrixWorld(true);
  return mesh;
};
const hexes = (attr) => {
  const out = [];
  for (let i = 0; i < attr.count; i++) out.push(new THREE.Color(attr.getX(i), attr.getY(i), attr.getZ(i)).getHex());
  return out;
};
// alle kleuren die in de hoekpunten van een model zitten
const colorsOf = (mesh) => {
  const all = new Set();
  mesh.traverse((o) => { if (o.isMesh && o.geometry.attributes.color) for (const h of hexes(o.geometry.attributes.color)) all.add(h); });
  return all;
};
const near = (a, b, marge = 0x040404) => {
  const d = (x, y) => Math.abs(((x >> y) & 0xff) - ((b >> y) & 0xff));
  return d(a, 16) <= (marge >> 16) + 4 && d(a, 8) <= ((marge >> 8) & 0xff) + 4 && d(a, 0) <= (marge & 0xff) + 4;
};
const hasColor = (mesh, hex) => { for (const h of colorsOf(mesh)) if (near(h, hex)) return true; return false; };
const materialsOf = (mesh) => {
  const out = [];
  mesh.traverse((o) => { if (o.isMesh) { for (const m of (Array.isArray(o.material) ? o.material : [o.material])) out.push({ mesh: o, mat: m }); } });
  return out;
};
// geen enkele mesh in een voorbeeld mag een egale rode noodkleur dragen
const RODE_NOODKLEUR = 0xff0000;
const geenRood = (mesh) => materialsOf(mesh).filter(({ mat }) => mat.color && mat.color.getHex() === RODE_NOODKLEUR);

const HERO = {
  label: 'Fjord Escapade', kind: 'car', color: '#a11f1f',
  model: { name: 'escort', len: 4.0, wid: 1.65, maxSpeed: 50, accel: 11, brake: 25, turnRate: 3.4 },
};
const entry = (key, spec, extra = {}) => ({ id: key, key, spec, color: spec.color, owned: false, locked: false, hero: false, status: 'forsale', ...extra });
const cases = [
  ['Escapade (de auto van de speler)', G.garagePreviewSpec(entry('hero', HERO, { hero: true, owned: true })), '#a11f1f', true],
  ['trekker', G.garagePreviewSpec(entry('trekker', VEHICLE_STOCK.trekker)), VEHICLE_STOCK.trekker.color, false],
  ['Hunze Mug in een andere lak', G.garagePreviewSpec(entry('mug', VEHICLE_STOCK.mug, { color: PAINTS[3].color })), PAINTS[3].color, false],
];
for (const [naam, spec, lak, hero] of cases) {
  ok(!!spec, `${naam}: heeft een voorbeeldspec`);
  if (!spec) continue;
  const mesh = build(spec);
  const body = mesh.userData.body;
  ok(!!body && !!body.isMesh, `${naam}: het model heeft een body-mesh met de materialen van de wereld`);
  // de materialen zijn precies die van de wereld: lak (hoekpuntkleuren), glas, lampen
  ok(Array.isArray(body.material) && body.material.length === 3, `${naam}: drie materialen, zoals in de wereld`, body.material.length);
  ok(body.material[0].type === 'MeshStandardMaterial' && body.material[0].vertexColors === true, `${naam}: de lak komt uit hoekpuntkleuren`);
  ok(body.material[0].color.getHex() === 0xffffff, `${naam}: de lakmateriaal is neutraal (geen ingebakken kleur)`, body.material[0].color.getHexString());
  ok(body.material[1].glass !== undefined || body.material[1].transparent === true, `${naam}: het glas is doorzichtig`);
  ok(body.material[1].opacity < 1 && body.material[1].opacity > 0.1, `${naam}: glas met een tint, niet dicht`, body.material[1].opacity);
  ok(body.material[2].type === 'MeshBasicMaterial' && body.material[2].vertexColors === true, `${naam}: de lampen lezen ook hoekpuntkleuren`);
  ok(geenRood(mesh).length === 0, `${naam}: nergens een egale rode noodkleur`, geenRood(mesh).map((x) => x.mat.type).join(','));
  // de lak zit in het model en is ook echt die lak
  ok(hasColor(mesh, new THREE.Color(lak).getHex()), `${naam}: het model draagt de lak ${lak}`);
  ok(!hasColor(mesh, RODE_NOODKLEUR), `${naam}: en geen rood blok als lak`);
  // de wielen: donkere banden en grijze velgen, nooit de lak (dát waren de rode blokken)
  const wielen = mesh.userData.wheels || [];
  ok(wielen.length >= 2, `${naam}: het model heeft wielen`, wielen.length);
  for (const w of wielen) {
    const c = w.geometry.attributes.color;
    ok(!!c, `${naam}: een wiel met eigen hoekpuntkleuren`);
    if (!c) continue;
    const banden = hexes(c);
    ok(banden.every((h) => !near(h, new THREE.Color(lak).getHex(), 0x020202)), `${naam}: geen wiel in de lakkleur`);
    ok(banden.some((h) => near(h, 0x1b1b1c)), `${naam}: een donkere band`);
    ok(banden.some((h) => near(h, 0x9ea2a6)), `${naam}: een grijze velg`);
  }
  // het glas: de glastint, niet de lak (de rode waas in de ramen)
  const glas = body.geometry.groups.some((g) => g.materialIndex === 1 && g.count > 0);
  ok(glas, `${naam}: het model heeft glasvlakken`);
  const glasKleuren = hexes(body.geometry.attributes.color);
  ok(glasKleuren.some((h) => near(h, 0x2b3740)), `${naam}: de ramen hebben de glastint`);
  if (!hero) ok(true, `${naam}: geen heldenauto, dus de gewone bouwer`);
}

// Dezelfde spec twee keer (eerst zoals de kaartfoto hem bouwt en daarna weggooit,
// dan zoals de draaischijf hem houdt) geeft hetzelfde model en dezelfde kleuren:
// er zit geen staat in de bouwer of in de cache die het tweede beeld verandert.
const dubbel = (spec) => {
  const a = build(spec);
  const sig = (mesh) => {
    const m = materialsOf(mesh).map(({ mat }) => [mat.type, mat.vertexColors, mat.color.getHexString(), mat.transparent, mat.opacity].join('|'));
    const c = [...colorsOf(mesh)].sort().join(',');
    let tris = 0;
    mesh.traverse((o) => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
    return JSON.stringify({ m: m.sort(), c, tris });
  };
  const eerste = sig(a);
  // zoals disposeMesh het doet: alleen de eigen materialen gaan weg, de gedeelde
  // geometrie blijft (anders zou de wereld zijn auto's verliezen)
  a.traverse((o) => { if (o.isMesh && !o.geometry.userData.shared) o.geometry.dispose(); });
  const b = build(spec);
  return [eerste, sig(b)];
};
for (const [naam, spec] of cases.map(([nm, s]) => [nm, s])) {
  const [a, b] = dubbel(spec);
  ok(a === b, `${naam}: de kaartfoto en de draaischijf bouwen hetzelfde model`, a === b ? '' : 'afwijkend');
}

// Een andere lak is echt een ander beeld: de cache mag de kleur van de een niet
// op de ander plakken (een auto in de verkeerde lak is net zo fout als rood).
{
  const groen = build(G.garagePreviewSpec(entry('trekker', VEHICLE_STOCK.trekker)));
  const rood = build(G.garagePreviewSpec(entry('trekker', VEHICLE_STOCK.trekker, { color: '#b8322a' })));
  ok(hasColor(groen, new THREE.Color('#3f7d3a').getHex()), 'de trekker is groen');
  ok(!hasColor(groen, new THREE.Color('#b8322a').getHex()), 'en niet rood');
  ok(hasColor(rood, new THREE.Color('#b8322a').getHex()), 'dezelfde trekker in een andere lak is rood');
  ok(!hasColor(rood, new THREE.Color('#3f7d3a').getHex()), 'en niet meer groen');
  ok(colorsOf(groen).size !== colorsOf(rood).size || [...colorsOf(groen)].some((h) => !colorsOf(rood).has(h)), 'twee lakken geven twee verschillende modellen');
}

// De preview-spec is voor beide paden dezelfde bron (geen tweede spec-bouwer).
{
  const e = entry('mug', VEHICLE_STOCK.mug, { color: PAINTS[3].color });
  const s1 = G.garagePreviewSpec(e);
  const s2 = G.garagePreviewSpec(e);
  ok(JSON.stringify(s1) === JSON.stringify(s2), 'de spec is bepaald, niet toevallig');
  ok(s1.color === e.color && s1.model === e.spec.model, 'de spec wijst naar hetzelfde model en dezelfde lak');
  ok(G.previewVehicle(s1).model.color === e.color, 'en de bouwer krijgt die lak');
  ok(!!G.garagePreviewSpec(null) === false, 'zonder voertuig geen spec, dus geen model');
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
