// De snackwagen als eindgame van Bezit (epic #1095, #1102; ontwerp docs/BEZIT-21-11.md, sectie "Snackwagen en Us Mem Snacks"): een bedrijf-light-sim met standplaatsen
// (pitch.js), een menu uit je eigen keten, upgrades, medewerkers (loon of aandeel), een reputatie, de concurrent Us Mem Snacks (rival.js) met sabotage als satire,
// doelen en een eindscore "Snackimperium". Puur: geen DOM, geen THREE, geen klok, geen opslag en geen Math.random; alles uit de speldag (bezithash.js).
// scripts/snackvan_test.mjs en scripts/snackbalans_test.mjs.
//
// Eén toestand per speler (S, opgeslagen in bezit.x.snack): { permits, own, fleet, up, rep, rival, ev, stats, lastDay }.
//   own    de wagen die je zelf runt (het mobiele bedrijf 'frietwagen' van business.js, in het spel Snackwagen): { spot, tier, from, hours, pr, menu, stockDays }
//   fleet  de wagens met een medewerker: { id, spot, tier, mode: 'loon' | 'aandeel', staff, paid, wageUp }
//   up     de bedrijfsbrede upgrades (koeling, sauzen, pan)
// Geld rekent in euro's; de aanroeper (bezitlive.js) trekt kosten af en schrijft opbrengsten bij. De wagen die je zelf runt is actief werk (menu, locatie, voorraad):
// zijn winst wordt begrensd met compressOwn (plafond 1.200 per speldag); wat de medewerkers verdienen is passief en gaat door de gewone rem compressPassive.

import { hashUnit, hashPick, clamp, finite } from './bezithash.js';
import { FIRST_NAMES } from './businessstaff.js';
import { maintenanceFactor } from './business.js';
import * as SP from './pitch.js';
import * as RV from './rival.js';
import { ACTS as BOSS_ACTS, jelleOffer, trickText } from './jellebaas.js';
import * as GW from './goodwill.js';
import { difficultyFactor } from './bezitprijs.js';

// ---- wagens, upgrades en menu ----
export const TIERS = {
  klein: { label: 'Kleine snackwagen', cap: 150, slots: 4, opex: 45, up: 0 },
  groot: { label: 'Grote snackwagen', cap: 240, slots: 6, opex: 70, up: 12000 },
  xl: { label: 'Snackwagen XL met terras', cap: 340, slots: 8, opex: 100, up: 24000 },
};
export const TIER_IDS = Object.keys(TIERS);
export const UPGRADES = {
  koeling: { label: 'Koeling', price: 6000, note: 'Burger, milkshake en softy op het menu; minder bederf.' },
  sauzen: { label: 'Eigen merk-sauzen (Terpsaus)', price: 8000, note: 'Elke klant betaalt 60 cent meer en 6% meer klanten komen terug.' },
  pan: { label: 'Dubbele frituurpan', price: 4000, note: '15% meer capaciteit en een storing komt half zo vaak voor.' },
};
export const UPGRADE_IDS = Object.keys(UPGRADES);
// Het menu: prijs en inkoop per product (euro per portie), de keten waar het uit kan komen (bezitchain.js) en wat het vraagt.
export const ITEMS = {
  friet: { label: 'Friet', price: 3.6, cost: 0.85, chain: 'friet', kg: 0.25, base: true },
  frikandel: { label: 'Frikandel', price: 2.8, cost: 0.9, chain: 'vlees', kg: 0.1, base: true },
  kroket: { label: 'Kroket', price: 2.9, cost: 0.85, chain: 'vlees', kg: 0.1, base: true },
  bamischijf: { label: 'Bamischijf', price: 3.1, cost: 0.85, chain: null, kg: 0.1, base: true },
  souffle: { label: 'Kaassoufflé', price: 3.2, cost: 0.8, chain: 'kaas', kg: 0.1, base: true },
  burger: { label: 'Burger', price: 6.5, cost: 2.2, chain: 'vlees', kg: 0.15, needs: 'koeling' },
  milkshake: { label: 'Milkshake', price: 4.2, cost: 1.1, chain: 'melk', kg: 0.3, needs: 'koeling' },
  softy: { label: 'Softy', price: 3.2, cost: 0.7, chain: 'melk', kg: 0.12, needs: 'koeling' },
};
export const ITEM_IDS = Object.keys(ITEMS);
export const DEFAULT_OFFERINGS = ['friet', 'frikandel', 'kroket', 'bamischijf'];
export const ITEMS_PER_CUSTOMER = 1.5;
export const SAUCE_TICKET = 0.6;

export const OWN_CAP_DAY = 1800;                 // plafond voor wat de wagen die je zelf runt per speldag opbrengt (zacht, compressOwn)
export const compressOwn = (perDay) => (perDay > 0 ? Math.round(OWN_CAP_DAY * (1 - Math.exp(-perDay / OWN_CAP_DAY))) : perDay);
export const STOCK_MAX = 5, RESTOCK_FEE = 40;    // voorraad voor hoogstens vijf dagen; een rit naar de groothandel kost 40 euro
export const FLEET_PRICE = 12000, FLEET_STEP = 0.1, MAX_FLEET = 11, FLEET_REFUND = 0.6, MOVE_FEE = 150;
export const SHARE_CUT = 0.3;                    // een medewerker op aandeel krijgt 30% van de winst
export const STAFF_UNATTENDED = 0.85;                  // een wagen zonder jou erbij draait op 85% (en de aanvoer kost 15% extra)
export const LOGISTICS = 1.15;
export const BEST_SPOT = 'markt';                // het beste plekje in de stad: het eerste doel

export const wagonPrice = (fleetCount) => Math.round((FLEET_PRICE * (1 + FLEET_STEP * Math.max(0, fleetCount | 0)) * difficultyFactor('price')) / 50) * 50;
export const staffWage = (skill, pct = 0) => Math.round(((90 + 0.6 * clamp(finite(skill, 50), 0, 100)) * (1 + clamp(finite(pct, 0), 0, 100) / 100)) / 5) * 5;

