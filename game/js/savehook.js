// Leaf: "save the game now" for modules that only trigger a save (home, shopui, pigeonmode,
// stationtravel, garages, respawn). savegame.js registers the real saveGame when it loads; going through
// this hook keeps those modules out of savegame.js's import cycle (#108).
let impl = null;
export function registerSaveGame(fn) { impl = fn; }
export function saveGame(...args) { return impl ? impl(...args) : false; }
// markDirty / saveSoon: the same for the debounced save (savegame.js registers both)
let dirtyImpl = null, soonImpl = null;
export function registerSaveTimers(markDirtyFn, saveSoonFn) { dirtyImpl = markDirtyFn; soonImpl = saveSoonFn; }
export function markDirty(...args) { return dirtyImpl ? dirtyImpl(...args) : undefined; }
export function saveSoon(...args) { return soonImpl ? soonImpl(...args) : undefined; }
