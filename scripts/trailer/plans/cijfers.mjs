// Cijfers voor de overlays (alleen gemeten cijfers uit scripts/stats/schaal.mjs, nooit uit het hoofd): leest het cijferblad en geeft per id { tekst, label, let_op }.
// Zoekt in deze volgorde: --cijfers=<pad> / list.cijfers, $GDE_CIJFERS, een cijfers.json in een submap van het uploadpakket (buiten git), de schaal-cijfers.json van de showcase-werkmap.
// Een cijfer dat niet in het blad staat, wordt een fout: er komt geen verzonnen waarde in beeld.
import fs from 'node:fs';
import path from 'node:path';

const PAKKET = 'C:/Users/abuis/GIT/GDE-uploadpakket2';
const inPakket = () => (fs.existsSync(PAKKET) ? fs.readdirSync(PAKKET).map((d) => path.join(PAKKET, d, 'cijfers.json')) : []);
const FALLBACKS = [process.env.GDE_CIJFERS, ...inPakket(), 'C:/Users/abuis/GIT/GDE-Groningen/.claude/worktrees/r49-schaal/docs/showcase/schaal-cijfers.json'];
export function loadCijfers(explicit) {
  const file = [explicit, ...FALLBACKS].filter(Boolean).find((f) => fs.existsSync(f));
  if (!file) throw new Error('geen cijferblad gevonden');
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rows = Array.isArray(j) ? j : j.cijfers || Object.entries(j).map(([id, v]) => ({ id, ...(typeof v === 'object' ? v : { tekst: String(v) }) }));
  const map = new Map(rows.map((r) => [r.id, r]));
  const get = (id) => { const r = map.get(id); if (!r) throw new Error('cijfer onbekend: ' + id + ' (blad: ' + file + ')'); return { tekst: r.tekst ?? String(r.waarde), label: r.label || '', let_op: r.let_op || null }; };
  return { file, raw: j, get, has: (id) => map.has(id) };
}
