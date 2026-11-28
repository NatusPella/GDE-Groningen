// De haken van het spel naar de snackwagen (Snackimperium, epic #1095, #1102): wat het menu en de kaart tonen (snackView) en elke actie met geld, tekst en
// claim voor Samen spelen. Alles per speler (#429): de toestand zit in bezit.x.snack (bezitlive.snackState). Geen DOM en geen THREE (scripts/snacklive_test.mjs).
//
// Samen spelen: elke speler heeft zijn eigen imperium en zijn eigen Us Mem; alleen de standplaats-claims ('sp:<id>', bezitcoop.js) zijn gedeeld: wat een medespeler
// in deze sessie heeft is voor jou niet te koop. Een gast kan meewerken in een wagen (bezitcoop.snackShare).

import { noteMoney } from './finance.js';
import { euro } from './geldtekst.js';
import * as L from './bezitlive.js';
import * as SN from './snackvan.js';
import * as SP from './pitch.js';
import * as RV from './rival.js';
import * as GW from './goodwill.js';
import { snackShare } from './bezitcoop.js';
import { branchOpen, branchHint } from './bezitgate.js';
import * as SS from './snackstory.js';
import { sendToVan, resumeFarmDeliveries, vanFarmStock } from './farmdelivery.js';
import { recordHelp, reputationNow } from './reputationlive.js';
import * as BL from './boerderijlive.js';
import * as DL from './deliveries.js';
import { rankView, raiseRank, rankTitle } from './snackrang.js';
import './snackrankscenes.js';                       // meldt de rangmomenten aan bij de gedeelde haak (rankmoments.js)

export const snackOpen = () => branchOpen('snack');
export const snackHint = () => branchHint('snack');
const money = (w) => (Number.isFinite(w && w.money) ? w.money : 0);
const spend = (w, n, post = 'Winkels') => { if (n > 0) { noteMoney(post); w.money -= n; } };
const earn = (w, n) => { if (n > 0) { noteMoney('Verkoop'); w.money += n; } };
const WHY = {
  'te-weinig-geld': (r) => `Je mist nog ${euro(r.tekort || 0)}.`, 'al-van-jou': () => 'Dat is al van jou.', bezet: () => 'Die plek is bezet.', onbekend: () => 'Dat bestaat niet.',
  'geen-vergunning': () => 'Daarvoor heb je eerst een vergunning nodig.', vol: () => 'Het is vol.', 'niet-van-hem': () => 'Dat is niet van Us Mem Snacks.', 'al-het-grootst': () => 'Groter bestaat niet.',
  'te-snel': (r) => `Dat heb je net gedaan: over ${r.wait || 1} dagen weer.`, 'geen-bondgenoten': () => 'Je hebt nog geen bondgenoten: help eerst de buurt.', 'geen-wagen': () => 'Daar staat geen wagen.', 'al-gedaan': () => 'Je hebt hier vandaag al meegewerkt.', 'geen-claim': () => 'Dat is niet van een medespeler.',
  leeg: (r) => (r && r.goed ? 'Daar ligt niets van op het erf van je boerderij.' : 'Er moet minstens één product op het menu.'), dicht: () => 'Daarvoor heb je koeling nodig.',
  schuur: () => 'De schuur gaf niets af.', opslag: () => 'Het bewaren lukte niet: er is niets verplaatst.',
};
const fail = (r) => ({ ok: false, why: r.why, text: (WHY[r.why] || (() => 'Dat lukt nu niet.'))(r) });
const closed = () => (snackOpen() ? null : { ok: false, why: 'dicht', text: snackHint() });
// Een fase van het verhaal (snackstory.js, wagen:*-vlaggen) die nog dicht is: de hint van het personage, nooit een leeg scherm.
const stage = (s) => { const h = SS.stageHint(s); return h ? { ok: false, why: 'verhaal', text: h } : null; };
const claim = (spot, action) => L.sendClaim && L.sendClaim({ id: SP.claimKey(spot), action });

