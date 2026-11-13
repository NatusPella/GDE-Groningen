// De pure laadruimte-indeling van #847: vrachtruimte.js bouwt per voertuigtype de vloer, wanden,
// schappen en lading in voertuigcoördinaten. Deze test controleert zonder three.js dat elke maat
// eindig is, dat alles binnen de romp van het model blijft, dat elk type zijn eigen inhoud heeft, dat
// het aantal driehoeken per detailniveau strikt afneemt en dat de open/gesloten-regel klopt.
//   node scripts/vrachtruimte_test.mjs
import * as V from '../game/js/vrachtruimte.js';

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const fin = (n) => typeof n === 'number' && Number.isFinite(n);

// Een kaal voertuigobject: vrachtruimte.js leest alleen model, vlaggen en v.doors (geen three.js).
const voertuig = (model, flags = {}) => ({
  id: 1, x: 0, y: 0, z: 0, angle: 0,
  model: { len: 4.0, wid: 1.8, ...model },
  wrecked: false, doors: { open: {}, loose: {} },
  ...flags,
});
const model = (name, len, wid) => ({ name, len, wid });

// De gevallen die het spel echt heeft (lengtes/breedtes uit vehicle.js, trafficfleet.js en de
// sidejobmodellen; zie de commentaren in vrachtruimte.js).
const GEVALLEN = [
  ['bestelbus', voertuig(model('van', 5.0, 2.0)), 'bestelbus'],
  ['bestelbus-lang', voertuig(model('van', 7.2, 2.4)), 'bestelbus'],       // sidejob_stad.js vrachtwagen
  ['bestelbus-kort', voertuig(model('van', 5.4, 2.1)), 'bestelbus'],      // sidejob_bijbaan.js
  ['cashvan', voertuig(model('cashvan', 5.2, 2.0)), 'cashvan'],
  ['foodtruck', voertuig(model('foodtruck', 5.4, 2.1)), 'foodtruck'],
  ['ambulance', voertuig(model('ambulance', 6.0, 2.0), { isAmbulance: true }), 'ambulance'],
  ['vrachtwagen', voertuig(model('truck', 8.5, 2.5)), 'vrachtwagen'],
  ['vrachtwagen-kort', voertuig(model('truck', 6.6, 2.5)), 'vrachtwagen'], // sidejob_vracht.js trekker
  ['oplegger', voertuig({ name: 'oplegger', len: 12.8, wid: 2.55, trailerKind: 'koel' }), 'oplegger'],
  ['hatch', voertuig(model('hatch', 3.8, 1.7)), 'kofferbak'],
  ['sedan', voertuig(model('sedan', 4.3, 1.8)), 'kofferbak'],
  ['wagon', voertuig(model('wagon', 4.5, 1.8)), 'kofferbak'],
  ['suv', voertuig(model('suv', 4.7, 1.95)), 'kofferbak'],
  ['sport', voertuig(model('sport', 4.1, 1.85)), 'kofferbak'],
  ['escort', voertuig(model('escort', 4.0, 1.65)), 'kofferbak', { isHeroCar: true }],
  ['taxi', voertuig(model('taxi', 4.6, 1.8), { isTaxi: true }), 'kofferbak'],
  ['politie', voertuig(model('police', 4.3, 1.8), { isPolice: true }), 'kofferbak'],
];

// De halve afmetingen van een deel, inclusief een draaiing om z (de kapot-variant kantelt dozen).
function halve(d) {
  const r = d.rot || null;
  if (!r || (!r.x && !r.y && !r.z)) return [d.sx / 2, d.sy / 2, d.sz / 2];
  const cx = Math.cos(r.x || 0), sx = Math.sin(r.x || 0);
  const cy = Math.cos(r.y || 0), sy = Math.sin(r.y || 0);
  const cz = Math.cos(r.z || 0), sz = Math.sin(r.z || 0);
  // conservatieve AABB van een gedraaide doos: de som van de absolute bijdragen per as
  return [
    (Math.abs(d.sx * cz * cy) + Math.abs(d.sy * sz * cy) + Math.abs(d.sz * sy)) / 2,
    (Math.abs(d.sx * (sz * sx + cz * sy * cx)) + Math.abs(d.sy * (cz * cx - sz * sy * sx)) + Math.abs(d.sz * (cy * sx))) / 2,
    (Math.abs(d.sx * (sz * sy * cx - cz * sx)) + Math.abs(d.sy * (cz * sy * sx + sz * cx)) + Math.abs(d.sz * cy * cx)) / 2,
  ];
}