// ---- toestand ----
export const newSnack = () => ({
  v: 1, permits: {}, up: [], rep: 50, lastDay: 0, offerPart: '',
  own: { spot: null, tier: 'klein', from: 11, hours: 10, pr: 1, menu: [...DEFAULT_OFFERINGS], stockDays: 0 },
  fleet: [], rival: RV.newRival(),
  ev: { pending: null, mods: [], war: null, seq: 0 }, gw: GW.newGw(),
  stats: { days: 0, revenue: 0, net: 0, sold: 0, best: 0, takeovers: 0, refused: 0, answered: 0, had: {} },
});
export const isActive = (S) => !!S && (Object.keys(S.permits).length > 0 || S.fleet.length > 0);

const FLEET_ID = /^w[0-9]{1,3}$/;
export function normalizeSnack(raw) {
  const S = newSnack();
  if (!raw || typeof raw !== 'object') return S;
  S.permits = SP.normalizePermits(raw.permits);
  S.up = [...new Set((Array.isArray(raw.up) ? raw.up : []).filter((u) => UPGRADES[u]))];
  S.rep = Math.round(clamp(finite(raw.rep, 50), 0, 100) * 10) / 10;
  S.lastDay = Math.round(clamp(finite(raw.lastDay, 0), 0, 1e7));
  S.offerPart = BOSS_ACTS.includes(raw.offerPart) ? raw.offerPart : '';   // de akte waarvan Jelles offerte al kwam (jellebaas.js, #1139)
  const o = raw.own && typeof raw.own === 'object' ? raw.own : {};
  S.own = { spot: SP.isSpot(o.spot) ? o.spot : null, tier: TIERS[o.tier] ? o.tier : 'klein', from: Math.round(clamp(finite(o.from, 11), 0, 23)), hours: Math.round(clamp(finite(o.hours, 10), 4, 14)),
    pr: Math.round(clamp(finite(o.pr, 1), 0.7, 1.4) * 20) / 20, menu: cleanOfferings(o.menu, S, o.tier), stockDays: Math.round(clamp(finite(o.stockDays, 0), 0, STOCK_MAX)) };
  S.fleet = (Array.isArray(raw.fleet) ? raw.fleet : []).slice(0, MAX_FLEET).filter((w) => w && FLEET_ID.test(String(w.id))).map((w) => ({
    id: w.id, spot: SP.isSpot(w.spot) ? w.spot : null, tier: TIERS[w.tier] ? w.tier : 'klein', mode: w.mode === 'aandeel' ? 'aandeel' : 'loon',
    staff: { id: String((w.staff && w.staff.id) || w.id).slice(0, 24), name: String((w.staff && w.staff.name) || 'Medewerker').slice(0, 24), skill: Math.round(clamp(finite(w.staff && w.staff.skill, 50), 0, 100)) },
    paid: Math.round(clamp(finite(w.paid, FLEET_PRICE), 0, 1e9)), wageUp: Math.round(clamp(finite(w.wageUp, 0), 0, 100)),
  }));
  S.rival = RV.normalizeRival(raw.rival);
  S.gw = GW.normalizeGw(raw.gw);
  const e = raw.ev && typeof raw.ev === 'object' ? raw.ev : {};
  S.ev.seq = Math.round(clamp(finite(e.seq, 0), 0, 1e7));
  S.ev.mods = (Array.isArray(e.mods) ? e.mods : []).slice(0, 12).filter((m) => m && ['omzet', 'dicht', 'rep'].includes(m.k)).map((m) => ({ k: m.k, wagon: String(m.wagon || 'own').slice(0, 8), until: Math.round(clamp(finite(m.until, 0), 0, 1e7)), mult: clamp(finite(m.mult, 1), 0, 3), d: clamp(finite(m.d, 0), -30, 30), ev: Math.round(finite(m.ev, 0)) }));
  if (e.war && typeof e.war === 'object') S.ev.war = { until: Math.round(clamp(finite(e.war.until, 0), 0, 1e7)), depth: clamp(finite(e.war.depth, 0.15), 0, 0.5), matched: !!e.war.matched, softened: !!e.war.softened, ev: Math.round(finite(e.war.ev, 0)) };
  const p = e.pending;
  if (p && typeof p === 'object' && RV.CHOICES[p.kind]) S.ev.pending = { kind: p.kind, id: Math.round(finite(p.id, 0)), wagon: String(p.wagon || 'own').slice(0, 8), spot: SP.isSpot(p.spot) ? p.spot : null, depth: clamp(finite(p.depth, 0), 0, 0.5), price: Math.round(clamp(finite(p.price, 0), 0, 1e8)), bribed: !!p.bribed,
    text: String(p.text || '').slice(0, 300), choices: RV.CHOICES[p.kind], day: Math.round(finite(p.day, 0)), deadline: Math.round(finite(p.deadline, 0)) };
  const s = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
  for (const k of ['days', 'revenue', 'net', 'sold', 'best', 'takeovers', 'refused', 'answered']) S.stats[k] = Math.round(clamp(finite(s[k], 0), -1e12, 1e12));
  for (const id of Object.keys(s.had || {})) if (SP.isSpot(id)) S.stats.had[id] = true;
  return S;
}

