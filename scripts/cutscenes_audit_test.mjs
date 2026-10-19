// De cutscene-audit (scripts/cutscenes_audit.mjs) moet op alle scènes schoon zijn (#136, #209):
//   node scripts/cutscenes_audit_test.mjs
import { spawnSync } from 'node:child_process';
const r = spawnSync(process.execPath, [new URL('./cutscenes_audit.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), '--strict'], { encoding: 'utf8' });
const last = (r.stdout || '').trim().split('\n').pop();
if (r.status !== 0) { console.log(r.stdout); console.log('FAIL cutscenes_audit has findings'); process.exit(1); }
console.log('cutscenes_audit_test: ' + last);
