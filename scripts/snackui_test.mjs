// Het tabblad Snackwagen (snackui.js): dicht met uitleg in plaats van een leeg scherm, open met wagen, menu, standplaatsen, Usmem, gebeurtenis en doelen; knoppen en bevestiging.
// node scripts/snackui_test.mjs
import assert from 'node:assert/strict';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';
import * as GT from '../game/js/bezitgate.js';
import * as SL from '../game/js/snacklive.js';
import * as U from '../game/js/snackui.js';
import { progressFrom, newGate } from '../game/js/unlockgate.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join(' | ')); } };
const nep = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem(k, v) { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
const wereld = (money = 1e6) => ({ money, calendar: { day: 100 }, msgs: [], addMessage(x) { this.msgs.push(x); } });
const reset = () => { const s = nep(); L.initBezit({ opslag: s }); BL.initBoerderij({ opslag: s }); L.setClaimLookup(null); L.setClaimSend(null); GT.resetUnlockGate(); U.sui.msg = ''; U.sui.confirm = null; };

t('dicht: uitleg van Tessa, geen lege pagina en geen knoppen', () => {
  reset(); GT.setGateProgress(() => progressFrom({ stepId: 'M01', gate: newGate() }));
  const h = U.snackHtml(SL.snackView(wereld()));
  assert.match(h, /Nog dicht/); assert.match(h, /Tessa/); assert.ok(!/data-sn=/.test(h)); assert.match(h, /Jelle Terpstra/);
  GT.setGateProgress(null);
});
t('open zonder wagen: aanbod van een snackwagen met bevestiging, de zestien plekken, Usmem en de doelen', () => {
  reset(); const w = wereld();
  const h = U.snackHtml(SL.snackView(w));
  assert.match(h, /Je hebt nog geen snackwagen/); assert.match(h, /data-sn="koop-wagen"/);
  assert.equal((h.match(/data-spot="/g) || []).length, 16);
  assert.match(h, /data-spot="markt" data-status="usmem"/); assert.match(h, /Neem over/); assert.match(h, /Usmem Snacks/);
  assert.equal((h.match(/data-goal="/g) || []).length, 11);
  assert.match(h, /Snackimperium/); assert.ok(!/Frietwagen/.test(h));
});
t('een koop vraagt een tweede druk; na Ja is de vergunning van jou en de plek toont verlengen en Zet mijn wagen hier', () => {
  reset(); const w = wereld(); SL.koopWagen(w);
  let h = U.snackHtml(SL.snackView(w));
  assert.match(h, /data-sn="vergunning" data-id="dorp"/);
  U.sui.confirm = 'vergunning:dorp';
  h = U.snackHtml(SL.snackView(w));
  assert.match(h, /bd-zeker/); assert.match(h, /data-ok="1"/);
  SL.koopVergunning(w, 'dorp'); U.sui.confirm = null;
  h = U.snackHtml(SL.snackView(w));
  assert.match(h, /data-spot="dorp" data-status="jij"/); assert.match(h, /data-sn="zet-wagen" data-id="dorp"/); assert.match(h, /data-sn="vloot" data-id="dorp"/);
});
t('de wagen op een plek: voorspelling, voorraad, knoppen voor uren en prijs, het menu met koeling dicht', () => {
  reset(); const w = wereld(); SL.koopWagen(w); SL.koopVergunning(w, 'park'); SL.zetWagen('park'); L.snackState().own.stockDays = 3;
  const h = U.snackHtml(SL.snackView(w));
  assert.match(h, /Noorderplantsoen/); assert.match(h, /voorraad voor 3 dagen/); assert.match(h, /vandaag ongeveer/);
  assert.match(h, /data-sn="open" data-patch="hours:9"/); assert.match(h, /data-sn="open" data-patch="pr:0\.95"/);
  assert.match(h, /data-sn="menu" data-id="burger" data-on="0" disabled/); assert.match(h, /data-sn="vul"/);
  assert.match(h, /Koeling/); assert.match(h, /Grotere wagen/);
});
t('een wachtende gebeurtenis staat bovenaan met antwoorden en kosten', () => {
  reset(); const w = wereld(); SL.koopWagen(w); SL.koopVergunning(w, 'park'); SL.zetWagen('park');
  L.snackState().ev.pending = { kind: 'storing', id: 1, wagon: 'own', spot: 'park', depth: 0, price: 0, text: 'Een frituurpan is net een vriendschap.', choices: [{ id: 'repareer', label: 'Direct laten repareren', cost: 350 }, { id: 'wacht', label: 'Wachten', cost: 0, def: true }], day: L.calToday(), deadline: L.calToday() + 3 };
  const h = U.snackHtml(SL.snackView(w));
  assert.match(h, /data-event="storing"/); assert.match(h, /Direct laten repareren \(€\s?350\)/); assert.match(h, /data-choice="wacht"/); assert.match(h, /Nog 4 dagen/);
  assert.ok(h.indexOf('data-event') < h.indexOf('Jouw snackwagen'));
});
t('de vloot, een prijzenoorlog en tekst-ontsnapping', () => {
  reset(); const w = wereld(); SL.koopVergunning(w, 'park'); SL.koopVloot(w, 'park', 'aandeel');
  const S = L.snackState(); S.fleet[0].staff.name = '<b>Marit</b>'; S.ev.war = { until: 105, depth: 0.2, matched: true, softened: false, ev: 1 };
  const h = U.snackHtml(SL.snackView(w));
  assert.match(h, /data-wagon="w1"/); assert.match(h, /30% van de winst/); assert.match(h, /&lt;b&gt;Marit/); assert.ok(!/<b>Marit<\/b>/.test(h));
  assert.match(h, /Prijzenoorlog tot dag 105/); assert.match(h, /jij prijst mee/);
});
t('de knoppen: renderSnackPanel bindt een klik en doet de actie (met een nepelement)', () => {
  reset(); const w = wereld(); SL.koopWagen(w);
  let handler = null; const el = { innerHTML: '', addEventListener(ev, fn) { if (ev === 'click') handler = fn; } };
  U.renderSnackPanel(el, w); assert.ok(handler); assert.match(el.innerHTML, /Snackwagen/);
  const click = (d) => handler({ target: { closest: () => ({ dataset: d }) } });
  click({ sn: 'vergunning', id: 'dorp' });
  assert.equal(U.sui.confirm, 'vergunning:dorp'); assert.ok(!L.snackState().permits.dorp);
  click({ sn: 'vergunning', id: 'dorp', ok: '1' });
  assert.ok(L.snackState().permits.dorp); assert.match(U.sui.msg, /Vergunning voor/);
  click({ sn: 'zet-wagen', id: 'dorp' }); assert.equal(L.snackState().own.spot, 'dorp');
  click({ sn: 'open', patch: 'hours:12' }); assert.equal(L.snackState().own.hours, 12);
  click({ sn: 'vul' }); assert.equal(L.snackState().own.stockDays, 5);
  click({ sn: 'menu', id: 'souffle' }); assert.match(U.sui.msg, /vol/);
  U.renderSnackPanel(el, w); assert.match(el.innerHTML, /Snackwagen/);
});
t('de bron: nederlands, geen merken, geen fetch, geen Math.random', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../game/js/snackui.js', import.meta.url), 'utf8');
  assert.ok(!/Math\.random|fetch\(/.test(src));
  assert.ok(!/(Zoom|McDonald|Burger King|hagel)/i.test(src));
});
console.log(`snackui_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
