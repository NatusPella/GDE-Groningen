// De markt van de boerderij (#492): per gewas een dagprijs die met de speldag meebeweegt, binnen twintig procent van de
// basisprijs. Puur: geen DOM, geen THREE, geen klok, geen opslag en geen Math.random (scripts/gewasmarkt_test.mjs). De dag komt
// uit de boerderijstand (dagVan op b.uren), nooit uit de muurklok: elke speler heeft zijn eigen boerderij en dus zijn eigen dag.
//
// De basisprijzen staan hier en boerderij.js neemt ze over in GEWASSEN.prijsKg, zodat er één bron is. Het import gaat die
// kant op en niet terug (boerderij.js importeert dit bestand), want een cyclus in de importgrafiek is verboden
// (scripts/import_cycles_test.mjs).
export const PRIJS_KG = { aardappelen: 0.22, bieten: 0.10, graan: 0.15, gras: 0.07 };

export const MAX_SCHOM = 0.2;      // de dagprijs blijft binnen twintig procent van de basisprijs
export const MIN_PRIJS = 0.01;     // nooit gratis of negatief
export const DAG_UREN = 24;        // een speldag is vierentwintig speluren

const getal = (x, d = 0) => (Number.isFinite(x) ? x : d);

// De speldag van de boerderij: elke vierentwintig speluren één. Onbekend, negatief of oneindig telt als dag nul.
export function dagVan(uren) {
  return Math.floor(Math.max(0, getal(uren)) / DAG_UREN);
}

// Een dag uit de markt zelf (al een dagnummer): een gebroken, negatieve of onbekende dag telt als dag nul.
const alsDag = (dag) => Math.max(0, Math.floor(getal(dag)));

// Een stabiele ruis van 0 tot 1 uit het gewas en de dag: een kleine FNV-hash met Math.imul, daarna gemengd. Dezelfde
// gewas en dag geven altijd dezelfde ruis, ook na een herstart, en verschillende dagen geven nooit dezelfde hash.
const meng = (h) => {
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
};
function ruis(gewasId, dag) {
  let h = 0x811c9dc5;
  const s = String(gewasId);
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  h = Math.imul((h ^ Math.imul(alsDag(dag), 0x85ebca6b)) >>> 0, 0x01000193);
  return meng(h) / 4294967296;
}

// De prijs per kilo van een gewas op een speldag: rond de basisprijs, hooguit twintig procent erboven of eronder, op centen
// afgerond en nooit onder één cent. Dag nul is precies de basisprijs, zodat een nieuwe boerderij voorspelbaar begint. Een
// onbekend gewas heeft geen prijs (nul): de aanroeper houdt de basis als terugval.
export function dagprijs(gewasId, dag) {
  const basis = PRIJS_KG[gewasId];
  if (!(basis > 0)) return 0;
  const d = alsDag(dag);
  if (d === 0) return Math.round(basis * 100) / 100;
  const prijs = basis * (1 + (ruis(gewasId, d) * 2 - 1) * MAX_SCHOM);
  return Math.max(MIN_PRIJS, Math.round(prijs * 100) / 100);
}

// De markt van vandaag: de prijs en of hij stijgt, daalt of gelijk blijft ten opzichte van de vorige speldag. Op dag nul is
// er geen vorige dag: dan is de trend gelijk.
export function markt(gewasId, dag) {
  const d = alsDag(dag);
  const prijs = dagprijs(gewasId, d);
  if (!(prijs > 0)) return { prijs: 0, trend: 'gelijk' };
  const vorige = d > 0 ? dagprijs(gewasId, d - 1) : prijs;
  return { prijs, trend: prijs > vorige ? 'op' : prijs < vorige ? 'neer' : 'gelijk' };
}
