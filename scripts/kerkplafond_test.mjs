// Een kerkinterieur heeft een houten balkenplafond met kroonluchters, geen kantoorpanelen (museum3d.js roomShell, #340).
//   node scripts/kerkplafond_test.mjs
import './node3d.mjs';

const { GeoBuilder } = await import('../game/js/pixelart3d.js');
const { roomShell, G_LAMP } = await import('../game/js/museum3d.js');
const { INTERIEUREN } = await import('../game/js/interieurplan.js');
let n = 0, bad = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

// welke kamers hebben het balkenplafond: de kerken (schip, koor, torenhal, kerkzaal, bijzaal), niet de deurkamers en niet de andere gebouwen
const KERKEN = ['martinikerk', 'aakerk', 'jozefkathedraal', 'remonstrants'];
for (const it of INTERIEUREN) {
  const kerk = KERKEN.includes(it.id);
  for (const r of it.rooms.filter((q) => !q.deur)) check(`${it.id}/${r.id}: balkenplafond ${kerk ? 'ja' : 'nee'}`, !!(r.style && r.style.balken) === kerk);
}

// de mesh: een kamer van 36 x 24 x 12 met en zonder balken
const room = (style) => ({ id: 'schip', cx: 0, cy: 0, ux: 1, uy: 0, hl: 18, hw: 12, h: 12, style });
const bouw = (style) => {
  const B = new GeoBuilder(2);
  roomShell(B, { pts: [[-100, -100], [100, -100], [100, 100], [-100, 100]] }, room(style), 0, [room(style)]);
  return B;
};
const lampTris = (B) => (B.groups[G_LAMP] ? B.groups[G_LAMP].p.length / 9 : 0);
const alle = (B) => B.groups.reduce((s, g) => s + g.p.length / 9, 0);
const kantoor = bouw({ wall: 0xffffff, floor: 0x888888, ceil: 0xeeeeee });
const kerk = bouw({ wall: 0xffffff, floor: 0x888888, ceil: 0x4a3524, balken: true });
check('kantoorstijl: verzonken lichtpanelen blijven (kamer van 36 x 24: 10 x 6 panelen)', lampTris(kantoor) === 60 * 2, String(lampTris(kantoor)));
check('kerkstijl: geen lichtpanelen, alleen kaarsvlammen van twee kroonluchters (2 x 4 blokjes)', lampTris(kerk) === 8 * 12, String(lampTris(kerk)));
check('kerkstijl: balken en kroonluchters voegen geometrie toe', alle(kerk) > alle(kantoor) - 60 * 2 + 20);
const pos = kerk.groups.flatMap((g) => Array.from(g.p));
check('kerkstijl: alle hoekpunten eindig', pos.every(Number.isFinite));
let minY = Infinity;
for (const g of kerk.groups) for (let i = 1; i < g.p.length; i += 3) if (g.p[i] > 0.5 && g.p[i] < 12 - 0.01) minY = Math.min(minY, g.p[i]);
check('kroonluchters hangen hoog (laagste hangend punt boven 8 m in een kamer van 12 m)', minY > 8, String(minY));
// een lage zaal (4 m): de kroonluchter blijft boven hoofdhoogte
const laag = new GeoBuilder(2);
const rl = { id: 'bijzaal', cx: 0, cy: 0, ux: 1, uy: 0, hl: 3, hw: 4, h: 4, style: { wall: 0xffffff, floor: 0x888888, ceil: 0x4a3524, balken: true } };
roomShell(laag, { pts: [[-100, -100], [100, -100], [100, 100], [-100, 100]] }, rl, 0, [rl]);
let lowY = Infinity;
for (const g of laag.groups) for (let i = 1; i < g.p.length; i += 3) if (g.p[i] > 0.5 && g.p[i] < 4 - 0.01) lowY = Math.min(lowY, g.p[i]);
check('in een lage zaal (4 m) hangt niets onder 2,6 m', lowY > 2.6, String(lowY));

console.log(bad ? `${bad} van ${n} mislukt` : `kerkplafond_test ok (${n} checks)`);
process.exit(bad ? 1 : 0);
