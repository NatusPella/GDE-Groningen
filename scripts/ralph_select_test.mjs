// Tests voor de issue-kiezer van de Ralph-loop (ralph/select.mjs).
//   node scripts/ralph_select_test.mjs
import assert from 'node:assert/strict';
import { pick, score, bouwRegels, leesToml } from '../ralph/select.mjs';

let n = 0;
const test = (naam, fn) => {
  fn();
  n += 1;
  console.log(`ok ${n} - ${naam}`);
};

const L = (...namen) => namen.map((name) => ({ name }));
const issue = (number, ...labels) => ({ number, title: `#${number}`, labels: L(...labels) });

const GDE = bouwRegels({
  eerste: ['bug', 'wens'],
  impact: { 'impact-zeer-hoog': 4, 'impact-hoog': 3, 'impact-midden': 2, 'impact-laag': 1 },
  kosten: { 'kosten-S': 3, 'kosten-M': 2, 'kosten-L': 1 },
  geparkeerd: ['eigenaar', 'wacht-beeld', 'vraag-eigenaar', 'dependencies'],
  ongelabeld: 'laagst',
});

test('bug gaat voor wens', () => {
  const gekozen = pick([issue(1, 'wens'), issue(2, 'bug')], new Set(), GDE);
  assert.equal(gekozen.number, 2);
});

test('binnen dezelfde soort wint hoge impact, dan lage kosten', () => {
  const bord = [
    issue(1, 'bug', 'impact-laag', 'kosten-S'),
    issue(2, 'bug', 'impact-hoog', 'kosten-L'),
    issue(3, 'bug', 'impact-hoog', 'kosten-S'),
  ];
  assert.equal(pick(bord, new Set(), GDE).number, 3);
});

test('geparkeerd werk wordt nooit gekozen', () => {
  const bord = [issue(1, 'bug', 'eigenaar'), issue(2, 'bug', 'vraag-eigenaar')];
  assert.equal(pick(bord, new Set(), GDE), null);
});

test('geclaimd werk (assignee) wordt overgeslagen', () => {
  const bord = [issue(1, 'bug'), { ...issue(2, 'bug'), assignees: [{ login: 'iemand' }] }];
  assert.equal(pick(bord, new Set(), GDE).number, 1);
  assert.equal(pick([{ ...issue(1, 'bug'), assignees: [{ login: 'x' }] }], new Set(), GDE), null);
});

test('skip-lijst wordt gerespecteerd', () => {
  assert.equal(pick([issue(1, 'bug'), issue(2, 'bug')], new Set([1]), GDE).number, 2);
});

test('ongelabeld werk is kiesbaar maar altijd als laatste', () => {
  const bord = [issue(1), issue(2, 'wens', 'impact-laag', 'kosten-L')];
  assert.equal(pick(bord, new Set(), GDE).number, 2);
});

test('ongelabeld werk wordt gekozen als er niets beters is', () => {
  const bord = [issue(7), issue(8)];
  assert.equal(pick(bord, new Set(), GDE).number, 7);
});

test('ongelabeld = uit maakt werk onsamend kiesbaar', () => {
  const uit = bouwRegels({ eerste: ['bug'], geparkeerd: [], ongelabeld: 'uit' });
  assert.equal(pick([issue(1)], new Set(), uit), null);
  assert.equal(pick([issue(1, 'bug')], new Set(), uit).number, 1);
});

test('score onderscheidt ongelabeld van geparkeerd', () => {
  assert.equal(score(issue(1), GDE), 1);
  assert.equal(score(issue(2, 'eigenaar'), GDE), null);
  assert.ok(score(issue(3, 'bug'), GDE) > score(issue(4, 'wens'), GDE));
});

// De kern van de rotatie: na een gesloten issue blijft de loop niet op hetzelfde
// laagste nummer hangen. Zonder cursor pakt hij altijd #1, met cursor schuift hij op.
test('bij gelijke score schuift de keuze op na het vorige issue', () => {
  const bord = [1, 2, 3, 4].map((nr) => issue(nr, 'bug', 'impact-midden', 'kosten-M'));
  assert.equal(pick(bord, new Set(), GDE).number, 1);
  assert.equal(pick(bord, new Set(), GDE, 1).number, 2);
  assert.equal(pick(bord, new Set(), GDE, 2).number, 3);
});

test('na het laatste issue wikkelt de rotatie terug naar het begin', () => {
  const bord = [1, 2, 3].map((nr) => issue(nr, 'bug'));
  assert.equal(pick(bord, new Set(), GDE, 3).number, 1);
  assert.equal(pick(bord, new Set(), GDE, 99).number, 1);
});

test('de cursor verandert de prioriteit niet, alleen de volgorde binnen een gelijke score', () => {
  const bord = [issue(1, 'bug', 'impact-laag'), issue(5, 'bug', 'impact-zeer-hoog')];
  assert.equal(pick(bord, new Set(), GDE, 1).number, 5);
});

test('een gesloten vorig issue laat de rest van het bord aan bod komen', () => {
  // Simuleert tien ticks op een bord met tien gelijk scorende bugs waarvan het
  // laatst gekozen issue steeds verdwijnt (gesloten na een merge).
  let bord = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((nr) => issue(nr, 'bug'));
  const gezien = [];
  let vorige = 0;
  for (let i = 0; i < 10; i += 1) {
    const gekozen = pick(bord, new Set(), GDE, vorige);
    gezien.push(gekozen.number);
    bord = bord.filter((x) => x.number !== gekozen.number);
    vorige = gekozen.number;
  }
  assert.deepEqual(gezien, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('twee projecten met eigen labels kiezen onafhankelijk', () => {
  const wombord = [issue(1, 'epic'), issue(2), issue(3, 'enhancement')];
  const cfg = leesToml(`
repo = "NatusPella/wom"
eerste = ["bug", "enhancement", "good first issue", "help wanted", "epic"]
geparkeerd = ["question", "wontfix"]
ongelabeld = "laagst"
`);
  const wom = bouwRegels(cfg);
  assert.equal(pick(wombord, new Set(), wom).number, 3, 'enhancement gaat voor epic');
  assert.equal(pick([issue(1, 'question')], new Set(), wom), null);
  assert.equal(pick([issue(1)], new Set(), wom).number, 1, 'ongelabeld blijft kiesbaar');
});

test('een leeg bord levert niets op', () => {
  assert.equal(pick([], new Set(), GDE), null);
});

test('TOMLezer leest lijsten, strings, getallen en commentaar', () => {
  const cfg = leesToml(`
# commentaar
repo = "NatusPella/GDE-Groningen"   # ook commentaar
project_number = 5
eerste = ["bug", "wens"]
`);
  assert.equal(cfg.repo, 'NatusPella/GDE-Groningen');
  assert.equal(cfg.project_number, 5);
  assert.deepEqual(cfg.eerste, ['bug', 'wens']);
});

console.log(`OK ralph_select_test (${n} tests)`);
// BroadcastChannel-achtige handles houden de event-loop anders open; expliciet stoppen.
process.exit(0);
