// Voertuigmodellen uit de beeldronde van #463: de cabine van de Knakker (hatch) moet er van buiten
// uitzien als een auto met ramen (de ruiten stonden te ver naar binnen, waardoor je langs het glas
// naar de losse stangen van het interieur keek), en een fietswiel hoort altijd bij een fietsframe
// (nooit een los wieldelen in de mesh-lijst van een voertuig). Tot slot: de losse fietswielen van
// de rommelatlas liggen op de straat en niet 15 cm erboven (streetclutter.js).
//   node scripts/voertuigmodel_test.mjs   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
await import('../game/js/player.js');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { Vehicle, TRAFFIC_MODELS } = await import('../game/js/vehicle.js');

let bad = 0;
const ok = (naam, voorwaarde, info = '') => { if (!voorwaarde) { bad++; console.log('FAIL', naam, info); } };
const modellen = new Map();
for (const m of TRAFFIC_MODELS()) if (!modellen.has(m.name)) modellen.set(m.name, m);
const bouw = (model, extra = {}) => buildVehicleMesh(Object.assign(new Vehicle(0, 0, 0, { ...model }), extra));

// --- 1. glas in de cabine -----------------------------------------------------------
// De Knakker is de hatch uit de garage (shopdata.js: CAR_M('hatch', 3,8, 1,7)) met de carrosserie
// van TRAFFIC_MODELS. Hij moet net als een sedan een doorzichtig ruitdeel hebben: één transparant
// materiaal (groep 1, G_GLASS) met genoeg driehoeken om voorruit, zijruiten en achterruit te vullen.
const G_GLASS = 1;
function glasVan(mesh) {
  const geo = mesh.userData.body.geometry;
  const grp = geo.groups.find((q) => q.materialIndex === G_GLASS);
  const mat = mesh.userData.body.material[G_GLASS];
  if (!grp) return { grp: null, mat, driehoeken: 0, bbox: null, oppervlak: 0 };
  const p = geo.attributes.position.array;
  const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
  let oppervlak = 0;
  for (let i = grp.start; i < grp.start + grp.count; i++) for (let k = 0; k < 3; k++) {
    const c = p[i * 3 + k];
    if (c < min[k]) min[k] = c;
    if (c > max[k]) max[k] = c;
  }
  for (let i = grp.start; i < grp.start + grp.count; i += 3) {
    const o = i * 3;
    const ax = p[o + 3] - p[o], ay = p[o + 4] - p[o + 1], az = p[o + 5] - p[o + 2];
    const bx = p[o + 6] - p[o], by = p[o + 7] - p[o + 1], bz = p[o + 8] - p[o + 2];
    oppervlak += Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx) / 2;
  }
  return { grp, mat, driehoeken: grp.count / 3, bbox: { min, max }, oppervlak };
}

const knakker = bouw(modellen.get('hatch'));
const sedan = bouw(modellen.get('sedan'));
const gk = glasVan(knakker), gs = glasVan(sedan);
ok('knakker: glasdeel in de mesh', !!gk.grp && gk.driehoeken > 0, `${gk.driehoeken} driehoeken`);
ok('knakker: transparant ruitmateriaal', !!gk.mat && gk.mat.transparent === true && gk.mat.opacity < 1, gk.mat ? `opacity ${gk.mat.opacity}` : 'geen materiaal');
ok('knakker: evenveel glasdriehoeken als de sedan', gk.driehoeken === gs.driehoeken, `${gk.driehoeken} tegen ${gs.driehoeken}`);
ok('knakker: glasoppervlak als een sedan', gk.oppervlak > gs.oppervlak * 0.9, `${gk.oppervlak.toFixed(2)} m2 tegen ${gs.oppervlak.toFixed(2)} m2`);
// De ruit vult de cabine: van de raamlijn tot het dak en over de hele lengte van de cabine.
const P = { belt: 0.93, roof: 1.47 };
ok('knakker: glas boven de raamlijn', gk.bbox.min[1] >= P.belt - 0.06 && gk.bbox.max[1] <= P.roof + 0.02, `y ${gk.bbox.min[1].toFixed(2)}..${gk.bbox.max[1].toFixed(2)}`);
ok('knakker: glas over de hele cabine', gk.bbox.max[0] - gk.bbox.min[0] > 2.4, `x ${gk.bbox.min[0].toFixed(2)}..${gk.bbox.max[0].toFixed(2)}`);
// De ruiten staan tot tegen de carrosserie: op 0,84 van de breedte bleef er boven de raamlijn een
// gleuf tussen plaatswerk en glas waar je langs naar binnen keek, en leek de cabine open (#463).
const glasBreedte = gk.bbox.max[2] - gk.bbox.min[2];
ok('knakker: ruiten sluiten aan op de carrosserie', glasBreedte / 1.7 > 0.88 && glasBreedte < 1.7, `${glasBreedte.toFixed(2)} m van 1,70 m`);
for (const naam of ['sedan', 'wagon', 'sport']) {
  const m = modellen.get(naam);
  const g2 = glasVan(bouw(m));
  const w = g2.bbox.max[2] - g2.bbox.min[2];
  ok(naam + ': ruiten sluiten aan op de carrosserie', !!g2.grp && w / m.wid > 0.88 && w < m.wid, `${(w / m.wid).toFixed(2)} van de breedte`);
}
for (const m of [{ name: 'suv', len: 4.7, wid: 1.95, color: '#1b1c1f' }, { name: 'escort', len: 4.0, wid: 1.65, color: '#a11f1f' }]) {
  const g2 = glasVan(bouw(m));
  const w = g2.bbox.max[2] - g2.bbox.min[2];
  ok(m.name + ': ruiten sluiten aan op de carrosserie', !!g2.grp && w / m.wid > 0.88 && w < m.wid, `${(w / m.wid).toFixed(2)} van de breedte`);
}
// En het glas moet als glas te zien zijn: niet zo doorschijnend dat het verlichte interieur de cabine
// open laat lijken (#463), en niet zo glimmend dat de hemel er een witte plaat van maakt.
ok('knakker: ruit is dicht genoeg om als raam te lezen', gk.mat.opacity >= 0.55, `opacity ${gk.mat.opacity}`);
ok('knakker: ruit weerkaatst de hemel niet als een spiegel', (gk.mat.envMapIntensity || 0) <= 0.2, `envMapIntensity ${gk.mat.envMapIntensity}`);
// Een wrak houdt zijn dichte, doffe ramen; daar verandert niets aan.
const wrak = bouw(modellen.get('sedan'), { wrecked: true });
ok('wrak: geen doorschijnend glas', glasVan(wrak).mat.transparent !== true);

