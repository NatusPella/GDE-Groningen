// Twee kleine haken tussen de boerderij en Bezit (epic #1095, #1103), zodat boerderij.js, farmstaff.js en boerderijlive.js niets van Bezit hoeven te
// importeren (geen importcyclus): bezitlive.js zet ze bij het starten. Zonder haken doet de boerderij precies wat ze altijd deed (de tests van de
// boerderij draaien zonder).
//   areaPrice:  de prijs per kilo van een levering in een streek op een dag (areamarket.js), met verzadiging door wat je levert.
//   yieldInfo:  het opbrengstverlies van een perceel op een speldag door droogte, stortbui, mieren en wespen (bezitevents.js).
// Puur: geen DOM, geen THREE, geen klok, geen opslag.

let priceFn = null, yieldFn = null;

export const setAreaPrice = (fn) => { priceFn = typeof fn === 'function' ? fn : null; };
export const setYieldInfo = (fn) => { yieldFn = typeof fn === 'function' ? fn : null; };

// De gemiddelde prijs per kilo voor een levering van kg kilo, of base als er geen haak is of de haak niets zinnigs geeft.
// gewas: gewas-id, dag: speldag van de boerderij, veld: perceel-id of null, base: de gewone dagprijs.
export function areaPrice(gewas, kg, dag, veld, base) {
  if (!priceFn || !(kg > 0)) return base;
  try { const p = priceFn(gewas, kg, dag, veld, base); return Number.isFinite(p) && p > 0 ? p : base; } catch (e) { return base; }
}

// { mult: 0.6..1, text } voor een perceel op een speldag van de boerderij; zonder haak { mult: 1, text: '' }.
export function yieldInfo(veld, dag) {
  if (!yieldFn) return { mult: 1, text: '' };
  try {
    const r = yieldFn(veld, dag);
    return r && Number.isFinite(r.mult) && r.mult > 0 ? { mult: Math.min(1, r.mult), text: String(r.text || '') } : { mult: 1, text: '' };
  } catch (e) { return { mult: 1, text: '' }; }
}
