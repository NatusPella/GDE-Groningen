// #735: de definitieve opnamelijst voor de TTS-ronde. Leest de bronnen die het spel zelf gebruikt
// (script.json, tts_lines.json, gronings_spoken.json, tts_cast.mjs) en schrijft twee bestanden:
//   docs/verhaal/TTS-OPNAMELIJST-735.md    het overzicht per stap en per klaargezette clip
//   docs/verhaal/TTS-OPNAMELIJST-735.jsonl één regel per clip met bron, stem, bestandsnaam en het
//                                          exacte LiteLLM-commando (curl) of de reden dat hij wacht
// Geen TTS-aanroepen, geen netwerk, geen sleutel: dit is alleen de lijst.
//   node scripts/tts_opnamelijst.mjs            schrijft beide bestanden
//   node scripts/tts_opnamelijst.mjs --check    faalt als ze achterlopen op de bronnen
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DUO } from './tts_cast.mjs';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_MD = path.join(REPO, 'docs', 'verhaal', 'TTS-OPNAMELIJST-735.md');
const OUT_JSONL = path.join(REPO, 'docs', 'verhaal', 'TTS-OPNAMELIJST-735.jsonl');
const read = (p) => fs.readFileSync(path.join(REPO, p), 'utf8');
const json = (p) => JSON.parse(read(p));

// The gateway route and model alias come from the TTS module itself, not from a copy in this script.
const gemini = read('scripts/gemini_tts.py');
const MODEL = (gemini.match(/^MODEL = '([^']+)'/m) || [])[1] || 'google/gemini-3.8-flash-lite-tts';
const GATEWAY = (gemini.match(/or '([^']+)'\)\.rstrip/) || [])[1] || 'https://litellm.natuspella.nl';
const ENDPOINT = GATEWAY + '/v1beta/interactions';