// ---- menu ----
export const offeringUnlocked = (S, id) => !!ITEMS[id] && (!ITEMS[id].needs || S.up.includes(ITEMS[id].needs));
export const offeringSlots = (tier) => (TIERS[tier] || TIERS.klein).slots;
function cleanOfferings(list, S, tier) {
  const out = [];
  for (const id of Array.isArray(list) ? list : []) if (ITEMS[id] && !out.includes(id) && offeringUnlocked(S, id) && out.length < offeringSlots(tier)) out.push(id);
  return out.length ? out : DEFAULT_OFFERINGS.slice(0, offeringSlots(tier));
}
// De prijs en inkoop per klant van een menu: gemiddeld product maal 1,5 per klant; eigen keten maakt het inkopen tot de helft goedkoper (chainOwn(product): 0 tot 1).
export function offeringNumbers(menu, up, chainOwn = () => 0) {
  const ids = menu.filter((m) => ITEMS[m]);
  const k = Math.max(1, ids.length);
  let price = 0, cost = 0, own = 0;
  for (const id of ids) {
    const it = ITEMS[id], o = it.chain ? clamp(finite(chainOwn(it.chain), 0), 0, 1) : 0;
    price += it.price; cost += it.cost * (1 - 0.5 * o); if (o >= 0.5) own++;
  }
  const spoil = up.includes('koeling') ? 1.02 : 1.08;
  return { ticket: (price / k) * ITEMS_PER_CUSTOMER + (up.includes('sauzen') ? SAUCE_TICKET : 0), cogs: (cost / k) * ITEMS_PER_CUSTOMER * spoil,
    variety: 1 + Math.min(0.12, 0.02 * Math.max(0, ids.length - 4)), localAppeal: 1 + Math.min(0.06, 0.015 * own) };
}

// ---- reputatie en de omstandigheden van een dag ----
export const effRep = (S, day) => clamp(S.rep + S.ev.mods.filter((m) => m.k === 'rep' && m.until >= day).reduce((a, m) => a + m.d, 0), 0, 100);
export const repFactor = (rep) => Math.round((0.8 + 0.4 * clamp(finite(rep, 50), 0, 100) / 100) * 1000) / 1000;
export const priceDemand = (pr) => clamp(1 - 1.3 * (finite(pr, 1) - 1), 0.4, 1.35);
// Prijzenoorlog: matched (je prijst mee) houdt de klanten maar drukt je prijs met de diepte; anders lopen ze weg (afgezwakt als je reclame maakte).
// loyal (0 tot 100, de vaste klanten op die plek) schermt af: bij honderd verlies je nog 40% van wat je anders verloor (goodwill.warShield).
export function warEffect(war, day, cluster, pr, loyal = 0) {
  if (!war || war.until < day || (cluster !== 'stad' && cluster !== 'zuid')) return { demand: 1, pr };
  if (war.matched) return { demand: 1 - 0.1 * war.depth, pr: pr * (1 - war.depth) };
  return { demand: 1 - (war.softened ? 0.4 : 0.8) * war.depth * GW.warShield(loyal), pr };
}
// De prijzenoorlog drukt ook de streekprijs van friet en kaas bij de leveringen van je ketens (areamarket eventMult): zonder oorlog 1, anders tot de helft van de diepte.
export const warPriceMult = (S, product, day) => (S && S.ev.war && S.ev.war.until >= day && (product === 'friet' || product === 'kaas') ? 1 - 0.5 * S.ev.war.depth : 1);

// ---- eén wagen, één dag ----
// w: { id, spot, tier, from, hours, pr, menu, stockDays? } ; opt: { own, staff, q }. Geeft de cijfers; verandert niets.
function wagonDay(S, w, ctx, opt) {
  const spot = SP.spotDef(w.spot);
  const day = ctx.day;
  const out = { id: w.id, spot: w.spot, tier: w.tier, own: !!opt.own, demand: 0, sold: 0, unserved: 0, revenue: 0, cogs: 0, opex: 0, wage: 0, net: 0, closed: false, stocked: true, note: '' };
  if (!spot) { out.note = 'Geen plek: zet de wagen op een standplaats met een vergunning.'; return out; }
  const T = TIERS[w.tier] || TIERS.klein;
  const mods = S.ev.mods.filter((m) => m.wagon === w.id && m.until >= day);
  out.opex = Math.round(T.opex);
  if (mods.some((m) => m.k === 'dicht')) { out.closed = true; out.opex = Math.round(T.opex * 0.5); out.net = -out.opex; out.note = 'Een dag zonder verkoop (pech of een verkoper die weg is): de wagen zelf blijft gewoon bereikbaar.'; return out; }
  const rep = effRep(S, day);
  const kermis = !!(ctx.kermisAt && ctx.kermisAt(w.spot));
  const d0 = SP.demandAt(w.spot, { day, weekend: !!ctx.weekend, kermis, matchDay: SP.matchDay(day), from: w.from, hours: w.hours, shops: ctx.shopsAt ? ctx.shopsAt(w.spot) : undefined });
  const mn = offeringNumbers(w.menu, S.up, ctx.chainOwn || (() => 0));
  const loyal = finite(S.gw.loyal[w.spot], 0);
  const war = warEffect(S.ev.war, day, spot.cluster, w.pr, loyal);
  const comp = SP.competitionFactor(w.spot, { rep, rivalSpots: S.rival.spots });
  const mf = opt.own ? maintenanceFactor(finite(opt.q, 100)) : 1;
  const sm = mods.filter((m) => m.k === 'omzet').reduce((a, m) => a * m.mult, 1);
  const want = d0.demand * comp * repFactor(rep) * priceDemand(war.pr) * war.demand * mn.variety * mn.localAppeal * (S.up.includes('sauzen') ? 1.06 : 1) * mf * sm * (opt.staff || 1) * GW.satFactor(S.gw.sat) * GW.loyalFactor(loyal);
  const cap = T.cap * (S.up.includes('pan') ? 1.15 : 1) * clamp(w.hours / 10, 0.4, 1.4);
  const stocked = opt.own ? S.own.stockDays >= 1 : true;
  let sold = Math.min(want, cap);
  if (!stocked) sold = Math.min(sold, cap * 0.15);
  out.demand = Math.round(want); out.sold = Math.round(sold); out.unserved = Math.max(0, Math.round(want - cap)); out.stocked = stocked;
  out.revenue = Math.round(sold * mn.ticket * war.pr);
  out.cogs = Math.round(sold * mn.cogs * (opt.own ? (stocked ? 1 : 1.5) : LOGISTICS));
  out.sat = GW.satisfactionOf({ stocked, demand: want, unserved: Math.max(0, want - cap) }, { menuLen: w.menu.length, koeling: S.up.includes('koeling'), localAppeal: mn.localAppeal, pr: w.pr });
  out.factors = { vraag: Math.round(d0.demand), tevreden: GW.satFactor(S.gw.sat), vast: GW.loyalFactor(loyal), concurrentie: comp, naam: repFactor(rep), prijs: Math.round(priceDemand(war.pr) * 1000) / 1000, oorlog: war.demand, onderhoud: mf, storing: sm };
  out.usage = {};
  for (const id of w.menu) { const it = ITEMS[id]; if (it && it.chain) out.usage[it.chain] = (out.usage[it.chain] || 0) + (sold * ITEMS_PER_CUSTOMER * it.kg) / Math.max(1, w.menu.length); }
  const gross = out.revenue - out.cogs - out.opex;
  if (!opt.own) {
    const f = S.fleet.find((x) => x.id === w.id);
    if (f && f.mode === 'aandeel') out.wage = Math.round(Math.max(0, gross) * SHARE_CUT);
    else out.wage = Math.round(staffWage(f ? f.staff.skill : 50, f ? f.wageUp : 0) * (w.hours / 10));
  }
  out.net = gross - out.wage;
  out.note = !stocked ? 'Geen voorraad: je verkocht bijna niets. Vul de wagen aan.' : out.unserved > 0.15 * out.demand ? 'Een lange rij: een grotere wagen verkoopt meer.' : comp < 0.78 ? 'Veel concurrentie op deze plek.' : 'Een goede dag.';
  return out;
}

