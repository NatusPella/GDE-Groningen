// Een fout die elk beeld terugkomt met een ander getal is één melding. node scripts/errorlog_vloed_test.mjs
import assert from 'node:assert/strict';
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
const { getErrorLog, logError, clearErrorLog } = await import('../game/js/errorlog.js');
let n = 0;
const t = (name, f) => { f(); n++; console.log('ok ' + name); };
t('3000 keer dezelfde fout met een ander getal blijft één regel', () => {
  clearErrorLog();
  for (let i = 0; i < 3000; i++) logError('error', `Cannot read x at frame ${i} pos 12.${i % 10}`);
  const l = getErrorLog();
  assert.equal(l.length, 1);
  assert.equal(l[0].count, 3000);
});
t('andere tekst blijft een eigen regel', () => {
  logError('error', 'Iets heel anders 5');
  assert.equal(getErrorLog().length, 2);
});
t('waarschuwing en fout met dezelfde tekst blijven apart', () => {
  clearErrorLog();
  logError('error', 'zelfde 1'); logError('warn', 'zelfde 2');
  assert.equal(getErrorLog().length, 2);
});
t('een vloed van 500 verschillende meldingen houdt de lijst op 40', () => {
  clearErrorLog();
  for (let i = 0; i < 500; i++) logError('warn', `melding-${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + ((i / 26) | 0) % 26)}`);
  assert.ok(getErrorLog().length <= 40);
});
console.log(`errorlog_vloed_test: ${n}/4`);
setTimeout(() => process.exit(0), 10);
