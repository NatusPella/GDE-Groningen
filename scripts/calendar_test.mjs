// The game's calendar (game/js/calendar.js): weekdays, the story's dates,
// the bounds the story puts on the date, migration of old saves, special
// days and the sun. node scripts/calendar_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  day, weekdayOf, formatDay, STEP_DAY, storyBounds, clampDay, dayForSavedStep, sunDeclinationDeg, SPECIAL_DAYS,
  specialsOn, specialDay, cardFor, upcomingSpecials, isSpecial, ONTZET_DAY, LAST_SUMMER_DAY, EPILOGUE_DAY, partStartDay, CAL_ICONS,
} from '../game/js/calendar.js';
import { STEPS, PARTS } from '../game/js/storyarc.js';
import { migrateSave, savedStoryStep, SAVE_VERSION } from '../game/js/savemigrate.js';

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// weekdays and labels (2026)
ok(day(8, 14) === 1 && weekdayOf(1) === 5, 'day 1 is vrijdag 14 augustus');
ok(day(8, 28) === ONTZET_DAY && weekdayOf(ONTZET_DAY) === 5, 'Gronings Ontzet: vrijdag 28 augustus, day 15');
ok(formatDay(ONTZET_DAY).short === 'Vr 28 aug' && formatDay(ONTZET_DAY).long === 'Vrijdag 28 augustus', 'labels for 28 augustus', formatDay(ONTZET_DAY).short);
ok(day(9, 1) === EPILOGUE_DAY && weekdayOf(EPILOGUE_DAY) === 2, 'epilogue: dinsdag 1 september');
ok(day(9, 22) === LAST_SUMMER_DAY && weekdayOf(LAST_SUMMER_DAY) === 2, 'last summer day: dinsdag 22 september, day 40');
ok(formatDay(41).nazomer && formatDay(41).short === 'Wo · nazomer' && formatDay(41).dayLabel === 'dag 41', 'after the summer: nazomer, days keep counting', formatDay(41).short);
ok(!/okt|oktober/.test(JSON.stringify([60, 100, 400].map(formatDay))), 'never an autumn month on screen');
const wd = [...Array(60)].map((_, k) => weekdayOf(k + 1));
ok(wd.every((w, k) => k === 0 || w === (wd[k - 1] + 1) % 7), 'weekdays follow each other');

// the story on the calendar
ok(STEPS.every((s) => STEP_DAY.has(s.id)), 'every story step has a day');
ok(STEPS.every((s, k) => k === 0 || STEP_DAY.get(s.id) >= STEP_DAY.get(STEPS[k - 1].id)), 'step days never go back');
for (const part of Object.keys(PARTS)) {
  const list = STEPS.filter((s) => s.part === part);
  ok(STEP_DAY.get(list[0].id) === partStartDay(part), `${part} starts on its date card (${PARTS[part].date})`);
}
ok(STEP_DAY.get('H18') === ONTZET_DAY, 'H18 is on Gronings Ontzet');
ok(STEP_DAY.get('H5') <= day(8, 17) && isSpecial('kei', STEP_DAY.get('H5')), 'the KEI race is in KEI-week');
ok(STEP_DAY.get('H7') === day(8, 19) && day(8, 20) === SPECIAL_DAYS.find((s) => s.id === 'noorderzon').from, 'H7 decor the day before Noorderzon opens');
ok(isSpecial('kermis', STEP_DAY.get('r-kermis')), 'r-kermis is during the Zomerkermis');
const b5 = storyBounds({ id: 'H5' });
ok(b5.min === day(8, 16) && b5.max === day(8, 17), 'H5: sunday, at most the next step\'s monday', JSON.stringify(b5));
ok(clampDay(1, storyBounds({ id: 'H18' })) === ONTZET_DAY && clampDay(40, storyBounds({ id: 'H18' })) === ONTZET_DAY, 'Ontzet waits for nobody: always 28 augustus');
const fin = storyBounds({ end: true, part: 'staart', finale: true });
ok(fin.min === EPILOGUE_DAY && fin.max === Infinity && clampDay(500, fin) === 500, 'after the finale: September on, open-ended');

