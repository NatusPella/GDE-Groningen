// De dekking van de stad (#314, C2): de stadstegels zelf, tot aan de rand van elke tegel. De stad komt uit dezelfde OSM-tegelbouw
// als de provincie (stad_laag.mjs), dus er is geen reden meer om de randen van de stadstegels als overlaytegels te laten vullen:
// de stad neemt alles wat in zijn tegels ligt (een rij hoort bij de stad als het midden van de omtrek of het zwaartepunt erin ligt),
// en de provinciebouw laat in de tegels ernaast weg wat de stad neemt (build_province.mjs outsideCover). Geen masker meer.
//   dekkingVanTegels(keys) -> { inside(x, y), tileShare(i, j), near(i, j) } met keys als de tegelsleutels van stad.json ('235_581')
import * as G from '../../game/js/gdt.js';

export function dekkingVanTegels(keys) {
  const set = new Set();
  for (const k of keys) { const [i, j] = G.tileFromKey(k); set.add(`${i},${j}`); }
  const inside = (x, y) => { const [i, j] = G.tileIndexOf(x, y); return set.has(`${i},${j}`); };
  const tileShare = (i, j) => (set.has(`${i},${j}`) ? 1 : 0);
  // een tegel in of naast de dekking: daar moet de provinciebouw weglaten wat de stad neemt
  const near = (i, j) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (set.has(`${i + a},${j + b}`)) return true; return false; };
  return { inside, tileShare, near };
}
