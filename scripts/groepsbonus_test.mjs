// 1+1=3 (#492): meer spelers, meer loon per persoon. Puur en deterministisch.
//   node scripts/groepsbonus_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as G from '../game/js/groepsbonus.js';

let n = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { console.log('FAIL', naam, '\n  ', e.message); process.exitCode = 1; } };

t('de factor groeit per deelnemer en stopt op 3x', () => {
  assert.equal(G.groepsbonus(1), 1);
  assert.equal(G.groepsbonus(2), 1.5);   // 1+1=3: twee spelers, elk 1,5x
  assert.equal(G.groepsbonus(3), 2);
  assert.equal(G.groepsbonus(4), 2.5);
  assert.equal(G.groepsbonus(5), 3);
  assert.equal(G.groepsbonus(10), 3);
  assert.equal(G.groepsbonus(999), 3);
});

t('geen deelnemer of rare invoer telt als één', () => {
  assert.equal(G.groepsbonus(0), 1);
  assert.equal(G.groepsbonus(-4), 1);
  assert.equal(G.groepsbonus('2'), 1.5);
  assert.equal(G.groepsbonus(2.9), 1.5);
  assert.equal(G.groepsbonus(NaN), 1);
});

t('het bedrag is in hele euro\'s en nooit negatief', () => {
  assert.equal(G.metGroepsbonus(100, 1), 100);
  assert.equal(G.metGroepsbonus(100, 2), 150);
  assert.equal(G.metGroepsbonus(100, 3), 200);
  assert.equal(G.metGroepsbonus(101, 2), 152);
  assert.equal(G.metGroepsbonus(0, 4), 0);
  assert.equal(G.metGroepsbonus(-50, 4), 0);
  assert.equal(G.metGroepsbonus('100', 2), 150);
  assert.equal(G.metGroepsbonus(NaN, 2), 0);
});

t('twee spelers leveren samen drie keer het solobedrag op', () => {
  const solo = G.metGroepsbonus(100, 1);
  const twee = G.metGroepsbonus(100, 2);
  assert.equal(solo + solo, 200);
  assert.equal(twee * 2, 300, '1+1=3');
  assert.ok(twee > solo, 'elk persoon krijgt meer');
});

t('de regel is puur en heeft geen invoer van buiten', () => {
  assert.equal(G.groepsbonus(2), G.groepsbonus(2));
  assert.equal(typeof G.GROEPSBONUS_PER_SPELER, 'number');
  assert.ok(G.GROEPSBONUS_MAX >= 1);
});

// #685: de beloning zichtbaar splitsen: basis, groep en (als die er is) het eigen niveau er apart bij
t('#685: de uitslag splitst basis, groepsfactor en het eigen niveau', () => {
  const d = G.bonusDelen(80, 2, 120, 0.1);
  assert.equal(d.basis, 80);
  assert.equal(d.factor, 1.5);
  assert.equal(d.totaal, 120);
  assert.match(d.tekst, /basis €80/);
  assert.match(d.tekst, /jouw niveau \+10%/);
  assert.match(d.tekst, /groep x1,5/);
  assert.match(d.tekst, /totaal €120/);
  // zonder niveau-factor geen loos "niveau"-deel; het totaal valt terug op de groepsregel
  const z = G.bonusDelen(100, 3);
  assert.equal(z.totaal, 200);
  assert.doesNotMatch(z.tekst, /niveau/);
  const solo = G.bonusDelen(50, 1);
  assert.equal(solo.totaal, 50);
  assert.match(solo.tekst, /groep x1,0/);
  assert.match(G.GROEPSBONUS_UITLEG, /elke extra speler geeft iedereen 50% meer/);
  assert.match(G.GROEPSBONUS_UITLEG, /tot 3/);
});

t('#685: sidejobs, missies en het netwerk gebruiken dezelfde uitsplitsing', () => {
  const read = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
  const side = read('sidejobs.js');
  assert.match(side, /bonusDelen\(pay \+ tip, aantal, total/);
  assert.match(side, /GROEPSBONUS_UITLEG/);
  assert.match(side, /groepsbonusUitleg/);
  const missions = read('missions.js');
  assert.match(missions, /world\.coopDeel\(reward, \{ groepsbasis: rewardRuw, groepsn: aantal \}\)/);
  assert.match(missions, /bonusDelen\(rewardRuw, aantal, reward\)/);
  const net = read('coopnet.js');
  assert.match(net, /bonusDelen\(gbasis, gn, betaald, eigen\)/);
  assert.match(net, /\.\.\.\(extra && Number\(extra\.basis\) > 0 \? \{ basis:/);
});

if (process.exitCode) console.log(`groepsbonus_test: ${n} tests, mislukt`);
else console.log(`groepsbonus_test: ${n}/${n} ok`);
