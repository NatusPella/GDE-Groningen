// Warmte van kleine overtredingen (crime.js, #1296): hoort bij de wereld, koelt alleen met verstreken tijd,
// wordt gewist bij de respawn, en een geldwagen die vanzelf wrak raakt geeft niemand een ster.
// Draai: node scripts/crime_warmte_test.mjs
const store = new Map();
const BLOCKED = new Set(['gde-save-v1', 'gde-settings', 'gde-prestaties-v1']);
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { if (BLOCKED.has(k)) throw new Error('test schrijft naar echte opslag: ' + k); store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};

let fouten = 0;
const check = (ok, naam) => { if (ok) console.log('ok   ' + naam); else { fouten++; console.error('FOUT ' + naam); } };

const { reportCrime, cashVanHasCulprit } = await import('../game/js/crime.js');
const { readFileSync } = await import('node:fs');

const wereld = (extra) => ({
  time: 10, wanted: 0, wantedDecayTimer: 0, money: 0, coopWanted: {}, pedestrians: [], vehicles: [], player: { x: 0, y: 0 },
  addMessage() {}, cardSink() {}, ...extra,
});

// 1. tijdsprong terug: na een misdaad op t=5000 geeft een ongeziene brommerovertreding op t=10 geen ster
{
  const w = wereld({ time: 5000 });
  reportCrime(w, 'pedHit', { seen: false });
  w.time = 10;
  reportCrime(w, 'tunedMoped', { seen: false });
  check((w.wanted | 0) === 0, 'tijd terug laat de warmte niet oplopen (sterren ' + w.wanted + ')');
  check(w.crimeHeat && w.crimeHeat.heat <= 45 + 30, 'warmte na de sprong is hooguit de som (' + (w.crimeHeat && w.crimeHeat.heat) + ')');
}

// 2. de warmte hoort bij de wereld: een tweede wereld (andere save, nieuw spel) begint op 0
{
  const a = wereld();
  reportCrime(a, 'pedHit', { seen: false });
  reportCrime(a, 'pedHit', { seen: false });
  const b = wereld();
  reportCrime(b, 'tunedMoped', { seen: false });
  check(b.crimeHeat.heat === 30, 'nieuwe wereld begint zonder de warmte van de vorige (' + b.crimeHeat.heat + ')');
}

// 3. respawnPlayer wist de warmte (world.js laadt niet in node; de regel staat in de bron)
{
  const bron = readFileSync(new URL('../game/js/world.js', import.meta.url), 'utf8');
  const resp = bron.slice(bron.indexOf('export function respawnPlayer'));
  check(/world\.crimeHeat = null/.test(resp.slice(0, resp.indexOf('\n}'))), 'respawnPlayer zet world.crimeHeat terug');
  const w = wereld();
  reportCrime(w, 'pedHit', { seen: true }); // gezien: ster, rest 40
  check((w.wanted | 0) === 0 || w.crimeHeat.heat > 0, 'na een geziene misdaad blijft er warmte over');
  w.crimeHeat = null; // wat respawnPlayer doet
  reportCrime(w, 'tunedMoped', { seen: false });
  check(w.crimeHeat.heat === 30, 'na de respawn telt alleen de nieuwe overtreding (' + w.crimeHeat.heat + ')');
}

// 4. geldwagen: alleen een ster als een speler hem opblies
{
  check(!cashVanHasCulprit({ isCashVan: true, wrecked: true }), 'wrak uit het verkeer: geen dader');
  check(cashVanHasCulprit({ wreckedByPlayer: true }), 'opener blies hem op: dader');
  check(cashVanHasCulprit({ wreckedByGast: 2 }), 'gast blies hem op: dader');
  check(cashVanHasCulprit({ coopBestuurder: 3 }), 'gast aan het stuur: dader');
  const bron = readFileSync(new URL('../game/js/cashvan.js', import.meta.url), 'utf8');
  check(/if \(cashVanHasCulprit\(v\)\) reportCrime\(w, 'cashVanBlown'/.test(bron), 'cashvan.js meldt alleen met een dader');
}

console.log(fouten ? `\n${fouten} fout(en)` : '\ncrime_warmte_test: alles goed');
process.exit(fouten ? 1 : 0);
