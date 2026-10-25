// Samen spelen (#95): wat een sessie onthoudt (game/js/coopsave.js). Geen coöp-save, geen gedeelde save.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as S from '../game/js/coopsave.js';
import { BASE_KEYS, KEYS } from '../game/js/storagekeys.js';
import { missieKlaarId } from '../game/js/achievements.js';

let n = 0;
const t = (name, f) => { f(); n++; };
class Mem { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }

t('alleen een sessiesleutel; geen aparte coöp-verhaalsave en niet per verhaalboog', () => {
  assert.equal(BASE_KEYS.coopSession, 'gde-coop-sessie');
  assert.equal(BASE_KEYS.coopSave, undefined);
  assert.equal(KEYS.coopSession, BASE_KEYS.coopSession);
  assert.notEqual(KEYS.coopSession, KEYS.save);
});
t('standaard leeg', () => assert.deepEqual(S.readSession(new Mem()), { v: 1, laatsteCode: '' }));
t('bewaart kamercodes en koppelcodes, geen rommel', () => {
  assert.equal(S.toSession(null, { code: 'k3j9d-8f2mn' }).laatsteCode, 'K3J9D-8F2MN');
  assert.equal(S.toSession(null, { code: 'GDE2-84.12.34.56:41000-ABCDEFGH-1A2B' }).laatsteCode, 'GDE2-84.12.34.56:41000-ABCDEFGH-1A2B');
  assert.equal(S.toSession(null, { code: '<script>alert(1)</script>' }).laatsteCode, '');
  assert.equal(S.toSession({ laatsteCode: 'K3J9D-8F2MN' }, {}).laatsteCode, '');
});
t('schrijven, lezen, wissen; solosleutel onaangeroerd', () => {
  const ls = new Mem(); ls.setItem(KEYS.save, 'SOLO');
  assert.equal(S.writeSession(ls, S.toSession(null, { code: 'K3J9D-8F2MN' })), true);
  assert.equal(S.readSession(ls).laatsteCode, 'K3J9D-8F2MN');
  S.clearSession(ls); assert.equal(S.readSession(ls).laatsteCode, '');
  assert.equal(ls.getItem(KEYS.save), 'SOLO');
});
t('kapotte of nieuwere data valt terug op leeg; vol opslag gooit niet', () => {
  const ls = new Mem(); ls.setItem(KEYS.coopSession, '{kapot'); assert.equal(S.readSession(ls).laatsteCode, '');
  ls.setItem(KEYS.coopSession, JSON.stringify({ v: 99, laatsteCode: 'K3J9D-8F2MN' })); assert.equal(S.readSession(ls).laatsteCode, '');
  assert.equal(S.writeSession({ setItem() { throw new Error('vol'); } }, S.newSession()), false);
});
t('eigen voortgang van een gast: verdiend geld erbij in zijn eigen save, de rest blijft', () => {
  const d = { v: 9, money: 40, moneyBackup: 40, story: { done: ['H1'] } };
  const r = S.applyGuestEarnings(d, 250.7);
  assert.equal(r.money, 290); assert.equal(r.moneyBackup, 290); assert.deepEqual(r.story, d.story); assert.equal(d.money, 40, 'invoer niet aangepast');
  assert.equal(S.applyGuestEarnings(d, 0), null); assert.equal(S.applyGuestEarnings(d, -5), null); assert.equal(S.applyGuestEarnings(null, 5), null);
  assert.equal(S.applyGuestEarnings({ money: null }, 10).money, 10);
});
t('de gast bewaart niets van de host: alleen zijn eigen velden en de ids van zijn beloningen (#429)', () => {
  const host = { money: 9999, story: { done: ['host'] }, missions: { completed: [1] }, prestaties: { unlocked: ['m1_klaar'] }, pos: { x: 1, y: 2 } };
  const mine = { money: 100, health: 80, stats: { missionsDone: 0 }, prestaties: { unlocked: [] } };
  const r = S.applyGuestChanges(host, mine, 0, ['s:b:1']);
  assert.equal(r.money, 100, 'zijn eigen geld, niet dat van de host');
  assert.deepEqual(r.story, host.story); assert.deepEqual(r.missions, host.missions, 'verhaal en missies van de host komen er niet in');
  assert.deepEqual(r.pos, host.pos);
  assert.deepEqual(r.prestaties, { unlocked: [] }, 'zijn eigen prestaties');
  assert.deepEqual(r.coopGebeurtenissen, ['s:b:1'], 'de id van zijn beloning gaat mee zijn eigen save in');
  assert.deepEqual(S.applyGuestChanges(r, mine, 0, ['s:b:1']), null, 'dezelfde id en dezelfde stand: niets te schrijven');
  assert.deepEqual(S.applyGuestChanges(r, { ...mine, money: 120 }, 0, ['s:b:2']).coopGebeurtenissen, ['s:b:1', 's:b:2'], 'de ids blijven staan');
  assert.equal(S.applyGuestChanges(null, mine, 0, ['x']), null);
});
t('prestaties per speler: een meegespeelde opdracht staat als gedaan in zijn eigen prestaties (#429)', () => {
  const d = { prestaties: { eierballen: ['e1'], unlocked: ['m1_klaar'] } };
  const r = S.applyGuestAchievements(d, ['m1_klaar', 'm3_klaar', 'm3_klaar', '', null]);
  assert.deepEqual(r.prestaties, { eierballen: ['e1'], unlocked: ['m1_klaar', 'm3_klaar'] });
  assert.deepEqual(d.prestaties.unlocked, ['m1_klaar'], 'invoer niet aangepast');
  assert.equal(S.applyGuestAchievements(d, ['m1_klaar']), d, 'niets nieuws: dezelfde save');
  assert.deepEqual(S.applyGuestAchievements({}, ['m2_klaar']).prestaties, { unlocked: ['m2_klaar'] });
  assert.equal(S.applyGuestAchievements(null, ['m2_klaar']), null); assert.equal(S.applyGuestAchievements(d, []), d);
  // de id van een meegespeelde missie komt uit achievements.js, geen verzonnen sleutel in de save
  assert.equal(missieKlaarId(0), 'm1_klaar'); assert.equal(missieKlaarId(7), 'm8_klaar'); assert.equal(missieKlaarId(999), null);
  assert.deepEqual(S.applyGuestAchievements({ prestaties: { unlocked: [] } }, [missieKlaarId(2)]).prestaties.unlocked, ['m3_klaar']);
});
t('een gast bewaart zijn verdiensten meteen, ook achter het pauzemenu, en hoort het als schrijven niet lukt (#452, punt 19)', () => {
  const src = readFileSync(new URL('../game/js/savegame.js', import.meta.url), 'utf8');
  const bewaar = src.indexOf("if (w.coopRole === 'client' && w.coopVerdiend > 0) saveGuestEarnings(w);");
  const pauze = src.indexOf('if (w.paused) return;');
  assert.ok(bewaar > 0 && pauze > 0 && bewaar < pauze, 'het bewaren staat voor de pauze-terugkeer');
  assert.doesNotMatch(src, /coopVerdiend > 0 && !w\.paused/, 'de oude voorwaarde is weg');
  assert.match(src, /Je verdiensten worden nog niet bewaard\. We proberen het opnieuw\./);
  assert.match(src, /gastBewaarMeld\(w\)/, 'een mislukte schrijfbeurt wordt gemeld en opnieuw geprobeerd');
});

console.log(`coopsave_test: ${n}/${n} ok`);
