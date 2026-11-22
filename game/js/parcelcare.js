// Verzekering en bestrijding per perceel (epic #1095, #1103; gat uit docs/BEZIT-VERIFICATIE-21-11.md): de stortbuiverzekering en het bestrijden van mieren en wespen
// uit bezitevents.js waren er alleen als regel in het model, nog niet in het spel. Puur: geen DOM, geen THREE, geen klok, geen opslag; scripts/parcelcare_test.mjs.
// Op het perceel (bezit.js): ins = de kalenderdag vanaf wanneer de verzekering geldt, ta en tw = tot en met welke kalenderdag mieren en wespen bestreden zijn.
// Samen spelen: per speler (#429), net als de rest van het bezit; een gast regelt dit alleen voor zijn eigen percelen.
import { antControlCost, insurancePremium, WASP_NEST_COST } from './bezitevents.js';
import { finite } from './bezithash.js';

export const TREAT_DAYS = 10;                  // een bestrijding houdt tien speldagen stand
export const INSURANCE_DELAY = 1;              // de verzekering gaat een dag na het afsluiten in: niet afsluiten op de dag van de bui

export const WHAT = { mieren: { key: 'ta', kinds: ['a', 'w'], name: 'mieren' }, wespen: { key: 'tw', kinds: ['b'], name: 'wespen' } };

export const isInsured = (rec, cd) => !!(rec && Number.isFinite(rec.ins) && cd >= rec.ins);
export const treatedOf = (rec, cd) => ({ ants: !!(rec && Number.isFinite(rec.ta) && cd <= rec.ta), wasps: !!(rec && Number.isFinite(rec.tw) && cd <= rec.tw) });
export const treatCost = (rec, what) => (!rec || !WHAT[what] || !WHAT[what].kinds.includes(rec.k) ? 0 : what === 'wespen' ? WASP_NEST_COST : antControlCost(rec.ha));

// Verzekering aan of uit voor de gegeven percelen. Geeft { done, skipped: { reden: n } }.
export function setInsurance(b, ids, on, cd) {
  const out = { done: 0, skipped: {} };
  for (const id of ids || []) {
    const rec = b.parcels[id];
    if (!rec) { out.skipped['onbekend'] = (out.skipped['onbekend'] || 0) + 1; continue; }
    if (on) { if (Number.isFinite(rec.ins)) { out.skipped['al-verzekerd'] = (out.skipped['al-verzekerd'] || 0) + 1; continue; } rec.ins = Math.floor(finite(cd, 0)) + INSURANCE_DELAY; }
    else { if (!Number.isFinite(rec.ins)) { out.skipped['niet-verzekerd'] = (out.skipped['niet-verzekerd'] || 0) + 1; continue; } delete rec.ins; }
    out.done++;
  }
  return out;
}

// Bestrijden (mieren of wespen) voor de gegeven percelen, zolang het geld strekt. Geeft { done, cost, skipped }.
export function treat(b, ids, what, cd, money) {
  const out = { done: 0, cost: 0, skipped: {} }, w = WHAT[what];
  const skip = (k) => { out.skipped[k] = (out.skipped[k] || 0) + 1; };
  if (!w) return out;
  let left = Math.max(0, finite(money, 0));
  for (const id of ids || []) {
    const rec = b.parcels[id];
    if (!rec) { skip('onbekend'); continue; }
    if (!w.kinds.includes(rec.k)) { skip('past-niet'); continue; }
    if (Number.isFinite(rec[w.key]) && rec[w.key] > cd) { skip('al-bestreden'); continue; }     // vernieuwen kan op de laatste dag
    const c = treatCost(rec, what);
    if (c > left) { skip('te-weinig-geld'); continue; }
    left -= c; out.cost += c; rec[w.key] = Math.floor(finite(cd, 0)) + TREAT_DAYS - 1; out.done++;
  }
  return out;
}

// De premie van de speldagen from+1 tot en met last (calOf zet een boerderijdag om in een kalenderdag): alleen voor dagen waarop de verzekering geldt.
export function premiumBetween(b, from, last, calOf) {
  let sum = 0;
  for (const id of Object.keys(b.parcels)) {
    const rec = b.parcels[id];
    if (!Number.isFinite(rec.ins)) continue;
    const per = insurancePremium(rec.ha);
    for (let d = from + 1; d <= last; d++) if (calOf(d) >= rec.ins) sum += per;
  }
  return sum;
}
export const insuredCount = (b) => Object.values(b.parcels).filter((r) => Number.isFinite(r.ins)).length;
