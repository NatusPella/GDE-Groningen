// The one height query (elevation.js surfaceAt, GameMap.surfaceAt):
//   node scripts/surface_test.mjs
// On a small made-up map: a deck over a street, a slip road splitting off it
// and overlapping it in plan at another height, a ribbon carrying on at a
// joint. Whoever is on a ribbon stays on it while on its surface, takes the
// way that carries on at its end (the same road first), falls off an edge,
// and a patched groundHeightAt (the home's storey) still answers off the
// ribbons. Then the real map: the N7 crossing at the Julianaplein, every lane
// both ways (ringcheck driveAcross), with the strict deck check.
import './node3d.mjs';
import fs from 'node:fs';

globalThis.requestAnimationFrame = (f) => setImmediate(f);
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const near = (a, b, e = 0.02) => Math.abs(a - b) <= e;

// a two-lane main road along y = 0 from x = -200 to 200: flat, a 6 m deck
// between x = -40 and 40 over a street along x = 0; a slip road leaves the
// main road at x = -100 and runs beside it (overlapping in plan) down to
// street level; the main road is cut at x = 100 into two ways (a joint)
const ramp = (x0, x1, z0, z1, n = 9) => Array.from({ length: n }, (_, i) => [x0 + (x1 - x0) * i / (n - 1), z0 + (z1 - z0) * i / (n - 1)]);
const mainA = [[-200, 0, 0], [-160, 0, 0], ...ramp(-120, -40, 0, 6).map(([x, z]) => [x, 0, z]), [0, 0, 6], [40, 0, 6], ...ramp(56, 100, 5.2, 0, 4).map(([x, z]) => [x, 0, z])];
const mainB = [[100, 0, 0], [140, 0, 0], [200, 0, 0]];
const slip = [[-100, 0, 1.5], [-80, 3, 1.4], [-60, 6, 1.2], [-40, 9, 0.8], [-20, 12, 0.4], [0, 16, 0], [20, 24, 0]];
const road = (P, extra) => ({ pts: P.map((q) => [q[0], q[1]]), z: P.map((q) => q[2]), type: 'trunk', cat: 'major', width: 12, speed: 22, oneway: false, roundabout: false, name: 'Hoofdweg', bridge: false, ...extra });
// the slip road starts on the main road's vertex at x = -100 with its height there
const zMainAt = (x) => { for (let i = 0; i < mainA.length - 1; i++) if (x >= mainA[i][0] && x <= mainA[i + 1][0]) { const t = (x - mainA[i][0]) / (mainA[i + 1][0] - mainA[i][0]); return mainA[i][2] + (mainA[i + 1][2] - mainA[i][2]) * t; } return 0; };
slip[0][2] = zMainAt(-100);
const data = {
  meta: { bounds: [-300, -300, 300, 300] },
  roads: [
    road(mainA, { bridge: true, layer: 1, ref: 'N99' }),
    road(mainB, { ref: 'N99' }),
    road(slip, { type: 'trunk_link', name: null, width: 9, ref: 'A99' }),
    { pts: [[0, -200], [0, 200]], type: 'residential', cat: 'normal', width: 6.5, speed: 11, oneway: false, roundabout: false, name: 'Onderstraat', bridge: false },
  ],
  buildings: [], water: [], green: [], trees: [],
};
const map = new GameMap(data);
const [main, , link] = map.roads;
ok(map.elev.has, 'the made-up map has raised ribbons');

// spawning: the ribbon nearest the height asked for
const deckState = map.surfaceAt(0, 2, { z: 6, ribbon: map.ribbonAt(0, 2, 6) });
ok(deckState.ribbon === main && near(deckState.z, 6), 'spawned on the deck', JSON.stringify({ z: deckState.z, r: deckState.ribbon && deckState.ribbon.name }));
const under = map.surfaceAt(0, 2, { z: 0, ribbon: map.ribbonAt(0, 2, 0) });
ok(near(under.z, 0) && under.ribbon === null, 'spawned on the street under the deck', JSON.stringify({ z: under.z }));

