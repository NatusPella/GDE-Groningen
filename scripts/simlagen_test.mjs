// Simulatielagen voor verkeer en voetgangers (zuivere logica, synthetische invoer).
//   node scripts/simlagen_test.mjs
import { laagVoorAfstand, doelPerLaag, plan, AbstractPool, spawnRing, despawnAfstand, tijdFactor, verkeerOpties, streekVanProfiel, randen } from '../game/js/simlagen.js';

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };

for (const s of ['auto', 'voetganger']) {
  const [a, b, c] = randen(s);
  check(s + ' randen oplopend', a < b && b < c);
  check(s + ' dichtbij vol', laagVoorAfstand(s, 0) === 'vol' && laagVoorAfstand(s, a - 1) === 'vol');
  check(s + ' midden', laagVoorAfstand(s, a) === 'vereenvoudigd' && laagVoorAfstand(s, b - 1) === 'vereenvoudigd');
  check(s + ' ver', laagVoorAfstand(s, b) === 'abstract' && laagVoorAfstand(s, c - 1) === 'abstract');
  check(s + ' weg', laagVoorAfstand(s, c) === 'weg' && laagVoorAfstand(s, NaN) === 'weg');
  const r = spawnRing(s);
  check(s + ' spawnring binnen vereenvoudigd', r.min < r.max && r.max <= b);
  check(s + ' despawn voorbij spawn', despawnAfstand(s) > r.max);
}
{
  const cen = doelPerLaag('voetganger', 'centrum', 14), land = doelPerLaag('voetganger', 'platteland', 14);
  check('centrum drukker dan platteland', cen.vol > land.vol && cen.vereenvoudigd > land.vereenvoudigd, JSON.stringify([cen, land]));
  check('plafond vol', cen.vol <= 70);
  const nacht = doelPerLaag('auto', 'stad', 3), dag = doelPerLaag('auto', 'stad', 14);
  check('nacht rustiger', nacht.vereenvoudigd < dag.vereenvoudigd);
  check('centrum nacht voetgangers drukker dan dorp nacht', tijdFactor('voetganger', 2, 'centrum') > tijdFactor('voetganger', 2, 'dorp'));
  check('onbekende streek valt terug', doelPerLaag('auto', 'onbekend', 12).vol === doelPerLaag('auto', 'stad', 12).vol);
}
{
  const speler = { x: 0, y: 0 };
  const items = [{ x: 10, y: 0 }, { x: 200, y: 0 }, { x: 500, y: 0 }, { x: 5000, y: 0 }];
  const p = plan('auto', 'stad', speler, items, 12);
  check('plan lagen', p.lagen.join() === 'vol,vereenvoudigd,abstract,weg', p.lagen.join());
  check('plan weg', p.weg.length === 1 && p.weg[0] === 3);
  check('plan telt', p.aantal.vol === 1 && p.aantal.vereenvoudigd === 1);
  check('plan bij nooit negatief', p.bij.vol >= 0 && p.bij.vereenvoudigd >= 0);
  const vol = plan('auto', 'platteland', speler, Array.from({ length: 50 }, () => ({ x: 5, y: 5 })), 12);
  check('te vol: niets erbij', vol.bij.vol === 0);
}
{
  const pool = new AbstractPool(100);
  pool.afleggen(50, 50, 3); pool.afleggen(950, 50, 2);
  check('pool totaal', pool.totaal() === 5);
  const u = pool.opnemen(0, 0, 200, 2);
  check('opnemen beperkt', u.length === 2 && pool.totaal() === 3);
  check('ver blijft staan', pool.opnemen(0, 0, 200, 10).length === 1 && pool.totaal() === 2);
  pool.opruimen(0, 0, 500);
  check('opruimen vergeet ver', pool.totaal() === 0);
}
{
  const o = verkeerOpties('centrum', 12);
  check('verkeeropties', o.target > 0 && o.spawnMin < o.spawnMax && o.despawnDist > o.spawnMax);
  check('profiel -> streek', streekVanProfiel('centrum') === 'centrum' && streekVanProfiel('x') === 'stad');
}
console.log(bad ? bad + ' mislukt' : 'simlagen_test: alles goed');
process.exit(bad ? 1 : 0);
