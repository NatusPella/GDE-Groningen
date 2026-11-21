// Ligt een punt in een gebouwvoetafdruk? Zuiver (alleen util.js): de router (routing.js) en de 3D-routelijn
// (pathlane.js) delen dezelfde toets, zonder dat de scene routing.js hoeft te importeren (#108).
import { pointInPolygon } from './util.js';

// Ligt (x, y) in een gebouw? (De wereldbouw kent de footprints; een poort of
// passage is voor de botsing open, maar voor de route telt elk gebouw: een lijn
// door de gevel is wat de speler op de kaart ziet en niet wil.)
export function insideBuilding(map, x, y) {
  // Een gebouw dat (x, y) bevat, staat in de cel van dat punt (het raster zet elk gebouw in
  // alle cellen van zijn bounds): lees die ene cel zonder kopie. De route bouwt de graaf met
  // tienduizenden van deze toetsen; buildingsNear (kopie + Set per aanroep) was daar de hoofdkost.
  const grid = map.buildingGrid;
  const cells = grid && grid.cellItems ? grid.cellItems(Math.floor(x / grid.cell), Math.floor(y / grid.cell)) : null;
  if (grid && grid.cellItems) {
    if (!cells) return false;
    for (let i = 0; i < cells.length; i++) {
      const b = cells[i];
      const bb = b.bounds;
      if (x < bb[0] || x > bb[2] || y < bb[1] || y > bb[3]) continue;
      if (pointInPolygon(x, y, b.pts)) return true;
    }
    return false;
  }
  for (const b of map.buildingsNear(x, y, 1)) {
    const [minx, miny, maxx, maxy] = b.bounds;
    if (x < minx || x > maxx || y < miny || y > maxy) continue;
    if (pointInPolygon(x, y, b.pts)) return true;
  }
  return false;
}
