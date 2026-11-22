// Foutafhandeling van de joinpoort (kwaliteit 22-11):  node scripts/net_joingate_fout_test.mjs
// Faalt de signaler bij het opzetten (een WebSocket die niet te maken is), dan mag dat geen onafgehandelde
// belofte-afwijzing geven: de host speelt gewoon door, alleen zonder openbare joinpoort.
import assert from 'node:assert/strict';
import { bedienKamer } from '../game/js/net/joingate.js';
import { maakSleutelpaar } from '../game/js/net/sigcrypto.js';

const onafgehandeld = [];
process.on('unhandledRejection', (e) => onafgehandeld.push(e));
const tik = (ms) => new Promise((r) => setTimeout(r, ms));
const paar = await maakSleutelpaar();

for (const [naam, maak] of [
  ['signaler gooit bij het maken', () => { throw new Error('geen WebSocket'); }],
  ['luisteren gooit', () => ({ luister() { throw new Error('luister stuk'); }, kondig() {}, close() {} })],
  ['kondigen gooit', () => ({ luister() {}, kondig() { throw new Error('kondig stuk'); }, close() {} })],
]) {
  const poort = bedienKamer({ id: 'abcdefghij', hostKeyPair: paar, maakSignaler: maak, onKamer: async () => {} });
  assert.ok(poort && typeof poort.stop === 'function', naam + ': er komt toch een poort terug');
  await tik(150);
  assert.doesNotThrow(() => poort.stop(), naam + ': stop gooit niet');
  assert.doesNotThrow(() => poort.tekst(), naam + ': tekst gooit niet');
  await tik(20);
}
assert.equal(onafgehandeld.length, 0, 'geen onafgehandelde afwijzing: ' + onafgehandeld.map((e) => e && e.message).join(', '));
console.log('net_joingate_fout_test: ok');
