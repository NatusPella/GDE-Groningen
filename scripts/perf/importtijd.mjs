// Importtijd per module (21-11, inefficientie B): hoeveel tijd kost de EIGEN top-level
// code van elke game-module bij het opstarten, los van zijn imports (in Node, met de
// DOM-stub van scripts/node3d.mjs). Geen Electron nodig.
//   node scripts/perf/importtijd.mjs [--top=15] [--entry=game/js/main.js] [--json] [--all]
// Werkwijze: een laadhaak zet vooraan elke game/js-module een startmerk (draait zodra al
// zijn imports klaar zijn, want imports worden vooraf geevalueerd) en achteraan een eindmerk.
// Eigen tijd = eind - start. De entry (main.js) wordt als eerste geimporteerd; met --all
// komen daarna alle andere modules die nog niet geladen zijn (lui geladen modules).
// Let op: Node's compilatie/parse-tijd zit er niet in; dat wordt apart gemeld als `bron KB`.
import '../node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GAMEJS = pathToFileURL(path.join(REPO, 'game', 'js') + path.sep).href;
const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3) || d;
const TOP = +arg('top', 15);
const ENTRY = arg('entry', 'game/js/main.js');
const asJson = process.argv.includes('--json');
const ALL = process.argv.includes('--all');

const rows = new Map(); // id -> { url, start, end, kb }
const ids = new Map();
globalThis.__imp = {
  r(id) { rows.get(id).start = performance.now(); },
  e(id) { rows.get(id).end = performance.now(); },
};

registerHooks({
  load(url, ctx, next) {
    const out = next(url, ctx);
    if (!url.startsWith(GAMEJS) || !url.endsWith('.js') || out.format !== 'module') return out;
    const id = ids.size;
    ids.set(url, id);
    const src = String(out.source);
    rows.set(id, { url, start: 0, end: 0, kb: src.length / 1024 });
    return { ...out, source: `globalThis.__imp.r(${id});\n${src}\n;globalThis.__imp.e(${id});\n` };
  },
});

const failed = [];
async function tryImport(file) {
  try { await import(pathToFileURL(file).href); } catch (e) { failed.push({ file: path.relative(REPO, file), msg: String(e && e.message || e).split('\n')[0] }); }
}
const origLog = console.log; const origWarn = console.warn; const origErr = console.error;
if (!asJson) { console.warn = () => {}; console.error = () => {}; }
const t0 = performance.now();
await tryImport(path.join(REPO, ENTRY));
const entryMs = performance.now() - t0;
const loadedByEntry = new Set(ids.keys());
if (ALL) {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of walk(path.join(REPO, 'game', 'js')).filter((f) => f.endsWith('.js')).sort()) {
    if (!loadedByEntry.has(pathToFileURL(f).href)) await tryImport(f);
  }
}
console.log = origLog; console.warn = origWarn; console.error = origErr;

const list = [...rows.values()].filter((r) => r.end > 0).map((r) => ({ module: path.relative(REPO, fileURLToPath(r.url)).split(path.sep).join('/'), selfMs: +(r.end - r.start).toFixed(2), kb: +r.kb.toFixed(0), viaEntry: loadedByEntry.has(r.url) }));
list.sort((a, b) => b.selfMs - a.selfMs);
const sumSelf = list.filter((r) => r.viaEntry).reduce((a, r) => a + r.selfMs, 0);
const sumKb = list.filter((r) => r.viaEntry).reduce((a, r) => a + r.kb, 0);
const res = { entry: ENTRY, entryMs: +entryMs.toFixed(0), modulesViaEntry: loadedByEntry.size, sumSelfMs: +sumSelf.toFixed(0), sourceKb: +sumKb.toFixed(0), top: list.slice(0, TOP), failed };
if (asJson) { console.log(JSON.stringify(res, null, 1)); process.exit(0); }
console.log(`${ENTRY}: ${res.modulesViaEntry} modules via de entry, import totaal ${res.entryMs} ms (parse + eval), eigen top-level code samen ${res.sumSelfMs} ms, bron ${res.sourceKb} KB`);
console.log(`Top ${TOP} duurste module-initialisaties (eigen tijd):`);
for (const r of res.top) console.log(`  ${String(r.selfMs).padStart(8)} ms  ${String(r.kb).padStart(5)} KB  ${r.module}${r.viaEntry ? '' : '  (lui)'}`);
if (failed.length) { console.log(`\nNiet te importeren in Node (${failed.length}), eerste 5:`); for (const f of failed.slice(0, 5)) console.log(`  ${f.file}: ${f.msg}`); }
process.exit(0);
