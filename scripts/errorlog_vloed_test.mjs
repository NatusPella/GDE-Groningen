// Een fout die elk beeld terugkomt met een ander getal is één melding. node scripts/errorlog_vloed_test.mjs
import assert from 'node:assert/strict';
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.window = { addEventListener() {} }; // zo hangt errorlog zijn console-haak op
const origLog = { e: console.error, w: console.warn };
console.error = () => {}; console.warn = () => {}; // de haak van errorlog roept deze stille versies aan
globalThis.__el = await import("../game/js/errorlog.js");
const { getErrorLog, logError, clearErrorLog, addReportExtra, errorReport } = await import('../game/js/errorlog.js');
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
t('meerdere rapportbronnen, een falende bron slaat de rest niet over', () => {
  addReportExtra(() => { throw new Error('stuk'); });
  addReportExtra(() => ['Opslag: proef']);
  assert.ok(errorReport().includes('Opslag: proef'));
});
t("een kapotte luisteraar breekt het loggen niet", () => {
  const { onErrorLogChange } = globalThis.__el;
  onErrorLogChange(() => { throw new Error("weergave stuk"); });
  logError("error", "na de kapotte luisteraar");
  assert.ok(getErrorLog().some((e) => e.msg === "na de kapotte luisteraar"));
});
t("een enorm object als console.error-argument blijft klein en snel", () => {
  const groot = {}; for (let i = 0; i < 100000; i++) groot["k" + i] = { a: i, b: [i, i] };
  const t0 = Date.now();
  console.error("wereld:", groot);
  assert.ok(Date.now() - t0 < 500, "duurde " + (Date.now() - t0) + " ms");
  assert.ok(getErrorLog().some((e) => /groot object/.test(e.msg)));
  console.error = origLog.e; console.warn = origLog.w;
  const cyc = {}; cyc.zelf = cyc; console.warn("cyclisch", cyc);
});
console.log(`errorlog_vloed_test: ${n}/7`);
setTimeout(() => process.exit(0), 10);
