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
import * as H from './holdingsmodel.js';
import * as BZ from './business.js';
import * as FX from './businessexclusion.js';
import * as EV from './bezitevents.js';
import { hireWorker, fireWorker } from './farmstaff.js';

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

// ---- panden en bedrijven (Bedrijven-tak, #1102) ----
let exclusionContext = () => ({});
export const setExclusionContext = (fn) => { exclusionContext = typeof fn === 'function' ? fn : () => ({}); };
const TOWN_HOUSES = 1500;                                                // het aantal woningen per plaats is nog een schatting (de pandindex bevat geen gewone woningen)
const townOf = (x, y) => ({ id: placeOfPoint(x, y) || 'overig', name: placeOfPoint(x, y) || 'de plaats', houses: TOWN_HOUSES });

// Het aanbod van een pand voor het menu: soort, prijs en of het te koop is (de uitsluitlijst geeft de reden).
export function buildingOffer(osm) {
  if (!index) return null;
  const row = index.buildings.byId(osm);
  if (!row) return null;
  const kind = BZ.classifyBuilding(row, null);
  const town = townOf(row.x, row.y);
  const mine = Z.ownsBuilding(getBezit(), osm);
  const ex = mine ? null : FX.excluded(row, exclusionContext());
  const price = mine ? 0 : BZ.businessPrice(row, kind, town, Z.ownedCount(getBezit()));
  return { osm, row, kind, town, price, mine, forSale: !mine && !ex && price > 0, reason: mine ? 'Van jou' : ex ? ex.reason : price > 0 ? '' : 'Geen prijs bekend voor dit pand.' };
}
// De panden dichtbij een punt, met aanbod (voor het tabblad Bedrijven).
export function buildingsNear(x, y, r = 250, max = 12) {
  if (!index) return [];
  return index.buildings.near(x, y, r).map((b) => ({ b, d: Math.hypot(b.x - x, b.y - y) })).sort((a, c) => a.d - c.d).slice(0, max).map((e) => ({ ...buildingOffer(e.b.osm), dist: Math.round(e.d) }));
}
export function koopPand(w, osm) {
  if (!branchOpen('business')) return { ok: false, why: 'dicht', text: branchClosedText('business') };
  const o = buildingOffer(osm);
  if (!o) return { ok: false, why: 'onbekend', text: 'Dit pand is niet gevonden.' };
  if (!o.forSale) return { ok: false, why: 'niet-te-koop', text: o.reason || 'Dit pand is niet te koop.' };
  const farm = getBoerderij();
  const r = BZ.buyBusiness(getBezit(), o.row, o.kind, o.town, Math.floor(farm.uren / 24), Number.isFinite(w && w.money) ? w.money : 0);
  if (!r.ok) return { ...r, text: r.why === 'te-weinig-geld' ? `Je mist nog ${euro(r.tekort)}.` : 'Kopen lukt nu niet.' };
  noteMoney('Winkels'); w.money -= r.cost;
  markeer();
  return { ok: true, cost: r.cost, text: `Pand gekocht voor ${euro(r.cost)}.` };
}
export function verkoopPand(w, osm) {
  const r = Z.sellBuilding(getBezit(), osm);
  if (!r.ok) return { ...r, text: 'Dit pand is niet van jou.' };
  noteMoney('Verkoop'); w.money += r.refund; markeer();
  return { ok: true, refund: r.refund, text: `Verkocht voor ${euro(r.refund)}.` };
}
// De bedrijven van de speler voor het menu: { osm, biz, kind, row, place } met de gegevens uit de pandindex als die er is.
export function myBusinesses() {
  const b = getBezit();
  return [...b.buildings].map((osm) => {
    const row = index ? index.buildings.byId(osm) : null;
    const kind = row ? BZ.classifyBuilding(row, (b.bstate[osm] || {}).kind) : { cls: 'rent', type: (b.bstate[osm] || {}).kind || 'woning' };
    const biz = BZ.bizOf(b, row || { osm, m2: 100, type: kind.type }, kind);
    return { osm, row, kind, biz, place: row ? townOf(row.x, row.y).name : 'onbekend' };
  });
}
export function renovatePand(w, osm) {
  const b = getBezit(); const m = myBusinesses().find((x) => x.osm === osm);
  if (!m) return { ok: false, text: 'Dit pand is niet van jou.' };
  const r = BZ.renovate(m.biz, w.money || 0);
  if (!r.ok) return { ok: false, text: r.why === 'al-in-orde' ? 'Dit pand is al in orde.' : `Je mist nog ${euro(r.tekort || 0)}.` };
  noteMoney('Overige uitgaven'); w.money -= r.cost; BZ.storeBiz(b, r.biz); markeer();
  return { ok: true, text: `Gerenoveerd voor ${euro(r.cost)}.` };
}
export function setPandKnop(osm, key, value) {
  const b = getBezit(); const m = myBusinesses().find((x) => x.osm === osm);
  if (!m) return false;
  const cfg = BZ.setKnob(m.biz.cfg, key, value);
  BZ.storeBiz(b, { ...m.biz, cfg }); markeer();
  return true;
}

