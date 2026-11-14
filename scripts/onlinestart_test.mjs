// Samen spelen (#530, ADR 0022, eigenaarsopdracht 13-11): altijd online en een verplichte
// naam. De eerste-startkaart is één stap met naamveld + "Doorgaan"; er is geen "Meedoen",
// "Alleen spelen" of "Later" en Escape/time-out slaat de vraag niet over. Deze test gebruikt
// een nep-DOM en een localStorage die alleen gde-settings toestaat.
//   node scripts/onlinestart_test.mjs
import assert from 'node:assert/strict';

const log = { ws: [], pc: [] };
globalThis.WebSocket = class {
  constructor(url) { log.ws.push(url); this.url = url; setTimeout(() => this.onerror && this.onerror(new Error('nep')), 0); }
  send() {} close() {}
};
globalThis.RTCPeerConnection = class {
  constructor(cfg) { log.pc.push(cfg); this.localDescription = null; }
  createDataChannel() { return { close() {} }; }
  async createOffer() { return { type: 'offer', sdp: 'v=0' }; }
  async setLocalDescription() {} addEventListener() {} removeEventListener() {} close() {}
};
globalThis.window = globalThis;
globalThis.navigator ??= {};

const KEY = 'gde-settings';
const opslag = new Map();
globalThis.localStorage = {
  getItem: (k) => (k === KEY && opslag.has(k) ? opslag.get(k) : null),
  setItem: (k, v) => { if (k !== KEY) throw new Error(`test schreef naar ${k}`); opslag.set(k, String(v)); },
  removeItem: (k) => opslag.delete(k),
  clear: () => opslag.clear(),
};
globalThis.document = { addEventListener() {}, removeEventListener() {}, hidden: false, body: null, head: null };

const S = await import('../game/js/settings.js');
const { EERSTE_START, SCHAKELAAR, moetVragen, kiesNaam, kiesToestemming, zetMeedoen } = await import('../game/js/onlineconsent.js');
const { onlineStartHtml, meedoenSchakelaarHtml, mountOnlineStart, openOnlineStart, maybeOpenOnlineStart } = await import('../game/js/onlineconsentui.js');

let n = 0;
const t = async (naam, f) => { await f(); n++; };
const bewaard = () => { const s = opslag.get(KEY); return s ? JSON.parse(s) : null; };
const naar = (waarde) => S.setSetting('onlineMeedoen', waarde);
const naamZet = (waarde) => S.setSetting('onlineNaam', waarde);
const schoon = () => { naar(null); naamZet(''); };

// --- 1. verplicht: altijd online én een geldige, niet-lege naam --------------------
await t('moetVragen vraagt tot onlineMeedoen true is én de naam geldig is', async () => {
  schoon();
  assert.equal(moetVragen(), true);
  for (const [waarde, naam, verwacht] of [[null, '', true], [false, '', true], [false, 'Bouwer', true], [true, '', true], [true, '   ', true], [true, 'Tessa', true], [true, 'x'.repeat(17), true], [true, '.', true], [true, '...', true], [true, 'Bouwer', false]]) {
    naar(waarde); naamZet(naam);
    assert.equal(moetVragen({ onlineMeedoen: S.getSettings().onlineMeedoen, onlineNaam: S.getSettings().onlineNaam }), verwacht, `${waarde}/${naam}`);
  }
  naar(true); naamZet('Bouwer');
  assert.equal(moetVragen(), false);
});

await t('de oude keuze "alleen" (false) wordt bij de volgende start omgezet naar de vraag', async () => {
  naar(false); naamZet('Bouwer');
  assert.equal(moetVragen(), true, 'false is niet meer genoeg');
  kiesNaam('Bouwer');
  assert.equal(S.getSettings().onlineMeedoen, true);
  assert.equal(moetVragen(), false);
});

