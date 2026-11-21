// De haken van het spel naar Bezit (epic #1095, #1098/#1099/#1100): houdt het bezit van deze speler bij in de eigen opslag (gde-bezit-v1, per speler,
// nooit in een savegame), laadt de perceelindex lui, geeft aanbod en prijs voor de kaart en het menu en koopt of verkoopt uit het geld van de speler
// (world.money, via noteMoney en het kasboek van de boerderij). Geen DOM en geen THREE (scripts/bezitlive_test.mjs).
//
// Samen spelen: bezit is per speler (#429); een koper stuurt een claim (bezitcoop.js) via de haak setClaimLookup/setClaimSend; zonder sessie is er geen claim.

import { KEYS } from './storagekeys.js';
import { noteMoney } from './finance.js';
import { euro } from './geldtekst.js';
import { getBoerderij } from './boerderijlive.js';
import { setVoorLaadHaak } from './boerderijlive.js';
import * as Z from './bezit.js';
import * as P from './bezitprijs.js';
import * as PF from './parcelfarm.js';
import * as B from './boerderij.js';
import { loadBezitIndex, createParcelIndex, createBuildingIndex } from './parcelindex.js';
import { streekAt } from './regioleven.js';
import { branchOpen, branchClosedText } from './bezitgate.js';

const SCHRIJF_VERTRAGING_MS = 2000;
let bezit = null, opslagOverride = null, timer = 0, vuil = false, index = null, laden = null;
let claimLookup = () => null, claimSend = () => {};

const opslag = () => {
  if (opslagOverride !== null) return opslagOverride;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
};

// ---- de streek en woonplaats van een perceel (voor naam, bodem en prijs) ----
export const regionOfPoint = (x, y) => { const s = streekAt(x, y); return s ? s.id : 'overig'; };
const placeOfPoint = (x, y) => (index && index.parcels.placeAt(x, y)) || undefined;
const ctxOf = () => ({
  region: (id) => { const r = bezit && bezit.parcels[id]; return r && r.a ? regionOfPoint(r.a[0], r.a[1]) : 'overig'; },
  place: (id) => { const r = bezit && bezit.parcels[id]; return r && r.a ? placeOfPoint(r.a[0], r.a[1]) : undefined; },
});

export function getBezit() {
  if (!bezit) {
    const st = opslag();
    let raw = null;
    try { raw = st ? st.getItem(KEYS.bezit) : null; } catch (e) { raw = null; }
    try { bezit = Z.normalizeBezit(raw ? JSON.parse(raw) : null); } catch (e) { bezit = Z.newBezit(); }
    PF.registerOwnedParcels(bezit, ctxOf());
  }
  return bezit;
}
export function schrijfNu() {
  timer = 0;
  if (!vuil) return;
  const st = opslag();
  if (!st || !bezit) return;
  try { st.setItem(KEYS.bezit, JSON.stringify(Z.serializeBezit(bezit))); vuil = false; } catch (e) { /* opslag vol of geblokkeerd: het bezit blijft in dit spel */ }
}
export function markeer() {
  vuil = true;
  if (!timer && typeof setTimeout === 'function') { timer = setTimeout(schrijfNu, SCHRIJF_VERTRAGING_MS); if (timer && timer.unref) timer.unref(); }
}
// Voor de boerderij: voor het laden de gekochte percelen in het register zetten, anders kent normaliseer hun id's niet.
export function initBezit({ opslag: st } = {}) {
  if (vuil) schrijfNu();
  if (st !== undefined) opslagOverride = st;
  bezit = null; vuil = false; index = null; laden = null;
  setVoorLaadHaak(() => { PF.registerOwnedParcels(getBezit(), ctxOf()); });
  getBezit();
  if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('pagehide', () => { if (timer) clearTimeout(timer); schrijfNu(); });
  return bezit;
}

// ---- de index: lui, pas als de speler iets met Bezit doet ----
const fetchJson = (url) => fetch(url).then((r) => (r.ok ? r.json() : null));
export function ensureIndex(base = 'world/') {
  if (index) return Promise.resolve(index);
  if (!laden) laden = loadBezitIndex(fetchJson, base).then((ix) => { index = ix; afterIndex(); return ix; });
  return laden;
}
export const getIndexNow = () => index;
export function setIndexForTest(parcelFile, buildingFile = null) {
  index = { parcels: createParcelIndex(parcelFile), buildings: createBuildingIndex(buildingFile) };
  afterIndex();
  return index;
}
// Na het laden: een bezit dat naar een niet meer bestaand ID wijst terugdraaien (met terugbetaling), en de namen verversen met de echte woonplaats.
function afterIndex() {
  const b = getBezit();
  const r = Z.reconcileWithIndex(b, index.parcels);
  if (r.rematched.length || r.refunded.length) {
    PF.syncFarmWithBezit(getBoerderij(), b, ctxOf(), 0);
    markeer();
    lastReconcile = r;
  } else PF.registerOwnedParcels(b, ctxOf());
}
let lastReconcile = null;
// Eenmalig: wat na een nieuwe wereldbouw is teruggedraaid, zodat het spel er een melding van kan maken (en daarna niet meer).
export function takeReconcileReport() { const r = lastReconcile; lastReconcile = null; return r && (r.refund > 0 || r.rematched.length) ? r : null; }

// ---- het aanbod ----
export const ownedCountLive = () => Z.ownedCount(getBezit());

