// Dieren op de weg (#334): grondbeesten (duiven, katten, koeien, schapen, ganzen) staan nooit op een rijbaan of midden
// op een kruispunt; wegvlak.js onRoadway kent de rijbaan én de asfaltvlek van een kruispunt. Draait de echte
// wildlife.js op de stadstegels van een gebouwde wereld (game/world of GAME_WORLD); zonder die: SKIP.
import assert from 'node:assert/strict';
import { heeftWereld, laadStadTegels } from './lib/stadtegels.mjs';

if (!heeftWereld()) { console.log('SKIP wildlife_road_test.mjs: geen game/world (cd desktop && npm run stage)'); process.exit(0); }
const { onRoadway, junctionNodes } = await import('../game/js/wegvlak.js');
const W = await import('../game/js/wildlife.js');
const map = (await laadStadTegels()).world;

// 1. de asfaltvlek van een kruispunt telt mee, ook waar de rijstroken ophouden
let nodes = 0;
const seen = new Set();
for (const r of map.roads) {
  for (const p of [r.pts[0], r.pts[r.pts.length - 1]]) {
    const k = Math.round(p[0] / 3) + ',' + Math.round(p[1] / 3);
    if (seen.has(k) || !['major', 'normal'].includes(r.cat) || r.bridge || r.z) continue;
    seen.add(k);
    for (const n of junctionNodes(map, p[0], p[1], 6)) {
      if (Math.hypot(n.x - p[0], n.y - p[1]) > 3) continue;
      nodes++;
      assert.ok(onRoadway(map, n.x, n.y), `het midden van een kruispunt (${n.x.toFixed(0)}, ${n.y.toFixed(0)}) is geen wegvlak`);
    }
  }
  if (nodes > 400) break;
}
assert.ok(nodes >= 50, `te weinig kruispunten gevonden: ${nodes}`);

// 2. de echte wildlife.js bij de drukste kruispunten: geen grondbeest op de rijbaan
const busy = [];
const cnt = new Map();
for (const r of map.roads) {
  if (!['major', 'normal'].includes(r.cat) || r.bridge || r.z) continue;
  for (const p of [r.pts[0], r.pts[r.pts.length - 1]]) { const k = Math.round(p[0] / 4) + ',' + Math.round(p[1] / 4); const e = cnt.get(k) || { x: p[0], y: p[1], n: 0 }; e.n++; cnt.set(k, e); }
}
for (const e of [...cnt.values()].filter((q) => q.n >= 3).sort((a, b) => b.n - a.n).slice(0, 12)) busy.push(e);
const world = { map, player: { x: 0, y: 0, vx: 0, vy: 0, inVehicle: null, water: false, radius: 0.35 }, vehicles: [], pedestrians: [], time: 0, weather: { intensity: 0 }, addMessage() {}, wildlife: [] };
let onRoad = 0, checked = 0;
for (const j of busy) {
  world.player.x = j.x + 18; world.player.y = j.y; world.wildlife = [];
  for (let t = 0; t < 240; t += 0.25) {
    world.time = t;
    W.updateWildlife(0.25, world);
    for (const a of world.wildlife) {
      if (a.dead || a.gone || ['seagull', 'duck', 'reiger', 'zeehond', 'vis', 'dog'].includes(a.kind) || (a.kind === 'pigeon' && a.state !== 'ground')) continue;
      checked++;
      // (een dier dat net op de weg raakt, krijgt een halve seconde voor de controle van keepOffRoad: pas daarna telt het)
      if (!onRoadway(map, a.x, a.y, 0.1)) { a.badSince = undefined; continue; }
      if (a.badSince === undefined) a.badSince = t;
      if (t - a.badSince > 1) { onRoad++; if (onRoad < 6) console.log('op de weg:', a.kind, a.x.toFixed(1), a.y.toFixed(1), 'kruispunt', j.x.toFixed(0), j.y.toFixed(0)); }
    }
  }
}
assert.ok(checked > 200, `te weinig waarnemingen: ${checked}`);
assert.equal(onRoad, 0, `${onRoad} van ${checked} waarnemingen: een grondbeest op een rijbaan of kruispunt`);
console.log(`wildlife_road_test: ok (${nodes} kruispunten, ${checked} waarnemingen bij ${busy.length} drukke kruispunten, geen dier op de weg)`);
