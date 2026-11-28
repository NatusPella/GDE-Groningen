// Doorlopend viaduct (#1339): over de hele gebouwde wereld (stad en provincie) geen onderbreking van het dek waar het profiel hoog hoort.
//   node scripts/world/viaduct_doorloop_audit.mjs [--strict]     (game/world of GAME_WORLD met de provincie; zonder: SKIP)
// Leest alle spoorrijen (stad: map.rails; provincie: alle tegels met spoor), telt de dekstukken (z >= DECK_Z) VOOR en NA railvalley.js fillRailValleys en meldt:
//   - dekstukken en dekmeters voor en na, en de kuilen die gevuld zijn (met hoogteprofiel) of waarom niet;
//   - onderbrekingen: een kuil korter dan MAX_KUIL tussen twee dekstukken die na de pass nog bestaat;
//   - gat tussen dek en spoorbed: een hoogtesprong in het spoor van meer dan 0,5 m binnen 12 m (dek en bed sluiten niet meer aan);
//   - object in het dek: een gebouw op de hartlijn van het dek; een weg op maaiveld onder het dek is een kruising en krijgt de vrije hoogte (onderkant dek 3,2 m);
//   - dek zonder pijlers: pijlerplekken om de 15 m (zoals railway3d deckPiers, niet op een weg); meer dan 60 m dek zonder plek is een brug zonder pijlers.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../node3d.mjs';
import { fillRailValleys, kaartHindernis, zetKuilVulling, spoorKetens, DECK_Z, MAX_KUIL } from '../../game/js/railvalley.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.resolve(process.env.GAME_WORLD || path.join(ROOT, 'game', 'world'));
export const heeftProvincie = () => fs.existsSync(path.join(dir, 'index-provincie.json'));

// Laadt stad en provincie en geeft { map, rails } (de rijen met z). De pass staat tijdens het laden uit: het profiel is dat van de wereldbouw.
export async function laadAlleSporen() {
  zetKuilVulling(false);
  const S = await import('../../game/js/tilestore.js');
  const TW = await import('../../game/js/tileworld.js');
  const PW = await import('../../game/js/provinceworld.js');
  const { gridItems } = await import('../../game/js/spatialgrid.js');
  const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(path.join(dir, f))))) : undefined) });
  const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
  const map = T.world;
  PW.initProvince({ index: T.index, world: map });
  const sleutels = Object.entries(T.index.tiles).filter(([, t]) => t.n && t.n.rails).map(([k]) => k);
  await Promise.all(sleutels.map((k) => T.store.request(k, { priority: -1 })));
  map.tileQueue.run(1e9);
  const rails = new Set(map.rails);
  for (const r of gridItems(map.railGrid)) rails.add(r);
  zetKuilVulling(true);
  return { map, rails: [...rails].filter((r) => r.pts && r.z && r.z.length === r.pts.length), tiles: sleutels.length };
}

export const kopie = (rails) => rails.map((r) => ({ ...r, z: Array.from(r.z) }));
const zMax = (n) => Math.max(...n.refs.map(([r, i]) => r.z[i]));
export function dekStats(rails) {
  let stukken = 0, meters = 0, hoogste = 0;
  for (const k of spoorKetens(rails)) {
    let lopend = false;
    for (let q = 1; q < k.length; q++) {
      const a = zMax(k[q - 1]), b = zMax(k[q]);
      const dek = a >= DECK_Z && b >= DECK_Z;
      if (dek) { meters += Math.hypot(k[q].x - k[q - 1].x, k[q].y - k[q - 1].y); hoogste = Math.max(hoogste, a, b); if (!lopend) stukken++; }
      lopend = dek;
    }
  }
  return { stukken, meters: Math.round(meters), hoogste: +hoogste.toFixed(1) };
}

