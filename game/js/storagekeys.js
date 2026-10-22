// Every localStorage / sessionStorage key the game uses, in one place.
//
// Until 0.29 the keys started with 'gte-'.
// migrateStorage() copies each old key to its 'gde-' name once, at boot:
// main.js imports this module first, so it runs before any module reads
// storage. The old keys stay where they are, so a downgrade to 0.28 still
// finds its save. TODO(1.1 or later): drop the old keys with removeLegacyKeys()
// once nobody can still go back to a 0.28 build.

export const PREFIX = 'gde-';
// ?dev runs keep their own copy of every key under this prefix (devflags.js)
export const DEV_PREFIX = 'gde-dev:';
const LEGACY_DEV_PREFIX = 'gte-dev:';

// The story keeps its progress under keys with a '-nieuw' suffix: the keys of the first version of
// the story ('gde-save-v1', ...) stay as they were and are never deleted; oudmigratie.js copies
// what a player keeps (the save, the prestaties) over once (#187).
const ARC_KEYS = ['save', 'saveBackup', 'achievements', 'pigeon', 'flavour', 'banter', 'introSeen', 'wijkenSeen', 'radioHistory', 'saveSlots'];
const ARC_SUFFIX = '-nieuw';

export const BASE_KEYS = {
  save: 'gde-save-v1',
  settings: 'gde-settings',
  // the save slots (saveslots.js): the list (names, the active slot); slot 1 is 'save' itself
  saveSlots: 'gde-save-slots',
  achievements: 'gde-prestaties-v1',
  saveBackup: 'gde-save-backup',
  menu: 'gde-menu-v1',
  pigeon: 'gde-duif-v1',
  flavour: 'gde-flavour-v1',
  banter: 'gde-banter-v1',
  lastVersion: 'gde-last-version',
  gfxAdvice: 'gde-gfx-advice',
  muted: 'gde-muted',
  introSeen: 'gde-intro-seen',
  onboarding: 'gde-uitleg',
  hintUses: 'gde-hint-uses',
  mapLayers: 'gde-map-layers',
  wijkenSeen: 'gde-wijken-seen',
  wijkLinesRecent: 'gde-wijk-lines-recent',
  radioHistory: 'gde-radio-history',
  fog: 'gde-fog',
  errorLog: 'gde-foutlog',
  snapshots: 'gde-snapshots',
  placeshots: 'gde-placeshots',
  ghosts: 'gde-ghosts-v1',
  // the Kroketkoning snack-bar chain (snackrules.js), new in 0.36: no legacy name
  snackChain: 'gde-snackketen-v1',
  // context hints for new vehicles and minigames, each shown once (contexthints.js, #201): new, no legacy name
  hintsGezien: 'gde-hints-gezien',
  // the practice walk-through in Hulp is done (practice.js, #201): new, no legacy name
  oefenronde: 'gde-oefenronde',
  // photo mode gallery (fotomodus.js, #199): metadata and small thumbnails only, local
  gallery: 'gde-galerij-v1',
  // which summer events the player has seen (evenementen.js, #203)
  eventsSeen: 'gde-evenementen-v1',
  // which main-menu backdrops were seen lately (menuplekken.js, #380): new, no legacy name
  menuPlekken: 'gde-menuplekken-v1',
  // co-op (#95): only what a session needs (last mode and connection code); the story stays in the one save
  coopSession: 'gde-coop-sessie',
  // the old key of the hidden setting that played the new story; the story is the only one now, nothing reads it
  nieuwVerhaal: 'gde-nieuwverhaal',
  // set once the save and prestaties of the first version of the story are across (oudmigratie.js)
  oudGemigreerd: 'gde-oud-gemigreerd',
  // the last benchmark run, for the comparison (benchstats.js), new in 0.37: no legacy name
  benchmarkLast: 'gde-benchmark-last-v1',
  // parts and tuning per vehicle (tuningplan.js), new in 0.38: no legacy name, not part of the save
  tuning: 'gde-tuning-v1',
  // the animals you keep and what you did for them (dierenbezit.js, #193): new, no legacy name, not part of the save
  dieren: 'gde-dieren-v1',
  // how often each HUD explanation has been shown (hudtext.js), new in 0.38: no legacy name
  hudSeen: 'gde-hud-gezien',
  // which steps were cleared with help on, and for which steps the help offer was shown (assistlive.js, #215): new, no legacy name
  help: 'gde-hulp-v1',
  // the career of this player per trade (loopbaan.js, #381): new, no legacy name, never part of a savegame (everyone has their own, also when playing together)
  loopbaan: 'gde-loopbaan-v1',
};

export const KEYS = Object.fromEntries(Object.entries(BASE_KEYS).map(([k, v]) => [k, ARC_KEYS.includes(k) ? v + ARC_SUFFIX : v]));

// Save slot n (#208): slot 1 is the one save every player already has (KEYS.save), so
// nothing needs moving; slots 2.. get their own key. The recovery copy is the previous
// good write of the same slot. Both follow the story arc, like KEYS.save.
export const MAX_SLOTS = 8;
export const slotKey = (n) => (n === 1 ? KEYS.save : `gde-save-slot-${n}${ARC_SUFFIX}`);
// The small screenshot on a savegame card: its own key, never part of the save itself,
// so a full storage or a lost thumbnail can not touch a savegame.
export const slotThumbKey = (n) => `gde-save-thumb-${n}-nieuw`;
export const slotRecoveryKey = (n) => (n === 1 ? `gde-save-herstel${ARC_SUFFIX}` : `gde-save-slot-${n}-herstel${ARC_SUFFIX}`);

