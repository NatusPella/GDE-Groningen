// Echte winkels en horeca in de hele provincie (issue #175): de pure koppelingslogica.
// Geen scene, geen bestanden: OSM-tags in, spelwaarden uit. Het bouwscript
// (scripts/world/build_shopplaces.mjs) gebruikt dit om per tegel de voorzieningen
// te koppelen aan een winkeltype uit de winkelkit (winkelkit.js), aan het gebouw
// eronder en aan een verzonnen naam.
//   - Alleen type en plek komen uit OSM; namen, telefoonnummers, websites,
//     openingstijden en merken worden nooit overgenomen.
//   - Een bekende keten (merk-tag of naam op de lijst) blijft als plek staan,
//     maar krijgt een verzonnen naam; ook lokale zaken krijgen er een, omdat
//     een echte naam een merk kan zijn.
import { WINKEL, winkelNaam } from './winkelkit.js';

// OSM-tag (shop=...) -> winkeltype uit de winkelkit. Garages, autohandel en
// banden horen bij het garagesysteem en staan hier niet in.
export const SHOP_TYPE = {
  supermarket: 'supermarkt', convenience: 'supermarkt', greengrocer: 'supermarkt', deli: 'supermarkt',
  bakery: 'bakker', pastry: 'bakker', confectionery: 'bakker',
  butcher: 'slager', seafood: 'slager',
  clothes: 'kleding', shoes: 'kleding', fashion: 'kleding', boutique: 'kleding', jewelry: 'kleding',
  bicycle: 'fietsen',
  florist: 'bloemist', garden_centre: 'bloemist',
  hairdresser: 'kapper', beauty: 'kapper',
  electronics: 'elektronica', mobile_phone: 'elektronica', computer: 'elektronica', paint: 'elektronica',
  second_hand: 'tweedehands', pawnbroker: 'tweedehands', variety_store: 'tweedehands', furniture: 'tweedehands', antiques: 'tweedehands', charity: 'tweedehands',
  gift: 'souvenir',
  newsagent: 'kiosk', kiosk: 'kiosk', tobacco: 'kiosk', lottery: 'kiosk',
};

// Het facilities.js-soort per type: waar het spel de zaak al onder kent (shops.js, horeca.js).
export const FACILITY_KIND = {
  supermarkt: 'supermarket', bakker: 'bakery', slager: 'butcher', snackbar: 'snack', kleding: 'clothes', fietsen: 'bicycle', bloemist: 'florist',
  kapper: 'hairdresser', elektronica: 'electronics', tweedehands: 'second_hand', souvenir: 'gift', kiosk: 'tobacco', restaurant: 'horeca', cafe: 'horeca', kroeg: 'horeca',
};
// De oude soorten van facilities.json die shopplaces.json overneemt (zelfde echte plekken, nu met verzonnen naam en gebouw).
export const REPLACED_KINDS = ['supermarket', 'convenience', 'clothes', 'shoes', 'hairdresser', 'beauty', 'bicycle', 'craft_bicycle', 'tobacco', 'newsagent', 'kiosk', 'second_hand', 'pawnbroker', 'variety_store', 'furniture', 'paint', 'bakery', 'butcher', 'horeca', 'snack', 'fastfood'];

// Horeca: geen winkeltype in de kit, een eigen soort met een eigen naamlijst.
export const HORECA_KINDS = ['restaurant', 'cafe', 'kroeg'];
const HORECA_OF = { restaurant: 'restaurant', cafe: 'cafe', pub: 'kroeg', bar: 'kroeg' };

const HORECA_NAMES = {
  restaurant: [['Eetcafé', 'Restaurant', 'Brasserie', 'Tafel van', 'Keuken van'], ['de Wierde', 'de Zilte Kust', 'het Dorpshuis', 'de Gouden Lepel', 'de Waddenpan', 'de Lege Schaal', 'Kloosterhof', 'de Vette Hap']],
  cafe: [['Café', 'Koffiehuis', 'Theehuis', 'Lunchroom', 'Terras'], ['de Hoek', 'Zonnig', 'de Dijk', 'Klein Genoegen', 'het Kwartier', 'de Warme Kop', 'Mokka', 'de Boterbloem']],
  kroeg: [['Café', 'Bruin café', 'Kroeg', 'Herberg', 'Taveerne'], ['de Dorstige Wierde', 'het Veenpad', 'de Rode Haan', 'de Laatste Stuiver', 'de Kruisweg', 'het Tolhuis', 'de Dikke Schipper', 'de Natte Voet']],
};

