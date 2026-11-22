// De lezers voor bewaarde teksten geven altijd het goede type terug. node scripts/opslaglezen_test.mjs
import { leesLijst, leesTellers } from '../game/js/opslaglezen.js';
let n = 0, fails = 0;
const ok = (c, m, i = '') => { n++; if (!c) { fails++; console.log('FAIL', m, i); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
ok(eq(leesLijst(null), []), 'geen tekst: lege lijst');
ok(eq(leesLijst('{"a":1}'), []), 'een object is geen lijst');
ok(eq(leesLijst('kapot{'), []), 'kapotte tekst: lege lijst');
ok(eq(leesLijst('["a",3,null,"b",{}]'), ['a', 'b']), 'alleen teksten');
ok(leesLijst(JSON.stringify(Array.from({ length: 900 }, (_, i) => 'x' + i))).length === 500, 'bovengrens');
ok(eq(leesLijst('null'), []), 'null geeft een lege lijst');
ok(eq(leesTellers(null), {}), 'geen tekst: leeg object');
ok(eq(leesTellers('[1,2]'), {}), 'een array is geen tellerobject');
ok(eq(leesTellers('{"a":3,"b":"x","c":-1,"d":2.7,"e":null}'), { a: 3, d: 2 }), 'alleen eindige niet-negatieve getallen, afgerond');
ok(eq(leesTellers('{"__proto__":5,"ok":1}'), { ok: 1 }), '__proto__ wordt genegeerd');
ok(Object.getPrototypeOf(leesTellers('{"__proto__":{"x":1}}')) === Object.prototype, 'prototype blijft heel');
ok(eq(leesTellers('7'), {}), 'een getal is geen object');
console.log(`opslaglezen_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
