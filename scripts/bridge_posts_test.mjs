// De palen van een beweegbare brug staan aan de rand (#325): de slagboompalen en de seinpalen van elke beweegbare brug van de
// stad staan niet op een andere rijbaan (de naastliggende rijbaan van een dubbele brug, een zijweg aan de voet van de oprit),
// en de arm van de slagboom reikt nog steeds van de paal over de breedte van het dek. Op de stadstegels van een gebouwde
// wereld (game/world of GAME_WORLD); zonder die: SKIP.
import assert from 'node:assert/strict';
import { heeftWereld, laadStadTegels } from './lib/stadtegels.mjs';

if (!heeftWereld()) { console.log('SKIP bridge_posts_test.mjs: geen game/world (cd desktop && npm run stage)'); process.exit(0); }
const MB = await import('../game/js/movablebridges.js');
const M3 = await import('../game/js/movablebridges3d.js');
const map = (await laadStadTegels()).world;
MB.buildMovableBridges(map);
const bridges = MB.getMovableBridges();
assert.ok(bridges.length >= 30, `te weinig beweegbare bruggen: ${bridges.length}`);

let posts = 0, signals = 0, moved = 0;
for (const b of bridges) {
  for (const bm of MB.boomsOf(b)) {
    posts++;
    assert.ok(!MB.onOtherCarRoad(map, bm.px, bm.py, b.r), `${b.name || 'brug'}: een slagboompaal staat op een andere rijbaan (${bm.px.toFixed(1)}, ${bm.py.toFixed(1)})`);
    // de arm loopt van de paal dwars over het dek
    const len = Math.hypot(bm.bx - bm.ax, bm.by - bm.ay);
    assert.ok(len >= b.half - 0.5, `${b.name || 'brug'}: de arm is korter dan het dek (${len.toFixed(1)} m)`);
    assert.ok(Math.abs(Math.hypot(bm.rx, bm.ry) - 1) < 1e-6);
    const own = [b.ax - bm.ux * 3 + bm.rx * (b.half + 0.3), b.ay - bm.uy * 3 + bm.ry * (b.half + 0.3)];
    if (Math.hypot(bm.px - own[0], bm.py - own[1]) > 0.5 && Math.hypot(bm.px - (b.bx - bm.ux * 3 + bm.rx * (b.half + 0.3)), bm.py - (b.by - bm.uy * 3 + bm.ry * (b.half + 0.3))) > 0.5) moved++;
  }
  for (const end of [0, 1]) {
    signals++;
    const s = M3.signalSpot(b, end, map);
    assert.ok(!MB.onOtherCarRoad(map, s[0], s[1], b.r, 0.5), `${b.name || 'brug'}: een seinpaal staat op een andere rijbaan (${s[0].toFixed(1)}, ${s[1].toFixed(1)})`);
  }
}
console.log(`bridge_posts_test: ok (${bridges.length} beweegbare bruggen, ${posts} slagboompalen en ${signals} seinpalen buiten het verkeer, ${moved} palen verplaatst)`);
