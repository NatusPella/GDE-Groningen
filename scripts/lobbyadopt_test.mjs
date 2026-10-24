// Samen spelen (#434): het paneel kent de huidige sessie na het overdragen van het spel, en een gekickte gast heeft de kamercode nog:
//   node scripts/lobbyadopt_test.mjs
// Alle "netwerk" is een dubbelganger; er wordt niets verbonden.
import assert from 'node:assert/strict';

globalThis.WebSocket = class { constructor() { setTimeout(() => this.onerror && this.onerror(new Error('nep')), 0); } send() {} close() {} };
globalThis.RTCPeerConnection = class { constructor() { this.localDescription = null; } createDataChannel() { return { close() {} }; } async createOffer() { return { type: 'offer', sdp: 'v=0' }; } async setLocalDescription() {} addEventListener() {} removeEventListener() {} close() {} };
globalThis.window = globalThis;
globalThis.navigator ??= {};

const { mountLobby } = await import('../game/js/lobbyui.js');
const { createLobby, reduce, view } = await import('../game/js/lobby.js');

let n = 0;
const t = async (name, f) => { await f(); n++; console.log('ok  ' + name); };
function fakeRoot() {
  const r = { innerHTML: '', handlers: [], querySelector: () => null, contains: () => true, addEventListener(ev, f) { this.handlers.push(f); } };
  r.click = (act) => r.handlers.forEach((h) => h({ target: { closest: () => ({ dataset: { act } }) } }));
  return r;
}
const roster = (spelers, max = 4) => ({ max, spelers: spelers.map(([slot, char]) => ({ slot, char, rol: slot === 0 ? 'host' : 'gast', verbinding: 'ok', token: 't' + slot })) });

await t('de nieuwe host na een overdracht: het paneel toont de kamercode, de spelers en Iedereen stoppen (geen beginscherm)', async () => {
  const root = fakeRoot(), uit = [];
  const hub = { roster: roster([[0, 'anita'], [1, 'tammo']]), vrijePlekken: true, onchange: null };
  const lobby = mountLobby(root, { disconnect: (a) => uit.push(a), kick() {} }, { adopt: { code: 'ABCDE-FGHJK', route: 'kamer' }, rol: 'host', hub });
  assert.equal(lobby.state().step, 'verbonden'); assert.equal(lobby.state().rol, 'host');
  assert.match(root.innerHTML, /ABCDE-FGHJK/, 'de nieuwe host ziet de code'); assert.match(root.innerHTML, /Iedereen stoppen/); assert.match(root.innerHTML, /eruit zetten/);
  assert.doesNotMatch(root.innerHTML, /Iemand uitnodigen|Code of adres invoeren/, 'niet het beginscherm');
  assert.equal(typeof hub.onchange, 'function', 'de spelerslijst volgt de hub');
  hub.onchange(roster([[0, 'anita'], [1, 'tammo'], [2, 'tessa']])); assert.equal(lobby.state().spelers.length, 3);
  root.click('verbreek'); assert.deepEqual(uit, ['verbreek'], 'Iedereen stoppen werkt');
  lobby.close();
});

await t('de oude host als gast, en een gast die het paneel opnieuw tekent: Spel verlaten staat er, met de spelers en wie het spel opende', async () => {
  const root = fakeRoot(), uit = [];
  const session = { slot: 1, onstatus: null, onevent: null, welcome: { max: 4, lijst: [{ slot: 0, char: 'anita', naam: 'Tammo', rol: 'host' }, { slot: 1, char: 'tammo', naam: 'Tessa', rol: 'gast' }] } };
  const lobby = mountLobby(root, { disconnect: (a) => uit.push(a) }, { adopt: { code: '', route: 'kamer' }, rol: 'gast', session });
  assert.equal(lobby.state().step, 'verbonden'); assert.equal(lobby.state().rol, 'gast');
  assert.match(root.innerHTML, /Spel verlaten/); assert.match(root.innerHTML, /Spelers \(2 van 4\)/);
  assert.equal(typeof session.onstatus, 'function', 'het paneel luistert naar de sessie');
  root.click('verbreek'); assert.deepEqual(uit, ['verbreek']);
  lobby.close();
});

await t('een gast die aansloot met een kamercode: na eruit gezet worden staat de code klaar in het invoervak', async () => {
  const root = fakeRoot(), session = { slot: 1, onstatus: null, onevent: null, welcome: null };
  let code = null;
  const lobby = mountLobby(root, { canJoin: () => ({ ok: true }), startClient: () => session, onCode: (c) => { code = c; } }, {});
  lobby.event({ t: 'kies', rol: 'gast' });
  lobby.event({ t: 'invoer', text: 'ABCDE-FGHJK' }); assert.equal(lobby.state().step, 'toestemming');
  root.click('akkoord'); await new Promise((r) => setTimeout(r, 30));
  lobby.event({ t: 'status', status: 'ok', partner: { slot: 1 } });
  lobby.event({ t: 'status', status: 'weg' }); // de host zette hem eruit
  assert.equal(lobby.state().step, 'start', 'beginscherm, zoals bij elk einde');
  root.click('kies-gast');
  assert.equal(lobby.state().step, 'gast-typt');
  assert.equal(code, 'ABCDE-FGHJK', 'de code is bewaard');
  assert.equal(lobby.state().caps.laatsteCode, 'ABCDE-FGHJK', 'en staat klaar in het paneel zelf, niet alleen in de opslag');
  assert.match(root.innerHTML, /value="ABCDE-FGHJK"/, 'het invoervak is al ingevuld');
  lobby.close();
});

await t('pure logica: laatste-code overleeft het beginscherm; adopteer zet rol, code en spelers; een onzin-code verandert niets', () => {
  let s = createLobby({ rtc: true });
  s = reduce(s, { t: 'laatste-code', code: 'ABCDE-FGHJK' });
  assert.equal(s.caps.laatsteCode, 'ABCDE-FGHJK');
  assert.equal(reduce(s, { t: 'laatste-code', code: '' }).caps.laatsteCode, 'ABCDE-FGHJK');
  s = reduce(reduce(s, { t: 'status', status: 'ok' }), { t: 'status', status: 'weg' });
  assert.equal(s.step, 'start'); assert.equal(s.caps.laatsteCode, 'ABCDE-FGHJK', 'de code blijft na eruit gezet worden');
  assert.equal(view(reduce(s, { t: 'kies', rol: 'gast' })).input.value, 'ABCDE-FGHJK', 'het invoervak is al ingevuld');
  const a = reduce(createLobby({ rtc: true }), { t: 'adopteer', rol: 'host', route: 'kamer', code: 'ZZZZZ-ZZZZZ', lijst: [{ slot: 0, naam: 'Tammo', verbinding: 'ok' }], max: 4, slot: 0 });
  assert.equal(a.step, 'verbonden'); assert.equal(a.code, 'ZZZZZ-ZZZZZ'); assert.equal(a.rol, 'host');
  assert.equal(reduce(createLobby({}), { t: 'adopteer', rol: 'iets', route: 'iets', lijst: 'onzin' }).rol, 'gast', 'onzin valt terug op de veilige keuze');
});

console.log(`lobbyadopt_test: ${n}/4 ok`);
