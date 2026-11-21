// De koppeling van de productieketens aan het bezit (epic #1095, #1103; ontwerp docs/BEZIT-21-11.md 5.6): wat jouw percelen en je vee als grondstof leveren,
// welke van je panden (of de frietwagen) een schakel zijn, de opslag per keten in bezit.x.chains en de dagtik met de streekprijs van areamarket.js en het
// opbrengstverlies van bezitevents.js. supplychain.js rekent de keten zelf; dit bestand verbindt hem met het spel. Puur: geen DOM, geen THREE, geen klok,
// geen opslag (de opslag is bezit.x) en geen Math.random (scripts/bezitchain_test.mjs).
//
// Wat een keten oplevert is alleen het EXTRA: de oogst en de melk worden al tegen de gewone prijs verkocht door personeel, pacht en vee (holdingsmodel.js).
// De keten betaalt daarom de gesloten-keten-marge, de streekprijs van het eindproduct en de transportkosten, min wat dezelfde kilo's als grondstof al
// hadden opgebracht (zie bonusOf). Zonder een eigen schakel is er geen marge en dus geen bonus: dan is de keten een overzicht.

import * as SC from './supplychain.js';
import * as AM from './areamarket.js';
import * as B from './boerderij.js';
import { SPECIES, SICK_FACTOR } from './livestock.js';
import { DAG_UREN } from './percelen.js';
import { clamp, finite } from './bezithash.js';

export const EGG_KG = 0.125;                         // een ei weegt 125 gram (acht per kilo): zo past 0,20 per stuk bij de 1,60 per kilo van de keten
export const MAX_BIND_PARCELS = 60;
export const YARD_M = 500;                          // binnen 500 m ligt een schakel op hetzelfde erf of in dezelfde straat: geen wagen nodig
export const SPOT_DISTRICT = { markt: 'overig', station: 'overig', park: 'overig', dorp: 'hunsingo', kust: 'lauwerskust', kermis: 'westerkwartier' };

// ---- welke panden bij welke schakel passen ----
// Verwerkers zijn bedrijfsruimte (industrie) of een bakkerij/snackbar; verkooppunten zijn winkels van een passend type, of de frietwagen bij de friet.
const SHOPS_GENERAL = ['supermarkt', 'winkel', 'kiosk', 'souvenir'];
export const LINK_FIT = {
  kaasmakerij: { cls: ['industry'], types: [] },
  'kaas:verkoop': { cls: [], types: [...SHOPS_GENERAL, 'bakker', 'slager'] },
  frietfabriek: { cls: ['industry'], types: [] },
  snackbar: { cls: [], types: ['snackbar', 'frietwagen', 'kiosk'] },
  meelmolen: { cls: ['industry'], types: [] },
  bakkerij: { cls: ['industry'], types: ['bakker'] },
  'brood:verkoop': { cls: [], types: ['bakker', 'supermarkt', 'winkel'] },
  'eieren:verkoop': { cls: [], types: [...SHOPS_GENERAL, 'snackbar'] },
};
const fitKey = (chainId, link) => (link.id === 'verkoop' ? `${chainId}:verkoop` : link.id);
// Past dit pand ({ cls, type }) bij deze schakel? Een schakel zonder regel (hooiberg, eigen vee, de Suikerhal) is nooit te koppelen.
export function fits(chainId, link, info) {
  const rule = link && link.ownable ? LINK_FIT[fitKey(chainId, link)] : null;
  if (!rule || !info) return false;
  return rule.cls.includes(info.cls) || rule.types.includes(info.type);
}