// ---- gebeurtenissen toepassen ----
const wagonsOnSpots = (S) => [...(S.own.spot ? [{ id: 'own', spot: S.own.spot }] : []), ...S.fleet.filter((w) => w.spot).map((w) => ({ id: w.id, spot: w.spot }))];
function dropEvMods(S, evId) { S.ev.mods = S.ev.mods.filter((m) => m.ev !== evId); if (S.ev.war && S.ev.war.ev === evId) S.ev.war = null; }
function applyOutcome(S, ev, o, day, evId) {
  for (const m of o.mods || []) S.ev.mods.push({ k: m.k, wagon: m.wagon, until: m.until, mult: finite(m.mult, 1), d: 0, ev: evId });
  if (o.repTemp) S.ev.mods.push({ k: 'rep', wagon: 'own', until: day + o.repTemp.days, mult: 1, d: o.repTemp.d, ev: evId });
  if (o.rep) S.rep = clamp(S.rep + o.rep, 0, 100);
  if (o.war) S.ev.war = { until: o.war.until, depth: o.war.depth, matched: o.war.matched, softened: !!o.war.softened, ev: evId };
  if (o.wageUp) { const f = S.fleet.find((x) => x.id === o.wageUp.wagon); if (f) f.wageUp = Math.min(100, f.wageUp + o.wageUp.pct); }
  if (o.leave) { const f = S.fleet.find((x) => x.id === o.leave); if (f) { f.staff = newStaff(f.spot || 'x', day, S.fleet.indexOf(f)); f.wageUp = 0; } }
}
const staffNames = FIRST_NAMES;
function newStaff(seed, day, k) {
  const skill = Math.round(35 + hashUnit('snack-skill', seed, day, k) * 40);
  return { id: `s${seed}${day}`, name: hashPick(staffNames, 'snack-naam', seed, day, k), skill };
}
// De gebeurtenis die nu wacht op een antwoord (of null) en de keuzes: voor het menu.
export const pendingEvent = (S) => S.ev.pending;

// Antwoord op de gebeurtenis die wacht. Geeft { ok, cost, text } of { ok: false, why }. Het geld voor de keuze (cost) moet er zijn; zo niet, why 'te-weinig-geld'.
export function answerEvent(S, choiceId, day, money) {
  const p = S.ev.pending;
  if (!p) return { ok: false, why: 'niets-te-doen' };
  const c = p.choices.find((x) => x.id === choiceId);
  if (!c) return { ok: false, why: 'onbekend' };
  const price = p.kind === 'bod' ? 0 : c.cost;
  if (!(finite(money, 0) >= price)) return { ok: false, why: 'te-weinig-geld', tekort: Math.round(price - finite(money, 0)) };
  const d = Math.floor(finite(day, 0));
  let gain = 0, text = '';
  if (p.kind === 'vergunning') {
    if (choiceId === 'bondgenoten' && !S.gw.allies.length) return { ok: false, why: 'geen-bondgenoten' };
    dropEvMods(S, p.id);
    const r = choiceId === 'betaal' ? { text: 'Je betaalt de leges en het formulier is zoek en weer gevonden. Jelle knikt tevreden; de buurt zucht.', cost: 0 } : runDispute(S, p, d, choiceId === 'bondgenoten', finite(money, 0) - price);
    S.stats.answered++; S.ev.pending = null;
    return { ok: true, cost: price + r.cost, gain: 0, text: r.text, won: r.win };
  }
  if (p.kind === 'bod') {
    if (choiceId === 'verkoop' && !S.permits[p.spot]) return { ok: false, why: 'onbekend' };      // de vergunning is intussen vervallen: er is niets te verkopen, het aanbod blijft tot de deadline staan
    if (choiceId === 'verkoop') {
      delete S.permits[p.spot]; S.rival = RV.acquire(S.rival, p.spot); gain = p.price;
      if (S.own.spot === p.spot) S.own.spot = null;
      for (const w of S.fleet) if (w.spot === p.spot) w.spot = null;
      text = `Verkocht aan Us Mem Snacks voor ${p.price} euro. Je wagen staat zonder plek.`;
    } else { S.stats.refused++; S.rep = clamp(S.rep + 1, 0, 100); text = 'Je weigert het bod. Jelle haalt zijn schouders op: "Volgende keer."'; }
  } else {
    dropEvMods(S, p.id);
    const o = RV.outcome({ kind: p.kind, wagon: p.wagon, depth: p.depth, day: p.day }, choiceId, d);
    applyOutcome(S, p, o, d, p.id);
    text = o.text;
  }
  S.stats.answered++;
  S.ev.pending = null;
  return { ok: true, cost: price, gain, text };
}
// Het vergunningsgeschil uitvoeren (rival.resolveDispute met je goodwill, vaste klanten, bondgenoten en naam): de uitkomst werkt door in goodwill, de naam van Us Mem en de verkoop.
// Verlies kost leges (hoogstens wat er is) en drie dagen halve verkoop op die wagen; de plek blijft van jou: nooit fataal. Geeft { win, text, cost }.
function runDispute(S, p, day, allyCall, money) {
  const r = RV.resolveDispute({ spot: p.spot, day, bribed: p.bribed, goodwill: S.gw.goodwill, loyal: S.gw.loyal[p.spot] || 0, allies: S.gw.allies.length, allyCall, rep: S.rep, mood: S.rival.mood, rivalRep: S.rival.rep });
  S.rival.rep = clamp(S.rival.rep + r.rivalRepDelta, 0, 100);
  if (r.bribeFailed) S.gw.disputes.bribesFailed++;
  let cost = 0;
  if (r.win) { S.gw.disputes.won++; S.gw.goodwill = clamp(S.gw.goodwill + 4, 0, 100); }
  else {
    S.gw.disputes.lost++; S.gw.goodwill = clamp(S.gw.goodwill - 2, 0, 100);
    cost = Math.round(Math.min(RV.LEGES_LOSS, Math.max(0, finite(money, 0))));
    S.ev.mods.push({ k: 'omzet', wagon: p.wagon, until: day + 2, mult: 0.5, d: 0, ev: p.id });
  }
  return { win: r.win, text: r.text, cost, yours: r.yours, his: r.his };
}

