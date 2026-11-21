// De afsluitvraag op het startscherm (#915, game/js/quitconfirmui.js) met een kleine DOM-nabootsing:  node scripts/quitconfirm_test.mjs
import fs from 'node:fs';

let n = 0, fails = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log(`FAIL ${name}`); } };

// minimale DOM: één overlay met twee knoppen
const listeners = [];
const knoppen = ['nee', 'ja'].map((qc) => ({ dataset: { qc }, focus() { doc.activeElement = this; }, closest() { return this; } }));
const klikken = [];
let verwijderd = false;
const el = { id: '', className: '', set innerHTML(v) { this.html = v; }, querySelectorAll: () => knoppen, querySelector: (s) => knoppen.find((k) => s.includes(`"${k.dataset.qc}"`)), addEventListener: (t, f) => klikken.push(f), remove() { verwijderd = true; } };
const doc = { body: { appendChild() {} }, createElement: () => el, activeElement: null };
globalThis.document = doc;
globalThis.window = { addEventListener: (t, f) => listeners.push(f), removeEventListener: (t, f) => { const i = listeners.indexOf(f); if (i >= 0) listeners.splice(i, 1); } };

const { askQuitConfirm, isQuitConfirmOpen, QUIT_TEXT } = await import('../game/js/quitconfirmui.js');
const key = (k, extra = {}) => { const e = { key: k, preventDefault() {}, stopPropagation() {}, ...extra }; [...listeners].forEach((f) => f(e)); };

ok(/voortgang/.test(QUIT_TEXT.uitleg) && /Weet je het zeker/.test(QUIT_TEXT.titel), 'de vraag meldt de voortgang');
let ja = 0, nee = 0;
ok(askQuitConfirm({ onYes: () => ja++, onNo: () => nee++ }) === true && isQuitConfirmOpen(), 'de vraag opent');
ok(!askQuitConfirm(), 'één vraag tegelijk');
ok(doc.activeElement === knoppen[0], 'Annuleren heeft de voorselectie');
key('Enter');
ok(nee === 1 && ja === 0 && !isQuitConfirmOpen() && verwijderd && listeners.length === 0, 'Enter op de voorselectie sluit niets af');
askQuitConfirm({ onYes: () => ja++, onNo: () => nee++ });
key('ArrowRight'); key('Enter');
ok(ja === 1, 'pijl en Enter kiest Ja');
askQuitConfirm({ onYes: () => ja++, onNo: () => nee++ });
key('Escape');
ok(nee === 2 && ja === 1, 'Escape annuleert');
askQuitConfirm({ onYes: () => ja++, onNo: () => nee++ });
klikken[0]({ target: knoppen[1] });
ok(ja === 2, 'klik op Ja sluit af');

const ss = fs.readFileSync(new URL('../game/js/startscreen.js', import.meta.url), 'utf8');
ok(/askQuitConfirm\(\{ onYes: \(\) => window\.gdeDesktop\.quit\(\)/.test(ss), 'het startscherm vraagt eerst');
ok(!/it\.act === 'exit'\) \{\s*window\.gdeDesktop\.quit\(\)/.test(ss), 'het startscherm sluit niet meer direct');
ok(/isQuitConfirmOpen\(\) \|\| done/.test(ss), 'de menutoetsen wachten op de vraag');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
