// Logic test for the radio adverts (game/js/radioads.js, #409): the data and the planning of a block.
//   node scripts/radioads_test.mjs
import fs from 'node:fs';
import { PROGRAMMES } from '../game/js/musicpick.js';
import * as A from '../game/js/radioads.js';

let fails = 0, n = 0;
const ok = (c, name, extra) => { n++; if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

// the adverts: enough of them, short, unique, Dutch punctuation, no recording needed
ok(A.RADIO_ADS.length >= 15 && A.RADIO_ADS.length <= 25, 'between 15 and 25 adverts', A.RADIO_ADS.length);
ok(new Set(A.RADIO_ADS.map((a) => a.id)).size === A.RADIO_ADS.length, 'ids are unique');
ok(new Set(A.RADIO_ADS.flatMap((a) => a.lines)).size === A.RADIO_ADS.flatMap((a) => a.lines).length, 'lines are unique');
for (const a of A.RADIO_ADS) {
  ok(a.firma && a.firma.length >= 5 && a.firma.length <= 40, 'firma ' + a.id, a.firma);
  ok(a.lines.length >= 1 && a.lines.length <= 2, 'one or two lines ' + a.id);
  for (const t of a.lines) {
    ok(t.length >= 40 && t.length <= 130, 'line length ' + a.id, t.length);
    ok(/[.!?]$/.test(t), 'ends with punctuation ' + a.id);
    ok(!/\b(gas|olie|aardbeving|slachtoffer)\b/i.test(t), 'no sensitive subjects ' + a.id);
  }
}
// the ones the owner asked for are there
for (const k of ['energielabel', 'kroketkoning', 'makelaar', 'golf', 'bieten', 'fietsverzekering', 'reclametaxi']) ok(A.RADIO_ADS.some((a) => a.id.startsWith(k)), 'asked for: ' + k);

// seeded rng
let seed = 11;
const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

// planning: never at night, never at once, never too soon after a block
let s = A.createAdState();
ok(A.planAdBlock(s, { now: 1000, progId: 'nacht' }, rng) === null, 'no advert at night');
ok(A.planAdBlock(s, { now: 1000, progId: 'dag' }, rng) !== null, 'a block is possible in the day at the start');
s = A.createAdState();
const b1 = A.planAdBlock(s, { now: 1000, progId: 'dag' }, rng);
A.commitAdBlock(s, b1, 1000);
ok(A.planAdBlock(s, { now: 1000 + A.AD_MIN_GAP_S + 1, progId: 'dag' }, rng) === null, 'not without enough breaks in between');
A.noteBreak(s); A.noteBreak(s);
ok(A.planAdBlock(s, { now: 1000 + A.AD_MIN_GAP_S - 1, progId: 'dag' }, rng) === null, 'not within the minimum gap');
ok(A.planAdBlock(s, { now: 1000 + A.AD_MIN_GAP_S + 1, progId: 'dag' }, rng) !== null, 'again after the gap and the breaks');

// over many blocks: no repeat within the history, mostly single, never the same firm twice in one block, one or two per block
s = A.createAdState();
let now = 0, singles = 0, doubles = 0, repeats = 0, sameFirm = 0;
const recent = [];
for (let i = 0; i < 400; i++) {
  now += A.AD_MIN_GAP_S + 5; A.noteBreak(s); A.noteBreak(s);
  const b = A.planAdBlock(s, { now, progId: ['ochtend', 'dag', 'avond'][i % 3] }, rng);
  ok(b !== null, 'a block when allowed');
  if (b.ads.length === 1) singles++; else doubles++;
  if (b.ads.length === 2 && b.ads[0].firma === b.ads[1].firma) sameFirm++;
  for (const a of b.ads) { if (recent.includes(a.id)) repeats++; recent.push(a.id); }
  while (recent.length > A.AD_HISTORY) recent.shift();
  A.commitAdBlock(s, b, now);
}
ok(repeats === 0, 'no advert repeats within the history', repeats);
ok(sameFirm === 0, 'no two adverts of one firm in a block', sameFirm);
ok(singles > doubles && doubles > 0, 'mostly single blocks, sometimes two', { singles, doubles });
ok(s.history.length <= A.AD_HISTORY, 'history is bounded');

// the queue of a block: jingle, subtitles, jingle; every subtitle has time to read
const q = A.blockLines({ ads: [A.RADIO_ADS[0], A.RADIO_ADS[2]] });
ok(q[0].jingle === 'start' && q[q.length - 1].jingle === 'end', 'a block opens and closes with a jingle');
ok(q.filter((l) => l.text).every((l) => !l.text.toLowerCase().includes(l.speaker.toLowerCase()) || l.speaker === 'Reclame'), 'the firm is never said twice in the subtitle');
ok(A.blockLines({ ads: [A.RADIO_ADS.find((a) => a.id === 'zonnepaneel')] }).some((l) => l.speaker === 'Zonnepanelen Meteen'), 'a firm the text does not name is named in front');
ok(A.blockLines({ ads: [A.RADIO_ADS.find((a) => a.id === 'bieten')] }).every((l) => l.speaker === 'Reclame'), 'the Bietenbond is named in its text (any case): no label');
ok(q.filter((l) => l.jingle === 'tussen').length === 1, 'a jingle between two adverts');
ok(q.every((l) => l.textOnly && l.dur > 0), 'every line is text only with a duration');
ok(q.filter((l) => l.text).length === 2 && q.filter((l) => l.text).every((l) => l.dur >= 3.5), 'a subtitle stays at least 3,5 s');
ok(A.readSeconds('x'.repeat(2000)) === 9, 'reading time is capped');

// the programmes: the advert block is in the day programmes, not in the night one
for (const p of PROGRAMMES) {
  const has = p.talk.includes('reclame');
  ok(p.id === 'nacht' ? !has : has, 'programme ' + p.id + (has ? ' has' : ' has no') + ' an advert block');
}
// the breaks have room: a block never comes from the first break of a cycle straight after another
for (const p of PROGRAMMES) { const i = p.talk.indexOf('reclame'); if (i >= 0) ok(p.talk[i - 1] !== 'ad' && p.talk[(i + 1) % p.talk.length] !== 'ad', 'not next to the recorded advert in ' + p.id); }

// the file has no recording and is not a spoken table (voice_coverage would ask for one)
const collect = fs.readFileSync(new URL('./voicelines_collect.mjs', import.meta.url), 'utf8');
ok(!/radioads/.test(collect), 'radioads.js is not in the voiced tables');

console.log(fails ? `${fails} FAILED of ${n}` : `radioads_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
