// Het hoogteprofiel van de luchtroute (#1038, eigenaar 21-11: "Het path voor de heli moet wel boven de gebouwen uitkomen"):
// de rechte luchtlijn van de neus naar het doel ligt niet op een vaste hoogte maar op een veilige hoogte boven alle
// gebouwen en obstakels langs de lijn (strook van +-AIR_HALF_W m): hij klimt vóór een obstakel, blijft erboven en daalt
// erachter weer. Pure code (geen THREE, geen DOM), zodat het te testen is op een synthetische rij en op de echte stad.
//
//  - topAt(map, x, y, r)            hoogste dak/obstakel binnen r meter (gebouwen, landmarks, bomen; windturbines en
//                                   hoogspanningsmasten via opts.extra) en of de tegels erbij al geladen zijn
//  - profileFromRequired(r, ds, k)  de gladde hoogtecurve boven de vereiste hoogtes (hellingshoek <= k, geen scherpe knikken)
//  - buildAirProfile(map, a, b, o)  het profiel voor een route (één keer per route, zie airProfileFor voor de cache)
//  - airProfileFor(...)             cache: opnieuw bij een andere route, een afdrijving van de lijn, een nieuw stuk route
//                                   of een tegelwissel (met een snelheidsgrens); nooit per frame bemonsteren
//  - airNeed(P, s, ahead)           de piek binnen het zichtbereik voor de navigatiekaart ("Stijg naar 120 m: Martinitoren voor je")
//
// Wereldas: x oost, y zuid; hoogtes in meters (absoluut, zoals de heli). De kaart (minimap) tekent alleen de horizontale lijn.
// Samen spelen: lokaal per speler (elke speler vliegt zijn eigen route en ziet zijn eigen profiel).
import { tileKey, tileIndexOf } from './gdt.js';

export const AIR_STEP_M = 20;           // bemonsteringsafstand langs de lijn
export const AIR_HALF_W = 30;           // halve breedte van de strook die vrij moet zijn
export const AIR_SPAN_M = 4000;       // zoveel meter route per profiel (daarna een volgend stuk)
export const AIR_REFRESH_M = 1500;      // een nieuw stuk als er minder dan dit aan profiel voor je ligt
export const AIR_DEFAULT_ALT = 150;     // veilige standaardhoogte zolang de tegels langs de lijn niet geladen zijn
export const AIR_TREE_M = 20;           // bomen: de grond +20 m telt altijd als obstakel
export const AIR_MARGIN = { heli: 25, plane: 40 };
export const AIR_MAX_SLOPE_DEG = { heli: 17, plane: 10 };
export const AIR_END_FREE_M = 45;       // rond het doel zelf (de landingsplek) tellen obstakels niet mee
export const AIR_RELOOK_S = 1.5;        // hoe vaak de tegelstand gecontroleerd wordt
export const AIR_REBUILD_S = 1.0;       // minimale tijd tussen twee herberekeningen (zonder routewissel)
export const AIR_DRIFT_M = 50;          // verder dan dit van de basislijn: het profiel wordt opnieuw gelegd
const SMOOTH_W = 3;                     // glad: opblazen en dubbel middelen over 3 stappen (60 m)
const LEVEL_HEIGHT = 3.1;               // zoals heliflight.js en models3d_buildings.js
const PITCHED_RIDGE = 2.6;
// herkenbare hoge dingen die als gebouw in de tegels staan met een lage waarde h (de hoogte komt uit het model)
const KIND_TOP = { tower: 97, church: 45, mill: 25, castle: 28, station: 22 };
const NAME_TOP = { Martinitoren: 97 };
export const TURBINE_TIP_FACTOR = 1.55; // gondelhoogte -> tip van het rotorblad
export const PYLON_TOP = 48;

export const airKindOf = (plane) => (plane ? 'plane' : 'heli');

// De hoogte van de top van een gebouw uit de tegelrijen (zoals heliflight.js roofAt), landmarks met hun eigen hoogte.
export function buildingTop(b) {
  if (!b) return 0;
  if (b.type === 'houseboat') return 3;
  let top = Math.max(2.4, (b.h || 3) * LEVEL_HEIGHT) + (b.lift || 0) + ((b.h || 3) <= 3 ? PITCHED_RIDGE : 0);
  if (b.landmark) {
    const L = NAME_TOP[b.landmark] || NAME_TOP[b.name] || KIND_TOP[b.landmarkKind] || 0;
    top = Math.max(top, L);
  }
  return top;
}

