// Voortgang per save (22-11), de pure kant:  node scripts/savescope_test.mjs
// Raakt nooit echte opslag: alles draait op een geheugen-storage (gde-save-v1, gde-settings en gde-prestaties-v1 blijven onaangeroerd).
import { KEYS } from '../game/js/storagekeys.js';
import { SAVE_VERSION } from '../game/js/savemigrate.js';
import { ARC_ID } from '../game/js/storyarc.js';
import * as S from '../game/js/saveslots.js';
import { SCOPED_KEYS, activateScope, dropScope, forkScope, readOwner } from '../game/js/savescope.js';
import { storyCounts, saveProgress } from '../game/js/progress.js';

let n = 0, fails = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log(`FAIL ${name}`); } };
class Mem {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
const save = (money, savedAt) => ({ v: SAVE_VERSION, arc: ARC_ID, savedAt, money, speeltijd: 100, missions: { index: 0, completed: [], seen: [] }, character: 'tammo' });
const ls0 = new Mem();
const real = typeof localStorage !== 'undefined' ? localStorage : null;
ok(!real || real.getItem('gde-save-v1') === real.getItem('gde-save-v1'), 'echte opslag niet nodig');

// de lijst: wat per save gaat en wat bewust globaal blijft
for (const k of ['achievements', 'exploration', 'gebieden', 'garageOntdekt', 'loopbaan', 'bezit', 'wijkenSeen']) ok(SCOPED_KEYS.includes(k), `per save: ${k}`);
for (const k of ['settings', 'muted', 'onboarding', 'hintsGezien', 'uitlegNietMeer', 'gallery', 'save', 'saveSlots']) ok(!SCOPED_KEYS.includes(k), `globaal: ${k}`);
ok(SCOPED_KEYS.every((k) => KEYS[k]), 'elke gescopete sleutel bestaat in KEYS');

// migratie: de gedeelde inhoud van voor deze wijziging gaat naar de laatst bewaarde save, niet naar een nieuw spel
{
  const ls = new Mem();
  ls.setItem(KEYS.achievements, '{"v":1,"unlocked":{"a":1}}');
  ls.setItem(KEYS.exploration, '{"verkend":79}');
  ls.setItem(KEYS.gebieden, '{"g":4}');
  ls.setItem(KEYS.garageOntdekt, '{"politie":1}');
  ok(readOwner(ls) === null, 'voor de eerste keer: geen eigenaar');
  // de boot opent een NIEUW spel (slot 2); de oude voortgang hoort bij slot 1 (laatst bewaarde save)
  const r = activateScope(ls, 2, 1);
  ok(r.changed && r.from === 1 && r.to === 2, 'migratie: wisselt van 1 naar 2');
  ok(ls.getItem(KEYS.achievements) === null && ls.getItem(KEYS.exploration) === null && ls.getItem(KEYS.gebieden) === null && ls.getItem(KEYS.garageOntdekt) === null, 'nieuw spel: prestaties, kaart, gebieden en garage zijn leeg');
  ok(ls.getItem(`gde-scope-1:${KEYS.achievements}`) === '{"v":1,"unlocked":{"a":1}}', 'de oude voortgang is bewaard bij slot 1 (niets weggegooid)');
  ok(readOwner(ls) === 2, 'eigenaar is nu slot 2');
  // het nieuwe spel speelt een beetje, dan weer naar slot 1
  ls.setItem(KEYS.exploration, '{"verkend":3}');
  activateScope(ls, 1, 0);
  ok(ls.getItem(KEYS.exploration) === '{"verkend":79}' && ls.getItem(KEYS.achievements).includes('"a":1'), 'terug naar slot 1: de oude voortgang is heel');
  activateScope(ls, 2, 0);
  ok(ls.getItem(KEYS.exploration) === '{"verkend":3}' && ls.getItem(KEYS.achievements) === null, 'slot 2 houdt zijn eigen voortgang');
}
// migratie, Doorgaan: de huidige save erft de gedeelde inhoud
{
  const ls = new Mem();
  ls.setItem(KEYS.exploration, '{"verkend":79}');
  const r = activateScope(ls, 1, 1);
  ok(!r.changed && ls.getItem(KEYS.exploration) === '{"verkend":79}', 'Doorgaan op de laatste save: houdt de gedeelde inhoud');
}
// geen eigenaar bekend en geen save: de inhoud blijft bewaard (onder 0), een nieuwe save begint leeg
{
  const ls = new Mem();
  ls.setItem(KEYS.gebieden, '{"g":9}');
  activateScope(ls, 1, 0);
  ok(ls.getItem(KEYS.gebieden) === null && ls.getItem(`gde-scope-0:${KEYS.gebieden}`) === '{"g":9}', 'zonder eigenaar: bewaard onder 0, nieuw spel leeg');
}
// een slot wissen laat niets achter voor een nieuw spel op dezelfde plek
{
  const ls = new Mem();
  activateScope(ls, 1, 1);
  ls.setItem(KEYS.exploration, '{"verkend":50}');
  activateScope(ls, 2, 1);
  dropScope(ls, 1);
  ok(ls.getItem(`gde-scope-1:${KEYS.exploration}`) === null, 'gewist slot: opzij gezette voortgang weg');
  activateScope(ls, 1, 0);
  ok(ls.getItem(KEYS.exploration) === null, 'een nieuw spel op de plek van het gewiste slot begint leeg');
}
// Opslaan als nieuw spel: het lopende spel wordt de nieuwe save, de oude houdt zijn kopie
{
  const ls = new Mem();
  activateScope(ls, 1, 1);
  ls.setItem(KEYS.exploration, '{"verkend":10}');
  forkScope(ls, 3);
  ok(readOwner(ls) === 3 && ls.getItem(KEYS.exploration) === '{"verkend":10}', 'fork: lopend spel is nu slot 3');
  ls.setItem(KEYS.exploration, '{"verkend":20}');
  activateScope(ls, 1, 0);
  ok(ls.getItem(KEYS.exploration) === '{"verkend":10}', 'fork: slot 1 houdt de kopie van het moment');
  activateScope(ls, 3, 0);
  ok(ls.getItem(KEYS.exploration) === '{"verkend":20}', 'fork: slot 3 houdt de latere stand');
}
// saveslots: nieuw spel via createSlot ruimt opzij gezette voortgang van een eerder gewiste plek op; stay-vlag opent de gekozen save
{
  const ls = new Mem();
  S.writeSlot(ls, 1, save(10, 1000));
  S.writeSlot(ls, 2, save(20, 2000));
  ok(S.pickLatest(ls) === 2, 'boot: laatst bewaarde save');
  S.markStay(ls, 1);
  ok(S.pickLatest(ls) === 1, 'stay: de gekozen save opent');
  ok(S.pickLatest(ls) === 2, 'stay geldt één keer');
  ls.setItem(`gde-scope-3:${KEYS.exploration}`, 'oud');
  const m = S.createSlot(ls, 'x', 3, true);
  ok(m === 3 && ls.getItem(`gde-scope-3:${KEYS.exploration}`) === null, 'createSlot: opzij gezette voortgang van die plek is weg');
}
// een nieuw spel is leeg: Verhaal 0, stap 1 (geen storyverlies uit een andere save)
{
  const leeg = storyCounts({});
  ok(leeg.done === 0 && leeg.total > 0, `Verhaal 0 van ${leeg.total} bij een nieuw spel`);
  ok(saveProgress({}) === 0, 'voortgang van een nieuwe save is 0%');
}
console.log(fails ? `${fails} van ${n} mislukt` : `savescope_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
