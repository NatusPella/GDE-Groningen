// Samen spelen (#528, ADR 0022): de toestemming onlineMeedoen heeft drie toestanden en een ontbrekende
// waarde is geen ja. Deze test leest de echte settings-module met een localStorage die alleen gde-settings
// toestaat, zodat de laad-, normaliseer- en bewaarweg echt worden doorlopen.
//   node scripts/settings_online_test.mjs
import assert from 'node:assert/strict';

const KEY = 'gde-settings';
const opslag = new Map();

// De repo-regel: een test schrijft nooit naar de echte save of prestaties.
globalThis.localStorage = {
  getItem: (k) => (k === KEY && opslag.has(k) ? opslag.get(k) : null),
  setItem: (k, v) => {
    if (k !== KEY) throw new Error(`test schreef naar ${k}`);
    opslag.set(k, String(v));
  },
  removeItem: (k) => opslag.delete(k),
  clear: () => opslag.clear(),
};
globalThis.document = undefined;

// Een verse module per scenario: settings.js leest de opslag bij het laden.
const laad = async () => (await import(`../game/js/settings.js?t=${Math.random()}`));

let n = 0;
const gevallen = [];
const t = (naam, f) => gevallen.push({ naam, f });
const zetBestand = (waarden) => { opslag.clear(); if (waarden !== null) opslag.set(KEY, JSON.stringify(waarden)); };

// Een verse installatie: geen bestand, of een bestand van voor deze instelling.
t('geen bestand: nog nooit gevraagd, dus null', async () => {
  zetBestand(null);
  const S = await laad();
  assert.equal(S.getSettings().onlineMeedoen, null);
  assert.equal(S.magOnline(), false, 'null is geen ja');
});

t('een oud bestand zonder de sleutel: nog nooit gevraagd, dus null', async () => {
  zetBestand({ volume: 0.5, onlineNaam: 'Tessa', v: 10 });
  const S = await laad();
  assert.equal(S.getSettings().onlineMeedoen, null);
  assert.equal(S.magOnline(), false);
});

t('een bewaarde ja blijft ja, en overleeft een herlaad', async () => {
  zetBestand({ v: 10 });
  const S = await laad();
  S.setSetting('onlineMeedoen', true);
  assert.equal(S.getSettings().onlineMeedoen, true);
  assert.equal(S.magOnline(), true);
  assert.equal(JSON.parse(opslag.get(KEY)).onlineMeedoen, true, 'echt weggeschreven');
  const S2 = await laad();
  assert.equal(S2.getSettings().onlineMeedoen, true, 'en weer teruggelezen');
  assert.equal(S2.magOnline(), true);
});

t('een bewaarde nee blijft nee', async () => {
  zetBestand({ v: 10 });
  const S = await laad();
  S.setSetting('onlineMeedoen', false);
  const S2 = await laad();
  assert.equal(S2.getSettings().onlineMeedoen, false);
  assert.equal(S2.magOnline(), false);
});

t('onbruikbare waarden worden null, nooit een stille ja', async () => {
  for (const fout of ['true', 'ja', 1, 0, {}, [], 'false']) {
    zetBestand({ onlineMeedoen: fout, v: 10 });
    const S = await laad();
    assert.equal(S.getSettings().onlineMeedoen, null, `waarde ${JSON.stringify(fout)}`);
    assert.equal(S.magOnline(), false);
  }
});

t('de ja blijft staan bij Standaard herstellen', async () => {
  zetBestand({ onlineMeedoen: true, v: 10 });
  const S = await laad();
  S.resetSettings();
  assert.equal(S.getSettings().onlineMeedoen, true, 'een toestemming intrekken is geen standaardwaarde');
});

t('de nee blijft ook staan bij Standaard herstellen', async () => {
  zetBestand({ onlineMeedoen: false, v: 10 });
  const S = await laad();
  S.resetSettings();
  assert.equal(S.getSettings().onlineMeedoen, false);
});

t('naar null terugzetten kan niet per ongeluk via een lege waarde', async () => {
  zetBestand({ onlineMeedoen: true, v: 10 });
  const S = await laad();
  // undefined valt in setSetting af (key bestaat wel, maar de waarde verandert naar undefined)
  S.setSetting('onlineMeedoen', undefined);
  const S2 = await laad();
  assert.equal(S2.getSettings().onlineMeedoen, null, 'een ongeldige waarde landt als "nog nooit gevraagd"');
  assert.equal(S2.magOnline(), false);
});

t('de opslag mag false bewaren, maar de vraag komt terug tot er een ja en een geldige naam is', async () => {
  zetBestand({ onlineMeedoen: false, onlineNaam: '', v: 10 });
  const C = await import('../game/js/onlineconsent.js');
  assert.equal(C.moetVragen({ onlineMeedoen: false, onlineNaam: '' }), true);
  assert.equal(C.moetVragen({ onlineMeedoen: true, onlineNaam: '' }), true, 'lege naam vraagt opnieuw');
  assert.equal(C.moetVragen({ onlineMeedoen: true, onlineNaam: 'Bouwer' }), false);
});

// Sequentieel: elke case gebruikt dezelfde opslag, dus parallel lopen ze door elkaar.
for (const { naam, f } of gevallen) {
  try {
    await f();
    n++;
  } catch (e) {
    console.error(`FAIL ${naam}`);
    throw e;
  }
}
console.log(`ok: ${n} checks`);
