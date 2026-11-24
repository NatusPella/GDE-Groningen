// De ruimtes van akte 1 op eindniveau (23-11): de keuken van de opening en de flat van Tammo en Tessa. Puur (geen three):
//   - elke ruimte is ingericht met meubels uit het interieurregister (minstens N per kamer), niets anders;
//   - alles staat binnen de wanden, niet in elkaar (behalve een stoel half onder de tafel en alles op een kleed) en niet in de lucht
//     (op de vloer, of op het meubel dat `op` noemt);
//   - de plekken waar personages staan, waar de speler verschijnt of iets gebruikt blijven vrij;
//   - de bouwers tekenen geen meubels meer als losse dozen (alleen bouw: wanden, plinten, kozijn, en de verhaalrekwisieten).
//   node scripts/akte1_sets_test.mjs
import fs from 'node:fs';
import { KITCHEN_DRESSING, KITCHEN_ROOM, KITCHEN_HALL, KITCHEN_FREE, FLAT_DRESSING, FLAT_ROOMS_MIN, footprint } from '../game/js/akte1sets.js';
import { INTERIEUR_REGISTER, INTERIEUR_IDS, isInterieurProp, PROP_REGISTER } from '../game/js/propregister.js';
import { INTERIOR_PROP_DATA } from '../game/js/interiorprops_data.js';
import { makeFlatPlan } from '../game/js/flatplan.js';

let bad = 0, n = 0;
const ok = (name, c, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info); } };
// de maat van een regel: uit de omgezette meubeldata, of voor een prop uit het propregister uit zijn norm
const maatVan = (id, prop = false) => { if (prop) return PROP_REGISTER[id] ? PROP_REGISTER[id].norm.maat : null; const d = INTERIOR_PROP_DATA[id]; return d ? [d.box[3], d.box[4], d.box[5]] : null; };
const geregistreerd = (e) => (e.prop ? !!PROP_REGISTER[e.id] && PROP_REGISTER[e.id].gebruik.includes('interieur') : isInterieurProp(e.id));
const binnen = (fp, r, marge = 0.02) => fp.u0 >= r.u0 - marge && fp.u1 <= r.u1 + marge && fp.v0 >= r.v0 - marge && fp.v1 <= r.v1 + marge;
const overlap = (a, b, marge = 0.02) => a.u0 < b.u1 - marge && b.u0 < a.u1 - marge && a.v0 < b.v1 - marge && b.v0 < a.v1 - marge;
const vlak = (id) => id === 'vloerkleed';
const MAG_OVERLAP = new Set(['keukenstoel|keukentafel', 'keukenstoel|bureau']);
const magOverlap = (a, b) => vlak(a.id) || vlak(b.id) || MAG_OVERLAP.has(a.id + '|' + b.id) || MAG_OVERLAP.has(b.id + '|' + a.id) || (a.op && b.id === a.op) || (b.op && a.id === b.op) || a.op === 'wand' || b.op === 'wand';

