// #509: wat raakt de auto bij (-610,-1154)? perrons, keerwanden, passages, rails.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);
await import('./node3d.mjs');
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
const { loadCityData } = await import('./lib/loadworld.mjs');
const data = await loadCityData();
applyMapExtras(data);
const map = new GameMap(data);

const punten = [[-610, -1154], [-614, -1147], [-604, -1142], [-587, -1143]];
for (const [x, y] of punten) {
  console.log(`\n=== (${x}, ${y})`);
  const pr = (map.perrons || []).filter((p) => {
    const P = p.pts || p.ring || [];
    return P.some((q) => Math.hypot(q[0] - x, q[1] - y) < 25);
  });
  console.log(`  perrons in de buurt: ${pr.length}`);
  for (const p of pr.slice(0, 4)) console.log(`    perron z=${p.z} h=${p.h} pts=${(p.pts || p.ring || []).length}`);
  const walls = (map.elev && map.elev.walls || []).filter((w) => Math.hypot((w.ax + w.bx) / 2 - x, (w.ay + w.by) / 2 - y) < 8);
  console.log(`  keerwanden binnen 8 m: ${walls.length}${walls.length ? ' -> ' + walls.map((w) => `${w.kind}${w.low ? '(low)' : ''} z=${w.z != null ? w.z.toFixed(1) : '?'}`).join(', ') : ''}`);
  const rails = (map.rails || []).filter((r) => (r.pts || []).some((q) => Math.hypot(q[0] - x, q[1] - y) < 12));
  console.log(`  sporen binnen 12 m: ${rails.length}`);
  const graf = (map.garages || []).filter((g) => g.pts && g.pts.some((q) => Math.hypot(q[0] - x, q[1] - y) < 15));
  console.log(`  garages in de buurt: ${graf.length}`);
  if (map.surfaceAt) {
    const s = map.surfaceAt(x, y, { z: 0 });
    console.log('  surfaceAt:', s && { z: s.z, cat: s.cat, name: s.name, ribbon: !!s.ribbon });
  }
}