const binnenRomp = (d, romp) => {
  const [hx, hy, hz] = halve(d);
  return Math.abs(d.x) + hx <= romp.halveLengte + 0.03 &&
    Math.abs(d.z) + hz <= romp.halveBreedte + 0.03 &&
    d.y - hy >= 0.1 && d.y + hy <= romp.hoogte + 0.03;
};
const rond = (n) => (fin(n) ? +n.toFixed(2) : n);

const INHOUD = {
  bestelbus: ['pakket', 'krat', 'schap', 'spanband', 'gereedschap'],
  cashvan: ['geldkoffer', 'rek', 'geldzakken', 'kluis'],
  foodtruck: ['werkbank', 'friteuse', 'voorraad', 'gasfles', 'koelkast'],
  ambulance: ['brancard', 'kastjes', 'zuurstof', 'monitor'],
  vrachtwagen: ['pallet', 'kist', 'laadboom', 'spanband'],
  oplegger: ['pallet', 'container', 'laadboom'],
  kofferbak: ['koffer', 'boodschappen', 'reservewiel'],
};

// --- per geval: soort, maten, inhoud, romp en de LOD-trap ------------------------------------
const rijen = [];
for (const [naam, v, wilSoort] of GEVALLEN) {
  const soort = V.vrachtruimteSoort(v);
  check(`${naam}: soort ${wilSoort}`, soort === wilSoort, String(soort));
  const indeling = V.vrachtruimteIndeling(v);
  check(`${naam}: indeling aanwezig`, !!indeling);
  if (!indeling) continue;
  const m = indeling.maten, romp = indeling.romp;
  // de romp is het model zelf: nooit breder of langer dan de carrosserie
  check(`${naam}: romp klopt met het model`, rond(romp.halveLengte) === rond(v.model.len / 2) && rond(romp.halveBreedte) === rond(v.model.wid / 2), `${romp.halveLengte} x ${romp.halveBreedte}`);
  for (const k of ['len', 'wid', 'x0', 'x1', 'floor', 'ceil', 'hw', 'roof', 'openingY0', 'openingH', 'openingBreedte']) {
    check(`${naam}: maat ${k} eindig`, fin(m[k]), String(m[k]));
  }
  check(`${naam}: laadruimte heeft lengte`, m.x0 < m.x1, `${m.x0}..${m.x1}`);
  check(`${naam}: vloer onder plafond`, m.floor < m.ceil, `${m.floor} < ${m.ceil}`);
  check(`${naam}: halve breedte positief en binnen de romp`, m.hw > 0.1 && m.hw <= romp.halveBreedte + 0.001, `${m.hw} / ${romp.halveBreedte}`);
  check(`${naam}: laadruimte binnen de romp in x`, m.x0 >= -romp.halveLengte - 0.01 && m.x1 <= romp.halveLengte + 0.01, `${m.x0}..${m.x1} in ${romp.halveLengte}`);
  check(`${naam}: binnen de romp in y`, m.floor >= 0.25 && m.ceil <= romp.hoogte + 0.01, `${m.floor}..${m.ceil} in ${romp.hoogte}`);
  check(`${naam}: opening boven de vloer`, m.openingY0 >= m.floor - 0.15 && m.openingY0 + m.openingH >= m.ceil - 0.15, `${m.openingY0} + ${m.openingH}`);
  // elk deel: eindig, echte afmetingen, geldige kleur en binnen de romp
  let onzin = 0, buiten = 0;
  for (const d of indeling.delen) {
    if (!['x', 'y', 'z', 'sx', 'sy', 'sz'].every((k) => fin(d[k])) || !Number.isInteger(d.color) || d.color < 0 || d.color > 0xffffff) onzin++;
    if (!(d.sx > 0.005 && d.sy > 0.005 && d.sz > 0.005)) onzin++;
    if (!binnenRomp(d, romp)) { buiten++; if (buiten <= 3) console.log('  buiten de romp:', naam, d.id, JSON.stringify({ x: rond(d.x), y: rond(d.y), z: rond(d.z), sx: rond(d.sx), sy: rond(d.sy), sz: rond(d.sz) })); }
  }
  check(`${naam}: alle delen eindig en met echte maten`, onzin === 0, String(onzin));
  check(`${naam}: alle delen binnen de romp`, buiten === 0, String(buiten));
  // eigen inhoud per soort
  const ids = new Set(indeling.delen.map((d) => d.id));
  const heeft = (prefix) => [...ids].some((id) => id === prefix || id.startsWith(prefix + '-') || id.startsWith(prefix));
  for (const prefix of INHOUD[soort]) check(`${naam}: inhoud ${prefix}`, heeft(prefix), [...ids].join(','));
  // de LOD-trap: strikt minder delen (en dus driehoeken) per niveau, en flink minder op het verre niveau
  const n0 = V.vrachtruimteDelen(v, { lod: 0 }).length;
  const n1 = V.vrachtruimteDelen(v, { lod: 1 }).length;
  const n2 = V.vrachtruimteDelen(v, { lod: 2 }).length;
  check(`${naam}: LOD-trap strikt aflopend (${n0} > ${n1} > ${n2})`, n0 > n1 && n1 > n2, `${n0} > ${n1} > ${n2}`);
  check(`${naam}: lod 1 minstens 25% minder`, n1 <= 0.75 * n0, `${n0} -> ${n1}`);
  check(`${naam}: lod 2 minstens 50% minder`, n2 <= 0.5 * n0, `${n0} -> ${n2}`);
  check(`${naam}: elk niveau heeft een vloer`, [[0, 1, 2].every((lod) => V.vrachtruimteDelen(v, { lod }).some((d) => d.id === 'vloer'))].every(Boolean));
  rijen.push({ naam, soort, n0, n1, n2, delen: indeling.delen.length });
}

