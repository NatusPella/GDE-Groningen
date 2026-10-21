// De flat inrichten (#206): plekken voor lamp en plant (game/js/inrichting.js).
//   node scripts/inrichting_test.mjs
import fs from 'node:fs';
import { PLEKKEN, WANDPLEKKEN, BANKPLEKKEN, BEDPLEKKEN, STOCK_BLOKJES, zonderStock, plekInfo, VERPLAATSBAAR, schoonPlekken, plekVan, plekBezet, volgendePlek, opPlek, plekGeldig, isVerplaatsbaar } from '../game/js/inrichting.js';

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };

// de getallen van home.js (flat 11 x 9, muren en vaste meubels)
const W = 11, D = 9, HALL = 3.4, MID = 5.2, SPLIT = 7.2;
const flat = {
  w: W, d: D,
  walls: [[0, 0, 0, D], [W, 0, W, D], [0, D, W, D], [0, MID, 1.0, MID], [2.4, MID, HALL, MID], [HALL, MID, HALL, 6.2], [HALL, 7.4, HALL, D], [HALL, MID, 9.0, MID], [10.2, MID, W, MID], [SPLIT, MID, SPLIT, D], [0, 0, W, 0]],
  solids: [[2.4, 3.35, 5.0, 4.55], [3.0, 2.1, 4.4, 2.9], [0.2, 0.2, 0.9, 0.9], [7.1, 0.2, 10.9, 0.9], [10.1, 1.2, 10.9, 2.0], [7.6, 2.9, 8.8, 3.9], [6.1, 6.9, 7.1, 8.95], [7.3, 6.9, 8.3, 8.95], [3.85, 8.25, 5.55, 8.95], [10.3, 5.35, 10.95, 7.05]],
};

for (const p of Object.keys(PLEKKEN)) check('plek geldig ' + p, plekGeldig(p, flat));
check('plek op de bank is ongeldig', !(PLEKKEN.zzz) && !plekGeldig('zzz', flat));
for (const [id, v] of Object.entries(VERPLAATSBAAR)) {
  check(id + ': standaard in opties', v.opties.includes(v.standaard));
  check(id + ': opties bestaan', v.opties.every((o) => plekInfo(o)));
  check(id + ': standaard heeft nul verschuiving', opPlek(id, v.standaard).dx === 0 && opPlek(id, v.standaard).dz === 0);
}
check('standaard is gelijk aan furniture.js', PLEKKEN.h1.x === 0.6 && PLEKKEN.h1.z === 4.7 && PLEKKEN.h4.x === 10.5 && PLEKKEN.h4.z === 4.7);
check('lamp, plant, kast, bureau, tv, bank en bedden verplaatsbaar', ['lamp', 'plant', 'kast', 'bureau', 'tv', 'bank', 'bed'].every(isVerplaatsbaar) && !isVerplaatsbaar('frituur') && !isVerplaatsbaar('toString'));

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
check('geen meubel, geen plek', volgendePlek({}, eigen, 'frituur') === null);

const o = opPlek('plant', 'h5');
check('verschuiving klopt', Math.abs(o.dx - (4.0 - 10.5)) < 1e-9 && Math.abs(o.dz - (5.8 - 4.7)) < 1e-9);
check('blokje om het meubel', o.solid[0] < o.x && o.solid[2] > o.x && o.solid[1] < o.z && o.solid[3] > o.z);
check('onbekende plek geeft null', opPlek('lamp', 'zzz') === null && opPlek('bank', 'h1') === null);

// wandplekken (kast en bureau)
for (const k of Object.keys(WANDPLEKKEN)) check('wandplek geldig ' + k, plekGeldig(k, flat), JSON.stringify(WANDPLEKKEN[k].solid));
check('kast standaard = furniture.js', WANDPLEKKEN.k1.x === 0.36 && WANDPLEKKEN.k1.z === 2.6 && WANDPLEKKEN.k1.solid.join() === '0.1,1.95,0.66,3.25' && WANDPLEKKEN.k1.use.x === 1.15);
check('bureau standaard = furniture.js', WANDPLEKKEN.b1.x === 10.3 && WANDPLEKKEN.b1.z === 8.62 && WANDPLEKKEN.b1.solid.join() === '9.65,8.3,10.95,8.95' && WANDPLEKKEN.b1.use.z === 7.8);
// geen wandplek raakt een muur doorheen of een gebruikspunt van een ander meubel
const eigenWand = new Set(['kast', 'bureau', 'lamp', 'plant']);
check('kast en bureau botsen op dezelfde wand', plekBezet({ kast: 'k3' }, eigenWand, 'bureau', 'b4') && !plekBezet({ kast: 'k1' }, eigenWand, 'bureau', 'b4'));
check('kast naast lamp op h1 mag', !plekBezet({ lamp: 'h1' }, eigenWand, 'kast', 'k2'));
let plw = { kast: 'k1', bureau: 'b1' };
let nk = volgendePlek(plw, eigenWand, 'kast');
check('kast gaat naar k2', nk === 'k2', nk);
plw.kast = 'k3';
check('bureau slaat b4 over als de kast op k3 staat', volgendePlek({ ...plw, bureau: 'b3' }, eigenWand, 'bureau') === 'b1', String(volgendePlek({ ...plw, bureau: 'b3' }, eigenWand, 'bureau')));
const ow = opPlek('kast', 'k3');
check('wandplek geeft rot, solid en use', ow && ow.rot === 0 && ow.solid.length === 4 && ow.use && opPlek('kast', 'h1') === null);
check('opslag houdt wandplekken', schoonPlekken({ kast: 'k2', bureau: 'b3' }).kast === 'k2' && !schoonPlekken({ kast: 'b1' }).kast);
// het gebruikspunt van elke wandplek ligt vrij van vaste blokjes
for (const [k, p] of Object.entries(WANDPLEKKEN)) check('gebruikspunt vrij ' + k, !flat.solids.some(([a, b, c, d]) => p.use.x > a && p.use.x < c && p.use.z > b && p.use.z < d));

