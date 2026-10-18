// De flat inrichten (#206): plekken voor lamp en plant (game/js/inrichting.js).
//   node scripts/inrichting_test.mjs
import { PLEKKEN, VERPLAATSBAAR, schoonPlekken, plekVan, plekBezet, volgendePlek, opPlek, plekGeldig, isVerplaatsbaar } from '../game/js/inrichting.js';

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };

// de getallen van home.js (flat 11 x 9, muren en vaste meubels)
const W = 11, D = 9, HALL = 3.4, MID = 5.2, SPLIT = 7.2;
const flat = {
  w: W, d: D,
  walls: [[0, 0, 0, D], [W, 0, W, D], [0, D, W, D], [0, MID, 1.0, MID], [2.4, MID, HALL, MID], [HALL, MID, HALL, 6.2], [HALL, 7.4, HALL, D], [HALL, MID, 9.0, MID], [10.2, MID, W, MID], [SPLIT, MID, SPLIT, D], [0, 0, W, 0]],
  solids: [[2.4, 3.35, 5.0, 4.55], [3.0, 2.1, 4.4, 2.9], [2.8, 0.2, 4.6, 1.35], [0.2, 0.2, 0.9, 0.9], [7.1, 0.2, 10.9, 0.9], [10.1, 1.2, 10.9, 2.0], [7.6, 2.9, 8.8, 3.9], [6.1, 6.9, 7.1, 8.95], [7.3, 6.9, 8.3, 8.95], [3.85, 8.25, 5.55, 8.95], [10.3, 5.35, 10.95, 7.05]],
};

for (const p of Object.keys(PLEKKEN)) check('plek geldig ' + p, plekGeldig(p, flat));
check('plek op de bank is ongeldig', !(PLEKKEN.zzz) && !plekGeldig('zzz', flat));
for (const [id, v] of Object.entries(VERPLAATSBAAR)) {
  check(id + ': standaard in opties', v.opties.includes(v.standaard));
  check(id + ': opties bestaan', v.opties.every((o) => PLEKKEN[o]));
  check(id + ': standaard heeft nul verschuiving', opPlek(id, v.standaard).dx === 0 && opPlek(id, v.standaard).dz === 0);
}
check('standaard is gelijk aan furniture.js', PLEKKEN.h1.x === 0.6 && PLEKKEN.h1.z === 4.7 && PLEKKEN.h4.x === 10.5 && PLEKKEN.h4.z === 4.7);
check('alleen lamp en plant', isVerplaatsbaar('lamp') && isVerplaatsbaar('plant') && !isVerplaatsbaar('bank') && !isVerplaatsbaar('toString'));

// schoon opslaan
check('rommel wordt leeg', Object.keys(schoonPlekken(null)).length === 0 && Object.keys(schoonPlekken('x')).length === 0);
check('onbekende plek valt weg', !schoonPlekken({ lamp: 'h9' }).lamp, 'h9 bestaat niet');
check('onbekend meubel valt weg', !schoonPlekken({ bank: 'h1' }).bank);
check('dubbele plek valt weg', Object.keys(schoonPlekken({ lamp: 'h1', plant: 'h1' })).length === 1);
check('goede plek blijft', schoonPlekken({ plant: 'h5' }).plant === 'h5');

// verplaatsen
const eigen = new Set(['lamp', 'plant']);
let pl = {};
check('standaardplekken', plekVan(pl, 'lamp') === 'h1' && plekVan(pl, 'plant') === 'h4');
let n = volgendePlek(pl, eigen, 'lamp');
check('lamp gaat naar h2', n === 'h2', n);
pl.lamp = n;
n = volgendePlek(pl, eigen, 'plant'); pl.plant = n;
check('plant gaat naar h1 (nu vrij)', n === 'h1', n);
check('bezet wordt herkend', plekBezet(pl, eigen, 'lamp', 'h1') && !plekBezet(pl, eigen, 'lamp', 'h3'));
// alles vol: een plek terugvinden of null
pl = { lamp: 'h1' };
const veel = volgendePlek(pl, new Set(['lamp', 'plant']), 'lamp');
check('lamp slaat bezette plek over', veel !== 'h4' && veel !== null);
let cyc = {}; const seen = new Set();
for (let i = 0; i < 12; i++) { const x = volgendePlek(cyc, new Set(['lamp']), 'lamp'); cyc.lamp = x; seen.add(x); }
check('alleen lamp: loopt alle plekken door', seen.size === 5);
check('geen meubel, geen plek', volgendePlek({}, eigen, 'bank') === null);

const o = opPlek('plant', 'h5');
check('verschuiving klopt', Math.abs(o.dx - (4.0 - 10.5)) < 1e-9 && Math.abs(o.dz - (5.8 - 4.7)) < 1e-9);
check('blokje om het meubel', o.solid[0] < o.x && o.solid[2] > o.x && o.solid[1] < o.z && o.solid[3] > o.z);
check('onbekende plek geeft null', opPlek('lamp', 'zzz') === null && opPlek('bank', 'h1') === null);

console.log(bad ? `${bad} mislukt` : 'inrichting_test: alles goed');
process.exit(bad ? 1 : 0);
