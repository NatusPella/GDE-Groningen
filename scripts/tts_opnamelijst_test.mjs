// #735: de definitieve TTS-opnamelijst en de runbook-wrapper. Controleert dat de lijst uit de
// bronnen volgt (zelfde aantallen als de wachtrij-generator), dat elke klaargezette clip bron,
// stem, bestandsnaam en een LiteLLM-commando heeft, dat wachtende regels een reden hebben, en dat
// er nergens een sleutel of een .env-lezing in de nieuwe bestanden staat.
//   node scripts/tts_opnamelijst_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0, bad = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { bad++; console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 4).join('\n   ')); } };

const jobs = JSON.parse(lees('scripts/tts_lines.json'));
const wacht = JSON.parse(lees('scripts/tts_waiting.json'));
const rijen = lees('docs/verhaal/TTS-OPNAMELIJST-735.jsonl').trim().split('\n').map((l) => JSON.parse(l));
const md = lees('docs/verhaal/TTS-OPNAMELIJST-735.md');

t('de lijst dekt de wachtrij en de wachtende regels precies', () => {
  assert.equal(rijen.filter((r) => r.status === 'klaar').length, jobs.length, 'elke klaargezette clip staat erin');
  assert.equal(rijen.filter((r) => r.status !== 'klaar').length, wacht.length, 'elke wachtende regel staat erin');
  assert.equal(new Set(rijen.map((r) => r.n)).size, rijen.length, 'elke regel heeft een eigen nummer');
  assert.equal(wacht.length, wacht.filter((w) => ['stemkeuze', 'spreektekst'].includes(w.reason)).length, 'elke wachtende regel heeft een reden');
});

t('elke klaargezette clip heeft bron, stem, bestandsnaam en het LiteLLM-commando', () => {
  for (const r of rijen.filter((x) => x.status === 'klaar')) {
    assert.ok(r.source && r.speaker && r.voice && r.file, `#${r.n}: bron, stem en bestand`);
    assert.match(r.file, /^[a-z]+\/.*\.mp3$/, `#${r.n}: bestandsnaam in een manifestmap`);
    assert.match(r.endpoint, /^https:\/\/.+\/v1beta\/interactions$/, `#${r.n}: endpoint`);
    assert.equal(r.model, 'google/gemini-3.8-flash-lite-tts', `#${r.n}: modelalias`);
    assert.match(r.curl, /^curl -sS ".+" -H "Authorization: Bearer \$LITELLM_API_KEY"/, `#${r.n}: curl met sleutel uit de omgeving`);
    assert.match(r.curl, /"model":"google\/gemini-3\.8-flash-lite-tts"/, `#${r.n}: model in de body`);
    assert.ok(!/eyJ|sk-[A-Za-z0-9]/.test(r.curl), `#${r.n}: geen sleutel in de lijst`);
  }
});

t('wachtende regels hebben alleen een bron, stem en reden (nog geen commando)', () => {
  for (const r of rijen.filter((x) => x.status !== 'klaar')) {
    assert.ok(r.source && r.speaker && r.file, `#${r.n}: bron, spreker en beoogd bestand`);
    assert.ok(['stemkeuze', 'spreektekst'].includes(r.reason), `#${r.n}: reden`);
    assert.equal(r.curl, undefined, `#${r.n}: geen commando voordat de stem of spreektekst er is`);
  }
});

t('de markdown noemt de route, de aantallen en het batchcommando', () => {
  assert.match(md, /litellm\.natuspella\.nl\/v1beta\/interactions/);
  assert.match(md, /google\/gemini-3\.8-flash-lite-tts/);
  assert.match(md, /python3 scripts\/tts_lines\.py --budget/);
  assert.match(md, new RegExp(`${jobs.length} clips staan klaar`));
  assert.match(md, new RegExp(`${wacht.length} verhaalregels wachten`));
});

t('de runbook-wrapper leest geen sleutel of .env en heeft één commando', () => {
  const wrapper = lees('scripts/tts_opnameronde.mjs');
  assert.match(wrapper, /node scripts\/tts_opnameronde\.mjs --budget/);
  assert.match(wrapper, /scripts\/tts_lines\.py/);
  assert.match(wrapper, /scripts\/build_story_data\.mjs/);
  assert.match(wrapper, /scripts\/voice_coverage\.mjs/);
  assert.ok(!/readFileSync\([^)]*\.env/.test(wrapper), 'de wrapper leest .env niet');
  assert.ok(!/eyJ|sk-[A-Za-z0-9]/.test(wrapper), 'geen sleutel in de wrapper');
  const runbook = lees('docs/verhaal/OPNAMERONDE-735.md');
  assert.match(runbook, /node scripts\/tts_opnameronde\.mjs --budget 2\.5/, 'één commando in het runbook');
  assert.match(runbook, /TTS-OPNAMELIJST-735\.jsonl/, 'het runbook noemt de lijst per clip');
  assert.match(runbook, /LITELLM_API_KEY/);
  assert.match(runbook, /\.gitignore/);
});

t('de generator is actueel (--check)', () => {
  const r = spawnSync(process.execPath, ['scripts/tts_opnamelijst.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  assert.match(r.stdout, /actueel/);
});

t('de oude verhaallijst is bijgewerkt en de dekking blijft kloppen', () => {
  const r = spawnSync(process.execPath, ['scripts/opnamelijst.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
});

console.log(bad ? `tts_opnamelijst_test: ${n - bad}/${n} ok` : `tts_opnamelijst_test: ${n}/${n} ok`);
process.exitCode = bad ? 1 : 0;
