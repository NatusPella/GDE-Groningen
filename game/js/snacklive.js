// De haken van het spel naar de snackwagen (Snackimperium, epic #1095, #1102): wat het menu en de kaart tonen (snackView) en elke actie met geld, tekst en
// claim voor Samen spelen. Alles per speler (#429): de toestand zit in bezit.x.snack (bezitlive.snackState). Geen DOM en geen THREE (scripts/snacklive_test.mjs).
//
// Samen spelen: elke speler heeft zijn eigen imperium en zijn eigen Usmem; alleen de standplaats-claims ('sp:<id>', bezitcoop.js) zijn gedeeld: wat een medespeler
// in deze sessie heeft is voor jou niet te koop. Een gast kan meewerken in een wagen (bezitcoop.snackShare).

import { noteMoney } from './finance.js';
import { euro } from './geldtekst.js';
import * as L from './bezitlive.js';
import * as SN from './snackwagen.js';
import * as SP from './standplaats.js';
import * as RV from './rival.js';
import { branchOpen, branchHint } from './bezitgate.js';

export const snackOpen = () => branchOpen('snack');
export const snackHint = () => branchHint('snack');
const money = (w) => (Number.isFinite(w && w.money) ? w.money : 0);
const spend = (w, n, post = 'Winkels') => { if (n > 0) { noteMoney(post); w.money -= n; } };
const earn = (w, n) => { if (n > 0) { noteMoney('Verkoop'); w.money += n; } };
const WHY = {
  'te-weinig-geld': (r) => `Je mist nog ${euro(r.tekort || 0)}.`, 'al-van-jou': () => 'Dat is al van jou.', bezet: () => 'Die plek is bezet.', onbekend: () => 'Dat bestaat niet.',
  'geen-vergunning': () => 'Daarvoor heb je eerst een vergunning nodig.', vol: () => 'Het is vol.', 'niet-van-hem': () => 'Dat is niet van Usmem Snacks.', 'al-het-grootst': () => 'Groter bestaat niet.',
  leeg: () => 'Er moet minstens één product op het menu.', dicht: () => 'Daarvoor heb je koeling nodig.',
};
const fail = (r) => ({ ok: false, why: r.why, text: (WHY[r.why] || (() => 'Dat lukt nu niet.'))(r) });
const closed = () => (snackOpen() ? null : { ok: false, why: 'dicht', text: snackHint() });
const claim = (spot, action) => L.sendClaim && L.sendClaim({ id: SP.claimKey(spot), action });

// Wie heeft de plek: van jou, van Usmem, van een medespeler of vrij.
export function spotStatus(S, id, day, claimOf = L.claimOfKey) {
  if (SP.permitHeld(S.permits, id, day)) return 'jij';
  if (RV.holds(S.rival, id)) return 'usmem';
  if (claimOf && claimOf(SP.claimKey(id))) return 'medespeler';
  return 'vrij';
}

// Wat de wagen die je zelf runt vandaag zou doen (zonder dat Usmem ingrijpt): een proefdag op een kopie van de toestand. null zonder plek of wagen.
export function forecastOwn() {
  const S = L.snackState(), day = L.calToday();
  if (!S.own.spot || !SP.permitHeld(S.permits, S.own.spot, day) || !L.myMobile().some((m) => m.id === 'frietwagen')) return null;
  const c = structuredClone(S); c.rival.lastEvent = 1e9; c.rival.lastOffer = 1e9; c.ev.pending = c.ev.pending || null; c.own.stockDays = Math.max(1, c.own.stockDays);
  const r = SN.settleDay(c, { day, weekend: L.weekendOf(day), kermisAt: L.kermisAtOn(day), money: 1e9, ownWagon: true, ownQ: 100, chainOwn: L.snackChainOwner() });
  return r.own ? { demand: r.own.demand, sold: r.own.sold, unserved: r.own.unserved, revenue: r.own.revenue, net: r.own.net, note: r.own.note } : null;
}

