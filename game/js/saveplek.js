// #985: waar je was op het moment van opslaan, voor de savekaart ("Ebbingekwartier", "Warffum").
// Puur: de aanroeper levert de plaatslookups (ommelandArea en areaNameAt uit het spel) en de
// meta van de kaart, zodat dit zonder wereld te testen is.

// De naam van de plek bij (x, y): in het Ommeland het dorp (of "Ommeland bij Warffum" in het open
// veld), in de stad de dichtstbijzijnde wijk. '' als er niets te zeggen valt.
export function plekNaam(x, y, { meta, ommelandArea, areaNameAt } = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return '';
  const area = ommelandArea ? ommelandArea(x, y) : null;
  if (area) {
    const a = areaNameAt ? areaNameAt(x, y) : null;
    if (!a) return area.place || 'Ommeland';
    if (a.near) return a.sub ? `Ommeland ${a.sub}` : 'Ommeland';
    return a.name || '';
  }
  let best = '', bestD2 = Infinity;
  for (const p of (meta && meta.neighbourhoodPoints) || []) {
    const d2 = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d2 < bestD2) { bestD2 = d2; best = p.name; }
  }
  return typeof best === 'string' ? best : '';
}