// --- de kapot-variant voor een wrak ---------------------------------------------------------
for (const [naam, v] of GEVALLEN) {
  const heel = V.vrachtruimteIndeling(v);
  const wrak = voertuig({ ...v.model }, { ...v, wrecked: true });
  const kapot = V.vrachtruimteIndeling(wrak);
  check(`${naam}: wrak heeft een kapotte indeling`, !!kapot && kapot.kapot === true);
  if (!kapot) continue;
  const ids = kapot.delen.map((d) => d.id);
  check(`${naam}: kapot heeft rooksporen`, ids.includes('rookspoor'));
  check(`${naam}: kapot heeft omgevallen lading`, ids.includes('omgevallen-lading'));
  check(`${naam}: kapot heeft meer delen dan heel`, kapot.delen.length > heel.delen.length, `${heel.delen.length} -> ${kapot.delen.length}`);
  check(`${naam}: kapot wijkt af van heel`, kapot.delen.some((d) => d.rot), 'geen enkel deel gekanteld');
  let buiten = 0;
  for (const d of kapot.delen) if (!binnenRomp(d, kapot.romp)) { buiten++; if (buiten <= 2) console.log('  kapot buiten de romp:', naam, d.id, JSON.stringify({ x: rond(d.x), y: rond(d.y), z: rond(d.z) })); }
  check(`${naam}: kapotte lading blijft binnen de romp`, buiten === 0, String(buiten));
  // de kapot-variant is met vrachtruimteDelen te forceren, ook op een heel voertuig
  const geforceerd = V.vrachtruimteDelen(v, { kapot: true });
  check(`${naam}: kapot te forceren via vrachtruimteDelen`, geforceerd.some((d) => d.id === 'rookspoor'));
  check(`${naam}: heel te forceren via vrachtruimteDelen`, !V.vrachtruimteDelen(wrak, { kapot: false }).some((d) => d.id === 'rookspoor'));
}

