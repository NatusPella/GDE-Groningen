// Een cache met één plek voor een dure opzoeking die elke 0,2 s met dezelfde sleutel terugkomt
// (de straatnaam achter de volgende afslag in de GPS-kaart, hud_panel.js updateGps). Puur:
// scripts/hudcache_test.mjs toetst hem zonder wereld. `nul` (niets gevonden) wordt ook onthouden.
export function singleEntryCache(compute) {
  let has = false, lastKey, lastVal;
  const get = (key, ...args) => {
    if (has && key === lastKey) { get.hits++; return lastVal; }
    lastVal = compute(...args); lastKey = key; has = true; get.misses++;
    return lastVal;
  };
  get.hits = 0; get.misses = 0;
  get.clear = () => { has = false; lastKey = undefined; lastVal = undefined; };
  return get;
}
