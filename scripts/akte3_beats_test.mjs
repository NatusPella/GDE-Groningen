// Akte 3: elke regie-aanwijzing (beats, shots, fx) van de cutscenes van M12 tot en met M16 wijst naar een regel die er echt staat.
//   node scripts/akte3_beats_test.mjs
// missionScene() slaat een beat over waarvan de regel niet is gevonden (zodat een tekstwijziging niets breekt); dat is veilig maar
// stil: de aanwijzing werkt dan niet meer. Deze test maakt dat zichtbaar. Een `on` is het begin van de tekst van een regel.
import { readFileSync } from 'node:fs';
import { MORE_SPECS as SPECS } from '../game/js/cutscenes_akte1.js';
import '../game/js/cutscenes_akte3.js';
import { STEPS } from '../game/js/storyarc_nieuw.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const data = JSON.parse(readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const textsOf = (ids) => ids.flatMap((id) => (data.scenes.find((s) => s.id === id) || { lines: [] }).lines.filter((l) => l.channel !== 'app-stil').map((l) => l.text));

const SCENES = { 'M16.dijk': ['M16.6'] };
for (const s of STEPS.filter((q) => q.part === 'staart' && q.story)) { SCENES[s.id + '.intro'] = s.story.intro; if (s.story.outro) SCENES[s.id + '.outro'] = s.story.outro; }

const keys = Object.keys(SPECS).filter((k) => /^M1[2-6]\./.test(k));
ok(keys.length >= 11, 'de cutscenes van akte 3 zijn er', String(keys.length));
for (const key of keys) {
  const texts = textsOf(SCENES[key] || []);
  const spec = SPECS[key];
  const ons = [...(spec.beats || []), ...(spec.shots || []), ...(spec.fx || [])].map((b) => b.on).filter((o) => typeof o === 'string');
  for (const on of ons) ok(texts.some((t) => t.startsWith(on)), `${key}: "${on}" staat aan het begin van een regel`);
  // een regel waarop de camera of een gebaar moet reageren, mag niet ontbreken: elke spec heeft minstens drie aanwijzingen
  ok(ons.length >= 3, `${key}: minstens drie aanwijzingen op regels`, String(ons.length));
}
console.log(`akte3_beats_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
