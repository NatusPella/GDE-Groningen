// Het foutrapport (#496) laat alleen meldingen van de versie zien die nu draait.
// Tot 0.50.0 reisde een waarschuwing uit 0.32.0 mee met elke upgrade, ook als de
// bug allang gefixt was, en dan leek hij in het spel nog te bestaan.
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const { VERSION } = await import('../game/js/version.js');
store.set('gde-foutlog', JSON.stringify([
  { t: '2026-10-17T14:25:14.788Z', level: 'error', msg: 'Cannot read properties of undefined (reading 0)', stack: '', version: '0.33.0', step: 'k-eikea', count: 6215 },
  { t: '2026-10-23T14:54:57.466Z', level: 'warn', msg: '[safety] scene leftovers cleared', stack: '', version: '0.44.0', step: 'M03', count: 11 },
  { t: '2026-10-25T11:00:00.000Z', level: 'warn', msg: 'melding uit deze versie', stack: '', version: VERSION, step: 'M00', count: 1 },
]));

const { getErrorLog, logError, errorReport } = await import('../game/js/errorlog.js');

let n = 0;
const t = (name, f) => { f(); n++; console.log(`ok ${name}`); };

t('alleen de meldingen van de draaiende versie blijven over', () => {
  assert.deepEqual(getErrorLog().map((e) => e.msg), ['melding uit deze versie']);
});

t('een nieuwe melding krijgt de versie van nu', () => {
  logError('error', 'nieuwe fout');
  const e = getErrorLog().at(-1);
  assert.equal(e.msg, 'nieuwe fout');
  assert.equal(e.version, VERSION);
});

t('het rapport noemt de oude versies niet meer', () => {
  const r = errorReport();
  assert.doesNotMatch(r, /0\.33\.0|0\.44\.0/);
  assert.doesNotMatch(r, /scene leftovers cleared/);
  assert.match(r, /melding uit deze versie/);
  assert.match(r, /nieuwe fout/);
  assert.match(r, /2 meldingen/);
});

console.log(`errorlog_test: ${n}/${n} ok`);