// Afstand van (x, y) tot de bounding box van een gebouw (0 binnenin).
const boxDist = (b, x, y) => {
  const [x0, y0, x1, y1] = b.bounds || [x, y, x, y];
  return Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1));
};

// Is de tegel onder (x, y) er klaar? Een kaart zonder tegelstore (de oude volledige kaart) is altijd klaar;
// map.tilesReadyAt(x, y) (de planner van de tegelstream) gaat voor als hij bestaat.
export function tileReadyFn(map) {
  if (map && typeof map.tilesReadyAt === 'function') return (x, y) => !!map.tilesReadyAt(x, y);
  const st = map && map.store;
  if (!st || !st.index || !st.index.tiles) return () => true;
  return (x, y) => {
    const k = tileKey(...tileIndexOf(x, y));
    if (!st.has(k)) return true;                       // een leeg stuk wereld heeft niets om tegenaan te vliegen
    if (!st.ready(k)) return false;
    return !(typeof map.tilesPending === 'function' && map.tilesPending([k]));
  };
}

// Het hoogste obstakel binnen r meter van (x, y): { top, name, ready }.
// opts.extra(x, y, r) -> { top, name } | null voor windturbines, masten en wat de tegels niet als gebouw hebben.
export function topAt(map, x, y, r, opts = {}) {
  const ready = (opts.ready || tileReadyFn(map))(x, y);
  let g = 0;
  try { g = map.groundHeightAt ? map.groundHeightAt(x, y, 0) : 0; } catch { g = 0; }
  if (!Number.isFinite(g)) g = 0;
  let top = g + AIR_TREE_M, name = '';
  if (map && map.buildingsNear) {
    for (const b of map.buildingsNear(x, y, r + 2)) {
      if (boxDist(b, x, y) > r) continue;
      const t = buildingTop(b);
      if (t > top) { top = t; name = b.landmark ? (typeof b.landmark === 'string' ? b.landmark : b.name || '') : ''; if (!name) name = 'gebouwen'; }
    }
  }
  const e = opts.extra ? opts.extra(x, y, r) : null;
  if (e && e.top > top) { top = e.top; name = e.name || 'obstakel'; }
  return { top, name, ready };
}

// De vereiste hoogtes (r[i]) naar een gladde curve z[i] >= r[i] met |helling| <= k (m per m) en zonder scherpe knikken:
// eerst de hellingsbegrenzing (voor en achter), dan opblazen met 2W en tweemaal middelen over W (een driehoekskern).
// Opblazen met de volle kernbreedte garandeert dat het gemiddelde nergens onder r zakt; middelen verhoogt de helling niet.
export function profileFromRequired(r, ds, k, W = SMOOTH_W) {
  const n = r.length;
  const z = Float64Array.from(r);
  for (let i = 1; i < n; i++) z[i] = Math.max(z[i], z[i - 1] - k * ds);
  for (let i = n - 2; i >= 0; i--) z[i] = Math.max(z[i], z[i + 1] - k * ds);
  if (W <= 0 || n < 3) return z;
  const dil = new Float64Array(n);
  const R = 2 * W;
  for (let i = 0; i < n; i++) { let m = -Infinity; for (let j = Math.max(0, i - R); j <= Math.min(n - 1, i + R); j++) if (z[j] > m) m = z[j]; dil[i] = m; }
  const box = (a) => {
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = i - W; j <= i + W; j++) s += a[Math.max(0, Math.min(n - 1, j))];
      out[i] = s / (2 * W + 1);
    }
    return out;
  };
  return box(box(dil));
}

// De tegels langs de lijn (om de 250 m) en of ze klaar zijn, als handtekening voor de herberekening.
function corridorKeys(ax, ay, ux, uy, s0, s1) {
  const keys = [];
  const seen = new Set();
  for (let s = s0; s <= s1 + 250; s += 250) {
    const x = ax + ux * Math.min(s, s1), y = ay + uy * Math.min(s, s1);
    for (const [dx, dy] of [[0, 0], [AIR_HALF_W, 0], [-AIR_HALF_W, 0], [0, AIR_HALF_W], [0, -AIR_HALF_W]]) {
      const k = tileKey(...tileIndexOf(x + dx, y + dy));
      if (!seen.has(k)) { seen.add(k); keys.push([k, x + dx, y + dy]); }
    }
  }
  return keys;
}