// ---- rangen en recepten (#1378) ----
// De rang stijgt alleen (snackrang.raiseRank). Bij een stijging: een kaartje en de gedeelde haak (rankmoments.js) voor het verhaalmoment; main.js geeft de verzender met setSnackRankSend.
// Samen spelen: lokaal per speler; er gaat niets over het netwerk.
let rankSend = () => {};
export const setSnackRankSend = (fn) => { rankSend = typeof fn === 'function' ? fn : () => {}; };
export function checkRank(w, S = L.snackState()) {
  const r = raiseRank(S);
  if (!r) return null;
  L.markeer();
  if (w && typeof w.addMessage === 'function') w.addMessage(`Snackwagen: rang ${r.naar}, ${rankTitle(r.naar)}`, 5, { kind: 'prestatie', kicker: 'Snackwagen', key: 'snack-rang' });
  try { rankSend({ vak: 'horeca', van: r.van, naar: r.naar }); } catch (e) { /* het moment is bonus: de rang staat al */ }
  return r;
}
L.setSnackAfterTick((w, S) => { syncRecipes(w, S); checkRank(w, S); });
// De recepten van het verhaal: 'oma' met de fase menu (wagen:menu), 'gerda' met de fase gerda (wagen:gerda). Pas als de snackwagen zelf open is; zonder verhaal (oude save, dev) is alles open.
export function syncRecipes(w, S = L.snackState()) {
  if (!snackOpen()) return [];
  const learned = [];
  for (const [id, stage] of [['oma', 'menu'], ['gerda', 'gerda']]) {
    if (!SS.stageOpen(stage) || S.recipes.includes(id)) continue;
    const r = SN.learnRecipe(S, id);
    if (!r.ok) continue;
    learned.push(id);
    if (w && typeof w.addMessage === 'function') w.addMessage(`${SN.ITEMS[r.item].label} ${r.onMenu ? 'staat op je menu' : 'is nu te kiezen op je menu'}.`, 6, { kind: 'prestatie', kicker: 'Snackwagen', key: 'snack-recept-' + id });
  }
  if (learned.length) L.markeer();
  return learned;
}

// Wie heeft de plek: van jou, van Us Mem, van een medespeler of vrij.
export function spotStatus(S, id, day, claimOf = L.claimOfKey) {
  if (SP.permitHeld(S.permits, id, day)) return 'jij';
  if (RV.holds(S.rival, id)) return 'usmem';
  if (claimOf && claimOf(SP.claimKey(id))) return 'medespeler';
  return 'vrij';
}

// Wat de wagen die je zelf runt vandaag zou doen (zonder dat Us Mem ingrijpt): een proefdag op een kopie van de toestand. null zonder plek of wagen.
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
    return { id: s.id, name: s.name, short: s.short, place: s.place, x: xy.x, y: xy.y, foot: s.foot, status: st, price: SP.permitPrice(s.id, held.length), ask: st === 'usmem' ? RV.askPrice(s.id, S.rep, S.rival.rep) : 0,
      daysLeft: mine ? SP.permitDaysLeft(S.permits, s.id, day) : 0, renew: mine ? SP.renewalCost(s.id, held.length) : 0, claim: st === 'medespeler' ? L.claimOfKey(SP.claimKey(s.id)) : null,
      wagon: S.own.spot === s.id ? 'own' : (S.fleet.find((f) => f.spot === s.id) || {}).id || null };
  });
}
// Het blok Buurt en klanten: tevredenheid, goodwill, bondgenoten, vaste klanten per eigen plek met wat er te doen is, en de plekken van medespelers waar je kunt meewerken.
function neighbourhood(S, day) {
  const g = S.gw;
  const spots = SP.heldIds(S.permits, day).map((id) => ({ id, short: SP.spotDef(id).short, loyal: Math.round(g.loyal[id] || 0), cap: GW.loyalCap(g, id), helped: g.helped[id] || 0,
    help: GW.HELP_IDS.map((k) => ({ id: k, label: GW.HELP[k].label, cost: GW.HELP[k].cost, wait: Math.max(0, Math.ceil(GW.HELP[k].cd - (day - (g.cd[`${k}:${id}`] ?? -1e9)))) })) }));
  return { sat: Math.round(g.sat), goodwill: Math.round(g.goodwill), allies: g.allies.map((a) => GW.ALLY_NAMES[a]), disputes: g.disputes, spots,
    helpers: SP.SPOTS.filter((s) => spotStatus(S, s.id, day) === 'medespeler').map((s) => ({ id: s.id, short: s.short, claim: L.claimOfKey(SP.claimKey(s.id)), done: (g.work[s.id] ?? -1) >= day })) };
}
export function snackView(w) {
  const S = L.snackState(), day = L.calToday(), held = SP.heldIds(S.permits, day);
  syncRecipes(w, S);
  const owner = L.snackChainOwner();
  const spots = spotRows();
  const own = { ...S.own, forecast: forecastOwn(), hasWagon: L.myMobile().some((m) => m.id === 'frietwagen'), tierDef: SN.TIERS[S.own.tier], numbers: SN.offeringNumbers(S.own.menu, S.up, owner) };
  const sc = SN.empireScore(S, day, { chains: L.chainViews().filter((c) => c.closedDays > 0 || c.margin >= 0.3).length });
  return { open: snackOpen(), hint: snackOpen() ? '' : snackHint(), day, money: money(w), active: SN.isActive(S), rep: S.rep, effRep: SN.effRep(S, day), up: S.up, spots, own, fleet: S.fleet.map((f) => ({ ...f, tierDef: SN.TIERS[f.tier], wage: SN.staffWage(f.staff.skill, f.wageUp), spotName: f.spot ? SP.spotDef(f.spot).short : null })),
    rival: { name: RV.RIVAL_NAME, owner: RV.RIVAL_OWNER, spots: S.rival.spots.length, pand: S.rival.pand, chain: S.rival.chain, mood: S.rival.mood, rep: S.rival.rep }, gw: neighbourhood(S, day), score: sc, goals: SN.goalStatus(S, { day }), pending: SN.pendingEvent(S), war: S.ev.war && S.ev.war.until >= day ? S.ev.war : null,
    rang: rankView(S), pantry: pantryView(S),
    menu: SN.ITEM_IDS.filter((id) => !SN.ITEMS[id].recipe || S.recipes.includes(SN.ITEMS[id].recipe)).map((id) => ({ id, ...SN.ITEMS[id], on: S.own.menu.includes(id), unlocked: SN.offeringUnlocked(S, id), chainOwn: SN.ITEMS[id].chain ? owner(SN.ITEMS[id].chain) : 0 })),
    wagonPrice: SN.wagonPrice(S.fleet.length), stats: S.stats, stages: SS.stageView(), reputatie: reputationNow(S.own.spot) };
}

