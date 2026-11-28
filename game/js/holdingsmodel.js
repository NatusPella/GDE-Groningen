// Het model achter het beheerscherm van Bezit (epic #1095, #1101; ontwerp docs/BEZIT-21-11.md 5.3): één lijst van al je percelen met stand,
// opbrengst per dag en aandachtspunten; sorteren (rijp eerst), filteren (streek, soort, beheerniveau), selectie en bulkacties (zaai alles, oogst
// alles, verpacht, personeel, gewas kiezen), regels ("teeltplan per streek") en de dagverwerking van personeel, pacht en vee. Puur: geen DOM, geen
// THREE, geen klok, geen Math.random, opslag als parameter (scripts/holdingsmodel_test.mjs); het scherm (pausemenu.js) tekent alleen wat dit geeft.
// Geschikt voor duizend percelen: elke functie loopt één keer over de rijen (test: minder dan 20 ms per berekening).
// Samen spelen: het beheer is per speler (#429): het scherm leest alleen het eigen bezit en de eigen boerderij.

import * as B from './boerderij.js';
import * as PC from './percelen.js';
import * as FS from './farmstatus.js';
import { standVan } from './farmmodel.js';
import { setParcelMode, MODES } from './bezit.js';
import { leaseOutPerDay } from './bezitprijs.js';
import { dagVan } from './gewasmarkt.js';
import { LOONWERKER, LOONWERK_AFLEVEREN, loonwerkKosten } from './machines.js';
import { fieldPhase, workField, workUnits, unitScale } from './parcelfarm.js';
import { staffOf, staffCapacity, staffDayTick, leaseDayTick, planStaffDay, mgmtFactor, managedCount, paidFor, sellLoad, SKILL_RATIO, MAX_CATCHUP_DAYS } from './farmstaff.js';
import { herdsOf, livestockDayTick, visibleAnimals, PRODUCT_PRICE, SPECIES } from './livestock.js';
import { areaPrice } from './bezithooks.js';
import { klusVan } from './dierklus.js';

// Wat een dag vee-opbrengst oplevert: de streekprijs van de streek van de grootste kudde van dit product (bezithooks.js, met verzadiging door wat je levert), zonder haak de vaste prijs.
// Eieren gaan per stuk (PRODUCT_PRICE) maar de markt rekent per kilo (acht per kilo).
const EGG_KG = 0.125;
export function livestockRevenue(product, amount, day, herds) {
  const base = PRODUCT_PRICE[product];
  if (!(amount > 0) || !(base > 0)) return 0;
  let parcelId = null, biggest = 0;
  for (const id of Object.keys(herds || {})) { const h = herds[id], sp = SPECIES[h.sp]; if (sp && sp.product === product && h.n > biggest) { biggest = h.n; parcelId = id; } }
  if (product === 'eieren') return Math.round(amount * areaPrice('eieren', amount * EGG_KG, day, parcelId, base / EGG_KG) * EGG_KG);
  return Math.round(amount * areaPrice(product, amount, day, parcelId, base));
}
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export const LEVELS = ['self', 'leased', 'staff'];
export const LEVEL_NAME = { self: 'Zelf', leased: 'Verpacht', staff: 'Personeel' };
export const SORTS = ['ripe', 'name', 'ha', 'income', 'region'];
export const ATTENTION = {
  rijp: { naam: 'Oogstklaar', prio: 0 },
  'zieke-kudde': { naam: 'Zieke kudde', prio: 1 },
  braak: { naam: 'Ligt braak', prio: 3 },
  'grond-moe': { naam: 'Grond is moe', prio: 4 },
  wacht: { naam: 'Wacht op personeel', prio: 2 },
};
export const TIRED_SOIL = 0.2;

