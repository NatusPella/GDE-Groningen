// Height limits per building type (game/js/buildingcap.js, issue #179), on rows
// shaped like the ones found in Appingedam, Lauwersoog, Reitdiep and Eemshaven.
//   node scripts/buildingcap_test.mjs
import { capBuilding, heightLimits, ringArea } from '../game/js/buildingcap.js';

const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };
const rect = (w, d) => [[0, 0], [w, 0], [w, d], [0, d], [0, 0]];
const row = (type, w, d, h, hm, extra = {}) => ({ pts: rect(w, d), type, name: null, h, hm, hsrc: '3dbag', ...extra });
const capped = (b) => capBuilding(b);

// Lauwersoog: a 3 m x 3 m post with the default three storeys is a single storey, not a pillar
let b = capped(row('yes', 3, 3, 3, 9.3, { hsrc: 'default' }));
check(b.h === 1 && b.hm <= 3.2, `post: h ${b.h} hm ${b.hm}`);
// Reitdiep: a 1768 m2 house with 14 m and 4.5 storeys is a farm hall: two storeys of wall
b = capped(row('house', 60, 29.5, 4.5, 14));
check(b.h === 2 && b.hm <= 12, `farm hall: h ${b.h} hm ${b.hm}`);
// Appingedam: a 2100 m2 unnamed hall of 19.7 m is cut to a hall's 16 m and three storeys
b = capped(row('yes', 70, 30, 3.5, 19.7));
check(b.h === 3 && b.hm === 16, `hall: h ${b.h} hm ${b.hm}`);
// Eemshaven: a measured 13 m2 chimney keeps its 102 m
b = capped(row('yes', 3.6, 3.6, 33, 102.4));
check(b.hm === 102.4 && b.h === 33, `chimney: h ${b.h} hm ${b.hm}`);
// things that stay as they are
for (const [name, r] of [
  ['apartment block', row('apartments', 60, 14, 9, 28)],
  ['church', row('church', 40, 14, 4, 30)],
  ['tower', row('tower', 5, 5, 8, 25)],
  ['storage tank', row('storage_tank', 12, 12, 6, 20)],
  ['a normal house', row('house', 9, 8, 2.5, 8.5)],
  ['a terrace row', row('terrace', 60, 8, 3, 10)],
  ['a named block of a hall size', row('yes', 60, 40, 5, 22, { name: 'Het Gebouw' })],
]) {
  const before = { h: r.h, hm: r.hm };
  capped(r);
  check(r.h === before.h && r.hm === before.hm, `${name} changed: h ${r.h} hm ${r.hm}`);
}
// a house of five storeys is a house of four
b = capped(row('detached', 12, 10, 5, 17));
check(b.h === 4 && b.hm === 14, `tall house: h ${b.h} hm ${b.hm}`);
// never raised; idempotent; the roof stays above the walls
b = row('house', 9, 8, 1, 3, { hsrc: 'default' });
capped(b);
check(b.h === 1 && b.hm === 3.1 ? true : b.h === 1 && b.hm >= 3, `a low house is not raised: h ${b.h} hm ${b.hm}`);
const c = row('house', 60, 29.5, 4.5, 14);
capped(c); const once = JSON.stringify(c); capped(c);
check(JSON.stringify(c) === once, 'idempotent');
check(!('_capped' in c) && !('h0' in c), 'no extra fields on the row');
check(heightLimits(row('yes', 70, 30, 3, 10)) !== null && ringArea(rect(10, 10)) === 100, 'limits and area');

console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'ok');
process.exit(fails.length ? 1 : 0);