// --- 2. de kaart: één verplichte stap, één knop --------------------------------
await t('de kaart heeft een naamveld en precies één knop Doorgaan', async () => {
  const html = onlineStartHtml({ naam: '', fout: '' });
  assert.match(html, /Je naam/);
  assert.match(html, /gaat naar je medespeler en naar de openbare servers/);
  assert.match(html, /niet naar een server van ons/);
  assert.match(html, new RegExp(`>${EERSTE_START.doorgaan}<`));
  assert.equal((html.match(/<button\b/g) || []).length, 1, 'één knop: Doorgaan');
  assert.ok(!/data-keuze|Meedoen<|Alleen spelen|Later</.test(html), 'geen tweede antwoord of uitstelknop');
  assert.match(html, /class="os-naam"[^>]*maxlength="16"[^>]*required/, 'verplicht naamveld met dezelfde grens als het profiel');
  assert.ok(html.indexOf('class="os-naam"') < html.indexOf('data-doorgaan'), 'het naamveld staat boven de knop');
});

// --- 3. lege of geweigerde naam blijft op de kaart ------------------------------
await t('een lege naam wordt geweigerd: geen instelling, fout en de kaart blijft', async () => {
  schoon();
  let gekozen = null;
  const root = nepRoot('');
  mountOnlineStart(root, { onKies: (r) => { gekozen = r; } });
  root.klik();
  assert.equal(gekozen, null, 'de kaart sluit niet');
  assert.equal(S.getSettings().onlineMeedoen, null);
  assert.equal(S.getSettings().onlineNaam, '');
  assert.match(root.innerHTML, /role="alert"/);
  assert.match(root.innerHTML, /Vul een naam in/);
  assert.deepEqual([log.ws.length, log.pc.length], [0, 0]);
});

await t('een verhaalnaam wordt via dezelfde filter geweigerd, met dezelfde uitleg', async () => {
  schoon();
  let gekozen = false;
  const root = nepRoot('Tessa');
  mountOnlineStart(root, { onKies: () => { gekozen = true; } });
  root.klik();
  assert.equal(gekozen, false);
  assert.equal(S.getSettings().onlineMeedoen, null);
  assert.match(root.innerHTML, /Tammo en Tessa horen bij het verhaal/);
  assert.match(root.innerHTML, /value="Tessa"/, 'de geweigerde naam blijft staan');
});

// --- 4. Doorgaan schrijft altijd online = true + de naam -----------------------
await t('Doorgaan schrijft onlineMeedoen = true en de naam, en verbindt zelf niets', async () => {
  schoon();
  let gekozen = null;
  const root = nepRoot('Bouwer');
  mountOnlineStart(root, { onKies: (r) => { gekozen = r; } });
  root.klik();
  assert.equal(S.getSettings().onlineMeedoen, true);
  assert.equal(bewaard().onlineMeedoen, true);
  assert.equal(S.getSettings().onlineNaam, 'Bouwer');
  assert.equal(bewaard().onlineNaam, 'Bouwer');
  assert.equal(gekozen.keuze, 'doorgaan');
  assert.equal(gekozen.meedoen, true);
  assert.deepEqual([log.ws.length, log.pc.length], [0, 0], 'de kaart is geen netwerklaag');
  assert.equal(root.innerHTML, '', 'de kaart is weg');
  assert.equal(moetVragen(), false);
});

await t('Enter in het naamveld doet hetzelfde als Doorgaan', async () => {
  schoon();
  let gekozen = 0;
  const root = nepRoot('Bouwer');
  mountOnlineStart(root, { onKies: () => { gekozen++; } });
  root.toets('Enter', root.veld());
  assert.equal(gekozen, 1);
  assert.equal(S.getSettings().onlineMeedoen, true);
});

// --- 5. geen skip: Escape en een time-out bestaan niet ------------------------
await t('Escape sluit de kaart niet en bewaart niets', async () => {
  schoon();
  let gekozen = null;
  const root = nepRoot('Bouwer');
  mountOnlineStart(root, { onKies: (r) => { gekozen = r; } });
  root.toets('Escape', root.veld());
  assert.equal(gekozen, null, 'Escape doet niets');
  assert.equal(S.getSettings().onlineMeedoen, null);
  assert.match(root.innerHTML, /Je naam voor Samen spelen/, 'de kaart staat er nog');
});

await t('er is geen later/close-API meer om de vraag over te slaan', async () => {
  const ui = await import('../game/js/onlineconsentui.js');
  assert.equal('closeOnlineStart' in ui, false, 'geen sluitfunctie voor de boot');
  const c = await import('../game/js/onlineconsent.js');
  assert.equal('kiesToestemming' in c, true, 'oude aanroep blijft bestaan');
});

