// Het bezit van de speler (epic #1095, #1097; ontwerp docs/BEZIT-21-11.md 4.1): percelen en panden als compacte ID-verzameling met een kleine
// toestand, nooit polygonen. Per speler (#429): opslagsleutel gde-bezit-v1, nooit in een savegame. Puur: geen DOM, geen THREE, geen klok;
// de opslag is een parameter (scripts/bezit_test.mjs). De veldtoestanden van de percelen blijven in de boerderij (boerderij.js) onder
// hetzelfde ID; de twaalf verzonnen percelen van percelen.js staan als 'legacy' mee (niets in een bestaand profiel verandert).
//
// Raw (opslag):  { v: 1, parcels: { <id>: { k, ha, a:[x10,y10], t, p, w, m, lg? } }, buildings: '<delta-varint base64>', bstate: { <osm>: {...} },
//                  debt, totals: { bought, sold, spent, earned }, x?: { staff, herds, rules, tessa, lastDay, chains, market, news } }
// x is het beheer van #1101 (personeel, vee, teeltplanregels, Tessa-regels): elk deel wordt door zijn eigen module genormaliseerd (farmstaff.js,
// livestock.js, holdingsmodel.js, tessarules.js); hier blijft alleen een begrensde, bekende verzameling bewaard.
// Geheugen:     dezelfde vorm, maar buildings is een Set van OSM-id's.

import { KEYS } from './storagekeys.js';
import { perceelDef, PERCEEL_IDS, SCHENK_PERCEEL_IDS } from './percelen.js';
import { VERKOOP_FACTOR } from './bezitprijs.js';

export const BEZIT_VERSION = 1;
export const MAX_PARCELS = 20000;                 // ruim boven het aanbod (13.664): een bovengrens tegen kapotte opslag
export const MAX_BUILDINGS = 500000;
export const EXT_KEYS = ['staff', 'herds', 'rules', 'tessa', 'lastDay', 'chains', 'market', 'news', 'snack', 'told', 'menuTold', 'dierklus'];   // chains, market en news: de ketens, de streekmarkt en het nieuws van #1103
const EXT_MAX_JSON = 400000;                       // een bovengrens tegen kapotte opslag: bij 1000 percelen met vee is dit ruim
export const MODES = ['self', 'leased', 'staff'];  // zelf bewerken, verpacht, door personeel
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const num = (x, lo, hi, d = 0) => (Number.isFinite(x) ? clamp(x, lo, hi) : d);

export const newBezit = () => ({ v: BEZIT_VERSION, parcels: {}, buildings: new Set(), bstate: {}, mobile: {}, debt: 0, totals: { bought: 0, sold: 0, spent: 0, earned: 0 }, x: {} });

// ---- compacte verzameling: gesorteerde delta's als varint, base64 (ontwerp 3: ongeveer 2,7 byte per pand) ----
export function encodeIdSet(ids) {
  const a = [...new Set(ids)].filter((x) => Number.isSafeInteger(x) && x >= 0).sort((x, y) => x - y);
  const bytes = [];
  let prev = 0;
  for (const id of a) {
    let d = id - prev;
    prev = id;
    do { let b = d % 128; d = Math.floor(d / 128); if (d > 0) b += 128; bytes.push(b); } while (d > 0);
  }
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x2000) s += String.fromCharCode(...bytes.slice(i, i + 0x2000));
  return btoa(s);
}
export function decodeIdSet(str, max = MAX_BUILDINGS) {
  const out = [];
  if (typeof str !== 'string' || !str) return out;
  let s;
  try { s = atob(str); } catch (e) { return out; }
  let cur = 0, mul = 1, prev = 0;
  for (let i = 0; i < s.length && out.length < max; i++) {
    const b = s.charCodeAt(i);
    cur += (b & 127) * mul;
    if (b & 128) { mul *= 128; if (mul > 2 ** 49) return out; continue; }
    prev += cur; out.push(prev); cur = 0; mul = 1;
  }
  return out;
}

