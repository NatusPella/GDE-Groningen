// De echte kaart met de perrons van alle stations (stad en landhaltes), zoals het spel ze bijzet, voor scripts/world/perron_vloer_audit.mjs en de test.
// Zonder gebouwde wereld (game/world of GAME_WORLD met index-provincie.json) geeft heeftStationkaart() false.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../node3d.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const wereld = () => path.resolve(process.env.GAME_WORLD || path.join(ROOT, 'game', 'world'));
export const heeftStationkaart = () => fs.existsSync(path.join(wereld(), 'index-provincie.json'));

export async function laadStationKaart() {
  const dir = wereld();
  const S = await import('../../game/js/tilestore.js');
  const TW = await import('../../game/js/tileworld.js');
  const PW = await import('../../game/js/provinceworld.js');
  const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(path.join(dir, f))))) : undefined) });
  const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
  const map = T.world;
  PW.initProvince({ index: T.index, world: map });
  const F = await import('../../game/js/countryfield.js');
  F.setCountryBounds(map.meta.bounds);
  const { applyCityRoutes } = await import('../../game/js/corridorrail.js');
  applyCityRoutes(map, JSON.parse(fs.readFileSync(path.join(dir, 'provincie-land.json'), 'utf8')));
  const RW = await import('../../game/js/railway.js');
  RW.initRailway({ map, vehicles: [], pedestrians: [], player: { x: 0, y: 0, angle: 0, vx: 0, vy: 0, z: 0, gz: 0, radius: 0.35 }, time: 0, clock: 10, addMessage() {} });
  const ST = await import('../../game/js/stationtravel.js');
  const E = await import('../../game/js/elevation.js');
  // de perronrijen: die van de stad (map.perrons) en een rij per landhalte, gebouwd zoals stationtravel.js placeCountryStation
  const rows = [...(map.perrons || [])];
  const landhaltes = [];
  for (const d of map.countryStations || []) {
    let found = null;
    for (const r of RW.getRoutes()) { const st = r.stops.find((q) => q.name === d.name && !q.offmap); if (st) { found = { r, st }; break; } }
    if (!found) { landhaltes.push({ naam: d.name, route: null }); continue; }
    const { r, st } = found;
    const andere = RW.getRoutes().filter((q) => q !== r);
    const { px, py, tx, ty, nx, ny } = ST.countryPlatformPlan(r, st.s, d, andere);
    const row = ST.countryPlatformRow(px, py, tx, ty, nx, ny, d.name, r, st.s);
    rows.push(row);
    landhaltes.push({ naam: d.name, route: r, s: st.s, row });
  }
  const elev = E.addPerrons({ perrons: rows, roads: [], terrainOn: false }, { has: false });
  const polys = RW.getRoutes().map((r) => r.pts);
  const dichtbij = (x, y) => {
    let best = null;
    for (const P of polys) {
      for (let i = 0; i < P.length - 1; i++) {
        const [ax, ay] = P[i], [bx, by] = P[i + 1];
        if ((ax < x - 60 && bx < x - 60) || (ax > x + 60 && bx > x + 60) || (ay < y - 60 && by < y - 60) || (ay > y + 60 && by > y + 60)) continue;
        const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
        const d = Math.hypot(x - ax - dx * t, y - ay - dy * t);
        if (best === null || d < best.d) best = { d, x: ax + dx * t, y: ay + dy * t };
      }
    }
    return best !== null && best.d < 60 ? best : null;
  };
  const trackDist = (x, y) => { const q = dichtbij(x, y); return q ? q.d : null; };
  // de spoorvloer onder het dichtstbijzijnde spoor (het profiel kent alleen punten op het spoor zelf)
  const railZ = (x, y) => { const q = dichtbij(x, y); return q && q.d < 8 ? RW.railZ(q.x, q.y) : null; };
  return { map, RW, rows, elev, landhaltes, trackDist, railZ };
}