// ---- de lijst ----
// ctx: { day, regionOf(id) (als het perceel zelf geen streek heeft), plan: planStaffDay (voor "wacht op personeel") }
// Eén rij per perceel van het bezit dat in het register staat. De rij is een gewoon object: het scherm mag het bewaren tot de volgende tik.
export function holdingRows(bezit, farm, ctx = {}) {
  const herds = herdsOf(bezit);
  const mf = mgmtFactor(managedCount(bezit));
  const waiting = new Set();
  if (ctx.waiting) for (const id of ctx.waiting) waiting.add(id);
  const rows = [];
  for (const id in bezit.parcels) {
    const rec = bezit.parcels[id];
    const def = PC.perceelDef(id);
    if (!def) continue;
    const v = B.veldStand(farm, id);
    const statusId = FS.statusIdVan(v, farm.uren);
    const phase = fieldPhase(farm, id);
    const plan = B.planVoor(farm, id);
    const crop = v.fase === 'gezaaid' ? v.gewas : v.stoppel || null;
    const herd = herds[id] || null;
    const level = rec.m;
    const ripe = phase === 'rijp';
    const g = B.GEWASSEN[v.fase === 'gezaaid' ? v.gewas : plan] || null;
    const uit = farm.bodemlog[id] ? farm.bodemlog[id].u : 0;
    const expectedKg = g ? Math.round((g.kgBasis * PC.bodemFactor(def.bodem) * workUnits(def.ha) * (1 - uit)) / 10) * 10 : 0;
    const cycle = g ? Math.ceil(g.groeiUren / PC.DAG_UREN) + 1 : 3;
    let incomeDay = 0;
    if (level === 'leased') incomeDay = Math.round(leaseOutPerDay(paidFor(rec, id)) * mf);
    else if (level === 'staff' && g) incomeDay = Math.round(((expectedKg * g.prijsKg * SKILL_RATIO[2] * mf) / cycle) / 5) * 5;
    const attention = [];
    if (ripe && level === 'self') attention.push('rijp');
    if (herd && herd.sick > 0) attention.push('zieke-kudde');
    if (level === 'self' && phase === 'braak' && !herd) attention.push('braak');
    if (level === 'staff' && waiting.has(id)) attention.push('wacht');
    if (uit >= TIRED_SOIL) attention.push('grond-moe');
    rows.push({
      id, name: def.naam, kind: rec.k, soort: def.soort, ha: def.ha, region: def.region || (ctx.regionOf && ctx.regionOf(id)) || 'overig',
      level, statusId, stand: standVan(statusId), phase, ripe, groei: v.fase === 'gezaaid' && g ? clamp((farm.uren - v.gezaaidOp) / g.groeiUren, 0, 1) : 0,
      crop, plan, expectedKg, incomeDay, herd: herd ? { sp: herd.sp, n: herd.n, sick: herd.sick, visible: visibleAnimals(herd.n) } : null, attention,
      rang: ripe ? 0 : attention.length ? 1 : phase === 'groeit' ? 3 : 2,
    });
  }
  return rows;
}

// ---- sorteren en filteren ----
const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const SORTERS = {
  ripe: (a, b) => a.rang - b.rang || b.incomeDay - a.incomeDay || byName(a, b),   // rijp eerst, dan wat aandacht vraagt, dan de rest
  name: byName,
  ha: (a, b) => b.ha - a.ha || byName(a, b),
  income: (a, b) => b.incomeDay - a.incomeDay || byName(a, b),
  region: (a, b) => (a.region < b.region ? -1 : a.region > b.region ? 1 : byName(a, b)),
};
export const sortRows = (rows, by = 'ripe') => rows.slice().sort(SORTERS[by] || SORTERS.ripe);

