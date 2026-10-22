// Statische controle op niet-gedefinieerde namen in ES-modules (de klasse "no-undef"):
//   node scripts/undef_check.mjs [bestand-of-map ...]     (standaard: game/js, desktop en scripts)
// Vangt wat `node --check` en import_check.mjs niet zien: een naam die in een bestand gebruikt wordt
// maar nergens geimporteerd of gedefinieerd is. Zo'n naam geeft pas een ReferenceError als de regel
// draait; in 0.36-0.38.1 gebruikte gamepad.js `GAME_PAD_CTX` zonder import, dus de pollronde
// stopte elk beeld in het spel terwijl de menu's werkten (#363).
// Parser: de acorn die in Node zelf zit (via --expose-internals; het script start zichzelf daarmee
// opnieuw). Is die niet te laden, dan meldt het dat het overgeslagen is (exit 0).
// Het is een eenvoudige scopeanalyse (var/let/const/function/class/import/parameters/catch/patronen);
// browser- en Node-globals staan in GLOBALS. Een bewuste uitzondering kan per bestand in TOEGESTAAN.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'world', 'build', 'dist', 'vendor', 'vendor-cache', '.claude', 'out']);

// Globals die in de browser, Electron (renderer en main) of Node bestaan, naast alles wat
// `globalThis` van Node al heeft.
const GLOBALS = new Set(`window document navigator location history screen performance localStorage sessionStorage
  indexedDB caches requestAnimationFrame cancelAnimationFrame requestIdleCallback cancelIdleCallback alert confirm prompt
  fetch Request Response Headers FormData URL URLSearchParams Blob File FileReader FileList Image ImageData ImageBitmap
  createImageBitmap OffscreenCanvas HTMLElement HTMLCanvasElement HTMLImageElement HTMLInputElement HTMLButtonElement
  HTMLVideoElement HTMLAudioElement Element Node NodeList Event EventTarget CustomEvent KeyboardEvent MouseEvent
  PointerEvent TouchEvent WheelEvent GamepadEvent MessageEvent ErrorEvent CloseEvent ProgressEvent StorageEvent
  DOMParser XMLSerializer DOMException DOMRect DOMMatrix DOMPoint MutationObserver ResizeObserver IntersectionObserver
  AudioContext webkitAudioContext OfflineAudioContext AudioBuffer AudioParam GainNode MediaStream MediaRecorder
  Audio SpeechSynthesis SpeechSynthesisUtterance speechSynthesis getComputedStyle matchMedia innerWidth innerHeight
  devicePixelRatio scrollX scrollY pageXOffset pageYOffset open close focus blur print postMessage name parent top self
  frames opener Worker SharedWorker ServiceWorker MessageChannel MessagePort BroadcastChannel WebSocket EventSource
  RTCPeerConnection RTCSessionDescription RTCIceCandidate RTCDataChannel XMLHttpRequest AbortController AbortSignal
  TextEncoder TextDecoder structuredClone queueMicrotask setTimeout clearTimeout setInterval clearInterval
  setImmediate clearImmediate atob btoa crypto Crypto Intl WebAssembly SharedArrayBuffer Atomics WeakRef FinalizationRegistry
  CSS Gamepad CompressionStream DecompressionStream ReadableStream WritableStream TransformStream
  Buffer process global require module exports __dirname __filename console
  WebGLRenderingContext WebGL2RenderingContext Path2D CanvasRenderingContext2D Touch Selection Range
  ClipboardItem VisualViewport screenX screenY outerWidth outerHeight isSecureContext origin
  addEventListener removeEventListener dispatchEvent AudioNode AudioBufferSourceNode AudioWorkletNode AudioWorklet
  AnalyserNode BiquadFilterNode OscillatorNode DynamicsCompressorNode StereoPannerNode PannerNode Storage`.split(/\s+/).filter(Boolean));
for (const k of Object.getOwnPropertyNames(globalThis)) GLOBALS.add(k);

// per bestand (pad ten opzichte van de repo, met /) een lijst namen die bewust ongedefinieerd mogen zijn
const TOEGESTAAN = {};

// ---------- parser ----------
async function loadAcorn() {
  try {
    const req = createRequire(import.meta.url);
    return req('internal/deps/acorn/acorn/dist/acorn');
  } catch { return null; }
}

// ---------- scope-analyse ----------
class Scope {
  constructor(parent, isFunction) { this.parent = parent; this.names = new Set(); this.isFunction = isFunction; }
  has(n) { for (let s = this; s; s = s.parent) if (s.names.has(n)) return true; return false; }
  functionScope() { let s = this; while (!s.isFunction && s.parent) s = s.parent; return s; }
}

function patternNames(p, out = []) {
  if (!p) return out;
  switch (p.type) {
    case 'Identifier': out.push(p.name); break;
    case 'ObjectPattern': for (const pr of p.properties) patternNames(pr.type === 'RestElement' ? pr.argument : pr.value, out); break;
    case 'ArrayPattern': for (const e of p.elements) patternNames(e, out); break;
    case 'RestElement': patternNames(p.argument, out); break;
    case 'AssignmentPattern': patternNames(p.left, out); break;
  }
  return out;
}