// De controles op een lijst rijen die al door de pass zijn (map geeft wegen en gebouwen, alleen waar tegels geladen zijn).
export function auditDek(rails, map, PF, { maxKuil = MAX_KUIL } = {}) {
  const { onGroundRoad, inBuildingAt } = PF;
  const bad = [];
  const rest = fillRailValleys(kopie(rails), { droog: true, ...kaartHindernis(map, PF) });   // wat er na de pass nog gevuld had kunnen worden
  for (const g of rest.gevuld) bad.push({ soort: 'onderbreking', x: g.x, y: g.y, wat: `kuil van ${g.lengte} m (laagste ${g.minZ} m) tussen twee dekstukken` });
  for (const g of rest.geblokkeerd) if (g.lengte <= maxKuil) bad.push({ soort: 'geblokkeerd', x: g.x, y: g.y, wat: `kuil van ${g.lengte} m blijft: ${g.reden}` });
  for (const k of spoorKetens(rails)) {
    const z = k.map(zMax);
    let acc = 7, sindsPijler = 0;
    for (let q = 1; q < k.length; q++) {
      const d = Math.hypot(k[q].x - k[q - 1].x, k[q].y - k[q - 1].y);
      if (d > 0 && Math.abs(z[q] - z[q - 1]) > 0.5 && Math.abs(z[q] - z[q - 1]) / d > 0.06) bad.push({ soort: 'hoogtesprong', x: Math.round(k[q].x), y: Math.round(k[q].y), wat: `${(z[q] - z[q - 1]).toFixed(2)} m op ${d.toFixed(1)} m: het dek sluit niet aan op het bed` });
      if (!(z[q] >= DECK_Z && z[q - 1] >= DECK_Z)) { acc = 7; sindsPijler = 0; continue; }
      acc += d; sindsPijler += d;
      if (inBuildingAt(map, k[q].x, k[q].y, 1.5)) bad.push({ soort: 'object-in-dek', x: Math.round(k[q].x), y: Math.round(k[q].y), wat: 'een gebouw op de hartlijn van het dek' });
      if (acc >= 15) { acc = 0; if (!onGroundRoad(map, k[q].x, k[q].y, 2.2)) sindsPijler = 0; }
      if (sindsPijler > 60) { bad.push({ soort: 'dek-zonder-pijlers', x: Math.round(k[q].x), y: Math.round(k[q].y), wat: `${Math.round(sindsPijler)} m dek zonder pijlerplek` }); sindsPijler = 0; }
      if (onGroundRoad(map, k[q].x, k[q].y, 0.5) && z[q] - 0.9 < 3.2) bad.push({ soort: 'vrije-hoogte', x: Math.round(k[q].x), y: Math.round(k[q].y), wat: `dek onderkant ${(z[q] - 0.9).toFixed(1)} m boven een weg op maaiveld` });
    }
  }
  return bad;
}

if (process.argv[1] && process.argv[1].endsWith('viaduct_doorloop_audit.mjs')) {
  if (!heeftProvincie()) { console.log('SKIP viaduct_doorloop_audit: geen game/world met de provincie'); process.exit(0); }
  const PF = await import('../../game/js/propfilter.js');
  const { map, rails, tiles } = await laadAlleSporen();
  const voor = dekStats(rails);
  const kop = kopie(rails);
  const rep = fillRailValleys(kop, kaartHindernis(map, PF));
  const na = dekStats(kop);
  console.log(`spoorrijen: ${rails.length} (${tiles} provincietegels met spoor); dekstukken voor ${voor.stukken} (${voor.meters} m), na ${na.stukken} (${na.meters} m); hoogste dek ${voor.hoogste} -> ${na.hoogste} m`);
  for (const g of rep.gevuld) console.log(`  gevuld: (${g.x},${g.y}) naar (${g.naarX},${g.naarY}) ${g.lengte} m, laagste ${g.minZ} m, randen ${g.vanZ}/${g.totZ} m`);
  for (const g of rep.geblokkeerd) console.log(`  blijft: (${g.x},${g.y}) ${g.lengte} m laagste ${g.minZ} m: ${g.reden}`);
  const bad = auditDek(kop, map, PF);
  for (const b of bad) console.log(`  ${b.soort}: (${b.x},${b.y}) ${b.wat}`);
  console.log(bad.length ? `${bad.length} bevindingen` : 'viaducten doorlopend, zonder gat, object of pijlerloos stuk');
  process.exit(process.argv.includes('--strict') && bad.some((b) => b.soort !== 'geblokkeerd') ? 1 : 0);
}