// De wagens die in de wereld staan (voor snackvans3d.js; goedkoop, geen voorspelling): de jouwe, die van je medewerkers en die van Us Mem Snacks op zijn plekken.
// Alleen als de poort open is.
export function wagonSites() {
  if (!snackOpen()) return [];
  const S = L.snackState(), day = L.calToday(), out = [];
  const add = (spot, kind, staff) => { const p = SP.spotXY(spot); if (p) out.push({ spot, x: p.x, y: p.y, kind, staff }); };
  if (S.own.spot && SP.permitHeld(S.permits, S.own.spot, day) && L.myMobile().some((m) => m.id === 'frietwagen')) add(S.own.spot, 'own');
  for (const f of S.fleet) if (f.spot && SP.permitHeld(S.permits, f.spot, day)) add(f.spot, 'fleet', f.staff.name);
  if (!SS.stageOpen('naam')) for (const o of out) if (o.kind !== 'rival') o.sign = SS.PLAIN_SIGN;     // de eigen naam komt pas met wagen:naam
  for (const id of S.rival.spots) if (!SP.permitHeld(S.permits, id, day)) add(id, 'rival');
  return out;
}

export function buyVan(w) { const c = closed(); if (c) return c; return L.koopMobiel(w, 'frietwagen'); }
export function koopVergunning(w, spot) {
  const c = closed() || stage('stek'); if (c) return c;
  const S = L.snackState(), r = SN.buyPermit(S, spot, L.calToday(), money(w), { taken: (id) => !!L.claimOfKey(SP.claimKey(id)) });
  if (!r.ok) return fail(r);
  spend(w, r.cost); claim(spot, 'claim'); L.markeer(); checkRank(w, S);
  return { ok: true, cost: r.cost, text: `Vergunning voor ${SP.spotDef(spot).short} is van jou voor ${euro(r.cost)}: ${SP.PERMIT_DAYS} speldagen geldig.` };
}
export function acquireRivalSpot(w, spot) {
  const c = closed() || stage('keten'); if (c) return c;
  const S = L.snackState(), r = SN.bidForSpot(S, spot, L.calToday(), money(w), { taken: (id) => !!L.claimOfKey(SP.claimKey(id)) });
  if (!r.ok) return fail(r);
  spend(w, r.cost); claim(spot, 'claim'); L.markeer(); checkRank(w, S);
  return { ok: true, cost: r.cost, text: `Je hebt ${SP.spotDef(spot).short} overgenomen van Us Mem Snacks voor ${euro(r.cost)}.` };
}
export function placeVan(spot) {
  const c = closed() || (spot !== null ? stage('standplaats') : null); if (c) return c;
  const S = L.snackState();
  if (spot !== null && !SP.permitHeld(S.permits, spot, L.calToday())) return fail({ why: 'geen-vergunning' });
  const r = SN.setOwn(S, { spot });
  if (!r.ok) return fail(r);
  S.own.stockDays = Math.max(S.own.stockDays, 0); L.markeer();
  return { ok: true, text: spot ? `Je snackwagen staat bij ${SP.spotDef(spot).short}.` : 'Je snackwagen staat thuis.' };
}
export function zetOpen(patch) { const r = SN.setOwn(L.snackState(), patch); if (r.ok) L.markeer(); return r.ok ? { ok: true, text: 'Opgeslagen.' } : fail(r); }
export function refillStock(w) { const c = closed(); if (c) return c; const r = SN.restock(L.snackState(), money(w)); if (!r.ok) return r.why === 'vol' ? { ok: false, text: 'De wagen is al helemaal gevuld.' } : fail(r); spend(w, r.cost, 'Overige uitgaven'); L.markeer(); return { ok: true, cost: r.cost, text: `De wagen is gevuld voor ${SN.STOCK_MAX} dagen (${euro(r.cost)} voor de rit).` }; }
export function koopUpgrade(w, id) { const c = closed(); if (c) return c; const r = SN.buyUpgrade(L.snackState(), id, money(w)); if (!r.ok) return fail(r); spend(w, r.cost); L.markeer(); return { ok: true, cost: r.cost, text: `${SN.UPGRADES[id].label} is aangeschaft voor ${euro(r.cost)}.` }; }
export function upgradeVan(w, wagon) { const c = closed(); if (c) return c; const r = SN.upgradeTier(L.snackState(), wagon, money(w)); if (!r.ok) return fail(r); spend(w, r.cost); L.markeer(); return { ok: true, cost: r.cost, text: `Een ${SN.TIERS[r.tier].label.toLowerCase()} voor ${euro(r.cost)}.` }; }
export function koopVloot(w, spot, mode = 'loon') {
  const c = closed() || stage('team') || (L.snackState().fleet.length >= 1 ? stage('keten') : null); if (c) return c;
  const S = L.snackState(), r = SN.buyFleetWagon(S, spot, L.calToday(), money(w), mode);
  if (!r.ok) return fail(r);
  spend(w, r.cost); L.markeer(); checkRank(w, S);
  return { ok: true, cost: r.cost, text: `Een extra wagen bij ${SP.spotDef(spot).short} met ${r.wagon.staff.name} achter het luik, voor ${euro(r.cost)}.` };
}
export function verkoopVloot(w, id) { const r = SN.sellFleetWagon(L.snackState(), id); if (!r.ok) return fail(r); earn(w, r.refund); L.markeer(); return { ok: true, refund: r.refund, text: `Wagen verkocht voor ${euro(r.refund)}.` }; }
export function moveFleet(w, id, spot) { const r = SN.moveFleetWagon(L.snackState(), id, spot, L.calToday(), money(w)); if (!r.ok) return fail(r); spend(w, r.cost, 'Overige uitgaven'); L.markeer(); return { ok: true, cost: r.cost, text: `De wagen staat nu bij ${SP.spotDef(spot).short} (${euro(r.cost)} verhuiskosten).` }; }
export function zetModus(id, mode) { const r = SN.setFleetMode(L.snackState(), id, mode); if (r.ok) L.markeer(); return r.ok ? { ok: true, text: mode === 'aandeel' ? 'Je verkoper krijgt 30% van de winst.' : 'Je verkoper krijgt een vast loon.' } : fail(r); }
export function offeringButton(id) { const g = closed() || stage('menu'); if (g) return g; const r = SN.toggleOffering(L.snackState(), id); if (r.ok) L.markeer(); return r.ok ? { ok: true, text: '' } : { ok: false, text: r.why === 'vol' ? 'Het menu zit vol: een grotere wagen heeft meer plekken.' : fail(r).text }; }
export function answerEvent(w, choice) {
  const S = L.snackState(), p = SN.pendingEvent(S), spot = p ? p.spot : null;
  const r = SN.answerEvent(S, choice, L.calToday(), money(w));
  if (!r.ok) return fail(r);
  spend(w, r.cost, 'Overige uitgaven'); earn(w, r.gain);
  if (p && p.kind === 'bod' && choice === 'verkoop' && spot) claim(spot, 'release');
  L.markeer();
  return { ok: true, cost: r.cost, text: r.text };
}