// Het profiel van de lijn a -> b (a, b: { x, y }), vanaf s0 meter na a (standaard 0), AIR_SPAN_M meter ver.
// o: { plane, base (de aanbevolen vlieghoogte, route.alt), s0, window, extra, step }
// Geeft { ax, ay, bx, by, ux, uy, total, s0, s1, ds, n, z[], need[], names[], ready, incomplete, sig, kind, base, k, atEnd }.
export function buildAirProfile(map, a, b, o = {}) {
  const kind = airKindOf(o.plane);
  const ds = o.step || AIR_STEP_M;
  const dx = b.x - a.x, dy = b.y - a.y, total = Math.hypot(dx, dy);
  const ux = total > 0 ? dx / total : 1, uy = total > 0 ? dy / total : 0;
  const s0 = Math.max(0, Math.min(total, o.s0 || 0));
  const s1 = Math.min(total, s0 + (o.window || AIR_SPAN_M));
  const n = Math.max(2, Math.ceil((s1 - s0) / ds) + 1);
  const base = Number.isFinite(o.base) ? o.base : kind === 'plane' ? 150 : 60;
  const margin = AIR_MARGIN[kind];
  const k = Math.tan((AIR_MAX_SLOPE_DEG[kind] * Math.PI) / 180);
  const ready = o.ready || tileReadyFn(map);
  const r = new Float64Array(n), need = new Float64Array(n), names = new Array(n).fill('');
  const R = Math.hypot(AIR_HALF_W, ds / 2);
  let incomplete = false;
  for (let i = 0; i < n; i++) {
    const s = Math.min(total, s0 + i * ds);
    const x = a.x + ux * s, y = a.y + uy * s;
    // het doel zelf (de landingsplek) is vrij: daar mag je naar toe dalen
    if (total - s < AIR_END_FREE_M) { r[i] = base; need[i] = 0; continue; }
    const t = topAt(map, x, y, R, { extra: o.extra, ready });
    if (!t.ready) { incomplete = true; r[i] = Math.max(base, AIR_DEFAULT_ALT); need[i] = AIR_DEFAULT_ALT; names[i] = ''; continue; }
    need[i] = t.top + margin;
    names[i] = t.name;
    r[i] = Math.max(base, need[i]);
  }
  const z = profileFromRequired(r, ds, k);
  const keys = corridorKeys(a.x, a.y, ux, uy, s0, s1);
  const sig = keys.map(([, x, y]) => (ready(x, y) ? '1' : '0')).join('');
  return { ax: a.x, ay: a.y, bx: b.x, by: b.y, ux, uy, total, s0, s1, ds, n, z, r, need, names, ready, incomplete, sig, keys, kind, base, k, atEnd: s1 >= total - 1e-6 };
}

// De hoogte van het profiel op s meter na a (lineair tussen de monsters; buiten het stuk de rand).
export function profileAt(P, s) {
  const f = (s - P.s0) / P.ds;
  if (!(f > 0)) return P.z[0];
  if (f >= P.n - 1) return P.z[P.n - 1];
  const i = Math.floor(f), t = f - i;
  return P.z[i] * (1 - t) + P.z[i + 1] * t;
}

// Waar je op de basislijn staat: s (voortgang) en off (zijwaartse afwijking).
export function profileLateral(P, x, y) {
  const px = x - P.ax, py = y - P.ay;
  return { s: px * P.ux + py * P.uy, off: Math.abs(-px * P.uy + py * P.ux) };
}

// De piek binnen `ahead` meter voor je (op s): { z, s (afstand vanaf je), name }. name is het obstakel dat de piek bepaalt.
export function airNeed(P, s, ahead = 700) {
  const i0 = Math.max(0, Math.floor((s - P.s0) / P.ds)), i1 = Math.min(P.n - 1, Math.ceil((s + ahead - P.s0) / P.ds));
  let z = -Infinity, at = i0, nm = '', bestNeed = -Infinity;
  for (let i = i0; i <= i1; i++) { if (P.z[i] > z) { z = P.z[i]; at = i; } }
  // het obstakel achter de piek: het hoogste dat de curve rond de piek optilt
  for (let i = Math.max(0, at - 2 * SMOOTH_W - 1); i <= Math.min(P.n - 1, at + 2 * SMOOTH_W + 1); i++) if (P.need[i] > bestNeed) { bestNeed = P.need[i]; nm = P.names[i]; }
  return { z: Number.isFinite(z) ? z : P.base, dist: Math.max(0, P.s0 + at * P.ds - s), name: nm, incomplete: P.incomplete };
}

