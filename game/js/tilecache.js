// Gericht verversen van een cache per kaarttegel (24-11). tileworld.js houdt in map.geoLog bij welke tegel bij welke geoVer
// kwam of ging ([versie, tegelsleutel, ...]); een cache die per tegel ('i,j') bouwt, gooit dan alleen de tegels weg die binnen
// reachM van een gewijzigde tegel liggen, in plaats van alles bij elke geoVer. Puur (geen three.js), zodat
// scripts/tilecache_test.mjs het zonder browser keurt.
import { TILE_M } from './gdt.js';

// cache: Map met sleutels 'i,j'; log: map.geoLog; since: de geoVer waar de cache bij hoort. Zonder log, of als de log niet tot
// since + 1 teruggaat (hij houdt maar een beperkt aantal wissels vast), gaat alles weg, zoals voorheen.
export function dropStaleTiles(cache, log, since, reachM) {
  if (!log || !log.length || since == null || !(log[0] <= since + 1)) { cache.clear(); return; }
  const r = Math.ceil(reachM / TILE_M);
  for (let n = 0; n < log.length; n += 2) {
    if (log[n] <= since) continue;
    // tileworld.js residentKey: 'i,j', of 'oi,j' voor een overlaytegel
    const [ci, cj] = String(log[n + 1]).replace(/^o/, '').split(',').map(Number);
    if (!Number.isFinite(ci) || !Number.isFinite(cj)) { cache.clear(); return; }
    for (let i = ci - r; i <= ci + r; i++) for (let j = cj - r; j <= cj + r; j++) cache.delete(`${i},${j}`);
  }
}
