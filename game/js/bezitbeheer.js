// De 'beheer in het pand'-interface van Bezit (epic #1095, #1102) voor de interieurs-epic (betreedbare panden): wie een pand betreedt dat van de speler is, vraagt hier wat hij
// ziet en kan sturen, zonder iets van Bezit te hoeven kennen. Dun en puur bovenop bezitlive.js (geen DOM, geen THREE): de interieurs tekenen de toonbank, de klanten en het
// beheerpaneel; dit levert de gegevens en voert de knoppen uit. Een pand is ALTIJD OPEN (eigenaar 21-11): de openingstijd (hr) raakt alleen omzet en loon, nooit de deur.
// Samen spelen: het beheer is van de eigenaar; een medespeler ziet "Van <naam>" (ownerOf) en kan hier niets sturen (canManage is alleen waar voor de eigen speler).
//
//   ownerOf(osm)            -> { mine: bool, label }          wie het pand heeft (voor het bord en de deur)
//   canManage(w, osm)       -> bool                            alleen de eigenaar, nooit een gast in andermans spel
//   manageView(osm, w)      -> { osm, type, name, place, quality, value, knobs, report, customers, staff } of null
//   manageAction(w, osm, act, value) -> { ok, text }           act: 'prijs' | 'voorraad' | 'uren' | 'renoveer' | 'verkoop'
//   customersAt(osm)        -> aantal klanten dat er vandaag zichtbaar mag zijn (hoogstens 6)
//   OPEN_ALWAYS             -> true: voor de interieurs, een bord 'gesloten' bestaat niet
import * as L from './bezitlive.js';
import * as BZ from './business.js';
import { staffWages } from './businessstaff.js';

export const OPEN_ALWAYS = true;
export const MAX_CUSTOMERS = 6;
const KNOB_KEYS = { prijs: 'pr', voorraad: 'st', uren: 'hr' };

export function ownerOf(osm, claimName = null) {
  const mine = L.getBezit().buildings.has(osm);
  return { mine, label: mine ? 'Van jou' : claimName ? `Van ${claimName}` : '' };
}
export const canManage = (w, osm) => !(w && w.coopRole === 'client') && L.getBezit().buildings.has(osm);

export function manageView(osm, w = null) {
  const m = L.myBusinesses().find((x) => x.osm === osm);
  if (!m) return null;
  const biz = m.biz, cfg = BZ.normalizeCfg(biz.cfg);
  const day = L.calToday ? L.calToday() : 0;
  let report = null;
  try { report = BZ.stepDay(biz, { day, town: { id: m.place, name: m.place, houses: 1500 }, owned: 1, event: {} }).report; } catch (e) { report = null; }
  const customers = report ? Math.min(MAX_CUSTOMERS, report.customers | 0) : 0;
  return {
    osm, type: m.kind.type, cls: m.kind.cls, name: `${m.kind.type} bij ${m.place}`, place: m.place, quality: Math.round(biz.q), value: Math.round(biz.p),
    knobs: { prijs: cfg.pr, voorraad: cfg.st, uren: cfg.hr }, open: OPEN_ALWAYS, staff: (cfg.staff || []).length, wagesPerDay: staffWages ? staffWages(cfg.staff || [], cfg.hr) : 0,
    report: report ? { revenue: report.revenue, net: report.net, reason: report.reason } : null, customers, canManage: canManage(w, osm),
  };
}

export function manageAction(w, osm, act, value) {
  if (!canManage(w, osm)) return { ok: false, text: 'Dit pand beheer je niet.' };
  if (KNOB_KEYS[act]) { const ok = L.setPandKnop(osm, KNOB_KEYS[act], value); return ok ? { ok: true, text: 'Aangepast.' } : { ok: false, text: 'Dit lukt niet.' }; }
  if (act === 'renoveer') return L.renovatePand(w, osm);
  if (act === 'verkoop') return L.verkoopPand(w, osm);
  return { ok: false, text: 'Onbekende actie.' };
}

export function customersAt(osm) { const v = manageView(osm); return v ? v.customers : 0; }