// De hoogteregel voor de navigatiekaart: "Stijg naar 120 m: Martinitoren voor je", "Daal naar 60 m", "" bij goede hoogte.
export const AIR_ALT_BAND_M = 15;
export function airNeedAdvice(need, meZ) {
  if (!need || !Number.isFinite(meZ)) return '';
  const z = Math.round(need.z / 5) * 5;
  const dz = need.z - meZ;
  if (dz > AIR_ALT_BAND_M) return `Stijg naar ${z} m${need.name ? `: ${need.name === 'gebouwen' ? 'gebouwen' : need.name} voor je` : ''}`;
  return '';
}

// De laatste piek voor de HUD (airline3d.js zet hem elk frame uit de cache, hud_panel.js leest hem): geen eigen bemonstering.
let lastNeed = null;
export const recordAirNeed = (n) => { lastNeed = n; };
export const getAirNeed = () => lastNeed;

// ---- cache --------------------------------------------------------------------------------------------------------
const cache = { key: '', P: null, checkedAt: -Infinity, builtAt: -Infinity, builds: 0, reason: '' };
export function airProfileStats() { return { builds: cache.builds, reason: cache.reason, key: cache.key, covered: cache.P ? [cache.P.s0, cache.P.s1] : null, incomplete: !!(cache.P && cache.P.incomplete) }; }
export function resetAirProfile() { cache.key = ''; cache.P = null; cache.checkedAt = cache.builtAt = -Infinity; cache.builds = 0; cache.reason = ''; }

// Het profiel voor de lijn van `me` naar `target` ({ x, y }); route: { alt, target }. now: klok in seconden.
// Bouwt alleen opnieuw als de route wisselt, je van de basislijn afdrijft, het stuk profiel voor je opraakt of er een
// tegel bij of af is gekomen langs de lijn (hooguit eens per AIR_REBUILD_S).
export function airProfileFor(map, me, target, opts = {}, now = 0) {
  const key = `${Math.round(target.x)}:${Math.round(target.y)}:${opts.plane ? 'p' : 'h'}:${Math.round(opts.base || 0)}`;
  let P = cache.P;
  let why = '';
  if (!P || cache.key !== key) why = 'route';
  else {
    const l = profileLateral(P, me.x, me.y);
    const sinceBuild = now - cache.builtAt;
    if (l.off > AIR_DRIFT_M && sinceBuild >= AIR_REBUILD_S) why = 'afdrijven';
    else if (!P.atEnd && l.s > P.s1 - AIR_REFRESH_M && sinceBuild >= AIR_REBUILD_S) why = 'stuk';
    else if (l.s < P.s0 - AIR_DRIFT_M && sinceBuild >= AIR_REBUILD_S) why = 'terug';
    else if (now - cache.checkedAt >= AIR_RELOOK_S) {
      cache.checkedAt = now;
      // P.ready kijkt live in de tegelstore (of de testkaart): is de stand langs de lijn anders dan bij de bouw?
      const sig = P.keys.map(([, x, y]) => (P.ready(x, y) ? '1' : '0')).join('');
      if (sig !== P.sig && sinceBuild >= AIR_REBUILD_S) why = 'tegels';
    }
  }
  if (why) {
    // opnieuw: vanaf je eigen plek (nieuwe basislijn) bij route, afdrijven en terug; anders hetzelfde stuk
    const from = why === 'tegels' ? { x: P.ax, y: P.ay } : { x: me.x, y: me.y };
    const s0 = why === 'tegels' ? P.s0 : 0;
    P = buildAirProfile(map, from, target, { ...opts, s0, window: why === 'tegels' ? P.s1 - P.s0 : opts.window });
    cache.P = P; cache.key = key; cache.builtAt = now; cache.checkedAt = now; cache.builds++; cache.reason = why;
  }
  return P;
}