// --- de open/gesloten-regel ----------------------------------------------------------------
{
  const van = voertuig(model('van', 5.0, 2.0));
  check('bestelbus: dicht is verborgen', V.vrachtruimteZichtbaar(van) === false);
  check('bestelbus: geen deurstate geeft niets', V.vrachtruimteZichtbaar({ ...van, doors: null }) === false);
  check('bestelbus: zonder model geeft niets', V.vrachtruimteZichtbaar({}) === false);
  const klep = V.laadopeningen(van).deuren;
  check('bestelbus: laadopeningen zijn de klep en de schuifdeur', klep.includes('klep') && klep.includes('sl'), JSON.stringify(klep));
  check('bestelbus: cabineportier telt niet mee', !klep.includes('vl') && !klep.includes('vr'));
  van.doors.open.klep = 0.2;
  check('bestelbus: kier van 20 cm toont de lading', V.vrachtruimteZichtbaar(van) === false, `drempel ${V.LAADRUIMTE_OPEN_VANAF}`);
  van.doors.open.klep = V.LAADRUIMTE_OPEN_VANAF + 0.01;
  check('bestelbus: klep open toont de lading', V.vrachtruimteZichtbaar(van) === true);
  delete van.doors.open.klep;
  van.doors.open.sl = 1;
  check('bestelbus: schuifdeur open toont de lading', V.vrachtruimteZichtbaar(van) === true);
  delete van.doors.open.sl;
  van.doors.loose.klep = true;
  check('bestelbus: losse klep toont de lading', V.vrachtruimteZichtbaar(van) === true);
  delete van.doors.loose.klep;
  van.wrecked = true;
  check('bestelbus: wrak toont de lading', V.vrachtruimteZichtbaar(van) === true);
  van.wrecked = false;
  van.doors.open.vl = 1;
  check('bestelbus: open portier toont de laadruimte niet', V.vrachtruimteZichtbaar(van) === false);

  const food = voertuig(model('foodtruck', 5.4, 2.1));
  check('foodtruck: het luik staat altijd open', V.vrachtruimteZichtbaar(food) === true);
  check('foodtruck: vaste opening in de indeling', V.laadopeningen(food).vasteOpening === true);

  const ambulance = voertuig(model('ambulance', 6.0, 2.0), { isAmbulance: true });
  check('ambulance: dicht is verborgen', V.vrachtruimteZichtbaar(ambulance) === false);
  ambulance.doors.open.klep = 1;
  check('ambulance: achterdeur open toont de laadruimte', V.vrachtruimteZichtbaar(ambulance) === true);

  const wagon = voertuig(model('wagon', 4.5, 1.8));
  check('kofferbak wagon: dicht is verborgen', V.vrachtruimteZichtbaar(wagon) === false);
  wagon.doors.open.klep = 1;
  check('kofferbak wagon: klep open toont de kofferbak', V.vrachtruimteZichtbaar(wagon) === true);
  const hatch = voertuig(model('hatch', 3.8, 1.7));
  hatch.doors.open.klep = 1;
  check('kofferbak hatch: klep open toont de kofferbak', V.vrachtruimteZichtbaar(hatch) === true);

  // vrachtwagen, cashvan en oplegger hebben geen laadklep in DEUR_DEFS: de virtuele laaddeur
  for (const [naam, v] of [['vrachtwagen', voertuig(model('truck', 8.5, 2.5))], ['cashvan', voertuig(model('cashvan', 5.2, 2.0))], ['oplegger', voertuig({ name: 'oplegger', len: 12.8, wid: 2.55 })]]) {
    check(`${naam}: dicht is verborgen`, V.vrachtruimteZichtbaar(v) === false);
    check(`${naam}: virtuele laaddeur in de openingen`, V.laadopeningen(v).deuren.includes(V.VIRTUELE_LAADDEUR));
    v.doors.open[V.VIRTUELE_LAADDEUR] = 1;
    check(`${naam}: laaddeur open toont de laadruimte`, V.vrachtruimteZichtbaar(v) === true);
    v.doors.open[V.VIRTUELE_LAADDEUR] = 0;
    v.doors.loose[V.VIRTUELE_LAADDEUR] = true;
    check(`${naam}: losse laaddeur toont de laadruimte`, V.vrachtruimteZichtbaar(v) === true);
    v.doors.loose = {};
    v.wrecked = true;
    check(`${naam}: wrak toont de laadruimte`, V.vrachtruimteZichtbaar(v) === true);
  }

  // geen laadruimte voor fiets, bus, boot en trein
  for (const [naam, v] of [['bus', voertuig(model('bus', 11.2, 2.55), { isBus: true })], ['fiets', voertuig(model('bike', 1.75, 0.5), { isBike: true })], ['boot', voertuig(model('sloep', 6, 2), { isBoat: true })]]) {
    check(`${naam}: geen laadruimte-soort`, V.vrachtruimteSoort(v) === null);
    check(`${naam}: geen indeling`, V.vrachtruimteIndeling(v) === null);
    check(`${naam}: niets zichtbaar`, V.vrachtruimteZichtbaar(v) === false);
    check(`${naam}: geen delen`, V.vrachtruimteDelen(v, { lod: 0 }).length === 0);
  }
}

