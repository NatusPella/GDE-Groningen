// Register en controle van de dialectwoorden in de speltekst (#13): Gronings (ingesproken versies in
// scripts/gronings_spoken.json) en de Friese woorden in de getoonde tekst. Elk dialectwoord staat in
// scripts/dialect_woorden.json met een Nederlandse betekenis en een status. Zie docs/DIALECT-CONTROLE.md.
//   node scripts/dialect_check.mjs            controleert; exit 1 bij een niet-geregistreerd woord
//   node scripts/dialect_check.mjs --write    voegt nieuwe Groningse woorden toe (status 'nieuw', met de
//                                             afgeleide betekenis) en behoudt wat al is beoordeeld
//   node scripts/dialect_check.mjs --lijst    toont twijfelgevallen en spellingvarianten
// Statussen: 'bron' (bevestigd in een genoemde bron), 'afgeleid' (regelmatige klankverschuiving van het
// Nederlandse woord, volgens de uitlijning getoond -> gesproken; niet in een woordenboek nagezocht),
// 'twijfel' (zie opm), 'nieuw' (nog niet beoordeeld: de test faalt).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REG = path.join(REPO, 'scripts', 'dialect_woorden.json');
const tok = (s) => (s.toLowerCase().match(/[a-zàâäçéèêëïîôöùûüœ'’-]+/g) || []).map((w) => w.replace(/^['’-]+|['’-]+$/g, '')).filter(Boolean);

// Groningse woorden: tokens in de gesproken versie die niet in de getoonde (Nederlandse) tekst voorkomen,
// met de Nederlandse tegenhanger uit een uitlijning van de twee regels.
export function groningsTokens(table) {
  const dutch = new Set();
  for (const a of Object.keys(table)) for (const w of tok(a)) dutch.add(w);
  const pairs = new Map(), count = new Map();
  for (const [a, b] of Object.entries(table)) {
    if (a === b || typeof b !== 'string') continue;
    const A = tok(a), B = tok(b), n = A.length, m = B.length;
    const d = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) d[i][j] = A[i] === B[j] ? d[i + 1][j + 1] + 1 : Math.max(d[i + 1][j], d[i][j + 1]);
    let i = 0, j = 0, ra = [], rb = [];
    const flush = () => {
      if (ra.length && ra.length === rb.length) ra.forEach((x, k) => { const y = rb[k]; const mp = pairs.get(y) || new Map(); mp.set(x, (mp.get(x) || 0) + 1); pairs.set(y, mp); });
      ra = []; rb = [];
    };
    while (i < n && j < m) { if (A[i] === B[j]) { flush(); i++; j++; } else if (d[i + 1][j] >= d[i][j + 1]) ra.push(A[i++]); else rb.push(B[j++]); }
    while (i < n) ra.push(A[i++]); while (j < m) rb.push(B[j++]); flush();
    for (const w of B) if (!dutch.has(w)) count.set(w, (count.get(w) || 0) + 1);
  }
  const out = {};
  for (const [w, c] of count) {
    const mp = pairs.get(w);
    out[w] = { n: c, nl: mp ? [...mp].sort((x, y) => y[1] - x[1])[0][0] : '?' };
  }
  return out;
}

export const load = () => JSON.parse(fs.readFileSync(REG, 'utf8'));

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const table = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'gronings_spoken.json'), 'utf8'));
  const found = groningsTokens(table);
  const reg = fs.existsSync(REG) ? load() : { gronings: {}, fries: {} };
  if (process.argv.includes('--write')) {
    let added = 0;
    for (const [w, v] of Object.entries(found)) {
      if (!reg.gronings[w]) { reg.gronings[w] = { nl: v.nl, status: 'nieuw' }; added++; }
      reg.gronings[w].n = v.n;
    }
    fs.writeFileSync(REG, JSON.stringify(reg, null, 1) + '\n');
    console.log(`geschreven: ${added} nieuwe woorden, ${Object.keys(reg.gronings).length} totaal`);
  } else if (process.argv.includes('--lijst')) {
    for (const [w, v] of Object.entries(reg.gronings)) if (v.status === 'twijfel') console.log(`twijfel  ${w} (${v.nl}): ${v.opm}`);
    for (const [w, v] of Object.entries(reg.fries)) if (v.status === 'twijfel') console.log(`twijfel  ${w} (${v.nl}): ${v.opm}`);
  } else {
    const missing = Object.keys(found).filter((w) => !reg.gronings[w] || reg.gronings[w].status === 'nieuw');
    for (const w of missing) console.log(`niet beoordeeld: ${w} (${found[w].nl}) x${found[w].n}`);
    console.log(`${Object.keys(found).length} Groningse woorden, ${missing.length} niet beoordeeld`);
    process.exit(missing.length ? 1 : 0);
  }
}
