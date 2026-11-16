// Regressies voor de vliegtuigbugs van de fixronde (#851, #852, #853, #856):
//   node scripts/plane_fixes_test.mjs
// #851: de vleugel snijdt niet meer door de glazen cockpitkap en het glas is doorzichtig.
// #852: de blobschaduw van de Kist ligt op de grond en vervaagt met de hoogte, ook gekanteld.
// #853: de wielen raken de baan (onderkant op y = 0) in plaats van 5 en 28 cm te zweven.
// #856: de Kist staat bij de start op Eelde, wordt niet door de verkeersopruiming verwijderd
//        en komt terug zodra de speler weer bij Eelde is.
import './node3d.mjs';
const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
const { buildPlaneMesh } = await import('../game/js/plane3d.js');
const { planeKind, updatePlaneShadow } = await import('../game/js/planeflight.js');
const { Vehicle, manageTrafficPopulation } = await import('../game/js/vehicle.js');

let n = 0, fails = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };
const near = (a, b, m = 1e-6) => Math.abs(a - b) <= m;
const boxOf = (o) => new THREE.Box3().setFromObject(o);

// --- #851 en #853: het model ------------------------------------------------
const kist = buildPlaneMesh({ model: { color: '#e9e4d3' } });
kist.updateMatrixWorld(true);
const parts = kist.children.filter((m) => m.geometry);
const wing = parts.find((m) => m.geometry.type === 'BoxGeometry' && m.geometry.parameters.depth === 10.6);
const canopy = parts.find((m) => m.material && m.material.transparent);
ok(!!wing, '#851: de vleugel bestaat');
ok(!!canopy, '#851: de glazen kap bestaat');
if (wing && canopy) {
  const wb = boxOf(wing), cb = boxOf(canopy);
  ok(wb.min.y > cb.max.y, '#851: de vleugel ligt boven de cockpitkap, niet erdoorheen',
    `vleugel ${wb.min.y.toFixed(2)}-${wb.max.y.toFixed(2)}, kap ${cb.min.y.toFixed(2)}-${cb.max.y.toFixed(2)}`);
  ok(wb.min.y > 2.1, '#851: de vleugel ligt boven de open cockpit', String(wb.min.y));
  ok(canopy.material.opacity <= 0.5 && canopy.material.transparent, '#851: de kap is licht en doorzichtig, geen donker blok',
    String(canopy.material.opacity));
}

const wheels = parts.filter((m) => m.geometry.type === 'CylinderGeometry');
const noseWheels = wheels.filter((m) => near(m.geometry.parameters.radiusTop, 0.35));
const tailWheel = wheels.find((m) => near(m.geometry.parameters.radiusTop, 0.22));
ok(noseWheels.length === 2, '#853: twee neuswielen', String(noseWheels.length));
ok(!!tailWheel, '#853: het staartwiel bestaat');
for (const [i, wheel] of noseWheels.entries()) {
  ok(near(boxOf(wheel).min.y, 0), `#853: neuswiel ${i + 1} raakt de baan`, String(boxOf(wheel).min.y));
}
if (tailWheel) ok(near(boxOf(tailWheel).min.y, 0), '#853: het staartwiel raakt de baan', String(boxOf(tailWheel).min.y));
ok(near(boxOf(kist).min.y, 0), '#853: geen enkel onderdeel zakt onder het baanoppervlak', String(boxOf(kist).min.y));

// --- #852: de blobschaduw ---------------------------------------------------
{
  const mesh = buildPlaneMesh({ model: { color: '#e9e4d3' } });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial());
  shadow.position.set(0, 0.02, 0);
  mesh.add(shadow);
  mesh.userData.shadow = shadow;
  const root = new THREE.Group();
  root.add(mesh);
  const v = { z: 90, model: { len: 8, wid: 10.6 } };
  const world = () => { mesh.position.y = v.z; root.updateMatrixWorld(true); return shadow.getWorldPosition(new THREE.Vector3()); };

  updatePlaneShadow(mesh, v, 0);
  ok(shadow.visible === false, '#852: op 90 m is de schaduw vervaagd tot onzichtbaar');
  ok(near(world().y, 0.03, 1e-6), '#852: de schaduw staat op de grond, niet op vlieghoogte', String(world().y));

  v.z = 0;
  updatePlaneShadow(mesh, v, 0);
  ok(shadow.visible === true, '#852: op de grond is de schaduw zichtbaar');
  ok(near(shadow.scale.x, 8 * 1.12, 1e-6), '#852: de schaduw heeft de maat van de kist', String(shadow.scale.x));
  const flat = shadow.scale.x;

  v.z = 10;
  updatePlaneShadow(mesh, v, 4);
  ok(shadow.visible === true, '#852: op 10 m is de schaduw nog zichtbaar');
  ok(shadow.scale.x > flat, '#852: met de hoogte wordt de vlek groter en vager', `${shadow.scale.x} > ${flat}`);
  ok(near(world().y, 4.03, 1e-6), '#852: de schaduw volgt de grond onder de kist (10 m boven grond 4)', String(world().y));

  // gekanteld: de schaduw blijft vlak op de grond liggen in plaats van mee te rollen
  v.z = 20;
  mesh.rotation.set(0.2, 0.5, 0.3);
  updatePlaneShadow(mesh, v, 0);
  ok(near(world().y, 0.03, 1e-6), '#852: ook met pitch en roll blijft de schaduw op de grond', String(world().y));
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(shadow.getWorldQuaternion(new THREE.Quaternion()));
  ok(near(Math.abs(up.y), 1, 1e-6), '#852: het schaduwvlak staat waterpas', String(up.y));
}

