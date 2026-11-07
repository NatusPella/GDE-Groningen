// #735: één commando voor de eigenaar om de TTS-opnameronde te draaien. Doet de vier stappen uit
// het runbook in de juiste orde en stopt bij de eerste fout:
//   1. de wachtrij verversen (scripts/tts_lines.json, tts_waiting.json)
//   2. de clips opnemen via de LiteLLM-gateway (scripts/tts_lines.py)
//   3. de verhaaldata bijwerken (build_story_data.mjs)
//   4. de dekking controleren (voice_coverage.mjs) en de opnamelijst verversen (tts_opnamelijst.mjs)
// De sleutel leest dit script nooit: de TTS-module leest LITELLM_API_KEY zelf uit de eigenaar-s-
// omgeving of .env (gitignored). Dit script kijkt alleen of er ergens een sleutelbron lijkt te zijn
// en zegt wat de eigenaar moet zetten; het print geen sleutel en leest .env niet.
//   node scripts/tts_opnameronde.mjs --dry            alleen tonen wat er zou gebeuren
//   node scripts/tts_opnameronde.mjs --budget 2.5     de echte ronde (budget in dollars)
//   node scripts/tts_opnameronde.mjs --budget 2.5 --max 8   hooguit 8 clips in deze ronde
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (naam, standaard) => {
  const i = args.indexOf(naam);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : standaard;
};
const DRY = args.includes('--dry') || args.includes('--dry-run');
const BUDGET = flag('--budget', '2.5');
const MAX = flag('--max', null);
if (args.includes('--help') || args.includes('-h')) {
  console.log('Gebruik: node scripts/tts_opnameronde.mjs [--dry] [--budget 2.5] [--max 8]');
  console.log('  --dry        alleen tonen wat er zou gebeuren (geen sleutel of netwerk)');
  console.log('  --budget N   maximaal N dollar aan clips in deze ronde');
  console.log('  --max N      hooguit N clips in deze ronde');
  process.exit(0);
}

const node = process.execPath;
const py = ['python', 'python3', 'py'].find((k) => {
  try { return spawnSync(k, ['--version'], { encoding: 'utf8' }).status === 0; } catch { return false; }
});

function run(naam, cmd, argv) {
  console.log(`\n== ${naam}`);
  console.log(`  ${[cmd, ...argv].join(' ')}`);
  const r = spawnSync(cmd, argv, { cwd: ROOT, stdio: 'inherit' });
  if (r.error || r.status !== 0) {
    console.error(`\nGestopt bij "${naam}" (${r.error ? r.error.message : 'exit ' + r.status}).`);
    return false;
  }
  return true;
}

if (!py) {
  console.error('Python 3 ontbreekt. Installeer Python 3.11+ en ffmpeg, en probeer opnieuw.');
  process.exit(1);
}
const ffmpeg = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
if (!DRY && (ffmpeg.error || ffmpeg.status !== 0)) {
  console.error('ffmpeg ontbreekt (nodig voor trimmen en loudness-normalisatie). Zet ffmpeg op het pad en probeer opnieuw.');
  process.exit(1);
}

// Alleen kijken of er een sleutelbron is; nooit de inhoud lezen of printen.
const keyInEnv = !!process.env.LITELLM_API_KEY;
const envPad = process.env.GDE_ENV;
const dotenv = path.join(ROOT, '.env');
const bron = keyInEnv ? 'LITELLM_API_KEY in de omgeving' : envPad && fs.existsSync(envPad) ? `GDE_ENV (${envPad})` : fs.existsSync(dotenv) ? '.env in de repo (gitignored)' : null;
if (!bron) {
  console.error('Geen sleutelbron gevonden. Zet LITELLM_API_KEY in je eigen .env (gitignored; GDE_ENV wijst naar een andere plek) of in de omgeving.');
  console.error('De sleutel hoort nooit in de repo en wordt door dit script niet gelezen of geprint.');
  process.exit(1);
}
console.log(`TTS-opnameronde #735 — ${DRY ? 'droogloop' : 'echte ronde'}`);
console.log(`  sleutelbron: ${bron} (niet gelezen)`);
console.log(`  budget: $${BUDGET}${MAX ? ` · hooguit ${MAX} clips` : ''}`);
console.log('  stappen: wachtrij → opnemen → verhaaldata → dekking → opnamelijst');

if (!run('wachtrij verversen', node, ['scripts/tts_lines_list.mjs'])) process.exit(1);
const opneem = DRY ? ['scripts/tts_lines.py', '--dry-run'] : ['scripts/tts_lines.py', ...(MAX ? [String(MAX)] : []), '--budget', String(BUDGET)];
if (DRY) {
  if (!run('droogloop opnemen (geen sleutel, geen netwerk)', py, ['scripts/tts_lines.py', '--dry-run'])) process.exit(1);
  console.log('\nDroogloop klaar: hierna zouden de clips opgenomen worden, de verhaaldata bijgewerkt en de dekking gecontroleerd.');
  console.log('Draai zonder --dry om de echte ronde te starten.');
  process.exit(0);
}
if (!run('clips opnemen via de LiteLLM-gateway', py, opneem)) process.exit(1);
if (!run('verhaaldata bijwerken', node, ['scripts/build_story_data.mjs'])) process.exit(1);
if (!run('dekking controleren', node, ['scripts/voice_coverage.mjs', '--quiet'])) process.exit(1);
if (!run('opnamelijst verversen', node, ['scripts/tts_opnamelijst.mjs'])) process.exit(1);
console.log('\nKlaar. Werk issue #735 bij met de nieuwe stand en draai daarna node scripts/tts_opnamelijst.mjs --check.');