// --- 2. een fietswiel hoort bij een fietsframe --------------------------------------
// Elke tweewieler (en de bakfiets) bouwt zijn wielen los van de carrosserie, in dezelfde groep:
// group.userData.wheels. Zo'n lijst mag nooit een wiel bevatten zonder het frame erbij, want dan
// staat er een los wiel in de wereld (beeldronde #463: een zwarte ring met spaken op de klinkers).
const fietsModellen = [];
for (const m of TRAFFIC_MODELS()) if (['bike', 'scooter'].includes(m.name) && !fietsModellen.some((q) => q.name === m.name && !!q.fat === !!m.fat)) fietsModellen.push(m);
for (const m of TRAFFIC_MODELS()) if (m.name === 'bike' && m.fat) fietsModellen.push({ ...m, id: 'fat' });
const gevallen = [
  ['fiets', modellen.get('bike'), { isBike: true }],
  ['fatbike', { ...modellen.get('bike'), fat: true, len: 1.9, wid: 0.6 }, { isBike: true }],
  ['bakfiets', { ...modellen.get('bike'), cargo: true, len: 2.4, wid: 0.9 }, { isBike: true }],
  ['step', modellen.get('scooter'), { isScooter: true }],
  ['brommer', { ...modellen.get('scooter'), moped: true, len: 1.7, wid: 0.6 }, { isScooter: true }],
  ['motor', { ...modellen.get('scooter'), motorbike: 'naked', len: 2.05, wid: 0.7 }, { isScooter: true }],
];
for (const [naam, model, vlag] of gevallen) {
  const mesh = bouw(model, vlag);
  const wielen = mesh.userData.wheels || [];
  ok(naam + ': twee wielen', wielen.length >= 2, `${wielen.length} wielen`);
  // het frame: het eerste kind van de groep, een mesh met echte geometrie
  const frame = mesh.children[0];
  const frameVlakken = frame && frame.isMesh && frame.geometry.attributes.position ? frame.geometry.attributes.position.count / 3 : 0;
  ok(naam + ': frame in de mesh', frameVlakken > 20, `${frameVlakken} driehoeken`);
  ok(naam + ': frame en wielen in dezelfde groep', !!frame && frame.parent === mesh && wielen.every((w) => w.parent === mesh));
  // geen enkel wiel zonder frame: geen los wiel in de mesh-lijst
  ok(naam + ': geen los wiel', wielen.every((w) => w.isMesh && w.geometry && w.geometry.attributes.position.count > 0));
  // het frame staat ook echt om de wielen heen (wielassen binnen de framelengte)
  if (frameVlakken) {
    frame.geometry.computeBoundingBox();
    const b = frame.geometry.boundingBox;
    for (const w of wielen) ok(naam + ': wiel binnen het frame', Math.abs(w.position.x) <= Math.max(1.2, (b.max.x - b.min.x) / 2 + 0.6), `x ${w.position.x}`);
  }
}
// Een auto heeft geen wieldelen in de lijst zonder dat de carrosserie er is.
const auto = bouw(modellen.get('hatch'));
ok('auto: vier wielen bij de carrosserie', (auto.userData.wheels || []).length === 4 && auto.userData.body.isMesh);

// --- 3. rommel op straat ligt op de straat ------------------------------------------
// De losse fietswielen in de wereld komen uit de rommelatlas van streetclutter.js (buildBikeWheel).
// Die rommel werd altijd 15 cm opgetild, ook op een plein waar de bestrating op straathoogte ligt;
// daar hing het wiel boven de klinkers (#463).
const rommel = fs.readFileSync(new URL('../game/js/streetclutter.js', import.meta.url), 'utf8');
assert.match(rommel, /const y0 = hasSidewalk\(r\) && !gutter \? 0\.15 : 0;/);
assert.match(rommel, /item\(pick\(rng, P\.wheels\), null, lx, ly, a, \{ y0 \}\)/);
assert.doesNotMatch(rommel, /P\.wheels\), null, lx, ly, a, \{ y0: 0\.15 \}/, 'een fietswiel mag niet op een vaste 15 cm staan');

console.log(bad ? `${bad} mislukt` : 'voertuigmodel_test: ok');
process.exit(bad ? 1 : 0);