// filter: { region, soort, level, phase, attention (true: alleen met aandacht), search } ; leeg of 'alle' telt niet mee.
export function filterRows(rows, f = {}) {
  const on = (x) => x !== undefined && x !== null && x !== '' && x !== 'alle';
  const q = on(f.search) ? String(f.search).toLowerCase() : null;
  return rows.filter((r) => (!on(f.region) || r.region === f.region) && (!on(f.soort) || r.soort === f.soort) && (!on(f.level) || r.level === f.level)
    && (!on(f.phase) || r.phase === f.phase) && (!f.attention || r.attention.length > 0) && (!q || r.name.toLowerCase().includes(q)));
}
// Wat er te kiezen valt in de filters, uit de rijen zelf.
export function filterOptions(rows) {
  const districtIds = new Set(), soorten = new Set();
  for (const r of rows) { districtIds.add(r.region); soorten.add(r.soort); }
  return { regions: [...districtIds].sort(), soorten: [...soorten].sort(), levels: LEVELS.slice() };
}

// ---- selectie: een Set van id's ----
export const newSelection = () => new Set();
export function toggleSelect(sel, id) { if (sel.has(id)) sel.delete(id); else sel.add(id); return sel.has(id); }
export function selectRows(sel, rows) { for (const r of rows) sel.add(r.id); return sel; }
export const clearSelection = (sel) => { sel.clear(); return sel; };
export const selectedIds = (sel, rows) => rows.filter((r) => sel.has(r.id)).map((r) => r.id);
// Een selectie die niet meer bestaat (verkocht) opruimen.
export function pruneSelection(sel, bezit) { for (const id of [...sel]) if (!bezit.parcels[id]) sel.delete(id); return sel; }

// ---- overzicht en aandachtspunten ----
export function summarize(rows) {
  const s = { count: rows.length, ha: 0, ripe: 0, attention: 0, byLevel: { self: 0, leased: 0, staff: 0 }, incomeDay: 0, herds: 0, animals: 0 };
  for (const r of rows) {
    s.ha += r.ha; s.byLevel[r.level]++; s.incomeDay += r.incomeDay;
    if (r.ripe) s.ripe++;
    if (r.attention.length) s.attention++;
    if (r.herd) { s.herds++; s.animals += r.herd.n; }
  }
  s.ha = Math.round(s.ha * 100) / 100;
  return s;
}

// De aandachtspunten voor bovenaan het scherm, belangrijkste eerst: { code, naam, tekst, count, ids (hoogstens 5) }.
export function attentionPoints(rows, bezit, farm) {
  const out = [];
  const per = {};
  for (const r of rows) for (const c of r.attention) { const e = per[c] || (per[c] = { count: 0, ids: [] }); e.count++; if (e.ids.length < 5) e.ids.push(r.id); }
  const TEKST = {
    rijp: (n) => `${n} ${n === 1 ? 'perceel is' : 'percelen zijn'} oogstklaar`,
    'zieke-kudde': (n) => `${n} ${n === 1 ? 'kudde is' : 'kuddes zijn'} ziek: bel de dierenarts`,
    wacht: (n) => `${n} ${n === 1 ? 'perceel wacht' : 'percelen wachten'} op personeel`,
    braak: (n) => `${n} ${n === 1 ? 'perceel ligt' : 'percelen liggen'} braak`,
    'grond-moe': (n) => `De grond van ${n} ${n === 1 ? 'perceel is' : 'percelen is'} moe: wissel van gewas`,
  };
  for (const code of Object.keys(per)) out.push({ code, naam: ATTENTION[code].naam, tekst: TEKST[code](per[code].count), count: per[code].count, ids: per[code].ids, prio: ATTENTION[code].prio });
  const st = staffOf(bezit);
  let staffHa = 0, staffParcels = 0;
  for (const r of rows) if (r.level === 'staff') { staffHa += r.ha; staffParcels++; }
  if (staffParcels && !st.workers.length) out.push({ code: 'geen-personeel', naam: 'Geen personeel', tekst: `${staffParcels} ${staffParcels === 1 ? 'perceel staat' : 'percelen staan'} op personeel, maar je hebt niemand aangenomen`, count: staffParcels, ids: [], prio: 2 });
  else if (staffHa > staffCapacity(st) + 1e-9) out.push({ code: 'capaciteit', naam: 'Te weinig personeel', tekst: `Het personeel regelt ${staffCapacity(st)} ha per dag, maar er staat ${Math.round(staffHa * 10) / 10} ha op personeel`, count: Math.ceil(staffHa - staffCapacity(st)), ids: [], prio: 2 });
  if (farm && farm.schuur && farm.schuur.kg > 0) out.push({ code: 'schuur', naam: 'Oogst in de schuur', tekst: `Er ligt ${farm.schuur.kg} kg in de schuur: lever af`, count: 1, ids: [], prio: 1 });
  return out.sort((a, b) => a.prio - b.prio || (a.code < b.code ? -1 : 1));
}

