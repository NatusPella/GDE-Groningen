// Jelle als eindbaas (jellebaas.js, snackvan.js, #1139): een offerte per akte, een handlanger bij elke streek, nooit geweld,
// en een oude save (zonder akte) merkt niets. node scripts/jellebaas_test.mjs
import assert from 'node:assert/strict';
import { BOSS, ACTS, jelleOffer, henchmenOf, henchmanLine, trickText } from '../game/js/jellebaas.js';
import { PARTS } from '../game/js/storyarc.js';
import { EVENT_KINDS } from '../game/js/rival.js';
import * as SN from '../game/js/snackvan.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n').slice(0, 4).join(' ')); } };

t('elke akte van het verhaal heeft een offerte; geen onbekende akten', () => {
  for (const p of Object.keys(PARTS)) assert.ok(BOSS[p] && jelleOffer(p), p);
  for (const p of ACTS) assert.ok(PARTS[p] || p === 'nazomer', p);
});
t('elke streek heeft per akte (1 tot 4) een handlanger-regel; akte 5 doet hij het zelf', () => {
  for (const p of ['kop', 'romp', 'staart', 'zuid', 'ontzet']) for (const k of Object.keys(EVENT_KINDS)) assert.ok(henchmanLine(p, k).length > 10, `${p}/${k}`);
  assert.equal(henchmenOf('ontzet').naam, 'niemand meer');
  assert.equal(henchmenOf('kop').naam, 'Durk en Douwe');
  assert.match(henchmanLine('ontzet', 'vergunning'), /eigen vergunning/);
});
t('satire, geen leed: geen geweld, geen echte merken, geen winter', () => {
  const alles = JSON.stringify(BOSS);
  assert.ok(!/(slaan|sla |schiet|bloed|doodslag|dood |mes\b|wapen|geweld|sneeuw|winter|(^|[^a-z])ijs([^a-z]|$))/i.test(alles));
  assert.ok(!/de Grunn/.test(alles));
});
t('onbekende of ontbrekende akte: geen handlanger-regel, wel een veilige offerte', () => {
  for (const p of [undefined, null, '', 'x']) { assert.equal(henchmanLine(p, 'storing'), ''); assert.equal(trickText(p, 'storing', 'abc'), 'abc'); assert.ok(jelleOffer(p)); }
});
t('snackvan: een offerte per akte, één keer; offerPart wordt bewaard en genormaliseerd', () => {
  const S = SN.normalizeSnack(null);
  assert.equal(S.offerPart, '');
  const ctx = (part) => ({ day: 10, money: 0, part });
  const r1 = SN.settleDay(S, ctx('kop')); assert.ok(r1.lines.includes(jelleOffer('kop')));
  const r2 = SN.settleDay(S, { ...ctx('kop'), day: 11 }); assert.ok(!r2.lines.includes(jelleOffer('kop')), 'niet twee keer');
  const r3 = SN.settleDay(S, { ...ctx('romp'), day: 12 }); assert.ok(r3.lines.includes(jelleOffer('romp')));
  assert.equal(SN.normalizeSnack(JSON.parse(JSON.stringify(S))).offerPart, 'romp');
  assert.equal(SN.normalizeSnack({ offerPart: 'rommel' }).offerPart, '');
});
t('snackvan: een oude save (geen akte) krijgt geen offerte', () => {
  const S = SN.normalizeSnack({});
  const r = SN.settleDay(S, { day: 10, money: 0 }); for (const k of ACTS) assert.ok(!r.lines.includes(jelleOffer(k)), k);
  assert.equal(S.offerPart, '');
});
console.log(fails ? `jellebaas_test: ${fails} van ${n} gefaald` : `jellebaas_test ok (${n} groepen)`);
process.exit(fails ? 1 : 0);
