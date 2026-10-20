// The URL-switch register (game/js/devflags.js) is the only place that reads the URL:
//   node scripts/devflags_test.mjs
// - no other module reads location.search / URLSearchParams (the
//   test hook takes a string argument, so it is fine; the old stadlaag one is gone)
// - every FLAGS key has a description in FLAG_DOCS and a row in docs/ONTWIKKELEN.md
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'game', 'js');
let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };

const ALLOWED = new Set(['devflags.js']);
for (const f of readdirSync(dir).filter((x) => x.endsWith('.js') && !ALLOWED.has(x))) {
  const src = readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l)).join('\n');
  ok(!/location\.(search|hash)/.test(src), `${f} reads the URL itself: use FLAGS from devflags.js`);
}

// Debug hooks on window: every window.__x a module sets must be in the list in
// docs/ONTWIKKELEN.md (they are read by scripts/perf, the story test and the dev panel).
const docsText = readFileSync(path.join(root, 'docs', 'ONTWIKKELEN.md'), 'utf8');
const hookLine = docsText.split(/\r?\n/).find((l) => l.startsWith('Debug hooks on `window`')) || '';
for (const f of readdirSync(dir).filter((x) => x.endsWith('.js'))) {
  const src = readFileSync(path.join(dir, f), 'utf8');
  for (const m of src.matchAll(/window\.(__\w+)\s*=[^=]/g)) ok(hookLine.includes('`' + m[1] + '`'), `${f} sets window.${m[1]}: add it to the hook list in docs/ONTWIKKELEN.md`);
}

const { FLAGS, FLAG_DOCS } = await import(pathToFileURL(path.join(dir, 'devflags.js')).href);
const docs = readFileSync(path.join(root, 'docs', 'ONTWIKKELEN.md'), 'utf8');
// derived values (benchmarkRuns, storytest/dev alias) share the doc of their switch
const alias = { benchmarkRuns: 'benchmark' };
for (const k of Object.keys(FLAGS)) {
  const d = alias[k] || k;
  ok(typeof FLAG_DOCS[d] === 'string' && FLAG_DOCS[d].length > 5, `FLAG_DOCS has ${d}`);
  ok(docs.includes('`?' + d + '`'), `docs/ONTWIKKELEN.md lists ?${d}`);
}
for (const k of Object.keys(FLAG_DOCS)) ok(k in FLAGS, `FLAG_DOCS.${k} has a flag`);

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
