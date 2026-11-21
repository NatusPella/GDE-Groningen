// Instellingen valideren met eigen sleutels, niet met de in-operator (review 22-11): een met de hand bewerkt gde-settings met
// "toString" of "constructor" als keuze valt terug op de standaard. Schrijft nooit naar echte opslag.
//   node scripts/settings_eigen_sleutel_test.mjs
import assert from 'node:assert/strict';

const KEY = 'gde-settings';
const opslag = new Map();
globalThis.localStorage = {
  getItem: (k) => (k === KEY && opslag.has(k) ? opslag.get(k) : null),
  setItem: (k, v) => { if (k !== KEY) throw new Error(`test schreef naar ${k}`); opslag.set(k, String(v)); },
  removeItem: (k) => opslag.delete(k),
  clear: () => opslag.clear(),
};
globalThis.document = undefined;

let teller = 0;
const laad = async () => import(`../game/js/settings.js?eigen=${teller++}`);
let n = 0, fails = 0;
const t = async (naam, f) => { n++; try { await f(); } catch (e) { fails++; console.log(`FAIL ${naam}: ${e.message}`); } };

opslag.clear();
const standaard = { ...(await laad()).getSettings() };

for (const k of ['screenShake', 'subtitleVlak', 'textSize', 'drawDistance', 'subtitleSize', 'quality']) {
  for (const slecht of ['toString', 'constructor', '__proto__', 'hasOwnProperty']) {
    await t(`${k} = ${slecht} valt terug op de standaard`, async () => {
      opslag.clear(); opslag.set(KEY, JSON.stringify({ [k]: slecht }));
      assert.equal((await laad()).getSettings()[k], standaard[k]);
    });
  }
}
await t('een geldige keuze blijft staan', async () => {
  opslag.clear(); opslag.set(KEY, JSON.stringify({ screenShake: 'uit', subtitleVlak: 'licht', textSize: 'groot', subtitleSize: 'klein' }));
  const s = (await laad()).getSettings();
  assert.deepEqual([s.screenShake, s.subtitleVlak, s.textSize, s.subtitleSize], ['uit', 'licht', 'groot', 'klein']);
});
await t('setSetting met een overgeërfde sleutel doet niets', async () => {
  opslag.clear();
  const m = await laad();
  m.setSetting('constructor', 'x'); m.setSetting('toString', 'x');
  assert.deepEqual({ ...m.getSettings() }, standaard);
});

console.log(fails ? `${fails} van ${n} mislukt` : `settings_eigen_sleutel_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
