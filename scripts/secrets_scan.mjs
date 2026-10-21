// Geheimenscan over de werkboom én de hele git-geschiedenis (#62, #83). Alleen lezen: niets wordt gepubliceerd
// of gewijzigd. Elk uniek tekstbestand (blob) uit `git rev-list --all --objects` wordt één keer gescand met de
// sleutelpatronen van publish_check.mjs. Bestanden die .env heten (en andere private-only namen) worden nooit
// geopend, alleen op naam gemeld. Gevonden geheimen worden als bestand + patroonnaam + korte commit-hash
// gemeld, nooit als waarde.
//   node scripts/secrets_scan.mjs            werkboom + alle commits/branches/tags
//   node scripts/secrets_scan.mjs --tree     alleen de getrackte werkboom
//   node scripts/secrets_scan.mjs --json     machine-leesbaar
// Dit vervangt gitleaks niet: draai `gitleaks detect` vlak voor Public (docs/PUBLICEREN.md).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { REPO, SECRET_PATTERNS, PRIVATE_FILE_RES } from './publish_check.mjs';

const TEXT_EXT = /\.(md|txt|js|mjs|cjs|json|yml|yaml|html|css|sh|bat|py|toml|cfg|csv|overpass|gdt|svg|plist|properties|gradle|xml|ini|env)$/i;
const ENV_EXAMPLE = /(^|\/)\.env\.(example|sample|template)$/;
const MAX_BLOB = 8 * 1048576;
const SELF = /^scripts\/(publish_check|secrets_scan)(_test)?\.mjs$/;

/** Is dit pad een bestand dat we nooit openen? (.env en andere private-only namen) */
export const neverOpen = (p) => !ENV_EXAMPLE.test(p) && (/(^|\/)\.env(\..*)?$/.test(p) || PRIVATE_FILE_RES.slice(1, 3).some((re) => re.test(p)));

/** Scant één tekst; geeft { rule, line } per treffer (nooit de waarde). */
export function scanSecrets(text) {
  const out = [];
  text.split(/\r?\n/).forEach((l, i) => {
    if (l.length > 4000) l = l.slice(0, 4000);
    for (const p of SECRET_PATTERNS) if (p.re.test(l)) out.push({ rule: p.name, line: i + 1 });
  });
  return out;
}

const git = (...a) => spawnSync('git', a, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 29 });

/** Parseert de uitvoer van `git cat-file --batch`: [{ sha, type, size, body }]. */
export function parseBatch(buf) {
  const out = [];
  let pos = 0;
  while (pos < buf.length) {
    const nl = buf.indexOf(10, pos);
    if (nl < 0) break;
    const head = buf.toString('utf8', pos, nl).split(' ');
    if (head[1] === 'missing') { pos = nl + 1; continue; }
    const size = Number(head[2]);
    out.push({ sha: head[0], type: head[1], size, body: buf.subarray(nl + 1, nl + 1 + size) });
    pos = nl + 1 + size + 1;
  }
  return out;
}

function catBatch(shas) {
  return new Promise((resolve, reject) => {
    const p = spawn('git', ['cat-file', '--batch'], { cwd: REPO });
    const chunks = [];
    p.stdout.on('data', (c) => chunks.push(c));
    p.on('error', reject);
    p.on('close', () => resolve(parseBatch(Buffer.concat(chunks))));
    p.stdin.end(shas.join('\n') + '\n');
  });
}

export async function scanHistory() {
  const findings = [];
  const objs = git('rev-list', '--all', '--objects').stdout.split(/\r?\n/).filter(Boolean);
  const blobs = new Map(); // sha -> eerste pad
  const names = new Set();
  for (const l of objs) {
    const i = l.indexOf(' ');
    if (i < 0) continue;
    const sha = l.slice(0, i), p = l.slice(i + 1);
    if (!blobs.has(sha)) blobs.set(sha, p);
  }
  // alle ooit gebruikte bestandsnamen, voor private-only bestanden die ooit getrackt waren
  for (const p of git('log', '--all', '--pretty=format:', '--name-only').stdout.split(/\r?\n/)) if (p) names.add(p);
  let scanned = 0, skippedNames = 0, skippedBig = 0;
  const todo = [];
  for (const [sha, p] of blobs) {
    if (neverOpen(p)) { skippedNames++; continue; }
    if (SELF.test(p) || !TEXT_EXT.test(p)) continue;
    todo.push([sha, p]);
  }
  for (let i = 0; i < todo.length; i += 2000) {
    const part = todo.slice(i, i + 2000);
    const got = await catBatch(part.map(([s]) => s));
    for (const b of got) {
      if (b.type !== 'blob') continue;
      if (b.size > MAX_BLOB) { skippedBig++; continue; }
      scanned++;
      const p = blobs.get(b.sha);
      for (const f of scanSecrets(b.body.toString('utf8'))) findings.push({ level: 'FAIL', rule: f.rule, file: p, line: f.line, blob: b.sha.slice(0, 10) });
    }
  }
  for (const p of names) if (neverOpen(p)) findings.push({ level: 'FAIL', rule: 'private-only bestand ooit gecommit', file: p, line: 0 });
  return { findings, stats: { commits: Number(git('rev-list', '--all', '--count').stdout.trim()), blobs: blobs.size, scanned, skippedNames, skippedBig, namesSeen: names.size } };
}

export function scanTree() {
  const findings = [];
  const files = git('ls-files', '-z').stdout.split('\0').filter(Boolean);
  let scanned = 0;
  for (const f of files) {
    if (neverOpen(f) || SELF.test(f) || !TEXT_EXT.test(f)) continue;
    let text; try { text = fs.readFileSync(path.join(REPO, f), 'utf8'); } catch { continue; }
    scanned++;
    for (const x of scanSecrets(text)) findings.push({ level: 'FAIL', rule: x.rule, file: f, line: x.line });
  }
  return { findings, stats: { files: files.length, scanned } };
}

async function main() {
  const args = process.argv.slice(2);
  const tree = scanTree();
  const hist = args.includes('--tree') ? { findings: [], stats: null } : await scanHistory();
  const findings = [...tree.findings, ...hist.findings];
  if (args.includes('--json')) console.log(JSON.stringify({ tree: tree.stats, history: hist.stats, findings }, null, 2));
  else {
    for (const f of findings) console.log(`${f.level} ${f.rule} ${f.file}${f.line ? ':' + f.line : ''}${f.blob ? ' (blob ' + f.blob + ')' : ''}`);
    console.log(`\nWerkboom: ${tree.stats.scanned} van ${tree.stats.files} getrackte bestanden gescand.`);
    if (hist.stats) console.log(`Geschiedenis: ${hist.stats.commits} commits, ${hist.stats.blobs} unieke bestanden, ${hist.stats.scanned} tekstbestanden gescand, ${hist.stats.skippedNames} private-only namen niet geopend, ${hist.stats.skippedBig} te groot overgeslagen.`);
    console.log(`${findings.length} treffers. Dit vervangt gitleaks niet: draai \`gitleaks detect\` vlak voor Public.`);
  }
  process.exit(findings.length ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