// --- #856: de Kist op Eelde -------------------------------------------------
document.body = { classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } } };
const DEALER = { x: 1764.51, y: 9959.94 };
function fakeWorld(ground = 0) {
  const w = {
    map: { buildingsNear: () => [], waterNear: () => [], groundHeightAt: () => ground },
    vehicles: [], planeStrip: null, planeVelden: [], time: 0,
    player: { x: 0, y: 0, inVehicle: null }, addMessage() {},
  };
  return w;
}

{
  const w = fakeWorld();
  planeKind.init(w);
  const first = w.vehicles.find((v) => v.isPlane);
  ok(w.vehicles.length === 1 && !!first, '#856: bij de start staat er één Kist in de wereld', String(w.vehicles.length));
  ok(first && first.name === 'Kist Kees' && first.playerOwned, '#856: het is de Kist Kees van de speler');
  ok(!!w.planeStrip, '#856: de baan van Eelde is bekend');

  // de tegels van Eelde komen pas binnen als de speler er is: de geparkeerde Kist volgt de grond
  w.map.groundHeightAt = () => 4.2;
  w.time = 10;
  planeKind.tick(0.016, w);
  ok(near(first.z, 4.2), '#856: een geparkeerde Kist zakt naar de echte grondhoogte', String(first.z));

  // de verkeersopruiming haalde hem vroeger weg; nu komt hij terug zodra de speler bij Eelde is
  w.vehicles.length = 0;
  w.player.x = DEALER.x + 40; w.player.y = DEALER.y - 30;
  w.time = 20;
  planeKind.tick(0.016, w);
  const back = w.vehicles.find((v) => v.isPlane);
  ok(!!back && back.name === 'Kist Kees', '#856: bij Eelde zet de attractie de Kist terug', String(w.vehicles.length));
  ok(back && near(back.z, 4.2), '#856: de teruggezette Kist staat op de grond', back && String(back.z));

  // ver weg gebeurt dat niet: geen Kist midden in de stad
  w.vehicles.length = 0;
  w.player.x = 0; w.player.y = 0;
  w.time = 30;
  planeKind.tick(0.016, w);
  ok(!w.vehicles.some((v) => v.isPlane), '#856: ver van Eelde wordt geen Kist neergezet');
}

// Het geval uit de melding: findStrip vond bij de eerste initialisatie geen baan (de tegels
// waren er nog niet) en op de gestreamde, volgebouwde kaart vindt hij er ook geen. De attractie
// valt dan terug op de vaste eerste strook bij Eelde, zodat de Kist er toch staat.
{
  const { planeKind: fresh } = await import('../game/js/planeflight.js?retry=856');
  const w = fakeWorld(0);
  w.map.buildingsNear = () => [{ bounds: [0, 0, 1, 1], pts: [] }];
  fresh.init(w);
  const kist = w.vehicles.find((v) => v.isPlane);
  ok(!!kist, '#856: ook zonder vrij gevonden baan staat de Kist op de vaste Eelde-strook');
  ok(!!w.planeStrip, '#856: de vaste Eelde-strook komt in de wereld');
  ok(kist && Math.hypot(kist.x - (1764.51 + Math.cos(1.2) * 70 + 30), kist.y - (9959.94 + Math.sin(1.2) * 70)) < 0.01,
    '#856: de Kist staat op de eerste vrije strook bij Eelde', kist && `${kist.x.toFixed(1)},${kist.y.toFixed(1)}`);
}

// De verkeersopruiming laat een vliegtuig met rust en ruimt gewoon verkeer op.
{
  const plane = new Vehicle(DEALER.x, DEALER.y, 0, { name: 'plane', len: 8, wid: 10.6, color: '#e9e4d3' });
  plane.isPlane = true; plane.playerOwned = true; plane.name = 'Kist Kees';
  const car = new Vehicle(DEALER.x + 5, DEALER.y, 0, { name: 'sedan', len: 4, wid: 1.7, color: '#ffffff' });
  const map = { roadsNear: () => [], buildingsNear: () => [], groundHeightAt: () => 0 };
  const w = { map, vehicles: [plane, car], player: { x: 0, y: 0 }, time: 12 };
  manageTrafficPopulation(w, { focus: { x: 0, y: 0 }, target: 0, spawnMin: 0, spawnMax: 0, despawnDist: 260 });
  ok(w.vehicles.includes(plane), '#856: de verkeersopruiming laat de Kist staan');
  ok(!w.vehicles.includes(car), '#856: gewoon verkeer ver weg wordt nog steeds opgeruimd');
}

// planeflight moet de schaduw ook echt gebruiken
{
  const src = await import('node:fs').then((fs) => fs.readFileSync(new URL('../game/js/planeflight.js', import.meta.url), 'utf8'));
  ok(/updatePlaneShadow\(mesh, v, gh\(v\.x, v\.y\)\)/.test(src), '#852: updatePlanes past de schaduw elke frame aan');
  ok(/levelShadow\(sh, mesh/.test(src), '#852: de schaduw gebruikt dezelfde vlaklegtruc als de heli');
}

console.log(fails ? `${fails} van ${n} vliegtuigchecks mislukt` : `plane_fixes_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