// Een gebeurtenis die niet beantwoord is (na de deadline) loopt af met het goedkoopste antwoord; een vergunningsgeschil wordt beslecht alsof je in beroep ging.
function expirePending(S, day, money = 0) {
  const p = S.ev.pending;
  if (!p || day <= p.deadline) return null;
  let text = '';
  if (p.kind === 'vergunning') { dropEvMods(S, p.id); const r = runDispute(S, p, day, false, money); S.ev.pending = null; return { text: r.text, cost: r.cost }; }
  if (p.kind === 'bod') { S.stats.refused++; text = 'Het bod van Jelle Terpstra is verlopen.'; }
  else if (p.kind === 'overkoop') { applyOutcome(S, p, RV.outcome({ kind: p.kind, wagon: p.wagon, day: p.day }, 'laatgaan', day), day, p.id); text = 'Je verkoper is vertrokken: er komt een nieuwe.'; }
  S.ev.pending = null;
  return text ? { text, cost: 0 } : null;
}
// Een nieuwe gebeurtenis: het standaardgevolg treedt meteen in werking (storing, pech, recensie, oorlog); de speler kan het nog verbeteren met een antwoord.
function raiseEvent(S, e, day) {
  const id = ++S.ev.seq;
  S.ev.pending = { kind: e.kind, id, wagon: e.wagon, spot: e.spot, depth: e.depth, price: e.price || 0, bribed: !!e.bribed, text: e.text, choices: e.choices, day, deadline: e.deadline };
  if (e.kind === 'vergunning') S.ev.mods.push({ k: 'omzet', wagon: e.wagon, until: e.deadline, mult: 0.7, d: 0, ev: id });          // zolang het geschil loopt wacht de klant op de papieren
  else if (e.kind !== 'overkoop' && e.kind !== 'bod') applyOutcome(S, S.ev.pending, RV.outcome({ kind: e.kind, wagon: e.wagon, depth: e.depth, day }, null, day), day, id);
  return S.ev.pending;
}

