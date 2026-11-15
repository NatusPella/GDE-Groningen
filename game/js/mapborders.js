// De grenslijnen tussen de buurten op de minikaart (#885). De kaart tekende ze als losse
// blokjes op een raster dat met de speler meeschuift; daardoor leek de lijn bij elke stap
// heen en weer te trillen. Hier staat de lijn op een vast wereldraster (los van de speler)
// en als doorlopende segmenten op de celranden, zodat hij bij elke stand van de kaart op
// dezelfde plek ligt. Puur en Node-safe: scripts/mapborders_test.mjs.
export const BORDER_CELL = 14; // m, de maat van het raster waarop de buurtpunten worden vergeleken

// De dichtstbijzijnde buurtpunt-index per rastercel (celmiddens op gx*cell, gy*cell).
function owners(points, gx0, gy0, gw, gh, cell) {
  const grid = new Int16Array(gw * gh);
  for (let j = 0; j < gh; j++) {
    const wy = (gy0 + j) * cell;
    for (let i = 0; i < gw; i++) {
      const wx = (gx0 + i) * cell;
      let best = -1, bd = Infinity;
      for (let k = 0; k < points.length; k++) {
        const p = points[k];
        if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
        const d = (p.x - wx) ** 2 + (p.y - wy) ** 2;
        if (d < bd) { bd = d; best = k; }
      }
      grid[j * gw + i] = best;
    }
  }
  return grid;
}

// De grenslijnen in het wereldvenster [x0, y0, x1, y1] als segmenten [[ax, ay, bx, by], ...].
// Een celrand is een grens waar de dichtstbijzijnde buurt aan weerszijden verschilt; zo
// ontstaat één doorlopende trap in plaats van losse blokjes. De segmenten hangen alleen van
// het wereldraster af (niet van de speler of het venster), dus ze blijven stabiel.
export function borderSegments(points, x0, y0, x1, y1, cell = BORDER_CELL) {
  if (!Array.isArray(points) || !points.length || !(cell > 0)) return [];
  if (![x0, y0, x1, y1].every(Number.isFinite) || x1 <= x0 || y1 <= y0) return [];
  // één cel marge: de randsegmenten van het venster zijn dan ook compleet
  const gx0 = Math.floor(x0 / cell) - 1, gy0 = Math.floor(y0 / cell) - 1;
  const gx1 = Math.ceil(x1 / cell) + 1, gy1 = Math.ceil(y1 / cell) + 1;
  const gw = gx1 - gx0 + 1, gh = gy1 - gy0 + 1;
  const grid = owners(points, gx0, gy0, gw, gh, cell);
  const out = [];
  const seen = new Set();
  const push = (ax, ay, bx, by) => {
    const k = `${ax},${ay},${bx},${by}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push([ax, ay, bx, by]);
  };
  const at = (i, j) => grid[j * gw + i];
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const own = at(i, j);
      if (own < 0) continue;
      const x = (gx0 + i) * cell, y = (gy0 + j) * cell;
      // rechts: de rand tussen deze cel en de volgende
      if (i + 1 < gw && at(i + 1, j) !== own) push(x + cell / 2, y - cell / 2, x + cell / 2, y + cell / 2);
      // onder: de rand tussen deze cel en de cel eronder
      if (j + 1 < gh && at(i, j + 1) !== own) push(x - cell / 2, y + cell / 2, x + cell / 2, y + cell / 2);
    }
  }
  return out;
}
