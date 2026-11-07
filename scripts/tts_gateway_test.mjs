// TTS via de LiteLLM-gateway (#689): alle nieuwe opnames lopen via de gateway van de eigenaar.
// Deze test controleert de route zonder netwerk of sleutel: één transport, geen OpenRouter- of
// AI Studio-sleutel meer in de scripts, de droogloop noemt de gateway, en de documentatie zegt
// hetzelfde (historische clips blijven als OpenRouter-herkomst beschreven).
//   node scripts/tts_gateway_test.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0;
const ok = (c, m, extra = '') => { n++; if (!c) { console.log('FAIL ' + m + (extra ? ' (' + extra + ')' : '')); process.exitCode = 1; } };

const tts = lees('scripts/gemini_tts.py');
const lines = lees('scripts/tts_lines.py');
const banter = lees('scripts/tts_banter.py');

// 1. één transport: de gateway
ok(/LITELLM_API_KEY/.test(tts), 'de TTS-module leest LITELLM_API_KEY');
ok(/LITELLM_BASE_URL/.test(tts) && /litellm\.natuspella\.nl/.test(tts), 'de gateway is instelbaar met een standaardadres');
ok(/\/v1beta\/interactions/.test(tts), 'de route is de native Interactions-route');
ok(/'via': 'litellm'/.test(tts), 'nieuwe clips loggen via: litellm');
ok(/x-litellm-response-cost/.test(tts), 'de kosten komen uit de gateway als die ze terugmeldt');
ok(/ACCEPTED/.test(tts) && /FLASH/.test(tts), 'de modelkeuze en de Flash-weigering blijven (ADR 0019)');

// 2. geen oude transports meer
for (const [naam, src] of [['gemini_tts.py', tts], ['tts_lines.py', lines], ['tts_banter.py', banter]]) {
  ok(!/OPENROUTER_API_KEY/.test(src), `${naam} heeft geen OpenRouter-sleutel meer`);
  ok(!/openrouter\.ai\/api/.test(src), `${naam} heeft geen OpenRouter-endpoint meer`);
  ok(!/generativelanguage\.googleapis\.com/.test(src), `${naam} gaat niet meer rechtstreeks naar Google AI Studio`);
}
ok(!/PROVIDERS|PROVIDER\s*=/.test(tts), 'de providerkeuze is weg');
ok(!/--provider|configure\(provider/.test(lines), 'tts_lines.py kent geen --provider meer');

// 3. de documentatie zegt hetzelfde (en de historie blijft genoemd)
const agents = lees('AGENTS.md');
ok(/LiteLLM/.test(agents), 'AGENTS.md noemt de LiteLLM-sleutel');
const licentie = lees('docs/LICENTIES.md');
ok(/LiteLLM/.test(licentie) && /OpenRouter/.test(licentie), 'LICENTIES noemt de gateway én de historische OpenRouter-clips');
const arch = lees('ARCHITECTURE.md');
ok(/LiteLLM/.test(arch), 'ARCHITECTURE beschrijft de gateway-route');

// 4. de droogloop werkt zonder sleutel en noemt de gateway (als Python er is)
const kandidaten = process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python'];
const py = kandidaten.find((k) => {
  try { return spawnSync(k, ['--version'], { encoding: 'utf8' }).status === 0; } catch { return false; }
});
if (!py) {
  console.log('SKIP  python ontbreekt: de droogloop is niet gedraaid');
} else {
  const r = spawnSync(py, ['scripts/tts_lines.py', '--dry-run'], { cwd: ROOT, encoding: 'utf8', timeout: 120000, maxBuffer: 16 << 20 });
  ok(r.status === 0, 'tts_lines.py --dry-run slaagt zonder sleutel', ((r.stdout || '') + (r.stderr || '')).split('\n').slice(-3).join(' | '));
  ok(/via litellm/.test(r.stdout || ''), 'de droogloop noemt de gateway als transport');
  ok(/google\/gemini-3\.8-flash-lite-tts/.test(r.stdout || ''), 'de droogloop noemt de modelalias');
}

console.log(process.exitCode ? 'tts_gateway_test: FAIL' : `tts_gateway_test: ${n} controles ok`);
