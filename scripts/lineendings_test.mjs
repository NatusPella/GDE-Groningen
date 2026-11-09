// #799: de Windows-CRLF-val. kanalen_test vergelijkt werkboomtekst met LF-generatoruitvoer; op een
// Windows-checkout met core.autocrlf=true werd dat rood terwijl de inhoud klopte. De structurele
// oplossing is een eol-regel in .gitattributes; deze test bewaakt dat de regel bestaat en dat git
// hem toepast op markdown (en op de bestaande code-regels). Geen schrijfactie: alleen lezen.
//   node scripts/lineendings_test.mjs
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ` (${info})` : ''}`); } };
const attrs = fs.readFileSync(path.join(ROOT, '.gitattributes'), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

ok(attrs.includes('*.md text eol=lf'), '*.md staat op text eol=lf in .gitattributes');
ok(!attrs.some((l) => /^\*\.md\b/.test(l) && /eol=crlf/.test(l)), 'geen md-regel die CRLF forceert');
for (const regel of ['*.js text eol=lf', '*.mjs text eol=lf', '*.sh text eol=lf']) ok(attrs.includes(regel), `${regel} blijft staan`);

// git past de regel echt toe (leest alleen; werkt ook vóór de commit, want .gitattributes is werkboom)
const git = spawnSync('git', ['check-attr', 'eol', '--', 'docs/KANALEN.md', 'game/js/main.js', 'scripts/kanalen_test.mjs'], { cwd: ROOT, encoding: 'utf8' });
if (git.status === 0) {
  const uit = git.stdout;
  ok(/docs\/KANALEN\.md: eol: lf/.test(uit), 'git geeft markdown eol=lf', uit.trim());
  ok(/game\/js\/main\.js: eol: lf/.test(uit), 'git geeft JS eol=lf', uit.trim());
  ok(/scripts\/kanalen_test\.mjs: eol: lf/.test(uit), 'git geeft mjs eol=lf', uit.trim());
} else {
  console.log('SKIP  git check-attr niet beschikbaar: alleen de .gitattributes-regel is gecontroleerd');
}

// De comparator van kanalen_test normaliseert CRLF vóór de vergelijking: dat is de tweede vangrail
// voor een checkout die al met CRLF op schijf staat. Zonder die normalisatie is de test op Windows rood.
const inventory = fs.readFileSync(path.join(ROOT, 'scripts', 'hudbus_inventory.mjs'), 'utf8');
ok(/const norm = \(t\) => String\(t\)\.replace\(\/\\r\\n\/g, '\\n'\)/.test(inventory), 'de KANALEN-generator normaliseert regeleinden vóór het vergelijken');

console.log(fails ? `lineendings_test: ${n - fails}/${n} ok` : `lineendings_test: ${n}/${n} ok`);
process.exitCode = fails ? 1 : 0;
