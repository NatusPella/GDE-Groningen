// Draait de standaardtests: syntaxcheck (modules via --input-type=module) op alle JS, voice_coverage en alle
// scripts/*_test.mjs met gewone node. Gebruik: node scripts/run_tests.mjs
//   --quick          snelle subset (geen check van alle JS, geen trage tests)
//   --timeout=<sec>  per test (standaard 120, bij --quick 30)
//   --only=<tekst>   alleen tests waarvan de naam de tekst bevat
//   --list           toon wat er zou draaien
// Tests die game/world of data/cache nodig hebben en die niet hebben, worden
// overgeslagen met een SKIP-melding. Provincie- en zware wereldchecks
// (province_test, ring_probe, drive_audit, ...) staan er bewust niet in.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSyntax } from './lib/syntaxcheck.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes('--' + n);
const opt = (n) => (args.find((a) => a.startsWith('--' + n + '=')) || '').split('=')[1];
const quick = flag('quick');
const timeoutMs = (Number(opt('timeout')) || (quick ? 30 : 120)) * 1000;
const only = opt('only');

// Nooit in de standaardrun: hebben de provinciedata of minuten nodig.
// scripts/perf en audio_check.js zijn snippets voor de browser/CDP: geen node --check.
export const EXCLUDED = new Set([
  'province_test.mjs', 'province_detail_test.mjs', 'network_drive_test.mjs',
  'junction_sim_test.mjs', 'ring_probe.mjs', 'drive_audit.mjs', 'vaarnet_province_test.mjs', 'prop_conflict_audit_test.mjs',
]);
// Niet in --quick: tests van meer dan ~5 s.
export const SLOW = new Set([
  'swim_escape_test.mjs', 'corridor_test.mjs', 'barge_test.mjs', 'tileworld_test.mjs',
  'mode_route_test.mjs', 'world_tiles_test.mjs', 'navgraph_test.mjs', 'minigames_test.mjs',
  'import_cycles_test.mjs', 'city_diff_test.mjs', 'city_parity_test.mjs', 'stadlaag_water_test.mjs', 'overlap_test.mjs', 'road_route_test.mjs', 'water_look_test.mjs',
]);
// Waar een test op stukloopt als de wereld ontbreekt.
export const MISSING_DATA = /(ENOENT|Cannot find|no such file|not found)[^\n]*(game[\\/]+world|data[\\/]+cache)|(game[\\/]+world|data[\\/]+cache)[^\n]*(ENOENT|no such file|not found)/i;

export function listFiles(dir, re, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'world' && dir === join(ROOT, 'game')) continue;
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (name === 'audio_check.js' || /\.page\.js$/.test(name)) continue; // snippets voor de browserconsole/CDP (top-level await)
    if (st.isDirectory()) {
      if (['build', 'dist', 'vendor', '.claude', 'perf', 'ui', 'weer'].includes(name)) continue;
      listFiles(p, re, out);
    } else if (re.test(name)) out.push(p);
  }
  return out;
}

export function run(cmd, cmdArgs, ms) {
  const t0 = Date.now();
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, encoding: 'utf8', timeout: ms, maxBuffer: 64 << 20 });
  const out = (r.stdout || '') + (r.stderr || '');
  return { code: r.status, timedOut: r.error && r.error.code === 'ETIMEDOUT', out, secs: (Date.now() - t0) / 1000 };
}

export function classify(res) {
  if (res.timedOut) return 'TIMEOUT';
  if (res.code === 0) return 'PASS';
  if (MISSING_DATA.test(res.out)) return 'SKIP';
  return 'FAIL';
}

function tail(s, n = 25) { return s.split(/\r?\n/).filter(Boolean).slice(-n).join('\n'); }

function main() {
  const results = [];
  const note = (name, res, status) => {
    results.push({ name, status, secs: res.secs, out: res.out });
    const extra = status === 'SKIP' ? ' (game/world of data/cache ontbreekt)' : '';
    console.log(`${status.padEnd(7)} ${name} ${res.secs.toFixed(1)}s${extra}`);
    if (status === 'FAIL' || status === 'TIMEOUT') console.log(tail(res.out).replace(/^/gm, '    '));
  };

  const tests = readdirSync(join(ROOT, 'scripts'))
    .filter((n) => /_test\.mjs$/.test(n) && !EXCLUDED.has(n) && !(quick && SLOW.has(n)))
    .filter((n) => !only || n.includes(only))
    .sort();

  if (flag('list')) { console.log(tests.join('\n')); return 0; }

  if (!quick && !only) {
    const files = ['game', 'scripts', 'desktop', 'web']
      .filter((d) => existsSync(join(ROOT, d)))
      .flatMap((d) => listFiles(join(ROOT, d), /\.(js|mjs)$/))
      .sort();
    let bad = 0;
    const t0 = Date.now();
    for (const f of files) {
      const r = checkSyntax(f);
      if (!r.ok) { bad++; console.log(`FAIL    syntaxcheck ${relative(ROOT, f)}\n` + tail(r.out, 8).replace(/^/gm, '    ')); }
    }
    results.push({ name: `node --check (${files.length} bestanden)`, status: bad ? 'FAIL' : 'PASS', secs: (Date.now() - t0) / 1000, out: '' });
    console.log(`${bad ? 'FAIL   ' : 'PASS   '} node --check op ${files.length} bestanden, ${bad} fout`);
  }

  if (!only) {
    const v = run(process.execPath, ['scripts/voice_coverage.mjs', '--quiet'], timeoutMs);
    note('voice_coverage.mjs --quiet', v, classify(v));
    const ic = run(process.execPath, ['scripts/import_check.mjs'], timeoutMs);
    note('import_check.mjs', ic, classify(ic));
  }

  for (const t of tests) {
    const r = run(process.execPath, [join('scripts', t)], timeoutMs);
    note(t, r, classify(r));
  }

  const count = (s) => results.filter((r) => r.status === s).length;
  const skipped = results.filter((r) => r.status === 'SKIP').map((r) => r.name);
  console.log(`\nSamenvatting${quick ? ' (--quick)' : ''}: ${count('PASS')} geslaagd, ${count('FAIL')} mislukt, ${count('TIMEOUT')} timeout, ${count('SKIP')} overgeslagen`);
  if (skipped.length) console.log('SKIP (wereld- of cachedata nodig): ' + skipped.join(', '));
  return count('FAIL') + count('TIMEOUT') ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exit(main());
