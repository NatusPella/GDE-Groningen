// Review 0.63: het kamercodeveld op het joinscherm raakte zijn tekst, focus en cursor kwijt
// zodra het scherm opnieuw tekende (de lijst ververst elke paar seconden). Deze test gebruikt
// een nep-DOM en een nep-opslag; er wordt niets verbonden en niets naar buiten gestuurd.
//   node scripts/lobbyui_codeveld_test.mjs
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.navigator ??= {};
globalThis.WebSocket = class { constructor() { throw new Error('geen netwerk in deze test'); } };
globalThis.RTCPeerConnection = class { constructor() { throw new Error('geen netwerk in deze test'); } };
const geheugen = new Map();
globalThis.localStorage = { getItem: (k) => (geheugen.has(k) ? geheugen.get(k) : null), setItem: (k, v) => geheugen.set(k, String(v)), removeItem: (k) => geheugen.delete(k) };
// De lijst opent alleen zonder toestemmingsvraag als dit apparaat die eerder koos; de test gaat
// rechtstreeks naar de lijst-weergave en doet geen netwerk.
geheugen.set('gde-settings', JSON.stringify({ multiplayerConsentRemembered: true }));
globalThis.document = { activeElement: null, addEventListener() {} };

const { mountLobby } = await import('../game/js/lobbyui.js');

// Een tekstveld zoals de browser het aan de tekenfunctie geeft: waarde, cursor en focus.
function veld(klasse, waarde = '', start = 0, eind = 0) {
  return {
    value: waarde, selectionStart: start, selectionEnd: eind, focused: false, selectie: null,
    classList: { contains: (c) => c === klasse },
    focus() { this.focused = true; },
    setSelectionRange(a, b) { this.selectie = [a, b]; },
  };
}
// Elke querySelector('.coop-input') geeft een nieuw veld, net als een echte innerHTML-hertekening.
function fakeRoot() {
  const r = { innerHTML: '', listeners: {}, nieuw: {} };
  r.querySelector = (q) => {
    if (!q.startsWith('.')) return null;
    const k = q.slice(1);
    r.nieuw[k] = veld(k);
    return r.nieuw[k];
  };
  r.contains = () => true;
  r.addEventListener = (ev, f) => { (r.listeners[ev] || (r.listeners[ev] = [])).push(f); };
  r.click = (act) => (r.listeners.click || []).forEach((h) => h({ target: { closest: () => ({ dataset: { act } }) } }));
  return r;
}
const hooks = () => ({ startHost: () => ({ roster: { max: 4, spelers: [] }, vrijePlekken: true }), addGuest() {}, startClient() {}, setMax: (m) => m });

let n = 0;
const t = (naam, f) => { f(); n++; console.log('ok ' + naam); };

// Het veld waar de speler in typt: de browser zet de waarde en de cursor, daarna komt het input-event.
function typ(root, lobby, tekst) {
  const invoer = veld('coop-input', tekst, tekst.length, tekst.length);
  document.activeElement = invoer;
  (root.listeners.input || []).forEach((h) => h({ target: invoer }));
  return invoer;
}
// Een hertekening zoals de 2s-verversing hem veroorzaakt: de staat wordt opnieuw getekend.
function herteken(lobby) { lobby.event({ t: 'wens', char: 'tessa' }); }

const root = fakeRoot();
const lobby = mountLobby(root, hooks());
root.click('kies-gast');
assert.equal(lobby.state().step, 'gast-typt');

t('typen staat meteen in de staat en in het veld', () => {
  typ(root, lobby, 'K3J9D');
  assert.equal(lobby.state().invoerDraft, 'K3J9D');
  herteken(lobby);
  assert.match(root.innerHTML, /value="K3J9D"/, 'de volgende tekening begint met de getypte tekst');
});

t('een hertekening houdt waarde, focus en cursor vast', () => {
  document.activeElement = veld('coop-input', 'K3J9D', 5, 5);
  herteken(lobby);
  const na = root.nieuw['coop-input'];
  assert.ok(na, 'het kamercodeveld staat er weer');
  assert.equal(na.focused, true, 'de focus gaat terug naar het veld');
  assert.equal(na.value, 'K3J9D', 'de getypte tekst blijft staan');
  assert.deepEqual(na.selectie, [5, 5], 'de cursor staat op dezelfde plek');
});

t('de cursorpositie midden in de code blijft ook bewaard', () => {
  document.activeElement = veld('coop-input', 'K3J9D', 2, 4);
  herteken(lobby);
  const na = root.nieuw['coop-input'];
  assert.equal(na.value, 'K3J9D');
  assert.deepEqual(na.selectie, [2, 4], 'een selectie binnen de code blijft een selectie');
});

t('wat net in het veld stond maar nog niet in de staat zat, wint bij de hertekening', () => {
  // bijvoorbeeld plakken zonder input-event: de staat is leeg, het veld niet
  document.activeElement = veld('coop-input', 'ABCDE', 5, 5);
  herteken(lobby);
  const na = root.nieuw['coop-input'];
  assert.equal(na.value, 'ABCDE', 'de waarde uit het veld wordt niet weggegooid');
  assert.equal(na.focused, true);
});

t('zonder actief veld wordt er niets gestolen', () => {
  document.activeElement = null;
  root.nieuw = {};
  herteken(lobby);
  assert.equal(root.nieuw['coop-input'], undefined, 'geen veld om focus aan te geven');
});

t('ook het wachtwoordveld houdt zijn focus bij een hertekening', () => {
  document.activeElement = veld('coop-wachtwoord', 'geheim', 3, 3);
  herteken(lobby);
  const na = root.nieuw['coop-wachtwoord'];
  assert.equal(na.focused, true);
  assert.deepEqual(na.selectie, [3, 3]);
});

t('de lijst met openbare sessies ververst: het kamercodeveld houdt tekst en cursor (de 2s-herteken)', () => {
  const r = fakeRoot();
  const l = mountLobby(r, hooks());
  r.click('kies-gast');
  l.event({ t: 'lijst-vraag' }); // naar de lijst zonder echt te verbinden
  assert.equal(l.state().step, 'lijst');
  const invoer = veld('coop-input', 'K3J9D', 5, 5);
  document.activeElement = invoer;
  (r.listeners.input || []).forEach((h) => h({ target: invoer }));
  l.event({ t: 'lijst-data', lijst: [] }); // de verversing van elke 2 s
  const na = r.nieuw['coop-input'];
  assert.equal(na.focused, true, 'de focus blijft in het kamercodeveld');
  assert.equal(na.value, 'K3J9D', 'de getypte code blijft staan');
  assert.deepEqual(na.selectie, [5, 5], 'de cursor blijft achter de code');
  l.close();
});

t('een oude foutmelding verdwijnt zodra je weer typt', () => {
  const r = fakeRoot();
  const l = mountLobby(r, hooks());
  r.click('kies-gast');
  l.event({ t: 'invoer', text: 'K3J9' }); // ongeldig: de melding staat in beeld
  assert.match(r.innerHTML, /geen kamercode/);
  const invoer = veld('coop-input', 'K3J9D', 5, 5);
  document.activeElement = invoer;
  (r.listeners.input || []).forEach((h) => h({ target: invoer }));
  assert.doesNotMatch(r.innerHTML, /geen kamercode/, 'de oude melding is weg');
  assert.equal(r.nieuw['coop-input'].focused, true, 'en de focus blijft in het veld');
  assert.equal(r.nieuw['coop-input'].value, 'K3J9D');
  l.close();
});

lobby.close();
console.log(`lobbyui_codeveld_test: ${n} checks ok`);
