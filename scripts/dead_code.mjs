// Dode-code-rapport voor game/js, uit de import-grafiek (issue #103):
//   node scripts/dead_code.mjs            samenvatting
//   node scripts/dead_code.mjs --list     alle ongebruikte exports per module
//   node scripts/dead_code.mjs --json     machineleesbaar
// Tel mee als gebruiker: game/js, game/index.html, scripts/, desktop/ (zonder
// node_modules en vendor-cache), web/. Statische en dynamische imports, en
// `new URL('./x.js', import.meta.url)`. Een namespace-import (`* as ns`) of een
// dynamische import telt als gebruik van ALLE exports van die module (voorzichtig).
// Uitkomst per module: 'spel' (bereikbaar vanuit index.html), 'bouw-only' (alleen
// scripts/desktop/web/tests), 'wees' (door niemand geïmporteerd).
// Per export: 'intern' = de naam komt nog in het eigen bestand voor (dan volstaat het
// weghalen van `export`), 'dood' = nergens meer nodig (dan kan de hele declaratie weg).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAMEJS = path.join(REPO, 'game', 'js');
const SKIP = new Set(['node_modules', 'vendor-cache', '.git', 'world', 'build', 'dist', 'out', '.claude']);
const EXT = /\.(js|mjs|cjs|html)$/;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXT.test(e.name)) out.push(p);
  }
  return out;
}

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
const rel = (p) => path.relative(REPO, p).split(path.sep).join('/');

const gameFiles = fs.readdirSync(GAMEJS).filter((f) => f.endsWith('.js')).map((f) => path.join(GAMEJS, f));
const allFiles = [...walk(path.join(REPO, 'game')), ...walk(path.join(REPO, 'scripts')), ...walk(path.join(REPO, 'desktop')), ...walk(path.join(REPO, 'web'))];
const gameSet = new Set(gameFiles);

const srcOf = new Map();
for (const f of new Set([...allFiles, ...gameFiles])) srcOf.set(f, fs.readFileSync(f, 'utf8'));

