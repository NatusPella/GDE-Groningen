// De vrachtmarkt (#492): vier contracttypes, een deterministisch aanbod van drie en de
// loonformule, plus een broncheck dat sidejob_vracht.js het contract en de laad- en
// losfase echt gebruikt. sidejob_vracht.js laadt three van een CDN en is in node niet te
// importeren; daarom leest die controle de bron.
//   node scripts/vrachtmarkt_test.mjs
import { readFileSync } from 'node:fs';
import {
  CONTRACTTYPES, CONTRACT_IDS, contractType, maakAanbod, contractLoon,
  laadTijd, losTijd, AANBOD_AANTAL, TIJD_MAX,
} from '../game/js/vrachtmarkt.js';
import { TRAILER_KINDS } from '../game/js/semitrailer.js';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };
const eq = (a, b, name) => ok(a === b, name, `${a} !== ${b}`);
const json = (v) => JSON.stringify(v);

// --- de vier contracttypes ---------------------------------------------------
const IDS = ['koel', 'zeil', 'bak', 'stukgoed'];
eq(CONTRACTTYPES.length, 4, 'vier contracttypes');
eq(CONTRACT_IDS.length, 4, 'vier ids');
for (const id of IDS) ok(CONTRACT_IDS.includes(id), `type ${id} bestaat`);
for (const t of CONTRACTTYPES) {
  ok(typeof t.naam === 'string' && t.naam.length > 2, `${t.id}: Nederlandse naam`, t.naam);
  ok(t.tariefPerKm > 0, `${t.id}: tarief per km > 0`, String(t.tariefPerKm));
  ok(t.laadSeconden > 0, `${t.id}: laadtijd > 0`, String(t.laadSeconden));
  ok(t.losSeconden > 0, `${t.id}: lostijd > 0`, String(t.losSeconden));
  ok(t.toeslag > 0, `${t.id}: toeslag > 0`, String(t.toeslag));
  ok(t.laadSeconden <= TIJD_MAX && t.losSeconden <= TIJD_MAX, `${t.id}: laad- en lostijd binnen de grens`);
  ok(!!TRAILER_KINDS[t.trailer], `${t.id}: oplegger bestaat in semitrailer.js`, t.trailer);
  ok(Array.isArray(t.vrachten) && t.vrachten.length >= 2, `${t.id}: minstens twee vrachten`);
  ok(t.vrachten.every((v) => typeof v.klant === 'string' && v.klant && typeof v.vracht === 'string' && v.vracht), `${t.id}: elke vracht heeft een klant en lading`);
}
eq(contractType('koel').naam, 'Koeloplegger', 'contractType vindt een type');
eq(contractType('bestaatniet'), null, 'onbekend type is null');
eq(contractType(undefined), null, 'geen type is null');

// --- deterministisch aanbod --------------------------------------------------
for (const seed of [0, 1, 7, 42, 1234, -3, 2 ** 31, 2 ** 40, 1e9]) {
  const a = maakAanbod(seed, 0.9, 1);
  ok(json(a) === json(maakAanbod(seed, 0.9, 1)), `seed ${seed}: deterministisch`);
  eq(a.length, AANBOD_AANTAL, `seed ${seed}: drie aanbiedingen`);
  eq(new Set(a.map((o) => o.type)).size, 3, `seed ${seed}: drie verschillende types`, a.map((o) => o.type).join(','));
  eq(new Set(a.map(json)).size, 3, `seed ${seed}: drie verschillende aanbiedingen`);
  ok(a.every((o) => o.afstandKm === 0.9), `seed ${seed}: dezelfde rit, dezelfde afstand`);
  ok(a.every((o) => o.klant && o.vracht && o.naam && o.trailer), `seed ${seed}: elke aanbieding is compleet`);
}
// Een andere seed hoort ook echt een ander aanbod te geven.
ok(json(maakAanbod(1, 0.9, 1)) !== json(maakAanbod(2, 0.9, 1)), 'een andere seed geeft een ander aanbod');

// --- loonformule -------------------------------------------------------------
eq(contractLoon({ afstandKm: 1, tariefPerKm: 70, toeslag: 50 }), 120, 'loon = km × tarief + toeslag');
eq(contractLoon({ afstandKm: 0.45, tariefPerKm: 72, toeslag: 50 }), 82, 'loon wordt afgerond');
eq(contractLoon({ afstandKm: 0.5, tariefPerKm: 1, toeslag: 0 }), 1, 'halve euro rondt naar boven');
eq(contractLoon({ afstandKm: 0, tariefPerKm: 72, toeslag: 50 }), 50, 'zonder afstand blijft de toeslag');
eq(contractLoon({ afstandKm: 0.45, tariefPerKm: 0, toeslag: 0 }), 0, 'nul blijft nul');
for (const o of maakAanbod(5, 1.1, 1)) eq(contractLoon(o), Math.round(o.afstandKm * o.tariefPerKm + o.toeslag), `aanbod ${o.type} volgt de formule`);

// --- de band van level 1: de oude basis was 85-132; de echte rit loopt van 0,36 tot 1,56 km
// (randomStreetPoint: 0,8 × 450 tot 1,2 × 1300 m), dus de band is iets ruimer dan de nominale
// 0,45-1,3 km. De test gebruikt de echte grenzen, niet de belofte.
let min = Infinity, max = -Infinity;
for (let seed = 0; seed < 200; seed++) {
  for (const km of [0.36, 0.7, 1.56]) {
    for (const o of maakAanbod(seed, km, 1)) {
      const loon = contractLoon(o);
      if (loon < min) min = loon;
      if (loon > max) max = loon;
    }
  }
}
ok(min >= 70, 'level 1: geen rit onder de 70 euro', String(min));
ok(max <= 170, 'level 1: geen rit boven de 170 euro', String(max));