// ---- personeel van de boerderij (#1101) ----
export function huurArbeider(w, skill) {
  const farm = getBoerderij();
  const r = hireWorker(getBezit(), skill, Math.floor(farm.uren / 24), Number.isFinite(w && w.money) ? w.money : 0);
  if (!r.ok) return { ok: false, text: r.why === 'te-weinig-geld' ? `Je mist nog ${euro(r.tekort)}.` : r.why === 'vol' ? 'Je hebt al zoveel personeel als kan.' : 'Aanstellen lukt nu niet.' };
  markeer();
  return { ok: true, text: `${r.worker.name} is aangesteld.` };
}
export function ontslaArbeider(id) { const r = fireWorker(getBezit(), id); if (r && r.ok !== false) markeer(); return !!(r && r.ok !== false); }

// ---- de dagtik: personeel, pacht, vee, bedrijven en belasting per speldag ----
// Elk beeld aangeroepen (goedkoop: werkt alleen als de speldag veranderd is). Het geld gaat via world.money met noteMoney.
let lastReport = null;
export const takeDayReport = () => { const r = lastReport; lastReport = null; return r; };
export function dagTik(w) {
  const b = getBezit(), farm = getBoerderij();
  const day = Math.floor(farm.uren / 24);
  if (!(Object.keys(b.parcels).length > 1 || b.buildings.size || Object.keys(b.mobile || {}).length)) { b.x.lastDay = day; return null; }
  const from = Number.isFinite(b.x.lastDay) ? b.x.lastDay : day;
  if (day <= from) return null;
  const money = Number.isFinite(w && w.money) ? w.money : 0;
  const rep = H.advanceDays(b, farm, day, { money, deliver: 'sell' });
  let net = rep.net, bizNet = 0, tax = 0;
  const last = Math.min(day, from + 60);
  for (const m of myBusinesses()) {
    const x = m.row ? m.row.x : 0, y = m.row ? m.row.y : 0, region = regionOfPoint(x, y);
    const res = BZ.settleDays(m.biz, from, last, (d) => ({ day: d, town: townOf(x, y), owned: Z.ownedCount(b), sameType: 0, event: EV.businessMods(m.biz, region, d) }));
    BZ.storeBiz(b, res.biz); bizNet += res.sum.net; tax += res.sum.tax;
  }
  net += bizNet;
  if (net > 0) { const dd = Math.max(1, last - from); net = P.compressPassive(net / dd) * dd; }   // de rem op passief inkomen (bezitprijs.js)
  if (net !== 0) { noteMoney(net > 0 ? 'Winkels' : 'Overige uitgaven'); w.money = Math.max(0, (w.money || 0) + net); }
  markeer();
  lastReport = { from: from + 1, to: day, days: rep.days, parcels: Math.round(rep.net), business: Math.round(bizNet), net: Math.round(net), tax: Math.round(tax), events: rep.events };
  return lastReport;
}

// Samen spelen: onze claim verloor een conflict (een medespeler was eerder). Het perceel gaat terug en het geld komt volledig terug (nooit verlies).
export function releaseLostClaim(w, id) {
  const b = getBezit(), r = b.parcels[id];
  if (!r || r.lg) return { ok: false };
  const refund = r.p;
  delete b.parcels[id];
  PF.syncFarmWithBezit(getBoerderij(), b, ctxOf(), 0);
  b.totals.earned += refund;
  noteMoney('Verkoop'); w.money += refund;
  B.boek(getBoerderij(), { omzet: refund });
  markeer();
  return { ok: true, refund, text: 'Een medespeler was net eerder: je geld is terug.' };
}

// Samen spelen aanzetten voor deze sessie: claims bijhouden en doorsturen via send(msg) (het transport staat in de netlaag, nog te koppelen aan een EXTRA-bericht).
// Geeft { receive(w, msg), snapshot(), drop(id), stop() }; zonder sessie blijft alles in je eigen spel.
import { createClaims } from './bezitcoop.js';
export function attachCoop(w, selfId, name, color, send) {
  const claims = createClaims(selfId);
  setClaimLookup((id) => claims.lookup(id));
  setClaimSend((m) => { const full = { ...m, from: selfId, name, color, t: Date.now() }; claims.apply(full); if (typeof send === 'function') send(full); });
  if (w) w.bezitClaims = () => claims.list();
  return {
    claims,
    receive(world, msg) { const r = claims.apply(msg); if (r.lost) { const b = releaseLostClaim(world, msg.id); if (b.ok && world.addMessage) world.addMessage(b.text, 4); } return r; },
    snapshot: () => claims.snapshot(),
    drop: (id) => claims.drop(id),
    stop() { setClaimLookup(null); setClaimSend(null); claims.clear(); if (w) w.bezitClaims = null; },
  };
}
