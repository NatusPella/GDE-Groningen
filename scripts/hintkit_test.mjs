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
console.log(fails ? `${fails} of ${n} failed` : `hintkit_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