// tv (Kiekkast): standaardplek komt overeen met furniture.js en de drie plekken zijn geldig en kijken naar de bank
check('tv standaard = furniture.js', WANDPLEKKEN.t1.x === 3.7 && WANDPLEKKEN.t1.z === 1.0 && WANDPLEKKEN.t1.solid.join() === '2.8,0.2,4.6,1.35' && WANDPLEKKEN.t1.use.x === 5.25);
check('tv: drie plekken, allemaal met rot 0 (kijkt de kamer in)', VERPLAATSBAAR.tv.opties.length === 3 && VERPLAATSBAAR.tv.opties.every((k) => WANDPLEKKEN[k].rot === 0));
const eigenTv = new Set(['tv', 'bureau', 'kast']);
check('tv en bureau botsen op de noordmuur', plekBezet({ bureau: 'b3' }, eigenTv, 'tv', 't3') && !plekBezet({ bureau: 'b1' }, eigenTv, 'tv', 't3'));
check('tv slaat een bezette plek over', volgendePlek({ tv: 't1', bureau: 'b3' }, eigenTv, 'tv') === 't2');
check('opslag houdt tv-plek', schoonPlekken({ tv: 't2' }).tv === 't2' && !schoonPlekken({ tv: 'k1' }).tv);

// bank (Zitmoi) en bedden (Sloapstee), #359
const home = fs.readFileSync(new URL('../game/js/home.js', import.meta.url), 'utf8');
for (const [id, lijst] of Object.entries(STOCK_BLOKJES)) for (const b of lijst) check('stockblokje van ' + id + ' staat in home.js', home.includes('[' + b.map((v) => (Number.isInteger(v) ? v.toFixed(1) : v)).join(', ') + ']'), b.join());
const bezit = new Set(['bank', 'bed']);
const vlak = { ...flat, solids: zonderStock(flat.solids, bezit) };
check('zonderStock haalt precies bank (1) en bedden (2) weg', flat.solids.length - vlak.solids.length === 3 && zonderStock(flat.solids, new Set()).length === flat.solids.length);
for (const k of Object.keys(BANKPLEKKEN)) check('bankplek geldig ' + k, plekGeldig(k, vlak), JSON.stringify(BANKPLEKKEN[k].solid));
for (const k of Object.keys(BEDPLEKKEN)) check('bedplek geldig ' + k, plekGeldig(k, vlak));
check('standaard bank = furniture.js', BANKPLEKKEN.s1.x === 3.7 && BANKPLEKKEN.s1.z === 3.95 && BANKPLEKKEN.s1.solid.join() === '2.4,3.35,5,4.55' && BANKPLEKKEN.s1.use.x === 5.45 && BANKPLEKKEN.s1.use.z === 3.75);
check('standaard zitplek, buur en opstaan = het oude spel', BANKPLEKKEN.s1.seat.x === 4.25 && BANKPLEKKEN.s1.seat.z === 3.98 && BANKPLEKKEN.s1.buur.x === 3.15 && BANKPLEKKEN.s1.buur.z === 3.98 && BANKPLEKKEN.s1.sta.x === 5.4 && BANKPLEKKEN.s1.sta.z === 3.6);
check('standaard kijkt naar de noordmuur', BANKPLEKKEN.s1.kijk.x === 0 && BANKPLEKKEN.s1.kijk.z === -1);
check('westbank kijkt de kamer in (+x)', BANKPLEKKEN.s4.kijk.x === 1 && BANKPLEKKEN.s4.kijk.z === 0);
for (const [k, p] of Object.entries(BANKPLEKKEN)) {
  const [x0, z0, x1, z1] = p.solid;
  const binnen = (q) => q.x >= 0 && q.x <= 11 && q.z >= 0 && q.z <= 9;
  check('bank ' + k + ': zitplek, buur, gebruik en opstaan liggen in de flat', [p.seat, p.buur, p.use, p.sta].every(binnen));
  check('bank ' + k + ': zitplek en buur liggen op de bank', [p.seat, p.buur].every((q) => q.x > x0 && q.x < x1 && q.z > z0 && q.z < z1));
  check('bank ' + k + ': gebruik en opstaan liggen naast de bank', [p.use, p.sta].every((q) => !(q.x > x0 && q.x < x1 && q.z > z0 && q.z < z1)));
  check('bank ' + k + ': opstaan niet in een vast blokje of muur', ![p.use, p.sta].some((q) => vlak.solids.some(([a, b, c, d]) => q.x > a && q.x < c && q.z > b && q.z < d)));
  check('bank ' + k + ': zitplek en buur liggen 1,1 m uit elkaar', Math.abs(Math.hypot(p.seat.x - p.buur.x, p.seat.z - p.buur.z) - 1.1) < 1e-3);
}
check('bank staat niet op de salontafel', Object.values(BANKPLEKKEN).every((p) => !overlapT(p.solid, [3.0, 2.1, 4.4, 2.9])));
function overlapT(a, b) { return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]; }
check('bedden blijven in hun eigen kamer', Object.values(BEDPLEKKEN).every((p) => p.bedden[0].solid[2] <= 7.2 && p.bedden[1].solid[0] >= 7.2 && p.bedden.every((b) => b.solid[1] >= 5.2 && b.solid[3] <= 9)));
check('standaardbedden = furniture.js en home.js', BEDPLEKKEN.d1.bedden[0].x === 6.6 && BEDPLEKKEN.d1.bedden[1].x === 7.8 && BEDPLEKKEN.d1.bedden.every((b) => b.z === 7.95 && b.rot === Math.PI) && BEDPLEKKEN.d1.bedden[0].use.x === 5.65 && BEDPLEKKEN.d1.bedden[0].use.z === 7.3 && BEDPLEKKEN.d1.bedden[1].use.x === 8.75);
check('bedden hebben nul verschuiving op de standaardplek', opPlek('bed', 'd1').dx === 0 && opPlek('bank', 's1').dx === 0);
check('bed geeft twee blokjes en bank een zitpunt', opPlek('bed', 'd2').solids.length === 2 && opPlek('bank', 's3').seat && opPlek('bed', 'd9') === null && opPlek('bank', 'k1') === null);
check('kop naar de noordmuur draait het bed om', BEDPLEKKEN.d2.bedden.every((b) => b.rot === 0) && BEDPLEKKEN.d3.bedden[1].rot === 0 && BEDPLEKKEN.d3.bedden[0].rot === Math.PI);
// bedden botsen niet met het bureau of de kast, de bank niet met de kast
const eigenAlles = new Set(['bank', 'bed', 'kast', 'bureau', 'tv', 'lamp', 'plant']);
for (const d of Object.keys(BEDPLEKKEN)) for (const b of ['b1', 'b2']) check('bedden ' + d + ' en bureau ' + b + ' vrij', !plekBezet({ bed: d, bureau: b }, eigenAlles, 'bed', d) || d === 'x');
check('bank op de westmuur botst met de kast op k1 en k2, niet op k3', plekBezet({ kast: 'k1' }, eigenAlles, 'bank', 's4') && plekBezet({ kast: 'k2' }, eigenAlles, 'bank', 's4') && !plekBezet({ kast: 'k3' }, eigenAlles, 'bank', 's4'));
check('bank volgende plek slaat de bezette westmuur over', volgendePlek({ kast: 'k1', bank: 's3' }, eigenAlles, 'bank') === 's1');
check('bank loopt alle vier de plekken door', (() => { const pl = {}; const seen = new Set(); for (let i = 0; i < 8; i++) { const x = volgendePlek(pl, new Set(['bank']), 'bank'); pl.bank = x; seen.add(x); } return seen.size === 4; })());
check('bank op de zuidmuur botst met een lamp in de hoek h3', plekBezet({ lamp: 'h3' }, new Set(['bank', 'lamp']), 'bank', 's3') && !plekBezet({ lamp: 'h1' }, new Set(['bank', 'lamp']), 'bank', 's3'));
check('opslag houdt bank- en bedplekken', schoonPlekken({ bank: 's4', bed: 'd3' }).bank === 's4' && schoonPlekken({ bank: 'd1' }).bank === undefined && schoonPlekken({ bed: 's1' }).bed === undefined);
check('plekInfo kent bank en bedden', plekInfo('s2').label && plekInfo('d4').label);

console.log(bad ? `${bad} mislukt` : 'inrichting_test: alles goed');
process.exit(bad ? 1 : 0);
