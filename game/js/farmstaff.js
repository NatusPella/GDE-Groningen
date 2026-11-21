// Personeel, verpachten en de zichtbare weergave voor Bezit (epic #1095, #1101; ontwerp docs/BEZIT-21-11.md 5.2 en 5.3): een landarbeider
// (verzonnen naam, loon per speldag, vaardigheid 1 tot 3, capaciteit 20 ha per speldag; een voorman bundelt er drie) werkt de percelen op
// 'staff' af met het teeltplan, tegen 70 tot 80% van de opbrengst van handwerk en de kosten van loon, diesel en zaaigoed. Verpachten
// levert 0,9% van de koopprijs per speldag. Beide krijgen de afnemende beheeropbrengst x 1 / (1 + n / 40).
// Puur: geen DOM, geen THREE, geen klok, geen Math.random, geen opslag (scripts/farmstaff_test.mjs). Het personeel gebruikt exact de
// regels van het handwerk (parcelfarm.workField -> boerderij.rondTaakAf); de zichtbare werker is een weergave van het dagschema, nooit een
// aparte simulatie. Samen spelen: het personeel en de pacht zijn per speler (#429); een gast ziet het niet en deelt het niet.

import * as B from './boerderij.js';
import * as PC from './percelen.js';
import { dagprijs } from './gewasmarkt.js';
import { areaPrice, yieldInfo } from './bezithooks.js';
import { leaseOutPerDay } from './bezitprijs.js';
import { DIESEL_ERF } from './machines.js';
import { workField, fieldPhase, unitScale, workUnits, rowLayout, rowPose } from './parcelfarm.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export const CAPACITY_HA_DAY = 20;                       // wat een landarbeider per speldag regelt
export const FOREMAN_BUNDLE = 3;                         // een voorman (vaardigheid 3) bundelt drie arbeiders: zijn capaciteit is drie keer zoveel
export const SKILL_RATIO = { 1: 0.7, 2: 0.75, 3: 0.8 }; // aandeel van de opbrengst van handwerk (handwerk is 100%); de beste arbeider haalt 80%: handwerk levert dus minstens 25% meer (eigenaar 21-11)
export const WAGE_DAY = { 1: 70, 2: 95, 3: 200 };        // loon per speldag; de voorman kost minder dan drie arbeiders van niveau 2 en werkt netter
export const SKILL_NAME = { 1: 'beginner', 2: 'ervaren', 3: 'voorman' };
export const MAX_WORKERS = 60;
export const DIESEL_L_HA = { oogsten: 7, zaaien: 10 };   // liter per hectare op een werkdag (ploegen en zaaien samen / oogsten)
export const MGMT_SCALE = 40;                            // afnemende beheeropbrengst: x 1 / (1 + n / 40)
export const VISIBLE_MAX = 4;                            // hoogstens zoveel werkers tegelijk in beeld (de dichtstbijzijnde)
export const STREAM_RADIUS_M = 230;                      // de streamstraal van boerderijwereld.js: daarbuiten alleen het cijfer
export const MAX_CATCHUP_DAYS = 120;

// ---- namen: voornaam en bijnaam, allebei uit een lijst; nooit een echte persoon ----
export const FIRST_NAMES = ['Jelle', 'Marrit', 'Sieb', 'Hinke', 'Tjitse', 'Geeske', 'Roelf', 'Aaltje', 'Berend', 'Femke', 'Harm', 'Jildou'];
export const BYNAMES = ['van de Wierde', 'van de Klei', 'aan de Dijk', 'van het Zijl', 'van de Horn', 'uit het Meer'];
export const workerName = (i) => `${FIRST_NAMES[i % FIRST_NAMES.length]} ${BYNAMES[Math.floor(i / FIRST_NAMES.length) % BYNAMES.length]}`;

