// Where the desktop app keeps saves, settings and prestaties (Electron's
// userData: localStorage lives in its "Local Storage" folder).
//
// Until 0.29 that was the folder "GTE VI" (the game's old name). From 0.29 it
// is "GDE Groningen", Electron's default for the product name. On the first
// start after the update the old folder is copied, never moved:
//   1. copy "GTE VI" to a temporary sibling folder (caches and lock files left out),
//   2. write a marker into the copy, then rename it to "GDE Groningen" in one step.
// A crash halfway leaves only the temporary folder (removed on the next try),
// never a half-filled new folder. If anything fails the app simply runs on the
// old folder, as before. "GTE VI" itself stays untouched, so a downgrade to
// 0.28 still finds everything. TODO(1.1 or later): tell players they can
// delete the old folder, or remove it here once it has a marker copy.
const path = require('path');
const fs = require('fs');

const LEGACY_NAME = 'GTE VI';
const MARKER = '.gde-userdata-v1';
// rebuilt by Chromium, or tied to the running process
const SKIP = new Set(['Cache', 'Code Cache', 'GPUCache', 'DawnCache', 'DawnGraphiteCache', 'DawnWebGPUCache', 'GrShaderCache', 'ShaderCache',
  'Crashpad', 'SingletonLock', 'SingletonSocket', 'SingletonCookie', 'lockfile']);

const hasData = (dir) => fs.existsSync(path.join(dir, 'Local Storage'));

// returns { dir, action } with action 'fresh' | 'current' | 'migrated' | 'legacy'
function chooseUserData(appData, newName, { log = () => {} } = {}) {
  const legacy = path.join(appData, LEGACY_NAME);
  const target = path.join(appData, newName);
  if (fs.existsSync(path.join(target, MARKER)) || hasData(target)) return { dir: target, action: 'current' };
  if (!hasData(legacy)) return { dir: target, action: 'fresh' };
  const tmp = `${target}.migrating-${process.pid}`;
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.cpSync(legacy, tmp, {
      recursive: true,
      verbatimSymlinks: true,
      filter: (src) => !SKIP.has(path.basename(src)),
    });
    fs.writeFileSync(path.join(tmp, MARKER), `copied from "${LEGACY_NAME}" ${new Date().toISOString()}\n`);
    // an empty or cache-only folder may already exist (Electron or a crash
    // reporter can make one): keep it aside instead of deleting anything
    if (fs.existsSync(target)) fs.renameSync(target, `${target}.before-migration-${Date.now()}`);
    fs.renameSync(tmp, target);
    log(`[userdata] copied "${legacy}" to "${target}"`);
    return { dir: target, action: 'migrated' };
  } catch (e) {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e2) { /* ignore */ }
    log(`[userdata] copy failed, using "${legacy}": ${e.message}`);
    return { dir: legacy, action: 'legacy' };
  }
}

module.exports = { chooseUserData, LEGACY_NAME, MARKER };
