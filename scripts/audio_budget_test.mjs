// Audio-opslag en laadbudget (#1390): meting, doorrekening naar 40 en 80 uur en de controle tegen de budgetten.
// Werkt op wegwerpmappen; de echte game/audio wordt alleen gelezen. node scripts/audio_budget_test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MB, meetAudio, sceneLast, projecteer, maxUren, controleer, projectieProblemen, leesBudget } from './lib/audiobudget.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { budget, aannames } = leesBudget(path.join(ROOT, 'scripts', 'audio_budget.json'));
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-audiobudget-'));
const schrijf = (rel, bytes, vul = 1) => { const f = path.join(tmp, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, Buffer.alloc(bytes, vul)); };
try {
  // 1. meting
  schrijf('voicelines/lines/a/een.mp3', 10 * 1024, 1);
  schrijf('voicelines/lines/a/twee.mp3', 30 * 1024, 2);
  schrijf('voicelines/lines/b/drie.ogg', 20 * 1024, 3);
  schrijf('voicelines/lines/tts.json', 100, 0x20);
  schrijf('gmusic/lied.mp3', 2 * MB, 4);
  schrijf('sfx/klik.ogg', 1024, 5);
  const m = meetAudio(tmp);
  ok(m.voice.clips === 3, 'stemclips tellen mp3 en ogg, geen json', m.voice.clips);
  ok(m.voice.bytes === 60 * 1024 && Math.round(m.voice.gemiddeld) === 20 * 1024, 'bytes en gemiddelde van de stemclips');
  ok(m.voice.max.bytes === 30 * 1024 && /twee\.mp3$/.test(m.voice.max.file), 'de grootste clip wordt genoemd', m.voice.max.file);
  ok(m.per.gmusic.bytes === 2 * MB && m.per.sfx.bestanden === 1 && m.per.voicelines.bestanden === 4, 'bytes en bestanden per hoofdmap');
  ok(m.totaal === 2 * MB + 1024 + 60 * 1024 + 100, 'totaal is de som van alle bestanden', m.totaal);
  ok(m.voice.dubbel.bestanden === 0, 'verschillende inhoud is geen dubbele clip');

  // 2. dubbele clips (zelfde inhoud onder een andere naam)
  schrijf('voicelines/lines/b/kopie.mp3', 10 * 1024, 1);
  schrijf('voicelines/lines/c/kopie2.mp3', 10 * 1024, 1);
  const d = meetAudio(tmp);
  ok(d.voice.dubbel.groepen === 1 && d.voice.dubbel.bestanden === 2 && d.voice.dubbel.bytes === 20 * 1024, 'dubbele clips worden geteld met hun verspilde bytes', JSON.stringify(d.voice.dubbel));
  ok(meetAudio(tmp, { hash: false }).voice.dubbel.bestanden === 0, 'zonder hash geen dubbelencontrole');
  fs.rmSync(path.join(tmp, 'voicelines/lines/b/kopie.mp3')); fs.rmSync(path.join(tmp, 'voicelines/lines/c/kopie2.mp3'));

  // 3. controle tegen de budgetten
  const ruim = { clipGemiddeldKB: 25, clipMaxKB: 150, voicelinesMB: 320, audioTotaalMB: 550, dubbeleClipsMax: 0, sceneLadingMB: 1.5 };
  ok(controleer(m, ruim, null).length === 0, 'een kleine map is binnen alle budgetten');
  ok(controleer(m, { ...ruim, clipMaxKB: 25 }, null).some((x) => /grootste clip/.test(x) && /twee\.mp3/.test(x)), 'een te grote clip wordt gemeld met zijn naam');
  ok(controleer(m, { ...ruim, clipGemiddeldKB: 15 }, null).some((x) => /gemiddelde clip/.test(x)), 'een te zwaar gemiddelde wordt gemeld');
  ok(controleer(m, { ...ruim, audioTotaalMB: 1 }, null).some((x) => /game\/audio/.test(x)), 'een te grote audiomap wordt gemeld');
  ok(controleer(d, ruim, null).some((x) => /dubbele clips/.test(x)), 'dubbele clips boven het budget worden gemeld');

  // 4. laadbudget per scene
  const script = { scenes: [{ id: 'S1', lines: [{ textOnly: false }, { textOnly: true }, { textOnly: false }] }, { id: 'S2', lines: Array.from({ length: 100 }, () => ({ textOnly: false })) }, { id: 'S3' }] };
  const sl = sceneLast(script, 20 * 1024);
  ok(sl.scenes === 3 && sl.gesproken === 102, 'scenes en gesproken regels (textOnly telt niet)', JSON.stringify(sl));
  ok(sl.max.id === 'S2' && sl.max.regels === 100 && sl.max.bytes === 100 * 20 * 1024, 'de zwaarste scene bepaalt de laadlast');
  ok(controleer(m, ruim, sl).some((x) => /scène S2/.test(x)), 'een scene boven het laadbudget wordt gemeld (2 MB > 1,5 MB)');
  ok(controleer(m, ruim, sceneLast({ scenes: [script.scenes[0]] }, 20 * 1024)).length === 0, 'een lichte scene is goed');

  // 5. doorrekening
  const echt = { totaal: 299 * MB, voice: { clips: 4896, bytes: 88 * MB, gemiddeld: 18.4 * 1024 } };
  const nul = projecteer(echt, aannames, 5, 'hoog');
  ok(nul.extraClips === 0 && nul.webBeideMB === aannames.web.nuBeideMB && nul.installatieMB === aannames.install.nuPortableMB, 'tot de bestaande verhaalregels is gedekt komt er niets bij');
  const p40 = projecteer(echt, aannames, 40, 'hoog'), p80 = projecteer(echt, aannames, 80, 'hoog'), l80 = projecteer(echt, aannames, 80, 'laag');
  ok(p40.extraClips === 5110 && p80.extraClips === 11610 && l80.extraClips === 8610, 'nieuwe clips volgen de bijbel (3.600 tot 5.100 op 40 uur, 8.600 tot 11.600 op 80 uur)', `${p40.extraClips}/${l80.extraClips}/${p80.extraClips}`);
  ok(p80.extraMp3 > p40.extraMp3 && p80.installatieMB > p40.installatieMB && p80.webBeideMB > p40.webBeideMB, 'meer uren is meer audio');
  ok(p80.extraMp3 / MB > 150 && p80.extraMp3 / MB < 260, 'extra mp3 op 80 uur ligt in de bandbreedte van de bijbel (160 tot 220 MB)', (p80.extraMp3 / MB).toFixed(0));
  ok(p80.extraOpus < p80.extraMp3 * 0.7, 'Opus is kleiner dan mp3');
  ok(p80.webOpusMB < p80.webBeideMB - 400, 'alleen Opus publiceren scheelt meer dan 400 MB op 80 uur');
  ok(Math.abs(p80.perUurMB - 162.5 * 18.4 / 1024) < 0.01, 'stem per speeluur is regels per uur maal het gemiddelde clipgewicht');

  // 6. de grens in uren
  for (const sleutel of ['webBeideMB', 'installatieMB', 'voicelinesMB']) {
    const b = { webBeideMB: budget.webPagesMB, installatieMB: budget.installatiePortableMB, voicelinesMB: budget.voicelinesMB }[sleutel];
    const u = maxUren(echt, aannames, b, sleutel, 'hoog');
    ok(Number.isFinite(u) && Math.abs(projecteer(echt, aannames, u, 'hoog')[sleutel] - b) < 1, `${sleutel}: op de grens in uren zit de maat op het budget`, u.toFixed(1));
  }
  ok(maxUren(echt, aannames, 1, 'webBeideMB', 'hoog') === 0, 'een budget onder de huidige stand geeft 0 uur');

  // 7. projectieproblemen
  ok(projectieProblemen(p40, budget).length === 0, '40 uur past binnen alle budgetten');
  ok(projectieProblemen(p80, budget).some((x) => /mp3-terugval/.test(x)) && !projectieProblemen(p80, budget).some((x) => /alleen Opus/.test(x)), '80 uur past alleen als het web alleen Opus publiceert (mp3-terugval gaat over 800 MB)');
  const grensBeide = maxUren(echt, aannames, budget.webPagesMB, 'webBeideMB', 'hoog');
  ok(grensBeide > 40 && grensBeide < 80, 'de mp3-terugval op het web past tot ergens tussen 40 en 80 uur', grensBeide.toFixed(1));

  // 8. de opdrachtregel: exit 1 boven het budget, 0 binnen het budget
  const run = (dir) => spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'audio_budget.mjs'), `--dir=${dir}`], { encoding: 'utf8' });
  ok(run(tmp).status === 0, 'de opdrachtregel is groen op een kleine map');
  schrijf('voicelines/lines/a/groot.mp3', 200 * 1024, 9);
  const r = run(tmp);
  ok(r.status === 1 && /OVER BUDGET/.test(r.stdout) && /groot\.mp3/.test(r.stdout), 'de opdrachtregel faalt en noemt de te grote clip', r.stdout.slice(-200));
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

// 9. de echte stand: de repo zit binnen zijn budgetten
const echteDir = path.join(ROOT, 'game', 'audio');
if (fs.existsSync(path.join(echteDir, 'voicelines'))) {
  const real = meetAudio(echteDir);
  const scriptFile = path.join(ROOT, 'game', 'storydata', 'script.json');
  const scene = fs.existsSync(scriptFile) ? sceneLast(JSON.parse(fs.readFileSync(scriptFile, 'utf8')), real.voice.gemiddeld) : null;
  const problemen = controleer(real, budget, scene);
  ok(problemen.length === 0, 'de huidige game/audio zit binnen de budgetten', problemen.join(' | '));
  ok(real.voice.clips > 4000, 'de meting ziet de bestaande stemclips', real.voice.clips);
} else console.log('SKIP echte stand: geen game/audio');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
