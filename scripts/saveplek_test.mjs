// Savekaart: waar je was en hoe een nieuw spel heet (#985):  node scripts/saveplek_test.mjs
// Puur en op een geheugenopslag; raakt nooit de echte opslag.
import assert from 'node:assert/strict';
import { plekNaam, laadtOpOpslagplek } from '../game/js/saveplek.js';
import * as S from '../game/js/saveslots.js';
import { SAVE_VERSION } from '../game/js/savemigrate.js';
import { ARC_ID } from '../game/js/storyarc.js';

let n = 0, fails = 0;
const ok = (f, name) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL ' + name + ': ' + e.message); } };
class Mem { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }

const meta = { neighbourhoodPoints: [{ x: 0, y: 0, name: 'Binnenstad' }, { x: 500, y: 0, name: 'Ebbingekwartier' }] };
ok(() => assert.equal(plekNaam(480, 10, { meta, ommelandArea: () => null }), 'Ebbingekwartier'), 'in de stad: de dichtstbijzijnde wijk');
ok(() => assert.equal(plekNaam(5, 5, { meta, ommelandArea: () => null }), 'Binnenstad'), 'in de stad: de andere wijk');
ok(() => assert.equal(plekNaam(9000, 0, { meta, ommelandArea: () => ({ place: 'Warffum' }), areaNameAt: () => ({ name: 'Warffum', near: false }) }), 'Warffum'), 'in een dorp: het dorp');
ok(() => assert.equal(plekNaam(9000, 0, { meta, ommelandArea: () => ({ near: true }), areaNameAt: () => ({ name: 'Ommeland', sub: 'bij Warffum', near: true }) }), 'Ommeland bij Warffum'), 'in het open veld: bij welk dorp');
ok(() => assert.equal(plekNaam(NaN, 0, { meta }), ''), 'zonder positie geen plek');
ok(() => assert.equal(plekNaam(1, 1, {}), ''), 'zonder kaartgegevens geen plek');

const dag = new Date(2026, 10, 19);
ok(() => assert.equal(S.newSlotName([], dag), 'Spel van 19 nov'), 'een nieuw spel heet naar de dag');
ok(() => assert.equal(S.newSlotName(['Spel van 19 nov'], dag), 'Spel van 19 nov (2)'), 'twee op een dag krijgen een nummer');
ok(() => assert.equal(S.newSlotName(['Spel van 19 nov', 'Spel van 19 nov (2)'], dag), 'Spel van 19 nov (3)'), 'en een derde');

ok(() => {
  const ls = new Mem();
  const a = S.createSlot(ls, S.newSlotName(S.takenNames(ls), dag), 0, true);
  S.writeSlot(ls, a, { v: SAVE_VERSION, arc: ARC_ID, savedAt: 5, money: 1, speeltijd: 60, plek: 'Binnenstad', missions: { index: 0, completed: [], seen: [] }, character: 'tammo' });
  const b = S.createSlot(ls, S.newSlotName(S.takenNames(ls), dag), 0, true);
  assert.notEqual(S.nameOf(ls, a), S.nameOf(ls, b), 'twee nieuwe spellen zijn uit elkaar te houden');
  assert.equal(S.nameOf(ls, a), 'Spel van 19 nov');
  const lijst = S.listSlots(ls);
  assert.equal(lijst.find((s) => s.n === a).summary.plek, 'Binnenstad', 'de savekaart krijgt de plek mee');
}, 'nieuwe spellen op een geheugenopslag');
ok(() => assert.equal(S.summarize({ v: 1, savedAt: 1 }).plek, '', 'een oude save zonder plek geeft een lege plek'), 'oude save');

ok(() => {
  const quota = new Error('x'); quota.name = 'QuotaExceededError';
  assert.equal(S.saveFailText(quota), 'de opslag van je browser is vol');
  assert.equal(S.saveFailText(new Error('write failed')), 'het schrijven naar de opslag lukte niet');
  const sec = new Error('denied'); sec.name = 'SecurityError';
  assert.equal(S.saveFailText(sec), 'de browser staat opslaan nu niet toe');
  assert.doesNotMatch(S.saveFailText(quota) + S.saveFailText(null), /[A-Z][a-z]+Error|failed/, 'geen Engelse techniek bij de speler');
}, 'de reden van een mislukte save is Nederlands');

ok(() => {
  assert.equal(laadtOpOpslagplek({ ctx: 'busy', pos: { x: 1, y: 2 } }), true, 'midden in een missie: de plek blijft');
  assert.equal(laadtOpOpslagplek({ ctx: 'free', pos: { x: 1204.5, y: -88 } }), true, '#984: ergens anders opgeslagen: laden zet je daar terug');
  assert.equal(laadtOpOpslagplek({ ctx: 'home', pos: { x: 1, y: 2 } }), false, 'opgeslagen bij het huis: de flat');
  assert.equal(laadtOpOpslagplek({ pos: { x: 1, y: 2 } }), false, 'een oude save zonder context: de flat');
  assert.equal(laadtOpOpslagplek({ ctx: 'free', pos: null }), false, 'in een boot is er geen plek: de flat');
  assert.equal(laadtOpOpslagplek({ ctx: 'free', pos: { x: NaN, y: 2 } }), false);
  assert.equal(laadtOpOpslagplek(null), false);
}, 'laden op de plek van de save (#984)');

console.log(`saveplek_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
