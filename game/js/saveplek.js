// #985: waar je was op het moment van opslaan, voor de savekaart ("Ebbingekwartier", "Warffum").
// Puur: de aanroeper levert de plaatslookups (ommelandArea en areaNameAt uit het spel) en de
// meta van de kaart, zodat dit zonder wereld te testen is.
import { districtAt } from './wijkat.js';

// De naam van de plek bij (x, y): in het Ommeland het dorp (of "Ommeland bij Warffum" in het open
// veld), in de stad de wijk waar je staat (buiten de stad geen stadswijk, wijkat.js). '' als er niets te zeggen valt.
export function plekNaam(x, y, { meta, ommelandArea, areaNameAt } = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return '';
  const area = ommelandArea ? ommelandArea(x, y) : null;
  if (area) {
    const a = areaNameAt ? areaNameAt(x, y) : null;
    if (!a) return area.place || 'Ommeland';
    if (a.near) return a.sub ? `Ommeland ${a.sub}` : 'Ommeland';
    return a.name || '';
  }
  const wijk = districtAt((meta && meta.neighbourhoodPoints) || [], x, y);
  return wijk && typeof wijk.name === 'string' ? wijk.name : '';
}

// #984: begint laden op de plek van de save of in de flat? Een save midden in een missie
// ('busy') en een save ergens anders in de provincie ('free') houden de plek; een save bij het
// huis ('home'), een oude save zonder context en een save zonder positie (in een boot) beginnen
// weer in de flat.
export function laadtOpOpslagplek(d) {
  if (!d) return false;
  if (d.ctx === 'busy') return true;
  return d.ctx === 'free' && !!d.pos && Number.isFinite(d.pos.x) && Number.isFinite(d.pos.y);
}