// ---- het personeel ----
export const newStaff = () => ({ v: 1, workers: [], next: 0 });
const done = new WeakSet();
export function normalizeStaff(raw) {
  const s = newStaff();
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return s;
  s.next = Math.round(clamp(Number.isFinite(raw.next) ? raw.next : 0, 0, 1e6));
  const seen = new Set();
  for (const w of Array.isArray(raw.workers) ? raw.workers.slice(0, MAX_WORKERS) : []) {
    if (!w || typeof w.id !== 'string' || !/^w\d{1,7}$/.test(w.id) || seen.has(w.id)) continue;
    seen.add(w.id);
    s.workers.push({ id: w.id, name: typeof w.name === 'string' ? w.name.slice(0, 40) : workerName(s.workers.length), skill: Math.round(clamp(Number.isFinite(w.skill) ? w.skill : 1, 1, 3)), since: Math.round(clamp(Number.isFinite(w.since) ? w.since : 0, 0, 1e7)) });
  }
  done.add(s);
  return s;
}
export function staffOf(bezit) {
  if (!bezit.x.staff || !done.has(bezit.x.staff)) bezit.x.staff = normalizeStaff(bezit.x.staff);
  return bezit.x.staff;
}
export const capacityOf = (w) => CAPACITY_HA_DAY * (w.skill === 3 ? FOREMAN_BUNDLE : 1);
export const wageOf = (w) => WAGE_DAY[w.skill] || WAGE_DAY[1];
export const staffCapacity = (s) => s.workers.reduce((n, w) => n + capacityOf(w), 0);
export const staffWages = (s) => s.workers.reduce((n, w) => n + wageOf(w), 0);

// Iemand aannemen: de eerste speldag loon als tekengeld. { ok, worker, fee } of { ok: false, why }.
export function hireWorker(bezit, skill, day, money = Infinity) {
  const s = staffOf(bezit);
  const sk = Math.round(skill);
  if (!(sk >= 1 && sk <= 3)) return { ok: false, why: 'onbekend-niveau' };
  if (s.workers.length >= MAX_WORKERS) return { ok: false, why: 'vol' };
  const fee = WAGE_DAY[sk];
  if (!(money >= fee)) return { ok: false, why: 'te-weinig-geld', tekort: Math.round(fee - money) };
  const w = { id: `w${s.next}`, name: workerName(s.next), skill: sk, since: Math.max(0, Math.round(day)) };
  s.next++;
  s.workers.push(w);
  return { ok: true, worker: w, fee };
}
export function fireWorker(bezit, id) {
  const s = staffOf(bezit);
  const i = s.workers.findIndex((w) => w.id === id);
  if (i < 0) return false;
  s.workers.splice(i, 1);
  return true;
}

// ---- afnemende beheeropbrengst (5.3) ----
export const mgmtFactor = (n) => 1 / (1 + Math.max(0, n | 0) / MGMT_SCALE);
export const managedCount = (bezit) => { let n = 0; for (const id in bezit.parcels) { const m = bezit.parcels[id].m; if (m === 'staff' || m === 'leased') n++; } return n; };

// Wat een perceel gekost heeft voor de pacht: het betaalde bedrag, of voor de vaste percelen de koopprijs van de lijst.
export function paidFor(rec, id) {
  if (rec.p > 0) return rec.p;
  const d = PC.perceelDef(id);
  return d && d.koop > 0 ? d.koop : 0;
}

// ---- verpachten ----
export function leaseDayTick(bezit, farm, day) {
  const mf = mgmtFactor(managedCount(bezit));
  let income = 0, parcels = 0;
  for (const id in bezit.parcels) {
    const rec = bezit.parcels[id];
    if (rec.m !== 'leased') continue;
    const pay = Math.round(leaseOutPerDay(paidFor(rec, id)) * mf * yieldInfo(id, day).mult);   // een droogte of stortbui drukt ook de pacht (bezitevents.js)
    parcels++;
    if (pay > 0) { income += pay; if (farm) { B.boek(farm, { omzet: pay, veld: PC.isPerceelId(id) ? id : null }); farm.totaal.omzet += pay; } }
  }
  return { day, income, parcels };
}

// Een oogst verkopen tegen de dagprijs van de speldag (de lading van een perceel): boekt de omzet en geeft het bedrag. Ook voor de loonwerker (holdingsmodel.js).
export function sellLoad(farm, id, gewas, kg, day) {
  if (!(kg > 0) || !B.GEWASSEN[gewas]) return 0;
  const price = areaPrice(gewas, kg, day, id, dagprijs(gewas, day) || B.GEWASSEN[gewas].prijsKg);   // streekmarkt van Bezit (bezithooks.js)
  const money = Math.round(kg * price);
  B.boek(farm, { omzet: money, veld: id, kg });
  farm.totaal.leveringen++; farm.totaal.omzet += money;
  return money;
}

