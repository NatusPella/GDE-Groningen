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

t('#566: de schade van de heldenauto van de gastheer komt niet in de eigen save van de gast', () => {
  const data = { money: 40, shops: { hero: { health: 55, dents: [[1, 2, 0.5]] }, outfit: { tammo: 'stadjer' }, vehicles: [] } };
  const mine = { money: 40, shops: { hero: { health: 100, dents: [] }, outfit: { tammo: 'zomer' }, vehicles: [] } };
  const r = S.applyGuestChanges(data, mine, 0);
  assert.equal(r.shops.hero.health, 55, 'de eigen schade van de gast blijft');
  assert.deepEqual(r.shops.hero.dents, [[1, 2, 0.5]]);
  assert.deepEqual(r.shops.outfit, { tammo: 'zomer' }, 'wat de gast zelf koos gaat wel mee');
  // de gast rijdt bij de gastheer schade: dat is de auto van de gastheer (de proxy) en raakt zijn eigen save niet
  const na = S.applyGuestChanges(r, { ...mine, money: 60, shops: { ...mine.shops, hero: { health: 20, dents: [[2, 1, 0]] } } }, 0);
  assert.equal(na.shops.hero.health, 55, 'de proxy-auto van de gastheer raakt de eigen save niet');
  assert.equal(na.money, 60);
  // alleen het verschil in de auto van de gastheer: dan valt er niets te bewaren
  assert.equal(S.applyGuestChanges({ money: 5, moneyBackup: 5, shops: { hero: { health: 10 } } }, { money: 5, shops: { hero: { health: 90 } } }, 0), null,
    'alleen de schade van de gastheer is geen wijziging van de eigen save');
  // nog geen heldenauto in de eigen save: er komt geen schade van de gastheer in
  assert.deepEqual(S.applyGuestChanges({ money: 3, shops: { vehicles: [] } }, mine, 0).shops.hero, {});
  // zonder shops in de momentopname blijft de eigen save zoals hij was
  const zonder = S.applyGuestChanges({ money: 3, shops: { hero: { health: 7 } } }, { money: 4 }, 0);
  assert.deepEqual(zonder.shops.hero, { health: 7 });
});

console.log(`coopsave_test: ${n}/${n} ok`);
