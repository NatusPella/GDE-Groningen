// node scripts/drawpool_test.mjs: the allocator and the frustum culling of the multi-draw pool (game/js/drawpool.js)
import { RangeAllocator, frustumPlanes, cullRanges } from '../game/js/drawpool.js';

let fail = 0;
const ok = (name, cond, extra = '') => { if (!cond) fail++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name} ${extra}`); };

// allocator: fill, free in the middle, join, refill
{
  const a = new RangeAllocator(100);
  const x = a.alloc(30), y = a.alloc(30), z = a.alloc(30);
  ok('three runs after each other', x === 0 && y === 30 && z === 60 && a.used === 90);
  ok('full buffer says no', a.alloc(11) === -1 && a.alloc(10) === 90);
  a.release(30, 30);
  ok('a hole of 30 is found again', a.alloc(30) === 30 && a.used === 100);
  a.release(0, 30); a.release(60, 30); a.release(30, 30);
  ok('neighbours join into one run', a.free.length === 1 && a.free[0][0] === 0 && a.free[0][1] === 90, JSON.stringify(a.free));
  ok('largest', a.largest() === 90);
  a.grow(200);
  ok('grow adds a free run behind the used 10', a.free.length === 2 && a.free[1][0] === 100 && a.free[1][1] === 100, JSON.stringify(a.free));
  a.release(90, 10);
  ok('and joins when the last run is freed', a.free.length === 1 && a.free[0][1] === 200, JSON.stringify(a.free));
  a.alloc(10);
  ok('used does not change by growing', a.used === 10, String(a.used));
}
// allocator: random use never overlaps
{
  const a = new RangeAllocator(1000);
  let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const live = []; const owner = new Int8Array(1000).fill(-1);
  let bad = 0;
  for (let step = 0; step < 4000; step++) {
    if (live.length && (rnd() < 0.5 || a.used > 800)) {
      const [s, n] = live.splice(Math.floor(rnd() * live.length), 1)[0];
      for (let i = s; i < s + n; i++) owner[i] = -1;
      a.release(s, n);
    } else {
      const n = 1 + Math.floor(rnd() * 60), s = a.alloc(n);
      if (s < 0) continue;
      for (let i = s; i < s + n; i++) { if (owner[i] !== -1) bad++; owner[i] = 1; }
      live.push([s, n]);
    }
  }
  ok('random use: no overlap', bad === 0, String(bad));
  let sum = 0; for (const [, n] of live) sum += n;
  ok('random use: used is the sum of live runs', a.used === sum, `${a.used} ${sum}`);
}
// frustum: the identity matrix is the clip cube [-1, 1]^3
{
  const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const pl = frustumPlanes(I);
  const spheres = new Float32Array([0, 0, 0, 0.5, 3, 0, 0, 1, 1.2, 0, 0, 0.5, 5, 5, 5, -1, 0, 0, -3, 1]);
  const firsts = Int32Array.from([0, 100, 200, 300, 400]), counts = Int32Array.from([6, 6, 6, 6, 6]);
  const starts = new Int32Array(5), oc = new Int32Array(5);
  const n = cullRanges(spheres, firsts, counts, 5, pl, 4, starts, oc);
  ok('inside and touching stay, outside and free slots go', n === 2 && starts[0] === 0 && starts[1] === 800, `${n} ${[...starts]}`);
  // a far limit drops what is too far from the camera
  const n2 = cullRanges(spheres, firsts, counts, 5, pl, 4, starts, oc, 0.1, 1.2, 0, 0);
  ok('distance limit', n2 === 1 && starts[0] === 800, `${n2}`);
}
process.exit(fail ? 1 : 0);
