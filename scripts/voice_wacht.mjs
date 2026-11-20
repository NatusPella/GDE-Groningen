// De allowlist 'wacht op opname' (scripts/voice_wacht.json) voor voice_coverage en de dekkingstest: precies de
// opdrachten die nu in scripts/tts_lines.json staan, dus nog niet zijn ingesproken. Bedoeld voor de tijd dat de
// gateway een TTS-ronde afremt (429 cooldown); na een volledige ronde is de lijst leeg.
//   node scripts/voice_wacht.mjs           toont het aantal
//   node scripts/voice_wacht.mjs --write   schrijft scripts/voice_wacht.json (draai eerst tts_lines_list.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const jobs = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'tts_lines.json'), 'utf8'));
const keys = [...new Set(jobs.map((j) => j.key))].sort();
console.log(`${keys.length} sleutels wachten op opname`);
if (process.argv.includes('--write')) {
  const note = 'Allowlist wacht op opname (#735): gegenereerd door scripts/voice_wacht.mjs uit tts_lines.json; leeg zodra de TTS-ronde klaar is.';
  fs.writeFileSync(path.join(ROOT, 'scripts', 'voice_wacht.json'), JSON.stringify({ note, keys }, null, 1) + '\n');
}