// uses: module -> Map(consumer -> Set(names) | '*')
const uses = new Map(gameFiles.map((f) => [f, new Map()]));
const edges = new Map(); // consumer -> Set(game modules) (alle soorten)
function note(consumer, target, names) {
  if (!gameSet.has(target) || target === consumer) return;
  const m = uses.get(target);
  const cur = m.get(consumer);
  if (names === '*' || cur === '*') m.set(consumer, '*');
  else m.set(consumer, new Set([...(cur || []), ...names]));
  if (!edges.has(consumer)) edges.set(consumer, new Set());
  edges.get(consumer).add(target);
}
const resolve = (from, spec) => {
  if (!spec.startsWith('.')) return null;
  return path.resolve(path.dirname(from), spec.replace(/[?#].*$/, ''));
};

for (const [file, raw] of srcOf) {
  const src = EXT.test(file) && file.endsWith('.html') ? raw : strip(raw);
  let m;
  // import X, { a, b as c } from '...'   /  import * as ns from '...'  /  import '...'
  const reImp = /\bimport\s+(?:([\w$]+)\s*,?\s*)?(?:\*\s*as\s+([\w$]+)|\{([^}]*)\})?\s*(?:from\s*)?['"]([^'"]+)['"]/g;
  while ((m = reImp.exec(src))) {
    const t = resolve(file, m[4]); if (!t) continue;
    if (m[2]) note(file, t, '*');
    else {
      const names = new Set();
      if (m[1]) names.add('default');
      if (m[3]) for (const part of m[3].split(',')) { const n = part.trim().split(/\s+as\s+/)[0].trim(); if (n) names.add(n); }
      note(file, t, names);
    }
  }
  const reExp = /\bexport\s+(?:\*(?:\s*as\s+[\w$]+)?|\{([^}]*)\})\s*from\s*['"]([^'"]+)['"]/g;
  while ((m = reExp.exec(src))) {
    const t = resolve(file, m[2]); if (!t) continue;
    if (!m[1]) note(file, t, '*');
    else note(file, t, new Set(m[1].split(',').map((p) => p.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean)));
  }
  const reDyn = /\bimport\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
  while ((m = reDyn.exec(src))) { const t = resolve(file, m[1]); if (t) note(file, t, '*'); }
  const reUrl = /new\s+URL\(\s*['"]([^'"]+\.m?js)['"]\s*,\s*import\.meta\.url/g;
  while ((m = reUrl.exec(src))) { const t = resolve(file, m[1]); if (t) note(file, t, '*'); }
  // <script src="js/x.js"> in html
  if (file.endsWith('.html')) {
    const reS = /<script[^>]*\ssrc=["']([^"']+)["']/g;
    while ((m = reS.exec(src))) { const t = path.resolve(path.dirname(file), m[1]); note(file, t, '*'); }
  }
}

// bereikbaar vanuit het spel: index.html -> main.js -> ... (alleen consumenten in game/)
const roots = [...edges.keys()].filter((f) => f.endsWith('index.html') && f.startsWith(path.join(REPO, 'game')));
const reach = new Set();
const todo = [...(edges.get(roots[0]) || [])];
for (const r of roots) for (const t of edges.get(r) || []) todo.push(t);
while (todo.length) {
  const f = todo.pop();
  if (reach.has(f)) continue;
  reach.add(f);
  for (const t of edges.get(f) || []) todo.push(t);
}

const stripStr = (s) => s;
function exportsOf(src) {
  const code = strip(src);
  const res = new Set();
  let m;
  const re1 = /^\s*export\s+(?:async\s+)?(?:function\s*\*?|class|const|let|var)\s+([\w$]+)/gm;
  while ((m = re1.exec(code))) res.add(m[1]);
  const re2 = /^\s*export\s*\{([^}]*)\}(?!\s*from)/gm;
  while ((m = re2.exec(code))) for (const p of m[1].split(',')) { const n = (p.trim().split(/\s+as\s+/).pop() || '').trim(); if (n) res.add(n); }
  if (/^\s*export\s+default\b/m.test(code)) res.add('default');
  return [...res];
}

const report = [];
for (const f of gameFiles) {
  const cons = uses.get(f);
  const external = [...cons.keys()].filter((c) => c !== f);
  const spel = [...cons.keys()].some((c) => reach.has(c) || c.endsWith('index.html') && c.startsWith(path.join(REPO, 'game')));
  const kind = external.length === 0 ? 'wees' : (reach.has(f) ? 'spel' : 'bouw-only');
  const src = srcOf.get(f);
  const ex = exportsOf(src);
  const star = [...cons.values()].some((v) => v === '*');
  const usedNames = new Set();
  for (const v of cons.values()) if (v !== '*') for (const n of v) usedNames.add(n);
  const code = strip(src);
  const unused = star ? [] : ex.filter((n) => !usedNames.has(n)).map((n) => {
    if (n === 'default') return { name: n, state: 'dood' };
    const occ = (code.match(new RegExp('(?<![\\w$.])' + n.replace(/\$/g, '\\$') + '(?![\\w$])', 'g')) || []).length;
    return { name: n, state: occ > 1 ? 'intern' : 'dood' };
  });
  report.push({ file: rel(f), kind, users: external.map(rel).sort(), exports: ex.length, unused, namespaceUsed: star });
}

// --json=<pad> schrijft het rapport naar een bestand in plaats van naar stdout. Nodig voor de CI:
// op de Linux-runner kwam `--json` via een pijp verminkt terug (Unterminated string, #140), terwijl
// dezelfde code op Windows wel goed ging. Een bestand omzeilt de pijp en de codering daarvan.
const jsonArg = process.argv.find((a) => a.startsWith('--json'));
if (jsonArg) {
  const tekst = JSON.stringify(report, null, 1);
  const doel = jsonArg.includes('=') ? jsonArg.slice(jsonArg.indexOf('=') + 1) : '';
  if (doel) {
    fs.writeFileSync(doel, tekst);
    console.log(`dead_code: ${report.length} modules naar ${doel}`);
  } else process.stdout.write(tekst + '\n');
  process.exit(0);
}

const orphans = report.filter((r) => r.kind === 'wees');
const buildOnly = report.filter((r) => r.kind === 'bouw-only');
const total = report.reduce((a, r) => a + r.unused.length, 0);
const dood = report.reduce((a, r) => a + r.unused.filter((u) => u.state === 'dood').length, 0);
console.log(`game/js: ${report.length} modules, ${report.filter((r) => r.kind === 'spel').length} bereikbaar vanuit het spel`);
console.log(`\nWees-modules (door niemand geïmporteerd): ${orphans.length}`);
for (const r of orphans) console.log('  ' + r.file);
console.log(`\nBouw-only modules (niet vanuit het spel bereikbaar, wel door scripts/desktop/web): ${buildOnly.length}`);
for (const r of buildOnly) console.log(`  ${r.file}  <- ${r.users.slice(0, 4).join(', ')}${r.users.length > 4 ? ' …' : ''}`);
console.log(`\nOngebruikte exports: ${total} (${dood} geheel dood, ${total - dood} alleen intern gebruikt)`);
const rows = report.filter((r) => r.unused.length).sort((a, b) => b.unused.length - a.unused.length);
for (const r of rows) {
  if (process.argv.includes('--list')) console.log(`  ${r.file} (${r.unused.length}): ${r.unused.map((u) => u.name + (u.state === 'dood' ? '!' : '')).join(', ')}`);
  else console.log(`  ${String(r.unused.length).padStart(3)}  ${r.file}`);
}
if (process.argv.includes('--list')) console.log('\n! = nergens anders in het eigen bestand gebruikt (hele declaratie kan weg)');
void stripStr;
