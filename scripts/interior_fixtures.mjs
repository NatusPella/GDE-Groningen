// Synthetische gebouwen voor de interieurtests en de headless mock (epic Interieurs, #1150): een rechthoekig pand met een deur in de
// zuidgevel (y = 0), een paar ramen, het type van de gewenste soort. Werkt in Node en in de browser (alleen rng.js en winkelkit.js).
import { SHOP_KINDS } from '../game/js/winkelkit.js';

export const OSM = { woning: 'house', kantoor: 'office', kerk: 'church', station: 'train_station', bibliotheek: 'library', garage: 'garage', publiek: 'civic', winkel: 'retail', horeca: 'yes' };

export const subsFor = (kind) => (kind === 'winkel' ? SHOP_KINDS.filter((s) => s !== 'kermiskraam') : kind === 'horeca' ? ['cafe', 'kroeg', 'restaurant'] : kind === 'publiek' ? ['gemeente', 'politie', 'apotheek', 'ziekenhuis', 'school', 'hotel', 'sportschool'] : kind === 'garage' ? ['werkplaats', 'magazijn'] : kind === 'woning' ? [null, 'studentenkamer'] : [null]);

// b + de spot (kindOfFacility-uitkomst) voor planInterior
export function building(kind, sub, w, d, rnd) {
  const pts = [[0, 0], [w, 0], [w, d], [0, d], [0, 0]];
  const c = w * (0.35 + rnd() * 0.3);
  const en = {
    ax: 0, ay: 0, tx: 1, ty: 0, nx: 0, ny: -1, len: w, c, w: kind === 'winkel' ? 1.1 : 1.0, h: 2.2, shop: kind === 'winkel',
    floorH: kind === 'kerk' ? 10 : kind === 'station' ? 6 : 3.1, floors: (kind === 'woning' || kind === 'kantoor' || kind === 'publiek' || kind === 'winkel') ? 2 : 1, depth: kind === 'kerk' ? 10 : 6.4,
    look: null, archetype: 'house', doorColor: 0x6b2a24, frameColor: 0x2a2b2d,
    windows: kind === 'winkel' ? [{ c: c - 2.4, w: 2.0, y0: 0.47, y1: 2.7 }, { c: c + 2.4, w: 2.0, y0: 0.47, y1: 2.7 }] : [{ c: c - 2.2, w: 1.2, y0: 0.9, y1: 2.1 }, { c: c + 2.2, w: 1.2, y0: 0.9, y1: 2.1 }],
  };
  const b = { pts, bounds: [0, 0, w, d], type: sub === 'studentenkamer' ? 'dormitory' : OSM[kind], entrance: en, sd: [w / 2 + Math.floor(rnd() * 1000), d / 2] };
  if (kind === 'winkel') b.shopFront = { type: sub };
  const spot = kind === 'horeca' || kind === 'publiek' || kind === 'garage' ? { kind, sub } : null;
  return { b, spot };
}
