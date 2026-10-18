// Spelbot fase 4 (#186): maakt van de bevindingen van een geanalyseerde run issues, zonder dubbelen.
//   node scripts/bot/issues.mjs <runmap> [--create] [--repo=eigenaar/naam] [--project=5 --owner=NatusPella]
// Standaard een droge run: toont wat er zou gebeuren. Met --create: een nieuw issue per nieuwe
// vingerafdruk (<!-- spelbot:<afdruk> -->, labels bug + impact + kosten), een comment bij een bestaand
// issue (ook een gesloten), en het issue op het bord in de kolom Bugs. GitHub neemt via gh geen
// bestanden aan: de comment noemt het pad van het screenshot en bevat de replay (als die klein is)
// in een uitklapblok. gh staat op Windows in C:\Program Files\GitHub CLI (of zet GH=<pad>).
// Raakt alleen GitHub-issues aan, nooit de repo zelf; er gaat niets anders naar buiten.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const A = await import(pathToFileURL(path.join(HERE, 'analysis.mjs')).href);
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const GH = process.env.GH || (process.platform === 'win32' && fs.existsSync('C:\Program Files\GitHub CLI\gh.exe') ? 'C:\Program Files\GitHub CLI\gh.exe' : 'gh');
const gh = (args, input) => { const r = spawnSync(GH, args, { encoding: 'utf8', input, maxBuffer: 1 << 26 }); if (r.status !== 0) throw new Error(`gh ${args.slice(0, 3).join(' ')}: ${(r.stderr || r.error || '').toString().trim()}`); return r.stdout; };

export async function syncIssues(dir, { create = false, repo = null, project = '5', owner = 'NatusPella', log = console.log } = {}) {
  const analysis = JSON.parse(fs.readFileSync(path.join(dir, 'analysis.json'), 'utf8'));
  const repoArg = repo ? ['--repo', repo] : [];
  const existing = JSON.parse(gh(['issue', 'list', ...repoArg, '--state', 'all', '--limit', '500', '--json', 'number,title,body,state']));
  const plan = A.planIssues(analysis.findings, existing);
  const replayFile = path.join(dir, 'replay.jsonl');
  const replay = fs.existsSync(replayFile) && fs.statSync(replayFile).size < 20000 ? fs.readFileSync(replayFile, 'utf8') : null;
  const ctx = { run: analysis.run, replay: replayFile, shotPrefix: path.join(dir, 'shots-') };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spelbot-issue-'));
  const done = [];
  for (const p of plan) {
    const d = A.issueDraft(p.f, ctx);
    const note = `Nog eens gezien in run ${analysis.run}.${p.f.shot ? `\nScreenshot: ${path.join(dir, `shots-${p.f.shot}.png`)}` : ''}${replay ? `\n\n<details><summary>Replay (invoer)</summary>\n\n\`\`\`\n${replay}\`\`\`\n</details>` : `\nReplay: ${replayFile}`}`;
    if (p.action === 'nieuw') {
      log(`${create ? 'maak' : 'zou maken'}: ${d.title} [${d.labels.join(', ')}]`);
      if (create) {
        const bf = path.join(tmp, `${p.f.fp}.md`);
        fs.writeFileSync(bf, d.body);
        const url = gh(['issue', 'create', ...repoArg, '--title', d.title, '--body-file', bf, ...d.labels.flatMap((l) => ['--label', l])]).trim();
        const num = url.split('/').pop();
        gh(['issue', 'comment', num, ...repoArg, '--body', note]);
        try { gh(['project', 'item-add', project, '--owner', owner, '--url', url]); log(`  op het bord: ${url}`); } catch (e) { log(`  bord: ${e.message}`); }
        done.push({ f: p.f, action: 'nieuw', number: Number(num), created: `#${num}` });
      } else done.push({ f: p.f, action: 'nieuw' });
    } else {
      log(`${create ? 'comment' : 'zou comment geven'} bij #${p.number}: ${p.f.title}${p.action === 'heropen-comment' ? ' (issue is gesloten: terug gemeld)' : ''}`);
      if (create) gh(['issue', 'comment', String(p.number), ...repoArg, '--body', note]);
      done.push({ f: p.f, action: p.action, number: p.number });
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.writeFileSync(path.join(dir, 'issues.json'), JSON.stringify(done.map((x) => ({ fp: x.f.fp, title: x.f.title, action: x.action, number: x.number || null })), null, 1));
  return done;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const dir = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!dir) { console.error('gebruik: node scripts/bot/issues.mjs <runmap> [--create]'); process.exit(2); }
  const done = await syncIssues(path.resolve(dir), { create: process.argv.includes('--create'), repo: arg('repo'), project: arg('project', '5'), owner: arg('owner', 'NatusPella') });
  console.log(`${done.length} bevindingen verwerkt${process.argv.includes('--create') ? '' : ' (droog: gebruik --create om echt te maken)'}`);
}
