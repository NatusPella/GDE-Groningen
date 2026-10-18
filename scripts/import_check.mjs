// Statische importcontrole voor game/js, scripts en desktop (alleen ES-modules):
//   node scripts/import_check.mjs
// Zoekt drie soorten fouten die `node --check` niet ziet en die pas bij het laden
// (of pas bij de eerste aanroep) breken:
//   1. een benoemde import (`import { a } from './x.js'`) die het doelbestand niet exporteert
//      (ook niet via `export { x as y }`, `export { a } from` of `export * from`), of een
//      relatieve import van een bestand dat niet bestaat;
//   2. een geïmporteerde naam die in een blok door een lokale `const`/`let`/`class` wordt
//      overschaduwd en dan eerder in datzelfde blok al gelezen wordt (temporal dead zone:
//      `const gameBusy = gameBusy(world)`);
//   3. dezelfde naam twee keer geïmporteerd.
// Het is een tekstscan (geen volledige parser): strings, commentaar en regex-literals worden
// eerst weggehaald; blokken volgen de accolades. Doelen zonder import/export (CommonJS) worden
// niet op namen gecontroleerd.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'world', 'build', 'dist', 'vendor', 'vendor-cache', '.claude', 'out']);

// Vervangt strings, templates, commentaar en regex-literals door spaties (regeleinden blijven).
export function sanitize(src) {
  const out = [];
  const n = src.length;
  let i = 0;
  let prev = '';
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { let j = i; while (j < n && src[j] !== '\n') j++; out.push(blank(src.slice(i, j))); i = j; continue; }
    if (c === '/' && d === '*') { let j = src.indexOf('*/', i + 2); j = j < 0 ? n : j + 2; out.push(blank(src.slice(i, j))); i = j; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
      // de specifier achter `from` / `import` blijft staan: die is nodig om het doel te vinden
      const keep = /(?:^|[^\w$.])(?:from|import)\s*$/.test(src.slice(Math.max(0, i - 12), i));
      out.push(c + (keep ? src.slice(i + 1, j) : blank(src.slice(i + 1, j))) + (src[j] === c ? c : '')); i = j + 1; prev = c; continue;
    }
    if (c === '`') {
      let j = i + 1, depth = 0;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }
        if (depth === 0 && src[j] === '`') break;
        if (src[j] === '$' && src[j + 1] === '{') { depth++; j += 2; continue; }
        if (depth > 0 && src[j] === '}') depth--;
        else if (depth > 0 && src[j] === '`') { // geneste template in ${}
          j++; while (j < n && src[j] !== '`') j += src[j] === '\\' ? 2 : 1;
        }
        j++;
      }
      out.push('`' + blank(src.slice(i + 1, j)) + '`'); i = j + 1; prev = '`'; continue;
    }
    if (c === '/' && /[(,=:[!&|?{};+\-*%<>~^]|^$/.test(prev) ) {
      let j = i + 1, cls = false;
      while (j < n && src[j] !== '\n') {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false;
        else if (src[j] === '/' && !cls) break;
        j++;
      }
      if (src[j] === '/') { j++; while (j < n && /[a-z]/i.test(src[j])) j++; out.push('/' + blank(src.slice(i + 1, j - 1)) + '/'); i = j; prev = '/'; continue; }
    }
    out.push(c);
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out.join('');
}

const ID = '[A-Za-z_$][\\w$]*';

// -> { imports: [{ spec, names: [{imported, local, line}], line }], exports: Set|null, stars: [spec], isModule }
export function parseModule(src) {
  const s = sanitize(src);
  const lineOf = (idx) => s.slice(0, idx).split('\n').length;
  const imports = [];
  const stars = [];
  const exp = new Set();
  let m;
  const reImp = new RegExp(`(?<![\\w$.])import\\s+(?:(${ID})\\s*,?\\s*)?(?:\\*\\s*as\\s+(${ID})|\\{([^}]*)\\})?\\s*from\\s*(['"])([^'"\\n]*)\\4`, 'g');
  while ((m = reImp.exec(s))) {
    const names = [];
    const line = lineOf(m.index);
    if (m[1]) names.push({ imported: 'default', local: m[1], line });
    if (m[2]) names.push({ imported: '*', local: m[2], line });
    if (m[3]) for (const part of m[3].split(',')) {
      const t = part.trim(); if (!t) continue;
      const [a, b] = t.split(/\s+as\s+/);
      names.push({ imported: a.trim(), local: (b || a).trim(), line: lineOf(m.index + m[0].indexOf(t)) });
    }
    imports.push({ spec: m[5], names, line });
  }
  const reBare = /(?<![\w$.])import\s*(['"])([^'"\n]*)\1/g;
  while ((m = reBare.exec(s))) imports.push({ spec: m[2], names: [], line: lineOf(m.index) });
  // re-exports
  const reFrom = new RegExp(`(?<![\\w$.])export\\s+(?:\\*(?:\\s*as\\s+(${ID}))?|\\{([^}]*)\\})\\s*from\\s*(['"])([^'"\\n]*)\\3`, 'g');
  while ((m = reFrom.exec(s))) {
    if (m[2] === undefined) { if (m[1]) exp.add(m[1]); else stars.push(m[4]); imports.push({ spec: m[4], names: [], line: lineOf(m.index) }); continue; }
    const names = [];
    for (const part of m[2].split(',')) {
      const t = part.trim(); if (!t) continue;
      const [a, b] = t.split(/\s+as\s+/);
      names.push({ imported: a.trim(), local: null, line: lineOf(m.index) });
      exp.add((b || a).trim());
    }
    imports.push({ spec: m[4], names, line: lineOf(m.index) });
  }
  const reDecl = new RegExp(`(?<![\\w$.])export\\s+(?:async\\s+)?(?:function\\s*\\*?\\s*|class\\s+|const\\s+|let\\s+|var\\s+)(${ID})`, 'g');
  while ((m = reDecl.exec(s))) {
    exp.add(m[1]);
    if (!/(?:const|let|var)\s+$/.test(m[0].slice(0, m[0].length - m[1].length))) continue;
    // export const A = 0, B = 1;  -> ook B (komma's op diepte 0 tot de ;)
    let depth = 0;
    for (let j = m.index + m[0].length; j < s.length; j++) {
      const ch = s[j];
      if ('([{'.includes(ch)) depth++;
      else if (')]}'.includes(ch)) { if (--depth < 0) break; }
      else if (ch === ';' && depth === 0) break;
      else if (ch === ',' && depth === 0) {
        const t = new RegExp(`^\\s*(${ID})\\s*(?:=|,|;|$)`).exec(s.slice(j + 1, j + 80));
        if (t) exp.add(t[1]);
      }
    }
  }
  // export const { a, b } = ... / export const [a, b] = ...
  const reDes = /(?<![\w$.])export\s+(?:const|let|var)\s*[{[]([^}\]]*)[}\]]/g;
  while ((m = reDes.exec(s))) for (const part of m[1].split(',')) { const t = part.trim().split(/[:=]/).pop().trim(); if (t) exp.add(t); }
  const reList = /(?<![\w$.])export\s*\{([^}]*)\}(?!\s*from)/g;
  while ((m = reList.exec(s))) for (const part of m[1].split(',')) { const t = part.trim(); if (!t) continue; exp.add((t.split(/\s+as\s+/).pop()).trim()); }
  if (/(?<![\w$.])export\s+default\b/.test(s)) exp.add('default');
  const isModule = imports.length > 0 || exp.size > 0 || stars.length > 0 || /(?<![\w$.])export\s/.test(s);
  return { sanitized: s, imports, exports: exp, stars, isModule };
}