// --- de losse oplegger van sidejob_vracht.js -------------------------------------------------
for (const [kind, wilLen] of [['koel', 12.8], ['zeil', 13.6], ['bak', 9.5]]) {
  const indeling = V.opleggerIndeling(kind);
  check(`oplegger ${kind}: indeling aanwezig`, !!indeling && indeling.soort === 'oplegger');
  if (!indeling) continue;
  check(`oplegger ${kind}: lengte uit semitrailer.js`, rond(indeling.maten.len) === wilLen, `${indeling.maten.len}`);
  check(`oplegger ${kind}: lading binnen de bak`, indeling.delen.every((d) => binnenRomp(d, indeling.romp)));
  if (kind === 'bak') {
    // de kipper is geen gesloten bak met pallets maar een hoop zand met een kiepcilinder
    check('oplegger bak: zand en kiepcilinder', indeling.delen.some((d) => d.id === 'zand') && indeling.delen.some((d) => d.id === 'kiepcilinder'));
  } else {
    check(`oplegger ${kind}: pallets en containers`, indeling.delen.some((d) => d.id.startsWith('pallet')) && indeling.delen.some((d) => d.id.startsWith('container')));
  }
}
check('oplegger: onbekend soort valt terug op koel', V.opleggerIndeling('onzin').maten.len === 12.8);

// --- rapport --------------------------------------------------------------------------------
console.log('vrachtruimte: aantal delen per LOD (driehoeken = 12 per doos):');
for (const r of rijen) console.log(`  ${r.naam.padEnd(16)} ${String(r.n0).padStart(3)} > ${String(r.n1).padStart(3)} > ${String(r.n2).padStart(3)}  (${r.n0 * 12} > ${r.n1 * 12} > ${r.n2 * 12} driehoeken, heel ${r.delen} delen)`);
console.log(bad ? `${bad} mislukt` : `vrachtruimte_test: ok (${GEVALLEN.length} voertuigen + ${Object.keys(V.VRACHTRUIMTE_SOORTEN).length ? V.VRACHTRUIMTE_SOORTEN.length : 0} soorten)`);
process.exit(bad ? 1 : 0);
