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
let keten = Promise.resolve();
const t = (name, f) => { n++; keten = keten.then(async () => { try { await f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } }); };

const G = await import('./gen_herkenningspunten.mjs');

t('#820: het databestand is precies uit landmarkkits.json gegenereerd (één bron, id = kit-index)', () => {
  const verwacht = G.bouwPunten(kits);
  assert.equal(HERKENNINGSPUNTEN_TOTAAL, verwacht.length);
  assert.ok(verwacht.length > 560 && verwacht.length < 583, `ontdubbeld en zonder vervuiling: ${verwacht.length}`);
  assert.deepEqual(HERKENNINGSPUNTEN, verwacht);
  assert.equal(new Set(HERKENNINGSPUNTEN.map((p) => p.id)).size, verwacht.length, 'elke id is uniek');
  const per = {};
  for (const p of HERKENNINGSPUNTEN) per[p.soort] = (per[p.soort] || 0) + 1;
  assert.deepEqual(per, { castle: 23, chapel: 3, church: 349, mill: 96, tower: 9, watertower: 1, factory: 37, farm: 2, flat: 3, lighthouse: 2, museum: 5, school: 23, station: 21 });
  assert.equal(G.genereer(kits), lees('game/js/herkenningspunten.js'), 'het bestand loopt niet achter; draai gen_herkenningspunten.mjs');
  // de id blijft de kit-index: een bewaard album wijst niet naar een ander punt
  const items = kits.items.filter((i) => typeof i.n === 'string' && i.n.trim());
  for (const p of HERKENNINGSPUNTEN) assert.equal(items[Number(p.id.split('-').pop()) - 1].k, p.soort, p.id);
});

t('#820: geen echte bedrijven of personen in de namen (constitutie 2)', () => {
  const WEIGER = /\b(B\.?V\.?|N\.?V\.?|RWE|Aviko|Rixona|Bollegraaf|Doornbos|Labor Pallet|Xafi|Aqua Clean|Kijf|H\.A\.|Engine2Repair|Kopland|Winkler|Bladergroen|Rutger|Feiko|Cock|Borema|Kikkoman|Stichting|Telson|Strating|Hessels|Simpro|Drenth|Architektron|Leger des Heils|Edama)\b|Recycling Solutions/;
  for (const p of HERKENNINGSPUNTEN) {
    assert.ok(!WEIGER.test(p.naam), `${p.id} ${p.naam}`);
    assert.ok(!G.BEDRIJFSVORM.test(p.naam), `bedrijfsvorm: ${p.naam}`);
  }
  const naam = (soort, id) => HERKENNINGSPUNTEN.find((p) => p.soort === soort && p.naam.startsWith(id));
  assert.ok(naam('factory', 'Aardappelfabriek bij '), 'een neutrale naam met soort en plaats');
  assert.ok(HERKENNINGSPUNTEN.some((p) => /^Basisschool te /.test(p.naam)), 'een school met een persoonsnaam kreeg soort en plaats');
  // dezelfde ingang door de vervanger: een B.V. en een persoon worden neutraal, een gewone naam blijft
  assert.equal(G.neutraleNaam('Acme Transport B.V.', 'factory'), 'Bedrijfspand');
  assert.equal(G.neutraleNaam('Prof. J. Jansen School', 'school'), 'School');
  assert.equal(G.neutraleNaam('Gemaal Rozema', 'factory'), null);
  assert.equal(G.neutraleNaam('Dollard College', 'school'), null);
});

t('#820: geen dubbelen en kale namen dragen hun plaats', () => {
  for (let i = 0; i < HERKENNINGSPUNTEN.length; i++) {
    for (let j = i + 1; j < HERKENNINGSPUNTEN.length; j++) {
      const a = HERKENNINGSPUNTEN[i], b = HERKENNINGSPUNTEN[j];
      assert.ok(a.naam !== b.naam || Math.hypot(a.x - b.x, a.y - b.y) > 30, `dubbel: ${a.naam}`);
    }
  }
  const namen = HERKENNINGSPUNTEN.map((p) => p.naam);
  assert.equal(new Set(namen).size, namen.length, 'ook verderop geen twee punten met dezelfde naam');
  assert.equal(HERKENNINGSPUNTEN.filter((p) => p.naam.startsWith('Martinitoren')).length, 1);
  assert.equal(HERKENNINGSPUNTEN.filter((p) => p.soort === 'station' && p.naam === 'Veendam').length, 1);
  for (const kaal of ['De Hoop', 'Elim', 'De Poort']) {
    assert.ok(!namen.includes(kaal), `"${kaal}" staat niet kaal in het album`);
    assert.ok(namen.some((n) => n.includes(kaal) && / te [A-Z]/.test(n)), `"${kaal}" heeft een plaats`);
  }
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

t('#820: 69 m van een punt telt, 71 m niet; elke speler en gast heeft een eigen album', async () => {
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const ach = await import('../game/js/achievements.js');
  const punt = HERKENNINGSPUNTEN.find((p) => p.soort === 'castle');
  // dezelfde lus als achievementtracker.js, met de echte opslagfuncties en de straal van de tracker
  const straal = Number(lees('game/js/achievementtracker.js').match(/const LANDMARK_RADIUS = (\d+);/)[1]);
  assert.equal(straal, 70);
  const loop = (x, y) => {
    for (const q of A.ontdekkingen(HERKENNINGSPUNTEN, x, y, (id) => ach.hasUnique('herkenningspunten', id), straal)) ach.recordUnique(null, 'herkenningspunten', q.id);
    return A.albumStand(HERKENNINGSPUNTEN, (id) => ach.hasUnique('herkenningspunten', id)).gezien;
  };
  assert.equal(loop(punt.x + 71, punt.y), 0, '71 m: nog niet in het album');
  assert.equal(loop(punt.x + 69, punt.y), 1, '69 m: in het album');
  assert.equal(loop(punt.x + 69, punt.y), 1, 'eenmalig: opnieuw langskomen telt niet dubbel');
  // elke speler (en elke gast) heeft zijn eigen gezien-set: het album van de een verandert dat van de ander niet
  const speler = new Set(), gast = new Set();
  for (const q of A.ontdekkingen(HERKENNINGSPUNTEN, punt.x, punt.y, speler, 70)) speler.add(q.id);
  assert.equal(A.albumStand(HERKENNINGSPUNTEN, speler).gezien, 1);
  assert.equal(A.albumStand(HERKENNINGSPUNTEN, gast).gezien, 0, 'de gast ziet zijn eigen lege album');
  assert.equal(A.ontdekkingen(HERKENNINGSPUNTEN, punt.x, punt.y, gast, 70).length, 1, 'de gast ontdekt hetzelfde punt zelf, ook al zag de speler het al');
  assert.equal(A.dichtstbijzijndeOpen(HERKENNINGSPUNTEN, speler, punt.x, punt.y).id !== punt.id, true, 'de route van de speler slaat het geziene punt over');
  assert.equal(A.dichtstbijzijndeOpen(HERKENNINGSPUNTEN, gast, punt.x, punt.y).id, punt.id, 'de route van de gast begint nog bij dit punt');
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
  assert.match(doc, /574/);
  assert.match(doc, /Geen echte bedrijven of personen/);
  assert.match(doc, /zeventig meter/);
  assert.match(doc, /per speler/);
  assert.match(lees('docs/README.md'), /HERKENNINGSPUNTEN\.md/);
});

await keten;
console.log(`herkenningspunten_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
