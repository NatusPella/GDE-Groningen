// The story calendar (August 2026): which day it is in Grunn. Each part
// starts on its date card (storyarc.js PARTS: Kop 14, Romp 18, Staart 24
// augustus) and its steps are spread over the days up to the next part, so
// the last Staart step, Gronings Ontzet, falls on 28 augustus. After the
// story it is September. Every midnight the player plays through adds a day,
// until the next step's date. Derived from story progress and the clock only,
// so savegames need nothing new.
import { STEPS, PARTS } from './storyarc.js';
import { getStoryView } from './story.js';

const YEAR = 2026;
const AUGUST = 7;
const ONTZET = 28;
const SEPTEMBER_FIRST = 32;
const WEEKDAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

const PART_IDS = Object.keys(PARTS);
const startOf = (part) => parseInt(PARTS[part].date, 10);
const endOf = (part) => {
  const next = PART_IDS[PART_IDS.indexOf(part) + 1];
  return next ? startOf(next) - 1 : ONTZET;
};

// day of August (32 = 1 September) for each story step
const STEP_DAY = new Map();
for (const part of PART_IDS) {
  const list = STEPS.filter((s) => s.part === part);
  const a = startOf(part), span = endOf(part) - a;
  list.forEach((s, k) => STEP_DAY.set(s.id, a + (list.length > 1 ? Math.round((k * span) / (list.length - 1)) : 0)));
}

function nextStepDay(id) {
  const k = STEPS.findIndex((s) => s.id === id);
  for (let i = k + 1; i < STEPS.length; i++) if (STEP_DAY.has(STEPS[i].id)) return STEP_DAY.get(STEPS[i].id);
  return ONTZET;
}

// The anchor (story step + midnight count at the time) lives on the world,
// not in the save: a loaded game starts on its step's own day.
export function storyDay(world) {
  const sv = getStoryView();
  let base, max, key;
  if (sv.end) {
    const finale = sv.part && PARTS[sv.part] && PARTS[sv.part].finale;
    base = finale ? SEPTEMBER_FIRST : endOf(sv.part in PARTS ? sv.part : 'kop');
    max = finale ? Infinity : base;
    key = 'end:' + sv.part;
  } else {
    base = STEP_DAY.get(sv.id) ?? startOf(sv.part);
    max = Math.max(base, nextStepDay(sv.id));
    key = sv.id;
  }
  const wraps = (world && world.dayWraps) | 0;
  if (world && (!world.dayAnchor || world.dayAnchor.key !== key)) world.dayAnchor = { key, wraps };
  const extra = world ? wraps - world.dayAnchor.wraps : 0;
  return Math.min(max, base + Math.max(0, extra));
}

export function storyDate(world) {
  const d = new Date(YEAR, AUGUST, storyDay(world));
  const weekday = WEEKDAYS[d.getDay()];
  return {
    weekday,
    day: d.getDate(),
    month: MONTHS[d.getMonth()],
    // "Vrijdag 14 augustus"
    long: `${weekday[0].toUpperCase()}${weekday.slice(1)} ${d.getDate()} ${MONTHS[d.getMonth()]}`,
  };
}
