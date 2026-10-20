// Controleert docs/MERKENREGISTER.md (#62) tegen de code:
//  1. elke rij in sectie 6 noemt een bestand waar de naam nog in staat;
//  2. elke winkelketen (`chain:` in shops.js) en elk automerk (vehiclenames.js) staat in het register.
// Alleen lezen. `node scripts/merkenregister_check.mjs`; exit 1 bij een afwijking.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(REPO, f), 'utf8');

/** Rijen uit sectie 6: { naam, bron, beoordeling }. */
export function parseRegister(md) {
  const at = md.indexOf('## 6. Register');
  if (at < 0) return [];
  const rows = [];
  for (const l of md.slice(at).split(/\r?\n/)) {
    if (!l.startsWith('|') || /^\|\s*-/.test(l) || /^\|\s*Naam\s*\|/.test(l)) continue;
    const c = l.split('|').slice(1, -1).map((s) => s.trim());
    if (c.length < 5) continue;
    const m = c[2].match(/`([^`]+)`/);
    rows.push({ naam: c[0], bron: m ? m[1] : '', beoordeling: c[4] });
  }
  return rows;
}

/** Namen die de code zelf aanlevert: winkelketens en automerken. */
export function harvest(shopsSrc, namesSrc) {
  const chains = [...shopsSrc.matchAll(/chain:\s*'([^']+)'/g)].map((m) => m[1]);
  const makes = new Set([...namesSrc.matchAll(/\['([^']+)',\s*'[^']+'\]/g)].map((m) => m[1]));
  return { chains, makes: [...makes] };
}

// Beschrijvende soortnamen zonder merkkarakter (geen register nodig).
const GENERIC_MAKES = new Set(['Politie', 'Stadsbus', 'Taxi', 'Ambulance', 'Sloep', 'Rondvaartboot', 'Kano', 'Kajak', 'SUP',
  'Skiff', 'Acht', 'Waterfiets', 'Rubberboot', 'Bijbootje', 'Roeiboot', 'Skûtsje', 'Zeilboot', 'Fiets', 'E-step', 'Deelstep',
  'Fjord', 'Rotor Roelf', 'Poen Express']);

export function check() {
  const md = read('docs/MERKENREGISTER.md');
  const rows = parseRegister(md);
  const problems = [];
  if (!rows.length) problems.push('geen rijen in sectie 6');
  for (const r of rows) {
    if (!/^(ok|let op|besluit)/.test(r.beoordeling)) problems.push(`${r.naam}: beoordeling ontbreekt of is onbekend`);
    if (!r.bron || !fs.existsSync(path.join(REPO, r.bron))) { problems.push(`${r.naam}: bronbestand ${r.bron || '(geen)'} bestaat niet`); continue; }
    if (!read(r.bron).includes(r.naam.replace(/^Ome /, ''))) problems.push(`${r.naam}: staat niet (meer) in ${r.bron}`);
  }
  const names = new Set(rows.map((r) => r.naam));
  const { chains, makes } = harvest(read('game/js/shops.js'), read('game/js/vehiclenames.js'));
  for (const c of chains) if (![...names].some((n) => n.includes(c) || c.includes(n))) problems.push(`winkelketen "${c}" ontbreekt in het register`);
  for (const m of makes) if (!GENERIC_MAKES.has(m) && !names.has(m)) problems.push(`automerk "${m}" ontbreekt in het register`);
  return { rows: rows.length, problems };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { rows, problems } = check();
  for (const p of problems) console.log('AFWIJKING', p);
  console.log(`${rows} rijen in het register, ${problems.length} afwijkingen.`);
  process.exit(problems.length ? 1 : 0);
}
