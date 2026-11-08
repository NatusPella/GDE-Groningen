// Lees een bewaarde perf-run ($PERF_OUT/<naam>.json) en keur elke route tegen
// de norm uit #804. Zonder hardwaremeting zegt dit niets over de huidige build;
// het maakt de norm wel herhaalbaar.   node scripts/perf/norm_check.mjs <json...>
import fs from 'node:fs';
import path from 'node:path';
import { routeMap, routeStats, normViolations, NORM } from './normrules.mjs';

const files = process.argv.slice(2);
if (!files.length) {
  console.log('gebruik: node scripts/perf/norm_check.mjs <perf-json...>');
  process.exit(2);
}

let routes = 0;
let fails = 0;
for (const file of files) {
  let json;
  try { json = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.log(`FAIL ${file}: geen geldige json`); fails++; continue; }
  const map = routeMap(json);
  for (const [name, route] of Object.entries(map)) {
    routes++;
    const s = routeStats(route);
    const bad = normViolations(route);
    if (bad.length) {
      fails++;
      console.log(`FAIL ${path.basename(file)}:${name} frames=${s.frames} over50=${s.over50} over100=${s.over100} - ${bad.map((b) => b.rule).join('; ')}`);
    } else {
      console.log(`ok ${path.basename(file)}:${name} frames=${s.frames}`);
    }
  }
}

console.log(`${routes - fails}/${routes} routes binnen de norm (max ${NORM.maxOver100}x >100 ms, max ${NORM.maxOver50}x >50 ms)`);
if (!routes) { console.log('geen routes gevonden in de opgegeven bestanden'); fails++; }
process.exit(fails ? 1 : 0);