// var-declaraties (en function-in-blok niet) binnen een functie, zonder in geneste functies te kijken
function collectVars(node, out) {
  if (!node || typeof node.type !== 'string') return;
  switch (node.type) {
    case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression': return;
    case 'VariableDeclaration': if (node.kind === 'var') for (const d of node.declarations) patternNames(d.id, out); break;
  }
  for (const k in node) {
    if (k === 'type' || k === 'start' || k === 'end' || k === 'loc') continue;
    const v = node[k];
    if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === 'string') collectVars(c, out); }
    else if (v && typeof v.type === 'string') collectVars(v, out);
  }
}

// let/const/class/function direct in een lijst statements
function declareLexical(body, scope) {
  for (const st of body) {
    if (!st) continue;
    let d = st;
    if ((st.type === 'ExportNamedDeclaration' || st.type === 'ExportDefaultDeclaration') && st.declaration) d = st.declaration;
    if (d.type === 'VariableDeclaration' && d.kind !== 'var') for (const x of d.declarations) for (const n of patternNames(x.id)) scope.names.add(n);
    else if ((d.type === 'ClassDeclaration' || d.type === 'FunctionDeclaration') && d.id) scope.names.add(d.id.name);
    else if (d.type === 'ImportDeclaration') for (const sp of d.specifiers) scope.names.add(sp.local.name);
  }
}

function analyse(ast, file, allowed) {
  const problems = [];
  const seen = new Set();
  const ref = (id, scope) => {
    const n = id.name;
    if (n === 'undefined' || n === 'arguments' || scope.has(n) || GLOBALS.has(n) || allowed.has(n)) return;
    const key = n + '@' + id.loc.start.line;
    if (seen.has(key)) return;
    seen.add(key);
    problems.push({ name: n, line: id.loc.start.line });
  };

  function visitPatternTarget(p, scope, declaring) {
    // identifiers in een patroon: bij declaratie niet controleren, bij toewijzing wel; defaults en
    // berekende sleutels zijn altijd expressies
    if (!p) return;
    switch (p.type) {
      case 'Identifier': if (!declaring) ref(p, scope); break;
      case 'ObjectPattern':
        for (const pr of p.properties) {
          if (pr.type === 'RestElement') { visitPatternTarget(pr.argument, scope, declaring); continue; }
          if (pr.computed) visit(pr.key, scope);
          visitPatternTarget(pr.value, scope, declaring);
        }
        break;
      case 'ArrayPattern': for (const e of p.elements) visitPatternTarget(e, scope, declaring); break;
      case 'RestElement': visitPatternTarget(p.argument, scope, declaring); break;
      case 'AssignmentPattern': visitPatternTarget(p.left, scope, declaring); visit(p.right, scope); break;
      default: visit(p, scope); // MemberExpression als toewijzingsdoel
    }
  }

  function visitFunction(fn, scope) {
    const fs = new Scope(scope, true);
    if (fn.type === 'FunctionExpression' && fn.id) fs.names.add(fn.id.name);
    for (const p of fn.params) for (const n of patternNames(p)) fs.names.add(n);
    if (fn.body.type === 'BlockStatement') {
      const vars = []; collectVars(fn.body, vars); for (const v of vars) fs.names.add(v);
      declareLexical(fn.body.body, fs);
    }
    for (const p of fn.params) visitPatternTarget(p, fs, true);
    if (fn.body.type === 'BlockStatement') for (const st of fn.body.body) visit(st, fs);
    else visit(fn.body, fs);
  }

  function visit(node, scope) {
    if (!node || typeof node.type !== 'string') return;
    switch (node.type) {
      case 'Identifier': ref(node, scope); return;
      case 'Program': {
        const s = new Scope(null, true);
        const vars = []; collectVars(node, vars); for (const v of vars) s.names.add(v);
        declareLexical(node.body, s);
        for (const st of node.body) visit(st, s);
        return;
      }
      case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression': visitFunction(node, scope); return;
      case 'ClassDeclaration': case 'ClassExpression': {
        const cs = new Scope(scope, false);
        if (node.id) cs.names.add(node.id.name);
        visit(node.superClass, cs);
        for (const m of node.body.body) {
          if (m.type === 'StaticBlock') { const b = new Scope(cs, true); const v = []; collectVars(m, v); v.forEach((x) => b.names.add(x)); declareLexical(m.body, b); for (const st of m.body) visit(st, b); continue; }
          if (m.computed) visit(m.key, cs);
          if (m.value) visit(m.value, cs);
        }
        return;
      }
      case 'BlockStatement': {
        const bs = new Scope(scope, false);
        declareLexical(node.body, bs);
        for (const st of node.body) visit(st, bs);
        return;
      }
      case 'ForStatement': case 'ForInStatement': case 'ForOfStatement': {
        const fs = new Scope(scope, false);
        const init = node.type === 'ForStatement' ? node.init : node.left;
        if (init && init.type === 'VariableDeclaration' && init.kind !== 'var') for (const d of init.declarations) for (const n of patternNames(d.id)) fs.names.add(n);
        if (node.type === 'ForStatement') { visit(node.init, fs); visit(node.test, fs); visit(node.update, fs); }
        else { if (init.type === 'VariableDeclaration') visit(init, fs); else visitPatternTarget(init, fs, false); visit(node.right, fs); }
        visit(node.body, fs);
        return;
      }
      case 'SwitchStatement': {
        visit(node.discriminant, scope);
        const ss = new Scope(scope, false);
        for (const c of node.cases) declareLexical(c.consequent, ss);
        for (const c of node.cases) { visit(c.test, ss); for (const st of c.consequent) visit(st, ss); }
        return;
      }
      case 'CatchClause': {
        const cs = new Scope(scope, false);
        if (node.param) for (const n of patternNames(node.param)) cs.names.add(n);
        if (node.param) visitPatternTarget(node.param, cs, true);
        // de catch-body is een eigen blok; visit() doet dat
        visit(node.body, cs);
        return;
      }
      case 'VariableDeclaration':
        for (const d of node.declarations) { visitPatternTarget(d.id, scope, true); visit(d.init, scope); }
        return;
      case 'AssignmentExpression':
        if (node.left.type === 'Identifier' || node.left.type === 'MemberExpression') visit(node.left, scope);
        else visitPatternTarget(node.left, scope, false);
        visit(node.right, scope);
        return;
      case 'MemberExpression': visit(node.object, scope); if (node.computed) visit(node.property, scope); return;
      case 'Property': if (node.computed) visit(node.key, scope); visit(node.value, scope); return;
      case 'PropertyDefinition': case 'MethodDefinition': if (node.computed) visit(node.key, scope); visit(node.value, scope); return;
      case 'LabeledStatement': visit(node.body, scope); return;
      case 'BreakStatement': case 'ContinueStatement': return;
      case 'MetaProperty': return;
      case 'ImportDeclaration': return;
      case 'ExportSpecifier': visit(node.local, scope); return;
      case 'ExportAllDeclaration': return;
      case 'ExportNamedDeclaration':
        if (node.source) return; // export { x } from './y.js'
        if (node.declaration) visit(node.declaration, scope);
        for (const sp of node.specifiers) visit(sp, scope);
        return;
    }
    for (const k in node) {
      if (k === 'type' || k === 'start' || k === 'end' || k === 'loc') continue;
      const v = node[k];
      if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === 'string') visit(c, scope); }
      else if (v && typeof v.type === 'string') visit(v, scope);
    }
  }
  visit(ast, null);
  return problems;
}

