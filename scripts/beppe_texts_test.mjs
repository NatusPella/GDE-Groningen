// The Beppe tribute texts (game/js/beppe_texts.js) stay within the
// constitution: every Frisian line the player sees has its Dutch next to it,
// the role name and the border place are the only names, and there is no real
// personal data. #832.
//   node scripts/beppe_texts_test.mjs
import { BEPPE_SIGN, ROAD_SIGN, LAST_BENCH, HOUSE_ARRIVAL, TODO, REMEMBRANCE, FAREWELL, HOUSE_LINES } from '../game/js/beppe_texts.js';

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const text = (v) => (typeof v === 'string' ? v.trim() : '');

// Every Frisian line the player sees carries its Dutch on the same card or in
// the same subtitle line (constitution 1).
const pairs = [
  ['bench plaque', LAST_BENCH.plaque, LAST_BENCH.plaqueNl],
  ['remembrance', REMEMBRANCE.her.fries, REMEMBRANCE.her.nl],
  ['closing', REMEMBRANCE.closing.fries, REMEMBRANCE.closing.nl],
];
for (const [name, fries, nl] of pairs) {
  ok(text(fries).length > 0, name + ': Frisian line', fries);
  ok(text(nl).length > 0, name + ': Dutch line', nl);
  ok(text(fries) !== text(nl), name + ': Frisian and Dutch differ', `${fries} / ${nl}`);
}
ok(HOUSE_LINES.length >= 3 && HOUSE_LINES.every((l) => text(l.fries) && text(l.nl) && l.fries !== l.nl),
  'spoken lines: Frisian with Dutch', String(HOUSE_LINES.length));

// Both voices are complete: her hope and the maker's answer, neither empty.
ok(text(REMEMBRANCE.title) && text(REMEMBRANCE.body), 'remembrance card has a title and a body');
ok(text(REMEMBRANCE.hope) && text(REMEMBRANCE.certain), 'the maker voice is complete');
ok(!/geloof/i.test(REMEMBRANCE.hope + ' ' + REMEMBRANCE.certain), 'the maker voice does not deny her hope');
ok(text(LAST_BENCH.cardTitle) && text(LAST_BENCH.cardBody), 'bench card is complete');
ok(text(HOUSE_ARRIVAL.title) && text(HOUSE_ARRIVAL.body), 'arrival card is complete');
ok(text(TODO.title) && text(TODO.sub) && text(TODO.meta) && text(TODO.text) && text(TODO.done), 'todo entry is complete');
ok(text(FAREWELL.guideName) && text(FAREWELL.hint) && text(FAREWELL.title) && text(FAREWELL.body), 'post-game farewell is complete');
ok(FAREWELL.guideName === HOUSE_ARRIVAL.title, 'the guided route uses the same name as the map');
ok(text(LAST_BENCH.promptLabel) && text(LAST_BENCH.promptSub), 'bench prompt is complete');
ok(text(REMEMBRANCE.promptLabel) && text(REMEMBRANCE.promptSub), 'remembrance prompt is complete');
ok(text(REMEMBRANCE.gift) && text(REMEMBRANCE.giftShort), 'bench gift text is complete');

// Role name and border place only; no real personal data (constitution 2 and 4).
ok(BEPPE_SIGN === 'Beppe' && ROAD_SIGN === 'Kollum', 'role name and border place only');
const all = JSON.stringify({ LAST_BENCH, HOUSE_ARRIVAL, TODO, REMEMBRANCE, FAREWELL, HOUSE_LINES });
ok(!/@|https?:\/\/|\b\d{4}\s?[A-Z]{2}\b/.test(all), 'no e-mail, URL or postcode in the texts');
ok(!/\b\d{1,3}\s+[A-Z][a-z]+\s+(straat|laan|weg|plein)\b/i.test(all), 'no street address in the texts');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
