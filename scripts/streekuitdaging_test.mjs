// #835: de Hogelandrit — één streekuitdaging met een voertuig van Warffum via Usquert naar
// Uithuizen. Pure route/medaille plus bronchecks op de wiring.
//   node scripts/streekuitdaging_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { STREEKUITDAGING, checkpoints, startpunt, doelBij, startBij, medailleVoor } from '../game/js/streekuitdaging.js';

const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };

t('de route heeft een start en twee etappes', () => {
  assert.equal(checkpoints().length, 2);
  assert.equal(checkpoints()[0].naam, 'Usquert, kerk');
  assert.equal(checkpoints()[1].naam, 'Uithuizen, station');
  assert.ok(startBij(startpunt().x, startpunt().y));
  assert.equal(startBij(startpunt().x + 100, startpunt().y), false);
});

t('de etappes en de medailles kloppen', () => {
  const c = checkpoints()[0];
  assert.equal(doelBij(c.x, c.y, 0), true);
  assert.equal(doelBij(c.x, c.y, 1), false);
  assert.equal(medailleVoor(STREEKUITDAGING.time.goud - 1), 3);
  assert.equal(medailleVoor(STREEKUITDAGING.time.zilver - 1), 2);
  assert.equal(medailleVoor(STREEKUITDAGING.time.brons - 1), 1);
  assert.equal(medailleVoor(STREEKUITDAGING.time.brons + 1), 0);
});

t('de rit is gewired en gebruikt de bestaande waypoint en medailles', () => {
  const live = lees('streekuitdaginglive.js');
  assert.match(live, /setUserWaypoint\(checkpoints\(\)\[0\]/);
  assert.match(live, /recordChallengeResult\(world, STREEKUITDAGING\.id/);
  assert.match(lees('main.js'), /tryStreekuitdaging\(world\)/);
  assert.match(lees('main.js'), /updateStreekuitdaging\(world, dt\)/);
});

console.log(`streekuitdaging_test: ${n}/${n} ok`);