// ---- opslag: bezit.x.chains = { <ketenid>: { chain, bind: { p: [perceel-id's], l: { <schakel>: ref } }, closed, last } } ----
// ref: een OSM-id (getal) of 'm:<id>' voor het mobiele bedrijf.
const ID_OK = /^(p[0-9a-f]{12}|[a-z][a-z0-9-]{1,40})$/;
export const refOk = (r) => (typeof r === 'number' && Number.isSafeInteger(r) && r > 0) || (typeof r === 'string' && /^m:[a-z][a-z0-9-]{1,24}$/.test(r));
export function normalizeEntry(raw, id) {
  const chain = SC.normalizeChain(raw && raw.chain && raw.chain.id === id ? raw.chain : { id, links: [] });
  const c = chain || SC.newChain(id);
  if (!c) return null;
  const bind = { p: [], l: {} };
  const rb = raw && raw.bind && typeof raw.bind === 'object' ? raw.bind : {};
  if (Array.isArray(rb.p)) bind.p = [...new Set(rb.p.filter((x) => typeof x === 'string' && ID_OK.test(x)))].slice(0, MAX_BIND_PARCELS);
  if (rb.l && typeof rb.l === 'object') for (const k of Object.keys(rb.l).slice(0, 8)) { const link = c.links.find((l) => l.id === k && l.ownable); if (link && refOk(rb.l[k])) bind.l[k] = rb.l[k]; }
  const last = raw && raw.last && typeof raw.last === 'object' ? raw.last : null;
  return { chain: c, bind, closed: Math.round(clamp(finite(raw && raw.closed, 0), 0, 1e6)),
    last: last ? { day: Math.round(clamp(finite(last.day, 0), 0, 1e7)), net: Math.round(clamp(finite(last.net, 0), -1e7, 1e7)), sold: Math.round(clamp(finite(last.sold, 0), 0, 1e9)), margin: clamp(finite(last.margin, 0), 0, 1), stuck: Array.isArray(last.stuck) ? last.stuck.slice(0, 6).map((s) => ({ index: Math.round(clamp(finite(s && s.index, 0), 0, 5)), why: s && s.why === 'vol' ? 'vol' : 'transport' })) : [], blocked: Math.round(clamp(finite(last.blocked, 0), 0, 1e9)), moved: Array.isArray(last.moved) ? last.moved.slice(0, 6).map((v) => Math.round(clamp(finite(v, 0), 0, 1e9))) : [] } : null };
}
const done = new WeakSet();
// De ketens van het bezit, een keer per sessie genormaliseerd. Geeft altijd alle zes: een nieuwe keten is nog leeg en niet gekoppeld.
export function chainsOf(bezit) {
  if (!bezit.x.chains || !done.has(bezit.x.chains)) {
    const raw = bezit.x.chains && typeof bezit.x.chains === 'object' ? bezit.x.chains : {};
    const out = {};
    for (const id of SC.CHAIN_IDS) out[id] = normalizeEntry(raw[id], id);
    bezit.x.chains = out; done.add(out);
  }
  return bezit.x.chains;
}
// Wat bewaard wordt: alleen ketens met iets erin (gekoppeld, voorraad, wagens of een geschiedenis); de rest is standaard.
export function serializableChains(bezit) {
  const out = {};
  const all = chainsOf(bezit);
  for (const id of Object.keys(all)) {
    const e = all[id];
    if (e.bind.p.length || Object.keys(e.bind.l).length || e.closed || e.last || e.chain.links.some((l) => l.stock > 0 || l.trucks.length || l.perDay !== SC.CHAIN_DEFS[id].links.find((x) => x.id === l.id).perDay)) out[id] = e;
  }
  return out;
}
// Vóór het bewaren: bezit.x.chains vervangen door de compacte vorm (de ongebruikte ketens vallen weg) zonder de in-geheugen-vorm te verliezen.
export function packForSave(bezit) {
  if (!bezit.x.chains) return;
  const pack = serializableChains(bezit);
  if (!Object.keys(pack).length) { delete bezit.x.chains; return; }
  bezit.x.chains = pack; done.delete(pack);       // de volgende chainsOf vult de ontbrekende aan
}

// ---- grondstof uit je eigen percelen en vee ----
// rows: holdingsmodel.holdingRows; herds: livestock.herdsOf. Wat de speler zelf kiest (bind.p, leeg = alles wat past) telt; lossOf(id) is het opbrengstverlies 0..1 van die dag.
const cycleDays = (gewas) => { const g = B.GEWASSEN[gewas]; return g ? Math.ceil(g.groeiUren / DAG_UREN) + 1 : 3; };
const cropOf = (r) => (r.phase === 'groeit' || r.phase === 'rijp' ? r.crop : r.plan);
// De verwachte kilo's grondstof per speldag: percelen op Personeel (die haalt het personeel zelf binnen) met dit gewas, of de kuddes met dit product.
export function sourceKgPerDay(raw, rows, herds, pick = [], lossOf = () => 0) {
  const only = pick && pick.length ? new Set(pick) : null;
  let kg = 0; const ids = [];
  if (B.GEWASSEN[raw]) {
    for (const r of rows) {
      if (r.level !== 'staff' || (only && !only.has(r.id)) || cropOf(r) !== raw || !(r.expectedKg > 0)) continue;
      kg += (r.expectedKg / cycleDays(raw)) * (1 - clamp(finite(lossOf(r.id), 0), 0, 0.6)); ids.push(r.id);
    }
  } else {
    for (const id of Object.keys(herds || {})) {
      const h = herds[id], s = SPECIES[h.sp];
      if (!s || s.product !== raw || (only && !only.has(id))) continue;
      const per = h.n * s.perDag * (h.sick > 0 ? SICK_FACTOR : 1);
      kg += raw === 'eieren' ? per * EGG_KG : per; ids.push(id);
    }
  }
  return { kg: Math.round(kg), ids };
}

