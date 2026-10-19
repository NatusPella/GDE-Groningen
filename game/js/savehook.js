// Leaf: "save the game now" for modules that only trigger a save (home, shopui, pigeonmode,
// stationtravel). savegame.js registers the real saveGame when it loads; going through
// this hook keeps those modules out of savegame.js's import cycle (#108).
let impl = null;
export function registerSaveGame(fn) { impl = fn; }
export function saveGame(...args) { return impl ? impl(...args) : false; }