// --- 6. de overlay resolvet pas na een geldige naam ---------------------------
await t('openOnlineStart wacht op Doorgaan; Escape laat de belofte open', async () => {
  schoon();
  const ouders = [];
  const maak = () => {
    const el = {
      id: '', className: '', innerHTML: '', listeners: {},
      appendChild() {}, setAttribute() {}, remove() { el.weg = true; },
      querySelector(sel) { return sel === '.os-naam' ? { value: 'Bouwer', focus() {}, classList: { contains: () => true }, closest: () => null } : sel === '[data-doorgaan]' ? { focus() {} } : null; },
      querySelectorAll() { return []; },
      addEventListener(ev, f) { (el.listeners[ev] || (el.listeners[ev] = [])).push(f); },
    };
    ouders.push(el);
    return el;
  };
  document.createElement = maak;
  document.body = { appendChild() {}, classList: { toggle() {}, contains: () => false } };
  const belofte = openOnlineStart();
  const kaart = ouders[0];
  kaart.listeners.keydown.forEach((h) => h({ key: 'Escape', target: { classList: { contains: () => false } }, preventDefault() {} }));
  assert.equal(S.getSettings().onlineMeedoen, null, 'Escape heeft niets opgeslagen');
  const knop = { getAttribute: () => 'doorgaan' };
  kaart.listeners.click.forEach((h) => h({ target: { closest: (s) => (s === '[data-doorgaan]' ? knop : null) } }));
  const antwoord = await belofte;
  assert.equal(antwoord.keuze, 'doorgaan');
  assert.equal(S.getSettings().onlineMeedoen, true);
  assert.equal(kaart.weg, true);
});

// --- 7. de boot vraagt alleen als het moet -----------------------------------
await t('maybeOpenOnlineStart slaat de vraag over als de naam al geldig is', async () => {
  naar(true); naamZet('Bouwer');
  assert.equal(await maybeOpenOnlineStart({ settings: S.getSettings() }), null);
  naar(false); naamZet('Bouwer');
  assert.equal(moetVragen(), true, 'false vraagt opnieuw');
  naar(true); naamZet('');
  assert.equal(moetVragen(), true, 'een lege naam vraagt opnieuw');
});

// --- 8. de schakelaar blijft dezelfde sleutel lezen ---------------------------
await t('de schakelaar leest en schrijft dezelfde sleutel', async () => {
  naar(true);
  assert.doesNotMatch(meedoenSchakelaarHtml(), /data-meedoen|type="checkbox"/);
  assert.match(meedoenSchakelaarHtml(), /altijd online/);
  const r = zetMeedoen(false);
  assert.equal(r.meedoen, false);
  assert.equal(S.getSettings().onlineMeedoen, false);
  naar(true);
});

// --- 9. geen netwerk vanaf de kaart ------------------------------------------
await t('de kaart opent geen WebSocket of RTCPeerConnection', async () => {
  assert.deepEqual([log.ws.length, log.pc.length], [0, 0]);
});

// A DOM element for the card, as small as the card needs. A key gets its keyup too (AGENTS.md).
function nepRoot(startWaarde) {
  const r = {
    innerHTML: '', waarde: startWaarde, listeners: {}, focus: null,
    veld() { return { value: r.waarde, classList: { contains: (c) => c === 'os-naam' }, focus() { r.focus = 'naam'; }, closest: () => null }; },
    querySelector(sel) {
      if (sel === '.os-naam') return r.veld();
      if (sel === '[data-doorgaan]') return { focus() { r.focus = 'doorgaan'; } };
      return null;
    },
    querySelectorAll() { return [r.veld(), { focus() { r.focus = 'doorgaan'; } }]; },
    addEventListener(ev, f) { (r.listeners[ev] || (r.listeners[ev] = [])).push(f); },
    toets(key, target) { (r.listeners.keydown || []).forEach((h) => h({ key, target, shiftKey: false, preventDefault() {} })); },
    klik() {
      const target = { closest: (s) => (s === '[data-doorgaan]' ? { getAttribute: () => 'doorgaan' } : null) };
      (r.listeners.click || []).forEach((h) => h({ target, preventDefault() {} }));
    },
  };
  return r;
}

console.log(`onlinestart_test: ${n}/${n} ok`);
process.exit(0);