// ---------- bestanden ----------
function walk(p, out) {
  const st = statSync(p);
  if (st.isFile()) { if (/\.(m?js)$/.test(p)) out.push(p); return; }
  for (const e of readdirSync(p)) {
    if (SKIP_DIRS.has(e)) continue;
    walk(path.join(p, e), out);
  }
}

// Een bestand is een ES-module als het import/export op regelbegin heeft; de rest (CommonJS,
// klassieke scripts) slaan we over.
const isModule = (src) => /^\s*(import\s[^(]|import\s*\{|export\s)/m.test(src);

export async function checkSource(acorn, src, relName = 'bron.js') {
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true, allowHashBang: true, allowAwaitOutsideFunction: true });
  return analyse(ast, relName, new Set(TOEGESTAAN[relName] || []));
}

async function main() {
  const acorn = await loadAcorn();
  if (!acorn) {
    if (!process.execArgv.includes('--expose-internals')) {
      const r = spawnSync(process.execPath, ['--expose-internals', '--no-warnings', fileURLToPath(import.meta.url), ...process.argv.slice(2)], { stdio: 'inherit' });
      process.exit(r.status ?? 1);
    }
    console.log('undef_check: acorn van Node niet te laden, overgeslagen');
    process.exit(0);
  }
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const roots = args.length ? args.map((a) => path.resolve(a)) : ['game/js', 'desktop', 'scripts'].map((d) => path.join(REPO, d));
  const files = [];
  for (const r of roots) walk(r, files);
  let bad = 0, checked = 0, skipped = 0;
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    if (!isModule(src)) { skipped++; continue; }
    const rel = path.relative(REPO, f).replace(/\\/g, '/');
    let problems;
    try { problems = await checkSource(acorn, src, rel); }
    catch (e) { console.log(`${rel}: kon niet parsen (${e.message})`); bad++; continue; }
    checked++;
    for (const p of problems) { console.log(`${rel}:${p.line}: '${p.name}' is niet geimporteerd of gedefinieerd`); bad++; }
  }
  console.log(`undef_check: ${checked} modules gecontroleerd (${skipped} geen module), ${bad} problemen`);
  process.exit(bad ? 1 : 0);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await main();