// The fixed cast: Tammo and Tessa from tts_cast.mjs, the rest from the CAST table in tts_lines_list.mjs.
const cast = {};
for (const [naam, c] of Object.entries(DUO)) cast[naam] = { voice: c.voice, accent: c.accent };
const listSrc = read('scripts/tts_lines_list.mjs');
for (const m of listSrc.matchAll(/^\s{2}(?:'([^']+)'|([A-Za-z][\w ]*)):\s*\{\s*voice:\s*'([^']+)'([^\n]*)$/gm)) {
  const naam = m[1] || m[2];
  if (!naam || cast[naam]) continue;
  cast[naam] = { voice: m[3], accent: (/accent:\s*(?:GRO_ACCENT|'([^']*Gronings[^']*)')/.exec(m[4] || '') || [])[1] || '' };
}

const hash = (s) => crypto.createHash('sha1').update(s).digest('hex');
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const label = (s) => String(s).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const GRO_WORDS = /\b(mien|nait|moar|mor|goud|kiek|joe|doar|noar|hoes|ain|hail|mout|stoet|wicht|oet|veur|zain|laven|dij|wies|lopst|rieden)\b/i;
const isGronings = (t) => GRO_WORDS.test(t || '');

const jobs = json('scripts/tts_lines.json');
const spoken = json('scripts/gronings_spoken.json');
const script = json('game/storydata/script.json');
const stepOf = (sc) => sc.step || (/^C00\./.test(sc.id) ? 'M00' : sc.id.split('.')[0]);

// The exact request the gateway gets, from gemini_tts.speak(); printed without a key.
const requestFor = (j) => ({
  model: MODEL,
  input: [{ type: 'user_input', content: [j.style ? { type: 'text', text: j.say || j.text, annotations: [{ type: 'speech_metadata', style: j.style }] } : { type: 'text', text: j.say || j.text }] }],
  response_format: { type: 'audio', mime_type: 'audio/l16', sample_rate: 24000 },
  generation_config: { speech_config: [{ voice: j.voice }] },
});
const curlFor = (j) => `curl -sS "${ENDPOINT}" -H "Authorization: Bearer $LITELLM_API_KEY" -H 'Content-Type: application/json' -d '${JSON.stringify(requestFor(j)).replace(/'/g, `'\\''`)}'`;

const ready = jobs.map((j, i) => ({
  n: i + 1, status: 'klaar', source: j.area || '', scene: j.area || '', speaker: j.speaker, voice: j.voice,
  file: `${j.out}/${j.file}`, manifest: j.out, lang: j.lang, text: j.text, say: j.say || j.text, style: j.style || '', curl: curlFor(j),
}));

// The lines still without a voice: tts_lines_list.mjs writes the same waiting list it counts
// (scene, speaker, reason), so the list and the queue can never disagree on the reason.
const waitingFile = path.join(REPO, 'scripts', 'tts_waiting.json');
const wacht = fs.existsSync(waitingFile) ? JSON.parse(fs.readFileSync(waitingFile, 'utf8')) : [];
const waiting = wacht.map((w, i) => {
  const c = cast[w.speaker] || cast[String(w.speaker).replace(/ \(.*\)$/, '')];
  const sc = script.scenes.find((x) => x.id === w.scene);
  return {
    n: 0, status: w.reason, source: w.scene, scene: w.scene, step: sc ? stepOf(sc) : w.scene.split('.')[0],
    speaker: w.speaker, voice: c ? c.voice : '', text: w.text, reden: w.reason,
    file: `lines/${slug(w.speaker)}/${slug(w.text).slice(0, 32)}_${hash(`${w.speaker}|${w.text}`).slice(0, 8)}.mp3`, curl: '',
  };
});
waiting.sort((a, b) => a.step.localeCompare(b.step) || a.scene.localeCompare(b.scene) || a.speaker.localeCompare(b.speaker));
waiting.forEach((w, i) => { w.n = ready.length + i + 1; });
const all = [...ready, ...waiting];

// The new technical loading hint is deliberately unvoiced in voicelines_collect.js (TECH_HINTS);
// note it so the owner can decide, without counting it as a queued clip.
const hintText = 'De weg hier wordt nog geladen. Even wachten…';
const hintNote = /TECH_HINTS[\s\S]{0,200}De weg hier wordt nog geladen/.test(read('scripts/voicelines_collect.mjs'));

// --- markdown ---------------------------------------------------------------------------------
const perStep = new Map();
for (const j of ready) {
  const k = j.scene.split('.')[0] || j.scene;
  if (!perStep.has(k)) perStep.set(k, []);
  perStep.get(k).push(j);
}
const md = [];
md.push('# TTS-opnamelijst #735: definitieve lijst van deze ronde');
md.push('');
md.push('Gegenereerd door `node scripts/tts_opnamelijst.mjs` uit `game/storydata/script.json`, `scripts/tts_lines.json`, `scripts/gronings_spoken.json` en `scripts/tts_cast.mjs`. Niet met de hand aanpassen; draai `node scripts/tts_opnamelijst.mjs --check` om te zien of deze lijst achterloopt.');
md.push('');
md.push(`**Stand van deze bronnen:** ${ready.length} clips staan klaar in de wachtrij (\`scripts/tts_lines.json\`), ${waiting.length} verhaalregels wachten nog (${waiting.filter((w) => w.reden === 'stemkeuze').length} op een stemkeuze, ${waiting.filter((w) => w.reden === 'spreektekst').length} op een Groningse spreektekst). Samen **${all.length} regels/clips**. De 37 bewust stille appjes (\`channel: app-stil\`) staan er niet op.`);
md.push('');
md.push('> Het issue #735 noemt 670 regels/671 clips (stand 6-11-2026). De scripts zijn de bron: inmiddels zijn er regels bijgekomen of opgenomen, dus deze lijst telt wat de code nu zegt. Zie "Verschil met #735" onderaan.');
md.push('');
md.push('## Route (LiteLLM, #689)');
md.push('');
md.push(`- Endpoint: \`${ENDPOINT}\` (de gateway van de eigenaar; \`LITELLM_BASE_URL\` overschrijft het adres).`);
md.push(`- Modelalias: \`${MODEL}\`; stem en stijl komen per regel uit de wachtrij.`);
md.push('- De sleutel staat **niet** in de repo: de eigenaar zet `LITELLM_API_KEY` in zijn eigen `.env` (gitignored, `GDE_ENV` wijst naar een andere plek) of in de omgeving. Deze lijst leest `.env` niet en print geen sleutel.');
md.push('- Batchcommando (wat de runbook gebruikt): `python3 scripts/tts_lines.py --budget 2.5`; de exacte curl per regel staat in `TTS-OPNAMELIJST-735.jsonl` (kolom `curl`).');
md.push('');
md.push('## 1. Klaar om op te nemen (in de wachtrij)');
md.push('');
md.push('| # | Bron (scène) | Stem | Bestandsnaam | Commando |');
md.push('|---|---|---|---|---|');
for (const j of ready) {
  const kort = `python3 scripts/tts_lines.py`;
  md.push(`| ${j.n} | ${label(j.scene)} | ${label(j.speaker)} (${label(j.voice)}) | \`${label(j.file)}\` | \`${kort}\` · zie jsonl #${j.n} |`);
}
md.push('');
md.push(`De wachtrij heeft ${ready.length} clips (${new Set(ready.map((j) => j.manifest)).size} manifest(en): ${[...new Set(ready.map((j) => j.manifest))].join(', ')}).`);
md.push('');
md.push('## 2. Wacht op een Groningse spreektekst of stemkeuze');
md.push('');
const perReden = new Map();
for (const w of waiting) {
  const k = `${w.reden}|${w.step}`;
  perReden.set(k, (perReden.get(k) || 0) + 1);
}
md.push('| Stap | Reden | Regels |');
md.push('|---|---|---|');
for (const [k, n] of [...perReden.entries()].sort()) {
  const [reden, step] = k.split('|');
  md.push(`| ${step} | ${reden === 'stemkeuze' ? 'stemkeuze ontbreekt in CAST' : 'Groningse spreektekst ontbreekt'} | ${n} |`);
}
md.push('');
md.push(`Alle ${waiting.length} regels staan met bron, spreker, stem en beoogde bestandsnaam in \`TTS-OPNAMELIJST-735.jsonl\` (status \`stemkeuze\` of \`spreektekst\`); die kunnen pas in de wachtrij als de stem of de spreektekst er is.`);
md.push('');
md.push('## 3. Technische laadhint (aparte beslissing)');
md.push('');
md.push(`De nieuwe laadhint \`"${hintText}"\` staat bewust **niet** in de wachtrij: \`scripts/voicelines_collect.mjs\` zet hem in \`TECH_HINTS\` (een technische melding, geen stem). Het issue #735 noemt hier 2 clips (Tammo/Anita) voor. Wil de eigenaar die toch, dan is dat een aparte opname en een uitzondering in \`TECH_HINTS\`; deze lijst telt hem niet mee. (${hintNote ? 'TECH_HINTS bevestigd in de bron.' : 'Let op: TECH_HINTS niet gevonden in de bron.'})`);
md.push('');
md.push('## 4. Wat de eigenaar daarna doet');
md.push('');
md.push('1. `node scripts/tts_opnameronde.mjs --budget 2.5` (vraagt niets en leest geen sleutel; de TTS-module leest de eigenaar-sleutel zelf).');
md.push('2. `node scripts/build_story_data.mjs` zet de opgenomen regels op voiced (de wrapper doet dit al).');
md.push('3. `node scripts/voice_coverage.mjs --quiet` moet daarna zonder ontbrekende regels blijven.');
md.push('4. Deze lijst verversen met `node scripts/tts_opnamelijst.mjs` en het issue #735 bijwerken met de nieuwe stand.');
md.push('');
md.push('## 5. Verschil met #735');
md.push('');
md.push(`Het issue telt 670 regels/671 clips (67 klaar + 604 wachtend, plus de laadhint van 2 clips). De huidige bronnen geven ${all.length} regels/clips: ${ready.length} klaar + ${waiting.length} wachtend. Dat verschil komt doordat \`script.json\`, \`gronings_spoken.json\` en de opnames sinds 6-11 zijn bijgewerkt; deze lijst volgt de code, niet het issue.`);
md.push('');
fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
fs.writeFileSync(OUT_MD, md.join('\n'));

// --- jsonl: one line per clip, the exact command included for the ready ones --------------------
const lines = all.map((r) => JSON.stringify({
  n: r.n, status: r.status, source: r.source, scene: r.scene, step: r.status === 'klaar' ? undefined : r.step,
  speaker: r.speaker, voice: r.voice, manifest: r.manifest, file: r.file, text: r.text, say: r.say, style: r.style,
  reason: r.reden, endpoint: ENDPOINT, model: MODEL, curl: r.curl || undefined,
}));
fs.writeFileSync(OUT_JSONL, lines.join('\n') + '\n');

const samenvatting = `${all.length} regels/clips in de lijst: ${ready.length} klaar om op te nemen, ${waiting.length} wachtend (${waiting.filter((w) => w.reden === 'stemkeuze').length} stemkeuze, ${waiting.filter((w) => w.reden === 'spreektekst').length} spreektekst).`;
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT_MD) ? fs.readFileSync(OUT_MD, 'utf8') : '';
  const curJsonl = fs.existsSync(OUT_JSONL) ? fs.readFileSync(OUT_JSONL, 'utf8') : '';
  if (cur !== md.join('\n') || curJsonl !== lines.join('\n') + '\n') {
    console.log('TTS-OPNAMELIJST-735 loopt achter: draai node scripts/tts_opnamelijst.mjs');
    process.exitCode = 1;
  } else console.log('TTS-OPNAMELIJST-735 is actueel. ' + samenvatting);
} else {
  console.log('TTS-OPNAMELIJST-735 geschreven. ' + samenvatting);
  console.log(`  ${path.relative(REPO, OUT_MD)}`);
  console.log(`  ${path.relative(REPO, OUT_JSONL)}`);
}
