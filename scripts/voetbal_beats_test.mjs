// Test van de verhaalbeats en de ontgrendeling van de voetbalcarrière (#1112): scripts/voetbal_beats_test.mjs. Puur.
import PARKDATA from '../game/js/voetbalparkendata.js';
import assert from 'node:assert/strict';
import { STEPS, BETWEEN_STEPS } from '../game/js/storyarc_nieuw.js';
import { wgsToWorld } from '../game/js/rdnew.js';
import { makeParkIndex, HOME_WGS } from '../game/js/voetbalparken.js';
import * as C from '../game/js/voetbalcarriere.js';
import { BEATS, beatText, nextBeat, markBeat, beatsDone, inviteBeat, proposal, partnerOf, hudLine, BEAT_MAX_WORDS, beatMayShow } from '../game/js/voetbalbeats.js';
import { voetbalOpen, voetbalHint, zetPoort, PART_ORDER } from '../game/js/voetbalpoort.js';
import { wordCount } from '../game/js/hudtext.js';
import { hasForbiddenWord } from './voetbal_verboden.mjs';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const index = makeParkIndex(PARKDATA);
const [hx, hy] = wgsToWorld(HOME_WGS.lat, HOME_WGS.lon);
const getClub = C.clubResolver(index);
const start = (char = 'anita') => C.createCareer({ char, index, home: { x: hx, y: hy } });
const ctx = { unlocked: true, busy: false, day: 5 };

