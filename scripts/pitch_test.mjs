// Standplaatsen (pitch.js): de plekken, de vraag (druk, week, uur, gebeurtenis), de concurrentie en de vergunning.   node scripts/pitch_test.mjs
// Puur: geen opslag, geen klok.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as S from '../game/js/pitch.js';
import { MOBILE_SPOTS } from '../game/js/business.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };

t('zestien plekken met een geldig id, een naam en een plaats; de oude standplaatsen van de wagen blijven bestaan', () => {
  assert.equal(S.SPOTS.length, 16);
  for (const s of S.SPOTS) { assert.match(s.id, /^[a-z]{2,12}$/); assert.ok(s.name && s.place && s.foot > 0 && S.PROFILES[s.profile]); }
  for (const k of Object.keys(MOBILE_SPOTS)) assert.ok(S.isSpot(k), k);
  assert.equal(new Set(S.SPOT_IDS).size, 16);
});
t('de ligging komt uit echte coordinaten: de Grote Markt bij het midden, het station zuidelijker, de Eemshaven ver weg', () => {
  const m = S.spotXY('markt'), st = S.spotXY('station'), e = S.spotXY('eemshaven');
  assert.ok(Math.hypot(m.x, m.y) < 400);
  assert.ok(st.y > m.y + 600);
  assert.ok(Math.hypot(e.x - m.x, e.y - m.y) > 20000);
  assert.equal(S.nearestSpot(m.x + 20, m.y - 10), 'markt');
  assert.equal(S.nearestSpot(5000, 5000, 100), null);
});
t('Martinikerkhof ligt binnen 150 m van de Martinikerk uit de herkenningspunten', () => {
  const m = S.spotXY('martini');
  assert.ok(Math.hypot(m.x - 267.2, m.y + 7.6) < 150);
});
t('het uurprofiel: een lunchvenster vangt meer dan een nachtvenster, het beste venster is het grootst', () => {
  assert.ok(S.openingShare('dag', 11, 10) > 0.75);
  assert.equal(S.openingShare('dag', 0, 6), 0);
  const b = S.bestOpening('avond', 8);
  assert.ok(b.from >= 15 && b.fraction >= S.openingShare('avond', 8, 8));
  assert.ok(S.openingShare('dag', 22, 6) > 0);             // een venster over middernacht telt door
  assert.ok(S.openingShare('spits', 7, 3) > S.openingShare('spits', 10, 3));
});
t('de vraag: een drukke plek in het weekend, een rustig dorp op een doordeweekse dag', () => {
  const markt = S.demandAt('markt', { weekend: true, from: 11, hours: 10, day: 5 }).demand;
  const dorp = S.demandAt('dorp', { weekend: false, from: 11, hours: 10, day: 5 }).demand;
  assert.ok(markt > 2 * dorp && dorp > 20);
  assert.ok(markt < 600);
  assert.equal(S.demandAt('nergens', {}).demand, 0);
});
t('de week gemiddeld rond 1 per plek (week is een verdeling, geen bonus)', () => {
  for (const s of S.SPOTS.filter((x) => !x.event)) { const avg = (5 * s.week[0] + 2 * s.week[1]) / 7; assert.ok(avg > 0.9 && avg < 1.1, `${s.id} ${avg}`); }
});
t('kermis en voetbal: alleen op de dag zelf drukte', () => {
  const kd = S.demandAt('kermis', { kermis: true, from: 12, hours: 10, day: 7 }).demand, kn = S.demandAt('kermis', { from: 12, hours: 10, day: 7 }).demand;
  assert.ok(kd > 8 * kn);
  assert.ok(S.matchDay(2) && S.matchDay(16) && !S.matchDay(3) && !S.matchDay(0));
  const w = S.demandAt('stadion', { weekend: true, matchDay: true, from: 11, hours: 9, day: 2 }).demand, z = S.demandAt('stadion', { weekend: true, from: 11, hours: 9, day: 9 }).demand;
  assert.ok(w > 1.5 * z);
});
t('winkeldichtheid: meer winkelplekken in de buurt is drukker, begrensd', () => {
  assert.ok(S.densityFactor(0) < 1 && S.densityFactor(200) === 1.25);
  const p = S.spotXY('markt');
  assert.equal(S.shopsNear('markt', [{ x: p.x + 100, y: p.y }, { x: p.x + 900, y: p.y }, null]), 1);
  const base = S.demandAt('markt', { day: 3, from: 11, hours: 10 }).demand;
  assert.ok(S.demandAt('markt', { day: 3, from: 11, hours: 10, shops: 12 }).demand > base);
});
t('deterministisch: dezelfde plek en dag geven dezelfde vraag, andere dagen ruis tot 6%', () => {
  const a = S.demandAt('markt', { day: 9, from: 11, hours: 10 }).demand;
  assert.equal(a, S.demandAt('markt', { day: 9, from: 11, hours: 10 }).demand);
  const vals = [1, 2, 3, 4, 5, 6, 7, 8].map((d) => S.demandAt('markt', { day: d, from: 11, hours: 10 }).demand);
  assert.ok(Math.max(...vals) / Math.min(...vals) < 1.13);
});
t('concurrentie: een goede naam drukt hem, de concurrent in hetzelfde cluster kost 3% per plek (hoogstens 15%)', () => {
  const laag = S.competitionFactor('markt', { rep: 0 }), hoog = S.competitionFactor('markt', { rep: 100 });
  assert.ok(hoog > laag && laag > 0.6);
  const een = S.competitionFactor('markt', { rep: 50, rivalSpots: ['station'] }), geen = S.competitionFactor('markt', { rep: 50 });
  assert.ok(geen - een > 0.029 && geen - een < 0.031);
  const veel = S.competitionFactor('markt', { rep: 50, rivalSpots: ['station', 'martini', 'oosterpoort', 'reitdiep', 'park', 'stadion', 'kermis'] });
  assert.ok(Math.abs(geen - veel - 0.15) < 0.002);
  assert.equal(S.competitionFactor('markt', { rep: 50, rivalSpots: ['dorp'] }), geen);        // ander cluster: geen effect
});
t('de vergunning: prijs naar druk, schaalprijs tot x3, de beste plek is het duurst', () => {
  assert.equal(S.permitPrice('nergens'), 0);
  assert.ok(S.permitPrice('markt') > S.permitPrice('station') && S.permitPrice('station') > S.permitPrice('dorp'));
  assert.ok(S.permitPrice('dorp') >= 1500 && S.permitPrice('dorp') <= 2500);
  assert.equal(S.permitPrice('markt', 40), Math.round(6000 * Math.pow(1.6, 1.6) * 3 / 50) * 50);
  for (const s of S.SPOTS) assert.equal(S.permitPrice(s.id) % 50, 0);
});
t('een vergunning kopen: geldigheid 40 dagen, te weinig geld, bezet, al van jou', () => {
  const r = S.buyPermit({}, 'dorp', 10, 1e6);
  assert.ok(r.ok && r.permits.dorp.until === 49 && r.cost === S.permitPrice('dorp'));
  assert.ok(S.permitHeld(r.permits, 'dorp', 49) && !S.permitHeld(r.permits, 'dorp', 50));
  assert.equal(S.permitDaysLeft(r.permits, 'dorp', 10), 40);
  assert.equal(S.buyPermit(r.permits, 'dorp', 11, 1e6).why, 'al-van-jou');
  assert.equal(S.buyPermit({}, 'markt', 1, 100).why, 'te-weinig-geld');
  assert.equal(S.buyPermit({}, 'markt', 1, 1e6, { taken: (id) => id === 'markt' }).why, 'bezet');
  assert.equal(S.buyPermit({}, 'zzz', 1, 1e6).why, 'onbekend');
  assert.equal(S.buyPermit(r.permits, 'leek', 11, 1e6).cost, S.permitPrice('leek', 1));      // de tweede is duurder
});
t('verlengen of laten vervallen: een kwart, vervalt zonder geld, nooit geld uit het niets', () => {
  const p = { dorp: { until: 20, paid: 2250 }, leek: { until: 60, paid: 2400 } };
  const ok = S.settlePermits(p, 21, 1e6);
  assert.deepEqual(ok.renewed, ['dorp']); assert.ok(ok.spent > 0 && ok.spent < S.permitPrice('dorp')); assert.equal(ok.permits.dorp.until, 60);
  const no = S.settlePermits(p, 21, 0);
  assert.deepEqual(no.lapsed, ['dorp']); assert.ok(!no.permits.dorp && no.permits.leek && no.spent === 0);
  assert.deepEqual(S.settlePermits(p, 21, 1e6).permits.leek, p.leek);
});
t('normalizePermits gooit onbekende plekken en rommel weg', () => {
  const r = S.normalizePermits({ dorp: { until: 9.4, paid: 5 }, zzz: { until: 1 }, leek: 'x', markt: { until: 'a' } });
  assert.deepEqual(Object.keys(r).sort(), ['dorp', 'markt']);
  assert.equal(r.markt.until, 0);
  assert.deepEqual(S.normalizePermits(null), {});
});
t('claimsleutel voor Samen spelen: sp:<id>', () => {
  assert.equal(S.claimKey('markt'), 'sp:markt');
  assert.equal(S.spotOfClaim('sp:markt'), 'markt'); assert.equal(S.spotOfClaim('sp:zzz'), null); assert.equal(S.spotOfClaim('pabc'), null);
});
t('bronregels: geen Math.random, geen fetch, geen DOM', () => {
  const src = fs.readFileSync(new URL('../game/js/pitch.js', import.meta.url), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  assert.ok(!/Math\.random|fetch\(|document\.|window\.|localStorage/.test(src));
});
console.log(`pitch_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