// Zoek benoemde import die een lokale declaratie van dezelfde naam in een blok heeft, met een
// eerdere lezing in datzelfde blok.
function shadowTdz(parsed) {
  const s = parsed.sanitized;
  const lines = s.split('\n');
  const found = [];
  const locals = new Set();
  for (const imp of parsed.imports) for (const nm of imp.names) if (nm.local) locals.add(nm.local);
  if (!locals.size) return found;
  // blokbereik per regel: stapel van accolades
  const depthAt = [];
  let depth = 0;
  const openLine = []; // regel waar het blok op diepte d opende
  const blockOf = []; // per regel: [startLine, id] van het binnenste blok
  const closed = new Map(); // openLine -> sluitregel
  const stack = [];
  for (let li = 0; li < lines.length; li++) {
    blockOf[li] = stack.length ? stack[stack.length - 1] : -1;
    for (const ch of lines[li]) {
      if (ch === '{') { stack.push(li); }
      else if (ch === '}') { const o = stack.pop(); if (o !== undefined) closed.set(o, li); }
    }
  }
  void depthAt; void openLine; void depth;
  for (const name of locals) {
    const decl = new RegExp(`(?<![\\w$.])(?:const|let|class)\\s+${name.replace(/\$/g, '\\$')}(?![\\w$])`, 'g');
    const declOne = new RegExp(decl.source);
    const use = new RegExp(`(?<![\\w$.])${name.replace(/\$/g, '\\$')}(?![\\w$])`);
    for (let li = 0; li < lines.length; li++) {
      const L = lines[li];
      let m;
      decl.lastIndex = 0;
      while ((m = decl.exec(L))) {
        const before = L.slice(0, m.index);
        // declaratie op blokniveau: de eigen regel start het blok niet als eerste teken van een for-kop
        const own = blockOf[li];
        // zelfverwijzing in dezelfde instructie: const x = x(...)
        const rest = L.slice(m.index + m[0].length);
        const self = new RegExp(`^\\s*=\\s*[!(\\s]*${name.replace(/\$/g, '\\$')}(?![\\w$:])\\s*[(.[]`).test(rest);
        if (self) { found.push({ line: li + 1, name, why: 'leest zichzelf in zijn initializer' }); continue; }
        // eerdere lezing in hetzelfde blok (zelfde diepte of dieper, binnen dit blok)
        const start = own < 0 ? 0 : own + 1;
        for (let k = start; k < li; k++) {
          if (own >= 0 && closed.get(own) !== undefined && k > closed.get(own)) break;
          if (readsDirectly(lines[k], use) && blockOf[k] === own) {
            // alleen als de lezing niet zelf een andere declaratie van dezelfde naam is
            if (declOne.test(lines[k])) continue;
            found.push({ line: li + 1, name, why: `eerder gelezen op regel ${k + 1} in hetzelfde blok (TDZ)` });
            break;
          }
        }
        void before;
      }
    }
  }
  return found;
}

