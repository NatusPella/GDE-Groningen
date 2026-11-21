// Bezit in de interieurs (epic Bezit #1095, #1102; epic Interieurs): vult de haken van interiors.js `assignInteriorHooks({ owned, manage, homeStyle })` met het beheer-in-het-pand van bezitbeheer.js.
//   owned(b)        -> true voor een pand van de speler (de deur gaat altijd open; een pand is ALTIJD OPEN, eigenaar 21-11)
//   manage(b, plan) -> { label, sub, run(w), osm, customers, ownerLabel } of null: de toonbank van een eigen pand is het beheer (E), geen winkel
//   customers(b)    -> aantal klantfiguranten (hoogstens 6) dat de interieur-NPC-code mag laten rondlopen; daarvoor is een haak `customers` bedoeld (nog niet gelezen door interiors.js)
//   homeStyle       -> hier niet gezet: Object.assign zou de haak van Homebase overschrijven
// Samen spelen: het beheer is van de eigenaar (canManage is onwaar voor een gast in andermans spel); een medespeler ziet "Van <naam>" (ownerLabel) en geen beheerknop.
// Het pand van een gebouw uit de wereld: b.osm, anders het dichtstbijzijnde pand van de index binnen 12 m van het midden van de omtrek. Puur op de THREE-loze delen (scripts/bezitinterior_test.mjs).
import * as L from './bezitlive.js';
import { ownerOf, manageView, manageAction, customersAt, canManage, MAX_CUSTOMERS } from './bezitbeheer.js';
import { euro } from './geldtekst.js';

export const MATCH_R = 12;
export { MAX_CUSTOMERS };

export function osmOfBuilding(b, index = L.getIndexNow()) {
  if (!b) return null;
  if (Number.isFinite(b.osm) && b.osm > 0) return b.osm;
  if (!index || !index.buildings || !Array.isArray(b.pts) || !b.pts.length) return null;
  let sx = 0, sy = 0, k = 0;
  for (const p of b.pts) { if (Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])) { sx += p[0]; sy += p[1]; k++; } }
  if (!k) return null;
  const cx = sx / k, cy = sy / k;
  let best = null, bd = MATCH_R;
  for (const c of index.buildings.near(cx, cy, MATCH_R)) { const d = Math.hypot(c.x - cx, c.y - cy); if (d <= bd) { bd = d; best = c; } }
  return best ? best.osm : null;
}

// De omzetregel in het interieur: wat het pand vandaag doet, in gewone woorden (altijd Nederlands, nooit een leeg veld).
export function revenueLine(view) {
  if (!view) return '';
  const r = view.report;
  if (!r) return `${view.name}: nog geen cijfers.`;
  const kl = view.customers === 1 ? '1 klant' : `${view.customers} klanten`;
  return `${view.name}: omzet ${euro(r.revenue)}, netto ${euro(r.net)}, ${kl}, kwaliteit ${view.quality}%.`;
}

// Wat de toonbank toont voor een pand: de eigenaar de beheerregel, een medespeler (of een claim) "Van <naam>", een vreemd pand niets.
export function counterFor(osm, w = null) {
  const own = ownerOf(osm, claimName(osm));
  if (!own.mine) return own.label ? { mine: false, label: own.label, sub: 'Het pand van een medespeler' } : null;
  const view = manageView(osm, w);
  if (!view) return null;
  return { mine: true, label: 'Beheer', sub: revenueLine(view), view };
}
function claimName(osm) { try { const c = L.claimOfKey(osm); return c && c.name ? c.name : null; } catch (e) { return null; } }

// De haken. opts.openMenu(w, osm) (optioneel) opent het volledige Bezit-menu op dit pand; zonder dat meldt de beheerknop de omzetregel en doet E bij een lage kwaliteit niets duurs.
export function makeInteriorHooks({ index = null, openMenu = null, now = () => Date.now() } = {}) {
  const ix = () => index || L.getIndexNow();
  const osmOf = (b) => osmOfBuilding(b, ix());
  // de toonbank wordt elk beeld gevraagd en manageView rekent een dag door: een seconde in het geheugen
  let cached = null;
  const counter = (osm) => { const t = now(); if (!cached || cached.osm !== osm || t - cached.t > 1000) cached = { osm, t, c: counterFor(osm) }; return cached.c; };
  return {
    owned(b) { const osm = osmOf(b); return osm != null && ownerOf(osm).mine; },
    manage(b) {
      const osm = osmOf(b);
      if (osm == null) return null;
      const c = counter(osm);
      if (!c || !c.mine) return null;
      return {
        osm, label: c.label, sub: c.sub, customers: c.view.customers,
        run(w) {
          if (!canManage(w, osm)) { say(w, 'Dit pand beheer je niet.'); return; }
          const v = manageView(osm, w);
          say(w, revenueLine(v));
          if (typeof openMenu === 'function') openMenu(w, osm);
        },
        act: (w, act, value) => manageAction(w, osm, act, value),
      };
    },
    customers(b) { const osm = osmOf(b); return osm != null ? Math.min(MAX_CUSTOMERS, customersAt(osm)) : 0; },
  };
}
function say(w, text) { if (w && w.addMessage) w.addMessage(text, 3.6, { kind: 'tip' }); }

// Aanroepen vanuit main.js: assignInteriorHooks(makeInteriorHooks({ openMenu }))  (een regel).
export function installBezitInterior(assignInteriorHooks, opts = {}) { assignInteriorHooks(makeInteriorHooks(opts)); }
