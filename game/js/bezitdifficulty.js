// Dunne adapter tussen Bezit en de moeilijkheid (#800, branch moeilijkheid-21-11, difficulty.js): zolang die module er niet is blijft alles neutraal (factor 1). Puur: geen DOM,
// geen opslag, geen klok (scripts/bezitdifficulty_test.mjs). Bezit leest de factoren alleen via bezitprijs.difficultyFactor(kind), begrensd op plus of min 25%.
//
// kind: 'income' (omzet, huur, pacht, winst van de snackwagen), 'price' (aankoopprijs van percelen, panden, vergunningen en wagens), 'cost' (lopende kosten; nog niet aangesloten).
// De bouwer koppelt difficulty.js zo: setBezitDifficultyProvider((kind) => ...) met zijn eigen tabel, of zet de stand met setBezitDifficultyMode(difficultyMode).

export const BEZIT_MODES = ['ontspannen', 'standaard', 'uitdagend'];
export const BEZIT_TABLE = {
  ontspannen: { income: 1.15, price: 0.9, cost: 0.9 },
  standaard: { income: 1, price: 1, cost: 1 },
  uitdagend: { income: 0.85, price: 1.1, cost: 1.1 },
};
let mode = 'standaard', provider = null;

export const setBezitDifficultyMode = (m) => { mode = BEZIT_MODES.includes(m) ? m : 'standaard'; };
export const getBezitDifficultyMode = () => mode;
// Een provider (kind) => factor van difficulty.js; null haalt hem weer weg (terug naar de lokale tabel).
export const setBezitDifficultyProvider = (fn) => { provider = typeof fn === 'function' ? fn : null; };
export function rawDifficulty(kind) {
  if (provider) { const v = Number(provider(kind)); return Number.isFinite(v) && v > 0 ? v : 1; }
  const row = BEZIT_TABLE[mode] || BEZIT_TABLE.standaard;
  return Number.isFinite(row[kind]) ? row[kind] : 1;
}