// --- rare en onbekende invoer ------------------------------------------------
const raar = [
  null, undefined, {}, { afstandKm: -5, tariefPerKm: 70, toeslag: 50 },
  { afstandKm: 1, tariefPerKm: -70, toeslag: -50 }, { afstandKm: NaN, tariefPerKm: NaN, toeslag: NaN },
  { afstandKm: Infinity, tariefPerKm: Infinity, toeslag: Infinity }, { afstandKm: 'veel', tariefPerKm: 'x', toeslag: {} },
  { afstandKm: 1e12, tariefPerKm: 1e6, toeslag: 1e9 }, { type: 'onbekend' },
];
for (const c of raar) {
  const loon = contractLoon(c);
  ok(Number.isFinite(loon) && loon >= 0, `contractLoon ${json(c)}: eindig en nooit negatief`, String(loon));
}
for (const args of [[], [undefined], [NaN, NaN, NaN], [null, null, null], ['abc', 'def', 'ghi'], [-1, -3, -9],
  [2 ** 31, 1e12, 99], [0.5, Infinity, -Infinity], [123, -0.0001, 1.5]]) {
  const a = maakAanbod(...args);
  ok(Array.isArray(a) && a.length === AANBOD_AANTAL, `raar aanbod ${json(args)}: drie aanbiedingen`);
  ok(a.every((o) => Number.isFinite(contractLoon(o)) && contractLoon(o) >= 0), `raar aanbod ${json(args)}: loon ok`);
  ok(a.every((o) => laadTijd(o) > 0 && laadTijd(o) <= TIJD_MAX && losTijd(o) > 0 && losTijd(o) <= TIJD_MAX), `raar aanbod ${json(args)}: laad- en lostijd ok`);
  ok(a.every((o) => o.afstandKm >= 0 && o.afstandKm <= 200), `raar aanbod ${json(args)}: afstand begrensd`);
  eq(new Set(a.map((o) => o.type)).size, 3, `raar aanbod ${json(args)}: drie types`);
}
eq(laadTijd(null), 0, 'laadtijd van niets is 0');
eq(losTijd({ losSeconden: -4 }), 0, 'negatieve lostijd wordt 0');
eq(laadTijd({ laadSeconden: 1e6 }), TIJD_MAX, 'enorme laadtijd wordt begrensd');
eq(maakAanbod(1, -5, 1)[0].afstandKm, 0, 'negatieve afstand wordt 0');
eq(maakAanbod(1, 1e9, 1)[0].afstandKm, 200, 'enorme afstand wordt begrensd');

// --- niveau ------------------------------------------------------------------
eq(json(maakAanbod(9, 1, 0)), json(maakAanbod(9, 1, 1)), 'niveau 0 telt als 1');
eq(json(maakAanbod(9, 1, 99)), json(maakAanbod(9, 1, 5)), 'niveau boven 5 telt als 5');
eq(json(maakAanbod(9, 1, 2.7)), json(maakAanbod(9, 1, 3)), 'niveau wordt afgerond');
for (const o of maakAanbod(9, 1, 5)) {
  const base = contractType(o.type);
  ok(o.toeslag >= base.toeslag, `niveau 5: toeslag ${o.type} niet lager dan de basis`);
  ok(o.toeslag <= Math.round(base.toeslag * 1.24) + 1, `niveau 5: toeslag ${o.type} blijft gematigd`, String(o.toeslag));
  eq(o.tariefPerKm, base.tariefPerKm, `niveau 5: tarief ${o.type} hangt niet van het niveau af`);
}

// --- de koppeling met de vrachtbijbaan (broncheck) ---------------------------
const src = readFileSync(new URL('../game/js/sidejob_vracht.js', import.meta.url), 'utf8');
ok(/import \{[^}]*maakAanbod[^}]*\} from '\.\/vrachtmarkt\.js'/.test(src), 'de baan haalt het aanbod uit vrachtmarkt.js');
ok(/maakAanbod\(/.test(src), 'de baan vraagt de markt om een aanbod');
ok(/const contract = markt\[/.test(src), 'de baan kiest een aanbod van de markt');
ok(/newTrailer\(contract\.trailer/.test(src), 'de oplegger volgt het contracttype');
ok(/laadTijd\(/.test(src) && /losTijd\(/.test(src), 'de baan gebruikt de laad- en lostijd van het contract');
ok(/d\.phase = 'load'/.test(src), 'laadfase na het koppelen');
ok(/d\.phase = 'unload'/.test(src), 'losfase bij de afnemer');
ok(/d\.loadLeft -= dt/.test(src) && /d\.losLeft -= dt/.test(src), 'de laad- en losfase lopen af');
ok(/c\.timeLeft[^;]*loadLeft[^;]*losLeft/.test(src), 'de laad- en lostijd zitten in de tijdslimiet');
ok(/const base = contractLoon\(d\.contract\)/.test(src), 'de basis van het loon komt uit contractLoon');
ok(/c\.complete\(\{\s*base\b/.test(src), 'het loon gaat via de bestaande c.complete-haak');
ok(!/world\.money\s*\+=/.test(src), 'geen eigen kasboek in de baan');
ok(!/Math\.random\(/.test(src), 'het contract hangt niet van Math.random af');
ok(/contract\.tariefPerKm/.test(src), 'de opdrachttekst toont het tarief');
ok(/contract\.naam/.test(src), 'de opdrachttekst toont het type');

console.log(`vrachtmarkt_test: band level 1 is ${min}-${max} euro`);
console.log(fails ? `${fails} of ${n} failed` : `vrachtmarkt_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