// Hulp aan de buurt (goodwill.js): gratis porties, een schoonmaakdag of een buurtavond op een plek waar je een vergunning hebt. Kost geld, geeft goodwill en vaste klanten.
export function helpNeighbourhood(w, spot, kind) {
  const c = closed(); if (c) return c;
  const r = SN.helpNeighbourhood(L.snackState(), spot, kind, L.calToday(), money(w));
  if (!r.ok) return fail(r);
  spend(w, r.cost, 'Overige uitgaven'); L.markeer();
  recordHelp(spot, kind === 'avond' ? 3 : kind === 'buurthuis' ? 2 : 1);
  return { ok: true, cost: r.cost, text: r.text };
}

// Meewerken achter het luik van een medespeler (zijn plek staat als claim 'sp:<plek>'): jij krijgt uurloon uit nieuw geld (bezitcoop.snackShare), hij verkoopt die dag 8% meer.
// Het netwerkbericht regelt de aanroeper met setSnackWorkSend(fn); fn krijgt { type: 'snack-work', spot, hours }. Hoogstens eenmaal per plek per speldag.
let workSend = () => {};
export const setSnackWorkSend = (fn) => { workSend = typeof fn === 'function' ? fn : () => {}; };
export function workAlong(w, spot, hours = 6) {
  const c = closed(); if (c) return c;
  const S = L.snackState(), day = L.calToday();
  if (!SP.isSpot(spot) || !L.claimOfKey(SP.claimKey(spot))) return fail({ why: 'geen-claim' });
  if ((S.gw.work[spot] ?? -1) >= day) return fail({ why: 'al-gedaan' });
  const h = Math.max(1, Math.min(10, Math.round(Number(hours) || 6)));
  const share = snackShare({ net: 0, hours: h, mode: 'loon' });
  S.gw.work[spot] = day; earn(w, share.guest.wage); L.markeer();
  workSend({ type: 'snack-work', spot, hours: h });
  return { ok: true, wage: share.guest.wage, text: `Je hebt ${h} uur meegewerkt bij ${SP.spotDef(spot).short} en verdient ${euro(share.guest.wage)}.` };
}
// De eigenaarskant: een medespeler werkte mee in jouw wagen (het ontvangen bericht van meewerken). Geeft { ok } of { ok: false, why }.
export function receiveWork(msg) {
  if (!msg || msg.type !== 'snack-work' || !SP.isSpot(msg.spot)) return { ok: false, why: 'onbekend' };
  const r = SN.receiveHelper(L.snackState(), msg.spot, Number(msg.hours) || 0, L.calToday());
  if (r.ok) L.markeer();
  return r;
}


