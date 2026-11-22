// Akte 3: staan de reisdoelen van de stappen op een plek die de speler kan bereiken?  node scripts/akte3_plekken_test.mjs
// Leest de OSM-tegels van de provincie (data/cache/province, alleen lezen) en toetst per reisdoel (J2, J3, K3, T3 en de
// vaste ankers uit de cutscenes): niet in een gebouw, niet in water, en een begaanbare weg of pad binnen 80 m.
// Zonder de tegels slaat de test zich over (zoals akte3_test).
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import './node3d.mjs';

const { STEPS } = await import('../game/js/storyarc_nieuw.js');
const root = new URL('../', import.meta.url);
const dir = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'data', 'cache', 'province');
if (!fs.existsSync(dir)) { console.log('SKIP akte3_plekken_test: geen data/cache/province'); process.exit(0); }

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

// doelen: reisstappen van akte 3 plus vaste cutscene-ankers
const doelen = STEPS.filter((s) => s.part === 'staart' && s.goal && s.goal.type === 'reis' && s.goal.at)
  .map((s) => ({ id: s.id, naam: s.goal.to, lat: s.goal.at[0], lon: s.goal.at[1], r: s.goal.r || 300 }));
doelen.push({ id: 'M16.dijk', naam: 'dijk bij Blauwestad', lat: 53.17, lon: 6.988, r: 300 });
ok(doelen.length >= 5, 'er zijn reisdoelen in akte 3', String(doelen.length));
// de missiepunten (start, fasedoelen, waypoints) uit een momentopname van akte3_doelen_dump.mjs (zwaar: laadt de stad); ververs hem na een verplaatsing
const snap = JSON.parse(fs.readFileSync(new URL('akte3_doelen_snapshot.json', import.meta.url), 'utf8'));
for (const p of snap.filter((q) => q.lat)) doelen.push({ id: p.id, naam: p.soort, lat: p.lat, lon: p.lon, r: p.soort === 'start' ? 6 : 30, voertuig: p.id === 'M14' && p.soort === 'start', vlieg: p.id === 'M12' || p.id === 'M15' });

const mPerLat = 111320, mPerLon = (lat) => 111320 * Math.cos((lat * Math.PI) / 180);
const dist = (a, b) => Math.hypot((a[0] - b[0]) * mPerLat, (a[1] - b[1]) * mPerLon(a[0]));
const inPoly = (p, g) => { let c = false; for (let i = 0, j = g.length - 1; i < g.length; j = i++) { if ((g[i][0] > p[0]) !== (g[j][0] > p[0]) && p[1] < ((g[j][1] - g[i][1]) * (p[0] - g[i][0])) / (g[j][0] - g[i][0]) + g[i][1]) c = !c; } return c; };
const segDist = (p, a, b) => { const ky = mPerLon(p[0]); const ax = (a[1] - p[1]) * ky, ay = (a[0] - p[0]) * mPerLat, bx = (b[1] - p[1]) * ky, by = (b[0] - p[0]) * mPerLat; const dx = bx - ax, dy = by - ay; const l = dx * dx + dy * dy; const t = l ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l)) : 0; return Math.hypot(ax + t * dx, ay + t * dy); };
const WEG = new Set(['residential', 'service', 'tertiary', 'secondary', 'primary', 'unclassified', 'living_street', 'pedestrian', 'footway', 'path', 'track', 'cycleway', 'road', 'trunk']);

const res = doelen.map((d) => ({ ...d, gebouw: 0, water: 0, weg: Infinity }));
for (const f of fs.readdirSync(dir).filter((x) => /^c-?\d+_-?\d+\.json\.gz$/.test(x))) {
  const j = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, f))));
  for (const e of j.elements) {
    if (e.type !== 'way' || !e.g || !e.g.length) continue;
    const t = e.tags || {};
    for (const r of res) {
      const p = [r.lat, r.lon];
      // een lange weg begint soms ver weg: kijk naar alle punten, niet alleen naar het eerste
      if (!e.g.some((q) => Math.abs(q[0] - r.lat) < 0.02 && Math.abs(q[1] - r.lon) < 0.03)) continue;
      if (t.building && e.g.length > 3 && inPoly(p, e.g)) r.gebouw++;
      if ((t.natural === 'water' || t.waterway === 'riverbank' || t.landuse === 'reservoir') && e.g.length > 3 && inPoly(p, e.g)) r.water++;
      if (WEG.has(t.highway)) for (let i = 1; i < e.g.length; i++) r.weg = Math.min(r.weg, segDist(p, e.g[i - 1], e.g[i]));
    }
  }
}
for (const r of res) {
  ok(r.gebouw === 0, `${r.id} ${r.naam}: niet in een gebouw`);
  ok(r.water === 0, `${r.id} ${r.naam}: niet in water`);
  if (!r.vlieg) ok(r.weg <= Math.max(80, r.r), `${r.id} ${r.naam}: een weg of pad binnen bereik`, `${Math.round(r.weg)} m`);
  if (r.voertuig) ok(r.weg <= 15, `${r.id} ${r.naam}: de auto staat op de weg`, `${Math.round(r.weg)} m`);
  console.log(`  ${r.id.padEnd(9)} ${String(r.naam).padEnd(32)} weg ${Number.isFinite(r.weg) ? Math.round(r.weg) + ' m' : 'geen'}, gebouw ${r.gebouw}, water ${r.water}, straal ${r.r}`);
}
console.log(`akte3_plekken_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
