// Controleert devWarn (game/js/devwarn.js): stil in productie/testmodi,
// waarschuwt onder dev, en ontdubbelt herhaalde meldingen per scope+bericht.
//   node scripts/devwarn_test.mjs
import assert from 'node:assert/strict';
import { devWarn } from '../game/js/devwarn.js';

let n = 0;
const ok = (cond, msg) => {
  assert.ok(cond, msg);
  n++;
};

const calls = [];
const origWarn = console.warn;
console.warn = (...args) => calls.push(args);

try {
  ok(devWarn('test:off', new Error('stil'), false) === false, 'inactief logt niet');
  ok(calls.length === 0, 'inactief roept console.warn niet aan');

  ok(devWarn('test:on', new Error('eerste'), true) === true, 'actief logt de eerste keer');
  ok(calls.length === 1 && calls[0][0] === '[dev:test:on]', 'console.warn krijgt scope-prefix');

  ok(devWarn('test:on', new Error('eerste'), true) === false, 'dezelfde scope + melding wordt ontdubbeld');
  ok(calls.length === 1, 'geen tweede console.warn voor dezelfde fout');

  ok(devWarn('test:on', new Error('tweede'), true) === true, 'andere melding in dezelfde scope logt wel');
  ok(devWarn('test:other', new Error('tweede'), true) === true, 'dezelfde melding in andere scope logt wel');
  ok(calls.length === 3, 'totaal drie unieke waarschuwingen gelogd');

  for (let i = 0; i < 200; i++) devWarn('test:fifo', new Error(`msg-${i}`), true);
  const callsAfterFill = calls.length;
  ok(devWarn('test:fifo', new Error('msg-190'), true) === false, 'recente sleutel blijft gededupliceerd na FIFO-eviction');
  ok(calls.length === callsAfterFill, 'geen extra console.warn voor recente sleutel');
} finally {
  console.warn = origWarn;
}

console.log(`devwarn_test: ${n} checks ok`);
