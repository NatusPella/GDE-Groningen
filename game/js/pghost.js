// Leaf module: the postgame host API for the pg_*.js challenges. postgame.js
// registers its functions here (setPostgameHost), so the challenges do not
// import postgame.js and the two sides are not an import cycle.
let host = null;
export function setPostgameHost(h) { host = h; }
export const finish = (...a) => host.finish(...a);
export const say = (...a) => host.say(...a);
export const jelle = (...a) => host.jelle(...a);
export const setTarget = (...a) => host.setTarget(...a);
export const isPostgameOpen = (...a) => host.isPostgameOpen(...a);
export const esc = (...a) => host.esc(...a);
// Samen spelen (#443): de wedstrijdlaag start een uitdaging voor iedereen (na Meedoen?), met de baan van de host.
export const startWedstrijd = (...a) => host.startWedstrijd(...a);
