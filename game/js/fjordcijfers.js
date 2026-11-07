// #675: de cijfers van de Fjord Frituur, puur en zonder THREE: de dagomzet groeit met de gekochte
// upgrades en de passieve opbrengst is daar een deel van — alleen als de wagen openstaat. Zo blijven de
// economie en de balans te toetsen zonder de wereld (pg_foodtruck.js doet de wagen en de dienst).
export const FJORD_DAG_BASIS = 120;
export const FJORD_PASSIEF_DEEL = 0.35;
// Wat elke upgrade per speldag aan omzet oplevert (id's uit pg_foodtruck.js UPGRADES).
export const FJORD_UPGRADE_DAG = { pan: 20, mosterd: 15, bel: 25, neon: 30, voorraad: 40, avond: 60 };
export function fjordDagomzet(upgrades = []) {
  const gehad = new Set(Array.isArray(upgrades) ? upgrades : []);
  let som = FJORD_DAG_BASIS;
  for (const [id, dag] of Object.entries(FJORD_UPGRADE_DAG)) if (gehad.has(id)) som += dag;
  return som;
}
export function fjordPassief(upgrades = [], { open = false } = {}) {
  return open ? Math.max(0, Math.round(fjordDagomzet(upgrades) * FJORD_PASSIEF_DEEL)) : 0;
}
