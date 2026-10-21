// Herkomst van het geluid in game/audio (#62): telt muziek en stemclips en controleert dat elke stemclip in een tts.json
// staat met een Gemini-model. De getallen horen in docs/LICENTIES.md §2 en docs/LEGAL-AI-ASSETS.md; draai dit na elke
// nieuwe opname. Leest alleen bestandsnamen en de tts.json-logs, nooit .env of sleutels.
//   node scripts/audio_herkomst.mjs [--json]     (exit 1 als een stemclip geen log of geen Gemini-model heeft)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO = path.join(ROOT, 'game', 'audio');
const AUDIO_EXT = /\.(mp3|wav|ogg)$/;

export function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
const norm = (p) => p.split(path.sep).join('/');

export function herkomst(audioDir = AUDIO) {
  const all = walk(audioDir).map(norm);
  const base = norm(audioDir) + '/';
  const rel = (f) => f.slice(base.length);
  const logged = new Map();
  for (const log of all.filter((f) => f.endsWith('/tts.json'))) {
    const dir = path.posix.dirname(log);
    const t = JSON.parse(fs.readFileSync(log, 'utf8'));
    for (const e of Object.values(t.clips || t)) if (e && e.src) logged.set(path.posix.join(dir, e.src), e.model || '?');
  }
  const audio = all.filter((f) => AUDIO_EXT.test(f));
  const music = audio.filter((f) => /\/(gmusic|scenario|theme)\//.test(f) && !/\/jingles\//.test(f));
  const voice = audio.filter((f) => !music.includes(f));
  const zonderLog = voice.filter((f) => !logged.has(f)).map(rel);
  const modellen = {};
  for (const f of voice) if (logged.has(f)) modellen[logged.get(f)] = (modellen[logged.get(f)] || 0) + 1;
  const geenGemini = voice.filter((f) => logged.has(f) && !/gemini/i.test(logged.get(f))).map(rel);
  return {
    muziek: { gmusic: music.filter((f) => /\/gmusic\//.test(f)).length, scenario: music.filter((f) => /\/scenario\//.test(f)).length, titel: music.filter((f) => /\/theme\//.test(f)).length },
    stemmen: { clips: voice.length, gelogd: voice.length - zonderLog.length, modellen },
    zonderLog, geenGemini,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = herkomst();
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else {
    console.log(`Muziek: ${r.muziek.gmusic} G-Music-nummers, ${r.muziek.scenario} scenario-loops, ${r.muziek.titel} titelnummer`);
    console.log(`Stemmen en vaste clips: ${r.stemmen.clips}, waarvan ${r.stemmen.gelogd} in een tts.json; modellen: ${JSON.stringify(r.stemmen.modellen)}`);
    for (const f of r.zonderLog.slice(0, 20)) console.log('ZONDER LOG', f);
    for (const f of r.geenGemini.slice(0, 20)) console.log('GEEN GEMINI', f);
  }
  process.exit(r.zonderLog.length || r.geenGemini.length ? 1 : 0);
}
