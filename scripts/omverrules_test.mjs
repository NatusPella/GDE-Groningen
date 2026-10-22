// Omverrijden (#392): punten op de stuntavond, een paar euro in de stad, en nooit iets voor of tegen mensen.
//   node scripts/omverrules_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as R from '../game/js/omverrules.js';

const JS = fileURLToPath(new URL('../game/js/', import.meta.url));
const bron = (f) => fs.readFileSync(JS + f, 'utf8');
let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };

t('elke soort met stuntpunten bestaat als prop (of is een eigen stuntprop), met een woord en punten', () => {
  const defaults = bron('breakables.js').match(/export const PROP_DEFAULTS = \{([\s\S]*?)\n\};/)[1];
  for (const [kind, s] of Object.entries(R.STUNT_PUNTEN)) {
    assert.ok(defaults.split('\n').some((l) => l.trim().startsWith(kind + ':')) || kind === 'stoepbord', `${kind} is geen prop`);
    assert.ok(Number.isInteger(s.pts) && s.pts >= 20 && s.pts <= 200 && /^[a-zé]+$/.test(s.label), kind);
  }
  for (const kind of ['bin', 'bike', 'bench', 'table', 'chair', 'parasol', 'stoepbord']) assert.ok(R.stuntPunten(kind), `${kind} geeft punten`);
});

t('wat de politie op je dak haalt of geen stuntspul is geeft niets', () => {
  for (const kind of ['flitspaal', 'tree', 'vangrail', 'onbekend', '', undefined]) assert.equal(R.stuntPunten(kind), null, String(kind));
  for (const kind of Object.keys(R.OMVER_EURO)) assert.ok(R.STUNT_PUNTEN[kind], `${kind}: geld in de stad hoort ook bij een stuntspul`);
});

t('geld in de stad: een paar euro per ding', () => {
  const s = R.nieuweOmverStand();
  assert.equal(R.omverEuro(s, 'bin', 10), 1);
  assert.equal(R.omverEuro(s, 'bench', 11), 3);
  assert.equal(R.omverEuro(s, 'lamp', 12), 0, 'een lantaarn levert in de stad niets op');
  assert.equal(R.omverEuro(s, 'flitspaal', 12), 0);
  assert.equal(R.omverEuro(s, 'bin', NaN), 0);
});

t('geld in de stad: hooguit 25 euro per tien minuten, daarna weer ruimte', () => {
  const s = R.nieuweOmverStand();
  let som = 0;
  for (let i = 0; i < 100; i++) som += R.omverEuro(s, 'bench', 100 + i);
  assert.equal(som, R.MAX_EURO, 'de bovengrens houdt');
  assert.equal(R.omverEuro(s, 'bin', 300), 0, 'binnen het venster niets meer');
  assert.equal(R.omverEuro(s, 'bin', 100 + R.VENSTER_S + 5), 1, 'na het venster weer');
  // het laatste stuk past precies: 25 = 8 x 3 + 1
  const s2 = R.nieuweOmverStand();
  const rij = Array.from({ length: 9 }, (_, i) => R.omverEuro(s2, 'bench', i));
  assert.deepEqual(rij, [3, 3, 3, 3, 3, 3, 3, 3, 1]);
});

t('het uurloon uit omverrijden blijft klein', () => {
  assert.ok(R.MAX_EURO * (3600 / R.VENSTER_S) <= 150, 'hooguit 150 euro per uur');
});

t('de stuntavond trekt geen punten meer af voor mensen, en de uitleg is kort', () => {
  const s = bron('stuntavond.js');
  assert.ok(!/HIT_COST|lastPedHitAt|iemand geraakt|Strafpunten|R\.score\s*=\s*Math\.max\(0, R\.score -/.test(s), 'geen aftrek meer');
  assert.ok(/onPropBreak\(/.test(s) && /stuntPunten\(/.test(s), 'losse dingen op het plein tellen mee');
  const h = bron('stunthud.js');
  assert.ok(!/Iemand raken/.test(h) && /BRIEF_TIME = [1-6];/.test(h), 'korte uitleg');
  const brief = h.match(/e\.brief\.innerHTML = ([\s\S]*?);\n/)[1];
  const woorden = brief.replace(/\$\{[^}]*\}/g, ' x ').replace(/<[^>]*>/g, ' ').replace(/['"`+]/g, ' ').split(/\s+/).filter(Boolean).length;
  assert.ok(woorden <= 40, `de uitleg telt ${woorden} woorden`);
  const m = bron('missions.js');
  assert.ok(!/niemand raken/.test(m) && !/Mensen geraakt/.test(m), 'de missietekst zegt geen niemand raken meer');
});

t('omverrijden in de stad: alleen met een voertuig, nooit in een missie, bijbaan of de stuntavond, en niet voor een gast', () => {
  const s = bron('omverrijden.js');
  assert.ok(/hit\.byPlayer/.test(s) && /hit\.heavy/.test(s) && /stuntStatus\(\)/.test(s) && /mission\.phase === 'active'/.test(s) && /sideJob\.active/.test(s) && /coopRole === 'client'/.test(s));
  assert.ok(/initOmverrijden\(world\)/.test(bron('main.js')));
  assert.ok(/for \(const f of breakListeners\)/.test(bron('breakables.js')) && /heavy: mc/.test(bron('breakables.js')), 'de luisteraar krijgt de botsing met het voertuig');
});

console.log(`omverrules_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