// ---- een dag voor het hele imperium ----
// ctx: { day (kalenderdag), weekend, kermisAt(spot), shopsAt(spot), chainOwn(product), ownWagon (heb je de wagen), ownQ (onderhoud 0 tot 100), money, taken(spot) (van een medespeler) }.
// Verandert S en geeft het rapport: { day, own, fleet: [...], ownNet, fleetNet, fixed (vergunningen, antwoorden: geld dat er uit gaat), lines: [tekst], events, ownQ }.
export function settleDay(S, ctx) {
  const day = Math.floor(finite(ctx.day, 0));
  const rep = { day, own: null, fleet: [], ownNet: 0, fleetNet: 0, fixed: 0, lines: [], ownQ: finite(ctx.ownQ, 100), usage: {} };
  // 1. vergunningen: verlengen of laten vervallen
  const pm = SP.settlePermits(S.permits, day, ctx.money);
  S.permits = pm.permits; rep.fixed += pm.spent;
  for (const id of pm.lapsed) { rep.lines.push(`Je vergunning voor ${SP.spotDef(id).short} is verlopen: je wagen staat er niet meer.`); if (S.own.spot === id) S.own.spot = null; for (const w of S.fleet) if (w.spot === id) w.spot = null; }
  for (const id of pm.renewed) rep.lines.push(`Vergunning verlengd voor ${SP.spotDef(id).short}.`);
  for (const id of SP.heldIds(S.permits, day)) S.stats.had[id] = true;
  // 2. de concurrent
  const before = S.rival.spots.length;
  S.rival = RV.stepRival(S.rival, day, { taken: (id) => SP.permitHeld(S.permits, id, day) || !!(ctx.taken && ctx.taken(id)) });
  if (S.rival.spots.length > before) rep.lines.push(`Us Mem Snacks heeft een nieuwe standplaats: ${SP.spotDef(S.rival.expandedTo).short}.`);
  // Jelle als eindbaas (jellebaas.js, #1139): aan het begin van elke akte een offerte; ctx.part is de akte (ontbreekt bij een oude save of zonder verhaal)
  if (ctx.part && BOSS_ACTS.includes(ctx.part) && S.offerPart !== ctx.part) { S.offerPart = ctx.part; rep.lines.push(jelleOffer(ctx.part)); }
  // 3. gebeurtenissen
  const exp = expirePending(S, day, ctx.money); if (exp) { rep.lines.push(exp.text); rep.fixed += exp.cost; }
  S.ev.mods = S.ev.mods.filter((m) => m.until >= day);
  if (S.ev.war && S.ev.war.until < day) S.ev.war = null;
  const mine = SP.heldIds(S.permits, day);
  if (!S.ev.pending) {
    const offer = RV.offerOn(S.rival, day, mine.map((id) => ({ id, paid: S.permits[id].paid })));
    if (offer) {
      S.rival = RV.noteOffer(S.rival, day);
      raiseEvent(S, { kind: 'bod', wagon: 'own', spot: offer.id, price: offer.price, text: offer.text, choices: RV.CHOICES.bod, deadline: day + 3 }, day);
      rep.lines.push(offer.text);
    } else {
      const share = RV.shareOf(mine.length, S.rival);
      const protect = (S.up.includes('pan') ? 0.5 : 0) * 0.5 + (effRep(S, day) / 100) * 0.2;
      const e = RV.rollEvent(S.rival, day, { wagons: wagonsOnSpots(S), share, protect, hasFleet: S.fleet.some((w) => w.spot), pending: false });
      if (e) { e.text = trickText(ctx.part, e.kind, e.text); S.rival = RV.noteEvent(S.rival, day); raiseEvent(S, e, day); rep.lines.push(`${RV.EVENT_KINDS[e.kind].label}: ${e.text}`); }
    }
  }
  // 4. de wagens
  let served = 0, total = 0, empty = false;
  if (ctx.ownWagon && S.own.spot && SP.permitHeld(S.permits, S.own.spot, day)) {
    const r = wagonDay(S, { id: 'own', spot: S.own.spot, tier: S.own.tier, from: S.own.from, hours: S.own.hours, pr: S.own.pr, menu: S.own.menu }, ctx, { own: true, q: ctx.ownQ });
    rep.own = r; rep.ownNet = r.net; rep.ownQ = Math.max(0, Math.round((finite(ctx.ownQ, 100) - 0.5) * 100) / 100);
    if (!r.closed) { if (S.own.stockDays >= 1) S.own.stockDays--; else empty = true; served += r.sold; total += r.demand; }
    for (const k of Object.keys(r.usage || {})) rep.usage[k] = (rep.usage[k] || 0) + r.usage[k];
  }
  for (const f of S.fleet) {
    if (!f.spot || !SP.permitHeld(S.permits, f.spot, day)) continue;
    const def = SP.spotDef(f.spot), win = SP.bestOpening(def.profile, 10);
    const r = wagonDay(S, { id: f.id, spot: f.spot, tier: f.tier, from: win.from, hours: 10, pr: 1, menu: DEFAULT_OFFERINGS.concat(S.up.includes('koeling') ? ['burger', 'milkshake'] : []).slice(0, offeringSlots(f.tier)) }, ctx, { own: false, staff: (0.7 + 0.3 * f.staff.skill / 100) * STAFF_UNATTENDED });
    rep.fleet.push(r); rep.fleetNet += r.net;
    if (!r.closed) { served += r.sold; total += r.demand; }
    for (const k of Object.keys(r.usage || {})) rep.usage[k] = (rep.usage[k] || 0) + r.usage[k];
  }
  // 5. naam en cijfers; tevredenheid, vaste klanten en goodwill (goodwill.js)
  GW.stepGw(S.gw, [...(rep.own ? [{ spot: rep.own.spot, sat: rep.own.sat, closed: rep.own.closed }] : []), ...rep.fleet.map((r) => ({ spot: r.spot, sat: r.sat, closed: r.closed }))]);
  const ratio = total > 0 ? served / total : 1;
  if (rep.own || rep.fleet.length) {
    const hasOwn = !!rep.own;
    S.rep = clamp(S.rep + (empty ? -2.5 : ratio >= 0.85 ? 0.8 : 0.3) + ((hasOwn && S.own.pr > 1.25) ? -0.5 : 0) + ((hasOwn && S.own.pr < 0.9) ? 0.3 : 0), 0, 100);
    S.rep = Math.round(S.rep * 10) / 10;
  }
  S.stats.days++; S.stats.sold += (rep.own ? rep.own.sold : 0) + rep.fleet.reduce((a, r) => a + r.sold, 0);
  S.stats.revenue += (rep.own ? rep.own.revenue : 0) + rep.fleet.reduce((a, r) => a + r.revenue, 0);
  const net = rep.ownNet + rep.fleetNet; S.stats.net += net; S.stats.best = Math.max(S.stats.best, net);
  S.lastDay = day;
  rep.empty = empty;
  return rep;
}

// Meerdere speldagen (na slapen of laden), hoogstens 60: de rapporten opgeteld. ctxFor(d) geeft de ctx van een dag; geeft de som en het laatste rapport.
export const MAX_SETTLE = 60;
export function settleDays(S, from, to, ctxFor) {
  const a = Math.max(0, Math.floor(finite(from, 0))), z = Math.min(Math.max(a, Math.floor(finite(to, a))), a + MAX_SETTLE);
  const sum = { days: 0, ownNet: 0, fleetNet: 0, fixed: 0, lines: [], usage: {}, ownQ: null };
  let last = null;
  for (let d = a + 1; d <= z; d++) {
    const ctx = typeof ctxFor === 'function' ? ctxFor(d) : { ...(ctxFor || {}), day: d };
    if (sum.ownQ !== null) ctx.ownQ = sum.ownQ;
    if (Number.isFinite(ctx.money)) ctx.money = Math.max(0, ctx.money - sum.fixed);      // wat eerdere dagen aan vergunningen uitgaven is er niet meer: elke dag verlengt met het saldo dat overblijft
    const r = settleDay(S, { ...ctx, day: ctx.day === undefined ? d : ctx.day });
    last = r; sum.days++; sum.ownNet += r.ownNet; sum.fleetNet += r.fleetNet; sum.fixed += r.fixed; sum.ownQ = r.ownQ;
    for (const l of r.lines) sum.lines.push(l);
    for (const k of Object.keys(r.usage)) sum.usage[k] = (sum.usage[k] || 0) + r.usage[k];
  }
  sum.lines = sum.lines.slice(-6);
  return { sum, last };
}
// Wat het geld doet: de eigen wagen met zijn eigen plafond, de medewerkers passief (rem compressPassive door de aanroeper), vergunningen en antwoorden als kosten.
export const incomeOf = (sum) => ({ own: compressOwn(sum.ownNet), passiveRaw: sum.fleetNet, fixed: -Math.round(sum.fixed) });

