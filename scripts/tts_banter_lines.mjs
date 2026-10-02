// Collects every car-banter line (game/js/banterlines.js) with its cast into
// scripts/tts_banter.json for tts_banter.py. File names carry a hash of the
// text, so an edited line gets a fresh recording and the old one is unused.
// Run from anywhere: node scripts/tts_banter_lines.mjs
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { BANTER, REACTIONS, SPEAKERS } from '../game/js/banterlines.js';
import { DUO, styleOf } from './tts_cast.mjs';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = [];
const add = (base, n, [s, text, tag = 'casual, conversational']) => {
  const speaker = SPEAKERS[s];
  if (!speaker) throw new Error(`${base}: unknown speaker ${s}`);
  const hash = crypto.createHash('sha1').update(speaker + '|' + text).digest('hex').slice(0, 6);
  const c = DUO[speaker];
  out.push({ file: `${base}_${n}_${s.toLowerCase()}_${hash}.mp3`, speaker, text, tag, voice: c.voice, who: c.who, style: styleOf(c.who, tag, c.accent) });
};
const ids = new Set();
for (const ex of BANTER) {
  if (ids.has(ex.id)) throw new Error('duplicate id ' + ex.id);
  ids.add(ex.id);
  ex.lines.forEach((l, n) => add(ex.id, n, l));
}
for (const [kind, list] of Object.entries(REACTIONS)) list.forEach((l, n) => add('react-' + kind, n, l));
const seen = new Set();
const uniq = out.filter((l) => !seen.has(l.speaker + '|' + l.text) && seen.add(l.speaker + '|' + l.text));
fs.writeFileSync(path.join(REPO, 'scripts', 'tts_banter.json'), JSON.stringify(uniq, null, 1));
console.log(`${BANTER.length} exchanges, ${uniq.length} lines, ${uniq.reduce((a, l) => a + l.text.length, 0)} chars`);
