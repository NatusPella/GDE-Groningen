// Vaste plekken voor de stadsvergelijking (#90): oude stad (citymap-pad) tegenover stad uit tegels.
//   node scripts/qa/stadspots.mjs [--out scripts/qa/stadspots.json]
// Per plek een exacte positie en kijkrichting (een stuk weg bij het oriëntatiepunt, gemeten in de oude stad),
// zodat beide werelden dezelfde camera krijgen. Dag voor alle plekken, nacht voor een deel.
// Bronnen: meta.landmarks, meta.neighbourhoodPoints, bruggen, kanaalkruisingen, ring, station.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(ROOT, 'scripts', 'qa', 'stadspots.json')));
const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'game', 'citymap.json'), 'utf8'));
const roads = m.roads.filter((r) => ['major', 'normal', 'minor', 'service', 'footway', 'path', 'cycleway'].includes(r.cat) || r.cat);

// middelpunt van het langste stuk (>= 10 m) van een weg binnen R van (x, y), met de richting van dat stuk
function roadNear(x, y, R, pick) {
  pick = pick || (() => true);
  let best = null;
  for (const r of roads) {
    if (!pick(r)) continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 10) continue;
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, d = Math.hypot(mx - x, my - y);
      if (d > R) continue;
      if (!best || d < best.d) best = { d, x: mx, y: my, a: Math.atan2(b[1] - a[1], b[0] - a[0]), name: r.name || '' };
    }
  }
  return best;
}
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28);
const spots = [];
const used = new Set();
const add = (naam, cat, x, y, R, pick, nacht) => {
  const s = roadNear(x, y, R, pick);
  if (!s) return;
  const key = Math.round(s.x / 20) + ',' + Math.round(s.y / 20);
  if (used.has(key)) return;
  used.add(key);
  spots.push({ name: 's' + String(spots.length + 1).padStart(2, '0') + '-' + slug(naam), cat, x: +s.x.toFixed(1), y: +s.y.toFixed(1), a: +s.a.toFixed(3), street: s.name, nacht: !!nacht });
};
const LM = m.meta.landmarks;
// 1. alle oriëntatiepunten (Grote Markt, Vismarkt, Martinitoren, station, museum ...)
LM.forEach((l, i) => add(l.name, 'landmark', l.x, l.y, 160, null, i % 2 === 0));
// 2. wijken: elke derde buurtpunt
const NB = m.meta.neighbourhoodPoints;
NB.filter((_, i) => i % 3 === 0).forEach((n, i) => add(n.name, 'wijk', n.x, n.y, 200, null, i % 3 === 0));
// 3. bruggen (vaste, beweegbare) in de stad
const bridges = roads.filter((r) => r.bridge && r.pts.length >= 2 && ['major', 'normal'].includes(r.cat));
const BR = [];
for (const r of bridges) { const mid = r.pts[Math.floor(r.pts.length / 2)]; if (Math.abs(mid[0]) < 2500 && Math.abs(mid[1]) < 2500) BR.push({ r, mid }); }
BR.sort((a, b) => (a.r.osm || 0) - (b.r.osm || 0));
const step = Math.max(1, Math.floor(BR.length / 8));
BR.filter((_, i) => i % step === 0).slice(0, 8).forEach(({ r, mid }, i) => add('brug-' + (r.name || i), 'brug', mid[0], mid[1], 60, (q) => q === r, i % 2 === 0));
// 4. de ring en grote wegen, viaducten en tunnels
const ring = roads.filter((r) => r.cat === 'major' && (r.tunnel || r.bridge || (r.z && r.z.some((z) => Math.abs(z) > 3))));
ring.slice(0, 40).filter((_, i) => i % 6 === 0).forEach((r, i) => { const mid = r.pts[Math.floor(r.pts.length / 2)]; add('kunstwerk-' + (r.name || i), 'kunstwerk', mid[0], mid[1], 60, (q) => q === r, i % 2 === 0); });
// 5. spoor: station en de lijn
for (const st of (m.stations || []).slice(0, 3)) { const x = st.x ?? (st.pts && st.pts[0][0]), y = st.y ?? (st.pts && st.pts[0][1]); if (x !== undefined) add('station-' + (st.name || ''), 'spoor', x, y, 200, null, true); }
// 6. water: wegen vlak langs de grote waterlichamen (kades, Noorderhaven, Diepenring)
const water = m.water.filter((w) => w.pts && w.pts.length > 20).sort((a, b) => b.pts.length - a.pts.length).slice(0, 10);
water.forEach((w, i) => { const p = w.pts[Math.floor(w.pts.length * (0.15 + 0.7 * ((i * 0.37) % 1)))]; add('water-' + i, 'water', p[0], p[1], 50, null, i % 2 === 0); });
// 7. raster over het centrum en de rand van de stad voor de rest (gebouwen, groen, bomen, parken)
for (let gx = -2400; gx <= 2400; gx += 1200) for (let gy = -2400; gy <= 2400; gy += 1200) add('raster-' + gx + '_' + gy, 'raster', gx, gy, 220, null, false);

fs.writeFileSync(OUT, JSON.stringify({ gemaakt: 'citymap.json', n: spots.length, spots }, null, 1));
const per = {}; for (const s of spots) per[s.cat] = (per[s.cat] || 0) + 1;
console.log(`${spots.length} plekken (${JSON.stringify(per)}), ${spots.filter((s) => s.nacht).length} ook bij nacht -> ${path.relative(ROOT, OUT)}`);
