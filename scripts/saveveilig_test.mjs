// Eén struikelend save-onderdeel blokkeert de save niet. node scripts/saveveilig_test.mjs
import { makeSafe } from '../game/js/saveveilig.js';
let n = 0, fails = 0;
const ok = (c, m, i = '') => { n++; if (!c) { fails++; console.log('FAIL', m, i); } };
const logs = [];
let vorige = { duif: { gevangen: 3 } };
const { veilig } = makeSafe({ log: (t) => logs.push(t), terugval: (k) => vorige[k] });
ok(veilig('geld', () => 5) === 5, 'goede waarde komt door');
ok(veilig('duif', () => { throw new Error('kapot'); }).gevangen === 3, 'eerste fout: veld uit de vorige save');
ok(logs.length === 1 && logs[0].includes('duif'), 'één melding', logs.join('|'));
ok(veilig('duif', () => { throw new Error('nog kapot'); }).gevangen === 3, 'tweede fout: nog steeds de oude waarde');
ok(logs.length === 1, 'geen tweede melding voor hetzelfde veld', logs.length);
ok(veilig('geld', () => 9) === 9 && veilig('geld', () => { throw new Error('x'); }) === 9, 'laatste goede waarde gaat voor de vorige save');
ok(veilig('nieuw', () => { throw new Error('x'); }) === undefined, 'zonder terugval ontbreekt het veld');
const { veilig: v2 } = makeSafe({ log: () => { throw new Error('log stuk'); }, terugval: () => { throw new Error('opslag stuk'); } });
ok(v2('a', () => { throw 'tekst'; }) === undefined, 'ook een falende log en terugval breken niet');
ok(veilig('x', () => null) === null, 'null is een geldige waarde');
// JSON.stringify laat een ontbrekend veld weg: geen "undefined"
ok(JSON.stringify({ a: veilig('weg', () => { throw 1; }), b: 1 }) === '{"b":1}', 'ontbrekend veld valt uit de JSON');
console.log(`saveveilig_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