// ---- koppelen ----
export function toggleSourceParcel(bezit, chainId, id) {
  const e = chainsOf(bezit)[chainId];
  if (!e || !ID_OK.test(String(id))) return false;
  const i = e.bind.p.indexOf(id);
  if (i >= 0) e.bind.p.splice(i, 1); else if (e.bind.p.length < MAX_BIND_PARCELS) e.bind.p.push(id); else return false;
  return true;
}
// Een schakel aan een eigen pand koppelen. info(ref) geeft { cls, type, x, y } van het pand of de wagen, of null als het niet van jou is.
export function bindLink(bezit, chainId, linkId, ref, info) {
  const e = chainsOf(bezit)[chainId];
  const link = e && e.chain.links.find((l) => l.id === linkId);
  if (!link || !link.ownable) return { ok: false, why: 'geen-schakel' };
  if (!refOk(ref)) return { ok: false, why: 'onbekend' };
  const inf = info ? info(ref) : null;
  if (!inf) return { ok: false, why: 'niet-van-jou' };
  if (!fits(chainId, link, inf)) return { ok: false, why: 'past-niet' };
  for (const other of Object.keys(e.bind.l)) if (e.bind.l[other] === ref && other !== linkId) delete e.bind.l[other];   // één pand vervult één schakel van een keten
  e.bind.l[linkId] = ref;
  return { ok: true };
}
export function unbindLink(bezit, chainId, linkId) {
  const e = chainsOf(bezit)[chainId];
  if (!e || !e.bind.l[linkId]) return false;
  delete e.bind.l[linkId];
  return true;
}
// De gekoppelde panden die niet meer van jou zijn (verkocht) loskoppelen. Geeft het aantal.
export function pruneBindings(bezit, info) {
  let n = 0;
  const all = chainsOf(bezit);
  for (const id of Object.keys(all)) for (const k of Object.keys(all[id].bind.l)) if (!info(all[id].bind.l[k])) { delete all[id].bind.l[k]; n++; }
  return n;
}

// De schakels van de keten bijwerken uit de koppelingen: owned (valid(ref): is het pand nog van jou) en afstand. loc(ref) en parcelLoc(id) geven { x, y } of null (dan zit het op hetzelfde erf: afstand 0).
// Afstand van een schakel = afstand naar de volgende schakel (supplychain.js): tussen de bron (middelpunt van de gekoppelde percelen) en de verwerker, enzovoort.
export function applyBindings(entry, env = {}) {
  const e = entry, c = e.chain;
  const pts = [];
  const srcIds = (env.sourceIds && env.sourceIds.length) ? env.sourceIds : e.bind.p;
  const sp = srcIds.map((id) => (env.parcelLoc ? env.parcelLoc(id) : null)).filter(Boolean);
  pts[0] = sp.length ? { x: sp.reduce((s, p) => s + p.x, 0) / sp.length, y: sp.reduce((s, p) => s + p.y, 0) / sp.length } : null;
  c.links.forEach((l, i) => {
    if (i === 0) return;
    const ref = e.bind.l[l.id];
    const p = ref && env.loc ? env.loc(ref) : null;
    pts[i] = l.ownable && ref ? p : null;
    l.owned = !!(l.ownable && ref && (!env.valid || env.valid(ref)));
  });
  for (let i = 0; i < c.links.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const d = a && b ? Math.round(Math.hypot(a.x - b.x, a.y - b.y)) : 0;
    c.links[i].distance = d < YARD_M ? 0 : d;
  }
  return e;
}

