// Zet het uploadpakket (buiten git) in elkaar: video's, miniaturen, teksten met hoofdstukken uit het gemonteerde plan, controleverslagen en
// LEES-MIJ-EERST.md. Uploadt niets; alles is bedoeld om als Privé te worden geüpload (constitution 8).
//   node scripts/trailer/package.mjs --out=<home>/GIT/GDE-uploadpakket2 --work=<home>/gde-trailer-work/pakket
// Verwacht in --work: per trailer <naam>.mp4, <naam>.plan.resolved.json, thumbs/*.jpg, controle/*; teksten komen uit plans/*.texts.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(opt('out', 'uploadpakket2'));
const WORK = path.resolve(opt('work', '.'));
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
for (const d of ['video', 'thumbnails', 'teksten', 'controle']) fs.mkdirSync(path.join(OUT, d), { recursive: true });

const AGE = '18+ · Bevat geweld (met bloed, in de instellingen uit te zetten), alcohol en gesimuleerd gokken met spelgeld. Niet voor kinderen.';
const CREDITS = 'Gemaakt door NatusPella. Alle beelden zijn opgenomen in de game zelf (preset Hoog, 1080p60). Muziek en gesproken regels zijn vooraf gemaakt met Google Gemini (geen AI tijdens het spelen); verhaal en dialogen zijn van de maker.\nBronnen: kaartdata © OpenStreetMap-bijdragers (ODbL); gebouwhoogtes uit 3D BAG (TU Delft/3DGI; BAG van het Kadaster en AHN, CC0); three.js (MIT).';
const DISCLAIMER = 'GDE staat voor Grootste Diefstal Ever. Een gratis, niet-commerciële parodie, niet gelieerd aan of goedgekeurd door een andere uitgever. Namen, personages, bedrijven en gebeurtenissen zijn verzonnen; echte straten en openbare gebouwen zijn alleen het decor.';

const report = [];
for (const spec of fs.readdirSync(path.join(HERE, 'plans')).filter((f) => f.endsWith('.texts.json'))) {
  const t = JSON.parse(fs.readFileSync(path.join(HERE, 'plans', spec), 'utf8'));
  const resolved = JSON.parse(fs.readFileSync(path.join(WORK, `${t.video}.plan.resolved.json`), 'utf8'));
  // hoofdstukken: het eerste shot met dat label geeft de tijd; elk hoofdstuk >= 10 s (YouTube), korte worden bij het vorige gevoegd
  const at = new Map();
  for (const c of resolved.cuts) if (!at.has(c.label)) at.set(c.label, c.at);
  let chapters = t.chapters.map(([label, title]) => ({ at: at.get(label), title })).filter((c) => c.at !== undefined);
  chapters[0].at = 0;
  chapters = chapters.filter((c, i) => i === 0 || c.at - chapters[i - 1].at >= 10 || (i === chapters.length - 1 && false));
  const lines = [];
  lines.push(t.opening ? `${AGE}\n\n${t.opening}` : AGE, '', t.body, '', '▶ Downloaden: (link volgt)', '', chapters.map((c) => `${mmss(c.at)} ${c.title}`).join('\n'), '', t.facts, '', CREDITS, '', DISCLAIMER, '', t.hashtags);
  fs.writeFileSync(path.join(OUT, 'teksten', `${t.file}.txt`), [`TITEL\n${t.title}`, '', 'BESCHRIJVING', lines.join('\n'), '', 'TAGS', t.tags.join(', '), '', 'INSTELLINGEN', t.settings.join('\n')].join('\n') + '\n');
  report.push(`${t.file}: ${chapters.length} hoofdstukken (${chapters.map((c) => mmss(c.at)).join(', ')})`);
  for (const f of [`${t.video}.mp4`]) fs.copyFileSync(path.join(WORK, f), path.join(OUT, 'video', f));
}
for (const f of fs.readdirSync(path.join(WORK, 'thumbs'))) fs.copyFileSync(path.join(WORK, 'thumbs', f), path.join(OUT, 'thumbnails', f));
for (const f of fs.existsSync(path.join(WORK, 'controle')) ? fs.readdirSync(path.join(WORK, 'controle')) : []) {
  const src = path.join(WORK, 'controle', f);
  if (fs.statSync(src).isFile()) fs.copyFileSync(src, path.join(OUT, 'controle', f));
}
console.log(report.join('\n'));
fs.copyFileSync(path.join(HERE, 'plans', 'lees-mij-eerst.md'), path.join(OUT, 'LEES-MIJ-EERST.md'));
console.log(`pakket: ${OUT}`);
