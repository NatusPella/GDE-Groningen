// Een safehouse botst alleen waar het getekend is (#434: een gast botste bij Hoogkerk tegen een onzichtbaar huisje midden op de weg).
// Drie regels, allemaal puur: de muren van een los huisje liggen precies op de doos die safehuizen.js tekent (huisMuren), het hele
// volume en de plek bij de deur blijven van de rijbaan (opRijwegDoos, huisVrij), en een gast-pand met de deur op de weg keurt de
// host af (gastPandVrij, home.js pandPlek). Een wandelaar boven de begane grond (de kamer van een pand, KAMER_FLOOR) botsen de
// gebouwen van de straat niet meer, ook op een kaart zonder hoogtemodel (collision.js resolveWalker).
//   node scripts/safehuisbotst_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
const { HX, HZ, DEUR_AFSTAND, huisMuren, opRijwegDoos, opRijweg, huisVrij, gastPandVrij, KAMER_FLOOR } = await import('../game/js/safehuisplek.js');
const { resolveWalker } = await import('../game/js/collision.js');

let n = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { console.log('FAIL', naam, '\n  ', e.message.split('\n')[0]); process.exitCode = 1; } };

const weg = (pts, width = 6, cat = 'normal') => ({ pts, width, cat });
const kaart = (roads = [], buildings = []) => ({
  roadsNear: (x, y, r) => roads.filter((r2) => r2.pts.some(([px, py]) => Math.hypot(px - x, py - y) <= r + 100)),
  buildingsNear: (x, y, r) => buildings.filter((b) => {
    const [x0, y0, x1, y1] = b.bounds;
    return x + r > x0 && x - r < x1 && y + r > y0 && y - r < y1;
  }),
  canWalkOut: () => true,
  roads,
});
const D = { isInWater: () => false, pointInPolygon: () => false, inPassage: () => false, landSolid: () => false, provinceLandAt: () => true };

t('de vier muren liggen precies op de doos van het huisje (HX diep, HZ breed)', () => {
  const muren = huisMuren(100, 50, 0.7);
  assert.equal(muren.length, 4);
  const fx = Math.cos(0.7), fy = Math.sin(0.7), rx = -fy, ry = fx;
  const binnen = (x, y) => {
    const dx = x - 100, dy = y - 50;
    return Math.abs(dx * fx + dy * fy) <= HX + 1e-9 && Math.abs(dx * rx + dy * ry) <= HZ + 1e-9;
  };
  for (const [mx, my, half, hoek] of muren) {
    // elk uiteinde van de muur ligt op de rand van de getekende doos, en het midden er middenin
    for (const s of [-1, 1]) {
      const ex = mx + Math.cos(hoek) * half * s, ey = my + Math.sin(hoek) * half * s;
      assert.ok(binnen(ex, ey), `uiteinde (${ex.toFixed(2)}, ${ey.toFixed(2)}) valt buiten de doos`);
    }
    assert.ok(binnen(mx, my));
  }
  // en de vier muren samen zijn de omtrek: elke hoek van de doos is een uiteinde van een muur
  const hoeken = [[HX, HZ], [HX, -HZ], [-HX, HZ], [-HX, -HZ]].map(([u, v]) => [100 + fx * u + rx * v, 50 + fy * u + ry * v]);
  const uiteinden = muren.flatMap(([mx, my, half, hoek]) => [-1, 1].map((s) => [mx + Math.cos(hoek) * half * s, my + Math.sin(hoek) * half * s]));
  for (const [hx, hy] of hoeken) assert.ok(uiteinden.some(([ex, ey]) => Math.hypot(ex - hx, ey - hy) < 1e-9), `hoek ${hx.toFixed(1)},${hy.toFixed(1)} ontbreekt`);
});

