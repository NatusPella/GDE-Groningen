// De hofwinkel van Hoeve Zeldenrust (#1373, audit B9): open vanaf Trekkerrijder en alleen met de hoeve, betere prijs dan de markt, een grens per speldag, het geld via de loopbaan,
// de kilo's van het erf af, en een oude opslag zonder hofwinkel laadt leeg.   node scripts/hofwinkel_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import * as HW from '../game/js/hofwinkel.js';
import * as B from '../game/js/boerderij.js';
import * as PC from '../game/js/percelen.js';
import * as BL from '../game/js/boerderijlive.js';
import * as L from '../game/js/bezitlive.js';
import * as LB from '../game/js/loopbaanlive.js';
import * as Lp from '../game/js/loopbaan.js';
import { PRIJS_KG } from '../game/js/gewasmarkt.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nepOpslag = () => { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem(k, v) { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
const metHoeve = () => { const bd = PC.nieuwBedrijf(); PC.schenk(bd); PC.bergOp(bd, PC.SCHENK_ERF, 'aardappelen', 400); PC.bergOp(bd, PC.SCHENK_ERF, 'uien', 80); PC.bergOp(bd, PC.SCHENK_ERF, 'graan', 100); return bd; };

t('dicht zonder hoeve of onder Trekkerrijder, met de reden', () => {
  assert.equal(HW.winkelOpen(PC.nieuwBedrijf(), 6).open, false);
  const x = HW.winkelOpen(metHoeve(), 2);
  assert.equal(x.open, false); assert.match(x.reden, /Trekkerrijder/);
  assert.equal(HW.winkelOpen(metHoeve(), 3).open, true);
});

t('de prijs ligt boven de markt, het aanbod noemt het merk en alleen de goederen van de winkel', () => {
  for (const g of HW.HOFWINKEL.goederen) assert.ok(HW.prijsPerKg(g) > PRIJS_KG[g]);
  const a = HW.winkelAanbod(metHoeve(), HW.nieuweHofwinkel(), 5, 3);
  assert.equal(a.merk, 'Hoeve Zeldenrust'); assert.equal(a.over, 150);
  assert.deepEqual(a.rijen.map((r) => r.gewas), ['aardappelen', 'uien', 'fruit']);
  assert.equal(a.rijen[0].kg, 400); assert.equal(a.rijen[0].max, 150); assert.equal(a.rijen[1].max, 80); assert.equal(a.rijen[2].max, 0);
  assert.doesNotMatch(JSON.stringify(a), /graan/);
});

t('verkopen haalt van het erf af, telt per speldag en een nieuwe dag begint opnieuw', () => {
  const bd = metHoeve(), st = HW.nieuweHofwinkel();
  const r = HW.verkoopInWinkel(bd, st, 5, 3, 'aardappelen', 100);
  assert.ok(r.ok); assert.equal(r.kg, 100); assert.equal(r.bedrag, Math.round(100 * HW.prijsPerKg('aardappelen')));
  assert.equal(bd.opslag[PC.SCHENK_ERF].aardappelen, 300);
  const r2 = HW.verkoopInWinkel(bd, st, 5, 3, 'aardappelen', 200);
  assert.equal(r2.kg, 50, 'de grens van 150 kg per dag');
  const r3 = HW.verkoopInWinkel(bd, st, 5, 3, 'uien', 10);
  assert.equal(r3.ok, false); assert.match(r3.reden, /genoeg/);
  assert.ok(HW.verkoopInWinkel(bd, st, 6, 3, 'uien', 10).ok, 'morgen weer');
});

t('weigeren: een ander goed, niets op het erf, een onzinnig aantal, een dichte winkel', () => {
  const bd = metHoeve(), st = HW.nieuweHofwinkel();
  assert.equal(HW.verkoopInWinkel(bd, st, 1, 3, 'graan', 10).ok, false);
  assert.match(HW.verkoopInWinkel(bd, st, 1, 3, 'fruit', 10).reden, /Er ligt geen fruit/);
  assert.equal(HW.verkoopInWinkel(bd, st, 1, 3, 'uien', NaN).ok, false);
  assert.equal(HW.verkoopInWinkel(bd, st, 1, 3, 'uien', -5).ok, false);
  assert.equal(HW.verkoopInWinkel(bd, st, 1, 2, 'uien', 10).ok, false);
  assert.equal(bd.opslag[PC.SCHENK_ERF].uien, 80, 'een mislukte verkoop kost niets');
});

t('met de boerderij: het geld gaat via de loopbaan, de kilo\'s van het erf, het kasboek telt mee en het bewaart', () => {
  const st = nepOpslag();
  L.initBezit({ opslag: st }); BL.initBoerderij({ opslag: st }); BL.zetBoerderijVoorTest(null, st); L.zetBezitVoorTest(null, st); LB.zetProfielVoorTest(Lp.nieuwProfiel(), nepOpslag());
  L.schenkHoeveCompleet();
  const w = { money: 100, msgs: [], addMessage(x) { this.msgs.push(x); } };
  PC.bergOp(BL.getBedrijf(), PC.SCHENK_ERF, 'aardappelen', 200);
  const dicht = BL.verkoopHofwinkel(w, 'aardappelen', 50);
  assert.equal(dicht.ok, false); assert.match(dicht.reden, /Trekkerrijder/); assert.equal(w.money, 100);
  LB.loopbaanTel(w, 'landbouw', { xp: Lp.XP_DREMPELS[2] + 1, n: 0 });
  assert.equal(BL.hofwinkelStand().open, true);
  const r = BL.verkoopHofwinkel(w, 'aardappelen', 50);
  assert.ok(r.ok && r.betaald >= r.bedrag, JSON.stringify(r));
  assert.equal(w.money, 100 + r.betaald);
  assert.equal(BL.getBedrijf().opslag[PC.SCHENK_ERF].aardappelen, 150);
  assert.equal(BL.getBoerderij().hofwinkel.kg, 50);
  BL.schrijfNu();
  const terug = B.normaliseer(st.getItem('gde-boerderij-v1'));
  assert.equal(terug.hofwinkel.kg, 50);
});

t('een oude opslag zonder hofwinkel laadt leeg, rommel wordt begrensd', () => {
  const oud = JSON.parse(JSON.stringify(B.nieuweBoerderij())); delete oud.hofwinkel;
  assert.deepEqual(B.normaliseer(oud).hofwinkel, { dag: -1, kg: 0 });
  const rommel = JSON.parse(JSON.stringify(B.nieuweBoerderij())); rommel.hofwinkel = { dag: 'x', kg: 99999 };
  assert.deepEqual(B.normaliseer(rommel).hofwinkel, { dag: -1, kg: 150 });
});

console.log(`hofwinkel_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
