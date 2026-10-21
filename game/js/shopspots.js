import { pointInPolygon, distToRing, seedOf } from './shopbind.js';
import { SHOP_KINDS, winkelNaam } from './winkelkit.js';
// Welke winkel waar staat (issue #156): de gevel en het ruit-interieur van een
// pand volgen het echte winkeltype van de plek erin, niet een willekeurige rang.
// Pure koppeling: spots in (x, y, winkeltype uit de winkelkit), type uit voor
// een pand. Geen scene; models3d_buildings.js vraagt, main.js vult.

// facilities.js-soort (OSM) -> winkeltype uit de winkelkit; horeca heeft geen type.
export const KIT_OF_FACILITY = {
  supermarket: 'supermarkt', convenience: 'supermarkt', bakery: 'bakker', butcher: 'slager',
  snack: 'snackbar', fastfood: 'snackbar', clothes: 'kleding', shoes: 'kleding',
  bicycle: 'fietsen', craft_bicycle: 'fietsen', florist: 'bloemist', hairdresser: 'kapper', beauty: 'kapper',
  electronics: 'elektronica', paint: 'elektronica', second_hand: 'tweedehands', pawnbroker: 'tweedehands',
  variety_store: 'tweedehands', furniture: 'tweedehands', gift: 'souvenir',
  tobacco: 'kiosk', newsagent: 'kiosk', kiosk: 'kiosk',
};
// shopdata.js-type (de winkels van het spel zelf) -> winkeltype uit de winkelkit.
export const KIT_OF_GAMESHOP = {
  super: 'supermarkt', snack: 'snackbar', kleding: 'kleding', fietsen: 'fietsen', fietsenmaker: 'fietsen',
  kapper: 'kapper', tabak: 'kiosk', pand: 'tweedehands', wapens: 'tweedehands', eikea: 'tweedehands',
};

const CELL = 32;
let grid = new Map();
const key = (cx, cy) => cx * 100003 + cy;

export function clearShopSpots() { grid = new Map(); }

// spots: [{ x, y, type }]; onbekende types vallen weg.
export function setShopSpots(spots) {
  grid = new Map();
  let n = 0;
  for (const s of spots) {
    if (!SHOP_KINDS.includes(s.type) || !Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
    const k = key(Math.floor(s.x / CELL), Math.floor(s.y / CELL));
    let l = grid.get(k);
    if (!l) grid.set(k, l = []);
    l.push(s);
    n++;
  }
  return n;
}

// Facilities (FAC.all-rijen) en winkels van het spel naar spots.
export function spotsFrom(facilities = [], gameShops = []) {
  const out = [];
  // een naam alleen als hij verzonnen is (shopplaces.json: sp, of een winkel van het spel); anders een verzonnen naam uit het type
  const naam = (t, x, y, own) => own || winkelNaam(t, seedOf(Math.round(x) + '|' + Math.round(y)));
  for (const f of facilities) {
    const t = f.wk && SHOP_KINDS.includes(f.wk) ? f.wk : KIT_OF_FACILITY[f.kind];
    if (t) out.push({ x: f.x, y: f.y, type: t, name: naam(t, f.x, f.y, f.sp ? f.own : '') });
  }
  for (const s of gameShops) {
    const t = KIT_OF_GAMESHOP[s.type];
    if (t) out.push({ x: s.x, y: s.y, type: t, name: naam(t, s.x, s.y, s.name) });
  }
  return out;
}

// Het winkeltype voor een pand: de dichtstbijzijnde spot die in de plattegrond
// ligt of hooguit `reach` m van de voorgevel (edge) af. ring: [[x, y], ...].
// null als er geen spot is (dan kiest het pand zelf een type).
export function shopSpotFor(ring, edge = null, reach = 4) {
  if (!grid.size || !ring || ring.length < 3) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of ring) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const pad = Math.max(reach, 1);
  let best = null, bd = Infinity;
  for (let cx = Math.floor((x0 - pad) / CELL); cx <= Math.floor((x1 + pad) / CELL); cx++) {
    for (let cy = Math.floor((y0 - pad) / CELL); cy <= Math.floor((y1 + pad) / CELL); cy++) {
      const l = grid.get(key(cx, cy));
      if (!l) continue;
      for (const s of l) {
        if (s.x < x0 - pad || s.x > x1 + pad || s.y < y0 - pad || s.y > y1 + pad) continue;
        const inside = pointInPolygon(s.x, s.y, ring);
        let d = inside ? 0 : distToRing(s.x, s.y, ring);
        if (!inside) {
          if (d > reach) continue;
          if (edge) {
            const dx = edge.bx - edge.ax, dy = edge.by - edge.ay, l2 = dx * dx + dy * dy || 1;
            const t = Math.max(0, Math.min(1, ((s.x - edge.ax) * dx + (s.y - edge.ay) * dy) / l2));
            d = Math.hypot(s.x - (edge.ax + t * dx), s.y - (edge.ay + t * dy));
            if (d > reach) continue;
          }
        }
        if (d < bd) { bd = d; best = s; }
      }
    }
  }
  return best;
}

export const shopTypeFor = (ring, edge = null, reach = 4) => { const s = shopSpotFor(ring, edge, reach); return s ? s.type : null; };
