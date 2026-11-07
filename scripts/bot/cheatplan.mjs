// Spelbot (#186): de cheat-ladder en de cheats-sweep per missie, puur. De sweep is code-only: hij bepaalt
// per missie/stap welke cheat de bot mag gebruiken als hij blijft hangen (nudge, objective, win, skip),
// zodat een echte run later eerlijk kan loggen "deze stap had een cheat nodig". De runs zelf doet de eigenaar.
export const SWEEP_RUNGS = ['nudge', 'objective', 'win', 'skip'];

// De volgende cheat voor deze stap: pas als de bot echt vastzit, en nooit twee keer dezelfde rung.
export function cheatVoor({ vast = false, geprobeerd = [] } = {}) {
  if (!vast) return null;
  return SWEEP_RUNGS.find((r) => !geprobeerd.includes(r)) || null;
}

// Het plan van een cheats-sweep: per missie de stappen en welke cheat daar als laatste redmiddel klaarstaat.
export function sweepPlan(missies = [], { stappen = 3 } = {}) {
  return missies.map((missie) => ({
    missie,
    stappen: Array.from({ length: Math.max(1, stappen | 0) }, (_, i) => i + 1),
    cheats: SWEEP_RUNGS.slice(0, 3),
    waarom: 'elke stap eerst zelf proberen; pas bij vastzitten de ladder op',
  }));
}

// Uit de events van een run: per missie welke cheats er echt nodig waren (voor de analyse).
export function cheatSweep(events = []) {
  const per = new Map();
  for (const e of events) {
    if (!e || e.type !== 'cheat' || e.rung === 'nudge') continue;
    const stap = String(e.step || '');
    const missie = (stap.match(/^M\d+/) || [stap || '?'])[0];
    const rij = per.get(missie) || { missie, aantal: 0, cheats: [] };
    rij.aantal++;
    rij.cheats.push({ stap, rung: e.rung });
    per.set(missie, rij);
  }
  return [...per.values()].sort((a, b) => (a.missie < b.missie ? -1 : 1));
}

// Eén regel per missie voor het rapport.
export function cheatSweepTable(events = []) {
  const rijen = cheatSweep(events);
  if (!rijen.length) return 'Geen cheat nodig in deze run.';
  const out = ['| Missie | Cheats | Stappen |', '|---|---|---|'];
  for (const r of rijen) out.push(`| ${r.missie} | ${r.aantal} | ${[...new Set(r.cheats.map((c) => c.stap))].join(', ')} |`);
  return out.join('\n');
}
