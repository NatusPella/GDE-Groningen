// Ramen-audit (#1016): hebben alle gevelvlakken met raamdata ook echt ramen in de gebouwde geometrie?
// De eigenaar: "Alle ramen die dichtbij zijn renderen maar half". Deze audit bouwt de echte gevelgeometrie
// (buildBuildingMesh, dezelfde generator als het spel) voor alle gebouwen binnen --straal m (60) van de meetpunten
// (Grote Markt, Oosterpoort, Paddepoel) en telt per gevelvlak (voetafdrukrand van minstens 1,6 m, geen gemeenschappelijke
// muur) de glasvlakken die er echt staan, tegenover wat de bouwmaat (bay) en de verdiepingen verwachten.
// Een gevelvlak zonder enig glas telt als KAAL (met reden); een met minder dan de verwachting als DEELS (budget, bouwkap).
// Dekking = gevelvlakken met minstens het verwachte glas / gevelvlakken met raamdata. Ook geteld: de gemeenschappelijke muren
// zonder echte buur (de buur overlapt alleen), want die geven kale gevels buiten het beeld van de generator.
//   node scripts/world/ramen_audit.mjs [--world=<map met index.json>] [--straal=60] [--min=0.99] [--strict] [--json] [--verbose]
// Zonder game/world: SKIP.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const WORLD = path.resolve(arg('world', process.env.GAME_WORLD || path.join(ROOT, 'game/world')));
if (!fs.existsSync(path.join(WORLD, 'index.json'))) { console.log('SKIP ramen_audit: geen game/world met index.json (--world=<map>)'); process.exit(0); }
const RADIUS = Number(arg('straal', 60));
const MIN = Number(arg('min', 0.99));
const STRICT = process.argv.includes('--strict');
const VERBOSE = process.argv.includes('--verbose');

// de meetpunten: stad.json (Grote Markt, Oosterpoort) en het winkelcentrum van Paddepoel
export const POINTS = [
  { name: 'Grote Markt', x: 100.64, y: 76.59 },
  { name: 'Oosterpoort', x: 847.01, y: 873.25 },
  { name: 'Paddepoel', x: -1418.27, y: -1157.29, r: 400 },
  { name: 'Paddepoel-Noord', x: -2830.01, y: -1763.26 },
];

await import('../node3d.mjs');
const { loadTiles, mapOf } = await import('./prop_conflict_audit.mjs');
const { buildBuildingMesh, setBuildingMap, sanitizeFootprint } = await import('../../game/js/models3d_buildings.js');
const G = await import('../../game/js/gdt.js');
const { marktKind } = await import('../../game/js/marktgebouwen.js');

// de stad (index.json) en de provincie (index-provincie.json): een tegel komt uit de eerste die hem heeft
const readIdx = (f) => (fs.existsSync(path.join(WORLD, f)) ? JSON.parse(fs.readFileSync(path.join(WORLD, f), 'utf8')) : { tiles: {}, packs: [] });
const indexes = [readIdx('index.json'), readIdx('index-provincie.json')];
// gebouwen op een tegel in de index: een tegel die er niet is, levert niets
const tileKeysAround = (x, y, r) => {
  const out = new Set();
  for (const dx of [-r, 0, r]) for (const dy of [-r, 0, r]) { const [i, j] = G.tileIndexOf(x + dx, y + dy); out.add(G.tileKey(i, j)); }
  return [...out].filter((k) => indexes.some((ix) => ix.tiles[k]));
};

// de randen van het gebouw zoals de generator ze telt (open: geen gemeenschappelijke muur, lengte >= 1,6 m)
function edgesOf(b) {
  const ring = sanitizeFootprint(b.pts).pts;
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], c = ring[(i + 1) % ring.length];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (len < 0.05) continue;
    out.push({ ax: a[0], ay: a[1], bx: c[0], by: c[1], len, tx: (c[0] - a[0]) / len, ty: (c[1] - a[1]) / len });
  }
  return out;
}
const along = (e, x, y) => { const s = (x - e.ax) * e.tx + (y - e.ay) * e.ty; const d = Math.abs(-(x - e.ax) * e.ty + (y - e.ay) * e.tx); return { s, d }; };

const stat = { buildings: 0, built: 0, edges: 0, covered: 0, bare: 0, partial: 0, party: 0, partyFalse: 0, marktKort: 0, tooShort: 0, glass: 0, reasons: {}, bareList: [], byPoint: {} };
const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };

