// Zet de git-haken van deze repo aan (#62): `core.hooksPath` wijst naar scripts/hooks, zodat
// pre-commit de geheimenscan draait vóór een commit. Een haak in .git/hooks verdwijnt bij een
// verse kloon; deze map staat in git, dus elke bijdrager krijgt hem met één commando.
//   node scripts/install_hooks.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = 'scripts/hooks';

if (!fs.existsSync(path.join(REPO, HOOKS, 'pre-commit'))) {
  console.log(`${HOOKS}/pre-commit ontbreekt; niets gezet`);
  process.exit(1);
}
const r = spawnSync('git', ['config', 'core.hooksPath', HOOKS], { cwd: REPO, encoding: 'utf8' });
if (r.status !== 0) {
  console.log(`git config mislukte: ${(r.stderr || '').trim() || r.status}`);
  process.exit(1);
}
console.log(`git-haken aan: core.hooksPath = ${HOOKS} (pre-commit draait de geheimenscan)`);
