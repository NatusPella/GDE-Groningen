// De moeilijkheid in Bezit (bezitdifficulty.js, bezitprijs.difficultyFactor): neutraal zonder module, begrensd op 25%, de bezit_sim-controles blijven binnen de marges bij makkelijk en zwaar,
// kopen en verkopen blijft verlies.   node scripts/bezitdifficulty_test.mjs
import assert from 'node:assert/strict';
import * as D from '../game/js/bezitdifficulty.js';
import * as P from '../game/js/bezitprijs.js';
import * as SP from '../game/js/pitch.js';
import * as SN from '../game/js/snackvan.js';
import * as BZ from '../game/js/business.js';
import * as Sim from './bezit_sim.mjs';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } finally { D.setBezitDifficultyMode('standaard'); D.setBezitDifficultyProvider(null); } };

t('zonder moeilijkheidsmodule is alles neutraal: factor 1 en dezelfde prijzen als altijd', () => {
  for (const k of ['income', 'price', 'cost', 'onbekend']) assert.equal(P.difficultyFactor(k), 1);
  assert.equal(SP.permitPrice('markt', 0), Math.round(6000 * Math.pow(1.6, 1.6) / 50) * 50);
  assert.equal(SN.wagonPrice(0), 12000);
});
t('de stand verschuift de factoren, begrensd op plus of min 25%; een provider van difficulty.js wint van de tabel', () => {
  D.setBezitDifficultyMode('ontspannen'); assert.equal(P.difficultyFactor('income'), 1.15); assert.equal(P.difficultyFactor('price'), 0.9);
  D.setBezitDifficultyMode('uitdagend'); assert.equal(P.difficultyFactor('income'), 0.85); assert.equal(P.difficultyFactor('price'), 1.1);
  D.setBezitDifficultyMode('onzin'); assert.equal(P.difficultyFactor('price'), 1);
  D.setBezitDifficultyProvider(() => 9); assert.equal(P.difficultyFactor('price'), 1.25);
  D.setBezitDifficultyProvider(() => 0.1); assert.equal(P.difficultyFactor('price'), 0.75);
  D.setBezitDifficultyProvider(() => NaN); assert.equal(P.difficultyFactor('price'), 1);
  D.setBezitDifficultyProvider(null); assert.equal(P.difficultyFactor('price'), 1);
  for (const m of D.BEZIT_MODES) for (const v of Object.values(D.BEZIT_TABLE[m])) assert.ok(v >= 0.75 && v <= 1.25);
});
t('de prijzen volgen de stand: percelen, panden, vergunningen en wagens', () => {
  const p = { id: 'p000000000001', kind: 'a', ha: 3, access: 'weg' }, b = { m2: 300, h: 3, type: 'yes' };
  const base = { parcel: P.parcelPrice(p, 'hogeland', 0), shop: BZ.businessPrice(b, { cls: 'shop', type: 'bakker' }, null, 0), permit: SP.permitPrice('park', 0), wagon: SN.wagonPrice(0) };
  D.setBezitDifficultyMode('uitdagend');
  assert.ok(P.parcelPrice(p, 'hogeland', 0) > base.parcel && BZ.businessPrice(b, { cls: 'shop', type: 'bakker' }, null, 0) > base.shop && SP.permitPrice('park', 0) > base.permit && SN.wagonPrice(0) > base.wagon);
  D.setBezitDifficultyMode('ontspannen');
  assert.ok(P.parcelPrice(p, 'hogeland', 0) < base.parcel && SP.permitPrice('park', 0) < base.permit && SN.wagonPrice(0) < base.wagon);
});
t('geen exploit: kopen en direct verkopen blijft verlies bij elke stand', () => {
  for (const m of D.BEZIT_MODES) {
    D.setBezitDifficultyMode(m);
    const price = P.parcelPrice({ id: 'p000000000001', kind: 'a', ha: 3, access: 'weg' }, 'hogeland', 0);
    assert.ok(P.sellValue(price) < price * 0.8, m);
    const S = SN.newSnack(); S.permits.dorp = { until: 1e6, paid: 1 };
    const b = SN.buyFleetWagon(S, 'dorp', 1, 1e9), s = SN.sellFleetWagon(S, 'w1');
    assert.ok(b.cost - s.refund >= 0.39 * b.cost, m);
  }
});
t('bezit_sim: eerste perceel ongeveer twee uur, schaal hoogstens drie maal actief, snackwagen binnen de marges, bij makkelijk en zwaar', () => {
  const out = {};
  for (const m of D.BEZIT_MODES) {
    D.setBezitDifficultyMode(m);
    const r = Sim.simulate({ days: 30 }), sp = Sim.snackProfile({ days: 40, quiet: true });
    out[m] = { firstHours: r.firstParcelHours, passive1000: Sim.passivePerHourAt(1000), best: sp.best.ownVsActive, imperium: sp.imperium.vsActive };
    assert.ok(r.firstParcelHours > 1.2 && r.firstParcelHours < 3, `${m} eerste perceel ${r.firstParcelHours}`);
    assert.ok(Sim.passivePerHourAt(1000) <= 3 * Sim.ACTIVE_PER_HOUR + 1, m);
    assert.ok(sp.best.ownVsActive <= 2.3, `${m} eigen wagen ${sp.best.ownVsActive}`);
    assert.ok(sp.imperium.vsActive <= 4.7, `${m} imperium ${sp.imperium.vsActive}`);
    if (m === 'standaard') { assert.ok(sp.best.ownVsActive >= 1.8 && sp.best.ownVsActive <= 2.2, `standaard eigen wagen ${sp.best.ownVsActive}`); assert.ok(sp.imperium.vsActive >= 3.8 && sp.imperium.vsActive <= 4.2, `standaard imperium ${sp.imperium.vsActive}`); }   // besluit eigenaar 21-11: eigen wagen ~2x, imperium ~4x
  }
  assert.ok(out.ontspannen.firstHours <= out.standaard.firstHours && out.standaard.firstHours <= out.uitdagend.firstHours);
  assert.ok(out.ontspannen.imperium >= out.standaard.imperium && out.standaard.imperium >= out.uitdagend.imperium);
  console.log('  bezit_sim per stand:', JSON.stringify(out));
});
// 21-11: main.js koppelt de adapter aan difficulty.js (alleen de omzet; prijs en kosten blijven 1, geen prijsoptie)
{
  const fs = await import('node:fs');
  const main = fs.readFileSync(new URL('../game/js/main.js', import.meta.url), 'utf8');
  n++; if (!/setBezitDifficultyProvider\(\(kind\) => \(kind === 'income' \? incomeFactor\(\) : 1\)\)/.test(main)) { fails++; console.log('FAIL main.js koppelt Bezit aan difficulty.js (alleen de omzet)'); }
}
console.log(`bezitdifficulty_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
