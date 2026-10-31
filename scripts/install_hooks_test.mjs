// De pre-commit-haak (#62): hij staat in git, is uitvoerbaar, roept de geheimenscan aan en de
// installatie zet core.hooksPath. Zonder deze test kan een verse kloon een haak krijgen die stil
// niets doet: een haak zonder +x slaat git over zonder melding, en dan waan je je beschermd.
//   node scripts/install_hooks_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const hook = path.join(ROOT, 'scripts/hooks/pre-commit');
let n = 0;
const ok = (c, naam) => { n++; if (!c) { console.log(`FAIL ${naam}`); process.exitCode = 1; } };

ok(fs.existsSync(hook), 'scripts/hooks/pre-commit bestaat');
const src = fs.existsSync(hook) ? fs.readFileSync(hook, 'utf8') : '';
ok(/^#!\/bin\/sh/.test(src), 'de haak heeft een shebang');
const mode = fs.existsSync(hook) ? fs.statSync(hook).mode : 0;
// Op Windows zegt het bestandssysteem altijd 666; daar telt de mode in de git-index (100755).
// Zonder deze tak zou de test op Windows altijd falen terwijl de haak in git wél uitvoerbaar is.
let gitMode = 0;
try { gitMode = Number((execFileSync('git', ['ls-files', '-s', 'scripts/hooks/pre-commit'], { encoding: 'utf8' }).trim().split(/\s+/)[0]) || 0); } catch { /* geen git */ }
const uitvoerbaar = (mode & 0o111) !== 0 || (process.platform === 'win32' && (gitMode & 0o111) !== 0);
ok(uitvoerbaar, `de haak is uitvoerbaar (mode ${(mode & 0o777).toString(8)}, git ${gitMode.toString(8)}): anders slaat git hem stil over`);
ok(/secrets_scan\.mjs --tree/.test(src), 'de haak draait de geheimenscan op de werkboom');
ok(/exit 1/.test(src), 'de haak breekt de commit af bij een treffer');
ok(/--no-verify/.test(src), 'de haak noemt de nooduitgang');
ok(fs.existsSync(path.join(ROOT, 'scripts/secrets_scan.mjs')), 'scripts/secrets_scan.mjs bestaat');

const inst = path.join(ROOT, 'scripts/install_hooks.mjs');
ok(fs.existsSync(inst), 'scripts/install_hooks.mjs bestaat');
const it = fs.existsSync(inst) ? fs.readFileSync(inst, 'utf8') : '';
ok(/core\.hooksPath/.test(it) && /scripts\/hooks/.test(it), 'de installatie zet core.hooksPath op scripts/hooks');

console.log(process.exitCode ? `install_hooks_test: ${n} checks, met fouten` : `install_hooks_test: ${n} checks goed`);
