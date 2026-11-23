// Beeldblad van de benoemde stadslandmarks (landmarks3d.js) op hun echte voetafdruk: dag van schuin boven, avond, en de drie
// detailniveaus (vol, massa, silhouet), met driehoeken en draw calls. Software-render zonder Electron (scripts/lib/landmark_render.mjs).
//   node scripts/landmark_inventaris.mjs --dump=<voetafdrukken.json>     (eenmalig; vraagt de OSM-cache van de stadsbouw)
//   node scripts/landmarks_aaa_blad.mjs <voetafdrukken.json> <uitmap> [bronmap met game/js, standaard deze repo] [voor|na]
// Voor een voor/na-vergelijking: pak de oude commit uit (git archive <commit> game/js | tar -x -C <map>) en geef die map als derde argument;
// daarna schrijft scripts/landmarks_aaa_pagina.mjs <uitmap> de webpagina.
import './node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderLandmark } from './lib/landmark_render.mjs';

const [dumpFile, out = 'landmarks_aaa', src = path.resolve(import.meta.dirname, '..'), tag = 'na'] = process.argv.slice(2);
const L = await import(pathToFileURL(path.join(src, 'game/js/landmarks3d.js')).href);
fs.mkdirSync(out, { recursive: true });
const items = JSON.parse(fs.readFileSync(dumpFile, 'utf8'));
// one picture per model: the Paddepoel blocks and the Euroborg stands are many buildings, the first is enough
const seen = new Set();
const NAMED = ['Stadhuis', 'Prinsenhof', 'Synagoge', 'Sint-Jozefkathedraal', 'Stadsschouwburg', 'Pepergasthuis', 'Apenrots', 'Rijkskantoor Kempkensberg'];
const VIEW = {
  Martinikerk: { yaw: 200 }, 'Der Aa-kerk': { yaw: 150 }, Goudkantoor: { yaw: 70, pitch: 16 }, 'Hoofdstation Groningen': { yaw: 20 },
  'Forum Groningen': { yaw: 160 }, Academiegebouw: { yaw: 200 }, Stadhuis: { yaw: 80, pitch: 18 }, Prinsenhof: { yaw: 210 }, Synagoge: { yaw: 270, pitch: 14 }, 'Sint-Jozefkathedraal': { yaw: 90, pitch: 18 }, Stadsschouwburg: { yaw: 270, pitch: 16 }, Pepergasthuis: { yaw: 0, pitch: 18 },
};
const glow = { 2: [0.06, 0.045, 0.03], 5: [1.0, 0.7, 0.38] };
const stats = {};
for (const b of items) {
  const key = b.landmark || b.name;
  if (seen.has(key) || !(b.landmark || NAMED.includes(b.name))) continue;
  seen.add(key);
  const ring = b.pts;
  const edges = L.modelKit.edgesOf(ring);
  const file = key.replace(/[^A-Za-z0-9]+/g, '_');
  const levels = [0, 1, 2].map((lod) => (L.landmarkLodStats || lod === 0 ? L.buildLandmarkGeometry(b, ring, edges, lod) : null));
  if (!levels[0]) continue;
  const v = VIEW[key] || { yaw: 35 };
  fs.writeFileSync(`${out}/${tag}_${file}_dag.png`, renderLandmark(levels[0], { ...v }));
  fs.writeFileSync(`${out}/${tag}_${file}_avond.png`, renderLandmark(levels[0], { ...v, night: true, glow }));
  const s = levels.map((g) => (g ? { tris: g.attributes.position.count / 3, draws: g.groups.filter((q) => q.count > 0).length } : null));
  if (levels[1] && levels[2]) {
    for (const lod of [1, 2]) fs.writeFileSync(`${out}/${tag}_${file}_lod${lod}.png`, renderLandmark(levels[lod], { ...v, w: 480, h: 320 }));
  }
  stats[key] = s;
  console.log(key.padEnd(28), s.map((q) => (q ? `${q.tris} tris/${q.draws} draws` : '-')).join('  |  '));
  for (const g of levels) if (g) g.dispose();
}
fs.writeFileSync(`${out}/${tag}_stats.json`, JSON.stringify(stats, null, 1));
console.log('klaar', out);