t('opRijwegDoos ziet een weg die tussen de steekproefpunten door loopt', () => {
  // een smalle weg met een bocht midden in het huisje: geen van de punten van huisVrij hoeft erop te vallen
  const bocht = weg([[12, 1.2], [1.2, 1.2], [1.2, 12]], 0.4);
  const map = kaart([bocht]);
  for (const [px, py] of [[0, 0], [HX, HZ], [HX, -HZ], [-HX, HZ], [-HX, -HZ], [0, HZ], [HX, 0]]) {
    assert.equal(opRijweg(map, px, py), false, `punt (${px}, ${py}) ligt ernaast`);
  }
  assert.equal(opRijwegDoos(map, 0, 0, 0), true, 'de doos raakt de weg wel');
});

t('een huisje zonder weg op de doos past, eentje met de rand erop niet', () => {
  const vrij = kaart([weg([[-100, 20], [100, 20]], 6)]);
  assert.equal(huisVrij(vrij, 0, 0, Math.PI / 2, D), true);
  const opDeRand = kaart([weg([[-100, HZ + 2.5], [100, HZ + 2.5]], 6)]); // de weg begint 0,5 m van de zijkant
  assert.equal(opRijwegDoos(opDeRand, 0, 0, Math.PI / 2), true);
  assert.equal(huisVrij(opDeRand, 0, 0, Math.PI / 2, D), false);
});

t('de plek bij de deur telt mee: de deur staat verder vooruit dan de gevel', () => {
  // de weg loopt 5,7 m voor het midden langs: het huisje zelf (2,25 m diep) staat vrij, de deur op 3,2 m staat in de rijbaan
  const map = kaart([weg([[-100, -5.7], [100, -5.7]], 6)]);
  assert.ok(DEUR_AFSTAND > HX);
  assert.equal(opRijwegDoos(map, 0, 0, -Math.PI / 2), false, 'het volume raakt de weg niet');
  assert.equal(opRijweg(map, 0, -DEUR_AFSTAND), true, 'de deur staat wel op de weg');
  assert.equal(huisVrij(map, 0, 0, -Math.PI / 2, D), false, 'dus past het huisje hier niet');
});

t('een gast-pand met de deur op de rijbaan of in een gebouw wordt afgekeurd', () => {
  const pand = { pts: [[-3, 8], [3, 8], [3, 14], [-3, 14], [-3, 8]], bounds: [-3, 8, 3, 14] };
  const wegErgens = [weg([[-100, 0], [100, 0]], 6)];
  const map = { roadsNear: (x, y, r) => (Math.abs(y) < r + 100 ? wegErgens : []), buildingsNear: () => [pand] };
  const binnen = { ...D, pointInPolygon: (x, y) => x > -3 && x < 3 && y > 8 && y < 14 };
  assert.equal(gastPandVrij(map, 0, 0, binnen), false, 'midden op de rijbaan');
  assert.equal(gastPandVrij(map, 0, 1.5, binnen), false, 'op de rand van de rijbaan');
  assert.equal(gastPandVrij(map, 0, 6, binnen), true, 'naast de weg en buiten het pand');
  assert.equal(gastPandVrij(map, 0, 10, binnen), false, 'in het pand');
});

t('boven de begane grond (de kamer van een pand) botsen de gebouwen van de straat niet', () => {
  const pand = { pts: [[-5, -5], [5, -5], [5, 5], [-5, 5], [-5, -5]], bounds: [-5, -5, 5, 5], h: 4 };
  const map = { elev: null, terrainOn: false, buildings: [pand], roads: [], water: [], buildingsNear: () => [pand], roadsNear: () => [], escapeBuilding: (x, y) => [x, y] };
  // op de grond word je uit het pand geduwd, in de kamer op KAMER_FLOOR niet (ook zonder hoogtemodel: map.elev ontbreekt)
  const [gx, gy] = resolveWalker(0.5, 0.5, 0.35, map, 0, 0, null, 0);
  assert.ok(Math.hypot(gx - 0.5, gy - 0.5) > 1, 'op de grond word je weggeduwd');
  const [kx, ky] = resolveWalker(0.5, 0.5, 0.35, map, 0, 0, null, KAMER_FLOOR);
  assert.ok(Math.hypot(kx - 0.5, ky - 0.5) < 1e-9, 'in de kamer blijf je staan');
});

console.log(`safehuisbotst_test: ${n} groepen${process.exitCode ? ' met fouten' : ' ok'}`);