// ---- normaliseren en serialiseren ----
function normParcel(r) {
  if (!r || typeof r !== 'object') return null;
  const k = r.k === 'w' || r.k === 'b' ? r.k : 'a';
  const o = { k, ha: Math.round(num(r.ha, 0, 5000) * 100) / 100, t: Math.round(num(r.t, 0, 1e6)), p: Math.round(num(r.p, 0, 1e9)), w: Math.round(num(r.w, 0, 3)), m: MODES.includes(r.m) ? r.m : 'self' };
  if (Array.isArray(r.a) && r.a.length === 2 && r.a.every(Number.isFinite)) o.a = [Math.round(r.a[0]), Math.round(r.a[1])];
  if (Array.isArray(r.c) && r.c.length === 2 && r.c.every(Number.isFinite)) o.c = [Math.round(r.c[0]), Math.round(r.c[1])];   // binnenpunt (10 m): waar het veld gezocht en de paal gezet wordt
  if (r.lg) o.lg = 1;
  for (const k of ['ins', 'ta', 'tw']) if (Number.isFinite(r[k])) o[k] = Math.round(num(r[k], 0, 1e7));   // verzekering en bestrijding (parcelcare.js)
  return o;
}
// De beheerknoppen van een bedrijf, grof gezuiverd (de precieze grenzen en het personeel zuivert business.js normalizeCfg bij gebruik).
function normBizCfg(c) {
  if (!c || typeof c !== 'object') return null;
  const o = {};
  for (const k of ['pr', 'st', 'hr', 'vu']) if (Number.isFinite(c[k])) o[k] = clamp(c[k], 0, 1e6);
  if (typeof c.spot === 'string' && /^[a-z]{2,12}$/.test(c.spot)) o.spot = c.spot;
  if (Array.isArray(c.staff)) o.staff = c.staff.slice(0, 12).filter((m) => m && typeof m.id === 'string' && m.id.length <= 40).map((m) => ({ id: m.id, name: String(m.name || '').slice(0, 24), skill: Math.round(num(m.skill, 0, 100, 50)), role: m.role === 'kassier' ? 'kassier' : 'medewerker', ...(m.existing ? { existing: true } : {}) }));
  return Object.keys(o).length ? o : null;
}
export function normalizeBezit(raw) {
  const b = newBezit();
  if (!raw || typeof raw !== 'object' || raw.v !== BEZIT_VERSION) return b;
  if (raw.parcels && typeof raw.parcels === 'object') {
    for (const id of Object.keys(raw.parcels).slice(0, MAX_PARCELS)) {
      if (!/^(p[0-9a-f]{12}|[a-z][a-z0-9-]{1,40})$/.test(id)) continue;
      const p = normParcel(raw.parcels[id]);
      if (p) b.parcels[id] = p;
    }
  }
  for (const id of decodeIdSet(raw.buildings)) b.buildings.add(id);
  if (raw.bstate && typeof raw.bstate === 'object') {
    for (const k of Object.keys(raw.bstate).slice(0, MAX_BUILDINGS)) {
      const id = Number(k), s = raw.bstate[k];
      if (!b.buildings.has(id) || !s || typeof s !== 'object') continue;
      const o = {};
      if (Number.isFinite(s.p)) o.p = Math.round(clamp(s.p, 0, 1e9));       // betaalde prijs
      if (Number.isFinite(s.t)) o.t = Math.round(clamp(s.t, 0, 1e6));       // speldag gekocht
      if (s.kind && typeof s.kind === 'string' && s.kind.length < 24) o.kind = s.kind;
      if (Number.isFinite(s.q)) o.q = Math.round(clamp(s.q, 0, 100) * 10) / 10;   // onderhoud (een decimaal: het zakt per speldag langzaam)
      if (Number.isFinite(s.bp)) o.bp = Math.round(clamp(s.bp, 0, 1e9));    // basisprijs zonder schaalprijs (business.js)
      const cfg = normBizCfg(s.cfg); if (cfg) o.cfg = cfg;                   // beheerknoppen en personeel (business.js)
      if (Object.keys(o).length) b.bstate[id] = o;
    }
  }
  if (raw.x && typeof raw.x === 'object') {
    for (const k of EXT_KEYS) {
      const v = raw.x[k];
      if (v === undefined || v === null) continue;
      if (k === 'lastDay') { if (Number.isFinite(v)) b.x.lastDay = Math.round(clamp(v, 0, 1e7)); continue; }
      if (typeof v !== 'object') continue;
      try { if (JSON.stringify(v).length <= EXT_MAX_JSON) b.x[k] = v; } catch (e) { /* kapotte opslag: overslaan */ }
    }
  }
  if (raw.mobile && typeof raw.mobile === 'object') {                      // mobiele bedrijven, eigen id (business.js: frietwagen)
    for (const id of Object.keys(raw.mobile).slice(0, 8)) {
      const s = raw.mobile[id];
      if (!/^[a-z][a-z0-9-]{1,24}$/.test(id) || !s || typeof s !== 'object') continue;
      b.mobile[id] = { p: Math.round(num(s.p, 0, 1e9)), t: Math.round(num(s.t, 0, 1e6)), q: Math.round(num(s.q, 0, 100, 100)), ...(s.gift === true ? { gift: true } : {}), cfg: normBizCfg(s.cfg) || {} };
    }
  }
  b.debt = Math.round(num(raw.debt, 0, 1e9));
  const t = raw.totals && typeof raw.totals === 'object' ? raw.totals : {};
  for (const k of Object.keys(b.totals)) b.totals[k] = Math.round(num(t[k], 0, 1e12));
  return b;
}
export function serializeBezit(b) {
  return { v: BEZIT_VERSION, parcels: b.parcels, buildings: encodeIdSet([...b.buildings]), bstate: b.bstate, mobile: b.mobile, debt: b.debt, totals: b.totals, ...(Object.keys(b.x || {}).length ? { x: b.x } : {}) };
}

