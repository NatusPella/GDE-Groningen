// De rangen van de snackwagen (#1378, taak S1): een zuivere afleiding van de stand van het bedrijf (snackvan.js, bezit.x.snack) naar zes rangen, van een eerste standplaats tot het
// Snackimperium. De rang is geen xp: hij volgt uit wat je opbouwde (vergunning, verkoop, het recept, een team, een klein imperium) en stijgt alleen (S.rang is een ratel).
// Een rang omhoog speelt een verhaalmoment via de gedeelde haak (rankmoments.js, snackrankscenes.js); een oude save krijgt zijn rang afgeleid en stil (nooit nul, nooit een moment achteraf).
// Puur: geen DOM, geen wereld, geen opslag, geen import van snackvan.js (die importeert dit bestand). scripts/snackrang_test.mjs.

export const MAX_RANG = 6;
export const RECIPE_SALES = 300;     // porties die je met het recept op de kaart verkoopt voor rang 4

// Elke rang vraagt zijn eigen voorwaarde en alles daarvoor (rang 4 zonder rang 3 bestaat niet). eis = wat je doet om deze rang te halen.
export const RANGEN = [
  { rang: 1, titel: 'Beginnend bakker', eis: 'Zo begin je.', test: () => true },
  { rang: 2, titel: 'Standplaatshouder', eis: 'Koop een vergunning voor een standplaats.', test: (S) => Object.keys((S.stats && S.stats.had) || {}).length >= 1 },
  { rang: 3, titel: 'Wagenbaas', eis: 'Zet je wagen op een standplaats en verkoop je eerste porties.', test: (S) => S.stats.sold >= 1 },
  { rang: 4, titel: 'Eierbalmeester', eis: `Verkoop ${RECIPE_SALES} porties, nu het recept uit het verhaal op je kaart staat.`, test: (S) => Array.isArray(S.recipes) && S.recipes.includes('oma') && S.stats.sold >= RECIPE_SALES },
  { rang: 5, titel: 'Teambaas', eis: 'Neem een medewerker aan achter een tweede wagen.', test: (S) => Array.isArray(S.fleet) && S.fleet.length >= 1 },
  { rang: 6, titel: 'Baas van het Snackimperium', eis: 'Bouw je vloot uit tot vijf wagens en neem een plek over van Us Mem Snacks.', test: (S) => Array.isArray(S.fleet) && S.fleet.length >= 4 && S.stats.takeovers >= 1 },
];

// De rang die bij deze stand hoort: de hoogste k waarvoor de voorwaarden van 2 tot en met k allemaal waar zijn.
export function rankOf(S) {
  if (!S || typeof S !== 'object' || !S.stats) return 1;
  let r = 1;
  for (const x of RANGEN.slice(1)) {
    let ok = false;
    try { ok = !!x.test(S); } catch (e) { ok = false; }
    if (!ok) break;
    r = x.rang;
  }
  return r;
}
export const rankTitle = (rang) => (RANGEN[rang - 1] || RANGEN[0]).titel;
const clampRang = (n) => Math.max(1, Math.min(MAX_RANG, Math.round(Number(n) || 1)));

// Het scherm: de rang, zijn titel en wat de volgende vraagt (null op het hoogste).
export function rankView(S) {
  const rang = Math.max(clampRang(S && S.rang), rankOf(S));
  const next = RANGEN[rang] || null;
  return { rang, titel: rankTitle(rang), van: MAX_RANG, volgende: next ? { rang: next.rang, titel: next.titel, eis: next.eis } : null };
}

// De ratel: zet S.rang op de afgeleide rang als die hoger is. Geeft { van, naar } als hij steeg, anders null. Verandert alleen S.rang.
export function raiseRank(S) {
  if (!S || typeof S !== 'object') return null;
  const van = clampRang(S.rang);
  const naar = rankOf(S);
  if (naar <= van) { S.rang = van; return null; }
  S.rang = naar;
  return { van, naar };
}
