// De haken van het spel naar Bezit (epic #1095, #1098/#1099/#1100): houdt het bezit van deze speler bij in de eigen opslag (gde-bezit-v1, per speler,
// nooit in een savegame), laadt de perceelindex lui, geeft aanbod en prijs voor de kaart en het menu en koopt of verkoopt uit het geld van de speler
// (world.money, via noteMoney en het kasboek van de boerderij). Geen DOM en geen THREE (scripts/bezitlive_test.mjs).
//
// Samen spelen: bezit is per speler (#429); een koper stuurt een claim (bezitcoop.js) via de haak setClaimLookup/setClaimSend; zonder sessie is er geen claim.

import { KEYS } from './storagekeys.js';
import { sfxEvent } from './sfx/haken.js';
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
import { unlockAchievement, setStatMax } from './achievements.js';
import * as H from './holdingsmodel.js';
import { onParcelBought, onWorkerHired, deliverLine } from './bezitworldhooks.js';
import * as BZ from './business.js';
import * as SN from './snackvan.js';
import { currentStep } from './storyquery.js';
import { STEPS, PARTS } from './storyarc.js';
import * as SPT from './pitch.js';
import * as FX from './businessexclusion.js';
import * as EV from './bezitevents.js';
import { hireWorker, fireWorker, staffOf } from './farmstaff.js';
import * as AM from './areamarket.js';
import * as CH from './bezitchain.js';
import * as SC from './supplychain.js';
import * as NW from './bezitnews.js';
import * as HS from './housing.js';
import { herdsOf, infect, SPECIES, buyHerd, sellHerd, herdSellValue, cure } from './livestock.js';
import { MACHINE_CATALOGUS } from './percelen.js';
import { setAreaPrice, setYieldInfo } from './bezithooks.js';
import { recordService } from './reputationlive.js';
import * as CT from './chaintrucks.js'; // fillLinkPositions: een schakel zonder plek krijgt een terugvalplek
import * as PC from './parcelcare.js';  // stortbuiverzekering en bestrijding van mieren en wespen

const SCHRIJF_VERTRAGING_MS = 2000;
let bezit = null, opslagOverride = null, timer = 0, vuil = false, index = null, laden = null;
let claimLookup = () => null, claimSend = () => {};

const opslag = () => {
  if (opslagOverride !== null) return opslagOverride;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
};