// Alles voor het menu, de kaartlaag en de wagens in beeld.
export function spotRows() {
  const S = L.snackState(), day = L.calToday(), held = SP.heldIds(S.permits, day);
  return SP.SPOTS.map((s) => {
    const st = spotStatus(S, s.id, day), xy = SP.spotXY(s.id), mine = st === 'jij';
    return { id: s.id, name: s.name, short: s.short, place: s.place, x: xy.x, y: xy.y, foot: s.foot, status: st, price: SP.permitPrice(s.id, held.length), ask: st === 'usmem' ? RV.askPrice(s.id, S.rep) : 0,
      daysLeft: mine ? SP.permitDaysLeft(S.permits, s.id, day) : 0, renew: mine ? SP.renewalCost(s.id, held.length) : 0, claim: st === 'medespeler' ? L.claimOfKey(SP.claimKey(s.id)) : null,
      wagon: S.own.spot === s.id ? 'own' : (S.fleet.find((f) => f.spot === s.id) || {}).id || null };
  });
}
export function snackView(w) {
  const S = L.snackState(), day = L.calToday(), held = SP.heldIds(S.permits, day);
  const owner = L.snackChainOwner();
  const spots = spotRows();
  const own = { ...S.own, forecast: forecastOwn(), hasWagon: L.myMobile().some((m) => m.id === 'frietwagen'), tierDef: SN.TIERS[S.own.tier], numbers: SN.menuNumbers(S.own.menu, S.up, owner) };
  const sc = SN.empireScore(S, day, { chains: L.chainViews().filter((c) => c.closedDays > 0 || c.margin >= 0.3).length });
  return { open: snackOpen(), hint: snackOpen() ? '' : snackHint(), day, money: money(w), active: SN.isActive(S), rep: S.rep, effRep: SN.effRep(S, day), up: S.up, spots, own, fleet: S.fleet.map((f) => ({ ...f, tierDef: SN.TIERS[f.tier], wage: SN.staffWage(f.staff.skill, f.wageUp), spotName: f.spot ? SP.spotDef(f.spot).short : null })),
    rival: { name: RV.RIVAL_NAME, owner: RV.RIVAL_OWNER, spots: S.rival.spots.length, pand: S.rival.pand, chain: S.rival.chain, mood: S.rival.mood }, score: sc, goals: SN.goalStatus(S, { day }), pending: SN.pendingEvent(S), war: S.ev.war && S.ev.war.until >= day ? S.ev.war : null,
    menu: SN.ITEM_IDS.map((id) => ({ id, ...SN.ITEMS[id], on: S.own.menu.includes(id), unlocked: SN.menuUnlocked(S, id), chainOwn: SN.ITEMS[id].chain ? owner(SN.ITEMS[id].chain) : 0 })),
    wagonPrice: SN.wagonPrice(S.fleet.length), stats: S.stats };
}

// De wagens die in de wereld staan (voor snackwagens3d.js; goedkoop, geen voorspelling): de jouwe, die van je medewerkers en die van Usmem Snacks op zijn plekken.
// Alleen als de poort open is.
export function wagonSites() {
  if (!snackOpen()) return [];
  const S = L.snackState(), day = L.calToday(), out = [];
  const add = (spot, kind, staff) => { const p = SP.spotXY(spot); if (p) out.push({ spot, x: p.x, y: p.y, kind, staff }); };
  if (S.own.spot && SP.permitHeld(S.permits, S.own.spot, day) && L.myMobile().some((m) => m.id === 'frietwagen')) add(S.own.spot, 'own');
  for (const f of S.fleet) if (f.spot && SP.permitHeld(S.permits, f.spot, day)) add(f.spot, 'fleet', f.staff.name);
  for (const id of S.rival.spots) if (!SP.permitHeld(S.permits, id, day)) add(id, 'rival');
  return out;
}

