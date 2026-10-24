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
// Samen spelen (#429): het verhaal van een gast in zijn eigen opgeslagen spel. savegame.js registreert { status(w, stap), schrijf(w, stap), herlaad(w) };
// coopnet.js gaat via deze haak, zodat het netwerk de opslag niet hoeft te kennen.
let gastImpl = null;
export function registerGastVerhaal(impl) { gastImpl = impl; }
export const gastVerhaalStatus = (w, stap) => (gastImpl ? gastImpl.status(w, stap) : null);
export const gastVerhaalSchrijf = (w, stap) => (gastImpl ? gastImpl.schrijf(w, stap) : null);
export const gastVerhaalHerlaad = (w) => (gastImpl ? gastImpl.herlaad(w) : false);
// De beloningen die een gast al kreeg staan in zijn eigen save (coopbeloning.js); bij het aansluiten begint zijn boek ermee,
// zodat een bericht dat na een herstart of een nieuwe verbinding nog eens langskomt niets dubbel geeft (#429).
let gastBoekImpl = null;
export function registerGastBoek(fn) { gastBoekImpl = fn; }
export const gastBoekIds = () => (gastBoekImpl ? gastBoekImpl() || [] : []);
