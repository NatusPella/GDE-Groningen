// Bewaakt het dalende budget voor lege catch-blokken in game/js (coding-standards.md:
// herstelde fouten onder dev-vlaggen niet stil inslikken).
//   node scripts/empty_catch_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAME_JS = path.join(ROOT, 'game', 'js');
const BUDGET_FILE = path.join(ROOT, 'scripts', 'empty_catch_budget.json');

const EMPTY_CATCH_RE = /catch\s*(?:\([^)]*\))?\s*\{\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*\}/g;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const budget = JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8'));
let total = 0;
for (const file of walk(GAME_JS)) {
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(EMPTY_CATCH_RE);
  if (m) total += m.length;
}

assert.ok(
  total <= budget.maxEmptyCatches,
  `Aantal lege catch-blokken gestegen: ${total} > budget ${budget.maxEmptyCatches}`,
);

if (total < budget.maxEmptyCatches) {
  console.log(`empty_catch_test: ${total} lege catches (budget ${budget.maxEmptyCatches} kan omlaag naar ${total})`);
} else {
  console.log(`empty_catch_test: ${total}/${budget.maxEmptyCatches} lege catches ok`);
}
