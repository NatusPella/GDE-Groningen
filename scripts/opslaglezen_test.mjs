// De lezers voor bewaarde teksten geven altijd het goede type terug. node scripts/opslaglezen_test.mjs
import { readList, readCounters } from '../game/js/opslaglezen.js';
let n = 0, fails = 0;
const ok = (c, m, i = '') => { n++; if (!c) { fails++; console.log('FAIL', m, i); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
ok(eq(readList(null), []), 'geen tekst: lege lijst');
ok(eq(readList('{"a":1}'), []), 'een object is geen lijst');
ok(eq(readList('kapot{'), []), 'kapotte tekst: lege lijst');
ok(eq(readList('["a",3,null,"b",{}]'), ['a', 'b']), 'alleen teksten');
ok(readList(JSON.stringify(Array.from({ length: 900 }, (_, i) => 'x' + i))).length === 500, 'bovengrens');
ok(eq(readList('null'), []), 'null geeft een lege lijst');
ok(eq(readCounters(null), {}), 'geen tekst: leeg object');
ok(eq(readCounters('[1,2]'), {}), 'een array is geen tellerobject');
ok(eq(readCounters('{"a":3,"b":"x","c":-1,"d":2.7,"e":null}'), { a: 3, d: 2 }), 'alleen eindige niet-negatieve getallen, afgerond');
ok(eq(readCounters('{"__proto__":5,"ok":1}'), { ok: 1 }), '__proto__ wordt genegeerd');
ok(Object.getPrototypeOf(readCounters('{"__proto__":{"x":1}}')) === Object.prototype, 'prototype blijft heel');
ok(eq(readCounters('7'), {}), 'een getal is geen object');
console.log(`opslaglezen_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