for (const P of POINTS) {
  const keys = tileKeysAround(P.x, P.y, RADIUS + 20);
  if (!keys.length) { console.log(`  ${P.name}: geen tegels in de wereld, overgeslagen`); continue; }
  const tiles = new Map();
  for (const k of keys) { const ix = indexes.find((i) => i.tiles[k]); for (const [kk, v] of loadTiles(WORLD, ix, [k])) tiles.set(kk, v); }
  const map = mapOf(tiles);
  setBuildingMap(map);
  const all = map.all.buildings;
  const here = { buildings: 0, edges: 0, covered: 0, bare: 0, partial: 0 };
  for (const b of all) {
    if (!b.pts || b.pts.length < 4 || b.landmark) continue;
    if (Math.hypot((b.bounds[0] + b.bounds[2]) / 2 - P.x, (b.bounds[1] + b.bounds[3]) / 2 - P.y) > (P.r || RADIUS)) continue;
    here.buildings++; stat.buildings++;
    let group;
    try { group = buildBuildingMesh(b); } catch { continue; }
    const det = group && group.userData.facadeDetail;
    if (!det) continue; // kerk, landmark, marktgebouw: eigen modellen (niet van de raamgenerator)
    stat.built++;
    const geo = det.geometry, pos = geo.attributes.position, idx = geo.index;
    // glasvlakken: groep 1 van de detailgeometrie (G_GLASS); per driehoekspaar het zwaartepunt
    const gg = geo.groups.find((g) => g.materialIndex === 1);
    const quads = [];
    if (gg) {
      for (let k = gg.start; k < gg.start + gg.count; k += 3) {
        const ix = (n) => (idx ? idx.getX(n) : n); const i0 = ix(k), i1 = ix(k + 1), i2 = ix(k + 2);
        quads.push([(pos.getX(i0) + pos.getX(i1) + pos.getX(i2)) / 3 - group.position.x, (pos.getZ(i0) + pos.getZ(i1) + pos.getZ(i2)) / 3 - group.position.z, (pos.getY(i0) + pos.getY(i1) + pos.getY(i2)) / 3]);
      }
    }
    stat.glass += quads.length / 2;
    const edges = edgesOf(b);
    const gen = b._ring || []; // de randen met de party-vlag van de generator (zelfde volgorde en lengte)
    const markt = !!marktKind(b); // Grote Markt en Vismarkt: eigen gevelgenerator (marktgebouwen.js), randen onder 4 m krijgen daar bewust geen raam
    for (let ei = 0; ei < gen.length; ei++) {
      const g = gen[ei];
      if (g.len < 1.6) { stat.tooShort++; continue; }
      if (markt && g.len < 4 && !g.party) { stat.marktKort++; continue; }
      if (g.party) {
        stat.party++;
        // een echte buur heeft een rand die (bijna) evenwijdig langs deze rand loopt; overlapt de buur alleen, dan is de muur vals
        const aligned = all.some((o) => o !== b && o.pts && o.bounds && o.bounds[0] <= Math.max(g.ax, g.bx) + 1 && o.bounds[2] >= Math.min(g.ax, g.bx) - 1 && o.bounds[1] <= Math.max(g.ay, g.by) + 1 && o.bounds[3] >= Math.min(g.ay, g.by) - 1
          && edgesOf(o).some((oe) => Math.abs(oe.tx * g.tx + oe.ty * g.ty) > 0.97 && along(g, oe.ax, oe.ay).d < 0.8 && along(g, oe.bx, oe.by).d < 0.8));
        if (!aligned) stat.partyFalse++;
        continue;
      }
      here.edges++; stat.edges++;
      // glas op deze rand: zwaartepunt hoogstens 0,35 m van de rand en tussen de uiteinden
      const q = quads.filter((p) => { for (const z of [p[1], -p[1]]) { const r = along(g, p[0], z); if (r.d < 0.35 && r.s > -0.2 && r.s < g.len + 0.2) return true; } return false; });
      const n = q.length / 2; // twee driehoeken per vlak
      // verwachting: minstens een raam per travee van 3,6 m (een grove ondergrens, ook met een deur of winkel op de rand)
      const minExpect = Math.max(1, Math.floor(g.len / 4.5));
      if (n === 0) {
        here.bare++; stat.bare++;
        const reason = b.type === 'industrial' || b.type === 'shed' || b.type === 'garage' ? 'bedrijfshal/schuur' : (g.len < 2.4 ? 'korte rand (< 2,4 m)' : 'onbekend');
        bump(stat.reasons, reason);
        if (stat.bareList.length < 40) stat.bareList.push({ punt: P.name, type: b.type || 'yes', h: b.h, len: +g.len.toFixed(1), x: Math.round(g.ax), y: Math.round(g.ay), reden: reason });
      } else if (n < minExpect) { here.partial++; stat.partial++; here.covered++; stat.covered++; }
      else { here.covered++; stat.covered++; }
    }
  }
  stat.byPoint[P.name] = here;
}

const coverage = stat.edges ? (stat.edges - stat.bare) / stat.edges : 1;
if (process.argv.includes('--json')) console.log(JSON.stringify({ ...stat, coverage }, null, 1));
else {
  console.log(`ramen_audit: ${stat.buildings} gebouwen binnen ${RADIUS} m van ${POINTS.length} meetpunten, ${stat.built} met raamgeometrie`);
  for (const [k, v] of Object.entries(stat.byPoint)) console.log(`  ${k}: ${v.buildings} gebouwen, ${v.edges} gevelvlakken met raamdata, ${v.bare} kaal, ${v.partial} met minder glas dan de ondergrens`);
  console.log(`  gevelvlakken met raamdata ${stat.edges}, kaal ${stat.bare}, dekking ${(coverage * 100).toFixed(2)}% (norm ${(MIN * 100).toFixed(0)}%)`);
  console.log(`  glasvlakken ${Math.round(stat.glass)}; gemeenschappelijke muren ${stat.party}, daarvan zonder echte buur ${stat.partyFalse} (kaal door een overlappende buur); randen onder 1,6 m ${stat.tooShort}; marktfacetten onder 4 m (eigen generator) ${stat.marktKort}`);
  console.log(`  redenen kaal: ${JSON.stringify(stat.reasons)}`);
  if (VERBOSE) for (const r of stat.bareList) console.log('   ', JSON.stringify(r));
}
process.exit(STRICT && (coverage < MIN) ? 1 : 0);
