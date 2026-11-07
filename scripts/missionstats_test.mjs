// #497: de missie-cijferregels zijn pure opmaak; de missieketen levert de
// momentopname. Test zonder world/DOM.
//   node scripts/missionstats_test.mjs
import assert from 'node:assert/strict';
import { missionStats, fmtTime } from '../game/js/missionstats.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };

t('fmtTime is m:ss', () => {
  assert.equal(fmtTime(0), '0:00');
  assert.equal(fmtTime(65), '1:05');
  assert.equal(fmtTime(-3), '0:00');
});

t('een gewone missie: tijd, kills, verwondingen, positie', () => {
  const stats = missionStats({ type: 'deliver' }, { run: { elapsed: 65, kills: 1, hurt: 12.4, racePos: 2, raceTotal: 4 }, kills: 3 });
  const map = Object.fromEntries(stats);
  assert.equal(map.Tijd, '1:05');
  assert.equal(map.Kills, '2');
  assert.equal(map.Verwondingen, '12%');
  assert.equal(map.Positie, '2/4');
});

t('rondvaart en stunt hebben hun eigen regels', () => {
  const rv = missionStats({ type: 'boat' }, { run: { elapsed: 30, kills: 0, hurt: 0, vehicleUsed: true }, rondvaart: { joy: 77, told: 2, stops: 4, bumps: 1 } });
  assert.ok(rv.some(([k, v]) => k === 'Toeristen' && v === '77%') && rv.some(([k]) => k === 'Botsingen'));
  const su = missionStats({ type: 'stunt' }, { run: { elapsed: 10, kills: 0, hurt: 0, vehicleUsed: false }, stunt: { score: 50, broken: 3 } });
  assert.ok(su.some(([k, v]) => k === 'Punten' && v === '50') && su.some(([k, v]) => k === 'Omver' && v === '3'));
});

t('zonder run geen regels', () => assert.deepEqual(missionStats({ type: 'x' }), []));

console.log(`missionstats_test: ${n}/${n} ok`);
