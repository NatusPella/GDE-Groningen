// De testrunner zelf: indeling van uitkomsten, uitsluitingen en --quick/--list.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classify, EXCLUDED, SLOW, MISSING_DATA } from './run_tests.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } else console.log('ok   ' + m); };

ok(classify({ code: 0, out: '' }) === 'PASS', 'code 0 is PASS');
ok(classify({ code: 1, out: 'boom' }) === 'FAIL', 'gewone fout is FAIL');
ok(classify({ code: null, timedOut: true, out: '' }) === 'TIMEOUT', 'time-out is TIMEOUT');
ok(classify({ code: 1, out: "Error: ENOENT: no such file or directory, open 'C:\\x\\game\\world\\index.json'" }) === 'SKIP', 'ontbrekende game/world (Windows-pad) is SKIP');
ok(classify({ code: 1, out: 'ENOENT: no such file or directory, scandir /repo/data/cache' }) === 'SKIP', 'ontbrekende data/cache is SKIP');
ok(!MISSING_DATA.test('ENOENT: no such file, open /repo/game/js/x.js'), 'andere ontbrekende bestanden blijven FAIL');
for (const n of ['province_test.mjs', 'network_drive_test.mjs']) {
  ok(EXCLUDED.has(n), n + ' staat niet in de standaardrun');
  ok(existsSync(join(HERE, n)), n + ' bestaat nog (uitsluitlijst niet verouderd)');
}
for (const n of SLOW) ok(existsSync(join(HERE, n)), 'SLOW: ' + n + ' bestaat');

const list = (extra) => spawnSync(process.execPath, [join(HERE, 'run_tests.mjs'), '--list', ...extra], { encoding: 'utf8' }).stdout.split(/\r?\n/).filter(Boolean);
const all = list([]), quick = list(['--quick']);
ok(all.length > 50 && quick.length < all.length, `--quick is kleiner (${quick.length} < ${all.length})`);
ok(!all.includes('province_test.mjs') && !all.includes('run_tests.mjs'), 'lijst bevat geen uitgesloten tests');
ok(all.includes('run_tests_test.mjs'), 'de runner-test draait zelf mee');
process.exit(fails ? 1 : 0);
