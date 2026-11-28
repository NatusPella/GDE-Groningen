// De rangen van de snackwagen (#1378, S1): afleiding uit de stand, de ratel, een oude save zonder rang (stil, nooit nul), de rangmomenten via de gedeelde haak en de koppeling in snacklive.
//   node scripts/snackrang_test.mjs
// Schrijft nooit naar echte opslag: de opslag is een nepobject.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as R from '../game/js/snackrang.js';
import * as SN from '../game/js/snackvan.js';
import * as SP from '../game/js/pitch.js';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';
import * as GT from '../game/js/bezitgate.js';
import * as SL from '../game/js/snacklive.js';
import * as SM from '../game/js/snackmoments.js';
import * as UI from '../game/js/snackui.js';
import * as SS from '../game/js/snackstory.js';
import { makeRankHook, rankMomentsOf, momentProblem } from '../game/js/rankmoments.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join(' | ')); } };
const nepOpslag = () => { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem(k, v) { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
const wereld = (money = 1e6, day = 100) => ({ money, calendar: { day }, msgs: [], addMessage(x) { this.msgs.push(x); } });
const reset = () => { const st = nepOpslag(); L.initBezit({ opslag: st }); BL.initBoerderij({ opslag: st }); L.setClaimLookup(null); L.setClaimSend(null); GT.resetUnlockGate(); SS.setSnackFlagProvider(null); SL.setSnackRankSend(null); return st; };
const rustig = (w) => { const S = L.snackState(); S.own.stockDays = 5; S.rival.lastEvent = 1e7; S.rival.lastOffer = 1e7; L.dayTick(w); };
const slaap = (w, dagen) => { const f = BL.getBoerderij(); f.uren += dagen * 24; w.calendar.day += dagen; return L.dayTick(w); };
const stand = (o = {}) => { const S = SN.newSnack(); Object.assign(S.stats, o.stats || {}); if (o.had) for (const id of o.had) S.stats.had[id] = true; S.recipes = o.recipes || []; S.fleet = o.fleet || []; return S; };
const wagen = (id) => ({ id, spot: 'dorp', tier: 'klein', mode: 'loon', staff: { id: 's', name: 'X', skill: 50 }, paid: 12000, wageUp: 0 });

t('de rangen: zes, met titels en een eis, rang 1 is het begin', () => {
  assert.equal(R.RANGEN.length, R.MAX_RANG); assert.equal(R.MAX_RANG, 6);
  R.RANGEN.forEach((x, i) => { assert.equal(x.rang, i + 1); assert.ok(x.titel && x.eis); });
  assert.equal(R.rankOf(SN.newSnack()), 1); assert.equal(R.rankOf(null), 1); assert.equal(R.rankOf({}), 1);
});
t('de afleiding gaat een voor een: vergunning, verkoop, recept en porties, team, imperium', () => {
  const S = stand();
  assert.equal(R.rankOf(S), 1);
  S.stats.had.dorp = true; assert.equal(R.rankOf(S), 2);
  S.stats.sold = 1; assert.equal(R.rankOf(S), 3);
  S.stats.sold = R.RECIPE_SALES; assert.equal(R.rankOf(S), 3, 'zonder recept geen rang 4');
  S.recipes = ['oma']; assert.equal(R.rankOf(S), 4);
  S.fleet = [wagen('w1')]; assert.equal(R.rankOf(S), 5);
  S.fleet = [1, 2, 3, 4].map((k) => wagen('w' + k)); assert.equal(R.rankOf(S), 5, 'vijf wagens zonder overname is nog geen imperium');
  S.stats.takeovers = 1; assert.equal(R.rankOf(S), 6);
});
t('een hogere rang zonder de lagere voorwaarden bestaat niet (volgorde)', () => {
  const S = stand({ fleet: [wagen('w1')], recipes: ['oma'], stats: { sold: 1000 } });
  assert.equal(R.rankOf(S), 1, 'zonder vergunning blijft het bij 1');
});
t('de ratel: raiseRank meldt een stijging eenmaal en daalt nooit', () => {
  const S = stand({ had: ['dorp'], stats: { sold: 5 } });
  assert.deepEqual(R.raiseRank(S), { van: 1, naar: 3 }); assert.equal(S.rang, 3);
  assert.equal(R.raiseRank(S), null);
  S.stats.sold = 0; S.stats.had = {};            // de stand wordt slechter (vergunning verlopen): de rang blijft
  assert.equal(R.raiseRank(S), null); assert.equal(S.rang, 3);
  assert.equal(R.rankView(S).rang, 3);
});
t('rankView: titel, van zes en wat de volgende vraagt; op het hoogste geen volgende', () => {
  const S = stand({ had: ['dorp'] }); S.rang = 2;
  const v = R.rankView(S);
  assert.equal(v.rang, 2); assert.equal(v.titel, 'Standplaatshouder'); assert.equal(v.van, 6);
  assert.equal(v.volgende.rang, 3); assert.match(v.volgende.eis, /verkoop/i);
  S.rang = 6; assert.equal(R.rankView(S).volgende, null);
});
t('een oude save zonder rang krijgt hem afgeleid (niet nul) en dus stil; een opgeslagen rang daalt niet', () => {
  const oud = JSON.parse(JSON.stringify(stand({ had: ['dorp', 'park'], recipes: ['oma'], stats: { sold: 900 }, fleet: [wagen('w1')] })));
  delete oud.rang; delete oud.own.pantry;
  const S = SN.normalizeSnack(oud);
  assert.equal(S.rang, 5); assert.deepEqual(S.own.pantry, {}); assert.equal(R.raiseRank(S), null, 'geen stijging achteraf: geen moment');
  const hoog = SN.normalizeSnack({ ...oud, rang: 6 }); assert.equal(hoog.rang, 6);
  const rommel = SN.normalizeSnack({ ...oud, rang: 'veel' }); assert.equal(rommel.rang, 5);
  const nieuw = SN.normalizeSnack(null); assert.equal(nieuw.rang, 1);
  const rond = SN.normalizeSnack(JSON.parse(JSON.stringify(S))); assert.equal(rond.rang, 5);
});
t('de rangmomenten: een per rang van 2 tot 6, geldig, onder de haak van het vak horeca', () => {
  assert.equal(SM.SNACK_MOMENTS.length, 5);
  const ranks = rankMomentsOf('horeca').filter((m) => m.id.startsWith('snack-rang'));
  assert.deepEqual(ranks.map((m) => m.rang), [2, 3, 4, 5, 6]);
  for (const m of ranks) assert.equal(momentProblem({ id: m.id, vak: m.vak, rang: m.rang, scene: m.scene }), '', m.id);
  const res = SM.registerSnackMoments(); assert.ok(res.every((x) => !x.ok), 'een tweede aanmelding wordt geweigerd (geen dubbele momenten)');
});
t('de haak speelt een snackmoment alleen bij de eigen rang: een niveau omhoog in de loopbaan Horeca speelt het niet te vroeg', () => {
  reset(); const w = wereld();
  const gezien = new Set();
  const hook = makeRankHook({ store: { gezien: (id) => gezien.has(id), markeer: (id) => gezien.add(id) }, speel: () => true });
  assert.equal(L.snackState().rang, 1);
  assert.equal(hook.omhoog(w, { vak: 'horeca', van: 1, naar: 3 }), 0, 'loopbaanniveau 3 zonder snackrang 3: niets');
  L.snackState().rang = 3;
  assert.equal(hook.omhoog(w, { vak: 'horeca', van: 1, naar: 3 }), 2, 'met rang 3 spelen de momenten van rang 2 en 3, in volgorde');
  assert.deepEqual(hook.wachtrij(), ['snack-rang2-standplaats', 'snack-rang3-wagenbaas']);
});
t('de teksten: korte regels, bekende sprekers, geen merken en geen winter', () => {
  const sprekers = new Set(['T', 'A', 'Oma Trijntje', 'Jelle Terpstra']);
  for (const m of SM.SNACK_MOMENTS) for (const [wie, tekst] of m.regels) {
    assert.ok(sprekers.has(wie), wie); assert.ok(tekst.split(/\s+/).length <= 25, tekst); assert.ok(!/winter|sneeuw|ijs\b/i.test(tekst), tekst);
  }
});
t('de bron en de code zijn gelijk: de gesprekken in snackmoments.js zijn de scènes S71 tot en met S75 van 09-script-akte7.md (script.json)', () => {
  const script = JSON.parse(fs.readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
  const WIE = { T: 'T', A: 'A', trijntje: 'Oma Trijntje', jelle: 'Jelle Terpstra' };
  SM.SNACK_MOMENTS.forEach((m, i) => {
    const sc = script.scenes.find((x) => x.id === 'S7' + (i + 1));
    assert.ok(sc, 'scène S7' + (i + 1) + ' ontbreekt: draai node scripts/build_story_data.mjs');
    assert.deepEqual(sc.lines.map((l) => [WIE[l.key], l.text]), m.regels, m.id);
    assert.ok(sc.lines.every((l) => l.tag === 'NIEUW' && l.textOnly), 'nieuwe regels, geen opname (zie TTS-NIEUW-28-11.md)');
  });
});
t('live: een vergunning kopen is rang 2 (kaartje en haak, eenmaal); verkopen is rang 3; de haak krijgt het vak horeca', () => {
  reset(); const w = wereld(); const sent = [];
  SL.setSnackRankSend((o) => sent.push(o));
  assert.equal(SL.buyVan(w).ok, true);
  assert.equal(SL.koopVergunning(w, 'dorp').ok, true);
  assert.deepEqual(sent, [{ vak: 'horeca', van: 1, naar: 2 }]);
  assert.ok(w.msgs.some((m) => /rang 2/.test(String(m))), 'een kaartje met de rang');
  assert.equal(SL.placeVan('dorp').ok, true);
  assert.equal(L.snackState().rang, 2);
  rustig(w); slaap(w, 3);
  assert.ok(L.snackState().stats.sold > 0);
  assert.ok(sent.some((o) => o.naar === 3), JSON.stringify(sent));
  const na = sent.length; SL.checkRank(w); assert.equal(sent.length, na, 'geen tweede melding zonder stijging');
});
t('live: een medewerkers-wagen is rang 5 (per speler: de rang zit in bezit.x.snack, een medespeler heeft zijn eigen)', () => {
  reset(); const w = wereld(); const sent = [];
  SL.setSnackRankSend((o) => sent.push(o));
  SL.buyVan(w); SL.koopVergunning(w, 'dorp'); SL.placeVan('dorp'); rustig(w); slaap(w, 12);
  const S = L.snackState(); S.recipes = ['oma']; S.stats.sold = Math.max(S.stats.sold, R.RECIPE_SALES);
  SL.koopVergunning(w, 'park');
  assert.equal(SL.koopVloot(w, 'park').ok, true);
  assert.equal(S.rang, 5); assert.ok(sent.some((o) => o.naar === 5));
  const andere = SN.newSnack(); assert.equal(andere.rang, 1, 'een andere speler begint bij 1');
});
t('de weergave: snackView geeft de rang en het scherm toont hem', () => {
  reset(); const w = wereld(); SL.buyVan(w); SL.koopVergunning(w, 'dorp');
  const v = SL.snackView(w);
  assert.equal(v.rang.rang, 2); assert.equal(v.rang.titel, 'Standplaatshouder');
  const h = UI.rangHtml(v);
  assert.match(h, /data-rang="2"/); assert.match(h, /Standplaatshouder/); assert.match(h, /data-rang-volgende="3"/);
});

console.log(`snackrang_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