// Bekende ketens en merken: een tag brand/brand:wikidata of een naam op de lijst
// maakt een zaak een keten. De lijst is klein en met opzet ruim: liever een
// verzonnen naam te veel dan een echt merk in beeld.
const CHAINS = [
  'albert heijn', 'jumbo', 'lidl', 'aldi', 'plus', 'coop', 'spar', 'dirk', 'hoogvliet', 'deen', 'vomar', 'poiesz', 'nettorama', 'ekoplaza', 'boni', 'dekamarkt',
  'action', 'hema', 'kruidvat', 'etos', 'trekpleister', 'blokker', 'xenos', 'zeeman', 'primark', 'h&m', 'c&a', 'we fashion', 'vero moda', 'jack & jones', 'score', 'scapino', 'van haren',
  'bristol', 'shoeby', 'sting', 'esprit', 'mcdonald', 'burger king', 'kfc', 'subway', 'domino', 'febo', 'starbucks', 'smullers', 'la place', 'bagels & beans', 'coffee company',
  'wibra', 'gamma', 'praxis', 'karwei', 'intratuin', 'ikea', 'mediamarkt', 'coolblue', 'bakker bart', 'ako', 'primera', 'bruna', 'omoda', 'vanharen', 'rituals', 'douglas',
  'ici paris', 'rabobank', 'specsavers', 'pearle', 'hunkemöller', 'hunkemoller', 'tk maxx', 'jysk', 'leen bakker', 'kwantum', 'halfords', 'fietsenwinkel van', 'happy italy', 'new york pizza', 'sumo', 'thuisbezorgd',
];
const CHAIN_RE = new RegExp('(^|[^a-zà-ÿ])(' + CHAINS.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')([^a-zà-ÿ]|$)', 'i');

export function isChain(tags) {
  if (!tags) return false;
  if (tags.brand || tags['brand:wikidata'] || tags['brand:wikipedia']) return true;
  return CHAIN_RE.test(`${tags.name || ''} ${tags.operator || ''}`);
}

// { group: 'shop'|'horeca', type } of null als dit geen winkel of horeca is
// die we plaatsen.
export function classify(tags) {
  if (!tags) return null;
  const a = tags.amenity, s = tags.shop;
  if (a === 'fast_food') return { group: 'shop', type: 'snackbar' };
  if (HORECA_OF[a]) return { group: 'horeca', type: HORECA_OF[a] };
  if (s && SHOP_TYPE[s]) return { group: 'shop', type: SHOP_TYPE[s] };
  if (tags.craft === 'bicycle') return { group: 'shop', type: 'fietsen' };
  if (tags.craft === 'bakery') return { group: 'shop', type: 'bakker' };
  if (tags.craft === 'hairdresser' || tags.craft === 'beauty') return { group: 'shop', type: 'kapper' };
  if (tags.craft === 'florist') return { group: 'shop', type: 'bloemist' };
  if (tags.tourism === 'gift' || tags.tourism === 'souvenir') return { group: 'shop', type: 'souvenir' };
  return null;
}

// Vaste getalshash van een OSM-sleutel (bijv. "way/123"): dezelfde plek geeft altijd dezelfde naam.
export function seedOf(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 100000;
}

export function inventName(group, type, seed) {
  if (group === 'shop') return winkelNaam(type, seed);
  const t = HORECA_NAMES[type];
  if (!t) return '';
  const r = (k) => { const v = Math.sin(seed * 91.7 + k * 17.3) * 43758.5453; return v - Math.floor(v); };
  return `${t[0][Math.floor(r(1) * t[0].length)]} ${t[1][Math.floor(r(2) * t[1].length)]}`;
}

// ---- meetkunde (vlakke meters; de aanroeper projecteert eerst) ----

export function pointInPolygon(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function distToRing(x, y, ring) {
  let d = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) d = Math.min(d, distToSegment(x, y, ring[j][0], ring[j][1], ring[i][0], ring[i][1]));
  return d;
}

// Het gebouw voor een punt: eerst het gebouw waar het punt in ligt, anders het
// dichtstbijzijnde binnen `radius` meter. buildings: [{ id, ring: [[x, y], ...] }].
// Geeft { id, dist, inside } of null.
export function bindBuilding(x, y, buildings, radius = 25) {
  for (const b of buildings) if (pointInPolygon(x, y, b.ring)) return { id: b.id, dist: 0, inside: true };
  let best = null;
  for (const b of buildings) {
    const d = distToRing(x, y, b.ring);
    if (d <= radius && (!best || d < best.dist)) best = { id: b.id, dist: d, inside: false };
  }
  return best;
}

// Dichtheidsbudget per tegel: houd hooguit `max` plekken. Wie aan een gebouw
// hangt gaat voor, daarna een gelijkmatige spreiding (steeds de plek die het
// verst van de gekozen plekken ligt), niet de eerste in de lijst. Deterministisch.
// items: [{ x, y, bid, key }]. Geeft de gekozen items.
export function applyBudget(items, max) {
  if (items.length <= max) return items.slice();
  const bound = items.filter((i) => i.bid != null).sort((a, b) => a.key.localeCompare(b.key));
  const loose = items.filter((i) => i.bid == null).sort((a, b) => a.key.localeCompare(b.key));
  const pool = bound.concat(loose);
  const chosen = [pool[0]];
  const minD = pool.map((p) => Math.hypot(p.x - pool[0].x, p.y - pool[0].y));
  const taken = new Set([0]);
  while (chosen.length < max) {
    let bi = -1, bs = -1;
    for (let i = 0; i < pool.length; i++) {
      if (taken.has(i)) continue;
      const s = minD[i] + (pool[i].bid != null ? 40 : 0); // gebouwgebonden plekken lichter bevoordeeld
      if (s > bs) { bs = s; bi = i; }
    }
    taken.add(bi);
    chosen.push(pool[bi]);
    for (let i = 0; i < pool.length; i++) minD[i] = Math.min(minD[i], Math.hypot(pool[i].x - pool[bi].x, pool[i].y - pool[bi].y));
  }
  return chosen;
}

export const TILE_BUDGET = 60;
export const KNOWN_TYPES = new Set([...Object.keys(WINKEL), ...HORECA_KINDS]);