// ---- de streek en woonplaats van een perceel (voor naam, bodem en prijs) ----
export const districtOfPoint = (x, y) => { const s = streekAt(x, y); return s ? s.id : 'overig'; };
const placeOfPoint = (x, y) => (index && index.parcels.placeAt(x, y)) || undefined;
const ctxOf = () => ({
  region: (id) => { const r = bezit && bezit.parcels[id]; return r && r.a ? districtOfPoint(r.a[0], r.a[1]) : 'overig'; },
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
  try { CH.packForSave(bezit); st.setItem(KEYS.bezit, JSON.stringify(Z.serializeBezit(bezit))); vuil = false; } catch (e) { devWarn('bezitlive', e); }
}
// Meteen naar de opslag, voor een levering van de boerderij aan de snackwagen (farmdelivery.js): bij mislukken een fout, zodat de levering blijft staan.
export function bewaarNu() { markeer(); schrijfNu(); if (vuil) throw new Error('bezit niet bewaard'); }
// Een haak die elke speldag meeloopt (farmdelivery.js maakt onderbroken leveringen af); bezitlive kent die module niet (geen kringverwijzing).
let dagHaak = null;
export const setDagHaak = (fn) => { dagHaak = typeof fn === 'function' ? fn : null; };
// Verandert als een pand gekocht of verkocht wordt (genoeg voor wie het pand van het bezit tekent: interieurkleuren van een net gekocht pand); zonder bezit 0.
export const bezitVersion = () => { try { return bezit ? bezit.buildings.size : 0; } catch (e) { return 0; } };
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
  setAreaPrice(areaPriceHook); setYieldInfo(yieldHook);                    // de streekmarkt en het opbrengstverlies voor de boerderij (bezithooks.js)
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
// Een haak voor extra omzetfactoren per pand en kalenderdag (sponsorpanden.js: thuiswedstrijddag); geeft de (eventueel aangepaste) event-mods terug.
let eventHook = (osm, mods) => mods;
export const setEventHook = (fn) => { eventHook = typeof fn === 'function' ? fn : (osm, mods) => mods; };
export function setIndexForTest(parcelFile, buildingFile = null) {
  index = { parcels: createParcelIndex(parcelFile), buildings: createBuildingIndex(buildingFile) };
  afterIndex();
  return index;
}
// Na het laden: een bezit dat naar een niet meer bestaand ID wijst terugdraaien (met terugbetaling), en de namen verversen met de echte woonplaats.
const indexListeners = new Set();
// Een haak voor wie op de index wacht (sponsorpanden.js: een sponsor aangenomen voor het laden); roept meteen aan als hij er al is. Geeft de afmelder terug.
export function onIndexReady(fn) {
  if (typeof fn !== 'function') return () => {};
  indexListeners.add(fn);
  if (index) { try { fn(index); } catch (e) { devWarn('bezitlive', e); } }
  return () => indexListeners.delete(fn);
}
function afterIndex() {
  for (const f of indexListeners) { try { f(index); } catch (e) { devWarn('bezitlive', e); } }
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

// De buren van een perceel: andere percelen binnen 300 m (hoogstens 40 geteld), hoeveel van jou en hoeveel van een medespeler (claim).
export const NEIGHBOUR_RADIUS = 300;
export function neighboursOf(parcels, p, b) {
  let n = 0, mine = 0, others = 0;
  for (const q of parcels.inRect(p.x - NEIGHBOUR_RADIUS, p.y - NEIGHBOUR_RADIUS, p.x + NEIGHBOUR_RADIUS, p.y + NEIGHBOUR_RADIUS, 41)) {
    if (q.id === p.id || Math.hypot(q.x - p.x, q.y - p.y) > NEIGHBOUR_RADIUS) continue;
    if (++n > 40) { n = 40; break; }
    if (Z.ownsParcel(b, q.id)) mine++; else if (claimLookup(q.id)) others++;
  }
  return { n, mine, others };
}
// Alles wat de perceelkaart nodig heeft over één perceel uit de index. null zonder index of onbekend ID.
export function parcelOffer(id) {
  if (!index) return null;
  const p = index.parcels.byId(id);
  if (!p) return null;
  const b = getBezit();
  const district = districtOfPoint(p.x, p.y);
  const place = placeOfPoint(p.x, p.y) || 'het Hogeland';
  const mine = Z.ownsParcel(b, id);
  const claim = mine ? null : claimLookup(id);
  const price = P.parcelPrice(p, district, Z.ownedCount(b));
  const soil = P.soilQuality(id, district);
  const neigh = neighboursOf(index.parcels, p, b);
  const rec = mine ? b.parcels[id] : null;
  return {
    neighbours: neigh, mode: rec ? rec.m : null, insured: !!(rec && Number.isFinite(rec.ins)),
    shape: index.parcels.shapeOf ? index.parcels.shapeOf(id) : null, // #1233: de echte omtrek voor het plaatje bovenaan de kaart (null: nog niet geladen)
    id, parcel: p, region: district, place, name: P.parcelName(p, place), seller: P.sellerName(p), kindName: P.KIND_NAME[p.kind],
    ha: p.ha, soil, soilWord: P.soilWord(soil), access: p.access, price, basePrice: P.basePrice(p, district),
    scaleNote: P.scaleFactor(Z.ownedCount(b)) > 1 ? `Schaalprijs x${P.scaleFactor(Z.ownedCount(b)).toFixed(2).replace('.', ',')}: wie veel land heeft, betaalt meer voor het volgende perceel.` : '',
    forSale: P.isForSale(p) && !mine && !claim, mine, claim,
    sellValue: mine ? P.sellValue((b.parcels[id] || {}).p || 0) : 0,
    herdValue: mine ? herdSellValue(herdsOf(b)[id]) : 0,         // de kudde op het perceel gaat mee naar de koper en wordt uitbetaald (verkoopPerceel)
    reason: mine ? 'Van jou' : claim ? `Van ${claim.name} (in deze sessie)` : !P.isForSale(p) ? 'Niet te koop: geen toegang tot een weg of pad' : '',
  };
}

export const bezitOpen = (branch = 'land') => branchOpen(branch);
export const bezitClosedText = (branch = 'land') => branchClosedText(branch);

// ---- kopen en verkopen ----
// Waarom een koop mislukt, in gewone woorden (voorheen "Kopen lukt nu niet" bij elke andere reden).
export const buyFailText = (r) => (r && r.why === 'te-weinig-geld' ? `Je mist nog ${euro(r.tekort)}.` : r && r.why === 'vol' ? 'Je hebt het maximum aan bezit bereikt. Verkoop eerst iets.' : r && r.why === 'al-van-jou' ? 'Dit is al van jou.' : 'Kopen lukt nu niet. Probeer het zo nog eens.');
export function koopPerceel(w, id) {
  if (coopEnsure) { try { coopEnsure(w); } catch (e) { devWarn('bezitlive', e); } }   // Samen spelen: het transport van de claims staat klaar voor de koop
  if (!branchOpen('land')) return { ok: false, why: 'dicht', text: branchClosedText('land') };
  const o = parcelOffer(id);
  if (!o) return { ok: false, why: 'onbekend', text: 'Dit perceel is niet gevonden.' };
  if (o.mine) return { ok: false, why: 'al-van-jou', text: 'Dit perceel is al van jou.' };
  if (o.claim) return { ok: false, why: 'geclaimd', text: o.reason };
  if (!o.forSale) return { ok: false, why: 'niet-te-koop', text: o.reason };
  const farm = getBoerderij();
  const money = Number.isFinite(w && w.money) ? w.money : 0;
  const r = PF.acquireParcel(getBezit(), farm, o.parcel, o.price, Math.floor(farm.uren / 24), money, { region: o.region, place: o.place });
  if (!r.ok) return { ...r, text: buyFailText(r) };
  noteMoney('Winkels'); w.money -= o.price;
  B.boek(farm, { kosten: o.price, post: 'aankoop' });
  sfxEvent(w, 'deed_stamp');   // SFX ronde 6: de akte wordt gestempeld (per speler: lokaal, een gast hoort het niet)
  claimSend({ id, action: 'claim' });
  markeer();
  try { achieve(w); } catch (e) { devWarn('bezitlive', e); }
  try { deliverLine(w, onParcelBought(getBezit(), o.region, Math.floor(farm.uren / 24))); } catch (e) { devWarn('bezitlive', e); }   // Tessa bij het eerste perceel per streek
  return { ok: true, cost: o.price, name: o.name, text: `${o.name} is van jou voor ${euro(o.price)}.` };
}
export function verkoopPerceel(w, id) {
  if (coopEnsure) { try { coopEnsure(w); } catch (e) { devWarn('bezitlive', e); } }
  const b = getBezit();
  const herd = herdSellValue(herdsOf(b)[id]);                       // een kudde op het perceel werd stil weggegeven: nu betaalt hij uit (zoals Vee verkopen)
  const r = Z.sellParcel(b, id);
  if (!r.ok) return { ...r, text: r.why === 'start' ? 'Dit startperceel verkoop je niet.' : 'Dit perceel is niet van jou.' };
  if (herd > 0) { r.refund += herd; delete herdsOf(b)[id]; }
  PF.syncFarmWithBezit(getBoerderij(), b, ctxOf(), 0);
  noteMoney('Verkoop'); w.money += r.refund;
  B.boek(getBoerderij(), { omzet: r.refund });
  claimSend({ id, action: 'release' });
  markeer();
  return { ok: true, refund: r.refund, herd, text: herd > 0 ? `Verkocht voor ${euro(r.refund)}, de kudde (${euro(herd)}) inbegrepen.` : `Verkocht voor ${euro(r.refund)}.` };
}

// ---- Samen spelen: de claim (bezitcoop.js haakt hier in) ----
let coopEnsure = null;
export const setCoopEnsure = (fn) => { coopEnsure = typeof fn === 'function' ? fn : null; };
export const setClaimLookup = (fn) => { claimLookup = typeof fn === 'function' ? fn : () => null; };
export const claimOfKey = (key) => claimLookup(key);          // de claim van een medespeler op een sleutel (perceel-id of 'sp:<plek>'), of null
export const sendClaim = (msg) => claimSend(msg);
export const setClaimSend = (fn) => { claimSend = typeof fn === 'function' ? fn : () => {}; };
// De ID-verzameling van je eigen bezit voor een gast die later aansluit: alleen de niet-legacy percelen.
export const ownedParcelIdsForNet = () => Object.keys(getBezit().parcels).filter((id) => !getBezit().parcels[id].lg);

export const heeftBezit = () => Z.ownedCount(getBezit()) > 0;
export function zetBezitVoorTest(raw, st) { bezit = raw ? Z.normalizeBezit(raw) : null; if (st !== undefined) opslagOverride = st; vuil = false; }

// ---- de kaartlaag Te koop (forsalemap.js): de dichtstbijzijnde diepte uit de live toestand ----
import { forSaleLayer } from './forsalemap.js';
const baseCache = new Map();                                            // basisprijs per ID: de streek rekent niet elk beeld opnieuw
const baseOf = (p) => { let v = baseCache.get(p.id); if (v === undefined) { v = P.basePrice(p, districtOfPoint(p.x, p.y)); baseCache.set(p.id, v); } return v; };
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
const TOWN_HOUSES = 1500;                                                // terugval als de index geen woningtelling heeft (oude bouw): een schatting
// Het aantal woningen komt uit de index (bezit_index.mjs telt ze per woonplaats; de stad Groningen is een schatting, zie docs/BEZIT-21-11.md hoofdstuk 14).
const housesAtPoint = (x, y) => { const h = index && index.parcels.housesAt ? index.parcels.housesAt(x, y) : null; return Number.isFinite(h) && h > 0 ? h : TOWN_HOUSES; };
const townOf = (x, y) => ({ id: placeOfPoint(x, y) || 'overig', name: placeOfPoint(x, y) || 'de plaats', houses: housesAtPoint(x, y) });
// De woningen om te kopen (housing.js): uit de plaatsenlijst van de index, per index één keer gebouwd.
const homeMarket = () => { if (!index) return null; if (!index.homes) index.homes = HS.createHomeMarket(index.parcels.places); return index.homes; };
// De rij van een pand: uit de pandindex, of een gesynthetiseerde woning (housing.js).
const rowOf = (osm) => { if (!index) return null; const r = index.buildings.byId(osm); if (r) return r; const m = HS.isHomeId(osm) ? homeMarket() : null; return m ? m.rowOf(osm) : null; };

// Het aanbod van een pand voor het menu: soort, prijs en of het te koop is (de uitsluitlijst geeft de reden).
export function buildingOffer(osm) {
  if (!index) return null;
  const row = rowOf(osm);
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
  if (!r.ok) return { ...r, text: buyFailText(r) };
  noteMoney('Winkels'); w.money -= r.cost;
  sfxEvent(w, 'deed_stamp');   // SFX ronde 6: de akte wordt gestempeld (per speler: lokaal)
  markeer();
  try { unlockAchievement(w, 'bz_winkel'); } catch (e) { devWarn('bezitlive', e); }
  return { ok: true, cost: r.cost, text: `Pand gekocht voor ${euro(r.cost)}.` };
}
export function verkoopPand(w, osm) {
  const r = Z.sellBuilding(getBezit(), osm);
  if (!r.ok) return { ...r, text: 'Dit pand is niet van jou.' };
  CH.pruneBindings(getBezit(), refInfo);
  noteMoney('Verkoop'); w.money += r.refund; markeer();
  return { ok: true, refund: r.refund, text: `Verkocht voor ${euro(r.refund)}.` };
}
// De bedrijven van de speler voor het menu: { osm, biz, kind, row, place } met de gegevens uit de pandindex als die er is.
export function myBusinesses() {
  const b = getBezit();
  return [...b.buildings].map((osm) => {
    const row = rowOf(osm);
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
  try { deliverLine(w, onWorkerHired(getBezit(), Math.floor(farm.uren / 24))); } catch (e) { devWarn('bezitlive', e); }
  return { ok: true, text: `${r.worker.name} is aangesteld.` };
}
export function ontslaArbeider(id) { const r = fireWorker(getBezit(), id); if (r && r.ok !== false) markeer(); return !!(r && r.ok !== false); }

// ---- vee op je weiland (#1101): kopen en verkopen met het geld van de speler; het bezit is per speler (#429) ----
// Verzekering en bestrijding (parcelcare.js): per perceel of voor een selectie. Alleen eigen percelen; een gast regelt zijn eigen bezit.
export function zetVerzekering(ids, on) {
  const r = PC.setInsurance(getBezit(), ids, on, calToday());
  if (r.done) markeer();
  return r;
}
export function bestrijd(w, ids, what) {
  const r = PC.treat(getBezit(), ids, what, calToday(), Number.isFinite(w && w.money) ? w.money : 0);
  if (r.done) { if (r.cost > 0) { noteMoney('Overige uitgaven'); w.money -= r.cost; } markeer(); }
  return r;
}
export function koopVee(w, id, sp) {
  const r = buyHerd(getBezit(), id, sp, Number.isFinite(w && w.money) ? w.money : 0);
  if (!r.ok) return { ok: false, text: r.why === 'te-weinig-geld' ? `Je mist nog ${euro(r.tekort)}.` : r.why === 'al-vee' ? 'Op dit perceel loopt al vee.' : r.why === 'niet-van-jou' ? 'Dit perceel is niet van jou.' : 'Dit vee past niet op dit perceel.' };
  noteMoney('Winkels'); w.money -= r.cost; markeer();
  return { ok: true, n: r.n, text: `${r.n} ${SPECIES[sp].naam.toLowerCase()} gekocht voor ${euro(r.cost)}.` };
}
// De dierenarts maakt een zieke kudde beter, tegen het bedrag van livestock.vetCost; per speler (#429).
export function belArts(w, id) {
  const r = cure(herdsOf(getBezit())[id], Number.isFinite(w && w.money) ? w.money : 0);
  if (!r.ok) return { ok: false, text: r.why === 'te-weinig-geld' ? `Je mist nog ${euro(r.tekort)}.` : 'Deze kudde is niet ziek.' };
  noteMoney('Winkels'); w.money -= r.cost; markeer();
  return { ok: true, text: `De dierenarts was er: ${euro(r.cost)}. De kudde is beter.` };
}
export function verkoopVee(w, id) {
  const r = sellHerd(getBezit(), id);
  if (!r.ok) return { ok: false, text: 'Hier loopt geen vee.' };
  noteMoney('Verkoop'); w.money += r.value; markeer();
  return { ok: true, text: `Je kudde is verkocht voor ${euro(r.value)}.` };
}

// ---- de klok: de kalenderdag van de wereld naast de dag van de boerderij ----
// De streekprijs en de gebeurtenissen rekenen met de gedeelde kalender (calendar.js, world.calendar.day) zodat medespelers dezelfde dag zien; de
// boerderij en het bezit tellen in hun eigen speldagen (uren / 24). dayTick legt de twee naast elkaar: de dag van de boerderij d is kalenderdag cal + (d - farm).
let clock = { cal: 0, farm: 0 };
const calDayOf = (w) => { const d = w && w.calendar && w.calendar.day; return Number.isFinite(d) && d >= 1 ? Math.floor(d) : 0; };
const calOf = (farmDay) => (clock.cal > 0 ? Math.max(1, clock.cal + (farmDay - clock.farm)) : Math.max(1, farmDay + 1));
export const calToday = () => calOf(Math.floor(getBoerderij().uren / 24));
const weekendDay = (cd) => { const wd = (cd + 4) % 7; return wd === 6 || wd === 0; };          // dag 1 is vrijdag 14 augustus

// De streekmarkt (areamarket.js) in bezit.x.market: één keer genormaliseerd, daarna in het geheugen.
const marketDone = new WeakSet();
function marketOf() { const b = getBezit(); if (!b.x.market || !marketDone.has(b.x.market)) { b.x.market = AM.normalizeMarket(b.x.market); marketDone.add(b.x.market); } return b.x.market; }
const setMarket = (m) => { getBezit().x.market = m; marketDone.add(m); };
// De haak voor elke levering van een oogst (boerderij.js leverVracht, farmstaff.js sellLoad): de prijs van de streek van het perceel op de kalenderdag,
// met de verzadiging door wat je levert en de veilingdag. Een gewas zonder streekprijs houdt de gewone dagprijs.
function areaPriceHook(gewas, kg, farmDay, veld, base) {
  if (!(AM.BASE_PRICE[gewas] > 0)) return base;
  const cd = calOf(farmDay), district = AM.districtOf(veld ? ctxOf().region(veld) : 'overig');
  const r = AM.deliver(marketOf(), district, gewas, kg, cd, EV.marketEventMult(gewas, cd));
  setMarket(r.market); markeer();
  return r.avgPrice;
}
// De haak voor het opbrengstverlies van een perceel op een speldag van de boerderij (bezitnews.js).
function lossMult(id, cd) {
  const rec = getBezit().parcels[id];
  return rec ? NW.lossOfParcel({ id, kind: rec.k, region: ctxOf().region(id) }, cd, { insured: PC.isInsured(rec, cd), treated: PC.treatedOf(rec, cd) }) : { mult: 1, text: '' };
}
const yieldHook = (veld, farmDay) => { const r = lossMult(veld, calOf(farmDay)); return { mult: r.mult, text: r.text }; };

// Het nieuws (bezit.x.news): één keer genormaliseerd; het zaad (voor de persoonlijke gebeurtenissen) komt uit je eerste perceel.
const newsDone = new WeakSet();
function newsOf() {
  const b = getBezit();
  if (!b.x.news || !newsDone.has(b.x.news)) { b.x.news = NW.normalizeNews(b.x.news); newsDone.add(b.x.news); }
  if (!b.x.news.seed) b.x.news.seed = (Object.keys(b.parcels).find((id) => !b.parcels[id].lg) || 'start').slice(0, 13).replace(/[^a-z0-9-]/g, '');
  return b.x.news;
}

// ---- de ketens: wat koppelbaar is en de omgeving voor bezitchain.js ----
// Wat een koppelbaar pand of de wagen is: { cls, type, x, y } of null als het niet (meer) van jou is.
function refInfo(ref) {
  const b = getBezit();
  if (typeof ref === 'string') { const id = ref.slice(2), s = b.mobile && b.mobile[id]; return s ? { cls: 'mobile', type: (BZ.MOBILE_TYPES[id] || { type: id }).type, x: 0, y: 0, mobile: true } : null; }
  if (!b.buildings.has(ref)) return null;
  const s = b.bstate[ref] || {}, row = rowOf(ref), k = row ? BZ.classifyBuilding(row, s.kind) : { cls: 'rent', type: s.kind || 'woning' };
  return { cls: BZ.SHOP_TYPES[s.kind] ? 'shop' : k.cls, type: s.kind || k.type, x: row ? row.x : 0, y: row ? row.y : 0, mobile: false };
}
const parcelPoint = (id) => { const r = getBezit().parcels[id]; const c = r && (r.c || r.a); return c ? { x: c[0], y: c[1] } : null; };
function chainEnv(rows) {
  const b = getBezit();
  return { rows, herds: herdsOf(b), loc: (ref) => { const i = refInfo(ref); return i && !i.mobile ? { x: i.x, y: i.y } : null; }, valid: (ref) => !!refInfo(ref), parcelLoc: parcelPoint,
    regionOf: districtOfPoint, spotOf: (ref) => ((getBezit().mobile[String(ref).slice(2)] || {}).cfg || {}).spot };
}
const ownedRows = (farm, b) => H.holdingRows(b, farm, { regionOf: (id) => ctxOf().region(id) });

// De ketens van de dag(en) from+1 tot en met last: bron uit je percelen en vee, de eigen schakels, de streekprijs. Geeft { bonus, closed }.
function tickChains(w, farm, from, last, rows) {
  const b = getBezit(), chains = CH.chainsOf(b);
  let market = marketOf(), bonus = 0, closed = false;
  const base = chainEnv(rows);
  for (let d = from + 1; d <= last; d++) {
    const cd = calOf(d);
    market = AM.advanceMarket(market, cd);
    for (const id of SC.CHAIN_IDS) {
      const e = chains[id];
      const src = CH.sourceKgPerDay(e.chain.raw, rows, base.herds, e.bind.p, () => 0);
      if (!(src.kg > 0) && !e.chain.links.some((l) => l.stock > 0)) continue;
      const r = CH.stepEntry(e, { ...base, market, calDay: cd, lossOf: (pid) => 1 - lossMult(pid, cd).mult, eventMult: (p) => EV.marketEventMult(p, cd) * SN.warPriceMult(snackState(), p, cd) });
      chains[id] = r.entry; market = r.market; bonus += r.bonus;
      if (r.closed) closed = true;
    }
  }
  setMarket(market);
  if (closed) { try { unlockAchievement(w, 'bz_keten'); } catch (e) { devWarn('bezitlive', e); } }
  return { bonus: Math.round(bonus), closed };
}

// De gebeurtenissen van de dag(en): opbrengstverlies zit al in de haken; hier de pech, het vee, de inspectie, de koeling en de buren. Geeft { money, lines }.
function tickNews(w, farm, from, last, rows) {
  const b = getBezit(), news = newsOf(), herds = herdsOf(b), chains = CH.chainsOf(b);
  const districts = [...new Set([...Object.keys(b.parcels).map((id) => ctxOf().region(id)), ...myBusinesses().map((m) => (m.row ? districtOfPoint(m.row.x, m.row.y) : 'overig'))])];
  const machines = ((farm.bedrijf.machinepark || {}).machines || []).filter((m) => m.slijtage > 70 && MACHINE_CATALOGUS[m.type]).map((m) => ({ id: m.uid, name: MACHINE_CATALOGUS[m.type].naam, wear: m.slijtage, price: MACHINE_CATALOGUS[m.type].koop }));
  const herdList = Object.keys(herds).map((id) => { const h = herds[id], rec = b.parcels[id], sp = SPECIES[h.sp]; return { id, kind: h.sp, count: h.n, perHa: rec && rec.ha > 0 ? h.n / rec.ha : 0, refPerHa: sp && sp.perHa > 0 ? sp.perHa : Infinity }; });
  const cooled = Object.values(chains).filter((e) => Object.keys(e.bind.l).some((k) => refInfo(e.bind.l[k])));          // een keten met minstens één eigen schakel heeft een koeling
  const audit = NW.auditState({ businesses: myBusinesses().map((m) => m.biz), rows, hasStaff: staffOf0().workers.length > 0 });
  const out = { money: 0, lines: [] };
  for (let d = from + 1; d <= last; d++) {
    const cd = calOf(d);
    const r = NW.processDay(news, cd, { regions: districts, seed: news.seed, machines, herds: herdList, audit,
      buildings: cooled.map((e) => ({ id: e.chain.name, stock: Object.fromEntries(e.chain.links.filter((l) => l.in).map((l) => [l.in, l.stock])) })) });
    out.money += r.money; out.lines.push(...r.lines);
    for (const id of r.infect) if (herds[id]) infect(herds[id]);
    for (const uid of r.breakdown) { const m = farm.bedrijf.machinepark.machines.find((x) => x.uid === uid); if (m) m.slijtage = 100; }
    for (const c of r.cooling) { const e = cooled.find((x) => x.chain.name === c.asset); if (e) for (const l of e.chain.links) if (l.in && c.lost[l.in]) l.stock = Math.max(0, l.stock - c.lost[l.in]); }
  }
  return out;
}
const staffOf0 = () => staffOf(getBezit());

// ---- het mobiele bedrijf: de frietwagen ----
const mobileBiz = (id) => { const s = getBezit().mobile[id], d = BZ.MOBILE_TYPES[id]; return s && d ? { id, type: d.type, cls: 'mobile', m2: 0, p: s.p, base: 0, q: s.q, cfg: BZ.normalizeCfg({ ...s.cfg }) } : null; };
export function myMobile() {
  const b = getBezit();
  return BZ.MOBILE_IDS.filter((id) => b.mobile && b.mobile[id]).map((id) => { const biz = mobileBiz(id), d = BZ.MOBILE_TYPES[id], spot = (biz.cfg.spot && BZ.MOBILE_SPOTS[biz.cfg.spot]) || BZ.MOBILE_SPOTS.park; return { id, def: d, biz, spot: biz.cfg.spot || 'park', spotLabel: spot.label, value: BZ.marketValue(biz), forecast: BZ.forecast(biz, { day: Math.floor(getBoerderij().uren / 24), owned: 1 }) }; });
}
export function mobileOffers() { const b = getBezit(); return BZ.MOBILE_IDS.filter((id) => !(b.mobile && b.mobile[id])).map((id) => ({ id, ...BZ.MOBILE_TYPES[id] })); }
export function koopMobiel(w, id) {
  if (!branchOpen('business')) return { ok: false, why: 'dicht', text: branchClosedText('business') };
  const r = BZ.buyMobile(getBezit(), id, Math.floor(getBoerderij().uren / 24), Number.isFinite(w && w.money) ? w.money : 0);
  if (!r.ok) return { ...r, text: r.why === 'te-weinig-geld' ? `Je mist nog ${euro(r.tekort)}.` : r.why === 'al-van-jou' ? 'Deze wagen is al van jou.' : 'Kopen lukt nu niet.' };
  noteMoney('Winkels'); w.money -= r.cost; markeer();
  return { ok: true, cost: r.cost, text: `De ${BZ.MOBILE_TYPES[id].label.toLowerCase()} is van jou voor ${euro(r.cost)}.` };
}
// De wagen als cadeau (de verhaal-epic: Tessa en Tammo beginnen met een frietwagen): zonder kosten en zonder prijs te raken. Slaagt niet als je hem al hebt.
export function schenkMobiel(id = 'frietwagen') {
  const b = getBezit(), d = BZ.MOBILE_TYPES[id];
  if (!d || (b.mobile && b.mobile[id])) return false;
  if (!b.mobile) b.mobile = {};
  b.mobile[id] = { p: d.price, t: Math.floor(getBoerderij().uren / 24), q: 100, gift: true, cfg: { pr: 1, hr: 10, spot: 'park' } };
  markeer();
  return true;
}
export function verkoopMobiel(w, id) {
  const r = BZ.sellMobile(getBezit(), id);
  if (!r.ok) return { ...r, text: 'Deze wagen is niet van jou.' };
  CH.pruneBindings(getBezit(), refInfo);
  noteMoney('Verkoop'); w.money += r.refund; markeer();
  return { ok: true, refund: r.refund, text: `Verkocht voor ${euro(r.refund)}.` };
}
export function setPitch(id, spot) {
  const b = getBezit();
  if (!b.mobile[id] || !BZ.MOBILE_SPOTS[spot]) return { ok: false, text: 'Die standplaats bestaat niet.' };
  b.mobile[id].cfg = { ...b.mobile[id].cfg, spot }; markeer();
  return { ok: true, text: `Je staat nu op ${BZ.MOBILE_SPOTS[spot].label}${BZ.MOBILE_SPOTS[spot].needsEvent ? ': alleen op een kermisdag drukker' : ''}.` };
}
export function renoveerMobiel(w, id) {
  const biz = mobileBiz(id);
  if (!biz) return { ok: false, text: 'Deze wagen is niet van jou.' };
  const r = BZ.renovate(biz, w.money || 0);
  if (!r.ok) return { ok: false, text: r.why === 'al-in-orde' ? 'Deze wagen is al in orde.' : `Je mist nog ${euro(r.tekort || 0)}.` };
  noteMoney('Overige uitgaven'); w.money -= r.cost; BZ.storeBiz(getBezit(), r.biz); markeer();
  return { ok: true, text: `Gerenoveerd voor ${euro(r.cost)}.` };
}

// ---- woningen in de buurt (housing.js) ----
// De koopbare woningen rond een punt, met aanbod zoals buildingsNear.
export function homesNear(x, y, max = 4) {
  const m = homeMarket();
  if (!m) return [];
  return m.near(x, y, getBezit().buildings, max).map((row) => ({ ...buildingOffer(row.osm), dist: Math.round(Math.hypot(row.x - x, row.y - y)) })).filter((o) => o.osm);
}
// Het verhuurbeeld van een woning: verhuurd of leeg (tot welke speldag) en de huur per speldag bij het onderhoud van nu.
export function rentView(biz, day) {
  if (!biz || biz.cls !== 'rent') return null;
  const vu = Number(biz.cfg && biz.cfg.vu) || 0;
  const rate = BZ.RENT_RATES[biz.type] || BZ.RENT_RATES.woning;
  const per = Math.round((biz.base > 0 ? biz.base : biz.p) * rate * BZ.maintenanceFactor(biz.q));
  return { empty: vu > day, until: vu, rentDay: per, text: vu > day ? `Leeg: een nieuwe huurder wordt gezocht (tot dag ${vu}).` : `Verhuurd: ${euro(per)} per speldag.` };
}

// ---- de dagtik: personeel, pacht, vee, bedrijven, ketens, gebeurtenissen en belasting per speldag ----
// Elk beeld aangeroepen (goedkoop: werkt alleen als de speldag veranderd is). Het geld gaat via world.money met noteMoney.
let lastReport = null;
export const takeDayReport = () => { const r = lastReport; lastReport = null; return r; };
// Een tak die opengaat krijgt een berichtje van het verzonnen Notariaat De Zegelhoek (#1099), eenmaal per tak en per speler (bezit.x.told). Alleen tekst.
export const UNLOCK_NOTES = {
  land: 'Notariaat De Zegelhoek: "Uw eerste akte ligt klaar. Op de kaart staan nu percelen te koop."',
  business: 'Notariaat De Zegelhoek: "Ook panden en winkels staan voor u klaar. Kijk bij Land en bedrijf."',
};
export function unlockNotes(told, open) {
  const out = [];
  for (const k of Object.keys(UNLOCK_NOTES)) if (open(k) && !told.includes(k)) out.push(k);
  return out;
}
const NO_FRESH = Object.freeze([]);
// Alles al verteld? Dan is er niets te melden en vragen we de poort niet (dayTick loopt elk beeld; de poort rekent per vraag de verhaalstand uit).
const allTold = (told) => { if (!Array.isArray(told)) return false; for (const k in UNLOCK_NOTES) if (!told.includes(k)) return false; return true; };
export function announceUnlocks(w) {
  const b = getBezit();
  if (allTold(b.x.told)) return NO_FRESH;
  const told = Array.isArray(b.x.told) ? b.x.told.filter((k) => typeof k === 'string').slice(0, 8) : [];
  const fresh = unlockNotes(told, branchOpen);
  if (!fresh.length) return NO_FRESH;
  b.x.told = told.concat(fresh);
  if (w && typeof w.addMessage === 'function') for (const k of fresh) w.addMessage(UNLOCK_NOTES[k], 6, { kind: 'tip', key: `bz-open-${k}` });
  markeer();
  return fresh;
}
// Heeft de speler iets dat meetelt (percelen, panden, een wagen)? Zonder tijdelijke arrays: dayTick vraagt het elk beeld.
function hasHoldings(b) {
  if (b.buildings.size) return true;
  let n = 0;
  for (const id in b.parcels) { if (!b.parcels[id].lg) return true; if (++n > 1) return true; }
  if (b.mobile) for (const id in b.mobile) return true;
  return SN.isActive(snackState());
}
export function dayTick(w) {
  const b = getBezit(), farm = getBoerderij();
  announceUnlocks(w);
  if (dagHaak) { try { dagHaak(w); } catch (e) { devWarn('bezitlive', e); } }
  const day = Math.floor(farm.uren / 24);
  clock.cal = calDayOf(w); clock.farm = day;
  if (!hasHoldings(b)) { b.x.lastDay = day; return null; }
  if (!Number.isFinite(b.x.lastDay)) { b.x.lastDay = day; return null; }                       // een bezit zonder vastgelegde dag begint vandaag te tellen
  const from = b.x.lastDay;
  if (day <= from) return null;
  const money = Number.isFinite(w && w.money) ? w.money : 0;
  const rep = H.advanceDays(b, farm, day, { money, deliver: 'sell' });
  const incF = P.difficultyFactor('income'), dI = (x) => (x > 0 ? x * incF : x);          // moeilijkheid (bezitdifficulty.js): alleen wat binnenkomt schaalt, kosten niet
  let net = dI(rep.net), bizNet = 0, tax = 0;
  const last = Math.min(day, from + 60);
  for (const m of myBusinesses()) {
    const x = m.row ? m.row.x : 0, y = m.row ? m.row.y : 0, district = districtOfPoint(x, y);
    const res = BZ.settleDays(m.biz, from, last, (d) => ({ day: d, town: townOf(x, y), owned: Z.ownedCount(b), sameType: 0, event: eventHook(m.osm, EV.businessMods(m.biz, district, calOf(d)), calOf(d)) }));
    BZ.storeBiz(b, res.biz); bizNet += res.sum.net; tax += res.sum.tax;
  }
  let mobNet = 0;
  const SS = snackState(), snackOn = SN.isActive(SS);
  for (const id of Object.keys(b.mobile || {})) {            // de snackwagen (id frietwagen): omzet naar standplaats, weekend en kermis (business.js)
    if (snackOn && id === 'frietwagen') continue;             // met standplaatsen rekent snackvan.js de wagen af (Snackimperium)
    const biz = mobileBiz(id);
    if (!biz) continue;
    const spotDistrict = CH.SPOT_DISTRICT[biz.cfg.spot] || 'overig';
    const res = BZ.settleDays(biz, from, last, (d) => { const cd = calOf(d), fest = EV.festivalOn(spotDistrict, cd); return { day: d, owned: Z.ownedCount(b) + 1, kermis: !!(fest && fest.kermis), weekend: weekendDay(cd), event: EV.businessMods(biz, spotDistrict, cd) }; });
    BZ.storeBiz(b, res.biz); mobNet += res.sum.net; tax += res.sum.tax;
  }
  bizNet += mobNet;
  net += dI(bizNet);
  const rows = ownedRows(farm, b);
  const ch = tickChains(w, farm, from, last, rows);
  net += dI(ch.bonus);
  const sn = snackOn ? tickSnack(w, SS, from, last, money) : { own: 0, passive: 0, fixed: 0, lines: [] };
  sn.own = dI(sn.own); sn.passive = dI(sn.passive);
  net += sn.passive;                                                                             // wat de medewerkers in de wagens verdienen is passief: onder dezelfde rem
  const ev = tickNews(w, farm, from, last, rows);
  if (net > 0) { const dd = Math.max(1, last - from); net = P.compressPassive(net / dd) * dd; }   // de rem op passief inkomen (bezitprijs.js)
  net += sn.own + sn.fixed;                                                                       // de wagen die je zelf runt heeft zijn eigen plafond (snackvan.js compressOwn); vergunningen zijn kosten
  net += ev.money;                                                                                // een boete of de dierenarts is geen passief inkomen: geen rem
  const premium = Math.round(PC.premiumBetween(b, from, last, calOf));                            // de premie van de stortbuiverzekering is een kost per speldag
  net -= premium;
  if (net !== 0) { noteMoney(net > 0 ? 'Winkels' : 'Overige uitgaven'); w.money = Math.max(0, (w.money || 0) + net); }
  if (w && typeof w.addMessage === 'function') for (const t of ev.lines.slice(-3).concat(sn.lines.slice(-2))) w.addMessage(t, 5, { kind: 'tip', key: 'bz-nieuws' });
  markeer();
  lastReport = { from: from + 1, to: day, days: rep.days, parcels: Math.round(rep.net), business: Math.round(bizNet), mobile: Math.round(mobNet), snack: Math.round(sn.own + sn.passive + sn.fixed), chains: ch.bonus, eventMoney: Math.round(ev.money), news: ev.lines.length, premium, net: Math.round(net), tax: Math.round(tax), events: rep.events, worked: rep.staff.worked || [] };
  return lastReport;
}

// ---- de snackwagen: Snackimperium (snackvan.js, pitch.js, rival.js; epic #1102) ----
// De toestand zit in bezit.x.snack (per speler, #429) en wordt bij het eerste gebruik genormaliseerd.
const snackDone = new WeakSet();
export function snackState() {
  const b = getBezit();
  if (!b.x.snack || !snackDone.has(b.x.snack)) { b.x.snack = SN.normalizeSnack(b.x.snack); snackDone.add(b.x.snack); }
  return b.x.snack;
}
// Hoeveel van wat in het menu zit uit je eigen keten komt (0 tot 1): friet en kaas als de verwerker van jou is en de bron levert (elk de helft), melk uit de bron van de kaasketen.
// Vlees heeft geen eigen keten in het spel (geen vleesvee): altijd 0.
export function snackChainOwner(views = null) {
  const v = views || chainViews();
  const by = (id) => v.find((c) => c.id === id);
  // alleen als de keten het levert: de verwerker van jou moet voorraad hebben (anders geen korting) en de bron moet leveren
  const level = (c) => (c ? (c.links.some((l) => l.role === 'processor' && l.owned && l.stock > 0) ? 0.5 : 0) + (c.sourceCount > 0 ? 0.5 : 0) : 0);
  return (p) => (p === 'friet' ? level(by('friet')) : p === 'kaas' ? level(by('kaas')) : p === 'melk' ? ((by('kaas') || {}).sourceCount > 0 ? 0.5 : 0) : 0);
}
export const weekendOf = (cd) => weekendDay(cd);
export const kermisAtOn = (cd) => snackCal(cd).kermisAt;
const snackCal = (cd) => ({ weekend: weekendDay(cd), kermisAt: (s) => { const d = SPT.spotDef(s), f = d ? EV.festivalOn(d.region, cd) : null; return !!(f && f.kermis); } });
// De akte van de huidige verhaalstap (jellebaas.js); na het einde de laatste akte (Jelle trok zijn offerte terug); null zonder verhaal.
const storyPartNow = () => { const c = currentStep(); if (c && c.end) return PARTS[c.end] ? c.end : null; const st = c ? STEPS.find((x) => x.id === c.id) : null; return st ? st.part : null; };
// Een of meer dagen: geeft { own, passive, fixed, lines } (eigen wagen na compressOwn, medewerkers ruw voor de rem, vergunningen als min) en schrijft het onderhoud van de wagen terug.
function tickSnack(w, S, from, last, money) {
  const b = getBezit(), ownBiz = mobileBiz('frietwagen'), chainOwn = snackChainOwner(), had = Object.keys(S.permits);
  const res = SN.settleDays(S, from, last, (d) => { const cd = calOf(d); return { day: cd, part: storyPartNow(), ...snackCal(cd), money, ownWagon: !!ownBiz, ownQ: ownBiz ? ownBiz.q : 100, chainOwn, taken: (id) => !!claimLookup('sp:' + id) }; });
  if (ownBiz && res.sum.ownQ !== null) b.mobile.frietwagen.q = res.sum.ownQ;
  for (const id of had) if (!S.permits[id]) claimSend({ id: SPT.claimKey(id), action: 'release' });      // een vervallen vergunning geeft de plek in de sessie vrij
  for (const prod of ['friet', 'kaas']) {                  // het menuverbruik gaat van de voorraad van je eigen verwerker af (alleen als die van jou is en levert)
    const kg = res.sum.usage[prod], e = CH.chainsOf(b)[prod], link = e && e.chain.links.find((l) => l.role === 'processor');
    if (kg > 0 && link && link.owned && link.stock > 0) link.stock = Math.max(0, link.stock - kg);
  }
  const inc = SN.incomeOf(res.sum);
  try { recordService({ days: res.sum.days, served: res.sum.ownNet > 0 || res.sum.fleetNet > 0, sat: S.gw.sat }); } catch (e) { devWarn('bezitlive', e); }
  const held = SPT.heldIds(S.permits, calToday()).length;
  try {
    if (S.own.spot && ownBiz) unlockAchievement(w, 'bz_snack_eerste');
    setStatMax(w, 'bzStandplaatsen', held);
    if (SN.goalStatus(S, { day: calToday() }).find((g) => g.id === 'usmem').done) unlockAchievement(w, 'bz_usmem');
  } catch (e) { devWarn('bezitlive', e); }
  try { if (snackAfterTick) snackAfterTick(w, S); } catch (e) { devWarn('bezitlive', e); }       // een rang omhoog na deze dagen (snacklive.checkRank, #1378)
  return { own: inc.own, passive: inc.passiveRaw, fixed: inc.fixed, lines: res.sum.lines };
}
let snackAfterTick = null;
export const setSnackAfterTick = (fn) => { snackAfterTick = typeof fn === 'function' ? fn : null; };

// ---- het nieuws en de keuze van de buurman ----
export function newsView(w) {
  const news = newsOf(), b = getBezit();
  const districts = [...new Set(Object.keys(b.parcels).map((id) => ctxOf().region(id)))];
  return { lines: news.lines.slice(0, NW.MAX_LINES), scene: NW.sceneView(news), goodwill: news.goodwill, pull: NW.pullOffers(districts, calToday()), day: calToday() };
}
export function kiesBuur(w, choiceId) {
  const news = newsOf(), r = NW.chooseNeighbor(news, choiceId, Number.isFinite(w && w.money) ? w.money : 0);
  if (!r.ok) return { ...r, text: r.why === 'te-weinig-geld' ? `Je mist nog ${euro(r.tekort)}.` : 'Daar is niets meer over te zeggen.' };
  if (r.cost > 0) { noteMoney('Overige uitgaven'); w.money -= r.cost; }
  markeer();
  return r;
}

// ---- de streekmarkt: het bord Prijzen vandaag per streek ----
export const marketProducts = () => AM.PRODUCTS.slice();
export function priceBoard(product) {
  const cd = calToday();
  return { day: cd, ...AM.marketBoard(marketOf(), product, cd, EV.marketEventMult(product, cd)), auction: EV.auctionDay(cd) };
}

// ---- het ketenscherm ----
export function chainViews() {
  const b = getBezit(), farm = getBoerderij(), rows = ownedRows(farm, b), env = chainEnv(rows), cd = calToday();
  const entries = CH.chainsOf(b);
  return SC.CHAIN_IDS.map((id) => {
    const v = CH.viewOf(entries[id], { ...env, lossOf: (pid) => 1 - lossMult(pid, cd).mult });
    return { ...v, raw: entries[id].chain.raw, output: entries[id].chain.output, region: CH.outletDistrict(entries[id], env), sources: chainSources(id, rows).slice(0, 12), links: v.links.map((l) => ({ ...l, options: l.ownable ? chainOptions(id, l.id) : [] })) };
  });
}
// Voor de zichtbare ketenwagens (chaintrucks.js): per keten de schakels met het aantal wagens, de afstand, wat er vandaag verplaatst is en waar de schakel ligt
// (de bron: het eerste gekozen perceel of anders het eerste bronperceel; de schakel: het gekoppelde pand of de standplaats van de gekoppelde wagen). Goedkoop, geen opslag.
export function chainTruckInput(views = null) {
  const out = [], b = getBezit();
  for (const c of views || chainViews()) {
    if (!c.links.some((l) => l.trucks > 0)) continue;
    out.push({ id: c.id, links: CT.fillLinkPositions(c.id, c.links.map((l, i) => {
      let pos = null;
      if (i === 0) { const src = c.sources.find((x) => x.picked) || c.sources[0]; pos = src ? parcelPoint(src.id) : null; }
      else if (l.ref) {
        if (typeof l.ref === 'string') { const sp = ((b.mobile[l.ref.slice(2)] || {}).cfg || {}).spot; pos = sp && SPT.isSpot(sp) ? SPT.spotXY(sp) : null; }
        else { const i2 = refInfo(l.ref); pos = i2 && !i2.mobile ? { x: i2.x, y: i2.y } : null; }
      }
      return { id: l.id, trucks: l.trucks, moved: l.moved, distance: l.distance, pos };
    })) });
  }
  return out;
}
// De eigen panden en wagens die bij een schakel passen: [{ ref, label }].
export function chainOptions(chainId, linkId) {
  const b = getBezit(), link = CH.chainsOf(b)[chainId].chain.links.find((l) => l.id === linkId);
  if (!link) return [];
  const out = [];
  for (const m of myBusinesses()) { const i = refInfo(m.osm); if (i && CH.fits(chainId, link, i)) out.push({ ref: m.osm, label: `${m.kind.type} bij ${m.place}` }); }
  for (const m of myMobile()) { const i = refInfo(`m:${m.id}`); if (i && CH.fits(chainId, link, i)) out.push({ ref: `m:${m.id}`, label: `${m.def.label} (${m.spotLabel})` }); }
  return out;
}
// De percelen en kuddes die als grondstof voor een keten in aanmerking komen: [{ id, name, kg, picked }].
export function chainSources(chainId, rows0 = null) {
  const b = getBezit(), farm = getBoerderij(), e = CH.chainsOf(b)[chainId], rows = rows0 || ownedRows(farm, b), herds = herdsOf(b);
  const all = CH.sourceKgPerDay(e.chain.raw, rows, herds, [], () => 0);
  return all.ids.map((id) => { const one = CH.sourceKgPerDay(e.chain.raw, rows, herds, [id], () => 0); const row = rows.find((r) => r.id === id); return { id, name: row ? row.name : id, kg: one.kg, picked: e.bind.p.includes(id) }; });
}
export function koppelSchakel(chainId, linkId, ref) {
  const r = CH.bindLink(getBezit(), chainId, linkId, typeof ref === 'string' && /^\d+$/.test(ref) ? Number(ref) : ref, refInfo);
  if (r.ok) markeer();
  return { ...r, text: r.ok ? 'Gekoppeld: deze schakel is nu van jou en telt voor de marge.' : r.why === 'past-niet' ? 'Dit pand past niet bij deze schakel.' : r.why === 'niet-van-jou' ? 'Dit pand is niet van jou.' : 'Koppelen lukt niet.' };
}
export function ontkoppelSchakel(chainId, linkId) { const ok = CH.unbindLink(getBezit(), chainId, linkId); if (ok) markeer(); return { ok, text: ok ? 'Losgekoppeld.' : 'Er was niets gekoppeld.' }; }
export function kiesBron(chainId, id) { const ok = CH.toggleSourceParcel(getBezit(), chainId, id); if (ok) markeer(); return { ok, text: ok ? 'Bron bijgewerkt.' : 'Dat lukt niet.' }; }
// Een wagen met chauffeur erbij (+1) of weg (-1) tussen deze schakel en de volgende; de chauffeur kost per speldag loon (supplychain.js).
export function adjustWagons(chainId, linkId, delta) {
  const e = CH.chainsOf(getBezit())[chainId];
  if (!e) return { ok: false, text: 'Die keten bestaat niet.' };
  const r = delta > 0 ? SC.addTruck(e.chain, linkId) : SC.removeTruck(e.chain, linkId);
  if (!r.ok) return { ok: false, text: delta > 0 ? 'Er kunnen niet meer wagens bij.' : 'Er staat geen wagen.' };
  e.chain = r.chain; markeer();
  return { ok: true, text: delta > 0 ? `Een wagen met chauffeur erbij: ${euro(SC.DRIVER_WAGE)} per speldag.` : 'Een wagen minder.' };
}
export const UPGRADE_STEP = 0.25, UPGRADE_COST = 800;       // doorvoer en buffer van een eigen schakel +25% van de basis, tot viermaal
export function schakelUitbreiden(w, chainId, linkId) {
  const e = CH.chainsOf(getBezit())[chainId], def = SC.CHAIN_DEFS[chainId], l = e && e.chain.links.find((x) => x.id === linkId), d0 = def && def.links.find((x) => x.id === linkId);
  if (!l || !d0 || !l.ownable || !e.bind.l[linkId] || !refInfo(e.bind.l[linkId])) return { ok: false, text: 'Alleen een eigen schakel kun je uitbreiden.' };
  if (l.perDay >= d0.perDay * 4 - 1e-9) return { ok: false, text: 'Dit is al de grootste maat.' };
  if (!((w.money || 0) >= UPGRADE_COST)) return { ok: false, text: `Je mist nog ${euro(UPGRADE_COST - (w.money || 0))}.` };
  noteMoney('Overige uitgaven'); w.money -= UPGRADE_COST;
  l.perDay = Math.min(d0.perDay * 4, Math.round(l.perDay + d0.perDay * UPGRADE_STEP)); l.cap = Math.min(d0.cap * 4, Math.round(l.cap + d0.cap * UPGRADE_STEP)); markeer();
  return { ok: true, text: `Uitgebreid voor ${euro(UPGRADE_COST)}: doorvoer ${l.perDay} kg per speldag.` };
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

// Een standplaats waar een medespeler net eerder was (claim 'sp:<plek>'): je vergunning gaat terug, je wagen staat weer thuis en je krijgt wat je betaalde terug; nooit verlies.
export function releaseLostSpot(w, key) {
  const spot = SPT.spotOfClaim(key), S = snackState();
  if (!spot || !S.permits[spot]) return { ok: false };
  const refund = S.permits[spot].paid;
  delete S.permits[spot];
  if (S.own.spot === spot) S.own.spot = null;
  for (const f of S.fleet) if (f.spot === spot) f.spot = null;
  noteMoney('Verkoop'); w.money += refund; markeer();
  return { ok: true, refund, text: 'Een medespeler was net eerder bij die standplaats: je geld is terug.' };
}

// Samen spelen aanzetten voor deze sessie: claims bijhouden en doorsturen via send(msg) (het transport staat in de netlaag, nog te koppelen aan een EXTRA-bericht).
// Geeft { receive(w, msg), snapshot(), drop(id), stop() }; zonder sessie blijft alles in je eigen spel.
import { createClaims, PARCEL_RE } from './bezitcoop.js';
import { devWarn } from './devwarn.js';
export function attachCoop(w, selfId, name, color, send) {
  const claims = createClaims(selfId);
  // Wat je al bezat vóór de sessie telt als eigen claim (review 22-11, B5): in de snapshot voor het hello, en zodat een medespeler het niet in deze sessie van je koopt.
  // Tijd 0: wat je al had gaat voor op alles wat tijdens de sessie wordt gekocht. Het blijft van jou in je eigen spel: een medespeler die hetzelfde perceel ook al had,
  // laat je het niet verliezen en je krijgt er niets voor terug (preowned).
  const preowned = new Set();
  try {
    for (const id of Z.parcelIds(getBezit())) { const p = getBezit().parcels[id]; if (p && !p.lg && PARCEL_RE.test(id)) { claims.apply({ id, action: 'claim', from: selfId, name, color, t: 0 }); preowned.add(id); } }
    for (const spot of SPT.heldIds(snackState().permits, calToday())) { const key = SPT.claimKey(spot); claims.apply({ id: key, action: 'claim', from: selfId, name, color, t: 0 }); preowned.add(key); }
  } catch (e) { devWarn('bezitlive', e); }
  setClaimLookup((id) => claims.lookup(id));
  const announce = (m, t = Date.now()) => { const full = { ...m, from: selfId, name, color, t }; claims.apply(full); if (m.action === 'release') preowned.delete(m.id); if (typeof send === 'function') send(full); return full; };
  setClaimSend((m) => announce(m));
  if (w) w.bezitClaims = () => claims.list();
  return {
    claims,
    announce,                                                              // een claim of loslating van deze speler melden (met een eigen tijd voor tests)
    receive(world, msg) { const r = claims.apply(msg); if (r.lost && preowned.has(msg.id)) r.lost = false; if (r.lost) { const b = SPT.spotOfClaim(msg.id) ? releaseLostSpot(world, msg.id) : releaseLostClaim(world, msg.id); if (b.ok && world.addMessage) world.addMessage(b.text, 4); } return r; },
    snapshot: () => claims.snapshot(),
    drop: (id) => claims.drop(id),
    stop() { setClaimLookup(null); setClaimSend(null); claims.clear(); if (w) w.bezitClaims = null; },
  };
}

// Prestaties na een koop: het eerste perceel, tien tegelijk en land in alle acht de streken (cheats en geschenken tellen niet: alleen een echte koop komt hier).
function achieve(w) {
  const b = getBezit();
  const own = Object.keys(b.parcels).filter((id) => !b.parcels[id].lg);
  if (own.length) unlockAchievement(w, 'bz_perceel');
  setStatMax(w, 'bzPercelen', own.length);
  const districts = new Set(own.map((id) => { const r = b.parcels[id]; return r.c ? districtOfPoint(r.c[0], r.c[1]) : 'overig'; }));
  districts.delete('overig');
  setStatMax(w, 'bzStreken', districts.size);
}
