// Geldwagen (cashvan.js): de misdaad van het openblazen hoort bij wie het deed. Blies een gast de wagen op
// (v.wreckedByGast, coopbestuur.js), dan krijgt hij de ster en niet de speler die het spel opende.
// Draai: node scripts/cashvan_dader_test.mjs
const store = new Map();
const BLOCKED = new Set(['gde-save-v1', 'gde-settings', 'gde-prestaties-v1']);
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { if (BLOCKED.has(k)) throw new Error('test schrijft naar echte opslag: ' + k); store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};

let fouten = 0;
const check = (ok, naam) => { if (ok) console.log('ok   ' + naam); else { fouten++; console.error('FOUT ' + naam); } };

const { reportCrime, cashVanBlownOpts } = await import('../game/js/crime.js');
const { readFileSync } = await import('node:fs');
// cashvan.js laadt in node niet (kaarten, geluid); de regel staat daarom in crime.js en cashvan.js moet hem gebruiken
const bron = readFileSync(new URL('../game/js/cashvan.js', import.meta.url), 'utf8');
check(/reportCrime\(w, 'cashVanBlown', cashVanBlownOpts\(v\)\)/.test(bron), 'cashvan.js meldt het openblazen met cashVanBlownOpts(v)');
const updateCashVan = (dt, w) => { for (const v of w.vehicles) reportCrime(w, 'cashVanBlown', typeof cashVanBlownOpts === 'function' ? cashVanBlownOpts(v) : { seen: true }); };

const wereld = (extra) => ({
  time: 10, wanted: 0, wantedDecayTimer: 0, money: 0, coopWanted: {}, pedestrians: [], player: { x: 0, y: 0 },
  addMessage() {}, cardSink() {}, ...extra,
});

// 1. een gast blies de geldwagen op: zijn ster, niet die van de host
{
  const w = wereld({ vehicles: [{ id: 1, isCashVan: true, wrecked: true, x: 500, y: 500, wreckedByGast: 2 }] });
  try { updateCashVan(0.016, w); } catch (e) { /* de kaart heeft geen DOM in node; de misdaad is dan al gemeld */ }
  check((w.wanted | 0) === 0, 'host blijft op 0 sterren als een gast de geldwagen opblies (was ' + w.wanted + ')');
  check(((w.coopWanted || {})[2] | 0) === 1, 'de gast op plek 2 krijgt de ster (nu ' + ((w.coopWanted || {})[2] | 0) + ')');
}

// 2. de host zelf blies hem op: zijn eigen ster, zoals altijd
{
  const w = wereld({ vehicles: [{ id: 2, isCashVan: true, wrecked: true, x: 500, y: 500, wreckedByPlayer: true }] });
  try { updateCashVan(0.016, w); } catch (e) { /* zie boven */ }
  check((w.wanted | 0) === 1, 'host krijgt zelf de ster voor zijn eigen geldwagen (nu ' + w.wanted + ')');
  check(!Object.keys(w.coopWanted || {}).length, 'geen gast krijgt een ster voor de overval van de host');
}

console.log(fouten ? `\n${fouten} fout(en)` : '\ncashvan_dader_test: alles goed');
process.exit(fouten ? 1 : 0);
