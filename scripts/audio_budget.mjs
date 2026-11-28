// Audio-opslag en laadbudget (#1390): meet game/audio, rekent door naar 40 en 80 uur spel en controleert de budgetten
// uit scripts/audio_budget.json. Raakt niets aan en gebruikt geen netwerk.
//   node scripts/audio_budget.mjs               meting, doorrekening en controle (exit 1 als de huidige stand over budget is)
//   node scripts/audio_budget.mjs --streng      ook exit 1 als de doorrekening naar 80 uur (hoog) over budget gaat
//   node scripts/audio_budget.mjs --dir=<map>   een andere audiomap (standaard game/audio)
// Uitleg en besluiten: docs/AUDIO-BUDGET-28-11.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MB, meetAudio, sceneLast, projecteer, maxUren, controleer, projectieProblemen, leesBudget } from './lib/audiobudget.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const dir = path.resolve(arg('dir', path.join(ROOT, 'game', 'audio')));
const streng = process.argv.includes('--streng');
const { budget, aannames } = leesBudget(path.join(ROOT, 'scripts', 'audio_budget.json'));

const meting = meetAudio(dir);
const scriptFile = path.join(ROOT, 'game', 'storydata', 'script.json');
const scene = fs.existsSync(scriptFile) ? sceneLast(JSON.parse(fs.readFileSync(scriptFile, 'utf8')), meting.voice.gemiddeld) : null;
const mb = (b) => (b / MB).toFixed(1);

console.log(`Stand van ${path.relative(ROOT, dir) || dir}: ${mb(meting.totaal)} MB`);
for (const [k, v] of Object.entries(meting.per).sort((a, b) => b[1].bytes - a[1].bytes)) console.log(`  ${k.padEnd(12)} ${String(v.bestanden).padStart(5)} bestanden ${mb(v.bytes).padStart(7)} MB`);
const v = meting.voice;
console.log(`Stemclips: ${v.clips}, ${mb(v.bytes)} MB, gemiddeld ${(v.gemiddeld / 1024).toFixed(1)} kB, grootste ${(v.max.bytes / 1024).toFixed(0)} kB (${v.max.file}), dubbel ${v.dubbel.bestanden}`);
if (scene) console.log(`Scènes: ${scene.scenes}, ${scene.gesproken} gesproken regels, zwaarste scène ${scene.max.id} met ${scene.max.regels} regels (ca. ${(scene.max.bytes / MB).toFixed(2)} MB)`);

console.log('\nDoorrekening (aannames: docs/AUDIO-BUDGET-28-11.md)');
console.log('doel   scenario  nieuwe clips  extra mp3  web (beide)  web (Opus)  installatie  stem/uur');
let probleemProjectie = false;
for (const uren of [40, 80]) {
  for (const scenario of ['laag', 'hoog']) {
    const p = projecteer(meting, aannames, uren, scenario);
    const pr = projectieProblemen(p, budget);
    if (pr.length && uren === 80 && scenario === 'hoog') probleemProjectie = pr;
    console.log(`${String(uren).padStart(3)} u  ${scenario.padEnd(7)} ${String(p.extraClips).padStart(12)} ${(p.extraMp3 / MB).toFixed(0).padStart(7)} MB ${p.webBeideMB.toFixed(0).padStart(9)} MB ${p.webOpusMB.toFixed(0).padStart(8)} MB ${p.installatieMB.toFixed(0).padStart(9)} MB ${p.perUurMB.toFixed(2).padStart(7)} MB${pr.length ? `   OVER: ${pr.join('; ')}` : ''}`);
  }
}
const grens = (sleutel, b) => { const u = maxUren(meting, aannames, b, sleutel, 'hoog'); return Number.isFinite(u) ? `${u.toFixed(0)} uur` : 'altijd';
};
console.log(`\nBij het hoge scenario past: web met mp3-terugval tot ${grens('webBeideMB', budget.webPagesMB)}, web alleen Opus tot ${grens('webOpusMB', budget.webPagesMB)}, installatie tot ${grens('installatieMB', budget.installatiePortableMB)}, voicelines tot ${grens('voicelinesMB', budget.voicelinesMB)}.`);

const problemen = controleer(meting, budget, scene);
if (problemen.length) { console.log('\nOVER BUDGET'); for (const p of problemen) console.log(`  ${p}`); }
else console.log('\nHuidige stand: binnen alle budgetten.');
if (streng && probleemProjectie) { console.log('\nDoorrekening 80 uur (hoog) over budget; zie hierboven.'); process.exit(1); }
process.exit(problemen.length ? 1 : 0);
