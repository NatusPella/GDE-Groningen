// Save versions and their migrations, in one place. The promise (README,
// "Saves en privacy"): a save from 1.0 on keeps loading in every later version.
//
// - The savegame (savegame.js, localStorage 'gde-save-v1') carries `v`. A save
//   with an older `v` runs through SAVE_MIGRATIONS one step at a time
//   (1 -> 2 -> ...) before the game reads it; a save from a newer game is left
//   alone. The sections inside it (story `v: 1`, the shops, ...) keep their own
//   tolerant loaders that drop unknown ids; only the top-level `v` moves.
// - The settings (settings.js, 'gde-settings') do the same with SETTINGS_MIGRATIONS.
// - Never change a released migration: add the next one and raise the version.
// - Pure (no DOM, no three.js): node scripts/save_migration_test.mjs runs the
//   fixtures in scripts/fixtures/saves/ through it.
import { RETIRED_STEPS, STEP_BY_ID, MISSION_IDS, nextStoryStep } from './storyarc.js';
import { normalizeRadio } from './musicpick.js';
import { cheatUnlocksFromSave, RETIRED_CHEATS } from './cheatlist.js';
import { dayForSavedStep } from './calendar.js';
import { legacyToWorld, legacyAngleToWorld } from './rdnew.js';

export const SAVE_VERSION = 10;
export const SETTINGS_VERSION = 10;

const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);

// Runs migrations[v] for v = from .. to - 1 on a copy of data. Returns
// { data, from, steps } or null when the data is newer than `to` or has no
// usable version. `fallback` is the version of data without `v`.
export function runMigrations(input, migrations, to, fallback = null) {
  if (!isObj(input)) return null;
  const from = Number.isInteger(input.v) ? input.v : fallback;
  if (!Number.isInteger(from) || from < 1 || from > to) return null;
  let data = JSON.parse(JSON.stringify(input));
  const steps = [];
  for (let v = from; v < to; v++) {
    const m = migrations[v];
    if (m) data = m(data) || data;
    steps.push(`${v}->${v + 1}`);
  }
  data.v = to;
  return { data, from, steps };
}

// --- the savegame ------------------------------------------------------------------------

// The step from version n to n + 1 is SAVE_MIGRATIONS[n].
const SAVE_MIGRATIONS = {
  // 0.25: the counters of 0.24's PEGI change (kills became knockouts), and the
  // story steps 0.22 retired dropped from the story save instead of at load.
  1(d) {
    if (isObj(d.stats)) {
      for (const [old, now] of [['kills', 'knockouts'], ['pedKills', 'pedKnockouts'], ['copKills', 'copKnockouts']]) {
        if (old in d.stats) {
          if (!Number.isFinite(d.stats[now])) d.stats[now] = Number.isFinite(d.stats[old]) ? d.stats[old] : 0;
          delete d.stats[old];
        }
      }
    }
    const st = d.story;
    if (isObj(st)) {
      const keep = (list) => (Array.isArray(list) ? list.filter((id) => !RETIRED_STEPS.includes(id)) : []);
      st.done = keep(st.done);
      st.skipped = keep(st.skipped);
      st.voorschot = keep(st.voorschot);
      if (isObj(st.fails)) for (const id of RETIRED_STEPS) delete st.fails[id];
    }
    return d;
  },
  // 0.27: one radio station; `radio` was a station id ('gmusic',
  // 'nachtstreek', 'grunn', 'uit') and is now 'on' or 'off'
  2(d) {
    if ('radio' in d) d.radio = normalizeRadio(d.radio);
    return d;
  },
  // 0.28: the streken (cheats.js); an older save gets the ones its story
  // has already earned, none switched on
  3(d) {
    if (!isObj(d.streken)) d.streken = { v: 1, unlocked: cheatUnlocksFromSave(d), on: [], used: [] };
    return d;
  },
  // 0.28: the game is 18+ and people die again; the knockout counters go
  // back to kills. A wrecked police car counted as a cop kill before 0.24.
  4(d) {
    const s = d.stats;
    const KO = ['knockouts', 'pedKnockouts', 'copKnockouts', 'copCarsWrecked'];
    if (!isObj(s) || !KO.some((k) => k in s)) return d;
    const n = (k) => (Number.isFinite(s[k]) ? s[k] : 0);
    const wrecked = n('copCarsWrecked');
    const back = { kills: n('knockouts') + wrecked, pedKills: n('pedKnockouts'), copKills: n('copKnockouts') + wrecked };
    for (const [k, v] of Object.entries(back)) if (!Number.isFinite(s[k])) s[k] = v;
    for (const k of KO) delete s[k];
    return d;
  },
  // 0.28: "Geld uit de muur" is gone (pay-out and its once-per-game mark);
  // the other streken stay as they were
  5(d) {
    const sk = d.streken;
    if (!isObj(sk)) return d;
    const keep = (list) => (Array.isArray(list) ? list.filter((id) => !RETIRED_CHEATS.includes(id)) : []);
    sk.unlocked = keep(sk.unlocked);
    sk.on = keep(sk.on);
    sk.used = keep(sk.used);
    return d;
  },
  // 0.30: the calendar (calendar.js); an older save gets the day of the
  // story step it continues at, no special day announced yet
  6(d) {
    if (!isObj(d.kalender)) d.kalender = { v: 1, dag: dayForSavedStep(savedStoryStep(d)), gezien: [] };
    return d;
  },
  // 0.30: the world frame is RD New (rdnew.js, PROVINCIE-PLAN 1.5). The
  // player, the own vehicles (with heading) and the goal marker move to the
  // same real place in the new frame.
  7(d) {
    const dm = (v) => Math.round(v * 10) / 10;
    const move = (o, withAngle) => {
      if (!isObj(o) || !Number.isFinite(o.x) || !Number.isFinite(o.y)) return;
      if (withAngle && Number.isFinite(o.angle)) o.angle = dm(legacyAngleToWorld(o.x, o.y, o.angle));
      const [x, y] = legacyToWorld(o.x, o.y);
      o.x = dm(x);
      o.y = dm(y);
    };
    move(d.pos, false);
    if (isObj(d.shops) && Array.isArray(d.shops.vehicles)) for (const v of d.shops.vehicles) move(v, true);
    move(d.doel, false);
    d.frame = 'rd-new';
    return d;
  },
  // 0.35: a save records which story arc it belongs to ('oud', the released
  // story, or 'nieuw', the five-act story behind the feature flag; storyflag.js).
  // Every save before this one is the old arc. A save never loads into the other arc.
  8(d) {
    if (d.arc !== 'nieuw') d.arc = 'oud';
    return d;
  },
  // 0.38: the old story is gone, the new one is the only story (#187). A save of the old
  // arc keeps everything that is the player's own (money, things, vehicles, prestaties, streken,
  // settings-like state, the world) and starts the story at its beginning.
  9(d) {
    if (d.arc !== 'nieuw') oudToNieuw(d);
    return d;
  },
};

