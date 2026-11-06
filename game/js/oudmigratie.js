// The first version of the story is gone (#187): a player of it carries on in the story that is left.
// The save of the first version sits under 'gde-save-v1', the story that is left uses 'gde-save-v1-nieuw'
// (storagekeys.js). Once, at boot, this copies what the player keeps across:
//   - the save, untouched: readSave (savegame.js) runs it through the save migrations like any older save,
//     and migration 9 of savemigrate.js keeps money, things, vehicles, streken and the world and starts the
//     story at its beginning, with a message at the load (applySave);
//   - the lifetime prestaties ('gde-prestaties-v1'), merged into those of the story that is left.
// The old keys are never removed or changed: a downgrade finds its save where it was. A save that the story
// that is left already has is never replaced. The marker BASE_KEYS.oudGemigreerd makes it happen once, so a "Nieuw spel" later on does
// not bring the old save back.
// Imports only storagekeys.js (like achievements.js, which reads its key when it loads): main.js imports this first.
import { BASE_KEYS, KEYS, LEGACY_KEYS } from './storagekeys.js';

const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const parse = (raw) => { try { return JSON.parse(raw); } catch (e) { return null; } };

// The lifetime record of prestaties (achievements.js blankLife shape) of two keys folded into one: unlocks and
// sets joined, counters and medals at their best, times at their best.
export function mergeLife(a, b) {
  const out = { v: 1, unlocked: {}, stats: {}, sets: {}, missions: {}, challenges: {}, fresh: [] };
  for (const d of [a, b]) {
    if (!isObj(d)) continue;
    if (isObj(d.unlocked)) for (const [id, t] of Object.entries(d.unlocked)) if (id !== '__proto__' && (!out.unlocked[id] || (Number(t) || 1) < out.unlocked[id])) out.unlocked[id] = Number(t) || 1;
    if (isObj(d.stats)) for (const [k, v] of Object.entries(d.stats)) if (k !== '__proto__' && Number.isFinite(v) && !(out.stats[k] >= v)) out.stats[k] = v;
    if (isObj(d.sets)) {
      for (const [k, list] of Object.entries(d.sets)) {
        if (!Array.isArray(list) || k === '__proto__') continue;
        const cur = own(out.sets, k) ? out.sets[k] : (out.sets[k] = []);
        for (const s of list) if (typeof s === 'string' && !cur.includes(s)) cur.push(s);
      }
    }
    for (const [section, lower] of [['missions', true], ['challenges', null]]) {
      if (!isObj(d[section])) continue;
      for (const [i, r] of Object.entries(d[section])) {
        if (!isObj(r) || i === '__proto__') continue;
        const cur = own(out[section], i) ? out[section][i] : null;
        if (!cur) { out[section][i] = { ...r }; continue; }
        const isLower = lower || r.lower;
        if (Number.isFinite(r.best) && (!Number.isFinite(cur.best) || (isLower ? r.best < cur.best : r.best > cur.best))) cur.best = r.best;
        cur.medal = Math.max(cur.medal | 0, r.medal | 0);
        cur.runs = Math.max(cur.runs | 0, r.runs | 0);
      }
    }
  }
  return out;
}

// Returns what it did, for the test: { skipped, save, prestaties, backup, laat }.
export function migrateOudeOpslag(local) {
  const report = { skipped: false, save: false, prestaties: false, backup: false, laat: false };
  if (!local) { report.skipped = true; return report; }
  try {
    // #590: the backup of the save from before the first migration (the old gte-save-backup key,
    // then the old story's key, then the key savegame.js reads) was never carried across, so the
    // fallback the architecture promises stayed unreachable. It is copied whenever a step is missing.
    report.backup = migreerBackup(local);
    if (local.getItem(BASE_KEYS.oudGemigreerd) !== null) {
      report.skipped = true;
      // #590: the marker keeps the migration one-time, but a downgraded 0.28 build can write a newer
      // save under the old key afterwards; that one is still taken (see laatBijwerken).
      report.laat = laatBijwerken(local);
      return report;
    }
    const oldSave = local.getItem(BASE_KEYS.save);
    if (oldSave !== null && local.getItem(KEYS.save) === null) {
      local.setItem(KEYS.save, oldSave);
      report.save = true;
    }
    const oldLife = local.getItem(BASE_KEYS.achievements);
    if (oldLife !== null) {
      const cur = local.getItem(KEYS.achievements);
      if (cur === null) local.setItem(KEYS.achievements, oldLife);
      else local.setItem(KEYS.achievements, JSON.stringify(mergeLife(parse(oldLife), parse(cur))));
      report.prestaties = true;
    }
    local.setItem(BASE_KEYS.oudGemigreerd, '1');
  } catch (e) {
    // storage full or blocked: nothing is marked, the next boot tries again
  }
  return report;
}

// The old key of a gde-* key (storagekeys.js LEGACY_KEYS), or null when it never had one.
const legacyOf = (to) => (LEGACY_KEYS.find(([, t]) => t === to) || [null])[0];

// the old backup key -> the old story's backup key -> the key savegame.js reads (KEYS.saveBackup).
function migreerBackup(local) {
  let gedaan = false;
  try {
    const oldBackup = legacyOf(BASE_KEYS.saveBackup);
    const fromOld = oldBackup ? local.getItem(oldBackup) : null;
    if (fromOld !== null && local.getItem(BASE_KEYS.saveBackup) === null) { local.setItem(BASE_KEYS.saveBackup, fromOld); gedaan = true; }
    const base = local.getItem(BASE_KEYS.saveBackup);
    if (base !== null && local.getItem(KEYS.saveBackup) === null) { local.setItem(KEYS.saveBackup, base); gedaan = true; }
  } catch (e) { /* full or blocked: next boot tries again */ }
  return gedaan;
}

const savedAtOf = (raw) => { const d = parse(raw); return isObj(d) && Number.isFinite(d.savedAt) ? d.savedAt : null; };

// #590: after the one-time migration, take a save that a downgraded old build wrote later. Only a
// save that is provably newer (a later `savedAt`) is copied and only when the story that is left
// already has a save, so a deleted save is never revived. The other old keys (settings, prestaties)
// carry no timestamp; that limitation is documented in ARCHITECTURE.md.
function laatBijwerken(local) {
  try {
    const arcRaw = local.getItem(KEYS.save);
    const arcAt = savedAtOf(arcRaw);
    if (arcAt === null) return false;
    let best = null, bestAt = arcAt;
    for (const raw of [local.getItem(BASE_KEYS.save), local.getItem(legacyOf(BASE_KEYS.save))]) {
      const at = savedAtOf(raw);
      if (at !== null && at > bestAt) { best = raw; bestAt = at; }
    }
    if (best === null) return false;
    local.setItem(KEYS.save, best);
    return true;
  } catch (e) { return false; }
}

if (typeof window !== 'undefined') {
  try { migrateOudeOpslag(window.localStorage); } catch (e) { /* storage blocked */ }
}