// Alles wat de perceelkaart nodig heeft over één perceel uit de index. null zonder index of onbekend ID.
export function parcelOffer(id) {
  if (!index) return null;
  const p = index.parcels.byId(id);
  if (!p) return null;
  const b = getBezit();
  const region = regionOfPoint(p.x, p.y);
  const place = placeOfPoint(p.x, p.y) || 'het Hogeland';
  const mine = Z.ownsParcel(b, id);
  const claim = mine ? null : claimLookup(id);
  const price = P.parcelPrice(p, region, Z.ownedCount(b));
  const soil = P.soilQuality(id, region);
  return {
    id, parcel: p, region, place, name: P.parcelName(p, place), seller: P.sellerName(p), kindName: P.KIND_NAME[p.kind],
    ha: p.ha, soil, soilWord: P.soilWord(soil), access: p.access, price, basePrice: P.basePrice(p, region),
    scaleNote: P.scaleFactor(Z.ownedCount(b)) > 1 ? `Schaalprijs x${P.scaleFactor(Z.ownedCount(b)).toFixed(2).replace('.', ',')}: wie veel land heeft, betaalt meer voor het volgende perceel.` : '',
    forSale: P.isForSale(p) && !mine && !claim, mine, claim,
    sellValue: mine ? P.sellValue((b.parcels[id] || {}).p || 0) : 0,
    reason: mine ? 'Van jou' : claim ? `Van ${claim.name} (in deze sessie)` : !P.isForSale(p) ? 'Niet te koop: geen toegang tot een weg of pad' : '',
  };
}

export const bezitOpen = (branch = 'land') => branchOpen(branch);
export const bezitClosedText = (branch = 'land') => branchClosedText(branch);

// ---- kopen en verkopen ----
export function koopPerceel(w, id) {
  if (!branchOpen('land')) return { ok: false, why: 'dicht', text: branchClosedText('land') };
  const o = parcelOffer(id);
  if (!o) return { ok: false, why: 'onbekend', text: 'Dit perceel is niet gevonden.' };
  if (o.mine) return { ok: false, why: 'al-van-jou', text: 'Dit perceel is al van jou.' };
  if (o.claim) return { ok: false, why: 'geclaimd', text: o.reason };
  if (!o.forSale) return { ok: false, why: 'niet-te-koop', text: o.reason };
  const farm = getBoerderij();
  const money = Number.isFinite(w && w.money) ? w.money : 0;
  const r = PF.acquireParcel(getBezit(), farm, o.parcel, o.price, Math.floor(farm.uren / 24), money, { region: o.region, place: o.place });
  if (!r.ok) return { ...r, text: r.why === 'te-weinig-geld' ? `Je mist nog ${euro(r.tekort)}.` : 'Kopen lukt nu niet.' };
  noteMoney('Winkels'); w.money -= o.price;
  B.boek(farm, { kosten: o.price, post: 'aankoop' });
  claimSend({ id, action: 'claim' });
  markeer();
  return { ok: true, cost: o.price, name: o.name, text: `${o.name} is van jou voor ${euro(o.price)}.` };
}
export function verkoopPerceel(w, id) {
  const b = getBezit();
  const r = Z.sellParcel(b, id);
  if (!r.ok) return { ...r, text: r.why === 'start' ? 'Dit startperceel verkoop je niet.' : 'Dit perceel is niet van jou.' };
  PF.syncFarmWithBezit(getBoerderij(), b, ctxOf(), 0);
  noteMoney('Verkoop'); w.money += r.refund;
  B.boek(getBoerderij(), { omzet: r.refund });
  claimSend({ id, action: 'release' });
  markeer();
  return { ok: true, refund: r.refund, text: `Verkocht voor ${euro(r.refund)}.` };
}

// ---- Samen spelen: de claim (bezitcoop.js haakt hier in) ----
export const setClaimLookup = (fn) => { claimLookup = typeof fn === 'function' ? fn : () => null; };
export const setClaimSend = (fn) => { claimSend = typeof fn === 'function' ? fn : () => {}; };
// De ID-verzameling van je eigen bezit voor een gast die later aansluit: alleen de niet-legacy percelen.
export const ownedParcelIdsForNet = () => Object.keys(getBezit().parcels).filter((id) => !getBezit().parcels[id].lg);

export const heeftBezit = () => Z.ownedCount(getBezit()) > 0;
export function zetBezitVoorTest(raw, st) { bezit = raw ? Z.normalizeBezit(raw) : null; if (st !== undefined) opslagOverride = st; vuil = false; }

// ---- de kaartlaag Te koop (forsalemap.js): de dichtstbijzijnde diepte uit de live toestand ----
import { forSaleLayer } from './forsalemap.js';
const baseCache = new Map();                                            // basisprijs per ID: de streek rekent niet elk beeld opnieuw
const baseOf = (p) => { let v = baseCache.get(p.id); if (v === undefined) { v = P.basePrice(p, regionOfPoint(p.x, p.y)); baseCache.set(p.id, v); } return v; };
const layer = forSaleLayer({
  get parcels() { return index ? index.parcels : null; },
  ownsId: (id) => Z.ownsParcel(getBezit(), id),
  claimOf: (id) => claimLookup(id),
  priceOf: (p) => { const b = baseOf(p); return b ? Math.round((b * P.scaleFactor(Z.ownedCount(getBezit()))) / 50) * 50 : 0; },
});
// rect = [x0, y0, x1, y1] (wereldmeters), scale = pixels per meter. Zonder index { mode: 'none' } en wordt de index op de achtergrond geladen.
export function forSaleView(rect, scale, base = 'world/') {
  if (!index) { ensureIndex(base).catch(() => {}); return { mode: 'none', shapes: [], clusters: [], total: 0, loading: true }; }
  return layer.view(rect, scale);
}
