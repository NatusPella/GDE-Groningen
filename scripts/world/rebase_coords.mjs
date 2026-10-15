// Bakes the hand-placed coordinates: every P(x, y), PO, P3, PA, PL, PB and L call
// with literal numbers (game/js/worldframe.js) becomes the number it returns,
// and a worldframe import nothing uses any more goes (docs/PROVINCIE-PLAN.md
// 1.5, decision 13: first the helper, then fix them in one go).
//   node scripts/world/rebase_coords.mjs [--write] [--root <dir>] [files...]
// Without --write it only reports. Default files: game/js/*.js, game/js/sfx/*.js,
// scripts/*.mjs, scripts/perf, scripts/bughunt (those that import worldframe).
// Calls whose arguments are not plain numbers stay (and keep the import).
// Run the tests before and after: the numbers are what the helpers returned,
// to the centimetre, so nothing may change.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { P, PO, P3, PA, PL, PB, L } from '../../game/js/worldframe.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FN = { P, PO, P3, PA, PL, PB, L };
const args = process.argv.slice(2);
const write = args.includes('--write');
const root = args.includes('--root') ? path.resolve(args[args.indexOf('--root') + 1]) : ROOT;
const explicit = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--root');

const IMPORT = /import\s*\{([^}]*)\}\s*from\s*'((?:\.\.?\/)+(?:game\/)?(?:js\/)?worldframe\.js)';?\n/;
const NUMERIC = /^[\d\s.,+\-*/()[\]eE]*(?:Math\.PI(?:[\s+\-*/\d.()]*))*$/;

// the index of the bracket that closes the one at i (strings are skipped)
function close(src, i) {
  const open = src[i], end = { '(': ')', '[': ']' }[open];
  let depth = 0;
  for (let k = i; k < src.length; k++) {
    const c = src[k];
    if (c === "'" || c === '"' || c === '`') { const q = c; k++; while (k < src.length && src[k] !== q) { if (src[k] === '\\') k++; k++; } continue; }
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') { depth--; if (!depth) return c === end ? k : -1; }
  }
  return -1;
}

const num = (v) => (Object.is(v, -0) ? 0 : v);
const lit = (v) => String(num(v));
const pair = (a) => `[${lit(a[0])}, ${lit(a[1])}]`;

function bake(src, names) {
  let out = '', last = 0, count = 0;
  const re = new RegExp(`(?:(?<![\\w$.])(\\.\\.\\.)|(?<![\\w$.]))(${[...names].join('|')})\\(`, 'g');
  let m;
  while ((m = re.exec(src))) {
    const callStart = m.index + (m[1] ? 3 : 0);
    const open = m.index + m[0].length - 1;
    const end = close(src, open);
    if (end < 0) continue;
    const lineStart = src.lastIndexOf('\n', m.index) + 1;
    if (/^\s*(\/\/|\*)/.test(src.slice(lineStart, m.index + 1))) continue;
    const inner = src.slice(open + 1, end);
    if (!NUMERIC.test(inner)) continue;
    let val;
    try { val = new Function('Math', `return [${inner}];`)(Math); } catch (e) { continue; }
    const name = m[2], spread = !!m[1];
    let text;
    try {
      if (name === 'P') { const r = P(...val); text = spread ? `${lit(r[0])}, ${lit(r[1])}` : pair(r); }
      else if (name === 'PO') { const r = PO(...val); text = spread ? `x: ${lit(r.x)}, y: ${lit(r.y)}` : `{ x: ${lit(r.x)}, y: ${lit(r.y)} }`; }
      else if (name === 'P3') { const r = P3(...val); text = spread ? `${lit(r[0])}, ${lit(r[1])}, ${lit(r[2])}` : `[${r.map(lit).join(', ')}]`; }
      else if (name === 'PA') text = lit(PA(...val));
      else if (name === 'PB') text = `[${PB(val[0]).map(lit).join(', ')}]`;
      else if (name === 'L') { const r = L(...val); text = spread ? `${lit(r[0])}, ${lit(r[1])}` : pair(r); }
      else if (name === 'PL') text = `[${PL(val[0]).map((q) => `[${q.map(lit).join(', ')}]`).join(', ')}]`;
    } catch (e) { continue; }
    if (text === undefined || (spread && name === 'PL')) continue;
    out += src.slice(last, m.index) + text;
    last = end + 1;
    re.lastIndex = end + 1;
    count++;
  }
  return { text: out + src.slice(last), count };
}

function files() {
  if (explicit.length) return explicit.map((f) => path.resolve(f));
  const out = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!/node_modules|vendor|world$/.test(e.name)) walk(p); } else if (/\.(m?js)$/.test(e.name)) out.push(p); } };
  for (const d of ['game/js', 'scripts']) if (fs.existsSync(path.join(root, d))) walk(path.join(root, d));
  return out.filter((f) => !/worldframe\.js$|rdnew\.js$|rebase_coords\.mjs$|rdnew_test\.mjs$/.test(f));
}

let total = 0, kept = 0, changed = 0;
for (const f of files()) {
  let src = fs.readFileSync(f, 'utf8');
  const im = IMPORT.exec(src);
  if (!im) continue;
  const names = new Set(im[1].split(',').map((s) => s.trim()).filter(Boolean).filter((n) => FN[n]));
  const { text, count } = bake(src, names);
  if (!count) { kept++; continue; }
  const stillUsed = [...names].filter((n) => new RegExp(`(?<![\\w$.])${n}\\(`).test(text.replace(IMPORT, '')));
  const rest = im[1].split(',').map((s) => s.trim()).filter(Boolean).filter((n) => !FN[n] || stillUsed.includes(n));
  const result = text.replace(IMPORT, rest.length ? `import { ${rest.join(', ')} } from '${im[2]}';\n` : '');
  total += count; changed++;
  console.log(`${path.relative(root, f)}: ${count} call${count === 1 ? '' : 's'} baked${stillUsed.length ? `, still uses ${stillUsed.join(', ')}` : ''}`);
  if (write) fs.writeFileSync(f, result);
}
console.log(`${total} calls in ${changed} files${write ? ' written' : ' (dry run: --write to apply)'}; ${kept} files import the helpers and keep non-literal calls`);
