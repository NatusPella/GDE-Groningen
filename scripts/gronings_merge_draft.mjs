// Merges the Gronings drafts of docs/verhaal/DIALECT-CONCEPT.md into
// scripts/gronings_spoken.json (the table the TTS pipeline speaks from): key = the
// line exactly as the game shows it, value = how it sounds.
// Nothing is recorded here and nothing is sent anywhere.
//   node scripts/gronings_merge_draft.mjs           only report what would change
//   node scripts/gronings_merge_draft.mjs --write   merge the drafts in
// A key is never overwritten: a draft that disagrees with an existing row is a
// conflict, and the script stops so a human can look at it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPOKEN = path.join(REPO, 'scripts', 'gronings_spoken.json');
const DRAFT = path.join(REPO, 'scripts', 'gronings_spoken_draft.json');
const write = process.argv.includes('--write');

const spoken = JSON.parse(fs.readFileSync(SPOKEN, 'utf8'));
const draft = JSON.parse(fs.readFileSync(DRAFT, 'utf8'));
// the table is written the way the rest of the tts data is (python json.dump(indent=0): one row per
// line, no indentation, no trailing newline), and with the line endings this checkout uses, so a
// merge only shows the rows that were added
const current = fs.readFileSync(SPOKEN, 'utf8');
const nl = current.includes('\r\n') ? '\r\n' : '\n';
const serialize = (table) => '{' + nl + Object.keys(table).map((k) => JSON.stringify(k) + ': ' + JSON.stringify(table[k])).join(',' + nl) + nl + '}';

const fresh = [], same = [], conflicts = [];
for (const [key, value] of Object.entries(draft)) {
  if (typeof value !== 'string' || !value.trim()) conflicts.push(`${JSON.stringify(key)}: lege spreektekst`);
  else if (!(key in spoken)) fresh.push(key);
  else if (spoken[key] === value) same.push(key);
  else conflicts.push(`${JSON.stringify(key)}\n    bestaand: ${spoken[key]}\n    concept:  ${value}`);
}

console.log(Object.keys(draft).length, 'concepten:', fresh.length, 'nieuw,', same.length, 'al gelijk,', conflicts.length, 'conflict(en)');
console.log('gronings_spoken.json heeft er nu', Object.keys(spoken).length);
if (conflicts.length) {
  console.log('\nDeze gaan niet automatisch door; kijk ze na in scripts/gronings_spoken_draft.json:');
  for (const c of conflicts.slice(0, 20)) console.log('  ' + c);
  if (conflicts.length > 20) console.log(`  ... en ${conflicts.length - 20} meer`);
  process.exit(1);
}
if (!write) {
  console.log('\nNiets geschreven. Draai met --write om ze samen te voegen.');
  process.exit(0);
}
for (const key of fresh) spoken[key] = draft[key];
const merged = Object.fromEntries(Object.keys(spoken).sort().map((k) => [k, spoken[k]]));
fs.writeFileSync(SPOKEN, serialize(merged));
console.log(`\nSamengevoegd: ${fresh.length} regels erbij, ${Object.keys(merged).length} in totaal.`);
console.log('Nu opnemen: node scripts/tts_lines_list.mjs en daarna python scripts/tts_lines.py.');
