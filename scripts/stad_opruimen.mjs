// Het oude stadspad opruimen (#90, fase C3): controleert dat niets in de repo de bestanden van het oude stadspad nog leest en toont
// dan de lijst van te verwijderen bestanden. Verwijdert zelf NIETS (dat doet de coördinator na de beeldvergelijking).
//   node scripts/stad_opruimen.mjs          rapport; exit 1 als er nog een lezer is
//   node scripts/stad_opruimen.mjs --json   hetzelfde als JSON
//   node scripts/stad_opruimen.mjs --lijst  alleen de paden (voor git rm)
// Wat weg kan: game/citymap.json (de handlaag staat in game/stad.json), de ruwe stadsbronnen data/*_raw.json en de python-keten die
// citymap.json maakte (build_map.py, process_osm.py, osmfetch.py, gen_ringroute.py, add_*.py). Een lezer is elke regel buiten die lijst
// die de naam van een van die bestanden noemt in code (commentaar, markdown en changelog tellen niet); een regel die het bestand
// alleen leest als het er is (loadworld.mjs, stad_split.mjs: SKIP zonder citymap.json) staat onder "toegestaan".
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const git = (a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }); } catch (e) { return e.status === 1 ? '' : (() => { throw e; })(); } };

// --- wat weg kan
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const list = (dir, test) => (fs.existsSync(path.join(ROOT, dir)) ? fs.readdirSync(path.join(ROOT, dir)).filter(test).map((f) => dir + '/' + f) : []);
// de keten van build_map.py (process_osm, fetch_osm, add_*, gen_ringroute) en de gereedschappen die citymap.json in-place bewerkten of lazen;
// add_facilities.py (facilities.json) en add_landmark_kits_province.py (landmarkkits.json) horen bij de provincie en blijven
const KEEP = new Set(['scripts/add_facilities.py', 'scripts/add_landmark_kits_province.py']);
const PYTHON = ['scripts/build_map.py', 'scripts/process_osm.py', 'scripts/fetch_osm.py', 'scripts/gen_ringroute.py', 'scripts/extract_palette.py', 'scripts/world/lanes.py', 'scripts/world/audit_lanes.py', 'scripts/world/rebase_data.py', ...list('scripts', (f) => /^add_.*\.py$/.test(f))].filter((f) => !KEEP.has(f));
const targets = [...new Set(['game/citymap.json', ...list('data', (f) => /_raw\.json$/.test(f)), ...PYTHON])].filter((f) => fs.existsSync(path.join(ROOT, f))).sort();
const targetSet = new Set(targets);

// --- lezers: regels in getrackte bestanden (niet in de lijst) die een doelbestand noemen
// (railprofile.mjs, worldbuilder_test.mjs en building_attrs.py lezen een ruwe bron alleen als hij bestaat; publish_check_test.mjs noemt er een als tekst)
const ALLOWED = new Set(['scripts/lib/loadworld.mjs', 'scripts/world/stad_split.mjs', 'scripts/stad_opruimen.mjs',
  'scripts/world/railprofile.mjs', 'scripts/worldbuilder_test.mjs', 'scripts/world/building_attrs.py', 'scripts/publish_check_test.mjs']);
const CODE = /\.(mjs|js|cjs|json|py|sh|bat|yml|yaml|html|ps1)$/;
const isDocLine = new Map(); // .py: regels binnen een docstring tellen als commentaar
const docLines = (file, lines) => {
  if (isDocLine.has(file)) return isDocLine.get(file);
  const set = new Set();
  let inDoc = false;
  lines.forEach((l, i) => { const n = (l.match(/"""/g) || []).length; if (inDoc || n) set.add(i); if (n % 2) inDoc = !inDoc; });
  isDocLine.set(file, set);
  return set;
};
const isComment = (file, text) => {
  const t = text.trim();
  if (/\.py$/.test(file)) return t.startsWith('#');
  if (/\.(sh|yml|yaml|ps1)$/.test(file)) return t.startsWith('#');
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
};
const names = (f) => {
  const b = path.basename(f);
  if (f === 'game/citymap.json') return ['citymap\\.json'];
  if (/_raw\.json$/.test(b)) return [b.replace('.', '\\.') + '(?!\\.gz)'];
  return [b.replace('.', '\\.')];
};
const readers = [], allowed = [];
const tracked = git(['ls-files']).split('\n').filter((f) => f && CODE.test(f) && !targetSet.has(f) && !f.startsWith('docs/') && !f.startsWith('licenses/') && f !== 'CHANGELOG.md');
for (const t of targets) {
  const re = new RegExp(names(t).join('|'));
  for (const file of tracked) {
    let text;
    try { text = fs.readFileSync(path.join(ROOT, file), 'utf8'); } catch { continue; }
    if (!re.test(text)) continue;
    const lines = text.split('\n');
    const docs = /\.py$/.test(file) ? docLines(file, lines) : null;
    lines.forEach((line, i) => {
      if (!re.test(line) || isComment(file, line) || (docs && docs.has(i))) return;
      (ALLOWED.has(file) ? allowed : readers).push({ target: t, file, line: i + 1, text: line.trim().slice(0, 160) });
    });
  }
}

const sizeOf = (f) => fs.statSync(path.join(ROOT, f)).size;
const total = targets.reduce((n, f) => n + sizeOf(f), 0);
const out = { remove: targets.map((f) => ({ file: f, bytes: sizeOf(f) })), totalBytes: total, readers, allowed: allowed.length };

if (args.includes('--lijst')) { console.log(targets.join('\n')); process.exit(readers.length ? 1 : 0); }
if (args.includes('--json')) { console.log(JSON.stringify(out, null, 1)); process.exit(readers.length ? 1 : 0); }
console.log(`Te verwijderen (${targets.length} bestanden, ${(total / 1e6).toFixed(1)} MB):`);
for (const f of targets) console.log(`  ${f}  ${(sizeOf(f) / 1e3).toFixed(0)} kB`);
console.log(`\nToegestane lezers (met bestaanscheck of alleen tekst): ${allowed.length} regels`);
if (readers.length) {
  console.log(`\nNOG IN GEBRUIK (${readers.length} regels): pas die eerst aan\n`);
  const by = new Map();
  for (const r of readers) (by.get(r.file) || by.set(r.file, []).get(r.file)).push(r);
  for (const [file, rs] of by) { console.log(`  ${file}`); for (const r of rs.slice(0, 4)) console.log(`    r${r.line} [${path.basename(r.target)}] ${r.text}`); if (rs.length > 4) console.log(`    ... en ${rs.length - 4} meer`); }
  process.exit(1);
}
console.log('\nGeen lezers meer buiten de toegestane: veilig om te verwijderen (git rm), daarna de docs bijwerken:');
console.log('  docs/ARCHITECTUUR-STAD-NAAR-TEGELS.md (C3), ARCHITECTURE.md ("World tiles"), README.md, desktop/ en web/ (al op stad.json)');