// walking the deck across the street stays on the deck
{
  const st = { z: 6, ribbon: main };
  let low = Infinity;
  for (let x = -30; x <= 30; x += 0.5) low = Math.min(low, map.surfaceAt(x, 3, st).z);
  ok(near(low, 6) && st.ribbon === main, 'stays on the deck over the street', low);
}
// the street under the deck stays the street
{
  const st = { z: 0, ribbon: null };
  let high = -Infinity;
  for (let y = -30; y <= 30; y += 0.5) high = Math.max(high, map.surfaceAt(0, y, st).z);
  ok(near(high, 0), 'the street under the deck stays the street', high);
}
// on the slip road, where it overlaps the main road at another height, a car stays on the slip road
{
  const st = { z: zMainAt(-100), ribbon: link };
  let worst = 0;
  for (let k = 1; k <= 60; k++) {
    const t = k / 60, x = -100 + 80 * t, y = 12 * t;
    const zl = map.roadZAt(link, x, y);
    worst = Math.max(worst, Math.abs(map.surfaceAt(x, y, st).z - zl));
  }
  ok(worst < 0.05 && st.ribbon === link, 'a car on the slip road keeps to it beside the climbing main road', worst.toFixed(2));
}
// and a car on the main road along the slip road's side keeps to the main road
{
  const st = { z: 0, ribbon: map.ribbonAt(-150, 4, 0) };
  let worst = 0;
  for (let x = -150; x <= -20; x += 0.5) worst = Math.max(worst, Math.abs(map.surfaceAt(x, 4.5, st).z - zMainAt(x)));
  ok(worst < 0.05, 'a car on the main road keeps to it beside the slip road', worst.toFixed(2));
}
// past the end of a way at a joint: the way that carries on
{
  const st = { z: 0.6, ribbon: main };
  map.surfaceAt(99, 1, st);
  for (let x = 99; x <= 110; x += 0.5) map.surfaceAt(x, 1, st);
  ok(near(st.z, 0) && st.kind !== 'slope', 'carries on past a joint', JSON.stringify({ z: st.z, kind: st.kind }));
}
// off the deck's edge it falls to the street
{
  const st = { z: 6, ribbon: main };
  const s = map.surfaceAt(0, 30, st);
  ok(near(s.z, 0) && s.ribbon === null, 'off the edge of the deck is the street below', JSON.stringify({ z: s.z }));
}
// a patched groundHeightAt (the home's storey) answers where no ribbon is
{
  const m2 = new GameMap(JSON.parse(JSON.stringify(data)));
  const g = m2.groundHeightAt.bind(m2);
  m2.groundHeightAt = (x, y, z = 0) => (Math.abs(x - 150) < 5 && Math.abs(y - 150) < 5 && z > 6 ? 9 : g(x, y, z));
  ok(near(m2.surfaceAt(150, 150, { z: 9, ribbon: null }).z, 9), 'a patched groundHeightAt is honoured');
}
// stateless probes around a vehicle prefer its ribbon
ok(near(map.surfaceZ(0, 2, 6, main), 6) && near(map.surfaceZ(0, 2, 0.2, null), 0), 'surfaceZ probes keep to the ribbon');
// spawnState: the surface seen from street level (under the deck: the street)
ok(near(map.spawnState(0, 2).z, 0) && map.spawnState(0, 2).ribbon === null, 'spawnState under the deck is the street');

// --- the real map: the N7 crossing at the Julianaplein, strict deck check
{
  await import('../game/js/player.js');
  const RC = await import('../game/js/ringcheck.js');
  const root = new URL('../game/', import.meta.url);
  const { loadCityData } = await import('./lib/loadworld.mjs');
  const cm = await loadCityData();
  const real = new GameMap(cm);
  const world = { map: real, flitspaalen: [], player: { x: 0, y: 0 }, vehicles: [], props: [] };
  const c = RC.waterCrossings(real).find((q) => Math.hypot(q.x + 61, q.y - 1830) < 30);
  ok(!!c, 'the N7 crossing at the Julianaplein is found');
  if (c) {
    const path = RC.crossingPath(real, c, 60);
    const edge = (c.road.width || 7) / 2 - 1.3;
    for (const o of [0, -edge, edge]) {
      const lane = RC.offsetPath(real, path, o);
      for (const dir of [1, -1]) {
        const res = await RC.driveAcross(world, dir > 0 ? lane : lane.slice().reverse(), 80 / 3.6);
        ok(!res, `Julianaplein N7 lane ${o.toFixed(1)} ${dir > 0 ? 'mee' : 'tegen'}`, res && JSON.stringify(res));
      }
    }
  }
}

// the dev profile overlay (F8) draws for a car on a deck and a walker in the street
{
  if (!document.body) document.body = document.createElement('div');
  const O = await import('../game/js/profileoverlay.js');
  const car = { x: 0, y: 2, z: 6, surf: { z: 6, ribbon: main, kind: 'road' } };
  const w = { map, player: { x: 0, y: 2, gz: 0, inVehicle: car } };
  let err = '';
  try {
    O.initProfileOverlay(w);
    window.__profileOverlay.toggle();
    O.draw();
    w.player.inVehicle = null; w.player.surf = { z: 0, ribbon: null, kind: 'ground' };
    O.draw();
    window.__profileOverlay.toggle();
  } catch (e) { err = e.stack.split('\n').slice(0, 2).join(' '); }
  ok(!err, 'the profile overlay draws', err);
}

console.log(`${n - fails}/${n} surface checks passed`);
process.exit(fails ? 1 : 0);
