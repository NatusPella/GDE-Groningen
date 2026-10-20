// De stad als citymap-tegels (A) naast de stad uit de OSM-bouw met het stadsprofiel (B), als twee
// TileWorlds, en dezelfde vragen aan allebei (#90 fase 3): waterAt, groundHeightAt,
// nearestRoadPoint en buildingsNear op een raster in de kerntegels. Geeft per vraag het deel dat gelijk is.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import '../node3d.mjs';
import * as G from '../../game/js/gdt.js';
import * as P from '../world/pack_tiles.mjs';
import { buildProvince } from '../world/build_province.mjs';
import { diffTiles, CORE_BUILDINGS } from '../world/city_diff.mjs';
import { loadLegacySources } from './loadworld.mjs';

// de globale laag zonder de dichte stads-gids: geen vaste set, alles komt gestreamd (gids van de provincie)
export function streamedGlobal(bytes) {
  const d = G.decodeBlob(bytes);
  return G.encodeBlob({ builder: d.builder, sections: d.sections.map((s) => (s.type === G.SECTION.META && s.json && s.json.counts ? { type: s.type, json: { ...s.json, counts: {}, clippedWays: [] } } : s)) });
}

// pinned: de tegels die vast in het geheugen staan (de stad); de rest wordt gestreamd, zoals de provincie
export async function worldOf(built, blobs, { pinned = true } = {}) {
  const S = await import('../../game/js/tilestore.js');
  const { loadTileWorld } = await import('../../game/js/tileworld.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-parity-'));
  try {
    P.writeWorld(dir, { ...built, blobs, ...(pinned ? null : { global: streamedGlobal(built.global) }) }, pinned ? new Set(blobs.keys()) : new Set());
    const files = {};
    for (const f of fs.readdirSync(dir)) files[f] = new Uint8Array(fs.readFileSync(path.join(dir, f)));
    const tw = await loadTileWorld('world/', { source: new S.MemorySource(files), pool: false });
    if (!pinned) {
      await Promise.all([...blobs.keys()].map((k) => tw.store.request(k, { priority: 0 })));
      tw.world.tileQueue.run(1e9);
    }
    return tw.world;
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

// { A, B, core: [key], city }: B is alleen de kerntegels uit de OSM-bouw, gestreamd zoals de provincie
export async function buildPair() {
  const city = P.build(await loadLegacySources());
  const probe = buildProvince({ cityKeys: new Set(), only: new Set(city.blobs.keys()), profile: new Set(city.blobs.keys()), map: false, fillOld: false });
  const { perTile } = diffTiles(city.blobs, probe.blobs);
  const core = [...perTile].filter(([, t]) => t.schaduw && t.stad.gebouwen >= CORE_BUILDINGS).map(([k]) => k);
  const blobsB = new Map(core.map((k) => [k, probe.blobs.get(k)]));
  return { A: await worldOf(city, city.blobs), B: await worldOf(city, blobsB, { pinned: false }), core, city };
}

const inside = (x, y, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) if ((pts[i][1] > y) !== (pts[j][1] > y) && x < ((pts[j][0] - pts[i][0]) * (y - pts[i][1])) / (pts[j][1] - pts[i][1]) + pts[i][0]) c = !c; return c; };

// raster (m) over de kerntegels (rand 40 m weg: de randen hangen van de buurtegel af)
export function compare(A, B, core, step = 25) {
  const r = { points: 0, water: { pairs: {}, both: 0, dryA: 0, dryB: 0, kind: 0, nav: 0, lv: 0 }, building: { agree: 0, n: 0 }, road: { n: 0, within3: 0, within8: 0, catAgree: 0 }, height: { n: 0, within05: 0 } };
  for (const k of core) {
    const [i, j] = G.tileFromKey(k), [ox, oy] = G.tileOrigin(i, j);
    for (let x = ox + 40; x < ox + G.TILE_M - 40; x += step) for (let y = oy + 40; y < oy + G.TILE_M - 40; y += step) {
      r.points++;
      const wa = A.waterAt ? A.waterAt(x, y) : null;
      const pa = A.waterNear(x, y, 1).find((p) => inside(x, y, p.pts)), pb = B.waterNear(x, y, 1).find((p) => inside(x, y, p.pts));
      if (pa && pb) { r.water.both++; const pk = `${pa.kind}>${pb.kind}`; r.water.pairs[pk] = (r.water.pairs[pk] || 0) + 1; if (pk === 'kanaal>vijver') (r.water.ex || (r.water.ex = [])).push([k, Math.round(x), Math.round(y), pa.body, pb.body, pb.name || '', pa.name || '']); if (pa.kind === pb.kind) r.water.kind++; if (pa.nav === pb.nav) r.water.nav++; if (pa.lv === pb.lv) r.water.lv++; }
      else if (pa) r.water.dryB++; else if (pb) r.water.dryA++;
      const ba = A.buildingsNear(x, y, 0.5).some((b) => inside(x, y, b.pts)), bb = B.buildingsNear(x, y, 0.5).some((b) => inside(x, y, b.pts));
      r.building.n++; if (ba === bb) r.building.agree++;
      const na = A.nearestRoadPoint(x, y, 60), nb = B.nearestRoadPoint(x, y, 60);
      if (na && nb) {
        r.road.n++;
        const da = Math.hypot(na.x - x, na.y - y), db = Math.hypot(nb.x - x, nb.y - y);
        if (Math.abs(da - db) <= 3) r.road.within3++;
        if (Math.abs(da - db) <= 8) r.road.within8++;
      }
      const ha = A.groundHeightAt(x, y), hb = B.groundHeightAt(x, y);
      r.height.n++; if (Math.abs(ha - hb) <= 0.5) r.height.within05++;
    }
  }
  return r;
}
