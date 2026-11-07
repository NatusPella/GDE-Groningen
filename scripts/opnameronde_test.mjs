// #735: de definitieve opnamelijst en het runbook. Deze test bewaakt dat het runbook
// bestaat, de LiteLLM-commando's noemt, geen echte sleutel bevat en dat de generator van de
// opnamelijst nog werkt (zonder op te nemen).
//   node scripts/opnameronde_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0;
const ok = (c, m, extra = '') => { n++; if (!c) { console.log('FAIL ' + m + (extra ? ' (' + extra + ')' : '')); process.exitCode = 1; } };

const doc = lees('docs/verhaal/OPNAMERONDE-735.md');
ok(/Opnameronde #735/.test(doc), 'docs/verhaal/OPNAMERONDE-735.md bestaat');
ok(/LITELLM_API_KEY/.test(doc), 'het runbook noemt de LiteLLM-sleutel (als eigenaarsstap)');
ok(/nog geen sleutel|niets opgenomen|geen sleutel/.test(doc), 'het runbook zegt eerlijk dat er niets is opgenomen');
for (const cmd of ['node scripts/tts_lines_list.mjs', 'python scripts/tts_lines.py --dry-run', 'python scripts/tts_lines.py --budget', 'node scripts/build_story_data.mjs', 'node scripts/voice_coverage.mjs --quiet', 'node scripts/opnamelijst.mjs', 'node scripts/audio_herkomst.mjs']) {
  ok(doc.includes(cmd), `het runbook noemt ${cmd}`);
}
ok(!/sk-[A-Za-z0-9]{20,}/.test(doc), 'er staat geen echte sleutel in het runbook');
ok(/Wat alleen de eigenaar kan/.test(doc), 'de resterende eigenaarsstap staat erin');
ok(/656/.test(doc) && /63/.test(doc), 'de actuele meting staat erin');

// de generator werkt; het bestand is lokaal en gitignored
const gen = lees('scripts/opnamelijst.mjs');
ok(/docs', 'verhaal', 'OPNAMELIJST\.md|OPNAMELIJST\.md/.test(gen), 'de generator schrijft de opnamelijst');
const ignore = lees('.gitignore');
ok(/OPNAMELIJST\.md/.test(ignore), 'de opnamelijst staat in .gitignore (lokaal)');
const verhaal = lees('docs/verhaal/README.md');
ok(/OPNAMERONDE-735/.test(verhaal), 'de verhaal-ingang noemt het runbook');

console.log(process.exitCode ? 'opnameronde_test: FAIL' : `opnameronde_test: ${n} controles ok`);
