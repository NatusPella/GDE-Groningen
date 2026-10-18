// Coöp online (#95): koppelcode en framing (game/js/net/pairing.js).
import assert from 'node:assert/strict';
import * as P from '../game/js/net/pairing.js';
import { makeRng } from '../game/js/net/memtransport.js';

let n = 0;
const t = (name, f) => { f(); n++; };

t('code rondreis, ook met spaties en kleine letters', () => {
  const key = P.makeKey(makeRng(5));
  assert.match(key, /^[A-Z2-9]{8}$/);
  const code = P.makeCode({ ip: '84.12.34.56', port: 41000, key });
  assert.match(code, /^GDE2-84\.12\.34\.56:41000-[A-Z2-9]{8}-[0-9A-F]{4}$/);
  assert.deepEqual(P.parseCode(code), { ok: true, ip: '84.12.34.56', port: 41000, key });
  assert.equal(P.parseCode('  ' + code.toLowerCase().replace(/-/g, ' - ') + '\n').ok, true);
});
t('fouten krijgen een Nederlandse tekst', () => {
  const code = P.makeCode({ ip: '10.0.0.5', port: 41000, key: 'ABCDEFGH' });
  assert.match(P.parseCode('').reason, /niets/);
  assert.match(P.parseCode('hallo').reason, /geen koppelcode/);
  assert.match(P.parseCode(code.replace('10.0.0.5', '10.0.0.6')).reason, /klopt niet/);
  const bad = P.makeCode({ ip: '300.1.1.1', port: 41000, key: 'ABCDEFGH' });
  assert.match(P.parseCode(bad).reason, /klopt niet/);
  assert.match(P.parseCode(P.makeCode({ ip: '10.0.0.5', port: 80, key: 'ABCDEFGH' })).reason, /klopt niet/);
});
t('framing: stukjes, plakken en meerdere berichten', () => {
  const a = Uint8Array.from([1, 2, 3]), b = new Uint8Array(0), c = Uint8Array.from([9, 9, 9, 9, 9]);
  const wire = new Uint8Array([...P.frame(a), ...P.frame(b), ...P.frame(c)]);
  const d = new P.FrameDecoder(); const got = [];
  for (let i = 0; i < wire.length; i += 3) got.push(...d.push(wire.subarray(i, i + 3)));
  assert.deepEqual(got.map((x) => [...x]), [[1, 2, 3], [], [9, 9, 9, 9, 9]]);
  assert.deepEqual(new P.FrameDecoder().push(wire).length, 3);
});
t('framing: te grote lengte breekt de verbinding', () => {
  const d = new P.FrameDecoder(); assert.deepEqual(d.push(Uint8Array.from([0xff, 0xff, 0xff, 0xff, 1])), []);
  assert.equal(d.broken, true); assert.deepEqual(d.push(P.frame(Uint8Array.from([1]))), []);
  assert.throws(() => P.frame(new Uint8Array(P.MAX_FRAME + 1)));
});
t('sleutel-frame: alleen de juiste sleutel', () => {
  assert.equal(P.checkKeyFrame(P.encodeKeyFrame('ABCDEFGH'), 'ABCDEFGH'), true);
  assert.equal(P.checkKeyFrame(P.encodeKeyFrame('ABCDEFGX'), 'ABCDEFGH'), false);
  assert.equal(P.checkKeyFrame(new TextEncoder().encode('KEY:ABCDEFGHI'), 'ABCDEFGH'), false);
});
console.log(`net_pairing_test: ${n}/${n} ok`);
