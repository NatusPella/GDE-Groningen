// Spelbot (#186): bouwt een rapport per akte uit geanalyseerde runmappen (analyse.mjs maakte analysis.json).
//   node scripts/bot/akte_rapport.mjs --out=docs/SPELBOT-RAPPORT.md akte1=<map> akte2=<map> ... [minigames=<map>] [--notes=<bestand>]
// Elke naam=map wordt een kopje met de tabel per stap (tijd, uitkomst, mislukt, vast, cheats) en de bevindingen
// van die run. --notes: een Markdown-bestand dat onderaan komt (duiding door een mens of agent).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// dezelfde pure regels als analyse.mjs: de tabel per akte en waar de bot hing (#186, #312)
const HERE = path.dirname(fileURLToPath(import.meta.url));
const A = await import(pathToFileURL(path.join(HERE, 'analysis.mjs')).href);

const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = arg('out');
const runs = process.argv.slice(2).filter((a) => !a.startsWith('--') && a.includes('=')).map((a) => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]);
const fmt = (s) => (s == null ? 'niet af' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);
const out = ['# Spelbot-rapport', '', `Gemaakt door \`scripts/bot/akte_rapport.mjs\` uit de runs van de Spelbot (epic #186). De bot beoordeelt niet of het leuk is of hoe de besturing voelt; een vastzit- of cheatmelding kan aan de bot liggen in plaats van aan het spel.`, ''];
for (const [name, dir] of runs) {
  const aFile = path.join(dir, 'analysis.json');
  if (!fs.existsSync(aFile)) { out.push(`## ${name}`, '', `Geen analysis.json in ${dir}.`, ''); continue; }
  const a = JSON.parse(fs.readFileSync(aFile, 'utf8'));
  const reportMd = fs.existsSync(path.join(dir, 'report.md')) ? fs.readFileSync(path.join(dir, 'report.md'), 'utf8') : '';
  out.push(`## ${name}`, '', `Run ${a.run} (${a.date || 'datum onbekend'}), uitkomst ${a.metrics.result || 'onbekend'}, speltijd ${fmt(a.metrics.gameSeconds)}${!/^(KLAAR|REPLAY)/.test(String(a.metrics.result || '')) && a.metrics.lastStep ? `, stopte in stap ${a.metrics.lastStep}` : ''}.`, '');
  if (a.acts && a.acts.length) {
    out.push('### Per akte', '', A.actTable(a.acts), '');
    const hung = A.whereHung(a.acts);
    out.push('### Waar hij hing', '');
    if (!hung.length) out.push('Nergens: geen vastzitmoment en geen time-out.');
    for (const h of hung) out.push(`- ${h.name}, ${h.step}: ${h.kind} na ${h.seconds} s${Number.isFinite(h.x) ? ` op (${Math.round(h.x)}, ${Math.round(h.y)})` : ''}${Number.isFinite(h.goalDist) ? `, ${Math.round(h.goalDist)} m van het doel` : ''}${h.kind === 'time-out' ? ` (${h.what})` : ''}`);
    out.push('');
  }
  const table = reportMd.split(/\r?\n/);
  const i = table.findIndex((l) => l.startsWith('| Stap |')), j = table.findIndex((l, k) => k > i && !l.startsWith('|'));
  // rijen van een sprong die niet doorging (geen titel, 0:00, tijd op) horen niet in het rapport
  if (i >= 0) out.push(...table.slice(i, j < 0 ? undefined : j).filter((l) => !/^\| \S+ \|\s*\| 0:00 \| tijd op \|/.test(l)), '');
  const m = table.findIndex((l) => l.startsWith('| Minigame |'));
  if (m >= 0) { const e = table.findIndex((l, k) => k > m && !l.startsWith('|')); out.push(...table.slice(m, e < 0 ? undefined : e), ''); }
  out.push(`Vastgezeten ${a.metrics.stuck}, time-outs ${a.metrics.timeouts || 0}, cheat nodig ${a.metrics.cheats}, mislukt ${a.metrics.fails}, consolefouten ${a.metrics.consoleErrors}, NaN-waarschuwingen ${a.metrics.nan}.`, '');
  if (a.findings.length) { out.push('Bevindingen:', ''); for (const f of a.findings) out.push(`- [${f.severity}] ${f.title}${f.detail ? ` (${String(f.detail).slice(0, 140)})` : ''}`); out.push(''); }
  const cFile = path.join(dir, 'issue-comment.md');
  if (fs.existsSync(cFile)) {
    out.push('### Klaar als issue-comment', '');
    for (const line of fs.readFileSync(cFile, 'utf8').trim().split(/\r?\n/)) out.push(`> ${line}`);
    out.push('');
  }
}
const notes = arg('notes');
if (notes && fs.existsSync(notes)) out.push(fs.readFileSync(notes, 'utf8'));
const text = out.join('\n');
if (OUT) { fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true }); fs.writeFileSync(OUT, text); console.log(`geschreven: ${OUT}`); } else console.log(text);