// De streek van het verkooppunt, voor de streekprijs: het pand (via regionOf) of de standplaats van de frietwagen.
export function outletDistrict(entry, env = {}) {
  const out = entry.chain.links.at(-1), ref = entry.bind.l[out.id];
  if (typeof ref === 'string' && ref.startsWith('m:')) return (env.spotOf && SPOT_DISTRICT[env.spotOf(ref)]) || 'overig';
  const p = ref && env.loc ? env.loc(ref) : null;
  return p && env.regionOf ? env.regionOf(p.x, p.y) : 'overig';
}

// ---- de dag ----
// Het extra dat de keten die dag bijdraagt: de omzet met marge en streekprijs, min wat de verkochte kilo's als grondstof al opbrachten, de wagens en de diesel.
// Zonder marge (geen eigen schakel) is er niets extra: dan betaalt de keten ook geen wagens uit het bezit (0).
export function bonusOf(chain, rep) {
  if (!(rep.margin > 0)) return 0;
  let y = 1; for (let i = 0; i < chain.links.length - 1; i++) y *= chain.links[i].yield;
  const rawSold = y > 0 ? rep.sold / y : 0;
  return Math.round((rep.revenue - rawSold * finite(SC.RAW_PRICE[chain.raw], 0) - rep.cost.wages - rep.cost.diesel) * 100) / 100;
}
// Eén speldag voor één keten. env: { rows, herds, lossOf(id), market, calDay, loc, parcelLoc, regionOf, spotOf, eventMult (product -> getal) }.
// Geeft { entry (nieuwe), market (nieuwe), rep, bonus, closed (de keten was vandaag gesloten en draaide) }; past de invoer niet aan.
export function stepEntry(entry, env) {
  const e = { ...entry, chain: { ...entry.chain, links: entry.chain.links.map((l) => ({ ...l, trucks: l.trucks.slice() })) }, bind: entry.bind };
  const src = sourceKgPerDay(e.chain.raw, env.rows || [], env.herds || {}, e.bind.p, env.lossOf);
  applyBindings(e, { ...env, sourceIds: src.ids });
  const district = outletDistrict(e, env), out = e.chain.output, ev = env.eventMult ? env.eventMult(out) : 1;
  const rf = clamp(AM.priceFactor(env.market, district, out, env.calDay, ev), 0.7, 1.4);
  const r = SC.stepChainDay(e.chain, { produced: src.kg, regionFactor: rf, day: env.calDay });
  e.chain = r.chain;
  let market = env.market;
  if (r.report.sold > 0) market = AM.deliver(market, district, out, r.report.sold, env.calDay, ev).market;
  const bonus = bonusOf(e.chain, r.report);
  const ownable = e.chain.links.filter((l) => l.ownable);
  const closedNow = ownable.length > 0 && ownable.every((l) => l.owned) && src.kg > 0 && r.report.moved.every((m) => m > 0);
  if (closedNow) e.closed++;
  e.last = { day: env.calDay, net: Math.round(bonus), sold: Math.round(r.report.sold + r.report.fed), margin: r.report.margin, stuck: r.report.stuck, blocked: Math.round(r.report.blocked), moved: r.report.moved.map((m) => Math.round(m)) };
  return { entry: e, market, rep: r.report, bonus, closed: closedNow, produced: src.kg, region: district };
}

// Het beeld van een keten voor het scherm: de schakels met balk, de zwakste schakel (uit de laatste dag) en wat je kunt koppelen.
export function viewOf(entry, env = {}) {
  const e = { ...entry, chain: { ...entry.chain, links: entry.chain.links.map((l) => ({ ...l })) } };
  const src = sourceKgPerDay(e.chain.raw, env.rows || [], env.herds || {}, e.bind.p, env.lossOf);
  applyBindings(e, { ...env, sourceIds: src.ids });
  const rep = e.last ? { moved: e.last.moved.length ? e.last.moved : new Array(e.chain.links.length).fill(0), stuck: e.last.stuck, blocked: e.last.blocked } : null;
  const v = SC.chainView(e.chain, rep);
  return { ...v, sourceKg: src.kg, sourceCount: src.ids.length, picked: e.bind.p.length, closedDays: e.closed, last: e.last, binds: { ...e.bind.l },
    links: v.links.map((l, i) => ({ ...l, ref: e.bind.l[l.id] || null, distance: e.chain.links[i].distance || 0, wage: e.chain.links[i].trucks.length * SC.DRIVER_WAGE })) };
}
