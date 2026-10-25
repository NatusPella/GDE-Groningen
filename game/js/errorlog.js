// The local error log ("Foutrapport" under Instellingen): runtime errors and
// warnings in a ring buffer, in memory and in localStorage on this device.
// Nothing is ever sent: the player can copy the report or, in the desktop
// app, save it as a file, and pass it on themselves.
//
// An entry: message, stack, game version, the story step, a short settings
// summary and the GPU class. No personal data: paths in stacks and messages
// lose everything before the game's own folder, and user folders are blanked.
// Repeats of the same message count up on one entry.
import { VERSION } from './version.js';
import { KEYS } from './storagekeys.js';

const STORE_KEY = KEYS.errorLog;
const MAX = 40;
const MAX_MSG = 400;
const MAX_STACK = 1500;
const WRITE_MS = 1500;

let entries = load();
let context = () => ({});
let writeTimer = 0;
let busy = false;
const listeners = new Set();

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    // the report is about the build that is running: a warning from an older
    // version says nothing about this one, and a bug fixed long ago kept riding
    // along with every upgrade (#496)
    return Array.isArray(d) ? d.filter((e) => e && typeof e.msg === 'string' && e.version === VERSION).slice(-MAX) : [];
  } catch (e) {
    return [];
  }
}

function persist() {
  writeTimer = 0;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(entries)); } catch (e) { /* full or private mode: memory only */ }
}

// Paths and URLs keep only the part inside the game; user folders are blanked.
function scrub(text) {
  return String(text ?? '')
    .replace(/(?:file|https?|app):\/\/[^\s)'"]*?\/(?=(?:js|audio|models)\/)/g, '')
    .replace(/(?:file|https?|app):\/\/[^\s)'"]*/g, (u) => u.replace(/[?#].*$/, '').replace(/^.*\/([^/]+)$/, '$1'))
    .replace(/([/\\](?:Users|home|Documents and Settings)[/\\])[^/\\\s]+/gi, '$1~');
}

const clip = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);

// One argument of console.error/warn as text.
function argText(a) {
  if (a instanceof Error) return a.message || String(a);
  if (typeof a === 'string') return a;
  try { return JSON.stringify(a); } catch (e) { return String(a); }
}

export function logError(level, message, stack = '') {
  if (busy) return;
  busy = true;
  try {
    const msg = clip(scrub(message).trim() || '(geen melding)', MAX_MSG);
    const now = new Date().toISOString();
    const same = entries.find((e) => e.msg === msg && e.level === level);
    if (same) {
      same.count = (same.count || 1) + 1;
      same.last = now;
      entries = entries.filter((e) => e !== same).concat(same);
    } else {
      let ctx = {};
      try { ctx = context() || {}; } catch (e) { /* the context itself failed */ }
      entries.push({ t: now, level, msg, stack: clip(scrub(stack), MAX_STACK), version: VERSION, step: ctx.step || '', settings: ctx.settings || '', gpu: ctx.gpu || '', count: 1 });
      if (entries.length > MAX) entries = entries.slice(-MAX);
    }
    if (!writeTimer) writeTimer = setTimeout(persist, WRITE_MS);
    for (const fn of listeners) fn();
  } finally {
    busy = false;
  }
}

// fn() -> { step, settings, gpu }: read when an entry is made (main.js).
export function setErrorContext(fn) {
  context = fn;
}

export const getErrorLog = () => entries.slice();
export const onErrorLogChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export function clearErrorLog() {
  entries = [];
  persist();
  for (const fn of listeners) fn();
}

// The report as plain text, newest first.
export function errorReport() {
  let ctx = {};
  try { ctx = context() || {}; } catch (e) { /* ignore */ }
  const head = [
    `GDE Groningen ${VERSION} · foutrapport ${new Date().toISOString()}`,
    `Platform: ${typeof window !== 'undefined' && window.gdeDesktop && window.gdeDesktop.isDesktop ? 'desktop (' + window.gdeDesktop.platform + ')' : 'browser'}`,
    ctx.step ? `Verhaal: ${ctx.step}` : '',
    ctx.settings ? `Instellingen: ${ctx.settings}` : '',
    ctx.gpu ? `GPU-klasse: ${ctx.gpu}` : '',
    `${entries.length} meldingen`,
  ].filter(Boolean);
  const body = entries.slice().reverse().map((e) => [
    `[${e.t}${e.count > 1 ? ` · ${e.count}x, laatst ${e.last}` : ''}] ${e.level === 'warn' ? 'WAARSCHUWING' : 'FOUT'}: ${e.msg}`,
    `  versie ${e.version}${e.step ? ` · stap ${e.step}` : ''}${e.gpu ? ` · gpu ${e.gpu}` : ''}${e.settings ? ` · ${e.settings}` : ''}`,
    e.stack ? e.stack.split('\n').map((l) => '    ' + l.trim()).join('\n') : '',
  ].filter(Boolean).join('\n'));
  return head.join('\n') + '\n\n' + (body.join('\n\n') || 'Geen fouten. Mooi zo.') + '\n';
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    // a resource that failed to load has no message; the console has it already
    if (!e || !e.message) return;
    logError('error', e.message, (e.error && e.error.stack) || `${e.filename || ''}:${e.lineno || 0}:${e.colno || 0}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e && e.reason;
    logError('error', 'Unhandled rejection: ' + argText(r), (r && r.stack) || '');
  });
  for (const level of ['error', 'warn']) {
    const orig = console[level];
    if (typeof orig !== 'function') continue;
    console[level] = function (...args) {
      try {
        const err = args.find((a) => a instanceof Error);
        logError(level, args.map(argText).join(' '), err ? err.stack || '' : '');
      } catch (e) { /* never break the console */ }
      return orig.apply(this, args);
    };
  }
  window.addEventListener('pagehide', () => { if (writeTimer) { clearTimeout(writeTimer); persist(); } });
}
