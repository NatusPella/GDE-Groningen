// Personeel van een bedrijf in Bezit (epic #1095, #1102; ontwerp docs/BEZIT-21-11.md 6.4): de kassier die er al stond blijft en wordt jouw
// medewerker, je kunt iemand aanstellen of ontslaan, en de personeelsstand stuurt de omzet. Plus de klantenweergave: hoogstens zes
// wandelaars per winkel in beeld, naar omzet. Puur: geen DOM, geen THREE, geen klok, geen opslag (scripts/business_test.mjs).
// Alle namen zijn verzonnen voornamen zonder achternaam: nooit een echte persoon (constitution 2 en 4). Ontslag is zakelijk en
// zonder leed: de medewerker "zoekt een andere plek", er is geen sprake van nood.

import { hashUnit, hashPick, clamp, finite } from './bezithash.js';

export const FIRST_NAMES = ['Marit', 'Joost', 'Fenna', 'Sjoerd', 'Anke', 'Wessel', 'Lieke', 'Harm', 'Roos', 'Gerrit', 'Sanne', 'Tjeerd',
  'Hilde', 'Menno', 'Ilse', 'Auke', 'Nynke', 'Berend', 'Janna', 'Okke'];
export const MAX_STAFF = 12;
export const DEFAULT_HOURS = 10;                                // een standaard openingsdag in uren
export const SKILL_PAR = 60;                                      // een vaardigheid van 60 telt voor één volledige kracht
export const SQM_PER_WORKER = 80;                                 // zoveel m2 vloer houdt één volledige kracht bij

// Aantal volledige krachten dat een pand nodig heeft.
export const staffNeed = (m2) => clamp(Math.ceil(finite(m2, 0) / SQM_PER_WORKER), 1, 6);

// Loon per speldag bij een standaarddag: een basis plus een deel van de vaardigheid; meer openingsuren kosten naar rato.
export const wagePerDay = (skill, hours = DEFAULT_HOURS) => Math.round(((40 + 0.8 * clamp(finite(skill, 0), 0, 100)) * (clamp(finite(hours, DEFAULT_HOURS), 0, 24) / DEFAULT_HOURS)) / 5) * 5;

const person = (seed, k, o = {}) => {
  const skill = Math.round(35 + hashUnit(seed, k, 'skill') * 40);
  return { id: `${seed}-${k}`, name: hashPick(FIRST_NAMES, seed, k, 'naam'), skill, role: 'kassier', ...o };
};

// De kassier die er al stond: dezelfde persoon bij elk pand (vast uit het pand-ID), vaardigheid 35 tot 75.
export const existingClerk = (osm) => person(`k${osm}`, 0, { id: `k${osm}`, existing: true });

// Een lijst sollicitanten voor deze dag (vast per pand en dag): hun loon staat erbij.
export function candidates(osm, day, n = 3) {
  const out = [];
  for (let i = 0; i < clamp(n | 0, 0, 8); i++) {
    const p = person(`s${osm}d${Math.floor(finite(day, 0))}`, i, { role: 'medewerker' });
    out.push({ ...p, wage: wagePerDay(p.skill) });
  }
  return out;
}

export const normalizeStaff = (list) => {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const s of list.slice(0, MAX_STAFF)) {
    if (!s || typeof s !== 'object' || typeof s.id !== 'string' || s.id.length > 40) continue;
    out.push({ id: s.id, name: String(s.name || 'Medewerker').slice(0, 24), skill: Math.round(clamp(finite(s.skill, 50), 0, 100)), role: s.role === 'kassier' ? 'kassier' : 'medewerker', ...(s.existing ? { existing: true } : {}) });
  }
  return out;
};

// Aanstellen en ontslaan: geven een nieuwe lijst terug en passen de oude niet aan.
export function hire(list, cand) {
  const cur = normalizeStaff(list);
  if (!cand || typeof cand.id !== 'string') return { ok: false, why: 'onbekend', staff: cur };
  if (cur.some((s) => s.id === cand.id)) return { ok: false, why: 'al-aangesteld', staff: cur };
  if (cur.length >= MAX_STAFF) return { ok: false, why: 'vol', staff: cur };
  return { ok: true, staff: [...cur, ...normalizeStaff([cand])] };
}
export function fire(list, id) {
  const cur = normalizeStaff(list);
  if (!cur.some((s) => s.id === id)) return { ok: false, why: 'niet-in-dienst', staff: cur };
  return { ok: true, staff: cur.filter((s) => s.id !== id) };
}

export const staffCapacity = (list) => (Array.isArray(list) ? list.reduce((s, p) => s + clamp(finite(p && p.skill, 0), 0, 100) / SKILL_PAR, 0) : 0);

// Personeelsstand-factor op de omzet: zonder mensen een kwart, met precies genoeg 1,0, met meer een kleine bonus (hoogstens 1,05).
export function staffFactor(list, m2) {
  const r = staffCapacity(list) / staffNeed(m2);
  const f = 0.25 + 0.75 * Math.min(r, 1) + 0.1 * (Math.min(r, 1.5) - 1) * (r > 1 ? 1 : 0);
  return Math.round(f * 1000) / 1000;
}

// Totaal loon per speldag voor een lijst bij een openingsdag van `hours` uur.
export const staffWages = (list, hours = DEFAULT_HOURS) => (Array.isArray(list) ? list.reduce((s, p) => s + wagePerDay(p && p.skill, hours), 0) : 0);

// ---- klantenweergave (voor de bouwer, ontwerp 6.4) ----
export const MAX_VISIBLE_CUSTOMERS = 6;
// Hoeveel wandelaars zie je bij deze winkel: naar de omzet van vandaag ten opzichte van de basisomzet, hoogstens zes; gesloten of
// zonder omzet is het er nul. Een winkel die goed draait (1,0) toont er ongeveer vier.
export function visibleCustomers(revenue, baseRevenue, { open = true, max = MAX_VISIBLE_CUSTOMERS } = {}) {
  if (!open || !(revenue > 0) || !(baseRevenue > 0)) return 0;
  return clamp(Math.round((revenue / baseRevenue) * 4.2), 1, clamp(max | 0, 0, MAX_VISIBLE_CUSTOMERS));
}
// Voor een heel scherm vol winkels: zoveel klanten als er hoogstens in beeld mogen (een totaalplafond), de drukste winkels eerst.
// shops: [{ id, revenue, baseRevenue, open }] -> { <id>: aantal }
export function customerPlan(shops, totalMax = 60) {
  const rows = (Array.isArray(shops) ? shops : []).map((s) => ({ id: s.id, n: visibleCustomers(s.revenue, s.baseRevenue, s), r: finite(s.revenue, 0) })).sort((a, b) => b.r - a.r || String(a.id).localeCompare(String(b.id)));
  const out = {};
  let left = Math.max(0, totalMax | 0);
  for (const row of rows) { const k = Math.min(row.n, left); out[row.id] = k; left -= k; }
  return out;
}
