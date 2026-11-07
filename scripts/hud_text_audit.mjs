// Inventory of the HUD's text (#92): every string a player can read in the HUD,
// with its word count and the budget of its kind (hudtext.js WORD_BUDGET).
//   node scripts/hud_text_audit.mjs            list the elements over budget
//   node scripts/hud_text_audit.mjs --all      the whole inventory
//   node scripts/hud_text_audit.mjs --json     machine-readable
// hud_test.mjs imports auditHudText() and fails when a kind gets more over-budget
// elements than its ceiling in LIMITS (lower the ceiling when you shorten texts).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { wordCount, WORD_BUDGET, phoneCard } from '../game/js/hudtext.js';
import * as MB from '../game/js/movablebridges.js';
import * as RV from '../game/js/reisview.js';
import * as PH from '../game/js/partnerhud.js';
import { FY, GRO, INTL } from '../game/js/subtitles.js';

const JS = fileURLToPath(new URL('../game/js/', import.meta.url));
const lines = (s) => s.split(/\r?\n/);

// the most over-budget elements we accept per kind (a ratchet: only goes down)
export const LIMITS = { label: 0, hint: 0, hintSub: 0, card: 0, prompt: 0, phone: 0, subtitle: 0 };

const strOf = (src, key) => {
  const m = new RegExp('\\b' + key + ':\\s*([\'"`])').exec(src);
  if (!m) return null;
  const q = m[1];
  let s = '';
  for (let j = m.index + m[0].length; j < src.length && src[j] !== q; j++) {
    if (src[j] === '\\') j++;
    s += src[j];
  }
  return s;
};
// strings with an interpolation hold dynamic text: count the literal words only
const plain = (s) => s.replace(/\$\{[^}]*\}/g, ' x ');

export function auditHudText() {
  const out = [];
  const add = (kind, where, text) => { if (text) out.push({ kind, where, text, words: wordCount(plain(text)), budget: WORD_BUDGET[kind === 'hintSub' ? 'explain' : kind === 'card' ? 'cardBody' : kind] }); };

  // 1. the static HUD (hud_panel.js innerHTML): every text node is a label
  const panel = readFileSync(JS + 'hud_panel.js', 'utf8');
  lines(panel).forEach((ln, i) => {
    if (!/innerHTML\s*=|^\s*'<|^\s*`<|^\s*'?\+?\s*'<div/.test(ln) && !/<(span|b|small)/.test(ln)) return;
    for (const m of ln.matchAll(/>([^<>{}'`$]{2,})</g)) add('label', `hud_panel.js:${i + 1}`, m[1].trim());
  });

  // 2. interaction hints: label + sub next to a key (prompts.js and the prompt owners)
  for (const f of readdirSync(JS).filter((x) => x.endsWith('.js'))) {
    lines(readFileSync(JS + f, 'utf8')).forEach((ln, i) => {
      if (!/\bkey:\s*'[A-Z]+'/.test(ln) || !/\blabel:/.test(ln)) return;
      const label = strOf(ln, 'label');
      const sub = strOf(ln, 'sub');
      add('hint', `${f}:${i + 1}`, label);
      add('hintSub', `${f}:${i + 1} (sub)`, sub);
    });
  }

  // 3. messages (world.addMessage('...')): a card body
  for (const f of readdirSync(JS).filter((x) => x.endsWith('.js'))) {
    lines(readFileSync(JS + f, 'utf8')).forEach((ln, i) => {
      for (const m of ln.matchAll(/addMessage\(\s*(['"`])((?:\.|(?!\1).)*)\1/g)) add('card', `${f}:${i + 1}`, m[2]);
    });
  }

  // 4. pure text tables
  for (const st of ['warn', 'open']) add('prompt', `movablebridges.js bridgeHint(${st})`, MB.bridgeHint(st, true));
  add('prompt', 'reisview.js help', RV.panelState({ to: 'X', length: 9000, ride: 'bus', lines: ['a'] }).help);
  for (const t of Object.values({ a: PH.voertuigActie({ x: 0, y: 0 }, null, {}, null).tekst })) add('prompt', 'partnerhud.js voertuigActie', t);

  // 5. ondertitels (#644): elke gesproken Friese/Groningse regel en de Nederlandse vertaling eronder
  // telt mee voor het budget van 18 woorden, zodat een lange zin niet ongemerkt onder de maat zakt.
  for (const [gezegd, vertaling] of Object.entries({ ...FY, ...GRO, ...INTL })) {
    add('subtitle', 'subtitles.js (gesproken)', gezegd);
    add('subtitle', 'subtitles.js (Nederlands)', vertaling);
  }

  // 6. telefoonkaarten (#645): de vaste teksten uit de feed en de Sikkom-meldingen.
  for (const f of ['phonefeed.js', 'sikkomfeed.js']) {
    const src = readFileSync(JS + f, 'utf8');
    for (const m of src.matchAll(/'([^'\\n]{18,})'/g)) add('phone', f, m[1]);
  }
  return out;
}

// #645: ook dynamische kaarten en ondertitels (namen, bedragen, missietitels)
// kunnen pas op het laatste moment te lang worden. De UI gebruikt fitCard/
// fitSubtitle; deze functie is de meetbare kant daarvan.
export function auditRuntimeTexts({ cards = [], subtitles = [] } = {}) {
  const out = [];
  for (const t of cards) out.push({ kind: 'card', where: 'runtime card', text: t, words: wordCount(plain(t)), budget: WORD_BUDGET.cardBody });
  for (const t of subtitles) out.push({ kind: 'subtitle', where: 'runtime subtitle', text: t, words: wordCount(plain(t)), budget: WORD_BUDGET.subtitle });
  return out;
}

export function overBudget(rows) { return rows.filter((r) => r.words > r.budget); }

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const rows = auditHudText();
  const over = overBudget(rows);
  if (process.argv.includes('--json')) console.log(JSON.stringify({ rows, over }, null, 1));
  else {
    for (const r of (process.argv.includes('--all') ? rows : over)) console.log(`${String(r.words).padStart(3)}/${r.budget}  ${r.kind.padEnd(7)} ${r.where}  ${r.text.slice(0, 90)}`);
    const byKind = {};
    for (const r of rows) { const k = byKind[r.kind] || (byKind[r.kind] = { n: 0, over: 0, words: 0 }); k.n++; k.words += r.words; if (r.words > r.budget) k.over++; }
    console.log('\nper soort (aantal, boven budget, woorden):');
    for (const [k, v] of Object.entries(byKind)) console.log(`  ${k.padEnd(8)} ${v.n}  ${v.over}  ${v.words}`);
  }
}

