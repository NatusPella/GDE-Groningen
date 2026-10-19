// Het hulpaanbod blokkeert nooit (#215): niet bij Spelbot/storytest, en een open aanbod sluit zichzelf.
// Draai: node scripts/assistlive_test.mjs   (met nep-DOM, zonder Electron)
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } };
const mkEl = () => { const e = { hidden: true, children: [], listeners: {}, innerHTML: '', textContent: '', dataset: {}, focus() {}, addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }, querySelector() { return mkEl(); }, querySelectorAll() { return []; }, closest() { return null; }, isConnected: false }; return e; };
globalThis.window = { addEventListener() {}, location: { search: '' } };
globalThis.document = { createElement: mkEl, body: { appendChild() {}, classList: { toggle() {}, add() {}, remove() {}, contains: () => false } }, documentElement: { classList: { toggle() {}, add() {}, remove() {}, contains: () => false }, style: { setProperty() {} } }, activeElement: null, pointerLockElement: null };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.location = { search: '' };
const A = await import('../game/js/assistlive.js');
const w = { uiPaused: false, input: { reset() {} } };
const shown = A.maybeOfferHelp(w, 'M07_test', 2);
ok(shown === true && w.uiPaused === true && A.isHelpOfferOpen(), 'aanbod opent na twee mislukkingen en pauzeert');
ok(A.OFFER_TIMEOUT_MS > 0 && A.OFFER_TIMEOUT_MS <= 60000, 'aanbod heeft een timeout van hooguit een minuut');
const fs = await import('node:fs');
const src = fs.readFileSync(new URL('../game/js/assistlive.js', import.meta.url), 'utf8');
ok(/AUTOPLAY \|\| STORY_TEST/.test(src), 'geen aanbod bij Spelbot of storytest');
ok(/setTimeout\(\(\) => \{ if \(isHelpOfferOpen\(\)\) closeOffer\('nee'\)/.test(src), 'timeout sluit als nee');
console.log(fails ? `${fails} mislukt` : 'assistlive_test ok');
process.exit(fails ? 1 : 0);
