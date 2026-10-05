// Swim-away guarantee: from every water spot a swimmer can leave in some direction.
//   node scripts/swim_escape_test.mjs
// Runs the swimmer's movement rule (player.js updateWater: waterClearance band
// that may only be left, never entered deeper) from the canal spot the bughunt
// uses (-33,-259.5) and a grid over all water in the city, in 16 headings.
import './node3d.mjs';
import fs from 'node:fs';

const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const { waterClearance, swimmerCanLeave } = await import('../game/js/waterindex.js');
const { inWaterPoly } = await import('../game/js/util.js');
const root = new URL('../game/', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('citymap.json', root)));
applyMapExtras(data, JSON.parse(fs.readFileSync(new URL('mapextras.json', root))));
const map = new GameMap(data);

const EDGE = Number((/SWIM_EDGE_CLEAR = ([\d.]+)/.exec(fs.readFileSync(new URL('js/player.js', root), 'utf8')) || [])[1] || 1);
const SPEED = 2.2, DT = 1 / 30;

const freeFrom = (hx, hy) => {
  const here = waterClearance(map, hx, hy, EDGE + 1);
  return (x, y) => { const d = waterClearance(map, x, y, EDGE + 1); return d >= EDGE || (d > 0 && d >= here); };
};

function swim(x0, y0, ang, secs = 1.5) {
  let x = x0, y = y0;
  for (let t = 0; t < secs; t += DT) {
    const nx = x + Math.cos(ang) * SPEED * DT, ny = y + Math.sin(ang) * SPEED * DT;
    if (!inWaterPoly(map, nx, ny)) break;
    const free = freeFrom(x, y);
    if (free(nx, ny)) { x = nx; y = ny; }
    else if (free(nx, y)) x = nx;
    else if (free(x, ny)) y = ny;
    else if (waterClearance(map, x, y, EDGE + 1) < EDGE && !swimmerCanLeave(free, x, y, SPEED * DT)) {
      if (waterClearance(map, nx, ny, EDGE + 1) > 0.05) { x = nx; y = ny; }
    }
  }
  return Math.hypot(x - x0, y - y0);
}

function best(x, y) {
  let m = 0;
  for (let a = 0; a < 16; a++) m = Math.max(m, swim(x, y, a * Math.PI / 8));
  return m;
}

let fails = 0;
const spot = best(-33, -259.5);
console.log(`canal spot (-33,-259.5): in water ${inWaterPoly(map, -33, -259.5)}, best heading moves ${spot.toFixed(2)} m`);
console.log('  per heading (deg:m):', Array.from({ length: 16 }, (_, a) => `${a * 22.5}:${swim(-33, -259.5, a * Math.PI / 8).toFixed(1)}`).join(' '));
if (!(spot > 1)) { fails++; console.log('FAIL canal spot: cannot swim away'); }

let total = 0, stuck = [];
const [minx, miny, maxx, maxy] = map.meta.bounds;
for (let x = minx; x < maxx; x += 6) {
  for (let y = miny; y < maxy; y += 6) {
    if (!inWaterPoly(map, x, y)) continue;
    // negative clearance: Ommeland water (country hook, boat_edge_sim.mjs); under 0.3 m: slivers
    const d = waterClearance(map, x, y, EDGE + 1);
    if (d < 0.3) continue;
    total++;
    if (best(x, y) < 0.2) stuck.push([x, y, d]);
  }
}
console.log(`${total} water points on a 6 m grid, ${stuck.length} where no heading moves 0.2 m in 1.5 s`);
for (const s of stuck.slice(0, 15)) console.log('  stuck', s.map((v) => v.toFixed(1)).join(','));
if (stuck.length) fails++;
if (fails) { console.log(`${fails} FAILED`); process.exit(1); }
console.log('swim escape ok');