// De regels van één ruimte: geregistreerd, binnen, niet in elkaar, niet zwevend, vrije plekken vrij.
function keur(naam, lijst, ruimte, vrij) {
  const fps = [];
  for (const e of lijst) {
    ok(`${naam}: ${e.id} staat in het interieur- of propregister`, geregistreerd(e));
    const maat = maatVan(e.id, e.prop);
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
    if (!e.op || ['wand', 'plafond', 'vloer'].includes(e.op)) continue;
    const onder = fps.find((o) => o.e.id === e.op && e.u >= o.fp.u0 - 0.05 && e.u <= o.fp.u1 + 0.05 && e.v >= o.fp.v0 - 0.05 && e.v <= o.fp.v1 + 0.05);
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
  if (vlak(e.id) || e.op === 'wand') continue; // wat aan een wand hangt, raakt hem
  for (const [x1, z1, x2, z2] of FP.walls) {
    const wfp = { u0: Math.min(x1, x2) - 0.07, u1: Math.max(x1, x2) + 0.07, v0: Math.min(z1, z2) - 0.07, v1: Math.max(z1, z2) + 0.07 };
    ok(`flat: ${e.id} op (${e.u}, ${e.v}) niet door de wand ${[x1, z1, x2, z2]}`, !overlap(fp, wfp, 0.03));
  }
}
// wat de EIKEA-meubels vervangen (furniture.js) heet in de flat zoals in de skip-lijst van home.js
ok('flat: vervangt alleen bank, tv, bed en frituur', FLAT_DRESSING.every((e) => !e.vervangt || ['bank', 'tv', 'bed', 'frituur'].includes(e.vervangt)));

// --- zitmeubels kijken naar wat ze moeten zien (23-11, beeldcontrole coördinator: de bank en de tv keken langs elkaar) ------------
// De voorkant van een zitmeubel (rot 0 = +u, three-zin: richting (cos rot, -sin rot)) wijst binnen 35 graden naar zijn focus: de bank
// naar de tv, een stoel naar de dichtstbijzijnde tafel of het dichtstbijzijnde bureau (hoogstens 1,5 m).
const FOCUS = { zitbank: { ids: ['tv'], max: 4 }, keukenstoel: { ids: ['keukentafel', 'bureau'], max: 1.5 } };
for (const [naam, lijst] of [['keuken', KITCHEN_DRESSING], ['flat', FLAT_DRESSING]]) {
  for (const e of lijst) {
    const f = FOCUS[e.id];
    if (!f) continue;
    const doelen = lijst.filter((o) => o !== e && f.ids.includes(o.id) && (o.in || '') === (e.in || '')).map((o) => ({ o, d: Math.hypot(o.u - e.u, o.v - e.v) })).sort((a, b) => a.d - b.d);
    const doel = doelen[0];
    ok(`${naam}: ${e.id} op (${e.u}, ${e.v}) heeft een focus (${f.ids.join('/')}) binnen ${f.max} m`, !!doel && doel.d <= f.max, doel && doel.d.toFixed(2));
    if (!doel) continue;
    const fu = Math.cos(e.rot || 0), fv = -Math.sin(e.rot || 0);
    const du = (doel.o.u - e.u) / doel.d, dv = (doel.o.v - e.v) / doel.d;
    const hoek = Math.acos(Math.max(-1, Math.min(1, fu * du + fv * dv))) * 180 / Math.PI;
    ok(`${naam}: ${e.id} op (${e.u}, ${e.v}) kijkt naar ${doel.o.id}`, hoek <= 35, hoek.toFixed(0) + ' graden');
  }
}
// en wat er tegenover elkaar staat, kijkt ook terug: de tv wijst naar de bank
for (const tv of FLAT_DRESSING.filter((e) => e.id === 'tv')) {
  const bank = FLAT_DRESSING.find((e) => e.id === 'zitbank');
  const d = Math.hypot(bank.u - tv.u, bank.v - tv.v);
  const hoek = Math.acos(Math.cos(tv.rot) * (bank.u - tv.u) / d + -Math.sin(tv.rot) * (bank.v - tv.v) / d) * 180 / Math.PI;
  ok('flat: de tv kijkt naar de bank', hoek <= 20, hoek.toFixed(0) + ' graden');
}
// de woonkamer van twee net-afgestudeerden: wat er minstens staat
const woon = FLAT_DRESSING.filter((e) => e.u < 6.8 && e.v < 5.2);
for (const id of ['zitbank', 'tv', 'salontafel', 'vloerkleed', 'boekenkast', 'bureau', 'laptop', 'vloerlamp', 'kamerplant', 'verhuisdozen', 'droogrek']) ok(`flat: de woonkamer heeft een ${id}`, woon.some((e) => e.id === id));
ok('flat: prints of posters aan de muur (verzonnen, uit het propregister)', woon.filter((e) => e.id === 'lijst' || e.id === 'poster').length >= 2);
// looproutes: van de gangdeur naar het raam (x 1,4-2,3) en langs het raam naar de keuken (z 1,4-1,9 tussen het tv-meubel en de tafel)
const vrijeStrook = (u0, u1, v0, v1) => !woon.some((e) => { if (vlak(e.id) || e.op === 'wand' || (e.h || 0) > 0) return false; const m = maatVan(e.id, e.prop); const fp = m && footprint(e, m); return fp && overlap(fp, { u0, u1, v0, v1 }, 0.01); });
ok('flat: looproute van de gangdeur naar het raam vrij', vrijeStrook(1.4, 2.3, 0.3, 5.1));
ok('flat: looproute tussen tv-meubel en bijzettafel vrij', vrijeStrook(2.5, 4.9, 1.4, 2.0));

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
ok('keuken: alleen bouw en verhaalrekwisieten als doos (hoogstens 8: plinten, vensterbank, deurkozijn, pen)', dozen <= 8, dozen);
ok('keuken: geen kegel- of cilinderlamp meer', !/ConeGeometry/.test(body));
ok('keuken: meubels uit het register', /KITCHEN_DRESSING/.test(body) && /interiorProp\(/.test(body));
ok('keuken: geen gestreepte muur meer', !/fillRect\(x, 0, 12, h\)/.test(keukenBron));
const homeBron = bron('home3d.js');
const flatBody = homeBron.slice(homeBron.indexOf('export function buildFlat3D'), homeBron.indexOf('export function setFlatFacade'));
ok('flat: meubels uit het register', /FLAT_DRESSING/.test(flatBody) && /interiorProp\(/.test(flatBody));
ok('flat: geen bank, bed, kast of tafel meer als doos', !/M\.sofa|M\.duvet|M\.fridge|wardrobe/.test(flatBody));
ok('flat: geen zwevende lampvlakken boven de kamers', !/M\.lamp/.test(flatBody));
ok('flat: licht per kamer (geleend van de nachtrig)', (flatBody.match(/adoptSetLight/g) || []).length >= 1);
// tv, frituurpan en radio: echte props uit het propregister (de packs hebben ze niet), geen dozen meer
ok('flat: tv en frituurpan uit het propregister', ['tv', 'frituurpan'].every((id) => FLAT_DRESSING.some((e) => e.id === id && e.prop)) && /registeredProp\(/.test(flatBody) && !/M\.tvScreen|M\.oil/.test(flatBody));
ok('keuken: de radio uit het propregister, zonder canvasfront', /registeredProp\('buisradio'/.test(body) && !/radioTex/.test(keukenBron));
for (const id of ['tv', 'frituurpan', 'buisradio']) ok(`propregister: ${id} staat erin met gebruik interieur`, !!PROP_REGISTER[id] && PROP_REGISTER[id].gebruik.includes('interieur'));

console.log(bad ? `akte1_sets_test: ${bad} van ${n} fout` : `akte1_sets_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