t('tien beats, elk hooguit 14 woorden, Nederlands, geen verboden woorden uit de canon', () => {
  assert.equal(BEATS.length, 10);
  assert.deepEqual(BEATS.map((b) => b.id), ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10']);
  const VERBODEN = /\b(winterstop|winter|sneeuw|voorjaar|lente|jeugd|kinderen|kindertijd|sinds kinds|twintig jaar|twaalf jaar|de grunn|\d+ jaar oud)\b/i;
  for (const b of BEATS) for (const char of ['anita', 'tammo']) {
    const x = beatText(b, char);
    assert.ok(wordCount(x.tekst) <= BEAT_MAX_WORDS, `${b.id} ${char}: ${wordCount(x.tekst)} woorden`);
    assert.ok(!VERBODEN.test(x.tekst), `${b.id} ${char}: ${x.tekst}`);
    assert.ok(!hasForbiddenWord(x.tekst), x.tekst);
    assert.ok(x.wie && x.tekst.length > 10);
    assert.ok(!/[A-Z]{3,}/.test(x.tekst), 'geen schreeuwtekst');
  }
  assert.equal(partnerOf('anita'), 'Tammo'); assert.equal(partnerOf('tammo'), 'Tessa');
  assert.equal(beatText(BEATS[0], 'anita').wie, 'Tammo'); assert.equal(beatText(BEATS[0], 'tammo').wie, 'Tessa');
  assert.match(hudLine(BEATS[1], 'anita'), /^Tessa: /);
});
t('de poort: akte 4; een bestaande save houdt alles; een nieuw spel begint dicht; dev is open', () => {
  assert.ok(voetbalOpen({}), 'zonder gate-veld: een bestaande save, alles open');
  assert.ok(voetbalOpen({ gate: { v: 1, open: [] }, ended: true }));
  assert.equal(voetbalOpen({ gate: { v: 1, open: [] }, partNow: 'staart' }), false, 'akte 3 is te vroeg');
  assert.equal(voetbalOpen({ gate: { v: 1, open: [] }, partNow: 'zuid' }), true, 'akte 4 opent het');
  assert.equal(voetbalOpen({ gate: { v: 1, open: [] }, partNow: 'ontzet' }), true);
  assert.equal(voetbalOpen({ gate: { v: 1, open: [] }, partNow: 'kop', dev: true }), true);
  assert.equal(voetbalOpen({ gate: { v: 1, open: ['voetbal'] }, partNow: 'kop' }), true);
  assert.ok(voetbalHint({ gate: { v: 1, open: [] }, partNow: 'kop' }) && !/de Grunn/.test(voetbalHint({ gate: { v: 1, open: [] }, partNow: 'kop' })));
  assert.equal(voetbalHint({}), null);
  assert.deepEqual(PART_ORDER.slice(0, 4), ['kop', 'romp', 'staart', 'zuid']);
  // de echte poort kan het overnemen (dezelfde vorm)
  zetPoort({ worldOpen: (id) => id !== 'voetbal' }); assert.equal(voetbalOpen({}), false);
  zetPoort(null); assert.ok(voetbalOpen({}));
});
t('B1: de uitnodiging komt alleen als de poort open is, niets loopt en hooguit een keer per speldag', () => {
  const nieuw = C.newCareer();
  assert.ok(inviteBeat(nieuw, ctx, 'anita'));
  assert.equal(inviteBeat(nieuw, { ...ctx, unlocked: false }, 'anita'), null);
  assert.equal(inviteBeat(nieuw, { ...ctx, busy: true }, 'anita'), null);
  assert.equal(inviteBeat({ ...nieuw, inviteDay: 5 }, ctx, 'anita'), null);
  assert.ok(inviteBeat({ ...nieuw, inviteDay: 4 }, ctx, 'anita'));
  assert.equal(inviteBeat(start(), ctx, 'anita'), null, 'wie al speelt krijgt hem niet meer');
});
t('de uitnodiging blijft bewaard na een herstart en is geen carrière', () => {
  const back = C.normalize(JSON.stringify({ v: 1, started: false, invited: true, inviteDay: 7 }));
  assert.equal(back.started, false); assert.equal(back.invited, true); assert.equal(back.inviteDay, 7);
});
t('B2 tot B4 volgen de gebeurtenissen; een beat per speldag; een gemiste beat wacht', () => {
  let c = start('anita');
  assert.equal(nextBeat(c, ctx), null, 'nog niets gedaan');
  c = C.train(c, 'shot', 1).career; c = { ...c, flags: { ...c.flags, trained: true } };
  let b = nextBeat(c, ctx); assert.equal(b.id, 'B2');
  assert.equal(nextBeat(c, { ...ctx, busy: true }), null, 'niet tijdens een missie of scène');
  assert.equal(nextBeat(c, { ...ctx, unlocked: false }), null);
  c = markBeat(c, b, 5);
  assert.deepEqual(beatsDone(c), ['B2']);
  assert.equal(nextBeat(c, ctx), null, 'niet twee beats op een dag');
  assert.equal(nextBeat(c, { ...ctx, day: 6 }), null, 'er is nog niets nieuws');
  c = C.advanceDays(c, 3, getClub).career;
  c = C.playEvent(c, getClub, { gf: 2, ga: 1, stats: { goals: 1, minutes: 8 } }).career;
  b = nextBeat(c, { ...ctx, day: 9 }); assert.equal(b.id, 'B3');
  c = markBeat(c, b, 9);
  b = nextBeat(c, { ...ctx, day: 10 }); assert.equal(b.id, 'B4', 'het eerste doelpunt wachtte');
  c = markBeat(c, b, 10);
  assert.equal(nextBeat(c, { ...ctx, day: 11 }), null);
  assert.ok(beatMayShow(c, { unlocked: true, busy: false, day: 11 }));
  assert.equal(markBeat(c, { id: 'X' }, 3), c);
});
t('B5 promotie, B8 kapitein, B9 trainer en B10 manager hangen aan het profiel', () => {
  let c = start('tammo');
  c = { ...c, result: { outcome: 'kampioen-promotie' } };
  assert.equal(nextBeat(c, ctx).id, 'B5');
  c = markBeat(c, BEATS[4], 1);
  c = { ...c, seasonNr: 3, flags: { ...c.flags, captain: true } };
  assert.equal(nextBeat(c, { ...ctx, day: 9 }).id, 'B8');
  c = { ...c, roles: { trainer: true, manager: false } };
  c = markBeat(c, BEATS[7], 9);
  assert.equal(nextBeat(c, { ...ctx, day: 12 }).id, 'B9');
  c = markBeat(c, BEATS[8], 12);
  c = { ...c, roles: { trainer: true, manager: true } };
  assert.equal(nextBeat(c, { ...ctx, day: 15 }).id, 'B10');
});
t('de regelaar doet een voorstel in zijn persona; Tammo en Tessa gaan nooit over elkaars geld', () => {
  const a = start('anita'), b = start('tammo');
  assert.equal(proposal(a, null).wie, 'Tammo'); assert.equal(proposal(b, null).wie, 'Tessa');
  assert.match(proposal(a, null).tekst, /schot/); assert.match(proposal(b, null).tekst, /pass/);
  assert.match(proposal({ ...a, injury: { days: 1, text: 'Je kuit is moe; rust 1 speldag' } }, null).tekst, /Rust uit/);
  assert.match(proposal({ ...a, fatigue: 90 }, null).tekst, /moe/);
  assert.match(proposal({ ...a, trainedDay: 2 }, { status: 'open' }).tekst, /wedstrijd/);
  assert.equal(proposal(null), null);
  for (const x of [a, b]) assert.ok(!/(geld van|je geld|mijn geld)/i.test(proposal(x, null).tekst));
});
t('verhaallijn V1-V3 (#1179): akte 4, na M19 en voor T4, bestaande doeltypes, stil, geen jeugd of leeftijd, Tessa speelt en Tammo regelt', () => {
  const ids = STEPS.map((x) => x.id), v = ['V1', 'V2', 'V3'].map((id) => STEPS.find((x) => x.id === id));
  assert.ok(v.every(Boolean) && v.every((x) => x.part === 'zuid' && x.kind === 'activity' && x.built && x.silent && x.player === 'anita'));
  assert.ok(ids.indexOf('V1') > ids.indexOf('M19') && ids.indexOf('V3') + 1 === ids.indexOf('T4'), 'tussen M19 en de bus naar Bourtange');
  assert.deepEqual(v.map((x) => x.goal.type), ['shop', 'reis', 'shop'], 'alleen bestaande doeltypes');
  for (const x of v) {
    assert.ok(BETWEEN_STEPS.includes(x.id), `${x.id} is een tussenstap (migratie)`);
    for (const [who, tekst] of [x.lead, x.done]) { assert.equal(who, 'T', 'Tammo regelt'); assert.ok(!hasForbiddenWord(tekst) && !/(jeugd|kind|kinderen|jaren|jarig)/i.test(tekst) && !/de Grunn/.test(tekst), tekst); }
  }
});
console.log(`voetbal_beats_test ok (${n} groepen)`);
