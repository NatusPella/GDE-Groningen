// The voices speak Gronings (scripts/gronings_spoken.json: line as shown ->
// spoken spelling), the subtitles stay as written. Checks the table itself and
// that every recorded clip's tts.json entry says which language it was made in.
//   node scripts/gronings_spoken_test.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TTS_LANG, TTS_MODELS } from './tts_cast.mjs';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const table = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'gronings_spoken.json'), 'utf8'));
let bad = 0;
const fail = (m) => { bad++; console.log('FAIL', m); };

const digits = (s) => (s.match(/\d+/g) || []).join(',');
const spokenValues = new Set(Object.values(table));
let same = 0;
for (const [nl, gro] of Object.entries(table)) {
  if (!gro.trim()) fail(`empty spoken text for: ${nl}`);
  if (digits(nl) !== digits(gro)) fail(`numbers differ: ${nl} -> ${gro}`);
  if (gro === nl) same++;
  if (/[<>]/.test(nl) !== /[<>]/.test(gro)) fail(`vocal tag lost: ${nl} -> ${gro}`);
  if (gro.length > nl.length * 1.5 + 12) fail(`spoken text much longer than the line: ${nl} -> ${gro}`);
}
console.log(`${Object.keys(table).length} spoken lines (${same} already Gronings as shown)`);

function* logs(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* logs(p);
    else if (e.name === 'tts.json') yield p;
  }
}
let clips = 0, own = 0;
for (const f of logs(path.join(REPO, 'game', 'audio'))) {
  const log = JSON.parse(fs.readFileSync(f, 'utf8'));
  const rel = path.relative(REPO, f);
  for (const [key, e] of Object.entries(log)) {
    clips++;
    if (!TTS_MODELS.includes(e.model)) fail(`${rel}: ${key} has model ${e.model}`);
    else if (e.lang === 'own') own++;
    else if (e.lang !== TTS_LANG) fail(`${rel}: ${key} was not recorded in Gronings (lang ${e.lang})`);
    else if (!spokenValues.has(e.input)) fail(`${rel}: ${key} input is not in gronings_spoken.json: ${e.input}`);
  }
}
console.log(`${clips} clips logged, ${clips - own} Gronings, ${own} in their own language (Frisian characters, tourists)`);
if (bad) { console.log(bad, 'problems'); process.exit(1); }
console.log('ok');
