// regioleven.js (#68): regions, summer events in the calendar, chance encounters, finds. Pure.
//   node scripts/regioleven_test.mjs
import { STREKEN, streekAt, REGIO_EVENTS, ENCOUNTERS, encountersFor, rollEncounter, rollGap, ENCOUNTER_GAP, FINDS, findNear, findPos, findsOf, streekProgress, VERZAMEL_TOTAL, GEHEIM_TOTAL, ENCOUNTER_REWARD_MAX } from '../game/js/regioleven.js';
import { SPECIAL_DAYS, specialsOn, day, CAL_ICONS, LAST_SUMMER_DAY } from '../game/js/calendar.js';
import { wgsToWorld } from '../game/js/rdnew.js';
import { makeRng } from '../game/js/minigamekit.js';

let n = 0, bad = 0;
const ok = (c, name) => { n++; if (!c) { bad++; console.log('FAIL', name); } };
const BANNED = /\b(de Grunn|winter|sneeuw|ijs)\b/i;

// streken
for (const s of STREKEN) { const [x, y] = wgsToWorld(s.at[0], s.at[1]); ok(streekAt(x, y) === s, `${s.id}: its heart is in it`); }
{ const [x, y] = wgsToWorld(52.6, 6.2); ok(streekAt(x, y) === null, 'far away is no streek'); }

// events in the calendar
ok(REGIO_EVENTS.length >= 7, 'at least seven regional events');
ok(new Set(SPECIAL_DAYS.map((s) => s.id)).size === SPECIAL_DAYS.length, 'calendar ids stay unique with the regional events');
for (const e of REGIO_EVENTS) {
  const s = SPECIAL_DAYS.find((x) => x.id === e.id);
  ok(!!s && s.from === day(e.month, e.date), `${e.id}: in the calendar on its day`);
  ok(s && s.from >= 1 && s.to <= LAST_SUMMER_DAY, `${e.id}: within the summer`);
  ok(!!CAL_ICONS[e.icon], `${e.id}: a known icon`);
  ok(e.card && e.card.length === 2 && !BANNED.test(e.card.join(' ')), `${e.id}: a card without winter`);
  ok(STREKEN.some((x) => x.id === e.streek), `${e.id}: a known streek`);
  ok(s && specialsOn(s.from).some((x) => x.id === e.id), `${e.id}: shown on the day`);
  ok(e.rank < 10, `${e.id}: never outranks Gronings Ontzet`);
}

// encounters
ok(ENCOUNTERS.every((e) => e.lines.length && e.weight > 0 && (e.reward || 0) <= ENCOUNTER_REWARD_MAX && !BANNED.test(e.lines.join(' '))), 'encounters are well formed');
ok(new Set(ENCOUNTERS.map((e) => e.id)).size === ENCOUNTERS.length, 'unique encounter ids');
ok(encountersFor('hogeland', 12).some((e) => e.id === 'e-schaap') && !encountersFor('oldambt', 12).some((e) => e.id === 'e-schaap'), 'encounters by streek');
ok(encountersFor('oldambt', 23).every((e) => e.streek === null) && encountersFor('oldambt', 23).length > 0, 'at night only the night ones, wrapping midnight');
ok(encountersFor('oldambt', 2).some((e) => e.id === 'e-nacht'), 'midnight wrap covers 02:00');
for (const s of STREKEN) for (const h of [8, 13, 20]) ok(encountersFor(s.id, h).length > 0, `${s.id} has an encounter at ${h}:00`);
{
  const rng = makeRng(7);
  const seen = new Set();
  for (let i = 0; i < 200; i++) { const e = rollEncounter('oldambt', 12, rng, []); if (e) seen.add(e.id); }
  ok(seen.size >= 2 && [...seen].every((id) => encountersFor('oldambt', 12).some((e) => e.id === id)), 'rolls cover the pool and stay in it');
  const a = rollEncounter('oldambt', 12, () => 0, []);
  const b = rollEncounter('oldambt', 12, () => 0, [a.id]);
  ok(a.id !== b.id, 'a recent one is skipped');
  ok(rollEncounter('oldambt', 12, () => 0.999999, []) !== null, 'rng at the top edge');
  ok(rollEncounter('nergens', 3, makeRng(1), []).id === 'e-nacht', 'unknown streek still gets the general ones');
  const only = encountersFor('oldambt', 12).map((e) => e.id);
  ok(rollEncounter('oldambt', 12, () => 0, only) !== null, 'all recent: still gives one');
  let g = true; for (let i = 0; i < 50; i++) { const v = rollGap(makeRng(i)); if (v < ENCOUNTER_GAP[0] || v > ENCOUNTER_GAP[1]) g = false; }
  ok(g, 'gap in range');
}

// finds
ok(VERZAMEL_TOTAL === 15 && GEHEIM_TOTAL === 5, 'fifteen finds and five secrets');
ok(new Set(FINDS.map((f) => f.id)).size === FINDS.length, 'unique find ids');
for (const s of STREKEN) ok(findsOf(s.id, 'verzamel').length === 3 && findsOf(s.id, 'geheim').length === 1, `${s.id}: three finds and one secret`);
for (const f of FINDS) {
  ok(!BANNED.test(`${f.name} ${f.text}`) && f.text.length > 20, `${f.id}: text`);
  const p = findPos(f);
  ok(findNear(p.x, p.y) === f, `${f.id}: found where it lies`);
  ok(findNear(p.x, p.y, [f.id]) !== f, `${f.id}: not found twice`);
  ok(findNear(p.x + f.r + 1, p.y) !== f, `${f.id}: not found from outside its reach`);
}
{
  const some = FINDS.slice(0, 2).map((f) => f.id);
  const pr = streekProgress('eemsdelta', new Set(some));
  ok(pr.total === 4 && pr.found === 2, 'progress counts a streek');
  ok(streekProgress('eemsdelta', [], 'geheim').total === 1, 'progress by kind');
}
console.log(`${n - bad}/${n} checks passed`);
process.exit(bad ? 1 : 0);
