// Dialoogritme (#1123, dialoogleidraad hoofdstuk 9 van docs/VERHAAL-ANALYSE-21-11.md): loopt script.json af en meldt
// een regel van meer dan 25 woorden, vier of meer beurten achter elkaar van één spreker, een scène van één spreker
// en een scène van meer dan 14 regels. Bestaande uitzonderingen staan in scripts/dialogue_rhythm_allow.json
// ({ "<scène>": ["lang", ...] }): een nieuwe overtreding faalt, en een toegestane die er niet meer is, ook (de lijst
// wordt alleen korter). `--write` zet de lijst gelijk aan de bron.
// node scripts/dialogue_rhythm_test.mjs [--write]
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('game/storydata/script.json', root), 'utf8'));
const allowFile = new URL('scripts/dialogue_rhythm_allow.json', root);
const WRITE = process.argv.includes('--write');

export const MAX_WORDS = 25;
export const MAX_RUN = 3;
export const MAX_LINES = 14;
const words = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;
const spoken = (l) => l.channel !== 'app-stil';

export function sceneProblems(sc) {
  const out = new Set();
  const ls = (sc.lines || []).filter(spoken);
  if (sc.kind === 'radio' || sc.kind === 'replay') return [];
  if (ls.some((l) => l.channel !== 'radio' && words(l.text) > MAX_WORDS)) out.add('lang');
  let run = 0, prev = null;
  for (const l of ls) {
    if (l.channel === 'radio') { run = 0; prev = null; continue; }
    run = l.speaker === prev ? run + 1 : 1;
    prev = l.speaker;
    if (run > MAX_RUN) out.add('beurten');
  }
  const talkers = new Set(ls.filter((l) => l.channel !== 'radio').map((l) => l.speaker));
  if (ls.length >= 3 && talkers.size === 1) out.add('eenspreker');
  if (ls.length > MAX_LINES) out.add('lang-scene');
  return [...out];
}

const found = {};
for (const sc of data.scenes) {
  const p = sceneProblems(sc);
  if (p.length) found[sc.id] = p.sort();
}

if (WRITE) {
  fs.writeFileSync(allowFile, JSON.stringify(found, null, 1) + '\n');
  console.log(`dialogue_rhythm_test: ${Object.keys(found).length} toegestane scènes geschreven`);
  process.exit(0);
}

const allow = fs.existsSync(allowFile) ? JSON.parse(fs.readFileSync(allowFile, 'utf8')) : {};
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
for (const sc of data.scenes) {
  const f = found[sc.id] || [];
  const a = allow[sc.id] || [];
  const nieuw = f.filter((x) => !a.includes(x));
  ok(nieuw.length === 0, `${sc.id}: ritme`, `nieuw: ${nieuw.join(', ')}; kort de scène in of splits de beurten`);
  const weg = a.filter((x) => !f.includes(x));
  ok(weg.length === 0, `${sc.id}: toegestaan maar al opgelost`, `${weg.join(', ')}; draai --write`);
}
console.log(`dialogue_rhythm_test: ${n - fails}/${n} ok (${Object.keys(found).length} scènes met een toegestane uitzondering)`);
if (fails) process.exit(1);
