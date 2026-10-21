// Garage-ingangen blijven vrij (#332): de bay en de strook tussen de deur en het midden van de straat zijn gereserveerd
// (geparkeerde auto's, straatprops), bomen binnen die zone verdwijnen, en elke garage van de stad heeft geen boom in de bay.
// Gebruikt de stadstegels van een gebouwde wereld (game/world of GAME_WORLD); zonder die: SKIP.
import assert from 'node:assert/strict';
import { heeftWereld, laadStadTegels } from './lib/stadtegels.mjs';

if (!heeftWereld()) { console.log('SKIP garage_zone_test.mjs: geen game/world (cd desktop && npm run stage)'); process.exit(0); }
const G = await import('../game/js/garages.js');
const P = await import('../game/js/parkedcars.js');
const map = (await laadStadTegels()).world;

G.initGarages({ map });
const sites = G.getGaragesForRender().filter((s) => s.reach);
assert.ok(sites.length >= 10, `te weinig garages en pompen in de stad: ${sites.length}`);

const BAY_W = 5.2, BAY_D = 10.5;
const at = (s, fwd, side) => ({ x: s.x + Math.cos(s.angle) * fwd - Math.sin(s.angle) * side, y: s.y + Math.sin(s.angle) * fwd + Math.cos(s.angle) * side });
const m = { len: 4.5, wid: 1.8 };

let treesIn = 0;
for (const s of sites) {
  assert.ok(s.reach > BAY_D / 2 + 2, `${s.name}: de zone reikt niet tot de straat (${s.reach})`);
  // de bay, de deur en de straat ervoor zijn gereserveerd
  for (const [f, sd] of [[0, 0], [BAY_D / 2 - 1, 1.5], [BAY_D / 2 + 1.5, 0], [s.reach - 1, 0], [s.reach - 1, BAY_W / 2 + 1.5]]) {
    const q = at(s, f, sd);
    assert.ok(map.reservedAt(q.x, q.y), `${s.name}: (${f}, ${sd}) is niet gereserveerd`);
  }
  // geen boom in de bay of voor de deur
  for (const t of map.treesNear(s.x, s.y, BAY_D + s.reach)) {
    const dx = t[0] - s.x, dy = t[1] - s.y, fwd = dx * Math.cos(s.angle) + dy * Math.sin(s.angle), side = -dx * Math.sin(s.angle) + dy * Math.cos(s.angle);
    if (Math.abs(side) < BAY_W / 2 + 2 && fwd > -BAY_D / 2 && fwd < s.reach) treesIn++;
  }
  // een geparkeerde auto voor de deur past er niet
  const q = at(s, BAY_D / 2 + 1.2, 0);
  assert.equal(P.slotFits(map, s.road || null, q.x, q.y, s.angle + Math.PI / 2, m, 0, 0), false, `${s.name}: een geparkeerde auto mag niet voor de deur`);
}
assert.equal(treesIn, 0, `${treesIn} bomen in een garagezone`);

// een boom die er alsnog staat (in de bay en voor de deur) verdwijnt bij het plaatsen
const probe = sites[0];
const tIn = [at(probe, 0, 0).x, at(probe, 0, 0).y, 0, 150, 0], tDoor = [at(probe, BAY_D / 2 + 1, 1).x, at(probe, BAY_D / 2 + 1, 1).y, 0, 150, 0];
for (const t of [tIn, tDoor]) map.treeGrid.insert(t, [t[0], t[1], t[0], t[1]]);
G.initGarages({ map });
for (const t of [tIn, tDoor]) assert.ok(!map.treesNear(t[0], t[1], 0.5).includes(t), 'een boom in de garagezone is niet weggehaald');

console.log(`garage_zone_test: ok (${sites.length} garages en pompen, geen boom in de zone, de deur en de straat ervoor gereserveerd)`);