// ---- beheerniveau en gewas ----
// Het niveau van een of meer percelen zetten. 'staff' vraagt personeel. { done, skipped: { reden: aantal } }.
export function bulkSetMode(bezit, ids, mode) {
  const res = { done: 0, skipped: {} };
  const skip = (why) => { res.skipped[why] = (res.skipped[why] || 0) + 1; };
  if (!MODES.includes(mode)) { for (const _ of ids) skip('onbekend-niveau'); return res; }
  const hasStaff = staffOf(bezit).workers.length > 0;
  for (const id of ids) {
    if (!bezit.parcels[id]) { skip('niet-van-jou'); continue; }
    if (mode === 'staff' && !hasStaff) { skip('geen-personeel'); continue; }
    if (bezit.parcels[id].m === mode) { skip('al-zo'); continue; }
    setParcelMode(bezit, id, mode); res.done++;
  }
  return res;
}

// Het gewas voor het volgende zaaien op de gekozen percelen; een gewas dat niet bij de grond past (gras op een akker) slaat over.
export function bulkSetCrop(farm, ids, gewas) {
  const res = { done: 0, skipped: {} };
  const skip = (why) => { res.skipped[why] = (res.skipped[why] || 0) + 1; };
  for (const id of ids) {
    const d = PC.perceelDef(id);
    if (!d || !farm.bedrijf.percelen[id]) { skip('niet-van-jou'); continue; }
    if (!B.GEWASSEN[gewas] || B.GEWASSEN[gewas].soort !== d.soort) { skip('past-niet'); continue; }
    farm.plan[id] = gewas; res.done++;
  }
  return res;
}

// ---- regels: teeltplan per streek ("alle akkers in Oldambt: graan") in bezit.x.rules als { '<streek>:<soort>': gewas } ----
export const ruleKey = (region, soort) => `${region}:${soort}`;
export function normalizeRules(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const k of Object.keys(raw).slice(0, 100)) {
    const m = /^([a-z]{3,20}):(akker|weiland|boomgaard)$/.exec(k);
    if (m && B.GEWASSEN[raw[k]] && B.GEWASSEN[raw[k]].soort === m[2]) out[k] = raw[k];
  }
  return out;
}
export const rulesOf = (bezit) => { bezit.x.rules = normalizeRules(bezit.x.rules); return bezit.x.rules; };
export function setPlanRule(bezit, region, soort, gewas) {
  if (!B.GEWASSEN[gewas] || B.GEWASSEN[gewas].soort !== soort || !/^[a-z]{3,20}$/.test(region)) return false;
  rulesOf(bezit)[ruleKey(region, soort)] = gewas;
  return true;
}
export const clearPlanRule = (bezit, region, soort) => delete rulesOf(bezit)[ruleKey(region, soort)];
// De regels toepassen op de rijen: zet het teeltplan van elk passend perceel. Geeft het aantal gewijzigde plannen.
export function applyPlanRules(bezit, farm, rows) {
  const rules = rulesOf(bezit);
  if (!Object.keys(rules).length) return 0;
  let n = 0;
  for (const r of rows) {
    const g = rules[ruleKey(r.region, r.soort)];
    if (g && farm.bedrijf.percelen[r.id] && farm.plan[r.id] !== g) { farm.plan[r.id] = g; n++; }
  }
  return n;
}

