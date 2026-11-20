// Pure side of the context hints and the help overview (game/js/hintkit.js, helpoverview.js, #201):
//   node scripts/hintkit_test.mjs
import * as K from '../game/js/hintkit.js';
import { HELP_TOPICS, helpHtml, helpPlain } from '../game/js/helpoverview.js';
import { KEYS } from '../game/js/storagekeys.js';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

// vehicle kinds
ok(K.vehicleKind(null) === null, 'no vehicle, no kind');
ok(K.vehicleKind({ isHeli: true, isBoat: true }) === 'heli', 'heli wins');
ok(K.vehicleKind({ isBike: true }) === 'fiets' && K.vehicleKind({ isBike: true, model: { fat: true } }) === 'fatbike', 'bike and fatbike');
ok(K.vehicleKind({ isScooter: true }) === 'scooter' && K.vehicleKind({ isBoat: true }) === 'boot' && K.vehicleKind({ isBus: true }) === 'bus', 'scooter, boat, bus');
ok(K.vehicleKind({ model: { name: 'sedan' } }) === 'auto' && K.vehicleKind({ model: { motorbike: true } }) === 'motor', 'car and motorbike');

// table
const ids = K.HINTS.map((h) => h.id);
ok(new Set(ids).size === ids.length, 'hint ids are unique');
for (const h of K.HINTS) {
  ok(h.title && h.body && /^[A-Za-z]/.test(h.title) && h.body.length < 220, h.id + ' has short text', String(h.body.length));
  ok(!/\b(the|and|press)\b/i.test(h.body), h.id + ' is Dutch');
  ok([...h.body.matchAll(/\{(\w+)\}/g)].every((m) => /^[A-Z]+$/.test(m[1])), h.id + ' tokens are keys');
}
ok(K.HINTS.some((h) => h.kind === 'vehicle' && h.match === 'auto') && K.HINTS.filter((h) => h.kind === 'minigame').length >= 8, 'cars and minigames are covered');

// picking
const car = { vehicle: 'auto', minigame: null, wanted: 0, dead: false, paused: false };
const late = { playT: 2000, lastAt: -Infinity, inT: 5 };
ok(K.pickHint(car, new Set(), late).id === 'v-auto', 'a car gets its hint');
ok(K.pickHint(car, new Set(['v-auto']), late) === null, 'seen hints do not come back');
ok(K.pickHint({ ...car, vehicle: null }, new Set(), late) === null, 'on foot: nothing');
ok(K.pickHint({ ...car, vehicle: null, minigame: 'kartbaan' }, new Set(), late).id === 'm-kartbaan', 'a minigame gets its hint');
ok(K.pickHint(car, new Set(), { ...late, inT: 1 }) === null, 'not before you have settled in');
ok(K.pickHint(car, new Set(), late, { enabled: false }) === null, 'off by the setting');
ok(K.pickHint(car, new Set(), late, { busy: true }) === null, 'not while something else has the player');
ok(K.pickHint({ ...car, wanted: 2 }, new Set(), late) === null && K.pickHint({ ...car, dead: true }, new Set(), late) === null && K.pickHint({ ...car, paused: true }, new Set(), late) === null, 'not while wanted, dead or paused');
// calm first ten minutes: nothing in the first two minutes, then a longer gap
ok(K.pickHint(car, new Set(), { playT: 60, lastAt: -Infinity, inT: 5 }) === null, 'first two minutes are quiet');
ok(K.pickHint(car, new Set(), { playT: 200, lastAt: -Infinity, inT: 5 }) !== null, 'after two minutes a hint may come');
ok(K.pickHint(car, new Set(), { playT: 200, lastAt: 150, inT: 5 }) === null, 'calm gap between hints is long');
ok(K.pickHint(car, new Set(), { playT: 2000, lastAt: 1980, inT: 5 }) === null && K.pickHint(car, new Set(), { playT: 2000, lastAt: 1950, inT: 5 }) !== null, 'normal gap is shorter');
ok(K.GAP_CALM > K.GAP && K.CALM_UNTIL === 600, 'calm numbers');
// one at a time: after showing one, the same hint never repeats and the next kind can follow later
{
  const seen = new Set();
  const a = K.pickHint(car, seen, late); seen.add(a.id);
  const b = K.pickHint({ ...car, vehicle: 'fiets' }, seen, late);
  ok(a.id !== b.id, 'different vehicle, different hint');
}

// seen storage
ok(K.parseSeen('["v-auto","onzin",5]').size === 1 && K.parseSeen('kapot').size === 0 && K.parseSeen('{}').size === 0 && K.parseSeen(null).size === 0, 'stored ids are cleaned');
ok(K.parseSeen(K.serializeSeen(new Set(['v-auto', 'm-kermis']))).size === 2, 'seen round-trips');
ok(KEYS.hintsGezien === 'gde-hints-gezien', 'storage key registered');