// ---- opslag (de opslag is een parameter; nooit window.localStorage in tests) ----
export function loadBezit(storage, key = KEYS.bezit) {
  try { return normalizeBezit(JSON.parse(storage.getItem(key))); } catch (e) { return newBezit(); }
}
export function saveBezit(storage, b, key = KEYS.bezit) {
  try { storage.setItem(key, JSON.stringify(serializeBezit(b))); return true; } catch (e) { return false; }
}

// ---- vragen ----
export const ownsParcel = (b, id) => !!b.parcels[id];
export const ownsBuilding = (b, osm) => b.buildings.has(osm);
export const parcelIds = (b) => Object.keys(b.parcels);
export const parcelCount = (b) => Object.keys(b.parcels).length;
// Voor de schaalprijs: de hand-gezette percelen van De Zonnehoek tellen niet mee (die zijn geen koopstap van de provincie).
export const ownedCount = (b) => Object.values(b.parcels).filter((p) => !p.lg).length + b.buildings.size;
export const totalHa = (b) => Math.round(Object.values(b.parcels).reduce((s, p) => s + p.ha, 0) * 100) / 100;

// ---- kopen en verkopen ----
// def is een perceel uit de index ({ id, kind, ha, x, y, ax, ay }). Slaagt alleen met genoeg geld; verandert niets bij een weigering.
export function buyParcel(b, def, price, day, money) {
  if (!def || !def.id) return { ok: false, why: 'onbekend' };
  if (b.parcels[def.id]) return { ok: false, why: 'al-van-jou' };
  if (!(price > 0)) return { ok: false, why: 'niet-te-koop' };
  if (!(money >= price)) return { ok: false, why: 'te-weinig-geld', tekort: Math.round(price - money) };
  if (parcelCount(b) >= MAX_PARCELS) return { ok: false, why: 'vol' };
  b.parcels[def.id] = normParcel({ k: def.kind, ha: def.ha, a: [Math.round(def.ax / 10) * 10, Math.round(def.ay / 10) * 10], c: [Math.round(def.x / 10) * 10, Math.round(def.y / 10) * 10], t: day, p: price, w: 0, m: 'self' });
  b.totals.bought++; b.totals.spent += price;
  return { ok: true, cost: price };
}
export function sellParcel(b, id) {
  const p = b.parcels[id];
  if (!p) return { ok: false, why: 'niet-van-jou' };
  if (p.lg) return { ok: false, why: 'start' };                       // de hand-gezette percelen zijn geen handelswaar
  const refund = Math.round((p.p * VERKOOP_FACTOR) / 5) * 5;
  delete b.parcels[id];
  b.totals.sold++; b.totals.earned += refund;
  return { ok: true, refund };
}
export function buyBuilding(b, osm, price, day, money, kind = null) {
  if (!Number.isSafeInteger(osm) || osm <= 0) return { ok: false, why: 'onbekend' };
  if (b.buildings.has(osm)) return { ok: false, why: 'al-van-jou' };
  if (!(price > 0)) return { ok: false, why: 'niet-te-koop' };
  if (!(money >= price)) return { ok: false, why: 'te-weinig-geld', tekort: Math.round(price - money) };
  if (b.buildings.size >= MAX_BUILDINGS) return { ok: false, why: 'vol' };
  b.buildings.add(osm);
  b.bstate[osm] = { p: price, t: day, q: 100, ...(kind ? { kind } : {}) };
  b.totals.bought++; b.totals.spent += price;
  return { ok: true, cost: price };
}
export function sellBuilding(b, osm) {
  if (!b.buildings.has(osm)) return { ok: false, why: 'niet-van-jou' };
  const paid = (b.bstate[osm] && b.bstate[osm].p) || 0;
  const refund = Math.round((paid * VERKOOP_FACTOR) / 5) * 5;
  b.buildings.delete(osm); delete b.bstate[osm];
  b.totals.sold++; b.totals.earned += refund;
  return { ok: true, refund };
}
export function setParcelMode(b, id, mode) {
  if (!b.parcels[id] || !MODES.includes(mode)) return false;
  b.parcels[id].m = mode;
  return true;
}

