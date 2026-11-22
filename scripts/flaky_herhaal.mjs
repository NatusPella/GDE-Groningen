// Draait één test een aantal keer achter elkaar en meldt of hij stabiel is, zodat een flaky test herkend wordt vóór hij
// in KNOWN_FLAKES (scripts/lib/testloop.mjs) terechtkomt. Gebruik:
//   node scripts/flaky_herhaal.mjs <test.mjs> [--n=5] [--timeout=60]
// Uitvoer: "STABIEL" (alle runs gelijk), "FLAKY" (verschil in uitkomst) of "KAPOT" (alle runs falen). Exitcode 0 bij stabiel
// groen, 1 anders. De test draait met gewone node; geen Electron, geen netwerk.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function oordeel(uitkomsten) {
  const goed = uitkomsten.filter((u) => u.code === 0).length;
  if (!uitkomsten.length) return 'LEEG';
  if (goed === uitkomsten.length) return 'STABIEL';
  if (goed === 0) return 'KAPOT';
  return 'FLAKY';
}

export function herhaal(bestand, { n = 5, timeoutS = 60, cwd } = {}) {
  const uit = [];
  for (let i = 0; i < n; i++) {
    const t0 = Date.now();
    const r = spawnSync(process.execPath, [bestand], { cwd, encoding: 'utf8', timeout: timeoutS * 1000 });
    const code = r.status === null ? 124 : r.status; // 124: time-out
    uit.push({ code, ms: Date.now() - t0, laatste: String(r.stdout || '').trim().split('\n').pop() });
  }
  return uit;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const bestand = args.find((a) => !a.startsWith('--'));
  const opt = (k, d) => Number((args.find((a) => a.startsWith('--' + k + '=')) || '').split('=')[1]) || d;
  if (!bestand) { console.log('Gebruik: node scripts/flaky_herhaal.mjs <test.mjs> [--n=5] [--timeout=60]'); process.exit(2); }
  const n = opt('n', 5);
  const uit = herhaal(bestand, { n, timeoutS: opt('timeout', 60) });
  const o = oordeel(uit);
  const ms = uit.map((u) => u.ms);
  console.log(`${o}: ${uit.filter((u) => u.code === 0).length}/${n} groen, ${Math.min(...ms)} tot ${Math.max(...ms)} ms per run`);
  for (const [i, u] of uit.entries()) if (u.code !== 0) console.log(`  run ${i + 1}: code ${u.code}${u.code === 124 ? ' (time-out)' : ''} ${u.laatste}`);
  process.exit(o === 'STABIEL' ? 0 : 1);
}
