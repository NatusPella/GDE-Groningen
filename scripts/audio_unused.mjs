// Lists audio nobody plays: manifest entries no line list or lookup reaches,
// and files under game/audio that no kept manifest entry or code path names.
//   node scripts/audio_unused.mjs           report
//   node scripts/audio_unused.mjs --delete  also delete them (files, manifest
//                                           and tts.json entries)
// An entry whose text still appears in the game code is kept and reported as
// "kept (text in code)": the collector may just not know that table yet.
import fs from 'fs';
import path from 'path';
import { collect, manifest, REPO } from './voicelines_collect.mjs';
import { BANTER, REACTIONS, SPEAKERS } from '../game/js/banterlines.js';

const del = process.argv.includes('--delete');
const GAME = path.join(REPO, 'game');
const AUDIO = path.join(GAME, 'audio');
const VL = path.join(AUDIO, 'voicelines');
const MANIFESTS = ['banter', 'lines', 'story', 'hints', 'sms', 'jobs', 'trailer'];

const code = fs.readdirSync(path.join(GAME, 'js')).filter((f) => /\.(js|mjs)$/.test(f) && f !== 'subtitles.js')
  .map((f) => fs.readFileSync(path.join(GAME, 'js', f), 'utf8')).join('\n') + fs.readFileSync(path.join(GAME, 'index.html'), 'utf8');
// Source text with JS string escapes undone, so a line can be found by its spoken text.
const codeText = code.replace(/\\(['"\\])/g, '$1');

// --- every key a lookup can ask for. Lookups fall back across manifests
// (story -> lines, sms -> lines/hints) so a key counts for every manifest.
const keys = new Set();
const bubbleTexts = new Set();
for (const e of collect()) {
  for (const s of e.speakers) {
    keys.add(e.manifest === 'npc' ? s : s + '|' + e.text);
    if (s === '~m' || s === '~f') bubbleTexts.add(e.text);
  }
}
// linevoice.bubbleVoice tries the other gender when one is missing
for (const t of bubbleTexts) { keys.add('~m|' + t); keys.add('~f|' + t); }
for (const ex of BANTER) for (const [s, t] of ex.lines) keys.add(SPEAKERS[s] + '|' + t);
for (const list of Object.values(REACTIONS)) for (const [s, t] of list) keys.add(SPEAKERS[s] + '|' + t);
// trailer.js plays its own two clips by path
for (const k of Object.keys(manifest('trailer'))) keys.add(k);

// subtitles.js is left out: it only holds translations, and old Frisian lines
// linger there after an edit.
const textInCode = (t) => codeText.includes(t);

const unusedEntries = [], keptByText = [];
const keptSrc = new Set();
for (const m of MANIFESTS) {
  for (const [k, v] of Object.entries(manifest(m))) {
    const src = path.join(m, v.src);
    if (keys.has(k)) { keptSrc.add(src); continue; }
    const text = k.slice(k.indexOf('|') + 1);
    if (textInCode(text)) { keptByText.push({ m, k }); keptSrc.add(src); continue; }
    unusedEntries.push({ m, k, src });
  }
}

// --- fixed-path clips built in audio.js (wav barks, npc, police, nieuws, jingles)
const audioJs = fs.readFileSync(path.join(GAME, 'js', 'audio.js'), 'utf8');
const fixed = new Set();
for (const [, d, k] of audioJs.matchAll(/variants\('(\w+)', '(\w+)'\)/g)) for (const s of ['', '_v1', '_v2']) fixed.add(`voicelines/${d}/${k}${s}.wav`);
const arr = (name) => [...audioJs.match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`))[1].matchAll(/'(\w+)'/g)].map((x) => x[1]);
for (const k of arr('POLICE_BARK_KEYS')) for (const v of [0, 1]) fixed.add(`police/${k}_v${v}.wav`);
for (const k of arr('SIKKOM_AUDIO_KEYS')) for (const v of [0, 1]) fixed.add(`nieuws/${k}_v${v}.wav`);
const npcN = +audioJs.match(/NPC_PHRASE_AUDIO = Array\.from\(\{ length: (\d+) \}/)[1];
for (let i = 0; i < npcN; i++) for (const v of [0, 1, 2]) fixed.add(`npc/phrase_${i}_v${v}.wav`);
for (const t of JSON.parse(fs.readFileSync(path.join(AUDIO, 'gmusic', 'manifest.json'), 'utf8')).tracks) fixed.add('gmusic/' + (typeof t === 'string' ? t : t.file));

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const unusedFiles = [];
for (const f of walk(AUDIO).filter((f) => /\.(mp3|wav|ogg)$/.test(f))) {
  const rel = path.relative(AUDIO, f);
  if (fixed.has(rel)) continue;
  if (rel.startsWith('voicelines/') && keptSrc.has(path.relative(VL, f))) continue;
  // any literal path or bare file name in the code (trailer.js, theme.js, audio.js)
  if (code.includes(rel) || code.includes(path.basename(f))) continue;
  unusedFiles.push(f);
}

const size = unusedFiles.reduce((a, f) => a + fs.statSync(f).size, 0);
const byM = {};
for (const e of unusedEntries) byM[e.m] = (byM[e.m] || 0) + 1;
console.log('Unused manifest entries:', unusedEntries.length, JSON.stringify(byM));
console.log('Kept (text still in code, not in the collector):', keptByText.length);
for (const e of keptByText) console.log(`  [${e.m}] ${e.k}`);
console.log(`Unused files: ${unusedFiles.length} (${(size / 1048576).toFixed(1)} MB)`);
if (process.argv.includes('-v')) {
  for (const e of unusedEntries) console.log(`  entry [${e.m}] ${e.k}`);
  for (const f of unusedFiles) console.log(`  file ${path.relative(REPO, f)}`);
}

// The generators write Python json.dump(indent=0): no indentation, floats keep their .0
const fmt = (o) => JSON.stringify(o, null, 1).replace(/^ +/gm, '').replace(/^("dur": -?\d+)(,?)$/gm, '$1.0$2');

if (del) {
  for (const m of MANIFESTS) {
    const gone = unusedEntries.filter((e) => e.m === m).map((e) => e.k);
    if (!gone.length) continue;
    for (const name of ['manifest.json', 'tts.json']) {
      const p = path.join(VL, m, name);
      if (!fs.existsSync(p)) continue;
      const raw = fs.readFileSync(p, 'utf8');
      const o = JSON.parse(raw);
      if (fmt(o) !== raw) throw new Error(`${p}: layout not reproducible, not touching it`);
      for (const k of gone) delete o[k];
      fs.writeFileSync(p, fmt(o));
    }
  }
  for (const f of unusedFiles) fs.unlinkSync(f);
  console.log('Deleted.');
}
