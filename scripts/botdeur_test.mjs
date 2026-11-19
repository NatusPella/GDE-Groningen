// #955: de bot liep bij M09 naar de neus van Geesjes trekker en drukte 258 keer E, want een trekker laat je alleen bij een deur
// in (#459, vehicledoors.js). board.mjs loopt nu naar het instappunt van de deur en drukt daar pas E.
//   node scripts/botdeur_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
const Bd = await import('./bot/board.mjs');
const DR = await import('../game/js/vehicledoors.js');
const E = await import('../game/js/vehicle/enter.js');
let n = 0;
const t = (naam, f) => { n++; try { f(); } catch (e) { console.log('FAIL', naam, '\n  ', String(e.message).split('\n')[0]); process.exitCode = 1; } };

// Geesjes trekker uit de proefrun: halfLen 2,15, halfWid 1,15, model 'tractor'; hier met de neus naar +x
const trekker = () => ({ x: 100, y: 200, angle: 0, halfLen: 2.15, halfWid: 1.15, kind: 'auto', model: { name: 'tractor', len: 4.3, wid: 2.3 } });
const stap = (v, p, mem, now = 0) => Bd.boardStep({ player: { x: p.x, y: p.y, speed: 0, vehicle: null }, vehicle: v, target: { x: v.x, y: v.y }, deur: (kant) => Bd.deurPunt(v, p, DR, kant) }, mem, now);

t('de neus van de trekker is "bij" de romp volgens het spel, maar geen deur', () => {
  const v = trekker(), p = { x: v.x + v.halfLen + 0.5, y: v.y };
  assert.ok(E.distToVehicleBody(v, p.x, p.y) <= E.ENTER_REACH, 'binnen ENTER_REACH van de romp');
  assert.equal(DR.bijInstapdeur(v, p.x, p.y), false, 'maar niet bij een deur');
  const d = Bd.deurPunt(v, p, DR);
  assert.equal(d.ok, false);
});

t('aan de neus drukt de bot geen E maar loopt naar het instappunt van de deur', () => {
  const v = trekker(), mem = {};
  const s = stap(v, { x: v.x + v.halfLen + 0.5, y: v.y + 0.2 }, mem);
  assert.equal(s.type, 'walk', JSON.stringify(s));
  assert.ok(DR.bijInstapdeur(v, s.to.x, s.to.y), 'het doel ligt bij een deur');
  assert.ok(Math.abs(s.to.y - v.y) > v.halfWid, 'naast de romp, niet erin');
});

t('de deur aan de kant van de bot: noord blijft noord, zuid blijft zuid', () => {
  const v = trekker();
  const noord = Bd.deurPunt(v, { x: v.x + 3, y: v.y - 3 }, DR), zuid = Bd.deurPunt(v, { x: v.x + 3, y: v.y + 3 }, DR);
  assert.ok(noord.to.y < v.y && zuid.to.y > v.y, `${noord.to.y} ${zuid.to.y}`);
});

t('bij het instappunt van de deur drukt hij E (enter)', () => {
  const v = trekker(), mem = {};
  const p = Bd.deurPunt(v, { x: v.x + 3, y: v.y + 3 }, DR).to;
  const s = stap(v, p, mem);
  assert.equal(s.type, 'enter', JSON.stringify(s));
});

t('een voertuig zonder deur (quad, scooter, fiets) werkt als voorheen: E binnen bereik', () => {
  const quad = { x: 100, y: 200, angle: 0, halfLen: 1.2, halfWid: 0.8, kind: 'quad', model: { name: 'quad', len: 2.4, wid: 1.6 } };
  assert.equal(Bd.deurPunt(quad, { x: 103, y: 200 }, DR), null);
  const s = Bd.boardStep({ player: { x: 102, y: 200, speed: 0, vehicle: null }, vehicle: quad, target: { x: 100, y: 200 }, deur: (k) => Bd.deurPunt(quad, { x: 102, y: 200 }, DR, k) }, {}, 0);
  assert.equal(s.type, 'enter');
});

t('zonder deur-functie (oude aanroepers, botlogic_test) blijft boardStep gelijk', () => {
  const v = trekker();
  const s = Bd.boardStep({ player: { x: v.x + v.halfLen + 0.5, y: v.y, speed: 0, vehicle: null }, vehicle: v, target: { x: v.x, y: v.y } }, {}, 0);
  assert.equal(s.type, 'enter');
});

t('bot.page.js geeft de deurfunctie door en drukt alleen E bij een deur', () => {
  const p = fs.readFileSync(new URL('./bot/bot.page.js', import.meta.url), 'utf8');
  assert.match(p, /const DR = await imp\('vehicledoors'\)/);
  assert.match(p, /deur: vObj \? \(kant\) => Bd\.deurPunt\(vObj,/);
  assert.match(p, /=== vObj && DR\.bijInstapdeur\(vObj, player\.x, player\.y\)/);
});

console.log(`botdeur_test: ${n} checks`);
process.exit(process.exitCode || 0);
