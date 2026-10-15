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
export const LEGACY_PREFIX = 'gte-';
export const LEGACY_DEV_PREFIX = 'gte-dev:';

export const KEYS = {
  save: 'gde-save-v1',
  settings: 'gde-settings',
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
};

export const SESSION_KEYS = {
  benchmarkPending: 'gde-benchmark-pending',
};

// old name -> new name, most important first: if storage runs full halfway,
// the save and the settings are already across
export const LEGACY_KEYS = [
  ['gte-save-v1', KEYS.save],
  ['gte-settings', KEYS.settings],
  ['gte-prestaties-v1', KEYS.achievements],
  ['gte-menu-v1', KEYS.menu],
  ['gte-duif-v1', KEYS.pigeon],
  ['gte-flavour-v1', KEYS.flavour],
  ['gte-banter-v1', KEYS.banter],
  ['gte-last-version', KEYS.lastVersion],
  ['gte-gfx-advice', KEYS.gfxAdvice],
  ['gte-muted', KEYS.muted],
  ['gte-intro-seen', KEYS.introSeen],
  ['gte-uitleg', KEYS.onboarding],
  ['gte-hint-uses', KEYS.hintUses],
  ['gte-map-layers', KEYS.mapLayers],
  ['gte-wijken-seen', KEYS.wijkenSeen],
  ['gte-radio-history', KEYS.radioHistory],
  ['gte-fog', KEYS.fog],
  ['gte-save-backup', KEYS.saveBackup],
  ['gte-foutlog', KEYS.errorLog],
];

// render caches: rebuilt on demand, so they are not copied (no double storage use)
export const LEGACY_CACHE_KEYS = ['gte-snapshots', 'gte6.placeshots'];

export const LEGACY_SESSION_KEYS = [['gte-benchmark-pending', SESSION_KEYS.benchmarkPending]];

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