// ---- bulkwerk met de loonwerker: zaai alles, oogst alles (op percelen die je zelf doet) ----
// De loonwerker (machines.LOONWERKER) werkt netjes (85%), tegen LOONWERK_HA per hectare; het zaaigoed is voor jou en bij het oogsten brengt hij de lading
// weg tegen LOONWERK_AFLEVEREN van de opbrengst. taak: 'zaaien' (ploegen en zaaien) of 'oogsten'. ctx: { money, day }.
// Geeft { done, ids, cost, revenue, net, skipped: { reden: aantal } }; verandert de boerderij, het geld verrekent de aanroeper met net.
export function bulkWork(bezit, farm, ids, taak, ctx = {}) {
  const res = { done: 0, ids: [], cost: 0, revenue: 0, net: 0, skipped: {} };
  const skip = (why) => { res.skipped[why] = (res.skipped[why] || 0) + 1; };
  if (taak !== 'zaaien' && taak !== 'oogsten') { for (const _ of ids) skip('onbekende-taak'); return res; }
  let money = ctx.money === undefined ? Infinity : ctx.money;
  const day = ctx.day === undefined ? dagVan(farm.uren) : ctx.day;
  const q = LOONWERKER.kwaliteit;
  for (const id of ids) {
    const rec = bezit.parcels[id], d = PC.perceelDef(id);
    if (!rec || !d || !farm.bedrijf.percelen[id]) { skip('niet-van-jou'); continue; }
    if (rec.m !== 'self') { skip('niet-zelf'); continue; }
    const phase = fieldPhase(farm, id);
    if (taak === 'zaaien') {
      if (phase !== 'braak' && phase !== 'geploegd') { skip('niet-braak'); continue; }
      const cropId = B.planVoor(farm, id);
      const units = workUnits(d.ha);
      const cost = (phase === 'braak' ? loonwerkKosten('ploegen', d.ha) : 0) + loonwerkKosten('zaaien', d.ha) + Math.round(B.GEWASSEN[cropId].zaaigoed * units);
      if (cost > money) { skip('te-weinig-geld'); continue; }
      if (phase === 'braak') workField(farm, id, 'ploegen', { fractie: q });
      workField(farm, id, 'zaaien', { fractie: q, gewas: cropId });
      const extra = Math.round(B.GEWASSEN[cropId].zaaigoed * (units - 1));
      if (extra > 0) B.uitgaven(farm, extra, 'zaaigoed', id);
      const hire = cost - Math.round(B.GEWASSEN[cropId].zaaigoed * units);
      B.uitgaven(farm, hire, 'loonwerk', id);
      money -= cost; res.cost += cost; res.done++; res.ids.push(id);
    } else {
      if (phase !== 'rijp') { skip('niet-rijp'); continue; }
      const hire = loonwerkKosten('oogsten', d.ha);
      if (hire > money) { skip('te-weinig-geld'); continue; }
      const r = workField(farm, id, 'oogsten', { fractie: q, opbrengst: unitScale(d.ha) });
      const load = r && r.load;
      if (!load || !(load.kg > 0)) { skip('niets-geoogst'); continue; }
      const rev = sellLoad(farm, id, load.gewas, load.kg, day);
      const fee = Math.round(rev * LOONWERK_AFLEVEREN);
      B.uitgaven(farm, hire + fee, 'loonwerk', id);
      money -= hire + fee - rev; res.cost += hire + fee; res.revenue += rev; res.done++; res.ids.push(id);
    }
  }
  res.net = res.revenue - res.cost;
  return res;
}