// What belongs to the story of the old arc and starts over in the new one.
const OUD_STORY_KEYS = ['story', 'missions', 'kalender', 'doel', 'ctx'];

// Turns a save of the old arc into one of the new arc, in place. `oudGemigreerd` makes the game
// say so once at load (savegame.js) and is not written again.
function oudToNieuw(d) {
  for (const k of OUD_STORY_KEYS) delete d[k];
  d.arc = 'nieuw';
  d.oudGemigreerd = true;
  return d;
}

// The arc a (migrated) save belongs to: always the new one.
export const savedArc = () => 'nieuw';

// A save with no `v` never existed (every save since 0.2 had v: 1).
export function migrateSave(d) {
  return runMigrations(d, SAVE_MIGRATIONS, SAVE_VERSION);
}

// Where a (migrated) save stands in the story, the way story.js works it
// out: the next step, or { end } past the built story.
export function savedStoryStep(d) {
  const st = isObj(d.story) && d.story.v === 1 ? d.story : null;
  const done = new Set(st && Array.isArray(st.done) ? st.done.filter((id) => STEP_BY_ID.has(id)) : []);
  const passed = new Set(isObj(d.missions) && Array.isArray(d.missions.completed) ? d.missions.completed.filter((i) => Number.isInteger(i) && i >= 0 && i < MISSION_IDS.length) : []);
  return nextStoryStep((id) => done.has(id), (i) => passed.has(i));
}

// --- the settings ------------------------------------------------------------------------

const SETTINGS_MIGRATIONS = {
  // 2: the long view distance became the default; older files stored the old
  // default without the player choosing it
  1(s) { delete s.drawDistance; return s; },
  // 3: voices got their own slider and effects went down so the music carries;
  // an untouched 100% effects slider moves to the new default
  2(s) { if (s.sfxVolume === 1) s.sfxVolume = 0.75; return s; },
  // 4: up to v3 'laag' had no shadows whatever the switch said
  3(s) { if (s.quality === 'laag') s.shadows = false; return s; },
  // 5: the blood-and-limbs switch went with the gore (PEGI 16)
  4(s) { delete s.gore; return s; },
  // 6: rebindable keys and buttons; settings.js checks the tables themselves
  5(s) { return s; },
  // 7: 'heelver' (Hoog). The old Hoog preset is also the default, so a file
  // matching it keeps 'ver': it cannot tell a chosen Hoog from untouched
  6(s) { return s; },
  // 8: the blood-and-limbs switch is back (18+); a file without it gets the
  // default (on), anything that is not a boolean is dropped
  7(s) { if ('gore' in s && typeof s.gore !== 'boolean') delete s.gore; return s; },
  // 9: the Verhaal choice (storychoice.js): 'nieuw' (the default) unless the file says 'oud' (Klassiek)
  8(s) { s.verhaal = s.verhaal === 'oud' ? 'oud' : 'nieuw'; return s; },
  // 10: the old story is gone (#187), so the Verhaal choice goes with it
  9(s) { delete s.verhaal; delete s.nieuwverhaal; return s; },
};

// Settings files before v2 had no `v`.
export function migrateSettings(raw) {
  return runMigrations(raw, SETTINGS_MIGRATIONS, SETTINGS_VERSION, 1);
}
