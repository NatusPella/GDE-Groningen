// Jachthavens in the world (#7): runs the marina planner (game/js/marinas.js)
// over the city's water and writes game/marinas.json, which marinas3d.js draws
// (finger piers) and fills with moored boats near the player.
// A marina needs a quay edge of 14 m or more with room for the fingers and
// 9 m of open fairway beyond their tips; no berth lies within 12 m of a
// bridge. At most one per polygon, at least 8 berths, at most eight marinas (one per invented name) at least 350 m apart, the choice
// seeded so the file does not change between runs.
//   node scripts/world/marinas.mjs           plan and report
//   node scripts/world/marinas.mjs --write   also write game/marinas.json
import '../node3d.mjs';
import fs from 'node:fs';

const root = new URL('../../game/', import.meta.url);
const { GameMap, applyMapExtras } = await import('../../game/js/mapdata.js');
const { waterClearance } = await import('../../game/js/waterindex.js');
const { planMarina, MARINA_NAMES } = await import('../../game/js/marinas.js');

const MIN_APART = 350;
const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const r1 = (v) => Math.round(v * 10) / 10;

export function buildMarinas(map) {
  const clear = (x, y, r) => waterClearance(map, x, y, r);
  const nearBridge = (x, y) => map.roadsNear(x, y, 14).some((rd) => rd.bridge && rd.pts.some((p, i) => {
    if (i === rd.pts.length - 1) return false;
    const q = rd.pts[i + 1], dx = q[0] - p[0], dy = q[1] - p[1], l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - p[0]) * dx + (y - p[1]) * dy) / l2));
    return Math.hypot(x - (p[0] + dx * t), y - (p[1] + dy * t)) < 12 + rd.width / 2;
  }));
  const all = [];
  map.water.forEach((poly, i) => {
    if (!(poly.nav >= 2) || poly.kind === 'sloot' || poly.pts.length < 4) return;
    const plan = planMarina(poly.pts, clear, { rng: seeded(1000 + i), blocked: nearBridge });
    if (!plan) return;
    if (plan.berths.length >= 8) all.push({ plan, poly, i });
  });
  // the roomiest near the centre first, at most MAX apart from each other
  all.sort((a, b) => Math.hypot(a.plan.berths[0].x, a.plan.berths[0].y) - Math.hypot(b.plan.berths[0].x, b.plan.berths[0].y));
  const out = [];
  for (const { plan, poly, i } of all) {
    const c = plan.berths[0];
    if (out.length >= MARINA_NAMES.length || out.some((m) => Math.hypot(m.x - c.x, m.y - c.y) < MIN_APART)) continue;
    out.push({
      id: out.length, name: MARINA_NAMES[out.length], x: r1(c.x), y: r1(c.y), poly: i, kind: poly.kind,
      fingers: plan.fingers.map((f) => [r1(f.x0), r1(f.y0), r1(f.x1), r1(f.y1)]),
      berths: plan.berths.map((b) => ({ x: r1(b.x), y: r1(b.y), a: Math.round(b.angle * 1000) / 1000, k: b.kind })),
    });
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('marinas.mjs')) {
  const { loadCityData } = await import('../lib/loadworld.mjs');
  const data = await loadCityData();
  const list = buildMarinas(new GameMap(data));
  console.log(`${list.length} marinas, ${list.reduce((n, m) => n + m.berths.length, 0)} berths`);
  for (const m of list) console.log(`  ${m.name} at ${Math.round(m.x)},${Math.round(m.y)} (${m.kind}): ${m.berths.length} berths`);
  if (process.argv.includes('--write')) {
    fs.writeFileSync(new URL('marinas.json', root), JSON.stringify({ marinas: list }));
    console.log('written game/marinas.json');
  }
}