// ---- acties (verwijderen de toestand niet bij een weigering) ----
export const occupied = (S, spot, exceptId = null) => (S.own.spot === spot && exceptId !== 'own') || S.fleet.some((w) => w.spot === spot && w.id !== exceptId);
export function buyPermit(S, id, day, money, ctx = {}) {
  const r = SP.buyPermit(S.permits, id, day, money, { taken: (x) => RV.holds(S.rival, x) || !!(ctx.taken && ctx.taken(x)) });
  if (!r.ok) return r;
  S.permits = r.permits; S.stats.had[id] = true;
  return { ok: true, cost: r.cost };
}
export function bidForSpot(S, id, day, money, ctx = {}) {
  if (ctx.taken && ctx.taken(id)) return { ok: false, why: 'bezet' };
  const r = RV.acquireSpot(S.rival, id, money, S.rep);
  if (!r.ok) return r;
  S.rival = r.r; S.permits = { ...S.permits, [id]: { until: Math.floor(day) + SP.PERMIT_DAYS - 1, paid: r.price } };
  S.stats.takeovers++; S.stats.had[id] = true;
  return { ok: true, cost: r.price };
}
export function setOwn(S, patch = {}) {
  const o = S.own, d = patch || {};
  if (d.spot !== undefined) {
    if (d.spot === null) o.spot = null;
    else if (!SP.isSpot(d.spot)) return { ok: false, why: 'onbekend' };
    else if (occupied(S, d.spot, 'own')) return { ok: false, why: 'bezet' };
    else o.spot = d.spot;
  }
  if (d.from !== undefined) o.from = Math.round(clamp(finite(d.from, 11), 0, 23));
  if (d.hours !== undefined) o.hours = Math.round(clamp(finite(d.hours, 10), 4, 14));
  if (d.pr !== undefined) o.pr = Math.round(clamp(finite(d.pr, 1), 0.7, 1.4) * 20) / 20;
  return { ok: true };
}
export function setOfferings(S, ids) {
  const out = [];
  for (const id of ids || []) if (ITEMS[id] && !out.includes(id) && offeringUnlocked(S, id) && out.length < offeringSlots(S.own.tier)) out.push(id);
  if (!out.length) return { ok: false, why: 'leeg' };
  S.own.menu = out;
  return { ok: true };
}
export function toggleOffering(S, id) {
  if (!ITEMS[id]) return { ok: false, why: 'onbekend' };
  if (S.own.menu.includes(id)) return S.own.menu.length > 1 ? (S.own.menu = S.own.menu.filter((x) => x !== id), { ok: true }) : { ok: false, why: 'leeg' };
  if (!offeringUnlocked(S, id)) return { ok: false, why: 'dicht', needs: ITEMS[id].needs };
  if (S.own.menu.length >= offeringSlots(S.own.tier)) return { ok: false, why: 'vol' };
  S.own.menu = [...S.own.menu, id];
  return { ok: true };
}
export function restock(S, money) {
  if (S.own.stockDays >= STOCK_MAX) return { ok: false, why: 'vol' };
  if (!(finite(money, 0) >= RESTOCK_FEE)) return { ok: false, why: 'te-weinig-geld', tekort: Math.round(RESTOCK_FEE - finite(money, 0)) };
  S.own.stockDays = STOCK_MAX;
  return { ok: true, cost: RESTOCK_FEE };
}
export function buyUpgrade(S, id, money) {
  const u = UPGRADES[id];
  if (!u) return { ok: false, why: 'onbekend' };
  if (S.up.includes(id)) return { ok: false, why: 'al-van-jou' };
  if (!(finite(money, 0) >= u.price)) return { ok: false, why: 'te-weinig-geld', tekort: Math.round(u.price - finite(money, 0)) };
  S.up = [...S.up, id];
  return { ok: true, cost: u.price };
}
// De wagen één stap groter: klein, groot, xl. wagon: 'own' of een id uit de vloot.
export function upgradeTier(S, wagon, money) {
  const w = wagon === 'own' ? S.own : S.fleet.find((x) => x.id === wagon);
  if (!w) return { ok: false, why: 'onbekend' };
  const next = TIER_IDS[TIER_IDS.indexOf(w.tier) + 1];
  if (!next) return { ok: false, why: 'al-het-grootst' };
  const price = TIERS[next].up;
  if (!(finite(money, 0) >= price)) return { ok: false, why: 'te-weinig-geld', tekort: Math.round(price - finite(money, 0)) };
  w.tier = next;
  return { ok: true, cost: price, tier: next };
}
// Een extra wagen met een medewerker op een plek waar je een vergunning hebt.
export function buyFleetWagon(S, spot, day, money, mode = 'loon') {
  if (!SP.isSpot(spot)) return { ok: false, why: 'onbekend' };
  if (!SP.permitHeld(S.permits, spot, day)) return { ok: false, why: 'geen-vergunning' };
  if (occupied(S, spot)) return { ok: false, why: 'bezet' };
  if (S.fleet.length >= MAX_FLEET) return { ok: false, why: 'vol' };
  const price = wagonPrice(S.fleet.length);
  if (!(finite(money, 0) >= price)) return { ok: false, why: 'te-weinig-geld', tekort: Math.round(price - finite(money, 0)) };
  let k = 1; while (S.fleet.some((w) => w.id === `w${k}`)) k++;
  const w = { id: `w${k}`, spot, tier: 'klein', mode: mode === 'aandeel' ? 'aandeel' : 'loon', staff: newStaff(spot, day, k), paid: price, wageUp: 0 };
  S.fleet.push(w);
  return { ok: true, cost: price, wagon: w };
}
export function sellFleetWagon(S, id) {
  const i = S.fleet.findIndex((w) => w.id === id);
  if (i < 0) return { ok: false, why: 'onbekend' };
  const refund = Math.round((S.fleet[i].paid * FLEET_REFUND) / 5) * 5;
  S.fleet.splice(i, 1);
  return { ok: true, refund };
}
export function moveFleetWagon(S, id, spot, day, money) {
  const w = S.fleet.find((x) => x.id === id);
  if (!w) return { ok: false, why: 'onbekend' };
  if (!SP.permitHeld(S.permits, spot, day)) return { ok: false, why: 'geen-vergunning' };
  if (occupied(S, spot, id)) return { ok: false, why: 'bezet' };
  if (!(finite(money, 0) >= MOVE_FEE)) return { ok: false, why: 'te-weinig-geld', tekort: Math.round(MOVE_FEE - finite(money, 0)) };
  w.spot = spot;
  return { ok: true, cost: MOVE_FEE };
}
export function setFleetMode(S, id, mode) {
  const w = S.fleet.find((x) => x.id === id);
  if (!w || (mode !== 'loon' && mode !== 'aandeel')) return { ok: false, why: 'onbekend' };
  w.mode = mode;
  return { ok: true };
}

