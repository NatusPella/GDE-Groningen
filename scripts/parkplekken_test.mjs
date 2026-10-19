// Parkaankleding (#23): banken in een ring rond het park, gezicht naar het midden.
//   node scripts/parkplekken_test.mjs
import { PARKS, parkBankSpots } from '../game/js/parkplekken.js';
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } };
ok(PARKS.length >= 2 && PARKS.some((p) => p.name === 'Noorderplantsoen'), 'Noorderplantsoen staat erin');
for (const p of PARKS) {
  const s = parkBankSpots(p);
  ok(s.length === p.banken, p.name + ': aantal banken');
  ok(s.every((q) => { const d = Math.hypot(q.x - p.x, q.y - p.y); return d >= p.rMin - 1e-6 && d <= p.rMax + 1e-6; }), p.name + ': binnen de ring');
  ok(s.every((q) => { const a = Math.atan2(p.y - q.y, p.x - q.x); return Math.abs(Math.sin(a - q.angle)) < 1e-9 && Math.cos(a - q.angle) > 0.999; }), p.name + ': gezicht naar het midden');
  ok(JSON.stringify(s) === JSON.stringify(parkBankSpots(p)), p.name + ': deterministisch');
  ok(s.some((q) => q.bin), p.name + ': ook prullenbakken');
}
console.log(fails ? `${fails} mislukt` : 'parkplekken: alles ok');
process.exit(fails ? 1 : 0);
