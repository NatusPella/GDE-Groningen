// De waarden in de kop van Land en bedrijf (ontwerp docs/ontwerp/BEZIT-UI-24-11.md): geld, totale waarde, per dag en aandacht.
// Puur: geen DOM, geen klok; de aanroeper levert wat hij al heeft (bezit, rijen van holdingsmodel, pand- en wagencijfers).
// Totale waarde is de SOM VAN WAARDEN (wat je betaalde, na onderhoud), geen verkoopwaarde (besluit coordinator 24-11).
// Samen spelen: alles komt uit het eigen bezit van de speler (#429); er gaat niets over het net.

const fin = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);

// Waarde van het land: wat er betaald is voor de eigen percelen (de Zonnehoek-percelen die erbij zijn gezet tellen mee).
export const landWaarde = (bezit) => Object.values((bezit && bezit.parcels) || {}).reduce((s, p) => s + fin(p && p.p), 0);

// panden en wagens: [{ p: waarde }]; extra: losse waarden (machines, aandelen) die de aanroeper al kent.
export const totaleWaarde = ({ bezit, panden = [], wagens = [], extra = 0 } = {}) =>
  Math.round(landWaarde(bezit) + panden.reduce((s, b) => s + fin(b && b.p), 0) + wagens.reduce((s, b) => s + fin(b && b.p), 0) + fin(extra));

// Per dag: wat de rijen opbrengen (verpacht en personeel), min het loon, plus wat panden en wagens per dag leveren (al netto, een schatting).
export const perDag = ({ rows = [], loon = 0, panden = [], wagens = [] } = {}) =>
  Math.round(rows.reduce((s, r) => s + fin(r && r.incomeDay), 0) - fin(loon) + panden.reduce((s, b) => s + fin(b && b.perDay), 0) + wagens.reduce((s, b) => s + fin(b && b.perDay), 0));

// Aandacht: het aantal klussen met een dringendheid (zie bezitklussen.js); zonder klussen 0.
export const aandacht = (klussen = []) => klussen.length;

export function waarden(inv = {}) {
  const geld = Math.round(fin(inv.geld));
  const waarde = totaleWaarde(inv);
  const dag = perDag(inv);
  const n = aandacht(inv.klussen);
  // Zonder bezit blijft alleen het geld staan: geen nullen (ontwerp: lege toestand).
  const leeg = waarde === 0 && dag === 0 && n === 0;
  return { geld, waarde, perDag: dag, aandacht: n, leeg };
}
