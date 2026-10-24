// Bewaakt de afhankelijkheid van één speler (#446): telt per bestand in game/js de directe verwijzingen naar `world.player`
// en vergelijkt ze met scripts/spelers_budget.json. Het budget mag alleen dalen.
//   node scripts/spelers_budget_test.mjs            controleert (faalt als een bestand groeit of een nieuw bestand verwijst)
//   node scripts/spelers_budget_test.mjs --schrijf  zet het budget op de huidige stand, maar alleen omlaag (nooit omhoog)
// Nieuwe code gebruikt world.players en de helpers uit game/js/spelersregister.js (spelerVan, voorElkeSpeler, dichtstbijzijndeSpeler, hoofdspeler).
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'game', 'js');
const budgetPad = path.join(root, 'scripts', 'spelers_budget.json');

const files = [];
(function walk(d) {
  for (const e of readdirSync(path.join(dir, d), { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.posix.join(d, e.name));
    else if (e.name.endsWith('.js')) files.push(path.posix.join(d, e.name));
  }
})('.');

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');
const RE = /\bworld\.player\b/g;
const stand = {};
for (const f of files) {
  const n = (strip(readFileSync(path.join(dir, f), 'utf8')).match(RE) || []).length;
  if (n) stand[f.replace(/^\.\//, '')] = n;
}
const sorteer = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => a[0].localeCompare(b[0])));

const budget = existsSync(budgetPad) ? JSON.parse(readFileSync(budgetPad, 'utf8')) : {};
const schrijf = process.argv.includes('--schrijf');

if (schrijf) {
  const nieuw = {};
  for (const [f, n] of Object.entries(stand)) nieuw[f] = f in budget ? Math.min(n, budget[f]) : n;
  writeFileSync(budgetPad, JSON.stringify(sorteer(nieuw), null, 2) + '\n');
  const totaal = Object.values(nieuw).reduce((a, b) => a + b, 0);
  console.log(`budget geschreven: ${Object.keys(nieuw).length} bestanden, ${totaal} verwijzingen`);
  process.exit(0);
}

const fouten = [], zuiniger = [];
for (const [f, n] of Object.entries(stand)) {
  if (!(f in budget)) { if (Object.keys(budget).length) fouten.push(`${f}: ${n} verwijzingen, geen budget (nieuw bestand moet world.players of de helpers gebruiken)`); }
  else if (n > budget[f]) fouten.push(`${f}: ${n} verwijzingen naar world.player, budget ${budget[f]}`);
  else if (n < budget[f]) zuiniger.push(`${f}: ${n} < ${budget[f]}`);
}
for (const f of Object.keys(budget)) if (!(f in stand)) zuiniger.push(`${f}: 0 < ${budget[f]}`);
if (!Object.keys(budget).length) fouten.push('scripts/spelers_budget.json ontbreekt of is leeg (draai met --schrijf)');

const totaal = Object.values(stand).reduce((a, b) => a + b, 0);
const budgetTotaal = Object.values(budget).reduce((a, b) => a + b, 0);
console.log(`world.player: ${totaal} verwijzingen in ${Object.keys(stand).length} bestanden (budget ${budgetTotaal})`);
if (zuiniger.length) console.log(`onder budget, verlaag het met --schrijf: ${zuiniger.length} bestand(en)`);
if (fouten.length) { for (const m of fouten) console.error('FOUT ' + m); process.exit(1); }
console.log('spelers_budget_test: ok');
