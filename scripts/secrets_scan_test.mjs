// Test voor scripts/secrets_scan.mjs en scripts/merkenregister_check.mjs (#62, #593).
// Testwaarden worden samengesteld, zodat dit bestand zelf schoon blijft.
//   node scripts/secrets_scan_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { scanSecrets, neverOpen, parseBatch, parseIndexEntries, scanIndex, scanTree, historyWarning } from './secrets_scan.mjs';
import { parseRegister, harvest, check } from './merkenregister_check.mjs';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

// sleutelpatronen
const fake = ['sk', '-or-v1-', 'a'.repeat(40)].join('');
ok(scanSecrets(`const k = "${fake}";`).length >= 1, 'OpenRouter-vorm wordt gevangen');
ok(scanSecrets(['AKIA', 'ABCDEFGHIJKLMNOP'].join('')).length === 1, 'AWS-vorm');
ok(scanSecrets(['-----BEGIN ', 'RSA PRIVATE KEY-----'].join('')).length === 1, 'privésleutelblok');
ok(scanSecrets('const apiKey = process.env.OPENROUTER_API_KEY;').length === 0, 'variabelenaam is geen geheim');
ok(scanSecrets('Gewone speltekst: "Moi!" zegt Tammo.').length === 0, 'gewone tekst schoon');
ok(scanSecrets('x\n' + fake).find((f) => f.line === 2), 'regelnummer klopt');

// .env en sleutelbestanden worden nooit geopend
ok(neverOpen('.env'), '.env');
ok(neverOpen('desktop/.env.local'), '.env.local');
ok(neverOpen('keys/server.pem'), '.pem');
ok(!neverOpen('.env.example'), '.env.example mag');
ok(!neverOpen('game/js/main.js'), 'gewoon bestand');

// git cat-file --batch: twee blobs en een ontbrekende
const mk = (sha, body) => Buffer.concat([Buffer.from(`${sha} blob ${Buffer.byteLength(body)}\n`), Buffer.from(body), Buffer.from('\n')]);
const buf = Buffer.concat([mk('a'.repeat(40), 'hallo'), Buffer.from('b'.repeat(40) + ' missing\n'), mk('c'.repeat(40), 'wereld\nregel2')]);
const got = parseBatch(buf);
ok(got.length === 2 && got[0].body.toString() === 'hallo' && got[1].body.toString() === 'wereld\nregel2', 'parseBatch');

// index (#593 punt 5): `git ls-files -s -z` parsen, en de scan leest de index in plaats van de schijf
const reg = (sha, p) => `100644 ${sha} 0\t${p}\0`;
const idx = parseIndexEntries(reg('a'.repeat(40), 'a.txt') + reg('b'.repeat(40), 'desktop/x.cjs'));
ok(idx.length === 2 && idx[0].path === 'a.txt' && idx[1].mode === 0o100644 && idx[1].stage === 0, 'parseIndexEntries');

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-secrets-index-'));
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
git('init', '--quiet', tmp);
fs.writeFileSync(path.join(tmp, 'notes.txt'), `const k = "${fake}";\n`);
git('-C', tmp, 'add', 'notes.txt');
// het scenario uit het rapport: de sleutel is gestaged, daarna staat de schone versie op schijf
fs.writeFileSync(path.join(tmp, 'notes.txt'), 'const k = process.env.OPENROUTER_API_KEY;\n');
const indexScan = await scanIndex(tmp);
ok(indexScan.findings.length === 1 && indexScan.findings[0].file === 'notes.txt', 'de indexscan ziet de gestagede sleutel');
ok(scanTree(tmp).findings.length === 0, 'de werkboomscan ziet hem niet: dat was het gat in de pre-commit-haak');
ok(indexScan.stats.scanned >= 1, 'de indexscan telt wat hij las');

// geschiedenis (#593 punt 4): een shallow kloon waarschuwt
ok(!!historyWarning({ commits: 1, shallow: true }), 'shallow kloon waarschuwt');
ok(!!historyWarning({ commits: 1, shallow: false }), 'één commit waarschuwt');
ok(historyWarning({ commits: 500, shallow: false }) === null, 'volledige geschiedenis is goed');
ok(historyWarning(null) === null, 'geen geschiedenisstats');

// merkenregister
const md = '## 6. Register\n\n| Naam | Soort | Bron | Lijkt op | Beoordeling |\n|---|---|---|---|---|\n| Pang & Zo | wapens | `game/js/shops.js` | niets | ok |\n';
const rows = parseRegister(md);
ok(rows.length === 1 && rows[0].naam === 'Pang & Zo' && rows[0].bron === 'game/js/shops.js' && rows[0].beoordeling === 'ok', 'parseRegister');
const h = harvest("chain: 'Nait Duur', chain: 'Knip & Kuif'", "['Dollard', 'Knakker'], ['Hunze', 'Mug'], ['Dollard', 'Roestbak']");
ok(h.chains.length === 2 && h.makes.length === 2, 'harvest');
const c = check();
ok(c.rows > 30, 'register heeft rijen');
assert.deepEqual(c.problems, [], 'register klopt met de code: ' + c.problems.join('; '));
n++;

console.log(`secrets_scan_test ok (${n} checks)`);
