// Spelbot fase 4 (#186): verwerkt een runmap van scripts/bot/run.mjs tot analysis.json, summary.md,
// shots.json en review/checklist.md (voor een beoordelaar), en vergelijkt met de vorige run.
//   node scripts/bot/analyse.mjs <runmap> [--prev=<runmap>] [--base=<map>]
// --base=<map>: houdt <map>/latest.json bij als verwijzing naar de laatste geanalyseerde run, zodat de
// volgende run daar automatisch mee vergeleken wordt. Geen netwerk.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const A = await import(pathToFileURL(path.join(HERE, 'analysis.mjs')).href);
const L = await import(pathToFileURL(path.join(HERE, '..', '..', 'game', 'js', 'botlogic.js')).href);
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };

export function analyseRun(dir, { prev = null, base = null } = {}) {
  const result = fs.existsSync(path.join(dir, 'result.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'result.json'), 'utf8')) : {};
  const log = L.RunLog.parse(fs.readFileSync(path.join(dir, 'events.jsonl'), 'utf8'));
  let t = 0;
  for (const e of log.events) { if (Number.isFinite(e.t) && e.type !== 'console') t = e.t; else e.t = t; }
  const shots = [];
  for (const f of fs.readdirSync(dir).filter((x) => /^shots-.+\.png$/.test(x)).sort()) {
    try { shots.push({ file: f, flags: A.imageFlags(A.imageStats(A.decodePng(fs.readFileSync(path.join(dir, f))))) }); }
    catch (e) { shots.push({ file: f, flags: [], error: e.message }); }
  }
  const fs1 = [...A.findings(log.events), ...A.imageFindings(shots)];
  const metrics = A.metrics(log.events, result);
  const audio = A.audioSummary(log.events);
  const { acts, extra } = A.perAct(log.events);
  const cur = { run: path.basename(dir), dir, date: (log.meta.started || '').slice(0, 10), metrics, acts, extra, findings: fs1, audio, shots };
  let before = prev;
  if (!before && base && fs.existsSync(path.join(base, 'latest.json'))) {
    const ptr = JSON.parse(fs.readFileSync(path.join(base, 'latest.json'), 'utf8'));
    if (ptr.dir && path.resolve(ptr.dir) !== path.resolve(dir) && fs.existsSync(path.join(ptr.dir, 'analysis.json'))) before = ptr.dir;
  }
  const prevData = before && fs.existsSync(path.join(before, 'analysis.json')) ? JSON.parse(fs.readFileSync(path.join(before, 'analysis.json'), 'utf8')) : null;
  cur.cmp = A.compareRuns(prevData, cur);
  cur.prev = prevData ? prevData.run : null;
  fs.writeFileSync(path.join(dir, 'analysis.json'), JSON.stringify(cur, null, 1));
  fs.writeFileSync(path.join(dir, 'shots.json'), JSON.stringify(shots, null, 1));
  fs.mkdirSync(path.join(dir, 'review'), { recursive: true });
  const moments = Object.fromEntries(log.events.filter((e) => e.type === 'shot').map((e) => [`shots-${e.name}.png`, `${e.name} op ${Math.round(e.t)} s`]));
  fs.writeFileSync(path.join(dir, 'review', 'checklist.md'), A.checklistMarkdown(shots.map((s) => ({ ...s, moment: moments[s.file] || '' }))));
  const summary = A.nlSummary({ title: `${log.meta.part || 'run'}${log.meta.mode === 'minigames' ? ' (minigames)' : ''}, seed ${log.meta.seed ?? '?'}`, date: cur.date, metrics, cmp: cur.cmp, findings: fs1, audio, acts, extra });
  fs.writeFileSync(path.join(dir, 'summary.md'), summary);
  const comment = A.issueComment({ title: `${log.meta.part || 'run'}${log.meta.mode === 'minigames' ? ' (minigames)' : ''}`, date: cur.date, run: path.basename(dir), metrics, acts, extra, findings: fs1 });
  fs.writeFileSync(path.join(dir, 'issue-comment.md'), comment);
  if (base) { fs.mkdirSync(base, { recursive: true }); fs.writeFileSync(path.join(base, 'latest.json'), JSON.stringify({ dir: path.resolve(dir), at: new Date().toISOString() })); }
  return cur;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const dir = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!dir) { console.error('gebruik: node scripts/bot/analyse.mjs <runmap> [--prev=<map>] [--base=<map>]'); process.exit(2); }
  const cur = analyseRun(path.resolve(dir), { prev: arg('prev') && path.resolve(arg('prev')), base: arg('base') && path.resolve(arg('base')) });
  console.log(`${cur.findings.length} bevindingen, ${cur.shots.filter((s) => s.flags.length).length} screenshots met een vlag; samenvatting: ${path.join(dir, 'summary.md')}`);
}