// ---- migratie van de boerderij: de verzonnen percelen blijven bestaan als 'legacy' bezit ----
// bedrijf is b.bedrijf van boerderij.js (percelen: { <id>: { status, sinds } }). Idempotent en nooit verwijderend.
export function syncLegacyParcels(b, bedrijf) {
  let added = 0;
  if (!bedrijf || !bedrijf.percelen) return added;
  for (const id of Object.keys(bedrijf.percelen)) {
    if (!(PERCEEL_IDS.includes(id) || SCHENK_PERCEEL_IDS.includes(id)) || b.parcels[id]) continue;   // de geschonken hoeve (#1373) telt ook als eigen bezit, niet als handelswaar
    const d = perceelDef(id);
    b.parcels[id] = normParcel({ k: d.soort === 'weiland' ? 'w' : 'a', ha: d.ha, t: Math.round((bedrijf.percelen[id].sinds || 0) / 24), p: 0, w: 0, m: 'self', lg: 1 });
    added++;
  }
  return added;
}

// ---- herkoppelen na een nieuwe wereldbouw: een bezit dat naar een niet meer bestaand ID wijst, wordt teruggedraaid met terugbetaling ----
// index is een createParcelIndex(...). Geeft { kept, rematched, refunded, refund } en past b aan. Nooit een stil verlies.
export function reconcileWithIndex(b, index) {
  const res = { kept: 0, rematched: [], refunded: [], refund: 0 };
  if (!index || !index.size) return res;                              // zonder index niets aanraken (laden mislukt)
  for (const id of Object.keys(b.parcels)) {
    const p = b.parcels[id];
    if (p.lg || index.has(id)) { res.kept++; continue; }
    const m = p.a ? index.rematch(p.a, p.k, p.ha) : null;
    if (m && !b.parcels[m.id]) {
      b.parcels[m.id] = { ...p, a: [Math.round(m.ax / 10) * 10, Math.round(m.ay / 10) * 10], c: [Math.round(m.x / 10) * 10, Math.round(m.y / 10) * 10] };
      delete b.parcels[id];
      res.rematched.push([id, m.id]);
    } else {
      res.refund += p.p; res.refunded.push(id);                        // volledig terug (niet met de verkoopkorting)
      delete b.parcels[id];
    }
  }
  b.totals.earned += res.refund;
  return res;
}