// ---- de dag van het personeel ----
// Een perceel op 'staff' vraagt werk als het rijp is (oogsten), braak (ploegen en zaaien) of geploegd (zaaien). Eerst wat rijp is, dan de rest,
// binnen elke groep op id (stabiel). Een perceel groter dan wat er die dag nog over is, wacht (meer land vraagt meer mensen).
export function planStaffDay(bezit, farm, day) {
  const st = staffOf(bezit);
  const uren = day * PC.DAG_UREN;
  const need = [];
  let parcels = 0;
  for (const id in bezit.parcels) {
    if (bezit.parcels[id].m !== 'staff' || !farm.bedrijf.percelen[id]) continue;
    parcels++;
    const phase = fieldPhase(farm, id, uren);
    if (phase !== 'groeit') need.push({ id, phase, pr: phase === 'rijp' ? 0 : 1, ha: (PC.perceelDef(id) || { ha: 0 }).ha });
  }
  need.sort((a, b) => a.pr - b.pr || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const slots = st.workers.map((w) => ({ w, left: capacityOf(w), used: 0, cap: capacityOf(w) }));
  let pool = slots.reduce((n, s) => n + s.left, 0);
  const jobs = [];
  let waiting = 0, k = 0;
  for (const n of need) {
    if (!(n.ha > 0) || n.ha > pool + 1e-9) { waiting++; continue; }
    while (k < slots.length && slots[k].left <= 1e-9) k++;
    let first = null, left = n.ha;
    for (let i = k; i < slots.length && left > 1e-9; i++) {
      const take = Math.min(slots[i].left, left);
      if (take <= 0) continue;
      if (!first) first = { slot: slots[i], t0: slots[i].used / slots[i].cap, t1: (slots[i].used + take) / slots[i].cap };
      slots[i].left -= take; slots[i].used += take; left -= take; pool -= take;
    }
    jobs.push({ id: n.id, phase: n.phase, ha: n.ha, worker: first.slot.w.id, workerName: first.slot.w.name, skill: first.slot.w.skill, t0: first.t0, t1: first.t1 });
  }
  return { day, parcels, jobs, waiting };
}

// De taken van een opdracht met hun tijdvak binnen de speldag (0..1): oogsten, of ploegen en dan zaaien, of alleen zaaien.
function tasksOf(job) {
  const span = job.t1 - job.t0, mid = job.t0 + span / 2;
  if (job.phase === 'rijp') return [{ taak: 'oogsten', t0: job.t0, t1: job.t1 }];
  if (job.phase === 'geploegd') return [{ taak: 'zaaien', t0: job.t0, t1: job.t1 }];
  return [{ taak: 'ploegen', t0: job.t0, t1: mid }, { taak: 'zaaien', t0: mid, t1: job.t1 }];
}

// Een speldag laten werken. Verandert farm (de velden, het kasboek) en geeft het rapport; het geld verrekent de aanroeper met report.net
// (inkomsten min loon, diesel en zaaigoed). ctx: { money (voor het loon), deliver: 'sell' | 'store', dieselPrice }.
export function staffDayTick(bezit, farm, day, ctx = {}) {
  const st = staffOf(bezit);
  const rep = { day, wages: 0, diesel: 0, seed: 0, income: 0, harvestedKg: 0, storedKg: 0, worked: [], waiting: 0, net: 0, events: [] };
  const wages = staffWages(st);
  const plan = planStaffDay(bezit, farm, day);
  rep.waiting = plan.waiting;
  if (!st.workers.length) { rep.waiting += plan.jobs.length; return rep; }
  if (!((ctx.money === undefined ? Infinity : ctx.money) >= wages)) { rep.events.push({ type: 'loon-onbetaald', wages }); rep.waiting += plan.jobs.length; return rep; }
  const dieselPrice = Number.isFinite(ctx.dieselPrice) ? ctx.dieselPrice : DIESEL_ERF;
  const mf = mgmtFactor(managedCount(bezit));
  const saved = farm.uren;
  farm.uren = day * PC.DAG_UREN;
  try {
    B.uitgaven(farm, wages, 'personeel');
    rep.wages = wages;
    for (const j of plan.jobs) {
      const ratio = SKILL_RATIO[j.skill] || SKILL_RATIO[1];
      const units = workUnits(j.ha);
      const entry = { id: j.id, worker: j.worker, workerName: j.workerName, ha: j.ha, phase: j.phase, tasks: tasksOf(j), t0: j.t0, t1: j.t1, kg: 0 };
      if (j.phase === 'rijp') {
        const r = workField(farm, j.id, 'oogsten', { fractie: 1, opbrengst: unitScale(j.ha) * mf * ratio * yieldInfo(j.id, day).mult });
        const load = r && r.load;
        const kg = load ? load.kg : 0;
        const liters = DIESEL_L_HA.oogsten * j.ha, dc = Math.round(liters * dieselPrice);
        if (dc > 0) { B.uitgaven(farm, dc, 'brandstof', j.id); rep.diesel += dc; }
        if (kg > 0) {
          let sold = kg;
          if (ctx.deliver === 'store') { const s = PC.bergOp(farm.bedrijf, farm.bedrijf.thuis, load.gewas, kg); sold = kg - (s.ok ? s.kg : 0); rep.storedKg += kg - sold; if (kg - sold > 0) B.boek(farm, { veld: j.id, kg: kg - sold }); }
          if (sold > 0) rep.income += sellLoad(farm, j.id, load.gewas, sold, day);
          rep.harvestedKg += kg;
          entry.kg = kg;
        }
      } else {
        if (j.phase === 'braak') workField(farm, j.id, 'ploegen', { fractie: 1 });
        const z = workField(farm, j.id, 'zaaien', { fractie: 1 });
        let seed = z && z.kosten ? z.kosten.materiaal : 0;
        const extra = Math.round(seed * (units - 1));
        if (extra > 0) { B.uitgaven(farm, extra, 'zaaigoed', j.id); seed += extra; }
        rep.seed += seed;
        const dc = Math.round(DIESEL_L_HA.zaaien * j.ha * dieselPrice);
        if (dc > 0) { B.uitgaven(farm, dc, 'brandstof', j.id); rep.diesel += dc; }
      }
      rep.worked.push(entry);
    }
  } finally {
    farm.uren = saved;
  }
  rep.net = rep.income - rep.wages - rep.diesel - rep.seed;
  return rep;
}

// ---- de zichtbare weergave (5.2): het dagschema als werkactoropdrachten ----
// worked is rep.worked van staffDayTick (of de jobs van planStaffDay met tasks). viewer { x, y }; posOf(id) geeft { x, y, a } van een perceel
// (b.perceel, b.posities) of null; dayFrac 0..1 is hoe ver de speldag is. Geeft hoogstens `max` opdrachten voor de dichtstbijzijnde percelen
// binnen de streamstraal, elk met de positie langs de rijen. De bouwer koppelt dit aan een figuur en een voertuig; buiten beeld blijft het het cijfer.
export function visibleJobs(worked, viewer, { posOf, dayFrac, max = VISIBLE_MAX, radius = STREAM_RADIUS_M } = {}) {
  const f = clamp(Number.isFinite(dayFrac) ? dayFrac : 0, 0, 1);
  const cand = [];
  for (const j of worked || []) {
    const tasks = j.tasks || tasksOf(j);
    const t = tasks.find((x) => f >= x.t0 && f < x.t1);
    if (!t) continue;
    const pos = posOf ? posOf(j.id) : null;
    if (!pos || !viewer) continue;
    const dist = Math.hypot(pos.x - viewer.x, pos.y - viewer.y);
    if (dist > radius) continue;
    cand.push({ j, t, pos, dist });
  }
  cand.sort((a, b) => a.dist - b.dist || (a.j.id < b.j.id ? -1 : 1));
  return cand.slice(0, Math.max(0, max)).map(({ j, t, pos, dist }) => {
    const progress = t.t1 > t.t0 ? clamp((f - t.t0) / (t.t1 - t.t0), 0, 1) : 0;
    const pose = rowPose(rowLayout(j.ha), pos, progress);
    return { actorId: `${j.id}:${j.worker}`, parcelId: j.id, workerId: j.worker, workerName: j.workerName, taak: t.taak, progress, x: pose.x, y: pose.y, heading: pose.heading, row: pose.row, vehicle: 'trekker', distance: Math.round(dist) };
  });
}
