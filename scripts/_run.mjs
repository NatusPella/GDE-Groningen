// Tijdelijk: draai de tests die de gewijzigde bestanden noemen (plus de ontwerptests); sla omgevingsfouten (three niet gevendord, provincie) over.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
const gewijzigd = spawnSync('git', ['diff', '--name-only', process.argv[2] || 'HEAD'], { encoding: 'utf8' }).stdout.split('\n').filter(Boolean);
const namen = gewijzigd.map((f) => f.split('/').pop());
for (const f of gewijzigd.filter((x) => x.endsWith('.js'))) {
  const r = spawnSync('node', ['--input-type=module', '--check'], { input: fs.readFileSync(f, 'utf8'), encoding: 'utf8' });
  if (r.status !== 0) console.log('SYNTAX', f, r.stderr.split('\n').slice(0, 4).join(' | '));
}
const tests = fs.readdirSync('scripts').filter((t) => /_test\.mjs$/.test(t));
const teDoen = tests.filter((t) => { const src = fs.readFileSync('scripts/' + t, 'utf8'); return namen.some((n) => src.includes(n)) || /hud_|menu_|a11y|ds_|ds3|design|kleur|contrast|css|overlap|text_audit|layout/i.test(t); });
console.log(teDoen.length, 'tests');
const fout = [];
for (const t of teDoen) {
  const r = spawnSync('node', ['scripts/' + t], { encoding: 'utf8', timeout: 120000 });
  const uit = r.stdout + r.stderr;
  if (r.status !== 0 && !/not vendored|province\.json/.test(uit)) { fout.push(t); console.log('FAIL', t, uit.split('\n').filter((l) => /FAIL|fout|Error|OPEN/i.test(l)).slice(0, 4).join(' | ')); }
}
console.log('klaar, mislukt:', fout.length, fout.join(' '));
