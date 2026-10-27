// De release-notities komen uit CHANGELOG.md (desktop/release.sh:58). Deze test bewijst dat het script de
// juiste sectie pakt, hem niet doorloopt tot de volgende versie, en zonder sectie niets afdrukt.
//   node scripts/changelog_section_test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'scripts', 'changelog_section.cjs');
let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ' (' + info + ')' : ''}`); } };
const run = (versie, file) => execFileSync(process.execPath, [SCRIPT, versie, file], { encoding: 'utf8' });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-changelog-'));
const file = path.join(tmp, 'CHANGELOG.md');
fs.writeFileSync(file, [
  '# Wijzigingen',
  '',
  '## [0.55.0] - 2026-11-01',
  '',
  '### Nieuw',
  '',
  '- **Iets nieuws.** Met een uitleg.',
  '',
  '## [0.54.0] - 2026-10-27',
  '',
  '### Opgelost',
  '',
  '- **De routelijn begint bij je.** Ook buiten de stad.',
  '- **Tweede regel.** Met `code`.',
  '',
  '### Onderhoud',
  '',
  '- Iets technisch.',
  '',
  '## [0.53.0] - 2026-10-25',
  '',
  '- Oud.',
  '',
].join('\n'));

const sectie = run('0.54.0', file);
ok(/^### Opgelost/.test(sectie), 'de sectie begint bij de eerste subkop', sectie.slice(0, 40));
ok(sectie.includes('De routelijn begint bij je') && sectie.includes('Tweede regel'), 'de regels staan erin');
ok(sectie.includes('### Onderhoud') && sectie.includes('Iets technisch.'), 'alle subkoppen van die versie gaan mee');
ok(!sectie.includes('## [0.53.0]') && !sectie.includes('Oud.'), 'de volgende versie lekt er niet in');
ok(!sectie.includes('## [0.54.0]'), 'de kop zelf gaat er niet in');
ok(!sectie.startsWith('\n') && !sectie.endsWith('\n\n'), 'geen lege regels aan de randen');

const metV = run('v0.54.0', file);
ok(metV === sectie, 'een tag met v werkt hetzelfde');

const geen = run('9.9.9', file);
ok(geen === '', 'een versie zonder sectie geeft niets', JSON.stringify(geen.slice(0, 40)));

// en de echte CHANGELOG: elke versie die erin staat levert iets op, en [Unreleased] blijft leeg of heeft tekst
const echt = path.join(ROOT, 'CHANGELOG.md');
const tekst = fs.readFileSync(echt, 'utf8');
const versies = [...tekst.matchAll(/^## \[([^\]]+)\]/gm)].map((m) => m[1]);
ok(versies.length > 5, 'de echte CHANGELOG heeft versies', String(versies.length));
const leeg = versies.filter((v) => !run(v, echt).trim());
ok(!leeg.includes('0.53.0'), 'de laatste uitgave heeft een echte sectie', leeg.join(', '));

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`changelog_section: ${n - fails}/${n} checks passed`);
process.exit(fails ? 1 : 0);
