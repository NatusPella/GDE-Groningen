// De ruwe vaargegevens voor de vaarnetwerkgraaf (#184): de waterpolygonen,
// de bruggen over water (met dekhoogte) en de sluizen van de provincietegels,
// plus de stad uit de OSM-tegelbouw (loadworld.mjs) (de provinciegegevens laten de stad leeg).
// Alleen lezen; node-only. Geen Three.js.
import fs from 'node:fs';
import zlib from 'node:zlib';
import * as G from '../../game/js/gdt.js';

const gameDir = new URL('../../game/', import.meta.url);

// { water: [{ pts, kind, nav, lv, dp, body, name, lock }], bridges: [{ pts, z, width, movable, name, gid, city }], houseboats: [{ pts, osm }], locks, edge, cityTiles }
export function loadProvinceVaar(worldDir = new URL('world/', gameDir)) {
  const idx = JSON.parse(fs.readFileSync(new URL('index-provincie.json', worldDir)));
  const packs = {};
  const water = [], bridges = [], houseboats = [], seenW = new Set(), seenB = new Set(), seenH = new Set();
  for (const [key, t] of Object.entries(idx.tiles)) {
    if (!t.n || (!t.n.water && !t.n.roads)) continue;
    const p = idx.packs[t.pack];
    const f = packs[p.file] || (packs[p.file] = fs.readFileSync(new URL(p.file, worldDir)));
    const bytes = new Uint8Array(zlib.inflateRawSync(f.subarray(t.off, t.off + t.len)));
    const head = G.blobHeader(bytes), strings = G.blobStrings(bytes, head);
    const sec = (type) => { const s = head.sections.find((q) => q.type === type); return s ? G.decodeSection(bytes, s, strings, head.i, head.j).rows : []; };
    // the houseboats moored in a canal are a wall for a boat (#343)
    if (t.n.water) for (const b of sec(G.SECTION.BUILDINGS)) {
      if (b.type !== 'houseboat') continue;
      const hid = b.osm ?? b.gid;
      if (hid !== undefined) { if (seenH.has(hid)) continue; seenH.add(hid); }
      houseboats.push({ pts: b.pts, osm: b.osm });
    }
    for (const w of sec(G.SECTION.WATER)) {
      const id = w.gid;
      if (id !== undefined) { if (seenW.has(id)) continue; seenW.add(id); }
      water.push({ pts: w.pts, kind: w.kind, nav: w.nav ?? 0, lv: w.lv, dp: w.dp, body: w.body, name: w.name || '', lock: !!w.lock, tile: key });
    }
    const rows = sec(G.SECTION.ROADS).filter((r) => r.bridge);
    if (!rows.length) continue;
    const zs = new Map();
    for (const h of sec(G.SECTION.HEIGHTS)) zs.set(h.gid, h.z);
    for (const r of rows) {
      if (r.gid !== undefined) { if (seenB.has(r.gid)) continue; seenB.add(r.gid); }
      bridges.push({ pts: r.pts, z: zs.get(r.gid) || null, width: r.width || 4, movable: r.movable || '', name: r.name || '', type: r.type || '', gid: r.gid, tile: key });
    }
  }
  return { water, bridges, houseboats, locks: idx.global.locks || [], edge: idx.global.edge, cityTiles: new Set(idx.global.city || []), idx };
}