// Hulp aan de buurt (goodwill.js): op een plek waar je een vergunning hebt. Geeft { ok, cost, text, ally } of { ok: false, why }.
export function helpNeighbourhood(S, spot, kind, day, money) {
  const def = SP.spotDef(spot);
  if (!def) return { ok: false, why: 'onbekend' };
  if (!SP.permitHeld(S.permits, spot, day)) return { ok: false, why: 'geen-vergunning' };
  return GW.helpNeighbourhood(S.gw, spot, def.cluster, kind, day, money);
}
// Een medespeler werkt mee achter het luik van jouw wagen op een plek (de eigenaarskant van bezitcoop.snackShare): jouw wagen verkoopt die dag 8% meer, je naam groeit een tikje
// en de gast krijgt zijn loon uit nieuw geld (niet van jou af). Hoogstens eenmaal per speldag per plek. Geeft { ok } of { ok: false, why }.
export function receiveHelper(S, spot, hours, day) {
  const d = Math.floor(finite(day, 0));
  if (!SP.permitHeld(S.permits, spot, d)) return { ok: false, why: 'geen-vergunning' };
  const wagon = S.own.spot === spot ? 'own' : (S.fleet.find((w) => w.spot === spot) || {}).id;
  if (!wagon) return { ok: false, why: 'geen-wagen' };
  if (finite(S.gw.work[spot], -1) >= d) return { ok: false, why: 'al-gedaan' };
  S.gw.work[spot] = d;
  S.ev.mods.push({ k: 'omzet', wagon, until: d, mult: 1 + 0.08 * clamp(finite(hours, 0) / 8, 0, 1), d: 0, ev: 0 });
  S.rep = Math.round(clamp(S.rep + 0.3, 0, 100) * 10) / 10;
  return { ok: true };
}

// ---- doelen, mijlpalen en de eindscore ----
export const GOALS = [
  { id: 'vergunning', label: 'Je eerste standplaats', test: (S, ctx) => Object.keys(S.stats.had).length >= 1 || SP.heldIds(S.permits, ctx.day).length >= 1 },
  { id: 'wagen', label: 'Je wagen op een standplaats', test: (S) => !!S.own.spot || S.stats.days > 0 },
  { id: 'drie', label: 'Drie standplaatsen tegelijk', test: (S, ctx) => SP.heldIds(S.permits, ctx.day).length >= 3 },
  { id: 'menu', label: 'Zes producten op het menu', test: (S) => S.own.menu.length >= 6 },
  { id: 'beste', label: 'Het beste plekje van de stad', test: (S) => !!S.stats.had[BEST_SPOT] },
  { id: 'overname', label: 'Een plek van Us Mem overgenomen', test: (S) => S.stats.takeovers >= 1 },
  { id: 'vloot', label: 'Vijf wagens op de weg', test: (S) => S.fleet.length >= 4 },
  { id: 'naam', label: 'Een naam van 80 of meer', test: (S) => S.rep >= 80 },
  { id: 'buurt', label: 'Een goede band met de buurt (goodwill 50)', test: (S) => S.gw.goodwill >= 50 || S.gw.disputes.won >= 1 },
  { id: 'bondgenoot', label: 'Een bondgenoot in de buurt', test: (S) => S.gw.allies.length >= 1 },
  { id: 'tien', label: 'Tien standplaatsen tegelijk', test: (S, ctx) => SP.heldIds(S.permits, ctx.day).length >= 10 },
  { id: 'helft', label: 'Meer plekken dan Us Mem', test: (S, ctx) => RV.shareOf(SP.heldIds(S.permits, ctx.day).length, S.rival) > 0.5 },
  { id: 'usmem', label: 'Us Mem is klein gekregen', test: (S, ctx) => SP.heldIds(S.permits, ctx.day).length >= 8 && RV.shareOf(SP.heldIds(S.permits, ctx.day).length, S.rival) >= 0.75 },
];
export const goalStatus = (S, ctx = {}) => GOALS.map((g) => ({ id: g.id, label: g.label, done: !!g.test(S, { day: Math.floor(finite(ctx.day, 0)) }) }));

// De eindscore "Snackimperium" (0 tot 100): aandeel plekken t.o.v. Us Mem (60), wagens (15), eigen ketens (10), naam (10), het beste plekje (5).
export function empireScore(S, day, { chains = 0 } = {}) {
  const held = SP.heldIds(S.permits, day).length;
  const share = RV.shareOf(held, S.rival);
  const wagons = (S.own.spot ? 1 : 0) + S.fleet.filter((w) => w.spot).length;
  const parts = { aandeel: Math.round(60 * share), wagens: Math.min(15, Math.round(wagons * 2.5)), ketens: Math.min(10, Math.round(clamp(chains, 0, 3) * 3.4)), naam: Math.round(S.rep / 10), plek: SP.permitHeld(S.permits, BEST_SPOT, day) ? 5 : 0 };
  return { score: clamp(Object.values(parts).reduce((a, b) => a + b, 0), 0, 100), share, held, wagons, parts, rival: S.rival.spots.length };
}
