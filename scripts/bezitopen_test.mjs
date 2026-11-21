// Panden en bedrijven zijn altijd open (besluit 21-11, docs/BEZIT-21-11.md hoofdstuk 14): openingstijden (hr), een staking, een inspectie of een pechdag raken alleen omzet en personeelskosten,
// nooit de toegang. Deze test bewaakt dat: de rekenmodules kennen geen toegangsbegrip, een gesloten dag is omzet nul en niets anders.   node scripts/bezitopen_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as BZ from '../game/js/business.js';
import * as ST from '../game/js/businessstaff.js';
import * as EV from '../game/js/bezitevents.js';
import * as SN from '../game/js/snackvan.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const shop = (cfg = {}) => ({ id: 4242, type: 'bakker', cls: 'shop', m2: 120, p: 100000, base: 100000, q: 100, cfg: BZ.normalizeCfg({ ...BZ.defaultCfg(4242, true), ...cfg }) });
const ctx = (o = {}) => ({ day: 5, town: { id: 'x', name: 'Winsum', houses: 1500 }, owned: 3, sameType: 0, ...o });

t('openingstijd nul: geen omzet en geen loon, maar het bedrijf blijft een gewoon bedrijf (toestand, knoppen en onderhoud intact)', () => {
  const r = BZ.stepDay(shop({ hr: 0 }), ctx());
  assert.equal(r.report.revenue, 0); assert.equal(r.report.wages, 0);
  assert.ok(r.biz.cfg && r.biz.q > 0 && r.biz.id === 4242);
  assert.match(r.report.reason, /toegankelijk/);
  const open = BZ.stepDay(shop({ hr: 10 }), ctx());
  assert.ok(open.report.revenue > 0);
});
t('de knop openingstijd beinvloedt alleen omzet en personeelskosten (lonen schalen, omzet stijgt tot een plafond)', () => {
  const a = BZ.stepDay(shop({ hr: 6 }), ctx()).report, b = BZ.stepDay(shop({ hr: 14 }), ctx()).report;
  assert.ok(b.revenue > a.revenue && b.wages > a.wages);
  assert.equal(BZ.hoursFactor(0) > 0, true);                  // zelfs een lege dag is een factor, geen blokkade
  assert.ok(ST.wagePerDay(50, 20) > ST.wagePerDay(50, 10));
});
t('een staking of een gesloten dag is een dag-event: omzet nul, kosten wat ze waren, het bedrijf blijft bereikbaar', () => {
  const r = BZ.stepDay(shop(), ctx({ event: { closed: true, note: 'Staking: vandaag geen omzet.' } }));
  assert.equal(r.report.revenue, 0); assert.equal(r.report.wages, 0);
  assert.equal(r.report.open, false);                        // 'open' in het rapport betekent: draait hij vandaag een omzet
  assert.ok(r.biz.cfg.hr > 0 && r.biz.cfg.staff.length === 1);     // de knoppen en het personeel blijven staan
  const mods = EV.businessMods({ id: 1, type: 'supermarkt' }, 'hunsingo', 1);
  assert.equal(typeof mods, 'object');
  for (const k of Object.keys(mods)) assert.ok(['closed', 'note', 'revMult', 'cost'].includes(k), k);
});
t('de snackwagen: openingsuren hoogstens 4 tot 14, een pechdag is een dag zonder verkoop; er is geen toegangsbegrip', () => {
  const S = SN.newSnack(); SN.setOwn(S, { hours: 0 }); assert.equal(S.own.hours, 4);
  SN.setOwn(S, { hours: 99 }); assert.equal(S.own.hours, 14);
  S.permits.dorp = { until: 1e6, paid: 1 }; S.own.spot = 'dorp'; S.own.stockDays = 5; S.ev.mods.push({ k: 'dicht', wagon: 'own', until: 5, mult: 1, d: 0, ev: 1 });
  S.rival.lastEvent = 1e7; S.rival.lastOffer = 1e7;
  const r = SN.settleDay(S, { day: 5, weekend: false, money: 1e9, ownWagon: true, ownQ: 100, kermisAt: () => false, chainOwn: () => 0 });
  assert.equal(r.own.revenue, 0); assert.match(r.own.note, /bereikbaar/);
});
t('bronregels: de rekenmodules van Bezit kennen geen toegang, deur of slot voor een pand of wagen', () => {
  for (const f of ['business.js', 'businessstaff.js', 'snackvan.js', 'bezitevents.js']) {
    const code = fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    assert.ok(!/\b(canEnter|mayEnter|doorOpen|isOpenAt|deny|geweigerd|toegangGeweigerd|lockDoor|doorLocked)\b/i.test(code), f);
    assert.ok(!/world\.|player\./.test(code.replace(/\/\/.*$/gm, '')) || f === 'x', f);
  }
});
console.log(`bezitopen_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
