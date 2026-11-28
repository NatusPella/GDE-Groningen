// De recepten van het verhaal als menu-hart (#1378, S3) en de grondstoffen uit de eigen oogst (S4): Oma Trijntjes eierbal en De Gerda, hun bonus, de verhaalpoort, de voorraad in kilo's met
// het enige voorraadpad van het gedeelde leveringsmodel (own.stock, farmdelivery.js: eerst af, dan bij, terug bij een fout).   node scripts/snackrecept_test.mjs
// Schrijft nooit naar echte opslag: de opslag is een nepobject.
import assert from 'node:assert/strict';
import * as SN from '../game/js/snackvan.js';
import * as SP from '../game/js/pitch.js';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';
import * as GT from '../game/js/bezitgate.js';
import * as SL from '../game/js/snacklive.js';
import * as SS from '../game/js/snackstory.js';
import { newGate } from '../game/js/unlockgate.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join(' | ')); } };
const nepOpslag = () => { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem(k, v) { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
const wereld = (money = 1e6, day = 100) => ({ money, calendar: { day }, msgs: [], addMessage(x) { this.msgs.push(x); } });
const reset = () => { const st = nepOpslag(); L.initBezit({ opslag: st }); BL.initBoerderij({ opslag: st }); L.setClaimLookup(null); L.setClaimSend(null); GT.resetUnlockGate(); SS.setSnackFlagProvider(null); SL.setSnackRankSend(null); return st; };
const nieuw = (...flags) => SS.setSnackFlagProvider(() => ({ flags: new Set(flags), gate: newGate(), ended: false, dev: false }));
const wk = (cd) => { const wd = (cd + 4) % 7; return wd === 6 || wd === 0; };
const ctx = (day, o = {}) => ({ day, weekend: wk(day), money: 1e9, ownWagon: true, ownQ: 100, kermisAt: () => false, chainOwn: () => 0, ...o });
const klaar = (S) => { S.permits.dorp = { until: 1e6, paid: SP.permitPrice('dorp', 0) }; S.own.spot = 'dorp'; S.own.stockDays = 5; S.rival.spots = []; S.rival.mood = 5; S.rival.lastEvent = 1e6; S.rival.lastOffer = 1e6; return S; };

t('de recepten staan vast: twee, met een product en een bonus; het product vraagt het recept', () => {
  assert.deepEqual(SN.RECIPE_IDS, ['oma', 'gerda']);
  assert.equal(SN.ITEMS.trijntje.recipe, 'oma'); assert.equal(SN.ITEMS.gerda.recipe, 'gerda');
  assert.ok(SN.ITEMS.trijntje.heart > SN.ITEMS.gerda.heart && SN.ITEMS.gerda.heart > 0);
  const S = SN.newSnack();
  assert.equal(SN.offeringUnlocked(S, 'trijntje'), false); assert.equal(SN.toggleOffering(S, 'trijntje').ok, false);
  S.recipes = ['oma']; assert.equal(SN.offeringUnlocked(S, 'trijntje'), true); assert.equal(SN.offeringUnlocked(S, 'gerda'), false);
  assert.ok(!/echt merk|®/.test(SN.ITEMS.trijntje.label + SN.ITEMS.gerda.label));
});
t('een recept uit een oude of beschadigde save: onbekende recepten vallen weg, een product zonder recept verdwijnt uit het menu', () => {
  const S = SN.newSnack(); S.own.menu = ['friet', 'trijntje', 'gerda'];
  const back = SN.normalizeSnack(JSON.parse(JSON.stringify({ ...S, recipes: ['oma', 'onzin', 7] })));
  assert.deepEqual(back.recipes, ['oma']); assert.deepEqual(back.own.menu, ['friet', 'trijntje']);
  assert.deepEqual(SN.normalizeSnack(null).recipes, []);
});
t('het eerste recept neemt de plek van het laatste basisproduct als het menu vol is; het tweede komt er alleen bij met een vrije plek', () => {
  const S = SN.newSnack();
  assert.equal(S.own.menu.length, 4);                                    // klein: vier plekken, vol
  let r = SN.learnRecipe(S, 'oma'); assert.equal(r.ok, true); assert.equal(r.onMenu, true);
  assert.equal(S.own.menu.length, 4); assert.ok(S.own.menu.includes('trijntje')); assert.ok(!S.own.menu.includes('bamischijf'), 'het laatste basisproduct maakte plaats');
  assert.equal(SN.learnRecipe(S, 'oma').ok, false, 'twee keer leren doet niets'); assert.equal(SN.learnRecipe(S, 'onzin').why, 'onbekend');
  r = SN.learnRecipe(S, 'gerda'); assert.equal(r.ok, true); assert.equal(r.onMenu, false, 'geen vrije plek: de speler kiest zelf');
  assert.ok(!S.own.menu.includes('gerda')); assert.equal(SN.offeringUnlocked(S, 'gerda'), true);
  S.own.tier = 'groot'; assert.equal(SN.toggleOffering(S, 'gerda').ok, true);
});
t('de bonus: het recept op de kaart geeft meer aantrekkingskracht, twee oma\'s nog een tikje meer; zonder recept verandert niets', () => {
  const basis = SN.offeringNumbers(['friet', 'frikandel', 'kroket', 'bamischijf'], [], () => 0);
  const een = SN.offeringNumbers(['friet', 'frikandel', 'kroket', 'trijntje'], [], () => 0);
  const twee = SN.offeringNumbers(['friet', 'frikandel', 'trijntje', 'gerda'], [], () => 0);
  assert.equal(basis.localAppeal, 1);
  assert.ok(een.localAppeal > 1.04 && een.localAppeal < 1.08, een.localAppeal);
  assert.ok(twee.localAppeal > een.localAppeal + 0.03, `${twee.localAppeal} ${een.localAppeal}`);
  assert.ok(een.ticket > basis.ticket, 'het recept is duurder dan een gewone snack');
});
t('een dag met het recept op de kaart verdient meer dan zonder (zelfde plek, zelfde dag)', () => {
  const dag = (menu, recipes) => { const S = klaar(SN.newSnack()); S.recipes = recipes; S.own.menu = menu; return SN.settleDay(S, ctx(100)).own.net; };
  const zonder = dag(['friet', 'frikandel', 'kroket', 'bamischijf'], []);
  const met = dag(['friet', 'frikandel', 'kroket', 'trijntje'], ['oma']);
  assert.ok(met > zonder, `${met} ${zonder}`);
});
t('de verhaalpoort: zonder wagen:menu geen recept in beeld; na wagen:menu staat het eerste op de kaart, De Gerda pas na wagen:gerda', () => {
  reset(); const w = wereld(); nieuw('wagen:idee');
  let v = SL.snackView(w);
  assert.ok(!v.menu.some((m) => m.id === 'trijntje' || m.id === 'gerda'), 'geen recept dat de speler nog niet kent');
  assert.deepEqual(L.snackState().recipes, []);
  nieuw('wagen:idee', 'wagen:menu');
  v = SL.snackView(w);
  assert.ok(v.menu.some((m) => m.id === 'trijntje' && m.on)); assert.ok(!v.menu.some((m) => m.id === 'gerda'));
  assert.ok(w.msgs.some((m) => /Oma Trijntjes eierbal/.test(String(m))), 'een kaartje');
  const aantal = w.msgs.length; SL.snackView(w); assert.equal(w.msgs.length, aantal, 'niet twee keer melden');
  nieuw('wagen:idee', 'wagen:menu', 'wagen:gerda');
  v = SL.snackView(w);
  assert.ok(v.menu.some((m) => m.id === 'gerda'), 'De Gerda is te kiezen');
  assert.deepEqual(L.snackState().recipes.sort(), ['gerda', 'oma']);
});
t('oude saves en tests zonder verhaalstand: alles is open, dus beide recepten', () => {
  reset(); const w = wereld(); const v = SL.snackView(w);
  assert.ok(v.menu.some((m) => m.id === 'trijntje') && v.menu.some((m) => m.id === 'gerda'));
});
t('Samen spelen: de recepten zijn per speler (bezit.x.snack); een gast die meewerkt verandert de recepten of de voorraad van de eigenaar niet', () => {
  reset(); const w = wereld(); SL.snackView(w);
  const S = L.snackState(); const voor = JSON.stringify({ r: S.recipes, p: S.own.stock });
  klaar(S); S.own.stock = { graan: 10 };
  const v0 = JSON.stringify({ r: S.recipes, p: S.own.stock });
  SN.receiveHelper(S, 'dorp', 6, 100);
  assert.equal(JSON.stringify({ r: S.recipes, p: S.own.stock }), v0);
  assert.notEqual(voor, v0);
});

// ---- goederen uit de eigen oogst (het gedeelde leveringsmodel: own.stock, farmdelivery.js) ----
const ligt = (g) => BL.oogstOpErf(g);
t('de voorraad: leeg bij een nieuwe en een oude save; kilo-aantallen worden begrensd en rommel verdwijnt; er is geen pantry meer', () => {
  assert.deepEqual(SN.newSnack().own.stock, {}); assert.equal('pantry' in SN.newSnack().own, false);
  assert.deepEqual(SN.FARM_GOODS, ['aardappelen', 'graan']);
  const S = SN.normalizeSnack({ own: { stock: { aardappelen: 1e9, graan: -4, meel: 5, x: 1 } } });
  assert.deepEqual(S.own.stock, { aardappelen: SN.FARM_STOCK_MAX });
});
t('een save uit de eerdere opzet met own.pantry breekt niet: wat erin lag telt bij de voorraad op, rommel verdwijnt, pantry zelf is weg en een tweede keer laden verandert niets', () => {
  const oud = { own: { pantry: { aardappelen: 12.4, graan: 7, meel: 3 }, stock: { aardappelen: 100 } } };
  const S = SN.normalizeSnack(oud);
  assert.deepEqual(S.own.stock, { aardappelen: 112, graan: 7 }); assert.equal('pantry' in S.own, false);
  assert.deepEqual(SN.normalizeSnack(JSON.parse(JSON.stringify(S))).own.stock, S.own.stock, 'idempotent');
  assert.deepEqual(SN.normalizeSnack({ own: { pantry: 'rommel' } }).own.stock, {});
  assert.deepEqual(SN.normalizeSnack({ own: { pantry: { graan: -5, aardappelen: NaN } } }).own.stock, {});
});
t('de wagen neemt graan aan (de eierballen) en friet vraagt aardappelen; niets anders', () => {
  const S = SN.newSnack();
  assert.equal(SN.receiveFarmGoods(S, { id: 'g1', good: 'graan', amount: 30 }).ok, true); assert.equal(S.own.stock.graan, 30);
  assert.equal(SN.receiveFarmGoods(S, { id: 'g2', good: 'bieten', amount: 30 }).reason, 'not-accepted');
  assert.deepEqual(SN.farmNeed(['friet', 'kroket'], 100), { aardappelen: (100 * SN.ITEMS_PER_CUSTOMER / 2) * 0.25 });
});
t('de voorraad scheelt inkoop en gaat op: een dag met aardappelen en graan in de wagen kost minder inkoop en de kilo-aantallen nemen af', () => {
  const dag = (stock) => { const S = klaar(SN.newSnack()); S.recipes = ['oma']; S.own.menu = ['friet', 'trijntje', 'kroket', 'frikandel']; S.own.stock = { ...stock }; const r = SN.settleDay(S, ctx(100)); return { r: r.own, S }; };
  const leeg = dag({}), vol = dag({ aardappelen: 60, graan: 40 });
  assert.ok(vol.r.cogs < leeg.r.cogs, `${vol.r.cogs} ${leeg.r.cogs}`);
  assert.ok(vol.r.net > leeg.r.net);
  assert.ok(vol.r.farmCredit > 0 && vol.r.farmCredit <= leeg.r.cogs);
  assert.ok(vol.r.farmUsed.graan > 0 && vol.r.farmUsed.aardappelen > 0, 'ook het graan van de recepten wordt gebruikt');
  assert.ok((vol.S.own.stock.aardappelen || 0) < 60 && (vol.S.own.stock.graan || 0) < 40, 'verbruikt');
  assert.deepEqual(leeg.S.own.stock, {}, 'een lege voorraad blijft leeg');
  assert.equal(leeg.r.farmCredit, 0);
});
t('een kleine voorraad is snel op: er wordt niet meer verbruikt dan er ligt', () => {
  const S = klaar(SN.newSnack()); S.own.stock = { aardappelen: 1 };
  const r = SN.settleDay(S, ctx(100)).own;
  assert.equal(S.own.stock.aardappelen, undefined); assert.ok(r.farmUsed.aardappelen <= 1);
});
t('live: kilo-aantallen van het erf in de wagen via het gedeelde pad; eerst af van het erf, dan bij; het geld verandert niet; een leeg erf geeft een tekst', () => {
  reset(); const w = wereld();
  const bd = BL.getBedrijf(); bd.opslag[bd.thuis].aardappelen = 30;
  const geld = w.money;
  assert.equal(SL.pantryView().find((p) => p.id === 'aardappelen').barn, 30);
  const r = SL.vulUitSchuur(w, 'aardappelen', 20);
  assert.equal(r.ok, true, r.text); assert.equal(r.kg, 20);
  assert.equal(L.snackState().own.stock.aardappelen, 20); assert.equal(ligt('aardappelen'), 10); assert.equal(w.money, geld);
  assert.equal(SL.vulUitSchuur(w, 'graan', 20).ok, false); assert.match(SL.vulUitSchuur(w, 'graan', 20).text, /erf/);
  const v = SL.snackView(w); assert.equal(v.pantry.find((p) => p.id === 'aardappelen').kg, 20);
  assert.equal(SL.vulUitSchuur(w, 'graan', 0).ok, false);
});
t('live: graan van het erf in de wagen en de levering komt nooit twee keer aan (zelfde pad als aardappelen)', () => {
  reset(); const w = wereld(); const bd = BL.getBedrijf(); bd.opslag[bd.thuis].graan = 50;
  assert.equal(SL.vulUitSchuur(w, 'graan', 50).ok, true);
  assert.equal(L.snackState().own.stock.graan, 50); assert.equal(ligt('graan'), 0);
  assert.equal(SL.vulUitSchuur(w, 'graan', 50).ok, false); assert.equal(L.snackState().own.stock.graan, 50);
});
t('live: een dichte snackwagen laat de voorraad ongemoeid', () => {
  reset(); GT.setGateProgress(() => ({ dev: false, stepId: 'M01', gate: newGate() }));
  const w = wereld(); const bd = BL.getBedrijf(); bd.opslag[bd.thuis].aardappelen = 30;
  const r = SL.vulUitSchuur(w, 'aardappelen', 20);
  assert.equal(r.ok, false); assert.equal(r.why, 'dicht'); assert.equal(ligt('aardappelen'), 30);
  GT.setGateProgress(null);
});

console.log(`snackrecept_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
