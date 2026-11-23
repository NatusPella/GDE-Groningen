// De ruimtes van akte 1 op eindniveau (23-11): de keuken van de opening en de flat van Tammo en Tessa. Puur (geen three):
//   - elke ruimte is ingericht met meubels uit het interieurregister (minstens N per kamer), niets anders;
//   - alles staat binnen de wanden, niet in elkaar (behalve een stoel half onder de tafel en alles op een kleed) en niet in de lucht
//     (op de vloer, of op het meubel dat `op` noemt);
//   - de plekken waar personages staan, waar de speler verschijnt of iets gebruikt blijven vrij;
//   - de bouwers tekenen geen meubels meer als losse dozen (alleen bouw: wanden, plinten, kozijn, en de verhaalrekwisieten).
//   node scripts/akte1_sets_test.mjs
import fs from 'node:fs';
import { KITCHEN_DRESSING, KITCHEN_ROOM, KITCHEN_HALL, KITCHEN_FREE, FLAT_DRESSING, FLAT_ROOMS_MIN, footprint } from '../game/js/akte1sets.js';
import { INTERIEUR_REGISTER, INTERIEUR_IDS, isInterieurProp } from '../game/js/propregister.js';
import { INTERIOR_PROP_DATA } from '../game/js/interiorprops_data.js';
import { makeFlatPlan } from '../game/js/flatplan.js';

let bad = 0, n = 0;
const ok = (name, c, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info); } };
const maatVan = (id) => { const d = INTERIOR_PROP_DATA[id]; return d ? [d.box[3], d.box[4], d.box[5]] : null; };
const binnen = (fp, r, marge = 0.02) => fp.u0 >= r.u0 - marge && fp.u1 <= r.u1 + marge && fp.v0 >= r.v0 - marge && fp.v1 <= r.v1 + marge;
const overlap = (a, b, marge = 0.02) => a.u0 < b.u1 - marge && b.u0 < a.u1 - marge && a.v0 < b.v1 - marge && b.v0 < a.v1 - marge;
const vlak = (id) => id === 'vloerkleed';
const MAG_OVERLAP = new Set(['keukenstoel|keukentafel', 'keukenstoel|bureau']);
const magOverlap = (a, b) => vlak(a.id) || vlak(b.id) || MAG_OVERLAP.has(a.id + '|' + b.id) || MAG_OVERLAP.has(b.id + '|' + a.id) || (a.op && b.id === a.op) || (b.op && a.id === b.op);

// De regels van één ruimte: geregistreerd, binnen, niet in elkaar, niet zwevend, vrije plekken vrij.
function keur(naam, lijst, ruimte, vrij) {
  const fps = [];
  for (const e of lijst) {
    ok(`${naam}: ${e.id} staat in het interieurregister`, isInterieurProp(e.id));
    const maat = maatVan(e.id);
    if (!maat) continue;
    const fp = footprint(e, maat);
    fps.push({ e, fp });
    const r = ruimte(e);
    if (r) ok(`${naam}: ${e.id} op (${e.u}, ${e.v}) binnen de wanden`, binnen(fp, r), JSON.stringify(fp));
    if (r && r.h) ok(`${naam}: ${e.id} onder het plafond`, fp.top <= r.h + 0.01, fp.top.toFixed(2));
    ok(`${naam}: ${e.id} staat op de vloer of op iets`, (e.h || 0) === 0 || !!e.op);
  }
  // wat op een ander meubel staat, staat op de bovenkant ervan
  for (const { e, fp } of fps) {
    if (!e.op || ['wand', 'plafond'].includes(e.op)) continue;
    const onder = fps.find((o) => o.e.id === e.op && Math.abs(o.e.u - e.u) < 0.5 && Math.abs(o.e.v - e.v) < 0.5);
    ok(`${naam}: ${e.id} staat op ${e.op}`, !!onder && Math.abs(onder.fp.top - e.h) < 0.04 && fp.u0 >= onder.fp.u0 - 0.1 && fp.u1 <= onder.fp.u1 + 0.1, onder ? `bovenkant ${onder.fp.top.toFixed(2)}, h ${e.h}` : 'niet gevonden');
  }
  // niet in elkaar (alleen meubels op dezelfde laag: vloer met vloer)
  for (let i = 0; i < fps.length; i++) for (let j = i + 1; j < fps.length; j++) {
    const a = fps[i], b = fps[j];
    if ((a.e.in || '') !== (b.e.in || '') || a.e.in === 'deur') continue;
    if ((a.e.h || 0) !== 0 || (b.e.h || 0) !== 0 || magOverlap(a.e, b.e)) continue;
    ok(`${naam}: ${a.e.id} en ${b.e.id} staan niet in elkaar`, !overlap(a.fp, b.fp), JSON.stringify([a.fp, b.fp]));
  }
  // de plekken van personages en speler blijven vrij (een kleed mag eronder)
  for (const [u, v, r, wat] of vrij) {
    const raak = fps.find(({ e, fp }) => !vlak(e.id) && (e.h || 0) < 1.2 && (e.in || '') !== 'deur' && u + r > fp.u0 && u - r < fp.u1 && v + r > fp.v0 && v - r < fp.v1);
    ok(`${naam}: plek ${wat || ''} (${u}, ${v}) blijft vrij`, !raak, raak && raak.e.id);
  }
  return fps;
}

// --- de keuken van de opening --------------------------------------------------------------------------------------------------
const keuken = keur('keuken', KITCHEN_DRESSING, (e) => (e.in === 'gang' ? KITCHEN_HALL : e.in === 'deur' ? null : KITCHEN_ROOM),
  KITCHEN_FREE.map(([u, v, r]) => [u, v, r, 'staplek']));
