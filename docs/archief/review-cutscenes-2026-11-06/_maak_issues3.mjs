// Wegwerpscript 3: de verhaal/missiescènes-issues (na de eerste 31), zelfde bord/kolommen.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = '<repo>';
const REPO = 'NatusPella/GDE-Groningen';
const OWNER = 'NatusPella';
const PROJECT = '5';
const PROJECT_ID = 'PVT_kwHOAFYh_s4BnXMi';
const STATUS_FIELD = 'PVTSSF_lAHOAFYh_s4BnXMizhl8LLE';
const OPT = { Wensen: '088a5002', Bugs: '0dc06335' };
const dir = mkdtempSync(join(tmpdir(), 'gde-issues3-'));
const gh = (args) => {
  try { return execFileSync('gh', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim(); }
  catch (e) { return 'ERR: ' + String((e && (e.stderr || e.message)) || e).slice(0, 500); }
};
const { issues } = JSON.parse(readFileSync(join(ROOT, 'docs', 'archief', 'review-cutscenes-2026-11-06', '_issues3.json'), 'utf8'));
const gemaakt = [];
let i = 0;
for (const it of issues) {
  i++;
  const bodyFile = join(dir, `body-${i}.md`);
  writeFileSync(bodyFile, it.body, 'utf8');
  const url = gh(['issue', 'create', '--repo', REPO, '--title', it.title, '--body-file', bodyFile, ...it.labels.flatMap((l) => ['--label', l])]);
  const m = url.match(/\/issues\/(\d+)/);
  if (!m) { console.log('FAIL', it.title, '->', url); continue; }
  const num = Number(m[1]);
  let itemId = null;
  const add = gh(['project', 'item-add', PROJECT, '--owner', OWNER, '--url', url, '--format', 'json']);
  try { itemId = JSON.parse(add).id; } catch (e) { itemId = null; }
  let board = 'geen bord';
  if (itemId) {
    const r = gh(['project', 'item-edit', '--id', itemId, '--project-id', PROJECT_ID, '--field-id', STATUS_FIELD, '--single-select-option-id', OPT[it.status] || OPT.Wensen]);
    board = r.startsWith('ERR') ? r : it.status;
  }
  gemaakt.push({ num, title: it.title, board });
  console.log(`#${num} ${it.title} [${board}]`);
}
writeFileSync(join(ROOT, 'docs', 'archief', 'review-cutscenes-2026-11-06', '_issues_gemaakt3.json'), JSON.stringify(gemaakt, null, 2), 'utf8');
console.log('KLAAR', gemaakt.length, 'van', issues.length);