// help overview
ok(HELP_TOPICS.length >= 6 && new Set(HELP_TOPICS.map((t) => t.id)).size === HELP_TOPICS.length, 'help topics');
const html = helpHtml((t) => `<kbd>${t}</kbd>`, (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;'));
ok(html.includes('<kbd>E</kbd>') && html.includes('<kbd>ESC</kbd>') && !html.includes('{'), 'help tokens become keys');
ok(helpPlain().includes('Activiteiten') && !/[{}]/.test(helpPlain()), 'help text mentions Activiteiten, plain text has no tokens');
ok(HELP_TOPICS.every((t) => t.lines.every((l) => !/\b(the|and|press)\b/i.test(l))), 'help is Dutch');

// Review 0.62: de hulp wijst naar de plekken zoals ze sinds de instellingenronde zijn. De
// oude paden (Interface › Meer opties, Spel › Overzicht met de volumes, Spel › Spelen) bestaan
// niet meer en stuurden de speler naar een tab zonder de genoemde optie.
{
  const fs = await import('node:fs');
  const pm = fs.readFileSync(new URL('../game/js/pausemenu.js', import.meta.url), 'utf8');
  const plain = helpPlain();
  ok(!/Interface › Meer opties/.test(plain), 'Hulp: Interface heeft geen "Meer opties" meer');
  ok(!/Spel › Overzicht staat het ook bij de volumes/.test(plain), 'Hulp: de volumes staan niet meer op Spel › Overzicht');
  ok(!/pauzemenu › Spel › Spelen|Spel › Spelen/.test(plain + fs.readFileSync(new URL('../game/js/credits.js', import.meta.url), 'utf8')), 'Hulp en credits: de Spelen-subtab bestaat niet meer');
  ok(/Instellingen › Spel/.test(plain) && /Instellingen › Hints & uitleg/.test(plain) && /Instellingen › Geluid & ondertitels/.test(plain), 'Hulp noemt de nieuwe plekken van de shift-klik, de uitleg en de volumes');
  ok(/Spel › Overzicht heeft "Vastgelopen\? Zet me vrij"/.test(plain), 'Hulp noemt Spel › Overzicht bij Vastgelopen');
  // elke "Spel › X" in de hulp is een bestaand tabblad van Spel
  const subBlock = pm.slice(pm.indexOf('const SUBTABS = {'), pm.indexOf('// old tab names'));
  const spelRegel = subBlock.split('\n').find((l) => l.trim().startsWith('spel: [')) || '';
  const spelTabs = [...spelRegel.matchAll(/\['\w+', '([^']+)'\]/g)].map((m) => m[1]);
  const genoemd = [...plain.matchAll(/Spel › /g)].map((m) => spelTabs.slice().sort((a, b) => b.length - a.length).find((t) => plain.startsWith(t, m.index + m[0].length)));
  ok(genoemd.length > 0 && genoemd.every(Boolean), 'Hulp: elk genoemd Spel-tabblad bestaat', genoemd.join('|'));
}
// Samen-spelen-kaarten: een gast draait de onboarding niet, dus hij krijgt zijn eigen uitleg; één kaart tegelijk, elk één keer
{
  const gast = { rol: 'gast', spelers: 2, dead: false, paused: false, wanted: 0 };
  const host = { ...gast, rol: 'host' };
  const klok = { sessieT: 20, sinds: 100 };
  ok(K.pickSamenHint(gast, new Set(), klok).id === 'x-samen-gast', 'een gast krijgt zijn rolkaart');
  ok(K.pickSamenHint(host, new Set(), klok).id === 'x-samen-host', 'de host krijgt zijn rolkaart');
  ok(K.pickSamenHint({ ...gast, spelers: 1 }, new Set(), klok) === null && K.pickSamenHint({ ...gast, rol: null }, new Set(), klok) === null, 'alleen met anderen en alleen als host of gast');
  ok(K.pickSamenHint(gast, new Set(), { sessieT: 3, sinds: 100 }) === null, 'pas als de verbinding even staat');
  ok(K.pickSamenHint(gast, new Set(), { sessieT: 20, sinds: 10 }) === null, 'niet vlak na een andere kaart');
  ok(K.pickSamenHint(gast, new Set(['x-samen-gast']), { sessieT: 30, sinds: 100 }) === null, 'de roepjes pas na anderhalve minuut');
  ok(K.pickSamenHint(gast, new Set(['x-samen-gast']), { sessieT: 95, sinds: 100 }).id === 'x-samen-roep', 'daarna de roepjes');
  ok(K.pickSamenHint(gast, new Set(['x-samen-gast', 'x-samen-roep']), { sessieT: 999, sinds: 999 }) === null, 'elke kaart één keer');
  ok(K.pickSamenHint({ ...gast, wanted: 2 }, new Set(), klok) === null && K.pickSamenHint({ ...gast, paused: true }, new Set(), klok) === null && K.pickSamenHint(gast, new Set(), klok, { enabled: false }) === null, 'niet bij politie, pauze of uitgezette uitleg');
  ok(K.pickHint({ vehicle: 'auto', minigame: null, wanted: 0, dead: false, paused: false }, new Set(['v-auto']), late) === null, 'samen-kaarten komen niet via de voertuigroute');
  ok(K.parseSeen(K.serializeSeen(new Set(['x-samen-gast']))).has('x-samen-gast'), 'de gezien-lijst bewaart een samen-kaart');
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../game/js/contexthints.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../game/js/coophud.js', import.meta.url), 'utf8');
  ok(/updateSamenHints[(]world[)]/.test(src) && /pickSamenHint/.test(src), 'coophud roept de samen-kaarten aan, voor host én gast');
}
console.log(fails ? `${fails} of ${n} failed` : `hintkit_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
