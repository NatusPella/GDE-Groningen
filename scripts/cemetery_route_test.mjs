// Route langs een kerkhof (#930): de waypoint naar de kerk in Usquert liep over
// het gras en de graven in plaats van over de weg. De router trekt het laatste
// stuk van de weg naar het doel alleen nog als het kort is en niet door een
// gebouw of over een kerkhof gaat; anders houdt de lijn op de weg.
//   node scripts/kerkhof_route_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './node3d.mjs';
const { targetLeadAllowed, lineHitsCemetery } = await import('../game/js/routing.js');

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };

// Een kaart met een kerkhof tussen de weg (x = 0) en de kerk (x = 4).
const kerkhof = { kind: 'cemetery', pts: [[2, -3], [6, -3], [6, 3], [2, 3]] };
const map = {
  greenNear: (x, y) => (x >= 1.5 && x <= 6.5 && y >= -3.5 && y <= 3.5 ? [kerkhof] : []),
  buildingsNear: () => [],
};
const open = { greenNear: () => [], buildingsNear: () => [] };

t('een korte lijn zonder kerkhof mag', () => {
  assert.equal(targetLeadAllowed(open, 0, 0, 8, 0), true);
});

t('een lijn over het kerkhof niet', () => {
  assert.equal(lineHitsCemetery(map, 0, 0, 4, 0), true);
  assert.equal(targetLeadAllowed(map, 0, 0, 4, 0), false);
  assert.equal(targetLeadAllowed(map, 0, 10, 4, 10), true, 'naast het kerkhof mag wel');
});

t('een lang laatste stuk wordt niet als rechte lijn getekend', () => {
  assert.equal(targetLeadAllowed(open, 0, 0, 20, 0), false, '20 m is te ver van de weg');
  assert.equal(targetLeadAllowed(open, 0, 0, 12, 0), true, '12 m mag nog');
});

t('de router gebruikt de regel voor stad en land', () => {
  const bron = fs.readFileSync(new URL('../game/js/routing.js', import.meta.url), 'utf8');
  assert.match(bron, /export function targetLeadAllowed/);
  assert.match(bron, /export function lineHitsCemetery/);
  assert.match(bron, /lead\(ts, target\.x, target\.y, true\)/);
  assert.match(bron, /targetLeadAllowed\(map, last\[0\], last\[1\], target\.x, target\.y\)/);
});

console.log(`cemetery_route_test: ${n}/${n} ok`);
