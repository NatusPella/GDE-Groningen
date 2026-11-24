// Het tabblad Snackwagen (snackui.js): dicht met uitleg in plaats van een leeg scherm, open met wagen, menu, standplaatsen, Us Mem, gebeurtenis en doelen; knoppen en bevestiging.
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
t('open zonder wagen: aanbod van een snackwagen met bevestiging, de zestien plekken, Us Mem en de doelen', () => {
  reset(); const w = wereld();
  const h = U.snackHtml(SL.snackView(w));
  assert.match(h, /Je hebt nog geen snackwagen/); assert.match(h, /data-sn="koop-wagen"/);
  assert.equal((h.match(/data-spot="/g) || []).length, 16);
  assert.match(h, /data-spot="markt" data-status="usmem"/); assert.match(h, /Neem over/); assert.match(h, /Us Mem Snacks/);
  assert.equal((h.match(/data-goal="/g) || []).length, 13);
  assert.match(h, /Snackimperium/); assert.ok(!/Frietwagen/.test(h));
});
t('een koop vraagt een tweede druk; na Ja is de vergunning van jou en de plek toont verlengen en Zet mijn wagen hier', () => {
  reset(); const w = wereld(); SL.buyVan(w);
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
  reset(); const w = wereld(); SL.buyVan(w); SL.koopVergunning(w, 'park'); SL.placeVan('park'); L.snackState().own.stockDays = 3;
  const h = U.snackHtml(SL.snackView(w));
  assert.match(h, /Noorderplantsoen/); assert.match(h, /Voorraad<\/dt><dd>3 dagen/); assert.match(h, /Verwacht vandaag/);
  assert.match(h, /data-sn="open" data-patch="hours:9"/); assert.match(h, /data-sn="open" data-patch="pr:0\.95"/);
  assert.match(h, /data-sn="menu" data-id="burger" data-on="0"[^>]*disabled/); assert.match(h, /data-sn="vul"/);
  assert.match(h, /Koeling/); assert.match(h, /Grotere wagen/);
});
t('een wachtende gebeurtenis staat bovenaan met antwoorden en kosten', () => {
  reset(); const w = wereld(); SL.buyVan(w); SL.koopVergunning(w, 'park'); SL.placeVan('park');
  L.snackState().ev.pending = { kind: 'storing', id: 1, wagon: 'own', spot: 'park', depth: 0, price: 0, text: 'Een frituurpan is net een vriendschap.', choices: [{ id: 'repareer', label: 'Direct laten repareren', cost: 350 }, { id: 'wacht', label: 'Wachten', cost: 0, def: true }], day: L.calToday(), deadline: L.calToday() + 3 };
  const h = U.snackHtml(SL.snackView(w));
  assert.match(h, /data-event="storing"/); assert.match(h, /Direct laten repareren \(€\s?350\)/); assert.match(h, /data-choice="wacht"/); assert.match(h, /Nog 4 dagen/);
  assert.ok(h.indexOf('data-event') < h.indexOf('data-blok="wagen"'));
});
t('de vloot, een prijzenoorlog en tekst-ontsnapping', () => {
  reset(); const w = wereld(); SL.koopVergunning(w, 'park'); SL.koopVloot(w, 'park', 'aandeel');
  const S = L.snackState(); S.fleet[0].staff.name = '<b>Marit</b>'; S.ev.war = { until: 105, depth: 0.2, matched: true, softened: false, ev: 1 };
  const h = U.snackHtml(SL.snackView(w));
  assert.match(h, /data-wagon="w1"/); assert.match(h, /30% van de winst/); assert.match(h, /&lt;b&gt;Marit/); assert.ok(!/<b>Marit<\/b>/.test(h));
  assert.match(h, /Prijzenoorlog tot dag 105/); assert.match(h, /jij prijst mee/);
});
t('de knoppen: renderSnackPanel bindt een klik en doet de actie (met een nepelement)', () => {
  reset(); const w = wereld(); SL.buyVan(w);
  let handler = null; const el = { innerHTML: '', addEventListener(ev, fn) { if (ev === 'click') handler = fn; } };
  U.renderSnackPanel(el, w); assert.ok(handler); assert.match(el.innerHTML, /Imperium/);
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
t('Tegels (#1273): "Reputatie" toont een getal van 100, geen "Naam" met een kaal getal; geen NaN, geen lege waarde; de plekknop heet "Op de kaart"', () => {
  reset(); const w = wereld(); SL.buyVan(w); SL.koopVergunning(w, 'park');
  const h = U.snackHtml(SL.snackView(w));
  const balken = [...h.matchAll(/ds-z-balk__label">([^<]*)</g)].map((m) => m[1]);
  assert.ok(balken.length >= 2);
  for (const x of balken) assert.ok(!/NaN|undefined|null/.test(x), 'rommel in balk ' + x);
  assert.ok(balken.some((x) => /^Reputatie: [0-9]+ van 100$/.test(x)), 'de reputatie is een balk met een getal van 100');
  assert.ok(!/<small>Naam<\/small>/.test(h));
  assert.match(h, /data-sn="doel-plek"[^>]*>Op de kaart</); assert.ok(!/>Doel</.test(h));
});
t('Buurt en klanten: tevredenheid, goodwill, bondgenoten, vaste klanten met hulpknoppen met bevestiging, meewerken bij een medespeler, het geschil met zijn antwoorden', () => {
  reset(); const w = wereld(); SL.buyVan(w); SL.koopVergunning(w, 'park'); SL.placeVan('park');
  L.setClaimLookup((id) => (id === 'sp:leek' ? { name: 'lotte', color: '#c0c', playerId: 'B' } : null));
  let h = U.snackHtml(SL.snackView(w));
  assert.match(h, /Buurt en klanten/); assert.match(h, /Tevreden klanten/); assert.match(h, /Reputatie van Us Mem/); assert.match(h, /Nog geen bondgenoten/);
  assert.match(h, /data-buurt="park"/); assert.match(h, /data-sn="help" data-id="park\|buurthuis" data-spot="park" data-kind="buurthuis"/);
  assert.match(h, /data-helper="leek"/); assert.match(h, /data-sn="meewerken" data-id="leek"/);
  U.sui.confirm = 'help:park|buurthuis'; h = U.snackHtml(SL.snackView(w)); assert.match(h, /bd-zeker/);
  U.sui.confirm = null;
  L.snackState().ev.pending = { kind: 'vergunning', id: 1, wagon: 'own', spot: 'park', depth: 0, price: 0, bribed: true, text: 'Een enveloppe voor de Gemeentelijke Vergunningsdienst Noord.', choices: [{ id: 'bondgenoten', label: 'Bondgenoten om steun vragen', cost: 0 }, { id: 'beroep', label: 'In beroep gaan', cost: 0, def: true }, { id: 'betaal', label: 'De leges betalen en doorgaan', cost: 400 }], day: L.calToday(), deadline: L.calToday() + 5 };
  h = U.snackHtml(SL.snackView(w));
  assert.match(h, /data-event="vergunning"/); assert.match(h, /Gedoe met de vergunning/); assert.match(h, /data-choice="bondgenoten"/); assert.match(h, /hoe groter je kans in beroep/);
  let handler = null; const el = { innerHTML: '', addEventListener(ev, fn) { if (ev === 'click') handler = fn; } };
  U.renderSnackPanel(el, w); const click = (d) => handler({ target: { closest: () => ({ dataset: d }) } });
  click({ sn: 'help', id: 'park|buurthuis', spot: 'park', kind: 'buurthuis' }); assert.equal(U.sui.confirm, 'help:park|buurthuis');
  click({ sn: 'help', id: 'park|buurthuis', spot: 'park', kind: 'buurthuis', ok: '1' }); assert.match(U.sui.msg, /buurthuis/i);
  click({ sn: 'antwoord', choice: 'bondgenoten' }); assert.match(U.sui.msg, /bondgenoten/);
  click({ sn: 'meewerken', id: 'leek' }); assert.match(U.sui.msg, /meegewerkt/);
  L.setClaimLookup(null);
});
t('de bron: nederlands, geen merken, geen fetch, geen Math.random', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../game/js/snackui.js', import.meta.url), 'utf8');
  assert.ok(!/Math\.random|fetch\(/.test(src));
  assert.ok(!/(Zoom|McDonald|Burger King|hagel)/i.test(src));
});
t('de tegel toont de reputatie onder dat woord, de prijs staat een keer per plek en kopen is de gele knop (#1247, #1248, #1249)', () => {
  reset(); const w = wereld();
  const h = U.snackHtml(SL.snackView(w));
  assert.match(h, /Reputatie: \d+ van 100/); assert.ok(!/<small>Naam<\/small>/.test(h));
  const markt = h.slice(h.indexOf('data-spot="markt"'), h.indexOf('data-spot="markt"') + 4000);
  assert.equal((markt.match(/€25\.\d{3}|€\d+\.\d{3}/g) || []).length >= 1, true);
  assert.ok(!/<span>overnemen €/.test(h) && !/<span>vergunning €/.test(h), 'de prijs staat niet ook nog als feit naast de knop');
  assert.match(h, /class="m-bt bz-hoofd" data-sn="koop-wagen"/);
  assert.ok(!/>Doel<\/button>/.test(h), 'Route in plaats van Doel');
  // #1249 (hertest 24-11): één regel uitleg per blok en een plaatje per standplaats
  assert.ok(!/Een vergunning duurt/.test(h) && /Vergunning: \d+ speldagen, verlengen kost een kwart\./.test(h), 'de standplaatsuitleg is één korte regel');
  assert.ok(!/heeft \d+ standplaatsen, /.test(h), 'de standplaatsen van Us Mem staan alleen in de tegel');
  assert.equal((h.match(/class="sn-plek-ic"/g) || []).length, (h.match(/data-spot="/g) || []).length, 'elke standplaats heeft een pictogram');
  assert.equal(U.spotIcon({ name: 'Stationsplein, kant Hoofdstation' }), 'trein');
  assert.equal(U.spotIcon({ name: 'Hoek van de Grote Markt' }), 'winkel');
});
console.log(`snackui_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