ok('keuken: minstens 14 meubels', KITCHEN_DRESSING.filter((e) => !e.in).length >= 14, KITCHEN_DRESSING.length);
for (const soort of ['keukenkast', 'fornuis', 'koelkast', 'keukentafel', 'keukenstoel', 'hanglamp', 'raam', 'deur', 'kamerplant']) {
  ok('keuken heeft een ' + soort, KITCHEN_DRESSING.some((e) => e.id === soort));
}
ok('keuken: twee stoelen, één per kant van de tafel', KITCHEN_DRESSING.filter((e) => e.id === 'keukenstoel').map((e) => Math.sign(e.u)).sort().join() === '-1,1');
ok('keuken: de gang achter de deur is ingericht (geen zwart gat, VQA 23-11 #4)', KITCHEN_DRESSING.filter((e) => e.in === 'gang').length >= 2);
void keuken;

// --- de flat van Tammo en Tessa -----------------------------------------------------------------------------------------------
const FP = makeFlatPlan();
const flatRuimte = { u0: 0, u1: FP.w, v0: 0, v1: FP.d, h: 2.8 };
const kamerVan = (u, v) => FP.rooms.find((r) => u >= r.x0 && u < r.x1 && v >= r.z0 && v < r.z1);
const vrij = [
  ...Object.entries(FP.use).map(([k, p]) => [p.x, p.z, 0.2, 'gebruik ' + k]),
  ...FP.spawn.slice(0, 1).map(([x, z]) => [x, z, 0.25, 'verschijnen']),
  [FP.entry[0], FP.entry[1], 0.25, 'uit de lift'],
];
const flat = keur('flat', FLAT_DRESSING, () => flatRuimte, vrij);
for (const r of FP.rooms) {
  const aantal = FLAT_DRESSING.filter((e) => { const k = kamerVan(e.u, e.v); return k && k.name === r.name; }).length;
  ok(`flat: ${r.name} heeft genoeg meubels`, r.name === 'gang' ? aantal >= 1 : aantal >= FLAT_ROOMS_MIN, aantal);
}
ok('flat: geen hanglampen boven de cutaway (die zweven in beeld)', !FLAT_DRESSING.some((e) => e.op === 'plafond'));
// een meubel staat niet dwars door een binnenwand (de cutaway-wanden van flatplan.js, 0,14 m dik)
for (const { e, fp } of flat) {
  if (vlak(e.id)) continue;
  for (const [x1, z1, x2, z2] of FP.walls) {
    const wfp = { u0: Math.min(x1, x2) - 0.07, u1: Math.max(x1, x2) + 0.07, v0: Math.min(z1, z2) - 0.07, v1: Math.max(z1, z2) + 0.07 };
    ok(`flat: ${e.id} op (${e.u}, ${e.v}) niet door de wand ${[x1, z1, x2, z2]}`, !overlap(fp, wfp, 0.03));
  }
}
// wat de EIKEA-meubels vervangen (furniture.js) heet in de flat zoals in de skip-lijst van home.js
ok('flat: vervangt alleen bank, tv en bed', FLAT_DRESSING.every((e) => !e.vervangt || ['bank', 'tv', 'bed'].includes(e.vervangt)));

// --- het register volgt het gebruik -----------------------------------------------------------------------------------------------
for (const id of INTERIEUR_IDS) {
  const inK = KITCHEN_DRESSING.some((e) => e.id === id), inF = FLAT_DRESSING.some((e) => e.id === id);
  ok(`register: ${id} wordt gebruikt (alleen gebruikte meubels in git)`, inK || inF);
  const g = INTERIEUR_REGISTER[id].gebruik;
  ok(`register: gebruik van ${id} klopt (${g})`, g.includes('keuken') === inK && g.includes('flat') === inF);
}

// --- de bouwers tekenen geen meubels als dozen ---------------------------------------------------------------------------------------
const bron = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
const keukenBron = bron('introkitchen3d.js');
const body = keukenBron.slice(keukenBron.indexOf('export function buildKitchen'), keukenBron.indexOf('export function buildAtmTrailer'));
const dozen = (body.match(/\bbox\(/g) || []).length;
ok('keuken: alleen bouw en verhaalrekwisieten als doos (hoogstens 10: plinten, vensterbank, deurkozijn, pen, radioantenne)', dozen <= 10, dozen);
ok('keuken: geen kegel- of cilinderlamp meer', !/ConeGeometry/.test(body));
ok('keuken: meubels uit het register', /KITCHEN_DRESSING/.test(body) && /interiorProp\(/.test(body));
ok('keuken: geen gestreepte muur meer', !/fillRect\(x, 0, 12, h\)/.test(keukenBron));
const homeBron = bron('home3d.js');
const flatBody = homeBron.slice(homeBron.indexOf('export function buildFlat3D'), homeBron.indexOf('export function setFlatFacade'));
ok('flat: meubels uit het register', /FLAT_DRESSING/.test(flatBody) && /interiorProp\(/.test(flatBody));
ok('flat: geen bank, bed, kast of tafel meer als doos', !/M\.sofa|M\.duvet|M\.fridge|wardrobe/.test(flatBody));
ok('flat: geen zwevende lampvlakken boven de kamers', !/M\.lamp/.test(flatBody));
ok('flat: licht per kamer (geleend van de nachtrig)', (flatBody.match(/adoptSetLight/g) || []).length >= 1);

console.log(bad ? `akte1_sets_test: ${bad} van ${n} fout` : `akte1_sets_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