// migration
const save = (done, completed) => ({ v: 6, story: { v: 1, done, skipped: [], voorschot: [], fails: {}, flags: [], cards: [] }, missions: { completed } });
const mNew = migrateSave(save([], []));
ok(SAVE_VERSION >= 7 && mNew.data.kalender && mNew.data.kalender.dag === 1 && mNew.data.kalender.gezien.length === 0, 'an old new-game save starts on day 1');
const upTo = (id) => STEPS.slice(0, STEPS.findIndex((s) => s.id === id)).map((s) => s.id);
const mMid = migrateSave(save(upTo('H14'), []));
ok(mMid.data.kalender.dag === STEP_DAY.get('H14'), 'a save before H14 gets H14\'s day', String(mMid.data.kalender.dag));
const mEnd = migrateSave(save(STEPS.map((s) => s.id), []));
ok(mEnd.data.kalender.dag === EPILOGUE_DAY && dayForSavedStep(savedStoryStep(mEnd.data)) === EPILOGUE_DAY, 'a finished save is in September');
const keep = migrateSave({ v: 6, kalender: { v: 1, dag: 30, gezien: ['kei'] } });
ok(keep.data.kalender.dag === 30, 'an existing kalender is kept');
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'saves');
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const fx = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (!fx.save || (fx._expect && fx._expect.rejected)) continue;
  const m = migrateSave(fx.save);
  ok(m && m.data.kalender && Number.isInteger(m.data.kalender.dag) && m.data.kalender.dag >= 1 && m.data.kalender.dag <= EPILOGUE_DAY, `${f}: gets a day from its story`, m && JSON.stringify(m.data.kalender));
}

// special days
const ids = new Set();
for (const s of SPECIAL_DAYS) {
  ok(!ids.has(s.id), `${s.id}: unique id`); ids.add(s.id);
  ok(CAL_ICONS[s.icon], `${s.id}: has an icon`);
  ok(s.weekdays || (s.from >= 1 && s.to >= s.from && s.to <= LAST_SUMMER_DAY), `${s.id}: within the summer`);
  if (s.card) ok(s.card[0] && s.card[1] && s.card[1].length < 140, `${s.id}: a short card`);
  ok(!/koningsdag/i.test(JSON.stringify(s)), `${s.id}: no Koningsdag`);
}
ok(specialDay(ONTZET_DAY).id === 'ontzet' && specialDay(ONTZET_DAY).icon === 'vlag', 'on 28 augustus the HUD shows Gronings Ontzet');
ok(specialsOn(ONTZET_DAY).map((s) => s.id).join() === 'ontzet,kermis,noorderzon,markt', 'on 28 augustus: Ontzet, kermis, Noorderzon, market', specialsOn(ONTZET_DAY).map((s) => s.id).join());
ok(cardFor(ONTZET_DAY, ['kermis', 'noorderzon']).id === 'ontzet' && cardFor(ONTZET_DAY, ['ontzet', 'kermis', 'noorderzon']) === null, 'one card per special day, once');
ok(isSpecial('markt', day(8, 18)) && isSpecial('markt', day(8, 22)) && !isSpecial('markt', day(8, 17)), 'market on di, vr, za');
ok(specialDay(day(8, 18)).small && cardFor(day(8, 18), []) === null, 'a market day: badge only, no card');
ok(!specialsOn(day(9, 5)).some((s) => s.id === 'oogstfeest') && specialsOn(day(9, 5), { all: true }).some((s) => s.id === 'oogstfeest'), 'Deel 4 days are planned, not shown yet');
const up = upcomingSpecials(1, 4).map((u) => u.s.id);
ok(up[0] === 'kei' && up.includes('noorderzon') && up.includes('kermis') && !up.includes('markt'), 'upcoming from day 1', up.join());
ok(upcomingSpecials(day(8, 27), 1)[0].label === 'nu, t/m zo 30 aug' || upcomingSpecials(day(8, 27), 3).some((u) => u.label === 'morgen'), 'labels: nu / morgen');
ok(upcomingSpecials(LAST_SUMMER_DAY + 1).length === 0, 'nothing upcoming in the nazomer');

// the sun: declination falls with the dates, sunset earlier, never autumn
const sunset = (n) => 12 + Math.acos(-Math.tan(53.2 * Math.PI / 180) * Math.tan(sunDeclinationDeg(n) * Math.PI / 180)) * 12 / Math.PI;
ok(Math.abs(sunDeclinationDeg(1) - 14.1) < 0.5 && Math.abs(sunDeclinationDeg(ONTZET_DAY) - 9.2) < 0.5, 'declination on 14 and 28 augustus', `${sunDeclinationDeg(1).toFixed(2)} ${sunDeclinationDeg(ONTZET_DAY).toFixed(2)}`);
ok(sunset(1) > sunset(ONTZET_DAY) + 0.4, 'the sun sets about half an hour earlier on Ontzet', `${sunset(1).toFixed(2)} ${sunset(ONTZET_DAY).toFixed(2)}`);
ok(sunDeclinationDeg(EPILOGUE_DAY) === sunDeclinationDeg(LAST_SUMMER_DAY) && sunDeclinationDeg(EPILOGUE_DAY) === sunDeclinationDeg(400), 'the nazomer holds: from 1 september the sun stays');

console.log(`${n - fails}/${n} calendar checks passed`);
process.exit(fails ? 1 : 0);