export function koopWagen(w) { const c = closed(); if (c) return c; return L.koopMobiel(w, 'frietwagen'); }
export function koopVergunning(w, spot) {
  const c = closed(); if (c) return c;
  const S = L.snackState(), r = SN.buyPermit(S, spot, L.calToday(), money(w), { taken: (id) => !!L.claimOfKey(SP.claimKey(id)) });
  if (!r.ok) return fail(r);
  spend(w, r.cost); claim(spot, 'claim'); L.markeer();
  return { ok: true, cost: r.cost, text: `Vergunning voor ${SP.spotDef(spot).short} is van jou voor ${euro(r.cost)}: ${SP.PERMIT_DAYS} speldagen geldig.` };
}
export function neemOver(w, spot) {
  const c = closed(); if (c) return c;
  const S = L.snackState(), r = SN.bidTakeover(S, spot, L.calToday(), money(w), { taken: (id) => !!L.claimOfKey(SP.claimKey(id)) });
  if (!r.ok) return fail(r);
  spend(w, r.cost); claim(spot, 'claim'); L.markeer();
  return { ok: true, cost: r.cost, text: `Je hebt ${SP.spotDef(spot).short} overgenomen van Usmem Snacks voor ${euro(r.cost)}.` };
}
export function zetWagen(spot) {
  const c = closed(); if (c) return c;
  const S = L.snackState();
  if (spot !== null && !SP.permitHeld(S.permits, spot, L.calToday())) return fail({ why: 'geen-vergunning' });
  const r = SN.setOwn(S, { spot });
  if (!r.ok) return fail(r);
  S.own.stockDays = Math.max(S.own.stockDays, 0); L.markeer();
  return { ok: true, text: spot ? `Je snackwagen staat bij ${SP.spotDef(spot).short}.` : 'Je snackwagen staat thuis.' };
}
export function zetOpen(patch) { const r = SN.setOwn(L.snackState(), patch); if (r.ok) L.markeer(); return r.ok ? { ok: true, text: 'Opgeslagen.' } : fail(r); }
export function vulAan(w) { const c = closed(); if (c) return c; const r = SN.restock(L.snackState(), money(w)); if (!r.ok) return r.why === 'vol' ? { ok: false, text: 'De wagen is al helemaal gevuld.' } : fail(r); spend(w, r.cost, 'Overige uitgaven'); L.markeer(); return { ok: true, cost: r.cost, text: `De wagen is gevuld voor ${SN.STOCK_MAX} dagen (${euro(r.cost)} voor de rit).` }; }
export function koopUpgrade(w, id) { const c = closed(); if (c) return c; const r = SN.buyUpgrade(L.snackState(), id, money(w)); if (!r.ok) return fail(r); spend(w, r.cost); L.markeer(); return { ok: true, cost: r.cost, text: `${SN.UPGRADES[id].label} is aangeschaft voor ${euro(r.cost)}.` }; }
export function grotereWagen(w, wagon) { const c = closed(); if (c) return c; const r = SN.upgradeTier(L.snackState(), wagon, money(w)); if (!r.ok) return fail(r); spend(w, r.cost); L.markeer(); return { ok: true, cost: r.cost, text: `Een ${SN.TIERS[r.tier].label.toLowerCase()} voor ${euro(r.cost)}.` }; }
export function koopVloot(w, spot, mode = 'loon') {
  const c = closed(); if (c) return c;
  const r = SN.buyFleetWagon(L.snackState(), spot, L.calToday(), money(w), mode);
  if (!r.ok) return fail(r);
  spend(w, r.cost); L.markeer();
  return { ok: true, cost: r.cost, text: `Een extra wagen bij ${SP.spotDef(spot).short} met ${r.wagon.staff.name} achter het luik, voor ${euro(r.cost)}.` };
}
export function verkoopVloot(w, id) { const r = SN.sellFleetWagon(L.snackState(), id); if (!r.ok) return fail(r); earn(w, r.refund); L.markeer(); return { ok: true, refund: r.refund, text: `Wagen verkocht voor ${euro(r.refund)}.` }; }
export function verplaatsVloot(w, id, spot) { const r = SN.moveFleetWagon(L.snackState(), id, spot, L.calToday(), money(w)); if (!r.ok) return fail(r); spend(w, r.cost, 'Overige uitgaven'); L.markeer(); return { ok: true, cost: r.cost, text: `De wagen staat nu bij ${SP.spotDef(spot).short} (${euro(r.cost)} verhuiskosten).` }; }
export function zetModus(id, mode) { const r = SN.setFleetMode(L.snackState(), id, mode); if (r.ok) L.markeer(); return r.ok ? { ok: true, text: mode === 'aandeel' ? 'Je verkoper krijgt 30% van de winst.' : 'Je verkoper krijgt een vast loon.' } : fail(r); }
export function menuKnop(id) { const r = SN.toggleMenuItem(L.snackState(), id); if (r.ok) L.markeer(); return r.ok ? { ok: true, text: '' } : { ok: false, text: r.why === 'vol' ? 'Het menu zit vol: een grotere wagen heeft meer plekken.' : fail(r).text }; }
export function antwoord(w, choice) {
  const S = L.snackState(), p = SN.pendingEvent(S), spot = p ? p.spot : null;
  const r = SN.answerEvent(S, choice, L.calToday(), money(w));
  if (!r.ok) return fail(r);
  spend(w, r.cost, 'Overige uitgaven'); earn(w, r.gain);
  if (p && p.kind === 'bod' && choice === 'verkoop' && spot) claim(spot, 'release');
  L.markeer();
  return { ok: true, cost: r.cost, text: r.text };
}
