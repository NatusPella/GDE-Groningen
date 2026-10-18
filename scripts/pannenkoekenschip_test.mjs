// The moored pancake boat (game/js/pannenkoekenschip.js): finite geometry for
// a spread of sizes, a triangle budget, a made-up (not brand) ship name.
//   node scripts/pannenkoekenschip_test.mjs
import './node3d.mjs';

const S = await import('../game/js/pannenkoekenschip.js');
let fails = 0;
for (const len of [0, 14, 26, 40, 90]) {
  for (const wid of [0, 4, 6, 12]) {
    const g = S.pannenkoekenschipGeometry({ len, wid });
    const pos = g.getAttribute('position').array;
    const tris = pos.length / 9;
    if (!pos.every(Number.isFinite) || tris < 50 || tris > 1500) { fails++; console.log('FAIL', len, wid, tris); }
  }
}
for (let i = -3; i < 8; i++) if (!S.shipName(i)) { fails++; console.log('FAIL name', i); }
console.log(fails ? `${fails} failures` : 'ok');
process.exit(fails ? 1 : 0);
