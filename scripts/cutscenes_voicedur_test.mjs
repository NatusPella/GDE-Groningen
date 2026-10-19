// Alle gespeelde scènes (akte 1 t/m 4) op de ECHTE voice-duren (#224):
//   node scripts/cutscenes_voicedur_test.mjs
// De akte-tests rekenen met leestijd; met opname duurt een regel max(lineDur, dur + 0.25),
// en een lang shot zonder camerabeweging valt dan pas op. Hier valideert elke scène met die tijden.
import { readFileSync } from 'node:fs';
import { compileScene, validateScene } from '../game/js/cutscript.js';
import { SPECS, MORE_SPECS, missionScene } from '../game/js/cutscenes_akte1.js';
import { SPECS_AKTE2 } from '../game/js/cutscenes_akte2.js';
import '../game/js/cutscenes_akte3.js';
import '../game/js/cutscenes_akte4.js';
import { STEPS } from '../game/js/storyarc_nieuw.js';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };
const rd = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const data = rd('../game/storydata/script.json');
const bankLines = rd('../game/audio/voicelines/lines/manifest.json');
let bankStory = {};
try { bankStory = rd('../game/audio/voicelines/story/manifest.json'); } catch { /* geen story-bank */ }
const src = readFileSync(new URL('../game/js/missionstory.js', import.meta.url), 'utf8');
const looks = {};
for (const m of src.matchAll(/^  (\w+): \{.*?name: '([^']+)'/gm)) looks[m[1]] = { name: m[2], shirt: 0x808080, skin: 0xd0a080 };

const ALL = { ...SPECS, ...MORE_SPECS, ...SPECS_AKTE2 };
const SCENES = {};
for (const s of STEPS.filter((q) => q.story)) { SCENES[s.id + '.intro'] = s.story.intro; if (s.story.outro) SCENES[s.id + '.outro'] = s.story.outro; }
for (const k of Object.keys(ALL)) if (/^M\d+\.\d+$/.test(k)) SCENES[k] = [k];
Object.assign(SCENES, { 'M01.intro': ['M01.1'], 'M01.outro': ['M01.6'], 'M02.intro': ['M02.1'], 'M02.outro': ['M02.3'] });

const NAME = { T: 'Tammo', A: 'Anita' };
const lineDur = (t) => Math.max(1.8, Math.min(3.8, 0.95 + t.length * 0.042));
const reading = (t) => Math.max(2.2, Math.min(8, 1.3 + t.length * 0.058));
function linesOf(ids) {
  const out = []; let t = 0.5, voiced = 0;
  for (const id of ids) {
    const sc = data.scenes.find((s) => s.id === id);
    if (!sc) return null;
    for (const l of sc.lines) {
      if (l.channel === 'app-stil') continue;
      const speaker = NAME[l.key] || (looks[l.key] && looks[l.key].name) || l.key;
      const v = bankStory[speaker + '|' + l.text] || bankLines[speaker + '|' + l.text];
      if (v) voiced++;
      const dur = v ? Math.max(lineDur(l.text), v.dur + 0.25) : reading(l.text);
      out.push({ speaker, text: l.text, at: t, dur });
      t += dur + 0.1;
    }
  }
  return { lines: out, total: t + 0.3, voiced };
}

let withVoice = 0;
for (const key of Object.keys(ALL)) {
  const ids = SCENES[key];
  if (!ids) continue;
  const r = linesOf(ids);
  if (!r) continue;
  if (r.voiced) withVoice++;
  const def = missionScene(key, r.lines, { looks });
  if (!def) continue;
  const issues = validateScene(def, { lines: r.lines, duration: r.total });
  ok(issues.length === 0, key + ' valideert met voice-duren', issues.join(' | '));
  if (!issues.length) { try { compileScene(def, { lines: r.lines, duration: r.total }); } catch (e) { ok(false, key + ' compileert', e.message); } }
}
console.log(`${n} controles, ${withVoice} scènes met opnames, ${fails} mislukt`);
process.exit(fails ? 1 : 0);
