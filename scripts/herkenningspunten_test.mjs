// #820: het herkenningspunten-album. Deze test bewaakt de gegenereerde data tegen landmarkkits.json,
// de pure albumregels (straal, stand per soort, dichtstbijzijnde open punt, melding) en de bedrading in
// de tracker en "Te doen".
//   node scripts/herkenningspunten_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HERKENNINGSPUNTEN, HERKENNINGSPUNTEN_TOTAAL } from '../game/js/herkenningspunten.js';
import * as A from '../game/js/herkenningsalbum.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const kits = JSON.parse(lees('game/landmarkkits.json'));
let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

t('#820: het databestand is precies uit landmarkkits.json gegenereerd (583 punten, één bron)', async () => {
  const G = await import('./gen_herkenningspunten.mjs');
  const verwacht = G.bouwPunten(kits);
  assert.equal(verwacht.length, 583);
  assert.equal(HERKENNINGSPUNTEN_TOTAAL, 583);
  assert.deepEqual(HERKENNINGSPUNTEN, verwacht);
  assert.equal(new Set(HERKENNINGSPUNTEN.map((p) => p.id)).size, 583, 'elke id is uniek');
  const per = {};
  for (const p of HERKENNINGSPUNTEN) per[p.soort] = (per[p.soort] || 0) + 1;
  assert.deepEqual(per, { castle: 23, chapel: 3, church: 353, mill: 96, tower: 10, watertower: 1, factory: 40, farm: 2, flat: 3, lighthouse: 2, museum: 5, school: 23, station: 22 });
  assert.equal(G.genereer(kits), lees('game/js/herkenningspunten.js'), 'het bestand loopt niet achter; draai gen_herkenningspunten.mjs');
});

t('#820: de albumregels: binnen de straal, stand per soort en het dichtstbijzijnde open punt', () => {
  const punten = [
    { id: 'a', naam: 'Kerk A', x: 0, y: 0, soort: 'church' },
    { id: 'b', naam: 'Molen B', x: 30, y: 0, soort: 'mill' },
    { id: 'c', naam: 'Kerk C', x: 100, y: 0, soort: 'church' },
  ];
  const dichtbij = A.binnenStraal(punten, 0, 0, 40);
  assert.deepEqual(dichtbij.map((p) => p.id), ['a', 'b']);
  assert.equal(dichtbij[0].afstand, 0);
  const stand = A.albumStand(punten, new Set(['a']));
  assert.equal(stand.totaal, 3); assert.equal(stand.gezien, 1);
  const kerk = stand.perSoort.find((r) => r.soort === 'church');
  assert.deepEqual({ totaal: kerk.totaal, gezien: kerk.gezien, naam: kerk.naam, mv: kerk.meervoud }, { totaal: 2, gezien: 1, naam: 'kerk', mv: 'kerken' });
  const molen = stand.perSoort.find((r) => r.soort === 'mill');
  assert.equal(molen.gezien, 0);
  assert.equal(A.dichtstbijzijndeOpen(punten, new Set(['a']), 0, 0).id, 'b');
  assert.equal(A.dichtstbijzijndeOpen(punten, new Set(['a', 'b', 'c']), 0, 0), null);
  assert.deepEqual(A.ontdekkingen(punten, 0, 0, new Set(['a']), 40).map((p) => p.id), ['b']);
  assert.equal(A.melding(punten[0], stand), 'Herkenningspunt: Kerk A (kerk). 1 van 2 kerken gezien.');
  assert.match(A.melding(punten[1], stand), /\(molen\)\. 0 van 1 molens gezien\./);
});

t('#820: de tracker voegt een punt eenmalig toe en meldt de stand per soort', () => {
  const tracker = lees('game/js/achievementtracker.js');
  assert.match(tracker, /from '\.\/herkenningspunten\.js'/);
  assert.match(tracker, /from '\.\/herkenningsalbum\.js'/);
  assert.match(tracker, /ontdekkingen\(HERKENNINGSPUNTEN, p\.x, p\.y, \(id\) => hasUnique\('herkenningspunten', id\), LANDMARK_RADIUS\)/);
  assert.match(tracker, /recordUnique\(w, 'herkenningspunten', punt\.id\)/);
  assert.match(tracker, /w\.addMessage\(melding\(punt, stand\)/);
  assert.match(tracker, /const LANDMARK_RADIUS = 70;/);
});

t('#820: "Te doen" toont de stand en een route naar het dichtstbijzijnde open punt', () => {
  const todo = lees('game/js/todo.js');
  assert.match(todo, /HERKENNINGSPUNTEN_TOTAAL/);
  assert.match(todo, /albumStand\(HERKENNINGSPUNTEN, gezien\)/);
  assert.match(todo, /dichtstbijzijndeOpen\(HERKENNINGSPUNTEN, gezien, p\.x, p\.y\)/);
  assert.match(todo, /key: 'col:herkenningspunten'/);
  assert.match(todo, /record: `\$\{stand\.gezien\} van \$\{HERKENNINGSPUNTEN_TOTAAL\} gezien`/);
  assert.match(todo, /goal: open \? \{ kind: 'place'/, 'de route is een gewoon kaartdoel');
  assert.match(todo, /collectItems\(world\)/, 'de teller hoort bij de speler die voor het scherm zit');
});

t('#820: de uitleg staat in docs en in de docs-index', () => {
  const doc = lees('docs/HERKENNINGSPUNTEN.md');
  assert.match(doc, /583/);
  assert.match(doc, /zeventig meter/);
  assert.match(doc, /per speler/);
  assert.match(lees('docs/README.md'), /HERKENNINGSPUNTEN\.md/);
});

console.log(`herkenningspunten_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
