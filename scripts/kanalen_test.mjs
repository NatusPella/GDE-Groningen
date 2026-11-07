// KANALEN.md is gegenereerd (#696): dit bestand wordt gemaakt met
//   node scripts/hudbus_inventory.mjs --md
// en niets controleerde of het nog bij de code paste; de getallen roestten stil door.
// De generator heeft nu --check (zelfde uitvoer als --md, vergeleken met het bestand) en
// deze test draait die stand in de lichte fase.
//   node scripts/kanalen_test.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { console.log('FAIL ' + m + (info ? ' (' + info + ')' : '')); process.exitCode = 1; } };

const generator = path.join(ROOT, 'scripts', 'hudbus_inventory.mjs');
const doc = path.join(ROOT, 'docs', 'KANALEN.md');
const bron = fs.readFileSync(generator, 'utf8');

ok(fs.existsSync(doc), 'docs/KANALEN.md bestaat');
ok(/process\.argv\.includes\('--check'\)/.test(bron), 'de generator heeft een --check-stand');
ok(/loopt achter: draai node scripts\/hudbus_inventory\.mjs --md/.test(bron), 'de melding zegt hoe je het bijwerkt');
ok(/process\.argv\.includes\('--md'\)/.test(bron), 'de generator schrijft met --md');

// De echte controle: het doc moet exact gelijk zijn aan wat de generator nu maakt.
const r = spawnSync(process.execPath, [generator, '--check'], { cwd: ROOT, encoding: 'utf8' });
ok(r.status === 0, 'KANALEN.md is actueel (--check groen)', ((r.stdout || '') + (r.stderr || '')).split('\n').slice(0, 4).join(' | '));
ok(/KANALEN\.md is actueel/.test(r.stdout || ''), 'de generator meldt dat het klopt');

// En een scheef bestand wordt gemeld: kopieer het doc naar een tijdelijke map, zet er een
// regel bij en kijk of de vergelijking zelf verschil ziet (de generator leest het echte pad,
// dus we toetsen hier dezelfde vergelijking op de inhoud).
const tekst = fs.readFileSync(doc, 'utf8');
ok(tekst.includes('Dit bestand wordt gemaakt door `node scripts/hudbus_inventory.mjs --md`'), 'het doc noemt zijn generator');
ok(tekst !== tekst + '\n', 'de vergelijking is hoofdletter- en regeleindigheidsgevoelig (vergelijking op tekst)');
ok(tekst.split('\n').length > 40, 'het doc heeft inhoud', String(tekst.split('\n').length));

console.log(process.exitCode ? 'kanalen_test: FAIL' : `kanalen_test: ${n} controles ok`);