// sources: Map(pad -> tekst). Paden zijn absoluut/genormaliseerd; `exists` voor bestanden buiten de map.
export function checkSources(sources, { exists = (p) => sources.has(p) } = {}) {
  const problems = [];
  const parsed = new Map();
  const get = (p) => { if (!parsed.has(p)) parsed.set(p, sources.has(p) ? parseModule(sources.get(p)) : null); return parsed.get(p); };
  const resolveSpec = (from, spec) => {
    if (!spec.startsWith('.')) return null;
    const p = path.resolve(path.dirname(from), spec.replace(/[?#].*$/, ''));
    return p;
  };
  const exportsOf = (p, seen = new Set()) => {
    if (seen.has(p)) return new Set();
    seen.add(p);
    const m = get(p);
    if (!m) return null;
    const all = new Set(m.exports);
    for (const sp of m.stars) {
      const t = resolveSpec(p, sp);
      const sub = t && exportsOf(t, seen);
      if (sub) for (const n of sub) if (n !== 'default') all.add(n);
    }
    return all;
  };
  for (const [file, src] of sources) {
    const m = get(file);
    if (!m || !m.isModule) continue;
    const bound = new Map();
    for (const imp of m.imports) {
      const target = resolveSpec(file, imp.spec);
      if (target) {
        if (!sources.has(target) && !exists(target)) problems.push({ file, line: imp.line, kind: 'ontbrekend-bestand', msg: `import van ${imp.spec}: bestand bestaat niet` });
        else if (sources.has(target)) {
          const tm = get(target);
          const ex = tm && tm.isModule ? exportsOf(target) : null;
          if (ex) for (const nm of imp.names) {
            if (nm.imported === '*') continue;
            if (!ex.has(nm.imported)) problems.push({ file, line: nm.line, kind: 'ontbrekende-export', msg: `${nm.imported} wordt niet geëxporteerd door ${imp.spec}` });
          }
        }
      }
      for (const nm of imp.names) {
        if (!nm.local) continue;
        if (bound.has(nm.local)) problems.push({ file, line: nm.line, kind: 'dubbele-import', msg: `${nm.local} is al geïmporteerd (regel ${bound.get(nm.local)})` });
        else bound.set(nm.local, nm.line);
      }
    }
    for (const f of shadowTdz(m)) problems.push({ file, line: f.line, kind: 'overschaduwde-import', msg: `lokale declaratie van geïmporteerde ${f.name}: ${f.why}` });
  }
  return problems;
}

export function loadRepoSources(root = REPO) {
  const sources = new Map();
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(js|mjs)$/.test(e.name) && e.name !== 'audio_check.js') sources.set(p, readFileSync(p, 'utf8'));
    }
  };
  for (const d of ['game/js', 'scripts', 'desktop', 'web']) if (existsSync(path.join(root, d))) walk(path.join(root, d));
  return sources;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sources = loadRepoSources();
  const exists = (p) => { try { return statSync(p).isFile(); } catch { return false; } };
  const problems = checkSources(sources, { exists });
  for (const p of problems) console.log(`${path.relative(REPO, p.file).split(path.sep).join('/')}:${p.line} [${p.kind}] ${p.msg}`);
  console.log(problems.length ? `FAIL ${problems.length} importproblemen in ${sources.size} bestanden` : `import_check ok (${sources.size} bestanden)`);
  process.exit(problems.length ? 1 : 0);
}

// Leest de regel de naam buiten een closure op diezelfde regel (`() => naam()`, `function () { naam }`)?
function readsDirectly(line, re) {
  const m = re.exec(line);
  if (!m) return false;
  return !/=>|\bfunction\b/.test(line.slice(0, m.index));
}