export const SESSION_KEYS = {
  benchmarkPending: 'gde-benchmark-pending',
};

// old name -> new name, most important first: if storage runs full halfway,
// the save and the settings are already across
export const LEGACY_KEYS = [
  ['gte-save-v1', BASE_KEYS.save],
  ['gte-settings', BASE_KEYS.settings],
  ['gte-prestaties-v1', BASE_KEYS.achievements],
  ['gte-menu-v1', BASE_KEYS.menu],
  ['gte-duif-v1', BASE_KEYS.pigeon],
  ['gte-flavour-v1', BASE_KEYS.flavour],
  ['gte-banter-v1', BASE_KEYS.banter],
  ['gte-last-version', BASE_KEYS.lastVersion],
  ['gte-gfx-advice', BASE_KEYS.gfxAdvice],
  ['gte-muted', BASE_KEYS.muted],
  ['gte-intro-seen', BASE_KEYS.introSeen],
  ['gte-uitleg', BASE_KEYS.onboarding],
  ['gte-hint-uses', BASE_KEYS.hintUses],
  ['gte-map-layers', BASE_KEYS.mapLayers],
  ['gte-wijken-seen', BASE_KEYS.wijkenSeen],
  ['gte-radio-history', BASE_KEYS.radioHistory],
  ['gte-fog', BASE_KEYS.fog],
  ['gte-save-backup', BASE_KEYS.saveBackup],
  ['gte-foutlog', BASE_KEYS.errorLog],
];

// render caches: rebuilt on demand, so they are not copied (no double storage use)
export const LEGACY_CACHE_KEYS = ['gte-snapshots', 'gte6.placeshots'];

const LEGACY_SESSION_KEYS = [['gte-benchmark-pending', SESSION_KEYS.benchmarkPending]];

export const MIGRATED_KEY = 'gde-migrated-v1';

const isQuota = (e) => e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);

// Copies old -> new where the old key exists and the new one does not; a new
// key that is already there is never overwritten. Also copies ?dev's own keys
// ('gte-dev:gte-x' -> 'gde-dev:gde-x'). Sets MIGRATED_KEY when everything is
// across, so later boots skip the work; a run that fails halfway (storage
// full) tries again on the next boot. Returns a short report for tests.
export function migrateStorage(local, session) {
  const report = { copied: [], kept: [], failed: [], skipped: false };
  if (local) {
    try {
      if (local.getItem(MIGRATED_KEY)) report.skipped = true;
    } catch (e) { return report; }
  }
  if (local && !report.skipped) {
    const pairs = [];
    for (const [from, to] of LEGACY_KEYS) {
      pairs.push([from, to], [LEGACY_DEV_PREFIX + from, DEV_PREFIX + to]);
    }
    const done = [];
    for (const [from, to] of pairs) {
      let value;
      try {
        value = local.getItem(from);
        if (value === null) continue;
        if (local.getItem(to) !== null) { report.kept.push(to); continue; }
      } catch (e) { report.failed.push(to); continue; }
      try {
        local.setItem(to, value);
        report.copied.push(to);
        done.push(from);
      } catch (e) {
        // storage full: give up the caches and the rollback copies of what is
        // already across, then try again; as a last resort move this key
        // instead of copying it (no rollback copy, but nothing lost)
        if (!isQuota(e)) { report.failed.push(to); continue; }
        try {
          for (const k of LEGACY_CACHE_KEYS) local.removeItem(k);
          for (const k of done) local.removeItem(k);
          done.length = 0;
          local.setItem(to, value);
          report.copied.push(to);
        } catch (e2) {
          try {
            local.removeItem(from);
            local.setItem(to, value);
            report.copied.push(to);
          } catch (e3) {
            try { local.setItem(from, value); } catch (e4) { /* it fitted a moment ago */ }
            report.failed.push(to);
          }
        }
      }
    }
    if (!report.failed.length) {
      try { local.setItem(MIGRATED_KEY, '1'); } catch (e) { /* next boot tries again */ }
    }
  }
  if (session) {
    for (const [from, to] of LEGACY_SESSION_KEYS) {
      try {
        const v = session.getItem(from);
        if (v !== null) { if (session.getItem(to) === null) session.setItem(to, v); session.removeItem(from); }
      } catch (e) { /* ignore */ }
    }
  }
  return report;
}

// For a later release (see the TODO at the top): the old keys go.
export function removeLegacyKeys(local) {
  for (const [from] of LEGACY_KEYS) {
    try { local.removeItem(from); local.removeItem(LEGACY_DEV_PREFIX + from); } catch (e) { /* ignore */ }
  }
  for (const k of [...LEGACY_CACHE_KEYS, 'gte-minimap-layers']) {
    try { local.removeItem(k); } catch (e) { /* ignore */ }
  }
}

function storageOf(name) {
  try { return typeof window !== 'undefined' ? window[name] : null; } catch (e) { return null; }
}

// at boot, in the browser and the desktop app (node tests import the functions)
if (typeof window !== 'undefined') migrateStorage(storageOf('localStorage'), storageOf('sessionStorage'));
