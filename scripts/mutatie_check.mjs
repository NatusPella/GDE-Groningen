// Mutatiecontrole op de kern (sprint kwaliteit 22-11):  node scripts/mutatie_check.mjs [--lijst] [--filter=tekst]
// Breekt bewust een regel in een kernmodule en kijkt of minstens een test die die module importeert faalt.
// Overleeft een mutant, dan mist de testsuite die regel: voeg dan een test toe (zie docs/KWALITEIT-22-11.md).
// Het bronbestand wordt altijd teruggezet (ook bij een fout); het script werkt alleen in de eigen werkboom.
// Een test telt alleen mee als hij op de ongewijzigde code slaagt (anders is "falen" geen bewijs).
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MUTANTEN as M } from './mutatie_lijst.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPTS = path.join(ROOT, 'scripts');
const arg = (k) => (process.argv.find((a) => a.startsWith('--' + k + '=')) || '').split('=')[1];
const FILTER = arg('filter');
const TIMEOUT_MS = Number(arg('timeout') || 60000);
const PAR = Number(arg('par') || 4);

const gameFile = (f) => path.join(ROOT, 'game', 'js', f);
const baseName = (f) => f.replace(/\.js$/, '');
const allTests = fs.readdirSync(SCRIPTS).filter((f) => /_test\.mjs$/.test(f));
const testsFor = (f) => {
  const needle = 'game/js/' + baseName(f) + '.js';
  return allTests.filter((t) => fs.readFileSync(path.join(SCRIPTS, t), 'utf8').includes(needle));
};

function runTest(t) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(SCRIPTS, t)], { cwd: ROOT, stdio: 'ignore' });
    const timer = setTimeout(() => { try { p.kill(); } catch (e) { /* al weg */ } resolve({ t, code: 'timeout' }); }, TIMEOUT_MS);
    p.on('exit', (code) => { clearTimeout(timer); resolve({ t, code }); });
    p.on('error', () => { clearTimeout(timer); resolve({ t, code: 'fout' }); });
  });
}
async function runPool(tests, stopOnFail) {
  const res = []; let i = 0, stop = false;
  const worker = async () => { while (!stop && i < tests.length) { const r = await runTest(tests[i++]); res.push(r); if (stopOnFail && r.code !== 0) stop = true; } };
  await Promise.all(Array.from({ length: Math.min(PAR, tests.length) }, worker));
  return res;
}

const baseline = new Map();
async function goodTests(f) {
  const list = testsFor(f); const need = list.filter((t) => !baseline.has(t));
  for (const r of await runPool(need, false)) baseline.set(r.t, r.code === 0);
  return list.filter((t) => baseline.get(t));
}

const todo = M.filter(([f, a, b, w]) => !FILTER || (f + ' ' + w).includes(FILTER));
if (process.argv.includes('--lijst')) { for (const [f, , , w] of todo) console.log(f + ': ' + w); process.exit(0); }
let killed = 0, survived = 0, bad = 0; const report = [];
for (const [f, from, to, what] of todo) {
  const file = gameFile(f); const orig = fs.readFileSync(file, 'utf8');
  const count = orig.split(from).length - 1;
  if (count !== 1) { bad++; report.push('ONGELDIG  ' + f + ': patroon komt ' + count + 'x voor: ' + what); continue; }
  const tests = await goodTests(f);
  if (!tests.length) { bad++; report.push('GEEN TEST ' + f + ': ' + what); continue; }
  fs.writeFileSync(file, orig.replace(from, () => to));
  let res;
  try { res = await runPool(tests, true); } finally { fs.writeFileSync(file, orig); }
  const dead = res.find((r) => r.code !== 0);
  if (dead) { killed++; report.push('gedood    ' + f + ': ' + what + '  [' + dead.t + ']'); }
  else { survived++; report.push('OVERLEEFT ' + f + ': ' + what + '  (' + tests.length + ' tests)'); }
}
for (const l of report) console.log(l);
console.log('mutatiecontrole: ' + killed + ' gedood, ' + survived + ' overleefd, ' + bad + ' ongeldig/zonder test, van ' + todo.length);
process.exit(survived || bad ? 1 : 0);