// Goederen van je eigen boerderij naar de wagen (farmdelivery.js, #1379 X1): één pad over twee opslagen, per speler. Een gast gebruikt zijn eigen boerderij en wagen,
// nooit de goederen van de host. Een onderbroken levering wordt elke speldag afgemaakt (de haak van bezitlive.dayTick).
export const sendFarmGoods = (good, kg, estate) => sendToVan(good, kg, estate);
export const farmGoodsInVan = () => vanFarmStock();
L.setDagHaak(() => resumeFarmDeliveries());

// ---- goederen van je erf in de wagen, voor het paneel Rang en voorraad (#1378, S4) ----
// Het enige voorraadpad is het gedeelde leveringsmodel (farmdelivery.js): de goederen gaan eerst van het erf af, daarna bij de wagen erbij, en bij een mislukte tweede stap gaat alles terug.
// Wat er in de wagen ligt en wat er op het erf van je boerderij te halen is, per goed (snackvan.FARM_GOODS).
export function pantryView(S = L.snackState()) {
  let erf = () => 0;
  try { erf = BL.oogstOpErf; } catch (e) { erf = () => 0; }
  return SN.FARM_GOODS.map((g) => { let barn = 0; try { barn = erf(g) || 0; } catch (e) { barn = 0; } return { id: g, label: DL.GOODS[g].label, kg: S.own.stock[g] || 0, max: SN.FARM_STOCK_MAX, barn, value: SN.FARM_CREDIT_PER_KG }; });
}
// Kilo's van het erf in de wagen via sendToVan. Per speler: je eigen boerderij, je eigen wagen; een gast die in jouw wagen meewerkt gebruikt jouw voorraad niet (alleen de eigenaar vult hem).
export function vulUitSchuur(w, goed, kg = 20) {
  const c = closed(); if (c) return c;
  const r = sendToVan(goed, kg);
  if (!r.ok) return { ok: false, goed: true, text: r.text };
  return { ok: true, kg: r.delivered, text: r.text };
}
