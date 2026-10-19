// Invoeraudit voor de controller (#151): zoekt in de speelcode elke toets die
// het spel leest (input.wasPressed/isDown/consume) en controleert dat een
// pad-situatie (PAD_MAPS, controls.js) die toets kan maken. Toetsen die
// bewust geen knop hebben staan in ZONDER_KNOP, met reden; een nieuwe toets
// zonder knop of reden laat de audit falen.
//   node scripts/pad_input_audit.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { PAD_MAPS } from '../game/js/controls.js';

const ZONDER_KNOP = {
  u: 'geluid aan/uit staat ook in Instellingen',
  0: 'alternatief voor Backspace (dienblad leeg), die heeft wel een knop',
  h: 'toeteren te voet heeft geen knop (eigenaarsbesluit); in voertuigen wel (X)',
};
const SPECIAL = new Set(['escape', 'enter']);

const dir = new URL('../game/js/', import.meta.url);
const used = new Map();
for (const f of readdirSync(dir).filter((n) => n.endsWith('.js'))) {
  const src = readFileSync(new URL(f, dir), 'utf8');
  for (const m of src.matchAll(/\b(?:wasPressed|isDown|consume)\((['"])([^'"]+)\1/g)) {
    const k = m[2].toLowerCase();
    if (!used.has(k)) used.set(k, new Set());
    used.get(k).add(f);
  }
}
const reachable = new Set();
for (const map of Object.values(PAD_MAPS)) {
  for (const [slot, v] of Object.entries(map)) if (slot !== 'stick' && typeof v === 'string' && !v.startsWith('@')) reachable.add(v);
  if (map.stick === 'move') 'wasd'.split('').forEach((c) => reachable.add(c));
  if (map.stick === 'steer') 'ad'.split('').forEach((c) => reachable.add(c));
  if (map.stick === 'move' || map.stick === 'arrows' || map.stick === 'nav') ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].forEach((c) => reachable.add(c));
}
// de gaspedaal en rem: W en S met de triggers in voertuigen
reachable.add('w'); reachable.add('s');

let fails = 0;
for (const [k, files] of [...used].sort()) {
  if (SPECIAL.has(k) || reachable.has(k)) continue;
  if (Object.hasOwn(ZONDER_KNOP, k)) continue;
  fails++;
  console.log(`FAIL toets '${k}' wordt gelezen (${[...files].join(', ')}) maar geen enkele padsituatie maakt hem`);
}
for (const k of Object.keys(ZONDER_KNOP)) {
  if (!used.has(k)) { fails++; console.log(`FAIL '${k}' staat in ZONDER_KNOP maar wordt niet meer gelezen: haal hem weg`); }
  if (reachable.has(k) && k !== 'h') { fails++; console.log(`FAIL '${k}' heeft inmiddels wel een knop: haal hem uit ZONDER_KNOP`); }
}
if (fails) { console.log(`${fails} bevindingen`); process.exit(1); }
console.log(`pad_input_audit: ${used.size} toetsen gelezen, allemaal met knop of reden`);
