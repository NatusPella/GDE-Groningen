// #244: the countryside is drawn in map tiles far from the test strip, also without
// province files (no provinceMapBounds). Run: node scripts/countrymap_far_test.mjs
import './node3d.mjs';
const { drawCountryDetail } = await import('../game/js/countrymap.js');
const { countryRect } = await import('../game/js/countryfield.js');
const { MAP_STYLE } = await import('../game/js/countrymap.js');

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };

const calls = { stroke: 0, fill: 0, fillRect: 0 };
const ctx = new Proxy({}, {
  get: (_, k) => (k === 'stroke' ? () => calls.stroke++ : k === 'fill' ? () => calls.fill++ : k === 'fillRect' ? () => calls.fillRect++ : () => {}),
  set: () => true,
});
const draw = (dx, dy, size, ppm) => {
  calls.stroke = calls.fill = calls.fillRect = 0;
  const r = countryRect();
  const x0 = r.cx + r.hx + dx, y0 = r.cy + dy;
  drawCountryDetail(ctx, x0, y0, x0 + size, y0 + size, ppm, MAP_STYLE);
  return calls.stroke + calls.fill + calls.fillRect;
};
ok(draw(3000, 0, 4000, 0.3) > 0, 'tile 3 km beyond the strip is drawn');
ok(draw(20000, 0, 4000, 0.3) > 0, 'tile 20 km beyond the strip is drawn (was empty)');
console.log(`countrymap_far_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
