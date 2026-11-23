// Pauzemenu: een onderdeel dat nog op slot zit (featurereveal.js) via code openen crasht niet meer (hertest 24-11).
// Visboek en Land en bedrijf in een nieuw spel gaven "sectionOf is not a function or its return value is not iterable": de terugval
// was HOME ('overzicht'), en dat is geen sectie. Deze test haalt SECTIONS en resolveSection uit de bron en draait ze puur.
//   node scripts/pauzemenu_slot_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pm = fs.readFileSync(path.join(root, 'game/js/pausemenu.js'), 'utf8');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL ' + name + (info ? ' :: ' + info : '')); } };

const sections = pm.match(/const SECTIONS = \[[\s\S]*?\n\];/)[0];
const note = pm.match(/export const NOT_YET_NOTE = [^\n]+/)[0].replace('export ', '');
const fn = pm.match(/export function resolveSection\([\s\S]*?\n\}/)[0].replace('export ', '');
const sectionOf = (SECTIONS) => (id) => SECTIONS.find(([s]) => s === id);
// eslint-disable-next-line no-new-func
const mod = new Function(`${sections}\n${note}\n${fn}\nreturn { SECTIONS, NOT_YET_NOTE, resolveSection };`)();
const { SECTIONS, NOT_YET_NOTE, resolveSection } = mod;
const of = sectionOf(SECTIONS);

const nieuwSpel = ['spel', 'verhaal', 'todo', 'loopbaan', 'map', 'spullen', 'garage', 'veroverd', 'prestaties', 'fotos', 'settings', 'over', 'controls'];
for (const id of ['visboek', 'boerderij', 'voetbal']) {
  const r = resolveSection(id, nieuwSpel, false);
  ok(r.name === 'spel' && r.sub === 'overzicht', `${id} op slot valt terug op Spel > Overzicht`, JSON.stringify(r));
  ok(r.locked === true, `${id} op slot krijgt de nog-niet-beschikbaar-regel`);
  ok(!!of(r.name), `${id}: de terugval is een echte sectie (sectionOf geeft iets)`);
}
const onbekend = resolveSection('bestaatniet', nieuwSpel, false);
ok(onbekend.name === 'spel' && !onbekend.locked, 'een onbekende naam valt stil terug op Spel');
ok(resolveSection('visboek', ['spel', 'visboek'], false).name === 'visboek', 'een open onderdeel opent gewoon');
ok(resolveSection('visboek', ['spel', 'settings', 'controls'], true).name === 'settings', 'in het hoofdmenu valt het terug op Instellingen');
ok(!/Visboek|Land en bedrijf|Voetbal/.test(NOT_YET_NOTE), 'de regel noemt het verborgen onderdeel niet (geen spoiler)');
ok(/resolveSection\(name, ids, !!prestart\)/.test(pm), 'showTab gebruikt resolveSection');
ok(!/name = prestart \? 'settings' : HOME/.test(pm), 'de oude terugval op HOME is weg');
ok(/sectionOf\(name\) \|\| sectionOf\('spel'\)/.test(pm), 'de kop crasht niet als een sectie ontbreekt');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