// ---- de dagverwerking van het beheer ----
// Verwerkt de speldagen sinds de vorige keer (bezit.x.lastDay) tot en met toDay: personeel, pacht en vee. De eerste keer zet het alleen de dag
// vast. ctx: { money, deliver: 'sell' | 'store', robot, buy }. Geeft { from, to, days, net, staff, lease, livestock, events } en verandert bezit en farm;
// het geld verrekent de aanroeper met net (het loon is al afgetrokken als het geld niet toereikt: dan werkt het personeel die dag niet).
export function advanceDays(bezit, farm, toDay, ctx = {}) {
  const rep = { from: null, to: null, days: 0, net: 0, staff: { income: 0, wages: 0, diesel: 0, seed: 0, harvestedKg: 0, waiting: 0 }, lease: 0, livestock: { value: 0, feedCost: 0, products: {} }, events: [] };
  const to = Math.max(0, Math.floor(Number.isFinite(toDay) ? toDay : 0));
  if (!Number.isFinite(bezit.x.lastDay)) { bezit.x.lastDay = to; return rep; }
  let day = bezit.x.lastDay;
  if (to <= day) return rep;
  const last = Math.min(to, day + MAX_CATCHUP_DAYS);
  rep.from = day + 1;
  let money = ctx.money === undefined ? Infinity : ctx.money;
  const home = farm.bedrijf.thuis;
  while (day < last) {
    day++;
    const s = staffDayTick(bezit, farm, day, { money, deliver: ctx.deliver });
    rep.staff.income += s.income; rep.staff.wages += s.wages; rep.staff.diesel += s.diesel; rep.staff.seed += s.seed; rep.staff.harvestedKg += s.harvestedKg; rep.staff.waiting = s.waiting; rep.staff.worked = s.worked;
    for (const e of s.events) rep.events.push({ ...e, day });
    const l = leaseDayTick(bezit, farm, day);
    rep.lease += l.income;
    const store = farm.bedrijf.opslag[home] || {};
    const v = livestockDayTick(bezit, { hay: { gras: store.gras || 0, hooi: store.hooi || 0, graan: store.graan || 0 }, robot: ctx.robot, buy: ctx.buy, klus: klusVan(bezit, day) });
    for (const feed of Object.keys(v.hayUsed)) PC.haalUit(farm.bedrijf, home, feed, v.hayUsed[feed]);
    let veeInkomsten = 0;
    for (const p of Object.keys(v.products)) {
      let rest = v.products[p];
      if (ctx.deliver === 'store') { const r = PC.bergOp(farm.bedrijf, home, p, rest); if (r.ok) rest -= r.kg; }   // wat niet in de opslag past, wordt verkocht
      veeInkomsten += livestockRevenue(p, Math.max(0, rest), day, herdsOf(bezit));
    }
    if (veeInkomsten > 0) { B.boek(farm, { omzet: veeInkomsten }); farm.totaal.omzet += veeInkomsten; }
    if (v.feedCost > 0) B.uitgaven(farm, v.feedCost, 'voer');
    rep.livestock.value += veeInkomsten; rep.livestock.feedCost += v.feedCost;
    for (const k of Object.keys(v.products)) rep.livestock.products[k] = Math.round(((rep.livestock.products[k] || 0) + v.products[k]) * 100) / 100;
    const net = s.net + l.income + veeInkomsten - v.feedCost;
    money += net; rep.net += net;
    rep.days++;
  }
  rep.to = day;
  bezit.x.lastDay = day;
  rep.net = Math.round(rep.net * 100) / 100;
  rep.livestock.feedCost = Math.round(rep.livestock.feedCost * 100) / 100;
  return rep;
}

// Wat het scherm zegt over één dag werk van het personeel (voor de rij "wacht op personeel"): de id's die vandaag niet aan de beurt komen.
export function waitingIds(bezit, farm, day) {
  const plan = planStaffDay(bezit, farm, day);
  if (!plan.waiting) return [];
  const worked = new Set(plan.jobs.map((j) => j.id));
  const out = [];
  for (const id in bezit.parcels) {
    if (bezit.parcels[id].m !== 'staff' || !farm.bedrijf.percelen[id] || worked.has(id)) continue;
    if (fieldPhase(farm, id, day * PC.DAG_UREN) !== 'groeit') out.push(id);
  }
  return out;
}
