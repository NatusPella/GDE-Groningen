// Samen spelen (#1059, testbank): wat de testbank als gast klikt moet kloppen met de Samen-wizard. Na 'Ik heb een kamercode gekregen' komt eerst
// 'Wie ben jij?' (wie-verder); pas daarna staat het kamercodeveld er. Een gast die dat overslaat (zoals coop.page.js tot 23-11) wacht vergeefs op het
// invoerveld en de hele testbank-run met een gast valt om. Plus: de beurtenlijst van een overname is voor elke gast dezelfde en een late speler
// (niet in de lijst) wordt nooit host.
// Samen-regel: dit is testtooling; het speelt niets, verandert geen spelregel en raakt geen wereld, host of gast. Pure test, zonder netwerk en zonder Electron.
//   node scripts/coop/gastwizard_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { beurtOp, rangschik, BEURT_S } from '../../game/js/coophostwissel.js';

globalThis.window = globalThis;
globalThis.navigator ??= {};
globalThis.WebSocket = class { constructor() { throw new Error('geen netwerk in deze test'); } };
globalThis.RTCPeerConnection = class { constructor() { throw new Error('geen netwerk in deze test'); } };
const geheugen = new Map();
globalThis.localStorage = { getItem: (k) => (geheugen.has(k) ? geheugen.get(k) : null), setItem: (k, v) => geheugen.set(k, String(v)), removeItem: (k) => geheugen.delete(k) };
globalThis.document = { activeElement: null, addEventListener() {} };
const { mountLobby } = await import('../../game/js/lobbyui.js');

function fakeRoot() {
  const r = { innerHTML: '', listeners: {} };
  r.querySelector = (q) => (q.startsWith('.') ? { value: '', classList: { contains: () => false }, focus() {}, setSelectionRange() {} } : null);
  r.contains = () => true;
  r.addEventListener = (ev, f) => { (r.listeners[ev] || (r.listeners[ev] = [])).push(f); };
  r.click = (act) => (r.listeners.click || []).forEach((h) => h({ target: { closest: () => ({ dataset: { act } }) } }));
  return r;
}
const hooks = () => ({ startHost: () => ({ roster: { max: 4, spelers: [] }, vrijePlekken: true }), addGuest() {}, startClient() {}, setMax: (m) => m });
const acts = (r) => [...r.innerHTML.matchAll(/data-act="([^"]+)"/g)].map((m) => m[1]);
let n = 0;
const t = async (naam, f) => { await f(); n++; console.log('ok ' + naam); };

await t('gast: eerst Wie ben jij (geen kamercodeveld), na wie-verder het kamercodeveld', async () => {
  const root = fakeRoot(); mountLobby(root, hooks(), { wizard: true });
  root.click('kies-gast');
  assert.ok(acts(root).includes('wie-verder'), 'de kaart Wie ben jij heeft Verder: ' + acts(root));
  assert.ok(!/class="coop-input"/.test(root.innerHTML), 'zonder wie-verder is er nog geen kamercodeveld');
  root.click('wie-verder');
  assert.ok(/class="coop-input"/.test(root.innerHTML), 'na wie-verder staat het kamercodeveld er');
  assert.ok(acts(root).includes('koppel') && acts(root).includes('lijst'), 'koppel en de openbare lijst zijn er: ' + acts(root));
});

await t('host: na wie-verder de keuze privé of openbaar', async () => {
  const root = fakeRoot(); mountLobby(root, hooks(), { wizard: true });
  root.click('kies-host');
  // 'Wie ben jij?' komt één keer per paginasessie (de gast hierboven bevestigde hem al): de testbank-wizard() neemt beide gevallen
  if (acts(root).includes('wie-verder')) root.click('wie-verder');
  assert.ok(acts(root).includes('wijze-prive') && acts(root).includes('host-open'), acts(root).join(','));
});

await t('testbank: elke klik op kies-gast wordt gevolgd door de wizard-stappen', async () => {
  for (const f of ['coop.page.js', 'playtest.phases.js']) {
    const regels = fs.readFileSync(new URL('./' + f, import.meta.url), 'utf8').split(/\r?\n/);
    regels.forEach((r, i) => { if (/act\('kies-gast'\)/.test(r)) assert.ok(/wizard\(/.test(r) || /wizard\(/.test(regels[i + 1] || ''), `${f}:${i + 1} klikt kies-gast zonder wizard(): de gast mist Wie ben jij`); });
  }
});

await t('overname: elke gast ziet dezelfde opvolger en dezelfde beurten; een late speler komt nooit aan de beurt', async () => {
  const kand = [{ slot: 1, ping: 40, sinds: 300 }, { slot: 2, ping: 20, sinds: 200 }, { slot: 3, ping: 10, sinds: 100 }];
  const lijst = rangschik(kand).map((r, i) => (i === 0 ? { ...r, duur: BEURT_S + 15 } : r));
  assert.deepEqual(lijst.map((r) => r.slot), [1, 2, 3], 'de langst verbonden speler eerst (#450)');
  assert.equal(beurtOp(lijst, 0), 0); assert.equal(beurtOp(lijst, BEURT_S + 14), 0); assert.equal(beurtOp(lijst, BEURT_S + 15), 1);
  assert.equal(beurtOp(lijst, 3 * BEURT_S + 15), 3, 'na de laatste: lijst.length (mislukt)');
  assert.ok(!lijst.some((r) => r.slot === 4), 'een late speler staat niet in de lijst: hij sluit aan, hij wordt geen host');
  assert.deepEqual(rangschik([{ slot: 0, ping: 1 }, { slot: 5, ping: 9 }]).map((r) => r.slot), [5], 'plek 0 (wie het spel opende) is nooit opvolger');
});

console.log(`gastwizard_test: ${n}/${n} ok`);
